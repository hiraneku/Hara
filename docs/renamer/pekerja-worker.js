/* Web Worker K29 — menjalankan runPipeline di luar thread UI. */
import { runPipeline } from './engine.js?v=20261029220000';

self.onmessage = (e) => {
  const { id, items, rules, options } = e.data || {};
  try {
    const hasil = runPipeline(items || [], rules || [], options || {});
    self.postMessage({ id, ok: true, hasil });
  } catch (err) {
    self.postMessage({ id, ok: false, pesan: String((err && err.message) || err) });
  }
};
