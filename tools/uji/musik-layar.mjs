/* Smoke jsdom untuk layar Musik (tahap 1):
   - navigasi: layar 'musik' tanpa navigasi bawah, dengan tombol kembali;
   - keadaan kosong, lalu lagu tersimpan tampil di pustaka dan pemutar;
   - pengaturan per lagu (tempo, nada) dipulihkan saat dibuka;
   - kartu beranda menampilkan lagu terakhir & tombol membuka layar;
   - hapus dua-ketuk;
   - kontrol gagal dengan rapi tanpa Web Audio (jsdom tidak punya AudioContext);
   - layar Ekspor Lagu: format, bitrate, saklar efek, dan kembali ke Musik.
   Audio sungguhan tidak bisa diuji di jsdom; itu diverifikasi di perangkat.
   Jalankan: node tools/uji/musik-layar.mjs */
import {JSDOM} from 'jsdom';
import fs from 'fs';
import { indexedDB as fakeIDB } from 'fake-indexeddb';
import path from 'path';
import { fileURLToPath } from 'url';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const dom = new JSDOM(fs.readFileSync('docs/index.html', 'utf8'), { url: 'https://x.test/', pretendToBeVisual: true });
const { window: w } = dom; w.indexedDB = fakeIDB;
for (const k of ['document', 'getSelection', 'HTMLElement', 'Node', 'Range', 'MouseEvent', 'Event', 'InputEvent', 'localStorage', 'Image', 'Blob'])
  if (w[k] !== undefined) globalThis[k] = w[k];
globalThis.window = w; globalThis.self = w; globalThis.indexedDB = w.indexedDB;
globalThis.addEventListener = w.addEventListener.bind(w);
Object.defineProperty(globalThis, 'navigator', { value: w.navigator, configurable: true });
w.URL.createObjectURL = () => 'blob:x/1'; w.URL.revokeObjectURL = () => {}; globalThis.URL = w.URL;
const AKAR = process.cwd();
const V = fs.readFileSync('docs/app.js', 'utf8').match(/\?v=(\d+)/)[1];
await import(`${AKAR}/docs/app.js?v=${V}`);
const R = await import(`${AKAR}/docs/core/router.js?v=${V}`);
const go = (...a) => R.go(...a);
/* cur adalah live binding: baca lewat namespace, jangan didestrukturisasi. */
w.HTMLCanvasElement.prototype.getContext = () => null;   /* jsdom tanpa canvas: waveform dilewati */
const S = await import(`${AKAR}/docs/musik/simpan.js?v=${V}`);
const M = await import(`${AKAR}/docs/musik/mesin.js?v=${V}`);

const tunggu = (ms = 60) => new Promise(r => setTimeout(r, ms));
let gagal = 0, total = 0;
const oke = (nama, baik, det = '') => { total++; if (!baik) { gagal++; console.log('FAIL', nama, det ? '\n      ' + det : ''); } else console.log('ok  ', nama); };
const q = s => document.querySelector(s);

await tunggu(120);

/* ── 1. navigasi & keadaan kosong ── */
oke('beranda: kartu Snowfall sudah diganti (kartu musik kosong)', !!q('.mk-kosong') && !q('.bh-sampul') && !q('.bh-judul'));
go('musik');
await tunggu();
oke('layar musik terbuka', R.cur === 'musik' && !!q('.mus'));
oke('navigasi bawah disembunyikan di layar Musik', q('#bnav').classList.contains('hide'));
oke('tombol kembali tampil di layar Musik', q('#back').style.display === 'grid');
oke('keadaan kosong: ajakan impor', !!q('.mus-pemutar-kosong') && !!q('[data-mus="impor"]'));
oke('input berkas audio tersedia', (q('[data-mus-berkas]')?.getAttribute('accept') || '').startsWith('audio/*'));
oke('peringatan Web Audio muncul di jsdom', !!q('.mus-peringatan'));
oke('kontrol tempo tidak aktif tanpa lagu', q('[data-mus-range="tempo"]')?.disabled === true);

