/* Ruang (folder) — rencana pemulihan dari cadangan (D1), model murni tanpa DOM dan tanpa localStorage.

   • timpa : daftar lokal diganti persis dengan daftar cadangan (id dan nama).
   • gabung: id yang sudah ada dibiarkan; id yang belum ada tetapi namanya sama (tanpa membedakan huruf)
             dengan ruang lokal diarahkan ke ruang lokal itu; selain itu ruang ditambahkan dengan id cadangan.

   Mengembalikan { daftar, peta }: daftar ruang final dan peta idCadangan -> idFinal untuk catatan. */

const MAKS_NAMA_RUANG = 32;

function bersihkan(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter(r => r && typeof r.id === 'string' && r.id && r.nama && String(r.nama).trim())
    .map(r => ({ id: r.id, nama: String(r.nama).trim().slice(0, MAKS_NAMA_RUANG) }));
}

export function rencanaPulihRuang(lokalMentah, cadanganMentah, mode) {
  const peta = new Map();
  const cadangan = bersihkan(cadanganMentah);
  if (!cadangan.length) return { daftar: bersihkan(lokalMentah), peta };

  if (mode === 'timpa') {
    cadangan.forEach(r => peta.set(r.id, r.id));
    return { daftar: cadangan, peta };
  }

  const daftar = bersihkan(lokalMentah);
  const idLokal = new Set(daftar.map(r => r.id));
  for (const r of cadangan) {
    if (idLokal.has(r.id)) { peta.set(r.id, r.id); continue; }
    const sama = daftar.find(x => x.nama.toLowerCase() === r.nama.toLowerCase());
    if (sama) { peta.set(r.id, sama.id); continue; }
    daftar.push({ id: r.id, nama: r.nama });
    idLokal.add(r.id);
    peta.set(r.id, r.id);
  }
  return { daftar, peta };
}
