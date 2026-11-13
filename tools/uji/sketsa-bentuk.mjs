/**
 * Pengujian Tahap 1 · A4 (pengenalan bentuk sederhana).
 *  - Unit: bentuk.js mengenali garis, lingkaran, elips, persegi, persegi panjang, segitiga, dan poligon.
 *    Coretan acak, pendek, dan terbuka tetap null (tidak diubah).
 *  - Data: alat "elips" dan "poligon" lolos validasi dan tersimpan di goresan.
 *  - Integrasi (jsdom): menahan ujung memunculkan bar; pakai bentuk / kembali ke coretan asli /
 *    gerak lagi membatalkan pengenalan; coretan cepat tanpa jeda tidak diubah.
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
const { serialGoresan, bacaGoresan } = goresanMod;
const { kenaliBentuk } = await import('../../docs/notes/editor/bentuk.js');

/* Generator titik dengan benih tetap supaya hasil selalu sama */
let benih = 4242;
const acak = () => { benih = (benih * 1103515245 + 12345) & 0x7fffffff; return benih / 0x7fffffff; };
const bising = a => (acak() * 2 - 1) * a;
const lingkaran = (cx, cy, rx, ry, g = 3) => {
  const out = [];
  for (let i = 0; i <= 64; i++) { const t = (i / 64) * 2 * Math.PI; out.push({ x: cx + rx * Math.cos(t) + bising(g), y: cy + ry * Math.sin(t) + bising(g) }); }
  return out;
};
const sisi = (sudut, g = 1.5, per = 14) => {
  const out = [];
  for (let k = 0; k < sudut.length; k++) {
    const a = sudut[k], b = sudut[(k + 1) % sudut.length];
    for (let i = 0; i < per; i++) { const t = i / per; out.push({ x: a.x + (b.x - a.x) * t + bising(g), y: a.y + (b.y - a.y) * t + bising(g) }); }
  }
  out.push({ x: sudut[0].x + bising(g), y: sudut[0].y + bising(g) });
  return out;
};
const garisLurus = (a, b, n = 30) => Array.from({ length: n + 1 }, (_, i) => ({ x: a.x + (b.x - a.x) * i / n + bising(1), y: a.y + (b.y - a.y) * i / n + bising(1) }));

console.log('── Unit: pengenalan bentuk (bentuk.js) ──');
{
  const garis = kenaliBentuk(garisLurus({ x: 50, y: 50 }, { x: 300, y: 120 }));
  cek('Unit bentuk: coretan lurus menjadi garis (2 titik ujung)', !!garis && garis.alat === 'garis' && garis.pts.length === 2);
  const lin = kenaliBentuk(lingkaran(300, 200, 90, 90));
  cek('Unit bentuk: lingkaran menjadi elips dengan nama "Lingkaran" (kotak sisi sama)',
    !!lin && lin.alat === 'elips' && lin.nama === 'Lingkaran' && Math.abs((lin.pts[1].x - lin.pts[0].x) - (lin.pts[1].y - lin.pts[0].y)) < 1e-6);
  const elp = kenaliBentuk(lingkaran(300, 200, 150, 70));
  cek('Unit bentuk: elips lebar tetap "Elips"', !!elp && elp.alat === 'elips' && elp.nama === 'Elips');
  const sq = kenaliBentuk(sisi([{ x: 100, y: 100 }, { x: 260, y: 100 }, { x: 260, y: 260 }, { x: 100, y: 260 }]));
  cek('Unit bentuk: persegi sejajar sumbu menjadi kotak "Persegi"', !!sq && sq.alat === 'kotak' && sq.nama === 'Persegi');
  const pj = kenaliBentuk(sisi([{ x: 100, y: 100 }, { x: 320, y: 100 }, { x: 320, y: 220 }, { x: 100, y: 220 }]));
  cek('Unit bentuk: persegi panjang menjadi kotak "Persegi panjang"', !!pj && pj.alat === 'kotak' && pj.nama === 'Persegi panjang');
  const tri = kenaliBentuk(sisi([{ x: 100, y: 300 }, { x: 300, y: 100 }, { x: 500, y: 300 }]));
  cek('Unit bentuk: segitiga menjadi poligon dengan 3 titik', !!tri && tri.alat === 'poligon' && tri.nama === 'Segitiga' && tri.pts.length === 3);
  cek('Unit bentuk: coretan acak tidak dikenali (null)',
    kenaliBentuk(Array.from({ length: 60 }, () => ({ x: 100 + acak() * 300, y: 100 + acak() * 200 }))) === null);
  cek('Unit bentuk: busur terbuka (tidak tertutup) tidak dikenali (null)',
    kenaliBentuk(Array.from({ length: 40 }, (_, i) => ({ x: 300 + 90 * Math.cos(i / 40 * 1.5 * Math.PI), y: 200 + 90 * Math.sin(i / 40 * 1.5 * Math.PI) }))) === null);
  cek('Unit bentuk: coretan pendek (kurang dari 8 titik) tidak dikenali (null)',
    kenaliBentuk(garisLurus({ x: 50, y: 50 }, { x: 60, y: 55 }, 5)) === null);
  cek('Unit bentuk: input kosong atau rusak tidak error (null)', kenaliBentuk(null) === null && kenaliBentuk([{ x: NaN, y: 1 }]) === null);
  cek('Unit bentuk: panah tidak dikenali dari coretan (tetap manual, null untuk coretan panah pendek)',
    kenaliBentuk(garisLurus({ x: 50, y: 50 }, { x: 200, y: 50 }, 4)) === null);
}

