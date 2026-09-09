/* Suite Bagian D — kunci catatan (D19), unduh cadangan (D20), sapuan
   baris daftar (D21). Menjalankan aplikasi sungguhan di jsdom dan
   menguji perilaku lewat DOM + fungsi modul, dengan pola yang sama
   seperti suite lain (load docs/index.html, import app.js). */

import { JSDOM } from 'jsdom';
import fs from 'fs';
import { indexedDB as fakeIDB } from 'fake-indexeddb';
import path from 'path';
import { fileURLToPath } from 'url';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const AKAR = process.cwd();

const dom = new JSDOM(fs.readFileSync('docs/index.html', 'utf8'),
  { url: 'https://x.test/', pretendToBeVisual: true });
const { window: w } = dom;
w.indexedDB = fakeIDB;
for (const k of ['document', 'getSelection', 'HTMLElement', 'Node', 'Range',
  'MouseEvent', 'KeyboardEvent', 'Event', 'InputEvent', 'localStorage', 'Image', 'NodeFilter'])
  if (w[k] !== undefined) globalThis[k] = w[k];
globalThis.window = w; globalThis.self = w; globalThis.indexedDB = w.indexedDB;
globalThis.addEventListener = w.addEventListener.bind(w);
Object.defineProperty(globalThis, 'navigator', { value: w.navigator, configurable: true });
w.URL.createObjectURL = () => 'blob:x/1'; w.URL.revokeObjectURL = () => {}; globalThis.URL = w.URL;

const V = fs.readFileSync('docs/app.js', 'utf8').match(/\?v=(\d+)/)[1];
const st = (...p) => import(`${AKAR}/docs/${p.join('/')}?v=${V}`);
await st('app.js');
const { state } = await st('core/store.js');
const router = await st('core/router.js');
const nmdl = await st('notes/note-model.js');
const { makeNote, makeBlock } = nmdl;
const model = await st('notes/model.js');
const kunci = await st('notes/kunci.js');
const { renderHasilCari } = await st('notes/views/misc.js');
const io = await st('notes/data-io.js');
const tags = await st('notes/tags.js');
const d = w.document;
const sleep = (ms = 20) => new Promise(r => setTimeout(r, ms));
let gagal = 0;
const oke = (nama, baik, det = '') => {
  if (!baik) { gagal++; console.log('FAIL', nama, det ? '\n      ' + det : ''); }
  else console.log('ok  ', nama);
};
const klik = el => { if (el) el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true, view: w })); };
const ketik = (el, v) => {
  if (!el) return;
  el.value = v;
  el.dispatchEvent(new w.Event('input', { bubbles: true }));
};
const bersihKunci = () => { try { w.localStorage.removeItem('hara.v1.kunci'); w.localStorage.removeItem('hara.v1.kunci.fp'); } catch (e) {} };
const salinPin = '4321';

state.notes.splice(0);
const kini = Date.now();
const mk = (id, judul, isi, ekstra = {}) => makeNote(Object.assign({
  id, title: judul, createdAt: kini - 1000, updatedAt: kini - 1000,
  blocks: [makeBlock({ type: 'paragraph', content: isi })],
}, ekstra));
state.notes.push(mk('d1', 'Daftar belanja', 'tomat dan cabai'));
state.notes.push(mk('d2', 'Buku pinjaman', 'judul rahasia tentang proyek'));
state.notes.push(mk('d3', 'Resep kue', 'gula 100 gram, mentega 50 gram'));
/* catatan lain yang berisi kata kunci sama utk membuktikan cari tetap jalan */
state.notes.push(mk('d4', 'Catatan proyek', 'proyek X selesai minggu depan'));

/* ════════════ D19 — kunci catatan (PIN per catatan) ════════════ */

