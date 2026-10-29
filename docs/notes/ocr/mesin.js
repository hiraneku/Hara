/* Mesin OCR di peramban (Bagian B6, Tahap 2): Tesseract.js (LSTM) dari docs/vendor/tesseract.

   - Dimuat lewat import() dan worker dibuat hanya saat OCR pertama dijalankan.
   - Data bahasa Inggris dan Indonesia (4.0.0_best_int) ikut di vendor, jadi tidak ada
     unduhan dari CDN. Ada dua core: SIMD-LSTM (dipakai bila peramban mendukung WebAssembly
     SIMD) dan LSTM non-SIMD (cadangan). Pemilihan dilakukan di sini, bukan lewat deteksi
     tesseract.js, supaya berkas yang dimuat selalu yang ada di vendor.
   - Worker dihentikan 60 detik setelah pekerjaan terakhir supaya memori HP tidak terus terpakai.

   Berkas di vendor dicatat di docs/vendor/tesseract/README.md. */

import { itemDariHasil, SISI_OCR } from './ocr-teks.js?v=20261029190000';

const BASE = new URL('../../vendor/tesseract/', import.meta.url).href;
const BAHASA = ['eng', 'ind'];
const JEDA_TUTUP_MS = 60000;

/* Modul wasm minimum yang hanya valid bila WebAssembly SIMD didukung (sama dengan
   deteksi wasm-feature-detect). Tidak pernah dijalankan, hanya divalidasi. */
const UJI_SIMD = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0,
  10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]);

export function adaSimd() {
  try { return WebAssembly.validate(UJI_SIMD); } catch { return false; }
}

/* Berkas core yang dipakai. Dikunci ke berkas, bukan folder. */
export function berkasCore(simd = adaSimd()) {
  return BASE + (simd ? 'core/tesseract-core-simd-lstm.wasm.js' : 'core/tesseract-core-lstm.wasm.js');
}

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
           lain lewat deteksi fitur. Lihat README untuk varian yang di-vendor. */
        corePath: berkasCore(),
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
