/* MB2 · uji murni tabel-rumus.js (rumus, urut, saring). Tanpa DOM. */
import * as T from '../../docs/notes/tabel-rumus.js';

let gagal = 0, lulus = 0;
const oke = (nama, kondisi, det = '') => {
  if (kondisi) { lulus++; console.log('ok  ', nama); }
  else { gagal++; console.log('FAIL', nama, det ? '\n      ' + det : ''); }
};

/* ── alamat & angka ── */
oke('kolomHuruf 0→A, 25→Z, 26→AA', T.kolomHuruf(0) === 'A' && T.kolomHuruf(25) === 'Z' && T.kolomHuruf(26) === 'AA');
oke('parseAlamat B3 → kolom 1, baris 2', JSON.stringify(T.parseAlamat('b3')) === JSON.stringify({ c: 1, r: 2 }));
oke('parseAlamat menolak teks biasa', T.parseAlamat('total') === null && T.parseAlamat('1A') === null);
oke('angkaSel: bulat, desimal titik, desimal koma', T.angkaSel('12') === 12 && T.angkaSel('12.5') === 12.5 && T.angkaSel('12,5') === 12.5);
oke('angkaSel: teks & kosong → null', T.angkaSel('abc') === null && T.angkaSel('') === null && T.angkaSel('12rb') === null);
oke('angkaSel: negatif', T.angkaSel('-3') === -3);

/* ── rumus dasar ── */
const hitung = rows => T.hitungTabel(rows);
const satu = (rumus, extra = []) => hitung([['A', 'B'], ['10', '20'], ['30', '40'], [rumus, ...extra]])[3][0];

oke('angka biasa di sel tidak diubah', hitung([['x'], ['12,5']])[1][0] === '12,5');
oke('=A2+A3 → 40 (referensi sel)', satu('=A2+A3') === '40', satu('=A2+A3'));
oke('presedensi: =2+3*4 → 14', satu('=2+3*4') === '14', satu('=2+3*4'));
oke('kurung: =(2+3)*4 → 20', satu('=(2+3)*4') === '20');
oke('pembagian: =10/4 → 2.5', satu('=10/4') === '2.5');
oke('minus unari: =-A2+5 → -5', satu('=-A2+5') === '-5');
oke('SUM rentang: =SUM(A2:A3) → 40', satu('=SUM(A2:A3)') === '40');
oke('SUM rentang dua kolom: =SUM(A2:B3) → 100', satu('=SUM(A2:B3)') === '100');
oke('AVERAGE: =AVERAGE(A2:A3) → 20', satu('=AVERAGE(A2:A3)') === '20');
oke('AVG alias berfungsi', satu('=AVG(A2:A3)') === '20');
oke('MIN & MAX', satu('=MIN(A2:B3)') === '10' && satu('=MAX(A2:B3)') === '40');
oke('COUNT hanya menghitung angka', hitung([['x'], ['1'], ['abc'], ['3'], ['=COUNT(A2:A4)']])[4][0] === '2');
oke('argumen campur: =SUM(A2, 5, A3) → 45', satu('=SUM(A2, 5, A3)') === '45');
oke('fungsi tanpa argumen: =SUM() → 0', satu('=SUM()') === '0');
oke('sel kosong dihitung 0 dalam operasi tunggal', hitung([['1'], [''], ['=A1+A2']])[2][0] === '1');
oke('sel kosong diabaikan di rentang (AVERAGE)', hitung([['2'], [''], ['4'], ['=AVERAGE(A1:A3)']])[3][0] === '3');
oke('rumus merujuk rumus lain', hitung([['2'], ['=A1*3'], ['=A2+1']])[2][0] === '7');
oke('teks biasa bukan rumus', hitung([['=halo']])[0][0] === '=halo' || hitung([['halo']])[0][0] === 'halo');
oke('sel teks di pertengahan: =A1+A2 → #NILAI!', hitung([['2'], ['teks'], ['=A1+A2']])[2][0] === '#NILAI!');
oke('sel teks diabaikan di SUM rentang', hitung([['2'], ['teks'], ['=SUM(A1:A2)']])[2][0] === '2');

