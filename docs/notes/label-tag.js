/* Terapkan warna label ke tag #… di dalam editor (B10).

   Dipanggil setiap kali editor digambar ulang: setiap span .tg diberi
   data-tt (kunci palet) + variabel --lc. Tanpa ini tag di isi hanya
   hijau aksen. */

import { state } from '../core/store.js?v=20260909074309';
import { tandaUntukCatatan } from './label.js?v=20260909074309';
import { chipTag } from './label.js?v=20260909074309';

/* Nama tag dari satu span.tg — teksnya "#nama" atau "#nama" plus spasi. */
export function namaDariSpan(span) {
  const t = (span.textContent || '').trim().replace(/^#/, '');
  return t.split(/\s/)[0] || '';
}

/* Warnai setiap span.tg di dalam `root` (biasanya .ed-doc).
   Warna memakai tanda catatan bila ada manual, selain itu hash nama. */
export function tandaiLabelTag(root, n) {
  if (!root || !root.querySelectorAll) return;
  const cat = n || state.notes.find(x => x.id === state.openId);
  const daftar = root.querySelectorAll('span.tg');
  for (const span of daftar) {
    const nama = namaDariSpan(span);
    if (!nama) continue;
    const t = tandaUntukCatatan(cat, nama);
    span.setAttribute('data-tt', t);
  }
}
