/* Logika OCR (Bagian B6, Tahap 2) — murni, tanpa DOM dan tanpa Tesseract.

   Keluaran Tesseract (blocks → paragraphs → lines → words, bbox dalam piksel)
   diubah menjadi "item" yang sama bentuknya dengan item teks pdf.js:
     { str, eol, box: { x, y, w, h } }   (box ternormalisasi 0–1, sudut kiri atas)
   Dengan begitu hasil OCR bisa langsung masuk ke bangunIndeks() (cari-pdf.js)
   dan kotak sorotnya ikut bekerja.

   Hanya kata dengan keyakinan ≥ MIN_KEPERCAYAAN yang disimpan. Kata kosong dibuang. */

export const MIN_KEPERCAYAAN = 30;      /* skala Tesseract 0–100 */
export const MAKS_TEKS_OCR = 20000;     /* batas teks yang disimpan ke catatan (karakter) */
export const MAKS_ITEM_HALAMAN = 20000; /* batas item per halaman PDF saat dibaca kembali */
export const SISI_OCR = 1600;           /* sisi terpanjang gambar yang dikirim ke mesin (piksel) */

const jepit = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* bbox Tesseract (piksel) → kotak ternormalisasi. null bila bbox tidak valid. */
export function kotakDariBbox(bbox, lebar, tinggi) {
  if (!bbox || !(lebar > 0) || !(tinggi > 0)) return null;
  const x0 = Number(bbox.x0), y0 = Number(bbox.y0), x1 = Number(bbox.x1), y1 = Number(bbox.y1);
  if (![x0, y0, x1, y1].every(Number.isFinite) || x1 <= x0 || y1 <= y0) return null;
  const x = jepit(x0 / lebar, 0, 1), y = jepit(y0 / tinggi, 0, 1);
  const w = jepit((x1 - x0) / lebar, 0, 1 - x), h = jepit((y1 - y0) / tinggi, 0, 1 - y);
  if (w <= 0 || h <= 0) return null;
  return { x, y, w, h };
}

/* Keluaran `recognize(..., { blocks: true })` → item untuk bangunIndeks. */
export function itemDariHasil(data, lebar, tinggi) {
  const items = [];
  if (!data || !Array.isArray(data.blocks)) return items;
  for (const blok of data.blocks) {
    for (const para of (blok && blok.paragraphs) || []) {
      for (const baris of (para && para.lines) || []) {
        const kata = [];
        for (const w of (baris && baris.words) || []) {
          const str = typeof (w && w.text) === 'string' ? w.text.trim() : '';
          if (!str || !((Number(w.confidence) || 0) >= MIN_KEPERCAYAAN)) continue;
          const box = kotakDariBbox(w.bbox, lebar, tinggi);
          if (box) kata.push({ str, box });
        }
        /* Spasi antar kata diberikan langsung di str (pdf.js juga begitu). bangunIndeks hanya
           menambah spasi di akhir baris (eol), jadi tanpa ini "SEPEDA MERAH" menjadi "SEPEDAMERAH". */
        kata.forEach((k, i) => {
          const terakhir = i === kata.length - 1;
          items.push({ str: terakhir ? k.str : k.str + ' ', eol: terakhir, box: k.box });
        });
      }
    }
  }
  return items;
}

/* Teks biasa dari item: satu baris per `eol`. Dipakai untuk teks gambar catatan. */
export function teksDariItem(items) {
  const baris = [];
  let aktif = '';
  for (const it of items || []) {
    aktif += String(it.str || '');
    if (it.eol) { baris.push(aktif.trim()); aktif = ''; }
  }
  if (aktif.trim()) baris.push(aktif.trim());
  return baris.join('\n').trim().slice(0, MAKS_TEKS_OCR);
}

/* Halaman dianggap punya teks bila ada item non-kosong. */
export const adaTeks = items => Array.isArray(items) && items.some(it => it && String(it.str || '').trim());

/* ── Format penyimpanan hasil OCR PDF ──
   {"v":1,"hal":{"<nomor halaman asli>":[item, …]}}
   Dibaca dengan toleran: entri rusak dibuang, data tidak valid menghasilkan objek kosong. */

export function tulisOcrPdf(hal) {
  return JSON.stringify({ v: 1, hal });
}

