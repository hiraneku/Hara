/* Uji integrasi model untuk pustaka audio Android MediaStore.
   Memastikan hasil pindai masuk/keluar tanpa menghapus lagu impor dan
   pengaturan track tetap stabil setelah pemindaian ulang.
   Jalankan: node tools/uji/musik-perangkat.mjs */
import { indexedDB as fakeIDB } from 'fake-indexeddb';

const mem = new Map();
globalThis.localStorage = {
  getItem: k => mem.has(k) ? mem.get(k) : null,
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: k => mem.delete(k),
};
globalThis.self = globalThis;
globalThis.indexedDB = fakeIDB;
globalThis.window = { Capacitor: { getPlatform: () => 'web' } };

const S = await import('../../docs/musik/simpan.js?v=20261101110000');
let gagal = 0;
const cek = (nama, ok, detail = '') => {
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${nama}${detail ? ` — ${detail}` : ''}`);
  if (!ok) gagal++;
};

const songs = [
  { id: 'audio:3', uri: 'content://media/external/audio/media/3', title: 'Lagu A', displayName: 'a.mp3', artist: 'Artis', album: 'Album', duration: 210000, size: 5000, mimeType: 'audio/mpeg', dateAdded: 1760000000, location: 'Music/' },
  { id: 'audio:9', uri: 'content://media/external/audio/media/9', title: '', displayName: 'rekaman.wav', duration: 4000, size: 900, mimeType: 'audio/wav', dateAdded: 1760000100, location: 'Recordings/' },
  { id: 'video:14', uri: 'content://media/external/video/media/14', title: 'Audio WebM', displayName: 'suara.webm', duration: 55000, size: 2000, mimeType: 'video/webm', dateAdded: 1760000200, location: 'Music/' },
];

const n = S.sinkronkanLaguPerangkat(songs);
const all1 = S.daftarLagu();
cek('semua hasil MediaStore masuk ke pustaka', n === 3 && all1.length === 3, `${n} lagu`);
cek('tidak menyaring lagu berdasarkan flag IS_MUSIC', all1.length === songs.length);
cek('judul kosong memakai nama berkas', S.laguById('android-audio:audio:9')?.nama === 'rekaman.wav');
cek('durasi milidetik diubah ke detik', S.laguById('android-audio:audio:3')?.durasi === 210);
cek('URI content:// dipertahankan untuk pemutaran langsung', S.laguById('android-audio:audio:3')?.uri === songs[0].uri);
cek('lokasi folder tampil sebagai metadata', S.laguById('android-audio:audio:3')?.lokasi === 'Music/');
cek('audio WebM dari koleksi video ikut tersinkron', S.laguById('android-audio:video:14')?.tipe === 'video/webm');

S.simpanAtur('android-audio:audio:3', { tempo: 1.1, pitch: 2, loop: { a: 2, b: 8, aktif: true }, posisi: 5 });
S.sinkronkanLaguPerangkat([{ ...songs[0], title: 'Lagu A (metadata terbaru)' }]);
cek('pengaturan track bertahan setelah scan ulang', S.aturLagu('android-audio:audio:3').tempo === 1.1);
cek('lagu yang sudah hilang dari MediaStore dikeluarkan', !S.laguById('android-audio:audio:9'));
S.sinkronkanLaguPerangkat([]);
cek('scan kosong benar-benar mengosongkan daftar perangkat', !S.daftarLagu().some(x => x.sumber === 'perangkat'));

console.log(gagal ? `\n${gagal} GAGAL` : '\nSemua uji musik-perangkat LOLOS');
process.exit(gagal ? 1 : 0);
