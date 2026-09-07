/* ════════ MODEL DATA CATATAN ════════

   Bentuk resmi sebuah catatan:

     {
       id, title, blocks[], tags[], folderId,
       createdAt, updatedAt, pinned, archived, deletedAt
     }

   Bentuk resmi sebuah blok:

     { id, type, content, meta }

   PRINSIP: `blocks` adalah satu-satunya sumber kebenaran isi catatan.
   HTML hanya hasil render (blocksToDom) dan hasil baca balik (domToBlocks).
   Tidak ada field `html` yang disimpan berdampingan dengan blocks —
   dua sumber data yang harus disinkronkan selalu berakhir tidak sinkron.

   Editor sekarang masih berbasis contenteditable, jadi alurnya:

     blocks ──blocksToDom──> DOM (disunting pengguna) ──domToBlocks──> blocks

   Id blok ditanam di DOM sebagai `data-bid`, sehingga id tetap stabil
   melintasi siklus render–sunting–simpan. Ini yang membuat block
   reference, undo per-blok, dan sinkronisasi nanti bisa diandalkan. */

/* ── jenis blok yang dikenal ── */
export const BLOCK_TYPES = [
  'paragraph',
  'heading',
  'bullet',
  'ordered-list',
  'todo',
  'quote',
  'code',
  'divider',
  'image',
  'callout',      /* di luar daftar minimum, tapi sudah dipakai aplikasi */
];

/* Pemetaan jenis blok <-> kelas CSS yang dipakai editor saat ini. */
const TYPE_TO_CLASS = {
  paragraph: 'b-p',
  bullet: 'b-li',
  'ordered-list': 'b-ol',
  todo: 'b-todo',
  quote: 'b-quote',
  code: 'b-code',
  divider: 'b-div',
  image: 'b-img',
  callout: 'b-cal',
  /* heading ditangani terpisah karena bergantung meta.level */
};

const CLASS_TO_TYPE = {
  'b-p': 'paragraph',
  'b-h1': 'heading',
  'b-h2': 'heading',
  'b-h3': 'heading',
  'b-li': 'bullet',
  'b-ol': 'ordered-list',
  'b-todo': 'todo',
  'b-quote': 'quote',
  'b-code': 'code',
  'b-div': 'divider',
  'b-img': 'image',
  'b-cal': 'callout',
};

const HEADING_CLASS = { 1: 'b-h1', 2: 'b-h2', 3: 'b-h3' };
const CLASS_LEVEL   = { 'b-h1': 1, 'b-h2': 2, 'b-h3': 3 };

/* ── pembuat id ──
   Cukup unik untuk satu perangkat, pendek, dan tidak butuh dependency. */
let _ctr = 0;
function uid(awalan) {
  _ctr = (_ctr + 1) % 0xffff;
  const waktu = Date.now().toString(36).slice(-6);
  const acak  = Math.random().toString(36).slice(2, 6);
  const urut  = _ctr.toString(36);
  return `${awalan}${waktu}${acak}${urut}`;
}
export const newBlockId = () => uid('b');
export const newNoteId  = () => uid('n');

/* ════════ FACTORY ════════ */

/* Blok baru yang selalu valid. */
export function makeBlock(patch = {}) {
  const type = BLOCK_TYPES.includes(patch.type) ? patch.type : 'paragraph';
  const blok = {
    id: patch.id || newBlockId(),
    type,
    content: typeof patch.content === 'string' ? patch.content : '',
    meta: { ...(patch.meta || {}) },
  };
  /* nilai bawaan per jenis, supaya konsumen tidak perlu memeriksa undefined */
  if (type === 'heading' && !blok.meta.level) blok.meta.level = 2;
  if (type === 'todo' && typeof blok.meta.checked !== 'boolean') blok.meta.checked = false;
  return blok;
}

/* Catatan baru yang selalu valid. */
export function makeNote(patch = {}) {
  const now = Date.now();
  const blocks = Array.isArray(patch.blocks) && patch.blocks.length
    ? patch.blocks.map(makeBlock)
    : [makeBlock({ type: 'paragraph' })];   /* selalu ada satu blok untuk diketik */

  return {
    id: patch.id || newNoteId(),
    title: typeof patch.title === 'string' ? patch.title : '',
    blocks,
    tags: Array.isArray(patch.tags) ? patch.tags.slice() : [],
    folderId: patch.folderId ?? null,
    createdAt: patch.createdAt || now,
    updatedAt: patch.updatedAt || now,
    pinned: !!patch.pinned,
    archived: !!patch.archived,
    deletedAt: patch.deletedAt ?? null,
    /* penanda UI, bukan bagian isi: menentukan panel demo ikut tampil */
    ...(patch.welcome ? { welcome: true } : {}),
  };
}

/* ════════ TURUNAN ════════
   Nilai yang bisa dihitung dari blocks TIDAK disimpan, supaya tidak ada
   dua sumber data yang bisa berselisih. */

