/* Menu "Lainnya" di Beranda: daftar layar utama aplikasi.

   Lembar bawah (sheet) berisi kartu ikon untuk setiap layar utama (Catatan,
   Kalender, Tugas, Pengingat, Musik, dan seterusnya). Daftar datang dari
   registri core/menu-fitur.js (diisi di app.js). Kartu yang diketuk menutup
   lembar lalu menjalankan aksinya. Tombol "Cari perintah" membuka palette
   (Ctrl/⌘+K) untuk aksi yang lebih kecil. */

import { t as tr } from '../core/i18n.js?v=20261024035936';
import { ambilGrupFitur } from '../core/menu-fitur.js?v=20261024035936';
import { bukaPalette } from '../core/palette.js?v=20261024035936';
import { esc } from '../core/dom.js?v=20261024035936';
import { openPop, closeAll } from '../notes/menus/pop.js?v=20261024035936';
import { sheet, shAksi } from '../notes/sheet.js?v=20261024035936';

/* id → aksi, diisi tiap menu dibuka. Dipakai saat kartu diketuk. */
let peta = new Map();

function kartu(x) {
  return `<button type="button" class="fm-item" data-fm-id="${esc(x.id)}"${x.hint ? ` title="${esc(x.hint)}"` : ''}>
      <span class="fm-ikon" aria-hidden="true"><svg class="ico"><use href="#${esc(x.ikon || 'i-circle')}"/></svg></span>
      <span class="fm-teks"><b>${esc(x.label)}</b>${x.hint ? `<small>${esc(x.hint)}</small>` : ''}</span>
    </button>`;
}

function daftarHtml(grup) {
  return grup.map(g => `<section class="fm-grup">
      ${g.judul ? `<h3 class="fm-judul">${esc(g.judul)}</h3>` : ''}
      <div class="fm-kisi">${g.item.map(kartu).join('')}</div>
    </section>`).join('') || `<p class="sh-kosong">${tr('Belum ada fitur')}</p>`;
}

export function bukaMenuFitur() {
  const grup = ambilGrupFitur();
  peta = new Map();
  grup.forEach(g => g.item.forEach(x => peta.set(x.id, x)));

  openPop(sheet({
    ikon: 'i-list',
    judul: tr('Fitur utama'),
    catatan: esc(tr('Ketuk untuk membuka layarnya.')),
    isi: daftarHtml(grup),
    kaki: shAksi({ batal: tr('Tutup'), tutup: true, utama: tr('Cari perintah'), utamaId: 'fm-palet' }),
    kelas: 'fm-sheet',
  }));
}

/* Pemasangan sekali (dari mulaiBeranda). */
let terpasang = false;
export function pasangMenuFitur() {
  if (terpasang) return;
  terpasang = true;

  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-fm-id], #fm-palet');
    if (!b) return;
    if (b.id === 'fm-palet') { closeAll(); bukaPalette(); return; }
    const x = peta.get(b.dataset.fmId);
    closeAll();
    if (x && typeof x.jalan === 'function') x.jalan();
  });
}
