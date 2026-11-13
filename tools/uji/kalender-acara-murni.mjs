/* Regresi Tahap 1 kalender: normalisasi model acara, tanggal inklusif,
   acara berjam lintas zona/DST, dan penyimpanan model pada snapshot Hara. */
import fs from 'node:fs';
import {
  normalisasiAcara, normalisasiDaftarAcara, acaraPadaTanggal,
  timestampDariDinding, tanggalKalenderValid, labelWaktuAcara,
} from '../../docs/notes/kalender-acara-murni.js';

let gagal = 0, total = 0;
const cek = (nama, ok, detail = '') => {
  total++;
  if (!ok) { gagal++; console.error('GAGAL', nama, detail); }
  else console.log('ok', nama);
};
const dasar = { id: 'e1', judul: 'Rapat', kategori: 'work' };
const sepanjang = normalisasiAcara({ ...dasar, sepanjangHari: true, tanggalMulai: '2028-02-28', tanggalAkhir: '2028-02-29' });
cek('acara sepanjang hari mempertahankan tanggal ISO dan tanggal akhir inklusif',
  sepanjang?.tanggalMulai === '2028-02-28' && sepanjang.tanggalAkhir === '2028-02-29');
cek('acara sepanjang hari muncul di kedua hari rentang',
  acaraPadaTanggal(sepanjang, '2028-02-28') && acaraPadaTanggal(sepanjang, '2028-02-29'));
cek('acara sepanjang hari tidak muncul sesudah tanggal akhir', !acaraPadaTanggal(sepanjang, '2028-03-01'));
cek('label rentang sepanjang hari mengikuti locale tanpa menggeser tanggal', labelWaktuAcara(sepanjang, 'en').includes('All day') && labelWaktuAcara(sepanjang, 'ja').includes('終日'));
cek('tanggal tidak valid (30 Februari) ditolak', !tanggalKalenderValid('2028-02-30'));
cek('rentang sepanjang hari terbalik ditolak', !normalisasiAcara({ ...dasar, sepanjangHari: true, tanggalMulai: '2028-03-02', tanggalAkhir: '2028-03-01' }));
cek('judul kosong ditolak', !normalisasiAcara({ ...dasar, judul: '   ', sepanjangHari: true, tanggalMulai: '2028-02-28' }));
cek('timestamp sama/terbalik ditolak', !normalisasiAcara({ ...dasar, mulai: 100, selesai: 100 }));

const mulai = timestampDariDinding('2026-07-01', '10:00', 'Asia/Makassar');
const acaraWaktu = normalisasiAcara({ ...dasar, mulai, selesai: mulai + 3600000, zonaWaktu: 'Asia/Makassar' });
cek('jam dinding dikonversi ke timestamp sesuai zona yang dipilih', new Date(mulai).toISOString() === '2026-07-01T02:00:00.000Z', new Date(mulai).toISOString());
cek('acara berjam terikat ke tanggal lokal pada zona acara', acaraPadaTanggal(acaraWaktu, '2026-07-01') && !acaraPadaTanggal(acaraWaktu, '2026-06-30'));
cek('zona waktu dipertahankan dalam model', acaraWaktu?.zonaWaktu === 'Asia/Makassar');
const lintasHari = normalisasiAcara({ ...dasar, mulai, selesai: mulai + 25 * 3600000, zonaWaktu: 'Asia/Makassar' });
cek('acara berjam multi-hari muncul pada setiap hari yang disentuh', acaraPadaTanggal(lintasHari, '2026-07-01') && acaraPadaTanggal(lintasHari, '2026-07-02'));
const batasTengahMalam = timestampDariDinding('2026-07-03', '00:00', 'Asia/Makassar');
const berakhirTengahMalam = normalisasiAcara({ ...dasar, mulai, selesai: batasTengahMalam, zonaWaktu: 'Asia/Makassar' });
cek('acara yang selesai tepat tengah malam tidak menempati hari berikutnya', !acaraPadaTanggal(berakhirTengahMalam, '2026-07-03'));
cek('waktu lokal DST yang tidak ada ditolak', timestampDariDinding('2026-03-08', '02:30', 'America/New_York') === null);
cek('waktu lokal valid setelah transisi DST diterima', Number.isFinite(timestampDariDinding('2026-03-08', '03:30', 'America/New_York')));
cek('zona waktu invalid jatuh aman ke UTC ketika normalisasi', normalisasiAcara({ ...dasar, mulai: 1, selesai: 2, zonaWaktu: 'No/Such_Zone' })?.zonaWaktu === 'UTC');

const daftar = normalisasiDaftarAcara([
  { ...dasar, sepanjangHari: true, tanggalMulai: '2028-02-28', id: 'x' },
  { ...dasar, sepanjangHari: true, tanggalMulai: '2028-02-28', id: 'x' },
  { ...dasar, mulai: 2, selesai: 1, id: 'bad' },
  null,
]);
cek('normalisasi daftar membuang ID duplikat dan item tak valid', daftar.length === 1 && daftar[0].id === 'x');

const store = fs.readFileSync('docs/core/store.js', 'utf8');
const layar = fs.readFileSync('docs/notes/views/tugas.js', 'utf8');
const dataIO = fs.readFileSync('docs/notes/data-io.js', 'utf8');
const css = fs.readFileSync('docs/styles/notes.css', 'utf8');
const { EN } = await import('../../docs/core/bahasa-en.js');
const { JA } = await import('../../docs/core/bahasa-ja.js');
cek('label utama acara memiliki terjemahan EN/JA', ['Tambah acara','Edit acara','Simpan acara','Zona waktu','Sepanjang hari'].every(k => EN[k] && JA[k]));
cek('acara ikut snapshot penyimpanan dan migrasi data lama aman', /acaraKalender: state\.acaraKalender/.test(store) && /normalisasiDaftarAcara\(data\.acaraKalender\)/.test(store));
cek('acara masuk ekspor dan pemulihan cadangan JSON', /acaraKalender: state\.acaraKalender/.test(dataIO) && /normalisasiDaftarAcara\(data\.acaraKalender\)/.test(dataIO));
cek('panel kalender memiliki layer dan CRUD acara mandiri', /data-kal-lapisan/.test(layar) && /data-kal-acara-form/.test(layar) && /data-kal-hapus/.test(layar));
cek('lima mode kalender dan kontrol pencarian/filter tersedia', ['bulan','agenda','hari','minggu','tahun'].every(k => layar.includes(`'${k}'`)) && /data-kal-cari-form/.test(layar));
cek('CSS responsif tersedia untuk acara, navigasi, dan tata letak ponsel', /\.kal-acara-form/.test(css) && /\.kal-nav-utama/.test(css) && /@media\(max-width:520px\)/.test(css));

console.log(`\nHasil: ${total - gagal}/${total} lulus`);
process.exitCode = gagal ? 1 : 0;
