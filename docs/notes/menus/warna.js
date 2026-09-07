/* Menu pilih warna teks.

   Susunan: deretan warna umum (lingkaran), lalu pemilih bebas — pemilih
   warna bulat bawaan sistem (input type=color) + kolom kode hex — dan
   "Bawaan" untuk menghapus warna. Warna yang sedang berlaku ditandai
   cincin; pilihan terakhir yang "menunggu" didahulukan. */

import { esc } from '../../core/dom.js?v=20260907100318';
import { warnaSekarang, warnaPending, warnaLekat } from '../editor/warna.js?v=20260907100318';

/* Warna umum — disusun dari gelap ke terang per rumpun, semua tetap
   terbaca di tema terang maupun gelap. */
export const WARNA_UMUM = [
  '#B91C1C', '#C2410C', '#B45309', '#A16207',   /* merah · jingga · kuning */
  '#4D7C0F', '#15803D', '#0F766E', '#0E7490',   /* hijau · teal · cyan */
  '#1D4ED8', '#4338CA', '#6D28D9', '#A21CAF',   /* biru · nila · ungu */
  '#BE185D', '#9F1239', '#44403C', '#1C1917',   /* pink · anggur · abu */
];

export function warnaMenu() {
  const menunggu = warnaPending();
  const kini = menunggu !== null ? (menunggu || warnaLekat() || '') : warnaSekarang();
  const hexKini = /^#[0-9a-f]{6}$/i.test(kini) ? kini : '';

  const swatch = WARNA_UMUM.map(w => {
    const on = hexKini.toLowerCase() === w.toLowerCase();
    return `<button type="button" class="wsw${on ? ' on' : ''}" data-warna="${w}"
      title="${w}" aria-label="Warna ${w}"${on ? ' aria-pressed="true"' : ''}
      style="background:${w}"></button>`;
  }).join('');

  return `<div class="pop-h">Warna teks</div>
    <p class="pop-note">Tanpa blok teks: warna dipakai untuk yang diketik setelah ini. Blok dulu untuk mengubah tulisan yang sudah ada.</p>
    <div class="wpal">${swatch}</div>
    <div class="wcus">
      <input type="color" id="warna-pel" class="wpel" value="${hexKini || '#B91C1C'}"
        aria-label="Pemilih warna bebas">
      <input id="warna-hex" class="pop-in whex" placeholder="Kode warna, mis. 3b82f6"
        value="${hexKini ? hexKini.slice(1) : ''}" autocomplete="off" spellcheck="false"
        aria-label="Kode warna hex">
      <button type="button" class="btn btn-sec wpakai" data-warna-pakai>Pakai</button>
    </div>
    <button type="button" class="pop-i" data-warna-hapus>
      <svg class="ico"><use href="#i-eraser"/></svg>Bawaan — hapus warna
      <span class="sub">teks mengikuti warna tema</span></button>`;
}

