/* Operasi CRUD catatan. Bentuk datanya didefinisikan di note-model.js. */
import { state, save, DEFAULT_NOTES } from '../core/store.js?v=20260907015135';
import { makeNote, touch, excerptOf } from './note-model.js?v=20260907015135';
import { toast } from '../core/toast.js?v=20260907015135';
import { go } from '../core/router.js?v=20260907015135';
import { saveSoon } from './editor/cleanup.js?v=20260907015135';
import { flush, reset as resetAutosave } from '../core/autosave.js?v=20260907015135';
import { hapusDrafMilik } from '../core/recovery.js?v=20260907015135';

export const findNote = id => state.notes.find(n => n.id === id);
export const current  = () => findNote(state.openId);

export function newNote() {
  /* Tuntaskan dulu perubahan catatan yang sedang dibuka. Kalau openId
     diganti lebih dulu, flush akan menulis isi editor lama ke catatan
     BARU — tulisan catatan lama hilang. */
  flush();
  const n = makeNote();          /* selalu valid: punya blocks, tags, waktu */
  state.seq++;
  state.notes.unshift(n);
  state.openId = n.id;
  save();
  go('editor');
  toast('Catatan baru dibuat');
}

export function delNote() {
  /* catatan dibuang: perubahan tertunda & drafnya tidak relevan lagi */
  resetAutosave();
  hapusDrafMilik(state.openId);
  const i = state.notes.findIndex(n => n.id === state.openId);
  if (i > -1) state.notes.splice(i, 1);
  if (!state.notes.length) state.notes = DEFAULT_NOTES();
  save();
  toast('Catatan dihapus');
  go('notes');
}

export function openNote(id) {
  flush();                       /* simpan catatan lama sebelum berpindah */
  state.openId = id;
  go('editor');
}

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
