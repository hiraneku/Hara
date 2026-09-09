/* Menu "/" — sisipkan blok dasar.

   Hanya blok dasar; command lanjutan sengaja tidak dimasukkan.
   Bisa difilter dengan mengetik, dipilih lewat sentuh maupun papan ketik. */

import { esc } from '../../core/dom.js?v=20260909063332';
import { t as tr } from '../../core/i18n.js?v=20260909063332';

/* [ikon, nama, pintasan markdown, aksi, kata kunci pencarian] */
export const SLASH = [
  ['i-txt',    'Teks',             '',        'b-p',     'teks paragraf paragraph biasa text plain'],
  ['i-hash',   'Heading 1',        '#',       'b-h1',    'heading judul h1 besar title big'],
  ['i-hash',   'Heading 2',        '##',      'b-h2',    'heading judul h2 title'],
  ['i-hash',   'Heading 3',        '###',     'b-h3',    'heading judul h3 kecil title small'],
  ['i-list',   'Daftar',           '-',       'b-li',    'daftar bullet list butir titik bullets'],
  ['i-listol', 'Daftar bernomor',  '1.',      'b-ol',    'daftar nomor numbered ordered urut list'],
  ['i-check2', 'To-do',            '- [ ]',   'b-todo',  'todo checkbox centang tugas task'],
  ['i-quote',  'Kutipan',          '>',       'b-quote', 'kutipan quote block'],
  ['i-code',   'Kode',             '```',     'b-code',  'kode code blok program block'],
  ['i-minus',  'Pembatas',         '---',     'hr',      'pembatas divider garis pemisah line'],
  ['i-img',    'Gambar',           '',        'img',     'gambar image foto sisip photo picture'],
  /* aksi cepat tambahan (B13) — bukan blok, tapi jalan pintas yang
     dipakai tanpa keluar dari alur ketikan */
  ['i-cal',    'Tanggal hari ini', '',        'date',    'tanggal hari ini now date waktu today'],
  ['i-tag',    'Warna tag…',       '',        'tagwarna','warna tag label chip # color'],
];

/* Saring berdasarkan apa yang diketik setelah "/". */
export function saringSlash(kunci) {
  const q = (kunci || '').trim().toLowerCase();
  if (!q) return SLASH;
  return SLASH.filter(([, nama, , , tag]) =>
    nama.toLowerCase().includes(q) || (tag || '').includes(q));
}

export function slashMenu(kunci = '') {
  const isi = saringSlash(kunci);
  if (!isi.length)
    return `<div class="pop-h">${tr('Sisipkan blok')}</div>
      <p class="pop-note">${tr('Tidak ada yang cocok dengan')} "${esc(kunci)}".</p>`;

  return `<div class="pop-h">${tr('Sisipkan blok')}</div>` +
    isi.map(([ikon, nama, tombol, aksi], i) =>
      `<button class="pop-i${i === 0 ? ' sel' : ''}" data-blk="${aksi}">
        <svg class="ico"><use href="#${ikon}"/></svg>${esc(tr(nama))}
        ${tombol ? `<span class="k">${esc(tombol)}</span>` : ''}
      </button>`).join('');
}
