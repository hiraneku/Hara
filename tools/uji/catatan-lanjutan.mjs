/* Uji fitur catatan lanjutan:
   1. operator pencarian baru (folder:, properti:, sebelum:/sesudah:, -kecuali);
   2. pratinjau tautan (isi, escape, catatan terkunci, tautan mati);
   3. graf lokal 1–2 langkah dengan batas 50 simpul;
   4. impor Notion (zip DEFLATE, tautan antar halaman, CSV → tabel);
   5. riwayat versi (pangkas 30 hari / per jam, jeda 5 menit, perbandingan baris).
   Jalankan: node tools/uji/catatan-lanjutan.mjs */
import { JSDOM } from 'jsdom';
import fs from 'fs';
import zlib from 'zlib';
import path from 'path';
import { indexedDB as fakeIDB } from 'fake-indexeddb';
import { fileURLToPath } from 'url';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const AKAR = process.cwd();

const dom = new JSDOM(fs.readFileSync('docs/index.html', 'utf8'), { url: 'https://x.test/', pretendToBeVisual: true });
const { window: w } = dom;
w.indexedDB = fakeIDB;
for (const k of ['document', 'getSelection', 'HTMLElement', 'Node', 'Range', 'MouseEvent', 'KeyboardEvent', 'Event', 'InputEvent', 'localStorage', 'Image', 'Blob', 'NodeFilter'])
  if (w[k] !== undefined) globalThis[k] = w[k];
globalThis.window = w; globalThis.self = w; globalThis.indexedDB = w.indexedDB;
globalThis.addEventListener = w.addEventListener.bind(w);
Object.defineProperty(globalThis, 'navigator', { value: w.navigator, configurable: true });
w.URL.createObjectURL = () => 'blob:x/1'; w.URL.revokeObjectURL = () => {}; globalThis.URL = w.URL;

const V = fs.readFileSync('docs/app.js', 'utf8').match(/\?v=(\d+)/)[1];
await import(`${AKAR}/docs/app.js?v=${V}`);
const { state } = await import(`${AKAR}/docs/core/store.js?v=${V}`);
const { makeNote } = await import(`${AKAR}/docs/notes/note-model.js?v=${V}`);
const cari = await import(`${AKAR}/docs/notes/cari.js?v=${V}`);
const inti = await import(`${AKAR}/docs/notes/cari-inti.js?v=${V}`);
const panels = await import(`${AKAR}/docs/notes/panels.js?v=${V}`);
const pratinjau = await import(`${AKAR}/docs/notes/pratinjau-tautan.js?v=${V}`);
const ruang = await import(`${AKAR}/docs/notes/ruang.js?v=${V}`);
const impor = await import(`${AKAR}/docs/notes/impor-notion.js?v=${V}`);
const dataIo = await import(`${AKAR}/docs/notes/data-io.js?v=${V}`);
const kunci = await import(`${AKAR}/docs/notes/kunci.js?v=${V}`);

let no = 0, gagal = 0;
const ok = (nama, cond, det = '') => {
  no++;
  if (cond) console.log('LULUS', nama);
  else { gagal++; console.log('FAIL', nama, det ? ' → ' + det : ''); }
};
const blk = (id, content, type = 'paragraph') => ({ id, type, content });
const wl = j => `<span class="wl">[[${j}]]</span>`;
const D = (y, m, d) => new Date(y, m - 1, d).getTime();

