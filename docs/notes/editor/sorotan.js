/* SOROTAN (latar belakang teks) — bayangan mesin warna teks (warna.js),
   tapi warnanya dipakai sebagai latar:
     <span class="wsr" data-sorotan="#fdd835" style="background:#fdd835">teks</span>

   data-sorotan = bentuk kanonik (selalu #rrggbb) untuk dibaca ulang;
   style background dipakai untuk menggambar di editor dan ikut tersimpan.

   Perilaku persis warna teks (warna.js):
   • teks diblok  → blok itu dibungkus/dilepas sorotannya langsung;
   • tanpa blok   → sorotan "menunggu": berlaku untuk ketikan berikutnya
     (lekat lintas ketikan, dibatalkan oleh pindah blok / pilih lain /
     hapus warna);
   • pilih "Bawaan" di dalam teks bersorotan → karakter berikutnya
     dipecah keluar dari span sorotan, tanpa membuat span baru.

   Warna teks dan sorotan berdiri sendiri-sendiri; keduanya boleh aktif
   bersamaan (span bersarang: wsr di luar, wrn di dalam). */

import { docEl, sel, curBlock } from './caret.js?v=20260909082613';
import { refresh } from './cleanup.js?v=20260909082613';
import { normalizeWarna } from './warna.js?v=20260909082613';

/* Elemen sorotan yang membungkus sebuah node. */
export function sorotAround(node) {
  const d = docEl();
  let n = node;
  if (n && n.nodeType === 3) n = n.parentNode;
  while (n && n !== d) {
    if (n.matches && n.matches('span.wsr')) return n;
    n = n.parentNode;
  }
  return null;
}

/* Sorotan yang sedang berlaku di posisi kursor ('' = tidak ada). */
export function sorotSekarang() {
  const d = docEl();
  if (!d) return '';
  /* niat pengguna mengalahkan isi DOM */
  if (_lekat) return _lekat;
  const s = sel();
  if (!(s && s.rangeCount && d.contains(s.getRangeAt(0).startContainer))) return '';
  const el = sorotAround(s.getRangeAt(0).startContainer);
  return el ? (el.getAttribute('data-sorotan') || '') : '';
}

/* Lepas bungkus sorotan di dalam sebuah fragmen (ganti dengan isinya). */
function lepasSorotDalam(frag) {
  if (!frag.querySelectorAll) return;
  Array.from(frag.querySelectorAll('span.wsr')).forEach(e => {
    while (e.firstChild) e.parentNode.insertBefore(e.firstChild, e);
    e.remove();
  });
}

/* ── niat sorotan yang menunggu ── */
const HAPUS = '\u0000hapus';     /* penanda "kembali ke tanpa sorotan" */
let _pending = null;             /* sorotan yang menunggu dipakai */
let _lekat = null;               /* sorotan yang melekat lintas ketikan */
let _modeBawaan = false;         /* hapus-sorotan melekat sampai batal */
export const sorotPending = () => (_pending === HAPUS ? '' : _pending);
export const adaPendingHapusSorot = () => _pending === HAPUS;
export const modeBawaanSorot = () => _modeBawaan;
export const sorotLekat = () => _lekat;

/* Sorotan perlu dibungkus untuk ketikan berikutnya?
   • ada sorotan yang menunggu (atau hapus yang menunggu);
   • mode Bawaan menyala dan caret ada di dalam span sorotan — dipecah
     keluar tiap karakter, karena browser menarik caret kembali masuk;
   • sorotan lekat menyala tapi caret TIDAK di dalam span sorotan yang
     cocok — termasuk saat semua teks barusan dihapus sampai span-nya ikut
     hilang: karakter berikutnya harus dibungkus lagi supaya sorotan tidak
     mati dengan sendirinya. */
export function sorotPerluBungkus() {
  if (_pending === HAPUS || _pending) return true;
  const s = sel();
  const host = (s && s.rangeCount)
    ? sorotAround(s.getRangeAt(0).startContainer) : null;
  if (_modeBawaan) return !!host;
  if (!_lekat) return false;
  return !host || host.getAttribute('data-sorotan') !== _lekat;
}

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
  el.className = 'wsr';
  el.setAttribute('data-sorotan', hex);
  el.style.background = hex;
  return el;
}

