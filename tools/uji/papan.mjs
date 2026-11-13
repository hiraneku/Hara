/* MB1 · uji murni papan-logika.js (Kanban & kalender dari properti). Tanpa DOM. */
import * as L from '../../docs/notes/papan-logika.js';

let gagal = 0, lulus = 0;
const oke = (nama, kondisi, det = '') => {
  if (kondisi) { lulus++; console.log('ok  ', nama); }
  else { gagal++; console.log('FAIL', nama, det ? '\n      ' + det : ''); }
};
const n = (id, props = []) => ({ id, title: id, props });

/* ── nilaiProp ── */
oke('nilaiProp membaca nilai & membuang spasi', L.nilaiProp(n('a', [{ k: 'status', v: '  Selesai ' }]), 'status') === 'Selesai');
oke('nilaiProp kosong bila tidak ada props', L.nilaiProp(n('a'), 'status') === '');
oke('nilaiProp null-safe', L.nilaiProp(null, 'x') === '');

/* ── Kanban ── */
const notes = [
  n('1', [{ k: 'status', v: 'Draf' }]),
  n('2', [{ k: 'status', v: 'selesai' }]),        /* huruf kecil: masuk kolom Selesai */
  n('3', [{ k: 'status', v: 'SELESAI' }]),
  n('4', []),                                       /* tanpa status → kosong */
  n('5', [{ k: 'status', v: 'Riset' }]),           /* nilai bebas */
  n('6', [{ k: 'status', v: 'alpha' }]),
];
const urutan = ['Draf', 'Sedang dikerjakan', 'Selesai', 'Diarsipkan'];
const kol = L.kelompokKanban(notes, 'status', urutan);
const labelKol = kol.map(c => c.nilai || '(kosong)');
oke('kolom contoh tampil berurutan meski kosong', JSON.stringify(labelKol.slice(0, 4)) === JSON.stringify(urutan), JSON.stringify(labelKol));
oke('huruf kecil & besar masuk kolom yang sama', kol.find(c => c.kunci === 'selesai').notes.length === 2);
oke('label kolom memakai penulisan pertama', kol.find(c => c.kunci === 'selesai').nilai === 'Selesai');
oke('kolom "Sedang dikerjakan" kosong tetap ada', kol.find(c => c.kunci === 'sedang dikerjakan').notes.length === 0);
oke('nilai bebas tambahan diurut abjad setelah kolom contoh', labelKol.indexOf('alpha') < labelKol.indexOf('Riset'));
oke('catatan tanpa nilai di kolom kosong (paling akhir)', kol[kol.length - 1].kunci === '' && kol[kol.length - 1].notes[0].id === '4');
oke('semua catatan terbagi tepat sekali', kol.reduce((s, c) => s + c.notes.length, 0) === notes.length);
oke('kelompok tanpa urutan awal: nilai saja + kosong', L.kelompokKanban(notes, 'prioritas').length === 1);
oke('kelompok tanpa urutan awal: semua kosong → 1 kolom kosong', L.kelompokKanban(notes, 'prioritas')[0].kunci === '' && L.kelompokKanban(notes, 'prioritas')[0].notes.length === 6);
oke('daftar kosong → tanpa kolom bebas, kolom contoh tetap', L.kelompokKanban([], 'status', urutan).length === 4);

/* ── tanggalValid ── */
oke('tanggal valid 2026-10-24', L.tanggalValid('2026-10-24'));
oke('kabisat 2028-02-29 valid', L.tanggalValid('2028-02-29'));
oke('2027-02-29 ditolak (bukan kabisat)', !L.tanggalValid('2027-02-29'));
oke('bulan 13 ditolak', !L.tanggalValid('2026-13-01'));
oke('hari 00 ditolak', !L.tanggalValid('2026-01-00'));
oke('format salah (24/10/2026) ditolak', !L.tanggalValid('24/10/2026'));
oke('teks bebas ditolak', !L.tanggalValid('besok'));
oke('kosong / null ditolak', !L.tanggalValid('') && !L.tanggalValid(null));

/* ── sumbu kalender ── */
const bertanggal = [
  n('a', [{ k: 'tanggal', v: '2026-10-01' }, { k: 'tenggat', v: '2026-10-09' }]),
  n('b', [{ k: 'mulai', v: '2026-10-02' }]),
  n('c', [{ k: 'tenggat', v: 'besok' }]),
];
const kunci = L.kunciTanggalTersedia(bertanggal);
oke('sumbu: tenggat didahulukan, lalu tanggal, lalu kunci lain', JSON.stringify(kunci) === JSON.stringify(['tenggat', 'tanggal', 'mulai']), JSON.stringify(kunci));
oke('sumbu: properti tanpa tanggal valid tidak ikut', !L.kunciTanggalTersedia([n('x', [{ k: 'status', v: 'Draf' }])]).length);

const peta = L.catatanPerHari(bertanggal, 'tenggat');
oke('catatanPerHari: hanya tanggal valid', peta.size === 1 && peta.get('2026-10-09')[0].id === 'a');

/* ── grid bulan ── */
/* Oktober 2026: 1 Oktober adalah Kamis → 3 sel kosong di depan (Sen, Sel, Rab) */
const oktober = L.gridBulan(2026, 9);
oke('Oktober 2026: 31 hari', oktober.jumlahHari === 31);
oke('Oktober 2026: sel pertama kosong ×3 lalu tanggal 1 di Kamis', oktober.minggu[0][3].tgl === '2026-10-01' && oktober.minggu[0][0].tgl === null);
oke('grid selalu kelipatan 7 sel per minggu', oktober.minggu.every(m => m.length === 7));
oke('grid berisi setiap tanggal tepat sekali',
  oktober.minggu.flat().filter(s => s.tgl).length === 31);
/* Februari 2027 dimulai Senin: tanpa sel kosong di depan */
const feb27 = L.gridBulan(2027, 1);
oke('Februari 2027 dimulai Senin (tanpa kosong di depan)', feb27.minggu[0][0].tgl === '2027-02-01');
oke('Februari 2027 tidak kabisat: 28 hari', feb27.jumlahHari === 28);
/* Maret 2026 dimulai Minggu → 6 sel kosong di depan (Senin–Sabtu) */
const mar26 = L.gridBulan(2026, 2);
oke('Maret 2026 dimulai Minggu → 6 sel kosong di depan', mar26.minggu[0].slice(0, 6).every(s => s.tgl === null) && mar26.minggu[0][6].tgl === '2026-03-01');
oke('sel di luar bulan tidak pernah berisi tanggal bulan lain', oktober.minggu.flat().filter(s => s.tgl === null).every(s => s.hari === null));

/* ── geserBulan ── */
oke('geser +1 dari Desember → Januari tahun berikutnya', JSON.stringify(L.geserBulan(2026, 11, 1)) === JSON.stringify({ tahun: 2027, bulan0: 0 }));
oke('geser -1 dari Januari → Desember tahun sebelumnya', JSON.stringify(L.geserBulan(2026, 0, -1)) === JSON.stringify({ tahun: 2025, bulan0: 11 }));
oke('geser ±0 tetap di bulan yang sama', JSON.stringify(L.geserBulan(2026, 9, 0)) === JSON.stringify({ tahun: 2026, bulan0: 9 }));

console.log(`\nTotal: ${lulus + gagal} pengujian · Lulus: ${lulus} · Gagal: ${gagal}`);
process.exit(gagal ? 1 : 0);
