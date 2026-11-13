import { cur, go } from '../core/router.js?v=20261023235452';
import { esc } from '../core/dom.js?v=20261023235452';
import { t as tr } from '../core/i18n.js?v=20261023235452';
import * as S from './simpan.js?v=20261023235452';
import * as A from './aksi.js?v=20261023235452';
import * as P from './pintar.js?v=20261023235452';
import * as R from './riwayat.js?v=20261023235452';
import { ikon } from './ikon.js?v=20261023235452';
function count(id) { return R.statistikRiwayat().hitung.get(id) || 0; }
export function pintarView() {
  const daftar = P.semuaPintar(), lagu = S.daftarLagu();
  const forms = daftar.map(d => {
    const hasil = P.laguPintar(d, lagu, Date.now(), count);
    return `<article class="mus-kartu mus-set-kartu"><h3 class="mus-set-judul-bagian">${esc(d.nama)} <span class="mus-catatan">${hasil.length} ${tr('lagu')}</span></h3><p class="mus-catatan">${esc(P.teksAturan(d.aturan))}</p><div class="mus-aksi-baris"><button class="mus-tombol" data-pintar="play" data-id="${esc(d.id)}"${hasil.length ? '' : ' disabled'}>${ikon('play')}<span>${tr('Putar hasil')}</span></button><button class="mus-set-bahaya mus-set-bahaya-kecil" data-pintar="delete" data-id="${esc(d.id)}">${ikon('trash')}<span>${tr('Hapus aturan')}</span></button></div><ul class="mus-daftar">${hasil.slice(0, 8).map(x => `<li class="mus-item"><span class="mus-item-teks"><span class="mus-item-judul">${esc(x.nama)}</span><span class="mus-item-sub">${esc(x.artis || '')}</span></span></li>`).join('')}</ul></article>`;
  }).join('');
  return `<div class="mus mus-set" data-pintar-root><header class="mus-set-kepala"><span class="mus-set-ikon">${ikon('pintar')}</span><div><h2 class="mus-set-h">${tr('Daftar putar pintar')}</h2><p class="mus-catatan">${tr('Aturan transparan; hasil dihitung langsung dari pustaka dan tidak memindahkan atau menghapus lagu.')}</p></div></header>
  <section class="mus-kartu mus-set-kartu"><h3 class="mus-set-judul-bagian">${tr('Buat aturan')}</h3><label class="mus-pg-baris"><span>${tr('Nama')}</span><input class="mus-teks" data-pintar-input="nama" maxlength="60" placeholder="${tr('Misalnya: Favorit malam')}"></label>
  <label class="mus-pg-baris"><span>${tr('Artis memuat')}</span><input class="mus-teks" data-pintar-input="artis" maxlength="80"></label>
  <label class="mus-pg-baris"><span>${tr('Baru ditambahkan dalam (hari; 0 = tanpa batas)')}</span><input class="mus-angka" data-pintar-input="hari" type="number" min="0" max="3650" value="0"></label>
  <label class="mus-pg-baris"><span>${tr('Durasi minimum (menit)')}</span><input class="mus-angka" data-pintar-input="durasi" type="number" min="0" max="1440" value="0"></label>
  <label class="mus-pg-baris"><span>${tr('Urutkan hasil')}</span><select class="mus-teks" data-pintar-input="sort"><option value="nama">${tr('Nama')}</option><option value="baru">${tr('Terbaru')}</option><option value="sering">${tr('Paling sering diputar')}</option><option value="durasi">${tr('Durasi terpanjang')}</option></select></label>
  <label class="mus-pg-baris"><span>${tr('Hanya favorit')}</span><input type="checkbox" data-pintar-input="favorit"></label><button class="mus-tombol" data-pintar="create">${ikon('plus')}<span>${tr('Simpan aturan')}</span></button><p class="mus-catatan">${tr('Jumlah hasil dan kriteria ditampilkan untuk ditinjau sebelum diputar.')}</p></section>${forms}</div>`;
}
function onClick(e) {
  if (cur !== 'musik-pintar') return;
  const b = e.target.closest('[data-pintar]'); if (!b) return;
  const nama = document.querySelector('[data-pintar-input="nama"]');
  if (b.dataset.pintar === 'create') {
    const d = P.buatPintar(nama?.value, {
      artis: document.querySelector('[data-pintar-input="artis"]')?.value,
      dalamHari: Number(document.querySelector('[data-pintar-input="hari"]')?.value),
      minDetik: Number(document.querySelector('[data-pintar-input="durasi"]')?.value) * 60,
      sort: document.querySelector('[data-pintar-input="sort"]')?.value,
      favorit: document.querySelector('[data-pintar-input="favorit"]')?.checked,
    });
    if (!d) return;
  } else if (b.dataset.pintar === 'delete') P.hapusPintar(b.dataset.id);
  else if (b.dataset.pintar === 'play') {
    const d = P.semuaPintar().find(x => x.id === b.dataset.id);
    const tracks = P.laguPintar(d, S.daftarLagu(), Date.now(), id => R.statistikRiwayat().hitung.get(id) || 0);
    if (!tracks.length) return;
    A.aturAntrean(tracks.map(x => x.id));
    A.mainkanLagu(tracks[0].id).then(() => go('musik'));
    return;
  } else return;
  go('musik-pintar', { segar: true });
}
export function pasangPintar() { document.addEventListener('click', onClick); }
