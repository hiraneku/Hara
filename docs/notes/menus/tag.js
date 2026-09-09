/* Menu "#" — daftar tag sungguhan (agregat dari isi catatan). */
import { semuaTag } from '../tags.js?v=20260909122014';
import { esc } from '../../core/dom.js?v=20260909122014';
import { tandaTag, WARNA_TAG } from '../label.js?v=20260909122014';
import { t as tr } from '../../core/i18n.js?v=20260909122014';

export const tagMenu = () => {
  const sem = semuaTag();
  if (!sem.length)
    return `<div class="pop-h">${tr('Tag')}</div>
      <p class="prop-pop-hint">${tr('Belum ada tag. Pilih dari bar mekanik saat menulis # di catatan — isi dulu catatannya.')}</p>`;
  return `<div class="pop-h">${tr('Tag')}</div>` +
    sem.slice(0, 12).map(t =>
      `<button class="pop-i" data-ins="#${esc(t.nama)}">
        <span class="tag-dot" data-tt="${tandaTag(t.nama)}" style="--lc:${WARNA_TAG[tandaTag(t.nama)]}"></span>
        ${esc(t.nama)}<span class="k">${t.jumlah}</span></button>`
    ).join('') +
    (sem.length > 12 ? `<p class="prop-pop-hint">…${tr('dan {n} tag lain (bisa dicari di halaman Tag)', { n: sem.length - 12 })}.</p>` : '');
};
