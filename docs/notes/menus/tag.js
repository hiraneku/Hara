/* Menu "#" — daftar tag sungguhan (agregat dari isi catatan). */
import { semuaTag } from '../tags.js?v=20260907162443';
import { esc } from '../../core/dom.js?v=20260907162443';

export const tagMenu = () => {
  const sem = semuaTag();
  if (!sem.length)
    return `<div class="pop-h">Tag</div>
      <p class="prop-pop-hint">Belum ada tag. Pilih dari bar mekanik saat menulis # di catatan — isi dulu catatannya.</p>`;
  return `<div class="pop-h">Tag</div>` +
    sem.slice(0, 12).map(t =>
      `<button class="pop-i" data-ins="#${esc(t.nama)}"><svg class="ico"><use href="#i-tag"/></svg>${esc(t.nama)}<span class="k">${t.jumlah}</span></button>`
    ).join('') +
    (sem.length > 12 ? `<p class="prop-pop-hint">…dan ${sem.length - 12} tag lain (bisa dicari di halaman Tag).</p>` : '');
};
