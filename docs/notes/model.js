/* Operasi CRUD catatan. Bentuk datanya didefinisikan di note-model.js.

   Penghapusan TIDAK langsung permanen: catatan dipegang sebentar dan
   toast "Urungkan" memberi kesempatan mengembalikannya (pola yang
   disyaratkan DESIGN.md — tanpa dialog konfirmasi untuk aksi yang bisa
   diurungkan). Setelah jendela itu lewat, catatan dibuang dan blob
   gambar yatim ikut dibersihkan. */
import { state, save, DEFAULT_NOTES } from '../core/store.js?v=20260907055942';
import { makeNote, touch, duplicateBlock } from './note-model.js?v=20260907055942';
import { toast } from '../core/toast.js?v=20260907055942';
import { go } from '../core/router.js?v=20260907055942';
import { saveSoon } from './editor/cleanup.js?v=20260907055942';
import { flush, reset as resetAutosave } from '../core/autosave.js?v=20260907055942';
import { hapusDrafMilik } from '../core/recovery.js?v=20260907055942';
import { bersihkanBlobYatim } from './editor/image.js?v=20260907055942';

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

/* ── hapus dengan jendela "Urungkan" ── */
const JEDA_UNDO = 6000;          /* ms — cukup untuk mengetuk Urungkan */
let hapusTertunda = null;        /* { note, index } */
let timerPurga = null;

export function delNote() {
  /* catatan dibuang: perubahan tertunda & drafnya tidak relevan lagi */
  resetAutosave();
  hapusDrafMilik(state.openId);
  const i = state.notes.findIndex(n => n.id === state.openId);
  if (i < 0) return go('notes');

  const [note] = state.notes.splice(i, 1);

  /* Penghapusan SEBELUMNYA yang masih bisa di-Urungkan diganti entri
     ini: yang lama dibuang permanen sekarang (blob-nya dibersihkan). */
  if (hapusTertunda) {
    clearTimeout(timerPurga);
    hapusTertunda = null;
    bersihkanBlobYatim();
  }

  save();
  hapusTertunda = { note, index: i };
  timerPurga = setTimeout(purgaHapus, JEDA_UNDO);
  toast('Catatan dihapus', { label: 'Urungkan', cb: batalkanHapus }, JEDA_UNDO);
  go('notes');
}

/* Jendela Urungkan lewat: buang catatan sungguhan. Kalau itu catatan
   terakhir, catatan sambutan dikembalikan supaya aplikasi tak kosong. */
function purgaHapus() {
  if (!hapusTertunda) return;
  hapusTertunda = null;
  if (!state.notes.length) {
    state.notes = DEFAULT_NOTES();
    state.openId = state.notes[0].id;
    save();
  }
  bersihkanBlobYatim();
}

/* Pulihkan catatan yang barusan dihapus, di posisi semula. */
function batalkanHapus() {
  if (!hapusTertunda) return;
  clearTimeout(timerPurga);
  const { note, index } = hapusTertunda;
  hapusTertunda = null;
  const i = Math.min(index, state.notes.length);
  state.notes.splice(i, 0, note);
  state.openId = note.id;
  save();
  toast('Catatan dikembalikan');
  go('editor');
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

/* ── aksi menu "···" ── */

export function pinNote() {
  const n = current();
  if (!n) return;
  n.pinned = !n.pinned;
  save();
  toast(n.pinned ? 'Disematkan' : 'Sematan dilepas');
}

export function arsipNote() {
  const n = current();
  if (!n) return;
  n.archived = !n.archived;
  save();
  toast(n.archived ? 'Diarsipkan' : 'Dikembalikan dari arsip');
  /* kembali ke daftar yang relevan supaya perubahannya langsung terlihat */
  go(n.archived ? 'notes' : 'arsip');
}

/* Gandakan catatan yang sedang dibuka.
   Blok baru dapat id BARU (duplicateBlock) — block reference yang
   disalin dilepas dulu, karena id rujukan dijamin unik lintas catatan
   dan tidak boleh ada kembar. Gambar tetap berbagi blob dengan aslinya. */
export function duplikatNote() {
  flush();
  const n = current();
  if (!n) return;
  const salin = makeNote({
    title: n.title || '',
    blocks: n.blocks.map(b => {
      const d = duplicateBlock(b);
      if (d.meta && d.meta.ref) delete d.meta.ref;
      return d;
    }),
    tags: n.tags,
    folderId: n.folderId,
    pinned: false,
    archived: false,
  });
  state.seq++;
  state.notes.unshift(salin);
  state.openId = salin.id;
  save();
  go('editor');
  toast('Catatan digandakan');
}
