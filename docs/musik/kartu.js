/* Kartu musik di beranda: menggantikan placeholder "Snowfall". Menampilkan lagu
   terakhir yang diputar dengan sampulnya. Ketuk badan kartu → layar Musik;
   tombol putar → lanjut/jeda lagu itu. */

import { esc } from '../core/dom.js?v=20261026043151';
import { t as tr } from '../core/i18n.js?v=20261026043151';
import * as M from './mesin.js?v=20261026043151';
import * as S from './simpan.js?v=20261026043151';
import { formatWaktu, laguTerakhir } from './logika.js?v=20261026043151';
import { ikon } from './ikon.js?v=20261026043151';

/* Lagu yang ditampilkan: yang terakhir diputar, atau yang terakhir diimpor. */
function laguKartu() {
  const id = S.terakhirId();
  if (id) return S.laguById(id);
  return laguTerakhir(S.daftarLagu());
}

function posisiDurasi(x) {
  const k = M.keadaan();
  const loaded = k.id === x.id;
  const posisi = loaded ? k.posisi : (S.aturLagu(x.id).posisi || 0);
  return { loaded, k, posisi, durasi: x.durasi || 0 };
}

function persen(posisi, durasi) {
  return durasi > 0 ? Math.min(100, (posisi / durasi) * 100) : 0;
}

export function kartuMusikHtml() {
  const x = laguKartu();
  if (!x) {
    return `<section class="bh-kartu mk mk-kosong" aria-label="${tr('Musik')}">
      <button type="button" class="mk-buka" data-bh="musik-buka">
        <span class="mk-art mk-art-kosong" aria-hidden="true">${ikon('nota')}</span>
        <span class="mk-info">
          <span class="mk-label">${tr('Musik')}</span>
          <span class="mk-judul">${tr('Belum ada lagu')}</span>
          <span class="mk-sub">${tr('Ketuk untuk impor lagu dari perangkat')}</span>
        </span>
      </button>
    </section>`;
  }
  const { k, posisi, durasi, loaded } = posisiDurasi(x);
  const putar = loaded && k.status === 'putar';
  return `<section class="bh-kartu mk${putar ? ' mk-main' : ''}" aria-label="${tr('Musik')}" data-mk-id="${esc(x.id)}">
    <button type="button" class="mk-buka" data-bh="musik-buka" aria-label="${tr('Buka layar Musik')}">
      <span class="mk-art" data-sampul-id="${esc(x.id)}" aria-hidden="true"></span>
      <span class="mk-info">
        <span class="mk-label">${tr('Terakhir diputar')}</span>
        <span class="mk-judul" data-mk="judul">${esc(x.nama)}</span>
        <span class="mk-bar" aria-hidden="true"><span class="mk-bar-isi" data-mk="bar" style="width:${persen(posisi, durasi).toFixed(2)}%"></span></span>
        <span class="mk-waktu"><span data-mk="pos">${formatWaktu(posisi)}</span><span>${formatWaktu(durasi)}</span></span>
      </span>
    </button>
    <button type="button" class="mk-putar" data-bh="musik-putar" data-mk="putar"
      aria-label="${putar ? tr('Jeda') : tr('Putar')}">${ikon(putar ? 'pause' : 'play')}</button>
  </section>`;
}

/* Segarkan angka dan tombol di kartu tanpa render ulang beranda. */
export function segarkanKartuMusik() {
  const kartu = document.querySelector('.mk[data-mk-id]');
  if (!kartu) return;
  const x = S.laguById(kartu.dataset.mkId);
  if (!x) return;
  const { k, posisi, durasi, loaded } = posisiDurasi(x);
  const bar = kartu.querySelector('[data-mk="bar"]');
  if (bar) bar.style.width = `${persen(posisi, durasi).toFixed(2)}%`;
  const pos = kartu.querySelector('[data-mk="pos"]');
  if (pos) pos.textContent = formatWaktu(posisi);
  const sedang = loaded && k.status === 'putar';
  kartu.classList.toggle('mk-main', sedang);
  const tombol = kartu.querySelector('[data-mk="putar"]');
  if (tombol) {
    tombol.innerHTML = ikon(sedang ? 'pause' : 'play');
    tombol.setAttribute('aria-label', sedang ? tr('Jeda') : tr('Putar'));
  }
}
