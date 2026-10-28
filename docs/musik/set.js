/* Pengaturan layar Musik (menu "Pengaturan Musik"). Disimpan terpisah dari
   pustaka lagu di localStorage. Pengaturan lain di masa depan cukup
   ditambahkan ke SET_AWAL dan ke daftar bagian di pengaturan.js. */

import { normalisasiSet, SET_AWAL } from './logika.js?v=20261028081025';

const KUNCI = 'hara.v1.musik.set';

let cache = null;

export function ambilSet() {
  if (cache) return cache;
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(KUNCI) || 'null'); } catch (e) { raw = null; }
  cache = normalisasiSet(raw);
  return cache;
}

/* Ubah satu atau lebih pengaturan. Nilai yang tidak valid dibersihkan. */
export function ubahSet(patch) {
  const baru = normalisasiSet({ ...ambilSet(), ...patch });
  cache = baru;
  try { localStorage.setItem(KUNCI, JSON.stringify(baru)); } catch (e) { /* kuota/privat: tetap di memori */ }
  return baru;
}

export function setAwal() {
  return { ...SET_AWAL };
}
