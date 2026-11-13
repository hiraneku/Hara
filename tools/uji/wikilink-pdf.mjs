/* Pengujian Tahap 2 · B3b (tautan halaman PDF: [[Nama.pdf#hal=4]]).

   Yang diuji (docs/notes/wikilink.js):
   • pisahTautan: #hal=N hanya untuk sasaran berakhiran .pdf; N ≥ 1; judul biasa tidak berubah;
   • cariBerkasPdf: berkas PDF yang dilampirkan di catatan (bukan catatan terhapus, tanpa membedakan besar-kecil);
   • sasaranPdfSpan: span wikilink dibaca sebagai tautan PDF dengan berkas yang ditemukan atau null;
   • tandaiTautan: tautan PDF yang berkasnya ada tidak mati; yang tidak ada mati.

   Yang TIDAK diuji di sini: membuka penampil di halaman N (Chromium, uji-tautan-pdf). */
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { indexedDB as fakeIDB } from 'fake-indexeddb';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const AKAR = process.cwd();

const dom = new JSDOM(fs.readFileSync('docs/index.html', 'utf8'), { url: 'https://x.test/', pretendToBeVisual: true });
const { window: w } = dom; w.indexedDB = fakeIDB;
for (const k of ['document', 'getSelection', 'HTMLElement', 'Node', 'Element', 'Range', 'MouseEvent', 'KeyboardEvent', 'Event', 'InputEvent', 'localStorage', 'Image', 'NodeFilter'])
  if (w[k] !== undefined) globalThis[k] = w[k];
globalThis.window = w; globalThis.self = w; globalThis.indexedDB = w.indexedDB;
globalThis.addEventListener = w.addEventListener.bind(w);
Object.defineProperty(globalThis, 'navigator', { value: w.navigator, configurable: true });
w.URL.createObjectURL = () => 'blob:x/1'; w.URL.revokeObjectURL = () => {}; globalThis.URL = w.URL;
const V = fs.readFileSync('docs/app.js', 'utf8').match(/\?v=(\d+)/)[1];
await import(`${AKAR}/docs/app.js?v=${V}`);
const store = await import(`${AKAR}/docs/core/store.js?v=${V}`);
const nm = await import(`${AKAR}/docs/notes/note-model.js?v=${V}`);
const wl = await import(`${AKAR}/docs/notes/wikilink.js?v=${V}`);

let gagal = 0, total = 0;
const oke = (nama, baik, det = '') => {
  total++;
  if (!baik) { gagal++; console.log('FAIL', nama, det ? '\n      ' + det : ''); }
  else console.log('ok  ', nama);
};
const json = x => JSON.stringify(x);

console.log('── pisahTautan (#hal=N) ──');
oke('Nama.pdf#hal=4 → halaman 4', json(wl.pisahTautan('Nama.pdf#hal=4')) === json({ judul: 'Nama.pdf', bagian: '', halaman: 4 }), json(wl.pisahTautan('Nama.pdf#hal=4')));
oke('huruf besar: Nama.PDF#HAL=12', json(wl.pisahTautan('Nama.PDF#HAL=12')) === json({ judul: 'Nama.PDF', bagian: '', halaman: 12 }));
oke('alias |Label diabaikan', json(wl.pisahTautan('Nama.pdf#hal=3|Lihat')) === json({ judul: 'Nama.pdf', bagian: '', halaman: 3 }));
oke('hal=0 bukan halaman (tetap bagian)', json(wl.pisahTautan('Nama.pdf#hal=0')) === json({ judul: 'Nama.pdf', bagian: 'hal=0' }), json(wl.pisahTautan('Nama.pdf#hal=0')));
oke('#hal=4 pada judul bukan PDF tetap bagian', json(wl.pisahTautan('Kuliah#hal=4')) === json({ judul: 'Kuliah', bagian: 'hal=4' }));
oke('Nama.pdf tanpa #hal tetap judul biasa', json(wl.pisahTautan('Nama.pdf')) === json({ judul: 'Nama.pdf', bagian: '' }));

console.log('── cariBerkasPdf ──');
const sebuahCatatan = (judul, blocks, extra = {}) => nm.makeNote({ title: judul, blocks, ...extra });
const cNormal = sebuahCatatan('Bahan kuliah', [nm.makeBlock({ type: 'file', meta: { blobId: 'pdf-1', name: 'Nama.pdf', mime: 'application/pdf', size: 10 } })]);
const cHapus = sebuahCatatan('Lama', [nm.makeBlock({ type: 'file', meta: { blobId: 'pdf-2', name: 'Hapus.pdf', mime: 'application/pdf' } })], { deletedAt: Date.now() });
const cBukanPdf = sebuahCatatan('Lampiran', [nm.makeBlock({ type: 'file', meta: { blobId: 'txt-1', name: 'Catatan.txt', mime: 'text/plain' } })]);
store.state.notes.push(cNormal, cHapus, cBukanPdf);
oke('PDF yang dilampirkan ditemukan', json(wl.cariBerkasPdf('Nama.pdf')) === json({ blobId: 'pdf-1', name: 'Nama.pdf' }), json(wl.cariBerkasPdf('Nama.pdf')));
oke('nama tidak membedakan besar-kecil', wl.cariBerkasPdf('nama.PDF') !== null);
oke('catatan terhapus diabaikan', wl.cariBerkasPdf('Hapus.pdf') === null);
oke('berkas non-PDF diabaikan', wl.cariBerkasPdf('Catatan.txt') === null);
oke('nama tidak ada → null', wl.cariBerkasPdf('Tidak-ada.pdf') === null && wl.cariBerkasPdf('') === null);

console.log('── sasaranPdfSpan & tandaiTautan ──');
const span = teks => { const s = document.createElement('span'); s.className = 'wl'; s.textContent = teks; return s; };
const sAda = span('[[Nama.pdf#hal=4]]');
const sudah = wl.sasaranPdfSpan(sAda);
oke('span PDF ada: judul, halaman, berkas', sudah && sudah.judul === 'Nama.pdf' && sudah.halaman === 4 && sudah.berkas.blobId === 'pdf-1', json(sudah));
oke('span PDF hilang: berkas null', (() => { const x = wl.sasaranPdfSpan(span('[[Hilang.pdf#hal=2]]')); return x && x.berkas === null && x.halaman === 2; })());
oke('span biasa bukan PDF → null', wl.sasaranPdfSpan(span('[[Bahan kuliah]]')) === null);

const root = document.createElement('div');
const a1 = span('[[Nama.pdf#hal=4]]'), a2 = span('[[Hilang.pdf#hal=2]]'), a3 = span('[[Bahan kuliah]]'), a4 = span('[[Tidak ada]]');
root.append(a1, document.createTextNode(' '), a2, document.createTextNode(' '), a3, document.createTextNode(' '), a4);
wl.tandaiTautan(root);
oke('tautan PDF yang berkasnya ada tidak mati', !a1.classList.contains('dead'));
oke('tautan PDF yang berkasnya tidak ada mati', a2.classList.contains('dead'));
oke('tautan catatan yang ada tidak mati', !a3.classList.contains('dead'));
oke('tautan catatan yang tidak ada mati', a4.classList.contains('dead'));

console.log(`\nTotal: ${total} pengujian · Lulus: ${total - gagal} · Gagal: ${gagal}`);
if (gagal > 0) { console.log('GAGAL'); process.exit(1); }
process.exit(0);
