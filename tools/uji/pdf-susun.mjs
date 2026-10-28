/* Pengujian Tahap 2 · B2 (susunan halaman PDF) — Node.

   Yang diuji:
   • logika murni (susunan.js): susunan awal, pindah, hapus, gandakan, sisip
     halaman kosong, pemetaan posisi ↔ halaman asli, halaman asli terdekat,
     baca data rusak tanpa melempar galat dan tanpa daftar kosong;
   • penyimpanan (susunan-simpan.js) di IndexedDB palsu: tulis, baca, dan
     pemisahan kunci 'susun-<id>' dari id blob PDF asli;
   • isi PDF asli TIDAK berubah setelah susunan disimpan (dibandingkan hash);
   • cadangan (data-io.js): kunci susunan ikut dicadangkan.

   Yang TIDAK diuji di sini: tampilan viewer, tombol, dan ekspor dengan
   urutan baru. Itu diuji di Chromium (skrip di luar repo).

   Jalan: node tools/uji/pdf-susun.mjs (dari folder repo). */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { indexedDB as fakeIDB } from 'fake-indexeddb';

process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));

let lulus = 0, gagal = 0;
function cek(nama, kondisi, detail = '') {
  if (kondisi) { lulus++; console.log(`  LOLOS  ${nama}`); }
  else { gagal++; console.log(`  GAGAL  ${nama}${detail ? ' — ' + detail : ''}`); }
}
const hash = buf => crypto.createHash('sha256').update(buf).digest('hex');
const str = d => JSON.stringify(d);

/* IndexedDB palsu untuk core/blobs.js (memakai self.indexedDB). */
globalThis.self = globalThis;
globalThis.indexedDB = fakeIDB;

const U = await import('../../docs/notes/pdf/susunan.js');
const S = await import('../../docs/notes/pdf/susunan-simpan.js');
const B = await import('../../docs/core/blobs.js');
const A = await import('../../docs/notes/pdf/anotasi.js');
const AS = await import('../../docs/notes/pdf/anotasi-simpan.js');

console.log('\n[1] Susunan awal dan operasi murni');
{
  const awal = U.susunanAwal(4);
  cek('susunanAwal(4) = 1..4', str(awal) === str([{ s: 1 }, { s: 2 }, { s: 3 }, { s: 4 }]));
  cek('asliUrut true pada susunan awal', U.asliUrut(awal, 4));
  cek('susunanAwal(0) kosong', U.susunanAwal(0).length === 0);
  cek('susunanAwal(NaN) kosong', U.susunanAwal(NaN).length === 0);

  const p = U.pindahPos(awal, 1, 3);
  cek('pindah 1→3: 2,3,1,4', str(p.map(e => e.s)) === str([2, 3, 1, 4]));
  cek('pindah tidak mengubah masukan', str(awal.map(e => e.s)) === str([1, 2, 3, 4]));
  cek('pindah ke posisi sama: salinan identik', str(U.pindahPos(awal, 2, 2)) === str(awal));
  cek('pindah dijepit ke rentang', str(U.pindahPos(awal, 4, 99).map(e => e.s)) === str([1, 2, 3, 4]));
  cek('asliUrut false setelah pindah', !U.asliUrut(p, 4));

  const h = U.hapusPos(awal, 2);
  cek('hapus posisi 2: 1,3,4', str(h.map(e => e.s)) === str([1, 3, 4]));
  cek('hapus satu-satunya entri ditolak', str(U.hapusPos([{ s: 1 }], 1)) === str([{ s: 1 }]));

  const g = U.gandakanPos(awal, 2);
  cek('gandakan posisi 2: 1,2,2,3,4', str(g.map(e => e.s)) === str([1, 2, 2, 3, 4]));
  cek('gandakan halaman kosong: salinan kosong', str(U.gandakanPos([{ s: 1 }, { k: 1 }], 2)) === str([{ s: 1 }, { k: 1 }, { k: 1 }]));

  const k = U.sisipKosongSetelah(awal, 2);
  cek('sisip kosong sesudah posisi 2', str(k) === str([{ s: 1 }, { s: 2 }, { k: 1 }, { s: 3 }, { s: 4 }]));
  cek('sisip kosong di awal (0)', str(U.sisipKosongSetelah(awal, 0)[0]) === str({ k: 1 }));
  cek('sisip kosong di akhir', str(U.sisipKosongSetelah(awal, 99).at(-1)) === str({ k: 1 }));
  cek('asliUrut false bila ada kosong', !U.asliUrut(k, 4));
}

console.log('\n[2] Pemetaan posisi ↔ halaman asli');
{
  const d = [{ s: 3 }, { k: 1 }, { s: 1 }, { s: 3 }];
  cek('srcDi posisi 1 = 3', U.srcDi(d, 1) === 3);
  cek('srcDi posisi 2 (kosong) = 0', U.srcDi(d, 2) === 0);
  cek('srcDi di luar rentang = 0', U.srcDi(d, 9) === 0 && U.srcDi(d, 0) === 0);
  cek('posisiSrc halaman 3 = posisi pertama (1)', U.posisiSrc(d, 3) === 1);
  cek('posisiSrc halaman 1 = 3', U.posisiSrc(d, 1) === 3);
  cek('posisiSrc halaman yang hilang = 0', U.posisiSrc(d, 2) === 0);
  cek('srcTerdekat kosong ke-2 ambil asli sebelumnya (3)', U.srcTerdekat(d, 2) === 3);
  cek('srcTerdekat di awal tanpa asli sebelumnya ambil ke depan', U.srcTerdekat([{ k: 1 }, { s: 5 }], 1) === 5);
  cek('srcTerdekat semua kosong = 0', U.srcTerdekat([{ k: 1 }, { k: 1 }], 1) === 0);
}

