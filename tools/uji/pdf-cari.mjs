/* Pengujian Tahap 2 · B5 (pencarian teks PDF) — logika murni, Node.

   Yang diuji (docs/notes/pdf/cari-pdf.js):
   • normalisasi kueri: huruf besar/kecil, aksen, spasi berlebih;
   • indeks halaman: teks yang terpecah antar-item tetap ketemu, spasi pemisah baris;
   • pencarian: jumlah kemunculan, tidak tumpang-tindih, cuplikan, kotak sorot;
   • komentar anotasi ikut dicari, tanpa kotak;
   • urutan hasil dan navigasi berputar.

   Catatan: ekstraksi teks dari pdf.js (getTextContent) TIDAK diuji di sini, karena
   pdf.js 6.x tidak berjalan di Node 22. Itu diuji di Chromium (lihat laporan).

   Jalan: node tools/uji/pdf-cari.mjs (dari folder repo). */
import path from 'path';
import { fileURLToPath } from 'url';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));

const c = await import(`${process.cwd()}/docs/notes/pdf/cari-pdf.js`);

let gagal = 0, total = 0;
const oke = (nama, baik, det = '') => {
  total++;
  if (!baik) { gagal++; console.log('FAIL', nama, det ? '\n      ' + det : ''); }
  else console.log('ok  ', nama);
};
const json = x => JSON.stringify(x);

/* Item tanpa kotak (uji logika teks saja). */
const it = (str, eol = false) => ({ str, eol });

console.log('── Normalisasi kueri ──');
oke('huruf besar dan kecil disamakan', c.normalisasiCari('HaLaMan') === 'halaman');
oke('aksen dibuang (É → e, ç → c)', c.normalisasiCari('Émile Français') === 'emile francais', c.normalisasiCari('Émile Français'));
oke('spasi berlebih dan tepi dirapikan', c.normalisasiCari('  satu    dua  ') === 'satu dua');
oke('kueri kosong atau hanya spasi → kosong', c.normalisasiCari('') === '' && c.normalisasiCari('   ') === '');
oke('tanda diakritik berdiri sendiri tidak menghasilkan karakter', c.normalisasiCari('\u0301a') === 'a');

console.log('── Indeks: teks terpecah antar-item ──');
const pecah = c.bangunIndeks([it('Hal'), it('aman '), it('catatan')]);
oke('kata yang terpecah di dua item tergabung', pecah.norm === 'halaman catatan', json(pecah.norm));
const h1 = c.cariDiIndeks(pecah, 'halaman');
oke('"halaman" ketemu walau berasal dari dua item', h1.length === 1 && h1[0].cocok === 'Halaman', json(h1));
oke('tanpa kotak (item tanpa box), hasil tetap ada tetapi kotak kosong', h1.length === 1 && h1[0].kotak.length === 0);

const dengan = c.bangunIndeks([
  { str: 'Hal', box: { x: 0.1, y: 0.2, w: 0.1, h: 0.05 } },
  { str: 'aman ', box: { x: 0.2, y: 0.2, w: 0.1, h: 0.05 } },
]);
const kotakPecah = c.cariDiIndeks(dengan, 'halaman')[0]?.kotak || [];
oke('kotak sorot dibentuk per item (dua kotak untuk kata terpecah)', kotakPecah.length === 2, json(kotakPecah));
oke('kotak item pertama penuh ("Hal" = seluruh item, lebar 0,1)', kotakPecah.length === 2 && Math.abs(kotakPecah[0].x - 0.1) < 1e-9 && Math.abs(kotakPecah[0].w - 0.1) < 1e-9, json(kotakPecah[0]));
oke('kotak item kedua hanya bagian "aman" (4 dari 5 karakter → lebar 0,08)', kotakPecah.length === 2 && Math.abs(kotakPecah[1].x - 0.2) < 1e-9 && Math.abs(kotakPecah[1].w - 0.08) < 1e-9, json(kotakPecah[1]));

const baris = c.bangunIndeks([it('satu', true), it('dua')]);
oke('item berakhir baris memberi spasi pemisah', c.cariDiIndeks(baris, 'satu dua').length === 1, json(baris.norm));
oke('tanpa penanda baris, "satudua" tidak ketemu "satu dua"', c.cariDiIndeks(c.bangunIndeks([it('satu'), it('dua')]), 'satu dua').length === 0);

