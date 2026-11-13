/* ════════ DATA-IO: keluar-masuk data (Bagian F) ════════

   Ekspor:
   - cadangan JSON  — SEMUA catatan (termasuk sampah/arsip) + gambar
                      (blob IndexedDB → base64), bisa dipulihkan utuh.
   - Markdown       — satu catatan atau semua (zip .md), frontmatter YAML
                      ringan + wikilink/tag dipertahankan (Obsidian-siap).

   Impor:
   - JSON cadangan  — dua mode: "gabung" (sisip + perbarui id sama) atau
                      "timpa" (kembalikan persis seperti saat diekspor).
   - .md / .zip .md — tiap berkas menjadi catatan baru.

   Prinsip: tidak ada dependensi; ZIP ditulis/dibaca manual (metode
   store saja — berkas tanpa kompresi). Berkas zip asing ber-metode
   deflate dilewati dengan catatan, bukan ditolak seluruhnya.

   Semua fungsi murni terhadap data + DOM ringan; yang menyentuh
   storage (IndexedDB) hanya di ujung ekspor/impor. */

import { state, save, SCHEMA } from '../core/store.js?v=20261105210000';
import { flush } from '../core/autosave.js?v=20261105210000';
import { simpanBlob, ambilBlob, semuaId } from '../core/blobs.js?v=20261105210000';
import { kunciAnotasi } from './pdf/anotasi.js?v=20261105210000';
import { kunciSusunan } from './pdf/susunan.js?v=20261105210000';
import { kunciOcr } from './ocr/ocr-teks.js?v=20261105210000';
import { idBlobDariGoresan } from './editor/goresan.js?v=20261105210000';
import { makeNote, makeBlock, normalizeNotes } from './note-model.js?v=20261105210000';
import { normalisasiDaftarAcara } from './kalender-acara-murni.js?v=20261105210001';
import { sinkronTag, tagDariIsi } from './tags.js?v=20261105210000';
import { terlihat } from './kunci.js?v=20261105210000';
import { muatCustomHamoji, setDaftarCustomHamoji } from './hamoji.js?v=20261105210000';
import { daftarRuang, pulihkanRuang } from './ruang.js?v=20261105210000';
import { t as tr } from '../core/i18n.js?v=20261105210000';
import { extractZip } from '../renamer/unzip.js?v=20261105210000';
import { petaTautanNotion, tulisUlangTautan, csvKeMarkdown, namaBersihNotion, normJalur } from './impor-notion.js?v=20261105210000';
import { normalizeKartu } from './kartu-murni.js?v=20261105210000';
import { normalizeUjian } from './ujian-murni.js?v=20261105210000';

/* ════════════════ BANTUAN KECIL ════════════════ */

const escA = s => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;')
  .replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escT = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');
const unesc = s => String(s ?? '').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
  .replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/&amp;/gi, '&');
const ISO = ts => ts ? new Date(ts).toISOString() : '';
const dariISO = s => { const t = Date.parse(s); return isNaN(t) ? null : t; };
export const namaBerkasAman = nama => {
  const n = String(nama || '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ').trim().replace(/\.+$/g, '').slice(0, 120);
  return n || 'tanpa-judul';
};
export const namaHariIni = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};

/* Unduh berkas lewat anchor. objectURL dibebaskan setelah klik. */
export function unduh(nama, data, tipe = 'application/octet-stream') {
  const a = document.createElement('a');
  const u = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type: tipe }));
  a.href = u;
  a.download = nama;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 4000);
}

/* id blob yang dirujuk catatan (data-blob di isi + meta.blobId). */
function idBlobDipakai() {
  const id = new Set();
  state.notes.forEach(n => (n.blocks || []).forEach(b => {
    if (b.meta && b.meta.blobId) id.add(b.meta.blobId);
    if (b.meta) idBlobDariGoresan(b.meta.goresan).forEach(x => id.add(x));
    const m = String(b.content || '').match(/data-blob="([^"]+)"/g);
    if (m) m.forEach(x => id.add(x.slice(11, -1)));
    /* isi HTML menyimpan data-goresan dengan &quot; untuk tanda kutip */
    const g = String(b.content || '').match(/data-goresan="([^"]*)"/g);
    if (g) g.forEach(x => idBlobDariGoresan(x.slice(14, -1).replace(/&quot;/g, '"')).forEach(y => id.add(y)));
  }));
  /* anotasi PDF (B1b) dan susunan halaman (B2) ikut dicadangkan lewat kunci
     turunannya; kumpulBlob hanya mengambil kunci yang benar-benar ada di penyimpanan */
  return [...id].flatMap(x => [x, kunciAnotasi(x), kunciSusunan(x), kunciOcr(x)]);
}

/* Blob → base64 (dipecah biar aman untuk string besar). */
async function blobKeB64(blob) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = '';
  for (let i = 0; i < buf.length; i += 0x8000)
    s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return btoa(s);
}
const b64KeBiner = b64 => {
  const s = atob(b64);
  const u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return u;
};

/* ════════════════ EKSPOR JSON ════════════════ */

/* Ambil isi semua blob yang dipakai → { id: { b64, tipe } }. */
export async function kumpulBlob() {
  const hasil = {};
  const semua = new Set(await semuaId());
  for (const id of idBlobDipakai()) {
    if (!semua.has(id)) continue;
    try {
      const blob = await ambilBlob(id);
      if (!blob) continue;
      hasil[id] = { b64: await blobKeB64(blob), tipe: blob.type || '' };
    } catch (e) { /* blob rusak — lewati, catatan tetap diekspor */ }
  }
  return hasil;
}

export async function cadanganJson() {
  try { await flush(); } catch {}
  const blobs = await kumpulBlob();
  const hamojiCustom = muatCustomHamoji();
  const ruang = daftarRuang();
  const teks = JSON.stringify({
    format: 'hara-cadangan', versi: 1, schema: SCHEMA,
    diekspor: new Date().toISOString(), seq: state.seq,
    catatan: state.notes, blobs,
    acaraKalender: state.acaraKalender || [],
    ...(hamojiCustom.length ? { hamojiCustom } : {}),
    ...(ruang.length ? { ruang } : {}),
    ...(state.kartu && state.kartu.length ? { kartu: state.kartu } : {}),
    ...(state.ujian && state.ujian.length ? { ujian: state.ujian } : {}),
  });
  return { nama: `hara-cadangan-${namaHariIni()}.json`, teks };
}

