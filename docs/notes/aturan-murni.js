/* Mesin aturan N7: evaluasi dan rencana perubahan murni. Tidak menulis data,
   sehingga UI dapat menampilkan pratinjau dan meminta konfirmasi sebelum aksi. */

const salin = x => JSON.parse(JSON.stringify(x));
const norm = x => String(x ?? '').trim().toLocaleLowerCase();

export function normalisasiAturan(list) {
  if (!Array.isArray(list)) return [];
  return list.filter(x => x && typeof x.id === 'string' && x.id && typeof x.nama === 'string' && x.nama.trim() && x.kondisi && typeof x.kondisi === 'object' && x.aksi && ['tambah-tag', 'atur-properti', 'sematkan', 'arsipkan', 'pindah-ruang'].includes(x.aksi.tipe))
    .slice(0, 100).map(x => ({
      id: x.id, nama: x.nama.slice(0, 80), aktif: x.aktif !== false,
      pemicu: ['simpan', 'tugas-selesai', 'manual'].includes(x.pemicu) ? x.pemicu : 'simpan',
      kondisi: salin(x.kondisi), aksi: salin(x.aksi),
    }));
}

export function semuaTugasSelesai(note) {
  const todo = (note?.blocks || []).filter(b => b?.type === 'todo');
  return todo.length > 0 && todo.every(b => b.meta?.checked === true || b.meta?.done > 0);
}

export function cocokAturan(note, kondisi = {}) {
  if (!note || note.deletedAt) return false;
  if (kondisi.tag && !((note.tags || []).some(t => norm(t) === norm(kondisi.tag)))) return false;
  if (kondisi.titleIncludes && !norm(note.title).includes(norm(kondisi.titleIncludes))) return false;
  if (kondisi.property) {
    const { k, v } = kondisi.property;
    if (!(note.props || []).some(p => norm(p.k) === norm(k) && norm(p.v) === norm(v))) return false;
  }
  if (typeof kondisi.pinned === 'boolean' && !!note.pinned !== kondisi.pinned) return false;
  if (typeof kondisi.archived === 'boolean' && !!note.archived !== kondisi.archived) return false;
  if (kondisi.semuaTugasSelesai && !semuaTugasSelesai(note)) return false;
  return true;
}

export function terapkanAksiAturan(note, aksi) {
  const n = salin(note);
  if (!aksi || !aksi.tipe) throw new Error('Aksi aturan tidak dikenal.');
  if (aksi.tipe === 'tambah-tag') {
    const tag = String(aksi.tag || '').trim().slice(0, 64);
    if (!tag) throw new Error('Tag aturan kosong.');
    n.tagsManual = [...new Set([...(n.tagsManual || []), tag])];
    n.tags = [...new Set([...(n.tags || []), tag])];
  } else if (aksi.tipe === 'atur-properti') {
    const k = String(aksi.kunci || '').trim().slice(0, 80), v = String(aksi.nilai ?? '').slice(0, 500);
    if (!k) throw new Error('Nama properti aturan kosong.');
    const props = Array.isArray(n.props) ? n.props : [];
    const i = props.findIndex(p => norm(p.k) === norm(k));
    if (i < 0) props.push({ k, v }); else props[i] = { ...props[i], k, v };
    n.props = props;
  } else if (aksi.tipe === 'sematkan') n.pinned = aksi.nilai !== false;
  else if (aksi.tipe === 'arsipkan') n.archived = aksi.nilai !== false;
  else if (aksi.tipe === 'pindah-ruang') n.folderId = aksi.ruangId || null;
  else throw new Error('Aksi aturan tidak dikenal.');
  return n;
}

export function pratinjauAturan(rules, notes, { waktu = Date.now(), pemicu = 'simpan' } = {}) {
  const awal = new Map((Array.isArray(notes) ? notes : []).filter(n => n?.id).map(n => [n.id, salin(n)]));
  const kini = new Map([...awal].map(([id, n]) => [id, salin(n)]));
  const dipicu = new Map();
  for (const r of normalisasiAturan(rules)) {
    if (!r.aktif || r.pemicu !== pemicu) continue;
    for (const [id, note] of kini) {
      if (!cocokAturan(note, r.kondisi)) continue;
      const sesudah = terapkanAksiAturan(note, r.aksi);
      if (JSON.stringify(note) === JSON.stringify(sesudah)) continue;
      kini.set(id, sesudah);
      if (!dipicu.has(id)) dipicu.set(id, []);
      dipicu.get(id).push({ id: r.id, nama: r.nama });
    }
  }
  const perubahan = [];
  for (const [id, sesudah] of kini) {
    if (!dipicu.has(id)) continue;
    sesudah.updatedAt = waktu;
    perubahan.push({ noteId: id, aturan: dipicu.get(id), sebelum: awal.get(id), sesudah });
  }
  return perubahan;
}

export function terapkanPratinjau(notes, perubahan) {
  const map = new Map((Array.isArray(notes) ? notes : []).map(n => [n.id, n]));
  for (const p of perubahan || []) {
    const sekarang = map.get(p.noteId);
    if (!sekarang || JSON.stringify(sekarang) !== JSON.stringify(p.sebelum)) throw new Error(`Catatan ${p.noteId} berubah setelah pratinjau; buat pratinjau baru.`);
    map.set(p.noteId, salin(p.sesudah));
  }
  return [...map.values()];
}

/* Urungkan hanya bila catatan masih sama persis dengan hasil aksi. Jika sudah
   disunting lagi, jangan pernah menimpa suntingan terbaru secara diam-diam. */
export function urungkanAturan(notes, perubahan) {
  const map = new Map((Array.isArray(notes) ? notes : []).map(n => [n.id, n]));
  for (const p of [...(perubahan || [])].reverse()) {
    const sekarang = map.get(p.noteId);
    if (!sekarang || JSON.stringify(sekarang) !== JSON.stringify(p.sesudah)) return { berhasil: false, notes: [...map.values()], noteId: p.noteId };
    map.set(p.noteId, salin(p.sebelum));
  }
  return { berhasil: true, notes: [...map.values()] };
}
