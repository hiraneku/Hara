/* Persiapan ujian (C8, Tahap 4) — model murni, tanpa impor UI.

   Ruang ujian: wadah belajar yang berisi
     • materi  : catatan pengguna yang dipilih sebagai bahan (judul disalin, supaya tetap terbaca bila catatan dihapus);
     • soal    : pertanyaan dan jawaban yang disusun pengguna sendiri.
   Latihan mengingat memakai antrean yang sama dengan flashcard (C7): berurutan dari soal tertua,
   "Belum" diantrekan lagi di akhir sesi. Tanpa spaced repetition (§2.7 ditunda).

   Versi awal sengaja tidak memuat layer, tape, atau bank soal bawaan (acuan §1.9). Materi bawaan bukan syarat. */

import { antrianAwal, langkahAntrean, ringkasSesi } from './kartu-murni.js?v=20261029220000';

export const MAKS_NAMA = 120;     /* karakter, nama ruang */
export const MAKS_TEKS = 2000;    /* karakter per sisi soal */
export const MAKS_MATERI = 200;   /* jumlah catatan materi per ruang */
export const MAKS_SOAL = 1000;    /* jumlah soal per ruang */

const pangkas = v => (typeof v === 'string' ? v : '').trim();
const bilangan = v => (Number.isInteger(v) && v > 0 ? v : 0);

/* Ruang baru dari isian formulir. Mengembalikan { ok: true, ruang } atau { ok: false, alasan }. */
export function buatRuang({ nama, id, sekarang = Date.now() }) {
  const n = pangkas(nama).slice(0, MAKS_NAMA);
  if (!n) return { ok: false, alasan: 'nama-kosong' };
  return {
    ok: true,
    ruang: {
      id: id || 'u' + sekarang.toString(36) + Math.random().toString(36).slice(2, 7),
      nama: n,
      dibuat: sekarang,
      materi: [],
      soal: [],
    },
  };
}

/* Soal baru. Pertanyaan dan jawaban wajib, dipangkas, maksimal MAKS_TEKS karakter per sisi. */
export function buatSoal({ pertanyaan, jawaban, sumberId = null, sumberJudul = '', id, sekarang = Date.now() }) {
  const p = pangkas(pertanyaan);
  const j = pangkas(jawaban);
  if (!p) return { ok: false, alasan: 'pertanyaan-kosong' };
  if (!j) return { ok: false, alasan: 'jawaban-kosong' };
  if (p.length > MAKS_TEKS || j.length > MAKS_TEKS) return { ok: false, alasan: 'terlalu-panjang' };
  return {
    ok: true,
    soal: {
      id: id || 's' + sekarang.toString(36) + Math.random().toString(36).slice(2, 7),
      pertanyaan: p,
      jawaban: j,
      sumberId: typeof sumberId === 'string' ? sumberId : null,
      sumberJudul: String(sumberJudul || '').slice(0, 300),
      dibuat: sekarang,
      benar: 0,
      salah: 0,
    },
  };
}

/* Membaca daftar ruang dari penyimpanan atau cadangan. Entri rusak dibuang, bukan dilempar. */
export function normalizeUjian(daftar) {
  if (!Array.isArray(daftar)) return [];
  const hasil = [];
  const dilihat = new Set();
  for (const r of daftar) {
    if (!r || typeof r !== 'object') continue;
    if (typeof r.id !== 'string' || !r.id || dilihat.has(r.id)) continue;
    const nama = pangkas(r.nama).slice(0, MAKS_NAMA);
    if (!nama) continue;
    dilihat.add(r.id);

    const materi = [];
    const materiDilihat = new Set();
    for (const m of Array.isArray(r.materi) ? r.materi : []) {
      if (!m || typeof m.id !== 'string' || !m.id || materiDilihat.has(m.id)) continue;
      materiDilihat.add(m.id);
      materi.push({ id: m.id, judul: String(m.judul || '').slice(0, 300) });
      if (materi.length >= MAKS_MATERI) break;
    }

    const soal = [];
    const soalDilihat = new Set();
    for (const s of Array.isArray(r.soal) ? r.soal : []) {
      if (!s || typeof s !== 'object') continue;
      if (typeof s.id !== 'string' || !s.id || soalDilihat.has(s.id)) continue;
      const p = pangkas(s.pertanyaan).slice(0, MAKS_TEKS);
      const j = pangkas(s.jawaban).slice(0, MAKS_TEKS);
      if (!p || !j) continue;
      soalDilihat.add(s.id);
      soal.push({
        id: s.id,
        pertanyaan: p,
        jawaban: j,
        sumberId: typeof s.sumberId === 'string' ? s.sumberId : null,
        sumberJudul: String(s.sumberJudul || '').slice(0, 300),
        dibuat: Number.isFinite(s.dibuat) ? s.dibuat : 0,
        benar: bilangan(s.benar),
        salah: bilangan(s.salah),
      });
      if (soal.length >= MAKS_SOAL) break;
    }

    hasil.push({
      id: r.id,
      nama,
      dibuat: Number.isFinite(r.dibuat) ? r.dibuat : 0,
      materi,
      soal,
    });
  }
  return hasil;
}

/* Tambah catatan sebagai materi. Mengembalikan { ok, alasan? }. Mengubah ruang di tempat. */
export function tambahMateri(ruang, { id, judul }) {
  if (typeof id !== 'string' || !id) return { ok: false, alasan: 'catatan-tidak-valid' };
  if (ruang.materi.some(m => m.id === id)) return { ok: false, alasan: 'sudah-ada' };
  if (ruang.materi.length >= MAKS_MATERI) return { ok: false, alasan: 'terlalu-banyak' };
  ruang.materi.push({ id, judul: String(judul || '').slice(0, 300) });
  return { ok: true };
}

export function keluarkanMateri(ruang, id) {
  const sebelum = ruang.materi.length;
  ruang.materi = ruang.materi.filter(m => m.id !== id);
  return ruang.materi.length !== sebelum;
}

/* Tambah soal ke ruang. Mengembalikan { ok, soal? , alasan? }. Mengubah ruang di tempat. */
export function tambahSoal(ruang, isian) {
  if (ruang.soal.length >= MAKS_SOAL) return { ok: false, alasan: 'terlalu-banyak' };
  const hasil = buatSoal(isian);
  if (!hasil.ok) return hasil;
  ruang.soal.push(hasil.soal);
  return { ok: true, soal: hasil.soal };
}

/* Hapus soal. Mengembalikan soal yang dihapus (untuk Urungkan), atau null bila tidak ada. */
export function hapusSoal(ruang, id) {
  const i = ruang.soal.findIndex(s => s.id === id);
  if (i < 0) return null;
  return ruang.soal.splice(i, 1)[0];
}

/* Catat satu jawaban latihan pada soal. nilai: 'ingat' | 'belum'. Mengubah soal di tempat. */
export function catatNilaiSoal(soal, nilai) {
  if (nilai === 'ingat') soal.benar++;
  else if (nilai === 'belum') soal.salah++;
  return soal;
}

/* Urutan latihan: id soal dari yang tertua. Memakai antrean yang sama dengan flashcard. */
export function antrianLatihan(ruang) {
  return antrianAwal(ruang.soal);
}

export { langkahAntrean, ringkasSesi };

/* Ringkasan ruang untuk daftar dan kepala halaman. */
export function statistikRuang(ruang) {
  return {
    materi: ruang.materi.length,
    soal: ruang.soal.length,
    benar: ruang.soal.reduce((a, s) => a + s.benar, 0),
    salah: ruang.soal.reduce((a, s) => a + s.salah, 0),
  };
}
