/* Daftar tombol bar — DATA, bukan HTML.
   Menambah tombol baru = tambah satu baris di sini + satu aksi di actions.js.
   `sep: true` menyisipkan pemisah kelompok. */

export const BAR = [
  { m: 'undo',   label: '↺',        title: 'Batalkan' },
  { m: 'redo',   label: '↻',        title: 'Ulangi' },
  { sep: true },

  { m: 'slash',  label: '/',        accent: true, title: 'Sisipkan blok' },
  { sep: true },

  { m: 'h',      label: 'H1',       title: 'Heading 1' },
  { m: 'h2',     label: 'H2',       title: 'Heading 2' },
  { m: 'b',      label: '<b>B</b>', title: 'Tebal' },
  { m: 'i',      label: '<i>I</i>', title: 'Miring' },
  { m: 'hl',     label: '==',       title: 'Sorot' },
  { m: 'strike', label: '<s>S</s>', title: 'Coret' },
  { sep: true },

  { m: 'wl',     label: '[[',       accent: true, title: 'Tautan catatan' },
  { m: 'link',   label: '🔗',       accent: true, title: 'Tautan web' },
  { m: 'tag',    label: '#',        accent: true, title: 'Tag' },
  { m: 'clear',  label: '⌫',        title: 'Hapus semua format' },
  { sep: true },

  { m: 'todo',   label: '☐',        title: 'To-do' },
  { m: 'li',     label: '•',        title: 'Daftar' },
  { m: 'icode',  label: '`',        title: 'Kode inline' },
  { m: 'code',   label: '&lt;/&gt;', title: 'Blok kode' },
  { m: 'quote',  label: '"',        title: 'Kutipan' },
  { m: 'cal',    label: '!',        title: 'Callout' },
  { m: 'hr',     label: '—',        title: 'Pembatas' },
  { sep: true },

  { m: 'out',    label: '⇤',        title: 'Kurangi indent' },
  { m: 'in',     label: '⇥',        title: 'Tambah indent' },
  { sep: true },

  { m: 'up',     label: '↑',        title: 'Naikkan blok' },
  { m: 'down',   label: '↓',        title: 'Turunkan blok' },
];

/* Tombol mana yang menyala mengikuti jenis blok saat ini. */
export const BLOCK_BTN = {
  h: 'b-h1', h2: 'b-h2', quote: 'b-quote', code: 'b-code',
  todo: 'b-todo', li: 'b-li', cal: 'b-cal'
};

/* Tombol mana yang menyala mengikuti format inline. */
export const MARK_BTN = { b: 'b', i: 'i', strike: 's', hl: 'hl', icode: 'code' };
