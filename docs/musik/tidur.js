/* Sleep timer pemutar Musik. Tiga mode:
   - waktu  : berhenti setelah sekian menit (volume memudar 10 detik sebelum berhenti)
   - lagu   : berhenti setelah lagu yang sedang main selesai
   - daftar : berhenti setelah semua lagu di daftar yang sedang diputar sudah selesai
   Keadaan timer hanya di memori (tidak disimpan ulang setelah aplikasi ditutup).
   Pilihan terakhir (mode dan menit) disimpan di pengaturan Musik. */

import * as M from './mesin.js?v=20261024230000';
import { TIDUR_MENIT_MAKS } from './logika.js?v=20261024230000';

export const FADE_TIDUR_DETIK = 10;

let st = kosong();
let timers = [];
let setelahBerubah = null;

function kosong() {
  return { aktif: false, mode: 'waktu', akhir: 0, hitung: 0, panjang: 0 };
}

/* Callback saat keadaan timer berubah (mis. habis), agar layar bisa diperbarui. */
export function saatTidurBerubah(fn) { setelahBerubah = fn; }
function umumkan() { if (setelahBerubah) { try { setelahBerubah(); } catch (e) { /* abaikan */ } } }

function hentikanTimer() {
  timers.forEach(clearTimeout);
  timers = [];
}

export function tidurInfo() {
  return { ...st };
}

/* Mulai timer. menit: 1..TIDUR_MENIT_MAKS (mode waktu). panjang: jumlah lagu di
   daftar aktif (mode daftar). Mengembalikan false bila tidak bisa dimulai. */
export function mulaiTidur({ mode, menit = 30, panjang = 0 }) {
  hentikanTimer();
  if (mode === 'waktu') {
    const m = Math.min(TIDUR_MENIT_MAKS, Math.max(1, Math.round(Number(menit) || 0)));
    const ms = m * 60000;
    st = { aktif: true, mode, akhir: Date.now() + ms, hitung: 0, panjang: 0 };
    timers.push(setTimeout(() => M.pudarSementara(FADE_TIDUR_DETIK), Math.max(0, ms - FADE_TIDUR_DETIK * 1000)));
    /* Cadangan: jeda tetap terjadi walau pemudaran terganggu (mis. transisi crossfade). */
    timers.push(setTimeout(() => { M.jeda(); batalTidur(); }, ms));
  } else if (mode === 'lagu') {
    st = { aktif: true, mode, akhir: 0, hitung: 0, panjang: 0 };
  } else if (mode === 'daftar') {
    if (!(panjang > 0)) { st = kosong(); umumkan(); return false; }
    st = { aktif: true, mode, akhir: 0, hitung: 0, panjang };
  } else {
    return false;
  }
  umumkan();
  return true;
}

export function batalTidur() {
  const adaAktif = st.aktif;
  hentikanTimer();
  st = kosong();
  if (adaAktif) umumkan();
}

/* Dipanggil setiap kali satu lagu selesai (alami, atau lewat transisi). Mengembalikan
   true bila pemutar harus berhenti dan tidak melanjutkan ke lagu berikutnya. */
export function tidurSelesaiLagu() {
  if (!st.aktif) return false;
  if (st.mode === 'lagu') { batalTidur(); return true; }
  if (st.mode === 'daftar') {
    st.hitung += 1;
    if (st.hitung >= st.panjang) { batalTidur(); return true; }
  }
  return false;
}

/* Crossfade tidak boleh dimulai bila pemutar akan berhenti setelah lagu ini. */
export function tidurMengizinkanTransisi() {
  if (!st.aktif) return true;
  if (st.mode === 'lagu') return false;
  if (st.mode === 'daftar') return st.hitung + 1 < st.panjang;
  return true;
}

/* Jam berhenti (HH.MM) untuk mode waktu, dalam zona waktu perangkat. */
export function jamBerhenti() {
  if (!st.aktif || st.mode !== 'waktu') return '';
  const d = new Date(st.akhir);
  return `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`;
}
