/* Uji Ronde 11 · K1 — command palette (Ctrl/⌘+K).
   - cariPerintah(): pencocokan & urutan (murni, tanpa DOM);
   - Ctrl+K membuka, mengetik menyaring, Enter menjalankan (pindah layar,
     membuka catatan), Esc menutup;
   - sumber yang melempar tidak mematikan palette.
   Jalankan: node tools/uji/palette.mjs */
import {JSDOM} from 'jsdom';
import fs from 'fs';
import { indexedDB as fakeIDB } from 'fake-indexeddb';
import path from 'path';
import { fileURLToPath } from 'url';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const AKAR = process.cwd();

const V = fs.readFileSync('docs/app.js', 'utf8').match(/\?v=(\d+)/)[1];
const murni = await import(`${AKAR}/docs/core/palette.js?v=${V}`);

let gagal = 0, total = 0;
const oke = (nama, baik, det = '') => { total++; if (!baik) { gagal++; console.log('FAIL', nama, det ? '\n      ' + det : ''); } else console.log('ok  ', nama); };

/* ── 1. pencocokan murni ── */
const contoh = [
  { label: 'Tugas', cari: 'to-do tenggat' },
  { label: 'Catatan', cari: '' },
  { label: 'Rapat Desember', cari: 'proyek' },
  { label: 'Catatan baru', cari: 'tulis buat' },
];
const labels = q => murni.cariPerintah(contoh, q).map(x => x.label);
oke('kueri kosong → semua item', labels('').length === 4);
oke('awalan label diutamakan', labels('cat')[0] === 'Catatan' || labels('cat')[0] === 'Catatan baru', JSON.stringify(labels('cat')));
oke('cocok lewat kata kunci (cari)', labels('tenggat').includes('Tugas'));
oke('semua kata harus cocok (AND)', JSON.stringify(labels('rapat desember')) === '["Rapat Desember"]', JSON.stringify(labels('rapat desember')));
oke('tidak cocok → kosong', labels('xyzzy').length === 0);
oke('tanpa huruf besar-kecil', labels('TUGAS')[0] === 'Tugas');

/* ── 2. alur di DOM ── */
const dom = new JSDOM(fs.readFileSync('docs/index.html', 'utf8'), { url: 'https://x.test/', pretendToBeVisual: true });
const { window: w } = dom; w.indexedDB = fakeIDB;
for (const k of ['document','getSelection','HTMLElement','Node','Range','MouseEvent','KeyboardEvent','Event','InputEvent','localStorage','Image','NodeFilter'])
  if (w[k] !== undefined) globalThis[k] = w[k];
globalThis.window = w; globalThis.self = w; globalThis.indexedDB = w.indexedDB;
globalThis.addEventListener = w.addEventListener.bind(w);
Object.defineProperty(globalThis, 'navigator', { value: w.navigator, configurable: true });
w.URL.createObjectURL = () => 'blob:x/1'; w.URL.revokeObjectURL = () => {}; globalThis.URL = w.URL;
const st = (...p) => import(`${AKAR}/docs/${p.join('/')}?v=${V}`);
await st('app.js');
const { state } = await st('core/store.js');
const { makeNote, makeBlock } = await st('notes/note-model.js');
const router = await st('core/router.js');
const d = w.document;
const sleep = (ms = 40) => new Promise(r => setTimeout(r, ms));
const tekan = (el, key, opt = {}) => el.dispatchEvent(new w.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opt }));
const ketik = (el, teks) => { el.value = teks; el.dispatchEvent(new w.Event('input', { bubbles: true })); };
const kotak = () => d.querySelector('#palette .pal-kotak');
const aktifLabel = () => { const e = d.querySelector('#palette .pal-item.on .pal-label'); return e ? e.textContent : null; };

const kini = Date.now();
state.notes.splice(0);
state.notes.push(makeNote({ id: 'p1', title: 'Rapat Desember', createdAt: kini, updatedAt: kini,
  blocks: [makeBlock({ type: 'paragraph', content: 'x' })] }));

oke('palette ada di DOM & tertutup di awal', !!d.getElementById('palette') && !d.getElementById('palette').classList.contains('on'));

tekan(d.body, 'k', { ctrlKey: true }); await sleep();
oke('Ctrl+K membuka palette', d.getElementById('palette').classList.contains('on'));
oke('daftar berisi perintah & catatan', d.querySelectorAll('#palette .pal-item').length > 10);

ketik(kotak(), 'tugas'); await sleep();
oke('mengetik "tugas" → item pertama Tugas', aktifLabel() === 'Tugas', aktifLabel());
tekan(kotak(), 'Enter'); await sleep();
oke('Enter menjalankan → pindah ke layar Tugas', router.cur === 'task', router.cur);
oke('Enter menutup palette', !d.getElementById('palette').classList.contains('on'));

tekan(d.body, 'k', { ctrlKey: true }); await sleep();
ketik(kotak(), 'desember'); await sleep();
oke('cari judul catatan → item Rapat Desember', aktifLabel() === 'Rapat Desember', aktifLabel());
tekan(kotak(), 'Enter'); await sleep();
oke('Enter pada catatan → membukanya', state.openId === 'p1', String(state.openId));

tekan(d.body, 'k', { ctrlKey: true }); await sleep();
ketik(kotak(), 'xyzzy-tidak-ada'); await sleep();
oke('kueri tanpa hasil → pesan kosong', !!d.querySelector('#palette .pal-kosong'));

tekan(kotak(), 'Escape'); await sleep();
oke('Esc menutup palette', !d.getElementById('palette').classList.contains('on'));

tekan(d.body, 'k', { ctrlKey: true }); await sleep();
tekan(kotak(), 'ArrowDown'); await sleep();
oke('panah bawah memindah sorotan', d.querySelectorAll('#palette .pal-item')[1].classList.contains('on'));
tekan(d.body, 'k', { ctrlKey: true }); await sleep();
oke('Ctrl+K kedua menutup palette', !d.getElementById('palette').classList.contains('on'));

console.log(`\ntotal: ${total} · gagal: ${gagal}`);
process.exit(gagal ? 1 : 0);
