/* Pengujian Tahap 2 · B1a (penampil PDF: tampilkan, navigasi, zoom) — suite jsdom + Node.

   Yang diuji:
   • vendor: berkas pdf.js ada, checksum cocok dengan README, lisensi Apache-2.0;
   • logika murni: pengenalan PDF, penjepitan halaman, langkah zoom, skala pas lebar;
   • deteksi fitur: peramban yang kurang fitur diberi daftar fitur, dan pdf.js TIDAK dimuat;
   • UI: overlay dibuka, pesan galat yang jelas, tutup lewat tombol dan Escape, satu sesi saja;
   • blok lampiran: tombol "Buka PDF" hanya untuk PDF.

   Catatan: pdf.js 6.x butuh peramban modern dan tidak bisa berjalan di Node 22 (fitur
   Uint8Array.toHex dll. belum ada). Render dan navigasi nyata diuji di Chromium
   (skrip browser di luar repo, lihat laporan). Uji ini TIDAK menyatakan render berhasil.

   Jalan: node tools/uji/pdf-penampil.mjs (dari folder repo). */
import { JSDOM } from 'jsdom';
import fs from 'fs';
import crypto from 'crypto';
import { indexedDB as fakeIDB } from 'fake-indexeddb';
import path from 'path';
import { fileURLToPath } from 'url';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const AKAR = process.cwd();

const dom = new JSDOM(fs.readFileSync('docs/index.html', 'utf8'), { url: 'https://x.test/', pretendToBeVisual: true });
const { window: w } = dom; w.indexedDB = fakeIDB;
for (const k of ['document', 'getSelection', 'HTMLElement', 'Node', 'Range', 'MouseEvent', 'KeyboardEvent', 'Event', 'InputEvent', 'localStorage', 'Image', 'NodeFilter'])
  if (w[k] !== undefined) globalThis[k] = w[k];
globalThis.window = w; globalThis.self = w; globalThis.indexedDB = w.indexedDB;
globalThis.addEventListener = w.addEventListener.bind(w);
Object.defineProperty(globalThis, 'navigator', { value: w.navigator, configurable: true });
w.URL.createObjectURL = () => 'blob:x/1'; w.URL.revokeObjectURL = () => {}; globalThis.URL = w.URL;
const V = fs.readFileSync('docs/app.js', 'utf8').match(/\?v=(\d+)/)[1];
const st = (...p) => import(`${AKAR}/docs/${p.join('/')}?v=${V}`);
await st('app.js');
const logika = await import(`${AKAR}/docs/notes/pdf/logika.js`);
const pemuat = await import(`${AKAR}/docs/notes/pdf/muat-pdfjs.js`);
const penampil = await import(`${AKAR}/docs/notes/pdf/penampil.js`);
const nm = await st('notes/note-model.js');
const { makeNote, makeBlock } = nm;
const { buatPdf } = await import(`${AKAR}/tools/uji/bantu/pdf-contoh.mjs`);
const d = w.document;
const sleep = (ms = 25) => new Promise(r => setTimeout(r, ms));

let gagal = 0, total = 0;
const oke = (nama, baik, det = '') => {
  total++;
  if (!baik) { gagal++; console.log('FAIL', nama, det ? '\n      ' + det : ''); }
  else console.log('ok  ', nama);
};

console.log('── Vendor pdf.js ──');
const vendor = 'docs/vendor/pdfjs';
const readme = fs.readFileSync(`${vendor}/README.md`, 'utf8');
oke('pdf.min.mjs dan pdf.worker.min.mjs ada', fs.existsSync(`${vendor}/pdf.min.mjs`) && fs.existsSync(`${vendor}/pdf.worker.min.mjs`));
oke('LICENSE Apache-2.0 ada', /Apache License/.test(fs.readFileSync(`${vendor}/LICENSE.txt`, 'utf8')) && /Version 2\.0/.test(fs.readFileSync(`${vendor}/LICENSE.txt`, 'utf8')));
oke('README mencatat versi 6.4.299', readme.includes('6.4.299'));
for (const f of ['pdf.min.mjs', 'pdf.worker.min.mjs', 'LICENSE.txt']) {
  const hash = crypto.createHash('sha256').update(fs.readFileSync(`${vendor}/${f}`)).digest('hex');
  oke(`checksum ${f} cocok dengan README`, readme.includes(`${hash}  ${f}`), hash);
}
oke('README mencatat yang tidak disertakan (cmaps, standard_fonts)', /cmaps/.test(readme) && /standard_fonts/.test(readme));

