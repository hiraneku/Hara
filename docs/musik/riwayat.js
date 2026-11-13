/* Riwayat lokal pemutaran; bisa dimatikan dan dihapus pengguna kapan saja. */
const KUNCI = 'hara.v1.musik.riwayat';
const MAKS = 200;
let cache;
function muat() {
  if (cache) return cache;
  try {
    const x = JSON.parse(localStorage.getItem(KUNCI) || 'null');
    cache = { aktif: x?.aktif !== false, entri: Array.isArray(x?.entri) ? x.entri.filter(e => e && typeof e.id === 'string').slice(-MAKS) : [] };
  } catch { cache = { aktif: true, entri: [] }; }
  return cache;
}
function simpan() { try { localStorage.setItem(KUNCI, JSON.stringify(muat())); } catch {} }
export const riwayatAktif = () => muat().aktif;
export const ambilRiwayat = () => muat().entri.slice().reverse();
export function catatPutar(id, waktu = Date.now()) {
  const x = muat();
  if (!x.aktif || typeof id !== 'string') return false;
  const terakhir = x.entri.at(-1);
  if (terakhir?.id === id && waktu - terakhir.waktu < 15000) return false;
  x.entri.push({ id, waktu });
  if (x.entri.length > MAKS) x.entri.splice(0, x.entri.length - MAKS);
  simpan();
  return true;
}
export function aturRiwayatAktif(aktif) { muat().aktif = !!aktif; simpan(); }
export function hapusRiwayat() { muat().entri = []; simpan(); }
export function statistikRiwayat() {
  const hitung = new Map();
  for (const e of muat().entri) hitung.set(e.id, (hitung.get(e.id) || 0) + 1);
  return { total: muat().entri.length, lagu: hitung.size, hitung };
}
