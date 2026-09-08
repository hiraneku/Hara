/* Susunan bar — DATA, bukan HTML.

   Dua jenis isian:
   • tombol datar  { m, label }        → aksi langsung, sekali ketuk
   • kelompok      { g, label, items } → membuka menu berisi beberapa aksi

   Prinsip penyusunan: yang dipakai hampir tiap kalimat tetap datar
   (undo, tebal, miring, tautan). Sisanya masuk kelompok supaya bar
   tidak jadi deretan panjang yang harus dipindai satu per satu. */

export const BAR = [
  /* ── riwayat ── */
  { m: 'undo', label: '<svg class="bi"><use href="#i-undo"/></svg>',  title: 'Batalkan' },
  { m: 'redo', label: '<svg class="bi"><use href="#i-redo"/></svg>',  title: 'Ulangi' },
  { sep: true },

  /* ── yang paling sering dipakai: langsung, tanpa menu ── */
  { m: 'slash', label: '/', accent: true, title: 'Sisipkan blok' },
  { sep: true },

  { m: 'b',    label: '<b>B</b>',  title: 'Tebal' },
  { m: 'i',    label: '<i>I</i>',  title: 'Miring' },
  { m: 'link', label: '<svg class="bi"><use href="#i-link2"/></svg>', title: 'Tautan web' },
  { sep: true },

  /* ── kelompok ── */
  {
    g: 'gaya', label: 'A', title: 'Gaya paragraf',
    /* label tombol ikut berubah mengikuti blok tempat kursor berada */
    reflect: { 'b-h1': 'H1', 'b-h2': 'H2', 'b-h3': 'H3',
               'b-quote': '❝', 'b-code': '&lt;/&gt;', 'b-cal': '!' },
    items: [
      { m: 'p',     ikon: 'i-txt',    nama: 'Teks biasa',  kunci: '' },
      { m: 'h',     ikon: 'i-hash',   nama: 'Heading 1',   kunci: '#' },
      { m: 'h2',    ikon: 'i-hash',   nama: 'Heading 2',   kunci: '##' },
      { m: 'h3',    ikon: 'i-hash',   nama: 'Heading 3',   kunci: '###' },
      { m: 'quote', ikon: 'i-quote',  nama: 'Kutipan',     kunci: '>' },
      { m: 'code',  ikon: 'i-code',   nama: 'Blok kode',   kunci: '```' },
      { m: 'cal',   ikon: 'i-info',   nama: 'Callout',     kunci: '> [!]' },
    ]
  },
  {
    g: 'huruf', label: '<svg class="bi"><use href="#i-font"/></svg>', title: 'Jenis huruf',
    menu: 'font',          /* menu khusus, bukan daftar items biasa */
    items: []
  },
  {
    g: 'warna', label: '<svg class="bi"><use href="#i-drop"/></svg>', title: 'Warna teks & sorotan',
    menu: 'warna',          /* menu khusus: palet warna + pemilih bebas */
    items: []
  },
  {
    g: 'tandai', label: '<svg class="bi"><use href="#i-pen"/></svg>', title: 'Penandaan',
    items: [
      { m: 'u',      ikon: 'i-under', nama: 'Garis bawah',  kunci: '' },
      { m: 'hl',     ikon: 'i-pen',   nama: 'Sorot',        kunci: '==' },
      { m: 'strike', ikon: 'i-strike',nama: 'Coret',        kunci: '~~' },
      { m: 'icode',  ikon: 'i-code',  nama: 'Kode inline',  kunci: '`' },
      { m: 'clear',  ikon: 'i-eraser',nama: 'Hapus format', kunci: '' },
    ]
  },
  {
    g: 'daftar', label: '<svg class="bi"><use href="#i-list"/></svg>', title: 'Daftar',
    reflect: { 'b-li': '•', 'b-ol': '1.', 'b-todo': '☑' },
    items: [
      { m: 'li',   ikon: 'i-list',   nama: 'Daftar',          kunci: '-' },
      { m: 'ol',   ikon: 'i-listol', nama: 'Daftar bernomor', kunci: '1.' },
      { m: 'todo', ikon: 'i-check2', nama: 'To-do',           kunci: '- [ ]' },
    ]
  },
  {
    g: 'sisip', label: '<svg class="bi"><use href="#i-plus"/></svg>', title: 'Sisipkan',
    items: [
      { m: 'wl',   ikon: 'i-note',  nama: 'Tautan catatan', kunci: '[[' },
      { m: 'img',  ikon: 'i-img',   nama: 'Gambar',         kunci: '' },
      { m: 'tag',  ikon: 'i-tag',   nama: 'Tag',            kunci: '#' },
      { m: 'tagwarna', ikon: 'i-drop', nama: 'Warna tag',   kunci: '' },
      { m: 'ref',  ikon: 'i-anchor',nama: 'Tandai blok',    kunci: '^' },
      { m: 'hr',   ikon: 'i-minus', nama: 'Pembatas',       kunci: '---' },
      { m: 'date', ikon: 'i-cal',   nama: 'Tanggal',        kunci: '' },
    ]
  },
  {
    g: 'susun', label: '<svg class="bi"><use href="#i-move"/></svg>', title: 'Atur letak',
    items: [
      { m: 'in',   ikon: 'i-indent',  nama: 'Tambah indent',  kunci: 'Tab' },
      { m: 'out',  ikon: 'i-outdent', nama: 'Kurangi indent', kunci: '⇧Tab' },
      { m: 'up',   ikon: 'i-up',      nama: 'Naikkan blok',   kunci: '' },
      { m: 'down', ikon: 'i-down',    nama: 'Turunkan blok',  kunci: '' },
    ]
  },
];

/* Semua kelompok, untuk pencarian cepat. */
export const GROUPS = BAR.filter(x => x.g);
