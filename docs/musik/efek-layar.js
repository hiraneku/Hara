/* Layar "Efek & Visual" (view 'musik-efek'): menu pilihan untuk efek pemutar.
   - Ekualiser: sudah tersedia (view 'musik-eq').
   - Effect: menu disiapkan (view 'musik-effect'), isinya belum dibuat.
   - Visualizer: disiapkan sebagai pilihan, belum berfungsi ("Segera hadir"). */

import { cur, go } from '../core/router.js?v=20261024230000';
import { t as tr } from '../core/i18n.js?v=20261024230000';
import { ikon } from './ikon.js?v=20261024230000';

const PILIHAN = [
  { id: 'eq', judul: 'Ekualiser', sub: '10 pita, preamp, dan preset', ikon: 'eq', tersedia: true },
  { id: 'effect', judul: 'Effect', sub: 'Segera dijelaskan', ikon: 'effect', tersedia: true },
  { id: 'visual', judul: 'Visualizer', sub: 'Tampilan visual yang mengikuti musik', ikon: 'visual', tersedia: false },
];

export function efekView() {
  const daftar = PILIHAN.map(x => `<button type="button" class="mus-efek-item" data-efek="${x.id}"${x.tersedia ? '' : ' disabled'}>
      <span class="mus-efek-ikon">${ikon(x.ikon)}</span>
      <span class="mus-efek-teks"><span class="mus-efek-judul">${tr(x.judul)}</span><span class="mus-efek-sub">${tr(x.sub)}</span></span>
      ${x.tersedia ? ikon('chev', 'mus-chev') : `<span class="mus-efek-badge">${tr('Segera hadir')}</span>`}
    </button>`).join('');
  return `<div class="mus mus-set" data-mus-root>
    <header class="mus-set-kepala">
      <span class="mus-set-ikon">${ikon('eq')}</span>
      <div><h2 class="mus-set-h">${tr('Efek & Visual')}</h2>
      <p class="mus-catatan">${tr('Pilih efek yang ingin diatur')}</p></div>
    </header>
    <div class="mus-efek-daftar">${daftar}</div>
  </div>`;
}

/* Layar Effect (view 'musik-effect'). Sengaja kosong: fiturnya belum dirancang. */
export function effectView() {
  return `<div class="mus mus-set" data-mus-root>
    <header class="mus-set-kepala">
      <span class="mus-set-ikon">${ikon('effect')}</span>
      <div><h2 class="mus-set-h">${tr('Effect')}</h2>
      <p class="mus-catatan">${tr('Menu Effect sudah disiapkan')}</p></div>
    </header>
    <section class="mus-kartu mus-set-kartu mus-efek-kosong">
      <p class="mus-catatan">${tr('Isi fitur Effect belum dibuat. Akan dibuat setelah penjelasan fiturnya.')}</p>
    </section>
  </div>`;
}

export function pasangEfek() {
  document.addEventListener('click', e => {
    if (cur !== 'musik-efek') return;
    const b = e.target.closest('[data-efek]');
    if (!b || b.disabled) return;
    if (b.dataset.efek === 'eq') go('musik-eq');
    if (b.dataset.efek === 'effect') go('musik-effect');
  });
}