/* Baca berkas JSON cadangan → ringkasan siap-terapkan (belum menyentuh
   storage). Salah bentuk → lempar Error dengan pesan manusiawi. */
export async function siapImporJson(teks) {
  let data = null;
  try { data = JSON.parse(teks); } catch (e) { data = null; }
  if (!data || data.format !== 'hara-cadangan' || !Array.isArray(data.catatan))
    throw new Error(tr('Bukan berkas cadangan Hara (format tidak dikenal).'));
  const catatan = normalizeNotes(data.catatan);
  return {
    jenis: 'json',
    catatan, blobs: data.blobs || {},
    hamojiCustom: Array.isArray(data.hamojiCustom) ? data.hamojiCustom : [],
    ruang: Array.isArray(data.ruang) ? data.ruang : [],
    kartu: normalizeKartu(data.kartu),
    ujian: normalizeUjian(data.ujian),
    acaraKalender: normalisasiDaftarAcara(data.acaraKalender),
    jumlahBlob: Object.keys(data.blobs || {}).length,
    seq: data.seq || 1,
  };
}

/* Terapkan impor JSON. mode 'timpa' = kembalikan persis cadangan;
   mode 'gabung' = sisip catatan baru + perbarui catatan ber-id sama. */
function rewriteBlobRefs(value, map, key = '') {
  if (typeof value === 'string') {
    if ((key === 'blobId' || key === 'blob') && map.has(value)) return map.get(value);
    let out = value;
    for (const [lama, baru] of map) {
      if (key === 'content') {
        out = out.replaceAll(`data-blob="${lama}"`, `data-blob="${baru}"`);
        out = out.replace(/data-goresan="([^"]*)"/g, (all, raw) => {
          try {
            const obj=JSON.parse(raw.replace(/&quot;/g,'"').replace(/&amp;/g,'&'));
            const ubah=x=>{if(!x||typeof x!=='object')return;if(Array.isArray(x))return x.forEach(ubah);for(const k of Object.keys(x)){if((k==='blob'||k==='blobId')&&map.has(x[k]))x[k]=map.get(x[k]);else ubah(x[k]);}};
            ubah(obj);return `data-goresan="${JSON.stringify(obj).replace(/&/g,'&amp;').replace(/"/g,'&quot;')}"`;
          } catch { return all; }
        });
      }
      if (key === 'goresan') {
        try {
          const obj = JSON.parse(out);
          const ubah = x => {
            if (!x || typeof x !== 'object') return;
            if (Array.isArray(x)) return x.forEach(ubah);
            for (const k of Object.keys(x)) {
              if ((k === 'blob' || k === 'blobId') && map.has(x[k])) x[k] = map.get(x[k]);
              else ubah(x[k]);
            }
          };
          ubah(obj); out = JSON.stringify(obj);
        } catch {}
      }
    }
    return out;
  }
  if (Array.isArray(value)) return value.map(x => rewriteBlobRefs(x, map, key));
  if (value && typeof value === 'object') {
    for (const k of Object.keys(value)) value[k] = rewriteBlobRefs(value[k], map, k);
  }
  return value;
}

function blobIdsDalam(catatan) {
  const ids = new Set();
  const jalan = (v,k='') => {
    if (typeof v === 'string') {
      if ((k === 'blobId' || k === 'blob') && /^[A-Za-z0-9_-]{1,180}$/.test(v)) ids.add(v);
      for (const m of v.matchAll(/data-blob="([^"]+)"/g)) ids.add(m[1]);
      for (const m of v.matchAll(/data-goresan="([^"]*)"/g)) {
        try {
          const o=JSON.parse(m[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&'));
          const scan=x=>{if(!x||typeof x!=='object')return;if(Array.isArray(x))return x.forEach(scan);for(const [kk,vv] of Object.entries(x)){if((kk==='blob'||kk==='blobId')&&typeof vv==='string')ids.add(vv);else scan(vv);}};
          scan(o);
        } catch {}
      }
      try {
        const o=JSON.parse(v);
        const scan=x=>{if(!x||typeof x!=='object')return;if(Array.isArray(x))return x.forEach(scan);for(const [kk,vv] of Object.entries(x)){if((kk==='blob'||kk==='blobId')&&typeof vv==='string')ids.add(vv);else scan(vv);}};
        scan(o);
      } catch {}
    } else if(Array.isArray(v)) v.forEach(x=>jalan(x,k));
    else if(v&&typeof v==='object') Object.entries(v).forEach(([kk,vv])=>jalan(vv,kk));
  };
  jalan(catatan.blocks || []);
  return ids;
}

const b64Bytes = b64KeBiner;
async function samaBlobLokal(id, isi) {
  const ada = await ambilBlob(id).catch(()=>null);
  if (!ada) return false;
  try {
    if ((ada.type || '') !== (isi.tipe || '')) return false;
    const a = new Uint8Array(await ada.arrayBuffer()), b = b64Bytes(isi.b64 || '');
    return a.length === b.length && a.every((x,i)=>x===b[i]);
  } catch { return false; }
}
const idBlobBaru = () => 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2,9);

/* Terapkan impor JSON. UI mengirim keputusan per konflik; tanpa keputusan,
   perilaku lama tetap mengutamakan versi berkas untuk kompatibilitas API. */
