/* Operasi CRUD catatan. Bentuk datanya didefinisikan di note-model.js.

   Penghapusan memakai TEMPAT SAMPAH (soft delete): catatan ditandai
   deletedAt dan dipindah dari daftar utama ke layar Sampah. Selama
   6 detik pertama masih ada toast "Urungkan" untuk mengembalikannya
   dengan cepat; sesudah itu ia tetap ada di Sampah sampai pengguna
   menghapus permanen atau lewat 30 hari (disapu otomatis saat aplikasi
   dibuka). Pola ini sesuai DESIGN.md §3.9 & NOTES.md ("tempat sampah
   30 hari") — tanpa dialog konfirmasi untuk aksi yang bisa diurungkan. */
import { state, save, DEFAULT_NOTES } from '../core/store.js?v=20260909074309';
import { makeNote, touch, duplicateBlock } from './note-model.js?v=20260909074309';
import { toast } from '../core/toast.js?v=20260909074309';
import { go } from '../core/router.js?v=20260909074309';
import { saveSoon } from './editor/cleanup.js?v=20260909074309';
import { flush, reset as resetAutosave } from '../core/autosave.js?v=20260909074309';
import { hapusDrafMilik } from '../core/recovery.js?v=20260909074309';
import { bersihkanBlobYatim } from './editor/image.js?v=20260909074309';
import { terkunciAktif, lepasKunci } from './kunci.js?v=20260909074309';
import { t as tr } from '../core/i18n.js?v=20260909074309';

export const findNote = id => state.notes.find(n => n.id === id);
export const current  = () => findNote(state.openId);

/* Catatan di tempat sampah. */
export const diSampah = () => state.notes.filter(n => n.deletedAt);

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
  toast(tr('Catatan baru dibuat'));
}

/* Buat catatan baru dengan judul tertentu (dipakai tautan [[mati]]). */
export function buatNoteBerjudul(judul) {
  flush();
  const n = makeNote({ title: typeof judul === 'string' ? judul.trim() : '' });
  state.seq++;
  state.notes.unshift(n);
  state.openId = n.id;
  save();
  go('editor');
  toast(tr('Catatan dibuat'));
  return n;
}

/* ── hapus: pindah ke sampah, dengan jendela "Urungkan" ── */
const JEDA_UNDO = 6000;          /* ms — cukup untuk mengetuk Urungkan */
const UMUR_SAMPAH = 30 * 24 * 3600 * 1000;   /* 30 hari */

let hapusTerakhir = null;        /* { n, asal } — yang masih bisa di-Urungkan */
let timerUndo = null;

/* Soft-delete bersama: tandai deletedAt + beri jendela Urungkan.
   `asal` menentukan ke mana batalkanHapus kembali: 'editor' atau
   'list' (aksi sapuan D21). */
function softHapus(n, asal) {
  resetAutosave();
  hapusDrafMilik(n.id);
  n.deletedAt = Date.now();
  n.archived = false;
  save();

  /* ganti entri "Urungkan" sebelumnya (kalau masih ada) */
  clearTimeout(timerUndo);
  hapusTerakhir = { n, asal };
  timerUndo = setTimeout(() => { hapusTerakhir = null; }, JEDA_UNDO);
  toast(tr('Catatan dipindah ke sampah'), { label: tr('Urungkan'), cb: batalkanHapus }, JEDA_UNDO);
}

export function delNote() {
  /* catatan dibuang dari editor: perubahan tertunda & drafnya dibuang */
  const n = findNote(state.openId);
  if (!n) return go('notes');
  softHapus(n, 'editor');
  go('notes');
}

/* Hapus dari baris daftar (sapuan D21) — tetap soft-delete 30 hari. */
export function hapusNoteDariList(id) {
  const n = findNote(id);
  if (!n) return;
  softHapus(n, 'list');
}

/* Urungkan dalam jendela 6 detik: kembalikan dari sampah. */
function batalkanHapus() {
  if (!hapusTerakhir) return;
  const h = hapusTerakhir;
  hapusTerakhir = null;
  clearTimeout(timerUndo);
  const n = h.n;
  n.deletedAt = null;
  save();
  state.openId = n.id;
  toast(tr('Catatan dikembalikan'));
  go(h.asal === 'editor' ? 'editor' : 'notes');
}

