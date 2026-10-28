/* Pengujian Tahap 2 · B6 (OCR) — Node.

   Yang diuji:
   • logika murni (ocr/ocr-teks.js): keluaran Tesseract → item indeks (keyakinan,
     kotak ternormalisasi, penanda baris), teks biasa dari item, format penyimpanan
     yang toleran terhadap data rusak;
   • hasil OCR bisa dicari lewat indeks pencarian PDF (cari-pdf.js) dan kotak
     sorotnya berada di dalam halaman;
   • penyimpanan (ocr/ocr-simpan.js) di IndexedDB palsu, dengan kunci 'ocr-<id>'
     yang terpisah dari anot- dan susun-, dan PDF asli tidak berubah;
   • teks OCR gambar catatan (meta.ocr): ditulis ke atribut data-ocr, dibaca balik
     lewat elToBlock, dan ikut plainText() sehingga pencarian catatan menemukannya;
   • pembersih blob yatim dan cadangan memakai kunci ocr-.

   Yang TIDAK diuji di sini: pengenalan sungguhan (Tesseract WASM), tampilan, dan
   tombol. Itu diuji di Chromium (skrip di luar repo). Uji ini tidak menyatakan OCR
   berhasil membaca gambar tertentu.

   Jalan: node tools/uji/ocr-teks.mjs (dari folder repo). */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { indexedDB as fakeIDB } from 'fake-indexeddb';
import { JSDOM } from 'jsdom';

process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));

let lulus = 0, gagal = 0;
function cek(nama, kondisi, detail = '') {
  if (kondisi) { lulus++; console.log(`  LOLOS  ${nama}`); }
  else { gagal++; console.log(`  GAGAL  ${nama}${detail ? ' — ' + detail : ''}`); }
}
const hash = buf => crypto.createHash('sha256').update(buf).digest('hex');
const str = d => JSON.stringify(d);

globalThis.self = globalThis;
globalThis.indexedDB = fakeIDB;

const O = await import('../../docs/notes/ocr/ocr-teks.js');
const OS = await import('../../docs/notes/ocr/ocr-simpan.js');
const C = await import('../../docs/notes/pdf/cari-pdf.js');
const A = await import('../../docs/notes/pdf/anotasi.js');
const AS = await import('../../docs/notes/pdf/anotasi-simpan.js');
const SU = await import('../../docs/notes/pdf/susunan.js');
const B = await import('../../docs/core/blobs.js');

/* Data tiruan dengan bentuk keluaran Tesseract (blocks → paragraphs → lines → words). */
const kata = (text, x0, y0, x1, y1, confidence = 90) => ({ text, confidence, bbox: { x0, y0, x1, y1 } });
const dataTiruan = {
  blocks: [{
    paragraphs: [
      { lines: [
        { words: [kata('SEPEDA', 100, 100, 300, 160), kata('MERAH', 320, 100, 500, 160)] },
        { words: [kata('kabur', 100, 180, 200, 200, 12), kata('  ', 210, 180, 220, 200), kata('Jakarta', 100, 220, 260, 250)] },
      ] },
      { lines: [{ words: [kata('Bandung', 100, 300, 280, 340)] }] },
    ],
  }],
};

