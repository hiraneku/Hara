// Pengujian D4 · Web content capture v1 (model murni kartu tautan) — tanpa DOM.
//
// Yang diuji (docs/notes/tautan-murni.js):
//   • bersihKutipan: string saja, baris baru dinormalkan, spasi tepi dibuang, maks. 2000 karakter;
//   • tanggalDiambil: format YYYY-MM-DD dalam zona waktu lokal, termasuk pergantian bulan dan tahun;
//   • escHtml: escape lengkap untuk teks dan atribut (& < > " ').
//
// Yang TIDAK diuji di sini: tampilan kartu, dialog, pencarian, ekspor, dan ganti teks
// (lihat harness Chromium di catatan dokumen).
//
// Jalan: node tools/uji/tautan-murni.mjs (dari folder repo).
import { bersihKutipan, tanggalDiambil, escHtml, KUTIPAN_MAKS } from '../../docs/notes/tautan-murni.js';

let lulus = 0, gagal = 0;
function cek(nama, ok, detail = '') {
  if (ok) { lulus++; console.log(`OK   ${nama}${detail ? ' — ' + detail : ''}`); }
  else { gagal++; console.log(`GAGAL ${nama}${detail ? ' — ' + detail : ''}`); }
}

// ── 1. bersihKutipan ──
console.log('── 1. bersihKutipan');
cek('string biasa tetap', bersihKutipan('Teks pilihan') === 'Teks pilihan');
cek('spasi tepi dibuang', bersihKutipan('   halo  \n') === 'halo');
cek('CRLF dan CR jadi LF', bersihKutipan('a\r\nb\rc') === 'a\nb\nc', JSON.stringify(bersihKutipan('a\r\nb\rc')));
cek('non-string jadi kosong', bersihKutipan(undefined) === '' && bersihKutipan(null) === '' && bersihKutipan(42) === '' && bersihKutipan({}) === '');
cek('kosong tetap kosong', bersihKutipan('') === '' && bersihKutipan('   ') === '');
const panjang = 'x'.repeat(KUTIPAN_MAKS + 500);
cek('dipangkas ke batas', bersihKutipan(panjang).length === KUTIPAN_MAKS, `${bersihKutipan(panjang).length}`);
cek('batas 2000', KUTIPAN_MAKS === 2000);
cek('tanpa markup diubah (escape dilakukan saat render)', bersihKutipan('<b>x</b>') === '<b>x</b>');

// ── 2. tanggalDiambil ──
console.log('── 2. tanggalDiambil');
cek('format YYYY-MM-DD', tanggalDiambil(new Date(2026, 9, 30, 9, 15)) === '2026-10-30');
cek('pergantian bulan (31 Jan)', tanggalDiambil(new Date(2026, 0, 31, 23, 59)) === '2026-01-31');
cek('awal bulan berikutnya', tanggalDiambil(new Date(2026, 1, 1, 0, 5)) === '2026-02-01');
cek('pergantian tahun (31 Des)', tanggalDiambil(new Date(2026, 11, 31, 23, 58)) === '2026-12-31');
cek('awal tahun baru', tanggalDiambil(new Date(2027, 0, 1, 0, 1)) === '2027-01-01');
cek('nol di depan untuk bulan dan hari', tanggalDiambil(new Date(2027, 2, 5, 12)) === '2027-03-05');
cek('bawaan = hari ini', /^\d{4}-\d{2}-\d{2}$/.test(tanggalDiambil()));

// ── 3. escHtml ──
console.log('── 3. escHtml');
cek('escape penuh', escHtml(`<a href="x">'&'</a>`) === '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;', escHtml(`<a href="x">'&'</a>`));
cek('payload onerror tidak lolos sebagai markup', !escHtml('<img src=x onerror=alert(1)>').includes('<'));
cek('null dan undefined jadi kosong', escHtml(null) === '' && escHtml(undefined) === '');
cek('angka tetap jadi teks', escHtml(7) === '7');
cek('& ganda tidak diubah dua kali', escHtml('&amp;') === '&amp;amp;');

console.log(`\nHasil: ${lulus} lulus, ${gagal} gagal`);
if (gagal) process.exit(1);
