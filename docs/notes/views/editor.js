/* Layar editor: judul, properti yang bisa disunting, isi catatan, dan
   panel data (tautan/backlink/mention/graph) di bawahnya. */
import { state } from '../../core/store.js?v=20260909102312';
import { findNote } from '../model.js?v=20260909102312';
import { esc } from '../../core/dom.js?v=20260909102312';
import { blocksToDom } from '../note-model.js?v=20260909102312';
import { barisProps } from '../meta-ui.js?v=20260909102312';
import { t as tr } from '../../core/i18n.js?v=20260909102312';

export function editorView() {
const n=findNote(state.openId)||state.notes[0];
 if(!n)return `<div class="empty"><h3>${tr('Catatan tidak ada')}</h3><p>${tr('Mungkin sudah dihapus.')}</p>
   <button class="btn btn-sec" data-go="notes">${tr('Ke daftar catatan')}</button></div>`;
 /* blocks adalah sumber kebenaran; DOM cuma hasil render darinya */
 const inner = blocksToDom(n.blocks);
 const body=`<div class="ed-doc" contenteditable="true" spellcheck="false"
   data-ph="${tr('Mulai menulis. Coba ketik **tebal** atau # judul')}">${inner}</div>`;
 return `<div class="ed">
  <div class="ed-aksi" role="group" aria-label="${tr('Kendali baca')}">
    <button type="button" class="ea-b" data-et="kecil" aria-label="${tr('Perkecil teks bacaan')}" title="${tr('Perkecil teks bacaan')}">A−</button>
    <span class="ea-v" id="ed-ukur" aria-hidden="true">16px</span>
    <button type="button" class="ea-b" data-et="besar" aria-label="${tr('Perbesar teks bacaan')}" title="${tr('Perbesar teks bacaan')}">A+</button>
    <span class="ea-sep" aria-hidden="true"></span>
    <button type="button" class="ea-b ea-ico et-cari" data-et="cari" aria-label="${tr('Cari di dalam catatan')}" title="${tr('Cari di dalam catatan (mode baca)')}"><svg class="ico"><use href="#i-search"/></svg></button>
    <button type="button" class="ea-b ea-ico" data-et="dafis" aria-label="${tr('Daftar isi catatan')}" title="${tr('Daftar isi — lompat ke heading')}"><svg class="ico"><use href="#i-list"/></svg></button>
    <button type="button" class="ea-b ea-ico" data-et="zen" aria-label="${tr('Mode fokus')}" aria-pressed="false" title="${tr('Mode fokus — sembunyikan semua kecuali catatan')}"><svg class="ico"><use href="#i-zen"/></svg></button>
  </div>
  <input class="ed-t" value="${esc(n.title)}" placeholder="${tr('Judul')}"
    aria-label="${tr('Judul catatan')}">
  <div class="props" id="props-box">
    ${barisProps(n,'pv')}
    <button type="button" class="prop-add" data-prop-add>+ ${tr('properti')}</button>
  </div>
  <div class="blocks">${body}</div>
  <div class="dm" id="dm"></div>
 </div>`;
}
