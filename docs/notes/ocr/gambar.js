/* OCR untuk gambar di catatan (Bagian B6, Tahap 2).

   Dipicu dari chip "Baca teks" di bilah gambar (tata-gambar.js). Teks yang terbaca
   disimpan sebagai atribut data-ocr pada figur gambar, lalu dibawa ke meta.ocr blok
   lewat elToBlock. plainText() ikut memakainya, jadi pencarian catatan menemukan
   kata dari gambar. Gambar tidak diubah. */

import { kenali, kanvasOcr } from './mesin.js?v=20261030110000';
import { teksDariItem } from './ocr-teks.js?v=20261030110000';
import { snap } from '../editor/history.js?v=20261030110000';
import { refresh } from '../editor/cleanup.js?v=20261030110000';
import { toast } from '../../core/toast.js?v=20261030110000';
import { t as tr } from '../../core/i18n.js?v=20261030110000';

/* Tunggu gambar selesai dimuat (object URL dari blob catatan). */
function tungguGambar(img) {
  if (img.complete && img.naturalWidth) return Promise.resolve(true);
  return new Promise(res => {
    img.onload = () => res(true);
    img.onerror = () => res(false);
  });
}

export async function bacaTeksGambar(fig) {
  if (!fig || !fig.isConnected) return;
  const img = fig.querySelector('img[data-blob]');
  if (!img) return;
  toast(tr('Membaca teks gambar…'));
  let items;
  try {
    const siap = await tungguGambar(img);
    if (!siap) throw new Error('gambar tidak bisa dimuat');
    const kanvas = kanvasOcr(img, img.naturalWidth, img.naturalHeight);
    items = await kenali(kanvas);
    kanvas.width = 0;
    kanvas.height = 0;
  } catch {
    toast(tr('OCR gagal. Coba lagi.'));
    return;
  }
  const teks = teksDariItem(items);
  if (!teks) {
    toast(tr('Tidak ada teks yang terbaca di gambar ini'));
    return;
  }
  if (!fig.isConnected) return;
  snap();
  fig.setAttribute('data-ocr', teks);
  refresh();
  toast(tr('Teks gambar disimpan dan bisa dicari'));
}
