/* Popup melayang di atas bar. */
import { docEl, ensureCaret, kunciKeyboard } from '../editor/caret.js?v=20260907023932';
import { setBlock, insertHr, insertTanggal } from '../editor/blocks.js?v=20260907023932';
import { insertInline } from './insert.js?v=20260907023932';
import { focusKeep } from '../bar/render.js?v=20260907023932';
import { applyLink } from './link.js?v=20260907023932';
import { setFont } from '../editor/font.js?v=20260907023932';
import { setCallout } from '../editor/blocks.js?v=20260907023932';
import { snap as snapFont } from '../editor/history.js?v=20260907023932';
import { getar } from '../bar/prefs.js?v=20260907023932';

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

    const fo = e.target.closest('[data-font]');
    if (fo) {
      getar(); kunciKeyboard(); focusKeep(); ensureCaret();
      snapFont();
      setFont(fo.dataset.font);
      closeAll();
      return;
    }

    const cl = e.target.closest('[data-cal]');
    if (cl) { focusKeep(); ensureCaret(); setCallout(cl.dataset.cal); closeAll(); return; }

    /* tombol info -> tampilkan penjelasan */
    const inf = e.target.closest('[data-info]');
    if (inf) {
      getar();
      import('../bar/render.js?v=20260907023932').then(({ helpPanel, gantiIsiPop }) => {
        gantiIsiPop(helpPanel(inf.dataset.info), inf.dataset.info);
      });
      return;
    }
    /* kembali dari penjelasan ke daftar */
    const bk = e.target.closest('[data-helpback]');
    if (bk) {
      getar();
      import('../bar/render.js?v=20260907023932').then(({ kembaliKeMenu }) => kembaliKeMenu());
      return;
    }

    /* item dari menu kelompok */
    const gm = e.target.closest('[data-m]');
    if (gm) {
      getar();
      kunciKeyboard();
      closeAll();
      import('../bar/render.js?v=20260907023932').then(({ jalankan }) => jalankan(gm.dataset.m, gm));
      return;
    }

    const t = e.target.closest('[data-blk],[data-ins],[data-wl]');
    if (!t) return;
    focusKeep();
    ensureCaret();
    if (t.dataset.blk === 'date') insertTanggal();
    else if (t.dataset.blk === 'hr') insertHr();
    else if (t.dataset.blk)     setBlock(t.dataset.blk);
    else if (t.dataset.ins)     insertInline('tg', t.dataset.ins);
    else if (t.dataset.wl)      insertInline('wl', '[[' + t.dataset.wl + ']]');
    closeAll();
  });
}

export function closeAll() {
  document.querySelectorAll('.mb-g.open').forEach(x => x.classList.remove('open'));
  pop()?.classList.remove('on');
  document.getElementById('sheet')?.classList.remove('on');
  document.getElementById('scrim')?.classList.remove('on');
}
