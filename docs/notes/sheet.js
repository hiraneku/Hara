/* Kerangka bottom sheet bersama untuk panel Catatan.

   Satu bentuk untuk semua panel formulir (Cari & Ganti, Saringan,
   Info catatan, dan panel berikutnya): pegangan geser di atas, judul
   besar dengan ikon, isi yang bisa digulung, dan kaki berisi tombol
   aksi. Struktur `.sh` sengaja dibuat kecil dan tanpa state supaya
   mudah dipakai ulang; penutup (×) dipasang otomatis oleh
   `setPopIsi` ke slot `.sh-x`.

   Tidak ada emoji: seluruh ikon memakai sprite SVG `#i-…` di
   docs/index.html agar bentuknya seragam dengan sisa aplikasi. */

import { esc } from '../core/dom.js?v=20261024003448';

/* Satu tombol baris formulir dengan ikon di kiri. */
export function shField({ id, ikon = '', label = '', value = '', placeholder = '',
  type = 'text', maxlength = 0, enter = '', atribut = '' }) {
  const batas = maxlength ? ` maxlength="${Number(maxlength) || 0}"` : '';
  const hint = enter ? ` enterkeyhint="${esc(enter)}"` : '';
  return `<label class="sh-field"${id ? ` for="${esc(id)}"` : ''}>
    ${label ? `<span class="sh-lab">${esc(label)}</span>` : ''}
    <span class="sh-in">
      ${ikon ? `<svg class="ico sh-in-ico" aria-hidden="true"><use href="#${esc(ikon)}"/></svg>` : ''}
      <input${id ? ` id="${esc(id)}"` : ''} type="${esc(type)}" autocomplete="off"${batas}${hint}
        placeholder="${esc(placeholder)}" value="${esc(value)}" ${atribut}>
    </span>
  </label>`;
}

/* Sekelompok tombol kecil (segmented control) di dalam satu track. */
export function shSeg(items = []) {
  return `<div class="sh-seg" role="group">${items.map(x => `
    <button type="button" class="sh-seg-b${x.on ? ' on' : ''}"
      ${x.opsi ? `data-cg-opsi="${esc(x.opsi)}"` : ''}
      ${x.atribut || ''} aria-pressed="${x.on ? 'true' : 'false'}">
      ${x.ikon ? `<svg class="ico" aria-hidden="true"><use href="#${esc(x.ikon)}"/></svg>` : ''}
      <span>${esc(x.teks || '')}</span>
    </button>`).join('')}</div>`;
}

/* Kerangka lembar. `isi` sudah berupa HTML aman dari pemanggil. */
export function sheet({ ikon = '', judul = '', catatan = '', isi = '', kaki = '', kelas = '' }) {
  return `<div class="sh${kelas ? ' ' + kelas : ''}">
    <span class="sh-grip" aria-hidden="true"></span>
    <div class="sh-h">
      ${ikon ? `<span class="sh-ico" aria-hidden="true"><svg class="ico"><use href="#${esc(ikon)}"/></svg></span>` : ''}
      <div class="sh-ttl">
        <div class="pop-h">${esc(judul)}</div>
        ${catatan ? `<p class="sh-sub">${catatan}</p>` : ''}
      </div>
      <span class="sh-x"></span>
    </div>
    ${isi ? `<div class="sh-b">${isi}</div>` : ''}
    ${kaki ? `<div class="sh-f">${kaki}</div>` : ''}
  </div>`;
}

/* Tombol kaki standar: satu aksi utama + satu pembatal. */
export const shAksi = ({ utama, utamaId = '', batal = '', tutup = false }) =>
  `${batal ? `<button type="button" class="sh-btn"${tutup ? ' data-pop-close' : ''}>${esc(batal)}</button>` : ''}` +
  `${utama ? `<button type="button" class="sh-btn pri"${utamaId ? ` id="${esc(utamaId)}"` : ''}>${esc(utama)}</button>` : ''}`;
