/* Satu baris di daftar catatan.
   Chip tag di bawah cuplikan: sinkron dengan isi catatan (tags.js).
   Chip memfilter daftar lewat data-tag — ditangani delegasi klik di
   notes/index.js (berjalan lebih dulu dari pembuka catatan data-open). */
import { esc, stamp } from '../../core/dom.js?v=20260908050813';
import { excerptOf } from '../note-model.js?v=20260908050813';

export const rowFor=n=>{
  const cuplikan=excerptOf(n);      /* diturunkan dari blocks, tidak disimpan */
  const tg = Array.isArray(n.tags) ? n.tags : [];
  /* baris di Arsip tidak diberi chip: memfilternya mengarah ke daftar
     utama yang tidak memuat catatan terarsip — membingungkan */
  const chips = (!n.archived && tg.length)
    ? `<div class="row-tg">${tg.slice(0, 3).map(t =>
        `<span class="tg-chip" data-tag="${esc(t)}">#${esc(t)}</span>`).join('')}
        ${tg.length > 3 ? `<span class="tg-more">+${tg.length - 3}</span>` : ''}</div>`
    : '';
  return `<button class="row" data-open="${n.id}">
  <div class="row-b"><div class="row-t"${n.title ? '' : ' style="color:var(--faint)"'}>${esc(n.title) || 'Tanpa judul'}</div>
  ${cuplikan ? `<div class="row-s">${esc(cuplikan)}</div>` : ''}${chips}</div>
  <span class="row-m">${stamp(n.updatedAt)}</span></button>`;
};
