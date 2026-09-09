/* Helper DOM dipakai semua modul. */
import { t as tr, NAMA_HARI, NAMA_BULAN, isInggris } from './i18n.js?v=20260909054021';

export const $  = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const el = id => document.getElementById(id);

/* Escape teks sebelum masuk ke template HTML. */
export const esc = t => String(t ?? '').replace(/[&<>\"]/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[c]));

/* Waktu terbaca: "baru saja", "5 mnt lalu", ... (bahasa antarmuka) */
export function stamp(ts) {
  if (!ts) return tr('baru saja');
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)    return tr('baru saja');
  if (s < 3600)  return tr('{n} mnt lalu', { n: Math.floor(s / 60) });
  if (s < 86400) return tr('{n} jam lalu', { n: Math.floor(s / 3600) });
  return tr('{n} hari lalu', { n: Math.floor(s / 86400) });
}

/* Tanggal lengkap antarmuka mengikuti bahasa: Indonesia "Rabu, 9
   September", Inggris "Wednesday, September 9". Dipakai sapaan Beranda
   — tanpa tahun, sesuai arah desain. */
export function tglHari(ts) {
  const tt = new Date(ts || Date.now());
  const hari = NAMA_HARI()[tt.getDay()];
  const bulan = NAMA_BULAN()[tt.getMonth()];
  const tgl = tt.getDate();
  return isInggris()
    ? `${hari}, ${bulan} ${tgl}`
    : `${hari}, ${tgl} ${bulan}`;
}
