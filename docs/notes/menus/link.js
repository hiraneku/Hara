/* Tautan ke alamat web. Berbeda dari [[wikilink]] yang menuju catatan lain. */

import { docEl, sel, ensureCaret } from '../editor/caret.js?v=20260907011202';
import { refresh } from '../editor/cleanup.js?v=20260907011202';
import { esc } from '../../core/dom.js?v=20260907011202';
import { openPop, pop, closeAll } from './pop.js?v=20260907011202';

/* Rapikan alamat: "hara.app" -> "https://hara.app" */
function rapikan(url) {
  const u = url.trim();
  if (!u) return '';
  if (/^(https?:|mailto:|tel:)/i.test(u)) return u;
  if (/^[\w.-]+@[\w.-]+\.\w+$/.test(u)) return 'mailto:' + u;
  return 'https://' + u;
}

/* Tautan yang membungkus kursor, kalau ada. */
export function linkAt(node) {
  const d = docEl();
  let n = node;
  if (n && n.nodeType === 3) n = n.parentNode;
  while (n && n !== d) {
    if (n.matches && n.matches('a.lk')) return n;
    n = n.parentNode;
  }
  return null;
}

export function linkMenu() {
  const s = sel();
  const d = docEl();
  const r = (s && s.rangeCount && d && d.contains(s.getRangeAt(0).startContainer))
    ? s.getRangeAt(0) : null;

  const ada  = r ? linkAt(r.startContainer) : null;
  const teks = ada ? ada.textContent : (r && !r.collapsed ? r.toString() : '');
  const url  = ada ? (ada.getAttribute('href') || '') : '';

  return `<div class="pop-h">${ada ? 'Ubah tautan' : 'Tautan web'}</div>
    <div class="pop-form">
      <input class="pop-in" id="lk-t" placeholder="Teks yang tampil" value="${esc(teks)}">
      <input class="pop-in" id="lk-u" placeholder="https://…" value="${esc(url)}" inputmode="url">
      <div class="pop-row">
        <button class="btn btn-pri" data-lk="ok">${ada ? 'Simpan' : 'Sisipkan'}</button>
        ${ada ? '<button class="btn btn-sec" data-lk="del">Hapus tautan</button>' : ''}
      </div>
    </div>`;
}

/* Dipanggil dari pop.js saat tombol di dalam form ditekan. */
export function applyLink(aksi, simpanRange) {
  const d = docEl();
  if (!d) return;
  const p = pop();
  const inT = p.querySelector('#lk-t');
  const inU = p.querySelector('#lk-u');

  /* pulihkan seleksi yang tersimpan sebelum popup dibuka */
  const s = sel();
  if (simpanRange) { s.removeAllRanges(); s.addRange(simpanRange); }
  ensureCaret();

  const r = s.rangeCount ? s.getRangeAt(0) : null;
  const ada = r ? linkAt(r.startContainer) : null;

  if (aksi === 'del') {
    if (ada) {
      const kids = Array.from(ada.childNodes), par = ada.parentNode;
      kids.forEach(k => par.insertBefore(k, ada));
      ada.remove();
      par.normalize();
    }
    refresh();
    return;
  }

  const url  = rapikan(inU ? inU.value : '');
  const teks = (inT && inT.value.trim()) || url;
  if (!url) return;

  if (ada) {
    ada.setAttribute('href', url);
    ada.textContent = teks;
    letakkanSetelah(ada);
  } else {
    const a = document.createElement('a');
    a.className = 'lk';
    a.setAttribute('href', url);
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener');
    a.textContent = teks;
    if (r && !r.collapsed) r.deleteContents();
    if (r) r.insertNode(a);
    letakkanSetelah(a);
  }
  refresh();
}

/* Taruh kursor tepat setelah tautan, dengan spasi pemisah. */
function letakkanSetelah(a) {
  const sp = document.createTextNode('\u00a0');
  a.after(sp);
  const nr = document.createRange();
  nr.setStart(sp, 1);
  nr.collapse(true);
  const s = sel();
  s.removeAllRanges();
  s.addRange(nr);
}