/* ── 2. lagu tersimpan tampil ── */
const berkas = new Blob([new Uint8Array(16)], { type: 'audio/mpeg' });
const rek = await S.tambahLagu(berkas, { nama: 'Lagu Uji', durasi: 125 });
await S.tambahLagu(berkas, { nama: 'Lagu Kedua', durasi: 60 });
go('musik', { segar: true });
await tunggu();
oke('pustaka menampilkan lagu', [...document.querySelectorAll('.mus-item-judul')].map(e => e.textContent).join('|') === 'Lagu Uji|Lagu Kedua');
oke('pemutar menampilkan lagu pertama', q('.mus-judul')?.textContent === 'Lagu Uji');
oke('durasi ditampilkan', q('.mus-waktu')?.textContent.includes('2:05'));
oke('kontrol aktif setelah ada lagu', q('[data-mus-range="tempo"]')?.disabled === false);

/* ── 3. pengaturan per lagu dipulihkan ── */
S.simpanAtur(rek.id, { tempo: 0.75, pitch: 2, loop: null, posisi: 10 });
go('musik', { segar: true });
await tunggu();
oke('tempo tersimpan dipulihkan (75%)', q('[data-mus-range="tempo"]')?.value === '75' && q('[data-mus-out="tempoNilai"]')?.textContent === '75%');
oke('nada tersimpan dipulihkan (+2.00)', q('[data-mus-out="pitchNilai"]')?.textContent === '+2.00' && q('[data-mus-num="pitch"]')?.value === '2.00');
oke('posisi tersimpan tampil (0:10)', q('[data-mus-out="posisi"]')?.textContent === '0:10');

/* ── 4. kartu beranda ── */
go('home');
await tunggu();
oke('kartu beranda menampilkan lagu terakhir', q('.mk-judul')?.textContent === 'Lagu Uji' || q('.mk-judul')?.textContent === 'Lagu Kedua');
oke('kartu beranda punya tombol buka & putar', !!q('[data-bh="musik-buka"]') && !!q('[data-bh="musik-putar"]'));
q('[data-bh="musik-buka"]').click();
await tunggu();
oke('ketuk kartu membuka layar Musik', R.cur === 'musik');

/* ── 5. kontrol tanpa Web Audio: gagal dengan rapi ── */
q('[data-mus="pilih"][data-id="' + rek.id + '"]').click();
await tunggu(150);
oke('tanpa Web Audio, lagu tidak dimuat tapi aplikasi tetap hidup', M.keadaan().status === 'kosong' && R.cur === 'musik');
const rentang = q('[data-mus-range="pitch"]');
if (rentang) {
  rentang.value = '4';
  rentang.dispatchEvent(new w.Event('input', { bubbles: true }));
  await tunggu(100);
}
oke('geser nada tanpa Web Audio tidak melempar', true);

/* ── 6. hapus dua-ketuk ── */
const hapus = q('[data-mus="hapus"][data-id="' + rek.id + '"]');
hapus.click();
await tunggu(20);
oke('ketuk pertama hanya menandai', !!S.laguById(rek.id) && hapus.classList.contains('siap'));
q('[data-mus="hapus"][data-id="' + rek.id + '"]').click();
await tunggu(150);
oke('ketuk kedua menghapus lagu', S.laguById(rek.id) === null);
oke('daftar diperbarui setelah hapus', [...document.querySelectorAll('.mus-item-judul')].map(e => e.textContent).join('|') === 'Lagu Kedua');

/* ── 7. pengaturan Musik (kosong dulu) & seek bar ── */
oke('nada: langkah 0.01 pada slider dan kotak angka', q('[data-mus-range=\"pitch\"]')?.step === '0.01' && q('[data-mus-num=\"pitch\"]') !== null);
oke('sampul besar disiapkan di pemutar', !!q('.mus-sampul-besar[data-sampul-id]'));
oke('seek bar waveform dan bar garis tampil', !!q('[data-mus-gel] canvas') && !!q('[data-mus-gel] .mus-jalur'));
q('[data-mus=\"pengaturan\"]').click();
await tunggu();
oke('tombol pengaturan membuka Pengaturan Musik', R.cur === 'musik-set' && q('.mus-set-h')?.textContent === 'Pengaturan Musik');
oke('pengaturan: hanya sleep timer dan crossfade', document.querySelectorAll('.mus-set-kartu').length === 2 && !!q('[data-set="tidur-mulai"]') && !!q('[data-set="cf-aktif"]'));
oke('navigasi bawah tetap disembunyikan di pengaturan', q('#bnav').classList.contains('hide'));
go('musik');
await tunggu();
oke('seek bar tetap ada setelah kembali', !!q('[data-mus-gel] canvas'));

