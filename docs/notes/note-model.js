/* ════════ MODEL DATA CATATAN ════════

   Bentuk resmi sebuah catatan:

     {
       id, title, blocks[], tags[], props[], folderId,
       createdAt, updatedAt, pinned, archived, deletedAt
     }

   `props` = properti terstruktur { k, v } yang ditampilkan sebagai
   tabel di atas isi (pengganti frontmatter YAML, lihat DESIGN.md).

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
import { t as tr } from '../core/i18n.js?v=20261028073631';
import { ukuranTerbaca } from '../core/blobs.js?v=20261028073631';
import { hitungTabel, lolosSaring, ambilKeadaanTabel, adalahRumus } from './tabel-rumus.js?v=20261028073631';
import { adalahPdf } from './pdf/logika.js?v=20261028073631';
import { tautanAman } from './url-aman.js?v=20261028073631';
import { bersihkanHtmlBlok, PERLU_SARING } from './html-aman.js?v=20261028073631';

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
  'toggle',
  'table',
  'audio',
  'math',
  'bookmark',
  'file',
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
  toggle: 'b-toggle',
  table: 'b-table',
  audio: 'b-audio',
  math: 'b-math',
  bookmark: 'b-bmk',
  file: 'b-file',
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
  'b-toggle': 'toggle',
  'b-table': 'table',
  'b-audio': 'audio',
  'b-math': 'math',
  'b-bmk': 'bookmark',
  'b-file': 'file',
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
/* Batas teks OCR yang disimpan di atribut gambar (B6). Sama dengan ocr/ocr-teks.js. */
const MAKS_OCR_GAMBAR = 20000;
/* Teks OCR bisa berisi & dan <; escAttr hanya menangani tanda kutip, jadi ini melengkapinya. */
const escOcr = s => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

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
  if (type === 'todo') {
    if (typeof blok.meta.checked !== 'boolean') blok.meta.checked = false;
    /* to-do yang baru dicentang (melalui UI) selalu punya waktu centang;
       data lama tanpa data-done diberi waktu saat dibaca kembali */
    if (blok.meta.checked && !blok.meta.done) blok.meta.done = Date.now();
  }
  return blok;
}

/* Catatan baru yang selalu valid. */
/* B7a: latar kertas catatan. 'polos' (tanpa latar) adalah bawaan dan tidak disimpan.
   B7c: 'kustom' = salah satu pola (titik/garis/grid) dengan spasi, warna, dan margin
   sendiri. Pengaturannya disimpan di `kertasAtur`, hanya bila kertas === 'kustom'.
   Warna dan margin hanya boleh dari daftar tetap di bawah (nilai ini masuk ke CSS). */
export const KERTAS_POLA = ['titik', 'garis', 'grid'];
export const KERTAS_JENIS = [...KERTAS_POLA, 'kustom'];
export const KERTAS_SPASI = { min: 16, max: 48, bawaan: 28 };
export const KERTAS_WARNA = { abu: '#8b9099', biru: '#4a7bd0', hijau: '#4f9a6a', merah: '#d0554f', coklat: '#9a7450' };
export const KERTAS_MARGIN = [0, 48, 72, 96];
export const kelasKertas = k => (KERTAS_POLA.includes(k) ? `kertas-${k}` : '');

/* Membersihkan pengaturan kustom. Spasi di luar batas dijepit, warna/margin tak dikenal
   memakai bawaan. Mengembalikan null bila bukan objek atau pola tidak dikenal. */
export function sanitasiAturKertas(a) {
  if (!a || typeof a !== 'object' || !KERTAS_POLA.includes(a.pola)) return null;
  const s = Math.round(Number(a.spasi));
  const spasi = Number.isFinite(s)
    ? Math.min(KERTAS_SPASI.max, Math.max(KERTAS_SPASI.min, s)) : KERTAS_SPASI.bawaan;
  const warna = Object.prototype.hasOwnProperty.call(KERTAS_WARNA, a.warna) ? a.warna : 'abu';
  const m = Number(a.margin);
  const margin = KERTAS_MARGIN.includes(m) ? m : 0;
  return { pola: a.pola, spasi, warna, margin };
}

/* Kelas CSS latar catatan: B7a (titik/garis/grid) dan B7c (kustom). Teks kosong = polos. */
export function kelasKertasNote(n) {
  if (!n || !KERTAS_JENIS.includes(n.kertas)) return '';
  if (n.kertas !== 'kustom') return kelasKertas(n.kertas);
  const a = sanitasiAturKertas(n.kertasAtur);
  if (!a) return '';
  return ['kertas-kustom', `kertas-kustom-${a.pola}`, a.margin ? 'kertas-kustom-margin' : '']
    .filter(Boolean).join(' ');
}

