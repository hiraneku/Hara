/**
 * Ruang / Folder Catatan (berbasis `note.folderId`), Mode Tampilan Daftar vs Grid,
 * serta Riwayat Versi Lokal Ringan (Snapshot di IndexedDB).
 *
 * Seluruh penyimpanan catatan utama tetap melewati `core/store.js`.
 */

import { state, save } from '../core/store.js?v=20261026025826';
import { touch, plainText } from './note-model.js?v=20261026025826';
import { punyaKunci } from './kunci.js?v=20261026025826';
import { bacaKv, tulisKv } from '../core/db-catatan.js?v=20261026025826';

const KUNCI_RUANG = 'hara.v1.ruang';
const KUNCI_TAMPIL = 'hara.v1.tampilan';
/* Riwayat versi: rekam paling cepat tiap 5 menit saat disunting (perubahan di
   tengah jeda direkam di akhir jeda). Disimpan 30 hari. Untuk versi yang lebih
   tua dari 24 jam hanya satu per jam yang disimpan, supaya ukurannya terkendali. */
const JEDA_VERSI_DEFAULT = 5 * 60 * 1000;
const UMUR_VERSI_MAKS = 30 * 24 * 60 * 60 * 1000;
const PENUH_VERSI = 24 * 60 * 60 * 1000;
const MAKS_VERSI = 400;          /* batas keras jumlah versi per catatan */
const MAKS_BARIS_BANDING = 600;
let jedaVersi = JEDA_VERSI_DEFAULT;
const timerTunda = new Map();

/* Hanya untuk uji: ubah jeda rekam. */
export function _jedaVersiUntukUji(ms) { jedaVersi = ms; }

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

/* Fungsi id -> nama ruang dengan peta yang dibangun sekali (dipakai pencarian
   agar tidak membaca localStorage untuk setiap catatan). */
export function petaNamaRuang() {
  const peta = new Map(daftarRuang().map(r => [r.id, r.nama]));
  return id => (peta.has(id) ? peta.get(id) : String(id));
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

/* Buang versi yang lebih tua dari 30 hari; untuk yang lebih tua dari 24 jam,
   sisakan satu per jam (yang paling baru). `list` terurut terbaru dulu. */
export function pangkasVersi(list, now = Date.now()) {
  const jamTerpakai = new Set();
  const hasil = [];
  for (const v of list) {
    const umur = now - (v.at || 0);
    if (umur > UMUR_VERSI_MAKS) continue;
    if (umur > PENUH_VERSI) {
      const jam = Math.floor((v.at || 0) / 3600000);
      if (jamTerpakai.has(jam)) continue;
      jamTerpakai.add(jam);
    }
    hasil.push(v);
  }
  return hasil.slice(0, MAKS_VERSI);
}

/* Rekam versi yang tertunda sampai jeda berakhir, dengan isi catatan saat itu. */
function jadwalTunda(id, ms) {
  if (timerTunda.has(id)) return;
  timerTunda.set(id, setTimeout(() => {
    timerTunda.delete(id);
    const n = state.notes.find(x => x.id === id);
    if (n && !n.deletedAt) rekamVersiCatatan(n, true).catch(() => {});
  }, Math.max(0, ms) + 50));
}

/**
 * Rekam snapshot versi catatan ke IndexedDB bila isinya berubah secara bermakna.
 * Catatan terkunci PIN dilewati demi privasi.
 */
export async function rekamVersiCatatan(note, otomatis = false) {
  if (!note || !note.id || note.welcome || punyaKunci(note)) return false;
  if (otomatis) {
    const skrg = Date.now();
    const sisa = jedaVersi - (skrg - (waktuTerakhir.get(note.id) || 0));
    if (sisa > 0) { jadwalTunda(note.id, sisa); return false; }
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
  riwayat = pangkasVersi(riwayat);
  await tulisKv(kunciVersi(note.id), riwayat);
  return true;
}

/* Baris teks sebuah catatan (judul di baris pertama, lalu tiap blok). */
export function barisCatatan(n) {
  const baris = [n && n.title ? String(n.title).trim() : ''];
  (n && n.blocks || []).forEach(b => {
    const t = plainText({ blocks: [b] }).replace(/\s+/g, ' ').trim();
    if (t) baris.push(t);
  });
  return baris;
}

/* Selisih baris (LCS). Operasi: ' ' sama, '-' hanya di versi lama, '+' hanya di sekarang.
   Mengembalikan null bila salah satu terlalu panjang. */
export function bandingBaris(lama, baru) {
  const n = lama.length, m = baru.length;
  if (n > MAKS_BARIS_BANDING || m > MAKS_BARIS_BANDING) return null;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = lama[i] === baru[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (lama[i] === baru[j]) { ops.push({ o: ' ', t: lama[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ o: '-', t: lama[i] }); i++; }
    else { ops.push({ o: '+', t: baru[j] }); j++; }
  }
  while (i < n) ops.push({ o: '-', t: lama[i++] });
  while (j < m) ops.push({ o: '+', t: baru[j++] });
  return ops;
}

export function bandingVersiDenganSekarang(versi, sekarang) {
  return bandingBaris(barisCatatan(versi), barisCatatan(sekarang));
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
