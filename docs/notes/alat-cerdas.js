/**
 * Alat Cerdas & Produktivitas Catatan Mobile (100% Offline, Tanpa eval):
 * #8 Kalkulator Inline di Dalam Catatan (`125000 * 3 + 15000 =` -> `390.000`) + Jumlahkan Angka
 * #9 Bottom Sheet Alat Teks Pintar (Rapikan Copas WA/PDF, Kapitalisasi, Urut Baris, Hapus Duplikat, Jadi To-do)
 * #10 Reset Semua Centang To-do 1 Ketuk (untuk checklist berulang seperti Packing / Belanja Bulanan)
 * #11 Bagikan sebagai Kartu Gambar Estetik PNG + Ekspor HTML Mandiri Offline (lengkap gambar & stiker)
 */

import { state, save } from '../core/store.js?v=20261029180000';
import { docEl, curBlock, caretEnd } from './editor/caret.js?v=20261029180000';
import { blocksToDom, makeBlock, touch, plainText } from './note-model.js?v=20261029180000';
import { refresh } from './editor/cleanup.js?v=20261029180000';
import { snap } from './editor/history.js?v=20261029180000';
import { renumber, pastikanKolomAkhir } from './editor/blocks.js?v=20261029180000';
import { flush } from '../core/autosave.js?v=20261029180000';
import { openPop, closeAll } from './menus/pop.js?v=20261029180000';
import { ambilBlob } from '../core/blobs.js?v=20261029180000';
import { namaBerkasAman, unduh } from './data-io.js?v=20261029180000';
import { renderStickersHtml } from './hamoji.js?v=20261029180000';
import { toast } from '../core/toast.js?v=20261029180000';
import { esc } from '../core/dom.js?v=20261029180000';
import { t as tr, LOKALE } from '../core/i18n.js?v=20261029180000';
import { cur } from '../core/router.js?v=20261029180000';

/* ════════ #8 PARSER ARITMATIKA REKURSIF AMAN (TANPA EVAL) ════════ */
function normalisasiAngkaToken(s) {
  /* Contoh: 125.000 -> 125000 (pemisah ribuan Indonesia), sedangkan 12.5 tetap 12.5 */
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) return s.replace(/\./g, '');
  if (/^\d{1,3}(,\d{3})+$/.test(s)) return s.replace(/,/g, '');
  return s.replace(',', '.');
}

export function evaluasiEkspresiAman(mentah) {
  const s = String(mentah || '')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .trim();
  if (!s || !/[+\-*/^%]/.test(s)) return null;
  if (!/^[\d\s.,+\-*/^%()]+$/.test(s)) return null;

  const tokens = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/[+\-*/^%()]/.test(ch)) { tokens.push(ch); i++; continue; }
    const m = /^[\d.,]+/.exec(s.slice(i));
    if (!m) return null;
    const nilai = Number(normalisasiAngkaToken(m[0]));
    if (!Number.isFinite(nilai)) return null;
    tokens.push(nilai);
    i += m[0].length;
  }
  if (tokens.length < 3) return null;

  let pos = 0;
  function parseTambahKurang() {
    let kiri = parseKaliBagi();
    while (pos < tokens.length && (tokens[pos] === '+' || tokens[pos] === '-')) {
      const op = tokens[pos++];
      const kanan = parseKaliBagi();
      kiri = op === '+' ? kiri + kanan : kiri - kanan;
    }
    return kiri;
  }
  function parseKaliBagi() {
    let kiri = parsePangkat();
    while (pos < tokens.length && (tokens[pos] === '*' || tokens[pos] === '/' || tokens[pos] === '%')) {
      const op = tokens[pos++];
      const kanan = parsePangkat();
      if ((op === '/' || op === '%') && kanan === 0) return NaN;
      kiri = op === '*' ? kiri * kanan : op === '/' ? kiri / kanan : kiri % kanan;
    }
    return kiri;
  }
  function parsePangkat() {
    let dasar = parseUnary();
    if (pos < tokens.length && tokens[pos] === '^') {
      pos++;
      dasar = Math.pow(dasar, parsePangkat());
    }
    return dasar;
  }
  function parseUnary() {
    if (tokens[pos] === '+') { pos++; return parseUnary(); }
    if (tokens[pos] === '-') { pos++; return -parseUnary(); }
    if (tokens[pos] === '(') {
      pos++;
      const v = parseTambahKurang();
      if (tokens[pos] !== ')') return NaN;
      pos++;
      return v;
    }
    const v = tokens[pos++];
    return typeof v === 'number' ? v : NaN;
  }

  const hasil = parseTambahKurang();
  if (pos !== tokens.length || !Number.isFinite(hasil)) return null;
  return Math.round(hasil * 1e6) / 1e6;
}

