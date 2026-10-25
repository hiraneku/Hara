/* Pengaturan ekualiser: global (satu set untuk semua lagu), disimpan di localStorage.
   Data versi lama (5 pita, kunci v1) dipindahkan otomatis saat pertama dibaca.
   Diterapkan ke mesin audio lewat mesin.setEq(). */

import { normalisasiEq, migrasiEqLama, namaPresetValid, EQ_KUSTOM_MAKS, EQ_AWAL } from './logika.js?v=20261025081850';

const KUNCI = 'hara.v2.musik.eq';
const KUNCI_LAMA = 'hara.v1.musik.eq';
let cache = null;

function bacaJson(k) {
  try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; }
}

export function ambilEq() {
  if (cache) return cache;
  const baru = bacaJson(KUNCI);
  if (baru) cache = normalisasiEq(baru);
  else cache = normalisasiEq(migrasiEqLama(bacaJson(KUNCI_LAMA)) ?? EQ_AWAL);
  return cache;
}

function simpan() {
  try { localStorage.setItem(KUNCI, JSON.stringify(cache)); } catch (e) { /* abaikan: tetap di memori */ }
}

export function ubahEq(patch) {
  cache = normalisasiEq({ ...ambilEq(), ...patch });
  simpan();
  return cache;
}

/* Simpan gain sekarang sebagai preset buatan sendiri. Nama sama = ditimpa.
   Mengembalikan false bila nama kosong atau daftar penuh. */
export function simpanKustom(nama) {
  const n = namaPresetValid(nama);
  if (!n) return false;
  const daftar = ambilEq().kustom.slice();
  const i = daftar.findIndex(x => x.nama === n);
  if (i < 0 && daftar.length >= EQ_KUSTOM_MAKS) return false;
  const item = { nama: n, gain: ambilEq().gain.slice() };
  if (i >= 0) daftar[i] = item; else daftar.push(item);
  ubahEq({ kustom: daftar });
  return true;
}

export function hapusKustom(indeks) {
  const daftar = ambilEq().kustom.filter((_, i) => i !== indeks);
  ubahEq({ kustom: daftar });
}
