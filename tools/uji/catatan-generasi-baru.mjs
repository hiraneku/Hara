/**
 * Pengujian menyeluruh Peta Master Catatan Mobile Generasi Baru (#1 s/d #14):
 *  #1 Menu Aksi Blok Sentuh (Turn into, Warna Latar Blok, Duplikat, Salin Link Blok, Hapus)
 *  #2 Bar Pintas Keyboard Mobile (#qk-strip: Cap Jam, Alat Teks, Aksi Blok)
 *  #3 Studio Kanvas Coretan & Tanda Tangan (/sketch -> blob gambar + atribut data-sketch)
 *  #4 Blok Rumus Matematika Offline (/math -> pecahan, akar, simbol Yunani & round-trip Markdown)
 *  #5 Blok Kartu Tautan / Bookmark Visual (/bookmark -> domain otomatis & round-trip Markdown)
 *  #6 Blok Lampiran Berkas Offline (/file -> IndexedDB blobs + ikut Cadangan JSON)
 *  #7 Filter Pindai Dokumen Foto (Document Scan B/W Tajam, Kontras, Pulihkan Asli)
 *  #8 Kalkulator Inline di Dalam Catatan (tanpa eval: `125000 * 3 + 15000 =` -> `390.000`) & Jumlahkan Angka
 *  #9 Bottom Sheet Alat Teks Pintar (Rapikan copas, Title Case, Urutkan A-Z, Hapus Duplikat, Jadi To-do)
 * #10 Reset Semua Centang To-do 1 Ketuk (untuk checklist berulang)
 * #11 Kartu Gambar Estetik SVG/PNG & Ekspor HTML Mandiri (lengkap gambar base64 & stiker)
 * #12 Mode Fokus Menulis (Focus Dim + Typewriter + Target Kata Live di #count)
 * #13 Garis Progres Baca (#baca-progres) + Ingat Posisi Gulir Otomatis + Sampul/Banner Catatan
 * #14 Bar Pindah Cepat Catatan Terakhir (#recent-bar) + Peta Jaringan Sentuh Interaktif (#graf-modal + privasi PIN)
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

console.log('── Bagian 1 (#1–#7): Editor & Blok Generasi Baru Mobile ──');
{
  const n1 = makeNote({
    title: 'Catatan Uji Generasi Baru',
    blocks: [{ type: 'paragraph', content: 'Baris pertama untuk aksi blok' }],
  });
  state.notes.unshift(n1);
  save();
  openNote(n1.id);
  setModeBaca(false);
  await tunggu(30);

  /* #2 Bar Pintas Keyboard Mobile */
  const qk = document.getElementById('qk-strip');
  cek('#2 Bar pintas cepat keyboard mobile (#qk-strip) tampil di mode tulis', !!qk);
  document.querySelector('[data-qk="jam"]').click();
  cek('#2 Tombol pintas jam menyisipkan waktu HH:MM ke paragraf aktif', /\d{2}:\d{2}/.test(document.querySelector('.ed-doc').textContent));

  /* #1 Menu Aksi Blok Sentuh */
  const blk0 = document.querySelector('.ed-doc').firstElementChild;
  bukaMenuAksiBlok(blk0);
  cek('#1 Menu Aksi Blok membuka sheet dengan pilihan tipe & latar', !!document.querySelector('[data-ba-turn="b-h2"]'));
  setWarnaLatarBlok(blk0, 'emerald');
  const dup = duplikatBlok(blk0);
  const refStr = salinTautanKeBlok(blk0);
  cek('#1 Highlight latar blok, duplikat blok, & rujukan blok bekerja utuh',
    blk0.getAttribute('data-bg') === 'emerald' && !!dup && refStr.startsWith('![[Catatan Uji Generasi Baru#^'));

  /* #3 Kanvas Coretan & Tanda Tangan (/sketch) */
  bukaStudioSketsa();
  const skCv = document.getElementById('sk-canvas');
  cek('#3 Modal kanvas sketsa layar penuh tampil (#sk-canvas)', !!skCv);
  skCv.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 80, clientY: 90 }));
  skCv.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 220, clientY: 160 }));
  skCv.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
  document.getElementById('sk-simpan').click();
  let figSketsa = null;
  const batas = Date.now() + 2500;
  while (!figSketsa && Date.now() < batas) {
    await tunggu(30);
    figSketsa = document.querySelector('.ed-doc .b-img[data-sketch="1"]');
  }
  cek('#3 Coretan tersimpan sebagai blok gambar bersumber IndexedDB di catatan', !!figSketsa);

  /* #7 Filter Pindai Dokumen (Document Scan B/W -> Asli) */
  const idSebelumScan = figSketsa.querySelector('img').getAttribute('data-blob');
  await terapkanFilterPindai(figSketsa, 'bw');
  const idSesudahScan = figSketsa.querySelector('img').getAttribute('data-blob');
  cek('#7 Filter Pindai Dokumen menghasilkan blob tajam baru & menyimpan backup asli',
    idSesudahScan !== idSebelumScan && figSketsa.getAttribute('data-orig-blob') === idSebelumScan);
  await terapkanFilterPindai(figSketsa, 'asli');
  cek('#7 Pulihkan ke Foto Asli mengembalikan blob awal dengan utuh',
    figSketsa.querySelector('img').getAttribute('data-blob') === idSebelumScan);

  /* #4 Rumus Matematika Offline (/math), #5 Bookmark (/bookmark), #6 Lampiran Berkas (/file) */
  const mathHtml = renderRumusMatematika('\\frac{a^2 + b^2}{\\sqrt{c}} = \\pi');
  cek('#4 Renderer matematika mengubah pecahan, akar, pangkat & simbol Yunani secara offline',
    mathHtml.includes('math-frac') && mathHtml.includes('math-sqrt') && mathHtml.includes('π'));

  insertMathBlock('E = mc^{2}');
  insertBookmarkBlock('https://hara.app/panduan', 'Panduan Hara', 'Dokumentasi resmi');
  const fileUji = new File(['isi dokumen pdf uji'], 'tiket-pesawat.pdf', { type: 'application/pdf' });
  const blobFileId = await lampirkanBerkasKeCatatan(fileUji);

  const bloks = domToBlocks(document.querySelector('.ed-doc'));
  cek('#4, #5, #6 domToBlocks menyimpan utuh blok math, bookmark, dan file attachment',
    bloks.some(b => b.type === 'math' && b.meta.expr === 'E = mc^{2}') &&
    bloks.some(b => b.type === 'bookmark' && b.meta.title === 'Panduan Hara') &&
    bloks.some(b => b.type === 'file' && b.meta.blobId === blobFileId && b.meta.name === 'tiket-pesawat.pdf'));

  const cad = await cadanganJson();
  cek('#6 Berkas lampiran ikut tercadangkan di Cadangan JSON Hara', cad.teks.includes(blobFileId));

  const md = markdownDariCatatan(makeNote({ title: 'Uji MD', blocks: bloks }));
  const balikMd = catatanDariMarkdown('uji.md', md);
  cek('#4 & #5 Ekspor-Impor Markdown mempertahankan blok Rumus ($$) & Kartu Tautan',
    balikMd.blocks.some(b => b.type === 'math' && b.meta.expr === 'E = mc^{2}') &&
    balikMd.blocks.some(b => b.type === 'bookmark' && b.meta.url === 'https://hara.app/panduan'));
}

