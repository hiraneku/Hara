/* Pengujian Tahap 1 · A9 (sematan alat di bar editor catatan) — suite jsdom.

   Yang diuji:
   • alat yang disematkan pindah ke awal bar (sesudah Batalkan/Ulangi), tidak digandakan;
   • urutan sematan = urutan tampil, dan urutan alat lain tidak berubah;
   • batas MAKS_SEMATAN ditegakkan;
   • alat yang disembunyikan tidak tampil meski disematkan, dan kembali saat ditampilkan;
   • sematan tersimpan di localStorage (hara.bar.v1) dan dibersihkan saat dimuat;
   • tombol pin di Pengaturan → Bar mengubah bar secara langsung.

   Jalan: node tools/uji/bar-sematan.mjs (dari folder repo). */
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
const router = await st('core/router.js');
const prefs = await st('notes/bar/prefs.js');
const render = await st('notes/bar/render.js');
const d = w.document;
const sleep = (ms = 25) => new Promise(r => setTimeout(r, ms));
const klik = el => { if (el) el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true, view: w })); };

let gagal = 0, total = 0;
const oke = (nama, baik, det = '') => {
  total++;
  if (!baik) { gagal++; console.log('FAIL', nama, det ? '\n      ' + det : ''); }
  else console.log('ok  ', nama);
};

/* Urutan tombol di bar: 'mb:<kunci>' untuk tombol, 'sep' untuk pemisah. */
const urutan = () => Array.from(d.querySelector('.mech-in').children).map(el => {
  if (el.classList.contains('mb-sep')) return 'sep';
  if (el.dataset.g) return 'g:' + el.dataset.g;
  return 'm:' + el.dataset.m;
});
const tanpaSemat = seq => seq.filter(x => x !== 'sep');
const kunciSemat = () => JSON.parse(w.localStorage.getItem('hara.bar.v1') || '{}').sematan || [];

/* Mulai bersih. */
w.localStorage.removeItem('hara.bar.v1');
prefs.prefs.sematan.splice(0);
prefs.prefs.sembunyi.splice(0);
render.renderBar();
const awal = urutan();

console.log('── Dasar: tanpa sematan, bar sama seperti sebelum A9 ──');
oke('bar tampil (ada tombol)', awal.length > 10, awal.join(' '));
oke('Batalkan dan Ulangi di awal bar', awal[0] === 'm:undo' && awal[1] === 'm:redo' && awal[2] === 'sep', awal.slice(0, 3).join(' '));

console.log('── Menyematkan ──');
oke('sematkan Tebal (b)', prefs.toggleSematan('b') === 'sematkan');
oke('sematkan kelompok Gaya paragraf (gaya)', prefs.toggleSematan('gaya') === 'sematkan');
render.renderBar();
let seq = urutan();
const posB = seq.indexOf('m:b'), posG = seq.indexOf('g:gaya'), posSlash = seq.indexOf('m:slash');
oke('Tebal dan Gaya tampil di awal, sebelum "/"', posB > 1 && posG > posB && posSlash > posG, seq.join(' '));
oke('Batalkan dan Ulangi tetap paling depan', seq[0] === 'm:undo' && seq[1] === 'm:redo');
oke('tidak digandakan: tepat satu tombol Tebal', seq.filter(x => x === 'm:b').length === 1);
oke('tidak digandakan: tepat satu tombol Gaya', seq.filter(x => x === 'g:gaya').length === 1);
oke('urutan sematan = urutan pin (b lalu gaya)', posB < posG);
oke('tidak ada pemisah ganda atau di ujung', !seq.some((x, i) => x === 'sep' && (seq[i + 1] === 'sep' || i === 0 || i === seq.length - 1)), seq.join(' '));
const tanpaSematAwal = tanpaSemat(awal).filter(x => x !== 'm:b' && x !== 'g:gaya');
oke('alat lain tetap dalam urutan asli', JSON.stringify(tanpaSemat(seq).filter(x => x !== 'm:b' && x !== 'g:gaya')) === JSON.stringify(tanpaSematAwal));
oke('tombol Tebal di zona sematan ada di DOM', !!d.querySelector('.mb[data-m=b]'));

console.log('── Batas dan urutan ──');
for (const k of ['slash', 'i', 'link', 'huruf']) prefs.toggleSematan(k);
oke('sudah 6 sematan', prefs.prefs.sematan.length === 6, prefs.prefs.sematan.join(','));
oke('sematan ke-7 ditolak dengan "penuh"', prefs.toggleSematan('warna') === 'penuh');
oke('penolakan tidak mengubah daftar', !prefs.tersemat('warna') && prefs.prefs.sematan.length === 6);
oke('kunci tak dikenal ditolak', prefs.toggleSematan('undo') === 'tidak-dikenal' && !prefs.tersemat('undo'));
prefs.toggleSematan('i'); prefs.toggleSematan('i');
oke('lepas lalu sematkan lagi memindah ke urutan terakhir', prefs.prefs.sematan.at(-1) === 'i' && prefs.prefs.sematan.length === 6);
render.renderBar();
seq = urutan();
oke('6 sematan semua tampil satu kali', ['m:b', 'g:gaya', 'm:slash', 'm:link', 'g:huruf', 'm:i'].every(x => seq.filter(y => y === x).length === 1));

