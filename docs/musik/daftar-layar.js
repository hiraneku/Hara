/* Layar Daftar Putar (view 'musik-daftar'): daftar semua daftar putar, dan detail
   satu daftar (ganti nama, putar, urutkan, keluarkan, tambah lagu dari pustaka). */

import { cur, go } from '../core/router.js?v=20261024182343';
import { esc } from '../core/dom.js?v=20261024182343';
import { t as tr } from '../core/i18n.js?v=20261024182343';
import { toast } from '../core/toast.js?v=20261024182343';
import * as S from './simpan.js?v=20261024182343';
import * as D from './daftar.js?v=20261024182343';
import * as A from './aksi.js?v=20261024182343';
import { formatWaktu, pindahItem } from './logika.js?v=20261024182343';
import { ikon } from './ikon.js?v=20261024182343';

let buka = null;          /* id daftar yang sedang dibuka; null = daftar semua */
let hapusSiap = null;
let hapusTimer = null;

function kepala(judul, catatan, ikonNama) {
  return `<header class="mus-set-kepala">
    <span class="mus-set-ikon">${ikon(ikonNama)}</span>
    <div><h2 class="mus-set-h">${tr(judul)}</h2><p class="mus-catatan">${catatan}</p></div>
  </header>`;
}

function listHtml() {
  const daftar = D.semuaDaftar();
  const baris = daftar.map(d => `<li class="mus-item">
      <button type="button" class="mus-item-buka" data-dl="buka" data-id="${esc(d.id)}">
        <span class="mus-thumb-wrap"><span class="mus-thumb mus-thumb-daftar">${ikon('list')}</span></span>
        <span class="mus-item-teks">
          <span class="mus-item-judul">${esc(d.nama)}</span>
          <span class="mus-item-sub">${d.lagu.length} ${tr('lagu')}</span>
        </span>
        ${ikon('chev', 'mus-chev')}
      </button>
      <button type="button" class="mus-ikon-btn mus-ikon-kecil" data-dl="putar" data-id="${esc(d.id)}" data-indeks="0"
        aria-label="${tr('Putar daftar')}"${d.lagu.length ? '' : ' disabled'}>${ikon('play')}</button>
    </li>`).join('');
  return `<section class="mus-kartu mus-set-kartu">
      <div class="mus-daftar-baru">
        <input type="text" class="mus-teks" maxlength="60" placeholder="${tr('Nama daftar baru')}" data-dl-input="baru" aria-label="${tr('Nama daftar baru')}">
        <button type="button" class="mus-tombol" data-dl="buat">${ikon('plus')}<span>${tr('Buat')}</span></button>
      </div>
    </section>
    <section class="mus-kartu mus-set-kartu">
      ${daftar.length
        ? `<ul class="mus-daftar">${baris}</ul>`
        : `<p class="mus-kosong-kecil">${tr('Belum ada daftar putar. Buat satu di atas, lalu tambahkan lagu dari pustaka.')}</p>`}
    </section>`;
}

function detailHtml(d) {
  const lagu = d.lagu.map(id => S.laguById(id)).filter(Boolean);
  const daftarLain = S.daftarLagu().filter(x => !d.lagu.includes(x.id));
  const siap = hapusSiap === d.id;
  const isi = lagu.map((x, i) => `<li class="mus-item">
      <button type="button" class="mus-item-buka" data-dl="putar" data-id="${esc(d.id)}" data-indeks="${i}">
        <span class="mus-thumb-wrap"><span class="mus-thumb" data-sampul-id="${esc(x.id)}"></span></span>
        <span class="mus-item-teks">
          <span class="mus-item-judul">${esc(x.nama)}</span>
          <span class="mus-item-sub">${formatWaktu(x.durasi)}</span>
        </span>
      </button>
      <button type="button" class="mus-ikon-btn mus-ikon-kecil" data-dl="naik" data-id="${esc(d.id)}" data-indeks="${i}" aria-label="${tr('Naikkan')}"${i === 0 ? ' disabled' : ''}>${ikon('pindahAtas')}</button>
      <button type="button" class="mus-ikon-btn mus-ikon-kecil" data-dl="turun" data-id="${esc(d.id)}" data-indeks="${i}" aria-label="${tr('Turunkan')}"${i === lagu.length - 1 ? ' disabled' : ''}>${ikon('pindahBawah')}</button>
      <button type="button" class="mus-ikon-btn mus-ikon-kecil" data-dl="keluarkan" data-id="${esc(d.id)}" data-lagu="${esc(x.id)}" aria-label="${tr('Keluarkan dari daftar')}">${ikon('x')}</button>
    </li>`).join('');
  const tambah = daftarLain.map(x => `<li class="mus-item">
      <span class="mus-item-buka mus-item-statis">
        <span class="mus-thumb-wrap"><span class="mus-thumb" data-sampul-id="${esc(x.id)}"></span></span>
        <span class="mus-item-teks">
          <span class="mus-item-judul">${esc(x.nama)}</span>
          <span class="mus-item-sub">${formatWaktu(x.durasi)}</span>
        </span>
      </span>
      <button type="button" class="mus-ikon-btn mus-ikon-kecil" data-dl="tambah" data-id="${esc(d.id)}" data-lagu="${esc(x.id)}" aria-label="${tr('Tambahkan ke daftar')}">${ikon('plus')}</button>
    </li>`).join('');
  return `<section class="mus-kartu mus-set-kartu">
      <div class="mus-daftar-baru">
        <input type="text" class="mus-teks" maxlength="60" value="${esc(d.nama)}" data-dl-input="nama" data-id="${esc(d.id)}" aria-label="${tr('Nama daftar')}">
      </div>
      <p class="mus-catatan mus-set-pad">${lagu.length} ${tr('lagu')}</p>
      <div class="mus-aksi-baris">
        <button type="button" class="mus-tombol" data-dl="putar" data-id="${esc(d.id)}" data-indeks="0"${lagu.length ? '' : ' disabled'}>${ikon('play')}<span>${tr('Putar semua')}</span></button>
        <button type="button" class="mus-set-bahaya mus-set-bahaya-kecil${siap ? ' siap' : ''}" data-dl="hapus-daftar" data-id="${esc(d.id)}">${ikon('trash')}<span>${siap ? tr('Ketuk lagi') : tr('Hapus daftar')}</span></button>
      </div>
    </section>
    <section class="mus-kartu mus-set-kartu">
      <h3 class="mus-set-judul-bagian">${tr('Lagu dalam daftar')}</h3>
      ${isi ? `<ul class="mus-daftar">${isi}</ul>` : `<p class="mus-kosong-kecil">${tr('Belum ada lagu. Tambahkan dari pustaka di bawah.')}</p>`}
    </section>
    <section class="mus-kartu mus-set-kartu">
      <h3 class="mus-set-judul-bagian">${tr('Tambah dari pustaka')}</h3>
      ${tambah ? `<ul class="mus-daftar">${tambah}</ul>` : `<p class="mus-kosong-kecil">${tr('Semua lagu sudah ada di daftar ini.')}</p>`}
    </section>`;
}

