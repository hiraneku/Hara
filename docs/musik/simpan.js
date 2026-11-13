/* Penyimpanan pustaka musik.

   - Berkas audio & sampul: IndexedDB database TERPISAH ('hara-musik'). Sengaja
     bukan 'hara-files': sapuan blob yatim catatan (bersihkanBlobYatim) menghapus
     blob yang tidak dirujuk catatan, dan lagu tidak boleh ikut terhapus.
   - Metadata + pengaturan per lagu: localStorage (kecil, teks saja).

   Lagu tetap ada setelah aplikasi ditutup dan dibuka lagi. */

import { normalisasiAtur, ATUR_AWAL } from './logika.js?v=20261105210000';
import { ambilSet } from './set.js?v=20261105210000';
import { berkasAudioPerangkat } from './perangkat.js?v=20261105210000';

const DB = 'hara-musik';
const TOKO = 'berkas';
const KUNCI_META = 'hara.v1.musik';
const awalanSampul = 'sampul:';

let dbp = null;

function buka() {
  if (dbp) return dbp;
  if (!self.indexedDB) return Promise.reject(new Error('IndexedDB tidak ada'));
  dbp = new Promise((res, rej) => {
    let req;
    try { req = indexedDB.open(DB, 1); } catch (e) { dbp = null; rej(e); return; }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(TOKO)) db.createObjectStore(TOKO);
    };
    req.onsuccess = () => res(req.result);
    const gagal = err => { dbp = null; rej(err); };
    req.onerror = () => gagal(req.error || new Error('gagal membuka IndexedDB'));
    req.onblocked = () => gagal(new Error('IndexedDB diblokir'));
  });
  return dbp;
}

async function tx(mode, fn) {
  const db = await buka();
  return new Promise((res, rej) => {
    const t = db.transaction(TOKO, mode);
    const s = t.objectStore(TOKO);
    let req;
    try { req = fn(s); } catch (e) { rej(e); return; }
    let hasil;
    if (req && typeof req.onsuccess !== 'undefined') {
      req.onsuccess = () => { hasil = req.result; };
      req.onerror = () => rej(req.error);
    }
    t.oncomplete = () => res(hasil);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error || new Error('transaksi dibatalkan'));
  });
}

/* ── metadata ── */

let meta = muatMeta();

function muatMeta() {
  try {
    const s = localStorage.getItem(KUNCI_META);
    const o = s ? JSON.parse(s) : null;
    if (o && Array.isArray(o.lagu)) {
      return {
        lagu: o.lagu.filter(x => x && typeof x.id === 'string'),
        terakhirId: typeof o.terakhirId === 'string' ? o.terakhirId : null,
      };
    }
  } catch (e) { /* rusak: mulai dari kosong */ }
  return { lagu: [], terakhirId: null };
}

function simpanMeta() {
  try { localStorage.setItem(KUNCI_META, JSON.stringify(meta)); }
  catch (e) { /* kuota/privat: keadaan tetap di memori untuk sesi ini */ }
}

/* Lagu lokal dan semua audio yang baru saja disinkronkan dari MediaStore.
   Track perangkat menggunakan metadata/URI saja, bukan salinan di IndexedDB. */
export function daftarLagu() {
  return meta.lagu.slice().sort((a, b) => a.ditambahkan - b.ditambahkan);
}

export function laguById(id) {
  return meta.lagu.find(x => x.id === id) || null;
}

export function sinkronkanLaguPerangkat(daftar) {
  const lama = new Map(meta.lagu.filter(x => x.sumber === 'perangkat').map(x => [x.id, x]));
  const perangkat = (Array.isArray(daftar) ? daftar : []).map(raw => {
    if (!raw || raw.id == null || typeof raw.uri !== 'string' || !raw.uri.startsWith('content://')) return null;
    const id = 'android-audio:' + String(raw.id);
    const sblm = lama.get(id);
    const namaBerkas = String(raw.displayName || raw.title || 'audio');
    return {
      ...(sblm || {}),
      id,
      nama: String(raw.title || namaBerkas),
      durasi: Math.max(0, Number(raw.duration) || 0) / 1000,
      ukuran: Math.max(0, Number(raw.size) || 0),
      tipe: String(raw.mimeType || 'audio/*'),
      uri: raw.uri,
      sumber: 'perangkat',
      artis: String(raw.artist || ''),
      album: String(raw.album || ''),
      lokasi: String(raw.location || ''),
      ditambahkan: sblm?.ditambahkan || (Number(raw.dateAdded) > 0 ? Number(raw.dateAdded) * 1000 : Date.now()),
      terakhirMain: sblm?.terakhirMain || 0,
      atur: sblm?.atur || null,
      sampulDiperiksa: sblm?.sampulDiperiksa || false,
      sampulAda: sblm?.sampulAda || false,
    };
  }).filter(Boolean);

  const idLama = new Set(lama.keys());
  meta.lagu = meta.lagu.filter(x => x.sumber !== 'perangkat').concat(perangkat);
  if (idLama.has(meta.terakhirId) && !perangkat.some(x => x.id === meta.terakhirId)) meta.terakhirId = null;
  simpanMeta();
  return perangkat.length;
}

