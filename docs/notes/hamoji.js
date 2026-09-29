/**
 * Modul Hamoji — Kaomoji, Emoticon, ASCII Art & Stiker Interaktif untuk Catatan Hara
 *
 * Fitur:
 * 1. Moji Kustom Terisi Lengkap (40+ varian estetik sesuai referensi Pinterest) + Pembuat Kustom.
 * 2. Kustom Moji eksklusif Mode Stiker (mencegah kerusakan simbol unicode kompleks pada teks).
 * 3. Stiker Transparan Murni tanpa background/box (menyatu alami dengan kanvas catatan).
 * 4. Sistem Pemilihan Warna Persis Catatan:
 *    - Strip palet warna umum (WARNA_UMUM)
 *    - Roda warna interaktif (lingkaran pelangi per-piksel + slider gelap-terang)
 *    - Kolom input kode hex / rgb / hsl dengan tombol Pakai & Bawaan
 *    - Pembaruan warna langsung (live update) ke stiker yang sedang dipilih di kanvas
 */

import { state } from '../core/store.js?v=20260929145357';
import { touch } from './note-model.js?v=20260929145357';
import { saveSoon } from './editor/cleanup.js?v=20260929145357';
import { openPop, closeAll } from './menus/pop.js?v=20260929145357';
import { esc } from '../core/dom.js?v=20260929145357';
import { toast } from '../core/toast.js?v=20260929145357';
import { t as tr } from '../core/i18n.js?v=20260929145357';
import { ensureCaret, sel, docEl } from './editor/caret.js?v=20260929145357';
import { refresh } from './editor/cleanup.js?v=20260929145357';
import { normalizeWarna, hslKeRgb } from './editor/warna.js?v=20260929145357';
import { WARNA_UMUM, hexKeHsl, hslKeHex } from './menus/warna.js?v=20260929145357';

const STORAGE_MODE_KEY = 'hara.hamoji.mode';
const STORAGE_CUSTOM_KEY = 'hara.hamoji.custom';
const STORAGE_COLOR_KEY = 'hara.hamoji.color';