/* Pulihkan satu catatan dari layar Sampah. */
export function pulihkanSampah(id) {
  const n = findNote(id);
  if (!n) return;
  n.deletedAt = null;
  save();
  toast(tr('Catatan dikembalikan'));
  go('notes');
}

/* Hapus permanen dari Sampah. Blob gambar yatim ikut dibersihkan. */
export function hapusPermanen(id) {
  const i = state.notes.findIndex(x => x.id === id);
  if (i < 0) return;
  state.notes.splice(i, 1);
  lepasKunci(id);               /* kunci ikut dibuang bersama catatannya */
  if (hapusTerakhir && hapusTerakhir.n && hapusTerakhir.n.id === id) { hapusTerakhir = null; clearTimeout(timerUndo); }
  save();
  pastikanAdaCatatan();
  bersihkanBlobYatim();
  toast(tr('Catatan dihapus permanen'));
  go('trash');
}

/* Sapuan otomatis: buang catatan yang sudah >30 hari di sampah.
   Dipanggil saat aplikasi dibuka. */
export function purgeSampahOtomatis() {
  const batas = Date.now() - UMUR_SAMPAH;
  const sisa = state.notes.filter(n => !n.deletedAt || n.deletedAt > batas);
  if (sisa.length === state.notes.length) return;
  const dibuang = state.notes.filter(n => n.deletedAt && n.deletedAt <= batas);
  dibuang.forEach(n => lepasKunci(n.id));
  state.notes = sisa;
  pastikanAdaCatatan();
  /* openId tidak boleh menggantung ke catatan yang baru terpurge */
  if (state.openId && !state.notes.some(n => n.id === state.openId))
    state.openId = state.notes[0] ? state.notes[0].id : null;
  save();
  bersihkanBlobYatim();
}

/* Kalau tidak ada catatan sama sekali, kembalikan catatan sambutan —
   aplikasi tidak pernah dibiarkan benar-benar kosong. */
function pastikanAdaCatatan() {
  if (!state.notes.length) {
    state.notes = DEFAULT_NOTES();
    state.openId = state.notes[0].id;
  }
}

export function openNote(id) {
  flush();                       /* simpan catatan lama sebelum berpindah */
  state.openId = id;
  if (terkunciAktif(findNote(id))) {
    /* kunci (D19): jangan pernah membawa isi catatan terkunci ke layar
       editor. Route 'kunci' menampilkan pintu PIN; isi dimuat normal
       setelah sesi dibuka (bukaSesi di kunci.js). */
    go('kunci');
    return;
  }
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
  toast(n.pinned ? tr('Disematkan') : tr('Sematan dilepas'));
}

/* Semat/lepas dari tombol pin di baris daftar (Bagian A4). */
export function sematDariList(id) {
  const n = findNote(id);
  if (!n) return;
  n.pinned = !n.pinned;
  save();
  toast(n.pinned ? tr('Disematkan') : tr('Sematan dilepas'));
}

/* Arsip / kembalikan dari arsip untuk catatan yang sedang dibuka.
   Sesudahnya pindah ke daftar yang relevan supaya perubahannya
   langsung terlihat. */
export function arsipNote() {
  const n = current();
  if (!n) return;
  const sekarangArsip = arsipNoteId(n.id);
  go(sekarangArsip ? 'notes' : 'arsip');
}

/* Arsip / kembalikan dari arsip lewat id (tombol sapuan D21). */
export function arsipNoteId(id) {
  const n = findNote(id);
  if (!n) return null;
  n.archived = !n.archived;
  save();
  toast(n.archived ? tr('Diarsipkan') : tr('Dikembalikan dari arsip'));
  return n.archived;
}

/* Gandakan catatan yang sedang dibuka.
   Blok baru dapat id BARU (duplicateBlock) — block reference yang
   disalin dilepas dulu, karena id rujukan dijamin uniq lintas catatan. */
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
    props: n.props,
    folderId: n.folderId,
    pinned: false,
    archived: false,
  });
  state.seq++;
  state.notes.unshift(salin);
  state.openId = salin.id;
  save();
  go('editor');
  toast(tr('Catatan digandakan'));
}
