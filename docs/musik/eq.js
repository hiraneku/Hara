/* Pengaturan ekualiser (tahap 2): global, disimpan di localStorage. Diterapkan
   ke mesin audio lewat mesin.setEq(). */

import { normalisasiEq, EQ_AWAL } from './logika.js?v=20261024163000';

const KUNCI = 'hara.v1.musik.eq';
let cache = null;

export function ambilEq() {
  if (cache) return cache;
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(KUNCI) || 'null'); } catch (e) { raw = null; }
  cache = normalisasiEq(raw ?? EQ_AWAL);
  return cache;
}

export function ubahEq(patch) {
  const baru = normalisasiEq({ ...ambilEq(), ...patch });
  cache = baru;
  try { localStorage.setItem(KUNCI, JSON.stringify(baru)); } catch (e) { /* abaikan */ }
  return baru;
}
