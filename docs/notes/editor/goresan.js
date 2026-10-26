/**
 * Model data sketsa (Tahap 1 · A1 goresan, A2 objek visual).
 *
 * Modul ini murni data: tanpa DOM dan tanpa canvas, sehingga bisa diuji di Node.
 * Sketsa.js memakai modul ini untuk menyimpan goresan dan objek visual sebagai data
 * (bukan hanya gambar PNG), supaya bisa dibuka ulang dan diedit.
 *
 * Format tersimpan (string JSON, disimpan di atribut data-goresan blok gambar):
 *   { "v": 4, "latar": "putih"|"gelap", "pola": "titik"|"garis"|"polos",
 *     "kanvas":  { "w": 720, "h": 460 },
 *     "goresan": [ { "alat": "pena", "warna": "#111827", "ukuran": 4, "gaya": "tinta",
 *                    "pts": [ { "x": 10.5, "y": 20 }, ... ] } ],
 *     "objek":   [ { "id": "o1", "blob": "sk_abc", "x": 40, "y": 60, "w": 200, "h": 120 } ] }
 *
 * v1 (hanya goresan) dan v2 (tanpa kanvas) tetap bisa dibaca dengan ukuran default.
 * v3 (tanpa "gaya") dibaca sebagai gaya "tinta". Gaya hanya berlaku untuk alat "pena" (A3). Urutan "objek" adalah urutan tumpukan (akhir = paling atas).
 * Koordinat berada di ruang logis kanvas (LEBAR x TINGGI), sama seperti di sketsa.js.
 */

import { bersihkanLapisan, idLapisanValid, lapisanAwal, ID_LAPISAN_DASAR } from './lapisan.js?v=20261026025826';

/* v5 (A5): daftar "lapisan" di level sketsa; setiap goresan dan objek punya field "lapisan".
   v4 dan sebelumnya dibaca sebagai satu lapisan bawaan. */
export const VERSI_GORESAN = 5;
export const VERSI_DIDUKUNG = [1, 2, 3, 4, 5];
/* "elips" dan "poligon" dibuat oleh pengenalan bentuk (A4). Keduanya tetap data yang bisa diedit. */
export const ALAT_GORESAN = ['pena', 'stabilo', 'garis', 'panah', 'kotak', 'elips', 'poligon', 'hapus'];
export const LATAR_GORESAN = ['putih', 'gelap'];
/* Gaya sapuan pena (A3). Tinta = bawaan. Kuas lebih tebal dan agak transparan, pensil lebih tipis dan pudar. */
export const GAYA_GORESAN = ['tinta', 'kuas', 'pensil'];
const FAKTOR_GAYA = {
  tinta: { skala: 1, alpha: 1 },
  kuas: { skala: 2.2, alpha: 0.85 },
  pensil: { skala: 0.8, alpha: 0.55 },
};

/** Pengali lebar dan transparansi untuk gaya sapuan. Dipakai canvas dan SVG agar hasilnya sama. */
export function faktorGaya(gaya) {
  return FAKTOR_GAYA[gaya] || FAKTOR_GAYA.tinta;
}
export const POLA_GORESAN = ['polos', 'titik', 'garis'];

/* Batas agar catatan tidak membengkak. Data yang melewati batas tidak disimpan
   (sketsa tetap tersimpan sebagai gambar seperti sebelumnya). */
export const BATAS_GORESAN = {
  goresan: 1000,
  titikPerGoresan: 3000,
  titikTotal: 60000,
  ukuranMaks: 40,
  objek: 50,
  objekLebarMin: 8,
  bytes: 300000,
};

/* Ukuran kanvas kerja (A7). Default 720×460 seperti sebelumnya. Batas agar memori dan catatan tetap wajar. */
export const KANVAS_BATAS = {
  defaultW: 720,
  defaultH: 460,
  minW: 360,
  minH: 240,
  maxW: 2400,
  maxH: 2400,
  langkah: 120,
};

const RE_WARNA = /^#[0-9a-f]{6}$/i;
const RE_BLOB = /^[A-Za-z0-9_-]{1,80}$/;
const RE_ID_OBJEK = /^[A-Za-z0-9_-]{1,40}$/;

/** Angka dalam rentang. Null bila bukan angka (termasuk null, undefined, '', boolean). */
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
  const gaya = GAYA_GORESAN.includes(st.gaya) ? st.gaya : 'tinta';
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
    gaya,
    pts,
  };
}

/** Salin daftar goresan dengan nilai yang sudah dibersihkan. Goresan tidak valid dibuang. */
export function bersihkanGoresan(list, lebar, tinggi, lap = lapisanAwal()) {
  if (!Array.isArray(list)) return [];
  const hasil = [];
  let total = 0;
  for (const st of list.slice(0, BATAS_GORESAN.goresan)) {
    const b = bersihkanSatu(st, lebar, tinggi);
    if (!b) continue;
    total += b.pts.length;
    if (total > BATAS_GORESAN.titikTotal) break;
    hasil.push({ ...b, lapisan: idLapisanValid(lap, typeof st.lapisan === 'string' ? st.lapisan : '') });
  }
  return hasil;
}

function bersihkanObjekSatu(o, lebar, tinggi) {
  if (!o || typeof o !== 'object') return null;
  if (typeof o.id !== 'string' || !RE_ID_OBJEK.test(o.id)) return null;
  if (typeof o.blob !== 'string' || !RE_BLOB.test(o.blob)) return null;
  const x = angkaDalamRentang(o.x, -lebar, 2 * lebar);
  const y = angkaDalamRentang(o.y, -tinggi, 2 * tinggi);
  const w = angkaDalamRentang(o.w, BATAS_GORESAN.objekLebarMin, 2 * lebar);
  const h = angkaDalamRentang(o.h, BATAS_GORESAN.objekLebarMin, 2 * tinggi);
  if (x === null || y === null || w === null || h === null) return null;
  return {
    id: o.id,
    blob: o.blob,
    x: Math.round(x * 10) / 10,
    y: Math.round(y * 10) / 10,
    w: Math.round(w * 10) / 10,
    h: Math.round(h * 10) / 10,
  };
}

