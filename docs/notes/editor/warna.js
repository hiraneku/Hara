/* Warna teks — meniru mesin font (span.fnt), tapi nilai warnanya bebas.

   Warna disimpan sebagai:
     <span class="wrn" data-warna="#e6194b" style="color:#e6194b">teks</span>

   data-warna = bentuk kanonik (selalu #rrggbb) untuk dibaca ulang;
   style color dipakai untuk menggambar di editor dan ikut tersimpan.

   Perilaku persis tombol format lain:
   • teks diblok  → blok itu dibungkus/dilepas warnanya langsung;
   • tanpa blok   → warna "menunggu": berlaku untuk ketikan berikutnya
     (lekat lintas ketikan, dibatalkan oleh pindah blok / pilih lain /
     hapus warna);
   • pilih "Bawaan" di dalam teks berwarna → karakter berikutnya
     dipecah keluar dari span warna, tanpa membuat span baru. */

import { docEl, sel, curBlock } from './caret.js?v=20260907100318';
import { refresh } from './cleanup.js?v=20260907100318';

/* Normalisasi masukan warna → "#rrggbb", atau null kalau tak dikenal.
   Menerima: "e6194b", "#e6194b", "#e62", "e62". */
export function normalizeWarna(masukan) {
  let s = String(masukan || '').trim().toLowerCase();
  if (!s) return null;
  if (s[0] === '#') s = s.slice(1);
  if (/^[0-9a-f]{3}$/.test(s))
    s = s.split('').map(c => c + c).join('');
  if (!/^[0-9a-f]{6}$/.test(s)) return null;
  return '#' + s;
}

/* Elemen warna yang membungkus sebuah node. */
export function warnaAround(node) {
  const d = docEl();
  let n = node;
  if (n && n.nodeType === 3) n = n.parentNode;
  while (n && n !== d) {
    if (n.matches && n.matches('span.wrn')) return n;
    n = n.parentNode;
  }
  return null;
}

/* Warna yang sedang berlaku di posisi kursor ('' = tidak ada). */
export function warnaSekarang() {
  const d = docEl();
  if (!d) return '';
  /* niat pengguna mengalahkan isi DOM */
  if (_lekat) return _lekat;
  const s = sel();
  if (!(s && s.rangeCount && d.contains(s.getRangeAt(0).startContainer))) return '';
  const el = warnaAround(s.getRangeAt(0).startContainer);
  return el ? (el.getAttribute('data-warna') || '') : '';
}

/* Lepas bungkus warna di dalam sebuah fragmen (ganti dengan isinya). */
function lepasWarnaDalam(frag) {
  if (!frag.querySelectorAll) return;
  Array.from(frag.querySelectorAll('span.wrn')).forEach(e => {
    while (e.firstChild) e.parentNode.insertBefore(e.firstChild, e);
    e.remove();
  });
}

/* ── niat warna yang menunggu ── */
const HAPUS = '\u0000hapus';     /* penanda "kembali ke tanpa warna" */
let _pending = null;             /* warna yang menunggu dipakai */
let _lekat = null;               /* warna yang melekat lintas ketikan */
let _modeBawaan = false;         /* hapus-warna melekat sampai batal */
export const warnaPending = () => (_pending === HAPUS ? '' : _pending);
export const adaPendingHapus = () => _pending === HAPUS;
export const modeBawaanWarna = () => _modeBawaan;
export const warnaLekat = () => _lekat;

/* Seleksi ulang berdasarkan offset karakter di dalam satu induk, dipakai
   setelah normalize() menggabungkan text node. */
function pilihTeks(induk, dari, panjang) {
  const s = sel();
  if (!s || !panjang) return;
  let sisa = dari;
  const jalan = document.createTreeWalker(induk, 4, null);  /* SHOW_TEXT */
  let n;
  while ((n = jalan.nextNode())) {
    if (sisa <= n.data.length) break;
    sisa -= n.data.length;
  }
  if (!n) return;
  const r = document.createRange();
  r.setStart(n, sisa);
  r.setEnd(n, Math.min(n.data.length, sisa + panjang));
  s.removeAllRanges(); s.addRange(r);
}

function buatSpan(hex) {
  const el = document.createElement('span');
  el.className = 'wrn';
  el.setAttribute('data-warna', hex);
  el.style.color = hex;
  return el;
}

export function setWarna(hex) {
  const d = docEl();
  if (!d) return;
  hex = normalizeWarna(hex) || '';
  const s = sel();
  if (!(s && s.rangeCount && d.contains(s.getRangeAt(0).startContainer))) return;
  const r = s.getRangeAt(0);

  /* ── Tanpa teks terpilih ──
     Tidak mengubah teks yang sudah tertulis; warna berlaku untuk yang
     diketik SETELAH ini. Teks lama harus diblok dulu. */
  if (r.collapsed) {
    if (hex) { _pending = hex; _lekat = hex; _modeBawaan = false; refresh(); return; }

    /* ── "Bawaan" ──
       Caret di dalam span warna? Jangan cuma memindahkan caret keluar —
       browser menariknya kembali. Catat niatnya, lalu pecah keluar tepat
       saat huruf pertama diketik. */
    _lekat = null;
    if (warnaAround(r.startContainer)) { _pending = HAPUS; _modeBawaan = true; }
    else { _pending = null; _modeBawaan = false; }
    refresh();
    return;
  }

  /* ── Ada teks terpilih: ganti warna pada bagian itu saja ── */
  _pending = null; _lekat = null; _modeBawaan = false;
  /* Seleksi persis mengisi satu span warna & pilihan = hapus warna:
     buka bungkusnya dulu, kalau tidak span lama tetap tertinggal. */
  const induk = warnaAround(r.startContainer);
  if (!hex && induk && induk === warnaAround(r.endContainer) &&
      induk.textContent === r.toString()) {
    const anak = Array.from(induk.childNodes), ind = induk.parentNode;
    /* simpan posisi KARAKTER dulu — normalize() menggabungkan text node
       sehingga referensi node lama menjadi yatim */
    const pra = document.createRange();
    pra.selectNodeContents(ind);
    pra.setEnd(induk, 0);
    const awal = pra.toString().length;
    const panjang = induk.textContent.length;
    anak.forEach(k => ind.insertBefore(k, induk));
    induk.remove();
    ind.normalize();
    if (panjang) pilihTeks(ind, awal, panjang);
    refresh();
    return;
  }
  const frag = r.extractContents();
  lepasWarnaDalam(frag);          /* warna lama di dalam seleksi dibuang */
  let node;
  if (hex) {
    node = buatSpan(hex);
    node.appendChild(frag);
  } else {
    node = frag;
  }
  const awal = node.nodeType === 11 ? node.firstChild : node;
  const akhir = node.nodeType === 11 ? node.lastChild : node;
  r.insertNode(node);
  if (awal && akhir) {
    const nr = document.createRange();
    nr.setStartBefore(awal);
    nr.setEndAfter(akhir);
    s.removeAllRanges();
    s.addRange(nr);
  }
  const b = curBlock();
  if (b) b.normalize();
  refresh();
}

