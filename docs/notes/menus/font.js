/* Menu pilih jenis huruf. Tiap baris ditulis memakai fontnya sendiri,
   jadi kamu langsung melihat bentuknya sebelum memilih. */
import { FONTS, fontSekarang } from '../editor/font.js?v=20260906151809';
import { esc } from '../../core/dom.js?v=20260906151809';

export function fontMenu() {
  const kini = fontSekarang();
  return `<div class="pop-h">Jenis huruf</div>
    <p class="pop-note">Tanpa teks terpilih, font diterapkan ke seluruh blok. Blok teks dulu untuk mengubah sebagian saja.</p>` +
    FONTS.map(f => `<div class="pop-baris">
      <button class="pop-i pop-font${f.id === kini ? ' on' : ''}" data-font="${f.id}"
        ${f.stack ? `style="font-family:${f.stack}"` : ''}>
        <span class="fn-n">${esc(f.nama)}</span>
        <span class="fn-k">${esc(f.ket)}</span>
      </button>
    </div>`).join('');
}
