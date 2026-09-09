/* Bahasa antarmuka (fitur bahasa, Pengaturan).

   Prinsip:
   - Kunci terjemahan = TEKS INDONESIA aslinya. Mode Indonesia cukup
     mengembalikan kunci — paritas dengan teks lama dijamin otomatis;
     mode Inggris mencari padanannya di kamus (core/bahasa-en.js).
   - t('…') dipakai untuk teks antarmuka. Teks DATA (isi catatan, judul,
     tag, properti, frontmatter ekspor/impor Markdown) TIDAK pernah
     diterjemahkan — bahasa hanya mengubah kerangka aplikasi.
   - Teks berparameter memakai {n}/{q}: t('{n} catatan tersimpan.', {n})
     (mode Indonesia sama persis; Inggris bisa membedakan jamak).
   - Pilihan tersimpan di localStorage, berlaku seketika tanpa muat
     ulang. Statis index.html memakai atribut data-i18n + terjemahStatis.
   - Modul ini TIDAK mengimpor apa pun — aman dipakai modul inti mana
     pun tanpa risiko lingkaran impor. */

import { EN } from './bahasa-en.js?v=20260909054938';

const KUNCI = 'hara.v1.bahasa';     /* 'id' | 'en' — bawaan 'id' */
const SIMPAN = 'id';

export function bahasaSekarang() {
  try {
    const v = localStorage.getItem(KUNCI);
    return v === 'en' ? 'en' : 'id';
  } catch (e) { /* privat */ }
  return SIMPAN;
}

export function setBahasa(b) {
  if (b !== 'id' && b !== 'en') return;
  try {
    if (b === SIMPAN) localStorage.removeItem(KUNCI);
    else localStorage.setItem(KUNCI, b);
  } catch (e) { /* privat */ }
  const l = document.documentElement;
  if (l) l.lang = b === 'en' ? 'en' : 'id';
}

export const isInggris = () => bahasaSekarang() === 'en';

/* Ganti {x} dengan nilai parameternya. */
function ganti(v, p) {
  if (!p) return v;
  let s = String(v);
  for (const k of Object.keys(p)) s = s.split('{' + k + '}').join(p[k]);
  return s;
}

/* Pilih bentuk jamak: entri { one, other } atau string biasa. */
function bentuk(v, p) {
  if (v && typeof v === 'object') {
    const n = p && p.n;
    return (n === 1 ? v.one : v.other) || v.other || '';
  }
  return v;
}

/* Teks antarmuka bahasa aktif. */
export function t(kunci, p) {
  const v = isInggris() && EN[kunci] !== undefined
    ? bentuk(EN[kunci], p)
    : kunci;
  return ganti(v, p);
}

/* Nama hari/bulan mengikuti bahasa aktif (untuk tanggal antarmuka). */
export const NAMA_HARI = () => isInggris()
  ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  : ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const NAMA_BULAN = () => isInggris()
  ? ['January', 'February', 'March', 'April', 'May', 'June', 'July',
     'August', 'September', 'October', 'November', 'December']
  : ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli',
     'Agustus', 'September', 'Oktober', 'November', 'Desember'];

/* Terjemahkan teks statis index.html ([data-i18n] / [data-i18n-tip] /
   [data-i18n-ph] / [data-i18n-ar]). Dipanggil saat aplikasi dimuat dan
   setiap kali bahasa diganti. */
export function terjemahStatis(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  root.querySelectorAll('[data-i18n-tip]').forEach(el => {
    el.setAttribute('title', t(el.getAttribute('data-i18n-tip')));
  });
  root.querySelectorAll('[data-i18n-ph]').forEach(el => {
    el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph')));
  });
  root.querySelectorAll('[data-i18n-ar]').forEach(el => {
    el.setAttribute('aria-label', t(el.getAttribute('data-i18n-ar')));
  });
}
