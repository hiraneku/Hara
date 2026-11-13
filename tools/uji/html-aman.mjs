/* Pengujian Tahap 2 · B4c (penyaringan HTML isi blok: on*, <iframe>, <img onerror>, dll).

   Yang diuji (docs/notes/html-aman.js, note-model.js, editor/paste.js):
   • bersihkanHtmlBlok: tag berbahaya dibuang beserta isi; semua on*; href/src berbahaya; <use> ke luar;
     animasi SVG; style berbahaya; form. Atribut data-*, class, dan tautan https dibiarkan;
   • normal content tidak berubah (teks, span wikilink, tautan aman, ikon lokal #…);
   • impor (normalizeNotes): format baru dan lama disaring, blok kode tidak disentuh;
   • render (blocksToDom): isi berbahaya yang masuk lewat jalur lain tetap disaring;
   • tempelan (htmlKeBaris): clipboard HTML berbahaya tidak menghasilkan atribut on*.

   Yang TIDAK diuji di sini: apakah onerror benar-benar tidak terpicu di Chromium (lihat laporan). */
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
const ha = await import(`${AKAR}/docs/notes/html-aman.js?v=${V}`);
const nm = await import(`${AKAR}/docs/notes/note-model.js?v=${V}`);
const paste = await import(`${AKAR}/docs/notes/editor/paste.js?v=${V}`);

let gagal = 0, total = 0;
const oke = (nama, baik, det = '') => {
  total++;
  if (!baik) { gagal++; console.log('FAIL', nama, det ? '\n      ' + det : ''); }
  else console.log('ok  ', nama);
};
const S = ha.bersihkanHtmlBlok;
const bebas = h => !/onerror|onload|onclick|onmouseover|javascript:|<iframe|<script|<style|<object|<embed|<form|<animate|<set\b/i.test(h);

console.log('── bersihkanHtmlBlok: serangan ──');
oke('img onerror dibuang, img tetap', (() => { const h = S('<img src="x" onerror="alert(1)">'); return !/onerror/.test(h) && /<img/.test(h); })(), S('<img src="x" onerror="alert(1)">'));
oke('svg onload dibuang, svg tetap', (() => { const h = S('<svg onload="alert(1)"><circle r="2"/></svg>'); return !/onload/.test(h) && /<svg/.test(h); })(), S('<svg onload="alert(1)"><circle r="2"/></svg>'));
oke('iframe dibuang beserta isinya', !/iframe|evil/.test(S('<iframe src="https://evil.x"></iframe>teks')) && /teks/.test(S('<iframe src="https://evil.x"></iframe>teks')));
oke('script dibuang, teks di sekitarnya tetap', (() => { const h = S('a<script>alert(1)</script>b'); return !/script/.test(h) && /a/.test(h) && /b/.test(h); })(), S('a<script>alert(1)</script>b'));
oke('style dibuang', !/style/.test(S('<style>body{display:none}</style>x')));
oke('object dan embed dibuang', !/object|embed/i.test(S('<object data="x.swf"></object><embed src="y">z')));
oke('form dan formaction dibuang', !/form|formaction/i.test(S('<form action="x"><button formaction="javascript:alert(1)">k</button></form>')));
oke('a href javascript: dibuang, teks tetap', (() => { const h = S('<a href="javascript:alert(1)">klik</a>'); return !/href/.test(h) && />klik</.test(h); })(), S('<a href="javascript:alert(1)">klik</a>'));
oke('a href dengan entitas &#106; dibuang', !/href/.test(S('<a href="&#106;avascript:alert(1)">x</a>')));
oke('a href tab/kontrol di skema dibuang', !/href/.test(S('<a href="java\tscript:alert(1)">x</a>')));
oke('img src javascript: dibuang', !/src/.test(S('<img src="javascript:alert(1)">')));
oke('svg animate (set href javascript:) dibuang', !/animate/.test(S('<svg><animate attributeName="href" values="javascript:alert(1)"/></svg>')));
oke('use ke luar dibuang, use lokal #i-link dibiarkan', (() => { const a = S('<svg><use href="http://evil.x/s.svg#a"/></svg>'); const b = S('<svg><use href="#i-link"/></svg>'); return !/href/.test(a) && /href="#i-link"/.test(b); })());
oke('style url(javascript:) dibuang, style lebar dibiarkan', (() => { const a = S('<span style="background:url(javascript:alert(1))">x</span>'); const b = S('<span style="width:50%">x</span>'); return !/style/.test(a) && /width:50%/.test(b); })());
oke('onclick pada tautan aman: href tetap, onclick dibuang', (() => { const h = S('<a href="https://a.id" onclick="x()">y</a>'); return /href="https:\/\/a\.id"/.test(h) && !/onclick/.test(h); })());

