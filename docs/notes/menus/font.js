/* Menu pilih jenis huruf. Tiap baris ditulis memakai fontnya sendiri,
   jadi kamu langsung melihat bentuknya sebelum memilih. */
import { FONTS, fontSekarang, fontTersedia, namaUtama, fontPending } from '../editor/font.js?v=20260906152703';
import { esc } from '../../core/dom.js?v=20260906152703';

export function fontMenu() {
  const menunggu = fontPending();
  const kini = menunggu !== null ? menunggu : fontSekarang();
  return `<div class="pop-h">Jenis huruf</div>
    <p class="pop-note">Berlaku untuk teks yang diketik setelah ini. Blok teks dulu untuk mengubah tulisan yang sudah ada.</p>` +
    FONTS.map(f => {
      const ada = !f.stack || fontTersedia(namaUtama(f.stack));
      return `<div class="pop-baris">
      <button class="pop-i pop-font${f.id === kini ? ' on' : ''}${ada ? '' : ' hilang'}" data-font="${f.id}"
        ${f.stack ? `style="font-family:${f.stack}"` : ''}>
        <span class="fn-n">${esc(f.nama)}</span>
        <span class="fn-k">${ada ? esc(f.ket) : 'Tidak ada di perangkat ini'}</span>
      </button>
    </div>`;}).join('');
}
