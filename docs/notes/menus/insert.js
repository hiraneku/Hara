/* Sisipkan elemen inline (tag / wikilink) di posisi kursor. */
import { ensureCaret, sel } from '../editor/caret.js?v=20260907025521';
import { refresh } from '../editor/cleanup.js?v=20260907025521';

export function insertInline(cls,text){
  const r=ensureCaret(); if(!r) return;
  const el=document.createElement('span'); el.className=cls; el.textContent=text;
  r.deleteContents(); r.insertNode(el);
  const sp=document.createTextNode('\u00a0'); el.after(sp);
  const nr=document.createRange(); nr.setStart(sp,1); nr.collapse(true);
  sel().removeAllRanges(); sel().addRange(nr);
  refresh();
}