/* ── galat ── */
oke('pembagian nol → #DIV/0!', satu('=1/0') === '#DIV/0!');
oke('AVERAGE kosong (rentang hanya sel kosong) → #DIV/0!', hitung([['x'], [''], ['=AVERAGE(A2:A2)']])[2][0] === '#DIV/0!');
oke('AVERAGE rentang melampaui tabel → #REF!', hitung([['x'], ['=AVERAGE(A2:A3)']])[1][0] === '#REF!');
oke('referensi di luar tabel → #REF!', satu('=Z99') === '#REF!');
oke('rentang di luar tabel → #REF!', satu('=SUM(A1:A99)') === '#REF!');
oke('sintaks salah → #RUMUS!', satu('=1+') === '#RUMUS!' && satu('=SUMM(1)') === '#RUMUS!' && satu('=(1') === '#RUMUS!');
oke('karakter aneh → #RUMUS!', satu('=1$2') === '#RUMUS!');
oke('siklus langsung A1 → A1 → #SIKLUS!', hitung([['=A1']])[0][0] === '#SIKLUS!');
oke('siklus dua arah → #SIKLUS!', (() => { const h = hitung([['=A2'], ['=A1']]); return h[0][0] === '#SIKLUS!' && h[1][0] === '#SIKLUS!'; })());
oke('galat merambat ke rumus yang merujuknya', hitung([['=1/0'], ['=A1+1']])[1][0] === '#DIV/0!');
oke('tabel tanpa rumus tidak berubah sama sekali', JSON.stringify(hitung([['a', 'b'], ['1', '2']])) === JSON.stringify([['a', 'b'], ['1', '2']]));

/* ── urut ── */
const data = [['Nama', 'Nilai'], ['budi', '10'], ['Ani', '2'], ['', '30'], ['cici', 'x'], ['Dodi', '2']];
const naik = T.urutBaris(data, 1, true);
oke('urut angka naik: angka dulu, teks setelahnya, kosong terakhir', JSON.stringify(naik.slice(1).map(r => r[1])) === JSON.stringify(['2', '2', '10', '30', 'x']), JSON.stringify(naik.slice(1).map(r => r[1])));
oke('urut angka: 2 sebelum 10 (numerik, bukan leksikografis)', naik.findIndex(r => r[1] === '10') > naik.findIndex(r => r[1] === '2'));
const turun = T.urutBaris(data, 1, false);
oke('urut turun seperti Excel: teks di depan, angka besar→kecil', JSON.stringify(turun.slice(1).map(r => r[1])) === JSON.stringify(['x', '30', '10', '2', '2']), JSON.stringify(turun.slice(1).map(r => r[1])));
oke('urut turun: sel kosong tetap paling bawah', T.urutBaris([['h'], ['b'], [''], ['a']], 0, false).slice(1).map(r => r[0]).join('|') === 'b|a|');
const nama = T.urutBaris(data, 0, true);
oke('urut teks tanpa huruf besar-kecil (Ani < budi < cici < Dodi)', nama.slice(1).map(r => r[0]).join(',') === 'Ani,budi,cici,Dodi,', nama.slice(1).map(r => r[0]).join(','));
oke('header tidak ikut diurut', naik[0][0] === 'Nama' && naik[0][1] === 'Nilai');
oke('urut tidak mengubah array asal', data[1][0] === 'budi');
oke('tabel kosong tetap aman', T.urutBaris([], 0).length === 0);

/* ── saring ── */
const hasil = T.lolosSaring(data, 0, 'AN');
oke('saring tidak peka huruf: "AN" cocok "Ani", bukan "budi"/"Dodi"', hasil[1] === true && hasil[0] === false && hasil[4] === false, JSON.stringify(hasil));
oke('saring kosong → semua lolos', T.lolosSaring(data, 0, '').every(x => x === true));
oke('saring: hasil sejajar baris data (header dikecualikan)', T.lolosSaring(data, 1, '2').length === data.length - 1);
oke('saring: kolom 1 mengandung "2" pada Ani & Dodi', JSON.stringify(T.lolosSaring(data, 1, '2')) === JSON.stringify([false, true, false, false, true]), JSON.stringify(T.lolosSaring(data, 1, '2')));

/* ── keadaan tampilan ── */
T.simpanKeadaanTabel('blok-1', 2, 'ani');
oke('keadaan tabel disimpan per blok', JSON.stringify(T.ambilKeadaanTabel('blok-1')) === JSON.stringify({ kol: 2, saring: 'ani' }));
oke('keadaan tabel default untuk blok baru', JSON.stringify(T.ambilKeadaanTabel('tidak-ada')) === JSON.stringify({ kol: 0, saring: '' }));

console.log(`\nTotal: ${lulus + gagal} pengujian · Lulus: ${lulus} · Gagal: ${gagal}`);
process.exit(gagal ? 1 : 0);
