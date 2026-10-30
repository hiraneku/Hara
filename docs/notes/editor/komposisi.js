/* Bungkus teks hasil KOMPOSISI IME (keyboard Android/iOS).

   Saat IME mengompasisi, editor sengaja tidak menyentuh DOM (lihat events.js).
   Akibatnya format yang menunggu (tebal/miring/…, warna, sorotan) tidak
   pernah dipasang pada huruf yang diketik lewat keyboard HP. Setelah
   compositionend, teks hasil komposisi harus dibungkus SEMUANYA, bukan
   cuma karakter terakhir.

   Posisi teks komposisi dicatat saat compositionstart (blok + posisi kursor
   dalam blok). Pembungkusan memakai catatan itu, BUKAN posisi kursor saat
   compositionend. Di HP, kursor setelah komposisi bisa sudah pindah ke
   ed-doc atau blok lain; dulu itu membuat huruf pertama tertinggal tanpa
   warna (keluhan: warna hilang saat spasi ditekan).

   Modul ini sengaja tidak mengimpor cleanup.js/marks.js supaya tidak
   menambah siklus impor (warna.js, sorotan.js, marks.js saling memakainya). */
import { sel, curBlock } from './caret.js?v=20261030100000';

/* Panjang teks sebuah blok, tanpa karakter nol-lebar. Dipakai untuk
   menghitung berapa karakter yang BENAR-BENAR masuk selama komposisi. */
export function panjangTeks(blok) {
  return (blok.textContent || '').replace(/\u200b/g, '').length;
}

/* Posisi kursor di dalam blok sebagai jumlah karakter (tanpa zwsp) sebelum
   caret. Kalau caret tidak ada di blok itu, dianggap di ujung blok. */
export function posisiKaret(blok) {
  if (!blok) return 0;
  const s = sel();
  if (!(s && s.rangeCount)) return panjangTeks(blok);
  const r = s.getRangeAt(0);
  if (!blok.contains(r.startContainer)) return panjangTeks(blok);
  const pra = document.createRange();
  pra.selectNodeContents(blok);
  pra.setEnd(r.startContainer, r.startOffset);
  return pra.toString().replace(/\u200b/g, '').length;
}

/* Rentang karakter [mulai, mulai+n) di dalam blok, dihitung dari awal blok
   (tanpa zwsp). Tidak bergantung pada posisi kursor saat ini. */
export function rentangPosisi(blok, mulai, n) {
  if (!blok || !(n > 0) || !(mulai >= 0)) return null;
  const akhir = mulai + n;
  const jalan = document.createTreeWalker(blok, NodeFilter.SHOW_TEXT);
  let idx = 0, awal = null, ujung = null, terakhir = null, nd;
  while ((nd = jalan.nextNode())) {
    terakhir = nd;
    const d = nd.data;
    for (let j = 0; j < d.length; j++) {
      if (d[j] === '\u200b') continue;
      if (idx === mulai && !awal) awal = [nd, j];
      if (idx === akhir && !ujung) ujung = [nd, j];
      idx++;
    }
  }
  if (!ujung && idx === akhir && terakhir) ujung = [terakhir, terakhir.data.length];
  if (!awal || !ujung) return null;
  const rr = document.createRange();
  rr.setStart(awal[0], awal[1]);
  rr.setEnd(ujung[0], ujung[1]);
  return rr;
}

/* Rentang yang berisi n karakter TERAKHIR sebelum caret, di dalam blok yang
   sama. Bisa melintasi beberapa text node. null kalau tidak ada.

   Caret boleh berupa TEKS maupun ELEMEN. Setelah komposisi di HP, browser
   sering menaruh caret di level elemen (blok itu sendiri, offset n). */
export function rentangTerakhir(n) {
  const s = sel();
  if (!(s && s.rangeCount) || !(n > 0)) return null;
  const r = s.getRangeAt(0);
  if (!r.collapsed) return null;
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
    if (!pra.intersectsNode(nd)) break;          // sudah melewati caret
    const len = nd === r.startContainer ? r.startOffset : nd.data.length;
    if (sisa < len) {
      const rr = document.createRange();
      rr.setStart(nd, sisa);
      rr.setEnd(r.startContainer, r.startOffset);
      return rr;
    }
    sisa -= len;
  }
  return null;
}

/* Bungkus isi rentang `rr` dengan node hasil `bungkus(frag)`. Caret ditaruh
   di ujung dalam node itu, supaya ketikan berikutnya melanjutkan format. */
export function bungkusRentang(rr, bungkus) {
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

/* Bungkus n karakter terakhir sebelum caret (cadangan bila posisi komposisi
   tidak tercatat). */
export function bungkusTerakhir(n, bungkus) {
  const rr = rentangTerakhir(n);
  if (!rr) return false;
  return bungkusRentang(rr, bungkus);
}

/* Bungkus teks komposisi berdasarkan `awal` = { blok, pos } yang dicatat saat
   compositionstart. Jalur utama. Kalau `awal` tidak ada, pakai cadangan
   berbasis kursor. */
export function bungkusKomposisi(awal, n, bungkus) {
  if (!awal) return bungkusTerakhir(n, bungkus);
  const rr = rentangPosisi(awal.blok, awal.pos, n);
  if (!rr) return false;
  return bungkusRentang(rr, bungkus);
}
