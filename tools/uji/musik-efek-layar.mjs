/* Smoke jsdom untuk layar Effect (Efek & Visual > Effect):
   - tujuh efek dalam satu kategori, saklar on/off, dan tombol panah;
   - banyak efek bisa aktif bersamaan; panel pengaturan terbuka di bawah baris;
   - slider dan pilihan ruangan menyimpan nilai.
   Suara efek sungguhan tidak bisa diuji di jsdom; itu diverifikasi di perangkat.
   Jalankan: node tools/uji/musik-efek-layar.mjs */
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

const E = await import(`${AKAR}/docs/musik/efek.js?v=${V}`);

await tunggu(120);
go('musik-effect');
await tunggu();
const baris = () => [...document.querySelectorAll('.mus-fx')];
const barisDi = id => document.querySelector(`.mus-fx [data-fx="aktif"][data-id="${id}"]`)?.closest('.mus-fx');

oke('layar Effect: judul dan 7 efek dalam satu kategori', R.cur === 'musik-effect' && baris().length === 7
  && document.querySelectorAll('.mus-fx-kategori .mus-pg-judul').length === 1);
oke('setiap efek punya saklar on/off dan tombol panah', document.querySelectorAll('[data-fx="aktif"]').length === 7
  && document.querySelectorAll('[data-fx="buka"]').length === 7);
oke('awal: semua efek mati dan panel tertutup', baris().every(b => b.classList.contains('mati')) && !document.querySelector('.mus-fx-panel'));

document.querySelector('[data-fx="aktif"][data-id="reverb"]').click();
await tunggu();
oke('saklar Reverb menyala dan tersimpan', E.ambilEfek().reverb.aktif === true
  && JSON.parse(localStorage.getItem('hara.v2.musik.efek')).reverb.aktif === true);
oke('boleh banyak aktif: Echo ikut menyala tanpa mematikan Reverb', (document.querySelector('[data-fx="aktif"][data-id="echo"]').click(), true)
  && await tunggu().then(() => E.ambilEfek().reverb.aktif && E.ambilEfek().echo.aktif));
oke('ringkasan menghitung efek aktif', document.querySelector('.mus-pg-sub')?.textContent.includes('2'));

document.querySelector('[data-fx="buka"][data-id="echo"]').click();
await tunggu();
const panelEcho = barisDi('echo')?.querySelector('.mus-fx-panel');
oke('panah membuka panel pengaturan di bawah baris Echo', !!panelEcho && barisDi('echo').classList.contains('buka'));
oke('panel Echo: dasar (Volume, Jeda, Umpan) dan lanjutan', !!panelEcho
  && ['Volume echo', 'Jeda', 'Umpan balik'].every(t => panelEcho.textContent.includes(t))
  && panelEcho.querySelector('.mus-fx-sub-judul')?.textContent.toLowerCase().includes('lanjutan'));
oke('nilai awal Echo tampil: jeda 350 ms', panelEcho.querySelector('[data-fx-out="echo.jeda"]').textContent === '350 ms');

const slider = panelEcho.querySelector('[data-fx-input="jeda"]');
slider.value = '500';
slider.dispatchEvent(new window.Event('input', { bubbles: true }));
await tunggu(20);
oke('geser slider memperbarui teks dan menyimpan nilai', panelEcho.querySelector('[data-fx-out="echo.jeda"]').textContent === '500 ms'
  && E.ambilEfek().echo.p.jeda === 500);

document.querySelector('[data-fx="buka"][data-id="konvolusi"]').click();
await tunggu();
const pil = document.querySelector('[data-fx-pilih="ruang"][data-nilai="gua"]');
oke('Convolution menampilkan pilihan ruangan bawaan', !!pil && pil.textContent === 'Gua');
pil.click();
await tunggu();
oke('memilih ruangan Gua tersimpan', E.ambilEfek().konvolusi.p.ruang === 'gua');

document.querySelector('[data-fx="buka"][data-id="echo"]').click();
await tunggu();
oke('menutup panel: tidak ada panel terbuka untuk Echo', !barisDi('echo').querySelector('.mus-fx-panel'));

console.log(gagal ? `\n${gagal} GAGAL dari ${total}` : `\nmusik-efek-layar: ${total}/${total} lulus`);
process.exit(gagal ? 1 : 0);