/* ── Pustaka Vektor SVG Moji Kustom Orisinal (40 Varian Persis Gambar Referensi Pinterest) ── */
export const HAMOJI_STICKER_SVGS = {
  // Baris 1
  c1: `<svg viewBox="0 0 100 30" class="hamoji-svg-stk"><text x="6" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">(</text><path d="M 32 21 L 24 13 C 21 10, 21 6.5, 25 5 C 27.5 3.5, 30.5 4.5, 32 7 C 33.5 4.5, 36.5 3.5, 39 5 C 43 6.5, 43 10, 40 13 Z" fill="none" stroke="#ff3b69" stroke-width="2" stroke-linejoin="round"/><path d="M 46 14 L 50 20 L 54 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M 68 21 L 60 13 C 57 10, 57 6.5, 61 5 C 63.5 3.5, 66.5 4.5, 68 7 C 69.5 4.5, 72.5 3.5, 75 5 C 79 6.5, 79 10, 76 13 Z" fill="none" stroke="#ff3b69" stroke-width="2" stroke-linejoin="round"/><text x="87" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">)</text></svg>`,

  c2: `<svg viewBox="0 0 100 30" class="hamoji-svg-stk"><text x="6" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">(</text><path d="M 24 10 L 36 15 L 24 20 M 24 23 L 36 23" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M 44 14 L 56 14 L 50 21 Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M 76 10 L 64 15 L 76 20 M 64 23 L 76 23" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><text x="87" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">)</text></svg>`,

  c3: `<svg viewBox="0 0 100 30" class="hamoji-svg-stk"><text x="6" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">(</text><path d="M 21 19 L 16 14 C 14 12, 14 9.5, 17 8 C 18.5 7, 20 7, 21 9 C 22 7, 23.5 7, 25 8 C 28 9.5, 28 12, 26 14 Z" fill="#ff69b4"/><path d="M 29 12 L 41 12 M 38 10 L 40 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 48 11 C 52 11, 52 15, 49.5 15 C 53 15, 53 20, 48 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 59 12 L 71 12 M 68 10 L 70 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 79 19 L 74 14 C 72 12, 72 9.5, 75 8 C 76.5 7, 78 7, 79 9 C 80 7, 81.5 7, 83 8 C 86 9.5, 86 12, 84 14 Z" fill="#ff69b4"/><text x="87" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">)</text></svg>`,

  c4: `<svg viewBox="0 0 100 30" class="hamoji-svg-stk"><text x="6" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">(</text><path d="M 24 10 L 36 15 L 24 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M 42 16 C 42 21, 48 21, 50 17 C 52 21, 58 21, 58 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 76 10 L 64 15 L 76 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><text x="87" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">)</text></svg>`,

  c5: `<svg viewBox="0 0 100 30" class="hamoji-svg-stk"><text x="6" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">(</text><ellipse cx="21" cy="17" rx="5" ry="3.5" fill="rgba(255, 105, 180, 0.75)"/><circle cx="31" cy="15" r="2.8" fill="currentColor"/><rect x="44.5" y="11.5" width="11" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="69" cy="15" r="2.8" fill="currentColor"/><ellipse cx="79" cy="17" rx="5" ry="3.5" fill="rgba(255, 105, 180, 0.75)"/><text x="87" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">)</text></svg>`,

  // Baris 2
  c6: `<svg viewBox="0 0 100 30" class="hamoji-svg-stk"><text x="6" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">(</text><path d="M 18 19 L 21 13 M 23 19 L 26 13" stroke="#ff69b4" stroke-width="2" stroke-linecap="round"/><path d="M 29 16 Q 35 9 41 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 44 14 L 56 14 Q 50 25 44 14 Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M 59 16 Q 65 9 71 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 74 19 L 77 13 M 79 19 L 82 13" stroke="#ff69b4" stroke-width="2" stroke-linecap="round"/><text x="87" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">)</text></svg>`,

  c7: `<svg viewBox="0 0 100 30" class="hamoji-svg-stk"><text x="6" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">(</text><path d="M 27 16 L 33 10 L 39 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M 43 16 Q 50 23 57 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 61 16 L 67 10 L 73 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><text x="87" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">)</text></svg>`,

  c8: `<svg viewBox="0 0 100 30" class="hamoji-svg-stk"><text x="6" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">(</text><path d="M 27 16 L 33 10 L 39 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M 43 17 L 47 17 M 49 17 L 53 17 M 55 17 L 59 17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 61 16 L 67 10 L 73 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><text x="87" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">)</text></svg>`,

  c9: `<svg viewBox="0 0 100 30" class="hamoji-svg-stk"><text x="6" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">(</text><path d="M 32 21 L 24 13 C 21 10, 21 6.5, 25 5 C 27.5 3.5, 30.5 4.5, 32 7 C 33.5 4.5, 36.5 3.5, 39 5 C 43 6.5, 43 10, 40 13 Z" fill="none" stroke="#ff3b69" stroke-width="2" stroke-linejoin="round"/><path d="M 48 11 C 52 11, 52 15, 49.5 15 C 53 15, 53 20, 48 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 68 21 L 60 13 C 57 10, 57 6.5, 61 5 C 63.5 3.5, 66.5 4.5, 68 7 C 69.5 4.5, 72.5 3.5, 75 5 C 79 6.5, 79 10, 76 13 Z" fill="none" stroke="#ff3b69" stroke-width="2" stroke-linejoin="round"/><text x="87" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">)</text></svg>`,

  c10: `<svg viewBox="0 0 100 30" class="hamoji-svg-stk"><text x="6" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">(</text><path d="M 24 10 L 36 15 L 24 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M 42 14 Q 50 20 58 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 46 16 Q 46 24 50 24 Q 54 24 54 16 Z" fill="#ff5376" stroke="currentColor" stroke-width="1.8"/><path d="M 76 10 L 64 15 L 76 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><text x="87" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">)</text></svg>`,

  // Baris 3
  c11: `<svg viewBox="0 0 100 30" class="hamoji-svg-stk"><text x="6" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">(</text><ellipse cx="21" cy="17" rx="5" ry="3.5" fill="rgba(255, 105, 180, 0.75)"/><path d="M 26 11 L 38 16 L 26 21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M 43 16 Q 50 22 57 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 74 11 L 62 16 L 74 21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="79" cy="17" rx="5" ry="3.5" fill="rgba(255, 105, 180, 0.75)"/><text x="87" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">)</text></svg>`,

  c12: `<svg viewBox="0 0 100 30" class="hamoji-svg-stk"><text x="6" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">(</text><path d="M 27 16 L 33 10 L 39 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="50" cy="17" r="3.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="47.5" cy="11" r="1" fill="currentColor"/><circle cx="52.5" cy="11" r="1" fill="currentColor"/><path d="M 61 16 L 67 10 L 73 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><text x="87" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">)</text></svg>`,

  c13: `<svg viewBox="0 0 100 30" class="hamoji-svg-stk"><text x="6" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">(</text><path d="M 32 21 L 24 13 C 21 10, 21 6.5, 25 5 C 27.5 3.5, 30.5 4.5, 32 7 C 33.5 4.5, 36.5 3.5, 39 5 C 43 6.5, 43 10, 40 13 Z" fill="none" stroke="#ff3b69" stroke-width="2" stroke-linejoin="round"/><path d="M 39 20 L 37.5 24 M 42 20 L 40.5 24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M 48 11 C 52 11, 52 15, 49.5 15 C 53 15, 53 20, 48 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 68 21 L 60 13 C 57 10, 57 6.5, 61 5 C 63.5 3.5, 66.5 4.5, 68 7 C 69.5 4.5, 72.5 3.5, 75 5 C 79 6.5, 79 10, 76 13 Z" fill="none" stroke="#ff3b69" stroke-width="2" stroke-linejoin="round"/><text x="87" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">)</text></svg>`,

  c14: `<svg viewBox="0 0 100 30" class="hamoji-svg-stk"><text x="6" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">(</text><path d="M 22 11 L 24 14.5 L 27.5 15.5 L 24 16.5 L 22 20 L 20 16.5 L 16.5 15.5 L 20 14.5 Z" fill="#f59e0b"/><path d="M 32 17 L 38 11 L 44 17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M 56 17 L 62 11 L 68 17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M 78 11 L 80 14.5 L 83.5 15.5 L 80 16.5 L 78 20 L 76 16.5 L 72.5 15.5 L 76 14.5 Z" fill="#f59e0b"/><text x="87" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">)</text></svg>`,

  c15: `<svg viewBox="0 0 100 30" class="hamoji-svg-stk"><text x="6" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">(</text><path d="M 32 21 L 24 13 C 21 10, 21 6.5, 25 5 C 27.5 3.5, 30.5 4.5, 32 7 C 33.5 4.5, 36.5 3.5, 39 5 C 43 6.5, 43 10, 40 13 Z" fill="none" stroke="#ff3b69" stroke-width="2" stroke-linejoin="round"/><path d="M 44 14 L 56 14 L 50 21 Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M 68 21 L 60 13 C 57 10, 57 6.5, 61 5 C 63.5 3.5, 66.5 4.5, 68 7 C 69.5 4.5, 72.5 3.5, 75 5 C 79 6.5, 79 10, 76 13 Z" fill="none" stroke="#ff3b69" stroke-width="2" stroke-linejoin="round"/><text x="87" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">)</text></svg>`,

  // Baris 4
  c16: `<svg viewBox="0 0 100 30" class="hamoji-svg-stk"><text x="6" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">(</text><path d="M 16 13 L 25 13 M 16 17 L 25 17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M 30 16 L 36 10 L 42 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M 44 16 Q 50 22 56 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 58 16 L 64 10 L 70 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M 75 13 L 84 13 M 75 17 L 84 17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><text x="87" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">)</text></svg>`,

  c17: `<svg viewBox="0 0 100 30" class="hamoji-svg-stk"><text x="6" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">(</text><path d="M 23 16 L 29 10 L 35 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="50" cy="17" rx="12" ry="7.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="46" cy="17" r="1.8" fill="currentColor"/><circle cx="54" cy="17" r="1.8" fill="currentColor"/><path d="M 65 16 L 71 10 L 77 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><text x="87" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">)</text></svg>`,

  c18: `<svg viewBox="0 0 100 30" class="hamoji-svg-stk"><text x="6" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">(</text><path d="M 19 13 Q 17 9.5 19 7.5 Q 21 9.5 19 13 Z M 24 18 Q 22 14.5 24 12.5 Q 26 14.5 24 18 Z" fill="#38bdf8"/><path d="M 33 15 L 44 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="50" cy="18" r="1.6" fill="currentColor"/><path d="M 56 15 L 67 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><text x="87" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">)</text></svg>`,

  c19: `<svg viewBox="0 0 100 30" class="hamoji-svg-stk"><text x="6" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">(</text><path d="M 25 13 Q 32 19 39 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><rect x="44.5" y="12" width="11" height="10" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M 61 13 Q 68 19 75 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><text x="87" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">)</text></svg>`,

  c20: `<svg viewBox="0 0 100 30" class="hamoji-svg-stk"><text x="6" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">(</text><path d="M 25 14 L 38 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 43 20 L 57 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 62 14 L 75 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 79 16 Q 77 12.5 79 10.5 Q 81 12.5 79 16 Z" fill="#38bdf8"/><text x="87" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">)</text></svg>`,

  // Baris 5
  c21: `<svg viewBox="0 0 100 30" class="hamoji-svg-stk"><path d="M 11 23 Q 5 21 4 17 Q 4 13 8 13 Q 10 10 14 11 Q 17 11 17 14 Q 19 15 18 18 Q 17 21 13 21 Z" fill="#94a3b8" opacity="0.85"/><circle cx="5" cy="24" r="1.2" fill="#94a3b8" opacity="0.7"/><text x="14" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">(</text><path d="M 30 13 Q 37 19 44 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 47 14 L 57 14 Q 52 23 47 14 Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M 60 13 Q 67 19 74 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><text x="87" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">)</text></svg>`,

  c22: `<svg viewBox="0 0 100 30" class="hamoji-svg-stk"><text x="6" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">(</text><path d="M 18 19 L 21 13 M 23 19 L 26 13" stroke="#ff69b4" stroke-width="2" stroke-linecap="round"/><path d="M 29 12 L 40 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 45 12 L 45 22 L 55 22 L 55 12 M 45 17 L 55 17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M 60 12 L 71 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 74 19 L 77 13 M 79 19 L 82 13" stroke="#ff69b4" stroke-width="2" stroke-linecap="round"/><text x="87" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">)</text></svg>`,

  c23: `<svg viewBox="0 0 100 30" class="hamoji-svg-stk"><text x="6" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">(</text><path d="M 25 15 L 39 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="50" cy="17" r="1.8" fill="currentColor"/><path d="M 61 15 L 75 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><text x="87" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">)</text></svg>`,

  c24: `<svg viewBox="0 0 100 30" class="hamoji-svg-stk"><text x="6" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">(</text><ellipse cx="21" cy="17" rx="5" ry="3.5" fill="rgba(255, 105, 180, 0.75)"/><path d="M 26 12 Q 33 18 40 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 42 16 C 42 21, 48 21, 50 17 C 52 21, 58 21, 58 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 60 12 Q 67 18 74 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><ellipse cx="79" cy="17" rx="5" ry="3.5" fill="rgba(255, 105, 180, 0.75)"/><text x="87" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">)</text></svg>`,

  c25: `<svg viewBox="0 0 100 30" class="hamoji-svg-stk"><text x="6" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">(</text><path d="M 27 9 L 36 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="31" cy="15" r="2.8" fill="currentColor"/><path d="M 44 21 L 50 16 L 56 21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="69" cy="15" r="2.8" fill="currentColor"/><path d="M 73 9 L 64 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><text x="87" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">)</text></svg>`,

  // Baris 6
  c26: `<svg viewBox="0 0 100 30" class="hamoji-svg-stk"><text x="6" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">(</text><ellipse cx="21" cy="17" rx="5" ry="3.5" fill="rgba(255, 105, 180, 0.75)"/><circle cx="31" cy="15" r="2.8" fill="currentColor"/><rect x="44.5" y="12" width="11" height="10" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="69" cy="15" r="2.8" fill="currentColor"/><ellipse cx="79" cy="17" rx="5" ry="3.5" fill="rgba(255, 105, 180, 0.75)"/><text x="87" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">)</text></svg>`,

  c27: `<svg viewBox="0 0 100 30" class="hamoji-svg-stk"><text x="6" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">(</text><path d="M 24 14 L 35 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 39 16 Q 45 22 51 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 55 14 L 66 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 72 13 Q 70 9.5 72 7.5 Q 74 9.5 72 13 Z M 78 18 Q 76 14.5 78 12.5 Q 80 14.5 78 18 Z" fill="#38bdf8"/><text x="87" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">)</text></svg>`,

  c28: `<svg viewBox="0 0 100 30" class="hamoji-svg-stk"><text x="6" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">(</text><path d="M 23 14 L 35 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 40 19 L 50 19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 55 14 L 67 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 73 12 L 81 12 M 73 17 L 81 17 M 75 9.5 L 75 19.5 M 79 9.5 L 79 19.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><text x="87" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">)</text></svg>`,

  c29: `<svg viewBox="0 0 100 30" class="hamoji-svg-stk"><text x="6" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">(</text><path d="M 25 14 L 39 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 43 16 Q 50 23 57 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 61 14 L 75 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><text x="87" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">)</text></svg>`,

  c30: `<svg viewBox="0 0 100 30" class="hamoji-svg-stk"><text x="6" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">(</text><ellipse cx="21" cy="17" rx="5" ry="3.5" fill="rgba(255, 105, 180, 0.75)"/><path d="M 26 12 Q 33 18 40 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 45 14 L 55 14 Q 50 23 45 14 Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M 60 12 Q 67 18 74 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><ellipse cx="79" cy="17" rx="5" ry="3.5" fill="rgba(255, 105, 180, 0.75)"/><text x="87" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">)</text></svg>`,

  // Baris 7
  c31: `<svg viewBox="0 0 100 30" class="hamoji-svg-stk"><text x="6" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">(</text><path d="M 24 13 Q 31 19 38 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 42 19 L 46 16 L 50 19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M 54 13 Q 61 19 68 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 73 9.5 L 77 9.5 L 77 5.5 M 80 5.5 L 80 9.5 L 84 9.5 M 84 12.5 L 80 12.5 L 80 16.5 M 77 16.5 L 77 12.5 L 73 12.5" stroke="#ef4444" stroke-width="2" stroke-linecap="round" fill="none"/><text x="87" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">)</text></svg>`,

  c32: `<svg viewBox="0 0 100 30" class="hamoji-svg-stk"><text x="6" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">(</text><circle cx="31" cy="14" r="2.8" fill="currentColor"/><path d="M 42 16 C 42 21, 48 21, 50 17 C 52 21, 58 21, 58 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="69" cy="14" r="2.8" fill="currentColor"/><text x="87" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">)</text></svg>`,

  c33: `<svg viewBox="0 0 100 30" class="hamoji-svg-stk"><text x="6" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">(</text><path d="M 21 12 L 23 15 L 26 16 L 23 17 L 21 20 L 19 17 L 16 16 L 19 15 Z" fill="#f59e0b"/><path d="M 29 12 L 40 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 45 12 L 45 22 L 55 22 L 55 12 M 45 17 L 55 17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M 60 12 L 71 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 79 12 L 81 15 L 84 16 L 81 17 L 79 20 L 77 17 L 74 16 L 77 15 Z" fill="#f59e0b"/><text x="87" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">)</text></svg>`,

  c34: `<svg viewBox="0 0 100 30" class="hamoji-svg-stk"><text x="6" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">(</text><path d="M 24 10 L 36 15 L 24 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="44.5" y="11.5" width="11" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M 76 10 L 64 15 L 76 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><text x="87" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">)</text></svg>`,

  c35: `<svg viewBox="0 0 100 30" class="hamoji-svg-stk"><text x="6" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">(</text><path d="M 24 11 L 38 11 M 31 11 L 31 23" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round"/><path d="M 46 19 L 50 14 L 54 19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M 62 11 L 76 11 M 69 11 L 69 23" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round"/><text x="87" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">)</text></svg>`,

  // Baris 8
  c36: `<svg viewBox="0 0 100 30" class="hamoji-svg-stk"><text x="6" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">(</text><path d="M 25 12 L 37 12 M 34 10 L 36 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><rect x="44.5" y="12" width="11" height="10" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M 62 11 L 76 11 M 69 11 L 69 23" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round"/><text x="87" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">)</text></svg>`,

  c37: `<svg viewBox="0 0 100 30" class="hamoji-svg-stk"><text x="6" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">(</text><path d="M 25 8 L 38 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="31" cy="15" r="2.8" fill="currentColor"/><path d="M 42 16 C 42 21, 48 21, 50 17 C 52 21, 58 21, 58 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="69" cy="15" r="2.8" fill="currentColor"/><path d="M 75 8 L 62 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><text x="87" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">)</text></svg>`,

  c38: `<svg viewBox="0 0 100 30" class="hamoji-svg-stk"><text x="6" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">(</text><path d="M 24 13 Q 31 19 38 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 41 19 Q 45 15 49 19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 52 13 Q 59 19 66 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 76 19 Q 73 14.5 76 12 Q 79 14.5 76 19 Z" fill="#38bdf8"/><text x="87" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">)</text></svg>`,

  c39: `<svg viewBox="0 0 100 30" class="hamoji-svg-stk"><text x="6" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">(</text><path d="M 22 11 L 38 11 M 30 11 L 30 23" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round"/><path d="M 44 20 Q 50 14 56 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 62 11 L 78 11 M 70 11 L 70 23" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round"/><text x="87" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">)</text></svg>`,

  c40: `<svg viewBox="0 0 100 30" class="hamoji-svg-stk"><path d="M 5 23 L 14 9" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><text x="17" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">(</text><path d="M 29 12 L 40 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 45 12 L 45 22 L 55 22 L 55 12 M 45 17 L 55 17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M 60 12 L 71 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><text x="76" y="21" font-size="20" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="400" fill="currentColor">)</text><path d="M 86 23 L 95 9" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`,
};

