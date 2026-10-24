/* Menu "Semua fitur": dibuka dari tombol Lainnya di Beranda.

   Lembar bawah (sheet) berisi kolom cari di atas dan semua fitur dalam grup,
   masing-masing sebagai kartu ikon. Daftar fitur datang dari registri
   core/menu-fitur.js (diisi di app.js). Kartu yang diketuk menutup lembar lalu
   menjalankan aksinya. Tombol "Cari perintah" membuka palette (Ctrl/⌘+K). */

import { t as tr } from '../core/i18n.js?v=20261024035417';
import { ambilGrupFitur } from '../core/menu-fitur.js?v=20261024035417';
import { bukaPalette } from '../core/palette.js?v=20261024035417';
import { esc } from '../core/dom.js?v=20261024035417';
import { openPop, closeAll } from '../notes/menus/pop.js?v=20261024035417';
import { sheet, shField, shAksi } from '../notes/sheet.js?v=20261024035417';

/* id → aksi, diisi tiap menu dibuka. Dipakai saat kartu diketuk. */
let peta = new Map();

/* Pencarian mencocokkan judul grup, label, dan hint: "massal" atau "regex" sama-sama menemukan. */
const cocok = (x, judul, q) => !q || (judul + ' ' + x.label + ' ' + (x.hint || '')).toLowerCase().includes(q);

function kartu(x) {
  return `<button type="button" class="fm-item" data-fm-id="${esc(x.id)}"${x.hint ? ` title="${esc(x.hint)}"` : ''}>
      <span class="fm-ikon" aria-hidden="true"><svg class="ico"><use href="#${esc(x.ikon || 'i-circle')}"/></svg></span>
      <span class="fm-teks"><b>${esc(x.label)}</b>${x.hint ? `<small>${esc(x.hint)}</small>` : ''}</span>
    </button>`;
}

function daftarHtml(grup, q) {
  const blok = grup.map(g => {
    const item = g.item.filter(x => cocok(x, g.judul, q));
    if (!item.length) return '';
    return `<section class="fm-grup">
      <h3 class="fm-judul">${esc(g.judul)}</h3>
      <div class="fm-kisi">${item.map(kartu).join('')}</div>
    </section>`;
  }).join('');
  return blok || `<p class="sh-kosong">${tr('Tidak ada fitur yang cocok')}</p>`;
}

let grupAktif = [];

export function bukaMenuFitur() {
  grupAktif = ambilGrupFitur();
  peta = new Map();
  grupAktif.forEach(g => g.item.forEach(x => peta.set(x.id, x)));

  openPop(sheet({
    ikon: 'i-list',
    judul: tr('Semua fitur'),
    catatan: esc(tr('Ketuk fitur untuk membukanya. Ketik di kolom cari untuk menyaring.')),
    isi: `<div class="fm-cari">${shField({
        id: 'fm-cari', ikon: 'i-search', placeholder: tr('Cari fitur'), enter: 'search',
      })}</div>
      <div id="fm-daftar">${daftarHtml(grupAktif, '')}</div>`,
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

  document.addEventListener('input', e => {
    if (!e.target || e.target.id !== 'fm-cari') return;
    const wadah = document.getElementById('fm-daftar');
    if (wadah) wadah.innerHTML = daftarHtml(grupAktif, e.target.value.trim().toLowerCase());
  });
}
