/* Pengujian B6 lanjutan · halaman pindai dengan sedikit teks (Node).

   Yang diuji (logika murni di ocr/ocr-teks.js):
   • perluOcr: halaman tanpa teks di-OCR; teks sedikit + gambar besar di-OCR; teks banyak
     atau tanpa gambar besar tidak di-OCR;
   • hitungHuruf: menghitung huruf non-spasi;
   • gabungLapisanOcr: hasil OCR yang tertutup teks lapisan dibuang, yang lain tetap;
     urutan teks lapisan dipertahankan; data tidak valid diabaikan.

   Yang TIDAK diuji di sini: deteksi gambar dari operator pdf.js (bagianGambarTerbesar) dan
   hasil di peramban. Itu diuji di Chromium (skrip di luar repo).

   Jalan: node tools/uji/ocr-pindai-campur.mjs (dari folder repo). */
import path from 'path';
import { fileURLToPath } from 'url';

process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const T = await import('../../docs/notes/ocr/ocr-teks.js');

let lulus = 0, gagal = 0;
function cek(nama, kondisi, detail = '') {
  if (kondisi) { lulus++; console.log(`  OK   ${nama}`); }
  else { gagal++; console.log(`  GAGAL ${nama}${detail ? ' — ' + detail : ''}`); }
}

console.log('[1] perluOcr');
cek('tanpa teks lapisan: selalu di-OCR', T.perluOcr(0, 0));
cek('teks sedikit + gambar penuh: di-OCR (stempel)', T.perluOcr(12, 1));
cek('teks sedikit + gambar setengah halaman: di-OCR', T.perluOcr(20, 0.5));
cek('teks sedikit tanpa gambar besar: tidak di-OCR', !T.perluOcr(20, 0.2));
cek('teks di atas ambang + gambar penuh: tidak di-OCR (grafik)', !T.perluOcr(77, 1));
cek('ambang huruf dan gambar tepat di batas: di-OCR',
  T.perluOcr(T.MAKS_HURUF_LAPISAN_SEDIKIT, T.BAGIAN_GAMBAR_PINDAI));
cek('satu huruf lebih banyak dari batas: tidak di-OCR',
  !T.perluOcr(T.MAKS_HURUF_LAPISAN_SEDIKIT + 1, 1));
cek('nilai tidak valid diperlakukan sebagai tanpa teks', T.perluOcr(undefined, 0));

console.log('[2] hitungHuruf');
cek('spasi dan baris baru tidak dihitung',
  T.hitungHuruf([{ str: 'STEMPEL ' }, { str: ' DRAFT\n' }]) === 12);
cek('item kosong dan bukan teks diabaikan',
  T.hitungHuruf([{ str: '   ' }, null, { str: 42 }, { str: 'ab' }]) === 2);
cek('daftar kosong = 0', T.hitungHuruf([]) === 0 && T.hitungHuruf(undefined) === 0);

console.log('[3] gabungLapisanOcr');
const kotak = (x, y, w, h) => ({ x, y, w, h });
const lapisan = [
  { str: 'STEMPEL DRAFT', eol: true, box: kotak(0.05, 0.02, 0.4, 0.03) },
];
const ocr = [
  { str: 'STEMPEL', eol: false, box: kotak(0.05, 0.021, 0.18, 0.03) },   /* sama dengan lapisan */
  { str: 'DRAFT', eol: true, box: kotak(0.24, 0.021, 0.18, 0.03) },      /* sama dengan lapisan */
  { str: 'LinnSequencer', eol: true, box: kotak(0.3, 0.2, 0.4, 0.04) },  /* teks pindaian */
];
{
  const g = T.gabungLapisanOcr(lapisan, ocr);
  const teks = g.map(it => it.str);
  cek('teks lapisan tetap di depan', teks[0] === 'STEMPEL DRAFT');
  cek('OCR yang tertutup lapisan dibuang (tidak ada STEMPEL kedua)', !teks.includes('STEMPEL') && !teks.includes('DRAFT'),
    JSON.stringify(teks));
  cek('OCR yang tidak tertutup tetap masuk', teks.includes('LinnSequencer'));
  cek('jumlah = lapisan + OCR yang tersisa', g.length === 2);
}
{
  const g = T.gabungLapisanOcr(undefined, ocr);
  cek('tanpa lapisan: hasilnya sama dengan semua OCR', g.length === ocr.length);
}
{
  const g = T.gabungLapisanOcr(lapisan, undefined);
  cek('tanpa OCR: hanya lapisan', g.length === 1 && g[0].str === 'STEMPEL DRAFT');
}
{
  const g = T.gabungLapisanOcr([], [{ str: 'x', eol: false, box: kotak(0.1, 0.1, 0, 0.1) }, null,
    { str: 'y', eol: false, box: kotak(0.1, 0.1, 0.1, 0.1) }]);
  cek('item OCR tanpa lebar/tinggi atau null diabaikan', g.length === 1 && g[0].str === 'y');
}
{
  /* kotak OCR yang hanya sedikit menyentuh lapisan tidak dibuang */
  const g = T.gabungLapisanOcr(lapisan, [{ str: 'tepi', eol: true, box: kotak(0.44, 0.02, 0.2, 0.03) }]);
  cek('OCR yang hanya bersinggungan sedikit tetap masuk', g.some(it => it.str === 'tepi'));
}

console.log(`\nHasil: ${lulus} LOLOS, ${gagal} GAGAL`);
if (gagal) process.exit(1);
