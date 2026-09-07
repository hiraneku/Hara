/* Uji tata letak gambar: ukuran (preset + gagang seret), posisi
   (perataan + geser halus), rotasi bebas −180..180, panel "Atur gambar",
   dan pulang-pergi atribut figur ⇄ meta blok (data-gw/gr/ga/go).

   BAG=A model, B=UI, C=baca & buka-ulang — tiap bagian proses terpisah.
   Jalankan: node tools/uji/tata-gambar.mjs */
import { JSDOM } from 'jsdom';
import fs from 'fs';
import { indexedDB as fakeIDB } from 'fake-indexeddb';
import path from 'path';
import { fileURLToPath } from 'url';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const AKAR = process.cwd();
const dom = new JSDOM(fs.readFileSync('docs/index.html', 'utf8'),
  { url: 'https://x.test/', pretendToBeVisual: true });
const { window: w } = dom; w.indexedDB = fakeIDB;
for (const k of ['document', 'getSelection', 'HTMLElement', 'Node', 'Range',
  'MouseEvent', 'Event', 'InputEvent', 'localStorage', 'Image', 'Blob', 'File',
  'NodeFilter'])
  if (w[k] !== undefined) globalThis[k] = w[k];
globalThis.window = w; globalThis.self = w; globalThis.indexedDB = w.indexedDB;
globalThis.addEventListener = w.addEventListener.bind(w);
Object.defineProperty(globalThis, 'navigator', { value: w.navigator, configurable: true });
w.URL.createObjectURL = () => 'blob:x/1'; w.URL.revokeObjectURL = () => {};
globalThis.URL = w.URL;
const V = fs.readFileSync('docs/app.js', 'utf8').match(/\?v=(\d+)/)[1];
const st = (...p) => import(`${AKAR}/docs/${p.join('/')}?v=${V}`);
await st('app.js');
const { state } = await st('core/store.js');
const { makeNote, makeBlock, blockToHtml } = await st('notes/note-model.js');
const { openNote } = await st('notes/model.js');
const { saveNow } = await st('notes/editor/cleanup.js');
const mode = await st('notes/mode-baca.js');
const { simpanBlob } = await st('core/blobs.js');
const d = w.document;
const sleep = (ms = 25) => new Promise(r => setTimeout(r, ms));
let no = 0, g = 0;
const ok = (n, c, det = '') => { no++; if (c) console.log('LULUS', n); else { g++; console.log('FAIL', n, det); } };
const DOC = () => d.querySelector('.ed-doc');
const N = () => state.notes.find(x => x.id === state.openId);
const blokGambar = () => (N() ? N().blocks : []).find(b => b.type === 'image');
const fig = () => DOC() ? DOC().querySelector('.b-img') : null;
const popOn = () => { const p = d.getElementById('pop'); return !!(p && p.classList.contains('on')); };
const klik = el => { if (!el) return false;
  el.dispatchEvent(new w.MouseEvent('pointerdown', { bubbles: true, cancelable: true }));
  el.dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  el.dispatchEvent(new w.MouseEvent('mouseup', { bubbles: true, cancelable: true }));
  el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  return true; };
const sembunyi = (el, prop) => {   /* stub rect geometri di jsdom */
  const r = { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON() {} };
  Object.defineProperty(el, prop || 'getBoundingClientRect', {
    configurable: true, value: () => r });
  return o => Object.assign(r, o);
};
const MOUSE = (t, x) => new w.MouseEvent(t, { bubbles: true, cancelable: true, clientX: x, button: 0 });
const BAG = process.env.BAG;
const selesai = () => { console.log(`total: ${no} · gagal: ${g}`); process.exit(g ? 1 : 0); };
if (!BAG) {
  const { spawnSync } = await import('node:child_process');
  const sendiri = fileURLToPath(import.meta.url);
  let tn = 0, tg = 0;
  for (const b of ['A', 'B', 'C']) {
    const r = spawnSync(process.execPath, [sendiri], { env: { ...process.env, BAG: b },
      cwd: process.cwd(), encoding: 'utf8' });
    const m = (r.stdout || '').match(/total: (\d+) · gagal: (\d+)/);
    console.log(`── tata-gambar BAG ${b} ${r.status === 0 ? 'OK' : 'GAGAL'}` +
      (m ? ` (${m[1]}/${m[2]})` : ''));
    if (r.status !== 0)
      console.log((r.stdout || '').split('\n').filter(x => /^FAIL/.test(x)).join('\n'));
    if (m) { tn += +m[1]; tg += +m[2]; }
  }
  console.log(`total: ${tn} · gagal: ${tg}`);
  process.exit(tg ? 1 : 0);
}