/* Variabel CSS (--kt-*) untuk latar kustom; null bila bukan kustom. */
export function variabelKertasNote(n) {
  if (!n || n.kertas !== 'kustom') return null;
  const a = sanitasiAturKertas(n.kertasAtur);
  if (!a) return null;
  return {
    '--kt-spasi': `${a.spasi}px`,
    '--kt-warna': KERTAS_WARNA[a.warna],
    '--kt-margin': `${a.margin}px`,
  };
}

/* Atribut style untuk .ed-doc. Nilainya selalu dari daftar tetap, jadi aman ditulis apa adanya. */
export function gayaKertasNote(n) {
  const v = variabelKertasNote(n);
  return v ? Object.entries(v).map(([k, x]) => `${k}:${x}`).join(';') : '';
}

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
    /* tag manual (tanpa span di isi) — opsional, hanya disimpan bila ada */
    ...(Array.isArray(patch.tagsManual) && patch.tagsManual.length
      ? { tagsManual: patch.tagsManual.slice() } : {}),
    stickers: Array.isArray(patch.stickers) ? patch.stickers.map(s => ({ ...s })) : [],
    ...(patch.cover ? { cover: String(patch.cover) } : {}),
    /* B7a/B7c: latar kertas. Polos (bawaan) tidak disimpan, sama seperti cover.
       'kustom' hanya disimpan bila pengaturannya valid. */
    ...(patch.kertas === 'kustom' && sanitasiAturKertas(patch.kertasAtur)
      ? { kertas: 'kustom', kertasAtur: sanitasiAturKertas(patch.kertasAtur) }
      : KERTAS_POLA.includes(patch.kertas) ? { kertas: patch.kertas } : {}),
    folderId: patch.folderId ?? null,
    createdAt: patch.createdAt || now,
    updatedAt: patch.updatedAt || now,
    pinned: !!patch.pinned,
    archived: !!patch.archived,
    deletedAt: patch.deletedAt ?? null,
    props: Array.isArray(patch.props)
      ? patch.props.map(pr => ({ k: String(pr.k ?? ''), v: String(pr.v ?? '') }))
      : [],
    /* penanda UI, bukan bagian isi — sambutan global boleh menyimpan
       bahasa isinya (welcomeLang) supaya sinkron tahu bahasa mana yang
       sedang tersimpan tanpa membandingkan isi */
    ...(patch.welcome ? {
      welcome: true,
      welcomeV: patch.welcomeV ?? 0,
      welcomeLang: patch.welcomeLang ?? null,
    } : {}),
  };
}

/* ════════ TURUNAN ════════
   Nilai yang bisa dihitung dari blocks TIDAK disimpan, supaya tidak ada
   dua sumber data yang bisa berselisih. */

/* Teks polos seluruh catatan — dasar cuplikan, hitungan kata, dan nanti search. */
export function plainText(note) {
  if (!note || !Array.isArray(note.blocks)) return '';
  return note.blocks
    .map(b => {
      if (b.type === 'toggle') {
        const s = (b.meta && b.meta.summary) ? b.meta.summary + '\n' : '';
        return (s + stripTags(b.content)).trim();
      }
      if (b.type === 'table' && b.meta && Array.isArray(b.meta.rows)) {
        return b.meta.rows.map(r => r.join(' ')).join('\n').trim();
      }
      if (b.type === 'audio') {
        return String((b.meta && b.meta.title) || '');
      }
      if (b.type === 'image') {
        return String((b.meta && b.meta.ocr) || '');
      }
      if (b.type === 'math') {
        return String((b.meta && b.meta.expr) || '');
      }
      if (b.type === 'bookmark') {
        return [b.meta?.title, b.meta?.desc, b.meta?.url].filter(Boolean).join(' ');
      }
      if (b.type === 'file') {
        return String((b.meta && b.meta.name) || '');
      }
      return stripTags(b.content);
    })
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

const SIMBOL_RUMUS_MODEL = {
  '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ', '\\epsilon': 'ε',
  '\\theta': 'θ', '\\lambda': 'λ', '\\mu': 'μ', '\\pi': 'π', '\\sigma': 'σ',
  '\\tau': 'τ', '\\phi': 'φ', '\\omega': 'ω', '\\Delta': 'Δ', '\\Sigma': '∑',
  '\\Omega': 'Ω', '\\infty': '∞', '\\pm': '±', '\\mp': '∓', '\\times': '×',
  '\\cdot': '·', '\\div': '÷', '\\neq': '≠', '\\leq': '≤', '\\geq': '≥',
  '\\approx': '≈', '\\equiv': '≡', '\\rightarrow': '→', '\\leftarrow': '←',
  '\\Rightarrow': '⇒', '\\Leftrightarrow': '⇔', '\\sum': '∑', '\\prod': '∏',
  '\\int': '∫', '\\partial': '∂', '\\nabla': '∇', '\\in': '∈', '\\notin': '∉',
};

function renderMathHtmlRingan(mentah) {
  let s = String(mentah || '').trim()
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  if (!s) return `<span class="math-empty">${tr('Ketuk untuk mengisi rumus…')}</span>`;
  s = s.replace(/\^\{([^{}]+)\}/g, '<sup>$1</sup>')
    .replace(/_\{([^{}]+)\}/g, '<sub>$1</sub>')
    .replace(/\^([a-zA-Z0-9+\-]+)/g, '<sup>$1</sup>')
    .replace(/_([a-zA-Z0-9+\-]+)/g, '<sub>$1</sub>');
  for (let i = 0; i < 2; i++) {
    s = s.replace(/\\sqrt\{([^{}]+)\}/g,
      '<span class="math-sqrt"><span class="ms-v">√</span><span class="ms-b">$1</span></span>');
  }
  for (let i = 0; i < 3; i++) {
    s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g,
      '<span class="math-frac"><span class="mf-num">$1</span><span class="mf-den">$2</span></span>');
  }
  for (const k of Object.keys(SIMBOL_RUMUS_MODEL).sort((a, b) => b.length - a.length)) {
    s = s.split(k).join(SIMBOL_RUMUS_MODEL[k]);
  }
  return s;
}

