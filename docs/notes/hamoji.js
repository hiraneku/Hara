/**
 * Modul Hamoji — Kaomoji, Emoticon, ASCII Art & Stiker Interaktif untuk Catatan Hara
 *
 * Fitur:
 * - 2 Mode: Mode Teks (sisip teks biasa di kursor) & Mode Stiker (stiker interaktif bisa digeser & diubah ukuran)
 * - Pustaka Kaomoji tematik (Populer, Senang, Imut, Hewan, Ekspresi, ASCII Art)
 * - Dukungan Kaomoji Kustom tersimpan (localStorage)
 * - Mesin interaksi stiker: seret/geser bebas (touch/pointer), ubah ukuran (resize handle), hapus, simpan permanen
 */

import { state } from '../core/store.js?v=20260929115253';
import { touch } from './note-model.js?v=20260929115253';
import { saveSoon } from './editor/cleanup.js?v=20260929115253';
import { openPop, closeAll } from './menus/pop.js?v=20260929115253';
import { esc } from '../core/dom.js?v=20260929115253';
import { toast } from '../core/toast.js?v=20260929115253';
import { t as tr } from '../core/i18n.js?v=20260929115253';
import { ensureCaret, sel, docEl } from './editor/caret.js?v=20260929115253';
import { refresh } from './editor/cleanup.js?v=20260929115253';

const STORAGE_MODE_KEY = 'hara.hamoji.mode';
const STORAGE_CUSTOM_KEY = 'hara.hamoji.custom';