/* Pecah keluar dari span warna di posisi caret — berulang sampai tak ada
   span warna yang membungkus (span bisa bersarang). */
export function keluarDariWarna() {
  const s = sel();
  if (!(s && s.rangeCount)) return false;
  if (!warnaAround(s.getRangeAt(0).startContainer)) return false;
  let aman = 0;
  while (warnaAround(sel().getRangeAt(0).startContainer) && aman++ < 12) {
    if (!keluarSatuLapis()) break;
  }
  return true;
}

function keluarSatuLapis() {
  const s = sel();
  if (!(s && s.rangeCount)) return false;
  const r = s.getRangeAt(0);
  const host = warnaAround(r.startContainer);
  if (!host) return false;

  /* pisahkan isi span jadi sebelum-caret dan sesudah-caret */
  const sisa = document.createRange();
  sisa.selectNodeContents(host);
  try { sisa.setStart(r.startContainer, r.startOffset); } catch (e) { return false; }
  const buntut = sisa.extractContents();

  /* Titik ketik: text node kosong SEGAR tepat sesudah host. Tidak boleh
     memakai text node yang sudah ada di sebelah kanan host — isinya milik
     teks lanjutan, dan caret di AKHIR node itu akan melompati teks
     (kasus: span warna yang disusul teks polos). */
  const titik = document.createTextNode('');
  host.after(titik);
  if (buntut.textContent !== '') {
    /* sisa warna tetap berwarna dan tetap MENDAHULUI teks lanjutan,
       supaya urutan karakter tidak berubah: host, titik, kanan */
    const kanan = host.cloneNode(false);
    kanan.appendChild(buntut);
    titik.after(kanan);
  }
  const indukHost = host.parentNode;
  if (host.textContent === '') host.remove();

  const nr = document.createRange();
  nr.setStart(titik, 0);
  nr.collapse(true);
  s.removeAllRanges();
  s.addRange(nr);
  if (indukHost && indukHost.classList && indukHost.classList.contains('wrn') &&
      indukHost.textContent === '') indukHost.remove();
  return true;
}

/* Bungkus titik ketik berikutnya dengan warna yang menunggu. */
export function bungkusWarnaPending() {
  if (_pending === HAPUS) { _pending = null; keluarDariWarna(); return null; }
  if (!_pending) return null;
  const hex = _pending;
  _pending = null;
  const s = sel();
  if (!(s && s.rangeCount)) return null;
  let r = s.getRangeAt(0);

  /* Kursor di dalam span warna LAIN: keluar dulu, jangan bersarang. */
  const host = warnaAround(r.startContainer);
  if (host && host.getAttribute('data-warna') !== hex) {
    keluarDariWarna();
    if (!s.rangeCount) return null;
    r = s.getRangeAt(0);
  }

  const el = buatSpan(hex);
  const t = document.createTextNode('');
  el.appendChild(t);
  r.insertNode(el);
  const nr = document.createRange();
  nr.setStart(t, 0);
  nr.collapse(true);
  s.removeAllRanges();
  s.addRange(nr);
  return el;
}

/* Warna melekat tapi caret berada di span warna LAIN → keluar lalu
   bungkus ulang dengan warna yang benar. Dipanggil tiap karakter,
   karena browser kerap menarik caret kembali ke span lama. */
export function reBungkusLekat() {
  if (!_lekat) return;
  keluarDariWarna();
  const el = buatSpan(_lekat);
  const t0 = document.createTextNode('');
  el.appendChild(t0);
  const sx = sel();
  if (sx && sx.rangeCount) {
    sx.getRangeAt(0).insertNode(el);
    const rx = document.createRange();
    rx.setStart(t0, 0); rx.collapse(true);
    sx.removeAllRanges(); sx.addRange(rx);
  }
}

export function warnaPerluKeluar() {
  if (!_lekat) return false;
  const s = sel();
  if (!(s && s.rangeCount)) return false;
  const host = warnaAround(s.getRangeAt(0).startContainer);
  return !!(host && host.getAttribute('data-warna') !== _lekat);
}

/* Pindah blok membatalkan warna yang menunggu — sama seperti font. */
let blokTerakhir = null;
document.addEventListener('selectionchange', () => {
  const b = curBlock();
  if (blokTerakhir && b !== blokTerakhir) { _pending = null; _lekat = null; _modeBawaan = false; }
  blokTerakhir = b;
});