export async function terapkanImporJson(r, mode, resolutions = {}) {
  const petaRuang = pulihkanRuang(r.ruang, mode);
  if (petaRuang.size) for (const n of r.catatan) {
    if (n && n.folderId && petaRuang.has(n.folderId)) n.folderId = petaRuang.get(n.folderId);
  }
  let daftar = r.catatan;
  let diterima = [];
  let ditambah = 0, diganti = 0, dipertahankan = 0;
  if (mode !== 'timpa') {
    const byId = new Map(state.notes.map((n,i)=>[n.id,i]));
    const hasil = [];
    for (const asal of r.catatan) {
      const idx = byId.get(asal.id);
      if (idx == null) { hasil.push(asal); diterima.push(asal); ditambah++; continue; }
      const pilihan = resolutions[asal.id];
      if (pilihan === 'lokal') { dipertahankan++; continue; }
      state.notes[idx] = asal; diterima.push(asal); diganti++;
    }
    daftar = hasil;
    state.notes.push(...hasil);
  } else {
    state.notes = daftar.length ? daftar : state.notes;
    diterima = daftar.slice(); ditambah = daftar.length;
  }
  state.seq = Math.max(state.seq || 1, r.seq || 1);

  if (Array.isArray(r.kartu) && r.kartu.length) {
    if (mode === 'timpa') state.kartu = r.kartu;
    else {
      const ada = new Map(state.kartu.map((k, i) => [k.id, i]));
      for (const k of r.kartu) { if (ada.has(k.id)) state.kartu[ada.get(k.id)] = k; else state.kartu.push(k); }
    }
  } else if (mode === 'timpa') state.kartu = [];
  if (Array.isArray(r.ujian) && r.ujian.length) {
    if (mode === 'timpa') state.ujian = r.ujian;
    else {
      const ada = new Map(state.ujian.map((u, i) => [u.id, i]));
      for (const u of r.ujian) { if (ada.has(u.id)) state.ujian[ada.get(u.id)] = u; else state.ujian.push(u); }
    }
  } else if (mode === 'timpa') state.ujian = [];
  const acaraImpor = normalisasiDaftarAcara(r.acaraKalender);
  if (mode === 'timpa') state.acaraKalender = acaraImpor;
  else {
    const ids = new Set(state.acaraKalender.map(a => a.id));
    for (const a of acaraImpor) if (!ids.has(a.id)) { state.acaraKalender.push(a); ids.add(a.id); }
  }
  if (Array.isArray(r.hamojiCustom) && r.hamojiCustom.length) setDaftarCustomHamoji(r.hamojiCustom, mode !== 'timpa');

  /* Jangan menimpa blob lokal yang kebetulan memakai ID sama. Jika isinya
     berbeda, beri ID baru pada blob impor dan perbarui rujukan catatan impor. */
  const refs = new Set(); diterima.forEach(n=>blobIdsDalam(n).forEach(id=>refs.add(id)));
  const mapBlob = new Map();
  for (const id of refs) {
    for (const k of [id, kunciAnotasi(id), kunciSusunan(id), kunciOcr(id)]) {
      const isi = r.blobs?.[k]; if (!isi) continue;
      const lokal = await ambilBlob(k).catch(()=>null);
      if (lokal && !(await samaBlobLokal(k,isi))) {
        const baru = idBlobBaru();
        mapBlob.set(id, baru);
        for (const suffix of ['', 'anot-', 'susun-', 'ocr-']) {
          const oldKey = suffix ? suffix + id : id;
          if (r.blobs[oldKey]) mapBlob.set(oldKey, suffix ? suffix + baru : baru);
        }
        break;
      }
    }
  }
  if (mapBlob.size) diterima.forEach(n=>rewriteBlobRefs(n,mapBlob));
  let dipulih = 0;
  for (const id of refs) {
    for (const k of [id, kunciAnotasi(id), kunciSusunan(id), kunciOcr(id)]) {
      const isi = r.blobs?.[k]; if (!isi) continue;
      const tujuan = mapBlob.get(k) || mapBlob.get(id) && (k === id ? mapBlob.get(id) : k.replace(id,mapBlob.get(id))) || k;
      const lokal = await ambilBlob(tujuan).catch(()=>null);
      if (lokal) { if (await samaBlobLokal(tujuan,isi)) continue; else continue; }
      try { const u=b64KeBiner(isi.b64||''); await simpanBlob(tujuan,new Blob([u],{type:isi.tipe||''})); dipulih++; } catch {}
    }
  }
  save();
  return { catatan:state.notes.length, baru:mode==='timpa'?null:ditambah, ditambah, diganti, dipertahankan, dipulihkan:dipulih, mode };
}

/* ════════════════ MARKDOWN: blok → teks ════════════════ */

/* Ubah HTML inline (isi blok) → markdown. Berjalan dengan memakai DOM
   asli supaya urutan teks & mark aman. */
function inlineMd(html) {
  const w = document.createElement('div');
  w.innerHTML = String(html || '');
  let out = '';
  const jalan = (node) => {
    node.childNodes.forEach(anak => {
      if (anak.nodeType === 3) { out += anak.data; return; }
      if (anak.nodeType !== 1) return;
      const el = anak;
      const t = el.tagName.toLowerCase();
      const teksLuar = () => { jalan(el); };
      if (t === 'br') out += '  \n';
      else if (el.classList && el.classList.contains('wl')) out += el.textContent;
      else if (el.classList && el.classList.contains('tg')) out += el.textContent;
      else if (t === 'b' || t === 'strong') { out += '**'; teksLuar(); out += '**'; }
      else if (t === 'i' || t === 'em') { out += '*'; teksLuar(); out += '*'; }
      else if (t === 's' || t === 'strike') { out += '~~'; teksLuar(); out += '~~'; }
      else if (el.classList && el.classList.contains('hl')) { out += '=='; teksLuar(); out += '=='; }
      else if (t === 'code') out += '`' + el.textContent + '`';
      else if (t === 'a') {
        const href = el.getAttribute('href') || '';
        const teks = el.textContent;
        if (href && teks) out += `[${teks}](${href})`;
        else out += teks;
      }
      else teksLuar();
    });
  };
  jalan(w);
  return out.replace(/^\s+|\s+$/g, '');
}