const catatanBergambar = (id, meta) => makeNote({ id, title: id, blocks: [
  makeBlock({ type: 'image', content: '', meta: { blobId: 'f-' + id, alt: id + '.png', ...meta } }),
  makeBlock({ type: 'paragraph', content: 'lanjut mengetik di sini' }),
] });
const tataHtml = meta => blockToHtml(makeBlock({
  type: 'image', content: '', meta: { blobId: 'b1', alt: 'x', ...meta } }));

if (BAG === 'A') {
  console.log('══ A. PULANG-PERG I MODEL: meta ⇄ HTML ⇄ meta ══');
  const h = tataHtml({ w: 60, rot: 12, align: 'c', off: 6 });
  ok('A1 render: class tata + i-c',
     h.includes('b-img') && h.includes('tata') && h.includes('i-c'), h.slice(0, 90));
  ok('A2 render: style lebar/miring/geser', h.includes('width:60%') && h.includes('--gr:12deg') &&
     h.includes('--go:6px'), h.slice(0, 140));
  ok('A3 render: atribut data-gw/gr/ga/go', h.includes('data-gw="60"') && h.includes('data-gr="12"') &&
     h.includes('data-ga="c"') && h.includes('data-go="6"'));
  const wadah = d.createElement('div');
  wadah.innerHTML = h;
  const meta = {};
  const el = wadah.firstElementChild;
  const gw = el.getAttribute('data-gw'); meta.w = parseInt(gw, 10);
  const gr = el.getAttribute('data-gr'); meta.rot = parseInt(gr, 10);
  const ga = el.getAttribute('data-ga'); meta.align = ga;
  const go = el.getAttribute('data-go'); meta.off = parseInt(go, 10);
  ok('A4 baca balik dari DOM sama', meta.w === 60 && meta.rot === 12 &&
     meta.align === 'c' && meta.off === 6, JSON.stringify(meta));

  const lama = tataHtml({});   /* gambar lama tanpa pengaturan */
  ok('A5 gambar lama: tanpa class/style/atribut baru',
     !lama.includes(' tata') && !lama.includes('data-gw') && !lama.includes('style='),
     lama.slice(0, 80));

  const jepitR = tataHtml({ w: 5, rot: 200, align: 'x', off: 999 });
  ok('A6 render menjepit nilai di luar batas', jepitR.includes('width:100%') &&
     jepitR.includes('--gr:180deg') && jepitR.includes('--go:400px') &&
     !jepitR.includes('data-ga'), jepitR.slice(0, 140));

  const jepitB = tataHtml({ w: 130, rot: -190 });
  ok('A7 jepitan sisi bawah', jepitB.includes('width:100%') && jepitB.includes('--gr:-180deg'));

  const dd = d.createElement('div');
  dd.innerHTML = tataHtml({ w: 80, rot: -15, align: 'l', off: -3 });
  const blk = [...dd.children].map(el2 => {
    const m = {};
    const a = el2.getAttribute.bind(el2);
    const gw2 = a('data-gw'); if (gw2) m.w = parseInt(gw2, 10);
    const gr2 = a('data-gr'); if (gr2) m.rot = parseInt(gr2, 10);
    const ga2 = a('data-ga'); if (ga2) m.align = ga2;
    const go2 = a('data-go'); if (go2) m.off = parseInt(go2, 10);
    return m;
  })[0];
  ok('A8 baca balik tangan sama persis (w/rot/align/off)',
     blk.w === 80 && blk.rot === -15 && blk.align === 'l' && blk.off === -3,
     JSON.stringify(blk));
  selesai();
}

