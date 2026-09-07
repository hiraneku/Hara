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

import { state, save, SCHEMA } from '../core/store.js?v=20260907142616';
import { simpanBlob, ambilBlob, semuaId } from '../core/blobs.js?v=20260907142616';
import { makeNote, makeBlock, normalizeNotes } from './note-model.js?v=20260907142616';
import { sinkronTag } from './tags.js?v=20260907142616';

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
    const m = String(b.content || '').match(/data-blob="([^"]+)"/g);
    if (m) m.forEach(x => id.add(x.slice(12, -1)));
  }));
  return [...id];
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
  const blobs = await kumpulBlob();
  const teks = JSON.stringify({
    format: 'hara-cadangan', versi: 1, schema: SCHEMA,
    diekspor: new Date().toISOString(), seq: state.seq,
    catatan: state.notes, blobs,
  });
  return { nama: `hara-cadangan-${namaHariIni()}.json`, teks };
}

/* Baca berkas JSON cadangan → ringkasan siap-terapkan (belum menyentuh
   storage). Salah bentuk → lempar Error dengan pesan manusiawi. */
export async function siapImporJson(teks) {
  let data = null;
  try { data = JSON.parse(teks); } catch (e) { data = null; }
  if (!data || data.format !== 'hara-cadangan' || !Array.isArray(data.catatan))
    throw new Error('Bukan berkas cadangan Hara (format tidak dikenal).');
  const catatan = normalizeNotes(data.catatan);
  return {
    jenis: 'json',
    catatan, blobs: data.blobs || {},
    jumlahBlob: Object.keys(data.blobs || {}).length,
    seq: data.seq || 1,
  };
}

/* Terapkan impor JSON. mode 'timpa' = kembalikan persis cadangan;
   mode 'gabung' = sisip catatan baru + perbarui catatan ber-id sama. */
export async function terapkanImporJson(r, mode) {
  let daftar = r.catatan;
  if (mode !== 'timpa') {
    daftar = r.catatan.map(datang => {
      const i = state.notes.findIndex(x => x.id === datang.id);
      if (i >= 0) { state.notes[i] = datang; return null; }
      return datang;
    }).filter(Boolean);
    state.notes.push(...daftar);
  } else {
    state.notes = daftar.length ? daftar : state.notes;
  }
  state.seq = Math.max(state.seq || 1, r.seq || 1);

  /* pulihkan gambar dulu, baru simpan — supaya catatan yang dirender
     setelah impor langsung menemukan blobnya */
  let dipulih = 0;
  for (const [id, isi] of Object.entries(r.blobs)) {
    try {
      const u = b64KeBiner(isi.b64 || '');
      await simpanBlob(id, new Blob([u], { type: isi.tipe || '' }));
      dipulih++;
    } catch (e) { /* blob gagal dipulihkan — catatan tetap masuk */ }
  }
  save();
  return { catatan: state.notes.length, baru: mode === 'timpa' ? null : daftar.length,
           dipulihkan: dipulih, mode };
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
    case 'code': return '```\n' + isi + '\n```';
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
  const baris = ['---', `judul: ${kutipYaml(n.title || '')}`];
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
    if (b.type === 'ordered-list') { ol++; badan.push(blokMd(b, ol)); }
    else { ol = 0; badan.push(blokMd(b, 1)); }
  });
  return depanMd(n) + '\n' + badan.filter(x => x !== '').join('\n\n') + '\n';
}