export function setSorotan(hex) {
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
       Caret di dalam span sorotan? Jangan cuma memindahkan caret keluar —
       browser menariknya kembali. Catat niatnya, lalu pecah keluar tepat
       saat huruf pertama diketik. */
    _lekat = null;
    if (sorotAround(r.startContainer)) { _pending = HAPUS; _modeBawaan = true; }
    else { _pending = null; _modeBawaan = false; }
    refresh();
    return;
  }

  /* ── Ada teks terpilih: ganti warna pada bagian itu saja ── */
  _pending = null; _lekat = null; _modeBawaan = false;
  /* Seleksi persis mengisi satu span sorotan & pilihan = hapus warna:
     buka bungkusnya dulu, kalau tidak span lama tetap tertinggal. */
  const induk = sorotAround(r.startContainer);
  if (!hex && induk && induk === sorotAround(r.endContainer) &&
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
  lepasSorotDalam(frag);          /* sorotan lama di dalam seleksi dibuang */
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

/* Pecah keluar dari span sorotan di posisi caret — berulang sampai tak ada
   span sorotan yang membungkus (span bisa bersarang). */
export function keluarDariSorotan() {
  const s = sel();
  if (!(s && s.rangeCount)) return false;
  if (!sorotAround(s.getRangeAt(0).startContainer)) return false;
  let aman = 0;
  while (sorotAround(sel().getRangeAt(0).startContainer) && aman++ < 12) {
    if (!keluarSatuLapis()) break;
  }
  return true;
}

function keluarSatuLapis() {
  const s = sel();
  if (!(s && s.rangeCount)) return false;
  const r = s.getRangeAt(0);
  const host = sorotAround(r.startContainer);
  if (!host) return false;

  /* pisahkan isi span jadi sebelum-caret dan sesudah-caret */
  const sisa = document.createRange();
  sisa.selectNodeContents(host);
  try { sisa.setStart(r.startContainer, r.startOffset); } catch (e) { return false; }
  const buntut = sisa.extractContents();

  /* Titik ketik: text node kosong SEGAR tepat sesudah host. Tidak boleh
     memakai text node yang sudah ada di sebelah kanan host — isinya milik
     teks lanjutan, dan caret di AKHIR node itu akan melompati teks
     (kasus: span sorotan yang disusul teks polos). */
  const titik = document.createTextNode('');
  host.after(titik);
  if (buntut.textContent !== '') {
    /* sisa sorotan tetap bersorotan dan tetap MENDAHULUI teks lanjutan,
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
  if (indukHost && indukHost.classList && indukHost.classList.contains('wsr') &&
      indukHost.textContent === '') indukHost.remove();
  return true;
}

/* Bungkus titik ketik berikutnya dengan sorotan yang menunggu. */
export function bungkusSorotanPending() {
  if (_pending === HAPUS) { _pending = null; keluarDariSorotan(); return null; }
  /* Mode Bawaan MELEKAT: selama masih menyala, tiap karakter yang mendarat
     di dalam span sorotan dipecah keluar (tanpa membuat span baru). */
  if (_modeBawaan && !_pending) { keluarDariSorotan(); return null; }
  /* Sorotan lekat dipakai ulang saat caret sedang di luar span yang cocok —
     persis kasus "teks dihapus habis, warnanya jangan ikut hilang". */
  const hex = _pending || (!_modeBawaan ? _lekat : '');
  if (!hex) return null;
  _pending = null;
  const s = sel();
  if (!(s && s.rangeCount)) return null;
  let r = s.getRangeAt(0);

  /* Kursor di dalam span sorotan LAIN: keluar dulu, jangan bersarang. */
  const host = sorotAround(r.startContainer);
  if (host && host.getAttribute('data-sorotan') !== hex) {
    keluarDariSorotan();
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

/* Sorotan lekat tapi caret berada di span sorotan LAIN → keluar lalu
   bungkus ulang dengan warna yang benar. Dipanggil tiap karakter,
   karena browser kerap menarik caret kembali ke span lama. */
export function reBungkusSorotanLekat() {
  if (!_lekat) return;
  keluarDariSorotan();
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

export function sorotPerluKeluar() {
  if (!_lekat) return false;
  const s = sel();
  if (!(s && s.rangeCount)) return false;
  const host = sorotAround(s.getRangeAt(0).startContainer);
  return !!(host && host.getAttribute('data-sorotan') !== _lekat);
}

/* Pindah blok membatalkan sorotan yang menunggu — sama seperti font. */
let blokTerakhir = null;
document.addEventListener('selectionchange', () => {
  const b = curBlock();
  if (blokTerakhir && b !== blokTerakhir) { _pending = null; _lekat = null; _modeBawaan = false; }
  blokTerakhir = b;
});
