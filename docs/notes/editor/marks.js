/* Format inline: tebal, miring, coret, sorot, kode inline.
   `pending` = niat format yang menyala tapi belum diketik. */
import { docEl, sel, curBlock, ensureCaret } from './caret.js?v=20260907001515';
import { refresh } from './cleanup.js?v=20260907001515';

export const MARKSEL = { b:'b,strong', i:'i,em', s:'s,strike', hl:'.hl', code:'code.ic' };
export const MARKTAG = { b:'b', i:'i', s:'s', hl:'span', code:'code' };
export const MARKCLS = { hl:'hl', code:'ic' };
export const CMD     = { b:'bold', i:'italic', s:'strikeThrough' };
export const pending = new Set();

try { document.execCommand('styleWithCSS', false, false); } catch (e) {}

export function markEl(m){
  const e=document.createElement(MARKTAG[m]);
  if(MARKCLS[m]) e.className=MARKCLS[m];
  return e;
}
export function markAround(m,node){
  const d=docEl(); let n=node;
  if(n && n.nodeType===3) n=n.parentNode;
  while(n && n!==d){ if(n.matches && n.matches(MARKSEL[m])) return n; n=n.parentNode; }
  return null;
}
export function markActive(m){
  const d=docEl(); if(!d) return false;
  const s=sel(); if(!(s&&s.rangeCount&&d.contains(s.getRangeAt(0).startContainer))) return false;
  const r=s.getRangeAt(0);
  /* niat 'pending' hanya berlaku saat kursor kosong; kalau ada teks terpilih
     yang menentukan adalah isi DOM, bukan niat sebelumnya */
  if(r.collapsed && pending.has(m)) return true;
  if(markAround(m,r.startContainer)) return true;
  if(!r.collapsed){
    const f=r.cloneContents();
    if(f.querySelector && f.querySelector(MARKSEL[m])) return true;
  }
  return false;
}
export function unwrapAll(root,m){
  Array.from(root.querySelectorAll(MARKSEL[m])).forEach(e=>{
    while(e.firstChild) e.parentNode.insertBefore(e.firstChild,e);
    e.remove();
  });
}
export function toggleMark(m){
  const d=docEl(); if(!d) return;
  const r=ensureCaret(); if(!r) return;

  if(r.collapsed){                       // tak ada teks terpilih -> niat ketik
    if(pending.has(m)) pending.delete(m);
    else {
      const host=markAround(m,r.startContainer);
      if(host){                          // keluar dari format
        const sp=document.createTextNode('\u200b');
        host.after(sp);
        const nr=document.createRange(); nr.setStart(sp,1); nr.collapse(true);
        sel().removeAllRanges(); sel().addRange(nr);
      } else pending.add(m);
    }
    refresh(); return;
  }

  pending.clear();                 /* seleksi nyata mengalahkan niat lama */
  const on=markActive(m);
  const host=markAround(m,r.startContainer);
  const whole = host && host.textContent.replace(/[\u200b\u00a0]/g,'')
                        === r.toString().replace(/[\u200b\u00a0]/g,'');
  if(on && whole){                       // seluruh isi mark terpilih -> buka
    const kids=Array.from(host.childNodes), par=host.parentNode;
    kids.forEach(k=>par.insertBefore(k,host));
    host.remove(); par.normalize();
    if(kids.length){
      const nr=document.createRange();
      nr.setStartBefore(kids[0]); nr.setEndAfter(kids[kids.length-1]);
      sel().removeAllRanges(); sel().addRange(nr);
    }
  } else {
    const frag=r.extractContents();
    unwrapAll(frag,m);
    let node;
    if(on){ node=frag; }                 // lepas
    else { node=markEl(m); node.appendChild(frag); }   // pasang
    const first=node.nodeType===11?node.firstChild:node;
    const last =node.nodeType===11?node.lastChild :node;
    r.insertNode(node);
    if(first&&last){
      const nr=document.createRange();
      nr.setStartBefore(first); nr.setEndAfter(last);
      sel().removeAllRanges(); sel().addRange(nr);
    }
    const b=curBlock(); if(b) b.normalize();
  }
  refresh();
}
export function wrapTypedPending(){
  const s2=sel(); if(!(s2&&s2.rangeCount)) return;
  const r=s2.getRangeAt(0);
  const node=r.startContainer;
  if(node.nodeType!==3 || r.startOffset===0) return;
  const marks=[...pending]; pending.clear();
  const start=r.startOffset-1;
  const rr=document.createRange();
  rr.setStart(node,start); rr.setEnd(node,r.startOffset);
  const frag=rr.extractContents();
  let outer=frag;
  marks.forEach(m=>{ const e=markEl(m); e.appendChild(outer); outer=e; });
  rr.insertNode(outer);
  let deep=outer; while(deep.firstChild) deep=deep.firstChild;
  const nr=document.createRange();
  nr.setStart(deep,deep.length!==undefined?deep.length:0); nr.collapse(true);
  sel().removeAllRanges(); sel().addRange(nr);
}
export function flushPending(){
  if(!pending.size) return;
  const r=ensureCaret(); if(!r) return;
  const marks=[...pending]; pending.clear();
  let inner=document.createTextNode('\u200b'), node=inner;
  marks.forEach(m=>{ const e=markEl(m); e.appendChild(node); node=e; });
  r.insertNode(node);
  const nr=document.createRange(); nr.setStart(inner,1); nr.collapse(true);
  sel().removeAllRanges(); sel().addRange(nr);
}
