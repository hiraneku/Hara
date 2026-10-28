/* Lompat ke catatan dan blok (B3).

   Dipakai oleh panel bawah editor, daftar blok, dan tautan [[Judul#Bagian]] /
   [[Judul#^ref]]. Dipindahkan dari index.js supaya modul editor juga bisa
   memakainya tanpa mengimpor index.js. */

import { openNote } from './model.js?v=20261029100000';
import { docEl } from './editor/caret.js?v=20261029100000';
import { toast } from '../core/toast.js?v=20261029100000';
import { t as tr } from '../core/i18n.js?v=20261029100000';
import { cariBagian } from './wikilink.js?v=20261029100000';
import { ambilBlob } from '../core/blobs.js?v=20261029100000';
import { bukaPenampilPdf } from './pdf/penampil.js?v=20261029100000';

/* Buka catatan, lalu gulir ke blok `bid` dan sorot sebentar. Tanpa `bid`, hanya membuka. */
export function lompatKe(noteId, bid) {
  if (!noteId) return;
  openNote(noteId);
  if (!bid) return;
  setTimeout(() => {
    const d = docEl();
    if (!d) return;
    const el = d.querySelector(`[data-bid="${bid}"]`);
    if (!el) return;
    try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { /* tua */ }
    el.classList.add('blk-lompat');
    setTimeout(() => el.classList.remove('blk-lompat'), 1900);
  }, 90);
}

/* Buka sasaran tautan: catatan `note` dan, bila `bagian` diisi, heading/blok di dalamnya.
   Bagian yang tidak ketemu membuka catatan dari awal dan memberi tahu pengguna. */
export function bukaSasaranTautan(note, bagian) {
  if (!note) return;
  if (!bagian) { openNote(note.id); return; }
  const bid = cariBagian(note, bagian);
  if (!bid) {
    openNote(note.id);
    toast(tr('Bagian tidak ditemukan. Catatan dibuka dari awal.'));
    return;
  }
  lompatKe(note.id, bid);
}

/* B3b: buka lampiran PDF pada halaman `halaman` (dari [[Nama.pdf#hal=N]]).
   `p` dari sasaranPdfSpan(). Tanpa berkas: beri tahu pengguna, jangan membuat catatan. */
export async function bukaPdfSasaran(p) {
  if (!p || !p.berkas) { toast(tr('Berkas PDF tidak ditemukan. Lampirkan dulu di catatan.')); return; }
  const blob = await ambilBlob(p.berkas.blobId);
  if (!blob) { toast(tr('Berkas PDF tidak ditemukan. Lampirkan dulu di catatan.')); return; }
  const data = await blob.arrayBuffer();
  await bukaPenampilPdf(data, p.berkas.name, { blobId: p.berkas.blobId, halaman: p.halaman });
}
