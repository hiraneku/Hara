/* Penjadwal penulisan riwayat ke IndexedDB (K26 · undo lintas sesi).
   - simpanKvSoon: tunda penulisan; hanya keadaan terakhir per kunci yang ditulis.
   - flush dijalankan saat pagehide agar perubahan 400 ms terakhir tidak hilang.
   Kunci memakai namespace "undo:" dan "log:". */

import { bacaKv, tulisKv } from './db-catatan.js?v=20261024183000';

const JEDA = 400;
const antre = new Map();   /* kunci → { timer, ambil } */

async function tulisSekarang(kunci) {
  const a = antre.get(kunci);
  if (!a) return;
  antre.delete(kunci);
  clearTimeout(a.timer);
  let nilai;
  try { nilai = a.ambil(); } catch (e) { console.warn('riwayat: gagal menyiapkan data', kunci, e); return; }
  if (nilai === undefined) return;
  const ok = await tulisKv(kunci, nilai);
  if (!ok) console.warn('riwayat: gagal menulis ke IndexedDB', kunci);
}

/** `ambil` dipanggil saat penulisan benar-benar terjadi; kembalikan snapshot yang sudah disalin. */
export function simpanKvSoon(kunci, ambil) {
  const lama = antre.get(kunci);
  if (lama) clearTimeout(lama.timer);
  const timer = setTimeout(() => tulisSekarang(kunci), JEDA);
  antre.set(kunci, { timer, ambil });
}

export const muatKv = kunci => bacaKv(kunci);

/** Tulis semua penulisan tertunda sekarang (dipanggil saat aplikasi ditutup). */
export function flushKvSemua() {
  return Promise.all([...antre.keys()].map(tulisSekarang));
}

if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('pagehide', () => { flushKvSemua(); });
}
