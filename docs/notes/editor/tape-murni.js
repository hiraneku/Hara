/* Active recall tape (C6, Tahap 4) — logika DOM murni, tanpa impor UI.

   Tape menandai rentang teks sebagai tersembunyi. Teks tampil saat diketuk, dan bisa ditutup lagi.
   Status disimpan di kelas pada span, jadi ikut tersimpan bersama isi blok:
     <span class="tape tutup">…</span>   tersembunyi (default saat dibuat)
     <span class="tape">…</span>         ditampilkan

   Modul ini tidak mengimpor apa pun supaya bisa diuji di Node (tools/uji/tape-teks.mjs).
   Pemakaiannya di editor ada di tape.js. */

export const KELAS_TAPE = 'tape';
export const KELAS_TUTUP = 'tutup';

/* Blok tingkat atas (anak langsung dokumen) yang memuat node. null bila di luar dokumen. */
export function blokInduk(node, doc) {
  let n = node && node.nodeType === 3 ? node.parentNode : node;
  while (n && n.parentNode !== doc) n = n.parentNode;
  return n && n.parentNode === doc ? n : null;
}

/* Span tape yang membungkus node (di dalam dokumen), atau null. */
export function tapeLuar(node, doc) {
  let n = node && node.nodeType === 3 ? node.parentNode : node;
  while (n && n !== doc) {
    if (n.nodeType === 1 && n.classList && n.classList.contains(KELAS_TAPE)) return n;
    n = n.parentNode;
  }
  return null;
}

/* Membungkus rentang seleksi dengan span tape tersembunyi.
   Mengembalikan { ok: true, span } atau { ok: false, alasan }:
     kosong      — tidak ada seleksi, atau hanya spasi
     luar        — seleksi di luar dokumen
     multi-blok  — seleksi melewati lebih dari satu blok (tape tidak boleh memutus blok)
     tersarang   — seleksi berada di dalam tape atau memuat tape lain */
/* Elemen inline yang membungkus teks. Saat seleksi berada di dalam SATU text node, extractContents()
   hanya mengambil teksnya dan melepas format di sekelilingnya (mis. tebal), jadi format itu
   harus dibuat ulang di dalam tape. */
const INLINE = new Set(['A', 'B', 'I', 'U', 'S', 'STRIKE', 'EM', 'STRONG', 'SPAN', 'CODE', 'FONT',
  'MARK', 'SMALL', 'SUB', 'SUP', 'DEL', 'INS']);

/* Rantai inline dari dalam ke luar, berhenti di elemen non-inline (blok, sel tabel, dll). */
function rantaiInline(node, doc) {
  const rantai = [];
  let n = node.nodeType === 3 ? node.parentNode : node;
  while (n && n !== doc && INLINE.has(n.tagName)) {
    rantai.push(n);
    n = n.parentNode;
  }
  return rantai;
}

/* Membungkus isi dengan klon rantai inline. Klon tanpa id supaya id tidak ganda. */
function bungkusKlon(isi, rantai) {
  let hasil = isi;
  for (const el of rantai) {
    const c = el.cloneNode(false);
    c.removeAttribute('id');
    c.appendChild(hasil);
    hasil = c;
  }
  return hasil;
}

export function bungkusRange(range, doc) {
  if (!range || !doc) return { ok: false, alasan: 'kosong' };
  if (range.collapsed || !range.toString().trim()) return { ok: false, alasan: 'kosong' };
  if (!doc.contains(range.startContainer) || !doc.contains(range.endContainer)) return { ok: false, alasan: 'luar' };
  const a = blokInduk(range.startContainer, doc);
  const b = blokInduk(range.endContainer, doc);
  if (!a || a !== b) return { ok: false, alasan: 'multi-blok' };
  if (tapeLuar(range.startContainer, doc) || tapeLuar(range.endContainer, doc)) return { ok: false, alasan: 'tersarang' };
  if (range.cloneContents().querySelector('span.' + KELAS_TAPE)) return { ok: false, alasan: 'tersarang' };
  const span = (doc.ownerDocument || document).createElement('span');
  span.className = KELAS_TAPE + ' ' + KELAS_TUTUP;
  /* rantai dicatat sebelum ekstraksi, karena setelahnya range sudah mengempis */
  const satuTeks = range.startContainer === range.endContainer && range.startContainer.nodeType === 3;
  const rantai = satuTeks ? rantaiInline(range.startContainer, doc) : [];
  const isi = range.extractContents();
  span.appendChild(rantai.length ? bungkusKlon(isi, rantai) : isi);
  range.insertNode(span);
  return { ok: true, span };
}

/* Membalik status satu tape. Mengembalikan true bila sekarang tersembunyi. */
export function gantiStatus(el) {
  el.classList.toggle(KELAS_TUTUP);
  return el.classList.contains(KELAS_TUTUP);
}

/* Membuka (buka = true) atau menutup semua tape di dokumen.
   Mengembalikan jumlah tape dan jumlah yang benar-benar berubah. */
export function setSemua(doc, buka) {
  const semua = Array.from(doc.querySelectorAll('span.' + KELAS_TAPE));
  let diubah = 0;
  for (const el of semua) {
    const tertutup = el.classList.contains(KELAS_TUTUP);
    if (buka === tertutup) {
      el.classList.toggle(KELAS_TUTUP, !buka);
      diubah++;
    }
  }
  return { jumlah: semua.length, diubah };
}

export function hitungTape(doc) {
  return doc.querySelectorAll('span.' + KELAS_TAPE).length;
}
