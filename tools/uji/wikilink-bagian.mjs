/* Pengujian Tahap 2 · B3 (tautan ke bagian catatan: [[Judul#Bagian]] dan [[Judul#^ref]]).

   Yang diuji (docs/notes/wikilink.js):
   • pisahTautan: judul, bagian, alias, dan judul yang memang mengandung # (mis. "C#");
   • judulSpan / bagianSpan: span tautan dibaca dengan benar;
   • cariBagian: heading (abaikan besar-kecil, spasi, entitas HTML), blok dengan rujukan ^ref,
     dan tautan yang bagiannya tidak ada;
   • tandaiTautan: tautan [[Judul#Bagian]] ke catatan yang ada tidak ditandai mati.

   Yang TIDAK diuji di sini: lompat dan gulir di layar (lompat-tautan.js). Itu diuji di Chromium. */
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { indexedDB as fakeIDB } from 'fake-indexeddb';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const AKAR = process.cwd();

/* Lingkungan sama dengan uji penampil PDF: halaman utuh, lalu app.js dimuat lebih dulu
   supaya urutan inisialisasi modul sama dengan di aplikasi. */
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
const wl = await import(`${AKAR}/docs/notes/wikilink.js?v=${V}`);

let gagal = 0, total = 0;
const oke = (nama, baik, det = '') => {
  total++;
  if (!baik) { gagal++; console.log('FAIL', nama, det ? '\n      ' + det : ''); }
  else console.log('ok  ', nama);
};
const json = x => JSON.stringify(x);

store.state.notes = [
  {
    id: 'n-kuliah', title: 'Kuliah', blocks: [
      { id: 'b-judul', type: 'heading', content: '<b>Judul</b>  &amp; Dua', meta: { level: 2 } },
      { id: 'b-biasa', type: 'paragraph', content: 'Bagian Tiga', meta: {} },
      { id: 'b-ref', type: 'paragraph', content: 'Rujukan', meta: { ref: 'a3f2' } },
    ],
  },
  { id: 'n-c', title: 'C#', blocks: [] },
  { id: 'n-c2', title: 'C', blocks: [] },
];
const span = teks => ({ textContent: teks });

console.log('── pisahTautan ──');
oke('judul biasa tanpa bagian', json(wl.pisahTautan('Kuliah')) === json({ judul: 'Kuliah', bagian: '' }));
oke('judul dan bagian dipisah di #', json(wl.pisahTautan('Kuliah#Judul & Dua')) === json({ judul: 'Kuliah', bagian: 'Judul & Dua' }), json(wl.pisahTautan('Kuliah#Judul & Dua')));
oke('rujukan blok ^ref terbaca sebagai bagian', json(wl.pisahTautan('Kuliah#^a3f2')) === json({ judul: 'Kuliah', bagian: '^a3f2' }));
oke('alias |Label diabaikan', json(wl.pisahTautan('Kuliah#Judul|Lihat')) === json({ judul: 'Kuliah', bagian: 'Judul' }));
oke('judul yang memang mengandung # (C#) tidak dipecah', json(wl.pisahTautan('C#')) === json({ judul: 'C#', bagian: '' }));
oke('#Bagian tanpa judul → judul null', json(wl.pisahTautan('#Judul')) === json({ judul: null, bagian: 'Judul' }));
oke('teks kosong → judul null', json(wl.pisahTautan('  ')) === json({ judul: null, bagian: '' }));

console.log('── judulSpan dan bagianSpan ──');
oke('judulSpan membuang bagian', wl.judulSpan(span('[[Kuliah#Judul & Dua]]')) === 'Kuliah');
oke('bagianSpan mengambil bagian', wl.bagianSpan(span('[[Kuliah#Judul & Dua]]')) === 'Judul & Dua');
oke('judulSpan tanpa # tetap utuh', wl.judulSpan(span('[[Kuliah]]')) === 'Kuliah' && wl.bagianSpan(span('[[Kuliah]]')) === '');
oke('span yang bukan [[…]] → null dan bagian kosong', wl.judulSpan(span('biasa')) === null && wl.bagianSpan(span('biasa')) === '');

console.log('── cariBagian ──');
const kuliah = store.state.notes[0];
oke('heading dicocokkan walau besar-kecil, spasi ganda, dan entitas HTML',
  wl.cariBagian(kuliah, 'JUDUL & dua') === 'b-judul', String(wl.cariBagian(kuliah, 'JUDUL & dua')));
oke('paragraf biasa dengan teks yang sama tidak dianggap heading', wl.cariBagian(kuliah, 'Bagian Tiga') === null);
oke('rujukan ^ref mencari blok dengan meta.ref', wl.cariBagian(kuliah, '^a3f2') === 'b-ref');
oke('rujukan ^ref yang tidak ada → null', wl.cariBagian(kuliah, '^xxxx') === null);
oke('bagian kosong atau catatan kosong → null', wl.cariBagian(kuliah, '') === null && wl.cariBagian(null, 'Judul') === null);
oke('heading yang tidak ada → null', wl.cariBagian(kuliah, 'Tidak ada') === null);

console.log('── tandaiTautan: tautan bagian tidak dianggap mati ──');
const root = document.createElement('div');
root.innerHTML = '<span class="wl">[[Kuliah#Judul &amp; Dua]]</span> <span class="wl">[[Hilang#Apa]]</span> <span class="wl">[[C#]]</span>';
wl.tandaiTautan(root);
const [a, b, c] = root.querySelectorAll('span.wl');
oke('[[Kuliah#…]] ke catatan yang ada: hidup', !a.classList.contains('dead'), a.className);
oke('[[Hilang#…]] ke catatan yang tidak ada: mati', b.classList.contains('dead'), b.className);
oke('[[C#]] dengan catatan bernama "C#": hidup', !c.classList.contains('dead'), c.className);

console.log(`\nTotal: ${total} pengujian · Lulus: ${total - gagal} · Gagal: ${gagal}`);
if (gagal > 0) { console.log('GAGAL'); process.exit(1); }
process.exit(0);
