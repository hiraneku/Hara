/**
 * Pengujian Tahap 1 · A6 (zoom tampilan) dan A7 (ukuran kanvas kerja).
 *  Zoom tidak mengubah koordinat tersimpan; ukuran kanvas disimpan di data (kanvas).
 *  Bootstrap jsdom sama dengan sketsa-goresan.mjs.
 *  - Unit: docs/notes/editor/goresan.js (validasi, batas, serialisasi, baca balik).
 *  - Integrasi (jsdom): /sketch menyimpan data-goresan, dibuka ulang tanpa kehilangan goresan,
 *    sketsa lama dan coretan di atas foto tetap memakai jalur PNG (tanpa data-goresan).
 */

import { JSDOM } from 'jsdom';
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';

const mentahHtml = readFileSync('docs/index.html', 'utf8');
const V = (mentahHtml.match(/\?v=([0-9]+)/) || ['', ''])[1];
const qv = V ? `?v=${V}` : '';
const html = mentahHtml.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

const dom = new JSDOM(html, {
  url: 'https://hara.local/',
  pretendToBeVisual: true,
});

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
URL.createObjectURL = () => 'blob:uji-genbaru';
URL.revokeObjectURL = () => {};
globalThis.fetch = async () => ({ ok: false, status: 503 });

await import(`../../docs/app.js${qv}`);

const { state, save } = await import(`../../docs/core/store.js${qv}`);
const { makeNote, makeBlock, domToBlocks } = await import(`../../docs/notes/note-model.js${qv}`);
const { openNote } = await import(`../../docs/notes/model.js${qv}`);
const { setModeBaca } = await import(`../../docs/notes/mode-baca.js${qv}`);
const { pasangKunci, resetSesi } = await import(`../../docs/notes/kunci.js${qv}`);
const { cadanganJson, markdownDariCatatan, catatanDariMarkdown } = await import(`../../docs/notes/data-io.js${qv}`);
const { simpanBlob } = await import(`../../docs/core/blobs.js${qv}`);
const { bukaStudioSketsa, terapkanFilterPindai } = await import(`../../docs/notes/editor/sketsa.js${qv}`);
const {
  renderRumusMatematika, insertMathBlock, insertBookmarkBlock, lampirkanBerkasKeCatatan,
  bukaMenuAksiBlok, setWarnaLatarBlok, duplikatBlok, salinTautanKeBlok,
} = await import(`../../docs/notes/editor/blok-generasi-baru.js${qv}`);
const {
  evaluasiEkspresiAman, cobaHitungInlineSekarang, ubahTeksPintar, jumlahkanAngkaDalamTeks,
  resetSemuaCentangTodo, buatSvgKartuCatatan, eksporHtmlMandiri,
} = await import(`../../docs/notes/alat-cerdas.js${qv}`);
const {
  aturFokusMenulis, simpanPosisiGulir, ambilPosisiGulir, setSampulCatatan,
  bukaGrafInteraktif, perbaruiGarisProgresBaca,
} = await import(`../../docs/notes/navigasi-fokus.js${qv}`);

const tunggu = ms => new Promise(r => setTimeout(r, ms));
let lulus = 0, gagal = 0;
function cek(nama, kondisi) {
  if (kondisi) { lulus++; console.log('  ✓', nama); }
  else { gagal++; console.error('  ✗ GAGAL:', nama); }
}
async function tungguSampai(fn, ms = 2500) {
  const batas = Date.now() + ms;
  let v = fn();
  while (!v && Date.now() < batas) { await tunggu(30); v = fn(); }
  return v;
}

const goresanMod = await import('../../docs/notes/editor/goresan.js');
const { serialGoresan, bacaGoresan, bersihkanKanvas, KANVAS_BATAS } = goresanMod;

