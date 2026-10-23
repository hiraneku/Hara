/**
 * Pengujian Peta Master Bagian 5 — pencarian & struktur Catatan:
 *  1. Cari & Ganti teks dalam satu catatan (peka huruf, kata utuh,
 *     hitungan, judul + isi, rumus/lampiran tidak tersentuh, Urungkan).
 *  2. Saringan tersimpan (simpan, aktif, saring daftar, hitung, kelola).
 *  3. Kilas balik "hari ini di tahun-tahun lalu" + privasi PIN.
 *  4. Lipat bagian per heading di Mode Baca (isi model tidak berubah).
 *  5. Info catatan (kata, huruf, blok, to-do, gambar, lampiran, waktu baca).
 */

import { JSDOM } from 'jsdom';
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';

const mentahHtml = readFileSync('docs/index.html', 'utf8');
const V = (mentahHtml.match(/\?v=([0-9]+)/) || ['', ''])[1];
const qv = V ? `?v=${V}` : '';
const html = mentahHtml.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

const dom = new JSDOM(html, { url: 'https://hara.local/', pretendToBeVisual: true });

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
URL.createObjectURL = () => 'blob:uji-bagian5';
URL.revokeObjectURL = () => {};
globalThis.fetch = async () => ({ ok: false, status: 503 });

await import(`../../docs/app.js${qv}`);

const { state, save } = await import(`../../docs/core/store.js${qv}`);
const { makeNote, makeBlock, domToBlocks } = await import(`../../docs/notes/note-model.js${qv}`);
const { openNote } = await import(`../../docs/notes/model.js${qv}`);
const { setModeBaca } = await import(`../../docs/notes/mode-baca.js${qv}`);
const { pasangKunci, resetSesi } = await import(`../../docs/notes/kunci.js${qv}`);
const {
  gantiTeks, gantiDiBlocks, gantiSemuaDiCatatan, gantiDiEditor, urungkanGanti,
  bukaCariGanti,
} = await import(`../../docs/notes/cari-ganti.js${qv}`);
const {
  daftarSaringan, simpanSaringan, hapusSaringan, ubahNamaSaringan,
  setSaringanAktif, saringanAktif, saringCatatan, jumlahCocokSaringan,
  renderSaringanBarHtml,
} = await import(`../../docs/notes/saringan.js${qv}`);
const { catatanKilasBalik, renderKilasBalikHtml, bindKilasBalik } =
  await import(`../../docs/notes/kilas-balik.js${qv}`);
const { toggleLipatHeading, lipatSemua, bukaSemuaLipat, daftarLipat } =
  await import(`../../docs/notes/lipat-bagian.js${qv}`);
const { statistikCatatan, bukaInfoCatatan } = await import(`../../docs/notes/info-catatan.js${qv}`);
const { notesView } = await import(`../../docs/notes/views/list.js${qv}`);

const tunggu = ms => new Promise(r => setTimeout(r, ms));
let lulus = 0, gagal = 0;
function cek(nama, kondisi) {
  if (kondisi) { lulus++; console.log('  ✓', nama); }
  else { gagal++; console.error('  ✗ GAGAL:', nama); }
}

console.log('── Bagian 5 (#15–#19): Cari & Ganti, Saringan, Kilas Balik, Lipat, Info ──');

