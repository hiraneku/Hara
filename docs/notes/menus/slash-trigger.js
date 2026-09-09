/* Pemicu menu "/" saat mengetik.

   Alur:
     ketik "/" di blok kosong/awal kata  → menu terbuka
     ketik lanjutan                       → menu tersaring
     Enter / klik                         → blok dipilih, "/xxx" DIHAPUS
     Escape / spasi / pindah blok         → menu tertutup, "/" dibiarkan

   Menu dipasang sebagai popup yang sudah ada, jadi tidak ada UI baru. */

import { docEl, sel, curBlock } from '../editor/caret.js?v=20260909082613';
import { slashMenu } from './slash.js?v=20260909082613';
import { openPop, closeAll, pop, setPopIsi } from './pop.js?v=20260909082613';

/* Posisi "/" yang sedang aktif: { node, offset } */
let jangkar = null;

export const slashAktif = () => !!jangkar;

/* Teks yang diketik setelah "/" pada node yang sama. */
function kunciSekarang() {
  if (!jangkar) return null;
  const { node, offset } = jangkar;
  if (!node.isConnected || node.nodeType !== 3) return null;
  const s = sel();
  if (!(s && s.rangeCount)) return null;
  const r = s.getRangeAt(0);
  if (r.startContainer !== node) return null;
  if (r.startOffset < offset) return null;          /* caret mundur melewati "/" */
  return node.data.slice(offset, r.startOffset);
}

export function tutupSlash() {
  jangkar = null;
  closeAll();
}

/* Buka menu. Dipanggil tepat setelah karakter "/" masuk ke DOM. */
export function bukaSlash(node, offsetSetelahGaring) {
  const d = docEl();
  if (!d) return;
  jangkar = { node, offset: offsetSetelahGaring };
  const b = curBlock() || d;
  openPop(slashMenu(''), b);
}

/* Perbarui daftar saat pengguna mengetik lanjutan. */
export function perbaruiSlash() {
  if (!jangkar) return;
  const q = kunciSekarang();
  if (q === null || /\s/.test(q) || q.length > 20) { tutupSlash(); return; }
  const p = pop();
  if (!p) return;
  setPopIsi(slashMenu(q));
}

/* Buang "/" beserta kata kunci sebelum blok diterapkan. */
export function buangGaring() {
  if (!jangkar) return;
  const { node, offset } = jangkar;
  const s = sel();
  const akhir = (s && s.rangeCount && s.getRangeAt(0).startContainer === node)
    ? s.getRangeAt(0).startOffset : offset;
  if (node.isConnected && node.nodeType === 3) {
    const mulai = Math.max(0, offset - 1);          /* ikut buang "/" */
    try {
      node.deleteData(mulai, Math.max(0, akhir - mulai));
      const r = document.createRange();
      r.setStart(node, mulai);
      r.collapse(true);
      s.removeAllRanges();
      s.addRange(r);
    } catch (e) { /* node berubah — abaikan, blok tetap diterapkan */ }
  }
  jangkar = null;
}

/* ── navigasi papan ketik di dalam menu ── */
export function pilihanSlash() {
  const p = pop();
  return p ? p.querySelector('.pop-i.sel') : null;
}

export function geserPilihan(arah) {
  const p = pop();
  if (!p) return false;
  const item = [...p.querySelectorAll('.pop-i')];
  if (!item.length) return false;
  let i = item.findIndex(x => x.classList.contains('sel'));
  if (i < 0) i = 0;
  item[i].classList.remove('sel');
  i = (i + arah + item.length) % item.length;
  item[i].classList.add('sel');
  if (item[i].scrollIntoView) item[i].scrollIntoView({ block: 'nearest' });
  return true;
}

/* Apakah karakter "/" di posisi ini layak memicu menu?
   Hanya di awal blok atau setelah spasi — supaya "and/or" tidak memicu.
   Di dalam blok kode "/" adalah teks biasa (path, URL), menu tidak dibuka. */
export function garingLayak(node, offsetGaring) {
  if (!node || node.nodeType !== 3) return true;
  const b = curBlock();
  if (b && b.classList.contains('b-code')) return false;
  if (offsetGaring === 0) {
    /* awal node teks: layak kalau ia juga awal blok */
    return !b || !b.textContent || b.textContent.trim() === '/';
  }
  const sblm = node.data[offsetGaring - 1];
  return sblm === undefined || /\s/.test(sblm);
}