console.log('── Logika: pengenalan PDF ──');
oke('mime application/pdf → PDF', logika.adalahPdf({ mime: 'application/pdf', name: 'a.bin' }));
oke('nama .PDF dengan mime generik → PDF', logika.adalahPdf({ mime: 'application/octet-stream', name: 'Catatan.PDF' }));
oke('nama .pdf tanpa mime → PDF', logika.adalahPdf({ name: 'x.pdf' }));
oke('gambar bukan PDF', !logika.adalahPdf({ mime: 'image/png', name: 'x.png' }));
oke('teks bernama .pdf dengan mime teks bukan PDF', !logika.adalahPdf({ mime: 'text/plain', name: 'x.pdf' }));
oke('meta kosong bukan PDF', !logika.adalahPdf(undefined) && !logika.adalahPdf({}));

console.log('── Logika: halaman dan zoom ──');
oke('halaman dijepit ke 1..total', logika.halamanTerjepit(0, 3) === 1 && logika.halamanTerjepit(9, 3) === 3 && logika.halamanTerjepit(2, 3) === 2);
oke('total 0 dianggap 1 halaman', logika.halamanTerjepit(5, 0) === 1);
oke('berikutnya di halaman terakhir tetap terakhir', logika.halamanBerikut(3, 3) === 3 && logika.halamanBerikut(1, 3) === 2);
oke('sebelumnya di halaman pertama tetap pertama', logika.halamanSebelumnya(1, 3) === 1 && logika.halamanSebelumnya(3, 3) === 2);
oke('zoom berikut dari 1 → 1,25', logika.zoomBerikut(1) === 1.25);
oke('zoom sebelumnya dari 1 → 0,75', logika.zoomSebelumnya(1) === 0.75);
oke('zoom berikut dari nilai di luar daftar (0,6) → 0,75', logika.zoomBerikut(0.6) === 0.75);
oke('zoom mentok di 3 dan 0,5', logika.zoomBerikut(3) === 3 && logika.zoomSebelumnya(0.5) === 0.5);
oke('pas lebar: 600 px halaman 300 px wadah 324 → 1', logika.skalaPasLebar(300, 324) === 1);
oke('pas lebar dijepit ke 4 dan 0,25', logika.skalaPasLebar(10, 1000) === 4 && logika.skalaPasLebar(10000, 300) === 0.25);
oke('pas lebar ukuran tak valid → bawaan', logika.skalaPasLebar(0, 300) === 1 && logika.skalaPasLebar(300, 10) === 1);

