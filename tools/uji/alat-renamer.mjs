/* Uji Ronde 12 · dialog alat renamer (K21–K25, K22, K23) — smoke test jsdom.
   Memeriksa alur klik sungguhan: buka dialog → isi → tombol → aturan masuk ke renamerState.
   Jalankan: node tools/uji/alat-renamer.mjs */
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const V = fs.readFileSync('docs/app.js','utf8').match(/\?v=(\d+)/)[1];
const dom = new JSDOM('<!doctype html><body><div id="pop"></div><div id="toast"></div></body>', { url: 'https://x.test/', pretendToBeVisual: true });
const { window: w } = dom;
globalThis.window = w; globalThis.document = w.document; globalThis.HTMLElement = w.HTMLElement;
globalThis.Node = w.Node; globalThis.getSelection = () => w.getSelection(); globalThis.Event = w.Event;
globalThis.localStorage = w.localStorage; globalThis.Blob = w.Blob;

let no = 0, gagal = 0;
const cek = (nama, k, d = '') => { no++; if (k) console.log(`  ✓ ${nama}`); else { gagal++; console.log(`  ✗ ${nama} ${d}`); } };
const tunggu = ms => new Promise(r => setTimeout(r, ms));

const { renamerState } = await import(`${process.cwd()}/docs/renamer/index.js?v=${V}`);
const alat = await import(`${process.cwd()}/docs/renamer/alat.js?v=${V}`);
const lanjutan = await import(`${process.cwd()}/docs/renamer/lanjutan.js?v=${V}`);
const ctx = { state: renamerState, render: () => {} };
renamerState.rules = [];
renamerState.files = [
  { id: 'f1', originalName: 'IMG_0001.jpg', baseName: 'IMG_0001', ext: '.jpg', file: new w.Blob(['a']) },
  { id: 'f2', originalName: 'IMG_0002.jpg', baseName: 'IMG_0002', ext: '.jpg', file: new w.Blob(['b']) },
  { id: 'f3', originalName: 'IMG_0003.jpg', baseName: 'IMG_0003', ext: '.jpg', file: new w.Blob(['a']) },
];
const klik = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));

console.log('K24 · regex & pustaka');
alat.bukaRegex(ctx);
const inp = document.getElementById('alat-pola');
cek('dialog regex terbuka dengan input', !!inp);
inp.value = '(\\d{4})-(\\d{2})';
inp.dispatchEvent(new w.Event('input', { bubbles: true }));
cek('penjelasan tampil setelah mengetik', document.getElementById('alat-penjelasan').textContent.includes('angka'));
klik(document.querySelector('[data-alat="tambah-regex"]'));
const r1 = renamerState.rules.at(-1);
cek('aturan Cari & Ganti regex ditambahkan', !!r1 && r1.type === 'replace' && r1.params.isRegex === true && r1.params.find === '(\\d{4})-(\\d{2})', JSON.stringify(r1));

console.log('K21 · belajar dari contoh');
alat.bukaBelajarContoh(ctx);
const kontrolContoh = document.querySelectorAll('[data-alat-contoh]');
cek('tiga baris contoh', kontrolContoh.length === 3);
kontrolContoh[0].value = 'foto-01.jpg';
kontrolContoh[1].value = 'foto-02.jpg';
klik(document.querySelector('[data-alat="cari-contoh"]'));
const pakai = document.querySelector('[data-alat="pakai"]');
cek('kandidat ditampilkan', !!pakai, document.getElementById('alat-kandidat').innerHTML.slice(0, 200));
const sebelum = renamerState.rules.length;
klik(pakai);
cek('aturan dari contoh ditambahkan', renamerState.rules.length === sebelum + 1, JSON.stringify(renamerState.rules.at(-1)));
// Kandidat boleh berbeda jenis (Ganti atau Token); yang diuji adalah hasil terapannya.
const eng = await import(`${process.cwd()}/docs/renamer/engine.js?v=${V}`);
const terap = (nama, rule) => { const r = eng.applyRule({ baseName: nama.replace(/\.jpg$/, ''), ext: '.jpg' }, rule, Number(nama.match(/(\d+)/)[1]) - 1, 2, {}); return r.baseName + r.ext; };
const aturanBaru = renamerState.rules.at(-1);
cek('aturan baru menghasilkan foto-01.jpg dari IMG_0001.jpg', terap('IMG_0001.jpg', aturanBaru) === 'foto-01.jpg', terap('IMG_0001.jpg', aturanBaru));

console.log('K23 · syarat & grup');
alat.bukaSyaratAturan(ctx);
document.getElementById('alat-nilai').value = 'jpg';
document.getElementById('alat-bidang').value = 'ext';
document.getElementById('alat-grup').value = 'foto';
klik(document.querySelector('[data-alat="simpan-syarat"]'));
const dengan = renamerState.rules.find(r => r.when);
cek('syarat tersimpan pada aturan', !!dengan && dengan.when.conds[0].field === 'ext' && dengan.when.conds[0].value === 'jpg', JSON.stringify(dengan));
cek('grup tersimpan', !!dengan && dengan.group === 'foto');

console.log('K25 · resep');
const sblm = renamerState.rules.length;
alat.imporResepDariTeks(ctx, lanjutan.buatResep([{ type: 'normalize', enabled: true, params: { form: 'strip' } }]));
cek('impor resep menambah aturan', renamerState.rules.length === sblm + 1 && renamerState.rules.at(-1).type === 'normalize');
cek('impor resep rusak ditolak', alat.imporResepDariTeks(ctx, '{rusak') === false);

console.log('K22 · duplikat');
await alat.bukaDuplikat(ctx);
await tunggu(50);
const hasilDup = document.getElementById('alat-dup').textContent;
cek('f1 & f3 identik terdeteksi', hasilDup.includes('IMG_0001.jpg') && hasilDup.includes('IMG_0003.jpg') && !hasilDup.includes('IMG_0002.jpg'), hasilDup);

console.log(`\nHasil: ${no - gagal}/${no} lolos${gagal ? `, ${gagal} gagal` : ''}`);
process.exit(gagal ? 1 : 0);