export function eksporSemuaMarkdown() {
  const dipakai = new Set();
  const entri = [];
  state.notes.filter(n => !n.deletedAt).forEach(n => {
    const dasar = namaBerkasAman(n.title);
    let nama = dasar + '.md', i = 2;
    while (dipakai.has(nama)) nama = `${dasar}-${i++}.md`;
    dipakai.add(nama);
    entri.push({ nama, teks: markdownDariCatatan(n) });
  });
  return { nama: `hara-catatan-${namaHariIni()}.zip`, entri };
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
  const files = entri.map(e => ({ nama: teksUtf8(e.nama), data: teksUtf8(e.teks) }));
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
export function bacaZip(bytes) {
  const u = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const baca16 = o => u[o] | (u[o + 1] << 8);
  const baca32 = o => (u[o] | (u[o + 1] << 8) | (u[o + 2] << 16) | (u[o + 3] << 24)) >>> 0;
  /* cari EOCD dari belakang */
  let eocd = -1;
  for (let i = u.length - 22; i >= Math.max(0, u.length - 65557); i--) {
    if (u[i] === 0x50 && u[i + 1] === 0x4B && u[i + 2] === 5 && u[i + 3] === 6) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Bukan berkas zip.');
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
  let kode = [];
  let noOl = 0;

  const serap = () => {
    if (!kumpul.length) return;
    const b = blokDariTeks(kumpul, noOl);
    if (b) {
      blocks.push(b);
      noOl = b.type === 'ordered-list' ? noOl + 1 : 0;
    }
    kumpul = [];
  };

  baris.forEach(b => {
    if (diKode) {
      if (/^\s*(```|~~~)\s*$/.test(b)) {
        blocks.push(makeBlock({ type: 'code', content: kode.join('<br>') }));
        kode = []; diKode = false;
      } else kode.push(b.replace(/\t/g, '  '));
      return;
    }
    if (/^\s*(```|~~~)/.test(b)) { serap(); diKode = true; return; }
    if (/^\s*$/.test(b)) { serap(); noOl = 0; return; }
    kumpul.push(b);
  });
  serap();
  if (diKode && kode.length)
    blocks.push(makeBlock({ type: 'code', content: kode.join('<br>') }));

  let judul = '';
  const jMeta = meta.judul ?? meta.title;
  if (typeof jMeta === 'string') judul = jMeta;
  if (!judul) {
    const h1 = blocks.find(x => x.type === 'heading' && x.meta.level === 1);
    judul = h1 ? h1.content.replace(/<[^>]*>/g, '') : '';
  }
  if (!judul) judul = namaBerkasAman(nama).replace(/\.md$/i, '');

  const now = Date.now();
  const n = makeNote({
    title: judul,
    blocks: blocks.length ? blocks : [makeBlock({ type: 'paragraph' })],
    tags: Array.isArray(meta.tag) ? meta.tag.map(String) : [],
    createdAt: dariISO(meta.dibuat ?? meta.created) || now,
    updatedAt: dariISO(meta.diubah ?? meta.updated) || now,
    archived: meta.diarsipkan === true,
    pinned: meta.disematkan === true,
    props: Object.entries(meta)
      .filter(([k]) => !['judul', 'title', 'dibuat', 'created', 'diubah', 'updated',
        'tag', 'diarsipkan', 'disematkan'].includes(k))
      .map(([k, v]) => ({ k, v: Array.isArray(v) ? v.join(', ') : String(v) })),
  });
  sinkronTag(n);   /* tag dari frontmatter + #tag di isi */
  return n;
}

/* Siapkan impor dari nama berkas + isi → ringkasan terpadu. */
export async function siapImpor(nama, isi, mentah) {
  const nm = String(nama || '').toLowerCase();
  if (nm.endsWith('.json')) return siapImporJson(String(isi));
  if (nm.endsWith('.zip')) {
    const { entri, dilewati } = bacaZip(mentah);
    const catatan = [];
    for (const e of entri) {
      const eNama = e.nama.toLowerCase();
      if (eNama.endsWith('.md')) catatan.push(catatanDariMarkdown(e.nama, e.teks));
      else if (eNama.endsWith('.json') && !catatan.length && entri.length === 1)
        return siapImporJson(e.teks);
    }
    if (!catatan.length && !dilewati) throw new Error('Zip tidak berisi berkas .md.');
    return { jenis: 'md', catatan, dilewati, jumlahBlob: 0 };
  }
  if (nm.endsWith('.md') || nm.endsWith('.markdown') || nm.endsWith('.txt'))
    return { jenis: 'md', catatan: [catatanDariMarkdown(nama, String(isi))], dilewati: 0, jumlahBlob: 0 };
  throw new Error('Jenis berkas tidak dikenal — pakai .json, .md, atau .zip.');
}

/* Terapkan impor (json: gabung/timpa; md: selalu tambah baru). */
export async function terapkanImpor(r, mode) {
  if (r.jenis === 'json') return terapkanImporJson(r, mode);
  const baru = r.catatan;
  state.notes.unshift(...baru);
  save();
  return { catatan: state.notes.length, baru: baru.length, dipulihkan: 0, mode: 'gabung' };
}