console.log('── Unit: alat elips dan poligon di penyimpanan ──');
{
  const teks = serialGoresan({ goresan: [
    { alat: 'elips', warna: '#2563eb', ukuran: 4, pts: [{ x: 10, y: 10 }, { x: 110, y: 60 }] },
    { alat: 'poligon', warna: '#111827', ukuran: 3, pts: [{ x: 0, y: 0 }, { x: 80, y: 0 }, { x: 40, y: 70 }] },
  ] }, 720, 460);
  const b = bacaGoresan(teks);
  cek('Unit bentuk: elips dan poligon lolos validasi dan terbaca balik',
    !!b && b.goresan.length === 2 && b.goresan[0].alat === 'elips' && b.goresan[1].alat === 'poligon' && b.goresan[1].pts.length === 3);
}

console.log('── Integrasi (jsdom): tahan ujung di /sketch ──');
{
  localStorage.clear();
  const { makeNote } = await import(`../../docs/notes/note-model.js${qv}`);
  const { openNote } = await import(`../../docs/notes/model.js${qv}`);
  const { setModeBaca } = await import(`../../docs/notes/mode-baca.js${qv}`);
  const { state, save } = await import(`../../docs/core/store.js${qv}`);
  const { bukaStudioSketsa } = await import(`../../docs/notes/editor/sketsa.js${qv}`);

  let nomor = 0;
  const catatanBaru = async () => {
    nomor++;
    const n = makeNote({ title: 'Uji Bentuk A4 ' + nomor, blocks: [{ type: 'paragraph', content: 'Bentuk' }] });
    state.notes.unshift(n);
    save();
    openNote(n.id);
    setModeBaca(false);
    await tunggu(30);
  };
  const pasangRect = () => {
    const cv = document.getElementById('sk-canvas');
    cv.getBoundingClientRect = () => ({ left: 0, top: 0, width: parseFloat(cv.style.width) || cv.width, height: parseFloat(cv.style.height) || cv.height });
  };
  const titik = (type, x, y) => document.getElementById('sk-canvas').dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }));
  const bar = () => document.getElementById('sk-bentuk');
  const barTampil = () => !!bar() && !bar().hidden;
  const klik = sel => document.querySelector(sel).click();
  const goresanTerakhir = () => {
    const fig = [...document.querySelectorAll('.ed-doc .b-img[data-sketch="1"][data-goresan]')].pop();
    return fig ? bacaGoresan(fig.getAttribute('data-goresan')) : null;
  };
  /* Simpan sketsa lalu tunggu gambar tersimpan */
  const simpanDanBaca = async () => {
    klik('#sk-simpan');
    return tungguSampai(() => goresanTerakhir(), 4000);
  };
  /* Menarik coretan titik demi titik; tahanMs > 0 berarti ujung dibiarkan diam sebelum dilepas */
  const coret = async (pts, tahanMs = 0) => {
    titik('pointerdown', pts[0].x, pts[0].y);
    for (const p of pts.slice(1)) titik('pointermove', p.x, p.y);
    if (tahanMs) await tunggu(tahanMs);
    const ak = pts[pts.length - 1];
    titik('pointerup', ak.x, ak.y);
  };
  const lingkaranUji = lingkaran(300, 200, 90, 90, 3);
  const kotakUji = sisi([{ x: 100, y: 100 }, { x: 260, y: 100 }, { x: 260, y: 260 }, { x: 100, y: 260 }]);
  const segitigaUji = sisi([{ x: 100, y: 300 }, { x: 300, y: 100 }, { x: 500, y: 300 }]);
  const acakUji = Array.from({ length: 60 }, () => ({ x: 100 + acak() * 300, y: 100 + acak() * 200 }));

  /* I1: tahan di ujung lingkaran -> bar tampil "Lingkaran", lalu lepas -> tersimpan sebagai elips */
  await catatanBaru();
  bukaStudioSketsa();
  pasangRect();
  titik('pointerdown', lingkaranUji[0].x, lingkaranUji[0].y);
  for (const p of lingkaranUji.slice(1)) titik('pointermove', p.x, p.y);
  await tunggu(1000);
  cek('A4 tahan: setelah ujung ditahan, bar bentuk tampil', barTampil());
  cek('A4 tahan: bar menyebut nama bentuk "Lingkaran"', document.getElementById('sk-bentuk-nama').textContent.includes('Lingkaran'));
  const ak = lingkaranUji[lingkaranUji.length - 1];
  titik('pointerup', ak.x, ak.y);
  const g1 = await simpanDanBaca();
  cek('A4 pakai: lingkaran tersimpan sebagai elips (data bisa diedit)', !!g1 && g1.goresan.length === 1 && g1.goresan[0].alat === 'elips');

  /* I2: tahan lalu "Coretan asli" -> coretan tetap seperti aslinya */
  await catatanBaru();
  bukaStudioSketsa();
  pasangRect();
  titik('pointerdown', lingkaranUji[0].x, lingkaranUji[0].y);
  for (const p of lingkaranUji.slice(1)) titik('pointermove', p.x, p.y);
  await tunggu(1000);
  klik('#sk-bentuk-batal');
  cek('A4 batal: tombol Coretan asli menyembunyikan bar', !barTampil());
  titik('pointerup', ak.x, ak.y);
  const g2 = await simpanDanBaca();
  cek('A4 batal: setelah Coretan asli, data tetap goresan pena dengan titik asli',
    !!g2 && g2.goresan.length === 1 && g2.goresan[0].alat === 'pena' && g2.goresan[0].pts.length === lingkaranUji.length);

  /* I3: tahan lalu gerak lagi -> pengenalan dibatalkan, coretan lanjut seperti biasa */
  await catatanBaru();
  bukaStudioSketsa();
  pasangRect();
  titik('pointerdown', lingkaranUji[0].x, lingkaranUji[0].y);
  for (const p of lingkaranUji.slice(1)) titik('pointermove', p.x, p.y);
  await tunggu(1000);
  cek('A4 gerak: bar tampil saat ditahan (sebelum digerakkan)', barTampil());
  titik('pointermove', ak.x + 40, ak.y + 40);
  cek('A4 gerak: gerak jauh menyembunyikan bar', !barTampil());
  titik('pointerup', ak.x + 40, ak.y + 40);
  const g3 = await simpanDanBaca();
  cek('A4 gerak: coretan tetap pena (tidak berubah jadi bentuk)', !!g3 && g3.goresan.length === 1 && g3.goresan[0].alat === 'pena');

  /* I4: tahan dan pakai bentuk -> bar hilang, bentuk tetap */
  await catatanBaru();
  bukaStudioSketsa();
  pasangRect();
  titik('pointerdown', lingkaranUji[0].x, lingkaranUji[0].y);
  for (const p of lingkaranUji.slice(1)) titik('pointermove', p.x, p.y);
  await tunggu(1000);
  klik('#sk-bentuk-pakai');
  cek('A4 pakai: tombol Pakai bentuk menyembunyikan bar', !barTampil());
  titik('pointerup', ak.x, ak.y);
  const g4 = await simpanDanBaca();
  cek('A4 pakai: bentuk yang dipakai tetap tersimpan', !!g4 && g4.goresan[0].alat === 'elips');

  /* I5: persegi dan segitiga */
  await catatanBaru();
  bukaStudioSketsa();
  pasangRect();
  titik('pointerdown', kotakUji[0].x, kotakUji[0].y);
  for (const p of kotakUji.slice(1)) titik('pointermove', p.x, p.y);
  await tunggu(1000);
  cek('A4 persegi: bar menyebut "Persegi"', document.getElementById('sk-bentuk-nama').textContent.includes('Persegi'));
  titik('pointerup', kotakUji[kotakUji.length - 1].x, kotakUji[kotakUji.length - 1].y);
  const g5 = await simpanDanBaca();
  cek('A4 persegi: tersimpan sebagai kotak (alat Kotak yang sudah ada)', !!g5 && g5.goresan[0].alat === 'kotak');

  await catatanBaru();
  bukaStudioSketsa();
  pasangRect();
  titik('pointerdown', segitigaUji[0].x, segitigaUji[0].y);
  for (const p of segitigaUji.slice(1)) titik('pointermove', p.x, p.y);
  await tunggu(1000);
  titik('pointerup', segitigaUji[segitigaUji.length - 1].x, segitigaUji[segitigaUji.length - 1].y);
  const g6 = await simpanDanBaca();
  cek('A4 segitiga: tersimpan sebagai poligon dengan 3 titik', !!g6 && g6.goresan[0].alat === 'poligon' && g6.goresan[0].pts.length === 3);

  /* I6: coretan acak yang ditahan tidak berubah */
  await catatanBaru();
  bukaStudioSketsa();
  pasangRect();
  titik('pointerdown', acakUji[0].x, acakUji[0].y);
  for (const p of acakUji.slice(1)) titik('pointermove', p.x, p.y);
  await tunggu(1000);
  cek('A4 acak: coretan tak dikenali tidak memunculkan bar', !barTampil());
  titik('pointerup', acakUji[acakUji.length - 1].x, acakUji[acakUji.length - 1].y);
  const g7 = await simpanDanBaca();
  cek('A4 acak: tersimpan sebagai coretan pena', !!g7 && g7.goresan[0].alat === 'pena');

  /* I7: coretan cepat tanpa jeda tidak dikenali walau berbentuk lingkaran */
  await catatanBaru();
  bukaStudioSketsa();
  pasangRect();
  await coret(lingkaranUji, 0);
  cek('A4 cepat: lingkaran yang tidak ditahan tidak memunculkan bar', !barTampil());
  const g8 = await simpanDanBaca();
  cek('A4 cepat: tersimpan sebagai coretan pena (tidak diubah)', !!g8 && g8.goresan[0].alat === 'pena');
}

console.log(`\nTotal: ${lulus + gagal} pengujian · Lulus: ${lulus} · Gagal: ${gagal}`);
if (gagal > 0) process.exit(1);
process.exit(0);
