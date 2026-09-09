/* Layar editor: judul, properti yang bisa disunting, isi catatan, dan
   panel data (tautan/backlink/mention/graph) di bawahnya. */
import { state } from '../../core/store.js?v=20260909000100';
import { findNote } from '../model.js?v=20260909000100';
import { esc } from '../../core/dom.js?v=20260909000100';
import { blocksToDom } from '../note-model.js?v=20260909000100';
import { barisProps } from '../meta-ui.js?v=20260909000100';

export function editorView() {
const n=findNote(state.openId)||state.notes[0];
 if(!n)return `<div class="empty"><h3>Catatan tidak ada</h3><p>Mungkin sudah dihapus.</p>
   <button class="btn btn-sec" data-go="notes">Ke daftar catatan</button></div>`;
 /* blocks adalah sumber kebenaran; DOM cuma hasil render darinya */
 const inner = blocksToDom(n.blocks);
 const body=`<div class="ed-doc" contenteditable="true" spellcheck="false"
   data-ph="Mulai menulis. Coba ketik **tebal** atau # judul">${inner}</div>`;
 return `<div class="ed">
  <div class="ed-aksi" role="group" aria-label="Kendali baca">
    <button type="button" class="ea-b" data-et="kecil" aria-label="Perkecil teks bacaan" title="Perkecil teks bacaan">A−</button>
    <span class="ea-v" id="ed-ukur" aria-hidden="true">16px</span>
    <button type="button" class="ea-b" data-et="besar" aria-label="Perbesar teks bacaan" title="Perbesar teks bacaan">A+</button>
    <span class="ea-sep" aria-hidden="true"></span>
    <button type="button" class="ea-b ea-ico et-cari" data-et="cari" aria-label="Cari di dalam catatan" title="Cari di dalam catatan (mode baca)"><svg class="ico"><use href="#i-search"/></svg></button>
    <button type="button" class="ea-b ea-ico" data-et="dafis" aria-label="Daftar isi catatan" title="Daftar isi — lompat ke heading"><svg class="ico"><use href="#i-list"/></svg></button>
    <button type="button" class="ea-b ea-ico" data-et="zen" aria-label="Mode fokus" aria-pressed="false" title="Mode fokus — sembunyikan semua kecuali catatan"><svg class="ico"><use href="#i-zen"/></svg></button>
  </div>
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
