/* Satu baris di daftar catatan.
   Chip tag di bawah cuplikan: sinkron dengan isi catatan (tags.js).
   Chip memfilter daftar lewat data-tag — ditangani delegasi klik di
   notes/index.js (berjalan lebih dulu dari pembuka catatan data-open).

   Thumbnail (B C16): gambar PERTAMA catatan tampil sebagai miniatur di
   kiri — dipasang lewat urlUntuk oleh pasangThumbDaftar() tiap daftar
   digambar (lihat index.js); <img> di sini hanya memuat data-blob. */
import { esc, stamp } from '../../core/dom.js?v=20260908235230';
import { excerptOf } from '../note-model.js?v=20260908235230';
import { tandaUntukCatatan, chipTag } from '../label.js?v=20260908235230';

/* Miniatur gambar pertama milik catatan; kosong bila tak ada gambar. */
const thumbOf = n => {
  if (!n || !Array.isArray(n.blocks)) return '';
  const g = n.blocks.find(b => b.type === 'image' && b.meta && b.meta.blobId);
  if (!g) return '';
  const id = String(g.meta.blobId).replace(/["'<>\\]/g, '');
  if (!id) return '';
  return `<img class="row-th" data-blob="${id}" alt="" draggable="false" loading="lazy">`;
};

export const rowFor = n => {
  const cuplikan = excerptOf(n);      /* diturunkan dari blocks, tidak disimpan */
  const tg = Array.isArray(n.tags) ? n.tags : [];
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
  const pinx = (!n.archived && !n.deletedAt)
    ? `<span class="pinx${n.pinned ? ' on' : ''}" role="button" tabindex="0"
        data-pinx="${n.id}" aria-label="${n.pinned ? 'Lepas sematan' : 'Sematkan'}">
        <svg class="ico"><use href="#i-pin"/></svg></span>`
    : '';
  return `<button class="row" data-open="${n.id}">
  ${thumbOf(n)}
  <div class="row-b"><div class="row-t"${n.title ? '' : ' style="color:var(--faint)"'}>${esc(n.title) || 'Tanpa judul'}</div>
  ${cuplikan ? `<div class="row-s">${esc(cuplikan)}</div>` : ''}${chips}</div>
  <span class="row-m">${stamp(n.updatedAt)}</span>${pinx}</button>`;
};