/* ── 8. daftar putar (tahap 2) ── */
const D = await import(`${AKAR}/docs/musik/daftar.js?v=${V}`);
const E = await import(`${AKAR}/docs/musik/eq.js?v=${V}`);
const A = await import(`${AKAR}/docs/musik/aksi.js?v=${V}`);
const L = await import(`${AKAR}/docs/musik/logika.js?v=${V}`);
localStorage.clear();
const lagu3 = [];
for (const n of ['Alfa', 'Beta', 'Gamma']) lagu3.push(await S.tambahLagu(berkas, { nama: n, durasi: 30 }));
const idAlfa = lagu3[0].id, idBeta = lagu3[1].id, idGamma = lagu3[2].id;
go('musik');
await tunggu();
oke('tombol daftar putar dan ekualiser ada di bar Musik', !!q('[data-mus=\"daftar\"]') && !!q('[data-mus=\"eq\"]'));
q('[data-mus=\"daftar\"]').click();
await tunggu();
oke('tombol daftar membuka layar Daftar Putar', R.cur === 'musik-daftar' && q('.mus-set-h')?.textContent === 'Daftar Putar');
oke('judul bar Daftar Putar', document.getElementById('title').textContent === 'Daftar Putar');
oke('layar daftar putar tanpa navigasi bawah', q('#bnav').classList.contains('hide'));
oke('daftar kosong: pesan ajakan', !!q('.mus-kosong-kecil'));
q('[data-dl-input=\"baru\"]').value = '  Pagi   hari ';
q('[data-dl=\"buat\"]').click();
await tunggu();
const dList = D.semuaDaftar();
oke('buat daftar: nama dirapikan dan langsung dibuka', dList.length === 1 && dList[0].nama === 'Pagi hari' && q('[data-dl-input=\"nama\"]')?.value === 'Pagi hari');
const idD = dList[0]?.id;
q('[data-dl=\"kembali\"]').click();
await tunggu();
q('[data-dl=\"buat\"]').click();
await tunggu();
oke('nama kosong ditolak tanpa membuat daftar', D.semuaDaftar().length === 1);
q('[data-dl=\"buka\"]').click();
await tunggu();
q('[data-dl-input=\"nama\"]').value = 'Malam';
q('[data-dl-input=\"nama\"]').dispatchEvent(new w.Event('change', { bubbles: true }));
await tunggu();
oke('ubah nama tersimpan', D.daftarById(idD)?.nama === 'Malam');
const tambahBtn = [...document.querySelectorAll('[data-dl=\"tambah\"]')];
oke('tambah dari pustaka: semua lagu pustaka ditawarkan (4)', tambahBtn.length === 4);
q(`[data-dl=\"tambah\"][data-lagu=\"${idAlfa}\"]`).click(); await tunggu();
q(`[data-dl=\"tambah\"][data-lagu=\"${idBeta}\"]`).click(); await tunggu();
q(`[data-dl=\"tambah\"][data-lagu=\"${idGamma}\"]`).click(); await tunggu();
oke('lagu ditambahkan berurutan', JSON.stringify(D.daftarById(idD).lagu) === JSON.stringify([idAlfa, idBeta, idGamma]));
q(`[data-dl=\"turun\"][data-indeks=\"0\"]`).click(); await tunggu();
oke('turunkan: Alfa pindah ke posisi 2', JSON.stringify(D.daftarById(idD).lagu) === JSON.stringify([idBeta, idAlfa, idGamma]));
q(`[data-dl=\"naik\"][data-indeks=\"2\"]`).click(); await tunggu();
oke('naikkan: Gamma pindah ke posisi 2', JSON.stringify(D.daftarById(idD).lagu) === JSON.stringify([idBeta, idGamma, idAlfa]));
q(`[data-dl=\"keluarkan\"][data-lagu=\"${idGamma}\"]`).click(); await tunggu();
oke('keluarkan: Gamma hilang dari daftar, tetap di pustaka', JSON.stringify(D.daftarById(idD).lagu) === JSON.stringify([idBeta, idAlfa]) && !!S.laguById(idGamma));
q('[data-dl=\"kembali\"]').click(); await tunggu();
oke('kembali ke daftar semua', q('.mus-daftar')?.children.length === 1);
q('[data-dl=\"buka\"]').click(); await tunggu();
oke('buka daftar lagi', q('[data-dl-input=\"nama\"]')?.value === 'Malam');
A.hapusLagu(idBeta); await tunggu(150);
oke('hapus lagu dari pustaka ikut mengeluarkannya dari daftar', JSON.stringify(D.daftarById(idD).lagu) === JSON.stringify([idAlfa]));
q('[data-dl=\"hapus-daftar\"]').click(); await tunggu();
oke('hapus daftar: ketuk pertama hanya meminta konfirmasi', D.semuaDaftar().length === 1);
q('[data-dl=\"hapus-daftar\"]').click(); await tunggu();
oke('hapus daftar: ketuk kedua menghapus', D.semuaDaftar().length === 0);