console.log('\n[3] Baca data tersimpan (tahan rusak)');
{
  const teks = U.tulisSusunan([{ s: 2 }, { k: 1 }, { s: 1 }]);
  cek('tulis lalu baca kembali identik', str(U.bacaSusunan(teks, 3)) === str([{ s: 2 }, { k: 1 }, { s: 1 }]));
  cek('teks kosong → susunan awal', str(U.bacaSusunan('', 2)) === str(U.susunanAwal(2)));
  cek('JSON rusak → susunan awal', str(U.bacaSusunan('{rusak', 2)) === str(U.susunanAwal(2)));
  cek('entri di luar rentang dibuang', str(U.bacaSusunan(str({ v: 1, urut: [{ s: 9 }, { s: 1 }] }), 2)) === str([{ s: 1 }]));
  cek('entri tidak valid dibuang (string, nol, negatif)',
    str(U.bacaSusunan(str({ urut: ['x', { s: 0 }, { s: -1 }, { s: 2 }, null] }), 2)) === str([{ s: 2 }]));
  cek('daftar semua tidak valid → susunan awal (tidak pernah kosong)',
    str(U.bacaSusunan(str({ urut: [{ s: 99 }] }), 3)) === str(U.susunanAwal(3)));
  cek('total 0 → daftar kosong (tidak ada halaman)', U.bacaSusunan('', 0).length === 0);
  cek('nilai pecahan dibulatkan ke bawah', str(U.bacaSusunan(str({ urut: [{ s: 2.9 }] }), 3)) === str([{ s: 2 }]));
  cek('kunciSusunan memakai awalan susun-', U.kunciSusunan('abc') === 'susun-abc');
}

console.log('\n[4] Penyimpanan di IndexedDB palsu');
{
  const idPdf = 'pdf-uji-susun-1';
  const bytesPdf = Buffer.from('%PDF-1.4 isi asli untuk uji susunan\n%%EOF');
  const hashAwal = hash(bytesPdf);
  await B.simpanBlob(idPdf, new Blob([bytesPdf], { type: 'application/pdf' }));

  const kosong = await S.muatSusunan(idPdf, 3);
  cek('belum ada susunan → urutan asli', U.asliUrut(kosong, 3));

  const daftar = U.gandakanPos(U.pindahPos(U.susunanAwal(3), 1, 3), 1);
  await S.simpanSusunan(idPdf, daftar);
  const muat = await S.muatSusunan(idPdf, 3);
  cek('muat ulang sama dengan yang disimpan', str(muat) === str(daftar), str(muat));

  const blobSusun = await B.ambilBlob(U.kunciSusunan(idPdf));
  cek('susunan disimpan di kunci susun-<id>', !!blobSusun);
  cek('anotasi tidak tersentuh (tidak ada anot- untuk id ini)', !(await B.ambilBlob(A.kunciAnotasi(idPdf))));
  cek('kunci anotasi dan susunan berbeda', A.kunciAnotasi(idPdf) !== U.kunciSusunan(idPdf));

  /* Anotasi dan susunan hidup berdampingan tanpa saling timpa. */
  const anot = A.tambahAnotasi([], A.buatAnotasi('sorot', 2, { x1: 0.1, y1: 0.1, x2: 0.2, y2: 0.2 }));
  await AS.simpanAnotasi(idPdf, anot);
  const muatAnot = await AS.muatAnotasi(idPdf);
  cek('anotasi tetap terbaca setelah susunan disimpan', muatAnot.length === 1);
  cek('susunan tetap terbaca setelah anotasi disimpan', str(await S.muatSusunan(idPdf, 3)) === str(daftar));

  /* Susunan yang di-reset ke awal menghapus urutan tersimpan dari pandangan. */
  await S.simpanSusunan(idPdf, U.susunanAwal(3));
  cek('setelah disimpan urutan asli, muat = asli', U.asliUrut(await S.muatSusunan(idPdf, 3), 3));

  /* Berkas PDF asli tidak berubah. */
  const ambil = await B.ambilBlob(idPdf);
  const isiSekarang = Buffer.from(await ambil.arrayBuffer());
  cek('isi PDF asli tidak berubah (hash)', hash(isiSekarang) === hashAwal);

  let galat = null;
  try { await S.simpanSusunan('', daftar); } catch (e) { galat = e; }
  cek('simpan tanpa blobId melempar galat', galat instanceof Error);
  cek('muat tanpa blobId = urutan asli', U.asliUrut(await S.muatSusunan('', 2), 2));
}

console.log('\n[5] Cadangan dan pembersih blob yatim (pemeriksaan sumber; perilaku diuji di Chromium)');
{
  /* data-io.js dan image.js butuh DOM, jadi di Node hanya diperiksa sumbernya. */
  const dataIo = fs.readFileSync('docs/notes/data-io.js', 'utf8');
  const bersih = fs.readFileSync('docs/notes/editor/image.js', 'utf8');
  cek('data-io.js mengimpor kunciSusunan', dataIo.includes('kunciSusunan }'));
  cek('kumpulan kunci cadangan menyertakan kunciSusunan(x)', dataIo.includes('kunciSusunan(x)'));
  cek('pembersih blob yatim memakai kunciSusunan(id)', bersih.includes('dipakai.add(kunciSusunan(id))'));
}

console.log(`\nHasil: ${lulus} LOLOS, ${gagal} GAGAL`);
if (gagal) process.exit(1);
