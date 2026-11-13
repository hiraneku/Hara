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
    .map(r => ({ id: r.id, nama: String(r.nama).trim().slice(0, MAKS_NAMA_RUANG), ...(typeof r.parentId === 'string' && r.parentId ? { parentId: r.parentId } : {}) }));
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
  const tertunda = cadangan.slice();
  /* Urut topologis dulu agar perbandingan nama dibatasi ke notebook induk yang sama. */
  for (let putaran = 0; tertunda.length && putaran <= cadangan.length; putaran++) {
    let maju = false;
    for (let i = tertunda.length - 1; i >= 0; i--) {
      const r = tertunda[i];
      if (r.parentId && !peta.has(r.parentId) && cadangan.some(x => x.id === r.parentId)) continue;
      const induk = r.parentId ? peta.get(r.parentId) || null : null;
      if (idLokal.has(r.id)) { peta.set(r.id, r.id); }
      else {
        const sama = daftar.find(x => x.nama.toLowerCase() === r.nama.toLowerCase()
          && (x.parentId || null) === induk);
        if (sama) peta.set(r.id, sama.id);
        else {
          daftar.push({ id: r.id, nama: r.nama, ...(induk ? { parentId: induk } : {}) });
          idLokal.add(r.id); peta.set(r.id, r.id);
        }
      }
      tertunda.splice(i, 1); maju = true;
    }
    if (!maju) break;
  }
  /* Parent hilang/siklus: simpan ruang sebagai akar supaya tidak membuang catatan. */
  for (const r of tertunda) {
    if (idLokal.has(r.id)) peta.set(r.id, r.id);
    else {
      const sama = daftar.find(x => x.nama.toLowerCase() === r.nama.toLowerCase() && !x.parentId);
      if (sama) peta.set(r.id, sama.id);
      else { daftar.push({ id: r.id, nama: r.nama }); idLokal.add(r.id); peta.set(r.id, r.id); }
    }
  }
  return { daftar, peta };
}
