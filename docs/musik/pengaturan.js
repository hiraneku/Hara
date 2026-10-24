/* Layar "Pengaturan Musik" (view 'musik-set'). Sengaja dikosongkan dulu; bagian
   pengaturan baru ditambahkan di sini ketika sudah diputuskan. Perilaku default
   (setelah selesai: berhenti, lanjutkan posisi, tempo awal 100%) tetap berlaku
   lewat SET_AWAL di logika.js. */

import { t as tr } from '../core/i18n.js?v=20261024171500';
import { ikon } from './ikon.js?v=20261024171500';

export function pengaturanView() {
  return `<div class="mus mus-set" data-mus-root>
    <header class="mus-set-kepala">
      <span class="mus-set-ikon">${ikon('sliders')}</span>
      <div><h2 class="mus-set-h">${tr('Pengaturan Musik')}</h2>
      <p class="mus-catatan">${tr('Perilaku pemutar dan tampilan Musik')}</p></div>
    </header>
    <p class="mus-set-kosong">${tr('Belum ada pengaturan.')}</p>
  </div>`;
}
