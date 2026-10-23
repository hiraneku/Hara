/**
 * Ruang / Folder Catatan (berbasis `note.folderId`), Mode Tampilan Daftar vs Grid,
 * serta Riwayat Versi Lokal Ringan (Snapshot di IndexedDB).
 *
 * Seluruh penyimpanan catatan utama tetap melewati `core/store.js`.
 */

import { state, save } from '../core/store.js?v=20261023162934';
import { touch } from './note-model.js?v=20261023162934';
import { punyaKunci } from './kunci.js?v=20261023162934';
import { bacaKv, tulisKv } from '../core/db-catatan.js?v=20261023162934';

const KUNCI_RUANG = 'hara.v1.ruang';
const KUNCI_TAMPIL = 'hara.v1.tampilan';
const MAKS_VERSI = 12;

let _ruangAktif = null;     /* null = Semua ruang */
let _modeTampil = (function () {
  try {
    return localStorage.getItem(KUNCI_TAMPIL) === 'grid' ? 'grid' : 'list';
  } catch (e) {
    return 'list';
  }
})();

export function ruangAktif() {
  return _ruangAktif;
}

export function setRuangAktif(id) {
  _ruangAktif = id || null;
}

export function modeTampilDaftar() {
  return _modeTampil;
}

export function setModeTampilDaftar(mode) {
  _modeTampil = mode === 'grid' ? 'grid' : 'list';
  try { localStorage.setItem(KUNCI_TAMPIL, _modeTampil); } catch (e) {}
  return _modeTampil;
}

export function toggleModeTampilDaftar() {
  return setModeTampilDaftar(_modeTampil === 'grid' ? 'list' : 'grid');
}

export function daftarRuang() {
  let tersimpan = [];
  try {
    const raw = localStorage.getItem(KUNCI_RUANG);
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) tersimpan = parsed;
  } catch (e) {}

  /* Pastikan folderId yang sudah dipakai pada catatan tetap muncul walau dipulihkan dari cadangan */
  const map = new Map();
  for (const r of tersimpan) {
    if (r && r.id && r.nama) map.set(r.id, { id: r.id, nama: String(r.nama) });
  }
  for (const n of state.notes || []) {
    if (!n.deletedAt && n.folderId && !map.has(n.folderId)) {
      map.set(n.folderId, { id: n.folderId, nama: String(n.folderId) });
    }
  }
  return [...map.values()];
}

function tulisDaftarRuang(list) {
  try { localStorage.setItem(KUNCI_RUANG, JSON.stringify(list)); } catch (e) {}
}

export function tambahRuang(namaMentah) {
  const nama = String(namaMentah || '').trim().slice(0, 32);
  if (!nama) return null;
  const list = daftarRuang();
  const sudah = list.find(r => r.nama.toLowerCase() === nama.toLowerCase());
  if (sudah) return sudah;
  const baru = {
    id: 'rg-' + nama.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36).slice(-3),
    nama,
  };
  list.push(baru);
  tulisDaftarRuang(list);
  return baru;
}

export function hapusRuang(id) {
  const list = daftarRuang().filter(r => r.id !== id);
  tulisDaftarRuang(list);
  let berubah = false;
  for (const n of state.notes || []) {
    if (n.folderId === id) {
      n.folderId = null;
      berubah = true;
    }
  }
  if (_ruangAktif === id) _ruangAktif = null;
  if (berubah) save();
}

export function pindahkanCatatanKeRuang(noteId, ruangId) {
  const n = state.notes.find(x => x.id === noteId);
  if (!n) return false;
  n.folderId = ruangId || null;
  touch(n);
  save();
  return true;
}

export function namaRuangUntuk(id) {
  if (!id) return '';
  const r = daftarRuang().find(x => x.id === id);
  return r ? r.nama : String(id);
}

/* ════════ RIWAYAT VERSI LOKAL CATATAN (SNAPSHOT LINTAS SESI) ════════ */
const kunciVersi = noteId => 'versi:' + noteId;
const cacheTerakhir = new Map();
const waktuTerakhir = new Map();

/**
 * Rekam snapshot versi catatan ke IndexedDB bila isinya berubah secara bermakna.
 * Catatan terkunci PIN dilewati demi privasi.
 */
export async function rekamVersiCatatan(note, otomatis = false) {
  if (!note || !note.id || note.welcome || punyaKunci(note)) return false;
  if (otomatis) {
    const skrg = Date.now();
    if (skrg - (waktuTerakhir.get(note.id) || 0) < 30000) return false;
    waktuTerakhir.set(note.id, skrg);
  }
  const jejak = JSON.stringify({ t: note.title || '', b: note.blocks || [] });
  if (cacheTerakhir.get(note.id) === jejak) return false;
  cacheTerakhir.set(note.id, jejak);

  let riwayat = [];
  try {
    const lama = await bacaKv(kunciVersi(note.id));
    if (Array.isArray(lama)) riwayat = lama;
  } catch (e) {}

  if (riwayat.length && JSON.stringify({ t: riwayat[0].title, b: riwayat[0].blocks }) === jejak) {
    return false;
  }

  riwayat.unshift({
    at: Date.now(),
    title: note.title || '',
    blocks: JSON.parse(JSON.stringify(note.blocks || [])),
  });
  if (riwayat.length > MAKS_VERSI) riwayat = riwayat.slice(0, MAKS_VERSI);
  await tulisKv(kunciVersi(note.id), riwayat);
  return true;
}

export async function ambilVersiCatatan(noteId) {
  if (!noteId) return [];
  try {
    const list = await bacaKv(kunciVersi(noteId));
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

export async function pulihkanVersiCatatan(noteId, idx) {
  const n = state.notes.find(x => x.id === noteId);
  if (!n) return false;
  const list = await ambilVersiCatatan(noteId);
  const target = list[idx];
  if (!target) return false;

  /* Simpan keadaan sebelum dipulihkan agar tetap bisa balik */
  await rekamVersiCatatan(n);
  n.title = target.title || '';
  n.blocks = JSON.parse(JSON.stringify(target.blocks || []));
  touch(n);
  save();
  return true;
}