/* 1) pasang kunci lewat menu ··· editor catatan d2 */
router.go('notes'); await sleep(30);
klik(d.querySelector('.row[data-open="d2"]')); await sleep(40);
klik(d.querySelector('#dots')); await sleep(20);
oke('D19a menu ··· memuat entri Kunci catatan',
  !!d.querySelector('[data-note-act="kunci"]'));
klik(d.querySelector('[data-note-act="kunci"]')); await sleep(40);
oke('D19b panel kunci terbuka (dua kolom PIN)',
  !!d.querySelector('#pop #pp1') && !!d.querySelector('#pop #pp2'));
klik(d.querySelector('[data-pin-simpan]')); await sleep(20);
oke('D19c PIN kosong ditolak dengan pesan',
  !kunci.punyaKunci(state.notes.find(x => x.id === 'd2')) &&
  /digit/.test((d.querySelector('[data-pin-err]') || {}).textContent || ''));
ketik(d.querySelector('#pp1'), '12a4'); await sleep(10);
ketik(d.querySelector('#pp2'), '1245'); await sleep(10);
klik(d.querySelector('[data-pin-simpan]')); await sleep(20);
oke('D19d PIN bukan digit / tidak sama ditolak',
  !kunci.punyaKunci(state.notes.find(x => x.id === 'd2')));
ketik(d.querySelector('#pp1'), salinPin);
ketik(d.querySelector('#pp2'), salinPin);
klik(d.querySelector('[data-pin-simpan]')); await sleep(60);
const n2 = state.notes.find(x => x.id === 'd2');
oke('D19e PIN valid → kunci terpasang & sesi langsung terbuka',
  kunci.punyaKunci(n2) && kunci.terbukaSesi('d2'));

/* 2) terkunci aktif (simulasi muat ulang: tutup sesi): daftar buta,
   klik → layar kunci tanpa isi */
kunci.resetSesi();
router.go('notes'); await sleep(30);
const barisD2 = d.querySelector('.row[data-open="d2"]');
const teksBaris = barisD2 ? barisD2.textContent : '';
oke('D19f baris catatan terkunci tampil buta (tanpa judul/cuplikan asli)',
  !!barisD2 && !teksBaris.includes('Buku pinjaman') &&
  !teksBaris.includes('judul rahasia') && teksBaris.includes('Catatan terkunci'),
  teksBaris);
oke('D19g baris terkunci tidak memuat thumbnail',
  !barisD2.querySelector('.row-th'));
klik(barisD2); await sleep(40);
oke('D19h klik baris terkunci → layar kunci, isi tidak dirender',
  router.cur === 'kunci' && !!d.querySelector('.lk-kartu') &&
  !d.querySelector('.ed-doc') && !d.body.textContent.includes('judul rahasia'));
oke('D19i tombol Kembali tampil di layar kunci',
  d.getElementById('back').style.display !== 'none');
/* PIN salah → tetap terkunci */
ketik(d.querySelector('[data-lk-in]'), '0000'); await sleep(10);
klik(d.querySelector('[data-lk-buka]')); await sleep(60);
oke('D19j PIN salah: tetap di layar kunci + pesan salah',
  router.cur === 'kunci' && !d.querySelector('[data-lk-salah]').hidden,
  router.cur);
/* PIN benar → editor terbuka */
ketik(d.querySelector('[data-lk-in]'), salinPin); await sleep(10);
klik(d.querySelector('[data-lk-buka]')); await sleep(80);
oke('D19k PIN benar → editor dibuka dengan isi asli',
  router.cur === 'editor' && !!d.querySelector('.ed-doc') &&
  d.body.textContent.includes('judul rahasia'), router.cur);

/* 3) daftar kembali normal setelah sesi terbuka */
router.go('notes'); await sleep(30);
const barisD2b = d.querySelector('.row[data-open="d2"]');
oke('D19l baris catatan kembali normal setelah dibuka di sesi ini',
  !!barisD2b && barisD2b.textContent.includes('Buku pinjaman') &&
  !barisD2b.textContent.includes('Catatan terkunci'));