/** Salin daftar objek visual yang sudah dibersihkan. Objek tidak valid dan id ganda dibuang. */
export function bersihkanObjek(list, lebar, tinggi, lap = lapisanAwal()) {
  if (!Array.isArray(list)) return [];
  const hasil = [];
  const sudahAda = new Set();
  for (const o of list.slice(0, BATAS_GORESAN.objek)) {
    const b = bersihkanObjekSatu(o, lebar, tinggi);
    if (!b || sudahAda.has(b.id)) continue;
    sudahAda.add(b.id);
    hasil.push({ ...b, lapisan: idLapisanValid(lap, typeof o.lapisan === 'string' ? o.lapisan : '') });
  }
  return hasil;
}

/** Ukuran kanvas yang aman. Nilai yang tidak valid memakai default. */
export function bersihkanKanvas(k) {
  const w = angkaDalamRentang(k && k.w, KANVAS_BATAS.minW, KANVAS_BATAS.maxW);
  const h = angkaDalamRentang(k && k.h, KANVAS_BATAS.minH, KANVAS_BATAS.maxH);
  return {
    w: w === null ? KANVAS_BATAS.defaultW : Math.round(w),
    h: h === null ? KANVAS_BATAS.defaultH : Math.round(h),
  };
}

/**
 * Ubah keadaan sketsa menjadi string JSON untuk disimpan.
 * Mengembalikan '' bila tidak ada goresan, objek, maupun perubahan ukuran kanvas,
 * atau bila melewati batas. Tidak memotong data diam-diam.
 */
export function serialGoresan({ goresan = [], objek = [], latar = 'putih', pola = 'titik', lapisan } = {}, lebar, tinggi) {
  const kanvas = bersihkanKanvas({ w: lebar, h: tinggi });
  const lap = bersihkanLapisan(lapisan);
  const lapisanBawaan = lap.length === 1 && lap[0].id === ID_LAPISAN_DASAR && lap[0].tampil && !lap[0].kunci && lap[0].nama === 'Dasar';
  const adaGoresan = Array.isArray(goresan) && goresan.length > 0;
  const adaObjek = Array.isArray(objek) && objek.length > 0;
  const ukuranDefault = kanvas.w === KANVAS_BATAS.defaultW && kanvas.h === KANVAS_BATAS.defaultH;
  if (!adaGoresan && !adaObjek && ukuranDefault && lapisanBawaan) return '';
  if (adaGoresan) {
    if (goresan.length > BATAS_GORESAN.goresan) return '';
    let total = 0;
    for (const st of goresan) {
      const n = st && Array.isArray(st.pts) ? st.pts.length : 0;
      if (n > BATAS_GORESAN.titikPerGoresan) return '';
      total += n;
    }
    if (total > BATAS_GORESAN.titikTotal) return '';
  }
  if (adaObjek && objek.length > BATAS_GORESAN.objek) return '';
  const teks = JSON.stringify({
    v: VERSI_GORESAN,
    latar: LATAR_GORESAN.includes(latar) ? latar : 'putih',
    pola: POLA_GORESAN.includes(pola) ? pola : 'titik',
    kanvas,
    lapisan: lap,
    goresan: bersihkanGoresan(goresan, kanvas.w, kanvas.h, lap),
    objek: bersihkanObjek(objek, kanvas.w, kanvas.h, lap),
  });
  return teks.length <= BATAS_GORESAN.bytes ? teks : '';
}

/** Baca string dari atribut data-goresan. Null bila kosong, rusak, atau versi tidak dikenal.
 *  Data v1 dan v2 tidak punya ukuran kanvas, jadi memakai default. */
export function bacaGoresan(teks) {
  if (!teks || typeof teks !== 'string' || teks.length > BATAS_GORESAN.bytes) return null;
  let o;
  try { o = JSON.parse(teks); } catch { return null; }
  if (!o || typeof o !== 'object' || !VERSI_DIDUKUNG.includes(o.v)) return null;
  const kanvas = bersihkanKanvas(o.v >= 3 ? o.kanvas : null);
  const lap = bersihkanLapisan(o.v >= 5 ? o.lapisan : null);
  return {
    latar: LATAR_GORESAN.includes(o.latar) ? o.latar : 'putih',
    pola: POLA_GORESAN.includes(o.pola) ? o.pola : 'titik',
    kanvas,
    lapisan: lap,
    goresan: bersihkanGoresan(o.goresan, kanvas.w, kanvas.h, lap),
    objek: bersihkanObjek(o.objek, kanvas.w, kanvas.h, lap),
  };
}

/** Daftar id blob yang dirujuk objek visual di data goresan. Dipakai agar blob tidak dihapus sebagai yatim. */
export function idBlobDariGoresan(teks) {
  const b = bacaGoresan(teks);
  if (!b) return [];
  return [...new Set(b.objek.map(o => o.blob))];
}

/** Indeks objek teratas yang memuat titik (x, y), atau -1. Objek di akhir daftar berada di atas. */
export function hitObjek(objek, x, y) {
  for (let i = objek.length - 1; i >= 0; i--) {
    const o = objek[i];
    if (x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h) return i;
  }
  return -1;
}
