/* Daftar putar (tahap 2): disimpan di localStorage. Berisi id lagu saja; berkas
   lagu tetap di IndexedDB (simpan.js). Lagu yang dihapus dari pustaka otomatis
   dikeluarkan dari semua daftar. */

import { normalisasiDaftarPutar, namaDaftarValid, tambahUnik } from './logika.js?v=20261028021559';

const KUNCI = 'hara.v1.musik.daftar';
let cache = null;

function muat() {
  if (cache) return cache;
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(KUNCI) || 'null'); } catch (e) { raw = null; }
  cache = normalisasiDaftarPutar(raw);
  return cache;
}

function simpan() {
  try { localStorage.setItem(KUNCI, JSON.stringify(cache)); } catch (e) { /* kuota/privat: tetap di memori */ }
}

export function semuaDaftar() {
  return muat().map(x => ({ ...x, lagu: x.lagu.slice() }));
}

export function daftarById(id) {
  return semuaDaftar().find(x => x.id === id) || null;
}

function idBaru() {
  return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/* Buat daftar baru. null bila nama kosong. */
export function buatDaftar(nama) {
  const n = namaDaftarValid(nama);
  if (!n) return null;
  const d = { id: idBaru(), nama: n, lagu: [] };
  muat().push(d);
  simpan();
  return d.id;
}

export function ubahNama(id, nama) {
  const n = namaDaftarValid(nama);
  const d = muat().find(x => x.id === id);
  if (!d || !n) return false;
  d.nama = n;
  simpan();
  return true;
}

export function hapusDaftar(id) {
  cache = muat().filter(x => x.id !== id);
  simpan();
}

export function tambahLagu(idDaftar, idLagu) {
  const d = muat().find(x => x.id === idDaftar);
  if (!d) return false;
  d.lagu = tambahUnik(d.lagu, idLagu);
  simpan();
  return true;
}

export function keluarkanLagu(idDaftar, idLagu) {
  const d = muat().find(x => x.id === idDaftar);
  if (!d) return false;
  d.lagu = d.lagu.filter(x => x !== idLagu);
  simpan();
  return true;
}

export function urutkanLagu(idDaftar, daftarBaru) {
  const d = muat().find(x => x.id === idDaftar);
  if (!d) return false;
  d.lagu = daftarBaru.filter(x => d.lagu.includes(x));
  simpan();
  return true;
}

/* Dipanggil saat lagu dihapus dari pustaka. */
export function lepasLaguDariSemua(idLagu) {
  let ubah = false;
  for (const d of muat()) {
    if (d.lagu.includes(idLagu)) { d.lagu = d.lagu.filter(x => x !== idLagu); ubah = true; }
  }
  if (ubah) simpan();
}
