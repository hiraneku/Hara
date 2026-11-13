/* Susunan halaman PDF (B2): urutan tampilan di viewer — susun ulang, hapus,
   gandakan, dan sisipkan halaman kosong. Modul murni (tanpa DOM, tanpa IndexedDB).

   Model:
   • daftar = array entri berurutan. Entri { s: n } = halaman asli nomor n (1-based).
     Entri { k: 1 } = halaman kosong (tampil putih, ukurannya mengikuti halaman asli terdekat).
   • Berkas PDF asli TIDAK diubah. Susunan hanya berlaku di Hara.
   • Anotasi tetap menempel pada halaman asli (kunci hal = nomor asli). Halaman
     yang digandakan menampilkan anotasi yang sama di kedua salinannya.
   • Halaman yang dihapus dari susunan tidak dibuang datanya; "Kembalikan susunan asli"
     memunculkannya lagi.

   Posisi dihitung 1-based (sama dengan s.halaman di penampil). */

export const KUNCI_SUSUN_PREFIX = 'susun-';
export const kunciSusunan = blobId => KUNCI_SUSUN_PREFIX + blobId;

/* Urutan asli: 1..total. */
export function susunanAwal(total) {
  const n = Math.max(0, Math.floor(Number(total)) || 0);
  return Array.from({ length: n }, (_, i) => ({ s: i + 1 }));
}

const bilBulat = (v, lo, hi) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= lo && n <= hi ? n : null;
};

/* Baca teks tersimpan. Entri tidak valid dibuang. Bila tidak ada entri yang valid,
   kembali ke urutan asli. Tidak pernah mengembalikan daftar kosong. */
export function bacaSusunan(teks, total) {
  let raw = null;
  try { raw = JSON.parse(String(teks || '')); } catch { raw = null; }
  const daftar = Array.isArray(raw && raw.urut) ? raw.urut : [];
  const bersih = [];
  for (const e of daftar) {
    if (e && e.k === 1) { bersih.push({ k: 1 }); continue; }
    const n = e ? bilBulat(e.s, 1, total) : null;
    if (n !== null) bersih.push({ s: n });
  }
  return bersih.length ? bersih : susunanAwal(total);
}

export function tulisSusunan(daftar) {
  return JSON.stringify({ v: 1, urut: daftar.map(e => (e.k === 1 ? { k: 1 } : { s: e.s })) });
}

/* Nomor halaman asli di posisi `pos`, atau 0 bila kosong/di luar daftar. */
export function srcDi(daftar, pos) {
  const e = daftar[pos - 1];
  return e && e.s ? e.s : 0;
}

/* Posisi pertama halaman asli `src` di susunan, atau 0 bila tidak ada. */
export function posisiSrc(daftar, src) {
  const i = daftar.findIndex(e => e.s === src);
  return i < 0 ? 0 : i + 1;
}

/* Nomor halaman asli terdekat dari posisi `pos` (ke belakang dulu, lalu ke depan).
   Dipakai untuk ukuran halaman kosong. 0 bila susunan tidak punya halaman asli sama sekali. */
export function srcTerdekat(daftar, pos) {
  for (let i = Math.min(pos, daftar.length) - 1; i >= 0; i--) if (daftar[i].s) return daftar[i].s;
  for (let i = Math.max(pos, 1) - 1; i < daftar.length; i++) if (daftar[i].s) return daftar[i].s;
  return 0;
}

/* Pindahkan entri dari posisi `dari` ke posisi `ke` (keduanya 1-based, dijepit ke rentang). */
export function pindahPos(daftar, dari, ke) {
  const n = daftar.length;
  const a = Math.min(Math.max(1, dari), n);
  const b = Math.min(Math.max(1, ke), n);
  if (a === b) return daftar.slice();
  const salinan = daftar.slice();
  const [e] = salinan.splice(a - 1, 1);
  salinan.splice(b - 1, 0, e);
  return salinan;
}

/* Hapus entri di posisi `pos`. Minimal satu entri tetap ada: kembalikan daftar yang sama bila itu yang terakhir. */
export function hapusPos(daftar, pos) {
  if (daftar.length <= 1) return daftar.slice();
  return daftar.filter((_, i) => i !== pos - 1);
}

/* Gandakan entri di posisi `pos`; salinan dimasukkan tepat sesudahnya. */
export function gandakanPos(daftar, pos) {
  const e = daftar[pos - 1];
  if (!e) return daftar.slice();
  const salinan = daftar.slice();
  salinan.splice(pos, 0, e.k === 1 ? { k: 1 } : { s: e.s });
  return salinan;
}

/* Sisipkan halaman kosong sesudah posisi `pos` (0 = di awal). */
export function sisipKosongSetelah(daftar, pos) {
  const salinan = daftar.slice();
  salinan.splice(Math.min(Math.max(0, pos), daftar.length), 0, { k: 1 });
  return salinan;
}

/* true bila susunan sama dengan urutan asli 1..total (tanpa kosong, duplikat, atau urutan berbeda). */
export function asliUrut(daftar, total) {
  if (daftar.length !== total) return false;
  return daftar.every((e, i) => e.s === i + 1);
}
