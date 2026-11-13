/* Pengujian Tahap 2 · B4 (penyaringan alamat tautan) — suite jsdom + Node.

   Yang diuji (docs/notes/url-aman.js dan note-model.js):
   • tautanAman: http(s), mailto, dan tel lolos; javascript:, vbscript:, data:, dan
     varian yang disamarkan (huruf besar, tab di tengah skema) ditolak;
   • bersihkanHrefHtml: href tidak aman dibuang, teks tautan tetap, href https dan '#' dibiarkan,
     entitas HTML yang menyamarkan skema juga ditangkap;
   • impor (normalizeNotes) untuk format baru dan format lama: bookmark dan href isi blok dibersihkan;
   • render (blocksToDom): tidak ada `javascript:` di HTML; bookmark aman mempertahankan URL-nya.

   Di luar cakupan (belum diperbaiki, lihat laporan): atribut lain yang bisa menjalankan
   skrip seperti onerror pada <img> di isi catatan. Uji ini TIDAK menyatakan itu aman. */
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
const ua = await import(`${AKAR}/docs/notes/url-aman.js?v=${V}`);
const nm = await import(`${AKAR}/docs/notes/note-model.js?v=${V}`);

let gagal = 0, total = 0;
const oke = (nama, baik, det = '') => {
  total++;
  if (!baik) { gagal++; console.log('FAIL', nama, det ? '\n      ' + det : ''); }
  else console.log('ok  ', nama);
};

console.log('── tautanAman ──');
oke('https dan http lolos', ua.tautanAman('https://hara.app/a?b=1') === 'https://hara.app/a?b=1' && ua.tautanAman('http://x.id') === 'http://x.id');
oke('mailto dan tel lolos', ua.tautanAman('mailto:a@b.id') === 'mailto:a@b.id' && ua.tautanAman('tel:+62812') === 'tel:+62812');
oke('javascript: ditolak', ua.tautanAman('javascript:alert(1)') === '');
oke('JavaScript: huruf campur ditolak', ua.tautanAman('JaVaScRiPt:alert(1)') === '');
oke('tab di tengah skema ditolak (java\\tscript:)', ua.tautanAman('java\tscript:alert(1)') === '');
oke('spasi dan kontrol di depan ditolak', ua.tautanAman('  \u0001javascript:alert(1)') === '');
oke('data: dan vbscript: ditolak', ua.tautanAman('data:text/html,<script>x</script>') === '' && ua.tautanAman('vbscript:msgbox(1)') === '');
oke('kosong dan null → kosong', ua.tautanAman('') === '' && ua.tautanAman(null) === '' && ua.tautanAman(undefined) === '');

console.log('── bersihkanHrefHtml ──');
const bersih1 = ua.bersihkanHrefHtml('<a href="javascript:alert(1)">klik</a>');
oke('href javascript: dibuang, teks tetap', !/javascript/i.test(bersih1) && />klik</.test(bersih1), bersih1);
const bersih2 = ua.bersihkanHrefHtml('<a href="https://hara.app" target="_blank">ok</a>');
oke('href https tetap', /href="https:\/\/hara\.app"/.test(bersih2), bersih2);
const bersih3 = ua.bersihkanHrefHtml('<a href="&#106;avascript:alert(1)">x</a>');
oke('entitas HTML yang menyamarkan javascript: ikut dibuang', !/href/.test(bersih3), bersih3);
const bersih4 = ua.bersihkanHrefHtml('<a href="#bagian">lompat</a>');
oke('href "#…" (tautan di tempat) dibiarkan', /href="#bagian"/.test(bersih4), bersih4);
oke('HTML tanpa <a> tidak diubah', ua.bersihkanHrefHtml('<b>tebal</b> teks') === '<b>tebal</b> teks');

console.log('── impor (normalizeNotes) ──');
const impor = nm.normalizeNotes([{ id: 'n1', title: 'Uji', blocks: [
  { id: 'bk', type: 'bookmark', meta: { url: 'javascript:alert(1)', title: 'Judul' } },
  { id: 'bk2', type: 'bookmark', meta: { url: 'https://hara.app/x', title: 'Aman' } },
  { id: 'pa', type: 'paragraph', content: 'Lihat <a class="lk" href="javascript:alert(2)">ini</a> dan <a class="lk" href="https://a.id">itu</a>' },
] }]);
const [bk, bk2, pa] = impor[0].blocks;
oke('bookmark dengan javascript: di-impor sebagai URL kosong', bk.meta.url === '', JSON.stringify(bk.meta));
oke('bookmark https tidak berubah', bk2.meta.url === 'https://hara.app/x');
oke('href javascript: di isi paragraf dibuang, teksnya tetap', !/javascript/.test(pa.content) && />ini</.test(pa.content), pa.content);
oke('href https di isi paragraf tetap', /href="https:\/\/a\.id"/.test(pa.content), pa.content);

const lama = nm.normalizeNotes([{ id: 'n2', t: 'Lama', html: '<a class="lk" href="javascript:alert(3)">z</a>', ts: 1 }]);
oke('format model lama juga dibersihkan', lama[0].blocks.every(b => !/javascript/.test(b.content || '')), JSON.stringify(lama[0].blocks.map(b => b.content)));

console.log('── render (blocksToDom) ──');
const htmlBk = nm.blocksToDom([bk]);
oke('bookmark tidak aman dirender dengan href "#", tanpa javascript:', !/javascript/.test(htmlBk) && /href="#"/.test(htmlBk), htmlBk.slice(0, 200));
oke('bookmark tidak aman: data-url kosong (dialog edit tidak menampilkan #)', /data-url=""/.test(htmlBk));
const htmlBk2 = nm.blocksToDom([bk2]);
oke('bookmark https dirender dengan href aslinya', /href="https:\/\/hara\.app\/x"/.test(htmlBk2) && /data-url="https:\/\/hara\.app\/x"/.test(htmlBk2));
const htmlPa = nm.blocksToDom([{ id: 'p9', type: 'paragraph', content: '<a class="lk" href="javascript:alert(4)">x</a>' }]);
oke('paragraf dengan href javascript: (lapisan kedua) tidak merender javascript:', !/javascript/.test(htmlPa), htmlPa);

console.log(`\nTotal: ${total} pengujian · Lulus: ${total - gagal} · Gagal: ${gagal}`);
if (gagal > 0) { console.log('GAGAL'); process.exit(1); }
process.exit(0);
