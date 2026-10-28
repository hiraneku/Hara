/* Uji Tahap 2 · B8 — navigasi planner: kalender ke jurnal per tanggal.
   - Modul murni jurnal-tanggal.js: judul per bahasa, pencarian jurnal lintas bahasa,
     dan penanda hari berjurnal di kalender;
   - sumber: harian.js memakai pencarian yang sama untuk buka dan buat (tidak ada jurnal ganda),
     kalender menyaring catatan terkunci, handler tombol "Buka jurnal" terpasang, dan
     kamus en/ja punya semua teks baru.
   Uji DOM dan alur klik ada di Chromium (harness di luar repo). Jalankan: node tools/uji/planner-kalender.mjs */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  tanggalJurnal, judulJurnal, urutanBahasaJurnal, cariJurnal, hariBerjurnal,
} from '../../docs/notes/jurnal-tanggal.js';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));

let lulus = 0, gagal = 0;
const cek = (nama, ok, info = '') => {
  if (ok) { lulus++; console.log(`ok   ${nama}`); }
  else { gagal++; console.log(`GAGAL ${nama}${info ? ' — ' + info : ''}`); }
};
const str = v => JSON.stringify(v);

console.log('── format tanggal dan judul ──');
const t15 = new Date(2026, 9, 15);          /* 15 Oktober 2026 */
const t5 = new Date(2026, 0, 5);            /* 5 Januari 2026 */
cek('id: "15 Oktober 2026"', tanggalJurnal('id', t15) === '15 Oktober 2026', tanggalJurnal('id', t15));
cek('en: "October 15, 2026"', tanggalJurnal('en', t15) === 'October 15, 2026', tanggalJurnal('en', t15));
cek('ja: "2026年10月15日"', tanggalJurnal('ja', t15) === '2026年10月15日', tanggalJurnal('ja', t15));
cek('id: tanpa angka nol di depan', tanggalJurnal('id', t5) === '5 Januari 2026', tanggalJurnal('id', t5));
cek('judul id: "Jurnal · 15 Oktober 2026"', judulJurnal('id', t15) === 'Jurnal · 15 Oktober 2026', judulJurnal('id', t15));
cek('judul en memakai prefiks Journal', judulJurnal('en', t15) === 'Journal · October 15, 2026', judulJurnal('en', t15));
cek('bahasa tak dikenal jatuh ke id', judulJurnal('xx', t15) === 'Jurnal · 15 Oktober 2026', judulJurnal('xx', t15));
cek('urutan cari: bahasa aktif dulu', str(urutanBahasaJurnal('en')) === str(['en', 'id', 'ja']), str(urutanBahasaJurnal('en')));

console.log('── pencarian jurnal ──');
const catatan = (judul, extra = {}) => ({ id: 'n' + Math.random().toString(36).slice(2, 7), title: judul, ...extra });
const idJudul = judulJurnal('id', t15);
const enJudul = judulJurnal('en', t15);
cek('ketemu jurnal bahasa aktif', cariJurnal([catatan(idJudul)], t15, 'id')?.title === idJudul);
cek('ketemu jurnal bahasa lain (en saat aplikasi id)', cariJurnal([catatan(enJudul)], t15, 'id')?.title === enJudul);
const dua = [catatan(enJudul, { id: 'en-1' }), catatan(idJudul, { id: 'id-1' })];
cek('bila dua bahasa ada, bahasa aktif yang dipilih', cariJurnal(dua, t15, 'id')?.id === 'id-1', cariJurnal(dua, t15, 'id')?.id);
cek('judul dipangkas spasi sebelum dibandingkan', cariJurnal([catatan('  ' + idJudul + '  ')], t15, 'id') !== null);
cek('catatan terhapus diabaikan', cariJurnal([catatan(idJudul, { deletedAt: 1 })], t15, 'id') === null);
cek('tanggal lain tidak cocok', cariJurnal([catatan(idJudul)], new Date(2026, 9, 16), 'id') === null);
cek('judul bukan jurnal tidak cocok', cariJurnal([catatan('Rapat 15 Oktober 2026')], t15, 'id') === null);
cek('daftar kosong → null', cariJurnal([], t15, 'id') === null);
/* pembuatan tidak boleh menggandakan: setelah "buat", pencarian harus menemukan yang sama */
const baru = catatan(judulJurnal('id', t15), { id: 'baru' });
const kumpulan = [baru];
cek('setelah dibuat, buka kedua kalinya menemukan catatan yang sama', cariJurnal(kumpulan, t15, 'id')?.id === 'baru');

