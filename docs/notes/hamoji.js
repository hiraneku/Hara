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

import { state } from '../core/store.js?v=20260929140908';
import { touch } from './note-model.js?v=20260929140908';
import { saveSoon } from './editor/cleanup.js?v=20260929140908';
import { openPop, closeAll } from './menus/pop.js?v=20260929140908';
import { esc } from '../core/dom.js?v=20260929140908';
import { toast } from '../core/toast.js?v=20260929140908';
import { t as tr } from '../core/i18n.js?v=20260929140908';
import { ensureCaret, sel, docEl } from './editor/caret.js?v=20260929140908';
import { refresh } from './editor/cleanup.js?v=20260929140908';
import { normalizeWarna, hslKeRgb } from './editor/warna.js?v=20260929140908';
import { WARNA_UMUM, hexKeHsl, hslKeHex } from './menus/warna.js?v=20260929140908';

const STORAGE_MODE_KEY = 'hara.hamoji.mode';
const STORAGE_CUSTOM_KEY = 'hara.hamoji.custom';
const STORAGE_COLOR_KEY = 'hara.hamoji.color';

/* ── Pustaka Template Moji Kustom Eksklusif Stiker (40 Varian Otentik Sesuai Foto Pinterest) ── */
export const CUSTOM_MOJI_TEMPLATES = {
  // Baris 1
  c1: {
    id: 'c1',
    name: 'Cinta Berbinar Pink Hati',
    tags: 'love hati cinta mata pink berbinar',
    text: '(♡ v ♡)',
    html: `(<span class="h-heart">♡</span> v <span class="h-heart">♡</span>)`,
  },
  c2: {
    id: 'c2',
    name: 'Sangat Riang',
    tags: 'senang riang tawa delta',
    text: '(≥ ∇ ≤)',
    html: `(≥ ∇ ≤)`,
  },
  c3: {
    id: 'c3',
    name: 'Bersiul Pipi Hati',
    tags: 'siul santai bibir manis pink hati',
    text: '(♡ ‾́ 3 ‾́ ♡)',
    html: `(<span class="h-heart">♡</span> ‾́ 3 ‾́ <span class="h-heart">♡</span>)`,
  },
  c4: {
    id: 'c4',
    name: 'Gemas Riang',
    tags: 'gemas senang imut ceria w',
    text: '(> ω <)',
    html: `(> ω <)`,
  },
  c5: {
    id: 'c5',
    name: 'Senyum Lebar Blush',
    tags: 'senyum tawa riang pipi merah blush',
    text: '(˚ ▱ ˚)',
    html: `(<span class="h-blush"></span> ˚ ▱ ˚ <span class="h-blush"></span>)`,
  },

  // Baris 2
  c6: {
    id: 'c6',
    name: 'Tertawa Lepas Blush',
    tags: 'tawa tertawa gembira blush garis',
    text: '(ˆ ▽ ˆ)',
    html: `(<span class="h-blush-lines">//</span> ˆ ▽ ˆ <span class="h-blush-lines">//</span>)`,
  },
  c7: {
    id: 'c7',
    name: 'Senyum Lembut',
    tags: 'senyum manis damai lembut',
    text: '(^ ‿ ^)',
    html: `(^ ‿ ^)`,
  },
  c8: {
    id: 'c8',
    name: 'Mata Garis Tenang',
    tags: 'tenang santai damai strip',
    text: '(^ --- ^)',
    html: `(^ --- ^)`,
  },
  c9: {
    id: 'c9',
    name: 'Penuh Kasih Pink Hati',
    tags: 'cinta love hati manis pink',
    text: '(♡ ₃ ♡)',
    html: `(<span class="h-heart">♡</span> ₃ <span class="h-heart">♡</span>)`,
  },
  c10: {
    id: 'c10',
    name: 'Gemas Melet Lidah Pink',
    tags: 'gemas imut lidah melet pink',
    text: '(> 👅 <)',
    html: `(> <svg class="h-svg-tongue" viewBox="0 0 24 16" width="1.2em" height="0.8em" style="vertical-align:middle;display:inline-block"><path d="M4,4 Q12,12 20,4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M9,7 Q9,14 12,14 Q15,14 15,7 Z" fill="#ff6b8b" stroke="currentColor" stroke-width="1.5"/></svg> <)`,
  },

  // Baris 3
  c11: {
    id: 'c11',
    name: 'Malu Senang Blush',
    tags: 'malu senang imut ceria blush',
    text: '(> ‿ <)',
    html: `(<span class="h-blush"></span> > ‿ < <span class="h-blush"></span>)`,
  },
  c12: {
    id: 'c12',
    name: 'Polos Bengong',
    tags: 'bengong polos imut lucu o',
    text: '(^ ӧ ^)',
    html: `(^ ӧ ^)`,
  },
  c13: {
    id: 'c13',
    name: 'Kecupan Manis Tetes',
    tags: 'cium love cinta manis tetes',
    text: '(♡„ 3 ♡)',
    html: `(<span class="h-heart">♡</span><span class="h-sweat-tick">„</span> 3 <span class="h-heart">♡</span>)`,
  },
  c14: {
    id: 'c14',
    name: 'Pipi Bintang Berseri',
    tags: 'pipi berseri bintang senang sparkle',
    text: '(* ^ ᴗ ^ *)',
    html: `(<svg class="h-svg-star" viewBox="0 0 20 20" width="0.8em" height="0.8em" style="vertical-align:middle;display:inline-block;color:#f59e0b;margin:0 2px"><path d="M10,1 L12.5,7.5 L19,10 L12.5,12.5 L10,19 L7.5,12.5 L1,10 L7.5,7.5 Z" fill="currentColor"/></svg> ^ ᴗ ^ <svg class="h-svg-star" viewBox="0 0 20 20" width="0.8em" height="0.8em" style="vertical-align:middle;display:inline-block;color:#f59e0b;margin:0 2px"><path d="M10,1 L12.5,7.5 L19,10 L12.5,12.5 L10,19 L7.5,12.5 L1,10 L7.5,7.5 Z" fill="currentColor"/></svg>)`,
  },
  c15: {
    id: 'c15',
    name: 'Tatapan Kasih Segitiga',
    tags: 'hati cinta tatapan pink delta',
    text: '(♡ ∇ ♡)',
    html: `(<span class="h-heart">♡</span> ∇ <span class="h-heart">♡</span>)`,
  },

  // Baris 4
  c16: {
    id: 'c16',
    name: 'Kucing Ceria Kumis',
    tags: 'kucing cat meow kumis senyum',
    text: '(= ^ ‿ ^ =)',
    html: `(= ^ ‿ ^ =)`,
  },
  c17: {
    id: 'c17',
    name: 'Babi Imut Hidung',
    tags: 'babi pig lucu imut hidung',
    text: '( ˆ(oo)ˆ )',
    html: `( ˆ(oo)ˆ )`,
  },
  c18: {
    id: 'c18',
    name: 'Canggung Keringat Ganda',
    tags: 'canggung keringat degdegan tetes',
    text: '(;; - . -)',
    html: `(<svg class="h-svg-drops" viewBox="0 0 16 20" width="0.8em" height="1em" style="vertical-align:middle;display:inline-block;color:#38bdf8;margin:0 2px"><path d="M5,7 Q2,12 5,14 Q8,12 5,7 Z M11,3 Q8,8 11,10 Q14,8 11,3 Z" fill="currentColor"/></svg> - . - )`,
  },
  c19: {
    id: 'c19',
    name: 'Tidur Nyenyak',
    tags: 'tidur lelap tenang santai kotak',
    text: '(˘ ▱ ˘)',
    html: `(˘ ▱ ˘)`,
  },
  c20: {
    id: 'c20',
    name: 'Lelah Pasrah Keringat',
    tags: 'capek lelah pasrah keringat tetes',
    text: '(- _ - ;)',
    html: `(- _ - <svg class="h-svg-tear" viewBox="0 0 12 18" width="0.65em" height="0.95em" style="vertical-align:middle;display:inline-block;color:#38bdf8;margin-left:2px"><path d="M6,2 Q1,10 6,15 Q11,10 6,2 Z" fill="currentColor"/></svg> )`,
  },

  // Baris 5
  c21: {
    id: 'c21',
    name: 'Lega Menghela Napas',
    tags: 'lega napas hembus santai angin puff',
    text: '(˘ ▽ ˘) 💨',
    html: `(<svg class="h-svg-puff" viewBox="0 0 20 20" width="0.9em" height="0.9em" style="vertical-align:middle;display:inline-block;color:#94a3b8;margin-right:2px"><path d="M14,14 Q10,12 8,15 Q5,15 5,12 Q5,9 9,9 Q10,6 14,7 Q17,7 17,10 Q19,11 18,13 Q17,15 14,14 Z" fill="currentColor" opacity="0.8"/><circle cx="4" cy="16" r="1.5" fill="currentColor" opacity="0.6"/></svg> ˘ ▽ ˘ )`,
  },
  c22: {
    id: 'c22',
    name: 'Malu Merona Garis',
    tags: 'malu merona blush garis kotak',
    text: '(// ㅂ //)',
    html: `(<span class="h-blush-lines">//</span> ㅂ <span class="h-blush-lines">//</span>)`,
  },
  c23: {
    id: 'c23',
    name: 'Mengantuk Datar',
    tags: 'kantuk ngantuk tidur diam datar',
    text: '(- . -)',
    html: `(- . -)`,
  },
  c24: {
    id: 'c24',
    name: 'Damai Imut Blush',
    tags: 'damai tenang imut kalem blush w',
    text: '(˘ ω ˘)',
    html: `(<span class="h-blush"></span> ˘ ω ˘ <span class="h-blush"></span>)`,
  },
  c25: {
    id: 'c25',
    name: 'Cemberut Khawatir',
    tags: 'cemberut ngambek halus cemas sedih',
    text: '(˚ ‸ ˚)',
    html: `(˚ ‸ ˚)`,
  },

  // Baris 6
  c26: {
    id: 'c26',
    name: 'Terkejut Riang Blush',
    tags: 'kaget senang terkejut riang blush',
    text: '(˚ ▱ ˚)',
    html: `(<span class="h-blush"></span> ˚ ▱ ˚ <span class="h-blush"></span>)`,
  },
  c27: {
    id: 'c27',
    name: 'Senyum Pasrah Keringat',
    tags: 'senyum pasrah ikhlas keringat tetes',
    text: '(- ‿ - ;;)',
    html: `(- ‿ - <svg class="h-svg-drops" viewBox="0 0 16 20" width="0.8em" height="1em" style="vertical-align:middle;display:inline-block;color:#38bdf8;margin:0 2px"><path d="M5,7 Q2,12 5,14 Q8,12 5,7 Z M11,3 Q8,8 11,10 Q14,8 11,3 Z" fill="currentColor"/></svg> )`,
  },
  c28: {
    id: 'c28',
    name: 'Kesal Menahan Diri',
    tags: 'kesal marah urat emosi pagar tag',
    text: '(- _ - #)',
    html: `(- _ - <span class="h-anger-mark">#</span> )`,
  },
  c29: {
    id: 'c29',
    name: 'Senyum Santai Smug',
    tags: 'senyum santai kalem manis',
    text: '(- ‿ -)',
    html: `(- ‿ -)`,
  },
  c30: {
    id: 'c30',
    name: 'Puas Bahagia Blush',
    tags: 'puas senang bahagia tawa blush',
    text: '(˘ ▽ ˘)',
    html: `(<span class="h-blush"></span> ˘ ▽ ˘ <span class="h-blush"></span>)`,
  },

  // Baris 7
  c31: {
    id: 'c31',
    name: 'Kesal Gemas Urat Marah',
    tags: 'kesal marah gemas urat merah',
    text: '( ˃ ᵤ ˂ 💢 )',
    html: `( ˘ ‸ ˘ <svg class="h-svg-anger" viewBox="0 0 24 24" width="0.9em" height="0.9em" style="vertical-align:middle;display:inline-block;color:#ef4444;margin-left:2px"><path d="M4,10 L10,10 L10,4 M14,4 L14,10 L20,10 M20,14 L14,14 L14,20 M10,20 L10,14 L4,14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg> )`,
  },
  c32: {
    id: 'c32',
    name: 'Bulat Imut Kucing',
    tags: 'bulat imut mata titik w kucing',
    text: '(˚ ω ˚)',
    html: `(˚ ω ˚)`,
  },
  c33: {
    id: 'c33',
    name: 'Mabuk Kepayang Bintang',
    tags: 'senang santai melayang bintang sparkle',
    text: '(* ¯ ㅂ ¯ *)',
    html: `(<svg class="h-svg-star" viewBox="0 0 20 20" width="0.8em" height="0.8em" style="vertical-align:middle;display:inline-block;color:#f59e0b;margin:0 2px"><path d="M10,1 L12.5,7.5 L19,10 L12.5,12.5 L10,19 L7.5,12.5 L1,10 L7.5,7.5 Z" fill="currentColor"/></svg> ¯ ㅂ ¯ <svg class="h-svg-star" viewBox="0 0 20 20" width="0.8em" height="0.8em" style="vertical-align:middle;display:inline-block;color:#f59e0b;margin:0 2px"><path d="M10,1 L12.5,7.5 L19,10 L12.5,12.5 L10,19 L7.5,12.5 L1,10 L7.5,7.5 Z" fill="currentColor"/></svg>)`,
  },
  c34: {
    id: 'c34',
    name: 'Menjerit Panik',
    tags: 'teriak jerit panik pusing kotak',
    text: '(> ▱ <)',
    html: `(> ▱ <)`,
  },
  c35: {
    id: 'c35',
    name: 'Menangis Pilu',
    tags: 'sedih nangis airmata sedih t',
    text: '(T ^ T)',
    html: `(T ^ T)`,
  },

  // Baris 8
  c36: {
    id: 'c36',
    name: 'Menyerah Menetes Air Mata',
    tags: 'lemas menyerah pasrah nangis tetes',
    text: '(‾́ ▱ T)',
    html: `(‾́ ▱ <span class="h-tear-stream">T</span>)`,
  },
  c37: {
    id: 'c37',
    name: 'Bertekad Alis Tajam',
    tags: 'fokus tekad tajam alis serius w',
    text: '(•̀ ω •́)',
    html: `(•̀ ω •́)`,
  },
  c38: {
    id: 'c38',
    name: 'Cemas Tetes Air Mata',
    tags: 'cemas gugup keringat airmata tetes sedih',
    text: '(˘ ︵ ˘ 💧)',
    html: `(˘ ︵ ˘ <svg class="h-svg-tear" viewBox="0 0 12 18" width="0.65em" height="0.95em" style="vertical-align:middle;display:inline-block;color:#38bdf8;margin-left:2px"><path d="M6,2 Q1,10 6,15 Q11,10 6,2 Z" fill="currentColor"/></svg> )`,
  },
  c39: {
    id: 'c39',
    name: 'Menangis Tersedu Lebar',
    tags: 'sedih nangis nangis patah t',
    text: '(T ⁔ T)',
    html: `(T ⁔ T)`,
  },
  c40: {
    id: 'c40',
    name: 'Menari Gembira Bahagia',
    tags: 'joget nari gembira santai riang tangan',
    text: '( / ¯ ㅂ ¯ / )',
    html: `( / ¯ ㅂ ¯ / )`,
  },
};

