/* Satu baris di daftar catatan.
   Chip tag di bawah cuplikan: sinkron dengan isi catatan (tags.js).
   Chip memfilter daftar lewat data-tag — ditangani delegasi klik di
   notes/index.js (berjalan lebih dulu dari pembuka catatan data-open).

   Thumbnail (B C16): gambar PERTAMA catatan tampil sebagai miniatur di
   kiri — dipasang lewat urlUntuk oleh pasangThumbDaftar() tiap daftar
   digambar (lihat index.js); <img> di sini hanya memuat data-blob.

   Sapuan (D21): baris di daftar utama & arsip dibungkus .srow dengan
   dua tombol aksi di belakangnya (Arsip/Kembalikan + Hapus) — dibuka
   dengan menggeser baris ke kiri (swipe.js). Baris lain (beranda, cari,
   sampah) tetap polos.

   Kunci (D19): catatan terkunci yang belum dibuka di sesi ini dirender
   tanpa judul asli / cuplikan / tag / thumbnail — hanya penanda gembok.
   excerptOf hanya dipanggil untuk catatan yang boleh dilihat, supaya
   isi tidak bocor lewat teks tersembunyi di DOM. */
import { esc, stamp } from '../../core/dom.js?v=20260909100046';
import { excerptOf } from '../note-model.js?v=20260909100046';
import { tandaUntukCatatan, chipTag } from '../label.js?v=20260909100046';
import { terlihat } from '../kunci.js?v=20260909100046';
import { t as tr } from '../../core/i18n.js?v=20260909100046';

/* Miniatur gambar pertama milik catatan; kosong bila tak ada gambar. */
const thumbOf = n => {
  if (!n || !Array.isArray(n.blocks)) return '';
  const g = n.blocks.find(b => b.type === 'image' && b.meta && b.meta.blobId);
  if (!g) return '';
  const id = String(g.meta.blobId).replace(/[\"'<>\\]/g, '');
  if (!id) return '';
  return `<img class="row-th" data-blob="${id}" alt="" draggable="false" loading="lazy">`;
};

/* Baris polos (button). Dibuat terpisah supaya pembungkus sapuan tidak
   menaruh tombol di dalam tombol. */
function barisIsi(n, boleh) {
  const cuplikan = boleh ? excerptOf(n) : '';
  const tg = boleh && Array.isArray(n.tags) ? n.tags : [];
  /* baris di Arsip tidak diberi chip: memfilternya mengarah ke daftar
     utama yang tidak memuat catatan terarsip — membingungkan */
  const chips = (!n.archived && tg.length)
    ? `<div class="row-tg">${tg.slice(0, 3).map(t => {
        const tanda = tandaUntukCatatan(n, t);
        return chipTag(tanda, t);
      }).join('')}
        ${tg.length > 3 ? `<span class="tg-more">+${tg.length - 3}</span>` : ''}</div>`
    : '';
  /* tombol semat kecil di ujung baris (span, karena baris sendiri <button>) */
  const pinx = (boleh && !n.archived && !n.deletedAt)
    ? `<span class="pinx${n.pinned ? ' on' : ''}" role="button" tabindex="0"
        data-pinx="${n.id}" aria-label="${n.pinned ? tr('Lepas sematan') : tr('Sematkan')}">
        <svg class="ico"><use href="#i-pin"/></svg></span>`
    : '';
  if (!boleh) {
    return `<span class="row-ki" aria-hidden="true"><svg class="ico"><use href="#i-lock"/></svg></span>
  <div class="row-b"><div class="row-t" style="color:var(--faint)">${tr('Catatan terkunci')}</div>
    <div class="row-s">${tr('Kunci PIN — buka untuk membaca')}</div></div>
  <span class="row-m">${stamp(n.updatedAt)}</span>`;
  }
  return `${thumbOf(n)}
  <div class="row-b"><div class="row-t"${n.title ? '' : ' style="color:var(--faint)"'}>${esc(n.title) || tr('Tanpa judul')}</div>
  ${cuplikan ? `<div class="row-s">${esc(cuplikan)}</div>` : ''}${chips}</div>
  <span class="row-m">${stamp(n.updatedAt)}</span>${pinx}`;
}

/* `geser` = 'utama' (daftar catatan) atau 'arsip' (layar arsip) — keduanya
   mendapat aksi sapuan; nilai lain (beranda/cari) = baris polos. */
export const rowFor = (n, geser) => {
  const boleh = terlihat(n);   /* tanpa kunci, atau kunci dibuka di sesi ini */
  const isi = barisIsi(n, boleh);
  const polos = `<button class="row" data-open="${n.id}">${isi}</button>`;
  if (!geser) return polos;
  if (n.deletedAt) return polos;   /* sampah memakai barisnya sendiri */

  const aksi1 = n.archived
    ? `<button type="button" class="sa sa-ars" data-sw-ars="${n.id}" tabindex="-1"
         aria-label="${tr('Kembalikan dari arsip')}" title="${tr('Kembalikan dari arsip')}">
         <svg class="ico"><use href="#i-back"/></svg>${tr('Kembalikan')}</button>`
    : `<button type="button" class="sa sa-ars" data-sw-ars="${n.id}" tabindex="-1"
         aria-label="${tr('Arsipkan')}" title="${tr('Arsipkan')}">
         <svg class="ico"><use href="#i-arch"/></svg>${tr('Arsip')}</button>`;
  return `<div class="srow" data-srow="${n.id}">
  <div class="srow-a" aria-hidden="true">
    ${aksi1}
    <button type="button" class="sa sa-del" data-sw-del="${n.id}" tabindex="-1"
      aria-label="${tr('Hapus — masuk sampah')}" title="${tr('Hapus — masuk sampah dulu')}">
      <svg class="ico"><use href="#i-trash"/></svg>${tr('Hapus')}</button>
  </div>
  <div class="srow-b">${polos}</div>
</div>`;
};
