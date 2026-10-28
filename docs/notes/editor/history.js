/* Riwayat undo/redo.

   Kenapa tidak memakai document.execCommand('undo') bawaan browser:
   riwayat bawaan rusak begitu DOM diubah lewat skrip — dan editor kita
   melakukan itu terus-menerus (markdown otomatis, toggle blok, cleanup).
   Jadi kita simpan snapshot sendiri.

   Yang disimpan: innerHTML editor + posisi kursor sebagai (indeks blok,
   offset karakter). Offset dipakai, bukan objek Range, karena Range
   langsung basi begitu innerHTML ditulis ulang. */

import { docEl, sel, caretEnd } from './caret.js?v=20261028021559';
import { simpanKvSoon, muatKv } from '../../core/riwayat-sesi.js?v=20261028021559';

const LIMIT = 100;      /* cukup dalam, tetap ringan */
const JEDA  = 500;      /* ms — ketikan beruntun digabung jadi satu langkah */

let stack = [];         /* daftar snapshot */
let at    = -1;         /* posisi sekarang di stack */
let last  = 0;          /* kapan snapshot terakhir diambil */
let diam  = false;      /* true saat undo/redo berjalan, agar tak merekam diri sendiri */
let segar = false;      /* true tepat setelah snap(): record berikutnya harus entri baru */
let idCatatan = null;   /* catatan yang riwayatnya sedang dipegang (K26) */
let boleh = false;      /* false untuk catatan terkunci: isinya tak boleh ditulis ke IDB */

/* ── K26 · riwayat lintas sesi ── */
const kunciRiwayat = id => 'undo:' + id;
function salinRiwayat() {
  return { v: 1, at, stack: stack.map(e => ({ html: e.html, before: e.before, after: e.after })) };
}
function jadwalSimpan() {
  if (!boleh || idCatatan == null) return;
  const snap = salinRiwayat();   /* disalin sekarang: catatan berikutnya tak boleh tertulis ke kunci ini */
  simpanKvSoon(kunciRiwayat(idCatatan), () => snap);
}

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
  recordInti(paksa);
  jadwalSimpan();
}

function recordInti(paksa) {
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
  const hasil = undoInti();
  if (hasil) jadwalSimpan();
  return hasil;
}

function undoInti() {
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
  const hasil = redoInti();
  if (hasil) jadwalSimpan();
  return hasil;
}

function redoInti() {
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
export function resetHistory(id = null, bolehSimpan = true) {
  idCatatan = id;
  boleh = !!id && bolehSimpan;
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

/* Pulihkan riwayat yang tersimpan dari sesi sebelumnya (K26).
   Hanya berlaku bila belum ada aksi baru sejak resetHistory dan catatan masih sama.
   Keadaan DOM sekarang selalu menjadi entri terakhir, sehingga undo tak pernah
   mengembalikan isi yang bertentangan dengan layar. */
export async function pulihkanRiwayat(id) {
  if (!boleh || id == null) return false;
  const tersimpan = await muatKv(kunciRiwayat(id));
  const d = docEl();
  if (!tersimpan || !Array.isArray(tersimpan.stack) || !d) return false;
  if (idCatatan !== id || stack.length !== 1) return false;   /* sudah pindah / ada aksi baru */

  let riwayat = tersimpan.stack
    .filter(e => e && typeof e.html === 'string')
    .slice(-LIMIT)
    .map(e => ({ html: e.html, before: e.before ?? null, after: e.after ?? null }));
  if (riwayat.length === 0) return false;

  let i = Math.min(Math.max(0, Number(tersimpan.at) | 0), riwayat.length - 1);
  const kini = d.innerHTML;
  if (riwayat[i].html !== kini) {
    riwayat = riwayat.slice(0, i + 1);
    riwayat.push({ html: kini, before: null, after: caretNow() });
    i = riwayat.length - 1;
  }
  stack = riwayat;
  at = i;
  segar = false;
  return true;
}
