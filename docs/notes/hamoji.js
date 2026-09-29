/**
 * Modul Hamoji — Kaomoji, Emoticon, ASCII Art & Stiker Interaktif untuk Catatan Hara
 *
 * Fitur Utama:
 * 1. Mode Stiker Tanpa Background (transparan natural seperti teks asli).
 * 2. Koleksi Kaomoji Estetik & Unik (referensi Pinterest & otentik Jepang).
 * 3. Kustom Moji eksklusif Mode Stiker (agar karakter unik & multi-simbol tidak rusak di DOM teks).
 * 4. Kustomisasi Warna Penuh (Color Picker bebas / Hex Kustom / Palet Swatch).
 */

import { state } from '../core/store.js?v=20260929122204';
import { touch } from './note-model.js?v=20260929122204';
import { saveSoon } from './editor/cleanup.js?v=20260929122204';
import { openPop, closeAll } from './menus/pop.js?v=20260929122204';
import { esc } from '../core/dom.js?v=20260929122204';
import { toast } from '../core/toast.js?v=20260929122204';
import { t as tr } from '../core/i18n.js?v=20260929122204';
import { ensureCaret, sel, docEl } from './editor/caret.js?v=20260929122204';
import { refresh } from './editor/cleanup.js?v=20260929122204';

const STORAGE_MODE_KEY = 'hara.hamoji.mode';
const STORAGE_CUSTOM_KEY = 'hara.hamoji.custom';
const STORAGE_COLOR_KEY = 'hara.hamoji.color';

/* ── Pustaka Warna Swatch Cepat + Custom Bebas ── */
export const HAMOJI_COLOR_SWATCHES = [
  { label: 'Bawaan', hex: '' },
  { label: 'Pink Pastel', hex: '#ff758f' },
  { label: 'Soft Peach', hex: '#ff9e7d' },
  { label: 'Sunset Coral', hex: '#ff6b6b' },
  { label: 'Matcha Green', hex: '#52b788' },
  { label: 'Sky Blue', hex: '#4ea8de' },
  { label: 'Lavender', hex: '#9d4edd' },
  { label: 'Golden Amber', hex: '#f4a261' },
  { label: 'Dark Charcoal', hex: '#2b2d42' },
];

