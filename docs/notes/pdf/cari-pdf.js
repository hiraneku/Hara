/* Logika pencarian teks PDF (Bagian B5, Tahap 2). Tanpa DOM dan tanpa pdf.js,
   supaya bisa diuji langsung di Node.

   Teks tiap halaman dibentuk dari potongan teks pdf.js (item). Setiap karakter
   hasil gabungan ingat asalnya (nomor item dan posisinya), sehingga hasil
   pencarian bisa ditunjuk ke kotak teks di halaman.

   Aturan pencocokan: tidak peka huruf besar/kecil, tidak peka aksen (É = e),
   dan spasi berurutan dianggap satu spasi. Komentar anotasi (B1b) ikut dicari
   sebagai "halaman" tersendiri tanpa kotak.

   Batasan: kotak sorot dihitung per item teks dengan proporsi karakter, jadi
   bisa sedikit meleset untuk huruf yang lebarnya sangat tidak rata. Halaman
   yang diputar (rotasi 90/270) belum diuji. */

export const PANJANG_CUPLIKAN = 30;
export const MAKS_HASIL = 500;

/* Satu titik kode → bentuk pencarian: NFD, buang tanda diakritik, huruf kecil. */
function bentukCari(ch) {
  return ch.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/* Kueri pencarian: bentuk yang sama dengan teks halaman, spasi dirapikan. */
export function normalisasiCari(teks) {
  let out = '';
  let spasi = true;
  for (const ch of String(teks ?? '')) {
    if (/\s/u.test(ch)) {
      if (!spasi) { out += ' '; spasi = true; }
      continue;
    }
    const b = bentukCari(ch);
    if (b) { out += b; spasi = false; }
  }
  return out.endsWith(' ') ? out.slice(0, -1) : out;
}

/* items: [{ str, eol?, box? }]  box = { x, y, w, h } ternormalisasi (0–1) terhadap halaman.
   Mengembalikan indeks yang dipakai cariDiIndeks dan kotakHit. */
export function bangunIndeks(items) {
  const daftar = [];
  let raw = '';
  const rawItem = [];      /* per unit kode UTF-16 di `raw`: nomor item asal */
  for (const it of items || []) {
    const str = String(it?.str ?? '');
    const mulai = raw.length;
    raw += str;
    for (let k = 0; k < str.length; k++) rawItem.push(daftar.length);
    daftar.push({ len: str.length, mulai, box: it?.box || null });
    if (it?.eol && str.length) {
      raw += ' ';
      rawItem.push(daftar.length - 1);
    }
  }

  let norm = '';
  const rawPos = [];       /* per karakter `norm`: posisi awal di `raw` */
  const rawAkhir = [];     /* per karakter `norm`: posisi akhir (eksklusif) di `raw` */
  let spasi = true;
  let at = 0;
  for (const ch of raw) {
    const posisi = at;
    at += ch.length;
    if (/\s/u.test(ch)) {
      if (!spasi) { norm += ' '; rawPos.push(posisi); rawAkhir.push(at); spasi = true; }
      continue;
    }
    const b = bentukCari(ch);
    if (!b) continue;
    spasi = false;
    for (let k = 0; k < b.length; k++) { norm += b[k]; rawPos.push(posisi); rawAkhir.push(at); }
  }
  if (norm.endsWith(' ')) { norm = norm.slice(0, -1); rawPos.pop(); rawAkhir.pop(); }

  return { raw, norm, rawPos, rawAkhir, rawItem, item: daftar };
}

/* Kotak sorot untuk rentang karakter [mulai, akhir) di `norm`. */
export function kotakHit(indeks, mulai, akhir) {
  const { rawPos, rawAkhir, rawItem, item } = indeks;
  const awal = rawPos[mulai];
  const ujung = rawAkhir[akhir - 1];
  const kotak = [];
  for (let i = rawItem[awal]; i <= rawItem[rawPos[akhir - 1]]; i++) {
    const it = item[i];
    if (!it || !it.box || !it.len) continue;
    const dari = Math.max(awal, it.mulai) - it.mulai;
    const sampai = Math.min(ujung, it.mulai + it.len) - it.mulai;
    if (sampai <= dari) continue;
    const b = it.box;
    kotak.push({
      x: b.x + b.w * (dari / it.len),
      y: b.y,
      w: b.w * ((sampai - dari) / it.len),
      h: b.h,
    });
  }
  return kotak;
}

function rapikan(s) {
  return s.replace(/\s+/g, ' ');
}

/* Semua kemunculan `kueri` (sudah dinormalisasi) di satu indeks. Tidak tumpang-tindih. */
export function cariDiIndeks(indeks, kueri) {
  const q = normalisasiCari(kueri);
  if (!q || !indeks?.norm) return [];
  const hasil = [];
  let i = indeks.norm.indexOf(q);
  while (i !== -1 && hasil.length < MAKS_HASIL) {
    const akhir = i + q.length;
    const awalRaw = indeks.rawPos[i];
    const ujungRaw = indeks.rawAkhir[akhir - 1];
    const raw = indeks.raw;
    const dariPra = Math.max(0, awalRaw - PANJANG_CUPLIKAN);
    const sampaiPasca = Math.min(raw.length, ujungRaw + PANJANG_CUPLIKAN);
    hasil.push({
      mulai: i,
      akhir,
      pra: (dariPra > 0 ? '…' : '') + rapikan(raw.slice(dariPra, awalRaw)),
      cocok: rapikan(raw.slice(awalRaw, ujungRaw)),
      pasca: rapikan(raw.slice(ujungRaw, sampaiPasca)) + (sampaiPasca < raw.length ? '…' : ''),
      kotak: kotakHit(indeks, i, akhir),
    });
    i = indeks.norm.indexOf(q, akhir);
  }
  return hasil;
}

/* daftar: [{ halaman, jenis: 'teks' | 'komentar', indeks }].
   Hasil diurutkan: halaman naik, teks sebelum komentar, lalu posisi. */
export function kumpulkanHasil(daftar, kueri) {
  const semua = [];
  for (const d of daftar || []) {
    for (const h of cariDiIndeks(d.indeks, kueri)) {
      semua.push({ ...h, halaman: d.halaman, jenis: d.jenis });
    }
  }
  const urutJenis = j => (j === 'teks' ? 0 : 1);
  semua.sort((a, b) => a.halaman - b.halaman || urutJenis(a.jenis) - urutJenis(b.jenis) || a.mulai - b.mulai);
  return semua.slice(0, MAKS_HASIL);
}

/* Komentar anotasi (B1b) sebagai "halaman" pencarian tanpa kotak. */
export function daftarKomentar(anot) {
  return (anot || [])
    .filter(a => a && a.jenis === 'komentar' && typeof a.teks === 'string')
    .map(a => ({ halaman: a.hal, jenis: 'komentar', indeks: bangunIndeks([{ str: a.teks }]) }));
}

/* Navigasi hasil dengan membungkus di ujung. Tanpa hasil → -1. */
export function hasilBerikut(posisi, jumlah) {
  return jumlah > 0 ? (posisi + 1) % jumlah : -1;
}
export function hasilSebelumnya(posisi, jumlah) {
  if (!(jumlah > 0)) return -1;
  return posisi <= 0 ? jumlah - 1 : posisi - 1;
}
