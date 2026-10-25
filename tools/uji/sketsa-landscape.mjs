/**
 * Pengujian Tahap 1 · A8 (orientasi landscape di sketsa).
 *  - CSS: blok @media landscape pendek ada, dan setiap selector di dalamnya menunjuk elemen yang benar-benar ada.
 *  - Integrasi (jsdom): zoom menghapus batas lebar kanvas (max-width) saat aktif dan mengembalikannya saat 100%.
 *  Tata letak sebenarnya (piksel, tinggi, tombol terpotong) diukur di browser headless di luar repo
 *  (lihat konsep-fitur-catatan/perubahan-tahap-1.md, bagian A8). jsdom tidak menghitung tata letak.
 */

import { JSDOM } from 'jsdom';
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';

const mentahHtml = readFileSync('docs/index.html', 'utf8');
const V = (mentahHtml.match(/\?v=([0-9]+)/) || ['', ''])[1];
const qv = V ? `?v=${V}` : '';
const html = mentahHtml.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
const dom = new JSDOM(html, { url: 'https://hara.local/', pretendToBeVisual: true });
for (const k of [
  'window', 'document', 'navigator', 'HTMLElement', 'Node', 'Element', 'Range', 'Selection',
  'Event', 'MouseEvent', 'KeyboardEvent', 'InputEvent', 'MutationObserver',
  'FileReader', 'URL', 'localStorage', 'sessionStorage', 'getComputedStyle', 'CustomEvent',
  'DOMParser', 'XMLSerializer', 'NodeFilter',
]) {
  if (dom.window[k] !== undefined) {
    try { globalThis[k] = dom.window[k]; }
    catch { Object.defineProperty(globalThis, k, { value: dom.window[k], configurable: true }); }
  }
}
globalThis.self = globalThis;
globalThis.addEventListener = dom.window.addEventListener.bind(dom.window);
globalThis.removeEventListener = dom.window.removeEventListener.bind(dom.window);
globalThis.PointerEvent = dom.window.MouseEvent;
globalThis.requestAnimationFrame = fn => setTimeout(fn, 0);
globalThis.cancelAnimationFrame = id => clearTimeout(id);
globalThis.scrollTo = () => {};
dom.window.scrollTo = () => {};
HTMLElement.prototype.scrollIntoView = () => {};
URL.createObjectURL = () => 'blob:uji-landscape';
URL.revokeObjectURL = () => {};
globalThis.fetch = async () => ({ ok: false, status: 503 });

await import(`../../docs/app.js${qv}`);
const { bukaStudioSketsa } = await import(`../../docs/notes/editor/sketsa.js${qv}`);

const tunggu = ms => new Promise(r => setTimeout(r, ms));
let lulus = 0, gagal = 0;
function cek(nama, kondisi, detail = '') {
  if (kondisi) { lulus++; console.log('  ✓', nama); }
  else { gagal++; console.error('  ✗ GAGAL:', nama, detail); }
}

console.log('── CSS: blok landscape pendek (notes.css) ──');
{
  const css = readFileSync('docs/styles/notes.css', 'utf8');
  const kunci = '@media (orientation: landscape) and (max-height: 600px){';
  const mulai = css.indexOf(kunci);
  cek('blok @media landscape pendek ada', mulai >= 0);
  // ambil blok dengan pencocokan kurung kurawal
  let isi = '';
  if (mulai >= 0) {
    let d = 0, i = mulai + kunci.length - 1;
    for (; i < css.length; i++) {
      if (css[i] === '{') d++;
      else if (css[i] === '}') { d--; if (d === 0) break; }
    }
    isi = css.slice(mulai + kunci.length, i);
  }
  cek('kurung kurawal notes.css seimbang', (css.match(/{/g) || []).length === (css.match(/}/g) || []).length);
  cek('blok landscape: .sk-box memakai grid dua kolom', /\.sk-box\{[^}]*display:grid/.test(isi) && /grid-template-columns:minmax\(0,1fr\)/.test(isi));
  cek('blok landscape: panel alat (.sk-bar) di kolom kanan dan bisa digulir', /\.sk-bar\{[^}]*grid-column:2/.test(isi) && /overflow-y:auto/.test(isi));
  cek('blok landscape: kanvas dibatasi lebar stage (max-width:100%)', /#sk-canvas\{[^}]*max-width:100%/.test(isi));
  cek('blok landscape: stage tidak lagi memakai min-height 240 px', /\.sk-stage\{[^}]*min-height:0/.test(isi));
}

console.log('── Integrasi (jsdom): selector landscape menunjuk elemen yang ada ──');
{
  bukaStudioSketsa();
  await tunggu(30);
  const sel = {
    '.sketsa-modal': '.sketsa-modal',
    '.sk-box': '.sketsa-modal > .sk-box',
    '.sk-top': '.sk-box > .sk-top',
    '.sk-stage': '.sk-box > .sk-stage',
    '#sk-canvas': '.sk-box > .sk-stage > #sk-canvas',
    '.sk-bentuk': '.sk-box > .sk-bentuk',
    '.sk-bar': '.sk-box > .sk-bar',
  };
  for (const [nama, q] of Object.entries(sel)) {
    cek(`elemen ${nama} ada di susunan yang dipakai CSS (${q})`, !!document.querySelector(q));
  }
  cek('.sk-bentuk awalnya tersembunyi (baris grid auto kosong)', document.querySelector('#sk-bentuk').hidden === true);
  const cv = document.getElementById('sk-canvas');
  document.getElementById('sk-zoom-besar').click();
  await tunggu(20);
  cek('zoom aktif: batas lebar kanvas dilepas (max-width none) agar kanvas bisa lebih lebar dari stage',
    cv.style.maxWidth === 'none', `maxWidth="${cv.style.maxWidth}"`);
  cek('zoom aktif: lebar kanvas inline diisi', /px$/.test(cv.style.width), cv.style.width);
  document.getElementById('sk-zoom-reset').click();
  await tunggu(20);
  cek('zoom 100%: batas lebar kembali kosong, ukuran inline dihapus',
    cv.style.maxWidth === '' && cv.style.width === '', `maxWidth="${cv.style.maxWidth}" width="${cv.style.width}"`);
  document.querySelector('#sk-batal').click();
}

console.log(`\nTotal: ${lulus + gagal} pengujian · Lulus: ${lulus} · Gagal: ${gagal}`);
if (gagal > 0) process.exit(1);
process.exit(0);