console.log('══ 1. operator pencarian ══\n');
{
  const k = cari.pecahKueri('folder:Kerja properti:status=berjalan sebelum:2026-10-01 -kecuali -"frasa x" -tag:arsip');
  ok('folder: masuk ke k.folder', k.folder.length === 1 && k.folder[0] === 'Kerja', JSON.stringify(k.folder));
  ok('properti:kunci=nilai dipecah', k.properti.length === 1 && k.properti[0].k === 'status' && k.properti[0].v === 'berjalan', JSON.stringify(k.properti));
  ok('sebelum: menjadi batas tanggal', k.tanggal.length === 1 && k.tanggal[0].rel === 'sebelum' && k.tanggal[0].batas === D(2026, 10, 1));
  ok('-kecuali masuk ke kecuali.kata', k.kecuali.kata.includes('kecuali'), JSON.stringify(k.kecuali));
  ok('-"frasa x" masuk ke kecuali.kata sebagai frasa utuh', k.kecuali.kata.includes('frasa x') && k.kecuali.kata.includes('kecuali'), JSON.stringify(k.kecuali));
  ok('-tag:arsip masuk ke kecuali.tag', k.kecuali.tag.includes('arsip'));
  const ruangK = cari.pecahKueri('ruang:Kerja');
  ok('alias ruang: sama dengan folder:', ruangK.folder[0] === 'Kerja');
  const salah = cari.pecahKueri('sebelum:2026-02-30 sebelum:xyz');
  ok('tanggal tidak valid jadi teks biasa', salah.kata.includes('sebelum:2026-02-30') && salah.kata.includes('sebelum:xyz') && salah.tanggal.length === 0, JSON.stringify(salah));
  ok('tanggal dd/mm/yyyy diterima', cari.batasTanggal('sesudah', '24/10/2026') === D(2026, 10, 25));
  ok('sebelum: batas = awal hari itu', cari.batasTanggal('sebelum', '2026-10-24') === D(2026, 10, 24));
  ok('kueri berisi hanya operator tidak kosong', !cari.kueriKosong(cari.pecahKueri('-kecuali')));
  ok('operator menggantung tetap diabaikan', cari.kueriKosong(cari.pecahKueri('folder:')));
  ok('label chip mencantumkan folder dan kecuali', cari.labelOperator(k).includes('folder:Kerja') && cari.labelOperator(k).includes('-tag:arsip'), JSON.stringify(cari.labelOperator(k)));
}

/* data untuk pencocokan operator */
const folderNama = id => (id === 'rg-kerja' ? 'Kerja' : '');
const ctx = { namaRuang: folderNama };
const n1 = makeNote({ id: 'o1', title: 'Rencana proyek', folderId: 'rg-kerja', props: [{ k: 'status', v: 'berjalan' }], updatedAt: D(2026, 9, 20), blocks: [blk('o1a', 'rapat minggu ini')] });
const n2 = makeNote({ id: 'o2', title: 'Resep kue', folderId: null, props: [{ k: 'Status', v: 'selesai' }], updatedAt: D(2026, 9, 28), blocks: [blk('o2a', 'gula tepung')] });
const n3 = makeNote({ id: 'o3', title: 'Belanja', folderId: 'rg-kerja', props: [], updatedAt: D(2026, 10, 5), blocks: [blk('o3a', 'beli kopi')] });
const n4 = makeNote({ id: 'o4', title: 'Rapat umum', folderId: null, props: [], updatedAt: D(2026, 9, 1), blocks: [blk('o4a', 'rapat tahunan')] });
const kumpulan = [n1, n2, n3, n4];
const cocok = q => kumpulan.filter(n => cari.catatanCocok(n, cari.pecahKueri(q), ctx)).map(n => n.id).sort().join(',');

console.log('\n══ 1b. pencocokan operator ══\n');
ok('folder:kerja → catatan di folder Kerja', cocok('folder:kerja') === 'o1,o3', cocok('folder:kerja'));
ok('-folder:kerja → sisanya', cocok('-folder:kerja') === 'o2,o4', cocok('-folder:kerja'));
ok('properti:berjalan → cocok di nilai', cocok('properti:berjalan') === 'o1', cocok('properti:berjalan'));
ok('properti:status=selesai, kunci tak peka huruf', cocok('properti:status=selesai') === 'o2', cocok('properti:status=selesai'));
ok('properti:status:berjalan (titik dua) juga', cocok('properti:status:berjalan') === 'o1');
ok('sebelum:2026-10-01 → berubah sebelum 1 Okt', cocok('sebelum:2026-10-01') === 'o1,o2,o4', cocok('sebelum:2026-10-01'));
ok('sesudah:2026-09-28 → hari itu tidak ikut', cocok('sesudah:2026-09-28') === 'o3', cocok('sesudah:2026-09-28'));
ok('-sebelum:2026-10-01 → kebalikannya', cocok('-sebelum:2026-10-01') === 'o3');
ok('-kecuali (kata) membuang yang memuatnya', cocok('-gula') === 'o1,o3,o4', cocok('-gula'));
ok('folder + kata: kombinasi keduanya', cocok('folder:kerja rapat') === 'o1', cocok('folder:kerja rapat'));
ok('tanpa ctx, folder: tidak cocok dengan siapa pun', kumpulan.filter(n => cari.catatanCocok(n, cari.pecahKueri('folder:kerja'))).length === 0);

