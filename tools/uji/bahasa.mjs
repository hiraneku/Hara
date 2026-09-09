/* Fitur Bahasa (Pengaturan → Bahasa) — suite jsdom.

   Yang diuji:
   • bawaan Indonesia & pilihan tersimpan (localStorage) lalu bisa balik;
   • render ulang sampel area: Pengaturan, nav statis, judul layar,
     daftar catatan, bar editor;
   • cap waktu & sapaan tanggal mengikuti bahasa aktif;
   • jurnal hari ini tidak pernah dobel saat bahasa berganti
     (jurnal lama berjudul Indonesia tetap ditemukan di mode Inggris
     dan sebaliknya);
   • isi catatan tidak pernah berubah — hanya kerangka yang berganti.

   Jalan: node tools/uji/bahasa.mjs (dari dalam folder snapshot uji). */
import { JSDOM } from 'jsdom';
import fs from 'fs';
import { indexedDB as fakeIDB } from 'fake-indexeddb';
import path from 'path';
import { fileURLToPath } from 'url';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const AKAR = process.cwd();

const dom = new JSDOM(fs.readFileSync('docs/index.html', 'utf8'), { url: 'https://x.test/', pretendToBeVisual: true });
const { window: w } = dom; w.indexedDB = fakeIDB;
for (const k of ['document', 'getSelection', 'HTMLElement', 'Node', 'Range', 'MouseEvent', 'KeyboardEvent', 'Event', 'InputEvent', 'localStorage', 'Image', 'NodeFilter'])
  if (w[k] !== undefined) globalThis[k] = w[k];
globalThis.window = w; globalThis.self = w; globalThis.indexedDB = w.indexedDB;
globalThis.addEventListener = w.addEventListener.bind(w);
Object.defineProperty(globalThis, 'navigator', { value: w.navigator, configurable: true });
w.URL.createObjectURL = () => 'blob:x/1'; w.URL.revokeObjectURL = () => {}; globalThis.URL = w.URL;
const V = fs.readFileSync('docs/app.js', 'utf8').match(/\?v=(\d+)/)[1];
const st = (...p) => import(`${AKAR}/docs/${p.join('/')}?v=${V}`);
await st('app.js');
const { state } = await st('core/store.js');
const nmdl = await st('notes/note-model.js');
const { makeNote, makeBlock } = nmdl;
const router = await st('core/router.js');
const d = w.document;
const sleep = (ms = 20) => new Promise(r => setTimeout(r, ms));
let gagal = 0; let total = 0;
const oke = (nama, baik, det = '') => {
  total++;
  if (!baik) { gagal++; console.log('FAIL', nama, det ? '\n      ' + det : ''); }
  else console.log('ok  ', nama);
};
const klik = el => { if (el) el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true, view: w })); };
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli',
  'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const HARI_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const BULAN_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];
const kini = new Date();
const judulJurnalId = () => `Jurnal · ${kini.getDate()} ${BULAN[kini.getMonth()]} ${kini.getFullYear()}`;
const judulJurnalEn = () => `Journal · ${BULAN_EN[kini.getMonth()]} ${kini.getDate()}, ${kini.getFullYear()}`;
const tanggalkini = (en) => en
  ? `${HARI_EN[kini.getDay()]}, ${BULAN_EN[kini.getMonth()]} ${kini.getDate()}`
  : `${HARI[kini.getDay()]}, ${kini.getDate()} ${BULAN[kini.getMonth()]}`;
const bahasaTersimpan = () => { try { return w.localStorage.getItem('hara.v1.bahasa'); } catch (e) { return null; } };

/* Mulai bersih: bahasa bawaan Indonesia, tanpa catatan. */
try { w.localStorage.removeItem('hara.v1.bahasa'); } catch (e) {}
state.notes.splice(0);

const ISI_ASLI = 'Isi catatan ini TIDAK BOLEH berubah bahasa apa pun — 123 #tag-uji';
state.notes.push(makeNote({
  id: 'b1', title: 'Catatan uji', createdAt: kini.getTime() - 5000, updatedAt: Date.now() - 2000,
  blocks: [makeBlock({ type: 'paragraph', content: ISI_ASLI })],
}));