/* ── 9. ekualiser (tahap 2) ── */
go('musik-eq');
await tunggu();
oke('layar Ekualiser terbuka dengan judul', R.cur === 'musik-eq' && document.getElementById('title').textContent === 'Ekualiser');
oke('sepuluh pita dengan slider dan kotak angka', document.querySelectorAll('[data-eq=\"band\"]').length === 10 && document.querySelectorAll('[data-eq=\"angka\"]').length === 10);
oke('saklar aktif tampil dan menyala', q('[data-eq=\"aktif\"]')?.getAttribute('aria-checked') === 'true');
const geser0 = q('[data-eq=\"band\"][data-indeks=\"0\"]');
geser0.value = '7';
geser0.dispatchEvent(new w.Event('input', { bubbles: true }));
await tunggu();
oke('geser pita 31 Hz ke +7 tersimpan', E.ambilEq().gain[0] === 7);
oke('kotak angka ikut berubah', q('[data-eq=\"angka\"][data-indeks=\"0\"]').value === '7');
const angka2 = q('[data-eq=\"angka\"][data-indeks=\"2\"]');
angka2.value = '99';
angka2.dispatchEvent(new w.Event('input', { bubbles: true }));
await tunggu();
oke('angka di luar rentang dijepit ke +20', E.ambilEq().gain[2] === 20);
oke('gain tersimpan ke localStorage', JSON.parse(localStorage.getItem('hara.v2.musik.eq')).gain[2] === 20);
q('[data-eq=\"preset\"][data-nilai=\"bass\"]').click();
await tunggu();
oke('preset bass menerapkan nilai preset', JSON.stringify(E.ambilEq().gain) === JSON.stringify(L.PRESET_EQ.bass));
oke('preset aktif ditandai', q('[data-eq=\"preset\"][data-nilai=\"bass\"]')?.getAttribute('aria-pressed') === 'true');
q('[data-eq=\"aktif\"]').click();
await tunggu();
oke('saklar mematikan ekualiser', E.ambilEq().aktif === false && q('[data-eq=\"aktif\"]')?.getAttribute('aria-checked') === 'false');
oke('pita nonaktif saat ekualiser mati', q('[data-eq=\"band\"]').disabled === true);
q('[data-eq=\"aktif\"]').click();
await tunggu();
q('[data-eq=\"reset\"]').click();
await tunggu();
oke('reset mengembalikan datar dan aktif', E.ambilEq().gain.every(v => v === 0) && E.ambilEq().aktif === true);
oke('setelah reset, preset Datar yang ditandai', q('[data-eq=\"preset\"][data-nilai=\"datar\"]')?.getAttribute('aria-pressed') === 'true' && document.querySelectorAll('[data-eq=\"preset\"][aria-pressed=\"true\"]').length === 1);
go('musik');
await tunggu();
oke('EQ tersimpan dipulihkan saat layar Musik dibuka lagi', E.ambilEq().gain.every(v => v === 0));