export function terakhirId() {
  return meta.terakhirId && laguById(meta.terakhirId) ? meta.terakhirId : null;
}

export function tandaiTerakhir(id) {
  const x = laguById(id);
  if (!x) return;
  meta.terakhirId = id;
  x.terakhirMain = Date.now();
  simpanMeta();
}

export function perbaruiLagu(id, patch) {
  const x = laguById(id);
  if (!x) return;
  Object.assign(x, patch);
  simpanMeta();
}

export function ukuranPustaka() {
  return meta.lagu.reduce((s, x) => s + (x.ukuran || 0), 0);
}

/* Pengaturan per lagu, sudah dibersihkan terhadap durasi lagu. Lagu yang belum
   pernah punya pengaturan memakai tempo awal dari pengaturan Musik. Posisi
   hanya dipulihkan bila "lanjutkan dari posisi terakhir" aktif. */
export function aturLagu(id) {
  const set = ambilSet();
  const x = laguById(id);
  if (!x) return { ...ATUR_AWAL, loop: { ...ATUR_AWAL.loop } };
  const a = normalisasiAtur(x.atur, x.durasi, set.tempoAwal);
  if (!set.lanjutkanPosisi) a.posisi = 0;
  return a;
}

export function simpanAtur(id, atur) {
  const x = laguById(id);
  if (!x) return;
  x.atur = {
    tempo: atur.tempo,
    pitch: atur.pitch,
    loop: atur.loop ? { a: atur.loop.a, b: atur.loop.b, aktif: !!atur.loop.aktif } : null,
    posisi: atur.posisi,
  };
  simpanMeta();
}

/* ── berkas audio & sampul ── */

function idBaru() {
  return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* Simpan berkas + catat metadata. `durasi` harus sudah dibaca dari audionya. */
export async function tambahLagu(berkas, { nama, durasi }) {
  const id = idBaru();
  await tx('readwrite', s => s.put(berkas, id));
  const rekaman = {
    id,
    nama,
    durasi,
    ukuran: berkas.size || 0,
    tipe: berkas.type || '',
    ditambahkan: Date.now(),
    terakhirMain: 0,
    atur: null,
    sampulDiperiksa: false,
    sampulAda: false,
  };
  meta.lagu.push(rekaman);
  simpanMeta();
  return rekaman;
}

export async function ambilBerkas(id) {
  const rekaman = laguById(id);
  if (rekaman?.sumber === 'perangkat') {
    return berkasAudioPerangkat(rekaman.uri, rekaman.nama, rekaman.tipe);
  }
  const x = await tx('readonly', s => s.get(id));
  return x || null;
}

export async function simpanSampul(id, blob) {
  await tx('readwrite', s => s.put(blob, awalanSampul + id));
  lupakanSampulUrl(id);
}

/* URL objek untuk sampul (di-cache di memori). null = lagu tanpa sampul. */
const urlSampulCache = new Map();

export async function urlSampul(id) {
  if (urlSampulCache.has(id)) return urlSampulCache.get(id);
  const x = laguById(id);
  if (!x || !x.sampulAda) return null;
  const blob = await tx('readonly', s => s.get(awalanSampul + id));
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urlSampulCache.set(id, url);
  return url;
}

export function lupakanSampulUrl(id) {
  const url = urlSampulCache.get(id);
  if (url) URL.revokeObjectURL(url);
  urlSampulCache.delete(id);
}

export async function hapusLagu(id) {
  /* Lagu MediaStore milik pengguna tidak dihapus dari berkas HP lewat Hara. */
  if (laguById(id)?.sumber === 'perangkat') return false;
  await tx('readwrite', s => s.delete(id));
  try { await tx('readwrite', s => s.delete(awalanSampul + id)); } catch (e) { /* sampul tak ada */ }
  lupakanSampulUrl(id);
  meta.lagu = meta.lagu.filter(x => x.id !== id);
  if (meta.terakhirId === id) meta.terakhirId = null;
  simpanMeta();
}
