/* Apa yang dilakukan tiap tombol. Satu tombol = satu baris. */
import { setBlock, insertHr, indent } from '../editor/blocks.js';
import { toggleMark } from '../editor/marks.js';

export const ACTIONS = {
  h:      () => setBlock('b-h1'),
  h2:     () => setBlock('b-h2'),
  quote:  () => setBlock('b-quote'),
  code:   () => setBlock('b-code'),
  todo:   () => setBlock('b-todo'),
  li:     () => setBlock('b-li'),
  cal:    () => setBlock('b-cal'),
  hr:     insertHr,
  b:      () => toggleMark('b'),
  i:      () => toggleMark('i'),
  strike: () => toggleMark('s'),
  hl:     () => toggleMark('hl'),
  icode:  () => toggleMark('code'),
  in:     () => indent(1),
  out:    () => indent(-1),
};