export function formatHasilHitung(angka) {
  return Number.isInteger(angka)
    ? angka.toLocaleString(LOKALE())
    : angka.toLocaleString(LOKALE(), { maximumFractionDigits: 4 });
}

/**
 * Periksa apakah sebelum kursor (atau di ujung blok aktif) ada pola `<ekspresi> =`
 * lalu sisipkan hasil perhitungannya secara otomatis.
 */
export function cobaHitungInlineSekarang(tampilPesanBilaKosong = false) {
  const b = curBlock();
  if (!b || b.classList.contains('b-code')) return null;
  const teks = Array.from(b.childNodes)
    .filter(n => !(n.nodeType === 1 && n.classList && n.classList.contains('blk-h')))
    .map(n => n.textContent || '')
    .join('');
  /* Cari pola ekspresi aritmatika sebelum tanda '=' di akhir baris */
  const m = /([\d.,\s()+\-*/×÷^%]+)=\s*$/.exec(teks);
  if (!m) {
    if (tampilPesanBilaKosong) {
      toast(tr('Ketik hitungan diakhiri "=" misal: 45000 + 18500 * 2 ='));
    }
    return null;
  }
  const nilai = evaluasiEkspresiAman(m[1]);
  if (nilai === null) {
    if (tampilPesanBilaKosong) toast(tr('Hitungan belum lengkap'));
    return null;
  }
  const terformat = formatHasilHitung(nilai);
  snap();
  const walker = document.createTreeWalker(b, 4, {
    acceptNode: nd => (nd.parentElement && nd.parentElement.closest('.blk-h')) ? 2 : 1,
  });
  let last = null, n;
  while ((n = walker.nextNode())) last = n;
  if (last) {
    const tambahan = (/\s$/.test(last.data) ? '' : ' ') + terformat;
    last.data += tambahan;
  } else {
    const handle = b.querySelector('.blk-h');
    b.insertBefore(document.createTextNode(' ' + terformat), handle || null);
  }
  caretEnd(b);
  refresh();
  toast(`= ${terformat}`);
  return terformat;
}