/* Teks polos seluruh catatan — dasar cuplikan, hitungan kata, dan nanti search. */
export function plainText(note) {
  if (!note || !Array.isArray(note.blocks)) return '';
  return note.blocks
    .map(b => stripTags(b.content))
    .filter(Boolean)
    .join('\n');
}

/* Cuplikan untuk daftar catatan. */
export function excerptOf(note, panjang = 80) {
  return plainText(note).replace(/\s+/g, ' ').trim().slice(0, panjang);
}

const stripTags = html =>
  String(html || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/[\u200b]/g, '');

/* ════════ blocks -> DOM ════════ */

const escAttr = s => String(s ?? '').replace(/"/g, '&quot;');

export function blockToHtml(b) {
  const meta = b.meta || {};
  const gaya = meta.indent ? ` style="padding-left:${Number(meta.indent) || 0}px"` : '';
  const ref  = meta.ref ? ` data-ref="${escAttr(meta.ref)}"` : '';
  const bid  = ` data-bid="${escAttr(b.id)}"`;

  if (b.type === 'divider')
    return `<div class="b-div" contenteditable="false"${bid}></div>`;

  if (b.type === 'image') {
    const alt = escAttr(meta.alt || 'gambar');
    const blob = escAttr(meta.blobId || '');
    return `<div class="b-img" contenteditable="false"${bid}>` +
      `<img data-blob="${blob}" alt="${alt}">` +
      `<button class="img-x" data-imgx="${blob}" title="Hapus gambar">` +
      `<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>`;
  }

  if (b.type === 'todo') {
    const on = meta.checked ? ' on' : '';
    const done = meta.checked ? ' done' : '';
    const kotak = `<button class="cbx${on}" contenteditable="false">` +
      `<svg viewBox="0 0 24 24"><path d="M4 12l5 5L20 6"/></svg></button>`;
    return `<div class="b-todo${done}"${bid}${ref}${gaya}>${kotak}${b.content || ''}</div>`;
  }

  if (b.type === 'heading') {
    const cls = HEADING_CLASS[meta.level] || 'b-h2';
    return `<div class="${cls}"${bid}${ref}${gaya}>${b.content || ''}</div>`;
  }

  if (b.type === 'callout') {
    const jenis = meta.variant ? ` data-cal="${escAttr(meta.variant)}"` : '';
    const label = meta.label ? ` data-cal-label="${escAttr(meta.label)}"` : '';
    return `<div class="b-cal"${bid}${jenis}${label}${ref}${gaya}>${b.content || ''}</div>`;
  }

  const cls = TYPE_TO_CLASS[b.type] || 'b-p';
  return `<div class="${cls}"${bid}${ref}${gaya}>${b.content || ''}</div>`;
}

export function blocksToDom(blocks) {
  if (!Array.isArray(blocks) || !blocks.length)
    return blockToHtml(makeBlock({ type: 'paragraph' }));
  return blocks.map(blockToHtml).join('');
}

/* ════════ DOM -> blocks ════════ */

/* Baca satu elemen blok jadi objek blok. */
export function elToBlock(el) {
  if (!el || el.nodeType !== 1) return null;

  const kelas = Array.from(el.classList || []);
  const kunci = kelas.find(c => CLASS_TO_TYPE[c]);
  const type = CLASS_TO_TYPE[kunci] || 'paragraph';

  const meta = {};
  const indent = parseInt(el.style && el.style.paddingLeft, 10);
  if (indent) meta.indent = indent;
  const ref = el.getAttribute && el.getAttribute('data-ref');
  if (ref) meta.ref = ref;

  let content = '';

  if (type === 'divider') {
    /* tanpa isi */
  } else if (type === 'image') {
    const img = el.querySelector && el.querySelector('img[data-blob]');
    if (img) {
      meta.blobId = img.getAttribute('data-blob') || '';
      const alt = img.getAttribute('alt');
      if (alt) meta.alt = alt;
    }
  } else if (type === 'todo') {
    meta.checked = kelas.includes('done');
    content = isiTanpa(el, ':scope > .cbx');
  } else if (type === 'heading') {
    meta.level = CLASS_LEVEL[kunci] || 2;
    content = el.innerHTML || '';
  } else if (type === 'callout') {
    const v = el.getAttribute('data-cal');
    if (v) meta.variant = v;
    const l = el.getAttribute('data-cal-label');
    if (l) meta.label = l;
    content = el.innerHTML || '';
  } else {
    content = el.innerHTML || '';
  }

  /* Id HARUS berasal dari DOM supaya stabil lintas pembacaan.
     Kalau elemen belum bertanda (jalur yang melewatkan pastikanBlockId,
     mis. migrasi HTML lama), id dibuat lalu DITANAM BALIK — jadi
     pembacaan berikutnya memakai id yang sama, bukan bikin baru. */
  let bid = el.getAttribute && el.getAttribute('data-bid');
  if (!bid) {
    bid = newBlockId();
    if (el.setAttribute) el.setAttribute('data-bid', bid);
  }

  return makeBlock({
    id: bid,
    type,
    content: bersihkanIsi(content),
    meta,
  });
}

/* innerHTML tanpa anak tertentu (mis. checkbox to-do). */
function isiTanpa(el, selector) {
  const salinan = el.cloneNode(true);
  const buang = salinan.querySelectorAll(selector.replace(':scope > ', ''));
  buang.forEach(x => { if (x.parentNode === salinan) x.remove(); });
  return salinan.innerHTML || '';
}

/* Buang jejak yang murni urusan tampilan, bukan isi. */
function bersihkanIsi(html) {
  return String(html || '')
    /* objectURL gambar tidak berlaku di sesi berikutnya */
    .replace(/(<img[^>]*?)\ssrc="blob:[^"]*"/g, '$1')
    /* <br> pengganjal blok kosong */
    .replace(/^<br\s*\/?>$/i, '')
    /* nomor daftar dihitung ulang saat render */
    .replace(/\sdata-n="[^"]*"/g, '');
}

/* ── Penjamin id blok di DOM ──
   Dipanggil setiap kali DOM editor mungkin berubah. Elemen blok yang
   belum punya `data-bid` (mis. blok baru hasil Enter, atau hasil clone
   browser yang menyalin bid kembar) diberi id sekali di sini.

   Ini titik TUNGGAL pembuatan id blok saat menyunting. Tanpa ini,
   id akan dibuat ulang tiap kali domToBlocks() berjalan — artinya
   berubah setiap simpan, yang persis dilarang. */
export function pastikanBlockId(root) {
  if (!root) return;
  const terpakai = new Set();
  Array.from(root.children).forEach(el => {
    if (!el.getAttribute) return;
    let id = el.getAttribute('data-bid');
    /* kosong ATAU kembar (browser menyalin atribut saat Enter/duplikat)
       -> blok ini efektif blok baru, beri id sendiri */
    if (!id || terpakai.has(id)) {
      id = newBlockId();
      el.setAttribute('data-bid', id);
    }
    terpakai.add(id);
  });
}

/* Baca seluruh editor jadi array blok. */
export function domToBlocks(root) {
  if (!root) return [makeBlock({ type: 'paragraph' })];
  pastikanBlockId(root);          /* id dibuat di sini, sekali seumur blok */
  const hasil = [];
  Array.from(root.children).forEach(el => {
    const b = elToBlock(el);
    if (b) hasil.push(b);
  });
  return hasil.length ? hasil : [makeBlock({ type: 'paragraph' })];
}

/* Duplikat blok: isi & meta disalin, ID WAJIB baru.
   Tanpa ini, dua blok berbagi id dan block reference jadi ambigu. */
export function duplicateBlock(b) {
  return makeBlock({
    type: b.type,
    content: b.content,
    meta: { ...(b.meta || {}) },
    /* id sengaja tidak diteruskan -> makeBlock memberi id baru */
  });
}

/* ════════ MIGRASI ════════ */

/* Ubah HTML lama (model `html`) jadi array blok.
   Dipakai sekali saat memuat data lama. */
export function htmlToBlocks(html) {
  if (!html || typeof html !== 'string') return [makeBlock({ type: 'paragraph' })];
  if (typeof document === 'undefined') return [makeBlock({ type: 'paragraph', content: html })];
  const wadah = document.createElement('div');
  wadah.innerHTML = html;
  /* Blok lama tidak punya data-bid — elToBlock akan memberi id baru,
     dan sejak itu id-nya stabil karena ikut tersimpan. */
  return domToBlocks(wadah);
}

/* Terima catatan bentuk apa pun (lama/baru/rusak) -> catatan valid.
   Idempoten: catatan yang sudah benar dikembalikan apa adanya. */
export function normalizeNote(raw) {
  if (!raw || typeof raw !== 'object') return makeNote();

  /* sudah model baru */
  if (Array.isArray(raw.blocks)) {
    return makeNote({
      ...raw,
      blocks: raw.blocks.map(makeBlock),
    });
  }

  /* ── model lama: { id, t, html, ex, ts, mod, welcome } ── */
  const waktu = raw.ts || Date.now();
  return makeNote({
    id: raw.id,
    title: raw.title ?? raw.t ?? '',
    blocks: htmlToBlocks(raw.html),
    tags: raw.tags,
    folderId: raw.folderId,
    createdAt: raw.createdAt || waktu,
    updatedAt: raw.updatedAt || waktu,
    pinned: raw.pinned,
    archived: raw.archived,
    deletedAt: raw.deletedAt,
    welcome: raw.welcome,
  });
}

export const normalizeNotes = arr =>
  (Array.isArray(arr) ? arr : []).map(normalizeNote);

/* ── util kecil untuk pemakai model ── */

export function touch(note) {
  if (note) note.updatedAt = Date.now();
  return note;
}

export const findBlock = (note, id) =>
  note && Array.isArray(note.blocks) ? note.blocks.find(b => b.id === id) : undefined;
