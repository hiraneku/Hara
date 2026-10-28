/* Mesin OCR di peramban (Bagian B6, Tahap 2): Tesseract.js (LSTM) dari docs/vendor/tesseract.

   - Dimuat lewat import() dan worker dibuat hanya saat OCR pertama dijalankan.
   - Data bahasa Inggris dan Indonesia (4.0.0_best_int) ikut di vendor, jadi tidak ada
     unduhan dari CDN. Core yang disertakan hanya varian SIMD-LSTM: peramban tanpa SIMD
     akan melaporkan galat dan OCR tidak berjalan (tidak ada fallback diam-diam).
   - Worker dihentikan 60 detik setelah pekerjaan terakhir supaya memori HP tidak terus terpakai.

   Berkas di vendor dicatat di docs/vendor/tesseract/README.md. */

import { itemDariHasil, SISI_OCR } from './ocr-teks.js?v=20261028064740';

const BASE = new URL('../../vendor/tesseract/', import.meta.url).href;
const BAHASA = ['eng', 'ind'];
const JEDA_TUTUP_MS = 60000;

let pemuat = null;          /* janji pembuatan worker (di-cache) */
let pekerja = null;         /* worker yang sudah siap */
let timerTutup = null;
let kemajuanAktif = null;   /* callback kemajuan pekerjaan yang sedang berjalan */

async function ambilPekerja() {
  if (pekerja) return pekerja;
  if (!pemuat) {
    pemuat = (async () => {
      const mod = await import(BASE + 'tesseract.esm.min.js');
      const T = mod.default || mod;
      return T.createWorker(BAHASA, 1 /* OEM.LSTM_ONLY */, {
        workerPath: BASE + 'worker.min.js',
        /* Berkas core dikunci langsung (bukan folder), supaya tesseract.js tidak memilih varian
           lain lewat deteksi fitur. Hanya SIMD-LSTM yang di-vendor (lihat README). */
        corePath: BASE + 'core/tesseract-core-simd-lstm.wasm.js',
        langPath: BASE + 'lang/4.0.0_best_int/',
        cacheMethod: 'none',
        workerBlobURL: false,
        logger: m => { if (kemajuanAktif && typeof m.progress === 'number') kemajuanAktif(m.progress); },
      });
    })();
  }
  try {
    pekerja = await pemuat;
    return pekerja;
  } catch (err) {
    pemuat = null;
    throw err;
  }
}

function jadwalTutup() {
  clearTimeout(timerTutup);
  timerTutup = setTimeout(hentikanMesin, JEDA_TUTUP_MS);
}

export async function hentikanMesin() {
  clearTimeout(timerTutup);
  timerTutup = null;
  const w = pekerja;
  pekerja = null;
  pemuat = null;
  if (w) { try { await w.terminate(); } catch { /* sudah mati */ } }
}

/* Gambar sumber (kanvas, gambar, atau blob) → item OCR ternormalisasi.
   `kemajuan` menerima angka 0–1 selama pengenalan. Melempar galat bila mesin gagal. */
export async function kenali(sumber, kemajuan) {
  clearTimeout(timerTutup);
  kemajuanAktif = typeof kemajuan === 'function' ? kemajuan : null;
  try {
    const w = await ambilPekerja();
    const { data } = await w.recognize(sumber, {}, { blocks: true, text: true });
    const lebar = sumber.width || sumber.naturalWidth;
    const tinggi = sumber.height || sumber.naturalHeight;
    return itemDariHasil(data, lebar, tinggi);
  } finally {
    kemajuanAktif = null;
    jadwalTutup();
  }
}

/* Ukuran kerja untuk OCR: sisi terpanjang SISI_OCR piksel (dinaikkan atau diturunkan). */
export function ukuranKerja(lebar, tinggi) {
  const sisi = Math.max(lebar, tinggi) || 1;
  const skala = SISI_OCR / sisi;
  return { w: Math.max(1, Math.round(lebar * skala)), h: Math.max(1, Math.round(tinggi * skala)) };
}

/* Kanvas putih berisi gambar, siap dikirim ke mesin (gambar transparan jadi putih). */
export function kanvasOcr(sumber, lebar, tinggi) {
  const { w, h } = ukuranKerja(lebar, tinggi);
  const k = document.createElement('canvas');
  k.width = w;
  k.height = h;
  const ctx = k.getContext('2d');
  if (!ctx) throw new Error('kanvas tidak tersedia');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(sumber, 0, 0, w, h);
  return k;
}