export const CUSTOM_MOJI_TEMPLATES = {
  // Baris 1
  c1: { id: 'c1', name: 'Cinta Berbinar Pink Hati', cat: 'custom', subCat: 'cinta', tags: 'love hati cinta mata pink berbinar', text: '(♡ v ♡)', svg: HAMOJI_STICKER_SVGS.c1 },
  c2: { id: 'c2', name: 'Sangat Riang', cat: 'custom', subCat: 'senang', tags: 'senang riang tawa delta', text: '(≥ ∇ ≤)', svg: HAMOJI_STICKER_SVGS.c2 },
  c3: { id: 'c3', name: 'Bersiul Pipi Hati', cat: 'custom', subCat: 'cinta', tags: 'siul santai bibir manis pink hati', text: '(♡ ‾́ 3 ‾́ ♡)', svg: HAMOJI_STICKER_SVGS.c3 },
  c4: { id: 'c4', name: 'Gemas Riang', cat: 'custom', subCat: 'senang', tags: 'gemas senang imut ceria w', text: '(> ω <)', svg: HAMOJI_STICKER_SVGS.c4 },
  c5: { id: 'c5', name: 'Senyum Lebar Blush', cat: 'custom', subCat: 'senang', tags: 'senyum tawa riang pipi merah blush', text: '(˚ ▱ ˚)', svg: HAMOJI_STICKER_SVGS.c5 },

  // Baris 2
  c6: { id: 'c6', name: 'Tertawa Lepas Blush', cat: 'custom', subCat: 'senang', tags: 'tawa tertawa gembira blush garis', text: '(ˆ ▽ ˆ)', svg: HAMOJI_STICKER_SVGS.c6 },
  c7: { id: 'c7', name: 'Senyum Lembut', cat: 'custom', subCat: 'senang', tags: 'senyum manis damai lembut', text: '(^ ‿ ^)', svg: HAMOJI_STICKER_SVGS.c7 },
  c8: { id: 'c8', name: 'Mata Garis Tenang', cat: 'custom', subCat: 'senang', tags: 'tenang santai damai strip', text: '(^ --- ^)', svg: HAMOJI_STICKER_SVGS.c8 },
  c9: { id: 'c9', name: 'Penuh Kasih Pink Hati', cat: 'custom', subCat: 'cinta', tags: 'cinta love hati manis pink', text: '(♡ ₃ ♡)', svg: HAMOJI_STICKER_SVGS.c9 },
  c10: { id: 'c10', name: 'Gemas Melet Lidah Pink', cat: 'custom', subCat: 'senang', tags: 'gemas imut lidah melet pink', text: '(> 👅 <)', svg: HAMOJI_STICKER_SVGS.c10 },

  // Baris 3
  c11: { id: 'c11', name: 'Malu Senang Blush', cat: 'custom', subCat: 'senang', tags: 'malu senang imut ceria blush', text: '(> ‿ <)', svg: HAMOJI_STICKER_SVGS.c11 },
  c12: { id: 'c12', name: 'Polos Bengong', cat: 'custom', subCat: 'ekspresi', tags: 'bengong polos imut lucu o', text: '(^ ӧ ^)', svg: HAMOJI_STICKER_SVGS.c12 },
  c13: { id: 'c13', name: 'Kecupan Manis Tetes', cat: 'custom', subCat: 'cinta', tags: 'cium love cinta manis tetes', text: '(♡„ 3 ♡)', svg: HAMOJI_STICKER_SVGS.c13 },
  c14: { id: 'c14', name: 'Pipi Bintang Berseri', cat: 'custom', subCat: 'senang', tags: 'pipi berseri bintang senang sparkle', text: '(* ^ ᴗ ^ *)', svg: HAMOJI_STICKER_SVGS.c14 },
  c15: { id: 'c15', name: 'Tatapan Kasih Segitiga', cat: 'custom', subCat: 'cinta', tags: 'hati cinta tatapan pink delta', text: '(♡ ∇ ♡)', svg: HAMOJI_STICKER_SVGS.c15 },

  // Baris 4
  c16: { id: 'c16', name: 'Kucing Ceria Kumis', cat: 'custom', subCat: 'hewan', tags: 'kucing cat meow kumis senyum', text: '(= ^ ‿ ^ =)', svg: HAMOJI_STICKER_SVGS.c16 },
  c17: { id: 'c17', name: 'Babi Imut Hidung', cat: 'custom', subCat: 'hewan', tags: 'babi pig lucu imut hidung', text: '( ˆ(oo)ˆ )', svg: HAMOJI_STICKER_SVGS.c17 },
  c18: { id: 'c18', name: 'Canggung Keringat Ganda', cat: 'custom', subCat: 'ekspresi', tags: 'canggung keringat degdegan tetes', text: '(;; - . -)', svg: HAMOJI_STICKER_SVGS.c18 },
  c19: { id: 'c19', name: 'Tidur Nyenyak', cat: 'custom', subCat: 'ekspresi', tags: 'tidur lelap tenang santai kotak', text: '(˘ ▱ ˘)', svg: HAMOJI_STICKER_SVGS.c19 },
  c20: { id: 'c20', name: 'Lelah Pasrah Keringat', cat: 'custom', subCat: 'ekspresi', tags: 'capek lelah pasrah keringat tetes', text: '(- _ - ;)', svg: HAMOJI_STICKER_SVGS.c20 },

  // Baris 5
  c21: { id: 'c21', name: 'Lega Menghela Napas', cat: 'custom', subCat: 'ekspresi', tags: 'lega napas hembus santai angin puff', text: '(˘ ▽ ˘) 💨', svg: HAMOJI_STICKER_SVGS.c21 },
  c22: { id: 'c22', name: 'Malu Merona Garis', cat: 'custom', subCat: 'senang', tags: 'malu merona blush garis kotak', text: '(// ㅂ //)', svg: HAMOJI_STICKER_SVGS.c22 },
  c23: { id: 'c23', name: 'Mengantuk Datar', cat: 'custom', subCat: 'ekspresi', tags: 'kantuk ngantuk tidur diam datar', text: '(- . -)', svg: HAMOJI_STICKER_SVGS.c23 },
  c24: { id: 'c24', name: 'Damai Imut Blush', cat: 'custom', subCat: 'senang', tags: 'damai tenang imut kalem blush w', text: '(˘ ω ˘)', svg: HAMOJI_STICKER_SVGS.c24 },
  c25: { id: 'c25', name: 'Cemberut Khawatir', cat: 'custom', subCat: 'ekspresi', tags: 'cemberut ngambek halus cemas sedih', text: '(˚ ‸ ˚)', svg: HAMOJI_STICKER_SVGS.c25 },

  // Baris 6
  c26: { id: 'c26', name: 'Terkejut Riang Blush', cat: 'custom', subCat: 'senang', tags: 'kaget senang terkejut riang blush', text: '(˚ ▱ ˚)', svg: HAMOJI_STICKER_SVGS.c26 },
  c27: { id: 'c27', name: 'Senyum Pasrah Keringat', cat: 'custom', subCat: 'ekspresi', tags: 'senyum pasrah ikhlas keringat tetes', text: '(- ‿ - ;;)', svg: HAMOJI_STICKER_SVGS.c27 },
  c28: { id: 'c28', name: 'Kesal Menahan Diri', cat: 'custom', subCat: 'ekspresi', tags: 'kesal marah urat emosi pagar tag', text: '(- _ - #)', svg: HAMOJI_STICKER_SVGS.c28 },
  c29: { id: 'c29', name: 'Senyum Santai Smug', cat: 'custom', subCat: 'senang', tags: 'senyum santai kalem manis', text: '(- ‿ -)', svg: HAMOJI_STICKER_SVGS.c29 },
  c30: { id: 'c30', name: 'Puas Bahagia Blush', cat: 'custom', subCat: 'senang', tags: 'puas senang bahagia tawa blush', text: '(˘ ▽ ˘)', svg: HAMOJI_STICKER_SVGS.c30 },

  // Baris 7
  c31: { id: 'c31', name: 'Kesal Gemas Urat Marah', cat: 'custom', subCat: 'ekspresi', tags: 'kesal marah gemas urat merah', text: '( ˃ ᵤ ˂ 💢 )', svg: HAMOJI_STICKER_SVGS.c31 },
  c32: { id: 'c32', name: 'Bulat Imut Kucing', cat: 'custom', subCat: 'hewan', tags: 'bulat imut mata titik w kucing', text: '(˚ ω ˚)', svg: HAMOJI_STICKER_SVGS.c32 },
  c33: { id: 'c33', name: 'Mabuk Kepayang Bintang', cat: 'custom', subCat: 'senang', tags: 'senang santai melayang bintang sparkle', text: '(* ¯ ㅂ ¯ *)', svg: HAMOJI_STICKER_SVGS.c33 },
  c34: { id: 'c34', name: 'Menjerit Panik', cat: 'custom', subCat: 'ekspresi', tags: 'teriak jerit panik pusing kotak', text: '(> ▱ <)', svg: HAMOJI_STICKER_SVGS.c34 },
  c35: { id: 'c35', name: 'Menangis Pilu', cat: 'custom', subCat: 'ekspresi', tags: 'sedih nangis airmata sedih t', text: '(T ^ T)', svg: HAMOJI_STICKER_SVGS.c35 },

  // Baris 8
  c36: { id: 'c36', name: 'Menyerah Menetes Air Mata', cat: 'custom', subCat: 'ekspresi', tags: 'lemas menyerah pasrah nangis tetes', text: '(‾́ ▱ T)', svg: HAMOJI_STICKER_SVGS.c36 },
  c37: { id: 'c37', name: 'Bertekad Alis Tajam', cat: 'custom', subCat: 'ekspresi', tags: 'fokus tekad tajam alis serius w', text: '(•̀ ω •́)', svg: HAMOJI_STICKER_SVGS.c37 },
  c38: { id: 'c38', name: 'Cemas Tetes Air Mata', cat: 'custom', subCat: 'ekspresi', tags: 'cemas gugup keringat airmata tetes sedih', text: '(˘ ︵ ˘ 💧)', svg: HAMOJI_STICKER_SVGS.c38 },
  c39: { id: 'c39', name: 'Menangis Tersedu Lebar', cat: 'custom', subCat: 'ekspresi', tags: 'sedih nangis nangis patah t', text: '(T ⁔ T)', svg: HAMOJI_STICKER_SVGS.c39 },
  c40: { id: 'c40', name: 'Menari Gembira Bahagia', cat: 'custom', subCat: 'senang', tags: 'joget nari gembira santai riang tangan', text: '( / ¯ ㅂ ¯ / )', svg: HAMOJI_STICKER_SVGS.c40 },
};

