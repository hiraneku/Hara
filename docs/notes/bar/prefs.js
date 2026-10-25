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

/* A9: alat yang disematkan ke awal bar. Urutan array = urutan tampil.
   Dibatasi supaya bar tetap ringkas. */
export const MAKS_SEMATAN = 6;
const KUNCI_BISA_SEMAT = new Set(BISA_SEMBUNYI.map(x => x.g || x.m));

const BAWAAN = { sembunyi: [], sematan: [], getar: true };

export const prefs = { ...BAWAAN, sembunyi: [], sematan: [] };

/* Buang kunci tak dikenal dan duplikat; batasi jumlahnya. */
function bersihSematan(arr) {
  const hasil = [];
  for (const k of arr) {
    if (typeof k === 'string' && KUNCI_BISA_SEMAT.has(k) && !hasil.includes(k)) hasil.push(k);
  }
  return hasil.slice(0, MAKS_SEMATAN);
}

export function muatPrefs() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (Array.isArray(d.sembunyi)) prefs.sembunyi = d.sembunyi;
    if (Array.isArray(d.sematan)) prefs.sematan = bersihSematan(d.sematan);
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

export const tersemat = kunci => prefs.sematan.includes(kunci);

/* Balik status sematan. Hasil: 'sematkan' | 'lepas' | 'penuh' | 'tidak-dikenal'. */
export function toggleSematan(kunci) {
  if (!KUNCI_BISA_SEMAT.has(kunci)) return 'tidak-dikenal';
  const i = prefs.sematan.indexOf(kunci);
  if (i > -1) { prefs.sematan.splice(i, 1); simpanPrefs(); return 'lepas'; }
  if (prefs.sematan.length >= MAKS_SEMATAN) return 'penuh';
  prefs.sematan.push(kunci);
  simpanPrefs();
  return 'sematkan';
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