console.log('\n[1] Kotak dan keluaran Tesseract');
{
  cek('kotak dari bbox piksel dinormalisasi', (() => {
    const k = O.kotakDariBbox({ x0: 100, y0: 50, x1: 300, y1: 150 }, 1000, 500);
    return k && Math.abs(k.x - 0.1) < 1e-9 && Math.abs(k.y - 0.1) < 1e-9 && Math.abs(k.w - 0.2) < 1e-9 && Math.abs(k.h - 0.2) < 1e-9;
  })());
  cek('bbox terbalik ditolak', O.kotakDariBbox({ x0: 300, y0: 50, x1: 100, y1: 150 }, 1000, 500) === null);
  cek('bbox NaN ditolak', O.kotakDariBbox({ x0: NaN, y0: 0, x1: 1, y1: 1 }, 10, 10) === null);
  cek('lebar 0 ditolak', O.kotakDariBbox({ x0: 0, y0: 0, x1: 1, y1: 1 }, 0, 10) === null);
  cek('kotak di luar gambar dijepit ke 0–1', (() => {
    const k = O.kotakDariBbox({ x0: -50, y0: 0, x1: 2000, y1: 100 }, 1000, 500);
    return k && k.x === 0 && k.w <= 1 && k.x + k.w <= 1.000001;
  })());

  const items = O.itemDariHasil(dataTiruan, 1000, 500);
  cek('kata berkeyakinan rendah dan kata kosong dibuang', items.map(i => i.str.trim()).join(' ') === 'SEPEDA MERAH Jakarta Bandung', str(items.map(i => i.str)));
  cek('kata terakhir tiap baris diberi eol (SEPEDA MERAH | Jakarta | Bandung)', items.map(i => i.eol).join(',') === 'false,true,true,true', str(items.map(i => i.eol)));
  cek('spasi antar kata diberikan di str (bukan di-join belakangan)', items[0].str === 'SEPEDA ' && items[1].str === 'MERAH', str(items.slice(0, 2).map(i => i.str)));
  cek('item punya kotak ternormalisasi', items.every(i => i.box.x >= 0 && i.box.x <= 1 && i.box.y >= 0 && i.box.y <= 1 && i.box.w > 0));
  cek('kotak SEPEDA sesuai bbox', Math.abs(items[0].box.x - 0.1) < 1e-9 && Math.abs(items[0].box.y - 0.2) < 1e-9, str(items[0].box));
  cek('data tanpa blocks → item kosong', O.itemDariHasil({}, 10, 10).length === 0);
  cek('null → item kosong', O.itemDariHasil(null, 10, 10).length === 0);
  cek('lebar 0 → item kosong', O.itemDariHasil(dataTiruan, 0, 10).length === 0);
  cek('bbox rusak dibuang tanpa menjatuhkan kata lain', (() => {
    const d = { blocks: [{ paragraphs: [{ lines: [{ words: [kata('A', 0, 0, 0, 0), kata('B', 10, 10, 50, 50)] }] }] }] };
    const it = O.itemDariHasil(d, 100, 100);
    return it.length === 1 && it[0].str === 'B' && it[0].eol === true;
  })());
}

console.log('\n[2] Teks biasa dan keadaan halaman');
{
  const items = O.itemDariHasil(dataTiruan, 1000, 500);
  cek('teks: satu baris per eol', O.teksDariItem(items) === 'SEPEDA MERAH\nJakarta\nBandung', JSON.stringify(O.teksDariItem(items)));
  cek('teks kosong dari item kosong', O.teksDariItem([]) === '');
  cek('teks dibatasi MAKS_TEKS_OCR', O.teksDariItem([{ str: 'x'.repeat(30000), eol: true, box: null }]).length === O.MAKS_TEKS_OCR);
  cek('adaTeks: item berisi kata', O.adaTeks(items) === true);
  cek('adaTeks: item hanya spasi → false', O.adaTeks([{ str: '  ', eol: false }]) === false);
  cek('adaTeks: daftar kosong → false', O.adaTeks([]) === false);
}

console.log('\n[3] Hasil OCR bisa dicari (cari-pdf.js)');
{
  const items = O.itemDariHasil(dataTiruan, 1000, 500);
  const indeks = C.bangunIndeks(items);
  const hits = C.cariDiIndeks(indeks, 'sepeda');
  cek('kata "sepeda" ditemukan di hasil OCR', hits.length === 1, str(hits));
  cek('kotak sorot hasil OCR berada di dalam halaman', hits[0] && hits[0].kotak.every(k => k.x >= 0 && k.y >= 0 && k.x + k.w <= 1.001 && k.y + k.h <= 1.001), str(hits[0] && hits[0].kotak));
  cek('pencarian lintas baris (frasa) bekerja', C.cariDiIndeks(indeks, 'sepeda merah').length === 1);
  cek('kata berkeyakinan rendah tidak ikut dicari', C.cariDiIndeks(indeks, 'kabur').length === 0);
}

