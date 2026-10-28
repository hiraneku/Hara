/* Penyimpanan hasil OCR PDF (B6) di IndexedDB lewat core/blobs.js.

   Hasil ditulis sebagai blob JSON dengan kunci `ocr-<blobId>`. Blob PDF asli dengan id
   `blobId` TIDAK disentuh. Pembersih blob yatim dan cadangan sudah tahu kunci ini. */

import { ambilBlob, simpanBlob } from '../../core/blobs.js?v=20261028085413';
import { bacaOcrPdf, tulisOcrPdf, kunciOcr } from './ocr-teks.js?v=20261028085413';

export async function muatOcrPdf(blobId) {
  if (!blobId) return {};
  const blob = await ambilBlob(kunciOcr(blobId));
  if (!blob || typeof blob.text !== 'function') return {};
  return bacaOcrPdf(await blob.text());
}

export async function simpanOcrPdf(blobId, hal) {
  if (!blobId) throw new Error('blobId OCR kosong');
  await simpanBlob(kunciOcr(blobId), new Blob([tulisOcrPdf(hal)], { type: 'application/json' }));
}
