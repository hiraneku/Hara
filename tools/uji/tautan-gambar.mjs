/* Pengujian Tahap 2 · B4 (tautan pada gambar dan objek tulisan/sketsa).

   Yang diuji (docs/notes/note-model.js, tautan-gambar.js):
   • render: figur gambar dengan tautan punya data-url dan lencana .img-tautan (href aman);
   • render: alamat tidak aman tidak pernah ditulis (tidak ada data-url, tidak ada lencana);
   • baca balik dari DOM (elToBlock): meta.url dipertahankan, alamat tidak aman dibuang;
   • impor JSON (normalizeNotes): gambar dengan javascript: dibersihkan;
   • objek sketsa (data-goresan + data-url) keduanya ikut tersimpan;
   • alamatDariInput: tanpa skema jadi https, javascript: ditolak;
   • terapkanTautanKeFigur: pasang, ganti, dan lepas tautan tanpa lencana ganda.

   Yang TIDAK diuji di sini: popup dialog dan klik lencana di layar (Chromium). */
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
const nm = await import(`${AKAR}/docs/notes/note-model.js?v=${V}`);
const tg = await import(`${AKAR}/docs/notes/tautan-gambar.js?v=${V}`);

let gagal = 0, total = 0;
const oke = (nama, baik, det = '') => {
  total++;
  if (!baik) { gagal++; console.log('FAIL', nama, det ? '\n      ' + det : ''); }
  else console.log('ok  ', nama);
};
const SKETSA = '{"v":5,"latar":"putih","pola":"polos","kanvas":{"w":720,"h":460},"goresan":[],"objek":[]}';
const figurDari = (meta) => {
  const wrap = document.createElement('div');
  wrap.innerHTML = nm.blockToHtml(nm.makeBlock({ type: 'image', meta }));
  return wrap.firstElementChild;
};

console.log('── render ──');
const f1 = figurDari({ blobId: 'b1', url: 'https://hara.app/a' });
oke('gambar dengan tautan punya data-url', f1.getAttribute('data-url') === 'https://hara.app/a');
const lencana = f1.querySelectorAll(':scope > a.img-tautan');
oke('lencana tepat satu, href aman, tab baru', lencana.length === 1 && lencana[0].getAttribute('href') === 'https://hara.app/a' && lencana[0].getAttribute('target') === '_blank' && /noopener/.test(lencana[0].getAttribute('rel') || ''));
const f2 = figurDari({ blobId: 'b2', url: 'javascript:alert(1)' });
oke('javascript: tidak pernah ditulis (tanpa data-url dan lencana)', !f2.hasAttribute('data-url') && !f2.querySelector('.img-tautan') && !/javascript/.test(f2.outerHTML), f2.outerHTML.slice(0, 200));
const f3 = figurDari({ blobId: 'b3' });
oke('gambar tanpa tautan tidak berubah (tanpa lencana)', !f3.hasAttribute('data-url') && !f3.querySelector('.img-tautan'));

console.log('── sketsa (objek tulisan) ──');
const f4 = figurDari({ blobId: 'sk1', alt: 'sketsa', sketch: true, goresan: SKETSA, url: 'mailto:a@b.id' });
oke('sketsa: data-goresan dan data-url keduanya ada', f4.hasAttribute('data-goresan') && f4.getAttribute('data-url') === 'mailto:a@b.id' && f4.hasAttribute('data-sketch'));
const bsk = nm.elToBlock(f4);
oke('sketsa: baca balik meta.url dan goresan', bsk.meta.url === 'mailto:a@b.id' && bsk.meta.goresan === SKETSA && bsk.meta.sketch === true, JSON.stringify(bsk.meta).slice(0, 200));

console.log('── baca balik dari DOM (elToBlock) ──');
const bA = nm.elToBlock(f1);
oke('meta.url dipertahankan saat baca balik', bA.meta.url === 'https://hara.app/a', JSON.stringify(bA.meta));
const fTampil = figurDari({ blobId: 'b5' });
fTampil.setAttribute('data-url', 'javascript:alert(9)');
oke('data-url tidak aman di DOM dibuang saat baca balik', nm.elToBlock(fTampil).meta.url === undefined);

console.log('── impor (normalizeNotes) ──');
const impor = nm.normalizeNotes([{ id: 'n1', title: 'Uji', blocks: [
  { id: 'g1', type: 'image', meta: { blobId: 'x', url: 'javascript:alert(2)' } },
  { id: 'g2', type: 'image', meta: { blobId: 'y', url: 'https://ok.id/x' } },
] }]);
const [ig1, ig2] = impor[0].blocks;
oke('impor: gambar dengan javascript: dibersihkan', !ig1.meta.url, JSON.stringify(ig1.meta));
oke('impor: gambar dengan https tidak berubah', ig2.meta.url === 'https://ok.id/x');

console.log('── alamatDariInput ──');
oke('tanpa skema → https', tg.alamatDariInput('contoh.id/a') === 'https://contoh.id/a');
oke('https dibiarkan', tg.alamatDariInput('https://hara.app') === 'https://hara.app');
oke('javascript: ditolak (kosong)', tg.alamatDariInput('javascript:alert(1)') === '');
oke('JaVaScRiPt: ditolak', tg.alamatDariInput('JaVaScRiPt:alert(1)') === '');
oke('kosong → kosong', tg.alamatDariInput('   ') === '');

console.log('── terapkanTautanKeFigur ──');
const fx = figurDari({ blobId: 'z1' });
document.body.appendChild(fx);
tg.terapkanTautanKeFigur(fx, 'https://a.id');
tg.terapkanTautanKeFigur(fx, 'https://b.id');
oke('ganti tautan: satu lencana, URL terbaru', fx.querySelectorAll('.img-tautan').length === 1 && fx.getAttribute('data-url') === 'https://b.id' && fx.querySelector('.img-tautan').getAttribute('href') === 'https://b.id');
tg.terapkanTautanKeFigur(fx, '');
oke('lepas tautan: tanpa data-url dan lencana', !fx.hasAttribute('data-url') && !fx.querySelector('.img-tautan'));
oke('lepas tautan: gambar tetap ada', !!fx.querySelector('img[data-blob="z1"]'));

console.log(`\nTotal: ${total} pengujian · Lulus: ${total - gagal} · Gagal: ${gagal}`);
if (gagal > 0) { console.log('GAGAL'); process.exit(1); }
process.exit(0);
