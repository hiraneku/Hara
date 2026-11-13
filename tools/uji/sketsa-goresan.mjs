/**
 * Pengujian Tahap 1 · A1 (Handwriting and drawing): goresan sketsa disimpan sebagai data.
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
const { bersihkanGoresan, serialGoresan, bacaGoresan, BATAS_GORESAN } = goresanMod;
const LB = 720, TG = 460;

console.log('── Unit: model goresan (goresan.js) ──');
{
  const bersih = bersihkanGoresan([
    { alat: 'pena', warna: '#ff0000', ukuran: 4, pts: [{ x: 10.04, y: 20 }, { x: 'abc', y: 3 }, null] },
    { alat: 'sihir', warna: '#ff0000', ukuran: 4, pts: [{ x: 1, y: 1 }] },
    { alat: 'garis', warna: 'merah', ukuran: 999, pts: [{ x: 5000, y: -5000 }] },
    null,
  ], LB, TG);
  cek('Unit: goresan dengan alat tidak dikenal dibuang', bersih.length === 2);
  cek('Unit: titik non-angka dibuang, koordinat dibulatkan ke 0,1', bersih[0].pts.length === 1 && bersih[0].pts[0].x === 10);
  cek('Unit: warna tidak valid diganti default, ukuran dibatasi', bersih[1].warna === '#111827' && bersih[1].ukuran === BATAS_GORESAN.ukuranMaks);
  cek('Unit: koordinat di luar dibatasi (2x kanvas)', bersih[1].pts[0].x === 2 * LB && bersih[1].pts[0].y === -TG);

  const kosong = serialGoresan({ goresan: [] }, LB, TG);
  cek('Unit: tanpa goresan tidak menghasilkan data', kosong === '');

  const asli = [
    { alat: 'pena', warna: '#2563eb', ukuran: 4, pts: [{ x: 80, y: 90 }, { x: 120.5, y: 100 }, { x: 220, y: 160 }] },
    { alat: 'stabilo', warna: '#d97706', ukuran: 8, pts: [{ x: 10, y: 10 }, { x: 300, y: 12 }] },
  ];
  const teks = serialGoresan({ goresan: asli, latar: 'gelap', pola: 'garis' }, LB, TG);
  const balik = bacaGoresan(teks, LB, TG);
  cek('Unit: serialisasi lalu baca balik menghasilkan goresan, latar, dan pola yang sama',
    !!balik && balik.latar === 'gelap' && balik.pola === 'garis'
    && JSON.stringify(balik.goresan) === JSON.stringify(asli.map(st => ({ alat: st.alat, warna: st.warna, ukuran: st.ukuran, gaya: 'tinta', pts: st.pts, lapisan: 'dasar' }))));
  cek('Unit: data rusak tidak membuat error (null)', bacaGoresan('{rusak', LB, TG) === null);
  cek('Unit: versi tidak dikenal ditolak (null)', bacaGoresan('{"v":9,"goresan":[]}', LB, TG) === null);
  cek('Unit: string kosong ditolak (null)', bacaGoresan('', LB, TG) === null);
  cek('Unit: latar dan pola tidak dikenal memakai default',
    bacaGoresan('{"v":1,"latar":"biru","pola":"x","goresan":[]}', LB, TG).latar === 'putih');

  const banyakGoresan = Array.from({ length: BATAS_GORESAN.goresan + 1 }, () => ({ alat: 'pena', warna: '#111827', ukuran: 2, pts: [{ x: 1, y: 1 }] }));
  cek('Unit: melewati jumlah goresan maksimum tidak disimpan (\'\')', serialGoresan({ goresan: banyakGoresan }, LB, TG) === '');
  const banyakTitik = Array.from({ length: 61 }, () => ({ alat: 'pena', warna: '#111827', ukuran: 2, pts: Array.from({ length: 1000 }, (_, i) => ({ x: i % LB, y: i % TG })) }));
  cek('Unit: melewati total titik maksimum tidak disimpan (\'\')', serialGoresan({ goresan: banyakTitik }, LB, TG) === '');
}

console.log('── Integrasi (jsdom): sketsa menyimpan & memuat ulang goresan ──');
{
  const { elToBlock, blockToHtml, makeBlock, domToBlocks } = await import(`../../docs/notes/note-model.js${qv}`);
  const { openNote } = await import(`../../docs/notes/model.js${qv}`);
  const { setModeBaca } = await import(`../../docs/notes/mode-baca.js${qv}`);
  const { simpanBlob } = await import(`../../docs/core/blobs.js${qv}`);
  const { state, save } = await import(`../../docs/core/store.js${qv}`);
  const { bukaStudioSketsa } = await import(`../../docs/notes/editor/sketsa.js${qv}`);

  const n = makeNote({ title: 'Uji Goresan A1', blocks: [{ type: 'paragraph', content: 'Sketsa uji' }] });
  state.notes.unshift(n);
  save();
  openNote(n.id);
  setModeBaca(false);
  await tunggu(30);

  const goresJalan = (alatList) => {
    const cv = document.getElementById('sk-canvas');
    const dot = (type, x, y) => cv.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }));
    for (const alat of alatList) {
      document.querySelector(`[data-sk-alat="${alat.nama}"]`).click();
      dot('pointerdown', alat.a[0], alat.a[1]);
      dot('pointermove', alat.a[2], alat.a[3]);
      dot('pointerup', alat.a[2], alat.a[3]);
    }
  };

  /* 1. Buat sketsa baru dengan dua goresan, lalu simpan */
  bukaStudioSketsa();
  goresJalan([{ nama: 'pena', a: [80, 90, 220, 160] }, { nama: 'panah', a: [30, 30, 300, 200] }]);
  document.getElementById('sk-simpan').click();
  const fig1 = await tungguSampai(() => document.querySelector('.ed-doc .b-img[data-sketch="1"][data-goresan]'));
  cek('Integrasi: sketsa baru menyimpan atribut data-goresan pada blok gambar', !!fig1);
  const dataAwal = fig1 ? fig1.getAttribute('data-goresan') : '';
  const bacaAwal = bacaGoresan(dataAwal, LB, TG);
  cek('Integrasi: data-goresan berisi dua goresan (pena lalu panah)',
    !!bacaAwal && bacaAwal.goresan.length === 2 && bacaAwal.goresan[0].alat === 'pena' && bacaAwal.goresan[1].alat === 'panah');

  const blokAwal = domToBlocks(document.querySelector('.ed-doc')).find(b => b.type === 'image' && b.meta && b.meta.sketch);
  cek('Integrasi: data goresan ikut tersimpan di meta blok (catatan & cadangan JSON)', !!blokAwal && blokAwal.meta.goresan === dataAwal);

  /* 2. Buka ulang tanpa mengubah apa pun, simpan lagi: goresan harus tetap sama */
  const blobSebelumBuka = fig1.querySelector('img[data-blob]').getAttribute('data-blob');
  bukaStudioSketsa(fig1);
  await tunggu(30);
  document.getElementById('sk-simpan').click();
  await tunggu(200);
  /* Penyimpanan hanya berjalan bila goresan berhasil dimuat (latar kosong di jsdom),
     jadi blob yang berubah membuktikan goresan lama ikut tergambar ulang. */
  cek('Integrasi: dibuka ulang & disimpan ulang (blob gambar baru)',
    fig1.querySelector('img[data-blob]').getAttribute('data-blob') !== blobSebelumBuka);
  cek('Integrasi: dibuka ulang & disimpan tanpa perubahan, goresan identik',
    fig1.getAttribute('data-goresan') === dataAwal);

  /* 3. Bersihkan lalu gambar satu goresan: hanya goresan baru yang tersimpan */
  bukaStudioSketsa(fig1);
  await tunggu(30);
  document.getElementById('sk-bersih').click();
  goresJalan([{ nama: 'garis', a: [10, 10, 500, 400] }]);
  document.getElementById('sk-simpan').click();
  await tunggu(200);
  const bacaBersih = bacaGoresan(fig1.getAttribute('data-goresan'), LB, TG);
  cek('Integrasi: setelah Bersihkan, hanya goresan baru yang tersimpan',
    !!bacaBersih && bacaBersih.goresan.length === 1 && bacaBersih.goresan[0].alat === 'garis');

  /* 4. Sketsa lama (tanpa data-goresan) tetap memakai jalur PNG: tidak ada data-goresan baru */
  const idLama = 'sk_uji_lama';
  await simpanBlob(idLama, new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' }));
  const wrap = document.createElement('div');
  wrap.innerHTML = blockToHtml(makeBlock({ type: 'image', meta: { blobId: idLama, alt: 'sketsa', sketch: true } }));
  const figLama = wrap.firstElementChild;
  document.querySelector('.ed-doc').appendChild(figLama);
  bukaStudioSketsa(figLama);
  await tunggu(60);
  goresJalan([{ nama: 'pena', a: [40, 40, 60, 60] }]);
  document.getElementById('sk-simpan').click();
  await tunggu(200);
  cek('Integrasi: sketsa lama (PNG) disimpan ulang tanpa data-goresan',
    !figLama.hasAttribute('data-goresan') && figLama.querySelector('img[data-blob]')?.getAttribute('data-blob') !== idLama);

  /* 5. Coretan di atas foto biasa: hasilnya gambar, tanpa data-goresan */
  const idFoto = 'foto_uji_a1';
  await simpanBlob(idFoto, new Blob([new Uint8Array([255, 216, 255])], { type: 'image/jpeg' }));
  const wrapF = document.createElement('div');
  wrapF.innerHTML = blockToHtml(makeBlock({ type: 'image', meta: { blobId: idFoto, alt: 'foto' } }));
  const figFoto = wrapF.firstElementChild;
  document.querySelector('.ed-doc').appendChild(figFoto);
  bukaStudioSketsa(figFoto);
  await tunggu(60);
  goresJalan([{ nama: 'pena', a: [50, 50, 90, 90] }]);
  document.getElementById('sk-simpan').click();
  await tunggu(200);
  cek('Integrasi: coretan di atas foto tidak menyimpan data-goresan', !figFoto.hasAttribute('data-goresan'));

  /* 6. Round trip atribut: blok dengan goresan -> HTML -> elToBlock */
  const teksGor = serialGoresan({ goresan: [{ alat: 'pena', warna: '#111827', ukuran: 4, pts: [{ x: 1, y: 2 }, { x: 3, y: 4 }] }] }, LB, TG);
  const w2 = document.createElement('div');
  w2.innerHTML = blockToHtml(makeBlock({ type: 'image', meta: { blobId: 'b1', alt: 'sketsa', sketch: true, goresan: teksGor } }));
  const balikMeta = elToBlock(w2.firstElementChild).meta;
  cek('Integrasi: atribut data-goresan dengan tanda kutip lolos round-trip HTML', balikMeta.goresan === teksGor);
}

console.log(`\nTotal: ${lulus + gagal} pengujian · Lulus: ${lulus} · Gagal: ${gagal}`);
if (gagal > 0) process.exit(1);
process.exit(0);
