/* Uji Ronde 11 · K2 & K5 — tata bahasa tugas: frasa tanggal baru, jam,
   prioritas (!/!!/!!!), dan pengulangan (setiap hari / hari / tanggal).
   Murni fungsi: tidak butuh DOM. Tanggal dihitung relatif terhadap hari ini
   supaya uji tidak mudah basi.

   Jalankan:  node tools/uji/tugas-lanjut.mjs */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const V = fs.readFileSync('docs/app.js', 'utf8').match(/\?v=(\d+)/)[1];
const P = await import(`${process.cwd()}/docs/notes/pengingat.js?v=${V}`);
const { uraiTugas, waktuTenggat, ulangSetelahCentang, tenggatBlok, kejadianSesudah } = P;

let gagal = 0, total = 0;
const oke = (nama, ok, det = '') => {
  total++;
  if (!ok) { gagal++; console.log('FAIL', nama, det ? '\n      ' + det : ''); }
  else console.log('ok  ', nama);
};

const hariIni = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const tambah = (n) => { const d = hariIni(); d.setDate(d.getDate() + n); return d.getTime(); };
const awal = (y, mo, d) => new Date(y, mo, d).getTime();
const blokTodo = (teks, meta = {}) => ({ type: 'todo', content: teks, meta: { checked: false, ...meta } });

/* ── 1. frasa tanggal ── */
oke('besok → +1 hari', uraiTugas('besok lari').waktu === tambah(1) && uraiTugas('besok lari').sisa === 'lari');
oke('lusa → +2 hari', uraiTugas('lusa bayar').waktu === tambah(2) && uraiTugas('lusa bayar').teks === 'lusa');
oke('minggu depan → +7 hari', uraiTugas('minggu depan review').waktu === tambah(7));
oke('3 hari lagi → +3 hari', uraiTugas('3 hari lagi kirim').waktu === tambah(3) && uraiTugas('3 hari lagi kirim').sisa === 'kirim');
oke('hari → hari ini', uraiTugas('hari beli').waktu === tambah(0));
oke('tanpa tanggal → null', uraiTugas('biasa saja') === null);
oke('tanggal ISO tetap jalan (kompatibel)', uraiTugas('2030-12-31 target').waktu === awal(2030, 11, 31));
oke('dd/mm/yyyy tetap jalan (kompatibel)', uraiTugas('31/12/2030 target').waktu === awal(2030, 11, 31));
oke('waktuTenggat tetap mengembalikan {waktu,teks}',
  JSON.stringify(Object.keys(waktuTenggat('besok x')).sort()) === '["teks","waktu"]');
oke('tanggal harus di awal baris', uraiTugas('rapat besok') === null);

/* ── 2. jam ── */
const j1 = uraiTugas('besok jam 14:00 rapat');
oke('jam "jam HH:MM" diambil', j1 && j1.jam === '14:00' && j1.sisa === 'rapat', JSON.stringify(j1));
const j2 = uraiTugas('besok 9.05 sarapan');
oke('jam dengan titik → HH:MM', j2 && j2.jam === '09:05' && j2.sisa === 'sarapan', JSON.stringify(j2));
const j3 = uraiTugas('besok jam 25:00 x');
oke('jam tak valid tidak diambil', j3 && j3.jam === null, JSON.stringify(j3));

/* ── 3. prioritas ── */
const p3 = uraiTugas('besok rapat !!!');
oke('!!! → prioritas 3, dibuang dari isi', p3 && p3.prioritas === 3 && p3.sisa === 'rapat', JSON.stringify(p3));
oke('! di awal baris juga dikenali', uraiTugas('! besok rapat').prioritas === 1);
oke('!! di tengah kalimat dikenali', uraiTugas('besok rapat !! klien').prioritas === 2
  && uraiTugas('besok rapat !! klien').sisa === 'rapat klien');
oke('tanda seru menempel pada kata tidak dihitung', uraiTugas('besok wow!!').prioritas === 0);

/* ── 4. berulang ── */
const h = uraiTugas('setiap hari minum air');
oke('setiap hari → aturan harian, mulai hari ini', h && h.aturan.jenis === 'harian' && h.waktu === tambah(0) && h.sisa === 'minum air', JSON.stringify(h));

const sn = uraiTugas('setiap senin standup');
oke('setiap senin → aturan mingguan hari=1', sn && sn.aturan.jenis === 'mingguan' && sn.aturan.hari === 1);
oke('kejadian pertama mingguan jatuh di hari Senin', new Date(sn.waktu).getDay() === 1 && sn.waktu >= tambah(0));

const bl = uraiTugas('setiap tanggal 31 bayar');
oke('setiap tanggal 31 → bulanan tgl=31', bl && bl.aturan.jenis === 'bulanan' && bl.aturan.tgl === 31);
oke('kejadian bulanan tanggal 31 memang tanggal 31', new Date(bl.waktu).getDate() === 31);

/* kejadianSesudah — tepi bulan pendek & pekan */
oke('bulanan 31 Jan → 28 Feb (2027, bukan tahun kabisat)',
  new Date(kejadianSesudah({ jenis: 'bulanan', tgl: 31 }, awal(2027, 0, 31))).getTime() === awal(2027, 1, 28));
oke('bulanan 31 Jan → 29 Feb (2028, kabisat)',
  kejadianSesudah({ jenis: 'bulanan', tgl: 31 }, awal(2028, 0, 31)) === awal(2028, 1, 29));
oke('mingguan Senin → Senin berikutnya (bukan hari ini)',
  kejadianSesudah({ jenis: 'mingguan', hari: 1 }, awal(2026, 9, 5)) === awal(2026, 9, 12));
oke('harian → besok', kejadianSesudah({ jenis: 'harian' }, awal(2026, 9, 5)) === awal(2026, 9, 6));

/* ulangSetelahCentang — dicentang, geser ke kejadian berikutnya setelah HARI INI */
const html = '<div class="b-todo"><button class="cbx on"><svg></svg></button>setiap hari minum air</div>';
const nx1 = ulangSetelahCentang(html, 0);
oke('dicentang (harian, tanpa ulangKe) → besok', nx1 === tambah(1), `dapat ${new Date(nx1).toDateString()}`);

const nx2 = ulangSetelahCentang(html, tambah(-5));
oke('kejadian yang terlewat 5 hari dilompati → besok',
  nx2 === tambah(1), `dapat ${new Date(nx2).toDateString()}`);

const nx3 = ulangSetelahCentang(html, tambah(3));
oke('ulangKe di masa depan → sesudahnya (+4)', nx3 === tambah(4));

oke('to-do sekali-jalan → null (tidak berulang)',
  ulangSetelahCentang('<div>besok lari</div>', 0) === null);
oke('to-do tanpa tanggal → null', ulangSetelahCentang('<div>tanpa tanggal</div>', 0) === null);

/* tenggatBlok — ulangKe menimpa tanggal pertama */
const tb = tenggatBlok(blokTodo('setiap hari minum', { ulangKe: tambah(4) }));
oke('tenggatBlok memakai meta.ulangKe bila ada', tb && tb.waktu === tambah(4) && tb.berulang === true);
const tb2 = tenggatBlok(blokTodo('besok lari'));
oke('tenggatBlok sekali-jalan: berulang=false', tb2 && tb2.berulang === false && tb2.waktu === tambah(1));

console.log(`\ntotal: ${total} · gagal: ${gagal}`);
process.exit(gagal ? 1 : 0);
