/* Penyimpanan berkas (gambar) di IndexedDB.

   Kenapa bukan localStorage: kuotanya ~5 MB dan hanya menerima teks,
   jadi satu foto ponsel saja sudah membuatnya penuh. IndexedDB menerima
   Blob mentah dan kuotanya ratusan MB sampai beberapa GB.

   Catatan di editor hanya menyimpan id-nya (`data-blob="b3"`), bukan
   gambarnya. Saat catatan dibuka, gambar dipasang ulang lewat objectURL. */

const DB   = 'hara-files';
const TOKO = 'blobs';
let dbp = null;

/* Buka database. Kalau pembukaan GAGAL (mode privat, kuota, dsb.) `dbp`
   di-null-kan, sehingga panggilan berikutnya mencoba lagi — tanpa ini,
   janji yang tertolak tersimpan selamanya dan semua penyimpanan gambar
   mati sampai halaman dimuat ulang. */
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
    req.onerror   = () => gagal(req.error || new Error('gagal membuka IndexedDB'));
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
      req.onerror   = () => rej(req.error);
    }
    t.oncomplete = () => res(hasil);
    t.onerror    = () => rej(t.error);
    t.onabort    = () => rej(t.error || new Error('transaksi dibatalkan'));
  });
}

export async function simpanBlob(id, blob) {
  return tx('readwrite', s => s.put(blob, id));
}

export async function ambilBlob(id) {
  return tx('readonly', s => s.get(id));
}

export async function hapusBlob(id) {
  await tx('readwrite', s => s.delete(id));
  return true;
}

export async function semuaId() {
  return tx('readonly', s => s.getAllKeys());
}

/* Berapa besar yang terpakai, untuk halaman Pengaturan. */
export async function pakaiRuang() {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const e = await navigator.storage.estimate();
      return { pakai: e.usage || 0, kuota: e.quota || 0 };
    }
  } catch (e) {}
  return { pakai: 0, kuota: 0 };
}

/* objectURL dicatat supaya bisa dibebaskan saat berpindah catatan. */
const urls = new Map();

export async function urlUntuk(id) {
  if (urls.has(id)) return urls.get(id);
  const blob = await ambilBlob(id);
  if (!blob) return null;
  const u = URL.createObjectURL(blob);
  urls.set(id, u);
  return u;
}

export function bebaskanUrl() {
  urls.forEach(u => URL.revokeObjectURL(u));
  urls.clear();
}

export const ukuranTerbaca = b =>
  b < 1024 ? b + ' B'
  : b < 1048576 ? (b / 1024).toFixed(0) + ' KB'
  : (b / 1048576).toFixed(1) + ' MB';