/* ════════ #15 Cari & Ganti ════════ */
{
  const hasilKata = gantiTeks('Kucing kucing KUCING', 'kucing', 'anjing', { caseSensitif: true });
  cek('#15 Peka huruf besar/kecil hanya mengganti yang persis sama',
    hasilKata.teks === 'Kucing anjing KUCING' && hasilKata.jumlah === 1);

  const hasilUtuh = gantiTeks('mengucing kucing kucingan', 'kucing', 'x', { kataUtuh: true });
  cek('#15 Kata utuh tidak menyentuh potongan kata di dalam kata lain',
    hasilUtuh.teks === 'mengucing x kucingan' && hasilUtuh.jumlah === 1);

  const blokUji = [makeBlock({ type: 'paragraph', content: 'halo <b>halo</b> halo' })];
  const rBlok = gantiDiBlocks(blokUji, 'halo', 'hai', {});
  cek('#15 Penggantian di blok mempertahankan format inline (<b>) dan menghitung semua',
    rBlok.jumlah === 3 && rBlok.blocks[0].content.includes('<b>hai</b>'));

  const nGanti = makeNote({
    title: 'Kucing Lucu',
    blocks: [
      makeBlock({ type: 'paragraph', content: 'Kucing <b>kucing</b> KUCING.' }),
      makeBlock({ type: 'math', meta: { expr: 'kucing' } }),
    ],
  });
  state.notes.unshift(nGanti);
  save();
  openNote(nGanti.id);
  setModeBaca(false);
  await tunggu(30);

  const rGanti = await gantiSemuaDiCatatan('kucing', 'anjing', {});
  const modelGanti = state.notes.find(x => x.id === nGanti.id);
  cek('#15 Ganti semua menyentuh judul + isi editor dan mengabaikan blok rumus',
    rGanti.jumlah === 4 &&
    modelGanti.title === 'anjing Lucu' &&
    modelGanti.blocks[0].content.includes('anjing') &&
    modelGanti.blocks[0].content.includes('<b>anjing</b>') &&
    modelGanti.blocks[1].meta.expr === 'kucing');

  await urungkanGanti(rGanti);
  const modelBalik = state.notes.find(x => x.id === nGanti.id);
  cek('#15 Urungkan mengembalikan judul & isi persis seperti sebelum penggantian',
    modelBalik.title === 'Kucing Lucu' &&
    document.querySelector('.ed-doc').textContent.includes('Kucing') &&
    !document.querySelector('.ed-doc').textContent.includes('anjing'));

  await bukaCariGanti(document.getElementById('dots'), 'kucing');
  const panelGanti = document.getElementById('pop');
  const wadahBmk = document.createElement('div');
  wadahBmk.innerHTML = '<div class="b-bmk" data-title="halo" data-desc="dunia">'
    + '<span class="bmk-title">halo</span><span class="bmk-desc">dunia</span>'
    + '<span class="bmk-host">contoh.id</span></div>';
  const nBmk = gantiDiEditor(wadahBmk, 'halo', 'hai', {});
  cek('#15 Teks kartu tautan ikut menyinkronkan atribut data-title tanpa menyentuh host',
    nBmk === 1 &&
    wadahBmk.querySelector('.b-bmk').getAttribute('data-title') === 'hai' &&
    wadahBmk.querySelector('.bmk-host').textContent === 'contoh.id');

  cek('#15 Panel Cari & Ganti muncul dengan kolom cari terisi & hitungan kecocokan',
    !!panelGanti.querySelector('#cg-cari') &&
    panelGanti.querySelector('#cg-cari').value === 'kucing' &&
    /4/.test(panelGanti.querySelector('#cg-hasil').textContent));
  document.querySelector('.pop-x')?.click();
}