/* ── 10. ekualiser lanjutan: preamp, Q, reset pita, preset sendiri, grafik ── */
const ubah = (sel, nilai) => {
  const el = q(sel);
  el.value = nilai;
  el.dispatchEvent(new w.Event('input', { bubbles: true }));
};
go('musik-eq');
await tunggu();
oke('grafik respons tampil dengan kurva', !!q('[data-eq-kurva]') && q('[data-eq-kurva]').getAttribute('d').startsWith('M'));
ubah('[data-eq="preamp"]', '-4');
await tunggu();
oke('preamp -4 dB tersimpan dan angkanya ikut', E.ambilEq().preamp === -4 && q('[data-eq="preamp-angka"]').value === '-4');
ubah('[data-eq="q-angka"]', '2.5');
await tunggu();
oke('lebar Q 2.5 tersimpan dan slider ikut', E.ambilEq().q === 2.5 && q('[data-eq="q"]').value === '2.5');
ubah('[data-eq="band"][data-indeks="5"]', '5.37');
await tunggu();
oke('gain nilai bebas 5.37 dB dipertahankan (tidak dibulatkan ke 0.5)', E.ambilEq().gain[5] === 5.37);
ubah('[data-eq="band"][data-indeks="6"]', '-19.25');
await tunggu();
oke('gain -19.25 dB dipertahankan di sisi bawah', E.ambilEq().gain[6] === -19.25);
ubah('[data-eq="band"][data-indeks="0"]', '7');
await tunggu();
q('[data-eq="reset-pita"][data-indeks="5"]').click();
await tunggu();
oke('reset satu pita kembali ke 0 tanpa menyentuh pita lain', E.ambilEq().gain[5] === 0 && E.ambilEq().gain[0] === 7);
q('[data-eq-input="nama-kustom"]').value = '  Malam   santai ';
q('[data-eq="simpan-kustom"]').click();
await tunggu();
oke('preset sendiri tersimpan dengan nama dirapikan', E.ambilEq().kustom.length === 1 && E.ambilEq().kustom[0].nama === 'Malam santai');
oke('preset sendiri tampil di layar', !!q('[data-eq="kustom"][data-indeks="0"]'));
q('[data-eq="preset"][data-nilai="rock"]').click();
await tunggu();
oke('preset Rock menerapkan 10 pita', JSON.stringify(E.ambilEq().gain) === JSON.stringify(L.PRESET_EQ.rock));
q('[data-eq="kustom"][data-indeks="0"]').click();
await tunggu();
oke('preset sendiri bisa diterapkan lagi', JSON.stringify(E.ambilEq().gain) === JSON.stringify(E.ambilEq().kustom[0].gain) && q('[data-eq="kustom"][data-indeks="0"]').getAttribute('aria-pressed') === 'true');
q('[data-eq-input="nama-kustom"]').value = '';
q('[data-eq="simpan-kustom"]').click();
await tunggu();
oke('nama preset kosong ditolak', E.ambilEq().kustom.length === 1);
q('[data-eq="hapus-kustom"][data-indeks="0"]').click();
await tunggu();
oke('hapus preset sendiri', E.ambilEq().kustom.length === 0);
q('[data-eq="reset"]').click();
await tunggu();
oke('reset semua mengembalikan preamp, Q, dan gain', E.ambilEq().preamp === 0 && E.ambilEq().q === 1 && E.ambilEq().gain.every(v => v === 0));

