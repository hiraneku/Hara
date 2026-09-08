/* Menu "···" di header editor: aksi untuk catatan yang sedang dibuka.
   Isi mengikuti keadaan catatan (label Sematkan/Lepas, Arsipkan/
   Kembalikan). Aksi dijalankan lewat delegasi klik global di app.js
   dengan atribut data-note-act. */
import { state } from '../../core/store.js?v=20260908040442';
import { esc } from '../../core/dom.js?v=20260908040442';

export function menuCatatan() {
  const n = state.notes.find(x => x.id === state.openId);
  if (!n) return `<div class="pop-h">Catatan</div>`;

  const judul = esc(n.title || 'Tanpa judul');
  return `<div class="pop-h">Aksi catatan</div>
  <p class="pop-note">${judul}</p>
  <button class="pop-i" data-note-act="pin">
    <svg class="ico"><use href="#i-pin"/></svg>${n.pinned ? 'Lepas sematan' : 'Sematkan'}</button>
  <button class="pop-i" data-note-act="arsip">
    <svg class="ico"><use href="#i-arch"/></svg>${n.archived ? 'Kembalikan dari arsip' : 'Arsipkan'}</button>
  <button class="pop-i" data-note-act="duplikat">
    <svg class="ico"><use href="#i-copy"/></svg>Duplikat</button>
  <button class="pop-i" data-note-act="ekspor">
    <svg class="ico"><use href="#i-dl"/></svg>Ekspor .md</button>
  <button class="pop-i" data-note-act="cetak">
    <svg class="ico"><use href="#i-print"/></svg>Cetak / PDF…</button>
  <button class="pop-i" data-note-act="tpl">
    <svg class="ico"><use href="#i-copy"/></svg>Simpan sebagai templat…</button>
  <button class="pop-i" data-note-act="remind">
    <svg class="ico"><use href="#i-bell"/></svg>Jadikan pengingat</button>
  <button class="pop-i pop-danger" data-note-act="hapus">
    <svg class="ico"><use href="#i-trash"/></svg>Hapus — masuk sampah dulu</button>`;
}
