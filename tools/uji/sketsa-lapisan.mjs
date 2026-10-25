/**
 * Pengujian Tahap 1 · A5 (lapisan sketsa): tumpukan lapisan, sembunyi, kunci, urut, hapus, dan batas 8.
 *  - Unit: docs/notes/editor/lapisan.js dan model v5 di goresan.js (baca, tulis, data v4 lama).
 *  - Integrasi (jsdom): alur lengkap di /sketch lewat tombol UI, lalu baca balik dari data-goresan.
 *  Bootstrap jsdom sama dengan sketsa-objek.mjs.
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
URL.createObjectURL = () => 'blob:uji-lapisan';
URL.revokeObjectURL = () => {};
globalThis.fetch = async () => ({ ok: false, status: 503 });

await import(`../../docs/app.js${qv}`);

const { state, save } = await import(`../../docs/core/store.js${qv}`);
const { makeNote } = await import(`../../docs/notes/note-model.js${qv}`);
const { openNote } = await import(`../../docs/notes/model.js${qv}`);
const { setModeBaca } = await import(`../../docs/notes/mode-baca.js${qv}`);
const { bukaStudioSketsa } = await import(`../../docs/notes/editor/sketsa.js${qv}`);

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
const lapisanMod = await import('../../docs/notes/editor/lapisan.js');
const { serialGoresan, bacaGoresan, bersihkanObjek, VERSI_GORESAN, VERSI_DIDUKUNG } = goresanMod;
const {
  lapisanAwal, bersihkanLapisan, idLapisanValid, bisaDiedit, tambahLapisan,
  hapusLapisan, pindahLapisan, urutanGambar, urutanRender, BATAS_LAPISAN, ID_LAPISAN_DASAR,
} = lapisanMod;
const LB = 720, TG = 460;

console.log('── Unit: daftar lapisan (lapisan.js) ──');
{
  const awal = lapisanAwal();
  cek('Unit lapisan: lapisan awal satu, bernama Dasar, tampil, tidak dikunci',
    awal.length === 1 && awal[0].id === ID_LAPISAN_DASAR && awal[0].nama === 'Dasar' && awal[0].tampil && !awal[0].kunci);
  cek('Unit lapisan: bersihkan data bukan larik menghasilkan lapisan awal', bersihkanLapisan(null)[0].id === ID_LAPISAN_DASAR);
  const rusak = bersihkanLapisan([
    { id: 'a', nama: 'Satu', tampil: false, kunci: true },
    { id: 'a', nama: 'Ganda', tampil: true, kunci: false },
    { id: 'b c', nama: 'Spasi', tampil: true, kunci: false },
    null,
    { id: 'c', nama: '   ', tampil: 'ya', kunci: 1 },
  ]);
  cek('Unit lapisan: id ganda dan tidak valid dibuang', rusak.length === 2 && rusak[0].id === 'a' && rusak[0].nama === 'Satu');
  cek('Unit lapisan: nama kosong jadi "Lapisan", flag non-boolean dianggap default',
    rusak[1].nama === 'Lapisan' && rusak[1].tampil === true && rusak[1].kunci === false);
  cek('Unit lapisan: semua item rusak jatuh ke lapisan awal', bersihkanLapisan([{ id: '!!' }])[0].id === ID_LAPISAN_DASAR);
  const banyak = Array.from({ length: BATAS_LAPISAN + 3 }, (_, i) => ({ id: 'l' + i, nama: 'L' + i }));
  cek('Unit lapisan: jumlah dibatasi ke BATAS_LAPISAN (8)', bersihkanLapisan(banyak).length === BATAS_LAPISAN && BATAS_LAPISAN === 8);
  cek('Unit lapisan: id tidak dikenal jatuh ke lapisan paling bawah', idLapisanValid(awal, 'hilang') === ID_LAPISAN_DASAR);

  const daftar = [
    { id: 'x', nama: 'X', tampil: true, kunci: false },
    { id: 'y', nama: 'Y', tampil: false, kunci: false },
    { id: 'z', nama: 'Z', tampil: true, kunci: true },
  ];
  cek('Unit lapisan: bisaDiedit hanya untuk lapisan tampil dan tidak dikunci',
    bisaDiedit(daftar, 'x') && !bisaDiedit(daftar, 'y') && !bisaDiedit(daftar, 'z') && !bisaDiedit(daftar, 'tidak-ada'));

  let s = awal;
  const nama = [];
  for (let i = 0; i < BATAS_LAPISAN - 1; i++) {
    const r = tambahLapisan(s);
    if (!r.ok) break;
    s = r.list;
    nama.push(s[s.length - 1].nama);
  }
  cek('Unit lapisan: tambah sampai 8 lapisan, nama otomatis Lapisan 2 sampai Lapisan 8',
    s.length === 8 && nama[0] === 'Lapisan 2' && nama[nama.length - 1] === 'Lapisan 8');
  const penuh = tambahLapisan(s);
  cek('Unit lapisan: lapisan ke-9 ditolak (alasan penuh)', penuh.ok === false && penuh.alasan === 'penuh');
  const baru = tambahLapisan(awal);
  cek('Unit lapisan: lapisan baru di atas tumpukan dan id-nya terdaftar',
    baru.ok && baru.list[1].id === baru.id && baru.list[1].nama === 'Lapisan 2');

  cek('Unit lapisan: lapisan terakhir tidak bisa dihapus', hapusLapisan(awal, ID_LAPISAN_DASAR, 0).alasan === 'terakhir');
  cek('Unit lapisan: lapisan yang masih berisi tidak bisa dihapus',
    hapusLapisan(daftar, 'x', 2).alasan === 'berisi');
  const hapus = hapusLapisan(daftar, 'y', 0);
  cek('Unit lapisan: lapisan kosong dihapus dan urutan lain tetap', hapus.ok && hapus.list.map(l => l.id).join() === 'x,z');
  cek('Unit lapisan: hapus id tidak dikenal ditolak', hapusLapisan(daftar, 'q', 0).alasan === 'tidak-ada');

  const naik = pindahLapisan(daftar, 'x', 1);
  cek('Unit lapisan: naik menukar dengan lapisan di atasnya', naik.ok && naik.list.map(l => l.id).join() === 'y,x,z');
  cek('Unit lapisan: lapisan paling atas tidak bisa naik lagi', pindahLapisan(daftar, 'z', 1).alasan === 'tepi');
  cek('Unit lapisan: lapisan paling bawah tidak bisa turun lagi', pindahLapisan(daftar, 'x', -1).alasan === 'tepi');
  cek('Unit lapisan: pindah tidak mengubah daftar asal', daftar.map(l => l.id).join() === 'x,y,z');

  const item = [
    { id: 'g1', lapisan: 'x' },
    { id: 'g2', lapisan: 'y' },
    { id: 'g3', lapisan: 'x' },
    { id: 'g4', lapisan: 'z' },
  ];
  cek('Unit lapisan: urutan gambar dari bawah, lapisan tersembunyi dilewati, urutan dalam lapisan terjaga',
    urutanGambar(daftar, item).map(i => i.id).join() === 'g1,g3,g4');

  const objekR = [{ id: 'o-x', lapisan: 'x' }, { id: 'o-y', lapisan: 'y' }];
  const jejakR = [{ id: 's-x1', lapisan: 'x' }, { id: 's-y', lapisan: 'y' }, { id: 's-x2', lapisan: 'x' }];
  const render = urutanRender(daftar, objekR, jejakR).map(r => r.item.id).join();
  cek('Unit render: objek di bawah goresan dalam satu lapisan, lapisan tersembunyi (y) tidak dirender',
    render === 'o-x,s-x1,s-x2');
  const renderTampil = urutanRender(daftar.map(l => ({ ...l, tampil: true })), objekR, jejakR).map(r => r.item.id).join();
  cek('Unit render: lapisan yang tampil dirender dari bawah ke atas (objek lalu goresan per lapisan)',
    renderTampil === 'o-x,s-x1,s-x2,o-y,s-y');
}

console.log('── Unit: model v5 (goresan.js) ──');
{
  cek('Unit v5: VERSI_GORESAN = 5 dan v1..v5 didukung', VERSI_GORESAN === 5 && VERSI_DIDUKUNG.join() === '1,2,3,4,5');
  const dua = [
    { lapisan: 'dasar', alat: 'pena', warna: '#111111', ukuran: 4, pts: [{ x: 1, y: 1 }, { x: 9, y: 9 }] },
  ];
  const lapisanDua = [
    { id: 'dasar', nama: 'Dasar', tampil: true, kunci: false },
    { id: 'lan2', nama: 'Lapisan 2', tampil: false, kunci: true },
  ];
  const teks = serialGoresan({
    goresan: [...dua, { alat: 'pena', warna: '#222222', ukuran: 3, pts: [{ x: 4, y: 4 }, { x: 8, y: 8 }], lapisan: 'lan2' }],
    objek: [{ id: 'ob1', blob: 'ob_satu', x: 10, y: 10, w: 50, h: 50, lapisan: 'lan2' }],
    lapisan: lapisanDua,
  }, LB, TG);
  const balik = bacaGoresan(teks, LB, TG);
  cek('Unit v5: lapisan (urutan, nama, tampil, kunci) lolos serialisasi lalu baca balik',
    JSON.parse(teks).v === 5 && balik.lapisan.length === 2 && balik.lapisan[1].id === 'lan2'
    && balik.lapisan[1].nama === 'Lapisan 2' && balik.lapisan[1].tampil === false && balik.lapisan[1].kunci === true);
  cek('Unit v5: setiap goresan membawa lapisannya sendiri', balik.goresan[0].lapisan === 'dasar' && balik.goresan[1].lapisan === 'lan2');
  cek('Unit v5: objek membawa lapisannya sendiri', balik.objek[0].lapisan === 'lan2');

  const rusak = bacaGoresan(JSON.stringify({
    v: 5, lapisan: [{ id: 'dasar', nama: 'Dasar' }],
    goresan: [{ alat: 'pena', warna: '#111111', ukuran: 3, pts: [{ x: 1, y: 1 }], lapisan: 'tidak-ada' }],
  }), LB, TG);
  cek('Unit v5: goresan dengan lapisan tidak dikenal jatuh ke lapisan paling bawah',
    rusak.goresan[0].lapisan === 'dasar');

  const v4 = bacaGoresan('{"v":4,"latar":"putih","pola":"titik","goresan":[{"alat":"pena","warna":"#111111","ukuran":3,"gaya":"tinta","pts":[{"x":1,"y":1}]}]}', LB, TG);
  cek('Unit v4 lama: dibaca sebagai satu lapisan Dasar dengan goresan di dalamnya',
    !!v4 && v4.lapisan.length === 1 && v4.lapisan[0].id === 'dasar' && v4.goresan[0].lapisan === 'dasar');

  cek('Unit v5: sketsa hanya lapisan Dasar tanpa isi tidak menghasilkan data', serialGoresan({ goresan: [], lapisan: lapisanAwal() }, LB, TG) === '');
  cek('Unit v5: sketsa dengan dua lapisan tanpa isi tetap menyimpan lapisannya',
    serialGoresan({ goresan: [], lapisan: lapisanDua }, LB, TG) !== '');

  const objekBersih = bersihkanObjek([{ id: 'o1', blob: 'ob_satu', x: 0, y: 0, w: 10, h: 10, lapisan: 'lan2' }], LB, TG, lapisanDua);
  cek('Unit v5: bersihkanObjek mempertahankan lapisan objek yang valid', objekBersih[0].lapisan === 'lan2');
}

console.log('── Integrasi (jsdom): lapisan di sketsa ──');
{
  globalThis.Image = dom.window.Image;
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

  const n = makeNote({ title: 'Uji Lapisan A5', blocks: [{ type: 'paragraph', content: 'Lapisan uji' }] });
  state.notes.unshift(n);
  save();
  openNote(n.id);
  setModeBaca(false);
  await tunggu(30);

  const titik = (type, x, y) => document.getElementById('sk-canvas').dispatchEvent(
    new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }));
  const pilihAlat = nama => klik(`[data-sk-alat="${nama}"]`);
  const goresD = (x1, y1, x2, y2) => {
    pilihAlat('pena');
    titik('pointerdown', x1, y1);
    titik('pointermove', x2, y2);
    titik('pointerup', x2, y2);
  };
  const barLapisan = () => [...document.querySelectorAll('#sk-lapisan-baris [data-sk-lap]')]
    .map(b => ({ id: b.dataset.skLap, nama: b.textContent }));
  /* klik aman: elemen yang tidak ada menjadi kegagalan cek, bukan exception */
  const klik = sel => { const el = document.querySelector(sel); if (el) el.click(); return !!el; };
  const toastTeks = () => document.getElementById('toast')?.textContent || '';
  const ambilFig = () => document.querySelector('.ed-doc .b-img[data-sketch="1"][data-goresan]');
  const dataFig = () => {
    const f = ambilFig();
    return f ? bacaGoresan(f.getAttribute('data-goresan'), LB, TG) : null;
  };
  const simpan = async () => {
    document.getElementById('sk-simpan').click();
    await tunggu(200);
  };
  const bukaSketsa = async () => {
    bukaStudioSketsa(ambilFig() || undefined);
    await tunggu(30);
  };

  /* 1. Sketsa baru: lapisan awal satu, tambah lapisan, lalu goresan masuk ke lapisan aktif */
  bukaStudioSketsa();
  await tunggu(30);
  cek('Integrasi lapisan: sketsa baru hanya punya satu lapisan Dasar',
    barLapisan().length === 1 && barLapisan()[0].nama === 'Dasar');
  cek('Integrasi lapisan: tombol Naik, Turun, dan Hapus lapisan nonaktif bila hanya satu lapisan',
    document.getElementById('sk-lap-naik').disabled && document.getElementById('sk-lap-turun').disabled
    && document.getElementById('sk-lap-hapus').disabled);
  goresD(20, 20, 90, 70);
  document.getElementById('sk-lap-tambah').click();
  await tunggu(30);
  const dua = barLapisan();
  cek('Integrasi lapisan: tambah lapisan membuat Lapisan 2 di atas dan langsung jadi aktif',
    dua.length === 2 && dua[1].nama === 'Lapisan 2'
    && document.querySelector('[data-sk-lap="' + dua[1].id + '"]').getAttribute('aria-pressed') === 'true');
  goresD(200, 200, 260, 240);
  await simpan();
  const d1 = dataFig();
  cek('Integrasi lapisan: dua lapisan tersimpan di data-goresan dengan urutan yang sama',
    !!d1 && d1.lapisan.length === 2 && d1.lapisan[0].nama === 'Dasar' && d1.lapisan[1].nama === 'Lapisan 2');
  cek('Integrasi lapisan: goresan Dasar tersimpan di lapisan bawah, goresan baru di lapisan atas',
    !!d1 && d1.goresan.length === 2 && d1.goresan[0].lapisan === d1.lapisan[0].id && d1.goresan[1].lapisan === d1.lapisan[1].id);
  const idDasar = d1.lapisan[0].id;
  const idAtas = d1.lapisan[1].id;

  /* 2. Sembunyikan lapisan aktif: coretan baru ditolak dengan pesan */
  await bukaSketsa();
  cek('Integrasi lapisan: buka ulang, lapisan atas (paling atas yang bisa diedit) jadi aktif',
    (document.querySelector(`[data-sk-lap="${idAtas}"]`) || { getAttribute: () => '' }).getAttribute('aria-pressed') === 'true');
  klik(`[data-sk-lap-tampil="${idAtas}"]`);
  await tunggu(20);
  goresD(300, 300, 340, 340);
  cek('Integrasi lapisan: coretan di lapisan tersembunyi ditolak dengan pesan', toastTeks().includes('terkunci atau disembunyikan'));
  await simpan();
  const d2 = dataFig();
  cek('Integrasi lapisan: coretan yang ditolak tidak tersimpan, lapisan tersembunyi tetap tersimpan',
    !!d2 && d2.goresan.length === 2 && d2.lapisan[1].tampil === false);

  /* 3. Tampilkan lagi, kunci Dasar, Bersihkan: hanya lapisan atas yang kosong, Dasar utuh */
  await bukaSketsa();
  klik(`[data-sk-lap-tampil="${idAtas}"]`);
  klik(`[data-sk-lap-kunci="${idDasar}"]`);
  await tunggu(20);
  cek('Integrasi lapisan: tombol kunci berganti jadi Buka kunci setelah dikunci',
    (document.querySelector(`[data-sk-lap-kunci="${idDasar}"]`) || { textContent: '' }).textContent === 'Buka kunci');
  document.getElementById('sk-bersih').click();
  await tunggu(20);
  document.getElementById('sk-undo').click();
  await tunggu(20);
  cek('Integrasi lapisan: Urungkan goresan Dasar yang terkunci ditolak', toastTeks().includes('terkunci atau disembunyikan'));
  await simpan();
  const d3 = dataFig();
  cek('Integrasi lapisan: Bersihkan menghapus lapisan atas saja, goresan Dasar yang terkunci tetap',
    !!d3 && d3.goresan.length === 1 && d3.goresan[0].lapisan === idDasar);
  cek('Integrasi lapisan: kunci lapisan Dasar tersimpan', d3.lapisan[0].kunci === true);

  /* 4. Lapisan atas kosong dihapus. Lapisan yang berisi tidak bisa dihapus. */
  await bukaSketsa();
  cek('Integrasi lapisan: buka ulang, lapisan yang bisa diedit (atas) jadi aktif, bukan Dasar yang terkunci',
    (document.querySelector(`[data-sk-lap="${idAtas}"]`) || { getAttribute: () => '' }).getAttribute('aria-pressed') === 'true' && barLapisan().length === 2);
  klik(`[data-sk-lap="${idDasar}"]`);
  await tunggu(20);
  document.getElementById('sk-lap-hapus').click();
  await tunggu(20);
  cek('Integrasi lapisan: lapisan Dasar yang masih berisi tidak bisa dihapus', toastTeks().includes('masih berisi') && barLapisan().length === 2);
  klik(`[data-sk-lap="${idAtas}"]`);
  await tunggu(20);
  document.getElementById('sk-lap-hapus').click();
  await tunggu(20);
  cek('Integrasi lapisan: lapisan atas yang kosong dihapus', barLapisan().length === 1 && barLapisan()[0].id === idDasar);
  await simpan();
  const d4 = dataFig();
  cek('Integrasi lapisan: setelah hapus, data hanya berisi satu lapisan dan goresan Dasar',
    !!d4 && d4.lapisan.length === 1 && d4.goresan.length === 1 && d4.goresan[0].lapisan === idDasar);

  /* 5. Buka kunci, lalu lapisan bisa diedit lagi. Tambah tiga lapisan, cek urut, lalu batas 8. */
  await bukaSketsa();
  klik(`[data-sk-lap-kunci="${idDasar}"]`);
  await tunggu(20);
  goresD(10, 400, 60, 430);
  document.getElementById('sk-lap-tambah').click();
  await tunggu(20);
  goresD(500, 50, 560, 90);
  document.getElementById('sk-lap-tambah').click();
  await tunggu(20);
  const tiga = barLapisan();
  cek('Integrasi lapisan: tiga lapisan dengan lapisan paling atas aktif', tiga.length === 3 && tiga[2].nama === 'Lapisan 3');
  document.getElementById('sk-lap-turun').click();
  await tunggu(20);
  const setelahTurun = barLapisan();
  cek('Integrasi lapisan: Turun memindahkan lapisan aktif satu tingkat ke bawah',
    setelahTurun[1].id === tiga[2].id && setelahTurun[2].id === tiga[1].id);
  cek('Integrasi lapisan: setelah Turun, lapisan aktif bukan yang paling atas sehingga Naik masih aktif',
    document.getElementById('sk-lap-naik').disabled === false);
  document.getElementById('sk-lap-naik').click();
  await tunggu(20);
  const setelahNaik = barLapisan();
  cek('Integrasi lapisan: Naik mengembalikan urutan semula', setelahNaik.map(l => l.id).join() === tiga.map(l => l.id).join());
  cek('Integrasi lapisan: Naik dinonaktifkan saat lapisan aktif sudah paling atas', document.getElementById('sk-lap-naik').disabled === true);
  for (let i = 0; i < 6; i++) { document.getElementById('sk-lap-tambah').click(); await tunggu(10); }
  cek('Integrasi lapisan: jumlah lapisan berhenti di 8 dan Maksimal 8 lapisan muncul',
    barLapisan().length === 8 && toastTeks().includes('Maksimal 8 lapisan'));
  await simpan();
  const d5 = dataFig();
  cek('Integrasi lapisan: data menyimpan 8 lapisan dengan goresan tetap di lapisannya',
    !!d5 && d5.lapisan.length === 8 && d5.goresan.every(st => d5.lapisan.some(l => l.id === st.lapisan)));
  cek('Integrasi lapisan: coretan setelah dibuka kuncinya tersimpan di lapisan Dasar',
    !!d5 && d5.goresan.some(st => st.lapisan === idDasar && st.pts[0].x === 10));

  /* 6. Objek visual di lapisan: disembunyikan = tidak bisa dipilih; ditampilkan lagi = bisa */
  await bukaSketsa();
  const berkasKecil = new dom.window.Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' });
  berkasUji = berkasKecil;
  const idObjekLapisan = barLapisan()[1].id;
  klik(`[data-sk-lap="${idObjekLapisan}"]`);
  await tunggu(20);
  document.getElementById('sk-tambah-gambar').click();
  await tunggu(1900);
  await simpan();
  const d6 = dataFig();
  const objek = d6 ? d6.objek[0] : null;
  cek('Integrasi lapisan: gambar yang ditambahkan masuk ke lapisan aktif (objek.lapisan)',
    !!objek && objek.lapisan === idObjekLapisan);
  const cx = objek ? objek.x + objek.w / 2 : 0, cy = objek ? objek.y + objek.h / 2 : 0;
  await bukaSketsa();
  klik(`[data-sk-lap-tampil="${idObjekLapisan}"]`);
  await tunggu(20);
  pilihAlat('pilih');
  titik('pointerdown', cx, cy);
  titik('pointerup', cx, cy);
  cek('Integrasi lapisan: objek di lapisan tersembunyi tidak bisa dipilih', document.getElementById('sk-besar').disabled === true);
  klik(`[data-sk-lap-tampil="${idObjekLapisan}"]`);
  await tunggu(20);
  titik('pointerdown', cx, cy);
  titik('pointerup', cx, cy);
  cek('Integrasi lapisan: setelah ditampilkan lagi, objek bisa dipilih', document.getElementById('sk-besar').disabled === false);
  document.getElementById('sk-batal').click();
  await tunggu(20);

  /* 7. Data v4 lama dibuka: satu lapisan Dasar, isi tetap ada */
  const fig = ambilFig();
  const v4 = '{"v":4,"latar":"putih","pola":"titik","kanvas":{"w":720,"h":460},"goresan":[{"alat":"pena","warna":"#111111","ukuran":3,"gaya":"tinta","pts":[{"x":10,"y":10},{"x":60,"y":60}]}],"objek":[]}';
  fig.setAttribute('data-goresan', v4);
  bukaStudioSketsa(fig);
  await tunggu(30);
  cek('Integrasi lapisan: data v4 dibuka sebagai satu lapisan Dasar', barLapisan().length === 1 && barLapisan()[0].nama === 'Dasar');
  await simpan();
  cek('Integrasi lapisan: data v4 yang disimpan ulang menjadi v5 dan isinya tetap', dataFig().goresan.length === 1 && JSON.parse(ambilFig().getAttribute('data-goresan')).v === 5);
}

console.log(`\nTotal: ${lulus + gagal} pengujian · Lulus: ${lulus} · Gagal: ${gagal}`);
if (gagal > 0) process.exit(1);
process.exit(0);
