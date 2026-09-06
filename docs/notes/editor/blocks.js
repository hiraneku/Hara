/* Jenis blok: paragraf, heading, kutipan, kode, daftar, to-do, callout. */
import { docEl, sel, curBlock, caretEnd, ensureCaret, nearestEditable } from './caret.js';
import { refresh } from './cleanup.js';

export const BLOCKCLS = ['b-p','b-h1','b-h2','b-quote','b-code','b-li','b-todo','b-cal'];

export function setBlock(cls){
  const d=docEl(); if(!d) return;
  let b=curBlock(); if(!b) return;
  b=nearestEditable(b); if(!b) return;
  if(cls!=='b-p' && b.classList.contains(cls)) cls='b-p';   // toggle balik
  const cb=b.querySelector(':scope > .cbx'); if(cb) cb.remove();
  BLOCKCLS.forEach(c=>b.classList.remove(c));
  b.classList.add(cls);
  if(cls==='b-todo'){
    const box=document.createElement('button');
    box.className='cbx'; box.contentEditable='false';
    box.innerHTML='<svg viewBox="0 0 24 24"><path d="M4 12l5 5L20 6"/></svg>';
    b.insertBefore(box,b.firstChild);
  }
  if(cls!=='b-todo') b.classList.remove('done');
  caretEnd(b);
  ensureCaret();
  refresh();
}
export function insertHr(){
  const b=curBlock(); if(!b) return;
  const hr=document.createElement('div');
  hr.className='b-div'; hr.contentEditable='false';
  b.after(hr);
  const nb=document.createElement('div'); nb.className='b-p';
  hr.after(nb); caretEnd(nb); refresh();
}
export function indent(dir){
  const b=curBlock(); if(!b) return;
  const cur=parseInt(b.style.paddingLeft)||0;
  b.style.paddingLeft=Math.max(0,cur+dir*24)+'px';
  refresh();
}