/* ════════ #16 Saringan tersimpan ════════ */
{
  try { localStorage.removeItem('hara.saringan.v1'); } catch (e) { /* privat */ }
  setSaringanAktif(null);

  const nBelanja = makeNote({
    title: 'Belanja Bulan Ini',
    blocks: [makeBlock({ type: 'paragraph', content: '<span class="tg">#belanja</span> mingguan' })],
  });
  const nResep = makeNote({
    title: 'Resep Kue',
    blocks: [makeBlock({ type: 'paragraph', content: 'Tepung dan telur' })],
  });
  state.notes.unshift(nResep, nBelanja);
  save();

  const item = simpanSaringan('Belanja', 'tag:belanja');
  cek('#16 Saringan tersimpan dengan nama & kueri yang bisa dipakai ulang',
    !!item && daftarSaringan().length === 1 &&
    daftarSaringan()[0].nama === 'Belanja' &&
    daftarSaringan()[0].kueri === 'tag:belanja');

  setSaringanAktif(item.id);
  const hasilSaring = saringCatatan([nBelanja, nResep]);
  cek('#16 Saringan aktif menyaring daftar catatan sesuai kueri tag',
    saringanAktif()?.kueri === 'tag:belanja' &&
    hasilSaring.some(n => n.id === nBelanja.id) &&
    !hasilSaring.some(n => n.id === nResep.id));

  cek('#16 Hitungan & chip saringan tampil di layar Catatan',
    jumlahCocokSaringan('tag:belanja') === 1 &&
    renderSaringanBarHtml().includes('Belanja') &&
    renderSaringanBarHtml().includes('data-sf='));

  const htmlDaftar = notesView();
  cek('#16 Layar Catatan menampilkan chip saringan & hanya baris yang cocok',
    htmlDaftar.includes('class=\"sf-bar\"') &&
    htmlDaftar.includes('Belanja Bulan Ini') &&
    !htmlDaftar.includes('Resep Kue'));

  cek('#16 Nama saringan bisa diubah tanpa membuat duplikat',
    ubahNamaSaringan(item.id, 'Belanja Mingguan') &&
    daftarSaringan()[0].nama === 'Belanja Mingguan' &&
    daftarSaringan().length === 1);

  hapusSaringan(item.id);
  cek('#16 Saringan bisa dihapus & filter otomatis lepas',
    daftarSaringan().length === 0 && !saringanAktif() && renderSaringanBarHtml() === '');
}

/* ════════ #17 Kilas balik ════════ */
{
  const now = new Date();
  const tahunLalu = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), 12).getTime();
  const nLama = makeNote({
    title: 'Kenangan Setahun Lalu',
    createdAt: tahunLalu,
    updatedAt: tahunLalu,
    blocks: [makeBlock({ type: 'paragraph', content: 'Jalan pagi di tepi pantai' })],
  });
  const nArsip = makeNote({ title: 'Arsip Lama', archived: true, createdAt: tahunLalu, updatedAt: tahunLalu });
  const nRahasia = makeNote({ title: 'Kenangan Rahasia', createdAt: tahunLalu, updatedAt: tahunLalu });
  state.notes.unshift(nLama, nArsip, nRahasia);
  await pasangKunci(nRahasia.id, '2468');
  resetSesi(nRahasia.id);

  const hasil = catatanKilasBalik(state.notes, now);
  const htmlKilas = renderKilasBalikHtml(state.notes, now);
  cek('#17 Kilas balik hanya memuat catatan tanggal yang sama dari tahun sebelumnya',
    hasil.some(x => x.n.id === nLama.id) &&
    hasil.every(x => x.tahun === now.getFullYear() - 1) &&
    htmlKilas.includes('Kenangan Setahun Lalu') &&
    htmlKilas.includes(String(now.getFullYear() - 1)));

  cek('#17 Arsip & catatan terkunci PIN tidak bocor ke Kilas Balik',
    !hasil.some(x => x.n.id === nArsip.id || x.n.id === nRahasia.id) &&
    !htmlKilas.includes('Kenangan Rahasia') &&
    !htmlKilas.includes('Arsip Lama'));

  const wadah = document.getElementById('wrap');
  wadah.innerHTML = htmlKilas;
  wadah.querySelector('[data-kb-toggle]').click();
  const htmlCatatan = notesView();
  cek('#17 Kartu Kilas Balik ikut tampil di layar Catatan',
    htmlCatatan.includes('id=\"kilas-balik\"') && htmlCatatan.includes('Kenangan Setahun Lalu'));

  cek('#17 Tombol Kilas Balik bisa melipat kartu tanpa menghapus isinya',
    wadah.querySelector('#kilas-balik').classList.contains('lipat') &&
    wadah.querySelectorAll('.kb-row').length >= 1);
}