/* B4: lencana kecil di pojok kiri-bawah gambar yang punya tautan. Klik membuka tautan di tab baru. */
export function badgeTautanGambar(url) {
  const t = escAttr(tr('Buka tautan'));
  return `<a class="img-tautan" href="${escAttr(url)}" target="_blank" rel="noopener noreferrer"` +
    ` title="${t}" aria-label="${t}"><svg class="ico" aria-hidden="true"><use href="#i-link"/></svg></a>`;
}

export function blockToHtml(b) {
  /* B4/B4c: lapisan kedua penyaringan di tampilan (lapisan pertama di normalizeNote).
     Markup aplikasi sendiri tidak memicu penyaringan; isi yang mencurigakan disaring. */
  const h = blockToHtmlMentah(b);
  return PERLU_SARING.test(h) ? bersihkanHtmlBlok(h) : h;
}

function blockToHtmlMentah(b) {
  const meta = b.meta || {};
  const gaya = meta.indent ? ` style="padding-left:${Number(meta.indent) || 0}px"` : '';
  const ref  = meta.ref ? ` data-ref="${escAttr(meta.ref)}"` : '';
  const bgAttr = meta.bg ? ` data-bg="${escAttr(meta.bg)}"` : '';
  const bid  = ` data-bid="${escAttr(b.id)}"`;

  if (b.type === 'divider')
    return `<div class="b-div" contenteditable="false"${bid}></div>`;

  if (b.type === 'math') {
    const expr = escAttr(meta.expr || '');
    return `<div class="b-math" contenteditable="false" data-expr="${expr}"${bid}${ref}${bgAttr}>` +
      `<div class="math-body">${renderMathHtmlRingan(meta.expr || '')}</div>` +
      `${pegangan()}</div>`;
  }

  if (b.type === 'bookmark') {
    /* B4: alamat yang tidak aman tidak pernah jadi href; '#' sebagai pengganti */
    const aman = tautanAman(meta.url);
    const url = escAttr(aman || '#');
    const urlData = escAttr(aman);
    let host = 'tautan';
    try { if (aman) host = new URL(aman).hostname.replace(/^www\./, ''); } catch {}
    const jdl = escAttr(meta.title || host);
    const ket = escAttr(meta.desc || '');
    return `<div class="b-bmk" contenteditable="false" data-url="${urlData}" data-title="${jdl}" data-desc="${ket}"${bid}${ref}${bgAttr}>` +
      `<a class="bmk-main" href="${url}" target="_blank" rel="noopener noreferrer">` +
      `<span class="bmk-ico" aria-hidden="true"><svg class="ico"><use href="#i-link"/></svg></span>` +
      `<span class="bmk-info">` +
      `<span class="bmk-title">${jdl}</span>` +
      `${ket ? `<span class="bmk-desc">${ket}</span>` : ''}` +
      `<span class="bmk-host">${escAttr(host)}</span>` +
      `</span></a>` +
      `<button type="button" class="bmk-act" data-bmk-edit title="${tr('Sunting')}" aria-label="${tr('Sunting')}"><svg class="ico"><use href="#i-pen"/></svg></button>` +
      `<button type="button" class="bmk-act" data-bmk-del title="${tr('Hapus')}" aria-label="${tr('Hapus')}"><svg class="ico"><use href="#i-x"/></svg></button>` +
      `${pegangan()}</div>`;
  }

  if (b.type === 'file') {
    const blobId = escAttr(meta.blobId || '');
    const nama = escAttr(meta.name || 'lampiran');
    const uk = Number(meta.size) || 0;
    const mime = escAttr(meta.mime || 'application/octet-stream');
    const ekst = (String(meta.name || '').split('.').pop() || 'FILE').slice(0, 5).toUpperCase();
    return `<div class="b-file" contenteditable="false" data-blob="${blobId}" data-name="${nama}" data-size="${uk}" data-mime="${mime}"${bid}${ref}${bgAttr}>` +
      `<span class="fl-ext">${escAttr(ekst)}</span>` +
      `<div class="fl-info"><div class="fl-name">${nama}</div><div class="fl-size">${ukuranTerbaca(uk)}</div></div>` +
      `${adalahPdf(meta) ? `<button type="button" class="btn btn-sec fl-btn" data-file-buka>${tr('Buka PDF')}</button>` : ''}` +
      `<button type="button" class="btn btn-sec fl-btn" data-file-dl>${tr('Unduh')}</button>` +
      `<button type="button" class="bmk-act" data-file-del title="${tr('Hapus')}" aria-label="${tr('Hapus')}"><svg class="ico"><use href="#i-x"/></svg></button>` +
      `${pegangan()}</div>`;
  }

  if (b.type === 'toggle') {
    const buka = meta.open === false ? '0' : '1';
    const sum = escAttr(meta.summary || '');
    return `<div class="b-toggle" contenteditable="false" data-open="${buka}"${bid}${ref}>` +
      `<div class="tgl-head">` +
      `<button type="button" class="tgl-btn" data-tgl-btn aria-expanded="${buka === '1' ? 'true' : 'false'}" aria-label="Toggle"><svg class="ico" aria-hidden="true"><use href="#i-chev"/></svg></button>` +
      `<input type="text" class="tgl-sum" value="${sum}" placeholder="${tr('Judul bagian lipat…')}">` +
      `<button type="button" class="tgl-del" data-tgl-del title="${tr('Hapus')}" aria-label="${tr('Hapus')}"><svg class="ico"><use href="#i-x"/></svg></button>` +
      `</div>` +
      `<div class="tgl-isi" contenteditable="true" data-ph="${tr('Isi bagian lipat…')}">${b.content || ''}</div>` +
      `${pegangan()}</div>`;
  }

  if (b.type === 'table') {
    const rawRows = Array.isArray(meta.rows) && meta.rows.length
      ? meta.rows
      : [[tr('Kolom 1'), tr('Kolom 2')], ['', '']];
    const head = rawRows[0] || [''];
    const body = rawRows.length > 1 ? rawRows.slice(1) : [head.map(() => '')];
    const escCell = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    /* MB2: hasil rumus (atribut, bukan teks — tidak ikut tersimpan) & keadaan saring/urut */
    const keadaan = ambilKeadaanTabel(b.id);
    const kolAktif = Math.min(keadaan.kol, Math.max(0, head.length - 1));
    const hasil = hitungTabel(rawRows);
    const lolos = lolosSaring(rawRows, kolAktif, keadaan.saring);
    const hasilSel = (ri, idx) => {
      const teks = String((rawRows[ri] && rawRows[ri][idx]) ?? '');
      return adalahRumus(teks) ? ` data-hasil="${escAttr(hasil[ri][idx])}"` : '';
    };
    const tools = `<div class="tbl-urut">` +
      `<label class="tbl-lbl">${tr('Kolom')} <select data-tbl-kol aria-label="${tr('Kolom untuk urut & saring')}">` +
        head.map((h, i) => `<option value="${i}"${i === kolAktif ? ' selected' : ''}>${escAttr(h || (tr('Kolom') + ' ' + (i + 1)))}</option>`).join('') +
      `</select></label>` +
      `<button type="button" data-tbl-act="urut-naik" title="${tr('Urut naik')}" aria-label="${tr('Urut naik')}">↑</button>` +
      `<button type="button" data-tbl-act="urut-turun" title="${tr('Urut turun')}" aria-label="${tr('Urut turun')}">↓</button>` +
      `<input type="search" data-tbl-saring value="${escAttr(keadaan.saring)}" placeholder="${tr('Saring…')}" aria-label="${tr('Saring baris')}">` +
      `</div>`;
    return `<div class="b-table" contenteditable="false"${bid}${ref}>` +
      `<div class="tbl-bar">` +
      `<button type="button" data-tbl-act="add-row">+ ${tr('Baris')}</button>` +
      `<button type="button" data-tbl-act="add-col">+ ${tr('Kolom')}</button>` +
      `<button type="button" data-tbl-act="del-row">− ${tr('Baris')}</button>` +
      `<button type="button" data-tbl-act="del-col">− ${tr('Kolom')}</button>` +
      `<button type="button" data-tbl-act="del-table" class="tbl-danger" title="${tr('Hapus')}" aria-label="${tr('Hapus')}"><svg class="ico"><use href="#i-x"/></svg></button>` +
      `</div>` +
      tools +
      `<div class="tbl-scroll"><table>` +
      `<thead><tr>${head.map(c => `<th contenteditable="true">${escCell(c)}</th>`).join('')}</tr></thead>` +
      `<tbody>${body.map((r, i) => `<tr${lolos[i] === false ? ' hidden' : ''}>${head.map((_, idx) => `<td contenteditable="true"${hasilSel(i + 1, idx)}>${escCell(r[idx])}</td>`).join('')}</tr>`).join('')}</tbody>` +
      `</table></div>${pegangan()}</div>`;
  }

  if (b.type === 'audio') {
    const blobId = escAttr(meta.blobId || '');
    const judul = escAttr(meta.title || tr('Memo suara'));
    const dur = Math.max(0, Number(meta.duration) || 0);
    const labelDur = `${String(Math.floor(dur / 60)).padStart(2, '0')}:${String(dur % 60).padStart(2, '0')}`;
    return `<figure class="b-audio" contenteditable="false" data-blob="${blobId}" data-dur="${dur}"${bid}${ref}>` +
      `<button type="button" class="aud-btn" data-aud-play aria-label="${tr('Putar memo suara')}"><svg class="ico aud-i-play" aria-hidden="true"><use href="#i-play"/></svg><svg class="ico aud-i-pause" aria-hidden="true"><use href="#i-pause"/></svg></button>` +
      `<input type="text" class="aud-title" value="${judul}" aria-label="${tr('Judul memo')}">` +
      `<span class="aud-dur">${labelDur}</span>` +
      `<button type="button" class="aud-speed" data-aud-speed>1×</button>` +
      `<button type="button" class="aud-del" data-aud-del title="${tr('Hapus')}" aria-label="${tr('Hapus')}"><svg class="ico"><use href="#i-x"/></svg></button>` +
      `<audio preload="metadata"></audio>${pegangan()}</figure>`;
  }

  if (b.type === 'image') {
    const alt = escAttr(meta.alt || 'gambar');
    const blob = escAttr(meta.blobId || '');
    /* Tata letak gambar (tata-gambar.js): lebar % menentukan KELAS tata
       letak, perataan kiri/tengah/kanan, rotasi −180..180, bias atas/
       bawah (data-gb). Gambar lama tanpa pengaturan dirender seperti
       dulu (100%, lurus, baris sendiri). */
    let w = Math.round(Number(meta.w) || 0);
    w = w >= 20 && w <= 100 ? w : 100;
    let rot = Math.round(Number(meta.rot) || 0) || 0;
    rot = Math.max(-180, Math.min(180, rot));
    const ga = meta.align === 'l' || meta.align === 'c' || meta.align === 'r'
      ? meta.align : '';
    const gb = meta.zb === 'b' ? 'b' : '';
    /* kelas lebar: hero ≥90 · baris 70–89 · mengapit 50–69 · kecil ≤49 */
    const cls = ['b-img'];
    if (w >= 90) cls.push('w-hero');
    else if (w >= 70) { cls.push('w-baris'); cls.push(ga ? 'i-' + ga : 'i-c'); }
    else if (w >= 50) cls.push('w-apit', ga === 'l' || ga === 'r' ? 'f-' + ga : 'i-c');
    else cls.push('w-kecil', ga === 'l' || ga === 'r' ? 'f-' + ga : 'i-c');
    if (gb) cls.push('gb-b');
    const khusus = w !== 100 || rot !== 0 || ga || gb;
    let gaya = '';
    if (khusus) {
      cls.push('tata');
      gaya = ` style="width:${w}%;--gr:${rot}deg"` +
        ` data-gw="${w}" data-gr="${rot}"` +
        (ga ? ` data-ga="${ga}"` : '') + (gb ? ` data-gb="b"` : '');
    }
    const skAttr = meta.sketch ? ' data-sketch="1"' : '';
    const gorAttr = meta.goresan ? ` data-goresan="${escAttr(meta.goresan)}"` : '';
    const scanAttr = meta.scan ? ` data-scan="${escAttr(meta.scan)}"` : '';
    const origAttr = meta.origBlob ? ` data-orig-blob="${escAttr(meta.origBlob)}"` : '';
    /* B6: teks hasil OCR gambar. Ikut disimpan di catatan, jadi tercari dan tercadangkan. */
    const ocrAttr = meta.ocr ? ` data-ocr="${escOcr(String(meta.ocr).slice(0, MAKS_OCR_GAMBAR))}"` : '';
    /* B4: tautan pada gambar/objek tulisan. Alamat tidak aman tidak pernah ditulis. */
    const tautan = tautanAman(meta.url);
    const urlAttr = tautan ? ` data-url="${escAttr(tautan)}"` : '';
    return `<div class="${cls.join(' ')}" contenteditable="false"${gaya}${bid}${skAttr}${gorAttr}${scanAttr}${origAttr}${ocrAttr}${urlAttr}${bgAttr}>` +
      `<img data-blob="${blob}" alt="${alt}">` +
      `<button class="img-x" data-imgx="${blob}" title="${tr('Hapus gambar')}" aria-label="${tr('Hapus gambar')}">` +
      `<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>` +
      `${tautan ? badgeTautanGambar(tautan) : ''}${pegangan()}</div>`;
  }

  if (b.type === 'todo') {
    const on = meta.checked ? ' on' : '';
    const done = meta.checked ? ' done' : '';
    const dn = (meta.checked && meta.done ? ` data-done="${meta.done}"` : '')
      + (meta.ulangKe ? ` data-ulang="${meta.ulangKe}"` : '');
    const kotak = `<button class="cbx${on}" contenteditable="false" type="button" ` +
      `role="checkbox" aria-checked="${meta.checked ? 'true' : 'false'}">` +
      `<svg viewBox="0 0 24 24"><path d="M4 12l5 5L20 6"/></svg></button>`;
    return `<div class="b-todo${done}"${bid}${dn}${ref}${bgAttr}${gaya}>${kotak}${b.content || ''}${pegangan()}</div>`;
  }

  if (b.type === 'heading') {
    const cls = HEADING_CLASS[meta.level] || 'b-h2';
    const tag = 'h' + (meta.level || 2);
    return `<${tag} class="${cls}"${bid}${ref}${bgAttr}${gaya}>${b.content || ''}${pegangan()}</${tag}>`;
  }

  if (b.type === 'callout') {
    const jenis = meta.variant ? ` data-cal="${escAttr(meta.variant)}"` : '';
    const label = meta.label ? ` data-cal-label="${escAttr(meta.label)}"` : '';
    return `<div class="b-cal"${bid}${jenis}${label}${ref}${bgAttr}${gaya}>${b.content || ''}${pegangan()}</div>`;
  }

  const cls = (TYPE_TO_CLASS[b.type] || 'b-p') +
    (meta.gslot ? ' g-slot' : '') + (meta.gsisi ? ' sisi' : '');
  const lang = b.type === 'code' && meta.lang ? ` data-lang="${escAttr(meta.lang)}"` : '';
  return `<div class="${cls}"${bid}${lang}${ref}${bgAttr}${gaya}>${b.content || ''}${pegangan()}</div>`;
}

