/* Menu jenis callout. */
import { CALLOUTS } from '../editor/blocks.js?v=20260907005847';

export const calloutMenu = () =>
  `<div class="pop-h">Jenis callout</div>` +
  Object.entries(CALLOUTS).map(([k, v]) =>
    `<button class="pop-i" data-cal="${k}"><svg class="ico c-${k}"><use href="#${v.ikon}"/></svg>${v.label}</button>`
  ).join('');
