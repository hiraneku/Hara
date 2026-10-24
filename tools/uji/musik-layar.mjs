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

/* ── 7. pengaturan Musik ── */
oke('nada: langkah 0.01 pada slider dan kotak angka', q('[data-mus-range=\"pitch\"]')?.step === '0.01' && q('[data-mus-num=\"pitch\"]')?.step === '0.01');
oke('sampul besar disiapkan di pemutar', !!q('.mus-sampul-besar[data-sampul-id]'));
q('[data-mus=\"pengaturan\"]').click();
await tunggu();
oke('tombol pengaturan membuka Pengaturan Musik', R.cur === 'musik-set' && q('.mus-set-h')?.textContent === 'Pengaturan Musik');
oke('pengaturan memuat empat bagian', document.querySelectorAll('.mus-set-kartu').length === 4);
oke('navigasi bawah tetap disembunyikan di pengaturan', q('#bnav').classList.contains('hide'));
q('[data-set=\"gayaSeek\"][data-nilai=\"gelombang\"]').click();
await tunggu();
oke('gaya seek bar tersimpan (gelombang)', (await import(`${AKAR}/docs/musik/set.js?v=${V}`)).ambilSet().gayaSeek === 'gelombang');
q('[data-set=\"setelahSelesai\"][data-nilai=\"ulangi\"]').click();
await tunggu();
oke('pilihan setelah selesai tersimpan (ulangi)', (await import(`${AKAR}/docs/musik/set.js?v=${V}`)).ambilSet().setelahSelesai === 'ulangi');
oke('pengaturan tetap di layar Pengaturan setelah diubah', R.cur === 'musik-set');
go('musik');
await tunggu();
oke('seek bar mengikuti gaya gelombang', !!q('[data-mus-gel] canvas'));

console.log(`\nmusik-layar: ${total - gagal}/${total} lulus`);
if (gagal) process.exit(1);