/* ════════ #18 Lipat bagian ════════ */
{
  const nLipat = makeNote({
    title: 'Catatan Panjang',
    blocks: [
      makeBlock({ type: 'heading', content: 'Bagian Satu', meta: { level: 1 } }),
      makeBlock({ type: 'paragraph', content: 'Isi bagian satu' }),
      makeBlock({ type: 'paragraph', content: 'Isi tambahan satu' }),
      makeBlock({ type: 'heading', content: 'Bagian Dua', meta: { level: 2 } }),
      makeBlock({ type: 'paragraph', content: 'Isi bagian dua' }),
      makeBlock({ type: 'heading', content: 'Bagian Tiga', meta: { level: 1 } }),
      makeBlock({ type: 'paragraph', content: 'Isi bagian tiga' }),
    ],
  });
  state.notes.unshift(nLipat);
  save();
  openNote(nLipat.id);
  setModeBaca(true);
  await tunggu(30);

  const h1 = document.querySelector('.ed-doc .b-h1');
  const dibuka = toggleLipatHeading(h1);
  const jumlahTersembunyi = document.querySelectorAll('.ed-doc .blk-terlipat').length;
  const modelLipat = state.notes.find(x => x.id === nLipat.id);
  cek('#18 Lipat bagian menyembunyikan blok sesudah heading sampai heading berikutnya',
    dibuka === true && jumlahTersembunyi === 4 && h1.classList.contains('blk-lipat'));

  cek('#18 Lipatan tidak mengubah isi model catatan (blocks tetap utuh)',
    modelLipat.blocks.length === 7 &&
    domToBlocks(document.querySelector('.ed-doc')).length === 7 &&
    daftarLipat(nLipat.id).length === 1);

  const jmlSemua = lipatSemua();
  cek('#18 Lipat semua melipat setiap heading yang punya blok isi',
    jmlSemua === 3 && document.querySelectorAll('.ed-doc .blk-terlipat').length >= 3);

  bukaSemuaLipat();
  cek('#18 Buka semua mengembalikan seluruh blok tanpa mengubah urutan',
    document.querySelectorAll('.ed-doc .blk-terlipat').length === 0 &&
    document.querySelectorAll('.ed-doc .blk-lipat').length === 0 &&
    daftarLipat(nLipat.id).length === 0);
  setModeBaca(false);
}

/* ════════ #19 Info catatan ════════ */
{
  const nInfo = makeNote({
    title: 'Info Uji',
    blocks: [
      makeBlock({ type: 'paragraph', content: 'satu dua tiga' }),
      makeBlock({ type: 'todo', content: 'selesai', meta: { checked: true } }),
      makeBlock({ type: 'image', meta: { blobId: 'b1' } }),
      makeBlock({ type: 'file', meta: { blobId: 'b2', name: 'tiket.pdf' } }),
    ],
  });
  state.notes.unshift(nInfo);
  save();
  openNote(nInfo.id);
  await tunggu(30);

  const s = statistikCatatan(nInfo);
  cek('#19 Statistik catatan menghitung kata, blok, to-do selesai, gambar & lampiran',
    s.kata === 5 && s.blok === 4 && s.todo === 1 && s.selesai === 1 &&
    s.gambar === 1 && s.lampiran === 1 && s.menit === 1);

  bukaInfoCatatan(document.getElementById('dots'));
  const panelInfo = document.getElementById('pop');
  cek('#19 Panel Info catatan menampilkan grid angka & tanggal yang terbaca',
    !!panelInfo.querySelector('.info-grid') &&
    panelInfo.innerHTML.includes('Info catatan') &&
    panelInfo.innerHTML.includes('Info Uji') &&
    panelInfo.querySelectorAll('.info-item').length === 8);
  document.querySelector('.pop-x')?.click();
}

console.log(`\nTotal: ${lulus + gagal} pengujian · Lulus: ${lulus} · Gagal: ${gagal}`);
if (gagal > 0) process.exit(1);
process.exit(0);
