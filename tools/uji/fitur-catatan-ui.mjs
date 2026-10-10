/* Uji Ronde 12 · K31 tenggat→tugas, K19 tabel properti, K30 sumber palette lintas modul.
   Memuat app.js sungguhan (jsdom + fake-indexeddb), seperti uji templat-variabel.
   Jalankan: node tools/uji/fitur-catatan-ui.mjs */
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { indexedDB as fakeIDB } from 'fake-indexeddb';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const V = fs.readFileSync('docs/app.js','utf8').match(/\?v=(\d+)/)[1];
const dom = new JSDOM(fs.readFileSync('docs/index.html', 'utf8'), { url: 'https://x.test/', pretendToBeVisual: true });
const { window: w } = dom;
w.indexedDB = fakeIDB;
for (const k of ['document', 'getSelection', 'HTMLElement', 'Node', 'Range', 'MouseEvent', 'KeyboardEvent', 'Event', 'InputEvent', 'localStorage', 'Image', 'Blob', 'NodeFilter'])
  if (w[k] !== undefined) globalThis[k] = w[k];
globalThis.window = w; globalThis.self = w; globalThis.indexedDB = w.indexedDB;
globalThis.addEventListener = w.addEventListener.bind(w);
Object.defineProperty(globalThis, 'navigator', { value: w.navigator, configurable: true });
w.URL.createObjectURL = () => 'blob:x/1'; w.URL.revokeObjectURL = () => {}; globalThis.URL = w.URL;

let no = 0, gagal = 0;
const cek = (nama, k, d = '') => { no++; if (k) console.log(`  ✓ ${nama}`); else { gagal++; console.log(`  ✗ ${nama} ${d}`); } };

await import(`${process.cwd()}/docs/app.js?v=${V}`);
const { state } = await import(`${process.cwd()}/docs/core/store.js?v=${V}`);
const { makeNote } = await import(`${process.cwd()}/docs/notes/note-model.js?v=${V}`);
const ui = await import(`${process.cwd()}/docs/notes/fitur-lanjutan-ui.js?v=${V}`);

console.log('K31 · tenggat → tugas');
{
  const n = makeNote({ title: 'Rencana', blocks: [
    { type: 'paragraph', content: 'besok Kirim laporan jam 9' },
    { type: 'paragraph', content: 'Catatan biasa tanpa tanggal' },
  ] });
  state.notes.unshift(n); state.openId = n.id;
  ui.jadikanBarisTenggatTugas();
  const hasil = state.notes.find(x => x.id === n.id);
  const tugas = hasil.blocks.filter(b => b.type === 'todo');
  cek('baris bertenggat menjadi tugas', tugas.length === 1, JSON.stringify(hasil.blocks.map(b => b.type)));
  cek('baris biasa tetap paragraf', hasil.blocks.some(b => b.type === 'paragraph' && /tanpa tanggal/.test(b.content)));
  cek('tugas baru belum dicentang', tugas.length === 1 && tugas[0].meta.checked === false);
}

console.log('K19 · tabel properti');
{
  state.notes.push(makeNote({ title: 'Buku', props: [{ k: 'Status', v: 'Dibaca' }, { k: 'Rating', v: '5' }] }));
  state.notes.push(makeNote({ title: 'Film', props: [{ k: 'Status', v: 'Ditonton' }] }));
  ui.bukaTabelProperti();
  const teks = document.getElementById('pop').textContent;
  cek('kolom properti dari semua catatan muncul', teks.includes('Status') && teks.includes('Rating'));
  cek('nilai properti tampil', teks.includes('Dibaca') && teks.includes('Ditonton'));
}

console.log('K30 · sumber pencarian lintas modul');
{
  state.notes.push(makeNote({ title: 'Daftar', blocks: [{ type: 'todo', content: 'Beli susu', meta: { checked: false } }, { type: 'todo', content: 'Sudah', meta: { checked: true, done: 1 } }] }));
  const { sumberTugasTerbuka } = ui;
  const t = sumberTugasTerbuka();
  cek('tugas belum selesai tercantum di palette', t.length === 2 && t.every(x => x.hint === 'Tugas') && t.some(x => x.label.includes('Beli susu')), JSON.stringify(t.map(x => x.label)));
  cek('tugas yang sudah selesai tidak tercantum', !t.some(x => x.label.includes('Sudah')));
}

console.log(`\nHasil: ${no - gagal}/${no} lolos${gagal ? `, ${gagal} gagal` : ''}`);
process.exit(gagal ? 1 : 0);
