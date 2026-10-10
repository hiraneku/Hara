/* Uji Ronde 12 · K26 riwayat undo lintas sesi & log CSV.
   - log CSV murni: escape, BOM, proteksi injeksi rumus;
   - kv IndexedDB: round-trip objek (structured clone), debounce simpanKvSoon;
   - undo catatan: riwayat ditulis lalu DIPULIHKAN di "sesi baru" (modul di-reload
     dengan query baru + DB yang sama), dan undo di sesi baru mengembalikan keadaan lama;
   - catatan terkunci (boleh=false) tidak pernah ditulis.
   Jalankan: node tools/uji/riwayat-sesi.mjs */
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { indexedDB as fakeIDB } from 'fake-indexeddb';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const V = '20261010050549';

const dom = new JSDOM('<!doctype html><body><div class="ed-doc" contenteditable="true"><p>A</p></div></body>', { url: 'https://x.test/', pretendToBeVisual: true });
const { window: w } = dom;
w.indexedDB = fakeIDB;
globalThis.window = w;
globalThis.document = w.document;
globalThis.indexedDB = fakeIDB;
globalThis.localStorage = w.localStorage;
globalThis.getSelection = () => w.getSelection();
globalThis.Range = w.Range;
globalThis.Node = w.Node;

let no = 0, gagal = 0;
const cek = (nama, k, d = '') => { no++; if (k) console.log(`  ✓ ${nama}`); else { gagal++; console.log(`  ✗ ${nama} ${d}`); } };
const tunggu = ms => new Promise(r => setTimeout(r, ms));

const csv = await import(`${process.cwd()}/docs/renamer/log.js?v=${V}`);
const kv = await import(`${process.cwd()}/docs/core/db-catatan.js?v=${V}`);
const rs = await import(`${process.cwd()}/docs/core/riwayat-sesi.js?v=${V}`);

console.log('K26 · log CSV');
{
  const out = csv.buatCsvLog([{ waktu: 'T', dari: '=rumus.jpg', ke: 'a,"b".jpg', aturan: 2 }, { waktu: 'T', dari: 'x', ke: 'Ünï.txt', aturan: 1 }]);
  cek('BOM UTF-8 di awal', out.charCodeAt(0) === 0xFEFF);
  cek('header kolom benar', out.includes('waktu,nama_asal,nama_baru,jumlah_aturan'));
  cek('koma & kutip di-escape', out.includes('"a,""b"".jpg"'), out);
  cek('rumus diberi awalan apostrof', out.includes("'=rumus.jpg"));
  cek('karakter non-ASCII utuh', out.includes('Ünï.txt'));
  cek('tanpa entri → hanya header', csv.buatCsvLog([]) === csv.BOM + 'waktu,nama_asal,nama_baru,jumlah_aturan\r\n');
}

console.log('K26 · kv IndexedDB & debounce');
{
  await kv.tulisKv('uji:objek', { a: 1, daftar: [1, 2, 3] });
  const b = await kv.bacaKv('uji:objek');
  cek('round-trip objek', b && b.a === 1 && b.daftar.length === 3);
  cek('kunci tak ada → null', (await kv.bacaKv('uji:tidak-ada')) === null);

  let nilai = 0;
  rs.simpanKvSoon('uji:debounce', () => nilai);
  nilai = 1; rs.simpanKvSoon('uji:debounce', () => nilai);
  nilai = 2; rs.simpanKvSoon('uji:debounce', () => nilai);
  await tunggu(600);
  cek('debounce: hanya keadaan terakhir yang tertulis', (await kv.bacaKv('uji:debounce')) === 2, String(await kv.bacaKv('uji:debounce')));
}

console.log('K26 · riwayat undo catatan lintas sesi');
{
  const hist1 = await import(`${process.cwd()}/docs/notes/editor/history.js?v=${V}`);
  const d = document.querySelector('.ed-doc');
  // "Sesi 1": catatan 'n1' dibuka, lalu tiga keadaan dibuat
  hist1.resetHistory('n1', true);
  await hist1.pulihkanRiwayat('n1');
  d.innerHTML = '<p>satu</p>'; hist1.record(true);
  d.innerHTML = '<p>dua</p>'; hist1.record(true);
  d.innerHTML = '<p>tiga</p>'; hist1.record(true);
  await tunggu(700); // jeda simpan
  cek('riwayat tersimpan ke IDB', !!(await kv.bacaKv('undo:n1')));

  // "Sesi 2": modul dimuat ulang (query baru) — status memori hilang.
  const hist2 = await import(`${process.cwd()}/docs/notes/editor/history.js?v=${V}x2`);
  d.innerHTML = '<p>tiga</p>';          /* keadaan saat dibuka kembali */
  hist2.resetHistory('n1', true);
  const pulih = await hist2.pulihkanRiwayat('n1');
  cek('pulih: riwayat dimuat', pulih === true);
  cek('undo di sesi baru bisa kembali ke keadaan sesi lama', hist2.undo() === true && d.innerHTML === '<p>dua</p>', d.innerHTML);
  hist2.undo();
  cek('undo berikutnya ke "satu"', d.innerHTML === '<p>satu</p>', d.innerHTML);

  // catatan terkunci: tak pernah ditulis
  d.innerHTML = '<p>rahasia</p>';
  hist2.resetHistory('kunci-1', false);
  hist2.record(true);
  d.innerHTML = '<p>rahasia 2</p>'; hist2.record(true);
  await tunggu(700);
  cek('catatan terkunci tidak ditulis ke IDB', (await kv.bacaKv('undo:kunci-1')) === null);

  // catatan lain tidak mewarisi riwayat catatan n1
  d.innerHTML = '<p>lain</p>';
  hist2.resetHistory('n2', true);
  await hist2.pulihkanRiwayat('n2');
  cek('catatan lain: tidak ada riwayat warisan', hist2.canUndo() === false);
}

console.log(`\nHasil: ${no - gagal}/${no} lolos${gagal ? `, ${gagal} gagal` : ''}`);
process.exit(gagal ? 1 : 0);
