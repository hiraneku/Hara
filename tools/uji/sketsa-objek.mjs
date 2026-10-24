/**
 * Pengujian Tahap 1 · A2 (objek visual di sketsa): gambar bisa dipilih, dipindah, diubah ukurannya, dan dihapus.
 *  Bootstrap jsdom sama dengan sketsa-goresan.mjs.
 *  - Unit: docs/notes/editor/goresan.js (validasi, batas, serialisasi, baca balik).
 *  - Integrasi (jsdom): /sketch menyimpan data-goresan, dibuka ulang tanpa kehilangan goresan,
 *    sketsa lama dan coretan di atas foto tetap memakai jalur PNG (tanpa data-goresan).
 */

import { JSDOM } from 'jsdom';
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';

const mentahHtml = readFileSync('docs/index.html', 'utf8');
const V = (mentahHtml.match(/\?v=([0-9]+)/) || ['', ''])[1];
const qv = V ? `?v=${V}` : '';
const html = mentahHtml.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

const dom = new JSDOM(html, {
  url: 'https://hara.local/',
  pretendToBeVisual: true,
});

for (const k of [
  'window', 'document', 'navigator', 'HTMLElement', 'Node', 'Element', 'Range', 'Selection',
  'Event', 'MouseEvent', 'KeyboardEvent', 'InputEvent', 'MutationObserver',
  'FileReader', 'URL', 'localStorage', 'sessionStorage', 'getComputedStyle', 'CustomEvent',
  'DOMParser', 'XMLSerializer', 'NodeFilter',
]) {
  if (dom.window[k] !== undefined) {
    try { globalThis[k] = dom.window[k]; }
    catch { Object.defineProperty(globalThis, k, { value: dom.window[k], configurable: true }); }
  }
}
globalThis.self = globalThis;
globalThis.addEventListener = dom.window.addEventListener.bind(dom.window);
globalThis.removeEventListener = dom.window.removeEventListener.bind(dom.window);
globalThis.PointerEvent = dom.window.MouseEvent;
globalThis.requestAnimationFrame = fn => setTimeout(fn, 0);
globalThis.cancelAnimationFrame = id => clearTimeout(id);
globalThis.scrollTo = () => {};
dom.window.scrollTo = () => {};
HTMLElement.prototype.scrollIntoView = () => {};
URL.createObjectURL = () => 'blob:uji-genbaru';
URL.revokeObjectURL = () => {};
globalThis.fetch = async () => ({ ok: false, status: 503 });

await import(`../../docs/app.js${qv}`);

const { state, save } = await import(`../../docs/core/store.js${qv}`);
const { makeNote, makeBlock, domToBlocks } = await import(`../../docs/notes/note-model.js${qv}`);
const { openNote } = await import(`../../docs/notes/model.js${qv}`);
const { setModeBaca } = await import(`../../docs/notes/mode-baca.js${qv}`);
const { pasangKunci, resetSesi } = await import(`../../docs/notes/kunci.js${qv}`);
const { cadanganJson, markdownDariCatatan, catatanDariMarkdown } = await import(`../../docs/notes/data-io.js${qv}`);
const { simpanBlob } = await import(`../../docs/core/blobs.js${qv}`);
const { bukaStudioSketsa, terapkanFilterPindai } = await import(`../../docs/notes/editor/sketsa.js${qv}`);
const {
  renderRumusMatematika, insertMathBlock, insertBookmarkBlock, lampirkanBerkasKeCatatan,
  bukaMenuAksiBlok, setWarnaLatarBlok, duplikatBlok, salinTautanKeBlok,
} = await import(`../../docs/notes/editor/blok-generasi-baru.js${qv}`);
const {
  evaluasiEkspresiAman, cobaHitungInlineSekarang, ubahTeksPintar, jumlahkanAngkaDalamTeks,
  resetSemuaCentangTodo, buatSvgKartuCatatan, eksporHtmlMandiri,
} = await import(`../../docs/notes/alat-cerdas.js${qv}`);
const {
  aturFokusMenulis, simpanPosisiGulir, ambilPosisiGulir, setSampulCatatan,
  bukaGrafInteraktif, perbaruiGarisProgresBaca,
} = await import(`../../docs/notes/navigasi-fokus.js${qv}`);