function itemValid(it) {
  if (!it || typeof it !== 'object') return false;
  if (typeof it.str !== 'string' || typeof it.eol !== 'boolean') return false;
  const b = it.box;
  return !!b && [b.x, b.y, b.w, b.h].every(v => typeof v === 'number' && Number.isFinite(v))
    && b.x >= 0 && b.y >= 0 && b.w > 0 && b.h > 0 && b.x <= 1 && b.y <= 1;
}

export function bacaOcrPdf(teks) {
  const hasil = {};
  let raw = null;
  try { raw = JSON.parse(String(teks || '')); } catch { return hasil; }
  const hal = raw && typeof raw === 'object' && raw.hal && typeof raw.hal === 'object' ? raw.hal : null;
  if (!hal) return hasil;
  for (const [kunci, daftar] of Object.entries(hal)) {
    const n = Number(kunci);
    if (!Number.isInteger(n) || n < 1 || !Array.isArray(daftar)) continue;
    const bersih = daftar.slice(0, MAKS_ITEM_HALAMAN).filter(itemValid);
    if (bersih.length) hasil[n] = bersih;
  }
  return hasil;
}

/* Kunci penyimpanan per blob PDF. Pembersih blob yatim (notes/editor/image.js) dan cadangan
   (notes/data-io.js) memakai kunci ini, sama seperti anot- dan susun-. */
export const kunciOcr = blobId => 'ocr-' + blobId;

/* ── Halaman pindai dengan sedikit teks (B6 lanjutan) ──
   Halaman pindai yang punya satu baris teks ketikan (stempel, nomor halaman) punya lapisan
   teks, sehingga tanpa aturan ini ia tidak di-OCR dan isi pindaiannya tidak bisa dicari.
   Halaman dianggap pindai bila teks lapisannya sedikit DAN gambar menutupi sebagian besar
   halaman. Halaman dengan teks banyak, atau tanpa gambar besar, tetap tidak di-OCR. */
export const MAKS_HURUF_LAPISAN_SEDIKIT = 50; /* huruf non-spasi di lapisan teks. Stempel dan nomor halaman jauh di bawah ini; label grafik (77 huruf di multipage.pdf hal. 4) di atasnya */
export const BAGIAN_GAMBAR_PINDAI = 0.5;       /* gambar terbesar, bagian dari luas halaman */

/* Keputusan OCR untuk satu halaman. hurufLapisan: jumlah huruf non-spasi di lapisan teks.
   bagianGambar: bagian luas halaman yang ditutupi gambar terbesar (0–1). */
export function perluOcr(hurufLapisan, bagianGambar) {
  if (!(hurufLapisan > 0)) return true;
  return hurufLapisan <= MAKS_HURUF_LAPISAN_SEDIKIT && bagianGambar >= BAGIAN_GAMBAR_PINDAI;
}

/* Jumlah huruf non-spasi dari item teks pdf.js. */
export function hitungHuruf(items) {
  let n = 0;
  for (const it of items || []) {
    if (it && typeof it.str === 'string') n += it.str.replace(/\s+/g, '').length;
  }
  return n;
}

/* Gabungan teks lapisan dan hasil OCR. Item OCR yang sebagian besar kotaknya sudah ditutupi
   item lapisan dibuang, supaya teks yang sudah ada di lapisan (mis. stempel) tidak dihitung dua
   kali. Kotak keduanya ternormalisasi 0–1 dengan titik asal kiri atas. */
export function gabungLapisanOcr(itemLapisan, itemOcr) {
  const lapisan = Array.isArray(itemLapisan) ? itemLapisan : [];
  const ocr = Array.isArray(itemOcr) ? itemOcr : [];
  const kotakLapisan = lapisan.map(it => it.box).filter(Boolean);
  const tertutup = b => {
    const luas = b.w * b.h;
    if (!(luas > 0)) return true;
    for (const t of kotakLapisan) {
      const w = Math.min(b.x + b.w, t.x + t.w) - Math.max(b.x, t.x);
      const h = Math.min(b.y + b.h, t.y + t.h) - Math.max(b.y, t.y);
      if (w > 0 && h > 0 && (w * h) / luas > 0.5) return true;
    }
    return false;
  };
  return [...lapisan, ...ocr.filter(it => it && it.box && !tertutup(it.box))];
}