/* ── 11. tombol kembali di layar Musik (bug: selalu ke Catatan) ── */
go('notes');
await tunggu();
go('musik');
await tunggu();
q('#back').click();
await tunggu();
oke('kembali dari Musik ke layar sebelumnya (Catatan)', R.cur === 'notes');
go('musik');
await tunggu();
q('[data-mus="pengaturan"]').click();
await tunggu();
oke('Pengaturan Musik dibuka dari Musik', R.cur === 'musik-set');
q('#back').click();
await tunggu();
oke('kembali dari Pengaturan Musik ke Musik (bukan Catatan)', R.cur === 'musik');
q('[data-mus="daftar"]').click();
await tunggu();
oke('Daftar Putar dibuka dari Musik', R.cur === 'musik-daftar');
q('#back').click();
await tunggu();
oke('kembali dari Daftar Putar ke Musik', R.cur === 'musik');
q('[data-mus="eq"]').click();
await tunggu();
oke('tombol EQ di Musik membuka menu Efek & Visual', R.cur === 'musik-efek' && document.getElementById('title').textContent === 'Efek & Visual');
oke('menu Efek: Ekualiser aktif, Visualizer belum tersedia', !!q('[data-efek="eq"]') && q('[data-efek="visual"]')?.disabled === true);
q('[data-efek="eq"]').click();
await tunggu();
oke('Ekualiser dibuka dari menu Efek', R.cur === 'musik-eq');
q('#back').click();
await tunggu();
oke('kembali dari Ekualiser ke menu Efek', R.cur === 'musik-efek');
q('#back').click();
await tunggu();
oke('kembali dari Efek ke Musik', R.cur === 'musik');
q('#back').click();
await tunggu();
oke('kembali dari Musik ke layar sebelumnya (Catatan)', R.cur === 'notes');
go('home');
await tunggu();
go('musik');
await tunggu();
q('[data-mus="eq"]').click();
await tunggu();
q('#back').click();
await tunggu();
q('#back').click();
await tunggu();
oke('dari Beranda: Musik → Ekualiser → Musik → Beranda', R.cur === 'home');
go('musik');
await tunggu();
q('[data-mus="daftar"]').click();
await tunggu();
q('[data-dl-input="baru"]').value = 'Uji balik';
q('[data-dl="buat"]').click();
await tunggu();
go('musik');
await tunggu();
q('[data-mus="daftar"]').click();
await tunggu();
oke('tombol Daftar Putar di bar selalu membuka daftar semua', !q('[data-dl-input="nama"]') && !!q('[data-dl="buka"]'));

/* ── 9. ekspor lagu (tahap 3) ── */
const laguEkspor = await S.tambahLagu(berkas, { nama: 'Lagu Ekspor', durasi: 90 });
S.tandaiTerakhir(laguEkspor.id);
go('musik', { segar: true });
await tunggu();
oke('tombol Ekspor ada di bar Musik', !!q('[data-mus=\"ekspor\"]'));
q('[data-mus=\"ekspor\"]').click();
await tunggu();
oke('Ekspor Lagu dibuka dari Musik', R.cur === 'musik-ekspor' && !!q('.mus-set'));
oke('layar ekspor menampilkan lagu terakhir', (q('.mus-set')?.textContent || '').includes(S.laguById(M.keadaan().id ?? S.terakhirId())?.nama ?? '#'));
oke('format awal WAV dipilih', q('[data-mus-eks=\"format\"][data-nilai=\"wav\"]')?.getAttribute('aria-pressed') === 'true');
oke('bitrate MP3 tidak tampil saat WAV', !q('[data-mus-eks=\"kbps\"]'));
oke('kedua saklar efek aktif awal', ['tempo', 'eq'].every(k => q(`[data-mus-eks=\"${k}\"]`)?.getAttribute('aria-checked') === 'true'));
oke('tombol Ekspor aktif', q('[data-mus-eks=\"mulai\"]') && !q('[data-mus-eks=\"mulai\"]').disabled);
let unduhan = 0;
const klikAsli = w.HTMLElement.prototype.click;
w.HTMLElement.prototype.click = function () { if (this.hasAttribute('download')) unduhan++; return klikAsli.call(this); };
q('[data-mus-eks=\"format\"][data-nilai=\"mp3\"]').click();
await tunggu();
oke('pilih MP3 menampilkan tiga bitrate', document.querySelectorAll('[data-mus-eks=\"kbps\"]').length === 3);
oke('bitrate awal 192 kbps', q('[data-mus-eks=\"kbps\"][data-nilai=\"192\"]')?.getAttribute('aria-pressed') === 'true');
q('[data-mus-eks=\"kbps\"][data-nilai=\"320\"]').click();
await tunggu();
oke('pilih 320 kbps', q('[data-mus-eks=\"kbps\"][data-nilai=\"320\"]')?.getAttribute('aria-pressed') === 'true');
q('[data-mus-eks=\"eq\"]').click();
await tunggu();
oke('saklar ekualiser bisa dimatikan', q('[data-mus-eks=\"eq\"]')?.getAttribute('aria-checked') === 'false');
q('[data-mus-eks=\"mulai\"]').click();
await tunggu(300);
oke('tanpa Web Audio: ekspor gagal dengan pesan, bukan macet', !!q('[role=\"alert\"]') && R.cur === 'musik-ekspor');
q('#back').click();
await tunggu();
oke('kembali dari Ekspor ke Musik', R.cur === 'musik');
w.HTMLElement.prototype.click = klikAsli;
oke('kontrol ekspor tidak memicu unduhan (tidak bentrok dengan ekspor Catatan)', unduhan === 0, `unduhan: ${unduhan}`);