console.log('── Unit: ukuran kanvas (goresan.js) ──');
{
  cek('Unit kanvas: tanpa data memakai default 720×460', JSON.stringify(bersihkanKanvas(null)) === '{"w":720,"h":460}');
  cek('Unit kanvas: nilai di bawah minimum dan di atas maksimum dibatasi',
    JSON.stringify(bersihkanKanvas({ w: 100, h: 9000 })) === JSON.stringify({ w: KANVAS_BATAS.minW, h: KANVAS_BATAS.maxH }));
  cek('Unit kanvas: nilai desimal dibulatkan', JSON.stringify(bersihkanKanvas({ w: 800.4, h: 600.6 })) === '{"w":800,"h":601}');
  cek('Unit kanvas: sketsa kosong dengan ukuran default tidak disimpan', serialGoresan({}, 720, 460) === '');
  cek('Unit kanvas: sketsa kosong yang diperbesar tetap disimpan (ukuran saja)', serialGoresan({}, 960, 600) !== '');
  const teks = serialGoresan({ goresan: [{ alat: 'pena', warna: '#111827', ukuran: 4, pts: [{ x: 900, y: 500 }] }] }, 960, 600);
  const b = bacaGoresan(teks);
  cek('Unit kanvas: ukuran kanvas dan koordinat di area lebar ikut terbaca',
    !!b && b.kanvas.w === 960 && b.kanvas.h === 600 && b.goresan[0].pts[0].x === 900);
  const v2 = bacaGoresan('{"v":2,"goresan":[{"alat":"pena","warna":"#111827","ukuran":4,"pts":[{"x":5,"y":5}]}]}');
  cek('Unit kanvas: data v2 (tanpa kanvas) memakai default', !!v2 && v2.kanvas.w === 720 && v2.kanvas.h === 460);
}

