/* Pemuat pdf.js (Bagian B1, Tahap 2).

   - Dimuat lewat import() hanya saat PDF pertama dibuka, jadi tidak membebani
     pembukaan aplikasi. Berkas ada di docs/vendor/pdfjs (lihat README di sana).
   - pdf.js 6.x membutuhkan peramban modern: API ES2024–2025 dipakai saat modul
     dievaluasi dan saat membuka berkas (Uint8Array.toHex, toBase64, fromBase64,
     Iterator, Promise.try, Promise.withResolvers). Tidak di-polyfill, karena
     polyfill setengah jadi lebih berbahaya daripada pesan yang jelas. Peramban
     yang tidak punya fitur ini diberi tahu dan PDF tidak dicoba dibuka. */

const URL_LIB = new URL('../../vendor/pdfjs/pdf.min.mjs', import.meta.url).href;
const URL_WORKER = new URL('../../vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;

export const FITUR_PDFJS = [
  ['Iterator', () => typeof globalThis.Iterator === 'function'],
  ['Promise.try', () => typeof Promise.try === 'function'],
  ['Promise.withResolvers', () => typeof Promise.withResolvers === 'function'],
  ['Uint8Array.toHex', () => typeof Uint8Array.prototype.toHex === 'function'],
  ['Uint8Array.toBase64', () => typeof Uint8Array.prototype.toBase64 === 'function'],
  ['Uint8Array.fromBase64', () => typeof Uint8Array.fromBase64 === 'function'],
];

/* Nama fitur yang tidak tersedia di peramban ini. Daftar kosong = siap. */
export function fiturPdfKurang() {
  return FITUR_PDFJS.filter(([, cek]) => {
    try { return !cek(); } catch { return true; }
  }).map(([nama]) => nama);
}

let pemuat = null;

/* Mengembalikan modul pdf.js yang sudah siap (worker sudah diatur). Hasilnya di-cache.
   Melempar galat dengan `kurang` berisi fitur yang hilang bila peramban belum cukup baru. */
export function muatPdfJs() {
  if (pemuat) return pemuat;
  const kurang = fiturPdfKurang();
  if (kurang.length) {
    const galat = new Error('PDF_FITUR_KURANG');
    galat.kurang = kurang;
    return Promise.reject(galat);
  }
  pemuat = import(URL_LIB).then(lib => {
    lib.GlobalWorkerOptions.workerSrc = URL_WORKER;
    return lib;
  }).catch(err => {
    pemuat = null;
    throw err;
  });
  return pemuat;
}

export { URL_LIB, URL_WORKER };
