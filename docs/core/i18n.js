/* Bahasa antarmuka (fitur bahasa, Pengaturan).

   Prinsip:
   - Kunci terjemahan = TEKS INDONESIA aslinya. Mode Indonesia cukup
     mengembalikan kunci — paritas dengan teks lama dijamin otomatis;
     mode Inggris & Jepang mencari padanannya di kamus
     (core/bahasa-en.js, core/bahasa-ja.js).
   - t('…') dipakai untuk teks antarmuka. Teks DATA (isi catatan, judul,
     tag, properti, frontmatter ekspor/impor Markdown) TIDAK pernah
     diterjemahkan — bahasa hanya mengubah kerangka aplikasi.
   - Teks berparameter memakai {n}/{q}: t('{n} catatan tersimpan.', {n})
     (mode Indonesia sama persis; Inggris bisa membedakan jamak).
   - Pilihan tersimpan di localStorage, berlaku seketika tanpa muat
     ulang. Statis index.html memakai atribut data-i18n + terjemahStatis.
   - Modul ini TIDAK mengimpor modul inti lain — aman dipakai modul
     mana pun tanpa risiko lingkaran impor. */

import { EN } from './bahasa-en.js?v=20260909102312';
import { JA } from './bahasa-ja.js?v=20260909102312';

const KUNCI = 'hara.v1.bahasa';     /* 'id' | 'en' | 'ja' — bawaan 'id' */
const KODE = ['id', 'en', 'ja'];
const KAMUS = { en: EN, ja: JA };

/* Daftar bahasa untuk dropdown Pengaturan — nama memakai bahasa itu
   sendiri (endonim), tidak diterjemahkan. */
export const DAFTAR_BAHASA = [
  { kode: 'id', nama: 'Indonesia' },
  { kode: 'en', nama: 'English' },
  { kode: 'ja', nama: '日本語' },
];

export function bahasaSekarang() {
  try {
    const v = localStorage.getItem(KUNCI);
    return KODE.includes(v) ? v : 'id';
  } catch (e) { /* privat */ }
  return 'id';
}

export function setBahasa(b) {
  if (!KODE.includes(b)) return;
  try {
    if (b === 'id') localStorage.removeItem(KUNCI);
    else localStorage.setItem(KUNCI, b);
  } catch (e) { /* privat */ }
  const l = document.documentElement;
  if (l) l.lang = b;
}

export const isInggris = () => bahasaSekarang() === 'en';

/* Lokale Intl untuk bahasa aktif — dipakai toLocaleString /
   toLocaleDateString (angka, tanggal panjang, dsb.). */
export const LOKALE = () =>
  ({ id: 'id-ID', en: 'en-US', ja: 'ja-JP' })[bahasaSekarang()];

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
  const b = bahasaSekarang();
  const kamus = b !== 'id' ? KAMUS[b] : null;
  const v = kamus && kamus[kunci] !== undefined
    ? bentuk(kamus[kunci], p)
    : kunci;
  return ganti(v, p);
}

/* Nama hari/bulan mengikuti bahasa aktif (untuk tanggal antarmuka). */
const HARI = {
  id: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  ja: ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'],
};
const BULAN = {
  id: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli',
    'Agustus', 'September', 'Oktober', 'November', 'Desember'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'],
  ja: ['1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'],
};
export const NAMA_HARI = () => HARI[bahasaSekarang()];
export const NAMA_BULAN = () => BULAN[bahasaSekarang()];

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
