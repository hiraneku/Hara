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

import { state } from '../core/store.js?v=20260929135653';
import { touch } from './note-model.js?v=20260929135653';
import { saveSoon } from './editor/cleanup.js?v=20260929135653';
import { openPop, closeAll } from './menus/pop.js?v=20260929135653';
import { esc } from '../core/dom.js?v=20260929135653';
import { toast } from '../core/toast.js?v=20260929135653';
import { t as tr } from '../core/i18n.js?v=20260929135653';
import { ensureCaret, sel, docEl } from './editor/caret.js?v=20260929135653';
import { refresh } from './editor/cleanup.js?v=20260929135653';
import { normalizeWarna, hslKeRgb } from './editor/warna.js?v=20260929135653';
import { WARNA_UMUM, hexKeHsl, hslKeHex } from './menus/warna.js?v=20260929135653';

const STORAGE_MODE_KEY = 'hara.hamoji.mode';
const STORAGE_CUSTOM_KEY = 'hara.hamoji.custom';
const STORAGE_COLOR_KEY = 'hara.hamoji.color';

/* ── Pustaka Kaomoji Kustom Bawaan (Otentik dari Referensi Gambar Pinterest) ── */
export const HAMOJI_CUSTOM_PRESETS = [
  // Baris 1
  { id: 'c1', text: '(♡ v ♡)', name: 'Cinta Berbinar', cat: 'custom', tags: 'love hati cinta mata berbinar' },
  { id: 'c2', text: '(≥ ∇ ≤)', name: 'Sangat Riang', cat: 'custom', tags: 'senang riang tawa' },
  { id: 'c3', text: '( ‾́ 3 ‾́ )', name: 'Bersiul Manis', cat: 'custom', tags: 'siul santai bibir manis' },
  { id: 'c4', text: '(> ω <)', name: 'Gemas Riang', cat: 'custom', tags: 'gemas senang imut ceria' },
  { id: 'c5', text: '( ° ᗜ ° )', name: 'Senyum Lebar', cat: 'custom', tags: 'senyum tawa riang' },

  // Baris 2
  { id: 'c6', text: '( ˆ ᗜ ˆ )', name: 'Tertawa Lepas', cat: 'custom', tags: 'tawa tertawa gembira' },
  { id: 'c7', text: '( ˆ ◡ ˆ )', name: 'Senyum Lembut', cat: 'custom', tags: 'senyum manis damai lembut' },
  { id: 'c8', text: '( ˆ --- ˆ )', name: 'Mata Garis Tenang', cat: 'custom', tags: 'tenang santai damai' },
  { id: 'c9', text: '(♡ ₃ ♡)', name: 'Penuh Kasih', cat: 'custom', tags: 'cinta love hati manis' },
  { id: 'c10', text: '(> ᵤ <)', name: 'Gemas Malu', cat: 'custom', tags: 'gemas imut lucu malu' },

  // Baris 3
  { id: 'c11', text: '( ˃ ᵕ ˂ )', name: 'Malu Senang', cat: 'custom', tags: 'malu senang imut ceria' },
  { id: 'c12', text: '( ˆ ⍛ ˆ )', name: 'Polos Bengong', cat: 'custom', tags: 'bengong polos imut lucu' },
  { id: 'c13', text: '(♡ 3 ♡)', name: 'Kecupan Cinta', cat: 'custom', tags: 'cium love cinta manis' },
  { id: 'c14', text: '( * ˆ ᴗ ˆ * )', name: 'Pipi Berseri', cat: 'custom', tags: 'pipi berseri merah senang' },
  { id: 'c15', text: '(♡ ᵕ ♡)', name: 'Tatapan Kasih', cat: 'custom', tags: 'hati cinta tatapan' },

  // Baris 4
  { id: 'c16', text: '(= ˆ ◡ ˆ =)', name: 'Kucing Ceria', cat: 'custom', tags: 'kucing cat meow kumis' },
  { id: 'c17', text: '( ˆ(oo)ˆ )', name: 'Babi Imut', cat: 'custom', tags: 'babi pig lucu imut' },
  { id: 'c18', text: '( ; ˆ - ˆ ; )', name: 'Canggung Keringat', cat: 'custom', tags: 'canggung keringat degdegan' },
  { id: 'c19', text: '( ˘ ▱ ˘ )', name: 'Tidur Nyenyak', cat: 'custom', tags: 'tidur lelap tenang santai' },
  { id: 'c20', text: '( - _ - ; )', name: 'Lelah Pasrah', cat: 'custom', tags: 'capek lelah pasrah keringat' },

  // Baris 5
  { id: 'c21', text: '( ˘ ᵤ ˘ )', name: 'Damai Imut', cat: 'custom', tags: 'damai tenang imut kalem' },
  { id: 'c22', text: '( ˘ ㅂ ˘ )', name: 'Puas Santai', cat: 'custom', tags: 'puas santai tenang nikmat' },
  { id: 'c23', text: '( - . - )', name: 'Mengantuk', cat: 'custom', tags: 'kantuk ngantuk tidur diam' },
  { id: 'c24', text: '( ´ ꒳ ` )', name: 'Nyaman Tenang', cat: 'custom', tags: 'nyaman damai santai' },
  { id: 'c25', text: '( ˆ ‸ ˆ )', name: 'Cemberut Halus', cat: 'custom', tags: 'cemberut ngambek halus imut' },

  // Baris 6
  { id: 'c26', text: '( ˆ ▽ ˆ )', name: 'Tawa Ceria', cat: 'custom', tags: 'kaget senang terkejut riang' },
  { id: 'c27', text: '( - ‿ - ; )', name: 'Senyum Pasrah', cat: 'custom', tags: 'senyum pasrah ikhlas keringat' },
  { id: 'c28', text: '( - _ - # )', name: 'Kesal Menahan Diri', cat: 'custom', tags: 'kesal marah urat emosi' },
  { id: 'c29', text: '( - ᵤ - )', name: 'Senyum Tipis', cat: 'custom', tags: 'senyum tipis misterius' },
  { id: 'c30', text: '( ˘ ᗜ ˘ )', name: 'Lega Bahagia', cat: 'custom', tags: 'lega puas senang damai' },

  // Baris 7
  { id: 'c31', text: '( ˃ ᵤ ˂ 💢 )', name: 'Kesal Gemas', cat: 'custom', tags: 'kesal marah gemas urat' },
  { id: 'c32', text: '( •̀ ᵤ •́ )', name: 'Bertekad Serius', cat: 'custom', tags: 'serius tekad fokus yakin' },
  { id: 'c33', text: '( * ¯ ㅂ ¯ * )', name: 'Mabuk Kepayang', cat: 'custom', tags: 'senang santai melayang mabuk' },
  { id: 'c34', text: '( > ▱ < )', name: 'Menjerit Frustrasi', cat: 'custom', tags: 'teriak jerit panik pusing' },
  { id: 'c35', text: '( T ᴖ T )', name: 'Menangis Pilu', cat: 'custom', tags: 'sedih nangis airmata sedih' },

  // Baris 8
  { id: 'c36', text: '( ‾́ ▱ ‾́ )', name: 'Menyerah Pasrah', cat: 'custom', tags: 'lemas menyerah pasrah cape' },
  { id: 'c37', text: '( •̀ ᵤ •́ )', name: 'Fokus Tajam', cat: 'custom', tags: 'fokus tekad tajam' },
  { id: 'c38', text: '( ´ ‸ ` ; )', name: 'Cemas Keringat', cat: 'custom', tags: 'cemas gugup keringat waswas' },
  { id: 'c39', text: '( T ^ T )', name: 'Menangis Tersedu', cat: 'custom', tags: 'sedih nangis nangis patah' },
  { id: 'c40', text: '( / ¯ ㅂ ¯ / )', name: 'Menari Gembira', cat: 'custom', tags: 'joget nari gembira santai riang' },
];

