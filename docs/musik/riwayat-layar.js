import { cur, go } from '../core/router.js?v=20261105210000';
import { esc } from '../core/dom.js?v=20261105210000';
import { t as tr } from '../core/i18n.js?v=20261105210000';
import * as S from './simpan.js?v=20261113230000';
import * as A from './aksi.js?v=20261113230000';
import * as R from './riwayat.js?v=20261113230000';
import { formatWaktu } from './logika.js?v=20261113230000';
import { ikon } from './ikon.js?v=20261113230000';
export function riwayatView() {
  const data = R.ambilRiwayat(), stats = R.statistikRiwayat();
  const rows = data.map(x => {
    const lagu = S.laguById(x.id);
    return lagu ? `<li class="mus-item"><button class="mus-item-buka" data-riwayat="play" data-id="${esc(x.id)}"><span class="mus-thumb-wrap"><span class="mus-thumb">${ikon('nota')}</span></span><span class="mus-item-teks"><span class="mus-item-judul">${esc(lagu.nama)}</span><span class="mus-item-sub">${new Date(x.waktu).toLocaleString()} · ${formatWaktu(lagu.durasi)}</span></span></button></li>` : '';
  }).join('');
  return `<div class="mus mus-set"><header class="mus-set-kepala"><span class="mus-set-ikon">${ikon('list')}</span><div><h2 class="mus-set-h">${tr('Riwayat & statistik')}</h2><p class="mus-catatan">${stats.total} ${tr('pemutaran')} · ${stats.lagu} ${tr('lagu unik')}</p></div></header><section class="mus-kartu mus-set-kartu"><p class="mus-catatan">${tr('Riwayat tersimpan lokal di perangkat ini saja. Matikan atau hapus kapan saja; tidak ada sinkronisasi.')}</p><label class="mus-pg-baris"><span>${tr('Simpan riwayat pemutaran')}</span><input type="checkbox" data-riwayat="toggle"${R.riwayatAktif() ? ' checked' : ''}></label><button class="mus-set-bahaya mus-set-bahaya-kecil" data-riwayat="clear">${ikon('trash')}<span>${tr('Hapus riwayat')}</span></button></section><section class="mus-kartu mus-set-kartu"><h3 class="mus-set-judul-bagian">${tr('Terakhir diputar')}</h3>${rows ? `<ol class="mus-daftar">${rows}</ol>` : `<p class="mus-kosong-kecil">${tr('Belum ada riwayat pemutaran.')}</p>`}</section></div>`;
}
function onClick(e) {
  if (cur !== 'musik-riwayat') return;
  const b = e.target.closest('[data-riwayat]'); if (!b) return;
  if (b.dataset.riwayat === 'clear') R.hapusRiwayat();
  else if (b.dataset.riwayat === 'play') { A.mainkanLagu(b.dataset.id).then(() => go('musik')); return; }
  go('musik-riwayat', { segar: true });
}
function onChange(e) {
  if (cur === 'musik-riwayat' && e.target.matches('[data-riwayat="toggle"]')) {
    R.aturRiwayatAktif(e.target.checked); go('musik-riwayat', { segar: true });
  }
}
export function pasangRiwayat() { document.addEventListener('click', onClick); document.addEventListener('change', onChange); }
