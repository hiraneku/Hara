/* Menu "Lainnya" di Beranda.

   Lembar bawah berisi:
   - bar pencarian di atas, untuk mencari fitur berdasarkan nama;
   - grid layar utama (item dengan utama: true) saat kolom cari kosong;
   - daftar hasil dari SEMUA fitur (termasuk sub-fitur seperti Arsip, Tag,
     Sampah, Statistik) saat kolom cari berisi, dengan keterangan grupnya.

   Daftar datang dari registri core/menu-fitur.js (diisi di app.js). Kartu yang
   diketuk menutup lembar lalu menjalankan aksinya. */

import { t as tr } from '../core/i18n.js?v=20261024182343';
import { ambilGrupFitur } from '../core/menu-fitur.js?v=20261024182343';
import { esc } from '../core/dom.js?v=20261024182343';
import { openPop, closeAll } from '../notes/menus/pop.js?v=20261024182343';
import { sheet, shAksi } from '../notes/sheet.js?v=20261024182343';

/* Semua fitur dalam bentuk datar, dan peta id → aksi untuk klik. */
let semua = [];
let peta = new Map();

const teksCari = x => (x.label + ' ' + (x.hint || '') + ' ' + (x.grup || '')).toLowerCase();

/* Kartu grid (layar utama): ikon di atas nama, keterangan di bawah. */
function kartu(x) {
  return `<button type="button" class="fm-item" data-fm-id="${esc(x.id)}"${x.hint ? ` title="${esc(x.hint)}"` : ''}>
      <span class="fm-ikon" aria-hidden="true"><svg class="ico"><use href="#${esc(x.ikon || 'i-circle')}"/></svg></span>
      <span class="fm-teks"><b>${esc(x.label)}</b>${x.hint ? `<small>${esc(x.hint)}</small>` : ''}</span>
    </button>`;
}

/* Baris hasil pencarian: nama, lalu grup dan keterangan. */
function baris(x) {
  const ket = [x.grup, x.hint].filter(Boolean).join(' · ');
  return `<button type="button" class="fm-baris" data-fm-id="${esc(x.id)}">
      <span class="fm-ikon" aria-hidden="true"><svg class="ico"><use href="#${esc(x.ikon || 'i-circle')}"/></svg></span>
      <span class="fm-teks"><b>${esc(x.label)}</b>${ket ? `<small>${esc(ket)}</small>` : ''}</span>
    </button>`;
}

function isiMenu(q) {
  if (!q) {
    const utama = semua.filter(x => x.utama);
    return `<div class="fm-kisi">${utama.map(kartu).join('')}</div>`;
  }
  const hasil = semua
    .filter(x => teksCari(x).includes(q))
    .sort((a, b) => Number(b.label.toLowerCase().startsWith(q)) - Number(a.label.toLowerCase().startsWith(q)));
  return hasil.length
    ? `<div class="fm-daftar">${hasil.map(baris).join('')}</div>`
    : `<p class="sh-kosong">${tr('Tidak ada fitur yang cocok')}</p>`;
}

export function bukaMenuFitur() {
  const grup = ambilGrupFitur();
  semua = grup.flatMap(g => g.item.map(x => ({ ...x, grup: g.judul })));
  peta = new Map(semua.map(x => [x.id, x]));

  openPop(sheet({
    ikon: 'i-list',
    judul: tr('Lainnya'),
    catatan: esc(tr('Cari fitur berdasarkan nama, atau ketuk layar utama.')),
    isi: `<label class="fm-bar">
        <svg class="ico" aria-hidden="true"><use href="#i-search"/></svg>
        <input id="fm-cari" type="search" autocomplete="off" enterkeyhint="search"
          placeholder="${esc(tr('Cari fitur, mis. musik'))}" aria-label="${esc(tr('Cari fitur'))}">
      </label>
      <div id="fm-isi">${isiMenu('')}</div>`,
    kaki: shAksi({ batal: tr('Tutup'), tutup: true }),
    kelas: 'fm-sheet',
  }));
}

/* Pemasangan sekali (dari mulaiBeranda). */
let terpasang = false;
export function pasangMenuFitur() {
  if (terpasang) return;
  terpasang = true;

  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-fm-id]');
    if (!b) return;
    const x = peta.get(b.dataset.fmId);
    closeAll();
    if (x && typeof x.jalan === 'function') x.jalan();
  });

  document.addEventListener('input', e => {
    if (!e.target || e.target.id !== 'fm-cari') return;
    const wadah = document.getElementById('fm-isi');
    if (wadah) wadah.innerHTML = isiMenu(e.target.value.trim().toLowerCase());
  });
}
