/* Layar editor: judul, properti yang bisa disunting, isi catatan, dan
   panel data (tautan/backlink/mention/graph) di bawahnya. */
import { state } from '../../core/store.js?v=20260908052529';
import { findNote } from '../model.js?v=20260908052529';
import { esc } from '../../core/dom.js?v=20260908052529';
import { blocksToDom } from '../note-model.js?v=20260908052529';
import { barisProps } from '../meta-ui.js?v=20260908052529';

export function editorView() {
const n=findNote(state.openId)||state.notes[0];
 if(!n)return `<div class="empty"><h3>Catatan tidak ada</h3><p>Mungkin sudah dihapus.</p>
   <button class="btn btn-sec" data-go="notes">Ke daftar catatan</button></div>`;
 /* blocks adalah sumber kebenaran; DOM cuma hasil render darinya */
 const inner = blocksToDom(n.blocks);
 const body=`<div class="ed-doc" contenteditable="true" spellcheck="false"
   data-ph="Mulai menulis. Coba ketik **tebal** atau # judul">${inner}</div>`;
 return `<div class="ed">
  <input class="ed-t" value="${esc(n.title)}" placeholder="Judul"
    aria-label="Judul catatan">
  <div class="props" id="props-box">
    ${barisProps(n,'pv')}
    <button type="button" class="prop-add" data-prop-add>+ properti</button>
  </div>
  <div class="blocks">${body}</div>
  <div class="dm" id="dm"></div>
 </div>`;
}
