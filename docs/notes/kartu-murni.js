/* Flashcard C7 + N1: model deterministik untuk latihan kartu terjadwal.
   Tidak memakai AI atau jaringan. Kartu lama tetap dinormalisasi; jadwal awalnya
   langsung jatuh tempo agar tidak ada kartu yang hilang dari antrean setelah migrasi. */

export const MAKS_SISI = 2000;
export const MAKS_INTERVAL_HARI = 3650;
export const JEDA_AGAIN_MS = 10 * 60 * 1000;
const teksAman = v => (typeof v === 'string' ? v : '').slice(0, MAKS_SISI);
const angka = (v, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d;
const bulatRentang = (v, min, max, d) => Math.max(min, Math.min(max, Math.round(angka(v, d))));

const jadwalAwal = (sekarang = Date.now()) => ({
  dueAt: sekarang,
  lastReviewed: 0,
  intervalDays: 0,
  ease: 2.5,
  repetitions: 0,
  lapses: 0,
});

export function buatKartu({ depan, belakang, sumberId = null, sumberJudul = '', id, sekarang = Date.now() }) {
  const d = String(depan || '').replace(/\s+/g, ' ').trim();
  const b = String(belakang || '').replace(/\s+/g, ' ').trim();
  if (!d) return { ok: false, alasan: 'depan-kosong' };
  if (!b) return { ok: false, alasan: 'belakang-kosong' };
  if (d.length > MAKS_SISI || b.length > MAKS_SISI) return { ok: false, alasan: 'terlalu-panjang' };
  return { ok: true, kartu: {
    id: id || 'k' + sekarang.toString(36) + Math.random().toString(36).slice(2, 7),
    depan: d, belakang: b,
    sumberId: typeof sumberId === 'string' ? sumberId : null,
    sumberJudul: String(sumberJudul || '').slice(0, 300),
    dibuat: sekarang, benar: 0, salah: 0,
    ...jadwalAwal(sekarang),
  } };
}

export function normalizeKartu(daftar) {
  if (!Array.isArray(daftar)) return [];
  const hasil = [], dilihat = new Set();
  for (const k of daftar) {
    if (!k || typeof k !== 'object' || typeof k.id !== 'string' || !k.id || dilihat.has(k.id)) continue;
    const depan = teksAman(k.depan).trim(), belakang = teksAman(k.belakang).trim();
    if (!depan || !belakang) continue;
    dilihat.add(k.id);
    const dibuat = Number.isFinite(k.dibuat) ? k.dibuat : 0;
    const intervalDays = Math.max(0, Math.min(MAKS_INTERVAL_HARI, angka(k.intervalDays, 0)));
    const ease = Math.max(1.3, Math.min(3.2, angka(k.ease, 2.5)));
    const repetitions = bulatRentang(k.repetitions, 0, 100000, 0);
    const lapses = bulatRentang(k.lapses, 0, 100000, 0);
    hasil.push({
      id: k.id, depan, belakang,
      sumberId: typeof k.sumberId === 'string' ? k.sumberId : null,
      sumberJudul: String(k.sumberJudul || '').slice(0, 300),
      dibuat,
      benar: Number.isInteger(k.benar) && k.benar > 0 ? k.benar : 0,
      salah: Number.isInteger(k.salah) && k.salah > 0 ? k.salah : 0,
      dueAt: Number.isFinite(k.dueAt) && k.dueAt >= 0 ? k.dueAt : dibuat,
      lastReviewed: Number.isFinite(k.lastReviewed) && k.lastReviewed >= 0 ? k.lastReviewed : 0,
      intervalDays, ease, repetitions, lapses,
    });
  }
  return hasil;
}

export function kartuJatuhTempo(kartu, sekarang = Date.now()) {
  return (Array.isArray(kartu) ? kartu : []).filter(k => !Number.isFinite(k.dueAt) || k.dueAt <= sekarang);
}

export function kartuBerikutnya(daftar, sekarang = Date.now()) {
  return (Array.isArray(daftar) ? daftar : [])
    .filter(k => Number.isFinite(k.dueAt) && k.dueAt > sekarang)
    .reduce((min, k) => Math.min(min, k.dueAt), Infinity);
}

/* Antrian sesi terjadwal: jatuh tempo lebih awal dahulu, ikatan stabil dengan id. */
export function antrianAwal(daftar, sekarang = Date.now()) {
  return kartuJatuhTempo(daftar, sekarang)
    .slice().sort((a, b) => (a.dueAt || a.dibuat || 0) - (b.dueAt || b.dibuat || 0)
      || (a.dibuat - b.dibuat) || (a.id < b.id ? -1 : 1)).map(k => k.id);
}

/* Penjadwalan SM-2 deterministik. Alias 'ingat'/'belum' menjaga kompatibilitas C7. */
export function catatNilai(kartu, nilai, sekarang = Date.now()) {
  if (!kartu || typeof kartu !== 'object') return kartu;
  const rating = nilai === 'ingat' ? 'good' : nilai === 'belum' ? 'again' : nilai;
  if (!['again', 'hard', 'good', 'easy'].includes(rating)) return kartu;

  const reps = Math.max(0, bulatRentang(kartu.repetitions, 0, 100000, 0));
  let interval = Math.max(0, angka(kartu.intervalDays, 0));
  let ease = Math.max(1.3, Math.min(3.2, angka(kartu.ease, 2.5)));
  if (rating === 'again') {
    kartu.salah = Math.max(0, Number(kartu.salah) || 0) + 1;
    kartu.lapses = Math.max(0, Number(kartu.lapses) || 0) + 1;
    kartu.repetitions = 0;
    kartu.intervalDays = 0;
    kartu.ease = Math.max(1.3, ease - 0.2);
    kartu.dueAt = sekarang + JEDA_AGAIN_MS;
  } else {
    kartu.benar = Math.max(0, Number(kartu.benar) || 0) + 1;
    if (rating === 'hard') {
      interval = reps === 0 ? 1 : Math.max(1, interval * 1.2);
      ease = Math.max(1.3, ease - 0.15);
    } else if (rating === 'good') {
      interval = reps === 0 ? 1 : reps === 1 ? 3 : Math.max(1, interval * ease);
    } else {
      interval = reps === 0 ? 4 : Math.max(4, interval * (ease + 0.3));
      ease = Math.min(3.2, ease + 0.15);
    }
    kartu.repetitions = reps + 1;
    kartu.intervalDays = Math.min(MAKS_INTERVAL_HARI, Math.max(1, Math.round(interval)));
    kartu.ease = ease;
    kartu.dueAt = sekarang + kartu.intervalDays * 86400000;
  }
  kartu.lastReviewed = sekarang;
  return kartu;
}

/* Kartu yang gagal sekali boleh muncul lagi di akhir sesi; gagal berulang
   tidak membuat antrean tak berujung. Pengendalian satu-pengulangan ada di UI. */
export function langkahAntrean(antrean, id, nilai) {
  const sisa = (antrean || []).filter(x => x !== id);
  if ((nilai === 'belum' || nilai === 'again') && (antrean || []).includes(id)) sisa.push(id);
  return sisa;
}

/* Kontrak lama dipakai ujian ruang: pertahankan tepat dua properti. */
export function ringkasSesi(sesi) {
  return { ingat: sesi?.ingat || 0, belum: sesi?.belum || 0 };
}

/* Ringkasan detail khusus jadwal kartu ingatan. */
export function ringkasLatihanKartu(sesi) {
  return {
    lagi: sesi?.lagi || 0,
    sulit: sesi?.sulit || 0,
    baik: sesi?.baik || 0,
    mudah: sesi?.mudah || 0,
  };
}