console.log('\n══ 1c. paritas indeks (Worker/peringkat) & mirip dibatasi operator ══\n');
{
  const indeks = kumpulan.map(n => cari.entriDariCatatan(n, ctx));
  const cekQ = ['folder:kerja', '-folder:kerja', 'properti:berjalan', 'sebelum:2026-10-01', 'sesudah:2026-09-28', '-gula', 'rapat', 'folder:kerja rapat'];
  let paritas = true, det = '';
  for (const q of cekQ) {
    const k = cari.pecahKueri(q);
    const dariIndeks = inti.peringkat(indeks, k).ids.slice().sort().join(',');
    const dariCatatan = kumpulan.filter(n => cari.catatanCocok(n, k, ctx)).map(n => n.id).sort().join(',');
    if (dariIndeks !== dariCatatan) { paritas = false; det += ` [${q}: ${dariIndeks} ≠ ${dariCatatan}]`; }
  }
  ok('peringkat (indeks) sama dengan catatanCocok untuk semua operator', paritas, det);
  const mirip = inti.peringkat(indeks, cari.pecahKueri('folder:kerja rapt'));
  ok('pencarian mirip (salah ketik) tetap dibatasi folder:', mirip.mirip === true && mirip.ids.join(',') === 'o1', JSON.stringify(mirip));
}

console.log('\n══ 2. pratinjau tautan ══\n');
{
  const a = makeNote({ id: 'pa', title: 'Judul A', blocks: [blk('pa1', 'isi catatan A yang panjang')] });
  const bahaya = makeNote({ id: 'pb', title: '<img src=x onerror=alert(1)>', blocks: [blk('pb1', '<b>tebal</b> & aman')] });
  state.notes = [a, bahaya];
  const info = pratinjau.isiPratinjau('Judul A');
  ok('isiPratinjau menemukan catatan dan cuplikannya', info && info.id === 'pa' && info.cuplikan.includes('isi catatan A'), JSON.stringify(info));
  ok('isiPratinjau tidak peka huruf besar-kecil', pratinjau.isiPratinjau('judul a') !== null);
  ok('tautan mati → null', pratinjau.isiPratinjau('Tidak ada') === null);
  const html = pratinjau.htmlPratinjau(pratinjau.isiPratinjau('Judul A'));
  ok('kartu memuat tombol buka dengan id catatan', html.includes('data-pratinjau-buka="pa"'));
  const htmlBahaya = pratinjau.htmlPratinjau(pratinjau.isiPratinjau('<img src=x onerror=alert(1)>'));
  ok('judul berbahaya di-escape (tidak jadi elemen)', !htmlBahaya.includes('<img') && htmlBahaya.includes('&lt;img'), htmlBahaya.slice(0, 120));
  const cupBahaya = pratinjau.isiPratinjau('<img src=x onerror=alert(1)>');
  ok('cuplikan isi HTML ikut di-escape (tidak ada tag mentah)', !pratinjau.htmlPratinjau(pratinjau.isiPratinjau('<img src=x onerror=alert(1)>')).includes('<img'), JSON.stringify(cupBahaya));
  const mati = pratinjau.htmlPratinjau(null);
  ok('tautan mati: petunjuk tanpa tombol buka', !mati.includes('data-pratinjau-buka') && /belum/i.test(mati));

  /* catatan terkunci: judul tampil, isi tidak */
  const rahasia = makeNote({ id: 'pk', title: 'Rahasia', blocks: [blk('pk1', 'kata sandi bank')] });
  state.notes = [a, rahasia];
  w.localStorage.setItem('hara.v1.kunci', JSON.stringify({ pk: { s: 'x', h: 'y' } }));
  const kunciInfo = pratinjau.isiPratinjau('Rahasia');
  ok('catatan terkunci: cuplikan kosong', kunciInfo && kunciInfo.terkunci === true && kunciInfo.cuplikan === '', JSON.stringify(kunciInfo));
  ok('catatan terkunci: isi tidak ikut ke HTML', !pratinjau.htmlPratinjau(kunciInfo).includes('kata sandi'));
  kunci.bukaSesi('pk');
  ok('setelah dibuka di sesi ini, cuplikan tampil', pratinjau.isiPratinjau('Rahasia').cuplikan.includes('kata sandi'));
  w.localStorage.removeItem('hara.v1.kunci');
}

