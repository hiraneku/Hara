import { rencanaGabung, selesaikanKonflik } from './sinkronisasi-murni.js?v=20261105210000';

const clone = x => x == null ? x : JSON.parse(JSON.stringify(x));
const ARRAY_KEYS = ['catatan', 'ruang', 'kartu', 'ujian'];

/* Rencana sinkronisasi seluruh data backup tanpa mengubah store. Metadata berkas
   dibawa dari lokal; entitas tiap perangkat digabung tiga arah berdasarkan ID. */
export function rencanaSinkronisasi(base, lokal, jauh) {
  if (!lokal || lokal.format !== 'hara-cadangan' || !jauh || jauh.format !== 'hara-cadangan') throw new Error('Snapshot cadangan tidak valid.');
  const hasil = { ...clone(lokal) }, rencana = {}, konflik = [];
  for (const key of ARRAY_KEYS) {
    rencana[key] = rencanaGabung(base?.[key] || [], lokal[key] || [], jauh[key] || []);
    hasil[key] = rencana[key].hasil;
    konflik.push(...rencana[key].konflik.map(c => ({ ...c, jenis: key })));
  }
  const kb = base?.blobs || {}, kl = lokal.blobs || {}, kj = jauh.blobs || {};
  const blobAsArray = obj => Object.entries(obj).map(([id, value]) => ({ id, value }));
  rencana.blobs = rencanaGabung(blobAsArray(kb), blobAsArray(kl), blobAsArray(kj));
  hasil.blobs = Object.fromEntries(rencana.blobs.hasil.map(x => [x.id, x.value]));
  konflik.push(...rencana.blobs.konflik.map(c => ({ ...c, jenis: 'blobs' })));
  /* Hamoji custom adalah set nilai: union, tidak ada konflik per item. */
  hasil.hamojiCustom = [...new Set([...(lokal.hamojiCustom || []), ...(jauh.hamojiCustom || [])])];
  return { hasil, rencana, konflik };
}

export function selesaikanRencanaSinkronisasi(plan, pilihan = {}) {
  if (!plan?.rencana) throw new Error('Rencana sinkronisasi tidak valid.');
  const hasil = clone(plan.hasil);
  for (const key of ARRAY_KEYS) {
    const pilih = Object.fromEntries((plan.rencana[key].konflik || []).map(c => [c.id, pilihan[`${key}:${c.id}`]]));
    hasil[key] = selesaikanKonflik(plan.rencana[key], pilih);
  }
  const blobPick = Object.fromEntries((plan.rencana.blobs.konflik || []).map(c => [c.id, pilihan[`blobs:${c.id}`]]));
  hasil.blobs = Object.fromEntries(selesaikanKonflik(plan.rencana.blobs, blobPick).map(x => [x.id, x.value]));
  return hasil;
}