/* Satu blok → satu/beberapa baris markdown. */
function blokMd(b, noOl) {
  const meta = b.meta || {};
  const isi = teksKode(b);
  const indent = '  '.repeat(Math.max(0, Math.round(Number(meta.indent) / 24) || 0));
  switch (b.type) {
    case 'heading': return '#'.repeat(Math.min(6, meta.level || 2)) + ' ' + isi;
    case 'bullet': return `${indent}- ${isi}`;
    case 'ordered-list': return `${indent}${noOl}. ${isi}`;
    case 'todo': return `${indent}- [${meta.checked ? 'x' : ' '}] ${isi}`;
    case 'quote': return isi.split('\n').map(x => `> ${x}`).join('\n');
    case 'callout':
      return `> [!${escT(meta.variant || 'info')}]` +
        (isi ? '\n' + isi.split('\n').map(x => `> ${x}`).join('\n') : '');
    case 'code': return '```' + (meta.lang || '') + '\n' + isi + '\n```';
    case 'toggle':
      return `<details><summary>${escT(meta.summary || '')}</summary>\n\n${isi}\n</details>`;
    case 'table': {
      const rows = Array.isArray(meta.rows) && meta.rows.length ? meta.rows : [['', '']];
      const escPipe = c => String(c ?? '').replace(/\|/g, '\\|');
      const head = '| ' + rows[0].map(escPipe).join(' | ') + ' |';
      const sep  = '| ' + rows[0].map(() => '---').join(' | ') + ' |';
      const body = rows.slice(1).map(r => '| ' + rows[0].map((_, i) => escPipe(r[i])).join(' | ') + ' |');
      return [head, sep, ...body].join('\n');
    }
    case 'audio':
      return [`> Memo suara: ${escT(meta.title || 'Memo suara')} (${meta.duration || 0}s)`,
        ...(Array.isArray(meta.marks) ? meta.marks : []).map(m => {
          const d = Number(m.t) || 0;
          return `> - ${Math.floor(d / 60)}:${String(Math.floor(d % 60)).padStart(2, '0')} ${escT(m.teks || '')}`.trimEnd();
        }),
        ...(Array.isArray(meta.transcript) ? meta.transcript : []).map(seg => {
          const d = Number(seg.t) || 0;
          return `> - Transkrip ${Math.floor(d / 60)}:${String(Math.floor(d % 60)).padStart(2, '0')} ${escT(seg.teks || '')}`.trimEnd();
        }),
      ].join('\n');
    case 'math':
      return `$$\n${meta.expr || ''}\n$$`;
    case 'bookmark':
      return `[Tautan: ${meta.title || meta.url || 'Tautan'}](${meta.url || 'https://'})${meta.desc ? ' — ' + meta.desc : ''}`
        + (meta.kutipan ? '\n\n> ' + String(meta.kutipan).replace(/\n/g, '\n> ') : '');
    case 'file':
      return `[Lampiran: ${meta.name || 'Lampiran'}](data:application/simpan-dalam-cadangan-json;id=${meta.blobId || ''};size=${meta.size || 0})`;
    case 'divider': return '---';
    case 'image':
      return `![${meta.alt || 'gambar'} ${meta.blobId || ''}](data:image/simpan-dalam-cadangan-json;id=${meta.blobId || ''})`;
    default: return isi;
  }
}

/* Isi teks blok untuk keperluan markdown. Kode: pertahankan baris asli.
   Todo: tanpa kotak centang (itu render, bukan isi). */
function teksKode(b) {
  if (b.type === 'code') {
    return String(b.content || '').replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]*>/g, '').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
      .replace(/\u200b/g, '').replace(/\n{3,}/g, '\n\n');
  }
  return inlineMd(b.content);
}

/* Frontmatter YAML ringan: judul, waktu, tag, properti, bendera. */
export function depanMd(n) {
  const baris = ['---', `judul: ${kutipYaml(n.title || '')}`, `hara_id: ${kutipYaml(n.id || '')}`];
  if (n.createdAt) baris.push(`dibuat: ${ISO(n.createdAt)}`);
  baris.push(`diubah: ${ISO(n.updatedAt || Date.now())}`);
  const tag = (n.tags || []).slice();
  if (tag.length) baris.push('tag:', ...tag.map(t => `  - ${kutipYaml(t)}`));
  (n.props || []).forEach(p => {
    if (p.k) baris.push(`${kunciYaml(p.k)}: ${kutipYaml(p.v)}`);
  });
  if (n.pinned) baris.push('disematkan: true');
  if (n.archived) baris.push('diarsipkan: true');
  baris.push('---');
  return baris.join('\n');
}

const kunciYaml = k => /^[A-Za-z][A-Za-z0-9_-]*$/.test(k) ? k : JSON.stringify(k);
const kutipYaml = v => {
  const s = String(v ?? '');
  if (s === '') return '""';
  return /^[\w .,+@()\/:;!?%&'=-]*$/.test(s) ? s : JSON.stringify(s);
};

/* Satu catatan → dokumen .md utuh (frontmatter + isi). */
export function markdownDariCatatan(n) {
  if (!n) return '';
  const badan = [];
  let ol = 0;
  (n.blocks || []).forEach(b => {
    let teks;
    if (b.type === 'ordered-list') { ol++; teks=blokMd(b, ol); }
    else { ol = 0; teks=blokMd(b, 1); }
    const marker=/^[A-Za-z0-9_-]{1,160}$/.test(String(b.id||''))?`<!-- hara:block:${b.id} -->\n`:'';
    badan.push(marker+teks);
  });
  return depanMd(n) + '\n' + badan.filter(x => x !== '').join('\n\n') + '\n';
}

export function eksporSemuaMarkdown() {
  const dipakai = new Set();
  const entri = [];
  /* D19: catatan terkunci yang belum dibuka tidak ikut ekspor Markdown —
     isi terkunci tidak boleh bocor lewat berkas .md. (Cadangan JSON
     tetap memuat semua + PIN tidak pernah ikut dicadangkan.) */
  state.notes.filter(n => !n.deletedAt && terlihat(n)).forEach(n => {
    const dasar = namaBerkasAman(n.title);
    let nama = dasar + '.md', i = 2;
    while (dipakai.has(nama)) nama = `${dasar}-${i++}.md`;
    dipakai.add(nama);
    entri.push({ nama, teks: markdownDariCatatan(n), id: n.id });
  });
  return { nama: `hara-catatan-${namaHariIni()}.zip`, entri };
}

export async function eksporVaultMarkdown() {
  const bundle=eksporSemuaMarkdown(), notes=new Map(state.notes.map(n=>[n.id,n])), out=[];
  const blobIds=new Set();
  for(const e of bundle.entri){const n=notes.get(e.id);for(const b of n?.blocks||[]){if(b?.meta?.blobId)blobIds.add(String(b.meta.blobId));idBlobDariGoresan(b?.meta?.goresan).forEach(x=>blobIds.add(x));for(const m of String(b?.content||'').matchAll(/data-blob="([^"]+)"/g))blobIds.add(m[1]);const g=String(b?.content||'').match(/data-goresan="([^"]*)"/);if(g)idBlobDariGoresan(g[1].replace(/&quot;/g,'"')).forEach(x=>blobIds.add(x));}}
  const exts={'image/png':'png','image/jpeg':'jpg','image/gif':'gif','image/webp':'webp','image/svg+xml':'svg','audio/mpeg':'mp3','audio/ogg':'ogg','application/pdf':'pdf'}, blobs=new Map();
  for(const id of blobIds){try{const blob=await ambilBlob(id);if(blob){const ext=exts[blob.type]||'bin';blobs.set(id,{blob,ext});out.push({nama:`attachments/${id}.${ext}`,bytes:new Uint8Array(await blob.arrayBuffer())});}}catch{}}
  for(const e of bundle.entri){
    const teks=e.teks.replace(/data:(?:image|application)\/[^)]*?;id=([A-Za-z0-9_-]+)(?:;size=(\d+))?\)/g,(_m,id)=>`attachments/${id}.${blobs.get(id)?.ext||'bin'})`);
    out.unshift({nama:e.nama,teks});
  }
  return {nama:bundle.nama,entri:out,catatan:bundle.entri.length};
}