console.log('── Deteksi fitur pdf.js ──');
const fiturAsli = {
  tryTerpasang: Object.prototype.hasOwnProperty.call(Promise, 'try'),
  hex: Object.getOwnPropertyDescriptor(Uint8Array.prototype, 'toHex'),
};
oke('fiturPdfKurang menyebut fitur yang tidak ada (Node 22)', pemuat.fiturPdfKurang().length > 0, pemuat.fiturPdfKurang().join(','));
const sisa = (() => {
  const palsu = [];
  if (typeof Promise.try !== 'function') { Promise.try = () => {}; palsu.push(() => delete Promise.try); }
  if (typeof Promise.withResolvers !== 'function') { Promise.withResolvers = () => {}; palsu.push(() => delete Promise.withResolvers); }
  if (typeof globalThis.Iterator !== 'function') { globalThis.Iterator = function () {}; palsu.push(() => delete globalThis.Iterator); }
  if (typeof Uint8Array.prototype.toHex !== 'function') { Uint8Array.prototype.toHex = () => ''; palsu.push(() => delete Uint8Array.prototype.toHex); }
  if (typeof Uint8Array.prototype.toBase64 !== 'function') { Uint8Array.prototype.toBase64 = () => ''; palsu.push(() => delete Uint8Array.prototype.toBase64); }
  if (typeof Uint8Array.fromBase64 !== 'function') { Uint8Array.fromBase64 = () => new Uint8Array(); palsu.push(() => delete Uint8Array.fromBase64); }
  const hasil = pemuat.fiturPdfKurang();
  palsu.forEach(f => f());
  return hasil;
})();
oke('dengan semua fitur ditiru, daftar kurang kosong', sisa.length === 0, sisa.join(','));
oke('fitur asli Promise.try tidak diubah uji', (Object.prototype.hasOwnProperty.call(Promise, 'try')) === fiturAsli.tryTerpasang);
let galat = null;
try { await pemuat.muatPdfJs(); } catch (e) { galat = e; }
oke('muatPdfJs menolak dengan kode fitur hilang (pdf.js tidak dimuat)', galat && galat.message === 'PDF_FITUR_KURANG' && Array.isArray(galat.kurang) && galat.kurang.length > 0, galat && galat.message);

console.log('── UI penampil (jsdom, pdf.js tidak dimuat di Node) ──');
const data = buatPdf(3);
await penampil.bukaPenampilPdf(new Uint8Array(data).buffer, 'Contoh.pdf');
await sleep(60);
const ov = () => d.querySelectorAll('.pdfv');
oke('overlay dibuka dengan role dialog', ov().length === 1 && ov()[0].getAttribute('role') === 'dialog');
oke('nama berkas tampil di bar', ov()[0]?.querySelector('.pdfv-nama')?.textContent === 'Contoh.pdf');
oke('galat fitur ditampilkan dengan pesan yang jelas', /terlalu lama/.test(d.querySelector('.pdfv-galat')?.textContent || ''), d.querySelector('.pdfv-galat')?.textContent);
penampil.bukaPenampilPdf(new Uint8Array(data).buffer, 'Kedua.pdf');
await sleep(30);
oke('membuka lagi tidak menumpuk overlay (tetap satu)', ov().length === 1 && ov()[0].querySelector('.pdfv-nama').textContent === 'Kedua.pdf');
d.querySelector('.pdfv [data-pdf="tutup"]')?.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true, view: w }));
await sleep(20);
oke('tombol Tutup menghapus overlay', ov().length === 0);
penampil.bukaPenampilPdf(new Uint8Array(data).buffer, 'Ketiga.pdf');
await sleep(30);
d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
await sleep(20);
oke('tombol Escape menutup overlay', ov().length === 0);
penampil.tutupPenampilPdf();
oke('tutup saat tidak terbuka tidak melempar galat', true);

console.log('── Blok lampiran: tombol Buka PDF ──');
const mkFile = (nama, mime) => makeNote({ id: 'pf-' + nama, title: 'uji', createdAt: 1, updatedAt: 1,
  blocks: [makeBlock({ type: 'file', content: '', meta: { blobId: 'fl_x', name: nama, size: 10, mime } })] });
const htmlPdf = nm.blocksToDom(mkFile('a.pdf', 'application/pdf').blocks);
const htmlGambar = nm.blocksToDom(mkFile('b.png', 'image/png').blocks);
oke('blok PDF memuat tombol Buka PDF', htmlPdf.includes('data-file-buka'));
oke('blok gambar tidak memuat tombol Buka PDF', !htmlGambar.includes('data-file-buka') && htmlGambar.includes('data-file-dl'));
oke('tombol Unduh tetap ada di blok PDF', htmlPdf.includes('data-file-dl'));

console.log(`\nTotal: ${total} pengujian · Lulus: ${total - gagal} · Gagal: ${gagal}`);
if (gagal > 0) { console.log('GAGAL'); process.exit(1); }
process.exit(0);
