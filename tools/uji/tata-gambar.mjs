/* Uji tata letak gambar ronde-8: LEBAR menentukan KELAS alur.
   hero ≥90 (baris penuh) · baris 70–89 (i-l/i-c/i-r) · mengapit 50–69
   (f-l/f-r/i-c) · kecil ≤49 (f-l/f-r/i-c) + bias b (gb-b). Rotasi bebas
   −180..180, bilah mini #mbar, gagang ukur/pindah/putar, pulang-pergi
   atribut figur ⇄ meta blok (data-gw/gr/ga/gb).

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
const { simpanBlob, semuaId } = await st('core/blobs.js');
const { bersihkanBlobYatim } = await st('notes/editor/image.js');
const d = w.document;
const sleep = (ms = 25) => new Promise(r => setTimeout(r, ms));
let no = 0, g = 0;
const ok = (n, c, det = '') => { no++; if (c) console.log('LULUS', n); else { g++; console.log('FAIL', n, det); } };
const DOC = () => d.querySelector('.ed-doc');
const N = () => state.notes.find(x => x.id === state.openId);
const blokGambar = () => (N() ? N().blocks : []).find(b => b.type === 'image');
const fig = () => DOC() ? DOC().querySelector('.b-img') : null;
const bar = () => d.getElementById('mbar');
const barOn = () => { const p = bar(); return !!(p && p.classList.contains('on')); };
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
const MOUSE = (t, x, y = 0) => new w.MouseEvent(t, {
  bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 });
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

const catatanBergambar = (id, meta, isi) => makeNote({ id, title: id, blocks: isi || [
  makeBlock({ type: 'paragraph', content: 'pembuka sebelum gambar' }),
  makeBlock({ type: 'image', content: '', meta: { blobId: 'f-' + id, alt: id + '.png', ...meta } }),
  makeBlock({ type: 'paragraph', content: 'lanjut mengetik di sini' }),
] });
const tataHtml = meta => blockToHtml(makeBlock({
  type: 'image', content: '', meta: { blobId: 'b1', alt: 'x', ...meta } }));

if (BAG === 'A') {
  console.log('══ A. MODEL: meta ⇄ HTML ⇄ meta (kelas lebar) ══');
  const h = tataHtml({ w: 60, rot: 12, align: 'l' });
  ok('A1 w60 kiri → w-apit f-l', /b-img/.test(h) && h.includes('w-apit') && h.includes('f-l') &&
     h.includes('tata'), h.slice(0, 110));
  ok('A2 gaya + atribut', h.includes('width:60%') && h.includes('--gr:12deg') &&
     h.includes('data-gw="60"') && h.includes('data-gr="12"') && h.includes('data-ga="l"'),
     h.slice(0, 160));
  ok('A3 tanpa data-go sama sekali', !h.includes('data-go') && !h.includes('--go'));
  ok('A4 w60 tengah → i-c', tataHtml({ w: 60, align: 'c' }).includes('w-apit i-c'));
  ok('A5 w45 kanan → w-kecil f-r', tataHtml({ w: 45, align: 'r' }).includes('w-kecil f-r'));
  ok('A6 w80 kiri → w-baris i-l', tataHtml({ w: 80, align: 'l' }).includes('w-baris i-l'));
  ok('A7 w75 tanpa posisi → w-baris i-c (default tengah)',
     tataHtml({ w: 75 }).includes('w-baris i-c'));
  ok('A8 w100 tengah → w-hero tanpa i-*', (() => {
    const h2 = tataHtml({ w: 100, align: 'c' });
    return h2.includes('w-hero') && !h2.includes('i-c') && !h2.includes('f-c');
  })(), tataHtml({ w: 100, align: 'c' }).slice(0, 110));

  const batas = [[95, 'w-hero'], [90, 'w-hero'], [89, 'w-baris'], [70, 'w-baris'],
    [69, 'w-apit'], [50, 'w-apit'], [49, 'w-kecil'], [20, 'w-kecil']];
  ok('A9 ambang kelas lebar 90/70/50', batas.every(([x, c]) => {
    const h2 = tataHtml({ w: x, align: 'r' });
    return h2.includes(c) && h2.includes('b-img ');
  }), batas.map(([x, c]) => `${x}→${c}:${tataHtml({ w: x, align: 'r' }).includes(c)}`).join(' '));

  ok('A10 bias bawah → gb-b + data-gb', (() => {
    const h2 = tataHtml({ w: 55, align: 'r', zb: 'b' });
    return h2.includes('w-apit f-r') && h2.includes('gb-b') && h2.includes('data-gb="b"');
  })(), tataHtml({ w: 55, align: 'r', zb: 'b' }).slice(0, 130));

  const lama = tataHtml({});
  ok('A11 gambar lama: tanpa tata/atribut, tetap w-hero',
     lama.includes('b-img') && lama.includes('w-hero') && !lama.includes(' tata') &&
     !lama.includes('data-gw') && !lama.includes('style='), lama.slice(0, 90));

  const jepitR = tataHtml({ w: 5, rot: 200, align: 'x' });
  ok('A12 render menjepit nilai di luar batas', jepitR.includes('width:100%') &&
     jepitR.includes('--gr:180deg') && jepitR.includes('w-hero') && !jepitR.includes('data-ga'),
     jepitR.slice(0, 140));
  ok('A13 jepitan bawah', tataHtml({ w: 130, rot: -190 }).includes('--gr:-180deg'));

  const dd = d.createElement('div');
  dd.innerHTML = tataHtml({ w: 62, rot: -15, align: 'l', zb: 'b' });
  const baca = (el2) => {
    const m = {};
    const a = el2.getAttribute.bind(el2);
    const gw2 = a('data-gw'); if (gw2) m.w = parseInt(gw2, 10);
    const gr2 = a('data-gr'); if (gr2) m.rot = parseInt(gr2, 10);
    const ga2 = a('data-ga'); if (ga2) m.align = ga2;
    const gb2 = a('data-gb'); if (gb2) m.zb = gb2;
    return m;
  };
  const meta = baca(dd.firstElementChild);
  ok('A14 baca balik dari DOM sama', meta.w === 62 && meta.rot === -15 &&
     meta.align === 'l' && meta.zb === 'b', JSON.stringify(meta));
  selesai();
}

if (BAG === 'B') {
  console.log('══ B. UI: pilih, bilah mini, gagang ══');
  state.notes.splice(0);
  state.notes.push(catatanBergambar('g1'));
  await simpanBlob('f-g1', new w.Blob(['x'], { type: 'image/png' }));
  await openNote('g1'); await sleep(120);
  ok('B1 editor punya figur + gambar', !!fig() && !!DOC().querySelector('img[data-blob][src]'));

  const lebarKolom = sembunyi(DOC());
  lebarKolom({ left: 40, width: 800, height: 900, top: 0 });

  /* simulasi gambar kecil: lebar figur 120px — gagang perlu mode lega */
  sembunyi(fig())({ left: 40, top: 0, width: 120, height: 90 });
  klik(fig());
  ok('B2 ketuk gambar kecil → terpilih + gagang pindah/ukuran/putar',
     fig().classList.contains('img-pilih') && !!fig().querySelector('.img-grip') &&
     !!fig().querySelector('.img-move') && !!fig().querySelector('.img-putar'));
  ok('B2b gambar kecil → kelas sempit aktif (gagang membesar)',
     fig().classList.contains('sempit'));
  ok('B3 bilah mini terbuka (bukan panel besar)',
     barOn() && !!bar().querySelector('[data-mw]') && !!bar().querySelector('[data-ma]') &&
     !!bar().querySelector('[data-mdeg]') && !d.getElementById('pop').classList.contains('on'));
  ok('B3a ketuk gambar tidak minta keyboard (inputmode dikunci, editor tak fokus)',
     DOC().getAttribute('inputmode') === 'none' && w.document.activeElement !== DOC(),
     'inputmode=' + DOC().getAttribute('inputmode'));

  /* ketuk badan gambar yang sedang terpilih tidak boleh menutup seleksi —
     gagang kecil gampang meleset (mis-tap) */
  klik(fig());
  ok('B3b ketuk badan lagi tidak membatalkan seleksi',
     fig().classList.contains('img-pilih') && barOn());

  /* gambar selebar kolom (300px) → mode sempit dilepas */
  sembunyi(fig())({ left: 100, top: 0, width: 300, height: 200 });
  const chip = v => bar().querySelector(`[data-mw="${v}"]`);
  klik(chip(60));
  ok('B4 preset 60% → w-apit tengah (i-c)', fig().getAttribute('data-gw') === '60' &&
     fig().classList.contains('w-apit') && fig().classList.contains('i-c'),
     fig().outerHTML.slice(0, 160));
  ok('B4b gambar cukup lebar → kelas sempit dilepas',
     !fig().classList.contains('sempit'));

  klik(bar().querySelector('[data-ma="l"]'));
  ok('B5 posisi kiri → w-apit f-l', fig().classList.contains('f-l') &&
     fig().getAttribute('data-ga') === 'l', fig().outerHTML.slice(0, 160));

  klik(chip(100));
  ok('B6 preset 100% → w-hero polos (atribut dirapikan)',
     fig().getAttribute('data-gw') === null && fig().classList.contains('w-hero') &&
     !fig().classList.contains('f-l') && !fig().classList.contains('i-c'),
     fig().outerHTML.slice(0, 160));

  klik(bar().querySelector('[data-ma="c"]'));
  ok('B7 perataan di gambar penuh → mengecil ke 80% dulu',
     fig().getAttribute('data-gw') === '80' && fig().getAttribute('data-ga') === 'c' &&
     fig().classList.contains('w-baris') && fig().classList.contains('i-c'),
     fig().outerHTML.slice(0, 160));

  /* kolom derajat: ketuk badge → input angka */
  klik(bar().querySelector('[data-mdeg]'));
  const degIn = bar().querySelector('.mb-deg-in');
  ok('B8 badge derajat berubah jadi kolom angka', !!degIn);
  if (degIn) {
    degIn.value = '-25';
    degIn.dispatchEvent(new w.Event('change', { bubbles: true }));
    await sleep(10);
  }
  ok('B9 derajat lewat kolom angka', fig().getAttribute('data-gr') === '-25' &&
     fig().style.getPropertyValue('--gr') === '-25deg', fig().getAttribute('data-gr'));

  klik(chip(40));
  ok('B10 preset 40% → w-kecil i-c', fig().getAttribute('data-gw') === '40' &&
     fig().classList.contains('w-kecil') && fig().classList.contains('i-c'),
     fig().outerHTML.slice(0, 160));

  /* gagang seret ukuran: kolom 800px mulai x=40; x=400 → 45% */
  fig().querySelector('.img-grip')
    .dispatchEvent(new w.MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 60, button: 0 }));
  w.dispatchEvent(MOUSE('pointermove', 400));
  w.dispatchEvent(MOUSE('pointerup', 400));
  await sleep(10);
  ok('B11 gagang ukuran seret → 45%', fig().getAttribute('data-gw') === '45' &&
     fig().style.width === '45%' && fig().classList.contains('w-kecil'),
     fig().getAttribute('data-gw'));

  /* tombol 0° meluruskan (rotasi masih −25° dari kolom derajat) */
  klik(bar().querySelector('[data-mz="0"]'));
  ok('B12 tombol 0° meluruskan', fig().getAttribute('data-gr') === '0',
     fig().getAttribute('data-gr'));

  /* gagang putar: pusat figur (190,100) — bawah = 180°, atas = lurus */
  const geomFig = sembunyi(fig());
  geomFig({ left: 40, top: 0, width: 300, height: 200 });
  const putar = fig().querySelector('.img-putar');
  putar.dispatchEvent(new w.MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 190, clientY: 10, button: 0 }));
  w.dispatchEvent(MOUSE('pointermove', 190, 190));
  w.dispatchEvent(MOUSE('pointerup', 190, 190));
  await sleep(10);
  ok('B13 gagang putar → 180°', fig().getAttribute('data-gr') === '180' &&
     fig().style.getPropertyValue('--gr') === '180deg', fig().getAttribute('data-gr'));

  putar.dispatchEvent(new w.MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 190, clientY: 10, button: 0 }));
  w.dispatchEvent(MOUSE('pointermove', 190, 190));
  w.dispatchEvent(MOUSE('pointerup', 190, 190));
  await sleep(10);
  ok('B14 putar 180° lagi → kembali 0° (menyentak lurus)',
     fig().getAttribute('data-gr') === '0', fig().getAttribute('data-gr'));

  /* kolom derajat: 45 → tombol 0° lagi */
  klik(bar().querySelector('[data-mdeg]'));
  const di2 = bar().querySelector('.mb-deg-in');
  if (di2) { di2.value = '45'; di2.dispatchEvent(new w.Event('change', { bubbles: true })); await sleep(10); }
  ok('B15 kolom angka 45°', fig().getAttribute('data-gr') === '45', fig().getAttribute('data-gr'));
  klik(bar().querySelector('[data-mz="0"]'));
  ok('B16 tombol 0° meluruskan lagi', fig().getAttribute('data-gr') === '0' &&
     fig().getAttribute('data-gw') === '45', fig().getAttribute('data-gr'));

  /* pindahkan ke bawah catatan: urutan paragraf mengikuti */
  const anak = DOC().children;
  sembunyi(anak[0])({ left: 40, top: 0, width: 800, height: 50 });      /* pembuka */
  sembunyi(anak[1])({ left: 40, top: 60, width: 800, height: 300 });    /* gambar */
  sembunyi(anak[2])({ left: 40, top: 370, width: 800, height: 50 });    /* lanjutan */
  const figP = DOC().querySelector('.b-img');
  sembunyi(figP)({ left: 40, top: 60, width: 360, height: 270 });
  figP.querySelector('.img-move')
    .dispatchEvent(new w.MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 50, clientY: 70, button: 0 }));
  w.dispatchEvent(MOUSE('pointermove', 700, 200));
  w.dispatchEvent(MOUSE('pointermove', 700, 420));
  w.dispatchEvent(MOUSE('pointerup', 700, 420));
  await sleep(10);
  const anakAkhir = DOC().children;
  const ordo = [anakAkhir[0].className, anakAkhir[1].className, anakAkhir[2].className]
    .map(c => /b-p/.test(c) ? 'p' : 'img').join('-');
  ok('B17 pindah ke bawah → urut p-p-img (gambar jadi paling akhir)',
     ordo === 'p-p-img' && anakAkhir[2].classList.contains('b-img'), ordo);
  ok('B18 hasil pindah: kanan-bawah menempel (f-r + gb-b)',
     figP.getAttribute('data-ga') === 'r' && figP.classList.contains('f-r') &&
     figP.classList.contains('gb-b') && figP.getAttribute('data-gb') === 'b',
     figP.outerHTML.slice(0, 150));

  /* pindahkan lagi ke tengah paragraf kedua — urut: p, img, p */
  sembunyi(anakAkhir[0])({ left: 40, top: 0, width: 800, height: 50 });
  sembunyi(anakAkhir[1])({ left: 40, top: 60, width: 800, height: 50 });
  sembunyi(anakAkhir[2])({ left: 40, top: 120, width: 800, height: 300 });
  sembunyi(figP)({ left: 40, top: 120, width: 360, height: 270 });
  figP.querySelector('.img-move')
    .dispatchEvent(new w.MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 700, clientY: 420, button: 0 }));
  w.dispatchEvent(MOUSE('pointermove', 60, 40));   /* kiri atas */
  w.dispatchEvent(MOUSE('pointerup', 60, 40));
  await sleep(10);
  const anak2 = DOC().children;
  const ordo2 = [anak2[0], anak2[1], anak2[2]].map(e => /b-p/.test(e.className) ? 'p' : 'img').join('-');
  ok('B19 pindah ke tengah atas → urut p-img-p + kiri-atas',
     ordo2 === 'p-img-p' && anak2[1] === figP && figP.getAttribute('data-ga') === 'l' &&
     !figP.classList.contains('gb-b'), ordo2 + ' ' + figP.getAttribute('data-ga'));
  ok('B19b gambar mengapit kiri → mode sempit tetap aktif (bilah atas)',
     figP.classList.contains('sempit'));

  /* kedua gambar di catatan: keluar dari pilihan dengan ketuk lain */
  klik(DOC().querySelector('.ed-doc') || d.body);
  ok('B20 ketuk luar menutup bilah', !barOn() && !figP.classList.contains('img-pilih'));

  saveNow();
  const m = blokGambar();
  ok('B21 tersimpan di model (w/rot/align/zb)',
     m && m.meta && m.meta.w === 45 && m.meta.rot === 0 && m.meta.align === 'l' &&
     !m.meta.zb, JSON.stringify(m && m.meta));
  selesai();
}