/* ════════════════ ZIP (store saja, tanpa dependensi) ════════════════ */

const CRC_TAB = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();
const crc32 = u => {
  let c = -1;
  for (let i = 0; i < u.length; i++) c = CRC_TAB[(c ^ u[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
const teksUtf8 = s => new TextEncoder().encode(s);
const u32 = (arr, o, v) => { arr[o] = v & 255; arr[o + 1] = (v >>> 8) & 255; arr[o + 2] = (v >>> 16) & 255; arr[o + 3] = (v >>> 24) & 255; };
const u16 = (arr, o, v) => { arr[o] = v & 255; arr[o + 1] = (v >>> 8) & 255; };

export function buatZip(entri) {
  const files = entri.map(e => ({ nama: teksUtf8(e.nama), data: e.bytes ? new Uint8Array(e.bytes) : teksUtf8(e.teks || '') }));
  let uk = 0, pusat = 0;
  files.forEach(f => { uk += 30 + f.nama.length + f.data.length; });
  const arr = new Uint8Array(uk + files.reduce((a, f) => a + 46 + f.nama.length, 0) + 22);
  let o = 0, tengah = 0;
  const tengahMulai = uk;
  files.forEach(f => {
    const crc = crc32(f.data);
    const pos = o;
    arr[o++] = 0x50; arr[o++] = 0x4B; arr[o++] = 3; arr[o++] = 4;   /* LH */
    u16(arr, o, 20); o += 2;                                        /* versi */
    u16(arr, o, 0x0800); o += 2;                                    /* bendera utf8 */
    u16(arr, o, 0); o += 2; u16(arr, o, 0); o += 2;                 /* metode, waktu */
    u16(arr, o, 0); o += 2;                                         /* tanggal */
    u32(arr, o, crc); o += 4;
    u32(arr, o, f.data.length); o += 4; u32(arr, o, f.data.length); o += 4;
    u16(arr, o, f.nama.length); o += 2; u16(arr, o, 0); o += 2;     /* nama, ekstra */
    arr.set(f.nama, o); o += f.nama.length;
    arr.set(f.data, o); o += f.data.length;
    /* catatan pusat */
    const p = tengahMulai + tengah;
    arr[p] = 0x50; arr[p + 1] = 0x4B; arr[p + 2] = 1; arr[p + 3] = 2;
    u16(arr, p + 4, 20); u16(arr, p + 6, 20);
    u16(arr, p + 8, 0x0800); u16(arr, p + 10, 0); u16(arr, p + 12, 0);
    u16(arr, p + 14, 0); u32(arr, p + 16, crc);
    u32(arr, p + 20, f.data.length); u32(arr, p + 24, f.data.length);
    u16(arr, p + 28, f.nama.length); u16(arr, p + 30, 0);
    u16(arr, p + 32, 0); u16(arr, p + 34, 0); u16(arr, p + 36, 0);
    u32(arr, p + 38, 0); u32(arr, p + 42, pos);
    arr.set(f.nama, p + 46); tengah += 46 + f.nama.length;
  });
  const e = tengahMulai + tengah;
  arr[e] = 0x50; arr[e + 1] = 0x4B; arr[e + 2] = 5; arr[e + 3] = 6; /* EOCD */
  u16(arr, e + 4, 0); u16(arr, e + 6, 0);
  u16(arr, e + 8, files.length); u16(arr, e + 10, files.length);
  u32(arr, e + 12, tengah); u32(arr, e + 16, tengahMulai);
  u16(arr, e + 20, 0);
  return arr;
}

/* Baca zip → [{nama, teks}] (hanya metode store; deflate dilewati). */
/* Baca zip (STORE dan DEFLATE) dan ambil berkas teks: .md, .markdown, .csv, .json.
   Berkas lain dihitung sebagai dilewati. Memakai pembaca zip renamer. */
export async function bacaZipLengkap(bytes) {
  const berkas = await extractZip(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  const dec = new TextDecoder('utf-8');
  const entri = [], lampiran = [];
  let dilewati = 0;
  for (const f of berkas) {
    const nama = f.fullPath || f.name || '';
    if (/\.(md|markdown|csv|json)$/i.test(nama)) entri.push({ nama, teks: dec.decode(f.data) });
    else if (/^attachments\/[A-Za-z0-9_-]{1,160}\.[A-Za-z0-9]{1,8}$/i.test(nama)) lampiran.push({ nama, bytes:new Uint8Array(f.data) });
    else dilewati++;
  }
  return { entri, dilewati, lampiran };
}

export function bacaZip(bytes) {
  const u = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const baca16 = o => u[o] | (u[o + 1] << 8);
  const baca32 = o => (u[o] | (u[o + 1] << 8) | (u[o + 2] << 16) | (u[o + 3] << 24)) >>> 0;
  /* cari EOCD dari belakang */
  let eocd = -1;
  for (let i = u.length - 22; i >= Math.max(0, u.length - 65557); i--) {
    if (u[i] === 0x50 && u[i + 1] === 0x4B && u[i + 2] === 5 && u[i + 3] === 6) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error(tr('Bukan berkas zip.'));
  const pusat = baca32(eocd + 16);
  const jumlah = baca16(eocd + 10);
  const hasil = []; let dilewati = 0;
  let p = pusat;
  for (let i = 0; i < jumlah; i++) {
    if (u[p] !== 0x50 || u[p + 1] !== 0x4B || u[p + 2] !== 1 || u[p + 3] !== 2) break;
    const metode = baca16(p + 10);
    const nPjg = baca16(p + 28);
    const ePjg = baca16(p + 30);
    const isiPjg = baca32(p + 24);
    const lho = baca32(p + 42);
    const nama = new TextDecoder().decode(u.subarray(p + 46, p + 46 + nPjg));
    if (metode !== 0) { dilewati++; p += 46 + nPjg + ePjg; continue; }
    if (/\/$/.test(nama)) { p += 46 + nPjg + ePjg; continue; }       /* folder */
    const mulai = lho + 30 + baca16(lho + 26) + baca16(lho + 28);
    hasil.push({ nama, teks: new TextDecoder().decode(u.subarray(mulai, mulai + isiPjg)) });
    p += 46 + nPjg + ePjg;
  }
  return { entri: hasil, dilewati };
}

/* ════════════════ MARKDOWN: teks → blok ════════════════ */

/* Baris frontmatter YAML → objek meta. Paham bentuk sederhana saja:
   `kunci: nilai`, `kunci: "nilai"`, daftar `tag:` dengan `  - item`,
   serta nilai bool/angka. */
function yamlBaca(baris) {
  const meta = {};
  let daftarKunci = null;
  baris.forEach(b => {
    const item = b.match(/^\s*-\s*(.*)$/);
    if (item && daftarKunci) { meta[daftarKunci].push(unesc(item[1]).replace(/^"|"$/g, '')); return; }
    daftarKunci = null;
    const m = b.match(/^([A-Za-z0-9_-]+|"[^"]*")\s*:\s*(.*)$/);
    if (!m) return;
    const k = m[1].replace(/^"|"$/g, '');
    let v = m[2].trim();
    if (v.startsWith('[') && v.endsWith(']')) {
      meta[k] = v.slice(1, -1).split(',').map(x => x.trim()).filter(Boolean);
      return;
    }
    if (v === '' ) { meta[k] = []; daftarKunci = k; return; }
    v = v.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
    if (v === 'true') v = true; else if (v === 'false') v = false;
    else { const n = Number(v); if (v !== '' && !isNaN(n)) v = n; }
    meta[k] = v;
  });
  return meta;
}

/* Satu baris markdown (tanpa penanda blok) → HTML inline.
   Urutan penting: kode inline dipisah dulu supaya markah di dalamnya
   tidak ikut diubah, sisanya ditransform, kode dipasang kembali. */
function inlineHtml(teks) {
  const kode = [];
  let s = escT(teks).replace(/`([^`\n]+)`/g, (_, isi) => {
    kode.push(isi);
    return `\uE000${kode.length - 1}\uE001`;
  });
  const pasang = (re, g) => { s = s.replace(re, g); };
  pasang(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
  pasang(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<i>$2</i>');
  pasang(/~~([^~\n]+)~~/g, '<s>$1</s>');
  pasang(/==([^=\n]+)==/g, '<span class="hl">$1</span>');
  pasang(/\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g,
    (_, j, a) => `<span class="wl">[[${j}${a ? '|' + a : ''}]]</span>`);
  pasang(/(^|[\s(])(#(?:[\p{L}\p{N}_/-]+))/gu,
    (_, pre, tag) => `${pre}<span class="tg">${tag}</span>`);
  pasang(/\[([^\]\n]*)\]\((https?:[^\s)]+|mailto:[^\s)]+)\)/g,
    (_, t, u) => `<a class="lk" href="${escA(u)}" target="_blank" rel="noopener">${t}</a>`);
  s = s.replace(/\uE000(\d+)\uE001/g, (_, i) => `<code class="ic">${escT(kode[+i])}</code>`);
  return s;
}

/* Ubah satu "paragraf logis" markdown (beberapa baris) → blok atau null.
   `noOl` diisi pemanggil untuk daftar bernomor. */
function blokDariTeks(baris, noOl) {
  const gabung = baris.join('\n');
  /* tabel markdown */
  if (baris.length >= 2 && /^\|.*\|\s*$/.test(baris[0]) && /^\|\s*[-:]+/.test(baris[1])) {
    const pecah = ln => ln.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
    const rows = [pecah(baris[0]), ...baris.slice(2).filter(ln => /^\|/.test(ln.trim())).map(pecah)];
    return makeBlock({ type: 'table', meta: { rows }, content: '' });
  }
  /* callout */
  const cal = gabung.match(/^>\s*\[!([\w-]+)\]\s*(.*)$/i);
  if (cal) {
    const isi = baris.slice(1).map(b => b.replace(/^>\s?/, ''))
      .join('\n').replace(/\s+$/g, '');
    return makeBlock({
      type: 'callout', meta: { variant: (cal[1] || 'info').toLowerCase() },
      content: isi ? isi.replace(/\n/g, '<br>') : '',
    });
  }
  const semuaKutip = baris.length > 0 && baris.every(b => /^>\s?/.test(b));
  if (semuaKutip) {
    return makeBlock({ type: 'quote', content: inlineHtml(baris.map(b => b.replace(/^>\s?/, '')).join(' ')) });
  }
  const satu = baris[0];
  const h = satu.match(/^(#{1,6})\s+(.*)$/);
  if (h) return makeBlock({
    /* editor Hara hanya punya H1–H3 — heading lebih dalam disatukan ke H3 */
    type: 'heading', meta: { level: Math.min(3, h[1].length) }, content: inlineHtml(h[2]),
  });
  const todo = satu.match(/^(\s*)[-*+]\s+\[([ xX])\]\s+(.*)$/);
  if (todo) return makeBlock({
    type: 'todo', meta: { checked: todo[2].toLowerCase() === 'x', indent: indentPx(todo[1]) },
    content: inlineHtml(todo[3]),
  });
  const li = satu.match(/^(\s*)[-*+]\s+(.*)$/);
  if (li) return makeBlock({ type: 'bullet', meta: { indent: indentPx(li[1]) }, content: inlineHtml(li[2]) });
  const ol = satu.match(/^(\s*)\d+[.)]\s+(.*)$/);
  if (ol) return makeBlock({ type: 'ordered-list', meta: { indent: indentPx(ol[1]) }, content: inlineHtml(ol[2]) });
  /* blok rumus matematika $$ ... $$ */
  if (/^\$\$\s*[\s\S]*?\s*\$\$$/.test(gabung.trim())) {
    const expr = gabung.trim().replace(/^\$\$\s*/, '').replace(/\s*\$\$$/, '').trim();
    return makeBlock({ type: 'math', meta: { expr }, content: '' });
  }
  /* Tanda baca markdown tanpa emoji; bentuk lama (\u{1F516}) tetap
     dibaca supaya cadangan yang diekspor versi sebelumnya tidak rusak. */
  const bmk = satu.match(/^\[(?:\u{1F516}\s*|Tautan:\s*)([^\]]+)\]\((https?:[^\s)]+)\)(?:\s*—\s*(.*))?$/u);
  if (bmk) {
    return makeBlock({ type: 'bookmark', meta: { title: bmk[1].trim(), url: bmk[2].trim(), desc: (bmk[3] || '').trim() }, content: '' });
  }
  const fl = satu.match(/^\[(?:\u{1F4CE}\s*|Lampiran:\s*)([^\]]+)\]\(data:application\/[^)]*;id=([A-Za-z0-9_-]+);size=(\d+)\)\s*$/u);
  if (fl) {
    return makeBlock({ type: 'file', meta: { name: fl[1].trim(), blobId: fl[2], size: Number(fl[3]) || 0 }, content: '' });
  }
  const gmbr = satu.match(/^!\[([^\]]*)\]\(data:[^)]*;id=([A-Za-z0-9_-]+)\)\s*$/);
  if (gmbr) return makeBlock({
    type: 'image', meta: { blobId: gmbr[2], alt: gmbr[1].trim() || 'gambar' }, content: '',
  });
  if (/^(\s*)(---+|\*\*\*+|___+)\s*$/.test(gabung)) return makeBlock({ type: 'divider' });
  /* paragraf biasa — beberapa baris disambung spasi */
  return makeBlock({ type: 'paragraph', content: inlineHtml(baris.join(' ')) });
}
const indentPx = sp => Math.min(10, Math.floor(sp.length / 2)) * 24;

/* Teks markdown utuh → catatan baru (id baru, belum disimpan). */
export function catatanDariMarkdown(nama, teks) {
  const asli = String(teks || '').replace(/^\uFEFF/, '').split('\n');
  let meta = {};
  let baris = asli;
  if (asli[0] && /^---\s*$/.test(asli[0])) {
    const akhir = asli.findIndex((b, i) => i > 0 && /^---\s*$/.test(b));
    if (akhir > 0) {
      meta = yamlBaca(asli.slice(1, akhir));
      baris = asli.slice(akhir + 1);
    }
  }

  const blocks = [];
  let kumpul = [];     /* baris paragraf/kutipan/daftar yang belum ditutup */
  let diKode = false;  /* sedang di dalam ``` */
  let bahasaKode = '';
  let kode = [];
  let noOl = 0, pendingBlockId = null;
  const denganId = b => { if(b && pendingBlockId){b.id=pendingBlockId;pendingBlockId=null;} return b; };

  const serap = () => {
    if (!kumpul.length) return;
    const b = denganId(blokDariTeks(kumpul, noOl));
    if (b) {
      blocks.push(b);
      noOl = b.type === 'ordered-list' ? noOl + 1 : 0;
    }
    kumpul = [];
  };

  baris.forEach(b => {
    if (diKode) {
      if (/^\s*(```|~~~)\s*$/.test(b)) {
        blocks.push(denganId(makeBlock({
          type: 'code',
          content: kode.join('<br>'),
          meta: bahasaKode ? { lang: bahasaKode } : {},
        })));
        kode = []; diKode = false; bahasaKode = '';
      } else kode.push(b.replace(/\t/g, '  '));
      return;
    }
    const marker = b.match(/^\s*<!--\s*hara:block:([A-Za-z0-9_-]{1,160})\s*-->\s*$/);
    if(marker){serap();pendingBlockId=marker[1];return;}
    const bukaKode = b.match(/^\s*(?:```|~~~)\s*([A-Za-z0-9_+-]*)\s*$/);
    if (bukaKode) { serap(); diKode = true; bahasaKode = bukaKode[1] || ''; return; }
    if (/^\s*$/.test(b)) { serap(); noOl = 0; return; }
    kumpul.push(b);
  });
  serap();
  if (diKode && kode.length)
    blocks.push(denganId(makeBlock({ type: 'code', content: kode.join('<br>') })));

  let judul = '';
  const jMeta = meta.judul ?? meta.title;
  if (typeof jMeta === 'string') judul = jMeta;
  if (!judul) {
    const h1 = blocks.find(x => x.type === 'heading' && x.meta.level === 1);
    judul = h1 ? h1.content.replace(/<[^>]*>/g, '') : '';
  }
  if (!judul) judul = namaBerkasAman(nama).replace(/\.md$/i, '');

  const now = Date.now();
  const haraId = typeof meta.hara_id === 'string' && /^[A-Za-z0-9._:-]{1,160}$/.test(meta.hara_id) ? meta.hara_id : undefined;
  const n = makeNote({
    ...(haraId ? { id: haraId } : {}),
    title: judul,
    blocks: blocks.length ? blocks : [makeBlock({ type: 'paragraph' })],
    /* cache tag diisi sinkronTag() di bawah — di sini dikosongkan dulu */
    tags: [],
    createdAt: dariISO(meta.dibuat ?? meta.created) || now,
    updatedAt: dariISO(meta.diubah ?? meta.updated) || now,
    archived: meta.diarsipkan === true,
    pinned: meta.disematkan === true,
    props: Object.entries(meta)
      .filter(([k]) => !['judul', 'title', 'dibuat', 'created', 'diubah', 'updated',
        'tag', 'diarsipkan', 'disematkan', 'hara_id'].includes(k))
      .map(([k, v]) => ({ k, v: Array.isArray(v) ? v.join(', ') : String(v) })),
  });
  /* Tag frontmatter yang TIDAK muncul sebagai #tag di isi menjadi tag
     MANUAL (dipertahankan di cache, tidak hilang diam-diam). Yang sudah
     ada di isi cukup diwakili span-nya — begitu span dihapus, tag itu
     ikut hilang dari cache. */
  const tagFront = Array.isArray(meta.tag) ? meta.tag.map(String) : [];
  const diIsi = tagDariIsi(n);
  const manual = tagFront.filter(t => !diIsi.includes(t));
  if (manual.length) n.tagsManual = manual;
  sinkronTag(n);   /* cache = tag dari isi + tag manual frontmatter */
  return n;
}

/* Siapkan impor dari nama berkas + isi → ringkasan terpadu. */
/* decodeURIComponent yang tidak melempar untuk nama berkas yang tidak valid. */
function decodeURIComponent_aman(s) {
  try { return decodeURIComponent(s); } catch (e) { return s; }
}

export async function siapImpor(nama, isi, mentah) {
  const nm = String(nama || '').toLowerCase();
  if (nm.endsWith('.json')) return siapImporJson(String(isi));
  if (nm.endsWith('.zip')) {
    const { entri, dilewati, lampiran = [] } = await bacaZipLengkap(mentah);
    /* Notion: tautan antar halaman dijadikan [[wikilink]] (lihat impor-notion.js).
       Untuk zip biasa, tautan ke berkas .md lain di zip ikut diperlakukan sama. */
    const peta = petaTautanNotion(entri);
    const catatan = [], mapLampiran = new Map(lampiran.map(a=>[a.nama,a]));
    const tipeExt={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',svg:'image/svg+xml',mp3:'audio/mpeg',ogg:'audio/ogg',pdf:'application/pdf'};
    const pulihkanTautanLampiran=teks=>String(teks).replace(/!\[([^\]]*)\]\(attachments\/([A-Za-z0-9_-]+)\.([A-Za-z0-9]+)\)/g,(_m,alt,id,ext)=>{const a=mapLampiran.get(`attachments/${id}.${ext}`);return a?`![${alt}](data:${tipeExt[ext.toLowerCase()]||'application/octet-stream'};id=${id})`:_m;}).replace(/\[(?:Lampiran:\s*)?([^\]]+)\]\(attachments\/([A-Za-z0-9_-]+)\.([A-Za-z0-9]+)\)/g,(_m,label,id,ext)=>{const a=mapLampiran.get(`attachments/${id}.${ext}`);return a?`[Lampiran: ${label}](data:application/simpan-dalam-cadangan-json;id=${id};size=${a.bytes.length})`:_m;});
    for (const e of entri) {
      const eNama = e.nama.toLowerCase();
      if (eNama.endsWith('.md') || eNama.endsWith('.markdown')) {
        const teks = pulihkanTautanLampiran(tulisUlangTautan(e.teks, normJalur(decodeURIComponent_aman(e.nama)), peta));
        catatan.push(catatanDariMarkdown(namaBersihNotion(e.nama) + '.md', teks));
      } else if (eNama.endsWith('.csv')) {
        catatan.push(catatanDariMarkdown(namaBersihNotion(e.nama) + '.md', csvKeMarkdown(e.teks)));
      } else if (eNama.endsWith('.json') && !catatan.length && entri.length === 1)
        return siapImporJson(e.teks);
    }
    if (!catatan.length && !dilewati) throw new Error(tr('Zip tidak berisi berkas .md.'));
    return { jenis: 'md', catatan, dilewati, jumlahBlob: lampiran.length, lampiran };
  }
  if (nm.endsWith('.csv')) {
    return { jenis: 'md', catatan: [catatanDariMarkdown(namaBersihNotion(nama) + '.md', csvKeMarkdown(String(isi)))], dilewati: 0, jumlahBlob: 0 };
  }
  if (nm.endsWith('.md') || nm.endsWith('.markdown') || nm.endsWith('.txt'))
    return { jenis: 'md', catatan: [catatanDariMarkdown(nama, String(isi))], dilewati: 0, jumlahBlob: 0 };
  throw new Error(tr('Jenis berkas tidak dikenal — pakai .json, .md, .csv, atau .zip.'));
}

/* Terapkan impor (json: gabung/timpa; md: selalu tambah baru). */
export async function terapkanImpor(r, mode, resolutions = {}) {
  if (r.jenis === 'json') return terapkanImporJson(r, mode, resolutions);
  const baru = Array.isArray(r.catatan) ? r.catatan : [];
  const same = (a,b) => markdownDariCatatan(a) === markdownDariCatatan(b);
  const conflicts = baru.flatMap(incoming => {
    const current = state.notes.find(n => n.id === incoming.id);
    return current && !same(current, incoming) ? [{ id: incoming.id, title: incoming.title, current, incoming }] : [];
  });
  const belumDipilih = conflicts.filter(c => !['lokal','impor','salin'].includes(resolutions[c.id]));
  if (belumDipilih.length) return { catatan: state.notes.length, baru: 0, conflicts: belumDipilih, dipulihkan: 0, mode: 'gabung' };
  let dibuat = 0, diperbarui = 0;
  const mime={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',svg:'image/svg+xml',mp3:'audio/mpeg',ogg:'audio/ogg',pdf:'application/pdf'};
  const akanDiimpor=baru.filter(n=>{const cur=state.notes.find(x=>x.id===n.id);return !cur||(!same(cur,n)&&['impor','salin'].includes(resolutions[n.id]));});
  const perluBlob=new Set();for(const n of akanDiimpor)for(const b of n.blocks||[])if(b?.meta?.blobId)perluBlob.add(String(b.meta.blobId));
  const blobMap=new Map(), lampiranSiap=[];
  for(const a of r.lampiran||[]){const m=a.nama.match(/^attachments\/([A-Za-z0-9_-]{1,160})\.([A-Za-z0-9]{1,8})$/i);if(!m||!perluBlob.has(m[1]))continue;let id=m[1],existing=await ambilBlob(id);
    if(existing){const old=new Uint8Array(await existing.arrayBuffer()),next=new Uint8Array(a.bytes);if(old.length!==next.length||old.some((x,i)=>x!==next[i])){const fresh=makeNote().id;blobMap.set(id,fresh);id=fresh;}}
    lampiranSiap.push({id,ext:m[2].toLowerCase(),bytes:a.bytes});
  }
  const remap=x=>{if(typeof x==='string')return blobMap.get(x)||x;if(Array.isArray(x))return x.map(remap);if(x&&typeof x==='object')return Object.fromEntries(Object.entries(x).map(([k,v])=>[k,remap(v)]));return x;};
  for(const n of akanDiimpor){const i=baru.indexOf(n);baru[i]=remap(n);}
  for(const a of lampiranSiap)await simpanBlob(a.id,new Blob([a.bytes],{type:mime[a.ext]||'application/octet-stream'}));
  for (const incoming of baru) {
    const i = state.notes.findIndex(n => n.id === incoming.id);
    if (i < 0) { state.notes.unshift(incoming); dibuat++; continue; }
    const current = state.notes[i];
    if (same(current, incoming) || resolutions[incoming.id] === 'lokal') continue;
    if (resolutions[incoming.id] === 'salin') {
      const copy = structuredClone(incoming); copy.id = makeNote().id; copy.createdAt = Date.now();
      state.notes.unshift(copy); dibuat++; continue;
    }
    if (resolutions[incoming.id] === 'impor') { state.notes[i] = incoming; diperbarui++; }
  }
  if (dibuat || diperbarui) save();
  return { catatan: state.notes.length, baru: dibuat, diperbarui, conflicts: [], dipulihkan: 0, mode: 'gabung' };
}
