/* Apa yang dilakukan tiap tombol. Satu tombol = satu baris. */
import { setBlock, insertHr, indent, clearFormat, moveBlock, insertTanggal } from '../editor/blocks.js?v=20260907001515';
import { toggleMark } from '../editor/marks.js?v=20260907001515';
import { undo, redo } from '../editor/history.js?v=20260907001515';
import { pilihGambar } from '../editor/image.js?v=20260907001515';
import { toggleRef } from '../editor/blockref.js?v=20260907001515';

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
  strike: () => toggleMark('s'),
  hl:     () => toggleMark('hl'),
  icode:  () => toggleMark('code'),
  in:     () => indent(1),
  out:    () => indent(-1),
  clear:  clearFormat,
  up:     () => moveBlock(-1),
  down:   () => moveBlock(1),
  undo,
  redo,
};

/* Tombol yang TIDAK boleh merekam snapshot undo sebelum dijalankan. */
export const TANPA_SNAP = new Set(['undo', 'redo', 'img']);