/* ── Pustaka Kaomoji Kustom Bawaan (Otentik dari Referensi Gambar Pinterest) ── */
export const HAMOJI_CUSTOM_PRESETS = Object.keys(CUSTOM_MOJI_TEMPLATES).map(id => {
  const item = CUSTOM_MOJI_TEMPLATES[id];
  return {
    id: item.id,
    text: item.text,
    name: item.name,
    cat: item.cat,
    subCat: item.subCat,
    tags: item.tags,
    svg: item.svg,
    isCustom: true,
  };
});

/* ── Pustaka Utama Hamoji (Eksklusif 40 Stiker Gambar Referensi) ── */
export const HAMOJI_LIBRARY = HAMOJI_CUSTOM_PRESETS;

export const HAMOJI_CATEGORIES = [
  { id: 'semua', label: 'Semua (40)' },
  { id: 'cinta', label: 'Cinta & Hati' },
  { id: 'senang', label: 'Senang & Ceria' },
  { id: 'imut', label: 'Imut & Gemas' },
  { id: 'ekspresi', label: 'Ekspresi & Reaksi' },
  { id: 'hewan', label: 'Karakter & Hewan' },
  { id: 'custom', label: 'Kustom Saya' },
];

/* ── State Hamoji ── */
let _currentMode = (function () {
  try {
    return localStorage.getItem(STORAGE_MODE_KEY) || 'text';
  } catch (e) {
    return 'text';
  }
})();

