/**
 * Pengujian Unit Modul Hamoji (Kaomoji, Warna Kustom & Moji Kustom Pinterest)
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
  HAMOJI_CUSTOM_PRESETS,
  HAMOJI_CATEGORIES,
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

console.log('══ Uji Modul Hamoji (Moji Kustom Pinterest & Warna Catatan) ══\n');

function assert(kondisi, nama) {
  if (!kondisi) {
    console.error(`GAGAL: ${nama}`);
    process.exit(1);
  }
  console.log(`LULUS ${nama}`);
}

// 1. Pustaka Moji Kustom Bawaan (Referensi Gambar Pinterest)
assert(Array.isArray(HAMOJI_CUSTOM_PRESETS), 'T1 HAMOJI_CUSTOM_PRESETS berupa array');
assert(HAMOJI_CUSTOM_PRESETS.length >= 40, `T2 Moji Kustom memuat minimal 40 item Pinterest (total: ${HAMOJI_CUSTOM_PRESETS.length})`);

const customList = getFilteredHamojiList('custom');
assert(customList.length >= 40, `T3 Kategori Kustom terisi ${customList.length} moji estetik`);

const item1 = customList.find(h => h.text === '(♡ v ♡)');
const item2 = customList.find(h => h.text === '( ˆ(oo)ˆ )');
const item3 = customList.find(h => h.text === '( ˃ ᵤ ˂ 💢 )');
const item4 = customList.find(h => h.text === '( / ¯ ㅂ ¯ / )');
assert(item1 !== undefined, 'T4 Moji Kustom memuat (♡ v ♡)');
assert(item2 !== undefined, 'T5 Moji Kustom memuat ( ˆ(oo)ˆ )');
assert(item3 !== undefined, 'T6 Moji Kustom memuat ( ˃ ᵤ ˂ 💢 )');
assert(item4 !== undefined, 'T7 Moji Kustom memuat ( / ¯ ㅂ ¯ / )');

// 2. Kategori dan Mode
assert(HAMOJI_CATEGORIES.length >= 7, 'T8 Kategori Hamoji tersedia lengkap');
setHamojiMode('sticker');
assert(getHamojiMode() === 'sticker', 'T9 Mode Hamoji beralih ke sticker');
setHamojiMode('text');
assert(getHamojiMode() === 'text', 'T10 Mode Hamoji beralih ke text');

// 3. Kustomisasi Warna
setHamojiColor('#e53935');
assert(getHamojiColor() === '#e53935', 'T11 Warna kustom aktif tersimpan');
setHamojiColor('');
assert(getHamojiColor() === '', 'T12 Warna kustom default tereset');

// 4. Stiker Transparan & Warna Kustom
const noteDenganStiker = makeNote({
  title: 'Catatan Stiker Transparan',
  stickers: [
    { id: 'stk_1', text: '(♡ v ♡)', x: 40, y: 120, size: 28, color: '#e53935', rot: 0 },
    { id: 'stk_2', text: 'ʕ•ᴥ•ʔ', x: 200, y: 180, size: 36, color: '#43a047', rot: 0 },
  ],
});

assert(Array.isArray(noteDenganStiker.stickers), 'T13 note.stickers terdefinisi sebagai array');
assert(noteDenganStiker.stickers[0].color === '#e53935', 'T14 Warna kustom stiker 1 cocok');
assert(noteDenganStiker.stickers[1].color === '#43a047', 'T15 Warna kustom stiker 2 cocok');

// 5. Normalisasi Catatan
const normal = normalizeNote({
  id: 'n_test',
  title: 'Normalisasi Stiker',
  blocks: [{ type: 'paragraph', content: 'Halo' }],
  stickers: [{ id: 'stk_3', text: '(˶ᵔ ᵕ ᵔ˶)', x: 50, y: 80, size: 24, color: '#8e24aa' }],
});

assert(normal.stickers.length === 1, 'T16 normalizeNote memelihara array stiker dan properti color');
assert(normal.stickers[0].color === '#8e24aa', 'T17 Properti color ternormalisasi');

// 6. Render Stiker HTML (Tanpa Background)
const htmlStiker = renderStickersHtml(noteDenganStiker.stickers);
assert(htmlStiker.includes('hamoji-sticker'), 'T18 HTML Stiker mengandung class hamoji-sticker');
assert(htmlStiker.includes('color:#e53935'), 'T19 HTML Stiker menyertakan inline color custom');
assert(htmlStiker.includes('hamoji-stk-color-btn'), 'T20 HTML Stiker menyertakan tombol ganti warna');

// 7. Navigasi & Editor Integration
go('editor');
const hamojiBtn = document.getElementById('hamoji-btn');
assert(hamojiBtn !== null, 'T21 Tombol #hamoji-btn ada di header DOM');
assert(hamojiBtn.style.display === 'grid', 'T22 Tombol #hamoji-btn tampil dengan display grid (presisi di tengah)');

// 8. Buka Modal Hamoji
bukaModalHamoji(hamojiBtn);
const modal = document.querySelector('.hamoji-modal');
assert(modal !== null, 'T23 Modal Hamoji berhasil terbuka di viewport');
assert(modal.querySelector('.hamoji-color-section') !== null, 'T24 Seksi pemilihan warna tersedia di modal');

// 9. Tambah, Ubah Warna & Hapus Stiker pada Catatan Aktif
state.openId = state.notes[0].id;
const nAktif = state.notes[0];
const stkBaru = tambahStikerHamoji('( ˆ ◡ ˆ )', '#1e88e5');
assert(stkBaru && stkBaru.text === '( ˆ ◡ ˆ )', 'T25 Stiker baru berhasil ditambahkan');
assert(stkBaru.color === '#1e88e5', 'T26 Stiker baru menyimpan warna kustom');

ubahWarnaStiker(stkBaru.id, '#d81b60');
assert(nAktif.stickers.find(s => s.id === stkBaru.id).color === '#d81b60', 'T27 Ubah warna stiker berhasil diperbarui');

hapusStikerHamoji(stkBaru.id);
assert(!nAktif.stickers.some(s => s.id === stkBaru.id), 'T28 Stiker berhasil dihapus dari nAktif.stickers');

console.log('\nSemua 28/28 pengujian Hamoji berhasil!');
