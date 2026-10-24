/**
 * Penjalan pipeline untuk batch besar (K29).
 * Di atas BATAS_WORKER berkas, pipeline dikirim ke Web Worker agar UI tetap responsif.
 * Di bawah itu, atau bila Worker tidak tersedia, dijalankan sinkron.
 */
import { runPipeline } from './engine.js?v=20261024033444';

export const BATAS_WORKER = 500;
let _worker = null;
let _seq = 0;
const _tunggu = new Map();

function dapatkanWorker() {
  if (_worker !== null) return _worker;
  try {
    if (typeof Worker === 'undefined') { _worker = false; return _worker; }
    _worker = new Worker(new URL('./pekerja-worker.js?v=20261010050549', import.meta.url), { type: 'module' });
    _worker.onmessage = (e) => {
      const p = _tunggu.get(e.data.id);
      if (!p) return;
      _tunggu.delete(e.data.id);
      e.data.ok ? p.resolve(e.data.hasil) : p.reject(new Error(e.data.pesan));
    };
    _worker.onerror = () => {
      // Worker rusak: lepaskan dan biarkan pemanggilan berikutnya memakai jalur sinkron.
      for (const p of _tunggu.values()) p.reject(new Error('Worker gagal.'));
      _tunggu.clear();
      _worker.terminate();
      _worker = false;
    };
  } catch (e) {
    _worker = false;
  }
  return _worker;
}

/**
 * @returns {Promise<PipelineResult>}
 */
export async function jalankanPipeline(items = [], rules = [], options = {}) {
  if (items.length < BATAS_WORKER) return runPipeline(items, rules, options);
  const w = dapatkanWorker();
  if (!w) return runPipeline(items, rules, options);
  const id = ++_seq;
  return new Promise((resolve, reject) => {
    _tunggu.set(id, { resolve, reject });
    w.postMessage({ id, items, rules, options });
  }).catch(() => runPipeline(items, rules, options)); // jatuh balik ke sinkron
}