/* Dipanggil tombol Daftar putar di bar Musik: selalu mulai dari daftar semua. */
export function bukaDaftarSemua() { buka = null; hapusSiap = null; }

export function daftarView() {
  const d = buka ? D.daftarById(buka) : null;
  if (buka && !d) buka = null;
  const isi = d
    ? `<button type="button" class="mus-chip mus-chip-hantu" data-dl="kembali">${ikon('pindahAtas')}<span>${tr('Semua daftar')}</span></button>${detailHtml(d)}`
    : listHtml();
  return `<div class="mus mus-set" data-mus-root>
    ${kepala('Daftar Putar', d ? tr('Ubah nama, putar, atau atur urutan lagu') : tr('Kumpulan lagu yang kamu susun sendiri'), 'list')}
    ${isi}
  </div>`;
}

function aktif() { return cur === 'musik-daftar'; }

function buat(input) {
  const id = D.buatDaftar(input.value);
  if (!id) { toast(tr('Isi nama daftar dulu')); return; }
  buka = id;
  go('musik-daftar', { segar: true });
}

function putar(id, indeks) {
  A.mainkanDaftar(id, indeks).then(() => go('musik'));
}

function onClick(e) {
  if (!aktif()) return;
  const b = e.target.closest && e.target.closest('[data-dl]');
  if (!b || b.disabled) return;
  const aksi = b.dataset.dl;
  const id = b.dataset.id;
  const indeks = Number(b.dataset.indeks || 0);
  switch (aksi) {
    case 'buat': buat(document.querySelector('[data-dl-input="baru"]')); return;
    case 'buka': buka = id; break;
    case 'kembali': buka = null; break;
    case 'putar': putar(id, indeks); return;
    case 'naik':
    case 'turun': {
      const d = D.daftarById(id);
      if (!d) return;
      D.urutkanLagu(id, pindahItem(d.lagu, indeks, aksi === 'naik' ? -1 : 1));
      break;
    }
    case 'keluarkan':
      D.keluarkanLagu(id, b.dataset.lagu);
      break;
    case 'tambah':
      D.tambahLagu(id, b.dataset.lagu);
      break;
    case 'hapus-daftar': {
      if (hapusSiap !== id) {
        hapusSiap = id;
        clearTimeout(hapusTimer);
        hapusTimer = setTimeout(() => { hapusSiap = null; if (aktif()) go('musik-daftar', { segar: true }); }, 3000);
        go('musik-daftar', { segar: true });
        return;
      }
      clearTimeout(hapusTimer);
      hapusSiap = null;
      D.hapusDaftar(id);
      buka = null;
      break;
    }
    default: return;
  }
  go('musik-daftar', { segar: true });
}

function onChange(e) {
  const t = e.target;
  if (!aktif() || !t || !t.matches || !t.matches('[data-dl-input="nama"]')) return;
  if (!D.ubahNama(t.dataset.id, t.value)) toast(tr('Nama daftar tidak boleh kosong'));
  go('musik-daftar', { segar: true });
}

function onKey(e) {
  if (!aktif() || e.key !== 'Enter') return;
  const t = e.target;
  if (t && t.matches && t.matches('[data-dl-input="baru"]')) { e.preventDefault(); buat(t); }
  if (t && t.matches && t.matches('[data-dl-input="nama"]')) { e.preventDefault(); t.blur(); }
}

export function pasangDaftar() {
  document.addEventListener('click', onClick);
  document.addEventListener('change', onChange);
  document.addEventListener('keydown', onKey);
}
