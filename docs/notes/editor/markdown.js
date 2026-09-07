/* Markdown otomatis saat mengetik: **tebal**, # judul, - daftar, dst.
   Memakai offset absolut supaya pola tetap cocok walau teks terpecah node. */
import { docEl, sel, curBlock } from './caret.js?v=20260907100318';
import { setBlock, setCallout } from './blocks.js?v=20260907100318';
import { MARKTAG, MARKCLS } from './marks.js?v=20260907100318';
import { updateCount } from './cleanup.js?v=20260907100318';

export const INLINE=[
  {re:/\*\*([^*\n]+)\*\*$/,m:'b'},
  {re:/__([^_\n]+)__$/,m:'b'},
  {re:/(^|[^*])\*([^*\n]+)\*$/,m:'i',g:2},
  {re:/~~([^~\n]+)~~$/,m:'s'},
  {re:/==([^=\n]+)==$/,m:'hl'},
  {re:/`([^`\n]+)`$/,m:'code'},
];
export const LINE=[[/^###\s/,'b-h3'],[/^##\s/,'b-h2'],[/^#\s/,'b-h1'],
            [/^>\s/,'b-quote'],[/^```$/,'b-code']];

export function absOff(b,c,o){
  let n=0,done=false;
  (function walk(el){
    if(done) return;
    for(const ch of Array.from(el.childNodes)){
      if(done) return;
      if(ch===c && ch.nodeType===3){ n+=o; done=true; return; }
      if(ch.nodeType===3) n+=ch.data.length;
      else { if(ch===c){ done=true; return; } walk(ch); }
    }
  })(b);
  return n;
}
export function ptFromAbs(b,abs){
  let rem=abs,res=null;
  (function walk(el){
    if(res) return;
    for(const ch of Array.from(el.childNodes)){
      if(res) return;
      if(ch.nodeType===3){
        if(rem<=ch.data.length){ res={node:ch,off:rem}; return; }
        rem-=ch.data.length;
      } else walk(ch);
    }
  })(b);
  return res;
}
export function autoFormat(){
  const d=docEl(); if(!d) return;
  const s=sel(); if(!(s&&s.rangeCount)) return;
  const r=s.getRangeAt(0); if(!r.collapsed) return;
  const b=curBlock(); if(!b) return;
  /* Di dalam blok kode, markdown otomatis TIDAK berlaku — isi ditulis
     apa adanya (janji yang sama tertulis di menu Bantuan). */
  if(b.classList.contains('b-code')) return;
  const node=r.startContainer;
  if(!node||node.nodeType!==3) return;
  const full=b.textContent;
  const caretAbs0=absOff(b,node,r.startOffset);
  const before0=full.slice(0,caretAbs0);
  /* cek dulu: apakah ADA pola yang cocok? kalau tidak, JANGAN sentuh DOM
     maupun caret — menyentuhnya tiap ketikan membuat editor tak bisa dipakai */
  const mayLine = LINE.some(([re])=>re.test(full))
    || /^[-*+]\s/.test(full) || /^[-*+]?\s*\[[\sx]?\]\s/.test(full)
    || /^\d+[.)]\s/.test(full)
    || /^(?:>\s*)?\[!\w+\]\s/i.test(full);
  const mayInline = /\[\[[^\]\n]+\]\]$/.test(before0)
    || INLINE.some(pp=>pp.re.test(before0));
  if(!mayLine && !mayInline) return;

  /* to-do & daftar */
  /* buang n karakter pertama dari BLOK (bukan dari node kursor) */
  const eat=n=>{
    let left=n;
    const walk=el=>{
      for(const c of Array.from(el.childNodes)){
        if(left<=0) return;
        if(c.nodeType===3){
          const take=Math.min(left,c.data.length);
          c.deleteData(0,take); left-=take;
          if(c.data==='' && c.parentNode.childNodes.length>1) c.remove();
        } else walk(c);
      }
    };
    walk(b);
  };
  /* > [!info] / [!tip] / [!warn] / [!danger] */
  const mc=full.match(/^(?:>\s*)?\[!(info|tip|warn|warning|danger|bahaya|peringatan)\]\s/i);
  if(mc && !b.classList.contains('b-cal')){
    eat(mc[0].length);
    const peta={warning:'warn',peringatan:'warn',bahaya:'danger'};
    const j=(peta[mc[1].toLowerCase()]||mc[1].toLowerCase());
    setCallout(j); return;
  }
  /* daftar bernomor: "1. " */
  const mo=full.match(/^\d+[.)]\s/);
  if(mo && !b.classList.contains('b-ol')){ eat(mo[0].length); setBlock('b-ol'); return; }

  const todo=b.classList.contains('b-li')?/^[-*+]?\s*\[[\sx]?\]\s/:/^[-*+]\s\[[\sx]?\]\s/;
  const mt=full.match(todo);
  if(mt && !b.classList.contains('b-todo')){
    /* `- [x] ` / `- [X] ` langsung jadi todo TERCENTANG */
    const dicek=/\[[xX]\]/.test(mt[0]);
    eat(mt[0].length);
    b.classList.remove('b-li'); setBlock('b-todo');
    if(dicek){
      const cb=b.querySelector(':scope > .cbx');
      if(cb) cb.classList.add('on');
      b.classList.add('done');
    }
    return;
  }
  for(const [re,cls] of LINE){
    const m2=full.match(re);
    if(m2 && !b.classList.contains(cls)){ eat(m2[0].length); setBlock(cls); return; }
  }
  if(!b.classList.contains('b-li') && !b.classList.contains('b-todo')){
    const ml=full.match(/^[-*+]\s/);
    if(ml){ eat(ml[0].length); setBlock('b-li'); return; }
  }
  /* wikilink */
  const caretAbs=caretAbs0;
  const before=before0;
  const wl=before.match(/\[\[([^\]\n]+)\]\]$/);
  if(wl){ replaceAbs(b,caretAbs,wl[0].length,'span','wl','[['+wl[1]+']]'); return; }
  /* inline mark */
  for(const p of INLINE){
    const m2=before.match(p.re);
    if(!m2) continue;
    const inner=m2[p.g||1];
    const lead=(p.g===2 && m2[1])?m2[1].length:0;
    const len=m2[0].length-lead;
    replaceAbs(b,caretAbs,len,MARKTAG[p.m],MARKCLS[p.m]||'',inner);
    return;
  }
}
export function replaceAbs(b,end,len,tag,cls,text){
  const start=end-len; if(start<0) return;
  const p1=ptFromAbs(b,start), p2=ptFromAbs(b,end);
  if(!p1||!p2) return;
  const el=document.createElement(tag);
  if(cls) el.className=cls;
  el.textContent=text;
  const r=document.createRange();
  try{ r.setStart(p1.node,p1.off); r.setEnd(p2.node,p2.off); }catch(e){ return; }
  r.deleteContents(); r.insertNode(el);
  /* text node kosong, BUKAN zero-width: penanda yang tersimpan merusak
     spasi saat browser menggabungkan elemen bersebelahan */
  const sp=document.createTextNode(''); el.after(sp);
  const nr=document.createRange(); nr.setStart(sp,0); nr.collapse(true);
  sel().removeAllRanges(); sel().addRange(nr);
  updateCount();
}
