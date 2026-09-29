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

import { state } from '../core/store.js?v=20260929143813';
import { touch } from './note-model.js?v=20260929143813';
import { saveSoon } from './editor/cleanup.js?v=20260929143813';
import { openPop, closeAll } from './menus/pop.js?v=20260929143813';
import { esc } from '../core/dom.js?v=20260929143813';
import { toast } from '../core/toast.js?v=20260929143813';
import { t as tr } from '../core/i18n.js?v=20260929143813';
import { ensureCaret, sel, docEl } from './editor/caret.js?v=20260929143813';
import { refresh } from './editor/cleanup.js?v=20260929143813';
import { normalizeWarna, hslKeRgb } from './editor/warna.js?v=20260929143813';
import { WARNA_UMUM, hexKeHsl, hslKeHex } from './menus/warna.js?v=20260929143813';

const STORAGE_MODE_KEY = 'hara.hamoji.mode';
const STORAGE_CUSTOM_KEY = 'hara.hamoji.custom';
const STORAGE_COLOR_KEY = 'hara.hamoji.color';

/* ── Pustaka Vektor SVG Moji Kustom Orisinal (40 Varian Persis Gambar Referensi Pinterest) ── */
export const HAMOJI_STICKER_SVGS = {
  // Baris 1
  c1: `<svg viewBox="0 0 110 36" class="hamoji-svg-stk"><path d="M 16 6 C 10 12, 10 24, 16 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 94 6 C 100 12, 100 24, 94 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 35 24 L 26 15 C 23 12, 23 8, 27 6 C 30 4, 33 5, 35 8 C 37 5, 40 4, 43 6 C 47 8, 47 12, 44 15 Z" fill="none" stroke="#ff4071" stroke-width="2.2" stroke-linejoin="round"/><path d="M 75 24 L 66 15 C 63 12, 63 8, 67 6 C 70 4, 73 5, 75 8 C 77 5, 80 4, 83 6 C 87 8, 87 12, 84 15 Z" fill="none" stroke="#ff4071" stroke-width="2.2" stroke-linejoin="round"/><path d="M 50 18 L 55 24 L 60 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  c2: `<svg viewBox="0 0 110 36" class="hamoji-svg-stk"><path d="M 16 6 C 10 12, 10 24, 16 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 94 6 C 100 12, 100 24, 94 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 26 12 L 40 18 L 26 24 M 26 27 L 40 27" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M 84 12 L 70 18 L 84 24 M 70 27 L 84 27" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M 48 18 L 62 18 L 55 26 Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>`,

  c3: `<svg viewBox="0 0 110 36" class="hamoji-svg-stk"><path d="M 10 6 C 5 12, 5 24, 10 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 100 6 C 105 12, 105 24, 100 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 22 22 L 16 16 C 14 14, 14 11, 17 9 C 19 8, 21 8, 22 10 C 23 8, 25 8, 27 9 C 30 11, 30 14, 28 16 Z" fill="#ff69b4"/><path d="M 88 22 L 82 16 C 80 14, 80 11, 83 9 C 85 8, 87 8, 88 10 C 89 8, 91 8, 93 9 C 96 11, 96 14, 94 16 Z" fill="#ff69b4"/><path d="M 32 14 L 46 14 M 43 12 L 45 9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 64 14 L 78 14 M 75 12 L 77 9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 52 14 C 57 14, 57 18, 54 18 C 58 18, 58 24, 52 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`,

  c4: `<svg viewBox="0 0 110 36" class="hamoji-svg-stk"><path d="M 16 6 C 10 12, 10 24, 16 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 94 6 C 100 12, 100 24, 94 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 26 12 L 40 18 L 26 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M 84 12 L 70 18 L 84 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M 46 20 C 46 26, 53 26, 55 21 C 57 26, 64 26, 64 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`,

  c5: `<svg viewBox="0 0 110 36" class="hamoji-svg-stk"><path d="M 16 6 C 10 12, 10 24, 16 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 94 6 C 100 12, 100 24, 94 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><ellipse cx="23" cy="20" rx="6" ry="4" fill="rgba(255, 105, 180, 0.7)"/><ellipse cx="87" cy="20" rx="6" ry="4" fill="rgba(255, 105, 180, 0.7)"/><circle cx="34" cy="18" r="3.2" fill="currentColor"/><circle cx="76" cy="18" r="3.2" fill="currentColor"/><rect x="49" y="14" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>`,

  // Baris 2
  c6: `<svg viewBox="0 0 110 36" class="hamoji-svg-stk"><path d="M 14 6 C 8 12, 8 24, 14 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 96 6 C 102 12, 102 24, 96 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 20 22 L 23 16 M 25 22 L 28 16 M 82 22 L 85 16 M 87 22 L 90 16" stroke="#ff69b4" stroke-width="2.2" stroke-linecap="round"/><path d="M 32 18 Q 38 10 44 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 66 18 Q 72 10 78 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 48 18 L 62 18 Q 55 30 48 18 Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>`,

  c7: `<svg viewBox="0 0 110 36" class="hamoji-svg-stk"><path d="M 16 6 C 10 12, 10 24, 16 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 94 6 C 100 12, 100 24, 94 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 30 18 L 36 12 L 42 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M 68 18 L 74 12 L 80 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M 46 20 Q 55 28 64 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`,

  c8: `<svg viewBox="0 0 110 36" class="hamoji-svg-stk"><path d="M 16 6 C 10 12, 10 24, 16 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 94 6 C 100 12, 100 24, 94 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 30 18 L 36 12 L 42 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M 68 18 L 74 12 L 80 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M 46 20 L 64 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`,

  c9: `<svg viewBox="0 0 110 36" class="hamoji-svg-stk"><path d="M 16 6 C 10 12, 10 24, 16 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 94 6 C 100 12, 100 24, 94 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 35 24 L 26 15 C 23 12, 23 8, 27 6 C 30 4, 33 5, 35 8 C 37 5, 40 4, 43 6 C 47 8, 47 12, 44 15 Z" fill="none" stroke="#ff4071" stroke-width="2.2" stroke-linejoin="round"/><path d="M 75 24 L 66 15 C 63 12, 63 8, 67 6 C 70 4, 73 5, 75 8 C 77 5, 80 4, 83 6 C 87 8, 87 12, 84 15 Z" fill="none" stroke="#ff4071" stroke-width="2.2" stroke-linejoin="round"/><path d="M 52 14 C 57 14, 57 18, 54 18 C 58 18, 58 24, 52 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`,

  c10: `<svg viewBox="0 0 110 36" class="hamoji-svg-stk"><path d="M 16 6 C 10 12, 10 24, 16 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 94 6 C 100 12, 100 24, 94 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 26 12 L 40 18 L 26 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M 84 12 L 70 18 L 84 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M 46 17 Q 55 24 64 17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 50 19 Q 50 28 55 28 Q 60 28 60 19 Z" fill="#ff5376" stroke="currentColor" stroke-width="1.8"/></svg>`,

  // Baris 3
  c11: `<svg viewBox="0 0 110 36" class="hamoji-svg-stk"><path d="M 16 6 C 10 12, 10 24, 16 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 94 6 C 100 12, 100 24, 94 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><ellipse cx="23" cy="20" rx="6" ry="4" fill="rgba(255, 105, 180, 0.7)"/><ellipse cx="87" cy="20" rx="6" ry="4" fill="rgba(255, 105, 180, 0.7)"/><path d="M 28 13 L 40 18 L 28 23" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M 82 13 L 70 18 L 82 23" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M 47 19 Q 55 26 63 19" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`,

  c12: `<svg viewBox="0 0 110 36" class="hamoji-svg-stk"><path d="M 16 6 C 10 12, 10 24, 16 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 94 6 C 100 12, 100 24, 94 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 30 18 L 36 12 L 42 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M 68 18 L 74 12 L 80 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="55" cy="20" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="52" cy="13" r="1.2" fill="currentColor"/><circle cx="58" cy="13" r="1.2" fill="currentColor"/></svg>`,

  c13: `<svg viewBox="0 0 110 36" class="hamoji-svg-stk"><path d="M 16 6 C 10 12, 10 24, 16 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 94 6 C 100 12, 100 24, 94 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 35 24 L 26 15 C 23 12, 23 8, 27 6 C 30 4, 33 5, 35 8 C 37 5, 40 4, 43 6 C 47 8, 47 12, 44 15 Z" fill="none" stroke="#ff4071" stroke-width="2.2" stroke-linejoin="round"/><path d="M 75 24 L 66 15 C 63 12, 63 8, 67 6 C 70 4, 73 5, 75 8 C 77 5, 80 4, 83 6 C 87 8, 87 12, 84 15 Z" fill="none" stroke="#ff4071" stroke-width="2.2" stroke-linejoin="round"/><path d="M 43 23 L 41 27 M 46 23 L 44 27" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M 53 14 C 58 14, 58 18, 55 18 C 59 18, 59 24, 53 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`,

  c14: `<svg viewBox="0 0 110 36" class="hamoji-svg-stk"><path d="M 16 6 C 10 12, 10 24, 16 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 94 6 C 100 12, 100 24, 94 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 24 13 L 26 17 L 30 18 L 26 19 L 24 23 L 22 19 L 18 18 L 22 17 Z" fill="#f59e0b"/><path d="M 86 13 L 88 17 L 92 18 L 88 19 L 86 23 L 84 19 L 80 18 L 84 17 Z" fill="#f59e0b"/><path d="M 36 20 L 42 14 L 48 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M 62 20 L 68 14 L 74 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M 51 22 Q 55 24 59 22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,

  c15: `<svg viewBox="0 0 110 36" class="hamoji-svg-stk"><path d="M 16 6 C 10 12, 10 24, 16 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 94 6 C 100 12, 100 24, 94 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 35 24 L 26 15 C 23 12, 23 8, 27 6 C 30 4, 33 5, 35 8 C 37 5, 40 4, 43 6 C 47 8, 47 12, 44 15 Z" fill="none" stroke="#ff4071" stroke-width="2.2" stroke-linejoin="round"/><path d="M 75 24 L 66 15 C 63 12, 63 8, 67 6 C 70 4, 73 5, 75 8 C 77 5, 80 4, 83 6 C 87 8, 87 12, 84 15 Z" fill="none" stroke="#ff4071" stroke-width="2.2" stroke-linejoin="round"/><path d="M 48 18 L 62 18 L 55 26 Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>`,

  // Baris 4
  c16: `<svg viewBox="0 0 110 36" class="hamoji-svg-stk"><path d="M 12 6 C 6 12, 6 24, 12 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 98 6 C 104 12, 104 24, 98 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 17 16 L 27 16 M 17 21 L 27 21 M 83 16 L 93 16 M 83 21 L 93 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 34 19 L 40 13 L 46 19" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M 64 19 L 70 13 L 76 19" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M 49 20 Q 55 26 61 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`,

  c17: `<svg viewBox="0 0 110 36" class="hamoji-svg-stk"><path d="M 14 6 C 8 12, 8 24, 14 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 96 6 C 102 12, 102 24, 96 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 26 19 L 32 13 L 38 19" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M 72 19 L 78 13 L 84 19" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="55" cy="20" rx="14" ry="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="50" cy="20" r="2.2" fill="currentColor"/><circle cx="60" cy="20" r="2.2" fill="currentColor"/></svg>`,

  c18: `<svg viewBox="0 0 110 36" class="hamoji-svg-stk"><path d="M 14 6 C 8 12, 8 24, 14 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 96 6 C 102 12, 102 24, 96 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 21 16 Q 19 12 21 10 Q 23 12 21 16 Z M 27 21 Q 25 17 27 15 Q 29 17 27 21 Z" fill="#38bdf8"/><path d="M 37 18 L 49 18 M 61 18 L 73 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="55" cy="21" r="1.8" fill="currentColor"/></svg>`,

  c19: `<svg viewBox="0 0 110 36" class="hamoji-svg-stk"><path d="M 16 6 C 10 12, 10 24, 16 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 94 6 C 100 12, 100 24, 94 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 28 16 Q 35 22 42 16 M 68 16 Q 75 22 82 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><rect x="49" y="15" width="12" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>`,

  c20: `<svg viewBox="0 0 110 36" class="hamoji-svg-stk"><path d="M 16 6 C 10 12, 10 24, 16 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 94 6 C 100 12, 100 24, 94 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 28 17 L 42 17 M 68 17 L 82 17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 48 23 L 62 23" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 87 18 Q 85 14 87 12 Q 89 14 87 18 Z" fill="#38bdf8"/></svg>`,

  // Baris 5
  c21: `<svg viewBox="0 0 110 36" class="hamoji-svg-stk"><path d="M 12 27 Q 6 25 5 20 Q 5 16 9 16 Q 11 12 16 13 Q 19 13 19 17 Q 21 18 20 22 Q 19 25 15 25 Z" fill="#94a3b8" opacity="0.85"/><circle cx="5" cy="27" r="1.5" fill="#94a3b8" opacity="0.7"/><path d="M 24 6 C 18 12, 18 24, 24 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 96 6 C 102 12, 102 24, 96 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 34 16 Q 41 22 48 16 M 72 16 Q 79 22 86 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 53 17 L 67 17 Q 60 28 53 17 Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>`,

  c22: `<svg viewBox="0 0 110 36" class="hamoji-svg-stk"><path d="M 14 6 C 8 12, 8 24, 14 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 96 6 C 102 12, 102 24, 96 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 20 22 L 23 15 M 26 22 L 29 15 M 81 22 L 84 15 M 87 22 L 90 15" stroke="#ff69b4" stroke-width="2.2" stroke-linecap="round"/><path d="M 32 14 L 44 14 M 66 14 L 78 14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 49 14 L 49 25 L 61 25 L 61 14 M 49 20 L 61 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  c23: `<svg viewBox="0 0 110 36" class="hamoji-svg-stk"><path d="M 16 6 C 10 12, 10 24, 16 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 94 6 C 100 12, 100 24, 94 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 28 18 L 44 18 M 66 18 L 82 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="55" cy="20" r="2" fill="currentColor"/></svg>`,

  c24: `<svg viewBox="0 0 110 36" class="hamoji-svg-stk"><path d="M 16 6 C 10 12, 10 24, 16 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 94 6 C 100 12, 100 24, 94 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><ellipse cx="23" cy="20" rx="6" ry="4" fill="rgba(255, 105, 180, 0.7)"/><ellipse cx="87" cy="20" rx="6" ry="4" fill="rgba(255, 105, 180, 0.7)"/><path d="M 28 15 Q 36 21 44 15 M 66 15 Q 74 21 82 15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 46 20 C 46 26, 53 26, 55 21 C 57 26, 64 26, 64 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`,

  c25: `<svg viewBox="0 0 110 36" class="hamoji-svg-stk"><path d="M 16 6 C 10 12, 10 24, 16 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 94 6 C 100 12, 100 24, 94 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 30 11 L 40 14 M 80 11 L 70 14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="35" cy="18" r="3" fill="currentColor"/><circle cx="75" cy="18" r="3" fill="currentColor"/><path d="M 48 24 L 55 19 L 62 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  // Baris 6
  c26: `<svg viewBox="0 0 110 36" class="hamoji-svg-stk"><path d="M 16 6 C 10 12, 10 24, 16 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 94 6 C 100 12, 100 24, 94 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><ellipse cx="23" cy="20" rx="6" ry="4" fill="rgba(255, 105, 180, 0.7)"/><ellipse cx="87" cy="20" rx="6" ry="4" fill="rgba(255, 105, 180, 0.7)"/><circle cx="34" cy="18" r="3.2" fill="currentColor"/><circle cx="76" cy="18" r="3.2" fill="currentColor"/><rect x="49" y="15" width="12" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>`,

  c27: `<svg viewBox="0 0 110 36" class="hamoji-svg-stk"><path d="M 14 6 C 8 12, 8 24, 14 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 96 6 C 102 12, 102 24, 96 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 26 17 L 39 17 M 61 17 L 74 17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 44 19 Q 50 25 56 19" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 81 16 Q 79 12 81 10 Q 83 12 81 16 Z M 87 21 Q 85 17 87 15 Q 89 17 87 21 Z" fill="#38bdf8"/></svg>`,

  c28: `<svg viewBox="0 0 110 36" class="hamoji-svg-stk"><path d="M 14 6 C 8 12, 8 24, 14 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 96 6 C 102 12, 102 24, 96 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 26 17 L 40 17 M 60 17 L 74 17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 45 22 L 55 22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 80 14 L 90 14 M 80 20 L 90 20 M 83 11 L 83 23 M 87 11 L 87 23" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,

  c29: `<svg viewBox="0 0 110 36" class="hamoji-svg-stk"><path d="M 16 6 C 10 12, 10 24, 16 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 94 6 C 100 12, 100 24, 94 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 28 17 L 44 17 M 66 17 L 82 17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 47 19 Q 55 27 63 19" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`,

  c30: `<svg viewBox="0 0 110 36" class="hamoji-svg-stk"><path d="M 16 6 C 10 12, 10 24, 16 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 94 6 C 100 12, 100 24, 94 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><ellipse cx="23" cy="20" rx="6" ry="4" fill="rgba(255, 105, 180, 0.7)"/><ellipse cx="87" cy="20" rx="6" ry="4" fill="rgba(255, 105, 180, 0.7)"/><path d="M 28 15 Q 36 21 44 15 M 66 15 Q 74 21 82 15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 49 17 L 61 17 Q 55 27 49 17 Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>`,

  // Baris 7
  c31: `<svg viewBox="0 0 110 36" class="hamoji-svg-stk"><path d="M 14 6 C 8 12, 8 24, 14 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 96 6 C 102 12, 102 24, 96 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 26 15 Q 34 21 42 15 M 58 15 Q 66 21 74 15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 46 22 L 50 19 L 54 22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M 80 11 L 84 11 L 84 7 M 87 7 L 87 11 L 91 11 M 91 14 L 87 14 L 87 18 M 84 18 L 84 14 L 80 14" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg>`,

  c32: `<svg viewBox="0 0 110 36" class="hamoji-svg-stk"><path d="M 16 6 C 10 12, 10 24, 16 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 94 6 C 100 12, 100 24, 94 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="34" cy="17" r="3.2" fill="currentColor"/><circle cx="76" cy="17" r="3.2" fill="currentColor"/><path d="M 46 20 C 46 26, 53 26, 55 21 C 57 26, 64 26, 64 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`,

  c33: `<svg viewBox="0 0 110 36" class="hamoji-svg-stk"><path d="M 14 6 C 8 12, 8 24, 14 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 96 6 C 102 12, 102 24, 96 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 23 15 L 25 18 L 28 19 L 25 20 L 23 23 L 21 20 L 18 19 L 21 18 Z" fill="#f59e0b"/><path d="M 87 15 L 89 18 L 92 19 L 89 20 L 87 23 L 85 20 L 82 19 L 85 18 Z" fill="#f59e0b"/><path d="M 32 14 L 44 14 M 66 14 L 78 14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 49 14 L 49 25 L 61 25 L 61 14 M 49 20 L 61 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  c34: `<svg viewBox="0 0 110 36" class="hamoji-svg-stk"><path d="M 16 6 C 10 12, 10 24, 16 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 94 6 C 100 12, 100 24, 94 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 26 12 L 40 18 L 26 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M 84 12 L 70 18 L 84 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><rect x="49" y="14" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>`,

  c35: `<svg viewBox="0 0 110 36" class="hamoji-svg-stk"><path d="M 16 6 C 10 12, 10 24, 16 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 94 6 C 100 12, 100 24, 94 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 26 13 L 42 13 M 34 13 L 34 26 M 68 13 L 84 13 M 76 13 L 76 26" stroke="#38bdf8" stroke-width="2.4" stroke-linecap="round"/><path d="M 50 22 L 55 17 L 60 22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  // Baris 8
  c36: `<svg viewBox="0 0 110 36" class="hamoji-svg-stk"><path d="M 16 6 C 10 12, 10 24, 16 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 94 6 C 100 12, 100 24, 94 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 28 14 L 42 14 M 39 12 L 41 9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 68 13 L 84 13 M 76 13 L 76 26" stroke="#38bdf8" stroke-width="2.4" stroke-linecap="round"/><rect x="49" y="15" width="12" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>`,

  c37: `<svg viewBox="0 0 110 36" class="hamoji-svg-stk"><path d="M 16 6 C 10 12, 10 24, 16 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 94 6 C 100 12, 100 24, 94 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 28 10 L 42 15 M 82 10 L 68 15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="34" cy="18" r="3.2" fill="currentColor"/><circle cx="76" cy="18" r="3.2" fill="currentColor"/><path d="M 46 20 C 46 26, 53 26, 55 21 C 57 26, 64 26, 64 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`,

  c38: `<svg viewBox="0 0 110 36" class="hamoji-svg-stk"><path d="M 14 6 C 8 12, 8 24, 14 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 96 6 C 102 12, 102 24, 96 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 26 15 Q 34 21 42 15 M 58 15 Q 66 21 74 15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 45 22 Q 50 17 55 22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 84 22 Q 81 16 84 13 Q 87 16 84 22 Z" fill="#38bdf8"/></svg>`,

  c39: `<svg viewBox="0 0 110 36" class="hamoji-svg-stk"><path d="M 16 6 C 10 12, 10 24, 16 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 94 6 C 100 12, 100 24, 94 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 24 13 L 42 13 M 33 13 L 33 27 M 68 13 L 86 13 M 77 13 L 77 27" stroke="#38bdf8" stroke-width="2.4" stroke-linecap="round"/><path d="M 48 24 Q 55 18 62 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`,

  c40: `<svg viewBox="0 0 110 36" class="hamoji-svg-stk"><path d="M 6 26 L 16 10" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M 22 6 C 16 12, 16 24, 22 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 32 14 L 44 14 M 66 14 L 78 14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 49 14 L 49 25 L 61 25 L 61 14 M 49 20 L 61 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M 88 6 C 94 12, 94 24, 88 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 94 26 L 104 10" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`,
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