/* ════════ #9 TRANSFORMASI & ALAT TEKS PINTAR ════════ */
export function ubahTeksPintar(teks, aksi) {
  const s = String(teks || '');
  if (aksi === 'rapikan') {
    return s
      .replace(/[\u200b\u200c\u200d\ufeff]/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .split('\n').map(l => l.trim()).join('\n')
      .trim();
  }
  if (aksi === 'besar') return s.toUpperCase();
  if (aksi === 'kecil') return s.toLowerCase();
  if (aksi === 'judul') {
    return s.toLowerCase().replace(/(^|\s|\()(\p{L})/gu, (_, p1, p2) => p1 + p2.toUpperCase());
  }
  if (aksi === 'kalimat') {
    return s.toLowerCase().replace(/(^\s*\p{L}|[.!?]\s+\p{L})/gu, m => m.toUpperCase());
  }
  if (aksi === 'urut-az') {
    return s.split('\n').map(x => x.trimEnd()).filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'id')).join('\n');
  }
  if (aksi === 'urut-za') {
    return s.split('\n').map(x => x.trimEnd()).filter(Boolean)
      .sort((a, b) => b.localeCompare(a, 'id')).join('\n');
  }
  if (aksi === 'unik') {
    const seen = new Set();
    return s.split('\n').filter(line => {
      const k = line.trim().toLowerCase();
      if (!k) return false;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).join('\n');
  }
  return s;
}

export function jumlahkanAngkaDalamTeks(teks) {
  const cocok = String(teks || '').match(/-?\d(?:[\d.,]*\d)?/g) || [];
  let total = 0, cacah = 0;
  for (const raw of cocok) {
    const n = Number(normalisasiAngkaToken(raw));
    if (Number.isFinite(n)) {
      total += n;
      cacah++;
    }
  }
  return { total: Math.round(total * 1000) / 1000, cacah };
}

export function bukaAlatTeksPintar() {
  const d = docEl();
  if (!d) return;
  const s = window.getSelection();
  const adaSorot = !!(s && s.rangeCount && !s.getRangeAt(0).collapsed && d.contains(s.getRangeAt(0).startContainer));
  const simpanRange = adaSorot ? s.getRangeAt(0).cloneRange() : null;

  const html = `<div class="pop-h">${tr('Alat Teks Pintar')}</div>
    <p class="pop-note">${adaSorot ? tr('Berlaku pada teks yang sedang disorot') : tr('Berlaku pada seluruh blok teks catatan ini')}</p>
    <button type="button" class="pop-i" data-at-aksi="rapikan"><svg class="ico"><use href="#i-pen"/></svg>${tr('Rapikan spasi & baris copas')}</button>
    <button type="button" class="pop-i" data-at-aksi="judul"><svg class="ico"><use href="#i-font"/></svg>${tr('Format Judul Rapi (Title Case)')}</button>
    <button type="button" class="pop-i" data-at-aksi="kalimat"><svg class="ico"><use href="#i-txt"/></svg>${tr('Format Kalimat biasa')}</button>
    <button type="button" class="pop-i" data-at-aksi="besar"><svg class="ico"><use href="#i-font"/></svg>${tr('HURUF BESAR SEMUA')}</button>
    <button type="button" class="pop-i" data-at-aksi="kecil"><svg class="ico"><use href="#i-font"/></svg>${tr('huruf kecil semua')}</button>
    <button type="button" class="pop-i" data-at-aksi="urut-az"><svg class="ico"><use href="#i-list"/></svg>${tr('Urutkan baris A → Z')}</button>
    <button type="button" class="pop-i" data-at-aksi="unik"><svg class="ico"><use href="#i-eraser"/></svg>${tr('Hapus baris kembar / duplikat')}</button>
    <button type="button" class="pop-i" data-at-aksi="jadi-todo"><svg class="ico"><use href="#i-check2"/></svg>${tr('Ubah baris menjadi daftar To-do')}</button>
    <button type="button" class="pop-i" data-at-aksi="jumlahkan"><svg class="ico"><use href="#i-bulb"/></svg>${tr('Jumlahkan semua angka')}</button>`;

  openPop(html, curBlock() || d);
  const p = document.getElementById('pop');
  p?.addEventListener('click', e => {
    const btn = e.target.closest('[data-at-aksi]');
    if (!btn) return;
    const aksi = btn.dataset.atAksi;
    closeAll();

    if (aksi === 'jumlahkan') {
      const sumber = simpanRange ? simpanRange.toString() : (d.textContent || '');
      const { total, cacah } = jumlahkanAngkaDalamTeks(sumber);
      if (!cacah) { toast(tr('Tidak ditemukan angka di teks ini')); return; }
      toast(`${tr('Total')} (${cacah} ${tr('angka')}): ${formatHasilHitung(total)}`);
      return;
    }

    snap();
    if (aksi === 'jadi-todo') {
      const baris = Array.from(d.children).filter(el => el.classList.contains('b-p') || el.classList.contains('b-li'));
      let ubah = 0;
      for (const el of baris) {
        const t = (el.textContent || '').trim();
        if (!t) continue;
        const w = document.createElement('div');
        w.innerHTML = blocksToDom([makeBlock({ type: 'todo', content: el.innerHTML, meta: { checked: false } })]);
        el.replaceWith(w.firstElementChild);
        ubah++;
      }
      renumber();
      pastikanKolomAkhir(d);
      refresh();
      toast(`${ubah} ${tr('baris diubah menjadi To-do')}`);
      return;
    }

    if (simpanRange) {
      const hasil = ubahTeksPintar(simpanRange.toString(), aksi);
      simpanRange.deleteContents();
      simpanRange.insertNode(document.createTextNode(hasil));
      refresh();
      toast(tr('Teks terpilih diperbarui'));
      return;
    }

    /* Tanpa seleksi: terapkan pada blok teks editor */
    if (aksi === 'urut-az' || aksi === 'unik') {
      const teksSemua = Array.from(d.children)
        .filter(el => el.classList.contains('b-p') || el.classList.contains('b-li'))
        .map(el => (el.textContent || '').trim())
        .filter(Boolean)
        .join('\n');
      const barisBaru = ubahTeksPintar(teksSemua, aksi).split('\n').filter(Boolean);
      if (barisBaru.length) {
        d.innerHTML = blocksToDom(barisBaru.map(t => makeBlock({ type: 'paragraph', content: esc(t) })));
        pastikanKolomAkhir(d);
        refresh();
        toast(tr('Daftar dirapikan'));
      }
      return;
    }

    for (const el of Array.from(d.children)) {
      if (el.getAttribute('contenteditable') === 'false' || el.classList.contains('b-code')) continue;
      if (el.classList.contains('b-todo')) {
        const cbx = el.querySelector('.cbx');
        const murni = ubahTeksPintar(el.textContent || '', aksi);
        el.innerHTML = '';
        if (cbx) el.appendChild(cbx);
        el.appendChild(document.createTextNode(murni));
      } else if (el.textContent) {
        el.textContent = ubahTeksPintar(el.textContent, aksi);
      }
    }
    refresh();
    toast(tr('Catatan dirapikan'));
  });
}

/* ════════ #10 RESET SEMUA CENTANG TO-DO 1 KETUK ════════ */
export async function resetSemuaCentangTodo(noteId = state.openId) {
  await flush();
  const n = state.notes.find(x => x.id === noteId);
  if (!n) return 0;

  let direset = 0;
  for (const b of n.blocks || []) {
    if (b.type === 'todo' && b.meta && b.meta.checked) {
      b.meta.checked = false;
      delete b.meta.done;
      direset++;
    }
  }
  if (!direset) {
    toast(tr('Tidak ada To-do tercentang untuk direset'));
    return 0;
  }
  touch(n);
  save();

  if (cur === 'editor' && state.openId === n.id) {
    const d = docEl();
    if (d) {
      snap();
      d.innerHTML = blocksToDom(n.blocks);
      pastikanKolomAkhir(d);
      renumber();
      refresh();
    }
  }
  toast(`${direset} ${tr('To-do direset kembali kosong')}`);
  return direset;
}

/* ════════ #11 BAGIKAN KARTU GAMBAR ESTETIK PNG & EKSPOR HTML MANDIRI ════════ */
const TEMA_KARTU = {
  kertas: { bg: '#faf7f2', fg: '#1c1917', aksen: '#b45309', sub: '#78716c', nama: 'Kertas Hangat' },
  malam:  { bg: '#18181b', fg: '#f4f4f5', aksen: '#38bdf8', sub: '#a1a1aa', nama: 'Malam Tenang' },
  hutan:  { bg: '#064e3b', fg: '#ecfdf5', aksen: '#34d399', sub: '#a7f3d0', nama: 'Hutan Tropis' },
  senja:  { bg: '#4c1d95', fg: '#f5f3ff', aksen: '#f472b6', sub: '#ddd6fe', nama: 'Senja Ungu' },
};

export function buatSvgKartuCatatan(note, kodeTema = 'kertas') {
  const tema = TEMA_KARTU[kodeTema] || TEMA_KARTU.kertas;
  const judul = esc((note?.title || tr('Tanpa judul')).slice(0, 64));
  const barisMentah = plainText(note || { blocks: [] })
    .split('\n').map(l => l.trim()).filter(Boolean).slice(0, 8);
  const barisSvg = barisMentah.map((b, idx) =>
    `<text x="56" y="${178 + idx * 42}" font-family="system-ui,-apple-system,sans-serif" font-size="24" fill="${tema.fg}" opacity="0.92">${esc(b.slice(0, 46))}</text>`
  ).join('');
  const tinggi = Math.max(460, 240 + barisMentah.length * 42);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="${tinggi}" viewBox="0 0 720 ${tinggi}">
    <rect width="720" height="${tinggi}" rx="32" fill="${tema.bg}"/>
    <rect x="56" y="54" width="68" height="6" rx="3" fill="${tema.aksen}"/>
    <text x="56" y="116" font-family="system-ui,-apple-system,sans-serif" font-size="34" font-weight="700" fill="${tema.fg}">${judul}</text>
    ${barisSvg}
    <text x="56" y="${tinggi - 42}" font-family="system-ui,-apple-system,sans-serif" font-size="18" font-weight="600" fill="${tema.sub}">Hara Catatan · ${esc(new Date().toLocaleDateString(LOKALE()))}</text>
  </svg>`;
}

export async function bagikanKartuCatatan(noteId = state.openId, kodeTema = 'kertas') {
  await flush();
  const n = state.notes.find(x => x.id === noteId);
  if (!n) return false;
  const svg = buatSvgKartuCatatan(n, kodeTema);
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const namaBerkas = `${namaBerkasAman(n.title || 'catatan')}-kartu.svg`;

  if (typeof navigator !== 'undefined' && navigator.share && typeof File !== 'undefined') {
    try {
      const berkas = new File([blob], namaBerkas, { type: 'image/svg+xml' });
      if (!navigator.canShare || navigator.canShare({ files: [berkas] })) {
        await navigator.share({ title: n.title || 'Hara', files: [berkas] });
        return true;
      }
    } catch (err) {
      if (err && err.name === 'AbortError') return false;
    }
  }
  unduh(namaBerkas, svg, 'image/svg+xml;charset=utf-8');
  toast(tr('Kartu catatan berhasil diunduh'));
  return true;
}

export function bukaDialogKartuGambar() {
  const n = state.notes.find(x => x.id === state.openId);
  if (!n) return;
  let tema = 'kertas';
  const html = `<div class="pop-h">${tr('Bagikan Kartu Gambar & Ekspor HTML')}</div>
    <div style="padding:10px 12px;display:flex;flex-direction:column;gap:10px">
      <div class="ba-swatches">
        ${Object.entries(TEMA_KARTU).map(([k, v]) =>
          `<button type="button" class="ba-pill${k === tema ? ' active' : ''}" data-kartu-tema="${k}">${esc(tr(v.nama))}</button>`
        ).join('')}
      </div>
      <div id="kartu-prev" class="kartu-prev">${buatSvgKartuCatatan(n, tema)}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
        <button type="button" class="btn btn-sec" id="kartu-html">${tr('Ekspor HTML Mandiri')}</button>
        <button type="button" class="btn btn-pri" id="kartu-unduh">${tr('Bagikan / Unduh Kartu')}</button>
      </div>
    </div>`;
  openPop(html, document.querySelector('#morebtn') || docEl());
  const p = document.getElementById('pop');
  p?.addEventListener('click', async e => {
    const tb = e.target.closest('[data-kartu-tema]');
    if (tb) {
      tema = tb.dataset.kartuTema;
      const pv = p.querySelector('#kartu-prev');
      if (pv) pv.innerHTML = buatSvgKartuCatatan(n, tema);
      return;
    }
    if (e.target.closest('#kartu-unduh')) {
      closeAll();
      await bagikanKartuCatatan(n.id, tema);
      return;
    }
    if (e.target.closest('#kartu-html')) {
      closeAll();
      await eksporHtmlMandiri(n.id);
    }
  });
}

/** Ekspor catatan menjadi satu berkas `.html` mandiri (termasuk gambar base64 & stiker Hamoji). */
export async function eksporHtmlMandiri(noteId = state.openId) {
  await flush();
  const n = state.notes.find(x => x.id === noteId);
  if (!n) return '';
  const wadah = document.createElement('div');
  wadah.innerHTML = blocksToDom(n.blocks || []);
  wadah.querySelectorAll('.blk-h,[data-imgx],[data-aud-del],[data-bmk-del],[data-file-del],.tbl-bar').forEach(x => x.remove());

  /* Tanamkan gambar blob sebagai data URL agar 100% tampil offline di mana saja */
  for (const img of Array.from(wadah.querySelectorAll('img[data-blob]'))) {
    const id = img.getAttribute('data-blob');
    const blob = id ? await ambilBlob(id) : null;
    if (!blob) continue;
    const dataUrl = await new Promise(res => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result || '');
      fr.onerror = () => res('');
      fr.readAsDataURL(blob);
    });
    if (dataUrl) img.setAttribute('src', String(dataUrl));
  }

  const judul = esc(n.title || tr('Tanpa judul'));
  const htmlPenuh = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${judul}</title>
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:740px;margin:0 auto;padding:32px 20px 64px;line-height:1.7;color:#1c1917;background:#fafaf9}
  h1.doc-title{font-size:2rem;margin:0 0 20px;line-height:1.25}
  .doc-wrap{position:relative;background:#fff;padding:28px 24px;border-radius:18px;box-shadow:0 4px 24px rgba(0,0,0,.06)}
  .b-p,.b-li,.b-ol,.b-todo{margin:8px 0}
  .b-li::before{content:"• ";font-weight:700}
  .b-quote{border-left:3px solid #d97706;padding-left:14px;color:#57534e;margin:12px 0}
  .b-code{background:#18181b;color:#f4f4f5;padding:14px;border-radius:10px;font-family:monospace;white-space:pre-wrap}
  .b-table table{width:100%;border-collapse:collapse;margin:12px 0}
  .b-table th,.b-table td{border:1px solid #e5e7eb;padding:8px 10px;text-align:left}
  .b-img img{max-width:100%;border-radius:12px}
  .b-math{padding:12px;text-align:center;font-size:1.15rem;background:#f5f5f4;border-radius:10px;margin:10px 0}
  .math-frac{display:inline-flex;flex-direction:column;vertical-align:middle;text-align:center;padding:0 4px}
  .mf-num{border-bottom:1px solid currentColor;padding-bottom:1px}
  .hamoji-sticker{position:absolute;pointer-events:none}
  .hamoji-drawn-img{width:100%;height:100%;object-fit:contain}
</style>
</head>
<body>
  <div class="doc-wrap">
    <h1 class="doc-title">${judul}</h1>
    ${wadah.innerHTML}
    <div style="position:relative">${renderStickersHtml(n.stickers || [])}</div>
  </div>
</body>
</html>`;

  unduh(`${namaBerkasAman(n.title || 'catatan')}.html`, htmlPenuh, 'text/html;charset=utf-8');
  toast(tr('HTML mandiri berhasil diekspor'));
  return htmlPenuh;
}
