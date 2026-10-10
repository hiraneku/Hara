/**
 * Log ganti nama → CSV (K26). Murni, tanpa DOM.
 * - Kolom: waktu (ISO 8601), nama_asal, nama_baru, jumlah_aturan.
 * - Sel yang diawali = + - @ atau tab/CR diberi awalan ' agar tidak dijalankan
 *   sebagai rumus oleh Excel / Spreadsheet (injeksi CSV).
 * - Diberi BOM UTF-8 agar Excel membaca karakter non-ASCII dengan benar.
 */

export const BOM = '\uFEFF';
export const KOLOM_LOG = ['waktu', 'nama_asal', 'nama_baru', 'jumlah_aturan'];
export const MAKS_LOG = 1000;

function sel(nilai) {
  let s = nilai == null ? '' : String(nilai);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

/** @param {Array<{waktu:string, dari:string, ke:string, aturan?:number}>} entri */
export function buatCsvLog(entri = []) {
  const baris = [KOLOM_LOG.join(',')];
  for (const e of entri) {
    baris.push([e.waktu, e.dari, e.ke, e.aturan ?? 0].map(sel).join(','));
  }
  return BOM + baris.join('\r\n') + '\r\n';
}
