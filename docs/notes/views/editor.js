/* Layar editor: judul, properti, isi catatan. */
import { state } from '../../core/store.js';
import { findNote } from '../model.js';
import { esc } from '../../core/dom.js';
import { welcomeBody, panels } from './welcome.js';

export function editorView() {
const n=findNote(state.openId)||state.notes[0];
 if(!n)return `<div class="empty"><h3>Catatan tidak ada</h3><p>Mungkin sudah dihapus.</p>
   <button class="btn btn-sec" data-go="notes">Ke daftar catatan</button></div>`;
 const saved=n.html;
 const inner = saved!==undefined&&saved!==null&&saved!==''
   ? saved
   : (n.welcome ? welcomeBody
     : `<div class="b-p" data-ph="Mulai menulis. Coba ketik **tebal** atau # judul"><br></div>`);
 const body=`<div class="ed-doc" contenteditable="true" spellcheck="false">${inner}</div>`;
 return `<div class="ed">
  <input class="ed-t" value="${esc(n.t)}" placeholder="Judul">
  <div class="props">
    <div class="prop"><span class="prop-k"><svg class="ico"><use href="#i-cal"/></svg>dibuat</span><span class="prop-v">6 Sep 2026</span></div>
    ${n.welcome?`<div class="prop"><span class="prop-k"><svg class="ico"><use href="#i-hash"/></svg>tag</span><span class="prop-v"><span class="tg">#hara</span></span></div>`:''}
    <button class="prop-add" data-act="Tambah properti baru">+ properti</button>
  </div>
  <div class="blocks">${body}</div>
 </div>
 ${n.welcome?panels:''}`;
}
