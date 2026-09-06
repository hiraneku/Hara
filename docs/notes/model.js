/* Bentuk data catatan + operasi CRUD. */
import { state, save, DEFAULT_NOTES } from '../core/store.js';
import { toast } from '../core/toast.js';
import { go } from '../core/router.js';
import { saveSoon } from './editor/cleanup.js';

export const findNote = id => state.notes.find(n => n.id === id);
export const current  = () => findNote(state.openId);

export function newNote() {
  const n = {
    id: 'n' + (state.seq++), t: '', welcome: false,
    mod: 'baru saja', ex: '', html: '', ts: Date.now()
  };
  state.notes.unshift(n);
  state.openId = n.id;
  save();
  go('editor');
  setTimeout(() => { const i = document.querySelector('.ed-t'); if (i) i.focus(); }, 60);
  toast('Catatan baru dibuat');
}

export function delNote() {
  const i = state.notes.findIndex(n => n.id === state.openId);
  if (i > -1) state.notes.splice(i, 1);
  if (!state.notes.length) state.notes = DEFAULT_NOTES();
  save();
  toast('Catatan dihapus');
  go('notes');
}

export function openNote(id) { state.openId = id; go('editor'); }

/* Judul diketik -> simpan. */
export function onTitle(el) {
  const n = current();
  if (!n) return;
  n.t = el.value;
  n.ts = Date.now();
  n.mod = 'baru saja';
  saveSoon();
}