/* ── Pustaka Kaomoji Bawaan ── */
export const HAMOJI_LIBRARY = [
  // Populer & Ikonik
  { id: 'h1', text: '(｡•̀ᴗ-)✧', name: 'Wink Ikonik', cat: 'populer', tags: 'wink keren senyum bintang' },
  { id: 'h2', text: '(˶ᵔ ᵕ ᵔ˶)', name: 'Senyum Damai', cat: 'populer', tags: 'senyum imut bahagia senang' },
  { id: 'h3', text: '(♡ v ♡)', name: 'Cinta Berbinar', cat: 'populer', tags: 'cinta love hati mata senang' },
  { id: 'h4', text: '( ˆ ◡ ˆ )', name: 'Senyum Lembut', cat: 'populer', tags: 'senyum manis damai lembut' },
  { id: 'h5', text: 'ʕ•ᴥ•ʔ', name: 'Beruang', cat: 'populer', tags: 'beruang hewan bear imut' },
  { id: 'h6', text: '¯\\_(ツ)_/¯', name: 'Shrug', cat: 'populer', tags: 'shrug santai angkat tangan' },
  { id: 'h7', text: '( ˆ ᗜ ˆ )', name: 'Tertawa Lepas', cat: 'populer', tags: 'tertawa tawa senang gembira' },
  { id: 'h8', text: '( ˃ ᵕ ˂ )', name: 'Malu Senang', cat: 'populer', tags: 'malu senang imut ceria' },
  { id: 'h9', text: '(= ˆ ◡ ˆ =)', name: 'Kucing Ceria', cat: 'populer', tags: 'kucing cat meow senyum' },
  { id: 'h10', text: '(ﾉ´ヮ`)ﾉ*: ･ﾟ', name: 'Tabur Bintang', cat: 'populer', tags: 'sihir bintang gembira' },
  { id: 'h11', text: '( •̀ᴗ•́ )و ̑̑', name: 'Semangat Juang', cat: 'populer', tags: 'semangat tekad gas' },
  { id: 'h12', text: '( ˘ ᗜ ˘ )', name: 'Lega Bahagia', cat: 'populer', tags: 'lega puas senang damai' },

  // Senang & Riang
  { id: 'h13', text: '(≥ ∇ ≤)', name: 'Sangat Riang', cat: 'senang', tags: 'riang gembira senang tawa' },
  { id: 'h14', text: '(> ω <)', name: 'Gemas Riang', cat: 'senang', tags: 'gemas senang imut ceria' },
  { id: 'h15', text: '( ‾́ 3 ‾́ )', name: 'Bersiul Manis', cat: 'senang', tags: 'siul santai bibir imut' },
  { id: 'h16', text: '(*^ω^)', name: 'Tertawa Riang', cat: 'senang', tags: 'senyum bahagia ketawa' },
  { id: 'h17', text: '(≧◡≦)', name: 'Mata Terpejam', cat: 'senang', tags: 'puas senang manis' },
  { id: 'h18', text: '(o^▽^o)', name: 'Tawa Lebar', cat: 'senang', tags: 'gembira riang tertawa' },
  { id: 'h19', text: '(★ω★)', name: 'Bintang Terpukau', cat: 'senang', tags: 'kagum terpukau bintang wow' },
  { id: 'h20', text: '( * ˆ ᴗ ˆ * )', name: 'Pipi Berseri', cat: 'senang', tags: 'senang pipi merah berseri' },
  { id: 'h21', text: '＼(≧▽≦)／', name: 'Sorak Bahagia', cat: 'senang', tags: 'hore hore menang hore' },
  { id: 'h22', text: '( / ¯ ㅂ ¯ / )', name: 'Menari Gembira', cat: 'senang', tags: 'joget nari gembira santai' },
  { id: 'h23', text: '(*˘︶˘*).｡.:*', name: 'Bersyukur', cat: 'senang', tags: 'damai bersyukur tenang' },

  // Imut & Kasih
  { id: 'h24', text: '(♡ ₃ ♡)', name: 'Penuh Kasih', cat: 'imut', tags: 'love cinta hati manis sayang' },
  { id: 'h25', text: '( ˆ ⍛ ˆ )', name: 'Polos Bengong', cat: 'imut', tags: 'bengong polos imut lucu' },
  { id: 'h26', text: '( ˘ ³˘)♥', name: 'Kecupan Manis', cat: 'imut', tags: 'kiss cium cinta love' },
  { id: 'h27', text: '(„• ֊ •„)', name: 'Sopan Imut', cat: 'imut', tags: 'imut pemalu lucu' },
  { id: 'h28', text: '(⁄ ⁄•⁄ω⁄•⁄ ⁄)', name: 'Pipi Merah', cat: 'imut', tags: 'blush malu merah imut' },
  { id: 'h29', text: '(◕‿◕)♡', name: 'Bunga Hati', cat: 'imut', tags: 'hati cinta manis gemas' },
  { id: 'h30', text: '(｡♥‿♥｡)', name: 'Terpesona', cat: 'imut', tags: 'jatuh cinta cinta suka' },
  { id: 'h31', text: '(つ≧▽≦)つ', name: 'Pelukan Erat', cat: 'imut', tags: 'peluk hug sayang cinta' },
  { id: 'h32', text: '( ˃ ᵤ ˂ )', name: 'Malu Meringis', cat: 'imut', tags: 'malu imut gemas merah' },
  { id: 'h33', text: '( * ¯ ㅂ ¯ * )', name: 'Mabuk Kepayang', cat: 'imut', tags: 'senang santai melayang' },

  // Hewan & Karakter
  { id: 'h34', text: '(=^･ｪ･^=)', name: 'Kucing Penasaran', cat: 'hewan', tags: 'kucing cat meow kumis' },
  { id: 'h35', text: '( ˆ(oo)ˆ )', name: 'Babi Lucu', cat: 'hewan', tags: 'babi pig hewan lucu' },
  { id: 'h36', text: '(ᵔᴥᵔ)', name: 'Anjing Ceria', cat: 'hewan', tags: 'anjing dog puppy imut' },
  { id: 'h37', text: '₍ᐢ. ̫.ᐢ₎', name: 'Kelinci Imut', cat: 'hewan', tags: 'kelinci bunny imut' },
  { id: 'h38', text: 'U ´ᴥ` U', name: 'Anjing Menggemaskan', cat: 'hewan', tags: 'anjing puppy dog' },
  { id: 'h39', text: '(=^-ω-^=)', name: 'Kucing Tidur', cat: 'hewan', tags: 'kucing bobo santai' },
  { id: 'h40', text: '(=①ω①=)', name: 'Mata Bulat', cat: 'hewan', tags: 'kucing bulat mata' },
  { id: 'h41', text: '( ˙-˙ )', name: 'Burung Hantu', cat: 'hewan', tags: 'burung hantu diam' },

  // Ekspresi & Reaksi
  { id: 'h42', text: '( ; ˆ - ˆ ; )', name: 'Canggung Keringat', cat: 'ekspresi', tags: 'canggung keringat degdegan' },
  { id: 'h43', text: '( ˘ ▱ ˘ )', name: 'Tidur Nyenyak', cat: 'ekspresi', tags: 'tidur lelap tenang santai' },
  { id: 'h44', text: '( - _ - ; )', name: 'Lelah Pasrah', cat: 'ekspresi', tags: 'capek lelah pasrah' },
  { id: 'h45', text: '( ˘ ㅂ ˘ )', name: 'Puas Santai', cat: 'ekspresi', tags: 'puas santai tenang' },
  { id: 'h46', text: '( ´ ꒳ ` )', name: 'Nyaman Tenang', cat: 'ekspresi', tags: 'nyaman damai santai' },
  { id: 'h47', text: '( ˆ ‸ ˆ )', name: 'Cemberut Halus', cat: 'ekspresi', tags: 'cemberut ngambek halus' },
  { id: 'h48', text: '( - ‿ - ; )', name: 'Senyum Pasrah', cat: 'ekspresi', tags: 'senyum pasrah ikhlas' },
  { id: 'h49', text: '( - _ - # )', name: 'Kesal Menahan', cat: 'ekspresi', tags: 'kesal marah urat emosi' },
  { id: 'h50', text: '( - ᵤ - )', name: 'Senyum Tipis', cat: 'ekspresi', tags: 'senyum tipis misterius' },
  { id: 'h51', text: '( •̀ ᵤ •́ )', name: 'Bertekad Serius', cat: 'ekspresi', tags: 'serius tekad fokus' },
  { id: 'h52', text: '( > ▱ < )', name: 'Menjerit Frustrasi', cat: 'ekspresi', tags: 'teriak jerit panik pusing' },
  { id: 'h53', text: '( T ᴖ T )', name: 'Menangis Pilu', cat: 'ekspresi', tags: 'sedih nangis airmata' },
  { id: 'h54', text: '( ‾́ ▱ ‾́ )', name: 'Menyerah Lemas', cat: 'ekspresi', tags: 'lemas menyerah pasrah' },
  { id: 'h55', text: '( ´ ‸ ` ; )', name: 'Cemas Keringat', cat: 'ekspresi', tags: 'cemas gugup keringat' },
  { id: 'h56', text: '( T ^ T )', name: 'Menangis Tersedu', cat: 'ekspresi', tags: 'sedih nangis nangis' },
  { id: 'h57', text: '(╯°□°)╯︵ ┻━┻', name: 'Banting Meja', cat: 'ekspresi', tags: 'marah banting meja emosi' },
  { id: 'h58', text: '┬─┬ノ( º _ ºノ)', name: 'Meja Rapi', cat: 'ekspresi', tags: 'tenang meja rapi santai' },
  { id: 'h59', text: 'ಠ_ಠ', name: 'Tatap Serius', cat: 'ekspresi', tags: 'disapproval tatap serius' },

  // ASCII & Text Art
  { id: 'h60', text: '✧･ﾟ: *✧･ﾟ:*', name: 'Kilau Bintang', cat: 'ascii', tags: 'bintang kilau sparkle hiasan' },
  { id: 'h61', text: '(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧', name: 'Taburan Sihir', cat: 'ascii', tags: 'sihir bintang berkilau' },
  { id: 'h62', text: '♪♫*•♪', name: 'Notasi Musik', cat: 'ascii', tags: 'musik nada lagu nyanyi' },
  { id: 'h63', text: '[̲̅$̲̅(̲̅5̲̅)̲̅$̲̅]', name: 'Lembaran Uang', cat: 'ascii', tags: 'uang dollar cuan kaya' },
  { id: 'h64', text: '(☞ﾟヮﾟ)☞', name: 'Menunjuk Asyik', cat: 'ascii', tags: 'tunjuk keren asyik' },
  { id: 'h65', text: '─=≡Σ((( つ•̀ω•́)つ', name: 'Meluncur Cepat', cat: 'ascii', tags: 'lari cepat gas meluncur' },
  { id: 'h66', text: '☆*:.｡.o(≧▽≦)o.｡.:*☆', name: 'Pesta Gemerlap', cat: 'ascii', tags: 'pesta ramai meriah' },
  { id: 'h67', text: '(っ˘ڡ˘ς)', name: 'Lezat Nikmat', cat: 'ascii', tags: 'makan enak lezat sedap' },
  { id: 'h68', text: 'ʕノ)ᴥ(ヾʔ', name: 'Tutup Mata', cat: 'ascii', tags: 'tutup mata malu beruang' },
];