let _currentColor = (function () {
  try {
    return localStorage.getItem(STORAGE_COLOR_KEY) || '';
  } catch (e) {
    return '';
  }
})();

let _currentCategory = 'semua';
let _searchQuery = '';
let _wheelOpen = false;

export function getHamojiMode() {
  return _currentMode;
}

export function setHamojiMode(mode) {
  _currentMode = mode === 'sticker' ? 'sticker' : 'text';
  try {
    localStorage.setItem(STORAGE_MODE_KEY, _currentMode);
  } catch (e) {}
}

export function getHamojiColor() {
  return _currentColor;
}

export function setHamojiColor(color) {
  _currentColor = color || '';
  try {
    localStorage.setItem(STORAGE_COLOR_KEY, _currentColor);
  } catch (e) {}
}

export function muatCustomHamoji() {
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function simpanCustomHamoji(item) {
  try {
    const list = muatCustomHamoji();
    list.unshift({
      id: 'custom-' + Date.now().toString(36),
      text: item.text,
      name: item.name || 'Kustom Baru',
      cat: 'custom',
      tags: item.tags || 'kustom custom user',
    });
    localStorage.setItem(STORAGE_CUSTOM_KEY, JSON.stringify(list));
    return list;
  } catch (e) {
    return [];
  }
}

export function hapusCustomHamoji(id) {
  try {
    let list = muatCustomHamoji();
    list = list.filter(x => x.id !== id);
    localStorage.setItem(STORAGE_CUSTOM_KEY, JSON.stringify(list));
    return list;
  } catch (e) {
    return [];
  }
}

/* ── Pengambilan Koleksi Hamoji Aktif (Eksklusif 40 Stiker Gambar Referensi) ── */
export function getFilteredHamojiList(cat = _currentCategory, query = _searchQuery) {
  const userCustomList = muatCustomHamoji();
  
  let all = [];
  if (cat === 'semua' || cat === 'custom') {
    all = [...userCustomList, ...HAMOJI_CUSTOM_PRESETS];
  } else {
    all = HAMOJI_CUSTOM_PRESETS.filter(item => item.cat === cat || item.subCat === cat);
    if (all.length === 0) {
      all = [...userCustomList, ...HAMOJI_CUSTOM_PRESETS];
    }
  }

  // Hilangkan duplikasi jika ada
  const seen = new Set();
  all = all.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  if (query && query.trim()) {
    const q = query.toLowerCase().trim();
    all = all.filter(
      item =>
        (item.text && item.text.toLowerCase().includes(q)) ||
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.tags && item.tags.toLowerCase().includes(q))
    );
  }

  return all;
}

/* ── Renderer Visual Moji Kustom & Stiker (Vektor SVG Orisinal) ── */
export function renderCustomMojiHtml(idOrText, textFallback = '', color = '') {
  let template = CUSTOM_MOJI_TEMPLATES[idOrText];
  if (!template) {
    const foundId = Object.keys(CUSTOM_MOJI_TEMPLATES).find(
      k => CUSTOM_MOJI_TEMPLATES[k].text === idOrText || CUSTOM_MOJI_TEMPLATES[k].text === textFallback
    );
    if (foundId) template = CUSTOM_MOJI_TEMPLATES[foundId];
  }

  const colorStyle = color ? `color:${esc(color)};` : '';
  if (template && template.svg) {
    return `<span class="hamoji-custom-graphic" style="${colorStyle}">${template.svg}</span>`;
  }
  if (template && template.html) {
    return `<span class="hamoji-custom-graphic" style="${colorStyle}">${template.html}</span>`;
  }
  return `<span class="hamoji-stk-text" style="${colorStyle}">${esc(textFallback || idOrText || '')}</span>`;
}

/* ── Mode 1: Sisipkan sebagai Teks Biasa ── */
export function sisipkanHamojiTeks(text, color = _currentColor) {
  const currentNote = state.notes.find(n => n.id === state.openId);
  const r = ensureCaret();

  const nodeToInsert = color
    ? (() => {
        const span = document.createElement('span');
        span.style.color = color;
        span.textContent = text;
        return span;
      })()
    : document.createTextNode(text);

  if (!r) {
    const doc = docEl();
    if (doc) {
      const p = doc.querySelector('.b-p:last-child') || doc.firstElementChild;
      if (p) {
        if (color) {
          p.appendChild(document.createTextNode(' '));
          p.appendChild(nodeToInsert);
        } else {
          p.appendChild(document.createTextNode(' ' + text));
        }
      } else {
        doc.innerHTML += `<div class="b-p">${color ? `<span style="color:${esc(color)}">${esc(text)}</span>` : esc(text)}</div>`;
      }
    }
  } else {
    r.deleteContents();
    r.insertNode(nodeToInsert);
    r.setStartAfter(nodeToInsert);
    r.setEndAfter(nodeToInsert);
    const s = sel();
    if (s) {
      s.removeAllRanges();
      s.addRange(r);
    }
  }

  refresh();
  if (currentNote) {
    touch(currentNote);
    saveSoon();
  }
  toast(tr('Disisipkan: {text}', { text }));
}

/* ── Mode 2: Tempelkan sebagai Stiker Interaktif (Tanpa Background) ── */
export function tambahStikerHamoji(text, color = _currentColor, customId = '') {
  const note = state.notes.find(n => n.id === state.openId);
  if (!note) return;

  if (!Array.isArray(note.stickers)) {
    note.stickers = [];
  }

  if (!customId) {
    const found = HAMOJI_CUSTOM_PRESETS.find(p => p.text === text.trim() || p.id === text.trim());
    if (found) customId = found.id;
  }

  const scrollWrap = document.getElementById('wrap') || document.documentElement;
  const scrollTop = scrollWrap.scrollTop || 0;

  let startX = 24;
  let startY = Math.max(20, Math.min(scrollTop + 70, 500));

  if (note.stickers.length > 0) {
    const offset = (note.stickers.length % 5) * 18;
    startX += offset;
    startY += offset;
  }

  const newSticker = {
    id: 'stk_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    text: text.trim(),
    customId: customId || '',
    x: startX,
    y: startY,
    size: 26,
    color: color || '',
    rot: 0,
  };

  note.stickers.push(newSticker);
  touch(note);
  saveSoon();

  sinkronkanStikerLayer(note);

  setTimeout(() => {
    pilihStiker(newSticker.id);
  }, 40);

  toast(tr('Stiker ditempelkan'));
  return newSticker;
}

export function hapusStikerHamoji(id) {
  const note = state.notes.find(n => n.id === state.openId);
  if (!note || !Array.isArray(note.stickers)) return;
  note.stickers = note.stickers.filter(s => s.id !== id);
  touch(note);
  saveSoon();
  sinkronkanStikerLayer(note);
}

export function ubahWarnaStiker(id, color) {
  const note = state.notes.find(n => n.id === state.openId);
  if (!note || !Array.isArray(note.stickers)) return;
  const s = note.stickers.find(item => item.id === id);
  if (s) {
    s.color = color || '';
    touch(note);
    saveSoon();
    sinkronkanStikerLayer(note);
    pilihStiker(id);
  }
}