/* ── 10. mode pemutaran, antrean, sleep timer, crossfade ── */
const SET = await import(`${AKAR}/docs/musik/set.js?v=${V}`);
const T = await import(`${AKAR}/docs/musik/tidur.js?v=${V}`);
SET.ubahSet({ acak: 'mati', ulang: 'urut' });
go('musik', { segar: true });
await tunggu();
const labelAcak = () => q('[data-mus="acak"]')?.getAttribute('aria-label');
const labelUlang = () => q('[data-mus="ulang"]')?.getAttribute('aria-label');
const lencanaAntre = () => q('[data-mus="ulang"] b')?.textContent ?? '';
oke('tombol acak awal: Shuffle: mati', labelAcak() === 'Shuffle: mati');
oke('tombol ulang awal: Play in order', labelUlang() === 'Play in order' && lencanaAntre() === '');
const jejakAcak = [];
for (let i = 0; i < 6; i++) { q('[data-mus="acak"]').click(); await tunggu(20); jejakAcak.push(labelAcak()); }
oke('acak berganti sesuai siklus lalu kembali ke mati',
  JSON.stringify(jejakAcak) === JSON.stringify(['Shuffle', 'Random play', 'Randomized playlist', 'Smart shuffle', 'Shuffle repeat', 'Shuffle: mati']),
  JSON.stringify(jejakAcak));
const jejakUlang = [];
for (let i = 0; i < 4; i++) { q('[data-mus="ulang"]').click(); await tunggu(20); jejakUlang.push(labelUlang()); }
oke('ulang berganti: Repeat one, Repeat all, Queue, Play in order',
  JSON.stringify(jejakUlang) === JSON.stringify(['Repeat one', 'Repeat all', 'Queue', 'Play in order']),
  JSON.stringify(jejakUlang));
q('[data-mus="ulang"]').click(); await tunggu(20);
q('[data-mus="ulang"]').click(); await tunggu(20);
q('[data-mus="ulang"]').click(); await tunggu(20);
const idPertama = S.daftarLagu()[0]?.id;
oke('tombol Antre ada untuk setiap lagu', !!idPertama && !!q(`[data-mus="antre"][data-id="${idPertama}"]`));
q(`[data-mus="antre"][data-id="${idPertama}"]`).click(); await tunggu();
oke('Antre menandai lagu (aria-pressed)', q(`[data-mus="antre"][data-id="${idPertama}"]`)?.getAttribute('aria-pressed') === 'true');
oke('antrean masuk ke lencana Queue (1)', labelUlang() === 'Queue' && lencanaAntre() === '1', labelUlang() + ' ' + lencanaAntre());
q(`[data-mus="antre"][data-id="${idPertama}"]`).click(); await tunggu();
oke('Antre kedua kali mengeluarkan lagu', q(`[data-mus="antre"][data-id="${idPertama}"]`)?.getAttribute('aria-pressed') === 'false' && lencanaAntre() === '');
SET.ubahSet({ ulang: 'urut' });

