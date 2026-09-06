/* Gambar bar dari config + pasang penangan klik. */
import { BAR } from './config.js';
import { ACTIONS, TANPA_SNAP } from './actions.js';
import { docEl, ensureCaret } from '../editor/caret.js';
import { openPop } from '../menus/pop.js';
import { slashMenu } from '../menus/slash.js';
import { wlMenu }    from '../menus/wikilink.js';
import { tagMenu }   from '../menus/tag.js';
import { linkMenu }  from '../menus/link.js';
import { snap } from '../editor/history.js';

export function renderBar() {
  const box = document.querySelector('.mech-in');
  if (!box) return;
  box.innerHTML = BAR.map(b => b.sep
    ? '<div class="mb-sep"></div>'
    : `<button class="mb${b.accent ? ' acc' : ''}" data-m="${b.m}" title="${b.title || ''}">${b.label}</button>`
  ).join('');
  bindBar();
}

function bindBar() {
  document.querySelectorAll('.mb').forEach(btn => {
    /* jangan biarkan tombol merebut fokus -> keyboard tak terbuka & caret aman */
    btn.addEventListener('mousedown', e => e.preventDefault());
    btn.addEventListener('click', () => {
      const m = btn.dataset.m;
      const d = docEl();
      if (!d) return;
      focusKeep();
      ensureCaret();
      if (m === 'slash') return openPop(slashMenu(), btn);
      if (m === 'wl')    return openPop(wlMenu(),    btn);
      if (m === 'tag')   return openPop(tagMenu(),   btn);
      if (m === 'link')  return openPop(linkMenu(),  btn);
      const fn = ACTIONS[m];
      if (!fn) return;
      /* tiap aksi tombol = satu langkah undo yang utuh */
      if (!TANPA_SNAP.has(m)) snap();
      fn();
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
