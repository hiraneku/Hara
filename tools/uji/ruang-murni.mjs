// Pengujian D1 · Pemulihan ruang dari cadangan (model murni) — tanpa DOM.
//
// Yang diuji (docs/notes/ruang-murni.js):
//   • timpa: daftar diganti persis dengan cadangan; cadangan kosong tidak menghapus daftar lokal;
//   • gabung: id yang sama dipertahankan (nama lokal menang); nama sama tanpa membedakan huruf
//     diarahkan ke ruang lokal dengan id berbeda; ruang baru ditambahkan dengan id cadangan;
//   • entri rusak dibuang, nama dipangkas dan dibatasi 32 karakter.
//
// Yang TIDAK diuji di sini: localStorage, catatan (folderId), dan Smart Folder — uji Chromium di luar repo.
//
// Jalan: node tools/uji/ruang-murni.mjs (dari folder repo).
import { rencanaPulihRuang } from '../../docs/notes/ruang-murni.js';

let lulus = 0, gagal = 0;
function cek(nama, ok, detail = '') {
  if (ok) { lulus++; console.log(`OK   ${nama}${detail ? ' — ' + detail : ''}`); }
  else { gagal++; console.log(`GAGAL ${nama}${detail ? ' — ' + detail : ''}`); }
}

// ── 1. timpa ──
console.log('── 1. timpa');
{
  const lokal = [{ id: 'a', nama: 'Lama' }, { id: 'z', nama: 'Sisa' }];
  const cad = [{ id: 'b', nama: 'Biologi' }];
  const r = rencanaPulihRuang(lokal, cad, 'timpa');
  cek('timpa: daftar = cadangan persis', JSON.stringify(r.daftar) === JSON.stringify(cad), JSON.stringify(r.daftar));
  cek('timpa: peta identitas', r.peta.get('b') === 'b' && r.peta.size === 1);
}
{
  const lokal = [{ id: 'a', nama: 'Lama' }];
  const r = rencanaPulihRuang(lokal, [], 'timpa');
  cek('timpa tanpa ruang: daftar lokal tidak dihapus', JSON.stringify(r.daftar) === JSON.stringify(lokal));
  cek('timpa tanpa ruang: peta kosong', r.peta.size === 0);
  const r2 = rencanaPulihRuang(lokal, undefined, 'timpa');
  cek('timpa dengan cadangan tidak ada: aman', r2.peta.size === 0 && r2.daftar.length === 1);
}

// ── 2. gabung ──
console.log('── 2. gabung');
{
  const lokal = [{ id: 'a', nama: 'Biologi' }];
  const r = rencanaPulihRuang(lokal, [{ id: 'a', nama: 'Bio lain' }], 'gabung');
  cek('gabung: id sama, nama lokal dipertahankan', r.daftar.length === 1 && r.daftar[0].nama === 'Biologi');
  cek('gabung: id sama dipetakan ke dirinya', r.peta.get('a') === 'a');
}
{
  const lokal = [{ id: 'lok', nama: 'Biologi' }];
  const r = rencanaPulihRuang(lokal, [{ id: 'cad', nama: 'BIOLOGI' }], 'gabung');
  cek('gabung: nama sama (huruf beda) diarahkan ke id lokal', r.peta.get('cad') === 'lok', `peta ${r.peta.get('cad')}`);
  cek('gabung: tidak menambah ruang kedua', r.daftar.length === 1);
}
{
  const lokal = [{ id: 'a', nama: 'Biologi' }];
  const r = rencanaPulihRuang(lokal, [{ id: 'k', nama: 'Kimia' }], 'gabung');
  cek('gabung: ruang baru ditambahkan dengan id cadangan', r.daftar.length === 2 && r.daftar[1].id === 'k' && r.peta.get('k') === 'k');
}
{
  const r = rencanaPulihRuang([], [{ id: 'k', nama: 'Kimia' }], 'gabung');
  cek('gabung ke perangkat kosong: semua ruang cadangan masuk', r.daftar.length === 1 && r.peta.get('k') === 'k');
}
{
  const lokal = [{ id: 'a', nama: 'Biologi' }];
  const cad = [{ id: 'x', nama: 'Kimia' }, { id: 'x', nama: 'Kimia dobel' }];
  const r = rencanaPulihRuang(lokal, cad, 'gabung');
  cek('gabung: id ganda di cadangan tidak menggandakan ruang', r.daftar.filter(d => d.id === 'x').length === 1);
}

// ── 3. entri rusak dan nama ──
console.log('── 3. entri rusak');
{
  const cad = [null, { nama: 'Tanpa id' }, { id: 'k1', nama: '   ' }, { id: 'k2', nama: 'Fisika' }, 'teks'];
  const r = rencanaPulihRuang([], cad, 'timpa');
  cek('entri rusak dibuang', r.daftar.length === 1 && r.daftar[0].id === 'k2', JSON.stringify(r.daftar));
}
{
  const panjang = 'Ruang dengan nama yang sangat panjang sekali sampai melewati batas';
  const r = rencanaPulihRuang([], [{ id: 'p', nama: '  ' + panjang + '  ' }], 'timpa');
  cek('nama dipangkas dan dibatasi 32 karakter', r.daftar[0].nama === panjang.trim().slice(0, 32), `"${r.daftar[0].nama}"`);
}
{
  const r = rencanaPulihRuang(null, null, 'gabung');
  cek('masukan null aman', r.daftar.length === 0 && r.peta.size === 0);
}

console.log(`\nHasil: ${lulus} lulus, ${gagal} gagal`);
if (gagal) process.exit(1);
