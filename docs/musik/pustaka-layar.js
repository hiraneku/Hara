/* Layar pustaka lengkap. Layar Musik utama hanya menampilkan lima lagu pertama. */
import { cur, go } from '../core/router.js?v=20261105210000';
import { esc } from '../core/dom.js?v=20261105210000';
import { t as tr } from '../core/i18n.js?v=20261105210000';
import * as S from './simpan.js?v=20261105210000';
import * as L from './logika.js?v=20261105210000';
import * as A from './aksi.js?v=20261105210000';
import { ikon } from './ikon.js?v=20261105210000';

function baris(x) {
  const asal = x.sumber === 'perangkat' && x.lokasi ? ` · ${x.lokasi}` : '';
  const sub = [x.artis, x.album].filter(Boolean).join(' · ');
  const info = `${x.nama} ${sub} ${x.lokasi || ''}`.toLocaleLowerCase();
  return `<li class="mus-item" data-pustaka-baris data-cari="${esc(info)}">
    <button type="button" class="mus-item-buka" data-pustaka="pilih" data-id="${esc(x.id)}">
      <span class="mus-thumb-wrap"><span class="mus-thumb" aria-hidden="true">${ikon('nota')}</span></span>
      <span class="mus-item-teks">
        <span class="mus-item-judul">${esc(x.nama)}</span>
        <span class="mus-item-sub">${L.formatWaktu(x.durasi)}${x.ukuran ? ` · ${ukuranTeks(x.ukuran)}` : ''}${sub ? ` · ${esc(sub)}` : ''}${esc(asal)}</span>
      </span>
    </button>
    <button type="button" class="mus-item-antre" data-pustaka="antre" data-id="${esc(x.id)}" aria-label="${tr('Tambahkan ke antrean')}">${ikon('plus')}</button>
  </li>`;
}

function ukuranTeks(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function pustakaView() {
  const semua = S.daftarLagu();
  const pemindai = A.bisaPindaiPustakaPerangkat();
  return `<section class="mus-pustaka-lengkap" data-pustaka-root>
    <header class="mus-kartu-kepala">
      <div><h2 class="mus-pustaka-judul">${tr('Pustaka lagu')}</h2><p class="mus-catatan">${semua.length} ${tr('lagu')}</p></div>
      ${pemindai ? `<button type="button" class="mus-tombol" data-pustaka="scan">${ikon('repeat')}<span>${tr('Pindai ulang')}</span></button>` : ''}
    </header>
    ${pemindai ? `<p class="mus-pustaka-batas">${tr('Audio yang diindeks Android muncul otomatis. Berkas privat atau belum diindeks tidak dapat dipindai Hara; WebM di koleksi video memerlukan izin video.')}</p>` : ''}
    <label class="mus-pustaka-cari">${ikon('cari')}<input type="search" data-pustaka-cari placeholder="${tr('Cari lagu di pustaka')}" aria-label="${tr('Cari lagu di pustaka')}"></label>
    ${semua.length
      ? `<ul class="mus-daftar mus-pustaka-daftar">${semua.map(baris).join('')}</ul>`
      : `<p class="mus-kosong-kecil">${tr('Belum ada lagu')}</p>`}
    <p class="mus-pustaka-hasil" data-pustaka-hasil hidden>${tr('Lagu tidak ditemukan')}</p>
  </section>`;
}

function onClick(e) {
  if (cur !== 'musik-pustaka') return;
  const b = e.target.closest('[data-pustaka]');
  if (!b || b.disabled) return;
  if (b.dataset.pustaka === 'scan') {
    A.pindaiPustakaPerangkat({ pesan: true }).then(() => go('musik-pustaka', { segar: true }));
    return;
  }
  if (b.dataset.pustaka === 'pilih') {
    const id = b.dataset.id;
    A.aturAntrean(null);
    A.mainkanLagu(id).then(() => go('musik'));
    return;
  }
  if (b.dataset.pustaka === 'antre') {
    A.toggleAntrean(b.dataset.id);
    b.classList.toggle('on');
    b.setAttribute('aria-pressed', String(b.classList.contains('on')));
  }
}

function onInput(e) {
  const input = e.target;
  if (cur !== 'musik-pustaka' || !input.matches?.('[data-pustaka-cari]')) return;
  const q = input.value.trim().toLocaleLowerCase();
  let terlihat = 0;
  document.querySelectorAll('[data-pustaka-baris]').forEach(row => {
    const cocok = !q || row.dataset.cari.includes(q);
    row.hidden = !cocok;
    if (cocok) terlihat++;
  });
  const hasil = document.querySelector('[data-pustaka-hasil]');
  if (hasil) hasil.hidden = terlihat > 0;
}

export function pasangPustakaLagu() {
  document.addEventListener('click', onClick);
  document.addEventListener('input', onInput);
}