/* ── Pustaka Kaomoji Bawaan ── */
export const HAMOJI_LIBRARY = [
  // Populer & Ikonik
  { id: 'h1', text: '(｡•̀ᴗ-)✧', name: 'Wink Ikonik', cat: 'populer', tags: 'wink keren senyum bintang' },
  { id: 'h2', text: '(˶ᵔ ᵕ ᵔ˶)', name: 'Senyum Damai', cat: 'populer', tags: 'senyum imut bahagia senang' },
  { id: 'h3', text: '(๑>◡<๑)', name: 'Sangat Senang', cat: 'populer', tags: 'ceria excited gembira' },
  { id: 'h4', text: 'ʕ•ᴥ•ʔ', name: 'Beruang Imut', cat: 'populer', tags: 'beruang hewan bear imut' },
  { id: 'h5', text: '¯\\_(ツ)_/¯', name: 'Shrug Masa Bodoh', cat: 'populer', tags: 'shrug santai angkat tangan' },
  { id: 'h6', text: '(⁠◕⁠ᴗ⁠◕⁠✿)', name: 'Bunga Imut', cat: 'populer', tags: 'bunga senyum ceria cantik' },
  { id: 'h7', text: '(⁄ ⁄>⁄ ▽ ⁄<⁄ ⁄)', name: 'Malu-Malu', cat: 'populer', tags: 'malu blush imut merah' },
  { id: 'h8', text: '(づ｡◕‿‿◕｡)づ', name: 'Pelukan Hangat', cat: 'populer', tags: 'peluk hug sayang ramah' },
  { id: 'h9', text: '(=^･ω･^=)', name: 'Kucing Manis', cat: 'populer', tags: 'kucing cat meow hewan' },
  { id: 'h10', text: '(ﾉ´ヮ`)ﾉ*: ･ﾟ', name: 'Tabur Bintang', cat: 'populer', tags: 'sihir bintang gembira' },

  // Senang & Bahagia
  { id: 'h11', text: '(✿◠‿◠)', name: 'Senyum Manis', cat: 'senang', tags: 'senyum bunga ceria manis' },
  { id: 'h12', text: '(*^ω^)', name: 'Tertawa Ceria', cat: 'senang', tags: 'senyum bahagia ketawa' },
  { id: 'h13', text: '(≧◡≦)', name: 'Mata Terpejam', cat: 'senang', tags: 'puas senang manis' },
  { id: 'h14', text: '(o^▽^o)', name: 'Tawa Lebar', cat: 'senang', tags: 'gembira riang tertawa' },
  { id: 'h15', text: '(★ω★)', name: 'Mata Bintang', cat: 'senang', tags: 'kagum terpukau bintang wow' },
  { id: 'h16', text: '(＾▽＾)', name: 'Senyum Hangat', cat: 'senang', tags: 'senang ramah santai' },
  { id: 'h17', text: '＼(≧▽≦)／', name: 'Sorak Bahagia', cat: 'senang', tags: 'hore hore menang hore' },
  { id: 'h18', text: '(⌒‿⌒)', name: 'Mata Sipit Bahagia', cat: 'senang', tags: 'senang kalem senyum' },

  // Imut & Kasih
  { id: 'h19', text: '(♡˙︶˙♡)', name: 'Penuh Cinta', cat: 'imut', tags: 'love cinta hati manis sayang' },
  { id: 'h20', text: '(„• ֊ •„)', name: 'Sopan & Imut', cat: 'imut', tags: 'imut pemalu lucu' },
  { id: 'h21', text: '(⁄ ⁄•⁄ω⁄•⁄ ⁄)', name: 'Pipi Merah', cat: 'imut', tags: 'blush malu merah imut' },
  { id: 'h22', text: '( ˘ ³˘)♥', name: 'Kecupan Cinta', cat: 'imut', tags: 'cium kiss love cinta' },
  { id: 'h23', text: '(◕‿◕)♡', name: 'Hati Berbunga', cat: 'imut', tags: 'hati cinta manis gemas' },
  { id: 'h24', text: '(｡♥‿♥｡)', name: 'Terpesona Cinta', cat: 'imut', tags: 'jatuh cinta cinta suka' },
  { id: 'h25', text: '(੭ˊᵕˋ)੭', name: 'Semangat Imut', cat: 'imut', tags: 'semangat hore lucu' },
  { id: 'h26', text: '(つ≧▽≦)つ', name: 'Peluk Erat', cat: 'imut', tags: 'peluk hug sayang cinta' },

  // Hewan & Karakter
  { id: 'h27', text: '(=^･ｪ･^=)', name: 'Kucing Penasaran', cat: 'hewan', tags: 'kucing cat meow kumis' },
  { id: 'h28', text: '(ᵔᴥᵔ)', name: 'Anjing Lucu', cat: 'hewan', tags: 'anjing dog puppy imut' },
  { id: 'h29', text: '(=^-ω-^=)', name: 'Kucing Tidur', cat: 'hewan', tags: 'kucing bobo santai' },
  { id: 'h30', text: '(・ω・)', name: 'Kelinci / Makhluk', cat: 'hewan', tags: 'kelinci lucu hewan' },
  { id: 'h31', text: 'U ´ᴥ` U', name: 'Anjing Telinga Panjang', cat: 'hewan', tags: 'anjing puppy dog' },
  { id: 'h32', text: '(￣(oo)￣)', name: 'Babi Lucu', cat: 'hewan', tags: 'babi pig lucu' },
  { id: 'h33', text: '(=①ω①=)', name: 'Mata Kucing Lebar', cat: 'hewan', tags: 'kucing bulat mata' },

  // Ekspresi & Reaksi
  { id: 'h34', text: '(•_•)', name: 'Lempeng / Datar', cat: 'ekspresi', tags: 'datar netral diam' },
  { id: 'h35', text: '(¬_¬)', name: 'Melirik Curiga', cat: 'ekspresi', tags: 'curiga lirik side eye' },
  { id: 'h36', text: '(╯°□°)╯︵ ┻━┻', name: 'Banting Meja', cat: 'ekspresi', tags: 'marah banting meja emosi' },
  { id: 'h37', text: '┬─┬ノ( º _ ºノ)', name: 'Pasang Meja Kembali', cat: 'ekspresi', tags: 'tenang meja rapi santai' },
  { id: 'h38', text: 'ಠ_ಠ', name: 'Tatapan Menghakimi', cat: 'ekspresi', tags: 'disapproval tatap serius' },
  { id: 'h39', text: '( ; ω ; )', name: 'Menangis Terharu', cat: 'ekspresi', tags: 'nangis sedih air mata terharu' },
  { id: 'h40', text: '( ╥ω╥ )', name: 'Menangis Deras', cat: 'ekspresi', tags: 'sedih nangis patah hati' },
  { id: 'h41', text: '(>_<)', name: 'Meringis', cat: 'ekspresi', tags: 'aduh pusing sakit malu' },
  { id: 'h42', text: '(°ロ°) !', name: 'Terkejut Kaget', cat: 'ekspresi', tags: 'kaget shocked terkejut' },

  // ASCII & Text Art
  { id: 'h43', text: '✧･ﾟ: *✧･ﾟ:*', name: 'Kilau Bintang', cat: 'ascii', tags: 'bintang kilau sparkle hiasan' },
  { id: 'h44', text: '(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧', name: 'Penyihir Berbintang', cat: 'ascii', tags: 'sihir bintang berkilau' },
  { id: 'h45', text: '♪♫*•♪', name: 'Alunan Musik', cat: 'ascii', tags: 'musik nada lagu nyanyi' },
  { id: 'h46', text: '[̲̅$̲̅(̲̅5̲̅)̲̅$̲̅]', name: 'Uang Kertas', cat: 'ascii', tags: 'uang dollar cuan kaya' },
  { id: 'h47', text: '(☞ﾟヮﾟ)☞', name: 'Tunjuk Menunjuk', cat: 'ascii', tags: 'tunjuk keren asyik' },
  { id: 'h48', text: '─=≡Σ((( つ•̀ω•́)つ', name: 'Lari Cepat / Gas', cat: 'ascii', tags: 'lari cepat gas meluncur' },
  { id: 'h49', text: '☆*:.｡.o(≧▽≦)o.｡.:*☆', name: 'Bintang Pesta', cat: 'ascii', tags: 'pesta ramai meriah' },
];