/* 4) agregasi publik tidak membocorkan catatan terkunci yang belum dibuka:
   pasang kunci kedua (d3) lewat API langsung, lalu cek cari/tag/ekspor */
await kunci.pasangKunci('d3', '9999');
state.notes.find(x => x.id === 'd3').tags = ['pribadi'];
router.go('notes'); await sleep(30);
const teksD3 = d.querySelector('.row[data-open="d3"]').textContent;
oke('D19m baris d3 (kunci via API) buta di daftar',
  teksD3.includes('Catatan terkunci') && !teksD3.includes('Resep kue'));
router.go('search'); await sleep(30);
renderHasilCari('gula');
await sleep(30);
const hasilCari = d.querySelector('#cari-hasil') ?
  d.querySelector('#cari-hasil').textContent : '';
oke('D19n cari tidak memuat catatan terkunci yang belum dibuka',
  hasilCari.includes('Tidak ada yang cocok'), hasilCari);
renderHasilCari('proyek');
await sleep(30);
const hasilProyek = d.querySelector('#cari-hasil').textContent;
oke('D19o cari masih menemukan catatan lain',
  hasilProyek.includes('Catatan proyek') && !hasilProyek.includes('Catatan terkunci'),
  hasilProyek);
renderHasilCari('');   /* tutup hasil cari */
router.go('notes'); await sleep(20);
const semuaTag = tags.semuaTag();
oke('D19p agregat tag tidak memuat tag catatan terkunci yang belum dibuka',
  !semuaTag.some(t => t.nama === 'pribadi'), JSON.stringify(semuaTag));
const ekspor = io.eksporSemuaMarkdown();
oke('D19q ekspor Markdown semua tidak memuat catatan terkunci yang belum dibuka',
  ekspor.entri.length === 3 &&
  !ekspor.entri.some(x => x.nama.startsWith('Resep kue')), ekspor.nama);
