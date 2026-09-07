/* Wikilink [[Judul]] — menandai tautan mati dan membuka/membuat catatan.

   `tandaiTautan()` dijalankan setiap kali editor digambar ulang (refresh):
   span .wl yang judulnya belum punya catatan diberi kelas `dead`
   (tampil putus-putus). Klik pada tautan mati membuat catatannya; klik
   dengan tombol pengubah (Ctrl/⌘/Alt) membuka catatan yang sudah ada —
   klik biasa tetap untuk meletakkan kursor/menyunting teks. */

import { state } from '../core/store.js?v=20260907072821';

/* Judul sasaran sebuah span wikilink, tanpa [[ ]] dan tanpa alias |… */
export function judulSpan(span) {
  const teks = (span && span.textContent || '').trim();
  const m = /^\[\[(.+?)\]\]$/.exec(teks);
  if (!m) return null;
  return (m[1].split('|')[0] || '').trim() || null;
}

/* Cari catatan (belum dihapus) dengan judul persis, abaikan besar-kecil. */
export function cariJudul(judul) {
  if (!judul) return null;
  const j = judul.toLowerCase();
  return state.notes.find(n => !n.deletedAt && (n.title || '').trim().toLowerCase() === j) || null;
}

/* Tandai mati/hidup semua wikilink di dalam `root`. */
export function tandaiTautan(root) {
  if (!root) return;
  const list = root.querySelectorAll ? root.querySelectorAll('span.wl') : [];
  for (const span of list) {
    const judul = judulSpan(span);
    span.classList.toggle('dead', !(judul && cariJudul(judul)));
  }
}

/* Jumlah catatan lain yang menaut KE judul ini (untuk badge backlink). */
export function penaut(judul) {
  if (!judul) return 0;
  const j = judul.toLowerCase();
  return state.notes.filter(n => !n.deletedAt && n.id !== state.openId).reduce((jum, n) => {
    (n.blocks || []).forEach(b => {
      if (b && b.type !== 'code' && b.type !== 'divider' &&
          new RegExp(`\\[\\[\\s*${j.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\||\\s*\\]\\])`, 'i')
            .test(String(b.content || '').replace(/<[^>]*>/g, '')))
        jum++;
    });
    return jum;
  }, 0);
}