/* Pegangan seret blok (desktop). Elemen asli di DOM, tapi DIBUANG saat
   disimpan (lihat bersihkanIsi) — jadi ia tidak pernah ikut tersimpan
   ke isi catatan.

   `blockToHtml` menyisipkannya saat merender editor; blok yang lahir
   kemudian (Enter, tempel, undo/redo, pemulihan draf) mendapatkannya
   lewat `pastikanGandel()` yang dipanggil setiap refresh(). */
const GANDEL = '<button class="blk-h" data-blkh type="button" contenteditable="false" ' +
  'title="' + tr('Seret untuk memindahkan blok') + '" aria-label="' + tr('Pindahkan blok') + '">' +
  '<svg class="ico"><use href="#i-grip"/></svg></button>';
const GANDEL_REG = /<button\s[^>]*\bblk-h\b[^>]*>[\s\S]*?<\/button>/g;
function pegangan() { return GANDEL; }

export function blocksToDom(blocks) {
  if (!Array.isArray(blocks) || !blocks.length)
    return blockToHtml(makeBlock({ type: 'paragraph' }));
  return blocks.map(blockToHtml).join('');
}

/* Sisipkan gagang seret pada setiap blok editor yang belum memilikinya.
   Idempoten — aman dipanggil tiap refresh. */
