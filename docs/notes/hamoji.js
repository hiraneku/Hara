/**
 * Modul Hamoji — Kaomoji, Emoticon, ASCII Art & Stiker Interaktif untuk Catatan Hara
 *
 * Desain modern & clean (tanpa elemen AI slop):
 * - 2 Mode: Mode Teks (sisip teks di kursor) & Mode Stiker (stiker terapung interaktif)
 * - Pustaka Kaomoji tematik (Populer, Senang, Imut, Hewan, Ekspresi, ASCII Art)
 * - Dukungan Kaomoji Kustom (tersimpan di localStorage)
 * - Mesin interaksi stiker: seret/geser bebas (touch/pointer), ubah ukuran (resize), hapus
 */

import { state } from '../core/store.js?v=20260929120314';
import { touch } from './note-model.js?v=20260929120314';
import { saveSoon } from './editor/cleanup.js?v=20260929120314';
import { openPop, closeAll } from './menus/pop.js?v=20260929120314';
import { esc } from '../core/dom.js?v=20260929120314';
import { toast } from '../core/toast.js?v=20260929120314';
import { t as tr } from '../core/i18n.js?v=20260929120314';
import { ensureCaret, sel, docEl } from './editor/caret.js?v=20260929120314';
import { refresh } from './editor/cleanup.js?v=20260929120314';

const STORAGE_MODE_KEY = 'hara.hamoji.mode';
const STORAGE_CUSTOM_KEY = 'hara.hamoji.custom';

