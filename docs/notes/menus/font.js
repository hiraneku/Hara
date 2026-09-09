/* Menu pilih jenis huruf.

   Disusun per kategori supaya tidak terbaca sebagai satu daftar panjang.
   Tiap baris ditulis memakai fontnya sendiri, ditambah contoh alfabet
   kecil — jadi bentuk hurufnya terlihat sebelum dipilih. */

import { FONTS, FONT_GRUP, fontSekarang, fontTersedia, namaUtama, fontPending }
  from '../editor/font.js?v=20260909122014';
import { esc } from '../../core/dom.js?v=20260909122014';
import { t as tr } from '../../core/i18n.js?v=20260909122014';

const CONTOH = 'AaBbGg 123';

export function fontMenu() {
  const menunggu = fontPending();
  const kini = menunggu !== null ? menunggu : fontSekarang();

  let html = `<div class="pop-h">${tr('Jenis huruf')}</div>
    <p class="pop-note">${tr('Berlaku untuk teks yang diketik setelah ini. Blok teks dulu untuk mengubah tulisan yang sudah ada.')}</p>`;

  for (const [kunci, judul] of FONT_GRUP) {
    const isi = FONTS.filter(f => f.grup === kunci);
    if (!isi.length) continue;
    html += `<div class="fn-grup">${esc(tr(judul))}</div>`;
    html += isi.map(f => {
      const ada = !f.stack || fontTersedia(namaUtama(f.stack));
      const aktif = f.id === kini;
      const gaya = f.stack ? ` style="font-family:${f.stack}"` : '';
      return `<button class="pop-i pop-font${aktif ? ' on' : ''}${ada ? '' : ' hilang'}"
        data-font="${f.id}" title="${esc(tr(f.ket))}">
        <span class="fn-kiri">
          <span class="fn-n"${gaya}>${esc(tr(f.nama))}</span>
          <span class="fn-k">${ada ? esc(tr(f.ket)) : tr('Tidak tersedia di perangkat ini')}</span>
        </span>
        <span class="fn-contoh"${gaya}>${ada ? CONTOH : '—'}</span>
        <svg class="fn-cek"><use href="#i-check2"/></svg>
      </button>`;
    }).join('');
  }
  return html;
}
