/* Flashcard (C7, Tahap 4) — model dan antrean latihan, tanpa impor UI.

   Kartu: { id, depan, belakang, sumberId, sumberJudul, dibuat, benar, salah }
   • depan / belakang: teks biasa. Depan biasanya teks yang disorot di catatan.
   • sumberId / sumberJudul: catatan asal. Judul disalin supaya tetap terbaca bila catatan dihapus.
   • benar / salah: hitungan penilaian sederhana ("ingat" / "belum") dari latihan.

   Versi pertama memakai antrean berurutan tanpa penjadwalan (§2.7: spaced repetition ditunda). */

export const MAKS_SISI = 2000;   /* karakter per sisi kartu */

const teksAman = v => (typeof v === 'string' ? v : '').slice(0, MAKS_SISI);

/* Kartu baru dari isian formulir. Mengembalikan { ok: true, kartu } atau { ok: false, alasan }. */
export function buatKartu({ depan, belakang, sumberId = null, sumberJudul = '', id, sekarang = Date.now() }) {
  const d = String(depan || '').replace(/\s+/g, ' ').trim();
  const b = String(belakang || '').replace(/\s+/g, ' ').trim();
  if (!d) return { ok: false, alasan: 'depan-kosong' };
  if (!b) return { ok: false, alasan: 'belakang-kosong' };
  if (d.length > MAKS_SISI || b.length > MAKS_SISI) return { ok: false, alasan: 'terlalu-panjang' };
  return {
    ok: true,
    kartu: {
      id: id || 'k' + sekarang.toString(36) + Math.random().toString(36).slice(2, 7),
      depan: d,
      belakang: b,
      sumberId: typeof sumberId === 'string' ? sumberId : null,
      sumberJudul: String(sumberJudul || '').slice(0, 300),
      dibuat: sekarang,
      benar: 0,
      salah: 0,
    },
  };
}

/* Membaca daftar kartu dari penyimpanan atau cadangan. Entri rusak dibuang, bukan dilempar,
   supaya satu kartu buruk tidak menghilangkan yang lain. */
export function normalizeKartu(daftar) {
  if (!Array.isArray(daftar)) return [];
  const hasil = [];
  const dilihat = new Set();
  for (const k of daftar) {
    if (!k || typeof k !== 'object') continue;
    if (typeof k.id !== 'string' || !k.id || dilihat.has(k.id)) continue;
    const depan = teksAman(k.depan).trim();
    const belakang = teksAman(k.belakang).trim();
    if (!depan || !belakang) continue;
    dilihat.add(k.id);
    hasil.push({
      id: k.id,
      depan,
      belakang,
      sumberId: typeof k.sumberId === 'string' ? k.sumberId : null,
      sumberJudul: String(k.sumberJudul || '').slice(0, 300),
      dibuat: Number.isFinite(k.dibuat) ? k.dibuat : 0,
      benar: Number.isInteger(k.benar) && k.benar > 0 ? k.benar : 0,
      salah: Number.isInteger(k.salah) && k.salah > 0 ? k.salah : 0,
    });
  }
  return hasil;
}

/* Mencatat hasil satu kali latihan pada kartu. nilai: 'ingat' | 'belum'. Mengubah kartu di tempat. */
export function catatNilai(kartu, nilai) {
  if (nilai === 'ingat') kartu.benar++;
  else if (nilai === 'belum') kartu.salah++;
  return kartu;
}

/* Antrean latihan: urutan kartu tertua dulu. Hanya id yang disimpan. */
export function antrianAwal(daftar) {
  return [...daftar].sort((a, b) => (a.dibuat - b.dibuat) || (a.id < b.id ? -1 : 1)).map(k => k.id);
}

/* Satu langkah latihan. 'ingat' menghapus kartu dari antrean. 'belum' memindahkannya ke belakang,
   supaya kartu yang belum dikuasai muncul lagi dalam sesi yang sama.
   Mengembalikan antrean baru (tidak mengubah yang lama). */
export function langkahAntrean(antrean, id, nilai) {
  const sisa = antrean.filter(x => x !== id);
  if (nilai === 'belum' && antrean.includes(id)) sisa.push(id);
  return sisa;
}

/* Ringkasan sesi: berapa "ingat" dan "belum" selama sesi (bukan total sepanjang waktu). */
export function ringkasSesi(sesi) {
  return { ingat: sesi.ingat || 0, belum: sesi.belum || 0 };
}
