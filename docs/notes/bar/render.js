/* Gambar bar dari config + pasang penangan klik. */
import { BAR, GROUPS } from './config.js';
import { ACTIONS, TANPA_SNAP } from './actions.js';
import { docEl, ensureCaret, curBlock } from '../editor/caret.js';
import { openPop, closeAll } from '../menus/pop.js';
import { slashMenu } from '../menus/slash.js';
import { wlMenu }    from '../menus/wikilink.js';
import { tagMenu }   from '../menus/tag.js';
import { linkMenu }  from '../menus/link.js';
import { calloutMenu } from '../menus/callout.js';
import { snap } from '../editor/history.js';

const CHEV = '<svg class="chev"><use href="#i-chev"/></svg>';

export function renderBar() {
  const box = document.querySelector('.mech-in');
  if (!box) return;
  box.innerHTML = BAR.map(b => {
    if (b.sep) return '<div class="mb-sep"></div>';
    if (b.g) return `<button class="mb mb-g" data-g="${b.g}" title="${b.title || ''}">
        <span class="gl">${b.label}</span>${CHEV}</button>`;
    return `<button class="mb${b.accent ? ' acc' : ''}" data-m="${b.m}" title="${b.title || ''}">${b.label}</button>`;
  }).join('');
  bindBar();
}

/* Menu untuk sebuah kelompok. */
function groupMenu(g) {
  const grp = GROUPS.find(x => x.g === g);
  if (!grp) return '';
  const b = curBlock();
  const BLK = { p:'b-p', h:'b-h1', h2:'b-h2', h3:'b-h3', quote:'b-quote',
                code:'b-code', cal:'b-cal', li:'b-li', ol:'b-ol', todo:'b-todo' };
  return `<div class="pop-h">${grp.title}</div>` +
    grp.items.map(it => {
      const cls = BLK[it.m];
      const on  = cls && b && b.classList.contains(cls);
      return `<button class="pop-i${on ? ' on' : ''}" data-m="${it.m}">
        <svg class="ico"><use href="#${it.ikon}"/></svg>${it.nama}
        ${it.kunci ? `<span class="k">${it.kunci}</span>` : ''}
      </button>`;
    }).join('');
}

function jalankan(m, btn) {
  const d = docEl();
  if (!d) return;
  focusKeep();
  ensureCaret();
  if (m === 'slash') return openPop(slashMenu(), btn);
  if (m === 'wl')    return openPop(wlMenu(),    btn);
  if (m === 'tag')   return openPop(tagMenu(),   btn);
  if (m === 'link')  return openPop(linkMenu(),  btn);
  if (m === 'cal')   return openPop(calloutMenu(), btn);
  const fn = ACTIONS[m];
  if (!fn) return;
  if (!TANPA_SNAP.has(m)) snap();
  fn();
}
export { jalankan };

function bindBar() {
  document.querySelectorAll('.mb').forEach(btn => {
    /* jangan biarkan tombol merebut fokus -> keyboard tak terbuka & caret aman */
    btn.addEventListener('mousedown', e => e.preventDefault());
    btn.addEventListener('click', () => {
      if (btn.dataset.g) {
        const sudah = btn.classList.contains('open');
        document.querySelectorAll('.mb-g.open').forEach(x => x.classList.remove('open'));
        if (sudah) return closeAll();
        focusKeep();
        ensureCaret();
        btn.classList.add('open');
        return openPop(groupMenu(btn.dataset.g), btn);
      }
      jalankan(btn.dataset.m, btn);
    });
  });
}

/* Fokuskan editor TANPA kehilangan seleksi (focus() kerap meruntuhkannya). */
export function focusKeep() {
  const d = docEl();
  if (!d) return;
  const s = window.getSelection();
  let keep = null;
  if (s && s.rangeCount && d.contains(s.getRangeAt(0).startContainer))
    keep = s.getRangeAt(0).cloneRange();
  if (document.activeElement !== d) d.focus({ preventScroll: true });
  if (keep) {
    const s2 = window.getSelection();
    const live = s2.rangeCount ? s2.getRangeAt(0) : null;
    if (!live || !d.contains(live.startContainer) ||
        live.startContainer === d ||
        (live.collapsed && !keep.collapsed)) {
      s2.removeAllRanges();
      s2.addRange(keep);
    }
  }
}