export const HAMOJI_CATEGORIES = [
  { id: 'semua', label: 'Semua' },
  { id: 'populer', label: '⭐ Populer' },
  { id: 'senang', label: '😊 Senang' },
  { id: 'imut', label: '💖 Imut' },
  { id: 'hewan', label: '🐱 Hewan' },
  { id: 'ekspresi', label: '🎭 Ekspresi' },
  { id: 'ascii', label: '✨ ASCII Art' },
  { id: 'custom', label: '➕ Kustom' },
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
      name: item.name || 'Kaomoji Saya',
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
  toast(tr('Kaomoji "{text}" disisipkan!', { text }));
}

/* ── Mode 2: Tempelkan sebagai Stiker Interaktif ── */
export function tambahStikerHamoji(text) {
  const note = state.notes.find(n => n.id === state.openId);
  if (!note) return;

  if (!Array.isArray(note.stickers)) {
    note.stickers = [];
  }

  // Cari posisi penempatan stiker (tengah viewport / area scroll aktif)
  const blocksEl = document.querySelector('.blocks');
  const scrollWrap = document.getElementById('wrap') || document.documentElement;
  const scrollTop = scrollWrap.scrollTop || 0;

  let startX = 30;
  let startY = Math.max(20, Math.min(scrollTop + 80, 500));

  // Variasi offset jika sudah ada stiker
  if (note.stickers.length > 0) {
    const offset = (note.stickers.length % 5) * 20;
    startX += offset;
    startY += offset;
  }

  const newSticker = {
    id: 'stk_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    text: text.trim(),
    x: startX,
    y: startY,
    size: 24, // font-size default 24px
    rot: 0,
  };

  note.stickers.push(newSticker);
  touch(note);
  saveSoon();

  // Render ulang layer stiker
  sinkronkanStikerLayer(note);

  // Pilih stiker baru secara otomatis
  setTimeout(() => {
    pilihStiker(newSticker.id);
  }, 50);

  toast(tr('Stiker Hamoji ditambahkan! Geser atau sesuaikan ukurannya.'));
}