const tunggu = ms => new Promise(r => setTimeout(r, ms));
let lulus = 0, gagal = 0;
function cek(nama, kondisi) {
  if (kondisi) { lulus++; console.log('  ✓', nama); }
  else { gagal++; console.error('  ✗ GAGAL:', nama); }
}
async function tungguSampai(fn, ms = 2500) {
  const batas = Date.now() + ms;
  let v = fn();
  while (!v && Date.now() < batas) { await tunggu(30); v = fn(); }
  return v;
}

const goresanMod = await import('../../docs/notes/editor/goresan.js');
const { serialGoresan, bacaGoresan, bersihkanObjek, hitObjek, idBlobDariGoresan, BATAS_GORESAN } = goresanMod;
const LB = 720, TG = 460;

console.log('── Unit: model objek visual (goresan.js) ──');
{
  const bersih = bersihkanObjek([
    { id: 'a1', blob: 'ob_satu', x: 10, y: 20, w: 100, h: 50 },
    { id: 'a 2', blob: 'ob_dua', x: 0, y: 0, w: 10, h: 10 },
    { id: 'a3', blob: 'x/y', x: 0, y: 0, w: 10, h: 10 },
    { id: 'a1', blob: 'ob_lain', x: 5, y: 5, w: 10, h: 10 },
    { id: 'a4', blob: 'ob_empat', x: 0, y: 0, w: 2, h: 2 },
    { id: 'a5', blob: 'ob_lima', x: 'abc', y: 0, w: 10, h: 10 },
    null,
  ], LB, TG);
  cek('Unit objek: id tidak valid, blob tidak valid, id ganda, dan koordinat rusak dibuang', bersih.length === 2 && bersih[0].id === 'a1' && bersih[0].blob === 'ob_satu');
  cek('Unit objek: ukuran di bawah minimum dinaikkan ke 8', bersih[1].w === 8 && bersih[1].h === 8);

  const banyak = Array.from({ length: BATAS_GORESAN.objek + 1 }, (_, i) => ({ id: 'o' + i, blob: 'b' + i, x: 0, y: 0, w: 10, h: 10 }));
  cek('Unit objek: jumlah dibatasi ke BATAS_GORESAN.objek', bersihkanObjek(banyak, LB, TG).length === BATAS_GORESAN.objek);
  cek('Unit objek: melewati batas jumlah tidak disimpan (\'\')', serialGoresan({ objek: banyak }, LB, TG) === '');

  const hanyaObjek = serialGoresan({ objek: [{ id: 'o1', blob: 'ob_satu', x: 40, y: 60, w: 200, h: 120 }] }, LB, TG);
  cek('Unit objek: sketsa tanpa goresan tetapi berisi objek tetap bisa disimpan', hanyaObjek !== '');
  const balik = bacaGoresan(hanyaObjek, LB, TG);
  cek('Unit objek: objek lolos serialisasi lalu baca balik', !!balik && balik.objek.length === 1 && balik.objek[0].w === 200 && balik.goresan.length === 0);

  const v1 = bacaGoresan('{"v":1,"latar":"putih","pola":"titik","goresan":[{"alat":"pena","warna":"#111827","ukuran":4,"pts":[{"x":1,"y":1}]}]}', LB, TG);
  cek('Unit objek: data v1 (tanpa objek) tetap terbaca dengan objek kosong', !!v1 && v1.goresan.length === 1 && v1.objek.length === 0);

  const tumpuk = [
    { id: 'bawah', blob: 'b1', x: 0, y: 0, w: 100, h: 100 },
    { id: 'atas', blob: 'b2', x: 50, y: 50, w: 100, h: 100 },
  ];
  cek('Unit objek: titik di area tumpuk memilih objek paling atas', tumpuk[hitObjek(tumpuk, 60, 60)].id === 'atas');
  cek('Unit objek: titik di luar semua objek tidak memilih apa pun (-1)', hitObjek(tumpuk, 500, 500) === -1);
  cek('Unit objek: titik di tepi kotak dihitung terpilih', hitObjek(tumpuk, 0, 0) === 0);

  const idBlob = idBlobDariGoresan(hanyaObjek.replace('"o1"', '"o1"') + '');
  cek('Unit objek: idBlobDariGoresan mengembalikan id blob objek', idBlob.length === 1 && idBlob[0] === 'ob_satu');
  cek('Unit objek: idBlobDariGoresan kosong untuk data tanpa objek', idBlobDariGoresan(v1 ? '{"v":1,"goresan":[]}' : '').length === 0);
}

