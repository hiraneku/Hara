/**
 * Pengujian Unit Modul Hamoji (Kaomoji, Emoticon, ASCII Art & Stiker Interaktif)
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
  HAMOJI_COLOR_SWATCHES,
  getFilteredHamojiList,
  getHamojiMode,
  setHamojiMode,
  getHamojiColor,
  setHamojiColor,
  renderStickersHtml,
  bukaModalHamoji,
  tambahStikerHamoji,
  hapusStikerHamoji,
  ubahWarnaStiker,
} = await import(`${AKAR}/docs/notes/hamoji.js?v=${V}`);

const { makeNote, normalizeNote } = await import(`${AKAR}/docs/notes/note-model.js?v=${V}`);

console.log('══ Uji Modul Hamoji (Kaomoji, Warna Kustom & Stiker Transparan) ══\n');

function assert(kondisi, nama) {
  if (!kondisi) {
    console.error(`GAGAL: ${nama}`);
    process.exit(1);
  }
  console.log(`LULUS ${nama}`);
}

// 1. Pustaka Kaomoji Terkurasi (Pinterest + Japanese Aesthetic)
assert(Array.isArray(HAMOJI_LIBRARY), 'T1 HAMOJI_LIBRARY berupa array');
assert(HAMOJI_LIBRARY.length >= 60, `T2 HAMOJI_LIBRARY memiliki minimal 60 item (total: ${HAMOJI_LIBRARY.length})`);
assert(HAMOJI_CATEGORIES.length >= 7, 'T3 Kategori Hamoji tersedia lengkap');
assert(HAMOJI_COLOR_SWATCHES.length >= 8, 'T4 Pustaka swatch warna tersedia');

// 2. Kaomoji Otentik dari Referensi Gambar
const hasHeartEyes = HAMOJI_LIBRARY.some(h => h.text === '(♡ v ♡)');
const hasGemas = HAMOJI_LIBRARY.some(h => h.text === '(> ω <)');
const hasBersiul = HAMOJI_LIBRARY.some(h => h.text === '( ‾́ 3 ‾́ )');
const hasKucingSenyum = HAMOJI_LIBRARY.some(h => h.text === '(= ˆ ◡ ˆ =)');
assert(hasHeartEyes, 'T5 Pustaka memuat (♡ v ♡) dari referensi');
assert(hasGemas, 'T6 Pustaka memuat (> ω <) dari referensi');
assert(hasBersiul, 'T7 Pustaka memuat ( ‾́ 3 ‾́ ) dari referensi');
assert(hasKucingSenyum, 'T8 Pustaka memuat (= ˆ ◡ ˆ =) dari referensi');

// 3. Pencarian dan Filter
const searchKucing = getFilteredHamojiList('semua', 'kucing');
assert(searchKucing.length >= 3, `T9 Pencarian 'kucing' menemukan ${searchKucing.length} kaomoji`);

// 4. Kustomisasi Warna
setHamojiColor('#ff758f');
assert(getHamojiColor() === '#ff758f', 'T10 Warna kustom aktif tersimpan');
setHamojiColor('');
assert(getHamojiColor() === '', 'T11 Warna kustom default tereset');

// 5. Stiker Transparan & Warna Kustom
const noteDenganStiker = makeNote({
  title: 'Catatan Stiker Transparan',
  stickers: [
    { id: 'stk_1', text: '(♡ v ♡)', x: 40, y: 120, size: 28, color: '#ff758f', rot: 0 },
    { id: 'stk_2', text: 'ʕ•ᴥ•ʔ', x: 200, y: 180, size: 36, color: '#52b788', rot: 0 },
  ],
});

assert(Array.isArray(noteDenganStiker.stickers), 'T12 note.stickers terdefinisi sebagai array');
assert(noteDenganStiker.stickers[0].color === '#ff758f', 'T13 Warna kustom stiker 1 cocok');
assert(noteDenganStiker.stickers[1].color === '#52b788', 'T14 Warna kustom stiker 2 cocok');

// 6. Normalisasi Catatan
const normal = normalizeNote({
  id: 'n_test',
  title: 'Normalisasi Stiker',
  blocks: [{ type: 'paragraph', content: 'Halo' }],
  stickers: [{ id: 'stk_3', text: '(˶ᵔ ᵕ ᵔ˶)', x: 50, y: 80, size: 24, color: '#9d4edd' }],
});

assert(normal.stickers.length === 1, 'T15 normalizeNote memelihara array stiker dan properti color');
assert(normal.stickers[0].color === '#9d4edd', 'T16 Properti color ternormalisasi');

// 7. Render Stiker HTML (Tanpa Background)
const htmlStiker = renderStickersHtml(noteDenganStiker.stickers);
assert(htmlStiker.includes('hamoji-sticker'), 'T17 HTML Stiker mengandung class hamoji-sticker');
assert(htmlStiker.includes('color:#ff758f'), 'T18 HTML Stiker menyertakan inline color custom');
assert(htmlStiker.includes('hamoji-stk-color-btn'), 'T19 HTML Stiker menyertakan tombol ganti warna');

// 8. Navigasi & Editor Integration
go('editor');
const hamojiBtn = document.getElementById('hamoji-btn');
assert(hamojiBtn !== null, 'T20 Tombol #hamoji-btn ada di header DOM');
assert(hamojiBtn.style.display === 'grid', 'T21 Tombol #hamoji-btn tampil dengan display grid (presisi di tengah)');

// 9. Buka Modal Hamoji
bukaModalHamoji(hamojiBtn);
const modal = document.querySelector('.hamoji-modal');
assert(modal !== null, 'T22 Modal Hamoji berhasil terbuka di viewport');
assert(modal.querySelector('.hamoji-color-bar') !== null, 'T23 Bar pemilihan warna kustom tersedia di modal');

// 10. Tambah, Ubah Warna & Hapus Stiker pada Catatan Aktif
state.openId = state.notes[0].id;
const nAktif = state.notes[0];
const stkBaru = tambahStikerHamoji('( ˆ ◡ ˆ )', '#4ea8de');
assert(stkBaru && stkBaru.text === '( ˆ ◡ ˆ )', 'T24 Stiker baru berhasil ditambahkan');
assert(stkBaru.color === '#4ea8de', 'T25 Stiker baru menyimpan warna kustom');

ubahWarnaStiker(stkBaru.id, '#ff6b6b');
assert(nAktif.stickers.find(s => s.id === stkBaru.id).color === '#ff6b6b', 'T26 Ubah warna stiker berhasil diperbarui');

hapusStikerHamoji(stkBaru.id);
assert(!nAktif.stickers.some(s => s.id === stkBaru.id), 'T27 Stiker berhasil dihapus dari nAktif.stickers');

console.log('\nSemua 27/27 pengujian Hamoji berhasil!');
