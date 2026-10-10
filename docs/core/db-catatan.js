/* Penyimpanan utama catatan di IndexedDB (ronde 11 · inti).

   Kenapa: localStorage kecil (beberapa MB per origin) dan sinkron. Vault
   besar bisa mendekati batas itu. IndexedDB menerima data jauh lebih besar
   dan asinkron.

   Bentuk data: SATU record berisi string JSON yang sama persis dengan yang
   dulu ditulis ke localStorage. Dengan begitu logika validasi & migrasi di
   store.js tidak berubah.

   Migrasi (tidak destruktif):
   - Saat dimuat, IndexedDB dicek dulu. Bila kosong dan localStorage
     `hara.v1` ada, isinya ditulis ke IndexedDB lalu DIBACA ULANG untuk
     verifikasi. Kunci localStorage TIDAK dihapus di rilis ini.
   - Bila IndexedDB tidak tersedia, mode localStorage dipakai (perilaku lama).
     Mode dipilih sekali saat dimuat, tidak berganti di tengah jalan.

   Penulisan diantre: penulisan yang tertunda digabung, jadi yang tertulis
   selalu keadaan terbaru, dan urutannya tidak pernah terbalik. */

const DB = 'hara-catatan';
const TOKO = 'kv';
const KUNCI_REC = 'data';
const KEY_LS = 'hara.v1';          /* sama dengan store.js — dibaca untuk migrasi */

let mode = null;                   /* 'idb' | 'ls' | null (belum dipilih) */
let dbp = null;

function buka() {
  if (dbp) return dbp;
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

async function bacaIdb(kunci = KUNCI_REC) {
  const db = await buka();
  return new Promise((res, rej) => {
    const t = db.transaction(TOKO, 'readonly');
    const r = t.objectStore(TOKO).get(kunci);
    r.onsuccess = () => res(r.result == null ? null : r.result);
    r.onerror = () => rej(r.error);
  });
}

async function tulisIdb(str, kunci = KUNCI_REC) {
  const db = await buka();
  return new Promise((res, rej) => {
    const t = db.transaction(TOKO, 'readwrite');
    t.objectStore(TOKO).put(str, kunci);
    t.oncomplete = () => res(true);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error || new Error('transaksi dibatalkan'));
  });
}

function lsBaca() {
  try { return localStorage.getItem(KEY_LS); } catch (e) { return null; }
}
function lsTulis(str) {
  try { localStorage.setItem(KEY_LS, str); return true; } catch (e) { return false; }
}

/* Pilih mode sekali. Mengembalikan 'idb' atau 'ls'. */
async function pilihMode() {
  if (mode) return mode;
  if (typeof indexedDB === 'undefined' || !indexedDB) { mode = 'ls'; return mode; }
  try { await buka(); mode = 'idb'; } catch (e) { mode = 'ls'; }
  return mode;
}

/* Muat string JSON catatan. Mengembalikan string atau null.
   Melakukan migrasi dari localStorage bila perlu (lihat berkas ini). */
export async function muatMentah() {
  if ((await pilihMode()) === 'ls') return lsBaca();
  let raw = null;
  try { raw = await bacaIdb(); } catch (e) { return lsBaca(); }
  if (raw != null) return raw;

  const lama = lsBaca();
  if (!lama) return null;
  /* migrasi: tulis, lalu verifikasi dengan membaca ulang */
  try {
    await tulisIdb(lama);
    const cek = await bacaIdb();
    if (cek === lama) return lama;
  } catch (e) { /* biarkan: data lama tetap dipakai dari localStorage */ }
  return lama;
}

async function tulisMentah(str) {
  if ((await pilihMode()) === 'ls') return lsTulis(str);
  try { return await tulisIdb(str); } catch (e) { return false; }
}

/* Antrean tulis. Satu penulisan berjalan pada satu waktu. Penulisan yang
   belum mulai digantikan oleh yang lebih baru (digabung). */
let rantai = Promise.resolve();
let tertunda = null;

export function tulisAntre(str) {
  if (tertunda) { tertunda.str = str; return tertunda.p; }
  const job = { str, p: null };
  tertunda = job;
  job.p = rantai.then(() => {
    if (tertunda === job) tertunda = null;
    return tulisMentah(job.str);
  });
  rantai = job.p.then(() => {}, () => {});
  return job.p;
}

/* Data tak terbaca: salinan mentahnya disimpan dengan kunci `rusak-<ts>`,
   lalu kunci utama dikosongkan supaya pemuatan berikutnya tidak menemukan
   data rusak yang sama lagi. Mengembalikan false bila salinan gagal ditulis;
   dalam kasus itu data utama DIBIARKAN utuh. */
export async function cadangkanRusak(raw, ts) {
  const kunci = 'rusak-' + ts;
  try {
    if ((await pilihMode()) === 'ls') {
      localStorage.setItem(KEY_LS + '.' + kunci, raw);
      localStorage.removeItem(KEY_LS);
      return true;
    }
    await tulisIdb(raw, kunci);
    await tulisIdb('', KUNCI_REC);
    return true;
  } catch (e) {
    return false;
  }
}

/* Khusus pengujian: nama mode yang sedang dipakai. */
export const modeSimpan = () => mode;
