/* Layar editor: judul, properti, isi catatan. */
import { state } from '../../core/store.js?v=20260907023932';
import { findNote } from '../model.js?v=20260907023932';
import { esc, tglPendek } from '../../core/dom.js?v=20260907023932';
import { blocksToDom } from '../note-model.js?v=20260907023932';
import { panels } from './welcome.js?v=20260907023932';

export function editorView() {
const n=findNote(state.openId)||state.notes[0];
 if(!n)return `<div class="empty"><h3>Catatan tidak ada</h3><p>Mungkin sudah dihapus.</p>
   <button class="btn btn-sec" data-go="notes">Ke daftar catatan</button></div>`;
 /* blocks adalah sumber kebenaran; DOM cuma hasil render darinya */
 const inner = blocksToDom(n.blocks);
 const body=`<div class="ed-doc" contenteditable="true" spellcheck="false"
   data-ph="Mulai menulis. Coba ketik **tebal** atau # judul">${inner}</div>`;
 return `<div class="ed">
  <input class="ed-t" value="${esc(n.title)}" placeholder="Judul">
  <div class="props">
    <div class="prop"><span class="prop-k"><svg class="ico"><use href="#i-cal"/></svg>dibuat</span><span class="prop-v">${tglPendek(n.createdAt)}</span></div>
    ${n.welcome?`<div class="prop"><span class="prop-k"><svg class="ico"><use href="#i-hash"/></svg>tag</span><span class="prop-v"><span class="tg">#hara</span></span></div>`:''}
    <button class="prop-add" data-act="Tambah properti baru">+ properti</button>
  </div>
  <div class="blocks">${body}</div>
 </div>
 ${n.welcome?panels:''}`;
}
