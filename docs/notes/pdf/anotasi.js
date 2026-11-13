/* Anotasi PDF (Bagian B1, Tahap 2, langkah B1b).

   Anotasi disimpan TERPISAH dari PDF asli (koreksi §1.5 dan keputusan §2.4):
   berkas PDF tidak pernah ditulis ulang; anotasi berupa daftar data kecil.

   Koordinat disimpan ternormalisasi (0–1 terhadap ukuran halaman, bukan
   piksel), sehingga anotasi tetap di tempat yang benar saat zoom atau
   ukuran layar berubah.

   Modul ini murni (tanpa DOM dan tanpa IndexedDB) supaya bisa diuji di Node. */

export const JENIS_ANOT = ['coret', 'sorot', 'garis', 'komentar'];

export const WARNA_ANOT = {
  coret: '#e53935',
  garis: '#e53935',
  sorot: '#fdd835',
  komentar: '#1e88e5',
};

export const MAKS_TEKS_KOMENTAR = 500;

/* Kunci blob tempat anotasi disimpan. Berbeda dari id blob PDF asli. */
export function kunciAnotasi(blobId) {
  return 'anot-' + String(blobId);
}

export function klem01(v) {
  return Math.min(1, Math.max(0, v));
}

/* Titik layar → koordinat ternormalisasi di dalam kotak `rect`. */
export function titikTernormal(clientX, clientY, rect) {
  if (!rect || !(rect.width > 0) || !(rect.height > 0)) return null;
  return {
    x: klem01((clientX - rect.left) / rect.width),
    y: klem01((clientY - rect.top) / rect.height),
  };
}

function angkaValid(v) {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;
}

/* Memeriksa bentuk satu anotasi. Dipakai juga untuk membuang data rusak. */
export function anotasiValid(a) {
  if (!a || typeof a !== 'object') return false;
  if (typeof a.id !== 'string' || !a.id) return false;
  if (!JENIS_ANOT.includes(a.jenis)) return false;
  if (!Number.isInteger(a.hal) || a.hal < 1) return false;
  if (typeof a.warna !== 'string') return false;
  switch (a.jenis) {
    case 'coret':
      return Array.isArray(a.pts) && a.pts.length >= 2 &&
        a.pts.every(p => p && angkaValid(p.x) && angkaValid(p.y));
    case 'sorot':
    case 'garis':
      return [a.x1, a.y1, a.x2, a.y2].every(angkaValid);
    case 'komentar':
      return angkaValid(a.x) && angkaValid(a.y) &&
        typeof a.teks === 'string' && a.teks.length > 0 && a.teks.length <= MAKS_TEKS_KOMENTAR;
  }
  return false;
}

/* Membuat anotasi baru. `data` berisi bagian khusus jenisnya:
   coret → pts; sorot/garis → x1,y1,x2,y2; komentar → x,y,teks. */
export function buatAnotasi(jenis, hal, data, sekarang = Date.now()) {
  if (!JENIS_ANOT.includes(jenis)) throw new Error('jenis anotasi tidak dikenal');
  const a = {
    id: 'a' + sekarang.toString(36) + Math.random().toString(36).slice(2, 7),
    jenis,
    hal,
    warna: WARNA_ANOT[jenis],
    ...data,
    dibuat: sekarang,
  };
  if (!anotasiValid(a)) throw new Error('data anotasi tidak valid');
  return a;
}

export function tambahAnotasi(daftar, a) {
  return [...daftar, a];
}

/* Anotasi milik satu halaman, sesuai urutan dibuat. */
export function anotasiHalaman(daftar, hal) {
  return daftar.filter(a => a.hal === hal);
}

/* Membatalkan anotasi TERAKHIR di halaman ini saja. */
export function batalTerakhirHalaman(daftar, hal) {
  for (let i = daftar.length - 1; i >= 0; i--) {
    if (daftar[i].hal === hal) return [...daftar.slice(0, i), ...daftar.slice(i + 1)];
  }
  return daftar;
}

/* Teks JSON yang disimpan. Versi disertakan untuk perubahan format nanti. */
export function tulisAnotasi(daftar) {
  return JSON.stringify({ versi: 1, anotasi: daftar });
}

/* Membaca teks JSON. Data rusak atau format tak dikenal menghasilkan [],
   dan entri yang bentuknya salah dibuang satu per satu. */
export function bacaAnotasi(teks) {
  let obj;
  try { obj = JSON.parse(teks); } catch { return []; }
  const daftar = obj && Array.isArray(obj.anotasi) ? obj.anotasi : null;
  if (!daftar) return [];
  return daftar.filter(anotasiValid);
}