/* ── Render HTML Layer Stiker untuk Catatan (Tanpa Background) ── */
export function renderStickersHtml(stickers) {
  if (!Array.isArray(stickers) || stickers.length === 0) return '';
  return stickers.map(s => {
    const content = renderCustomMojiHtml(s.customId || s.text, s.text, s.color);
    return `
      <div class="hamoji-sticker" data-stk-id="${esc(s.id)}" data-custom-id="${esc(s.customId || '')}" style="left:${s.x || 0}px;top:${s.y || 0}px;--stk-size:${s.size || 26}px">
        <div class="hamoji-stk-body">
          ${content}
        </div>
        <div class="hamoji-stk-ctrls">
          <button type="button" class="hamoji-stk-del" data-stk-act="del" aria-label="${tr('Hapus Stiker')}">✕</button>
          <button type="button" class="hamoji-stk-color-btn" data-stk-act="color" title="${tr('Ganti Warna')}">
            <span class="hamoji-stk-color-dot" style="background:${esc(s.color || 'var(--text)')}"></span>
          </button>
          <div class="hamoji-stk-resize" data-stk-act="resize" title="${tr('Ubah Ukuran')}"></div>
        </div>
      </div>
    `;
  }).join('');
}

export function sinkronkanStikerLayer(note) {
  const layer = document.getElementById('hamoji-stickers-layer');
  if (layer && note) {
    layer.innerHTML = renderStickersHtml(note.stickers);
  }
}

export function pilihStiker(id) {
  batalkanPilihanStiker();
  const el = document.querySelector(`.hamoji-sticker[data-stk-id="${id}"]`);
  if (el) {
    el.classList.add('selected');
  }
}

export function batalkanPilihanStiker() {
  document.querySelectorAll('.hamoji-sticker.selected').forEach(el => {
    el.classList.remove('selected');
  });
}

/* ── Roda Warna Interaktif Hamoji (Persis Warna Catatan) ── */
const RODA_PX = 160;
let hRodaH = 0, hRodaS = 0, hRodaL = 0.55;
let hDiskCv = null, hDiskL = null, hDiskPx = 0;

function hCakramRoda(l, px) {
  if (hDiskCv && hDiskL === l && hDiskPx === px) return hDiskCv;
  const off = document.createElement('canvas');
  off.width = px; off.height = px;
  const c2 = off.getContext('2d');
  if (!c2) return null;
  const R = px / 2;
  const img = c2.createImageData(px, px);
  const dat = img.data;
  const PI2 = Math.PI * 2;
  const bulu = Math.max(1, px / RODA_PX);
  for (let y = 0; y < px; y++) {
    const dy = y - R + 0.5;
    for (let x = 0; x < px; x++) {
      const dx = x - R + 0.5;
      const d = Math.hypot(dx, dy);
      if (d > R + bulu) continue;
      const alfa = d > R - bulu ? Math.max(0, Math.min(1, (R + bulu - d) / (2 * bulu))) : 1;
      const hue = (Math.atan2(dy, dx) + PI2) % PI2 * 180 / Math.PI;
      const jenuh = Math.min(1, d / R);
      const [rr, gg, bb] = hslKeRgb(hue, jenuh, l);
      const i = (y * px + x) * 4;
      dat[i] = rr; dat[i + 1] = gg; dat[i + 2] = bb;
      dat[i + 3] = Math.round(alfa * 255);
    }
  }
  c2.putImageData(img, 0, 0);
  hDiskCv = off; hDiskL = l; hDiskPx = px;
  return off;
}

function hRodaGambar(cv, h, s, l) {
  const c2 = cv.getContext ? cv.getContext('2d') : null;
  if (!c2) return;
  const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
  const px = Math.max(1, Math.round(RODA_PX * dpr));
  if (cv.width !== px || cv.height !== px) { cv.width = px; cv.height = px; }
  const off = hCakramRoda(l, px);
  if (!off) return;
  c2.clearRect(0, 0, px, px);
  c2.drawImage(off, 0, 0);
  const R = px / 2;
  const sk = px / RODA_PX;
  const mr = 6 * sk;
  const rad = h * Math.PI / 180;
  const jarak = Math.max(0, Math.min(1, s)) * (R - mr - 2 * sk);
  const tx = R + Math.cos(rad) * jarak;
  const ty = R + Math.sin(rad) * jarak;
  const gores = (r, w, warna) => {
    c2.lineWidth = w; c2.strokeStyle = warna;
    c2.beginPath(); c2.arc(tx, ty, r, 0, Math.PI * 2); c2.stroke();
  };
  gores(mr, 4 * sk, 'rgba(0,0,0,.55)');
  gores(mr, 2 * sk, '#fff');
}

function pasangRodaHamoji() {
  const cv = document.getElementById('hamoji-roda-w');
  const g = document.getElementById('hamoji-roda-g');
  const hex = document.getElementById('hamoji-warna-hex');
  const chip = document.getElementById('hamoji-warna-chip');
  if (!cv || !g || !hex) return;

  const hexVal = _currentColor || '#e53935';
  const awal = hexKeHsl(normalizeWarna(hexVal) || '#e53935');
  hRodaH = awal[0]; hRodaS = awal[1]; hRodaL = awal[2];
  if (chip) chip.style.background = hexVal;
  hex.value = hexVal;
  g.value = Math.round(hRodaL * 100);
  hRodaGambar(cv, hRodaH, hRodaS, hRodaL);

  if (cv.dataset.rodaHamoji) return;
  cv.dataset.rodaHamoji = '1';

  const ambilPosisi = e => {
    const rc = cv.getBoundingClientRect();
    if (!rc || !rc.width) return;
    const dx = (e.clientX || rc.left + rc.width / 2) - (rc.left + rc.width / 2);
    const dy = (e.clientY || rc.top + rc.height / 2) - (rc.top + rc.height / 2);
    if (Math.hypot(dx, dy) > rc.width / 2) return;
    hRodaH = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
    hRodaS = Math.min(1, Math.hypot(dx, dy) / (rc.width / 2));
    const newHex = hslKeHex(hRodaH, hRodaS, hRodaL);
    if (chip) chip.style.background = newHex;
    hex.value = newHex;
    hRodaGambar(cv, hRodaH, hRodaS, hRodaL);
    terapkanWarnaHamoji(newHex);
  };

  cv.addEventListener('pointerdown', e => {
    e.preventDefault();
    ambilPosisi(e);
    if (cv.setPointerCapture && e.pointerId !== undefined) {
      try { cv.setPointerCapture(e.pointerId); } catch (err) {}
    }
  });

  cv.addEventListener('pointermove', e => {
    if (e.buttons) ambilPosisi(e);
  });

  g.addEventListener('input', () => {
    hRodaL = Number(g.value) / 100;
    const newHex = hslKeHex(hRodaH, hRodaS, hRodaL);
    if (chip) chip.style.background = newHex;
    hex.value = newHex;
    hRodaGambar(cv, hRodaH, hRodaS, hRodaL);
    terapkanWarnaHamoji(newHex);
  });

  hex.addEventListener('input', () => {
    const c = normalizeWarna(hex.value);
    if (c) {
      const [hh, ss, ll] = hexKeHsl(c);
      hRodaH = hh; hRodaS = ss; hRodaL = ll;
      if (chip) chip.style.background = c;
      hRodaGambar(cv, hRodaH, hRodaS, hRodaL);
      terapkanWarnaHamoji(c);
    }
  });
}

function terapkanWarnaHamoji(hex) {
  setHamojiColor(hex);
  const preview = document.getElementById('hamoji-warna-preview');
  if (preview) preview.style.background = hex || 'transparent';

  // Highlight swatch strip
  document.querySelectorAll('[data-hamoji-set-color]').forEach(btn => {
    btn.classList.toggle('on', btn.dataset.hamojiSetColor === hex);
  });

  // Update preview di kartu
  document.querySelectorAll('.hamoji-item-text, .hamoji-custom-graphic').forEach(el => {
    el.style.color = hex || 'inherit';
  });

  // Jika stiker di kanvas terpilih, ubah warnanya secara live
  const selStk = document.querySelector('.hamoji-sticker.selected');
  if (selStk) {
    ubahWarnaStiker(selStk.dataset.stkId, hex);
  }
}

