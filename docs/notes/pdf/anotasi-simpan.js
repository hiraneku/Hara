/* Penyimpanan anotasi PDF di IndexedDB (lewat core/blobs.js).

   Anotasi ditulis sebagai blob JSON dengan kunci `anot-<blobId>`. Blob PDF
   asli dengan id `blobId` TIDAK disentuh. Pembersih blob yatim
   (notes/editor/image.js) sudah diberi tahu supaya tidak menghapus kunci ini
   selama blob PDF-nya masih dipakai. */

import { ambilBlob, simpanBlob } from '../../core/blobs.js?v=20261028100000';
import { bacaAnotasi, tulisAnotasi, kunciAnotasi } from './anotasi.js?v=20261028100000';

export async function muatAnotasi(blobId) {
  if (!blobId) return [];
  const blob = await ambilBlob(kunciAnotasi(blobId));
  if (!blob || typeof blob.text !== 'function') return [];
  return bacaAnotasi(await blob.text());
}

export async function simpanAnotasi(blobId, daftar) {
  if (!blobId) throw new Error('blobId anotasi kosong');
  await simpanBlob(kunciAnotasi(blobId), new Blob([tulisAnotasi(daftar)], { type: 'application/json' }));
}