console.log('── Integrasi (jsdom): objek visual di sketsa ──');
{
  const { elToBlock, blockToHtml, makeBlock, makeNote, domToBlocks } = await import(`../../docs/notes/note-model.js${qv}`);
  const { openNote } = await import(`../../docs/notes/model.js${qv}`);
  const { setModeBaca } = await import(`../../docs/notes/mode-baca.js${qv}`);
  const { state, save } = await import(`../../docs/core/store.js${qv}`);
  const { bukaStudioSketsa } = await import(`../../docs/notes/editor/sketsa.js${qv}`);

  globalThis.Image = dom.window.Image; /* jsdom tidak menyediakan Image sebagai global */
  /* Pemilih berkas tidak bisa dipakai di jsdom: input file diganti berkas uji */
  let berkasUji = null;
  const klikAsli = dom.window.HTMLInputElement.prototype.click;
  dom.window.HTMLInputElement.prototype.click = function () {
    if (this.type === 'file' && berkasUji) {
      Object.defineProperty(this, 'files', { value: [berkasUji], configurable: true });
      this.dispatchEvent(new dom.window.Event('change'));
      return;
    }
    return klikAsli.call(this);
  };

  const n = makeNote({ title: 'Uji Objek A2', blocks: [{ type: 'paragraph', content: 'Objek uji' }] });
  state.notes.unshift(n);
  save();
  openNote(n.id);
  setModeBaca(false);
  await tunggu(30);

  const titik = (type, x, y) => document.getElementById('sk-canvas').dispatchEvent(
    new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }));
  const pilihAlat = nama => document.querySelector(`[data-sk-alat="${nama}"]`).click();

  /* 1. Tambah gambar sebagai objek lalu simpan */
  berkasUji = new dom.window.Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' });
  bukaStudioSketsa();
  document.getElementById('sk-tambah-gambar').click();
  await tunggu(1900);
  document.getElementById('sk-simpan').click();
  const fig = await tungguSampai(() => document.querySelector('.ed-doc .b-img[data-sketch="1"][data-goresan]'), 4000);
  const awal = fig ? bacaGoresan(fig.getAttribute('data-goresan'), LB, TG) : null;
  cek('Integrasi objek: gambar yang ditambahkan tersimpan sebagai objek (data-goresan)', !!awal && awal.objek.length === 1);
  const obj0 = awal ? awal.objek[0] : null;
  cek('Integrasi objek: objek merujuk blob gambar yang tersimpan', !!obj0 && obj0.blob.startsWith('ob_'));
  cek('Integrasi objek: objek diletakkan di tengah kanvas', !!obj0 && Math.abs(obj0.x + obj0.w / 2 - LB / 2) < 0.5 && Math.abs(obj0.y + obj0.h / 2 - TG / 2) < 0.5);
  cek('Integrasi objek: blob objek ikut ada di meta blok (perlindungan dari pembersihan)',
    domToBlocks(document.querySelector('.ed-doc')).some(b => b.meta && b.meta.goresan && idBlobDariGoresan(b.meta.goresan).includes(obj0.blob)));

  /* 2. Pindah: pilih alat Pilih, tarik objek sejauh (+60, +40) */
  const cx = obj0.x + obj0.w / 2, cy = obj0.y + obj0.h / 2;
  bukaStudioSketsa(fig);
  await tunggu(30);
  pilihAlat('pilih');
  titik('pointerdown', cx, cy);
  titik('pointermove', cx + 30, cy + 20);
  titik('pointermove', cx + 60, cy + 40);
  titik('pointerup', cx + 60, cy + 40);
  document.getElementById('sk-simpan').click();
  await tunggu(200);
  const setelahPindah = bacaGoresan(fig.getAttribute('data-goresan'), LB, TG).objek[0];
  cek('Integrasi objek: objek dipindah sesuai seretan (+60, +40)',
    Math.abs(setelahPindah.x - (obj0.x + 60)) < 0.2 && Math.abs(setelahPindah.y - (obj0.y + 40)) < 0.2);

  /* 3. Perbesar: pilih objek, tekan Perbesar (x1,15) */
  bukaStudioSketsa(fig);
  await tunggu(30);
  pilihAlat('pilih');
  const c2x = setelahPindah.x + setelahPindah.w / 2, c2y = setelahPindah.y + setelahPindah.h / 2;
  titik('pointerdown', c2x, c2y);
  titik('pointerup', c2x, c2y);
  const tombolBesar = document.getElementById('sk-besar');
  cek('Integrasi objek: tombol Perbesar aktif setelah objek dipilih', !!tombolBesar && !tombolBesar.disabled);
  tombolBesar.click();
  document.getElementById('sk-simpan').click();
  await tunggu(200);
  const setelahBesar = bacaGoresan(fig.getAttribute('data-goresan'), LB, TG).objek[0];
  cek('Integrasi objek: Perbesar menambah lebar 15% dan tetap di tengah',
    Math.abs(setelahBesar.w - setelahPindah.w * 1.15) < 0.2
    && Math.abs((setelahBesar.x + setelahBesar.w / 2) - c2x) < 0.2);

  /* 4. Hapus objek: pilih, tekan Hapus objek, lalu gambar satu goresan agar bisa disimpan */
  bukaStudioSketsa(fig);
  await tunggu(30);
  pilihAlat('pilih');
  const c3x = setelahBesar.x + setelahBesar.w / 2, c3y = setelahBesar.y + setelahBesar.h / 2;
  titik('pointerdown', c3x, c3y);
  titik('pointerup', c3x, c3y);
  document.getElementById('sk-hapus-objek').click();
  pilihAlat('pena');
  titik('pointerdown', 20, 20);
  titik('pointermove', 90, 70);
  titik('pointerup', 90, 70);
  document.getElementById('sk-simpan').click();
  await tunggu(200);
  const akhir = bacaGoresan(fig.getAttribute('data-goresan'), LB, TG);
  cek('Integrasi objek: objek yang dihapus tidak tersimpan lagi, goresan baru tersimpan',
    !!akhir && akhir.objek.length === 0 && akhir.goresan.length === 1);

  /* 5. Tombol ubah ukuran nonaktif saat tidak ada objek yang dipilih */
  bukaStudioSketsa(fig);
  await tunggu(30);
  cek('Integrasi objek: Perbesar nonaktif bila tidak ada objek yang dipilih',
    document.getElementById('sk-besar').disabled === true);
  document.getElementById('sk-batal').click();
}

console.log(`\nTotal: ${lulus + gagal} pengujian · Lulus: ${lulus} · Gagal: ${gagal}`);
if (gagal > 0) process.exit(1);
process.exit(0);
