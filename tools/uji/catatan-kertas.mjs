/* Pengujian Tahap 1 · B7a (latar kertas per catatan) — suite jsdom.

   Yang diuji:
   • model: `kertas` hanya disimpan bila titik/garis/grid; polos tidak disimpan;
   • setter: ubah, hapus (polos), tolak jenis tak dikenal, catatan tak ada;
   • editor: class latar pada .ed-doc ikut berubah tanpa memuat ulang;
   • normalisasi (muat ulang) dan duplikasi catatan mempertahankan latar;
   • menu "···" punya aksi "kertas"; dialog memilih latar dan menandai pilihan aktif;
   • CSS: setiap jenis punya aturan latar.

   Jalan: node tools/uji/catatan-kertas.mjs (dari folder repo). */
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
const nm = await st('notes/note-model.js');
const { makeNote, makeBlock } = nm;
const model = await st('notes/model.js');
const kertas = await st('notes/kertas.js');
const menu = await st('notes/menus/note-menu.js');
const d = w.document;
const sleep = (ms = 25) => new Promise(r => setTimeout(r, ms));
const klik = el => { if (el) el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true, view: w })); };

let gagal = 0, total = 0;
const oke = (nama, baik, det = '') => {
  total++;
  if (!baik) { gagal++; console.log('FAIL', nama, det ? '\n      ' + det : ''); }
  else console.log('ok  ', nama);
};

const buatCatatan = (id, extra = {}) => {
  const n = makeNote({ id, title: 'Uji kertas ' + id, createdAt: Date.now() - 5000, updatedAt: Date.now() - 5000,
    blocks: [makeBlock({ type: 'paragraph', content: 'Isi tidak boleh berubah' })], ...extra });
  state.notes.unshift(n);
  return n;
};

console.log('── Model ──');
oke('catatan baru: tanpa field kertas (bawaan polos)', !('kertas' in makeNote({ title: 'x' })));
oke('kertas grid disimpan', makeNote({ kertas: 'grid' }).kertas === 'grid');
oke('kertas titik dan garis disimpan', makeNote({ kertas: 'titik' }).kertas === 'titik' && makeNote({ kertas: 'garis' }).kertas === 'garis');
oke('kertas polos tidak disimpan', !('kertas' in makeNote({ kertas: 'polos' })));
oke('jenis tak dikenal tidak disimpan', !('kertas' in makeNote({ kertas: 'xyz' })));
oke('kelasKertas: titik/garis/grid dipetakan, polos kosong',
  nm.kelasKertas('titik') === 'kertas-titik' && nm.kelasKertas('garis') === 'kertas-garis' && nm.kelasKertas('grid') === 'kertas-grid' && nm.kelasKertas('polos') === '' && nm.kelasKertas(undefined) === '');

console.log('── Setter ──');
const n1 = buatCatatan('k1');
const tAwal = n1.updatedAt;
oke('atur ke titik', kertas.setKertasCatatan('k1', 'titik') === true && n1.kertas === 'titik');
oke('mengubah kertas memperbarui updatedAt', n1.updatedAt > tAwal);
oke('ganti ke grid', kertas.setKertasCatatan('k1', 'grid') === true && n1.kertas === 'grid');
oke('polos menghapus field (kembali bawaan)', kertas.setKertasCatatan('k1', 'polos') === true && !('kertas' in n1));
oke('jenis tak dikenal ditolak dan tidak mengubah', kertas.setKertasCatatan('k1', 'xyz') === false && !('kertas' in n1));
oke('catatan tak ada ditolak', kertas.setKertasCatatan('tidak-ada', 'grid') === false);
oke('isi blok tidak berubah', n1.blocks[0].content === 'Isi tidak boleh berubah');

console.log('── Editor (.ed-doc) ──');
const n2 = buatCatatan('k2', { kertas: 'garis' });
model.openNote('k2');
await sleep(40);
const doc = () => d.querySelector('.ed-doc');
oke('editor terbuka dengan latar garis dari data', !!doc() && doc().classList.contains('kertas-garis'), doc() && doc().className);
kertas.setKertasCatatan('k2', 'grid');
oke('ganti latar: class .ed-doc berganti tanpa muat ulang', doc().classList.contains('kertas-grid') && !doc().classList.contains('kertas-garis'), doc().className);
kertas.setKertasCatatan('k2', 'polos');
oke('polos: tidak ada class latar di .ed-doc', !/kertas-/.test(doc().className), doc().className);
oke('editor tetap contenteditable', doc().getAttribute('contenteditable') === 'true');

console.log('── Normalisasi, duplikasi, menu ──');
kertas.setKertasCatatan('k2', 'titik');
const { normalizeNote } = nm;
const hidup = normalizeNote(JSON.parse(JSON.stringify(n2)));
oke('muat ulang (normalizeNote) mempertahankan titik', hidup.kertas === 'titik', String(hidup.kertas));
oke('catatan lama tanpa field tetap tanpa latar', !('kertas' in normalizeNote({ id: 'lama', title: 'lama', blocks: [] })));
model.duplikatNote();
const salin = state.notes[0];
oke('duplikasi menyalin latar', salin.id !== 'k2' && salin.kertas === 'titik', JSON.stringify({ id: salin.id, kertas: salin.kertas }));
const html = menu.menuCatatan();
oke('menu "···" memuat aksi kertas', html.includes('data-note-act="kertas"'));
oke('menu memuat label Latar kertas', html.includes('Latar kertas'));

console.log('── Dialog pilihan ──');
model.openNote('k2');
await sleep(30);
kertas.bukaDialogKertasCatatan();
await sleep(20);
const pilihan = Array.from(d.querySelectorAll('#pop [data-kertas-pick]')).map(b => b.dataset.kertasPick);
oke('dialog memuat 4 pilihan: polos, titik, garis, grid', JSON.stringify(pilihan) === JSON.stringify(['polos', 'titik', 'garis', 'grid']), pilihan.join(','));
oke('pilihan aktif = titik (kertas catatan sekarang)', d.querySelector('#pop [data-kertas-pick="titik"]')?.classList.contains('sel'));
klik(d.querySelector('#pop [data-kertas-pick="garis"]'));
await sleep(30);
oke('pilih Garis buku: catatan berubah', state.notes.find(x => x.id === 'k2').kertas === 'garis');
oke('pilih Garis buku: editor ikut berubah', doc().classList.contains('kertas-garis'));
kertas.bukaDialogKertasCatatan();
kertas.bukaDialogKertasCatatan();
await sleep(20);
klik(d.querySelector('#pop [data-kertas-pick="grid"]'));
await sleep(30);
/* Catatan: pendengar yang menumpuk tidak terlihat di sini (hasilnya idempoten); penjagaan di kode itu defensif. */
oke('dibuka dua kali: pilihan terakhir tetap yang dipakai',
  state.notes.find(x => x.id === 'k2').kertas === 'grid' && doc().classList.contains('kertas-grid'));

console.log('── CSS ──');
const css = fs.readFileSync('docs/styles/notes.css', 'utf8');
for (const j of ['titik', 'garis', 'grid'])
  oke(`notes.css punya latar .ed-doc.kertas-${j}`, new RegExp(`\\.ed-doc\\.kertas-${j}\\{[^}]*background-image`).test(css));

console.log('── Hasil ──');
console.log(`\nTotal: ${total} pengujian · Lulus: ${total - gagal} · Gagal: ${gagal}`);
if (gagal > 0) { console.log('GAGAL'); process.exit(1); }
process.exit(0);
