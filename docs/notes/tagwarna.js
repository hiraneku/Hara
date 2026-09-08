/* Panel Tag (Bagian B10): pilih warna label per tag di dalam catatan.

   Warna manual disimpan di `n.warna` (objek nama-tag → kunci palet) —
   BUKAN di isi catatan, sehingga teks #tag tetap bersih. Tanpa
   pilihan manual, warna datang dari hash nama tag (label.js). */

import { state } from '../core/store.js?v=20260908230043';
import { esc } from '../core/dom.js?v=20260908230043';
import { toast } from '../core/toast.js?v=20260908230043';
import { WARNA_TAG, tandaUntukCatatan, TANDA_TAG } from './label.js?v=20260908230043';
import { openPop, closeAll } from './menus/pop.js?v=20260908230043';
import { cur } from '../core/router.js?v=20260908230043';
import { saveCatatanBuka } from './editor/cleanup.js?v=20260908230043';

const catatanBuka = () => state.notes.find(x => x.id === state.openId);

/* Tag yang sedang dipilih di panel (langkah 1) — dipakai langkah 2. */
let tagAktif = '';

/* Tetapkan warna manual untuk satu tag; hapus kunci bila 'tanpa'. */
export function aturWarnaTag(n, nama, kunci) {
  if (!n) return;
  if (!n.warna || typeof n.warna !== 'object') n.warna = {};
  if (kunci && WARNA_TAG[kunci]) n.warna[nama] = kunci;
  else delete n.warna[nama];
  return n;
}

/* Daftar tag unik dari satu catatan (cache n.tags), dengan tandanya. */
export function tagCatatan(n) {
  return (n && Array.isArray(n.tags) ? n.tags : [])
    .map(nama => ({ nama, tanda: tandaUntukCatatan(n, nama) }));
}

/* Satu tombol swatch warna (dipakai palet langkah 2). */
const swatch = (k, hex) =>
  `<button type="button" class="tl-s" data-tl-k="${k}" style="--sw:${hex}"
     aria-label="Warna ${k}" title="Warna ${k}"></button>`;

/* Popup langkah 1: pilih tag yang ingin diwarnai. */
export function panelTag(anchor) {
  const n = catatanBuka();
  if (!n) return;
  const daftar = tagCatatan(n);
  if (!daftar.length) {
    toast('Catatan belum punya tag — ketik #nama di isi');
    return;
  }
  tagAktif = '';
  openPop(`<div class="pop-h">Warna tag catatan</div>
    <p class="pop-note">Ketuk tag untuk memilih warnanya.</p>
    ${daftar.map(t =>
      `<button type="button" class="pop-i" data-tag-w="1" data-tgw="${esc(t.nama)}">
        <span class="tag-dot" data-tt="${t.tanda}" style="--lc:${WARNA_TAG[t.tanda]}"></span>
        #${esc(t.nama)}</button>`).join('')}`, anchor);
}

/* Popup langkah 2: palet warna untuk satu tag. */
export function paletTagWarna(n, nama) {
  const tandaKini = tandaUntukCatatan(n, nama);
  return `<div class="pop-h">Warna tag · #${esc(nama)}</div>
    <p class="pop-note">#${esc(nama)} kini berwarna ${tandaKini}. Ketuk untuk mengganti.</p>
    <div class="tl-pil">${TANDA_TAG.map(([k, h]) => swatch(k, h)).join('')}
      <button type="button" class="tl-kosong" data-tl-hapus>Tanpa warna</button>
    </div>`;
}

export function bindTagWarna() {
  document.addEventListener('click', e => {
    /* langkah 1: pilih tag → tampilkan palet untuk tag itu */
    const pil = e.target.closest('[data-tag-w]');
    if (pil) {
      const n = catatanBuka();
      if (!n) return;
      tagAktif = pil.dataset.tgw || '';
      if (!tagAktif) return;
      openPop(paletTagWarna(n, tagAktif), pil);
      return;
    }
    if (!tagAktif) return;   /* langkah 2 hanya berlaku setelah pilih tag */
    const nama = tagAktif;
    const n = catatanBuka();
    if (!n) return;
    /* pilih swatch → simpan & tutup */
    const sw = e.target.closest('[data-tl-k]');
    if (sw) {
      aturWarnaTag(n, nama, sw.dataset.tlK);
      saveCatatanBuka();
      closeAll();
      go(cur);   /* segarkan panel / editor agar warna terlihat */
      toast(`Tag #${nama} diwarnai`);
      return;
    }
    /* tanpa warna → hapus pilihan manual */
    const hap = e.target.closest('[data-tl-hapus]');
    if (hap) {
      aturWarnaTag(n, nama, null);
      saveCatatanBuka();
      closeAll();
      go(cur);
      toast(`Warna tag #${nama} dilepas`);
    }
  });
}
