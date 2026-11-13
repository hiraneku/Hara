/* Logika murni penampil PDF (Bagian B1, Tahap 2). Tanpa DOM, supaya bisa diuji langsung.

   Pengenalan PDF: blok `file` yang mime-nya application/pdf, atau namanya .pdf
   dengan mime generik. Fungsi ini hanya membaca metadata blok, tidak membuka berkas. */

export const ZOOM_LANGKAH = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];
export const ZOOM_BAWAAN = 1;
const ZOOM_PAS_MIN = 0.25;
const ZOOM_PAS_MAKS = 4;

export function adalahPdf(meta) {
  const mime = String(meta?.mime || '').toLowerCase();
  const nama = String(meta?.name || '').toLowerCase();
  if (mime === 'application/pdf') return true;
  return nama.endsWith('.pdf') && (mime === '' || mime === 'application/octet-stream');
}

/* Nomor halaman dijepit ke rentang 1..total. Total nol atau tidak valid dianggap 1. */
export function halamanTerjepit(n, total) {
  if (!(total >= 1)) return 1;
  const bulat = Math.trunc(Number(n)) || 1;
  return Math.min(Math.trunc(total), Math.max(1, bulat));
}
export const halamanBerikut = (n, total) => halamanTerjepit(n + 1, total);
export const halamanSebelumnya = (n, total) => halamanTerjepit(n - 1, total);

/* Langkah zoom berikutnya/sebelumnya dari daftar tetap. Nilai di luar daftar
   (misalnya hasil "Pas lebar") melompat ke langkah terdekat di arah itu. */
export function zoomBerikut(z) {
  const i = ZOOM_LANGKAH.findIndex(v => v > z + 1e-9);
  return i === -1 ? ZOOM_LANGKAH[ZOOM_LANGKAH.length - 1] : ZOOM_LANGKAH[i];
}
export function zoomSebelumnya(z) {
  let hasil = ZOOM_LANGKAH[0];
  for (const v of ZOOM_LANGKAH) if (v < z - 1e-9) hasil = v;
  return hasil;
}

/* Skala agar lebar halaman pas dengan lebar wadah (dikurangi ruang tepi).
   Dibatasi 0,25–4. Mengembalikan ZOOM_BAWAAN bila ukuran tidak valid. */
export function skalaPasLebar(lebarHalaman, lebarWadah, tepi = 24) {
  const lh = Number(lebarHalaman);
  const lw = Number(lebarWadah) - tepi;
  if (!(lh > 0) || !(lw > 0)) return ZOOM_BAWAAN;
  const z = Math.min(ZOOM_PAS_MAKS, Math.max(ZOOM_PAS_MIN, lw / lh));
  return Math.round(z * 100) / 100;
}
