/* Menu jenis callout. */
import { CALLOUTS } from '../editor/blocks.js?v=20260909054021';
import { t as tr } from '../../core/i18n.js?v=20260909054021';

export const calloutMenu = () =>
  `<div class="pop-h">${tr('Jenis callout')}</div>` +
  Object.entries(CALLOUTS).map(([k, v]) =>
    `<button class="pop-i" data-cal="${k}"><svg class="ico c-${k}"><use href="#${v.ikon}"/></svg>${tr(v.label)}</button>`
  ).join('');
