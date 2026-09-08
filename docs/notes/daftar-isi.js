/* Daftar isi otomatis (Bagian B8).

   Tombol di kendali baca membuka daftar heading catatan (h1–h3 yang
   menjadi blok). Satu ketukan melompat ke heading itu; blok tujuan
   berkedip memakai animasi .blk-lompat yang sudah ada. */

import { esc } from '../core/dom.js?v=20260908222631';
import { toast } from '../core/toast.js?v=20260908222631';
import { docEl } from './editor/caret.js?v=20260908222631';
import { openPop, closeAll } from './menus/pop.js?v=20260908222631';

/* Snapshot elemen heading saat menu dibuka — isi catatan yang berubah
   setelahnya tidak membuat menu salah arah. */
let daftarSaat = [];

export function ambilHeading() {
  const d = docEl();
  if (!d) return [];
  const hasil = [];
  Array.from(d.children).forEach(el => {
    if (!el.tagName) return;
    const m = /^H([123])$/.exec(el.tagName);
    if (!m) return;
    const teks = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (!teks) return;
    hasil.push({ el, level: Number(m[1]), teks });
  });
  return hasil;
}

export function bukaDaftarIsi(anchor) {
  daftarSaat = ambilHeading();
  if (!daftarSaat.length) {
    toast('Catatan ini belum punya heading — pakai # di depan baris');
    return;
  }
  openPop(`<div class="pop-h">Daftar isi</div>` +
    daftarSaat.map((h, i) =>
      `<button type="button" class="pop-i daf-i daf-lv${h.level}" data-daf-i="${i}">
        <span class="daf-n">${h.level === 1 ? 'H1' : h.level === 2 ? 'H2' : 'H3'}</span>
        <span class="daf-t">${esc(h.teks)}</span></button>`).join(''),
    anchor);
}

export function bindDaftarIsi() {
  document.addEventListener('click', e => {
    const b = e.target.closest ? e.target.closest('[data-daf-i]') : null;
    if (!b) return;
    const h = daftarSaat[Number(b.dataset.dafI)];
    closeAll();
    if (!h || !h.el || !h.el.isConnected) return;
    try { h.el.scrollIntoView({ block: 'center' }); } catch (err) { /* tua */ }
    h.el.classList.remove('blk-lompat');
    /* paksa reflow supaya animasi berjalan dari awal */
    void h.el.offsetWidth;
    h.el.classList.add('blk-lompat');
    setTimeout(() => h.el.classList.remove('blk-lompat'), 1900);
  });
}
