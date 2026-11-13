import { cur, go } from '../core/router.js?v=20261023235452';
import { esc } from '../core/dom.js?v=20261023235452';
import { t as tr } from '../core/i18n.js?v=20261023235452';
import * as S from './simpan.js?v=20261023235452';
import * as A from './aksi.js?v=20261023235452';
import { formatWaktu } from './logika.js?v=20261023235452';
import { ikon } from './ikon.js?v=20261023235452';

export function antreanView() {
  const ids = A.antreanLagu();
  const item = ids.map((id, i) => {
    const x = S.laguById(id);
    if (!x) return '';
    return `<li class="mus-item">
      <button type="button" class="mus-item-buka" data-antri="play" data-id="${esc(id)}"><span class="mus-thumb-wrap"><span class="mus-thumb">${ikon('nota')}</span></span>
        <span class="mus-item-teks"><span class="mus-item-judul">${esc(x.nama)}</span><span class="mus-item-sub">${formatWaktu(x.durasi)}</span></span></button>
      <button type="button" class="mus-ikon-btn mus-ikon-kecil" data-antri="up" data-i="${i}" aria-label="${tr('Naikkan')}"${i === 0 ? ' disabled' : ''}>${ikon('pindahAtas')}</button>
      <button type="button" class="mus-ikon-btn mus-ikon-kecil" data-antri="down" data-i="${i}" aria-label="${tr('Turunkan')}"${i === ids.length - 1 ? ' disabled' : ''}>${ikon('pindahBawah')}</button>
      <button type="button" class="mus-ikon-btn mus-ikon-kecil" data-antri="remove" data-id="${esc(id)}" aria-label="${tr('Keluarkan dari antrean')}">${ikon('x')}</button>
    </li>`;
  }).join('');
  return `<div class="mus mus-set" data-antrian-root><header class="mus-set-kepala"><span class="mus-set-ikon">${ikon('antrean')}</span><div><h2 class="mus-set-h">${tr('Antrean')}</h2><p class="mus-catatan">${tr('Antrean tambahan terpisah dari urutan pustaka dan daftar putar sumber.')}</p></div></header>
  <section class="mus-kartu mus-set-kartu"><div class="mus-aksi-baris"><button class="mus-tombol" data-antri="play-next"${ids.length ? '' : ' disabled'}>${ikon('play')}<span>${tr('Putar berikutnya')}</span></button><button class="mus-set-bahaya mus-set-bahaya-kecil" data-antri="clear"${ids.length ? '' : ' disabled'}>${ikon('trash')}<span>${tr('Kosongkan antrean')}</span></button></div>
  ${item ? `<ol class="mus-daftar">${item}</ol>` : `<p class="mus-kosong-kecil">${tr('Antrean kosong. Tambahkan lagu melalui tombol + di pustaka.')}</p>`}</section></div>`;
}
function onClick(e) {
  if (cur !== 'musik-antrean') return;
  const b = e.target.closest('[data-antri]'); if (!b || b.disabled) return;
  const ids = A.antreanLagu(), i = Number(b.dataset.i);
  switch (b.dataset.antri) {
    case 'up': A.pindahAntrean(i, -1); break;
    case 'down': A.pindahAntrean(i, 1); break;
    case 'remove': A.hapusDariAntrean(b.dataset.id); break;
    case 'clear': A.kosongkanAntrean(); break;
    case 'play': A.mainkanLagu(b.dataset.id).then(() => go('musik')); return;
    case 'play-next': if (ids[0]) A.mainkanLagu(ids[0]).then(() => go('musik')); return;
    default: return;
  }
  go('musik-antrean', { segar: true });
}
export function pasangAntrean() { document.addEventListener('click', onClick); }
