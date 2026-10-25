/**
 * Pengujian Tahap 1 · A3 (preset gaya pena).
 *  - Unit: preset-pena.js (validasi, batas 8 kustom, penyimpanan rusak diabaikan, hapus hanya kustom),
 *    goresan.js v4 (gaya tersimpan, gaya rusak jadi tinta, data v3 tetap terbaca).
 *  - Integrasi (jsdom): tombol preset memilih alat pena + warna + ukuran + gaya; goresan tersimpan membawa gaya;
 *    preset kustom bisa disimpan, duplikat ditolak, dan dihapus. Alat selain pena tidak ikut gaya.
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
const { serialGoresan, bacaGoresan, faktorGaya, GAYA_GORESAN, VERSI_GORESAN } = goresanMod;
const presetMod = await import('../../docs/notes/editor/preset-pena.js');
const { bersihkanPreset, PRESET_BAWAAN, daftarPreset, simpanPresetKustom, hapusPresetKustom, muatPresetKustom, namaPresetBerikutnya, MAKS_PRESET_KUSTOM, KUNCI_PRESET } = presetMod;

console.log('── Unit: preset pena (preset-pena.js) ──');
{
  localStorage.clear();
  cek('Unit preset: ada tiga preset bawaan dengan id dan gaya valid',
    PRESET_BAWAAN.length === 3 && PRESET_BAWAAN.every(p => p.id && GAYA_GORESAN.includes(p.gaya)));
  const bersih = bersihkanPreset({ id: 'x-1', nama: '  Halus  ', warna: '#ABCDEF', ukuran: 99, gaya: 'kuas' });
  cek('Unit preset: nama dipangkas, warna jadi huruf kecil, ukuran dibatasi 40',
    !!bersih && bersih.nama === 'Halus' && bersih.warna === '#abcdef' && bersih.ukuran === 40);
  cek('Unit preset: nama panjang dipotong 24 karakter',
    bersihkanPreset({ id: 'x-2', nama: 'a'.repeat(60), warna: '#111111', ukuran: 3, gaya: 'tinta' }).nama.length === 24);
  cek('Unit preset: warna tidak valid ditolak', bersihkanPreset({ id: 'x-3', nama: 'a', warna: 'merah', ukuran: 3, gaya: 'tinta' }) === null);
  cek('Unit preset: gaya tidak dikenal ditolak', bersihkanPreset({ id: 'x-4', nama: 'a', warna: '#111111', ukuran: 3, gaya: 'neon' }) === null);
  cek('Unit preset: nama kosong ditolak', bersihkanPreset({ id: 'x-5', nama: '   ', warna: '#111111', ukuran: 3, gaya: 'tinta' }) === null);
  cek('Unit preset: ukuran bukan angka ditolak', bersihkanPreset({ id: 'x-6', nama: 'a', warna: '#111111', ukuran: 'abc', gaya: 'tinta' }) === null);

  const s1 = simpanPresetKustom({ warna: '#059669', ukuran: 6, gaya: 'pensil' });
  cek('Unit preset: simpan preset kustom pertama berhasil dengan nama "Gaya 1"', s1.ok && s1.preset.nama === 'Gaya 1');
  cek('Unit preset: preset tersimpan terbaca balik', muatPresetKustom().length === 1 && muatPresetKustom()[0].gaya === 'pensil');
  cek('Unit preset: kombinasi yang sama ditolak sebagai "ada"', simpanPresetKustom({ warna: '#059669', ukuran: 6, gaya: 'pensil' }).alasan === 'ada');
  cek('Unit preset: nomor nama berikutnya adalah "Gaya 2"', namaPresetBerikutnya(muatPresetKustom()) === 'Gaya 2');
  for (let i = 0; i < MAKS_PRESET_KUSTOM - 1; i++) simpanPresetKustom({ warna: '#111111', ukuran: 10 + i, gaya: 'tinta' });
  cek('Unit preset: kustom mentok di batas maksimum', muatPresetKustom().length === MAKS_PRESET_KUSTOM);
  cek('Unit preset: menambah di atas batas ditolak sebagai "penuh"', simpanPresetKustom({ warna: '#222222', ukuran: 2, gaya: 'kuas' }).alasan === 'penuh');
  cek('Unit preset: daftar gabungan = bawaan + kustom', daftarPreset().length === 3 + MAKS_PRESET_KUSTOM);

  const idHapus = muatPresetKustom()[0].id;
  cek('Unit preset: hapus preset kustom berhasil', hapusPresetKustom(idHapus) === true && muatPresetKustom().length === MAKS_PRESET_KUSTOM - 1);
  cek('Unit preset: hapus preset bawaan ditolak (tidak pernah dihapus)', hapusPresetKustom('bawaan-tinta') === false && daftarPreset().some(p => p.id === 'bawaan-tinta'));

  localStorage.setItem(KUNCI_PRESET, '{rusak');
  cek('Unit preset: penyimpanan rusak (JSON salah) diabaikan tanpa error', muatPresetKustom().length === 0);
  localStorage.setItem(KUNCI_PRESET, '{"a":1}');
  cek('Unit preset: penyimpanan bukan larik diabaikan', muatPresetKustom().length === 0);
  localStorage.setItem(KUNCI_PRESET, JSON.stringify([{ id: 'ok-1', nama: 'Baik', warna: '#111111', ukuran: 3, gaya: 'tinta' }, { id: 'rusak', nama: '' }, 42]));
  cek('Unit preset: hanya item valid dari penyimpanan yang dipakai', muatPresetKustom().length === 1 && muatPresetKustom()[0].nama === 'Baik');
  localStorage.clear();
}

console.log('── Unit: gaya goresan (goresan.js v4, v5 sejak A5) ──');
{
  cek('Unit gaya: versi penyimpanan sekarang 5 (A5: lapisan)', VERSI_GORESAN === 5);
  const teks = serialGoresan({ goresan: [{ alat: 'pena', warna: '#2563eb', ukuran: 10, gaya: 'kuas', pts: [{ x: 10, y: 10 }, { x: 20, y: 20 }] }] }, 720, 460);
  const b = bacaGoresan(teks);
  cek('Unit gaya: gaya "kuas" tersimpan dan terbaca balik', !!b && b.goresan[0].gaya === 'kuas' && JSON.parse(teks).v === 5);
  const rusak = bacaGoresan(serialGoresan({ goresan: [{ alat: 'pena', warna: '#111111', ukuran: 3, gaya: 'neon', pts: [{ x: 1, y: 1 }] }] }, 720, 460));
  cek('Unit gaya: gaya tidak dikenal jadi "tinta"', !!rusak && rusak.goresan[0].gaya === 'tinta');
  const v3 = bacaGoresan('{"v":3,"kanvas":{"w":720,"h":460},"goresan":[{"alat":"pena","warna":"#111111","ukuran":3,"pts":[{"x":5,"y":5}]}]}');
  cek('Unit gaya: data v3 (tanpa gaya) tetap terbaca dengan gaya "tinta"', !!v3 && v3.goresan.length === 1 && v3.goresan[0].gaya === 'tinta');
  cek('Unit gaya: faktor tinta = 1 (tidak berubah)', faktorGaya('tinta').skala === 1 && faktorGaya('tinta').alpha === 1);
  cek('Unit gaya: kuas lebih tebal dan agak transparan', faktorGaya('kuas').skala > 1 && faktorGaya('kuas').alpha < 1);
  cek('Unit gaya: pensil lebih tipis dan lebih pudar', faktorGaya('pensil').skala < 1 && faktorGaya('pensil').alpha < 0.8);
  cek('Unit gaya: gaya tidak dikenal memakai faktor tinta', faktorGaya('xx').skala === 1 && faktorGaya('xx').alpha === 1);
}

console.log('── Integrasi (jsdom): preset di /sketch ──');
{
  localStorage.clear();
  const { makeNote } = await import(`../../docs/notes/note-model.js${qv}`);
  const { openNote } = await import(`../../docs/notes/model.js${qv}`);
  const { setModeBaca } = await import(`../../docs/notes/mode-baca.js${qv}`);
  const { state, save } = await import(`../../docs/core/store.js${qv}`);
  const { bukaStudioSketsa } = await import(`../../docs/notes/editor/sketsa.js${qv}`);

  const n = makeNote({ title: 'Uji Preset A3', blocks: [{ type: 'paragraph', content: 'Preset pena' }] });
  state.notes.unshift(n);
  save();
  openNote(n.id);
  setModeBaca(false);
  await tunggu(30);

  const pasangRect = () => {
    const cv = document.getElementById('sk-canvas');
    cv.getBoundingClientRect = () => ({ left: 0, top: 0, width: parseFloat(cv.style.width) || cv.width, height: parseFloat(cv.style.height) || cv.height });
  };
  const titik = (type, x, y) => document.getElementById('sk-canvas').dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }));
  const goresSatu = (x, y, x2, y2) => { titik('pointerdown', x, y); titik('pointermove', x2, y2); titik('pointerup', x2, y2); };
  const klik = sel => document.querySelector(sel).click();
  const jumlahPreset = () => document.querySelectorAll('#sketsa-modal [data-sk-preset]').length;
  const aktifPena = () => document.querySelector('#sketsa-modal [data-sk-alat="pena"]').classList.contains('on');
  const ambilGoresan = () => {
    const figs = [...document.querySelectorAll('.ed-doc .b-img[data-sketch="1"][data-goresan]')];
    const fig = figs[figs.length - 1];
    return fig ? bacaGoresan(fig.getAttribute('data-goresan')) : null;
  };

  bukaStudioSketsa();
  cek('A3 UI: baris preset menampilkan tiga preset bawaan', jumlahPreset() === 3);
  cek('A3 UI: tombol Hapus preset nonaktif saat tidak ada preset kustom yang cocok', document.querySelector('#sk-preset-hapus').disabled === true);

  klik('[data-sk-preset="bawaan-kuas"]');
  cek('A3 UI: memilih preset kuas mengaktifkan alat Pena', aktifPena());
  cek('A3 UI: preset kuas ditandai aktif', document.querySelector('[data-sk-preset="bawaan-kuas"]').classList.contains('on'));
  cek('A3 UI: ukuran 10 dari preset tidak punya tombol ukuran, jadi tidak ada tombol ukuran yang aktif',
    document.querySelectorAll('#sketsa-modal [data-sk-uk].on').length === 0);

  pasangRect();
  goresSatu(100, 100, 150, 120);
  document.getElementById('sk-simpan').click();
  const goresKuas = await tungguSampai(() => { const g = ambilGoresan(); return g && g.goresan.length ? g : null; }, 4000);
  cek('A3 simpan: goresan kuas tersimpan dengan gaya "kuas", warna biru, ukuran 10',
    !!goresKuas && goresKuas.goresan[0].gaya === 'kuas' && goresKuas.goresan[0].warna === '#2563eb' && goresKuas.goresan[0].ukuran === 10);

  bukaStudioSketsa();
  klik('[data-sk-alat="garis"]');
  klik('[data-sk-preset="bawaan-pensil"]');
  klik('[data-sk-alat="garis"]');
  pasangRect();
  goresSatu(200, 200, 260, 240);
  document.getElementById('sk-simpan').click();
  const goresGaris = await tungguSampai(() => { const g = ambilGoresan(); return g && g.goresan.some(x => x.alat === 'garis') ? g : null; }, 4000);
  const garis = goresGaris ? goresGaris.goresan.find(x => x.alat === 'garis') : null;
  cek('A3 batas: alat Garis tidak ikut gaya preset (tersimpan sebagai tinta)', !!garis && garis.gaya === 'tinta');

  bukaStudioSketsa();
  klik('[data-sk-uk="8"]');
  klik('[data-sk-warna="#059669"]');
  cek('A3 kustom: sebelum disimpan, tombol Hapus preset masih nonaktif', document.querySelector('#sk-preset-hapus').disabled === true);
  klik('#sk-preset-simpan');
  cek('A3 kustom: preset baru muncul di baris (4 tombol) dan ditandai aktif',
    jumlahPreset() === 4 && document.querySelector('[data-sk-preset^="kustom-"]').classList.contains('on'));
  cek('A3 kustom: preset tersimpan di localStorage dengan nama "Gaya 1"',
    JSON.parse(localStorage.getItem(KUNCI_PRESET)).length === 1 && JSON.parse(localStorage.getItem(KUNCI_PRESET))[0].nama === 'Gaya 1');
  cek('A3 kustom: tombol Hapus preset aktif untuk preset kustom yang dipilih', document.querySelector('#sk-preset-hapus').disabled === false);
  klik('#sk-preset-simpan');
  cek('A3 kustom: menyimpan kombinasi yang sama lagi tidak menambah preset', jumlahPreset() === 4);

  klik('[data-sk-preset="bawaan-tinta"]');
  klik('#sk-preset-hapus');
  cek('A3 hapus: hapus pada preset bawaan dicegah (tombol nonaktif, jumlah tetap)',
    jumlahPreset() === 4 && document.querySelector('#sk-preset-hapus').disabled === true);
  klik('[data-sk-preset^="kustom-"]');
  klik('#sk-preset-hapus');
  cek('A3 hapus: preset kustom terhapus (kembali 3 tombol) dan penyimpanan kosong',
    jumlahPreset() === 3 && JSON.parse(localStorage.getItem(KUNCI_PRESET)).length === 0);
  document.getElementById('sk-batal').click();
}

console.log(`\nTotal: ${lulus + gagal} pengujian · Lulus: ${lulus} · Gagal: ${gagal}`);
if (gagal > 0) process.exit(1);
process.exit(0);
