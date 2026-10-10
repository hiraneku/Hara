/* Uji Ronde 11 · K4 & K6 — jadwal ulang / tunda to-do dari layar Tugas.
   - jadwalUlang(): aturan murni (ganti frasa tanggal, jaga prioritas & jam,
     tolak to-do berulang atau berformat markup);
   - klik tombol "Besok" di kartu Tugas mengubah isi catatan dan menyimpannya;
   - to-do berulang tidak menampilkan tombol tunda.
   Jalankan: node tools/uji/tunda-tugas.mjs */
import {JSDOM} from 'jsdom';
import fs from 'fs';
import { indexedDB as fakeIDB } from 'fake-indexeddb';
import path from 'path';
import { fileURLToPath } from 'url';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const AKAR = process.cwd();

const dom = new JSDOM(fs.readFileSync('docs/index.html', 'utf8'), { url: 'https://x.test/', pretendToBeVisual: true });
const { window: w } = dom; w.indexedDB = fakeIDB;
for (const k of ['document','getSelection','HTMLElement','Node','Range','MouseEvent','KeyboardEvent','Event','InputEvent','localStorage','Image','NodeFilter'])
  if (w[k] !== undefined) globalThis[k] = w[k];
globalThis.window = w; globalThis.self = w; globalThis.indexedDB = w.indexedDB;
globalThis.addEventListener = w.addEventListener.bind(w);
Object.defineProperty(globalThis, 'navigator', { value: w.navigator, configurable: true });
w.URL.createObjectURL = () => 'blob:x/1'; w.URL.revokeObjectURL = () => {}; globalThis.URL = w.URL;
const V = fs.readFileSync('docs/app.js', 'utf8').match(/\?v=(\d+)/)[1];
const st = (...p) => import(`${AKAR}/docs/${p.join('/')}?v=${V}`);
await st('app.js');
const { state } = await st('core/store.js');
const { makeNote, makeBlock } = await st('notes/note-model.js');
const pg = await st('notes/pengingat.js');
const router = await st('core/router.js');
const d = w.document;
const sleep = (ms = 40) => new Promise(r => setTimeout(r, ms));

let gagal = 0, total = 0;
const oke = (nama, baik, det = '') => { total++; if (!baik) { gagal++; console.log('FAIL', nama, det ? '\n      ' + det : ''); } else console.log('ok  ', nama); };
const klik = el => { if (el) el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true, view: w })); };

/* ── 1. aturan murni ── */
oke('besok → hari ini', pg.jadwalUlang('besok lari', 'hari') === 'hari lari');
oke('hari ini → besok (isi lain utuh)', pg.jadwalUlang('hari kirim berkas', 'besok') === 'besok kirim berkas');
oke('lusa jam 10:00 → besok (jam ikut dibuang, isi tetap)',
  pg.jadwalUlang('lusa jam 10:00 rapat klien', 'besok') === 'besok rapat klien');
oke('prioritas di depan dipertahankan', pg.jadwalUlang('!! lusa rapat', 'besok') === '!! besok rapat');
oke('ke minggu depan', pg.jadwalUlang('besok review', 'minggu depan') === 'minggu depan review');
oke('tanpa tanggal → null', pg.jadwalUlang('biasa saja', 'besok') === null);
oke('berulang → null (jadwal ditentukan aturan)', pg.jadwalUlang('setiap hari minum', 'besok') === null);
oke('isi berformat markup → null (format dijaga)', pg.jadwalUlang('<b>besok</b> x', 'besok') === null);
oke('pilihan tak dikenal → null', pg.jadwalUlang('besok x', 'entah') === null);

/* ── 2. klik di layar Tugas ── */
const kini = Date.now();
state.notes.splice(0);
state.notes.push(makeNote({ id: 't1', title: 'Kerja', createdAt: kini - 1000, updatedAt: kini, blocks: [
  makeBlock({ type: 'todo', content: 'besok kirim laporan' }),
  makeBlock({ type: 'todo', content: 'setiap hari minum air' }),
] }));

router.go('task'); await sleep();
const tombolBesok = () => d.querySelector('.tdg-btn[data-tunda="besok"][data-note="t1"]');
const blokLaporan = () => state.notes.find(x => x.id === 't1').blocks.find(b => b.content.includes('laporan'));

oke('kartu sekali-jalan menampilkan tombol Besok', !!tombolBesok());
oke('kartu berulang TIDAK menampilkan tombol tunda',
  !Array.from(d.querySelectorAll('.tdg-item')).some(k => k.textContent.includes('minum air') && k.querySelector('.tdg-btn')));

/* pindahkan dari "besok" ke "minggu depan" lewat tombol */
const bidLaporan = blokLaporan().id;
const tombolMinggu = d.querySelector(`.tdg-btn[data-tunda="minggu depan"][data-bid="${bidLaporan}"]`);
oke('tombol Minggu depan ada untuk to-do laporan', !!tombolMinggu);
klik(tombolMinggu); await sleep();
oke('klik Minggu depan → isi catatan berubah', blokLaporan().content === 'minggu depan kirim laporan',
  blokLaporan().content);
oke('klik Minggu depan → tersimpan (updatedAt diperbarui)',
  state.notes.find(x => x.id === 't1').updatedAt >= kini);
oke('kartu pindah dari daftar mendatang (7 hari) — tak lagi di Tugas',
  !d.querySelector(`.tdg-btn[data-bid="${bidLaporan}"][data-tunda="besok"]`)
    && !Array.from(d.querySelectorAll('.tdg-item')).some(k => k.textContent.includes('kirim laporan')
      && !k.textContent.includes('minggu')),
  d.body.textContent.slice(0, 200));

console.log(`\ntotal: ${total} · gagal: ${gagal}`);
process.exit(gagal ? 1 : 0);