export const HAMOJI_CATEGORIES = [
  { id: 'semua', label: 'Semua' },
  { id: 'custom', label: 'Kustom' },
  { id: 'populer', label: 'Populer' },
  { id: 'senang', label: 'Senang' },
  { id: 'imut', label: 'Imut' },
  { id: 'hewan', label: 'Hewan' },
  { id: 'ekspresi', label: 'Ekspresi' },
  { id: 'ascii', label: 'ASCII Art' },
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

/* ── Pengambilan Koleksi Hamoji Aktif ── */
export function getFilteredHamojiList(cat = _currentCategory, query = _searchQuery) {
  const userCustomList = muatCustomHamoji();
  
  let all = [];
  if (cat === 'custom') {
    // Kategori Kustom: Gabungan kustom pengguna + 40 varian estetik bawaan dari referensi gambar
    all = [...userCustomList, ...HAMOJI_CUSTOM_PRESETS];
  } else if (cat === 'semua') {
    all = [...userCustomList, ...HAMOJI_CUSTOM_PRESETS, ...HAMOJI_LIBRARY];
    // Buang item id kembar jika ada
    const seen = new Set();
    all = all.filter(item => {
      if (seen.has(item.text)) return false;
      seen.add(item.text);
      return true;
    });
  } else {
    all = HAMOJI_LIBRARY.filter(item => item.cat === cat);
  }

  if (query && query.trim()) {
    const q = query.toLowerCase().trim();
    all = all.filter(
      item =>
        item.text.toLowerCase().includes(q) ||
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.tags && item.tags.toLowerCase().includes(q))
    );
  }

  return all;
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
export function tambahStikerHamoji(text, color = _currentColor) {
  const note = state.notes.find(n => n.id === state.openId);
  if (!note) return;

  if (!Array.isArray(note.stickers)) {
    note.stickers = [];
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
    x: startX,
    y: startY,
    size: 24,
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
    const textStyle = s.color ? `color:${esc(s.color)};` : '';
    return `
      <div class="hamoji-sticker" data-stk-id="${esc(s.id)}" style="left:${s.x || 0}px;top:${s.y || 0}px;--stk-size:${s.size || 24}px">
        <div class="hamoji-stk-body">
          <span class="hamoji-stk-text" style="${textStyle}">${esc(s.text)}</span>
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
  document.querySelectorAll('.hamoji-item-text').forEach(el => {
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
          const isCustom = item.cat === 'custom' || isCustomTab;
          const itemColorStyle = _currentColor ? `color:${esc(_currentColor)};` : '';
          return `
            <button type="button" class="hamoji-item-card ${isWide ? 'is-wide' : ''}" data-hamoji-insert="${esc(item.text)}" data-is-custom="${isCustom ? '1' : '0'}">
              <div class="hamoji-item-text" style="${itemColorStyle}">${esc(item.text)}</div>
              <div class="hamoji-item-name">${esc(item.name || '')}</div>
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
      const isCustom = itemCard.dataset.isCustom === '1';
      const mode = getHamojiMode();
      closeAll();

      // Custom moji selalu otomatis ditempelkan sebagai stiker agar simbol tidak rusak
      if (mode === 'sticker' || isCustom) {
        tambahStikerHamoji(text, _currentColor);
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
          const isCustom = item.cat === 'custom' || _currentCategory === 'custom';
          const itemColorStyle = _currentColor ? `color:${esc(_currentColor)};` : '';
          return `
            <button type="button" class="hamoji-item-card ${isWide ? 'is-wide' : ''}" data-hamoji-insert="${esc(item.text)}" data-is-custom="${isCustom ? '1' : '0'}">
              <div class="hamoji-item-text" style="${itemColorStyle}">${esc(item.text)}</div>
              <div class="hamoji-item-name">${esc(item.name || '')}</div>
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
