/* Riwayat undo/redo.

   Kenapa tidak memakai document.execCommand('undo') bawaan browser:
   riwayat bawaan rusak begitu DOM diubah lewat skrip — dan editor kita
   melakukan itu terus-menerus (markdown otomatis, toggle blok, cleanup).
   Jadi kita simpan snapshot sendiri.

   Yang disimpan: innerHTML editor + posisi kursor sebagai (indeks blok,
   offset karakter). Offset dipakai, bukan objek Range, karena Range
   langsung basi begitu innerHTML ditulis ulang. */

import { docEl, sel, caretEnd } from './caret.js?v=20260907100318';

const LIMIT = 100;      /* cukup dalam, tetap ringan */
const JEDA  = 500;      /* ms — ketikan beruntun digabung jadi satu langkah */

let stack = [];         /* daftar snapshot */
let at    = -1;         /* posisi sekarang di stack */
let last  = 0;          /* kapan snapshot terakhir diambil */
let diam  = false;      /* true saat undo/redo berjalan, agar tak merekam diri sendiri */
let segar = false;      /* true tepat setelah snap(): record berikutnya harus entri baru */

export const isReplaying = () => diam;

/* ── posisi kursor sebagai angka, tahan terhadap innerHTML ditulis ulang ── */
function absOff(root, node, offset) {
  let n = 0, done = false;
  (function walk(el) {
    if (done) return;
    for (const ch of Array.from(el.childNodes)) {
      if (done) return;
      if (ch === node && ch.nodeType === 3) { n += offset; done = true; return; }
      if (ch.nodeType === 3) n += ch.data.length;
      else { if (ch === node) { done = true; return; } walk(ch); }
    }
  })(root);
  return n;
}

function ptFromAbs(root, abs) {
  let rem = abs, res = null;
  (function walk(el) {
    if (res) return;
    for (const ch of Array.from(el.childNodes)) {
      if (res) return;
      if (ch.nodeType === 3) {
        if (rem <= ch.data.length) { res = { node: ch, off: rem }; return; }
        rem -= ch.data.length;
      } else walk(ch);
    }
  })(root);
  return res;
}

function caretNow() {
  const d = docEl();
  if (!d) return null;
  const s = sel();
  if (!s || !s.rangeCount) return null;
  const r = s.getRangeAt(0);
  if (!d.contains(r.startContainer)) return null;

  let blk = r.startContainer;
  if (blk.nodeType === 3) blk = blk.parentNode;
  while (blk && blk.parentNode !== d) blk = blk.parentNode;
  const bi = Array.from(d.children).indexOf(blk);
  if (bi < 0) return null;

  return { bi, off: absOff(blk, r.startContainer, r.startOffset) };
}

function caretPut(pos) {
  const d = docEl();
  if (!d || !pos) return;
  const blk = d.children[pos.bi];
  if (!blk) return;
  const pt = ptFromAbs(blk, pos.off);
  if (pt) {
    const r = document.createRange();
    try {
      r.setStart(pt.node, pt.off);
      r.collapse(true);
      const s = sel();
      s.removeAllRanges();
      s.addRange(r);
      return;
    } catch (e) { /* jatuh ke caretEnd */ }
  }
  caretEnd(blk);
}

/* ── API ── */

/* Rekam keadaan sekarang. `paksa` melewati penggabungan waktu —
   dipakai untuk aksi tombol supaya tiap aksi jadi satu langkah undo. */
export function record(paksa = false) {
  const d = docEl();
  if (!d || diam) return;

  const html = d.innerHTML;
  const now  = Date.now();

  if (at >= 0 && stack[at] && stack[at].html === html) {
    stack[at].after = caretNow();   /* isi sama, cukup perbarui kursor */
    return;
  }

  /* ketikan beruntun digabung: timpa snapshot terakhir */
  if (!paksa && !segar && at >= 0 && now - last < JEDA) {
    stack[at].html  = html;
    stack[at].after = caretNow();
    last = now;
    return;
  }

  stack = stack.slice(0, at + 1);            /* buang cabang redo */
  stack.push({ html, before: caretNow(), after: caretNow() });
  if (stack.length > LIMIT) stack.shift();
  at = stack.length - 1;
  last = now;
  segar = false;
}

/* Panggil SEBELUM sebuah aksi mengubah DOM, supaya keadaan lama tersimpan. */
/* Panggil SEBELUM aksi mengubah DOM. Memastikan keadaan LAMA tersimpan
   sebagai entri tersendiri, sehingga aksi berikutnya bisa dibatalkan. */
export function snap() {
  const d = docEl();
  if (!d || diam) return;
  if (at < 0) { record(true); segar = true; return; }
  if (stack[at].html !== d.innerHTML) record(true);
  segar = true;   /* record() sesudah aksi wajib bikin entri baru */
}

export function undo() {
  const d = docEl();
  if (!d || at <= 0) return false;
  /* simpan keadaan terkini dulu agar redo punya tujuan */
  if (stack[at].html !== d.innerHTML) {
    stack[at] = { html: d.innerHTML, before: stack[at].before, after: caretNow() };
  }
  diam = true;
  at--;
  d.innerHTML = stack[at].html;
  caretPut(stack[at].after);
  diam = false;
  return true;
}

export function redo() {
  const d = docEl();
  if (!d || at >= stack.length - 1) return false;
  diam = true;
  at++;
  d.innerHTML = stack[at].html;
  caretPut(stack[at].after);
  diam = false;
  return true;
}

export const canUndo = () => at > 0;
export const canRedo = () => at < stack.length - 1;

/* Bersihkan riwayat saat berpindah catatan — undo tak boleh melintas catatan. */
export function resetHistory() {
  stack = [];
  at = -1;
  last = 0;
  segar = false;
  const d = docEl();
  if (!d) return;
  /* selalu simpan keadaan awal sebagai dasar, walau editor masih kosong —
     tanpa ini ketikan pertama tak punya tujuan undo */
  stack = [{ html: d.innerHTML, before: caretNow(), after: caretNow() }];
  at = 0;
  last = 0;          /* 0 = jauh di masa lalu, jadi record berikutnya bikin entri baru */
}