console.log('── Integrasi (jsdom): zoom & ukuran kanvas ──');
{
  const { makeNote } = await import(`../../docs/notes/note-model.js${qv}`);
  const { openNote } = await import(`../../docs/notes/model.js${qv}`);
  const { setModeBaca } = await import(`../../docs/notes/mode-baca.js${qv}`);
  const { state, save } = await import(`../../docs/core/store.js${qv}`);
  const { bukaStudioSketsa } = await import(`../../docs/notes/editor/sketsa.js${qv}`);
  const { blockToHtml, makeBlock } = await import(`../../docs/notes/note-model.js${qv}`);
  const { simpanBlob } = await import(`../../docs/core/blobs.js${qv}`);

  const n = makeNote({ title: 'Uji Zoom A6 & Kanvas A7', blocks: [{ type: 'paragraph', content: 'Kanvas uji' }] });
  state.notes.unshift(n);
  save();
  openNote(n.id);
  setModeBaca(false);
  await tunggu(30);

  /* Rect kanvas mengikuti ukuran tampilan (style) seperti di browser sungguhan */
  const pasangRect = () => {
    const cv = document.getElementById('sk-canvas');
    cv.getBoundingClientRect = () => ({
      left: 0, top: 0,
      width: parseFloat(cv.style.width) || cv.width,
      height: parseFloat(cv.style.height) || cv.height,
    });
  };
  const titik = (type, x, y) => document.getElementById('sk-canvas').dispatchEvent(
    new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }));
  const goresSatu = (x, y, x2, y2) => { titik('pointerdown', x, y); titik('pointermove', x2, y2); titik('pointerup', x2, y2); };
  const klik = id => document.getElementById(id).click();
  const info = () => document.getElementById('sk-kanvas-info').textContent;

  /* A6: zoom tidak mengubah koordinat tersimpan */
  bukaStudioSketsa();
  pasangRect();
  goresSatu(100, 100, 110, 110);
  for (let i = 0; i < 4; i++) klik('sk-zoom-besar');
  cek('A6: tombol + menaikkan zoom ke 200% (readout)', document.getElementById('sk-zoom-reset').textContent === '200%');
  cek('A6: kanvas di layar membesar, ukuran kanvas asli tetap 720×460', document.getElementById('sk-canvas').width === 720 && info() === '720×460');
  goresSatu(200, 200, 220, 220);
  document.getElementById('sk-simpan').click();
  const figZoom = await tungguSampai(() => document.querySelector('.ed-doc .b-img[data-sketch="1"][data-goresan]'), 4000);
  const dataZoom = figZoom ? bacaGoresan(figZoom.getAttribute('data-goresan')) : null;
  cek('A6: dua goresan (satu tanpa zoom, satu saat zoom 200%) tersimpan dengan koordinat logis yang sama',
    !!dataZoom && dataZoom.goresan.length === 2
    && dataZoom.goresan[0].pts[0].x === 100 && dataZoom.goresan[0].pts[0].y === 100
    && dataZoom.goresan[1].pts[0].x === 100 && dataZoom.goresan[1].pts[0].y === 100);
  cek('A6: ukuran kanvas yang tersimpan tetap 720×460 (zoom tidak mengubah ukuran)',
    !!dataZoom && dataZoom.kanvas.w === 720 && dataZoom.kanvas.h === 460);

  /* A6: alat Geser menggeser tampilan, bukan menggambar */
  bukaStudioSketsa(figZoom);
  await tunggu(30);
  pasangRect();
  const stage = document.querySelector('.sk-stage');
  for (let i = 0; i < 4; i++) klik('sk-zoom-besar');
  stage.scrollLeft = 0;
  stage.scrollTop = 0;
  document.querySelector('[data-sk-alat="geser"]').click();
  titik('pointerdown', 200, 200);
  titik('pointermove', 150, 170);
  titik('pointerup', 150, 170);
  cek('A6: alat Geser menggeser tampilan (scroll +50, +30)', stage.scrollLeft === 50 && stage.scrollTop === 30);
  cek('A6: alat Geser tidak menambah goresan (tombol Simpan masih terbuka dan tanpa goresan baru)',
    !!document.getElementById('sk-simpan') && !!document.getElementById('sk-canvas') && bacaGoresan(figZoom.getAttribute('data-goresan')).goresan.length === 2);
  klik('sk-zoom-reset');
  cek('A6: tombol 100% mengembalikan tampilan pas layar', document.getElementById('sk-canvas').style.width === '' && document.getElementById('sk-zoom-reset').textContent === '100%');
  document.getElementById('sk-batal').click();

  /* A7: perluas kanvas, gambar di area baru, simpan ukurannya */
  bukaStudioSketsa();
  pasangRect();
  klik('sk-lebar-besar');
  klik('sk-lebar-besar');
  klik('sk-tinggi-besar');
  cek('A7: tombol Lebar + dan Tinggi + memperbesar kanvas (readout 960×580)', info() === '960×580');
  cek('A7: ukuran kanvas di elemen ikut berubah', document.getElementById('sk-canvas').width === 960 && document.getElementById('sk-canvas').height === 580);
  pasangRect();
  goresSatu(900, 500, 910, 510);
  document.getElementById('sk-simpan').click();
  const figBesar = await tungguSampai(() => document.querySelector('.ed-doc .b-img[data-sketch="1"][data-goresan*="960"]'), 4000);
  const dataBesar = figBesar ? bacaGoresan(figBesar.getAttribute('data-goresan')) : null;
  cek('A7: ukuran 960×580 tersimpan dan goresan di area baru tetap di koordinat (900, 500)',
    !!dataBesar && dataBesar.kanvas.w === 960 && dataBesar.kanvas.h === 580 && dataBesar.goresan[0].pts[0].x === 900);

  /* A7: buka ulang memulihkan ukuran kanvas */
  bukaStudioSketsa(figBesar);
  await tunggu(30);
  cek('A7: dibuka ulang, ukuran kanvas 960×580 dipulihkan', info() === '960×580' && document.getElementById('sk-canvas').width === 960);

  /* A7: pengecilan ditolak bila goresan keluar dari area baru */
  klik('sk-lebar-kecil');
  klik('sk-lebar-kecil');
  cek('A7: pengecilan ditolak bila ada goresan di luar area baru (tetap 960×580)', info() === '960×580');

  /* A7: setelah dibersihkan, pengecilan diizinkan */
  klik('sk-bersih');
  klik('sk-lebar-kecil');
  klik('sk-lebar-kecil');
  cek('A7: setelah Bersihkan, lebar bisa dikecilkan ke 720 (readout 720×580)', info() === '720×580');
  document.getElementById('sk-simpan').click();
  await tunggu(200);
  const figKecil = document.querySelector('.ed-doc .b-img[data-sketch="1"][data-goresan*="580"]');
  const dataKecil = figKecil ? bacaGoresan(figKecil.getAttribute('data-goresan')) : null;
  cek('A7: sketsa kosong dengan ukuran berubah tetap tersimpan (kanvas 720×580)',
    !!dataKecil && dataKecil.kanvas.w === 720 && dataKecil.kanvas.h === 580 && dataKecil.goresan.length === 0);

  /* A7: sketsa berlatar foto/sketsa lama tidak bisa diubah ukurannya */
  const idLama = 'sk_uji_kanvas_lama';
  await simpanBlob(idLama, new dom.window.Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' }));
  const wrap = document.createElement('div');
  wrap.innerHTML = blockToHtml(makeBlock({ type: 'image', meta: { blobId: idLama, alt: 'sketsa', sketch: true } }));
  const figLama = wrap.firstElementChild;
  document.querySelector('.ed-doc').appendChild(figLama);
  bukaStudioSketsa(figLama);
  await tunggu(60);
  klik('sk-lebar-besar');
  cek('A7: sketsa berlatar gambar lama tidak bisa diubah ukuran kanvasnya (tetap 720×460)', info() === '720×460');
  document.getElementById('sk-batal').click();
}

console.log(`\nTotal: ${lulus + gagal} pengujian · Lulus: ${lulus} · Gagal: ${gagal}`);
if (gagal > 0) process.exit(1);
process.exit(0);
