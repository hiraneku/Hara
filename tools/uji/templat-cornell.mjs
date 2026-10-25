/* Pengujian Tahap 1 · B7b (templat Catatan Cornell) — suite jsdom.

   Yang diuji:
   • templat "Catatan Cornell" terdaftar sebagai bawaan, dan templat bawaan lain tetap ada;
   • menerapkannya membuat catatan baru dengan SATU blok tabel (Petunjuk | Catatan)
     yang diikuti Ringkasan — struktur, bukan hanya teks;
   • sel tabel bisa diedit (contenteditable) setelah dirender;
   • struktur bertahan lewat normalisasi (muat ulang) dan id blok unik;
   • bahasa Inggris memakai judul kolom Cue | Notes dan Summary.

   Jalan: node tools/uji/templat-cornell.mjs (dari folder repo). */
import { JSDOM } from 'jsdom';
import fs from 'fs';
import { indexedDB as fakeIDB } from 'fake-indexeddb';
import path from 'path';
import { fileURLToPath } from 'url';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const AKAR = process.cwd();

const dom = new JSDOM(fs.readFileSync('docs/index.html', 'utf8'), { url: 'https://x.test/', pretendToBeVisual: true });
const { window: w } = dom; w.indexedDB = fakeIDB;
for (const k of ['document', 'getSelection', 'HTMLElement', 'Node', 'Range', 'MouseEvent', 'KeyboardEvent', 'Event', 'InputEvent', 'localStorage', 'Image', 'NodeFilter', 'DOMParser'])
  if (w[k] !== undefined) globalThis[k] = w[k];
globalThis.window = w; globalThis.self = w; globalThis.indexedDB = w.indexedDB;
globalThis.addEventListener = w.addEventListener.bind(w);
Object.defineProperty(globalThis, 'navigator', { value: w.navigator, configurable: true });
w.URL.createObjectURL = () => 'blob:x/1'; w.URL.revokeObjectURL = () => {}; globalThis.URL = w.URL;
const V = fs.readFileSync('docs/app.js', 'utf8').match(/\?v=(\d+)/)[1];
const st = (...p) => import(`${AKAR}/docs/${p.join('/')}?v=${V}`);
await st('app.js');
const { state } = await st('core/store.js');
const nm = await st('notes/note-model.js');
const tp = await st('notes/templat.js');
const i18n = await st('core/i18n.js');
const d = w.document;

let gagal = 0, total = 0;
const oke = (nama, baik, det = '') => {
  total++;
  if (!baik) { gagal++; console.log('FAIL', nama, det ? '\n      ' + det : ''); }
  else console.log('ok  ', nama);
};

const tabelDari = blocks => blocks.find(b => b.type === 'table');

console.log('── Daftar templat ──');
const daftar = tp.daftarTemplat();
const cornell = daftar.find(t => t.id === 'b:cornell');
oke('templat Catatan Cornell terdaftar sebagai bawaan', !!cornell && cornell.bawaan === true, JSON.stringify(cornell && { nama: cornell.nama, bawaan: cornell.bawaan }));
oke('templat bawaan lain tetap ada (jurnal, rapat, belajar)',
  ['b:jurnal', 'b:rapat', 'b:belajar'].every(id => daftar.some(t => t.id === id)));
oke('menu templat memuat b:cornell', tp.menuTemplat().includes('b:cornell'));

console.log('── Menerapkan ──');
state.notes.splice(0);
tp.terapkanTemplat('b:cornell');
const n = state.notes[0] || { blocks: [], id: null };
oke('menerapkan membuat satu catatan baru dan membukanya', state.notes.length === 1 && state.openId === n?.id);
const tbl = tabelDari(n.blocks);
oke('catatan memuat satu blok tabel', n.blocks.filter(b => b.type === 'table').length === 1, n.blocks.map(b => b.type).join(','));
oke('tabel: header Petunjuk | Catatan', tbl && JSON.stringify(tbl.meta.rows[0]) === JSON.stringify(['Petunjuk', 'Catatan']), tbl && JSON.stringify(tbl.meta.rows[0]));
oke('tabel: 6 baris isi kosong (header + 6 = 7 baris)', tbl && tbl.meta.rows.length === 7 && tbl.meta.rows.slice(1).every(r => r.length === 2 && r.every(c => c === '')), tbl && tbl.meta.rows.length);
const iTbl = n.blocks.indexOf(tbl);
const iRingkas = n.blocks.findIndex(b => /Ringkasan/.test(b.content || ''));
oke('Ringkasan ada di bawah tabel', iRingkas > iTbl && iTbl >= 0, `tabel=${iTbl} ringkasan=${iRingkas}`);
oke('id blok unik', new Set(n.blocks.map(b => b.id)).size === n.blocks.length);

console.log('── Render dan normalisasi ──');
const dom2 = nm.blocksToDom(n.blocks);
const wadah = d.createElement('div');
wadah.innerHTML = dom2;
const sel = wadah.querySelectorAll('.b-table td[contenteditable="true"]').length;
oke('sel tabel dirender sebagai contenteditable (6 baris × 2 kolom = 12)', sel === 12, `ditemukan ${sel}`);
oke('header tabel dirender sebagai th', wadah.querySelectorAll('.b-table thead th').length === 2);
const hidup = nm.normalizeNote(JSON.parse(JSON.stringify(n)));
const tblHidup = tabelDari(hidup.blocks);
oke('muat ulang: struktur tabel bertahan', tblHidup && JSON.stringify(tblHidup.meta.rows) === JSON.stringify(tbl.meta.rows));
oke('muat ulang: urutan blok bertahan', hidup.blocks.map(b => b.type).join(',') === n.blocks.map(b => b.type).join(','));

console.log('── Terapkan dua kali ──');
tp.terapkanTemplat('b:cornell');
const dua = state.notes[0] || { blocks: [] };
oke('dua penerapan: id blok tidak kembar', new Set([...n.blocks, ...dua.blocks].map(b => b.id)).size === n.blocks.length + dua.blocks.length);
oke('dua penerapan: dua catatan terpisah', state.notes.length === 2 && state.notes[1].id === n.id);

console.log('── Bahasa Inggris ──');
const bahasaAwal = i18n.bahasaSekarang();
i18n.setBahasa('en');
state.notes.splice(0);
tp.terapkanTemplat('b:cornell');
const en = state.notes[0] || { blocks: [], title: '' };
const tblEn = tabelDari(en.blocks);
oke('bahasa Inggris: kolom Cue | Notes', tblEn && JSON.stringify(tblEn.meta.rows[0]) === JSON.stringify(['Cue', 'Notes']), tblEn && JSON.stringify(tblEn.meta.rows[0]));
oke('bahasa Inggris: bagian Summary', en.blocks.some(b => /Summary/.test(b.content || '')));
oke('bahasa Inggris: judul Cornell', en.title === 'Cornell', en.title);
oke('menu Inggris: nama templat diterjemahkan', i18n.t('Catatan Cornell') === 'Cornell notes');
i18n.setBahasa(bahasaAwal);

console.log(`\nTotal: ${total} pengujian · Lulus: ${total - gagal} · Gagal: ${gagal}`);
if (gagal > 0) { console.log('GAGAL'); process.exit(1); }
process.exit(0);
