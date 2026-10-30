/* D4 · Web content capture v1 — fungsi murni untuk kartu tautan.
   Lingkup sesuai §1.11: URL, judul, catatan singkat, teks pilihan pengguna
   (kutipan), dan tanggal pengambilan. Tidak ada pengambilan halaman dari
   jaringan (kebijakan lintas-asal). Tanpa DOM, bisa diuji di Node. */

export const KUTIPAN_MAKS = 2000;

/* Kutipan: teks pilihan pengguna. Baris baru dinormalkan, spasi tepi dibuang,
   dan panjangnya dibatasi. Nilai selain string menjadi kosong. */
export function bersihKutipan(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/\r\n?/g, '\n').trim().slice(0, KUTIPAN_MAKS);
}

/* Tanggal pengambilan dalam zona waktu lokal, format YYYY-MM-DD. */
export function tanggalDiambil(d = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/* Escape HTML lengkap (teks dan nilai atribut). Dipakai untuk judul, catatan,
   dan kutipan yang berasal dari pengguna atau cadangan. */
export function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
