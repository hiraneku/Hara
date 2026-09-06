/* Satu baris di daftar catatan. */
import { esc, stamp } from '../../core/dom.js?v=20260906145805';

export const rowFor=n=>`<button class="row" data-open="${n.id}">
  <div class="row-b"><div class="row-t"${n.t?'':' style="color:var(--faint)"'}>${esc(n.t)||'Tanpa judul'}</div>
  ${n.ex?`<div class="row-s">${esc(n.ex)}</div>`:''}</div>
  <span class="row-m">${n.ts?stamp(n.ts):(n.mod||'')}</span></button>`;
