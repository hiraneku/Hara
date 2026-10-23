/**
 * Pengujian menyeluruh pembaruan modern Catatan Hara:
 * 1. Tombol mengambang Cari di Dalam Catatan (#cari-float) pada Mode Baca
 * 2. Studio Gambar Emoji / Stiker Sendiri (hamoji-gambar.js + Mode Stiker + Cadangan JSON)
 * 3. Perbaikan crash Reminder selesai + Centang langsung dari Daftar / Tugas / Reminder
 * 4. Perlindungan penuh privasi Catatan Terkunci PIN (Palette, Tugas, Tabel/Kanban, Renamer, Kunci Ulang)
 * 5. Tangkap Cepat (+ Tugas/Reminder), Ruang/Folder, Grid, Kanban, Riwayat Versi, & Blok Modern (Toggle, Tabel, Audio, Kode)
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
  'Event', 'MouseEvent', 'KeyboardEvent', 'InputEvent', 'MutationObserver', 'File', 'Blob',
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
URL.createObjectURL = () => 'blob:uji-modern';
URL.revokeObjectURL = () => {};
globalThis.fetch = async () => ({ ok: false, status: 503 });

await import(`../../docs/app.js${qv}`);

const { state, save } = await import(`../../docs/core/store.js${qv}`);
const routerMod = await import(`../../docs/core/router.js${qv}`);
const { makeNote, makeBlock, domToBlocks, plainText } = await import(`../../docs/notes/note-model.js${qv}`);
const { openNote } = await import(`../../docs/notes/model.js${qv}`);
const { setModeBaca } = await import(`../../docs/notes/mode-baca.js${qv}`);
const { pasangKunci, resetSesi, bukaSesi, kunciUlangSekarang } = await import(`../../docs/notes/kunci.js${qv}`);
const { muatCustomHamoji, setDaftarCustomHamoji, bukaPanelHamoji } = await import(`../../docs/notes/hamoji.js${qv}`);
const { cadanganJson, siapImporJson, terapkanImporJson, markdownDariCatatan, catatanDariMarkdown } = await import(`../../docs/notes/data-io.js${qv}`);
const {
  sumberTugasTerbuka, bukaTabelProperti, jadikanBarisTenggatTugas, bukaTangkapCepat,
} = await import(`../../docs/notes/fitur-lanjutan-ui.js${qv}`);
const { imporCatatanHara, renamerAlatCtx } = await import(`../../docs/renamer/index.js${qv}`);
const {
  tambahRuang, pindahkanCatatanKeRuang, setRuangAktif, toggleModeTampilDaftar, modeTampilDaftar,
  rekamVersiCatatan, pulihkanVersiCatatan,
} = await import(`../../docs/notes/ruang.js${qv}`);
const { insertToggle, insertTable, insertAudioBlock } = await import(`../../docs/notes/editor/blok-modern.js${qv}`);
const { simpanBlob } = await import(`../../docs/core/blobs.js${qv}`);
const { bukaPalette, tutupPalette } = await import(`../../docs/core/palette.js${qv}`);

const tunggu = ms => new Promise(r => setTimeout(r, ms));
let lulus = 0, gagal = 0;
function cek(nama, kondisi) {
  if (kondisi) { lulus++; console.log('  ✓', nama); }
  else { gagal++; console.error('  ✗ GAGAL:', nama); }
}

console.log('── 1. Tombol Mengambang Cari di Mode Baca (#cari-float) ──');
{
  const n = makeNote({
    title: 'Artikel Panjang Mode Baca',
    blocks: [
      { type: 'paragraph', content: 'Paragraf pembuka tentang hutan hujan Kalimantan.' },
      { type: 'paragraph', content: 'Di tengah artikel terdapat frasa kunci katulistiwa yang dicari pembaca.' },
    ],
  });
  state.notes.unshift(n);
  save();
  openNote(n.id);
  setModeBaca(false);
  await tunggu(30);

  const btnTulis = document.getElementById('cari-float');
  cek('Mode tulis: tombol mengambang #cari-float tersembunyi', !!btnTulis && btnTulis.hidden === true);

  setModeBaca(true);
  await tunggu(30);
  cek('Mode baca: tombol mengambang #cari-float muncul di kanan bawah', btnTulis.hidden === false && btnTulis.classList.contains('on'));

  btnTulis.click();
  await tunggu(20);
  const panelCari = document.getElementById('cari-note');
  cek('Klik #cari-float langsung membuka bilah pencarian #cari-note', !!panelCari && panelCari.classList.contains('on'));
  cek('#cari-float bersembunyi rapi selagi panel pencarian aktif', btnTulis.hidden === true);

  const inpCari = document.getElementById('cari-note-in');
  inpCari.value = 'katulistiwa';
  inpCari.dispatchEvent(new Event('input', { bubbles: true }));
  cek('Pencarian menyorot kata yang cocok di dalam catatan', document.querySelectorAll('.ed-doc span.cari').length === 1);

  document.querySelector('#cari-note [data-cn="tutup"]').click();
  await tunggu(20);
  cek('Menutup panel pencarian memunculkan kembali #cari-float', btnTulis.hidden === false);

  setModeBaca(false);
  await tunggu(30);
  cek('Keluar dari Mode Baca menyembunyikan kembali #cari-float', btnTulis.hidden === true);
}

console.log('── 2. Studio Gambar Emoji / Stiker Sendiri & Mode Stiker ──');
{
  bukaPanelHamoji(document.getElementById('hamoji-btn'));
  const btnStudio = document.getElementById('hamoji-open-studio');
  cek('Tombol Gambar Sendiri tampil di modal Hamoji', !!btnStudio);
  btnStudio.click();

  const cv = document.getElementById('hs-canvas');
  cek('Studio gambar menampilkan kanvas transparan #hs-canvas', !!cv);

  cv.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 60, clientY: 60 }));
  cv.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 110, clientY: 95 }));
  cv.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));

  document.querySelector('[data-hs-tool="heart"]').click();
  cv.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 130, clientY: 130 }));

  const inpNama = document.getElementById('hs-name');
  inpNama.value = 'Kucing Hati';
  document.getElementById('hs-save-stick').click();
  await tunggu(50);

  const koleksi = muatCustomHamoji();
  cek('Emoji hasil gambar tersimpan ke koleksi pribadi dengan dataUrl gambar', koleksi.length >= 1 && !!koleksi[0].dataUrl && koleksi[0].name === 'Kucing Hati');

  const nAktif = state.notes.find(x => x.id === state.openId);
  cek('Emoji hasil gambar otomatis menempel di catatan sebagai Stiker transparan',
    Array.isArray(nAktif.stickers) && nAktif.stickers.length === 1 && !!nAktif.stickers[0].imgData);
  cek('Layer stiker merender elemen <img class="hamoji-drawn-img">',
    !!document.querySelector('#hamoji-stickers-layer img.hamoji-drawn-img'));

  const { teks: jsonCadangan } = await cadanganJson();
  setDaftarCustomHamoji([], false);
  cek('Koleksi dikosongkan sementara sebelum uji pulih', muatCustomHamoji().length === 0);
  const ringkas = await siapImporJson(jsonCadangan);
  await terapkanImporJson(ringkas, 'gabung');
  cek('Cadangan JSON memulihkan utuh koleksi emoji gambar buatan pengguna',
    muatCustomHamoji().some(x => x.name === 'Kucing Hati' && !!x.dataUrl));
}

console.log('── 3. Perbaikan Crash Reminder Selesai & Centang Langsung dari Daftar ──');
{
  const nRem = makeNote({
    title: 'Uji Pengingat Hari Ini',
    blocks: [
      { type: 'todo', content: 'hari ini minum vitamin', meta: { checked: false } },
      { type: 'todo', content: 'hari ini olahraga pagi', meta: { checked: true, done: Date.now() - 60000 } },
    ],
  });
  state.notes.unshift(nRem);
  save();

  let tidakCrash = true;
  try { routerMod.go('rem'); } catch (e) { tidakCrash = false; console.error(e); }
  cek('Layar Reminder tidak crash saat ada tugas yang baru selesai', tidakCrash && document.getElementById('wrap').innerHTML.includes('Baru selesai'));

  const cekBtn = document.querySelector(`[data-todo-cek="${nRem.id}"]`);
  cek('Tombol centang inline tampil langsung pada kartu tugas/pengingat', !!cekBtn);
  cekBtn.click();
  cek('Klik centang di layar Reminder langsung menuntaskan tugas di model', nRem.blocks[0].meta.checked === true);
}

console.log('── 4. Privasi Penuh Catatan Terkunci PIN & Kunci Ulang Cepat ──');
{
  const rahasia = makeNote({
    title: 'Dokumen Rahasia Negara',
    props: [{ k: 'status', v: 'berjalan' }],
    blocks: [{ type: 'todo', content: 'besok serahkan sandi rahasia', meta: { checked: false } }],
  });
  state.notes.unshift(rahasia);
  save();
  await pasangKunci(rahasia.id, '1234');
  resetSesi(rahasia.id);

  cek('Tugas dalam catatan terkunci tidak bocor ke sumberTugasTerbuka()',
    !sumberTugasTerbuka().some(t => t.label.includes('sandi rahasia')));

  bukaPalette();
  const palHtml = document.querySelector('.pal').innerHTML;
  tutupPalette();
  cek('Judul catatan terkunci tidak bocor ke Command Palette', !palHtml.includes('Dokumen Rahasia Negara'));

  bukaTabelProperti('tabel');
  const dbHtml = document.getElementById('pop').innerHTML;
  cek('Properti catatan terkunci tidak bocor ke Tabel Properti', !dbHtml.includes('Dokumen Rahasia Negara'));

  routerMod.go('task');
  cek('Tugas dalam catatan terkunci tidak bocor ke layar Tugas & Kalender',
    !document.getElementById('wrap').innerHTML.includes('sandi rahasia'));

  renamerAlatCtx().state.files = [];
  imporCatatanHara();
  cek('Catatan terkunci tidak ikut terimpor ke Bulk File Renamer',
    !renamerAlatCtx().state.files.some(f => f.originalName.includes('Dokumen-Rahasia')));

  bukaSesi(rahasia.id);
  openNote(rahasia.id);
  kunciUlangSekarang();
  cek('Kunci lagi sekarang langsung mengembalikan layar ke pintu PIN', routerMod.cur === 'kunci');
}

console.log('── 5. Tangkap Cepat, Ruang/Folder, Grid, Kanban, Versi & Blok Modern ──');
{
  bukaTangkapCepat('task', false);
  const qcInp = document.getElementById('qc-teks');
  qcInp.value = 'besok kirim proposal klien !!';
  document.getElementById('qc-simpan').click();
  cek('Tangkap Cepat membuat/mengisi Kotak Masuk Tugas',
    state.notes.some(n => n.title === 'Kotak Masuk Tugas' && plainText(n).includes('kirim proposal klien')));

  const nProyek = makeNote({
    title: 'Rencana Produk Q4',
    props: [{ k: 'status', v: 'draf' }],
    blocks: [{ type: 'paragraph', content: 'besok review desain akhir' }],
  });
  state.notes.unshift(nProyek);
  const rg = tambahRuang('Kerja');
  pindahkanCatatanKeRuang(nProyek.id, rg.id);
  setRuangAktif(rg.id);
  toggleModeTampilDaftar();
  routerMod.go('notes');
  cek('Filter Ruang menyaring daftar hanya catatan di ruang tersebut & mode Grid aktif',
    modeTampilDaftar() === 'grid' && !!document.querySelector('.card.card-grid') && document.getElementById('wrap').innerHTML.includes('Rencana Produk Q4'));
  setRuangAktif(null);
  toggleModeTampilDaftar();

  bukaTabelProperti('kanban');
  const mvBtn = document.querySelector(`[data-kb-id="${nProyek.id}"][data-kb-st="selesai"]`);
  cek('Papan Kanban merender kartu pada kolom status draf', !!mvBtn);
  mvBtn.click();
  cek('Klik pindah kolom Kanban langsung mengubah properti status catatan',
    nProyek.props.find(p => p.k === 'status').v === 'selesai');

  openNote(nProyek.id);
  await rekamVersiCatatan(nProyek);
  jadikanBarisTenggatTugas();
  cek('jadikanBarisTenggatTugas mengubah paragraf bertenggat menjadi blok todo',
    nProyek.blocks[0].type === 'todo');

  await simpanBlob('aud_uji_1', new Blob(['suara-uji'], { type: 'audio/webm' }));
  insertToggle('Catatan Rapat', 'Isi tersembunyi rapat');
  insertTable([['Fitur', 'Status'], ['Mode Baca', 'Siap'], ['Stiker Gambar', 'Siap']]);
  insertAudioBlock('aud_uji_1', 12, 'Rekaman Ide');

  const d = document.querySelector('.ed-doc');
  const bloks = domToBlocks(d);
  cek('domToBlocks membaca utuh blok Toggle, Tabel, dan Audio Memo',
    bloks.some(b => b.type === 'toggle' && b.meta.summary === 'Catatan Rapat') &&
    bloks.some(b => b.type === 'table' && b.meta.rows.length === 3) &&
    bloks.some(b => b.type === 'audio' && b.meta.blobId === 'aud_uji_1'));

  const nMd = makeNote({ title: 'Ekspor Tabel & Kode', blocks: [
    ...bloks,
    makeBlock({ type: 'code', content: 'const x = 42;', meta: { lang: 'js' } }),
  ] });
  const md = markdownDariCatatan(nMd);
  const kembali = catatanDariMarkdown('uji.md', md);
  cek('Ekspor & Impor Markdown mempertahankan Tabel & Bahasa Blok Kode (```js)',
    kembali.blocks.some(b => b.type === 'table' && b.meta.rows[1][0] === 'Mode Baca') &&
    kembali.blocks.some(b => b.type === 'code' && b.meta.lang === 'js'));

  const dipulih = await pulihkanVersiCatatan(nProyek.id, 0);
  cek('Riwayat versi lokal berhasil memulihkan snapshot sebelumnya', dipulih && nProyek.blocks[0].type === 'paragraph');
}

console.log(`\nTotal: ${lulus + gagal} pengujian · Lulus: ${lulus} · Gagal: ${gagal}`);
if (gagal > 0) process.exit(1);
process.exit(0);