/* ── S1: bawaan Indonesia ── */
router.go('set'); await sleep(30);
oke('S1a halaman Pengaturan terbuka', d.getElementById('title') && d.getElementById('title').textContent === 'Pengaturan');
const btnId = () => d.querySelector('[data-bahasa="id"]');
const btnEn = () => d.querySelector('[data-bahasa="en"]');
oke('S1b dua tombol bahasa ada', !!btnId() && !!btnEn());
oke('S1c bawaan = Indonesia (tombol id aktif)', btnId() && btnId().getAttribute('aria-pressed') === 'true'
  && btnEn() && btnEn().getAttribute('aria-pressed') === 'false');
oke('S1d label bagian Bahasa berbahasa Indonesia', d.body.textContent.includes('Bahasa aplikasi')
  && d.body.textContent.includes('Tampilan') && d.body.textContent.includes('Unduh cadangan'));

/* ── S2: pindah Inggris → tersimpan & render ulang seketika ── */
klik(btnEn()); await sleep(40);
oke('S2a pilihan tersimpan di localStorage', bahasaTersimpan() === 'en', String(bahasaTersimpan()));
oke('S2b tombol en jadi aktif', btnEn() && btnEn().getAttribute('aria-pressed') === 'true'
  && btnId() && btnId().getAttribute('aria-pressed') === 'false');
oke('S2c halaman Pengaturan ikut berganti bahasa', d.getElementById('title').textContent === 'Settings'
  && d.body.textContent.includes('App language') && !d.body.textContent.includes('Bahasa aplikasi'),
  (d.getElementById('title') || {}).textContent);
oke('S2d nav statis ikut (terjemahStatis)', [...d.querySelectorAll('.nav-i,.bnav button')]
  .some(b => b.textContent.trim() === 'Home') && d.body.textContent.includes('Import')
  && d.body.textContent.includes('Download backup'));

/* ── S3: kembali Indonesia ── */
klik(btnId()); await sleep(40);
oke('S3a balik ke id — pilihan disimpan sebagai id (dihapus)', bahasaTersimpan() !== 'en'
  && d.getElementById('title').textContent === 'Pengaturan'
  && d.body.textContent.includes('Bahasa aplikasi'));

/* ── S4: sapaan Beranda & daftar catatan ikut bahasa ── */
router.go('home'); await sleep(30);
oke('S4a sapaan Beranda memakai tanggal Indonesia', d.body.textContent.includes(tanggalkini(false)),
  d.body.textContent.slice(0, 160).replace(/\s+/g, ' '));
oke('S4b tombol jurnal Indonesia di Beranda', [...d.querySelectorAll('.jurnal-btn')]
  .some(b => b.textContent.includes('Catatan hari ini') && b.textContent.includes('Jurnal')));
router.go('notes'); await sleep(30);
oke('S4c cap waktu relatif Indonesia (baru saja)',
  [...d.querySelectorAll('.row[data-open="b1"] *')].some(e => e.textContent === 'baru saja'));
const rowB1 = () => d.querySelector('.row[data-open="b1"]');
oke('S4d judul catatan (data) tetap asli', rowB1() && rowB1().textContent.includes('Catatan uji'));

router.go('set'); await sleep(25);
klik(d.querySelector('[data-bahasa="en"]')); await sleep(35);
router.go('home'); await sleep(30);
oke('S5a sapaan Beranda memakai tanggal Inggris', d.body.textContent.includes(tanggalkini(true)),
  d.body.textContent.slice(0, 160).replace(/\s+/g, ' '));
oke('S5b tombol jurnal Inggris', [...d.querySelectorAll('.jurnal-btn')]
  .some(x => x.textContent.includes("Today's journal") && x.textContent.includes('Journal')));
router.go('notes'); await sleep(30);
oke('S5c cap waktu jadi just now', [...d.querySelectorAll('.row[data-open="b1"] *')]
  .some(e => e.textContent === 'just now'), '');