/* ── Pustaka Kaomoji Bawaan ── */
export const HAMOJI_LIBRARY = [
  // Populer & Ikonik
  { id: 'h1', text: '(｡•̀ᴗ-)✧', name: 'Wink Ikonik', cat: 'populer', tags: 'wink keren senyum bintang' },
  { id: 'h2', text: '(˶ᵔ ᵕ ᵔ˶)', name: 'Senyum Damai', cat: 'populer', tags: 'senyum imut bahagia senang' },
  { id: 'h3', text: '(๑>◡<๑)', name: 'Riang Gembira', cat: 'populer', tags: 'ceria excited gembira' },
  { id: 'h4', text: 'ʕ•ᴥ•ʔ', name: 'Beruang', cat: 'populer', tags: 'beruang hewan bear imut' },
  { id: 'h5', text: '¯\\_(ツ)_/¯', name: 'Shrug', cat: 'populer', tags: 'shrug santai angkat tangan' },
  { id: 'h6', text: '(⁠◕⁠ᴗ⁠◕⁠✿)', name: 'Bunga', cat: 'populer', tags: 'bunga senyum ceria cantik' },
  { id: 'h7', text: '(⁄ ⁄>⁄ ▽ ⁄<⁄ ⁄)', name: 'Malu-Malu', cat: 'populer', tags: 'malu blush imut merah' },
  { id: 'h8', text: '(づ｡◕‿‿◕｡)づ', name: 'Peluk Hangat', cat: 'populer', tags: 'peluk hug sayang ramah' },
  { id: 'h9', text: '(=^･ω･^=)', name: 'Kucing Manis', cat: 'populer', tags: 'kucing cat meow hewan' },
  { id: 'h10', text: '(ﾉ´ヮ`)ﾉ*: ･ﾟ', name: 'Tabur Bintang', cat: 'populer', tags: 'sihir bintang gembira' },
  { id: 'h11b', text: '( •̀ᴗ•́ )و ̑̑', name: 'Semangat Juang', cat: 'populer', tags: 'semangat tekad gas' },
  { id: 'h12b', text: '(¬‿¬)', name: 'Senyum Misterius', cat: 'populer', tags: 'senyum misterius smirking' },

  // Senang & Bahagia
  { id: 'h11', text: '(✿◠‿◠)', name: 'Senyum Manis', cat: 'senang', tags: 'senyum bunga ceria manis' },
  { id: 'h12', text: '(*^ω^)', name: 'Tertawa Riang', cat: 'senang', tags: 'senyum bahagia ketawa' },
  { id: 'h13', text: '(≧◡≦)', name: 'Mata Terpejam', cat: 'senang', tags: 'puas senang manis' },
  { id: 'h14', text: '(o^▽^o)', name: 'Tawa Lebar', cat: 'senang', tags: 'gembira riang tertawa' },
  { id: 'h15', text: '(★ω★)', name: 'Bintang Terpukau', cat: 'senang', tags: 'kagum terpukau bintang wow' },
  { id: 'h16', text: '(＾▽＾)', name: 'Senyum Hangat', cat: 'senang', tags: 'senang ramah santai' },
  { id: 'h17', text: '＼(≧▽≦)／', name: 'Sorak Bahagia', cat: 'senang', tags: 'hore hore menang hore' },
  { id: 'h18', text: '(⌒‿⌒)', name: 'Tenang Bahagia', cat: 'senang', tags: 'senang kalem senyum' },
  { id: 'h18b', text: '(*˘︶˘*).｡.:*', name: 'Bersyukur', cat: 'senang', tags: 'damai bersyukur tenang' },
  { id: 'h18c', text: '( ˘ ³˘)♥', name: 'Cium Manis', cat: 'senang', tags: 'cium kiss love manis' },

  // Imut & Kasih
  { id: 'h19', text: '(♡˙︶˙♡)', name: 'Penuh Kasih', cat: 'imut', tags: 'love cinta hati manis sayang' },
  { id: 'h20', text: '(„• ֊ •„)', name: 'Sopan Imut', cat: 'imut', tags: 'imut pemalu lucu' },
  { id: 'h21', text: '(⁄ ⁄•⁄ω⁄•⁄ ⁄)', name: 'Pipi Merah', cat: 'imut', tags: 'blush malu merah imut' },
  { id: 'h23', text: '(◕‿◕)♡', name: 'Bunga Hati', cat: 'imut', tags: 'hati cinta manis gemas' },
  { id: 'h24', text: '(｡♥‿♥｡)', name: 'Terpesona', cat: 'imut', tags: 'jatuh cinta cinta suka' },
  { id: 'h25', text: '(੭ˊᵕˋ)੭', name: 'Cerah Ceria', cat: 'imut', tags: 'semangat hore lucu' },
  { id: 'h26', text: '(つ≧▽≦)つ', name: 'Pelukan Erat', cat: 'imut', tags: 'peluk hug sayang cinta' },
  { id: 'h26b', text: '(๑•́ ₃ •̀๑)', name: 'Manja Imut', cat: 'imut', tags: 'manja bibir cemberut imut' },
  { id: 'h26c', text: '(๑•̀ㅂ•́)و✧', name: 'Tekad Kuat', cat: 'imut', tags: 'semangat tekad imut' },

  // Hewan & Karakter
  { id: 'h27', text: '(=^･ｪ･^=)', name: 'Kucing Penasaran', cat: 'hewan', tags: 'kucing cat meow kumis' },
  { id: 'h28', text: '(ᵔᴥᵔ)', name: 'Anjing Ceria', cat: 'hewan', tags: 'anjing dog puppy imut' },
  { id: 'h29', text: '(=^-ω-^=)', name: 'Kucing Tidur', cat: 'hewan', tags: 'kucing bobo santai' },
  { id: 'h30', text: '(・ω・)', name: 'Kelinci Makhluk', cat: 'hewan', tags: 'kelinci lucu hewan' },
  { id: 'h31', text: 'U ´ᴥ` U', name: 'Anjing Menggemaskan', cat: 'hewan', tags: 'anjing puppy dog' },
  { id: 'h32', text: '(￣(oo)￣)', name: 'Babi Lucu', cat: 'hewan', tags: 'babi pig lucu' },
  { id: 'h33', text: '(=①ω①=)', name: 'Mata Bulat', cat: 'hewan', tags: 'kucing bulat mata' },
  { id: 'h33b', text: '( ˙-˙ )', name: 'Burung Hantu', cat: 'hewan', tags: 'burung hantu diam' },
  { id: 'h33c', text: '₍ᐢ. ̫.ᐢ₎', name: 'Kelinci Imut', cat: 'hewan', tags: 'kelinci hewan imut' },

  // Ekspresi & Reaksi
  { id: 'h34', text: '(•_•)', name: 'Netral', cat: 'ekspresi', tags: 'datar netral diam' },
  { id: 'h35', text: '(¬_¬)', name: 'Melirik Curiga', cat: 'ekspresi', tags: 'curiga lirik side eye' },
  { id: 'h36', text: '(╯°□°)╯︵ ┻━┻', name: 'Banting Meja', cat: 'ekspresi', tags: 'marah banting meja emosi' },
  { id: 'h37', text: '┬─┬ノ( º _ ºノ)', name: 'Meja Rapi', cat: 'ekspresi', tags: 'tenang meja rapi santai' },
  { id: 'h38', text: 'ಠ_ಠ', name: 'Tatap Serius', cat: 'ekspresi', tags: 'disapproval tatap serius' },
  { id: 'h39', text: '( ; ω ; )', name: 'Menangis Terharu', cat: 'ekspresi', tags: 'nangis sedih air mata terharu' },
  { id: 'h40', text: '( ╥ω╥ )', name: 'Menangis Sedih', cat: 'ekspresi', tags: 'sedih nangis patah hati' },
  { id: 'h41', text: '(>_<)', name: 'Meringis', cat: 'ekspresi', tags: 'aduh pusing sakit malu' },
  { id: 'h42', text: '(°ロ°) !', name: 'Terkejut', cat: 'ekspresi', tags: 'kaget shocked terkejut' },
  { id: 'h42b', text: '(ง\'̀-\'́)ง', name: 'Siap Bertarung', cat: 'ekspresi', tags: 'tinju tarung semangat' },
  { id: 'h42c', text: '(⊙_⊙)', name: 'Melotot Kaget', cat: 'ekspresi', tags: 'melotot kaget heran' },

  // ASCII & Text Art
  { id: 'h43', text: '✧･ﾟ: *✧･ﾟ:*', name: 'Kilau Bintang', cat: 'ascii', tags: 'bintang kilau sparkle hiasan' },
  { id: 'h44', text: '(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧', name: 'Taburan Sihir', cat: 'ascii', tags: 'sihir bintang berkilau' },
  { id: 'h45', text: '♪♫*•♪', name: 'Notasi Musik', cat: 'ascii', tags: 'musik nada lagu nyanyi' },
  { id: 'h46', text: '[̲̅$̲̅(̲̅5̲̅)̲̅$̲̅]', name: 'Lembaran Uang', cat: 'ascii', tags: 'uang dollar cuan kaya' },
  { id: 'h47', text: '(☞ﾟヮﾟ)☞', name: 'Menunjuk Asyik', cat: 'ascii', tags: 'tunjuk keren asyik' },
  { id: 'h48', text: '─=≡Σ((( つ•̀ω•́)つ', name: 'Meluncur Cepat', cat: 'ascii', tags: 'lari cepat gas meluncur' },
  { id: 'h49', text: '☆*:.｡.o(≧▽≦)o.｡.:*☆', name: 'Pesta Gemerlap', cat: 'ascii', tags: 'pesta ramai meriah' },
  { id: 'h50', text: '(っ˘ڡ˘ς)', name: 'Lezat Nikmat', cat: 'ascii', tags: 'makan enak lezat sedap' },
  { id: 'h51', text: 'ʕノ)ᴥ(ヾʔ', name: 'Tutup Mata', cat: 'ascii', tags: 'tutup mata malu beruang' },
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
export function sisipkanHamojiTeks(text) {
  const currentNote = state.notes.find(n => n.id === state.openId);
  const r = ensureCaret();

  if (!r) {
    const doc = docEl();
    if (doc) {
      const p = doc.querySelector('.b-p:last-child') || doc.firstElementChild;
      if (p) {
        p.appendChild(document.createTextNode(' ' + text));
      } else {
        doc.innerHTML += `<div class="b-p">${esc(text)}</div>`;
      }
    }
  } else {
    r.deleteContents();
    const textNode = document.createTextNode(text);
    r.insertNode(textNode);
    r.setStartAfter(textNode);
    r.setEndAfter(textNode);
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

/* ── Mode 2: Tempelkan sebagai Stiker Interaktif ── */
export function tambahStikerHamoji(text) {
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
}

export function hapusStikerHamoji(id) {
  const note = state.notes.find(n => n.id === state.openId);
  if (!note || !Array.isArray(note.stickers)) return;
  note.stickers = note.stickers.filter(s => s.id !== id);
  touch(note);
  saveSoon();
  sinkronkanStikerLayer(note);
}

/* ── Render HTML Layer Stiker untuk Catatan ── */
export function renderStickersHtml(stickers) {
  if (!Array.isArray(stickers) || stickers.length === 0) return '';
  return stickers.map(s => `
    <div class="hamoji-sticker" data-stk-id="${esc(s.id)}" style="left:${s.x || 0}px;top:${s.y || 0}px;--stk-size:${s.size || 24}px">
      <div class="hamoji-stk-body">
        <span class="hamoji-stk-text">${esc(s.text)}</span>
      </div>
      <div class="hamoji-stk-ctrls">
        <button type="button" class="hamoji-stk-del" data-stk-act="del" aria-label="${tr('Hapus Stiker')}">✕</button>
        <div class="hamoji-stk-resize" data-stk-act="resize" title="${tr('Ubah Ukuran')}"></div>
      </div>
    </div>
  `).join('');
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
          <svg class="ico"><use href="#i-pin"/></svg>
          <span>${tr('Mode Stiker')}</span>
        </button>
      </div>

      <!-- Caption Hint -->
      <div class="hamoji-hint-row">
        ${isSticker
          ? tr('Klik untuk menempelkan stiker bebas di catatan.')
          : tr('Klik untuk menyisipkan karakter pada posisi kursor.')}
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
          return `
            <button type="button" class="hamoji-item-card ${isWide ? 'is-wide' : ''}" data-hamoji-insert="${esc(item.text)}">
              <div class="hamoji-item-text">${esc(item.text)}</div>
              <div class="hamoji-item-name">${esc(item.name || '')}</div>
            </button>
          `;
        }).join('')}
      </div>

      <!-- Form Tambah Kaomoji Kustom -->
      <div class="hamoji-custom-add-box">
        <input type="text" class="hamoji-custom-input" id="hamoji-new-in" placeholder="${tr('Ketik kaomoji buatan sendiri...')}">
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

    const catBtn = e.target.closest('[data-hamoji-cat]');
    if (catBtn) {
      _currentCategory = catBtn.dataset.hamojiCat;
      bukaPanelHamoji(document.getElementById('hamoji-btn'));
      return;
    }

    const itemCard = e.target.closest('[data-hamoji-insert]');
    if (itemCard) {
      const text = itemCard.dataset.hamojiInsert;
      const mode = getHamojiMode();
      closeAll();

      if (mode === 'sticker') {
        tambahStikerHamoji(text);
      } else {
        sisipkanHamojiTeks(text);
      }
      return;
    }

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

    const delStkBtn = e.target.closest('[data-stk-act="del"]');
    if (delStkBtn) {
      const stkEl = delStkBtn.closest('.hamoji-sticker');
      if (stkEl) {
        const id = stkEl.dataset.stkId;
        const note = state.notes.find(n => n.id === state.openId);
        if (note && Array.isArray(note.stickers)) {
          note.stickers = note.stickers.filter(s => s.id !== id);
          touch(note);
          saveSoon();
          stkEl.remove();
          toast(tr('Stiker dihapus'));
        }
      }
      return;
    }

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
          return `
            <button type="button" class="hamoji-item-card ${isWide ? 'is-wide' : ''}" data-hamoji-insert="${esc(item.text)}">
              <div class="hamoji-item-text">${esc(item.text)}</div>
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

    if (!e.target.closest('.hamoji-stk-del')) {
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