export function hapusStikerHamoji(id) {
  const note = state.notes.find(n => n.id === state.openId);
  if (!note || !Array.isArray(note.stickers)) return;
  note.stickers = note.stickers.filter(s => s.id !== id);
  touch(note);
  saveSoon();
  sinkronkanStikerLayer(note);
}

export const bukaModalHamoji = bukaPanelHamoji;
export function renderStickersHtml(stickers) {
  if (!Array.isArray(stickers) || stickers.length === 0) return '';
  return stickers
    .map(stk => `
      <div class="hamoji-sticker" data-stk-id="${esc(stk.id)}" style="left:${stk.x || 20}px; top:${stk.y || 20}px; --stk-size:${stk.size || 24}px">
        <div class="hamoji-stk-body">
          <span class="hamoji-stk-text">${esc(stk.text)}</span>
        </div>
        <div class="hamoji-stk-ctrls">
          <button type="button" class="hamoji-stk-del" data-stk-act="del" title="${tr('Hapus stiker')}">✕</button>
          <div class="hamoji-stk-resize" data-stk-act="resize" title="${tr('Ubah ukuran stiker')}">↘</div>
        </div>
      </div>
    `)
    .join('');
}

export function sinkronkanStikerLayer(note) {
  const layer = document.getElementById('hamoji-stickers-layer');
  if (!layer) return;
  layer.innerHTML = renderStickersHtml(note ? note.stickers : []);
}

