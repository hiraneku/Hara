/* Penyimpanan susunan halaman PDF (B2) di IndexedDB lewat core/blobs.js.

   Susunan ditulis sebagai blob JSON dengan kunci `susun-<blobId>`. Blob PDF asli
   dengan id `blobId` TIDAK disentuh. Pembersih blob yatim (notes/editor/image.js)
   sudah diberi tahu supaya tidak menghapus kunci ini selama blob PDF-nya masih dipakai. */

import { ambilBlob, simpanBlob } from '../../core/blobs.js?v=20261028093000';
import { bacaSusunan, tulisSusunan, kunciSusunan } from './susunan.js?v=20261028093000';

export async function muatSusunan(blobId, total) {
  if (!blobId) return bacaSusunan('', total);
  const blob = await ambilBlob(kunciSusunan(blobId));
  if (!blob || typeof blob.text !== 'function') return bacaSusunan('', total);
  return bacaSusunan(await blob.text(), total);
}

export async function simpanSusunan(blobId, daftar) {
  if (!blobId) throw new Error('blobId susunan kosong');
  await simpanBlob(kunciSusunan(blobId), new Blob([tulisSusunan(daftar)], { type: 'application/json' }));
}
