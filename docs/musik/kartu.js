/* Kartu musik di beranda: menggantikan placeholder "Snowfall". Menampilkan lagu
   terakhir yang diputar. Ketuk kartu → layar Musik; tombol putar → lanjut/mulai. */

import { esc } from '../core/dom.js?v=20261024040822';
import { t as tr } from '../core/i18n.js?v=20261024040822';
import * as M from './mesin.js?v=20261024040822';
import * as S from './simpan.js?v=20261024040822';
import { formatWaktu, hueDariId, laguTerakhir } from './logika.js?v=20261024040822';
import { ikon } from './ikon.js?v=20261024040822';

/* Lagu yang ditampilkan: yang terakhir diputar, atau yang terakhir diimpor. */
function laguKartu() {
  const id = S.terakhirId();
  if (id) return S.laguById(id);
  return laguTerakhir(S.daftarLagu());
}

export function kartuMusikHtml() {
  const x = laguKartu();
  if (!x) {
    return `<section class="bh-kartu mk mk-kosong" aria-label="${tr('Musik')}">
      <button type="button" class="mk-buka" data-bh="musik-buka">
        <span class="mk-art" aria-hidden="true">${ikon('nota')}</span>
        <span class="mk-info">
          <span class="mk-label">${tr('Musik')}</span>
          <span class="mk-judul">${tr('Belum ada lagu')}</span>
          <span class="mk-sub">${tr('Ketuk untuk impor lagu dari perangkat')}</span>
        </span>
      </button>
    </section>`;
  }
  const k = M.keadaan();
  const loaded = k.id === x.id;
  const posisi = loaded ? k.posisi : (S.aturLagu(x.id).posisi || 0);
  const durasi = x.durasi || 0;
  const persen = durasi > 0 ? Math.min(100, (posisi / durasi) * 100) : 0;
  const putar = loaded && k.status === 'putar';
  const hue = hueDariId(x.id);
  return `<section class="bh-kartu mk" aria-label="${tr('Musik')}" data-mk-id="${esc(x.id)}">
    <button type="button" class="mk-buka" data-bh="musik-buka" aria-label="${tr('Buka layar Musik')}">
      <span class="mk-art" style="--hue:${hue}" aria-hidden="true">${ikon('nota')}</span>
      <span class="mk-info">
        <span class="mk-label">${tr('Terakhir diputar')}</span>
        <span class="mk-judul" data-mk="judul">${esc(x.nama)}</span>
        <span class="mk-bar"><span class="mk-bar-isi" data-mk="bar" style="width:${persen.toFixed(2)}%"></span></span>
        <span class="mk-waktu"><span data-mk="pos">${formatWaktu(posisi)}</span><span>${formatWaktu(durasi)}</span></span>
      </span>
    </button>
    <button type="button" class="mk-putar" data-bh="musik-putar" data-mk="putar"
      aria-label="${putar ? tr('Jeda') : tr('Putar')}">${ikon(putar ? 'pause' : 'play')}</button>
  </section>`;
}

/* Segarkan angka di kartu tanpa render ulang beranda. */
export function segarkanKartuMusik() {
  const kartu = document.querySelector('.mk[data-mk-id]');
  if (!kartu) return;
  const x = S.laguById(kartu.dataset.mkId);
  if (!x) return;
  const k = M.keadaan();
  const loaded = k.id === x.id;
  const posisi = loaded ? k.posisi : (S.aturLagu(x.id).posisi || 0);
  const durasi = x.durasi || 0;
  const persen = durasi > 0 ? Math.min(100, (posisi / durasi) * 100) : 0;
  const bar = kartu.querySelector('[data-mk="bar"]');
  if (bar) bar.style.width = `${persen.toFixed(2)}%`;
  const pos = kartu.querySelector('[data-mk="pos"]');
  if (pos) pos.textContent = formatWaktu(posisi);
  const putar = kartu.querySelector('[data-mk="putar"]');
  if (putar) {
    const sedang = loaded && k.status === 'putar';
    putar.innerHTML = ikon(sedang ? 'pause' : 'play');
    putar.setAttribute('aria-label', sedang ? tr('Jeda') : tr('Putar'));
  }
}
