/* Regresi Tahap 1 kalender: normalisasi model acara, tanggal inklusif,
   acara berjam lintas zona/DST, dan penyimpanan model pada snapshot Hara. */
import fs from 'node:fs';
import {
  normalisasiAcara, normalisasiDaftarAcara, acaraPadaTanggal, kejadianAcaraPadaTanggal,
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
const tertaut=normalisasiAcara({...dasar,catatanId:'note-local-42',mulai:1,selesai:2});
cek('acara mempertahankan ID tautan catatan saja sebagai metadata opsional',tertaut?.catatanId==='note-local-42'&&!('isiCatatan' in tertaut));
cek('ID tautan catatan dengan karakter kontrol ditolak',!normalisasiAcara({...dasar,catatanId:'bad\u0000id',mulai:1,selesai:2})?.catatanId);

const daftar = normalisasiDaftarAcara([
  { ...dasar, sepanjangHari: true, tanggalMulai: '2028-02-28', id: 'x' },
  { ...dasar, sepanjangHari: true, tanggalMulai: '2028-02-28', id: 'x' },
  { ...dasar, mulai: 2, selesai: 1, id: 'bad' },
  null,
]);
cek('normalisasi daftar membuang ID duplikat dan item tak valid', daftar.length === 1 && daftar[0].id === 'x');

const seri = normalisasiAcara({ ...dasar, sepanjangHari: true, tanggalMulai: '2026-07-01',
  pengulangan: { frekuensi: 'mingguan', interval: 1, hari: [1, 4] } });
cek('pengulangan mingguan tidak memunculkan sisa pekan dasar sebelum hari terpilih pertama',
  !acaraPadaTanggal(seri, '2026-07-02') && acaraPadaTanggal(seri, '2026-07-06') && acaraPadaTanggal(seri, '2026-07-09'));
const hariKerja=normalisasiAcara({...dasar,sepanjangHari:true,tanggalMulai:'2026-07-06',pengulangan:{frekuensi:'mingguan',hari:[1,2,3,4,5]}});
cek('pengulangan hari kerja mencakup hari tersisa pada pekan pertama saat hari dasar dipilih',acaraPadaTanggal(hariKerja,'2026-07-07')&&acaraPadaTanggal(hariKerja,'2026-07-10'));
const seriDuaPekan = normalisasiAcara({ ...dasar, sepanjangHari: true, tanggalMulai: '2026-07-01',
  pengulangan: { frekuensi: 'mingguan', interval: 2, hari: [1] } });
cek('interval mingguan ditambatkan ke awal rangkaian dan tidak bergeser tiap kueri',
  !acaraPadaTanggal(seriDuaPekan, '2026-07-06') && acaraPadaTanggal(seriDuaPekan, '2026-07-13') && acaraPadaTanggal(seriDuaPekan, '2026-07-27'));
const seriAkhir = normalisasiAcara({ ...dasar, sepanjangHari: true, tanggalMulai: '2026-07-01',
  pengulangan: { frekuensi: 'harian', sampai: '2026-07-03' } });
cek('tanggal akhir pengulangan inklusif', acaraPadaTanggal(seriAkhir, '2026-07-03') && !acaraPadaTanggal(seriAkhir, '2026-07-04'));
const seriKecuali = normalisasiAcara({ ...dasar, sepanjangHari: true, tanggalMulai: '2026-07-01',
  pengulangan: { frekuensi: 'harian', kecuali: ['2026-07-02'] } });
cek('pengecualian menghilangkan satu kejadian berulang', !acaraPadaTanggal(seriKecuali, '2026-07-02') && acaraPadaTanggal(seriKecuali, '2026-07-03'));
const perubahan = normalisasiAcara({ ...dasar, sepanjangHari: true, tanggalMulai: '2026-07-01',
  pengulangan: { frekuensi: 'harian', kecuali: ['2026-07-02'], perubahan: [{ tanggalAsal: '2026-07-02', acara: { ...dasar, sepanjangHari: true, tanggalMulai: '2026-07-04', judul: 'Dipindah' } }] } });
cek('perubahan satu kejadian tampil pada tanggal baru dengan sumber seri',
  !acaraPadaTanggal(perubahan, '2026-07-02') && kejadianAcaraPadaTanggal(perubahan, '2026-07-04').some(x => x.judul === 'Dipindah' && x.seriId === perubahan.id));

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
cek('layout kalender merapikan filter, kontrol sentuh, fokus keyboard, dan layar sangat sempit', /\.kal-cari-input\{grid-column:1\/-1\}/.test(css) && /\.kal-hari\.kal-pilih:hover/.test(css) && /:focus-visible/.test(css) && /@media\(max-width:420px\)/.test(css));

console.log(`\nHasil: ${total - gagal}/${total} lulus`);
process.exitCode = gagal ? 1 : 0;