console.log('── Bagian 2 (#8–#11): Kalkulator Inline, Smart Text, Checklist & Ekspor ──');
{
  /* #8 Kalkulator Inline Tanpa eval */
  cek('#8 Evaluasi ekspresi aritmatika mendukung ribuan, kurung & pangkat tanpa eval',
    evaluasiEkspresiAman('125.000 * 3 + 15.000') === 390000 &&
    evaluasiEkspresiAman('(12 + 8) / 4 + 2^3') === 13);

  const nCalc = makeNote({
    title: 'Anggaran Belanja',
    blocks: [{ type: 'paragraph', content: 'Total makan: 45000 + 18500 * 2 =' }],
  });
  state.notes.unshift(nCalc);
  openNote(nCalc.id);
  const hasilInline = cobaHitungInlineSekarang(false);
  cek('#8 Kalkulator inline mengisi hasil perhitungan langsung di ujung baris "="',
    !!hasilInline && /82[.,]000/.test(document.querySelector('.ed-doc').textContent));

  /* #9 Transformasi & Jumlahkan Angka */
  cek('#9 Alat Teks Pintar merapikan spasi, Title Case, urut A-Z & hapus duplikat',
    ubahTeksPintar('  halo   dunia  \n\n\n  catatan  ', 'rapikan') === 'halo dunia\n\ncatatan' &&
    ubahTeksPintar('belajar catatan modern', 'judul') === 'Belajar Catatan Modern' &&
    ubahTeksPintar('Jeruk\nApel\njeruk', 'unik') === 'Jeruk\nApel');
  cek('#9 Jumlahkan angka menjumlahkan seluruh nominal dalam teks',
    jumlahkanAngkaDalamTeks('Beras 65.000, Telur 28.000, Sayur 12.000').total === 105000);

  /* #10 Reset Semua Centang To-do */
  const nPack = makeNote({
    title: 'Checklist Packing Liburan',
    blocks: [
      { type: 'todo', content: 'Paspor & KTP', meta: { checked: true, done: Date.now() } },
      { type: 'todo', content: 'Charger HP', meta: { checked: true, done: Date.now() } },
    ],
  });
  state.notes.unshift(nPack);
  openNote(nPack.id);
  await tunggu(20);
  const jmlReset = await resetSemuaCentangTodo(nPack.id);
  cek('#10 Reset semua centang To-do mengosongkan kembali seluruh checklist berulang',
    jmlReset === 2 && nPack.blocks.every(b => b.meta.checked === false));

  /* #11 Kartu Gambar SVG & Ekspor HTML Mandiri */
  const svgKartu = buatSvgKartuCatatan(nPack, 'hutan');
  const htmlMandiri = await eksporHtmlMandiri(nPack.id);
  cek('#11 Pembuat Kartu Gambar & Ekspor HTML Mandiri menghasilkan dokumen utuh',
    svgKartu.includes('<svg') && svgKartu.includes('Checklist Packing Liburan') &&
    htmlMandiri.includes('<!doctype html>') && htmlMandiri.includes('Checklist Packing Liburan'));
}

