/**
 * Preset gaya pena (Tahap 1 · A3).
 *
 * Preset = kombinasi warna, ukuran, dan gaya sapuan pena yang bisa dipilih ulang.
 * Preset bawaan tidak bisa dihapus. Preset kustom disimpan di localStorage terpisah
 * dari catatan, seperti preferensi bar, sehingga menghapus catatan tidak ikut menghapusnya.
 *
 * Modul ini murni logika (tanpa DOM) supaya bisa diuji di Node.
 */

import { GAYA_GORESAN } from './goresan.js?v=20261029180000';

export const KUNCI_PRESET = 'hara.pena.v1';
export const MAKS_PRESET_KUSTOM = 8;
const MAKS_NAMA = 24;
const RE_WARNA = /^#[0-9a-f]{6}$/i;
const RE_ID = /^[A-Za-z0-9_-]{1,40}$/;

/* Nama bawaan dikirim lewat tr() di UI. Nilainya tetap dalam bahasa Indonesia sebagai kunci. */
export const PRESET_BAWAAN = [
  { id: 'bawaan-tinta', nama: 'Tinta hitam', warna: '#111827', ukuran: 4, gaya: 'tinta', bawaan: true },
  { id: 'bawaan-kuas', nama: 'Kuas biru', warna: '#2563eb', ukuran: 10, gaya: 'kuas', bawaan: true },
  { id: 'bawaan-pensil', nama: 'Pensil abu', warna: '#475569', ukuran: 2, gaya: 'pensil', bawaan: true },
];

/** Bersihkan satu preset. Null bila tidak valid (nama kosong, warna atau gaya salah). */
export function bersihkanPreset(p) {
  if (!p || typeof p !== 'object') return null;
  if (typeof p.id !== 'string' || !RE_ID.test(p.id)) return null;
  if (typeof p.nama !== 'string') return null;
  const nama = p.nama.trim().slice(0, MAKS_NAMA);
  if (!nama) return null;
  if (!RE_WARNA.test(p.warna)) return null;
  if (!GAYA_GORESAN.includes(p.gaya)) return null;
  const n = Number(p.ukuran);
  if (!Number.isFinite(n)) return null;
  const ukuran = Math.min(40, Math.max(1, Math.round(n * 10) / 10));
  return { id: p.id, nama, warna: p.warna.toLowerCase(), ukuran, gaya: p.gaya, bawaan: false };
}

/** Baca preset kustom dari penyimpanan. Data rusak atau tidak valid diabaikan. */
export function muatPresetKustom() {
  try {
    const raw = localStorage.getItem(KUNCI_PRESET);
    if (!raw) return [];
    const d = JSON.parse(raw);
    if (!Array.isArray(d)) return [];
    const hasil = [];
    for (const item of d.slice(0, MAKS_PRESET_KUSTOM)) {
      const b = bersihkanPreset(item);
      if (b && !hasil.some(x => x.id === b.id)) hasil.push(b);
    }
    return hasil;
  } catch {
    return [];
  }
}

function tulisPresetKustom(list) {
  try { localStorage.setItem(KUNCI_PRESET, JSON.stringify(list)); } catch {}
}

/** Gabungan preset bawaan lalu kustom. */
export function daftarPreset() {
  return [...PRESET_BAWAAN, ...muatPresetKustom()];
}

/** Nomor berikutnya untuk nama "Gaya N" yang belum dipakai. */
export function namaPresetBerikutnya(list) {
  const pakai = new Set(list.map(p => p.nama));
  let n = 1;
  while (pakai.has(`Gaya ${n}`)) n++;
  return `Gaya ${n}`;
}

/** Simpan preset kustom baru. Hasil: { ok, preset } atau { ok: false, alasan }. */
export function simpanPresetKustom(data) {
  const kustom = muatPresetKustom();
  if (kustom.length >= MAKS_PRESET_KUSTOM) return { ok: false, alasan: 'penuh' };
  const warna = typeof data.warna === 'string' ? data.warna.toLowerCase() : '';
  const sama = kustom.some(p => p.warna === warna && p.ukuran === Number(data.ukuran) && p.gaya === data.gaya);
  if (sama) return { ok: false, alasan: 'ada' };
  const nama = data.nama || namaPresetBerikutnya(kustom);
  const id = 'kustom-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const preset = bersihkanPreset({ id, nama, warna: data.warna, ukuran: data.ukuran, gaya: data.gaya });
  if (!preset) return { ok: false, alasan: 'tidak-valid' };
  tulisPresetKustom([...kustom, preset]);
  return { ok: true, preset };
}

/** Hapus preset kustom. Preset bawaan tidak pernah dihapus. */
export function hapusPresetKustom(id) {
  const kustom = muatPresetKustom();
  const sisa = kustom.filter(p => p.id !== id);
  if (sisa.length === kustom.length) return false;
  tulisPresetKustom(sisa);
  return true;
}
