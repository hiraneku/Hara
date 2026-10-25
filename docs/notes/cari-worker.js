/* Web Worker pencarian (Ronde 11 · K12). Logika ada di cari-inti.js. */
import { layani } from './cari-inti.js?v=20261025074430';

self.onmessage = e => {
  try {
    self.postMessage(layani(e.data));
  } catch (err) {
    self.postMessage({ jenis: 'galat', seq: e.data && e.data.seq, pesan: String(err && err.message || err) });
  }
};
