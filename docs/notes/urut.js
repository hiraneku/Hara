/* Urutkan & filter daftar catatan (Bagian B7).

   Pilihan urut disimpan per pemakaian (localStorage). Yang disemat
   selalu menang — pengurutan berlaku di dalam kelompok Disematkan
   dan kelompok Lainnya. Filter per-tag sudah berjalan lewat chip tag
   (stt.tag) dan tidak disentuh di sini. */

import { esc } from '../core/dom.js?v=20260909100046';
import { t as tr } from '../core/i18n.js?v=20260909100046';

const KUNCI = 'hara.v1.urut';

export const OPSI_URUT = [
  { k: 'edit', nama: 'Terakhir diedit', ket: 'Yang baru diubah di atas' },
  { k: 'buat', nama: 'Terbaru dibuat',  ket: 'Tanggal dibuat, terbaru di atas' },
  { k: 'az',   nama: 'Judul A–Z',       ket: 'Alfabetis sesuai judul' },
];

export const urutSekarang = () => {
  try {
    const v = localStorage.getItem(KUNCI);
    return OPSI_URUT.some(o => o.k === v) ? v : 'edit';
  } catch (e) { /* privat */ }
  return 'edit';
};

export const namaUrut = k =>
  tr((OPSI_URUT.find(o => o.k === k) || OPSI_URUT[0]).nama);

export function setUrut(k) {
  if (!OPSI_URUT.some(o => o.k === k)) return;
  try { localStorage.setItem(KUNCI, k); } catch (e) { /* privat */ }
}

/* Salinan daftar yang sudah diurutkan (daftar asal tidak diubah). */
export function urutkanCatatan(daftar) {
  const k = urutSekarang();
  const d = Array.isArray(daftar) ? daftar.slice() : [];
  if (k === 'az') {
    d.sort((a, b) => String(a.title || '').localeCompare(
      String(b.title || ''), 'id', { sensitivity: 'base' }));
  } else if (k === 'buat') {
    d.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } else {
    d.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }
  return d;
}

/* Menu pilihan urut — dipakai chip "Urut:" di daftar catatan. */
export function menuUrut() {
  const kini = urutSekarang();
  return `<div class="pop-h">${tr('Urutkan daftar')}</div>` +
    OPSI_URUT.map(o =>
      `<button type="button" class="pop-i${o.k === kini ? ' on' : ''}" data-urut-set="${o.k}">
        <svg class="ico"><use href="#i-sort"/></svg>${esc(tr(o.nama))}
        <span class="sub">${esc(tr(o.ket))}</span></button>`).join('');
}
