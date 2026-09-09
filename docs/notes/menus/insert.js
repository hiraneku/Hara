/* Sisipkan elemen inline (tag / wikilink) di posisi kursor. */
import { ensureCaret, sel } from '../editor/caret.js?v=20260909032733';
import { refresh } from '../editor/cleanup.js?v=20260909032733';

export function insertInline(cls,text){
  const r=ensureCaret(); if(!r) return;
  const el=document.createElement('span'); el.className=cls; el.textContent=text;
  r.deleteContents(); r.insertNode(el);
  /* pijakan text node KOSONG, bukan \u00a0 — spasi tak putus ikut
     tersimpan ke isi catatan dan akan ikut ke ekspor nanti */
  const sp=document.createTextNode(''); el.after(sp);
  const nr=document.createRange(); nr.setStart(sp,0); nr.collapse(true);
  sel().removeAllRanges(); sel().addRange(nr);
  refresh();
}