export function pilihStiker(id) {
  document.querySelectorAll('.hamoji-sticker').forEach(el => {
    if (el.dataset.stkId === id) {
      el.classList.add('selected');
    } else {
      el.classList.remove('selected');
    }
  });
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
          <span style="font-size:20px">✨</span>
          <h3 class="rn-modal-title">Hamoji</h3>
          <span class="hamoji-mode-badge">${isSticker ? '🎨 Mode Stiker' : '📝 Mode Teks'}</span>
        </div>
        <button class="btn btn-sec" data-pop-close style="height:28px;padding:0 8px;font-size:11px">✕</button>
      </div>

      <!-- Mode Switcher: 2 Mode (Teks & Stiker) -->
      <div class="hamoji-mode-switch">
        <button type="button" class="hamoji-mode-btn ${!isSticker ? 'active' : ''}" data-hamoji-set-mode="text">
          <span>📝</span> ${tr('Mode Teks')}
        </button>
        <button type="button" class="hamoji-mode-btn ${isSticker ? 'active mode-sticker' : ''}" data-hamoji-set-mode="sticker">
          <span>🎨</span> ${tr('Mode Stiker')}
        </button>
      </div>

      <div style="font-size:12px;color:var(--muted);margin:-4px 0 2px">
        ${isSticker
          ? tr('💡 Klik kaomoji untuk menempelkannya sebagai stiker yang bisa digeser & diubah ukurannya.')
          : tr('💡 Klik kaomoji untuk menyisipkannya langsung pada posisi kursor tulisan.')}
      </div>

      <!-- Search Input -->
      <div>
        <input type="text" class="hamoji-search-in" id="hamoji-search" placeholder="${tr('Cari kaomoji (misal: senyum, kucing, beruang, cinta)...')}" value="${esc(_searchQuery)}">
      </div>

      <!-- Kategori Chips -->
      <div class="hamoji-cats-row">
        ${HAMOJI_CATEGORIES.map(c => `
          <button type="button" class="hamoji-cat-chip ${c.id === _currentCategory ? 'active' : ''}" data-hamoji-cat="${c.id}">
            ${c.label}
          </button>
        `).join('')}
      </div>

      <!-- Grid Daftar Kaomoji -->
      <div class="hamoji-grid-wrap">
        ${list.length === 0 ? `
          <div style="grid-column: 1 / -1; padding: 30px; text-align: center; color: var(--muted); font-size: 13px">
            ${tr('Tidak ada kaomoji yang cocok.')}
          </div>
        ` : list.map(item => `
          <button type="button" class="hamoji-item-card" data-hamoji-insert="${esc(item.text)}">
            <div class="hamoji-item-text">${esc(item.text)}</div>
            <div class="hamoji-item-name">${esc(item.name || '')}</div>
          </button>
        `).join('')}
      </div>

      <!-- Form Tambah Kaomoji Kustom -->
      <div class="hamoji-custom-add-box">
        <input type="text" class="rn-input-text" id="hamoji-new-in" placeholder="${tr('Ketik kaomoji buatanmu sendiri...')}" style="height:32px;font-size:12px">
        <button type="button" class="btn btn-sec" id="hamoji-add-btn" style="height:32px;font-size:12px;white-space:nowrap">
          + ${tr('Simpan')}
        </button>
      </div>
    </div>
  `;
}

export function bukaPanelHamoji(anchor) {
  openPop(panelHamojiHtml(), anchor);
}

/* ── Delegasi Event & Mesin Interaksi Stiker ── */
export function bindHamoji() {
  // Buka Panel dari Header Button
  document.addEventListener('click', e => {
    const btn = e.target.closest('#hamoji-btn');
    if (btn) {
      bukaPanelHamoji(btn);
      return;
    }

    // Ganti Mode Teks / Stiker di dalam Panel
    const modeBtn = e.target.closest('[data-hamoji-set-mode]');
    if (modeBtn) {
      const mode = modeBtn.dataset.hamojiSetMode;
      setHamojiMode(mode);
      bukaPanelHamoji(document.getElementById('hamoji-btn'));
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
      const mode = getHamojiMode();
      closeAll();

      if (mode === 'sticker') {
        tambahStikerHamoji(text);
      } else {
        sisipkanHamojiTeks(text);
      }
      return;
    }

    // Simpan Kaomoji Kustom
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

    // Hapus Stiker dari Tombol ✕
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

    // Pilih / Batalkan Pilihan Stiker saat klik
    const stickerEl = e.target.closest('.hamoji-sticker');
    if (stickerEl) {
      pilihStiker(stickerEl.dataset.stkId);
    } else if (!e.target.closest('#hamoji-btn') && !e.target.closest('.hamoji-modal')) {
      batalkanPilihanStiker();
    }
  });

  // Live Search di Panel Hamoji
  document.addEventListener('input', e => {
    if (e.target && e.target.id === 'hamoji-search') {
      _searchQuery = e.target.value;
      const wrap = document.querySelector('.hamoji-grid-wrap');
      if (wrap) {
        const list = getFilteredHamojiList(_currentCategory, _searchQuery);
        wrap.innerHTML = list.length === 0 ? `
          <div style="grid-column: 1 / -1; padding: 30px; text-align: center; color: var(--muted); font-size: 13px">
            ${tr('Tidak ada kaomoji yang cocok.')}
          </div>
        ` : list.map(item => `
          <button type="button" class="hamoji-item-card" data-hamoji-insert="${esc(item.text)}">
            <div class="hamoji-item-text">${esc(item.text)}</div>
            <div class="hamoji-item-name">${esc(item.name || '')}</div>
          </button>
        `).join('');
      }
    }
  });

  // Mesin Pointer Drag & Resize Stiker
  let _activeDrag = null; // { type: 'move'|'resize', id, el, startX, startY, origX, origY, origSize }

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
      // Mulai Resize
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
      // Mulai Drag / Geser
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
