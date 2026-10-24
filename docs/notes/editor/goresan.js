/**
 * Model data goresan sketsa (Tahap 1 · A1 — Handwriting and drawing).
 *
 * Modul ini murni data: tanpa DOM dan tanpa canvas, sehingga bisa diuji di Node.
 * Sketsa.js memakai modul ini untuk menyimpan goresan sebagai data (bukan hanya
 * gambar PNG), supaya sketsa bisa dibuka ulang dan goresannya tetap ada.
 *
 * Format tersimpan (string JSON, disimpan di atribut data-goresan blok gambar):
 *   { "v": 1, "latar": "putih"|"gelap", "pola": "titik"|"garis"|"polos",
 *     "goresan": [ { "alat": "pena", "warna": "#111827", "ukuran": 4,
 *                    "pts": [ { "x": 10.5, "y": 20 }, ... ] } ] }
 *
 * Koordinat berada di ruang logis kanvas (LEBAR x TINGGI), sama seperti di sketsa.js.
 */

export const VERSI_GORESAN = 1;
export const ALAT_GORESAN = ['pena', 'stabilo', 'garis', 'panah', 'kotak', 'hapus'];
export const LATAR_GORESAN = ['putih', 'gelap'];
export const POLA_GORESAN = ['polos', 'titik', 'garis'];

/* Batas agar catatan tidak membengkak. Goresan yang melewati batas tidak disimpan
   sebagai objek (sketsa tetap tersimpan sebagai gambar seperti sebelumnya). */
export const BATAS_GORESAN = {
  goresan: 1000,
  titikPerGoresan: 3000,
  titikTotal: 60000,
  ukuranMaks: 40,
  bytes: 300000,
};

const RE_WARNA = /^#[0-9a-f]{6}$/i;

/** Angka dalam rentang. Null bila bukan angka (termasuk null, undefined, ''). */
function angkaDalamRentang(v, min, maks) {
  if (v === null || v === undefined || v === '' || typeof v === 'boolean') return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.min(maks, Math.max(min, n));
}

function bersihkanSatu(st, lebar, tinggi) {
  if (!st || typeof st !== 'object') return null;
  if (!ALAT_GORESAN.includes(st.alat)) return null;
  if (!Array.isArray(st.pts)) return null;
  const warna = RE_WARNA.test(st.warna) ? st.warna : '#111827';
  const ukuran = angkaDalamRentang(st.ukuran, 1, BATAS_GORESAN.ukuranMaks);
  if (ukuran === null) return null;
  const pts = [];
  for (const p of st.pts.slice(0, BATAS_GORESAN.titikPerGoresan)) {
    if (!p || typeof p !== 'object') continue;
    const x = angkaDalamRentang(p.x, -lebar, 2 * lebar);
    const y = angkaDalamRentang(p.y, -tinggi, 2 * tinggi);
    if (x === null || y === null) continue;
    pts.push({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
  }
  return {
    alat: st.alat,
    warna,
    ukuran: Math.round(ukuran * 10) / 10,
    pts,
  };
}

/** Salin daftar goresan dengan nilai yang sudah dibersihkan. Goresan tidak valid dibuang. */
export function bersihkanGoresan(list, lebar, tinggi) {
  if (!Array.isArray(list)) return [];
  const hasil = [];
  let total = 0;
  for (const st of list.slice(0, BATAS_GORESAN.goresan)) {
    const b = bersihkanSatu(st, lebar, tinggi);
    if (!b) continue;
    total += b.pts.length;
    if (total > BATAS_GORESAN.titikTotal) break;
    hasil.push(b);
  }
  return hasil;
}

/**
 * Ubah keadaan sketsa menjadi string JSON untuk disimpan.
 * Mengembalikan '' bila tidak ada goresan atau bila melewati batas.
 * Tidak memotong data diam-diam: bila melewati batas, hasilnya '' (tidak disimpan).
 */
export function serialGoresan({ goresan, latar = 'putih', pola = 'titik' } = {}, lebar, tinggi) {
  if (!Array.isArray(goresan) || goresan.length === 0) return '';
  if (goresan.length > BATAS_GORESAN.goresan) return '';
  let total = 0;
  for (const st of goresan) {
    const n = st && Array.isArray(st.pts) ? st.pts.length : 0;
    if (n > BATAS_GORESAN.titikPerGoresan) return '';
    total += n;
  }
  if (total > BATAS_GORESAN.titikTotal) return '';
  const teks = JSON.stringify({
    v: VERSI_GORESAN,
    latar: LATAR_GORESAN.includes(latar) ? latar : 'putih',
    pola: POLA_GORESAN.includes(pola) ? pola : 'titik',
    goresan: bersihkanGoresan(goresan, lebar, tinggi),
  });
  return teks.length <= BATAS_GORESAN.bytes ? teks : '';
}

/** Baca string dari atribut data-goresan. Mengembalikan null bila kosong, rusak, atau versi tidak dikenal. */
export function bacaGoresan(teks, lebar, tinggi) {
  if (!teks || typeof teks !== 'string' || teks.length > BATAS_GORESAN.bytes) return null;
  let o;
  try { o = JSON.parse(teks); } catch { return null; }
  if (!o || typeof o !== 'object' || o.v !== VERSI_GORESAN) return null;
  return {
    latar: LATAR_GORESAN.includes(o.latar) ? o.latar : 'putih',
    pola: POLA_GORESAN.includes(o.pola) ? o.pola : 'titik',
    goresan: bersihkanGoresan(o.goresan, lebar, tinggi),
  };
}