console.log('── Disembunyikan ──');
prefs.toggleTampil('slash');
render.renderBar();
seq = urutan();
oke('alat tersembunyi tidak tampil meski disematkan', !seq.includes('m:slash'));
oke('sematannya tetap tersimpan', prefs.tersemat('slash'));
prefs.toggleTampil('slash');
render.renderBar();
oke('ditampilkan lagi: kembali tampil di zona sematan', urutan().includes('m:slash'));

console.log('── Melepas ──');
prefs.toggleSematan('i'); prefs.toggleSematan('link'); prefs.toggleSematan('huruf'); prefs.toggleSematan('slash');
oke('lepas: sisa b dan gaya', prefs.prefs.sematan.join(',') === 'b,gaya', prefs.prefs.sematan.join(','));
prefs.toggleSematan('b'); prefs.toggleSematan('gaya');
render.renderBar();
oke('semua dilepas: bar kembali identik dengan awal', JSON.stringify(urutan()) === JSON.stringify(awal), urutan().join(' '));

console.log('── Penyimpanan ──');
prefs.toggleSematan('gaya'); prefs.toggleSematan('b');
oke('tersimpan ke localStorage (hara.bar.v1)', JSON.stringify(kunciSemat()) === JSON.stringify(['gaya', 'b']), JSON.stringify(kunciSemat()));
prefs.prefs.sematan.splice(0);
prefs.muatPrefs();
oke('dimuat ulang dari penyimpanan', JSON.stringify(prefs.prefs.sematan) === JSON.stringify(['gaya', 'b']));
w.localStorage.setItem('hara.bar.v1', JSON.stringify({ sematan: ['undo', 'b', 'b', 'xx', 5, 'gaya', 'slash', 'i', 'link', 'huruf', 'warna'] }));
prefs.prefs.sematan.splice(0);
prefs.muatPrefs();
oke('data rusak dibersihkan: tanpa kunci asing, tanpa duplikat, maks 6',
  JSON.stringify(prefs.prefs.sematan) === JSON.stringify(['b', 'gaya', 'slash', 'i', 'link', 'huruf']), JSON.stringify(prefs.prefs.sematan));
w.localStorage.removeItem('hara.bar.v1');
prefs.prefs.sematan.splice(0);
prefs.muatPrefs();
oke('tanpa penyimpanan: sematan kosong (bawaan)', prefs.prefs.sematan.length === 0);

console.log('── Pengaturan → Bar: tombol pin ──');
prefs.toggleSematan('b');
router.go('set'); await sleep();
const pinB = d.querySelector('#bar-prefs [data-sematan="b"]');
oke('tombol pin ada untuk setiap kontrol bar', d.querySelectorAll('#bar-prefs [data-sematan]').length === prefs.BISA_SEMBUNYI.length,
  `${d.querySelectorAll('#bar-prefs [data-sematan]').length} dari ${prefs.BISA_SEMBUNYI.length}`);
oke('tombol pin Tebal menyala (aria-pressed=true)', pinB && pinB.getAttribute('aria-pressed') === 'true');
const pinI = d.querySelector('#bar-prefs [data-sematan="i"]');
klik(pinI);
await sleep();
oke('klik pin Miring: ikut tersemat', prefs.tersemat('i') === true);
oke('klik pin Miring: bar langsung memperbarui (Miring masuk zona sematan)', urutan().indexOf('m:i') > -1 && urutan().indexOf('m:i') < urutan().indexOf('m:slash'), urutan().join(' '));
klik(d.querySelector('#bar-prefs [data-sematan="i"]'));
await sleep();
oke('klik lagi: sematan Miring dilepas', !prefs.tersemat('i'));
klik(d.querySelector('#bar-prefs [data-sematan="b"]'));
await sleep();
oke('lepas Tebal lewat Pengaturan', !prefs.tersemat('b'));
prefs.toggleSematan('b');
prefs.toggleSematan('slash');
prefs.toggleSematan('gaya'); prefs.toggleSematan('i'); prefs.toggleSematan('link'); prefs.toggleSematan('huruf');
oke('sudah 6 sematan untuk uji penuh', prefs.prefs.sematan.length === 6);
const pinWarna = d.querySelector('#bar-prefs [data-sematan="warna"]');
klik(pinWarna);
await sleep();
oke('pin ke-7 ditolak lewat Pengaturan', !prefs.tersemat('warna') && prefs.prefs.sematan.length === 6);

console.log('── Hasil ──');
console.log(`\nTotal: ${total} pengujian · Lulus: ${total - gagal} · Gagal: ${gagal}`);
if (gagal > 0) { console.log('GAGAL'); process.exit(1); }
process.exit(0);
