/* Popup melayang di atas bar. */
import { docEl, ensureCaret } from '../editor/caret.js';
import { setBlock, insertHr } from '../editor/blocks.js';
import { insertInline } from './insert.js';
import { focusKeep } from '../bar/render.js';
import { applyLink } from './link.js';

export const pop = () => document.getElementById('pop');

/* seleksi terakhir sebelum popup dibuka — dipakai form tautan */
export let simpanRange = null;

export function openPop(html, anchor) {
  const p = pop();
  if (!p) return;
  const s = window.getSelection();
  const d = document.querySelector('.ed-doc');
  simpanRange = (s && s.rangeCount && d && d.contains(s.getRangeAt(0).startContainer))
    ? s.getRangeAt(0).cloneRange() : null;
  p.innerHTML = html;
  p.classList.add('on');
  const r = anchor.getBoundingClientRect();
  p.style.left = Math.max(12, Math.min(r.left, window.innerWidth - 302)) + 'px';
  p.style.top  = Math.max(12, r.top - p.offsetHeight - 10) + 'px';
}

export function bindPop() {
  const p = pop();
  if (!p) return;
  p.addEventListener('mousedown', e => { if (!e.target.closest('.pop-in')) e.preventDefault(); });
  /* form tautan: jangan tutup popup saat mengetik di kolom */
  p.addEventListener('mousedown', e => {
    if (e.target.closest('.pop-in')) e.stopPropagation();
  }, true);

  p.addEventListener('click', e => {
    const lk = e.target.closest('[data-lk]');
    if (lk) { applyLink(lk.dataset.lk, simpanRange); closeAll(); return; }

    const t = e.target.closest('[data-blk],[data-ins],[data-wl]');
    if (!t) return;
    focusKeep();
    ensureCaret();
    if (t.dataset.blk === 'hr') insertHr();
    else if (t.dataset.blk)     setBlock(t.dataset.blk);
    else if (t.dataset.ins)     insertInline('tg', t.dataset.ins);
    else if (t.dataset.wl)      insertInline('wl', '[[' + t.dataset.wl + ']]');
    closeAll();
  });
}

export function closeAll() {
  pop()?.classList.remove('on');
  document.getElementById('sheet')?.classList.remove('on');
  document.getElementById('scrim')?.classList.remove('on');
}