/* ── Pustaka Kaomoji Terkurasi (Pinterest & Japanese Aesthetic) ── */
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

  // Senang & Riang (Referensi Pinterest)
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

  // Imut & Kasih (Referensi Pinterest)
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

  // Hewan & Karakter (Referensi Pinterest)
  { id: 'h34', text: '(=^･ｪ･^=)', name: 'Kucing Penasaran', cat: 'hewan', tags: 'kucing cat meow kumis' },
  { id: 'h35', text: '( ˆ(oo)ˆ )', name: 'Babi Lucu', cat: 'hewan', tags: 'babi pig hewan lucu' },
  { id: 'h36', text: '(ᵔᴥᵔ)', name: 'Anjing Ceria', cat: 'hewan', tags: 'anjing dog puppy imut' },
  { id: 'h37', text: '₍ᐢ. ̫.ᐢ₎', name: 'Kelinci Imut', cat: 'hewan', tags: 'kelinci bunny imut' },
  { id: 'h38', text: 'U ´ᴥ` U', name: 'Anjing Menggemaskan', cat: 'hewan', tags: 'anjing puppy dog' },
  { id: 'h39', text: '(=^-ω-^=)', name: 'Kucing Tidur', cat: 'hewan', tags: 'kucing bobo santai' },
  { id: 'h40', text: '(=①ω①=)', name: 'Mata Bulat', cat: 'hewan', tags: 'kucing bulat mata' },
  { id: 'h41', text: '( ˙-˙ )', name: 'Burung Hantu', cat: 'hewan', tags: 'burung hantu diam' },

  // Ekspresi & Reaksi (Referensi Pinterest)
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
  { id: 'populer', label: 'Populer' },
  { id: 'senang', label: 'Senang' },
  { id: 'imut', label: 'Imut' },
  { id: 'hewan', label: 'Hewan' },
  { id: 'ekspresi', label: 'Ekspresi' },
  { id: 'ascii', label: 'ASCII Art' },
  { id: 'custom', label: 'Kustom' },
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
      name: item.name || 'Kustom',
      cat: 'custom',
      tags: item.tags || 'kustom custom',
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
  const customList = muatCustomHamoji();
  let all = [...customList, ...HAMOJI_LIBRARY];

  if (cat !== 'semua') {
    all = all.filter(item => item.cat === cat);
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
          ? tr('Kaomoji kustom ditempelkan sebagai stiker bebas tanpa background.')
          : isSticker
          ? tr('Klik untuk menempelkan stiker bebas transparan di catatan.')
          : tr('Klik untuk menyisipkan karakter pada posisi kursor.')}
      </div>

      <!-- Baris Pemilihan & Kustomisasi Warna -->
      <div class="hamoji-color-bar">
        <span class="hamoji-color-label">${tr('Warna:')}</span>
        <div class="hamoji-swatches">
          ${HAMOJI_COLOR_SWATCHES.map(sw => {
            const isSel = _currentColor === sw.hex;
            const bg = sw.hex || 'var(--text)';
            return `
              <button type="button" class="hamoji-swatch-btn ${isSel ? 'active' : ''}" data-hamoji-color="${esc(sw.hex)}" title="${esc(sw.label)}">
                <span class="hamoji-swatch-circle ${!sw.hex ? 'is-default' : ''}" style="background:${bg}"></span>
              </button>
            `;
          }).join('')}
          <label class="hamoji-color-picker-wrap" title="${tr('Pilih Warna Bebas (Hex / Color Picker)')}">
            <input type="color" class="hamoji-color-input" id="hamoji-custom-color" value="${_currentColor || '#ff758f'}">
            <span class="hamoji-color-picker-icon" style="${_currentColor ? `background:${_currentColor}` : ''}">
              <svg class="ico"><use href="#i-palette"/></svg>
            </span>
          </label>
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
          const isCustom = item.cat === 'custom';
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
        <input type="text" class="hamoji-custom-input" id="hamoji-new-in" placeholder="${tr('Ketik kaomoji buatan sendiri... (mode stiker)')}">
        <button type="button" class="btn btn-pri hamoji-add-btn" id="hamoji-add-btn">
          ${tr('Simpan')}
        </button>
      </div>
    </div>
  `;
}

export function bukaPanelHamoji(anchor) {
  openPop(panelHamojiHtml(), anchor);
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

    const colorBtn = e.target.closest('[data-hamoji-color]');
    if (colorBtn) {
      const color = colorBtn.dataset.hamojiColor;
      setHamojiColor(color);
      bukaPanelHamoji(document.getElementById('hamoji-btn'));
      return;
    }

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

    // Tombol Ubah Warna Stiker Langsung
    const stkColorBtn = e.target.closest('[data-stk-act="color"]');
    if (stkColorBtn) {
      const stkEl = stkColorBtn.closest('.hamoji-sticker');
      if (stkEl) {
        const id = stkEl.dataset.stkId;
        // Buka panel hamoji difokuskan untuk memilih warna
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

  // Custom Color Input Listener
  document.addEventListener('input', e => {
    if (e.target && e.target.id === 'hamoji-custom-color') {
      const hex = e.target.value;
      setHamojiColor(hex);
      const icon = document.querySelector('.hamoji-color-picker-icon');
      if (icon) icon.style.background = hex;
      // Update preview warna pada item kartu di grid
      document.querySelectorAll('.hamoji-item-text').forEach(el => {
        el.style.color = hex;
      });
      // Jika ada stiker yang sedang dipilih di kanvas, update warnanya
      const selStk = document.querySelector('.hamoji-sticker.selected');
      if (selStk) {
        ubahWarnaStiker(selStk.dataset.stkId, hex);
      }
    }

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
          const isCustom = item.cat === 'custom';
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