console.log('── Pencarian: jumlah, tumpang-tindih, cuplikan ──');
const teks = c.bangunIndeks([it('Ini catatan penting. Catatan kedua memuat kata catatan lagi.')]);
const hasilCatatan = c.cariDiIndeks(teks, 'CATATAN');
oke('tiga kemunculan, tanpa peka huruf besar', hasilCatatan.length === 3, `jumlah=${hasilCatatan.length}`);
oke('cuplikan memuat kata yang dicocokkan dalam bentuk asli', hasilCatatan.every(h => h.cocok.toLowerCase() === 'catatan'), json(hasilCatatan.map(h => h.cocok)));
const tumpang = c.cariDiIndeks(c.bangunIndeks([it('aaaa')]), 'aa');
oke('kemunculan tidak tumpang-tindih ("aaaa" dicari "aa" → 2)', tumpang.length === 2, `jumlah=${tumpang.length}`);
const aksen = c.cariDiIndeks(c.bangunIndeks([it('Émile tiba di Paris.')]), 'emile');
oke('aksen tidak menghalangi: "Émile" ketemu dengan "emile"', aksen.length === 1 && aksen[0].cocok === 'Émile', json(aksen));
const panjang = c.cariDiIndeks(c.bangunIndeks([it('a'.repeat(50) + ' kata ' + 'b'.repeat(50))]), 'kata');
oke('cuplikan dipotong dengan "…" di kedua sisi bila panjang', panjang.length === 1 && panjang[0].pra.startsWith('…') && panjang[0].pasca.endsWith('…'), json(panjang[0]));
oke('kueri kosong tidak mengembalikan apa pun', c.cariDiIndeks(teks, '   ').length === 0);
oke('indeks tanpa teks (hasil pindai) tidak mengembalikan apa pun', c.cariDiIndeks(c.bangunIndeks([]), 'apa').length === 0);

console.log('── Gabungan halaman dan komentar ──');
const daftar = [
  { halaman: 3, jenis: 'teks', indeks: c.bangunIndeks([it('kata sama di halaman tiga')]) },
  { halaman: 1, jenis: 'teks', indeks: c.bangunIndeks([it('kata sama di halaman satu')]) },
  { halaman: 1, jenis: 'komentar', indeks: c.bangunIndeks([{ str: 'komentar kata sama' }]) },
  { halaman: 2, jenis: 'teks', indeks: c.bangunIndeks([it('tidak ada di sini')]) },
];
const gab = c.kumpulkanHasil(daftar, 'kata sama');
oke('hasil diurutkan halaman naik', json(gab.map(h => h.halaman)) === json([1, 1, 3]), json(gab.map(h => h.halaman)));
oke('pada halaman yang sama, teks didahulukan sebelum komentar', gab[0].jenis === 'teks' && gab[1].jenis === 'komentar', json(gab.map(h => h.jenis)));
oke('komentar tidak punya kotak sorot', gab[1].kotak.length === 0);
const anot = [
  { jenis: 'komentar', hal: 2, teks: 'ulangi bagian ini', x: 0.5, y: 0.5 },
  { jenis: 'sorot', hal: 2, x1: 0, y1: 0, x2: 1, y2: 1 },
  { jenis: 'komentar', hal: 4, teks: 'bukan bagian ini', x: 0.1, y: 0.1 },
];
const komen = c.kumpulkanHasil([...c.daftarKomentar(anot)], 'ulangi');
oke('komentar anotasi ikut dicari dengan nomor halaman anotasi', komen.length === 1 && komen[0].halaman === 2 && komen[0].jenis === 'komentar', json(komen));
oke('anotasi jenis sorot/garis/coret tidak ikut dicari', c.daftarKomentar(anot).length === 2);
oke('daftar anotasi kosong atau tak valid aman', c.daftarKomentar(undefined).length === 0 && c.daftarKomentar([null]).length === 0);

console.log('── Navigasi hasil ──');
oke('berikutnya maju dan membungkus di ujung', c.hasilBerikut(0, 3) === 1 && c.hasilBerikut(2, 3) === 0);
oke('sebelumnya mundur dan membungkus di awal', c.hasilSebelumnya(1, 3) === 0 && c.hasilSebelumnya(0, 3) === 2);
oke('tanpa hasil → -1', c.hasilBerikut(-1, 0) === -1 && c.hasilSebelumnya(-1, 0) === -1);

console.log(`\nTotal: ${total} pengujian · Lulus: ${total - gagal} · Gagal: ${gagal}`);
if (gagal > 0) { console.log('GAGAL'); process.exit(1); }
process.exit(0);
