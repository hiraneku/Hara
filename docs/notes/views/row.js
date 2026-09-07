/* Satu baris di daftar catatan. */
import { esc, stamp } from '../../core/dom.js?v=20260907055942';
import { excerptOf } from '../note-model.js?v=20260907055942';

export const rowFor=n=>{
  const cuplikan=excerptOf(n);      /* diturunkan dari blocks, tidak disimpan */
  return `<button class="row" data-open="${n.id}">
  <div class="row-b"><div class="row-t"${n.title?'':' style="color:var(--faint)"'}>${esc(n.title)||'Tanpa judul'}</div>
  ${cuplikan?`<div class="row-s">${esc(cuplikan)}</div>`:''}</div>
  <span class="row-m">${stamp(n.updatedAt)}</span></button>`;
};