oke('S5d label UI lain ikut (Sampah/Trash, Urut:, Pin)', d.body.textContent.includes('Trash')
  && d.body.textContent.includes('Sort:') && rowB1() && rowB1().querySelector('[aria-label="Pin"]'));
oke('S5e judul catatan (data) tetap asli di mode Inggris', rowB1() && rowB1().textContent.includes('Catatan uji'));

/* ── S6: isi catatan tidak pernah berubah ── */
router.go('notes'); await sleep(25);
klik(d.querySelector('.row[data-open="b1"]')); await sleep(40);
const doc = () => d.querySelector('.ed-doc');
oke('S6a editor terbuka di mode Inggris', !!doc());
oke('S6b isi blok tidak diterjemahkan', doc() && doc().textContent.includes(ISI_ASLI),
  doc() ? doc().textContent.slice(0, 120) : '');
oke('S6c status editor memakai bahasa Inggris (contoh bar mekanik)',
  [...d.querySelectorAll('.mech-in button')].some(b => b.title === 'Undo')
  && [...d.querySelectorAll('.mech-in button')].some(b => b.title === 'Bold'));
const simpanIsi = state.notes.find(x => x.id === 'b1').blocks.map(b => b.content).join('\u0001');
router.go('set'); await sleep(25);
klik(d.querySelector('[data-bahasa="id"]')); await sleep(35);
oke('S6d isi tersimpan identik setelah bolak-balik bahasa',
  state.notes.find(x => x.id === 'b1').blocks.map(b => b.content).join('\u0001') === simpanIsi);

/* ── S7: jurnal lama Indonesia tetap ditemukan di mode Inggris ── */
const jId = judulJurnalId();
state.notes.push(makeNote({ id: 'j1', title: jId, createdAt: kini.getTime() - 60000,
  updatedAt: kini.getTime() - 60000, blocks: [makeBlock({ type: 'paragraph', content: 'entri jurnal lama' })] }));
const jumlahJurnal = () => state.notes.filter(x => !x.deletedAt
  && /^(Jurnal|Journal) ·/.test(x.title || '')).length;
const tombolJurnal = () => d.querySelector('.jurnal-btn');
router.go('home'); await sleep(25);
klik(tombolJurnal()); await sleep(40);
oke('S7a jurnal Indonesia terbuka (id)', state.openId === 'j1', String(state.openId));
router.go('set'); await sleep(25);
klik(d.querySelector('[data-bahasa="en"]')); await sleep(35);
router.go('home'); await sleep(25);
klik(tombolJurnal()); await sleep(40);
oke('S7b di mode Inggris jurnal lama tetap dipakai — tidak dobel', state.openId === 'j1' && jumlahJurnal() === 1,
  `openId=${state.openId} jml=${jumlahJurnal()}`);

/* ── S8: jurnal Inggris dibuat di mode Inggris, lalu dipakai di mode Indonesia ── */
state.notes.splice(0);
state.notes.push(makeNote({ id: 'b1', title: 'Catatan uji', createdAt: kini.getTime(), updatedAt: kini.getTime(),
  blocks: [makeBlock({ type: 'paragraph', content: ISI_ASLI })] }));
const jEn = judulJurnalEn();
state.notes.push(makeNote({ id: 'j2', title: jEn, createdAt: kini.getTime(), updatedAt: kini.getTime(),
  blocks: [makeBlock({ type: 'paragraph', content: 'entri jurnal en' })] }));
router.go('home'); await sleep(25);
klik(tombolJurnal()); await sleep(40);
oke('S8a jurnal Inggris terbuka saat bahasa Inggris', state.openId === 'j2', String(state.openId));
router.go('set'); await sleep(25);
klik(d.querySelector('[data-bahasa="id"]')); await sleep(35);
router.go('home'); await sleep(25);
klik(tombolJurnal()); await sleep(40);
oke('S8b di mode Indonesia jurnal Inggris tetap dipakai — tidak dobel', state.openId === 'j2' && jumlahJurnal() === 1,
  `openId=${state.openId} jml=${jumlahJurnal()}`);
state.notes.splice(0);

console.log(`total: ${total} · gagal: ${gagal}`);
if (gagal) process.exit(1);
