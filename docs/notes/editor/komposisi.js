/* Bungkus teks hasil KOMPOSISI IME (keyboard Android/iOS).

   Saat IME mengompasisi, editor sengaja tidak menyentuh DOM (lihat events.js).
   Akibatnya format yang menunggu (tebal/miring/…, warna, sorotan) tidak
   pernah dipasang pada huruf yang diketik lewat keyboard HP. Setelah
   compositionend, teks hasil komposisi (e.data) harus dibungkus SEMUANYA,
   bukan cuma karakter terakhir.

   Modul ini sengaja tidak mengimpor cleanup.js/marks.js supaya tidak
   menambah siklus impor (warna.js, sorotan.js, marks.js saling memakainya). */
import { sel, curBlock } from './caret.js?v=20261025074430';

/* Rentang yang berisi n karakter TERAKHIR sebelum caret, di dalam blok
   yang sama. Bisa melintasi beberapa text node. null kalau tidak ada. */
export function rentangTerakhir(n) {
  const s = sel();
  if (!(s && s.rangeCount) || !(n > 0)) return null;
  const r = s.getRangeAt(0);
  if (!r.collapsed || r.startContainer.nodeType !== 3) return null;
  const blok = curBlock();
  if (!blok || !blok.contains(r.startContainer)) return null;
  const pra = document.createRange();
  pra.selectNodeContents(blok);
  pra.setEnd(r.startContainer, r.startOffset);
  const total = pra.toString().length;
  if (total < n) return null;
  let sisa = total - n;
  const jalan = document.createTreeWalker(blok, NodeFilter.SHOW_TEXT);
  let nd;
  while ((nd = jalan.nextNode())) {
    const len = nd === r.startContainer ? r.startOffset : nd.data.length;
    if (sisa < len) {
      const rr = document.createRange();
      rr.setStart(nd, sisa);
      rr.setEnd(r.startContainer, r.startOffset);
      return rr;
    }
    sisa -= len;
    if (nd === r.startContainer) break;
  }
  return null;
}

/* Bungkus n karakter terakhir sebelum caret dengan node hasil `bungkus(frag)`.
   Caret ditaruh di ujung dalam node itu, supaya ketikan berikutnya
   melanjutkan format yang sama. */
export function bungkusTerakhir(n, bungkus) {
  const rr = rentangTerakhir(n);
  if (!rr) return false;
  const frag = rr.extractContents();
  const node = bungkus(frag);
  rr.insertNode(node);
  let dalam = node;
  while (dalam.lastChild) dalam = dalam.lastChild;
  const nr = document.createRange();
  if (dalam.nodeType === 3) {
    nr.setStart(dalam, dalam.length);
  } else {
    const t = document.createTextNode('');
    node.appendChild(t);
    nr.setStart(t, 0);
  }
  nr.collapse(true);
  const s = sel();
  s.removeAllRanges();
  s.addRange(nr);
  return true;
}