console.log('\n[4] Format penyimpanan (toleran data rusak)');
{
  const items = O.itemDariHasil(dataTiruan, 1000, 500);
  const teks = O.tulisOcrPdf({ 2: items, 5: items.slice(0, 1) });
  const balik = O.bacaOcrPdf(teks);
  cek('tulis lalu baca: halaman 2 dan 5 kembali', Object.keys(balik).join(',') === '2,5', Object.keys(balik).join(','));
  cek('isi item utuh', str(balik[2]) === str(items));
  cek('JSON rusak → objek kosong', Object.keys(O.bacaOcrPdf('{rusak')).length === 0);
  cek('teks kosong → objek kosong', Object.keys(O.bacaOcrPdf('')).length === 0);
  cek('format tanpa "hal" → objek kosong', Object.keys(O.bacaOcrPdf('{"v":1}')).length === 0);
  const campur = str({ v: 1, hal: {
    '0': [{ str: 'x', eol: true, box: { x: 0, y: 0, w: 0.1, h: 0.1 } }],
    'abc': [{ str: 'x', eol: true, box: { x: 0, y: 0, w: 0.1, h: 0.1 } }],
    '3': [
      { str: 'baik', eol: false, box: { x: 0.1, y: 0.1, w: 0.2, h: 0.1 } },
      { str: 'lebar nol', eol: false, box: { x: 0.1, y: 0.1, w: 0, h: 0.1 } },
      { str: 7, eol: false, box: { x: 0.1, y: 0.1, w: 0.1, h: 0.1 } },
      { str: 'keluar', eol: true, box: { x: 1.5, y: 0.1, w: 0.1, h: 0.1 } },
      null,
    ],
    '4': [],
    '6': 'bukan daftar',
  } });
  const bersih = O.bacaOcrPdf(campur);
  cek('halaman 0 dan non-angka dibuang', !('0' in bersih) && Object.keys(bersih).length === 1, Object.keys(bersih).join(','));
  cek('hanya item valid yang tersisa', bersih[3] && bersih[3].length === 1 && bersih[3][0].str === 'baik', str(bersih[3]));
  cek('halaman kosong dan bukan-daftar dibuang', !('4' in bersih) && !('6' in bersih));
  cek('kunciOcr memakai awalan ocr-', O.kunciOcr('abc') === 'ocr-abc');
  cek('kunci ocr berbeda dari anot- dan susun-', O.kunciOcr('x') !== A.kunciAnotasi('x') && O.kunciOcr('x') !== SU.kunciSusunan('x'));
}

console.log('\n[5] Penyimpanan di IndexedDB palsu');
{
  const idPdf = 'pdf-uji-ocr-1';
  const bytesPdf = Buffer.from('%PDF-1.4 isi asli untuk uji OCR\n%%EOF');
  const hashAwal = hash(bytesPdf);
  await B.simpanBlob(idPdf, new Blob([bytesPdf], { type: 'application/pdf' }));

  cek('belum ada OCR → objek kosong', Object.keys(await OS.muatOcrPdf(idPdf)).length === 0);
  const items = O.itemDariHasil(dataTiruan, 1000, 500);
  await OS.simpanOcrPdf(idPdf, { 1: items });
  const muat = await OS.muatOcrPdf(idPdf);
  cek('muat ulang sama dengan yang disimpan', str(muat) === str({ 1: items }));
  cek('hasil OCR disimpan di kunci ocr-<id>', !!(await B.ambilBlob(O.kunciOcr(idPdf))));
  cek('anotasi dan susunan tidak tersentuh oleh OCR', !(await B.ambilBlob(A.kunciAnotasi(idPdf))) && !(await B.ambilBlob(SU.kunciSusunan(idPdf))));

  /* Anotasi dan susunan tetap terbaca berdampingan dengan OCR. */
  await AS.simpanAnotasi(idPdf, A.tambahAnotasi([], A.buatAnotasi('sorot', 1, { x1: 0.1, y1: 0.1, x2: 0.2, y2: 0.2 })));
  cek('OCR tetap terbaca setelah anotasi disimpan', Object.keys(await OS.muatOcrPdf(idPdf)).length === 1);
  cek('anotasi tetap terbaca setelah OCR disimpan', (await AS.muatAnotasi(idPdf)).length === 1);

  let galat = null;
  try { await OS.simpanOcrPdf('', { 1: items }); } catch (e) { galat = e; }
  cek('simpan tanpa blobId melempar galat', galat instanceof Error);
  cek('muat tanpa blobId → objek kosong', Object.keys(await OS.muatOcrPdf('')).length === 0);

  const sesudah = Buffer.from(await (await B.ambilBlob(idPdf)).arrayBuffer());
  cek('PDF asli tidak berubah (hash)', hash(sesudah) === hashAwal);
}

