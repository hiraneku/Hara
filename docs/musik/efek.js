/* Pengaturan efek pemutar: disimpan di localStorage (global, satu set untuk semua lagu)
   dan diterapkan ke mesin lewat aturEfek(). Pola sama dengan eq.js. */

import { normalisasiEfek, ubahEfekPure } from './efek-data.js?v=20261024185135';
import { aturEfek } from './mesin.js?v=20261024185135';

const KUNCI = 'hara.v2.musik.efek';
let cache = null;

function bacaJson(k) {
  try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; }
}

export function ambilEfek() {
  if (!cache) cache = normalisasiEfek(bacaJson(KUNCI));
  return cache;
}

function simpan() {
  try { localStorage.setItem(KUNCI, JSON.stringify(cache)); } catch (e) { /* abaikan: tetap di memori */ }
}

/* patch: { aktif?: boolean, p?: { idParam: nilai } } */
export function ubahEfek(id, patch) {
  cache = ubahEfekPure(ambilEfek(), id, patch);
  simpan();
  aturEfek(cache);
  return cache;
}

/* Dipanggil sekali saat aplikasi dibuka. */
export function terapkanEfekTersimpan() {
  aturEfek(ambilEfek());
}
