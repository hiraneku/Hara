/* Pembantu uji: membaca & menulis record catatan utama di IndexedDB
   (database 'hara-catatan', toko 'kv', kunci 'data'). Dipakai setelah
   penyimpanan pindah dari localStorage ke IndexedDB (ronde 11 · inti). */

const DB = 'hara-catatan', TOKO = 'kv', KUNCI = 'data';

function buka(w) {
  return new Promise((res, rej) => {
    const r = w.indexedDB.open(DB, 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(TOKO)) r.result.createObjectStore(TOKO); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

export async function bacaCatatanIdb(w) {
  const db = await buka(w);
  return new Promise((res, rej) => {
    const g = db.transaction(TOKO, 'readonly').objectStore(TOKO).get(KUNCI);
    g.onsuccess = () => { db.close(); res(g.result == null ? null : g.result); };
    g.onerror = () => { db.close(); rej(g.error); };
  });
}

export async function tulisCatatanIdb(w, str) {
  const db = await buka(w);
  return new Promise((res, rej) => {
    const t = db.transaction(TOKO, 'readwrite');
    t.objectStore(TOKO).put(str, KUNCI);
    t.oncomplete = () => { db.close(); res(true); };
    t.onerror = () => { db.close(); rej(t.error); };
  });
}

/* Baca kunci mana pun di toko yang sama (mis. 'rusak-<ts>' hasil cadangan). */
export async function bacaKunciIdb(w, kunci) {
  const db = await buka(w);
  return new Promise((res, rej) => {
    const g = db.transaction(TOKO, 'readonly').objectStore(TOKO).get(kunci);
    g.onsuccess = () => { db.close(); res(g.result == null ? null : g.result); };
    g.onerror = () => { db.close(); rej(g.error); };
  });
}

/* Daftar semua kunci di toko (untuk memeriksa cadangan rusak). */
export async function daftarKunciIdb(w) {
  const db = await buka(w);
  return new Promise((res, rej) => {
    const r = db.transaction(TOKO, 'readonly').objectStore(TOKO).getAllKeys();
    r.onsuccess = () => { db.close(); res(r.result); };
    r.onerror = () => { db.close(); rej(r.error); };
  });
}