console.log('\n[6] Teks OCR gambar catatan (meta.ocr)');
{
  const NM = await import('../../docs/notes/note-model.js');
  const dom = new JSDOM('<div id="akar"></div>');
  const doc = dom.window.document;

  const teks = 'SEPEDA MERAH\nJakarta & "Bandung" <tes>';
  const blok = NM.makeBlock({ type: 'image', content: '', meta: { blobId: 'img-uji-1', ocr: teks } });
  const html = NM.blockToHtml(blok);
  cek('HTML gambar memuat atribut data-ocr', /data-ocr="/.test(html), html.slice(0, 160));
  cek('teks OCR di atribut di-escape: tidak ada tag mentah', !html.includes('<tes>'), html.slice(0, 200));

  const akar = doc.getElementById('akar');
  akar.innerHTML = html;
  const el = akar.querySelector('.b-img') || akar.firstElementChild;
  const balik = NM.elToBlock(el);
  cek('elToBlock membaca data-ocr kembali ke meta.ocr', balik.meta && balik.meta.ocr === teks, str(balik.meta && balik.meta.ocr));
  const ampersand = NM.makeBlock({ type: 'image', meta: { blobId: 'img-uji-4', ocr: 'Tom &amp; "Jerry" <b>' } });
  akar.innerHTML = NM.blockToHtml(ampersand);
  const elAmp = akar.querySelector('.b-img') || akar.firstElementChild;
  cek('& dan " di teks OCR bertahan utuh setelah roundtrip', NM.elToBlock(elAmp).meta.ocr === 'Tom &amp; "Jerry" <b>', str(NM.elToBlock(elAmp).meta.ocr));
  cek('blobId tetap terbaca', balik.meta && balik.meta.blobId === 'img-uji-1');

  cek('plainText memuat teks OCR gambar', NM.plainText({ blocks: [blok] }).includes('SEPEDA MERAH'), NM.plainText({ blocks: [blok] }));
  const tanpaOcr = NM.makeBlock({ type: 'image', meta: { blobId: 'img-uji-2' } });
  cek('gambar tanpa OCR tidak menambah teks', NM.plainText({ blocks: [tanpaOcr] }) === '');
  cek('gambar tanpa OCR tidak punya data-ocr', !/data-ocr/.test(NM.blockToHtml(tanpaOcr)));

  const panjang = NM.makeBlock({ type: 'image', meta: { blobId: 'img-uji-3', ocr: 'x'.repeat(30000) } });
  akar.innerHTML = NM.blockToHtml(panjang);
  const elPanjang = akar.querySelector('.b-img') || akar.firstElementChild;
  cek('teks OCR gambar dibatasi di HTML dan saat dibaca', (NM.elToBlock(elPanjang).meta.ocr || '').length <= 20000);
}

console.log('\n[7] Pembersih blob yatim dan cadangan (pemeriksaan sumber)');
{
  const bersih = fs.readFileSync('docs/notes/editor/image.js', 'utf8');
  const cadangan = fs.readFileSync('docs/notes/data-io.js', 'utf8');
  cek('pembersih blob yatim melindungi kunci OCR', bersih.includes('dipakai.add(kunciOcr(id))'));
  cek('cadangan menyertakan kunciOcr(x)', cadangan.includes('kunciOcr(x)'));
}

console.log(`\nHasil: ${lulus} LOLOS, ${gagal} GAGAL`);
if (gagal) process.exit(1);
