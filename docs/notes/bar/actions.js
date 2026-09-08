/* Apa yang dilakukan tiap tombol. Satu tombol = satu baris. */
import { setBlock, insertHr, indent, clearFormat, moveBlock, insertTanggal } from '../editor/blocks.js?v=20260908154914';
import { toggleMark } from '../editor/marks.js?v=20260908154914';
import { undo as undoRiwayat, redo as redoRiwayat } from '../editor/history.js?v=20260908154914';
import { refresh } from '../editor/cleanup.js?v=20260908154914';
import { pilihGambar } from '../editor/image.js?v=20260908154914';
import { toggleRef } from '../editor/blockref.js?v=20260908154914';

/* Panel warna tag (B10) dibuka lewat bar — lihat render.js. */
export const BUKA_TAGWARNA = 'tagwarna';

export const ACTIONS = {
  p:      () => setBlock('b-p'),
  h:      () => setBlock('b-h1'),
  h2:     () => setBlock('b-h2'),
  h3:     () => setBlock('b-h3'),
  quote:  () => setBlock('b-quote'),
  code:   () => setBlock('b-code'),
  todo:   () => setBlock('b-todo'),
  li:     () => setBlock('b-li'),
  ol:     () => setBlock('b-ol'),
  cal:    () => setBlock('b-cal'),
  hr:     insertHr,
  date:   () => insertTanggal(),
  img:    pilihGambar,
  ref:    toggleRef,
  b:      () => toggleMark('b'),
  i:      () => toggleMark('i'),
  u:      () => toggleMark('u'),
  strike: () => toggleMark('s'),
  hl:     () => toggleMark('hl'),
  icode:  () => toggleMark('code'),
  in:     () => indent(1),
  out:    () => indent(-1),
  clear:  clearFormat,
  up:     () => moveBlock(-1),
  down:   () => moveBlock(1),
  /* refresh() sesudah undo/redo lewat TOMBOL menyamakan perilakunya
     dengan pintasan keyboard: hitungan huruf/kata, status tombol, dan
     autosave ikut diperbarui — bukan hanya DOM-nya saja. */
  undo:   () => { if (undoRiwayat()) refresh(); },
  redo:   () => { if (redoRiwayat()) refresh(); },
};

/* Tombol yang TIDAK boleh merekam snapshot undo sebelum dijalankan. */
export const TANPA_SNAP = new Set(['undo', 'redo', 'img']);
