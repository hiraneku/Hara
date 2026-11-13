/* Layar Daftar Putar (view 'musik-daftar'): daftar semua daftar putar, dan detail
   satu daftar (ganti nama, putar, urutkan, keluarkan, tambah lagu dari pustaka). */

import { cur, go } from '../core/router.js?v=20261105210000';
import { esc } from '../core/dom.js?v=20261105210000';
import { t as tr } from '../core/i18n.js?v=20261105210000';
import { toast } from '../core/toast.js?v=20261105210000';
import * as S from './simpan.js?v=20261113230000';
import * as D from './daftar.js?v=20261113230000';
import * as A from './aksi.js?v=20261113230000';
import { formatWaktu, pindahItem } from './logika.js?v=20261113230000';
import { ikon } from './ikon.js?v=20261113230000';
import * as M3U from './m3u.js?v=20261113230000';

let buka = null;          /* id daftar yang sedang dibuka; null = daftar semua */
let hapusSiap = null;
let hapusTimer = null;
let pratinjauM3U = null;

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
      <button type="button" class="mus-ikon-btn mus-ikon-kecil" data-dl="m3u-ekspor" data-id="${esc(d.id)}" aria-label="${tr('Ekspor playlist M3U')}">${ikon('ekspor')}</button>
      <button type="button" class="mus-ikon-btn mus-ikon-kecil" data-dl="putar" data-id="${esc(d.id)}" data-indeks="0"
        aria-label="${tr('Putar daftar')}"${d.lagu.length ? '' : ' disabled'}>${ikon('play')}</button>
    </li>`).join('');
  return `<section class="mus-kartu mus-set-kartu">
      <div class="mus-daftar-baru">
        <input type="text" class="mus-teks" maxlength="60" placeholder="${tr('Nama daftar baru')}" data-dl-input="baru" aria-label="${tr('Nama daftar baru')}">
        <button type="button" class="mus-tombol" data-dl="buat">${ikon('plus')}<span>${tr('Buat')}</span></button>
      </div>
      <div class="mus-aksi-baris mus-smart-links"><button type="button" class="mus-tombol" data-dl="pintar">${ikon('pintar')}<span>${tr('Daftar putar pintar')}</span></button><button type="button" class="mus-tombol" data-dl="riwayat">${ikon('list')}<span>${tr('Riwayat & statistik')}</span></button></div>
      <div class="mus-aksi-baris"><button type="button" class="mus-chip" data-dl="m3u-impor">${ikon('impor')}<span>${tr('Impor playlist M3U')}</span></button><button type="button" class="mus-chip" data-dl="m3u-ekspor-semua">${ikon('ekspor')}<span>${tr('Ekspor seluruh pustaka')}</span></button><input type="file" accept=".m3u,.m3u8,audio/x-mpegurl,application/vnd.apple.mpegurl" data-dl-m3u hidden></div>
      ${pratinjauM3U ? `<div class="mus-m3u-pratinjau" role="region" aria-label="${tr('Pratinjau impor playlist')}"><h3>${tr('Tinjau playlist sebelum ditambahkan')}</h3><p>${pratinjauM3U.rows.filter(x => x.lagu).length} ${tr('cocok dengan pustaka')} · ${pratinjauM3U.rows.filter(x => !x.lagu).length} ${tr('tidak ditemukan atau ambigu')}</p><label>${tr('Nama daftar')}<input class="mus-teks" data-dl-input="m3u-nama" maxlength="60" value="${esc(pratinjauM3U.nama)}"></label><p class="mus-catatan">${tr('Berkas M3U hanya berisi daftar dan metadata, bukan audio. Audio yang tidak ada di pustaka Hara tidak akan disalin.')}</p><div class="mus-aksi-baris"><button type="button" class="mus-tombol" data-dl="m3u-konfirmasi">${ikon('check')}<span>${tr('Buat daftar dari lagu cocok')}</span></button><button type="button" class="mus-chip" data-dl="m3u-batal">${tr('Batal')}</button></div></div>` : ''}
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

function eksporM3U(id = null) {
  const daftar = id ? D.daftarById(id) : null;
  const target = daftar || { nama: 'Pustaka Hara', lagu: S.daftarLagu().map(x => x.id) };
  const konten = M3U.buatM3U(target, S.daftarLagu());
  const url = URL.createObjectURL(new Blob([konten], { type: 'audio/x-mpegurl;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = `${(target.nama || 'playlist').replace(/[^\p{L}\p{N}._ -]+/gu, '').trim() || 'playlist'}.m3u`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function mulaiImporM3U(file) {
  if (!file) return;
  if (file.size > 2_000_000) { toast(tr('Berkas M3U terlalu besar')); return; }
  file.text().then(text => {
    const rows = M3U.cocokkanM3U(M3U.parseM3U(text), S.daftarLagu());
    if (!rows.length) { toast(tr('Playlist tidak berisi lagu')); return; }
    pratinjauM3U = { nama: file.name.replace(/\.(m3u8?)$/i, '').slice(0, 60) || 'Playlist impor', rows };
    go('musik-daftar', { segar: true });
  }).catch(error => toast(tr(error?.message || 'Berkas M3U tidak dapat dibaca')));
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
    case 'pintar': go('musik-pintar'); return;
    case 'riwayat': go('musik-riwayat'); return;
    case 'm3u-impor': document.querySelector('[data-dl-m3u]')?.click(); return;
    case 'm3u-ekspor-semua': eksporM3U(); return;
    case 'm3u-ekspor': eksporM3U(id); return;
    case 'm3u-batal': pratinjauM3U = null; break;
    case 'm3u-konfirmasi': {
      if (!pratinjauM3U) return;
      const name = document.querySelector('[data-dl-input="m3u-nama"]')?.value || pratinjauM3U.nama;
      const idBaru = D.buatDaftar(name); if (!idBaru) { toast(tr('Nama daftar tidak boleh kosong')); return; }
      const matched = pratinjauM3U.rows.filter(x => x.lagu);
      matched.forEach(x => D.tambahLagu(idBaru, x.lagu.id));
      pratinjauM3U = null; buka = idBaru; toast(tr('{n} lagu ditambahkan dari M3U', { n: matched.length })); break;
    }
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
  if (!aktif() || !t || !t.matches) return;
  if (t.matches('[data-dl-m3u]')) { const file = t.files?.[0]; t.value = ''; mulaiImporM3U(file); return; }
  if (!t.matches('[data-dl-input="nama"]')) return;
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
