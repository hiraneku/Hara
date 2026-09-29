/**
 * Pengujian Unit Modul Hamoji (Kaomoji, Emoticon & Stiker Interaktif)
 */

import { JSDOM } from 'jsdom';
import fs from 'fs';
import { indexedDB as fakeIDB } from 'fake-indexeddb';
import path from 'path';
import { fileURLToPath } from 'url';

/* selalu jalan dari akar repo */
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));

const dom = new JSDOM(fs.readFileSync('docs/index.html', 'utf8'), {
  url: 'https://x.test/',
  pretendToBeVisual: true,
});
const { window: w } = dom;
w.indexedDB = fakeIDB;

for (const k of ['document', 'getSelection', 'HTMLElement', 'Node', 'Range', 'MouseEvent', 'KeyboardEvent', 'Event', 'InputEvent', 'localStorage', 'Image', 'Blob']) {
  if (w[k] !== undefined) globalThis[k] = w[k];
}
globalThis.window = w;
globalThis.self = w;
globalThis.indexedDB = w.indexedDB;
globalThis.addEventListener = w.addEventListener.bind(w);
Object.defineProperty(globalThis, 'navigator', { value: w.navigator, configurable: true });
w.URL.createObjectURL = () => 'blob:x/1';
w.URL.revokeObjectURL = () => {};
globalThis.URL = w.URL;

const AKAR = process.cwd();
const V = fs.readFileSync('docs/app.js', 'utf8').match(/\?v=(\d+)/)[1];

await import(`${AKAR}/docs/app.js?v=${V}`);
const { go } = await import(`${AKAR}/docs/core/router.js?v=${V}`);
const { state } = await import(`${AKAR}/docs/core/store.js?v=${V}`);
const {
  HAMOJI_LIBRARY,
  HAMOJI_CATEGORIES,
  getFilteredHamojiList,
  getHamojiMode,
  setHamojiMode,
  renderStickersHtml,
  bukaModalHamoji,
  tambahStikerHamoji,
  hapusStikerHamoji,
} = await import(`${AKAR}/docs/notes/hamoji.js?v=${V}`);

const { makeNote, normalizeNote } = await import(`${AKAR}/docs/notes/note-model.js?v=${V}`);

console.log('══ Uji Modul Hamoji (Kaomoji & Stiker) ══\n');

function assert(kondisi, nama) {
  if (!kondisi) {
    console.error(`GAGAL: ${nama}`);
    process.exit(1);
  }
  console.log(`LULUS ${nama}`);
}

// 1. Pustaka Kaomoji Bawaan
assert(Array.isArray(HAMOJI_LIBRARY), 'T1 HAMOJI_LIBRARY berupa array');
assert(HAMOJI_LIBRARY.length >= 25, `T2 HAMOJI_LIBRARY memiliki minimal 25 item (total: ${HAMOJI_LIBRARY.length})`);
assert(HAMOJI_CATEGORIES.length >= 6, 'T3 Kategori Hamoji tersedia lengkap');

const populer = HAMOJI_LIBRARY.filter(h => h.cat === 'populer');
assert(populer.length >= 5, `T4 Kategori Populer memiliki ${populer.length} item`);

// 2. Pencarian dan Filter
const searchKucing = getFilteredHamojiList('semua', 'kucing');
assert(searchKucing.length >= 2, `T5 Pencarian 'kucing' menemukan ${searchKucing.length} kaomoji`);

const catHewan = getFilteredHamojiList('hewan');
assert(catHewan.every(h => h.cat === 'hewan'), 'T6 Filter kategori hewan hanya memuat kategori hewan');

// 3. Mode Switcher
setHamojiMode('sticker');
assert(getHamojiMode() === 'sticker', 'T7 Mode Hamoji beralih ke sticker');
setHamojiMode('text');
assert(getHamojiMode() === 'text', 'T8 Mode Hamoji beralih ke text');

// 4. Model Catatan dengan Stiker
const noteDenganStiker = makeNote({
  title: 'Catatan Stiker',
  stickers: [
    { id: 'stk_1', text: '(｡•̀ᴗ-)✧', x: 40, y: 120, size: 28, rot: 0 },
    { id: 'stk_2', text: 'ʕ•ᴥ•ʔ', x: 200, y: 180, size: 36, rot: 5 },
  ],
});

assert(Array.isArray(noteDenganStiker.stickers), 'T9 note.stickers terdefinisi sebagai array');
assert(noteDenganStiker.stickers.length === 2, 'T10 note.stickers menyimpan 2 stiker');
assert(noteDenganStiker.stickers[0].text === '(｡•̀ᴗ-)✧', 'T11 Teks stiker 1 cocok');
assert(noteDenganStiker.stickers[1].text === 'ʕ•ᴥ•ʔ', 'T12 Teks stiker 2 cocok');

// 5. Normalisasi Catatan
const normal = normalizeNote({
  id: 'n_test',
  title: 'Normalisasi Stiker',
  blocks: [{ type: 'paragraph', content: 'Halo' }],
  stickers: [{ id: 'stk_3', text: '(˶ᵔ ᵕ ᵔ˶)', x: 50, y: 80, size: 24 }],
});

assert(normal.stickers.length === 1, 'T13 normalizeNote memelihara array stiker');
assert(normal.stickers[0].text === '(˶ᵔ ᵕ ᵔ˶)', 'T14 Teks stiker ternormalisasi dengan benar');

// 6. Render Stiker HTML
const htmlStiker = renderStickersHtml(noteDenganStiker.stickers);
assert(htmlStiker.includes('hamoji-sticker'), 'T15 HTML Stiker mengandung class hamoji-sticker');
assert(htmlStiker.includes('(｡•̀ᴗ-)✧'), 'T16 HTML Stiker mengandung kaomoji 1');
assert(htmlStiker.includes('ʕ•ᴥ•ʔ'), 'T17 HTML Stiker mengandung kaomoji 2');
assert(htmlStiker.includes('hamoji-stk-resize'), 'T18 HTML Stiker menyertakan resize handle');

// 7. Navigasi & Editor Integration
go('editor');
const hamojiBtn = document.getElementById('hamoji-btn');
assert(hamojiBtn !== null, 'T19 Tombol #hamoji-btn ada di header DOM');
assert(hamojiBtn.style.display !== 'none', 'T20 Tombol #hamoji-btn tampil pada rute editor');

// 8. Buka Modal Hamoji
bukaModalHamoji(hamojiBtn);
const modal = document.querySelector('.hamoji-modal');
assert(modal !== null, 'T21 Modal Hamoji berhasil terbuka di viewport');

// 9. Tambah dan Hapus Stiker pada Catatan Aktif
state.openId = state.notes[0].id;
const nAktif = state.notes[0];
tambahStikerHamoji('(≧◡≦) ♡');
const stkBaru = nAktif.stickers.find(s => s.text === '(≧◡≦) ♡');
assert(stkBaru && stkBaru.text === '(≧◡≦) ♡', 'T22 Stiker baru berhasil ditambahkan');
assert(nAktif.stickers.some(s => s.id === stkBaru.id), 'T23 Stiker terdaftar pada nAktif.stickers');

hapusStikerHamoji(stkBaru.id);
assert(!nAktif.stickers.some(s => s.id === stkBaru.id), 'T24 Stiker berhasil dihapus dari nAktif.stickers');

console.log('\nSemua 24/24 pengujian Hamoji berhasil!');
