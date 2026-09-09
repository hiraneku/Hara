/* Tema terang/gelap.
   - Tanpa pilihan tersimpan: mengikuti sistem (prefers-color-scheme).
   - Setelah pengguna mengganti lewat tombol, pilihan disimpan dan
     mengikuti sistem dimatikan sampai ia menghapus pilihannya. */

import { t as tr } from './i18n.js?v=20260909070912';

const KEY = 'hara.tema.v1';
const KEY_AK = 'hara.ak.v1';

/* Pilihan warna aksen (data-ak di <html>). CSS paletnya ada di
   notes.css — di sini hanya daftar untuk antarmuka Pengaturan. */
export const AK = [
  { k: null, nama: 'Hijau (bawaan)', w: '#3F6F5B' },
  { k: 'biru', nama: 'Biru', w: '#2F6E8F' },
  { k: 'ungu', nama: 'Ungu', w: '#6B5B9E' },
  { k: 'bata', nama: 'Merah bata', w: '#A34B3A' },
  { k: 'emas', nama: 'Emas', w: '#8A6A2B' },
];

export function akSekarang() {
  try {
    const v = localStorage.getItem(KEY_AK);
    return typeof v === 'string' && v ? v : null;
  } catch (e) {
    return null;
  }
}

export function setAk(k) {
  try {
    if (k) localStorage.setItem(KEY_AK, k);
    else localStorage.removeItem(KEY_AK);
  } catch (e) { /* privat */ }
  terapkan();
}

export function modeTersimpan() {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'dark' || v === 'light' ? v : null;
  } catch (e) {
    return null;
  }
}

function sistemGelap() {
  try {
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  } catch (e) {
    return false;
  }
}

export const modeSekarang = () => modeTersimpan() || (sistemGelap() ? 'dark' : 'light');

/* Label untuk halaman Pengaturan (bahasa antarmuka aktif). */
export const labelMode = () => {
  const s = modeTersimpan();
  return s ? (s === 'dark' ? tr('Gelap') : tr('Terang')) : tr('Mengikuti sistem');
};

/* Terapkan tema ke dokumen + sesuaikan ikon di header. */
export function terapkan() {
  const m = modeSekarang();
  const a = akSekarang();
  const el = document.documentElement;
  el.setAttribute('data-theme', m);
  if (a) el.setAttribute('data-ak', a);
  else el.removeAttribute('data-ak');
  const use = document.querySelector('#theme use');
  if (use) use.setAttribute('href', m === 'dark' ? '#i-sun' : '#i-moon');
}

/* Ganti terang <-> gelap lalu simpan pilihan. */
export function toggle() {
  const m = modeSekarang() === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem(KEY, m); } catch (e) {}
  terapkan();
  return m;
}