/* ── Dialog / Panel UI Hamoji ── */
export function panelHamojiHtml() {
  const mode = getHamojiMode();
  const list = getFilteredHamojiList(_currentCategory, _searchQuery);
  const isSticker = mode === 'sticker';
  const isCustomTab = _currentCategory === 'custom';

  return `
    <div class="rn-modal-box hamoji-modal">
      <!-- Header Panel -->
      <div class="hamoji-header-row">
        <div class="hamoji-title-box">
          <svg class="ico"><use href="#i-smile"/></svg>
          <h3 class="hamoji-title-text">Hamoji</h3>
          <span class="hamoji-mode-pill ${isSticker ? 'is-sticker' : ''}">
            ${isSticker ? tr('Stiker') : tr('Teks')}
          </span>
        </div>
        <button class="iconbtn" data-pop-close aria-label="${tr('Tutup')}" style="width:28px;height:28px">
          <svg class="ico"><use href="#i-x"/></svg>
        </button>
      </div>

      <!-- Segmented Control Mode Toggle -->
      <div class="hamoji-seg">
        <button type="button" class="hamoji-seg-btn ${!isSticker ? 'active' : ''}" data-hamoji-set-mode="text">
          <svg class="ico"><use href="#i-txt"/></svg>
          <span>${tr('Mode Teks')}</span>
        </button>
        <button type="button" class="hamoji-seg-btn ${isSticker ? 'active' : ''}" data-hamoji-set-mode="sticker">
          <svg class="ico"><use href="#i-sticker"/></svg>
          <span>${tr('Mode Stiker')}</span>
        </button>
      </div>

      <!-- Caption Hint -->
      <div class="hamoji-hint-row">
        ${isCustomTab
          ? tr('Kustom Moji otomatis ditempelkan sebagai stiker transparan (tanpa background).')
          : isSticker
          ? tr('Klik untuk menempelkan stiker transparan bebas di catatan.')
          : tr('Klik untuk menyisipkan karakter pada posisi kursor.')}
      </div>

      <!-- Pemilihan Warna (Persis Seperti Pemilihan Warna Teks Catatan) -->
      <div class="hamoji-color-section">
        <div class="hamoji-color-header">
          <span class="hamoji-color-title">${tr('Pilih Warna')}</span>
          <span class="hamoji-color-preview-chip" id="hamoji-warna-preview" style="background:${_currentColor || 'transparent'}"></span>
          <button type="button" class="hamoji-toggle-wheel-btn ${_wheelOpen ? 'active' : ''}" id="hamoji-toggle-wheel" title="${tr('Buka / Tutup Roda Warna')}">
            <svg class="ico"><use href="#i-palette"/></svg>
            <span>${tr('Roda Warna')}</span>
          </button>
          ${_currentColor ? `
            <button type="button" class="hamoji-clear-color-btn" id="hamoji-clear-color" title="${tr('Reset ke Warna Bawaan')}">
              ${tr('Bawaan')}
            </button>
          ` : ''}
        </div>

        <!-- Strip Palet Warna Umum (WARNA_UMUM) -->
        <div class="wpal hamoji-wpal">
          ${WARNA_UMUM.map(w => {
            const on = _currentColor === w;
            return `
              <button type="button" class="wsw${on ? ' on' : ''}" data-hamoji-set-color="${w}"
                title="${w}" aria-label="${w}" style="background:${w};width:28px;height:28px;"></button>
            `;
          }).join('')}
        </div>

        <!-- Roda Warna & Input Hex Bebas (Expandable) -->
        <div class="hamoji-wheel-box" id="hamoji-wheel-box" style="display:${_wheelOpen ? 'block' : 'none'}">
          <div class="wroda">
            <canvas id="hamoji-roda-w" class="wroda-l" width="160" height="160"
              role="img" aria-label="${tr('Roda warna: ketuk untuk memilih rona dan jenuh')}"></canvas>
            <div class="wroda-s" style="height:160px">
              <input type="range" id="hamoji-roda-g" min="0" max="100" value="55"
                style="width:160px" aria-label="${tr('Gelap terang')}">
            </div>
          </div>
          <div class="wcus" style="padding:6px 0 0">
            <span class="wchip" id="hamoji-warna-chip" style="background:${_currentColor || 'var(--text)'}"></span>
            <input id="hamoji-warna-hex" class="pop-in whex" value="${_currentColor || '#e53935'}"
              placeholder="#3b82f6 / rgb(...)" autocomplete="off" spellcheck="false" style="font-size:12px;height:32px">
            <button type="button" class="btn btn-sec wpakai" id="hamoji-warna-pakai" style="height:32px;font-size:12px">${tr('Terapkan')}</button>
          </div>
        </div>
      </div>

      <!-- Search Input -->
      <div class="hamoji-search-box">
        <svg class="ico hamoji-search-ico"><use href="#i-search"/></svg>
        <input type="text" class="hamoji-search-input" id="hamoji-search" placeholder="${tr('Cari kaomoji atau simbol...')}" value="${esc(_searchQuery)}">
      </div>

      <!-- Kategori Chips -->
      <div class="hamoji-cats-row">
        ${HAMOJI_CATEGORIES.map(c => `
          <button type="button" class="hamoji-cat-chip ${c.id === _currentCategory ? 'active' : ''}" data-hamoji-cat="${c.id}">
            ${tr(c.label)}
          </button>
        `).join('')}
      </div>

      <!-- Grid Daftar Kaomoji & Art -->
      <div class="hamoji-grid-wrap">
        ${list.length === 0 ? `
          <div style="grid-column: 1 / -1; padding: 36px 16px; text-align: center; color: var(--muted); font-size: 13px">
            ${tr('Tidak ada karakter yang cocok.')}
          </div>
        ` : list.map(item => {
          const isWide = item.cat === 'ascii' || (item.text && item.text.length > 13);
          const isCustom = item.cat === 'custom' || item.isCustom || isCustomTab;
          const customId = item.id || '';
          const previewHtml = (isCustom || item.html)
            ? renderCustomMojiHtml(customId || item.text, item.text, _currentColor)
            : `<div class="hamoji-item-text" style="${_currentColor ? `color:${esc(_currentColor)};` : ''}">${esc(item.text)}</div>`;

          return `
            <button type="button" class="hamoji-item-card ${isWide ? 'is-wide' : ''} ${isCustom ? 'is-custom-stk' : ''}" data-hamoji-insert="${esc(item.text)}" data-custom-id="${esc(customId)}" data-is-custom="${isCustom ? '1' : '0'}" title="${isCustom ? tr('Stiker Gambar Kustom (Klik untuk tempel)') : esc(item.name || '')}">
              <div class="hamoji-item-preview-box">
                ${previewHtml}
              </div>
              <div class="hamoji-item-name">${esc(item.name || '')}</div>
              ${isCustom ? `<span class="hamoji-stk-badge">${tr('Stiker')}</span>` : ''}
            </button>
          `;
        }).join('')}
      </div>

      <!-- Form Tambah Kaomoji Kustom (Eksklusif Mode Stiker) -->
      <div class="hamoji-custom-add-box">
        <input type="text" class="hamoji-custom-input" id="hamoji-new-in" placeholder="${tr('Ketik kaomoji buatanmu sendiri... (mode stiker)')}">
        <button type="button" class="btn btn-pri hamoji-add-btn" id="hamoji-add-btn">
          ${tr('Simpan')}
        </button>
      </div>
    </div>
  `;
}

export function bukaPanelHamoji(anchor) {
  openPop(panelHamojiHtml(), anchor);
  if (_wheelOpen) {
    setTimeout(pasangRodaHamoji, 20);
  }
}

export const bukaModalHamoji = bukaPanelHamoji;

