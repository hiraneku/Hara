/* Uji UI untuk pemindaian otomatis MediaStore saat layar Musik dibuka.
   Plugin Android dibuat stub; akses ContentResolver/audio nyata tetap perlu diuji di APK.
   Jalankan: node tools/uji/musik-pindai-otomatis.mjs */
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import { indexedDB as fakeIDB } from 'fake-indexeddb';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const dom = new JSDOM(fs.readFileSync('docs/index.html', 'utf8'), {
  url: 'https://x.test/',
  pretendToBeVisual: true,
});
const { window: w } = dom;
w.indexedDB = fakeIDB;
let mintaIzin = 0;
let jumlahPindai = 0;
let jumlahRegistrasiPlugin = 0;
const songs = [
  { id: '10', uri: 'content://media/external/audio/media/10', title: 'Lagu di Music', displayName: 'lagu.mp3', artist: 'Artis', album: 'Album', duration: 120000, size: 1000, mimeType: 'audio/mpeg', dateAdded: 1760000000, location: 'Music/' },
  { id: '11', uri: 'content://media/external/audio/media/11', title: 'Rekaman lain', displayName: 'rekaman.wav', duration: 5000, size: 500, mimeType: 'audio/wav', dateAdded: 1760000001, location: 'Recordings/' },
];
const audioLibrary = {
  checkAccess: async () => ({ granted: false }),
  requestAccess: async () => { mintaIzin++; return { granted: true }; },
  listAudio: async () => { jumlahPindai++; return { granted: true, songs }; },
};
w.Capacitor = {
  getPlatform: () => 'android',
  Plugins: {},
  registerPlugin: name => {
    if (name !== 'AudioLibrary') throw new Error(`Nama plugin tak dikenal: ${name}`);
    jumlahRegistrasiPlugin++;
    return audioLibrary;
  },
};
for (const k of ['document', 'getSelection', 'HTMLElement', 'Node', 'Range', 'MouseEvent', 'Event', 'InputEvent', 'localStorage', 'Image', 'Blob']) {
  if (w[k] !== undefined) globalThis[k] = w[k];
}
globalThis.window = w;
globalThis.self = w;
globalThis.indexedDB = w.indexedDB;
globalThis.addEventListener = w.addEventListener.bind(w);
Object.defineProperty(globalThis, 'navigator', { value: w.navigator, configurable: true });
w.URL.createObjectURL = () => 'blob:x/1';
w.URL.revokeObjectURL = () => {};
globalThis.URL = w.URL;
w.HTMLCanvasElement.prototype.getContext = () => null;

const version = fs.readFileSync('docs/app.js', 'utf8').match(/\?v=(\d+)/)[1];
await import(`${process.cwd()}/docs/app.js?v=${version}`);
const router = await import(`${process.cwd()}/docs/core/router.js?v=${version}`);
const tunggu = (ms = 160) => new Promise(resolve => setTimeout(resolve, ms));
let gagal = 0;
function cek(label, kondisi) {
  console.log(`${kondisi ? 'OK  ' : 'FAIL'} ${label}`);
  if (!kondisi) gagal++;
}

await tunggu();
router.go('musik');
await tunggu(300);
const judul = [...document.querySelectorAll('.mus-item-judul')].map(e => e.textContent.trim());
cek('plugin native didaftarkan lewat API Capacitor 8', jumlahRegistrasiPlugin === 1);
cek('membuka Musik otomatis meminta izin audio', mintaIzin === 1);
cek('membuka Musik otomatis menjalankan satu pemindaian MediaStore', jumlahPindai === 1);
cek('semua audio yang tersedia muncul tanpa impor manual', judul.includes('Lagu di Music') && judul.includes('Rekaman lain'));
cek('tombol pemindaian ulang diberi label yang benar', [...document.querySelectorAll('[data-mus="impor"]')].some(e => e.getAttribute('aria-label') === 'Pindai ulang penyimpanan' || e.textContent.includes('Pindai ulang')));

document.querySelector('[data-mus="impor"]')?.click();
await tunggu(200);
cek('tombol Pindai ulang memindai kembali pustaka perangkat', jumlahPindai === 2);
cek('pemindaian ulang tidak menggandakan lagu', document.querySelectorAll('.mus-item-judul').length === 2);

console.log(gagal ? `\n${gagal} GAGAL` : '\nSemua uji musik-pindai-otomatis LOLOS');
dom.window.close();
process.exit(gagal ? 1 : 0);
