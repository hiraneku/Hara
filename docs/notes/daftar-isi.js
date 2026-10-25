/* Daftar isi otomatis (Bagian B8).

   Tombol di kendali baca membuka daftar heading catatan (h1–h3 yang
   menjadi blok). Satu ketukan melompat ke heading itu; blok tujuan
   berkedip memakai animasi .blk-lompat yang sudah ada. */

import { esc } from '../core/dom.js?v=20261025051852';
import { toast } from '../core/toast.js?v=20261025051852';
import { docEl } from './editor/caret.js?v=20261025051852';
import { openPop, closeAll } from './menus/pop.js?v=20261025051852';
import { t as tr } from '../core/i18n.js?v=20261025051852';
import { bisaLipat, daftarLipat, toggleLipatHeading, lipatSemua, bukaSemuaLipat, terapkanLipatan }
  from './lipat-bagian.js?v=20261025051852';

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
    hasil.push({ el, level: Number(m[1]), teks, bid: el.getAttribute('data-bid') || '' });
  });
  return hasil;
}

export function bukaDaftarIsi(anchor) {
  daftarSaat = ambilHeading();
  if (!daftarSaat.length) {
    toast(tr('Catatan ini belum punya heading — pakai # di depan baris'));
    return;
  }
  terapkanLipatan();
  const lipatAktif = bisaLipat();
  const terlipat = new Set(daftarLipat());
  const baris = daftarSaat.map((h, i) => {
    const on = !!(h.bid && terlipat.has(h.bid));
    return `<div class="daf-row">
      <button type="button" class="pop-i daf-i daf-lv${h.level}" data-daf-i="${i}">
        <span class="daf-n">${h.level === 1 ? 'H1' : h.level === 2 ? 'H2' : 'H3'}</span>
        <span class="daf-t">${esc(h.teks)}</span></button>
      ${lipatAktif && h.bid ? `<button type="button" class="daf-lipat${on ? ' on' : ''}"
        data-daf-lipat="${i}" aria-pressed="${on}" aria-expanded="${!on}"
        title="${on ? tr('Buka bagian') : tr('Lipat bagian')}"
        aria-label="${on ? tr('Buka bagian') : tr('Lipat bagian')}">
        <svg class="ico"><use href="#i-chev"/></svg></button>` : ''}
    </div>`;
  }).join('');
  const alat = lipatAktif
    ? `<div class="daf-alat">
        <button type="button" class="daf-a" data-daf-lipat-semua>${tr('Lipat semua')}</button>
        <button type="button" class="daf-a" data-daf-buka-semua>${tr('Buka semua')}</button>
      </div>`
    : '';
  openPop(`<div class="pop-h">${tr('Daftar isi')}</div>${alat}${baris}`, anchor);
}

function sinkronLipat() {
  const ids = new Set(daftarLipat());
  document.querySelectorAll('[data-daf-lipat]').forEach(b => {
    const h = daftarSaat[Number(b.dataset.dafLipat)];
    const on = !!(h && h.bid && ids.has(h.bid));
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-expanded', String(!on));
    const label = on ? tr('Buka bagian') : tr('Lipat bagian');
    b.title = label;
    b.setAttribute('aria-label', label);
  });
}

export function bindDaftarIsi() {
  document.addEventListener('click', e => {
    if (!e.target.closest) return;

    const lipat = e.target.closest('[data-daf-lipat]');
    if (lipat) {
      const h = daftarSaat[Number(lipat.dataset.dafLipat)];
      if (!h || !h.el || !h.el.isConnected) return;
      toggleLipatHeading(h.el);
      sinkronLipat();
      return;
    }
    if (e.target.closest('[data-daf-lipat-semua]')) {
      lipatSemua();
      sinkronLipat();
      toast(tr('Semua bagian dilipat'));
      return;
    }
    if (e.target.closest('[data-daf-buka-semua]')) {
      bukaSemuaLipat();
      sinkronLipat();
      toast(tr('Semua bagian dibuka'));
      return;
    }

    const b = e.target.closest('[data-daf-i]');
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