if (BAG === 'B') {
  console.log('══ B. UI: pilih gambar, panel, preset, slider, gagang ══');
  state.notes.splice(0);
  state.notes.push(catatanBergambar('g1'));
  await simpanBlob('f-g1', new w.Blob(['x'], { type: 'image/png' }));
  await openNote('g1'); await sleep(120);
  ok('B1 editor punya figur + gambar', !!fig() && !!DOC().querySelector('img[data-blob][src]'));

  const lebarKolom = sembunyi(DOC());
  lebarKolom({ left: 40, width: 800, height: 900 });

  klik(fig());
  ok('B2 ketuk gambar → terpilih + gagang', fig().classList.contains('img-pilih') &&
     !!fig().querySelector('.img-grip'));
  ok('B3 panel "Atur gambar" terbuka', popOn() &&
     /Atur gambar/.test(d.getElementById('pop').textContent));

  const chip60 = d.querySelector('#pop [data-gw="60"]');
  klik(chip60);
  ok('B4 preset 60% → gaya+atribut', fig().style.width === '60%' &&
     fig().getAttribute('data-gw') === '60' && fig().classList.contains('tata'),
     fig().outerHTML.slice(0, 160));

  const chipR = d.querySelector('#pop [data-ga="r"]');
  klik(chipR);
  ok('B5 perataan kanan', fig().classList.contains('i-r') &&
     fig().getAttribute('data-ga') === 'r');

  /* penggeser rotasi: ketuk di 75% lintasan → 90° */
  const slR = d.querySelector('#pop [data-gsl="rot"]');
  const inR = slR.querySelector('.g-sl-in');
  const geomR = sembunyi(inR);
  geomR({ left: 100, width: 360 });
  slR.dispatchEvent(new w.MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 370, button: 0 }));
  w.dispatchEvent(MOUSE('pointerup', 370));
  await sleep(10);
  ok('B6 rotasi 90° via penggeser', fig().getAttribute('data-gr') === '90' &&
     fig().style.getPropertyValue('--gr') === '90deg' &&
     d.getElementById('g-rot').value === '90', fig().getAttribute('data-gr'));

  /* kolom derajat: ketik 25 lalu kunci */
  const num = d.getElementById('g-rot');
  num.value = '25';
  num.dispatchEvent(new w.Event('change', { bubbles: true }));
  await sleep(10);
  ok('B7 derajat lewat kolom angka', fig().getAttribute('data-gr') === '25',
     fig().getAttribute('data-gr'));

  /* geser halus: batas perataan kanan −160..0; ketuk tengah → −80 */
  const slO = d.querySelector('#pop [data-gsl="off"]');
  const inO = slO.querySelector('.g-sl-in');
  const geomO = sembunyi(inO);
  geomO({ left: 100, width: 360 });
  slO.dispatchEvent(new w.MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 280, button: 0 }));
  w.dispatchEvent(MOUSE('pointerup', 280));
  await sleep(10);
  ok('B8 geser halus −80 px', fig().getAttribute('data-go') === '-80' &&
     /-80 px/.test(d.getElementById('pop').textContent), fig().getAttribute('data-go'));

  /* gagang seret ukuran: kolom 800px mulai x=40; x=400 → 45% */
  fig().querySelector('.img-grip')
    .dispatchEvent(new w.MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 60, button: 0 }));
  w.dispatchEvent(MOUSE('pointermove', 400));
  w.dispatchEvent(MOUSE('pointerup', 400));
  await sleep(10);
  ok('B9 gagang seret → 45%', fig().getAttribute('data-gw') === '45' &&
     fig().style.width === '45%', fig().getAttribute('data-gw'));

  /* ketukan kedua menutup panel & membatalkan pilihan */
  klik(fig());
  ok('B10 ketuk lagi menutup panel', !popOn() && !fig().classList.contains('img-pilih') &&
     !fig().querySelector('.img-grip'));

  saveNow();
  const m = blokGambar();
  ok('B11 tersimpan di model (w/rot/align/off)',
     m && m.meta && m.meta.w === 45 && m.meta.rot === 25 && m.meta.align === 'r' &&
     m.meta.off === -80, JSON.stringify(m && m.meta));
  selesai();
}

if (BAG === 'C') {
  console.log('══ C. MODE BACA + BUKA ULANG ══');
  state.notes.splice(0);
  state.notes.push(catatanBergambar('g1', { w: 60, rot: -12, align: 'c', off: 0 }));
  await openNote('g1'); await sleep(80);
  ok('C1 render ulang memakai meta', fig().getAttribute('data-gw') === '60' &&
     fig().getAttribute('data-gr') === '-12' && fig().classList.contains('i-c'),
     fig().outerHTML.slice(0, 150));

  /* mode baca: ketuk gambar tidak boleh membuka panel */
  mode.setModeBaca(true);
  klik(fig());
  ok('C2 mode baca: tanpa pilihan & tanpa panel',
     !fig().classList.contains('img-pilih') && !popOn());
  mode.setModeBaca(false);

  /* pindah catatan lalu kembali: pengaturan tidak hilang */
  state.notes.push(catatanBergambar('g2'));
  await openNote('g2'); await sleep(80);
  ok('C3 catatan lain tampil wajar', !!fig() && fig().getAttribute('data-gw') === null);
  await openNote('g1'); await sleep(80);
  ok('C4 kembali ke g1: pengaturan utuh', fig().getAttribute('data-gw') === '60' &&
     fig().getAttribute('data-gr') === '-12' && fig().classList.contains('i-c'),
     fig().outerHTML.slice(0, 150));

  /* perataan otomatis mengecilkan gambar selebar kolom */
  klik(fig());
  const chip100 = d.querySelector('#pop [data-gw="100"]');
  klik(chip100);
  ok('C5a gambar 100% lurus tanpa perataan',
     fig().getAttribute('data-gw') === '100' && fig().getAttribute('data-ga') === null,
     fig().outerHTML.slice(0, 150));
  const chipC = d.querySelector('#pop [data-ga="c"]');
  klik(chipC);
  ok('C5 perataan di gambar 100% → mengecil ke 80% dulu',
     fig().getAttribute('data-gw') === '80' && fig().getAttribute('data-ga') === 'c',
     fig().outerHTML.slice(0, 150));
  selesai();
}