const cad = await io.cadanganJson();
oke('D19r cadangan JSON utuh tapi tidak memuat PIN/hash kunci',
  cad.teks.includes('Resep kue') && cad.teks.includes('Buku pinjaman') &&
  !/hara\.v1\.kunci|"s":\s*"[0-9a-f]{16}|kunciPin/.test(cad.teks));

/* 5) kelola lewat menu ···: ganti PIN perlu verifikasi; lepas kunci */
router.go('notes'); await sleep(20);
klik(d.querySelector('.row[data-open="d2"]')); await sleep(40);   /* sesi terbuka */
klik(d.querySelector('#dots')); await sleep(20);
const entriKelola = Array.from(d.querySelectorAll('[data-note-act="kunci"]'))[0];
oke('D19s label menu jadi Ganti/buka kunci saat sudah terkunci',
  /Ganti \/ buka kunci/.test(entriKelola.textContent));
klik(entriKelola); await sleep(30);
klik(d.querySelector('[data-kk-ganti]')); await sleep(30);
oke('D19t ganti PIN butuh verifikasi PIN saat ini',
  !!d.querySelector('#pop #pv'));
ketik(d.querySelector('#pv'), '0000'); await sleep(10);
klik(d.querySelector('[data-pv-ok]')); await sleep(40);
oke('D19u verifikasi PIN salah ditolak',
  kunci.punyaKunci(state.notes.find(x => x.id === 'd2')) &&
  /PIN salah/.test((d.querySelector('[data-pin-err]') || {}).textContent || ''));
ketik(d.querySelector('#pv'), salinPin); await sleep(10);
klik(d.querySelector('[data-pv-ok]')); await sleep(40);
oke('D19v verifikasi benar → formulir PIN baru',
  !!d.querySelector('#pop #pg1'));
ketik(d.querySelector('#pg1'), '7788'); await sleep(10);
ketik(d.querySelector('#pg2'), '7788'); await sleep(10);
klik(d.querySelector('[data-pg-simpan]')); await sleep(60);
oke('D19w PIN baru tersimpan: lama tak cocok, baru cocok',
  !(await kunci.cocokPin('d2', salinPin)) && (await kunci.cocokPin('d2', '7788')));

/* lepas kunci lewat verifikasi sidik jari yang di-stub */
const fpPanggilan = [];
const stubFp = {
  create: async o => {
    fpPanggilan.push(o.publicKey.authenticatorSelection || {});
    return { rawId: new Uint8Array([7, 8, 9]) };
  },
  get: async o => { fpPanggilan.push('get'); return {}; },
};
Object.defineProperty(w, 'PublicKeyCredential', { value: class PublicKeyCredential {}, configurable: true });
Object.defineProperty(w.navigator, 'credentials', { value: stubFp, configurable: true });
oke('D19x sidik jari perangkat terdeteksi di konteks aman',
  kunci.sidikDidukung());
/* registrasi credential (normalnya terjadi saat PIN dipasang) */
const terdaftar = await kunci.daftarSidik('d2');
oke('D19x2 registrasi credential sidik jari berhasil',
  terdaftar && !!kunci.credTerdaftar('d2') &&
  (fpPanggilan[fpPanggilan.length - 1] || {}).authenticatorAttachment === 'platform');
klik(d.querySelector('#dots')); await sleep(20);
klik(d.querySelector('[data-note-act="kunci"]')); await sleep(30);
klik(d.querySelector('[data-kk-lepas]')); await sleep(30);
klik(d.querySelector('[data-pv-fp]')); await sleep(60);
oke('D19y buka kunci via sidik jari perangkat (verifikasi berhasil)',
  !kunci.punyaKunci(state.notes.find(x => x.id === 'd2')) &&
  fpPanggilan.includes('get'));
/* registrasi ulang: pasang PIN baru → create dipanggil dgn platform attachment */
klik(d.querySelector('#dots')); await sleep(20);
klik(d.querySelector('[data-note-act="kunci"]')); await sleep(30);
oke('D19z checkbox sidik jari ditawarkan saat perangkat mendukung',
  !!d.querySelector('#pop [data-fp-on]'));
ketik(d.querySelector('#pp1'), '1122');
ketik(d.querySelector('#pp2'), '1122');
klik(d.querySelector('[data-pin-simpan]')); await sleep(80);
const selAkhir = fpPanggilan[fpPanggilan.length - 1];
oke('D19aa registrasi sidik jari memakai authenticator platform',
  typeof selAkhir === 'object' && selAkhir.authenticatorAttachment === 'platform' &&
  selAkhir.userVerification === 'required', JSON.stringify(selAkhir));
oke('D19ab credential sidik jari tersimpan',
  !!kunci.credTerdaftar('d2') && kunci.punyaKunci(state.notes.find(x => x.id === 'd2')));

/* alur lupa PIN: layar kunci → sidik jari → PIN baru → editor terbuka */
kunci.lepasKunci('d2');
await kunci.pasangKunci('d2', '1122');
await kunci.daftarSidik('d2');   /* credential utk alur lupa PIN */
kunci.resetSesi();               /* muat ulang: PIN diminta lagi */
/* set ulang stub supaya get tercatat lagi */
const panggilan2 = [];
Object.defineProperty(w.navigator, 'credentials', {
  value: { create: async () => ({ rawId: new Uint8Array([1]) }), get: async () => { panggilan2.push('get'); return {}; } },
  configurable: true });
router.go('notes'); await sleep(30);
klik(d.querySelector('.row[data-open="d2"]')); await sleep(40);
oke('D19ac terkunci lagi → layar kunci',
  router.cur === 'kunci' && !!d.querySelector('[data-lk-lupa]'));
klik(d.querySelector('[data-lk-lupa]')); await sleep(60);
oke('D19ad lupa PIN: sidik jari diminta → formulir PIN baru',
  panggilan2.includes('get') && !!d.querySelector('#pop #pg1') &&
  d.querySelector('#pop').textContent.includes('Identitas perangkat sudah terverifikasi'));
ketik(d.querySelector('#pg1'), '4455'); await sleep(10);
ketik(d.querySelector('#pg2'), '4455'); await sleep(10);
klik(d.querySelector('[data-pg-simpan]')); await sleep(80);
oke('D19ae PIN baru dari alur lupa PIN → editor terbuka',
  router.cur === 'editor' && (await kunci.cocokPin('d2', '4455')) &&
  kunci.terbukaSesi('d2'));

/* sampah: catatan terkunci yang dihapus tampil buta di Sampah */
state.notes.find(x => x.id === 'd3').deletedAt = Date.now();
router.go('trash'); await sleep(30);
const barisTrashD3 = Array.from(d.querySelectorAll('[data-pulih]'))
  .find(b => b.dataset.pulih === 'd3');
const teksTrash = barisTrashD3 ? barisTrashD3.parentElement.textContent : '';
oke('D19af baris Sampah catatan terkunci tampil buta',
  !!barisTrashD3 && teksTrash.includes('Catatan terkunci') &&
  !teksTrash.includes('Resep kue'), teksTrash);
/* hapus permanen membersihkan kunci */
klik(d.querySelector('[data-putus="d3"]')); await sleep(10);
klik(d.querySelector('[data-putus="d3"]')); await sleep(40);
oke('D19ag hapus permanen membuang kunci catatan',
  !kunci.punyaKunci({ id: 'd3' }) && !state.notes.some(x => x.id === 'd3'));

/* ════════════ D20 — tombol Unduh cadangan di Pengaturan ════════════ */
router.go('set'); await sleep(30);
const btnUnduh = d.querySelector('[data-ekspor="json"]');
const barisUnduh = btnUnduh ? btnUnduh.closest('.row') : null;
oke('D20a tombol Unduh cadangan ada di Pengaturan (Data)',
  !!btnUnduh && /Unduh/i.test(btnUnduh.textContent) && !!barisUnduh,
  btnUnduh ? btnUnduh.outerHTML : '');
oke('D20b label baris jelas: "Unduh cadangan"',
  !!barisUnduh && /Unduh cadangan/.test(barisUnduh.querySelector('.row-t').textContent));
oke('D20c tombol memakai gaya utama (bukan sekunder)',
  !!btnUnduh && btnUnduh.classList.contains('btn-pri'));
/* klik tombol: cadangan dibuat (blob diunduh); di jsdom cukup tidak error
   dan nama berkas cadangan benar via cadanganJson langsung */
const sebelum = w.localStorage.getItem('hara.v1') || '';
const cad2 = await io.cadanganJson();
oke('D20d cadangan menyertakan semua catatan + gambar & format dikenal',
  cad2.nama.startsWith('hara-cadangan-') && cad2.teks.includes('"format":"hara-cadangan"') &&
  cad2.teks.includes('Daftar belanja') && !!cad2.teks.includes('"blobs"'));
/* tidak ada data yang hilang/berubah oleh alur */
oke('D20e data penyimpanan tidak berubah oleh pembuatan cadangan',
  (w.localStorage.getItem('hara.v1') || '') === sebelum);

/* ════════════ D21 — sapuan baris daftar ════════════ */
router.go('notes'); await sleep(30);
const srow = d.querySelector('.srow[data-srow="d1"]');
oke('D21a baris daftar utama dibungkus lapisan sapuan',
  !!srow && !!srow.querySelector('.srow-b .row[data-open="d1"]'));
oke('D21b tombol aksi Arsip & Hapus ada di belakang baris',
  !!srow.querySelector('[data-sw-ars="d1"]') &&
  !!srow.querySelector('[data-sw-del="d1"]'));
/* klik baris biasa tetap membuka catatan (tidak konflik dengan sapuan) */
klik(srow.querySelector('.row[data-open="d1"]')); await sleep(40);
oke('D21c klik baris biasa tetap membuka editor',
  router.cur === 'editor' && !!d.querySelector('.ed-doc'), router.cur);
router.go('notes'); await sleep(30);
/* arsip lewat tombol sapuan */
klik(d.querySelector('[data-sw-ars="d1"]')); await sleep(50);
const d1 = state.notes.find(x => x.id === 'd1');
oke('D21d aksi sapuan Arsip mengarsipkan catatan (tetap di daftar)',
  !!d1 && d1.archived === true && router.cur === 'notes');
oke('D21e catatan terarsip hilang dari daftar utama',
  !d.querySelector('.row[data-open="d1"]'));
/* layar arsip: tombol berubah jadi Kembalikan */
router.go('arsip'); await sleep(30);
const srowArs = d.querySelector('.srow[data-srow="d1"]');
oke('D21f baris arsip punya tombol Kembalikan & Hapus',
  !!srowArs && !!srowArs.querySelector('[data-sw-ars="d1"]') &&
  /Kembalikan/.test(srowArs.querySelector('[data-sw-ars="d1"]').textContent));
klik(srowArs.querySelector('[data-sw-ars="d1"]')); await sleep(50);
oke('D21g Kembalikan dari arsip lewat sapuan',
  state.notes.find(x => x.id === 'd1').archived === false && router.cur === 'arsip');
/* hapus lewat tombol sapuan = soft-delete ke sampah */
router.go('notes'); await sleep(30);
klik(d.querySelector('[data-sw-del="d4"]')); await sleep(50);
const d4 = state.notes.find(x => x.id === 'd4');
oke('D21h sapuan Hapus = soft-delete (deletedAt, bukan hilang)',
  !!d4 && !!d4.deletedAt && state.notes.some(x => x.id === 'd4'));
oke('D21i catatan yang dihapus hilang dari daftar utama',
  !d.querySelector('.row[data-open="d4"]'));
router.go('trash'); await sleep(30);
oke('D21j catatan hasil sapuan ada di Sampah & bisa dipulihkan',
  !!d.querySelector('[data-pulih="d4"]'));
klik(d.querySelector('[data-pulih="d4"]')); await sleep(40);
oke('D21k Pulihkan mengembalikan ke daftar (deletedAt kosong)',
  !state.notes.find(x => x.id === 'd4').deletedAt && router.cur === 'notes');
/* Urungkan (undo) dari toast setelah hapus lewat sapuan */
router.go('notes'); await sleep(30);
klik(d.querySelector('[data-sw-del="d4"]')); await sleep(40);
oke('D21n tombol Urungkan muncul di toast setelah sapuan hapus',
  !!d.querySelector('.toast-a') &&
  /Urungkan/.test(d.querySelector('.toast-a').textContent));
klik(d.querySelector('.toast-a')); await sleep(40);
const d4b = state.notes.find(x => x.id === 'd4');
oke('D21o Urungkan mengembalikan catatan dari sampah',
  !!d4b && !d4b.deletedAt && state.notes.some(x => x.id === 'd4'));
/* baris beranda polos (tanpa sapuan) */
router.go('home'); await sleep(30);
oke('D21l beranda memakai baris polos tanpa lapisan sapuan',
  !d.querySelector('.srow[data-srow="d1"]') &&
  !!d.querySelector('.row[data-open="d1"]'));
/* sampah tidak punya lapisan sapuan */
router.go('trash'); await sleep(20);
oke('D21m layar Sampah tidak memakai lapisan sapuan',
  !d.querySelector('.srow'));
/* beranda bersih */
router.go('home'); await sleep(20);

bersihKunci();
console.log(gagal ? `\n${gagal} GAGAL` : '\nSEMUA BAGIAN-D OK');
process.exit(gagal ? 1 : 0);