console.log('── bersihkanHtmlBlok: normal tidak berubah ──');
const normal = ['<b>tebal</b> dan <i>miring</i>', '<span class="wl">[[Judul#Bagian]]</span>', '<a class="lk" href="https://hara.app" target="_blank" rel="noopener">situs</a>', '<a href="#bagian">lompat</a>', 'teks biasa tanpa markup', '<mark class="sorot">x</mark>'];
for (const n of normal) oke('tidak berubah: ' + n.slice(0, 40), S(n) === n, S(n));
oke('atribut data-* dan class dibiarkan', (() => { const h = S('<div data-goresan="{&quot;v&quot;:5}" data-url="https://a.id" class="b-img">x</div>'); return /data-goresan=/.test(h) && /data-url="https:\/\/a\.id"/.test(h) && /class="b-img"/.test(h); })());
oke('PERLU_SARING: markup normal tidak memicu', !ha.PERLU_SARING.test('<span class="wl">[[a]]</span> <b>x</b> <a class="lk" href="https://a.id">y</a>'));
oke('PERLU_SARING: markup berbahaya memicu', ha.PERLU_SARING.test('<img src=x onerror=alert(1)>') && ha.PERLU_SARING.test('<iframe></iframe>') && ha.PERLU_SARING.test('<a href="javascript:x">y</a>'));

console.log('── impor (normalizeNotes) ──');
const impor = nm.normalizeNotes([{ id: 'n1', title: 'Uji', blocks: [
  { id: 'p1', type: 'paragraph', content: 'Halo <img src="x" onerror="alert(1)"> <a href="javascript:alert(2)" onclick="x()">tautan</a>' },
  { id: 'p2', type: 'paragraph', content: '<iframe src="https://evil.x"></iframe>aman' },
  { id: 'k1', type: 'code', content: '<img src=x onerror=alert(3)>' },
  { id: 'g1', type: 'image', meta: { blobId: 'b', url: 'https://ok.id' }, content: '<b onmouseover="x()">z</b>' },
] }]);
const [p1, p2, k1, g1] = impor[0].blocks;
oke('impor: on* dan href javascript: di paragraf dibuang, teks tetap', bebas(p1.content) && /Halo/.test(p1.content) && />tautan</.test(p1.content), p1.content);
oke('impor: iframe dibuang, teks aman tetap', bebas(p2.content) && /aman/.test(p2.content), p2.content);
oke('impor: blok kode tidak disentuh (isi teks)', k1.content === '<img src=x onerror=alert(3)>', k1.content);
oke('impor: blok gambar dengan on* di isi disaring, url tetap', bebas(g1.content || '') && g1.meta.url === 'https://ok.id', JSON.stringify(g1));
const lama = nm.normalizeNotes([{ id: 'n2', t: 'Lama', html: '<p>x <img src=x onerror="alert(4)"></p>', ts: 1 }]);
oke('impor format lama: on* dibuang', lama[0].blocks.every(b => bebas(b.content || '')), JSON.stringify(lama[0].blocks.map(b => b.content)));

console.log('── render (blocksToDom) ──');
const r = nm.blocksToDom([nm.makeBlock({ type: 'paragraph', content: '<img src=x onerror="alert(5)">ok' })]);
oke('render: isi berbahaya yang lolos jalur lain tetap disaring', bebas(r) && /ok/.test(r), r.slice(0, 160));
const rNormal = nm.blocksToDom([nm.makeBlock({ type: 'paragraph', content: '<span class="wl">[[Judul]]</span>' })]);
oke('render: markup normal tidak berubah', /<span class="wl">\[\[Judul\]\]<\/span>/.test(rNormal), rNormal.slice(0, 160));

console.log('── tempelan (htmlKeBaris) ──');
const brs = paste.htmlKeBaris('<p>halo <img src="x" onerror="window.__xss=1"></p><p onmouseover="x()">dua</p>');
const hasilTempel = JSON.stringify(brs);
oke('tempelan: onerror dan onmouseover tidak ikut', bebas(hasilTempel) && /halo/.test(hasilTempel) && /dua/.test(hasilTempel), hasilTempel.slice(0, 200));
oke('tempelan: window.__xss tidak pernah dijalankan', w.__xss === undefined);

console.log(`\nTotal: ${total} pengujian · Lulus: ${total - gagal} · Gagal: ${gagal}`);
if (gagal > 0) { console.log('GAGAL'); process.exit(1); }
process.exit(0);
