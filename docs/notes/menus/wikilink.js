/* Menu "[[" — tautkan ke catatan lain. */
import { state } from '../../core/store.js?v=20260909074309';
import { esc } from '../../core/dom.js?v=20260909074309';
import { t as tr } from '../../core/i18n.js?v=20260909074309';

export function wlMenu() {
  let h = `<div class="pop-h">${tr('Tautkan ke catatan')}</div>`;
  state.notes.forEach(n => {
    const t = n.title || tr('Tanpa judul');
    h += `<button class="pop-i" data-wl="${esc(t)}"><svg class="ico"><use href="#i-note"/></svg>${esc(t)}</button>`;
  });
  h += `<button class="pop-i pop-new" data-wl="Catatan Baru"><svg class="ico"><use href="#i-plus"/></svg>${tr('Buat catatan baru…')}</button>`;
  return h;
}