if (BAG === 'C') {
  console.log('══ C. BACA & BUKA ULANG ══');
  state.notes.splice(0);
  state.notes.push(catatanBergambar('g1', { w: 60, rot: -12, align: 'l', zb: 'b' }));
  await openNote('g1'); await sleep(100);
  ok('C1 render ulang memakai meta', fig().getAttribute('data-gw') === '60' &&
     fig().getAttribute('data-gr') === '-12' && fig().classList.contains('w-apit') &&
     fig().classList.contains('f-l') && fig().classList.contains('gb-b'),
     fig().outerHTML.slice(0, 160));

  saveNow();
  const m1 = blokGambar();
  ok('C2 baca balik meta utuh', m1 && m1.meta && m1.meta.w === 60 && m1.meta.rot === -12 &&
     m1.meta.align === 'l' && m1.meta.zb === 'b' && m1.meta.off === undefined,
     JSON.stringify(m1 && m1.meta));

  mode.setModeBaca(true);
  klik(fig());
  ok('C3 mode baca: tanpa pilihan & tanpa bilah',
     !fig().classList.contains('img-pilih') && !barOn());
  mode.setModeBaca(false);

  state.notes.push(catatanBergambar('g2'));
  await openNote('g2'); await sleep(100);
  ok('C4 catatan lain tampil wajar', !!fig() && fig().getAttribute('data-gw') === null &&
     fig().classList.contains('w-hero'));
  await openNote('g1'); await sleep(100);
  ok('C5 kembali ke g1: pengaturan utuh', fig().getAttribute('data-gw') === '60' &&
     fig().getAttribute('data-gr') === '-12' && fig().classList.contains('f-l') &&
     fig().classList.contains('gb-b'), fig().outerHTML.slice(0, 150));

  /* catatan warisan ronde-7: w100 + perataan — tata letak hero aman */
  state.notes.push(catatanBergambar('g3', { w: 100, rot: 0, align: 'c' }));
  await openNote('g3'); await sleep(100);
  ok('C6 warisan w100+perataan → w-hero polos (data tetap tersimpan)',
     fig().classList.contains('w-hero') && !fig().classList.contains('i-c') &&
     fig().getAttribute('data-ga') === 'c', fig().outerHTML.slice(0, 150));
  saveNow();
  const m3 = blokGambar();
  ok('C7 warisan tidak berubah saat dibaca ulang',
     m3 && m3.meta && m3.meta.w === 100 && m3.meta.align === 'c',
     JSON.stringify(m3 && m3.meta));

  /* rotasi 0° tanpa lebar → polos kembali */
  state.notes.push(catatanBergambar('g4', { w: 80, rot: 0, align: 'r' }));
  await openNote('g4'); await sleep(100);
  saveNow();
  const m4 = blokGambar();
  ok('C8 w80 kanan bulat tersimpan', m4 && m4.meta && m4.meta.w === 80 &&
     m4.meta.align === 'r', JSON.stringify(m4 && m4.meta));

  /* tombol hapus keyboard tidak boleh menghapus gambar */
  state.notes.push(makeNote({ id: 'g5', title: 'g5', blocks: [
    makeBlock({ type: 'paragraph', content: 'awal sekali' }),
    makeBlock({ type: 'image', content: '', meta: { blobId: 'f-g5', alt: 'g5.png' } }),
    makeBlock({ type: 'paragraph', content: 'lanjut lagi' }),
  ] }));
  await simpanBlob('f-g5', new w.Blob(['x'], { type: 'image/png' }));
  await openNote('g5'); await sleep(100);
  const fig5 = DOC().querySelector('.b-img');
  const p5a = fig5.previousElementSibling;
  const p5b = fig5.nextElementSibling;
  const caret = (el, pos) => {
    const t = el.firstChild;
    const r = d.createRange();
    r.setStart(t, pos === 'akhir' ? t.data.length : 0);
    r.collapse(true);
    const s = w.getSelection();
    s.removeAllRanges(); s.addRange(r);
  };
  caret(p5a, 'akhir');
  const evDel = new w.KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true });
  DOC().dispatchEvent(evDel);
  ok('C9 Delete di ujung paragraf sebelum gambar diabaikan',
     evDel.defaultPrevented && DOC().querySelector('.b-img') === fig5);
  caret(p5b, 'awal');
  const evBsp = new w.KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true });
  DOC().dispatchEvent(evBsp);
  ok('C10 Backspace di awal paragraf setelah gambar diabaikan',
     evBsp.defaultPrevented && DOC().querySelector('.b-img') === fig5 &&
     p5b.textContent === 'lanjut lagi');

  /* gambar sebagai blok PERTAMA catatan: karet harus mendarat di paragraf
     (tidak pernah di dalam gambar) */
  state.notes.push(makeNote({ id: 'g6', title: 'g6', blocks: [
    makeBlock({ type: 'image', content: '', meta: { blobId: 'f-g6', alt: 'g6.png' } }),
    makeBlock({ type: 'paragraph', content: 'teks kedua' }),
  ] }));
  await simpanBlob('f-g6', new w.Blob(['x'], { type: 'image/png' }));
  await openNote('g6'); await sleep(100);
  const fig6 = DOC().firstElementChild;
  const p6 = fig6.nextElementSibling;
  const anc = w.getSelection().anchorNode;
  ok('C11 gambar blok pertama: karet mendarat di paragraf, bukan di gambar',
     fig6.classList.contains('b-img') && !!anc &&
     (p6.contains(anc) || (anc === p6)) && !fig6.contains(anc),
     'anchor=' + (anc && (anc.nodeName + ':' + (anc.textContent || '').slice(0, 12))));

  /* gambar rusak (berkas tidak ada): placeholder tampil, tapi referensi
     blob TIDAK hilang saat disimpan, dan bloknya tetap bisa dihapus via X */
  state.notes.push(makeNote({ id: 'g7', title: 'g7', blocks: [
    makeBlock({ type: 'paragraph', content: 'awal' }),
    makeBlock({ type: 'image', content: '', meta: { blobId: 'f-g7', alt: 'g7.png' } }),
    makeBlock({ type: 'paragraph', content: 'akhir' }),
  ] }));
  await openNote('g7'); await sleep(120);   /* tanpa simpanBlob → rusak */
  const fig7 = DOC().querySelector('.b-img');
  const img7 = fig7.querySelector('img[data-blob]');
  ok('C12 gambar tanpa berkas → placeholder + kelas rusak',
     fig7.classList.contains('img-rusak') &&
     !!fig7.querySelector('.img-hilang') &&
     /Gambar tidak ditemukan/.test(fig7.textContent), fig7.outerHTML.slice(0, 160));
  ok('C13 referensi blob dipertahankan (img tersembunyi, bukan dibuang)',
     !!img7 && img7.getAttribute('data-blob') === 'f-g7' &&
     img7.style.display === 'none', fig7.outerHTML.slice(0, 200));
  saveNow();
  const m7 = blokGambar();
  ok('C14 menyimpan tidak menghapus id gambar rusak',
     m7 && m7.meta && m7.meta.blobId === 'f-g7', JSON.stringify(m7 && m7.meta));
  klik(fig7.querySelector('.img-x'));
  await sleep(30);
  ok('C15 gambar rusak tetap bisa dihapus via X',
     !DOC().querySelector('.b-img'), 'masih ada .b-img');

  /* sapuan blob yatim tidak boleh menghapus blob yang masih muda */
  const idMuda = 'f-muda';
  await simpanBlob(idMuda, new w.Blob(['x'], { type: 'image/png' }));
  await bersihkanBlobYatim();
  const ids = await semuaId();
  ok('C16 sapuan tidak menghapus blob berusia muda', ids.includes(idMuda),
     'ids=' + ids.join(','));

  /* ganti mode lewat tombol #mode: render baca disegarkan dari model —
     gambar mengapit tetap mengapit, tidak berubah tata letak */
  state.notes.push(catatanBergambar('g8', { w: 60, rot: 0, align: 'l' }));
  await openNote('g8'); await sleep(100);
  const mb8 = d.getElementById('mode');
  klik(mb8);                       /* → mode baca */
  await sleep(60);
  const fig8 = DOC() ? DOC().querySelector('.b-img') : null;
  const ed8 = d.querySelector('.ed');
  ok('C17 mode baca lewat tombol: render segar, gambar tetap f-l',
     !!ed8 && ed8.classList.contains('baca') && !!fig8 &&
     fig8.classList.contains('w-apit') && fig8.classList.contains('f-l'),
     fig8 ? fig8.className : 'fig hilang');
  klik(mb8);                       /* → kembali mode tulis */
  await sleep(60);
  const ed8b = d.querySelector('.ed');
  const fig8b = DOC() ? DOC().querySelector('.b-img') : null;
  ok('C18 kembali ke mode tulis: kelas gambar utuh',
     !ed8b.classList.contains('baca') && !!fig8b &&
     fig8b.classList.contains('f-l') && fig8b.getAttribute('data-ga') === 'l',
     fig8b ? fig8b.className : 'fig hilang');
  await openNote('g1'); await sleep(80);    /* kembali ke catatan awal */
  selesai();
}
