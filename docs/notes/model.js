/* Operasi CRUD catatan. Bentuk datanya didefinisikan di note-model.js. */
import { state, save, DEFAULT_NOTES } from '../core/store.js?v=20260907001515';
import { makeNote, touch, excerptOf } from './note-model.js?v=20260907001515';
import { toast } from '../core/toast.js?v=20260907001515';
import { go } from '../core/router.js?v=20260907001515';
import { saveSoon } from './editor/cleanup.js?v=20260907001515';

export const findNote = id => state.notes.find(n => n.id === id);
export const current  = () => findNote(state.openId);

export function newNote() {
  const n = makeNote();          /* selalu valid: punya blocks, tags, waktu */
  state.seq++;
  state.notes.unshift(n);
  state.openId = n.id;
  save();
  go('editor');
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
  n.title = el.value;
  touch(n);
  saveSoon();
}

/* Cuplikan untuk daftar — dihitung dari blocks, tidak disimpan. */
export const excerpt = n => excerptOf(n);