console.log('── penanda hari di kalender ──');
const oktober = hariBerjurnal([
  catatan(judulJurnal('id', new Date(2026, 9, 1))),
  catatan(' ' + judulJurnal('en', new Date(2026, 9, 31)) + ' '),
  catatan(judulJurnal('ja', new Date(2026, 9, 15))),
  catatan(judulJurnal('id', new Date(2026, 10, 1))),          /* November: tidak ikut */
  catatan(idJudul, { deletedAt: 1 }),                          /* terhapus: tidak ikut */
  catatan('Jurnal kemarin tanpa tanggal'),
], 2026, 9, 'id');
cek('hari berjurnal Oktober: 1, 15, 31', str([...oktober].sort((a, b) => a - b)) === str([1, 15, 31]), str([...oktober]));
const februari = hariBerjurnal([catatan(judulJurnal('id', new Date(2028, 1, 29)))], 2028, 1, 'id');
cek('Februari kabisat: hari ke-29 terdeteksi', februari.has(29) && februari.size === 1, str([...februari]));
cek('bulan tanpa jurnal → himpunan kosong', hariBerjurnal([], 2026, 9, 'id').size === 0);

console.log('── sumber: wiring B8 ──');
const baca = p => fs.readFileSync(p, 'utf8');
const harian = baca('docs/notes/harian.js');
cek('harian.js memakai cariJurnal dan judulJurnal bersama', /cariJurnal\(state\.notes/.test(harian) && /title: judulJurnal\(kini, t\)/.test(harian));
cek('harian.js tidak punya salinan PREFIX sendiri', !/const PREFIX\b/.test(harian));
cek('harian.js mengekspor bukaJurnalTanggal', /export function bukaJurnalTanggal\(/.test(harian));
cek('bukaJurnalHari tetap memakai pesan "hari ini"', /bukaJurnalTanggal\(new Date\(\), true\)/.test(harian));
const tugas = baca('docs/notes/views/tugas.js');
cek('kalender menyaring catatan dengan terlihat()', /hariBerjurnal\(state\.notes\.filter\(n => terlihat\(n\)\)/.test(tugas));
cek('tombol "Buka jurnal" ada di panel hari terpilih', /class="kal-jurnal" data-kal-jurnal="\$\{kalPilih\}"/.test(tugas));
cek('penanda jurnal ada di sel hari', /kal-jurnal-titik/.test(tugas));
const indeks = baca('docs/notes/index.js');
cek('index.js menangani [data-kal-jurnal] sebelum [data-kal-hari]',
  indeks.indexOf('[data-kal-jurnal]') > 0 && indeks.indexOf('[data-kal-jurnal]') < indeks.indexOf('[data-kal-hari]'));
cek('index.js mengimpor bukaJurnalTanggal', /import \{[^}]*\bbukaJurnalTanggal\b[^}]*\} from '\.\/harian\.js/.test(indeks));
const css = baca('docs/styles/notes.css');
cek('CSS tombol dan penanda jurnal ada', /\.kal-jurnal\{/.test(css) && /\.kal-jurnal-titik\{/.test(css));

console.log('── kamus: teks baru punya terjemahan ──');
const { EN } = await import('../../docs/core/bahasa-en.js');
const { JA } = await import('../../docs/core/bahasa-ja.js');
const kunciBaru = ['Buka jurnal', 'ada jurnal', 'Jurnal {t} dibuka', 'Jurnal {t} dibuat — selamat menulis'];
for (const k of kunciBaru) {
  cek(`en & ja punya "${k}"`, typeof EN[k] === 'string' && EN[k] !== k && typeof JA[k] === 'string' && JA[k] !== k,
    `${EN[k]} | ${JA[k]}`);
}
cek('{t} dipertahankan di en dan ja', EN['Jurnal {t} dibuka'].includes('{t}') && JA['Jurnal {t} dibuka'].includes('{t}'));

console.log(`\nHasil: ${lulus} LOLOS, ${gagal} GAGAL`);
process.exit(gagal ? 1 : 0);