console.log('── Bagian 3 (#12–#14): Fokus Menulis, Progres/Scroll/Sampul, Recent & Graf ──');
{
  /* #12 Fokus Menulis & Target Kata */
  aturFokusMenulis({ dim: true, typewriter: true, targetKata: 100 });
  cek('#12 Focus Dim menyalakan kelas fokus pada body & target kata tampil di #count',
    document.body.classList.contains('fokus-dim') && document.getElementById('count').textContent.includes('/100'));
  aturFokusMenulis({ dim: false, typewriter: false, targetKata: 0 });

  /* #13 Scroll Memory, Garis Progres Baca & Sampul Catatan */
  const idAktif = state.openId;
  simpanPosisiGulir(idAktif, 420);
  cek('#13 Scroll Memory menyimpan & mengingat posisi gulir terakhir per catatan', ambilPosisiGulir(idAktif) === 420);

  setSampulCatatan(idAktif, 'hutan');
  cek('#13 Sampul catatan tersimpan di model & menampilkan banner #ed-cover',
    state.notes.find(x => x.id === idAktif).cover === 'hutan' && document.getElementById('ed-cover').hidden === false);

  setModeBaca(true);
  await tunggu(20);
  perbaruiGarisProgresBaca();
  cek('#13 Garis progres baca tipis (#baca-progres) aktif otomatis saat Mode Baca',
    document.getElementById('baca-progres').hidden === false);
  setModeBaca(false);

  /* #14 Bar Catatan Terakhir (#recent-bar) & Peta Jaringan Sentuh Interaktif */
  cek('#14 Bar pindah cepat Catatan Terakhir (#recent-bar) tampil dengan >= 2 catatan riwayat',
    document.querySelectorAll('#recent-bar [data-recent-open]').length >= 2);

  const nRahasia = makeNote({
    title: 'Catatan Rahasia Graf',
    blocks: [makeBlock({ type: 'paragraph', content: '<span class="wl">[[Anggaran Belanja]]</span>' })],
  });
  state.notes.unshift(nRahasia);
  save();
  await pasangKunci(nRahasia.id, '9999');
  resetSesi(nRahasia.id);

  bukaGrafInteraktif();
  const grafModal = document.getElementById('graf-modal');
  cek('#14 Peta Jaringan Interaktif tampil penuh & menjaga privasi catatan terkunci PIN',
    !!grafModal && !grafModal.innerHTML.includes('Catatan Rahasia Graf') && grafModal.innerHTML.includes('Anggaran Belanja'));
  document.getElementById('gf-tutup').click();
}

console.log(`\nTotal: ${lulus + gagal} pengujian · Lulus: ${lulus} · Gagal: ${gagal}`);
if (gagal > 0) process.exit(1);
process.exit(0);