export function pastikanGandel(root) {
  if (!root || !root.children || !document) return;
  Array.from(root.children).forEach(el => {
    if (!el.classList || !el.querySelector) return;
    const kelas = Array.from(el.classList);
    if (!kelas.some(c => c.startsWith('b-'))) return;
    if (kelas.includes('b-div')) return;                 /* bukan blok isi */
    if (el.querySelector('.blk-h')) return;              /* sudah ada */
    const g = document.createElement('button');
    g.className = 'blk-h';
    g.type = 'button';
    g.setAttribute('data-blkh', '');
    g.contentEditable = 'false';
    g.title = tr('Seret untuk memindahkan blok');
    g.setAttribute('aria-label', tr('Pindahkan blok'));
    g.innerHTML = '<svg class="ico"><use href="#i-grip"/></svg>';
    el.appendChild(g);
  });
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
  const bg = el.getAttribute && el.getAttribute('data-bg');
  if (bg) meta.bg = bg;
  /* slot ketik penutup gambar — tanda dibawa lewat meta supaya posisi
     teks (baris penuh di bawah gambar) konsisten setelah simpan/buka */
  if (el.classList && el.classList.contains('g-slot')) meta.gslot = true;
  /* varian sisi: teks mengalir di sisi gambar mengapit — dipertahankan
     supaya paragraf berisi tidak melompat posisi setelah dibuka ulang */
  if (el.classList && el.classList.contains('sisi')) meta.gsisi = true;

  let content = '';

  if (type === 'divider') {
    /* tanpa isi */
  } else if (type === 'toggle') {
    const sum = el.querySelector && el.querySelector('.tgl-sum');
    const isi = el.querySelector && el.querySelector('.tgl-isi');
    meta.summary = sum ? sum.value : '';
    meta.open = el.getAttribute('data-open') !== '0';
    content = isi ? isi.innerHTML || '' : '';
  } else if (type === 'table') {
    const trs = el.querySelectorAll ? Array.from(el.querySelectorAll('tr')) : [];
    meta.rows = trs.map(row =>
      Array.from(row.querySelectorAll('th,td')).map(c => (c.textContent || '').trim())
    );
  } else if (type === 'audio') {
    const inp = el.querySelector && el.querySelector('.aud-title');
    meta.blobId = el.getAttribute('data-blob') || '';
    meta.duration = Number(el.getAttribute('data-dur')) || 0;
    meta.title = inp ? inp.value : '';
  } else if (type === 'math') {
    meta.expr = el.getAttribute('data-expr') || '';
  } else if (type === 'bookmark') {
    meta.url = el.getAttribute('data-url') || '';
    meta.title = el.getAttribute('data-title') || '';
    meta.desc = el.getAttribute('data-desc') || '';
  } else if (type === 'file') {
    meta.blobId = el.getAttribute('data-blob') || '';
    meta.name = el.getAttribute('data-name') || 'lampiran';
    meta.size = Number(el.getAttribute('data-size')) || 0;
    meta.mime = el.getAttribute('data-mime') || 'application/octet-stream';
  } else if (type === 'image') {
    const img = el.querySelector && el.querySelector('img[data-blob]');
    if (img) {
      meta.blobId = img.getAttribute('data-blob') || '';
      const alt = img.getAttribute('alt');
      if (alt) meta.alt = alt;
    }
    if (el.getAttribute && el.getAttribute('data-sketch') === '1') meta.sketch = true;
    const gor = el.getAttribute && el.getAttribute('data-goresan');
    if (gor) meta.goresan = gor;
    const sc = el.getAttribute && el.getAttribute('data-scan');
    if (sc) meta.scan = sc;
    const ob = el.getAttribute && el.getAttribute('data-orig-blob');
    if (ob) meta.origBlob = ob;
    const ocr = el.getAttribute && el.getAttribute('data-ocr');
    if (ocr) meta.ocr = ocr.slice(0, MAKS_OCR_GAMBAR);
    /* tata letak: atribut data-gw/gr/ga/gb pada figur (baca balik dari
       tata-gambar.js). Gambar lama tanpa atribut tidak mendapat meta —
       tetap dirender sebagai gambar 100% lurus seperti sebelumnya. */
    const gw = el.getAttribute && el.getAttribute('data-gw');
    if (gw) {
      const w = parseInt(gw, 10);
      if (!isNaN(w)) meta.w = Math.max(20, Math.min(100, w));
    }
    const gr = el.getAttribute && el.getAttribute('data-gr');
    if (gr) {
      const r = Math.round(Number(gr)) || 0;
      meta.rot = Math.max(-180, Math.min(180, r));
    }
    const ga = el.getAttribute && el.getAttribute('data-ga');
    if (ga === 'l' || ga === 'c' || ga === 'r') meta.align = ga;
    const gb = el.getAttribute && el.getAttribute('data-gb');
    if (gb === 'b') meta.zb = 'b';
    /* B4: tautan gambar/objek tulisan; alamat tidak aman dibuang */
    const tg = el.getAttribute && el.getAttribute('data-url');
    const tgAman = tautanAman(tg);
    if (tgAman) meta.url = tgAman;
  } else if (type === 'todo') {
    meta.checked = kelas.includes('done');
    /* waktu centang (ms) — untuk panel Tugas/Reminder (B9) */
    const dn = el.getAttribute && el.getAttribute('data-done');
    if (dn) {
      const v = Number(dn);
      if (!isNaN(v) && v > 0) meta.done = v;
    }
    /* tenggat berulang yang sudah bergeser (K2) */
    const ul = el.getAttribute && el.getAttribute('data-ulang');
    if (ul) {
      const v = Number(ul);
      if (!isNaN(v) && v > 0) meta.ulangKe = v;
    }
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
    if (type === 'code') {
      const lg = el.getAttribute('data-lang');
      if (lg) meta.lang = lg;
    }
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

/* Hapus span tag kosong; lepas bungkus span tag yang isinya tidak
   dimulai '#'. Dipakai saat menyimpan & saat memuat data lama, supaya
   sisa-sisa bug lama (huruf pertama berwarna di paragraf baru, tag
   "hantu" dari span kosong) tidak menetap di penyimpanan.
   Tag sah selalu berbentuk <span class="tg">#nama</span>. */
export function sapuTagRusak(html) {
  let s = String(html || '');
  /* span kosong (atau hanya spasi) → hapus seluruh elemen */
  s = s.replace(/<span[^>]*class="[^"]*\btg\b[^"]*"[^>]*>\s*<\/span>/g, '');
  /* span berisi teks polos yang TIDAK diawali # → buka bungkusnya
     (teksnya tetap utuh, hanya warnanya yang hilang) */
  s = s.replace(/<span([^>]*class="[^"]*\btg\b[^"]*"[^>]*)>((?!#)[^<]*)<\/span>/g, '$2');
  return s;
}

/* Buang jejak yang murni urusan tampilan, bukan isi. */
function bersihkanIsi(html) {
  return sapuTagRusak(String(html || '')
    /* pegangan seret tidak pernah ikut tersimpan */
    .replace(GANDEL_REG, '')
    /* objectURL gambar tidak berlaku di sesi berikutnya */
    .replace(/(<img[^>]*?)\ssrc="blob:[^"]*"/g, '$1')
    /* <br> pengganjal blok kosong */
    .replace(/^<br\s*\/?>$/i, '')
    /* nomor daftar dihitung ulang saat render */
    .replace(/\sdata-n="[^"]*"/g, ''));
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
/* B4: alamat tautan tidak aman dibuang dari data (bookmark dan href di isi blok). */
function bersihBlokTautan(blok) {
  if (!blok || typeof blok !== 'object') return blok;
  let out = blok;
  /* B4c: isi HTML blok disaring (on*, <iframe>, <img onerror>, href/src berbahaya, dll).
     Blok kode tidak disentuh: isinya teks, bukan markup. */
  if (blok.type !== 'code' && typeof out.content === 'string' && out.content.includes('<')) {
    out = { ...out, content: bersihkanHtmlBlok(out.content) };
  }
  if ((blok.type === 'bookmark' || blok.type === 'image') && blok.meta && blok.meta.url) {
    out = { ...out, meta: { ...blok.meta, url: tautanAman(blok.meta.url) } };
  }
  return out;
}

export function normalizeNote(raw) {
  if (!raw || typeof raw !== 'object') return makeNote();

  /* sudah model baru */
  if (Array.isArray(raw.blocks)) {
    return makeNote({
      ...raw,
      stickers: Array.isArray(raw.stickers) ? raw.stickers.map(s => ({ ...s })) : [],
      blocks: raw.blocks.map(b => {
        if (!b || b.type === 'code' || b.type === 'divider') return makeBlock(b);
        /* sapu sisa span tag rusak dari data lama (bug Enter membelah
           tag / span kosong) — isi teksnya tidak berubah */
        return bersihBlokTautan(makeBlock({ ...b, content: sapuTagRusak(b.content) }));
      }),
    });
  }

  /* ── model lama: { id, t, html, ex, ts, mod, welcome } ── */
  const waktu = raw.ts || Date.now();
  return makeNote({
    id: raw.id,
    title: raw.title ?? raw.t ?? '',
    blocks: htmlToBlocks(raw.html).map(bersihBlokTautan),
    tags: raw.tags,
    tagsManual: raw.tagsManual,
    folderId: raw.folderId,
    createdAt: raw.createdAt || waktu,
    updatedAt: raw.updatedAt || waktu,
    pinned: raw.pinned,
    archived: raw.archived,
    deletedAt: raw.deletedAt,
    welcome: raw.welcome,
    welcomeV: raw.welcomeV,
  });
}

export const normalizeNotes = arr =>
  (Array.isArray(arr) ? arr : []).map(normalizeNote);

/* ── util kecil untuk pemakai model ── */

export function touch(note) {
  if (note) note.updatedAt = Date.now();
  return note;
}

