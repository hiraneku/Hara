/* Daftar putar pintar berbasis aturan. Menyimpan aturan, bukan salinan lagu;
   hasil selalu dihitung ulang dari pustaka dan tidak mengubah lagu sumber. */
const KUNCI = 'hara.v1.musik.pintar';
const SORT = ['nama', 'baru', 'sering', 'durasi'];
function baca() {
  try {
    const x = JSON.parse(localStorage.getItem(KUNCI) || '[]');
    return Array.isArray(x) ? x.filter(a => a && typeof a.id === 'string' && typeof a.nama === 'string') : [];
  } catch { return []; }
}
function simpan(x) { try { localStorage.setItem(KUNCI, JSON.stringify(x)); } catch {} }
export function normalisasiAturan(raw = {}) {
  const hari = Number(raw.dalamHari);
  const minDetik = Number(raw.minDetik);
  return {
    favorit: !!raw.favorit,
    artis: String(raw.artis || '').trim().slice(0, 80),
    dalamHari: Number.isFinite(hari) && hari > 0 ? Math.min(3650, Math.round(hari)) : 0,
    minDetik: Number.isFinite(minDetik) && minDetik > 0 ? Math.min(86400, minDetik) : 0,
    sort: SORT.includes(raw.sort) ? raw.sort : 'nama',
  };
}
export function semuaPintar() { return baca().map(x => ({ ...x, aturan: normalisasiAturan(x.aturan) })); }
export function buatPintar(nama, aturan) {
  const n = String(nama || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  if (!n) return null;
  const daftar = baca();
  const id = `sp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  daftar.push({ id, nama: n, aturan: normalisasiAturan(aturan) });
  simpan(daftar);
  return id;
}
export function hapusPintar(id) { simpan(baca().filter(x => x.id !== id)); }
export function laguPintar(definisi, lagu, sekarang = Date.now(), playCount = () => 0) {
  const r = normalisasiAturan(definisi?.aturan || definisi);
  const hasil = (Array.isArray(lagu) ? lagu : []).filter(x => {
    if (r.favorit && !x.favorit) return false;
    if (r.artis && !String(x.artis || '').toLocaleLowerCase().includes(r.artis.toLocaleLowerCase())) return false;
    if (r.dalamHari && (sekarang - Number(x.ditambahkan || 0)) > r.dalamHari * 86400000) return false;
    if (r.minDetik && Number(x.durasi || 0) < r.minDetik) return false;
    return true;
  });
  const compare = {
    nama: (a, b) => String(a.nama).localeCompare(String(b.nama)),
    baru: (a, b) => Number(b.ditambahkan || 0) - Number(a.ditambahkan || 0),
    sering: (a, b) => playCount(b.id) - playCount(a.id),
    durasi: (a, b) => Number(b.durasi || 0) - Number(a.durasi || 0),
  }[r.sort];
  return hasil.sort(compare);
}
export const teksAturan = raw => {
  const r = normalisasiAturan(raw);
  const bagian = [];
  if (r.favorit) bagian.push('hanya favorit');
  if (r.artis) bagian.push(`artis memuat “${r.artis}”`);
  if (r.dalamHari) bagian.push(`ditambahkan ${r.dalamHari} hari terakhir`);
  if (r.minDetik) bagian.push(`durasi ≥ ${Math.floor(r.minDetik / 60)} menit`);
  bagian.push(`urut ${r.sort}`);
  return bagian.join(' · ');
};