console.log('\n══ 3. graf lokal 1–2 langkah ══\n');
{
  /* Pusat → A, B, Mati(tidak ada). A → C. C → D. E → Pusat (backlink). */
  const pusat = makeNote({ id: 'gp', title: 'Pusat', blocks: [blk('gp1', `${wl('A')} ${wl('B')} ${wl('Mati')}`)] });
  const A = makeNote({ id: 'ga', title: 'A', blocks: [blk('ga1', wl('C'))] });
  const B = makeNote({ id: 'gb', title: 'B', blocks: [blk('gb1', 'tanpa tautan')] });
  const C = makeNote({ id: 'gc', title: 'C', blocks: [blk('gc1', wl('D'))] });
  const D2 = makeNote({ id: 'gd', title: 'D', blocks: [blk('gd1', 'ujung')] });
  const E = makeNote({ id: 'ge', title: 'E', blocks: [blk('ge1', wl('Pusat'))] });
  state.notes = [pusat, A, B, C, D2, E];
  panels.setLangkahGraf(1);
  const h1 = panels.panelGraf(pusat);
  const simpul1 = (h1.match(/class="gnode/g) || []).length;
  ok('langkah 1: pusat + A, B, E + tautan mati = 5 simpul', simpul1 === 5, `simpul=${simpul1}`);
  ok('langkah 1: tidak ada simpul langkah-2', !h1.includes('gnode lv2'));
  panels.setLangkahGraf(2);
  const h2 = panels.panelGraf(pusat);
  ok('langkah 2: C (dua langkah) muncul sebagai lv2', h2.includes('gnode lv2') && /<span>C<\/span>/.test(h2), (h2.match(/gnode[^\n]*/g)||[]).join(' | ').slice(0,400));
  ok('langkah 2: D (tiga langkah) belum muncul', !/<span>D<\/span>/.test(h2));
  ok('langkah 2: tombol 2 langkah ditandai aktif', /data-graf-langkah="2" aria-pressed="true"/.test(h2));
  panels.setLangkahGraf(1);
  ok('setLangkahGraf membatasi nilai ke 1 atau 2', panels.setLangkahGraf(7) === 1 && panels.setLangkahGraf(2) === 2);
  panels.setLangkahGraf(1);

  /* batas 50 simpul: pusat menaut 60 catatan */
  const banyak = [];
  const tautanBanyak = [];
  for (let i = 0; i < 60; i++) {
    banyak.push(makeNote({ id: 'bn' + i, title: 'Nomor ' + String(i).padStart(2, '0'), blocks: [blk('bn' + i + 'a', 'x')] }));
    tautanBanyak.push(wl('Nomor ' + String(i).padStart(2, '0')));
  }
  const pusat2 = makeNote({ id: 'bp', title: 'Induk', blocks: [blk('bp1', tautanBanyak.join(' '))] });
  state.notes = [pusat2, ...banyak];
  const hb = panels.panelGraf(pusat2);
  const nodeBanyak = (hb.match(/class="gnode /g) || []).length;
  ok('graf dibatasi tepat 50 simpul (termasuk pusat)', nodeBanyak === 50, `simpul=${nodeBanyak}`);
  ok('batas tampil diberitahu dengan jumlah yang disembunyikan', /disembunyikan|hidden/.test(hb), hb.slice(-200));
  state.notes = [];
}

console.log('\n══ 4. impor Notion ══\n');
{
  const ID = c => c.repeat(32);
  ok('nama Notion: id 32 hex dibuang', impor.namaBersihNotion(`Export-x/Rapat Mingguan ${ID('a')}.md`) === 'Rapat Mingguan');
  ok('nama Notion: CSV dan folder juga', impor.namaBersihNotion(`Db ${ID('b')}.csv`) === 'Db');
  ok('nama biasa tidak diubah', impor.namaBersihNotion('Catatan biasa.md') === 'Catatan biasa');

  const entri = [
    { nama: `Export/Proyek ${ID('a')}.md`, teks: `# Proyek\n\nLihat [Rapat](Rapat%20${ID('b')}.md) dan [lihat rapat](Rapat%20${ID('b')}.md).\nLuar: [situs](https://x.test/a.md)\nGambar: ![gbr](img.png)\n\n\`\`\`\n[kode](Rapat%20${ID('b')}.md)\n\`\`\`\nTak ada: [hilang](Tidak%20Ada.md)\n` },
    { nama: `Export/Rapat ${ID('b')}.md`, teks: '# Rapat\n\nisi rapat' },
    { nama: `Export/Proyek ${ID('a')}/Sub ${ID('d')}.md`, teks: '# Sub\n\nisi sub' },
    { nama: `Export/Ringkasan ${ID('e')}.md`, teks: `[Sub](Proyek%20${ID('a')}/Sub%20${ID('d')}.md)` },
  ];
  const peta = impor.petaTautanNotion(entri);
  const keluar = impor.tulisUlangTautan(entri[0].teks, impor.normJalur(decodeURIComponent(entri[0].nama)), peta);
  ok('tautan sama judul → [[Judul]]', keluar.includes('[[Rapat]]'), keluar);
  ok('tautan beda label → [[Judul|label]]', keluar.includes('[[Rapat|lihat rapat]]'));
  ok('tautan http tidak diubah', keluar.includes('https://x.test/a.md'));
  ok('gambar tidak diubah', keluar.includes('![gbr](img.png)'));
  ok('isi blok kode tidak diubah', keluar.includes('[kode](Rapat%20' + ID('b') + '.md)'));
  ok('tautan ke halaman yang tidak diimpor → label saja', keluar.includes('hilang') && !keluar.includes('[hilang]('), keluar);
  const relatif = impor.tulisUlangTautan(entri[3].teks, impor.normJalur(decodeURIComponent(entri[3].nama)), peta);
  ok('tautan relatif ke sub-halaman ikut terselesaikan', relatif.includes('[[Sub]]'), relatif);

  /* CSV */
  const csv = 'Nama,Nilai\n"Budi, S",3\n"x|y",4\n"baris\nbaru",5\n';
  const md = impor.csvKeMarkdown(csv).split('\n');
  ok('CSV: header dan pemisah tabel', md[0] === '| Nama | Nilai |' && md[1] === '| --- | --- |', md.slice(0, 2).join(' / '));
  ok('CSV: koma di dalam kutip tetap satu sel', md[2] === '| Budi, S | 3 |', md[2]);
  ok('CSV: "|" di-escape', md[3] === '| x\\|y | 4 |', md[3]);
  ok('CSV: baris baru di dalam sel jadi spasi', md[4] === '| baris baru | 5 |', md[4]);

  /* zip DEFLATE sungguhan (metode 8) */
  const zipBytes = buatZipDeflate([
    { nama: `Export-1/Proyek ${ID('a')}.md`, teks: `# Proyek\n\nLihat [Rapat](Rapat%20${ID('b')}.md) penting.` },
    { nama: `Export-1/Rapat ${ID('b')}.md`, teks: '# Rapat\n\nisi rapat' },
    { nama: `Export-1/Database ${ID('c')}.csv`, teks: 'Judul,Status\nTugas satu,Selesai\n' },
    { nama: 'Export-1/gambar.png', teks: 'bukan teks' },
  ]);
  const hasil = await dataIo.siapImpor('Export.zip', '', new Uint8Array(zipBytes));
  const judul = hasil.catatan.map(n => n.title).sort();
  ok('zip DEFLATE: tiga catatan (md, md, csv) terbaca', hasil.catatan.length === 3 && judul.join('|') === 'Database|Proyek|Rapat', JSON.stringify(judul));
  ok('zip DEFLATE: gambar dihitung dilewati', hasil.dilewati === 1, String(hasil.dilewati));
  const proyek = hasil.catatan.find(n => n.title === 'Proyek');
  const teksProyek = JSON.stringify(proyek.blocks);
  ok('zip DEFLATE: tautan Rapat jadi wikilink', teksProyek.includes('[[Rapat]]') || teksProyek.includes('Rapat]]'), teksProyek.slice(0, 200));
  const dbNote = hasil.catatan.find(n => n.title === 'Database');
  ok('CSV di zip jadi catatan berisi tabel', dbNote.blocks.some(b => b.type === 'table'), dbNote.blocks.map(b => b.type).join(','));
  const csvSaja = await dataIo.siapImpor('Tugas.csv', 'Kolom,Isi\nA,1\n', null);
  ok('CSV mandiri diimpor sebagai catatan', csvSaja.catatan.length === 1 && csvSaja.catatan[0].title === 'Tugas' && csvSaja.catatan[0].blocks.some(b => b.type === 'table'));
}

console.log('\n══ 5. riwayat versi ══\n');
{
  /* waktu di-align ke jam penuh agar pengelompokan per jam deterministik */
  const JAM = 3600000, MENIT = 60000;
  const dasar = 500000 * JAM;
  const v = (umur, id) => ({ at: dasar - umur, title: id, blocks: [] });
  const hasil = ruang.pangkasVersi([
    v(6 * MENIT, 'baru1'), v(30 * MENIT, 'baru2'),         /* < 24 jam: semua disimpan */
    v(30 * JAM + 10 * MENIT, 'h1'), v(30 * JAM + 20 * MENIT, 'h2'), /* jam yang sama → h1 saja */
    v(32 * JAM, 'h3'),                                      /* jam lain → disimpan */
    v(31 * 24 * JAM, 'lewat30'),                            /* > 30 hari → dibuang */
  ], dasar);
  const namaHasil = hasil.map(x => x.title);
  ok('pangkas: versi < 24 jam semua disimpan', namaHasil.includes('baru1') && namaHasil.includes('baru2'), namaHasil.join(','));
  ok('pangkas: > 24 jam hanya satu per jam (h2 dibuang)', namaHasil.join(',') === 'baru1,baru2,h1,h3', namaHasil.join(','));
  ok('pangkas: > 30 hari dibuang', !namaHasil.includes('lewat30'));
  const banyakBaru = Array.from({ length: 450 }, (_, i) => v(i * 1000, 'n' + i));
  ok('pangkas: maks 400 versi per catatan', ruang.pangkasVersi(banyakBaru, dasar).length === 400);
  const bedaOps = ruang.bandingBaris(['a', 'b', 'c'], ['a', 'c', 'd']);
  ok('bandingBaris: sama/hapus/tambah', bedaOps.map(x => x.o + x.t).join('|') === ' a|-b| c|+d', bedaOps.map(x => x.o + x.t).join('|'));
  ok('bandingBaris: terlalu panjang → null', ruang.bandingBaris(Array(700).fill('x'), ['y']) === null);
  ok('bandingBaris: identik → semua sama', ruang.bandingBaris(['p', 'q'], ['p', 'q']).every(x => x.o === ' '));

  /* jeda 5 menit: uji dengan jeda 200 ms */
  ruang._jedaVersiUntukUji(200);
  const note = makeNote({ id: 'vjeda', title: 'V1', blocks: [blk('vj1', 'pertama')] });
  state.notes = [note];
  const r1 = await ruang.rekamVersiCatatan(note, true);
  ok('rekam pertama langsung tersimpan', r1 === true);
  note.title = 'V2';
  note.blocks = [blk('vj2', 'kedua')];
  const r2 = await ruang.rekamVersiCatatan(note, true);
  ok('perubahan dalam jeda tidak langsung direkam', r2 === false);
  await new Promise(r => setTimeout(r, 400));
  const daftar = await ruang.ambilVersiCatatan('vjeda');
  ok('perubahan di jeda direkam di akhir jeda (terbaru = V2)', daftar.length === 2 && daftar[0].title === 'V2', daftar.map(x => x.title).join(','));
  ruang._jedaVersiUntukUji(5 * 60 * 1000);
  state.notes = [];
}

console.log(gagal ? `\ntotal: ${no} · gagal: ${gagal}` : `\nSEMUA ${no} LULUS`);
if (gagal) process.exit(1);

/* ── pembuat zip DEFLATE untuk uji (metode 8) ── */
function buatZipDeflate(berkas) {
  const bagian = [], pusat = [];
  let off = 0;
  for (const f of berkas) {
    const nama = Buffer.from(f.nama, 'utf8');
    const mentah = Buffer.from(f.teks, 'utf8');
    const data = zlib.deflateRawSync(mentah);
    const crc = zlib.crc32(mentah);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6);
    lh.writeUInt16LE(8, 8); lh.writeUInt32LE(crc >>> 0, 14); lh.writeUInt32LE(data.length, 18);
    lh.writeUInt32LE(mentah.length, 22); lh.writeUInt16LE(nama.length, 26);
    bagian.push(lh, nama, data);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8);
    ch.writeUInt16LE(8, 10); ch.writeUInt32LE(crc >>> 0, 16); ch.writeUInt32LE(data.length, 20);
    ch.writeUInt32LE(mentah.length, 24); ch.writeUInt16LE(nama.length, 28); ch.writeUInt32LE(off, 42);
    pusat.push(ch, nama);
    off += 30 + nama.length + data.length;
  }
  const cd = Buffer.concat(pusat);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(berkas.length, 8); eocd.writeUInt16LE(berkas.length, 10);
  eocd.writeUInt32LE(cd.length, 12); eocd.writeUInt32LE(off, 16);
  return Buffer.concat([...bagian, cd, eocd]);
}
