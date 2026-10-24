/* Smoke jsdom untuk layar Musik (tahap 1):
   - navigasi: layar 'musik' tanpa navigasi bawah, dengan tombol kembali;
   - keadaan kosong, lalu lagu tersimpan tampil di pustaka dan pemutar;
   - pengaturan per lagu (tempo, nada) dipulihkan saat dibuka;
   - kartu beranda menampilkan lagu terakhir & tombol membuka layar;
   - hapus dua-ketuk;
   - kontrol gagal dengan rapi tanpa Web Audio (jsdom tidak punya AudioContext).
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
oke('pengaturan kosong: tanpa bagian', document.querySelectorAll('.mus-set-kartu').length === 0);
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
oke('lima pita dengan slider dan kotak angka', document.querySelectorAll('[data-eq=\"band\"]').length === 5 && document.querySelectorAll('[data-eq=\"angka\"]').length === 5);
oke('saklar aktif tampil dan menyala', q('[data-eq=\"aktif\"]')?.getAttribute('aria-checked') === 'true');
const geser0 = q('[data-eq=\"band\"][data-indeks=\"0\"]');
geser0.value = '7';
geser0.dispatchEvent(new w.Event('input', { bubbles: true }));
await tunggu();
oke('geser pita 1 ke +7 tersimpan', E.ambilEq().gain[0] === 7);
oke('kotak angka ikut berubah', q('[data-eq=\"angka\"][data-indeks=\"0\"]').value === '7');
const angka2 = q('[data-eq=\"angka\"][data-indeks=\"2\"]');
angka2.value = '99';
angka2.dispatchEvent(new w.Event('input', { bubbles: true }));
await tunggu();
oke('angka di luar rentang dijepit ke +12', E.ambilEq().gain[2] === 12);
oke('gain tersimpan ke localStorage', JSON.parse(localStorage.getItem('hara.v1.musik.eq')).gain[2] === 12);
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
oke('reset mengembalikan datar dan aktif', JSON.stringify(E.ambilEq().gain) === '[0,0,0,0,0]' && E.ambilEq().aktif === true);
oke('setelah reset, preset Datar yang ditandai', q('[data-eq=\"preset\"][data-nilai=\"datar\"]')?.getAttribute('aria-pressed') === 'true' && document.querySelectorAll('[data-eq=\"preset\"][aria-pressed=\"true\"]').length === 1);
go('musik');
await tunggu();
oke('EQ tersimpan dipulihkan saat layar Musik dibuka lagi', E.ambilEq().gain.every(v => v === 0));

console.log(`\nmusik-layar: ${total - gagal}/${total} lulus`);
if (gagal) process.exit(1);
