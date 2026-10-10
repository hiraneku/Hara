/* Uji Ronde 12 · K20 statistik & heatmap — murni (statistik.js).
   Jalankan: node tools/uji/statistik.mjs */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const V = fs.readFileSync('docs/app.js','utf8').match(/\?v=(\d+)/)[1];
const S = await import(`${process.cwd()}/docs/notes/statistik.js?v=${V}`);

let no = 0, gagal = 0;
const cek = (nama, k, d = '') => { no++; if (k) console.log(`  ✓ ${nama}`); else { gagal++; console.log(`  ✗ ${nama} ${d}`); } };

// Sabtu 2026-10-10 12:00 waktu lokal (bukan Senin) — uji bentuk minggu.
const sekarang = new Date(2026, 9, 10, 12, 0, 0).getTime();
const hariKe = (y, m, d, jam = 10) => new Date(y, m - 1, d, jam).getTime();
const todo = (done, checked = true) => ({ type: 'todo', meta: { checked, done: checked ? done : 0 } });
const notes = [
  { id: 'a', title: 'Proyek', blocks: [todo(hariKe(2026, 10, 10)), todo(hariKe(2026, 10, 10)), todo(0, false)] },
  { id: 'b', title: 'Jurnal · 2026-10-09', createdAt: hariKe(2026, 10, 9), blocks: [] },
  { id: 'c', title: 'Jurnal · 2026-10-08', createdAt: hariKe(2026, 10, 8), blocks: [todo(hariKe(2026, 10, 5))] },
  { id: 'd', title: 'Journal · 2026-10-10', createdAt: hariKe(2026, 10, 10), blocks: [] },
  { id: 'e', title: 'Jurnal · hapus', createdAt: hariKe(2026, 10, 7), deletedAt: 1, blocks: [todo(hariKe(2026, 10, 7))] },
  { id: 'f', title: 'Catatan biasa', createdAt: hariKe(2026, 10, 6), blocks: [] },
];

console.log('K20 · statistik');
const harian = S.aktivitasHarian(notes, { hari: 30, sekarang });
cek('jumlah hari sesuai', harian.length === 30);
cek('hari terakhir = hari ini', harian[harian.length - 1].tanggal === '2026-10-10');
const h = d => harian.find(x => x.tanggal === d);
cek('2 tugas selesai pada 10 Okt', h('2026-10-10').tugas === 2, JSON.stringify(h('2026-10-10')));
cek('jurnal 10 Okt (Journal, bahasa Inggris) terhitung', h('2026-10-10').jurnal === 1);
cek('catatan terhapus tidak dihitung', h('2026-10-07').total === 0, JSON.stringify(h('2026-10-07')));
cek('tugas belum selesai tidak dihitung', h('2026-10-10').tugas === 2);
cek('jurnal 9 Okt terhitung', h('2026-10-09').jurnal === 1);
cek('catatan biasa bukan jurnal', h('2026-10-06').jurnal === 0);

const mingguan = S.tugasSelesaiPerMinggu(notes, { minggu: 4, sekarang });
cek('4 minggu', mingguan.length === 4);
cek('minggu berawal Senin', new Date(mingguan[3].mulai + 'T00:00:00').getDay() === 1, mingguan[3].mulai);
cek('minggu ini: Senin 2026-10-05', mingguan[3].mulai === '2026-10-05', mingguan[3].mulai);
cek('minggu ini berisi 2 tugas (10 Okt) + 1 (5 Okt)', mingguan[3].jumlah === 3, JSON.stringify(mingguan[3]));

cek('rentetan jurnal: 10,9,8 Okt = 3 (hari ini ada)', S.rentetanJurnal(notes, { sekarang }) === 3, S.rentetanJurnal(notes, { sekarang }));
const sesudahSehari = hariKe(2026, 10, 11, 9);
cek('rentetan tetap 3 bila hari ini belum ditulis (kemarin dihitung)', S.rentetanJurnal(notes, { sekarang: sesudahSehari }) === 3, S.rentetanJurnal(notes, { sekarang: sesudahSehari }));
cek('rentetan putus bila dua hari kosong', S.rentetanJurnal(notes, { sekarang: hariKe(2026, 10, 13) }) === 0);

cek('kunciHari format YYYY-MM-DD', S.kunciHari(hariKe(2026, 1, 3)) === '2026-01-03');
cek('intensitas 0 untuk nol', S.tingkatIntensitas(0, 5) === 0);
cek('intensitas 4 untuk maksimum', S.tingkatIntensitas(5, 5) === 4);
cek('intensitas 2 untuk 30%', S.tingkatIntensitas(3, 10) === 2);

console.log(`\nHasil: ${no - gagal}/${no} lolos${gagal ? `, ${gagal} gagal` : ''}`);
process.exit(gagal ? 1 : 0);
