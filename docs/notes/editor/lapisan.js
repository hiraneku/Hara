/**
 * Lapisan sketsa (Tahap 1 · A5).
 *
 * Lapisan mengelompokkan goresan dan objek visual secara logis (§1.2 dokumen koreksi):
 * bukan satu lapisan per objek. Lapisan bisa disembunyikan, dikunci, dan diurutkan.
 * Objek tetap bisa dipilih dan diedit satu per satu.
 *
 * Urutan array = urutan tumpukan (akhir = paling atas). Modul ini murni logika tanpa DOM.
 */

export const BATAS_LAPISAN = 8;
export const ID_LAPISAN_DASAR = 'dasar';
const RE_ID_LAPISAN = /^[A-Za-z0-9_-]{1,24}$/;

/** Satu lapisan bawaan. Dipakai untuk sketsa baru dan data lama (v1 sampai v4). */
export function lapisanAwal() {
  return [{ id: ID_LAPISAN_DASAR, nama: 'Dasar', tampil: true, kunci: false }];
}

/** Bersihkan daftar lapisan dari data. Id ganda dan tidak valid dibuang. Hasil tidak pernah kosong. */
export function bersihkanLapisan(list) {
  if (!Array.isArray(list)) return lapisanAwal();
  const hasil = [];
  const ada = new Set();
  for (const l of list.slice(0, BATAS_LAPISAN)) {
    if (!l || typeof l !== 'object') continue;
    if (typeof l.id !== 'string' || !RE_ID_LAPISAN.test(l.id) || ada.has(l.id)) continue;
    ada.add(l.id);
    const nama = typeof l.nama === 'string' ? l.nama.trim().slice(0, 24) : '';
    hasil.push({ id: l.id, nama: nama || 'Lapisan', tampil: l.tampil !== false, kunci: l.kunci === true });
  }
  return hasil.length ? hasil : lapisanAwal();
}

/** Id lapisan yang valid. Id yang tidak dikenal jatuh ke lapisan paling bawah. */
export function idLapisanValid(list, id) {
  return list.some(l => l.id === id) ? id : list[0].id;
}

/** Lapisan boleh diedit bila tampil dan tidak dikunci. */
export function bisaDiedit(list, id) {
  const l = list.find(x => x.id === id);
  return !!l && l.tampil && !l.kunci;
}

function idBaru(list) {
  let id;
  do {
    id = 'l' + Math.random().toString(36).slice(2, 8);
  } while (list.some(l => l.id === id));
  return id;
}

function namaBaru(list) {
  const pakai = new Set(list.map(l => l.nama));
  let n = 2;
  while (pakai.has('Lapisan ' + n)) n++;
  return 'Lapisan ' + n;
}

/** Tambah lapisan di atas tumpukan. Hasil { ok, list, id } atau { ok: false, alasan }. */
export function tambahLapisan(list) {
  if (list.length >= BATAS_LAPISAN) return { ok: false, alasan: 'penuh' };
  const id = idBaru(list);
  return { ok: true, id, list: [...list, { id, nama: namaBaru(list), tampil: true, kunci: false }] };
}

/** Hapus lapisan. Lapisan yang masih berisi tidak dihapus, dan lapisan terakhir tidak bisa dihapus. */
export function hapusLapisan(list, id, jumlahIsi) {
  if (list.length <= 1) return { ok: false, alasan: 'terakhir' };
  if (!list.some(l => l.id === id)) return { ok: false, alasan: 'tidak-ada' };
  if (jumlahIsi > 0) return { ok: false, alasan: 'berisi' };
  return { ok: true, list: list.filter(l => l.id !== id) };
}

/** Pindahkan lapisan satu langkah. arah = -1 (ke bawah) atau 1 (ke atas). */
export function pindahLapisan(list, id, arah) {
  const i = list.findIndex(l => l.id === id);
  if (i < 0) return { ok: false, alasan: 'tidak-ada' };
  const j = i + (arah < 0 ? -1 : 1);
  if (j < 0 || j >= list.length) return { ok: false, alasan: 'tepi' };
  const hasil = list.slice();
  [hasil[i], hasil[j]] = [hasil[j], hasil[i]];
  return { ok: true, list: hasil };
}

/**
 * Urutan gambar untuk item yang punya field lapisan: lapisan dari bawah ke atas,
 * lapisan tersembunyi dilewati, dan urutan asli di dalam satu lapisan dipertahankan.
 */
export function urutanGambar(list, items) {
  const hasil = [];
  for (const l of list) {
    if (!l.tampil) continue;
    for (const it of items) if (it.lapisan === l.id) hasil.push(it);
  }
  return hasil;
}

/**
 * Urutan render untuk sketsa: per lapisan dari bawah, objek dulu (A2: objek di bawah goresan
 * dalam satu lapisan), lalu goresan. Lapisan tersembunyi tidak dirender. Hasil { tipe, item }.
 */
export function urutanRender(list, objek, jejak) {
  const hasil = [];
  for (const l of list) {
    if (!l.tampil) continue;
    for (const o of objek) if (o.lapisan === l.id) hasil.push({ tipe: 'objek', item: o });
    for (const st of jejak) if (st.lapisan === l.id) hasil.push({ tipe: 'goresan', item: st });
  }
  return hasil;
}
