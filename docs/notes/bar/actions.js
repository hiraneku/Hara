/* Apa yang dilakukan tiap tombol. Satu tombol = satu baris. */
import { setBlock, insertHr, indent, clearFormat, moveBlock, insertTanggal } from '../editor/blocks.js';
import { toggleMark } from '../editor/marks.js';
import { undo, redo } from '../editor/history.js';

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
export const TANPA_SNAP = new Set(['undo', 'redo']);
