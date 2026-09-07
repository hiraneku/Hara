/* Menu "/" — sisipkan blok dasar.

   Hanya blok dasar; command lanjutan sengaja tidak dimasukkan.
   Bisa difilter dengan mengetik, dipilih lewat sentuh maupun papan ketik. */

import { esc } from '../../core/dom.js?v=20260907111650';

/* [ikon, nama, pintasan markdown, aksi, kata kunci pencarian] */
export const SLASH = [
  ['i-txt',    'Teks',             '',        'b-p',     'teks paragraf paragraph biasa'],
  ['i-hash',   'Heading 1',        '#',       'b-h1',    'heading judul h1 besar'],
  ['i-hash',   'Heading 2',        '##',      'b-h2',    'heading judul h2'],
  ['i-hash',   'Heading 3',        '###',     'b-h3',    'heading judul h3 kecil'],
  ['i-list',   'Daftar',           '-',       'b-li',    'daftar bullet list butir titik'],
  ['i-listol', 'Daftar bernomor',  '1.',      'b-ol',    'daftar nomor numbered ordered urut'],
  ['i-check2', 'To-do',            '- [ ]',   'b-todo',  'todo checkbox centang tugas'],
  ['i-quote',  'Kutipan',          '>',       'b-quote', 'kutipan quote'],
  ['i-code',   'Kode',             '```',     'b-code',  'kode code blok program'],
  ['i-minus',  'Pembatas',         '---',     'hr',      'pembatas divider garis pemisah'],
  ['i-img',    'Gambar',           '',        'img',     'gambar image foto sisip'],
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
    return `<div class="pop-h">Sisipkan blok</div>
      <p class="pop-note">Tidak ada yang cocok dengan "${esc(kunci)}".</p>`;

  return `<div class="pop-h">Sisipkan blok</div>` +
    isi.map(([ikon, nama, tombol, aksi], i) =>
      `<button class="pop-i${i === 0 ? ' sel' : ''}" data-blk="${aksi}">
        <svg class="ico"><use href="#${ikon}"/></svg>${esc(nama)}
        ${tombol ? `<span class="k">${esc(tombol)}</span>` : ''}
      </button>`).join('');
}
