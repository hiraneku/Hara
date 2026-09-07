/* Pengaturan bar: kontrol mana yang ditampilkan, dan umpan balik getar.

   Disimpan terpisah dari catatan supaya menghapus semua catatan tidak
   ikut menghapus preferensi tampilan. */

const KEY = 'hara.bar.v1';

/* Kontrol yang boleh disembunyikan. `undo`/`redo` sengaja tidak
   dimasukkan — tanpa keduanya, kesalahan ketik jadi tak bisa dibatalkan. */
export const BISA_SEMBUNYI = [
  { m: 'slash',  nama: 'Sisipkan blok (/)' },
  { m: 'b',      nama: 'Tebal' },
  { m: 'i',      nama: 'Miring' },
  { m: 'link',   nama: 'Tautan web' },
  { g: 'gaya',   nama: 'Gaya paragraf' },
  { g: 'huruf',  nama: 'Jenis huruf' },
  { g: 'warna',  nama: 'Warna teks' },
  { g: 'tandai', nama: 'Penandaan' },
  { g: 'daftar', nama: 'Daftar' },
  { g: 'sisip',  nama: 'Sisipkan' },
  { g: 'susun',  nama: 'Atur letak' },
];

const BAWAAN = { sembunyi: [], getar: true };

export const prefs = { ...BAWAAN };

export function muatPrefs() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (Array.isArray(d.sembunyi)) prefs.sembunyi = d.sembunyi;
    if (typeof d.getar === 'boolean') prefs.getar = d.getar;
  } catch (e) { /* biarkan bawaan */ }
}

export function simpanPrefs() {
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) {}
}

export const tersembunyi = kunci => prefs.sembunyi.includes(kunci);

export function toggleTampil(kunci) {
  const i = prefs.sembunyi.indexOf(kunci);
  if (i > -1) prefs.sembunyi.splice(i, 1);
  else prefs.sembunyi.push(kunci);
  simpanPrefs();
}

export function setGetar(on) {
  prefs.getar = !!on;
  simpanPrefs();
}

/* Getar singkat saat menekan tombol — hanya di perangkat yang mendukung. */
export function getar(ms = 8) {
  if (!prefs.getar) return;
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {}
}

muatPrefs();