/* ── Pustaka Kaomoji Kustom Bawaan (Otentik dari Referensi Gambar Pinterest) ── */
export const HAMOJI_CUSTOM_PRESETS = Object.keys(CUSTOM_MOJI_TEMPLATES).map(id => {
  const item = CUSTOM_MOJI_TEMPLATES[id];
  return {
    id: item.id,
    text: item.text,
    name: item.name,
    cat: 'custom',
    tags: item.tags,
    html: item.html,
    isCustom: true,
  };
});

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

/* ── Renderer Visual Moji Kustom & Stiker ── */
export function renderCustomMojiHtml(idOrText, textFallback = '', color = '') {
  let template = CUSTOM_MOJI_TEMPLATES[idOrText];
  if (!template) {
    const foundId = Object.keys(CUSTOM_MOJI_TEMPLATES).find(
      k => CUSTOM_MOJI_TEMPLATES[k].text === idOrText || CUSTOM_MOJI_TEMPLATES[k].text === textFallback
    );
    if (foundId) template = CUSTOM_MOJI_TEMPLATES[foundId];
  }

  const colorStyle = color ? `color:${esc(color)};` : '';
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
            <button type="button" class="hamoji-item-card ${isWide ? 'is-wide' : ''}" data-hamoji-insert="${esc(item.text)}" data-custom-id="${esc(customId)}" data-is-custom="${isCustom ? '1' : '0'}">
              <div class="hamoji-item-preview-box">
                ${previewHtml}
              </div>
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
            <button type="button" class="hamoji-item-card ${isWide ? 'is-wide' : ''}" data-hamoji-insert="${esc(item.text)}" data-custom-id="${esc(customId)}" data-is-custom="${isCustom ? '1' : '0'}">
              <div class="hamoji-item-preview-box">
                ${previewHtml}
              </div>
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