/* ── Delegasi Event & Mesin Interaksi Stiker ── */
export function bindHamoji() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('#hamoji-btn');
    if (btn) {
      bukaPanelHamoji(btn);
      return;
    }

    const modeBtn = e.target.closest('[data-hamoji-set-mode]');
    if (modeBtn) {
      const mode = modeBtn.dataset.hamojiSetMode;
      setHamojiMode(mode);
      bukaPanelHamoji(document.getElementById('hamoji-btn'));
      return;
    }

    // Ganti Warna dari Swatch Strip
    const colorBtn = e.target.closest('[data-hamoji-set-color]');
    if (colorBtn) {
      const color = colorBtn.dataset.hamojiSetColor;
      terapkanWarnaHamoji(color);
      return;
    }

    // Toggle Roda Warna
    if (e.target.closest('#hamoji-toggle-wheel')) {
      _wheelOpen = !_wheelOpen;
      const box = document.getElementById('hamoji-wheel-box');
      const toggleBtn = document.getElementById('hamoji-toggle-wheel');
      if (box) {
        box.style.display = _wheelOpen ? 'block' : 'none';
        if (_wheelOpen) pasangRodaHamoji();
      }
      if (toggleBtn) toggleBtn.classList.toggle('active', _wheelOpen);
      return;
    }

    // Reset Warna Bawaan
    if (e.target.closest('#hamoji-clear-color')) {
      terapkanWarnaHamoji('');
      bukaPanelHamoji(document.getElementById('hamoji-btn'));
      return;
    }

    // Terapkan Warna dari Kolom Hex
    if (e.target.closest('#hamoji-warna-pakai')) {
      const hexInp = document.getElementById('hamoji-warna-hex');
      const val = hexInp ? hexInp.value : '';
      const c = normalizeWarna(val);
      if (c) {
        terapkanWarnaHamoji(c);
        toast(tr('Warna diterapkan'));
      } else {
        toast(tr('Format warna tidak valid (gunakan #hex / rgb)'));
      }
      return;
    }

    // Filter Kategori
    const catBtn = e.target.closest('[data-hamoji-cat]');
    if (catBtn) {
      _currentCategory = catBtn.dataset.hamojiCat;
      bukaPanelHamoji(document.getElementById('hamoji-btn'));
      return;
    }

    // Klik Kaomoji -> Sisip Teks atau Buat Stiker
    const itemCard = e.target.closest('[data-hamoji-insert]');
    if (itemCard) {
      const text = itemCard.dataset.hamojiInsert;
      const customId = itemCard.dataset.customId || '';
      const isCustom = itemCard.dataset.isCustom === '1';
      const mode = getHamojiMode();
      closeAll();

      // Custom moji selalu otomatis ditempelkan sebagai stiker stiker transparan (eksklusif mode stiker)
      if (mode === 'sticker' || isCustom) {
        tambahStikerHamoji(text, _currentColor, customId);
        if (isCustom && mode === 'text') {
          toast(tr('Moji kustom ditempelkan sebagai stiker'));
        }
      } else {
        sisipkanHamojiTeks(text, _currentColor);
      }
      return;
    }

    // Simpan Kaomoji Kustom (Otomatis masuk mode stiker)
    if (e.target && e.target.id === 'hamoji-add-btn') {
      const inp = document.getElementById('hamoji-new-in');
      const val = (inp ? inp.value : '').trim();
      if (!val) {
        toast(tr('Masukkan teks kaomoji terlebih dahulu'));
        return;
      }
      simpanCustomHamoji({ text: val, name: 'Kustom' });
      toast(tr('Kaomoji kustom disimpan!'));
      _currentCategory = 'custom';
      bukaPanelHamoji(document.getElementById('hamoji-btn'));
      return;
    }

    // Tombol Ubah Warna Stiker Langsung di Kanvas
    const stkColorBtn = e.target.closest('[data-stk-act="color"]');
    if (stkColorBtn) {
      const stkEl = stkColorBtn.closest('.hamoji-sticker');
      if (stkEl) {
        pilihStiker(stkEl.dataset.stkId);
        bukaPanelHamoji(document.getElementById('hamoji-btn'));
      }
      return;
    }

    // Hapus Stiker
    const delStkBtn = e.target.closest('[data-stk-act="del"]');
    if (delStkBtn) {
      const stkEl = delStkBtn.closest('.hamoji-sticker');
      if (stkEl) {
        const id = stkEl.dataset.stkId;
        hapusStikerHamoji(id);
        toast(tr('Stiker dihapus'));
      }
      return;
    }

    // Pilih / Batalkan Pilihan Stiker
    const stickerEl = e.target.closest('.hamoji-sticker');
    if (stickerEl) {
      pilihStiker(stickerEl.dataset.stkId);
    } else if (!e.target.closest('#hamoji-btn') && !e.target.closest('.hamoji-modal')) {
      batalkanPilihanStiker();
    }
  });

  document.addEventListener('input', e => {
    if (e.target && e.target.id === 'hamoji-search') {
      _searchQuery = e.target.value;
      const wrap = document.querySelector('.hamoji-grid-wrap');
      if (wrap) {
        const list = getFilteredHamojiList(_currentCategory, _searchQuery);
        wrap.innerHTML = list.length === 0 ? `
          <div style="grid-column: 1 / -1; padding: 36px 16px; text-align: center; color: var(--muted); font-size: 13px">
            ${tr('Tidak ada karakter yang cocok.')}
          </div>
        ` : list.map(item => {
          const isWide = item.cat === 'ascii' || (item.text && item.text.length > 13);
          const isCustom = item.cat === 'custom' || item.isCustom || _currentCategory === 'custom';
          const customId = item.id || '';
          const previewHtml = (isCustom || item.html)
            ? renderCustomMojiHtml(customId || item.text, item.text, _currentColor)
            : `<div class="hamoji-item-text" style="${_currentColor ? `color:${esc(_currentColor)};` : ''}">${esc(item.text)}</div>`;

          return `
            <button type="button" class="hamoji-item-card ${isWide ? 'is-wide' : ''} ${isCustom ? 'is-custom-stk' : ''}" data-hamoji-insert="${esc(item.text)}" data-custom-id="${esc(customId)}" data-is-custom="${isCustom ? '1' : '0'}" title="${isCustom ? tr('Stiker Gambar Kustom (Klik untuk tempel)') : esc(item.name || '')}">
              <div class="hamoji-item-preview-box">
                ${previewHtml}
              </div>
              <div class="hamoji-item-name">${esc(item.name || '')}</div>
              ${isCustom ? `<span class="hamoji-stk-badge">${tr('Stiker')}</span>` : ''}
            </button>
          `;
        }).join('');
      }
    }
  });

  // Pointer drag & resize
  let _activeDrag = null;

  document.addEventListener('pointerdown', e => {
    const resizeHandle = e.target.closest('[data-stk-act="resize"]');
    const sticker = e.target.closest('.hamoji-sticker');
    if (!sticker) return;

    const id = sticker.dataset.stkId;
    const note = state.notes.find(n => n.id === state.openId);
    if (!note) return;
    const stickerData = (note.stickers || []).find(s => s.id === id);
    if (!stickerData) return;

    pilihStiker(id);

    if (resizeHandle) {
      e.preventDefault();
      _activeDrag = {
        type: 'resize',
        id,
        el: sticker,
        startX: e.clientX,
        startY: e.clientY,
        origSize: stickerData.size || 24,
      };
      if (resizeHandle.setPointerCapture) {
        try { resizeHandle.setPointerCapture(e.pointerId); } catch (err) {}
      }
      return;
    }

    if (!e.target.closest('.hamoji-stk-del') && !e.target.closest('.hamoji-stk-color-btn')) {
      _activeDrag = {
        type: 'move',
        id,
        el: sticker,
        startX: e.clientX,
        startY: e.clientY,
        origX: stickerData.x || 0,
        origY: stickerData.y || 0,
      };
      sticker.classList.add('dragging');
      if (sticker.setPointerCapture) {
        try { sticker.setPointerCapture(e.pointerId); } catch (err) {}
      }
    }
  });

  document.addEventListener('pointermove', e => {
    if (!_activeDrag) return;

    if (_activeDrag.type === 'move') {
      const dx = e.clientX - _activeDrag.startX;
      const dy = e.clientY - _activeDrag.startY;
      const newX = Math.max(0, _activeDrag.origX + dx);
      const newY = Math.max(0, _activeDrag.origY + dy);

      _activeDrag.el.style.left = newX + 'px';
      _activeDrag.el.style.top = newY + 'px';
      _activeDrag.currentX = newX;
      _activeDrag.currentY = newY;
    } else if (_activeDrag.type === 'resize') {
      const dx = e.clientX - _activeDrag.startX;
      const dy = e.clientY - _activeDrag.startY;
      const delta = (dx + dy) / 2;
      const newSize = Math.max(14, Math.min(84, Math.round(_activeDrag.origSize + delta * 0.4)));

      _activeDrag.el.style.setProperty('--stk-size', newSize + 'px');
      _activeDrag.currentSize = newSize;
    }
  });

  const selesaiDrag = () => {
    if (!_activeDrag) return;
    const { id, type, el, currentX, currentY, currentSize } = _activeDrag;
    el.classList.remove('dragging');

    const note = state.notes.find(n => n.id === state.openId);
    if (note && Array.isArray(note.stickers)) {
      const target = note.stickers.find(s => s.id === id);
      if (target) {
        if (type === 'move' && currentX !== undefined && currentY !== undefined) {
          target.x = currentX;
          target.y = currentY;
        } else if (type === 'resize' && currentSize !== undefined) {
          target.size = currentSize;
        }
        touch(note);
        saveSoon();
      }
    }
    _activeDrag = null;
  };

  document.addEventListener('pointerup', selesaiDrag);
  document.addEventListener('pointercancel', selesaiDrag);
}