/* Pengaturan Musik: sleep timer dan crossfade */
go('musik-set', { segar: true });
await tunggu();
oke('Pengaturan: bagian sleep timer ada', !!q('[data-set="tidur-mulai"]'));
oke('Pengaturan: saklar crossfade ada', !!q('[data-set="cf-aktif"]'));
q('[data-set="tidur-mode"][data-nilai="lagu"]').click(); await tunggu();
oke('mode sleep "setelah lagu ini" tersimpan', SET.ambilSet().tidurMode === 'lagu');
oke('mode lagu: tidak ada pilihan menit', !q('[data-set="tidur-menit"]'));
q('[data-set="tidur-mode"][data-nilai="waktu"]').click(); await tunggu();
q('[data-set="tidur-menit"][data-nilai="15"]').click(); await tunggu();
oke('preset 15 menit tersimpan', SET.ambilSet().tidurMenit === 15);
const kustom = q('[data-set-input="tidur-menit"]');
kustom.value = '45'; kustom.dispatchEvent(new w.Event('change', { bubbles: true })); await tunggu();
oke('menit kustom 45 tersimpan', SET.ambilSet().tidurMenit === 45);
q('[data-set="tidur-mulai"]').click(); await tunggu();
oke('timer waktu aktif setelah Mulai', T.tidurInfo().aktif && T.tidurInfo().mode === 'waktu');
oke('status menampilkan jam berhenti', (q('[data-set-status="tidur"]')?.textContent || '').includes('pukul'));
oke('tombol Batalkan timer muncul', !!q('[data-set="tidur-batal"]'));
q('[data-set="tidur-batal"]').click(); await tunggu();
oke('Batalkan mematikan timer', !T.tidurInfo().aktif && !!q('[data-set="tidur-mulai"]'));

q('[data-set="cf-aktif"]').click(); await tunggu();
oke('crossfade bisa dinyalakan', SET.ambilSet().crossfade.aktif === true);
const geser = q('[data-set-input="cf-detik"]');
geser.value = '6'; geser.dispatchEvent(new w.Event('change', { bubbles: true })); await tunggu();
oke('durasi crossfade 6 detik tersimpan', SET.ambilSet().crossfade.detik === 6);
q('[data-set="cf-aktif"]').click(); await tunggu();
oke('crossfade bisa dimatikan', SET.ambilSet().crossfade.aktif === false);

/* Logika sleep timer (tanpa audio) */
T.mulaiTidur({ mode: 'daftar', panjang: 2 });
oke('daftar: lagu pertama selesai tidak menghentikan', T.tidurSelesaiLagu() === false && T.tidurInfo().hitung === 1);
oke('daftar: transisi dilarang saat lagu terakhir berikut', T.tidurMengizinkanTransisi() === false);
oke('daftar: lagu kedua selesai menghentikan', T.tidurSelesaiLagu() === true && !T.tidurInfo().aktif);
T.mulaiTidur({ mode: 'lagu' });
oke('lagu ini: transisi dilarang', T.tidurMengizinkanTransisi() === false);
oke('lagu ini: selesai menghentikan', T.tidurSelesaiLagu() === true && !T.tidurInfo().aktif);
oke('daftar kosong tidak bisa dimulai', T.mulaiTidur({ mode: 'daftar', panjang: 0 }) === false && !T.tidurInfo().aktif);
T.batalTidur();
SET.ubahSet({ tidurMode: 'waktu', tidurMenit: 30, crossfade: { aktif: false, detik: 3 } });
go('musik', { segar: true });
await tunggu();

console.log(`\nmusik-layar: ${total - gagal}/${total} lulus`);
if (gagal) process.exit(1);
