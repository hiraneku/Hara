/* Posisi kursor. Bagian paling rawan — semua bug "aloH" berasal dari sini.
   Aturan: caret HARUS bertumpu pada text node, tidak pernah pada elemen. */
import { BLOCKCLS } from './blocks.js';

export const docEl = () => document.querySelector('.ed-doc');
export const sel   = () => window.getSelection();

export const editable = el => el && el.classList && !el.classList.contains('b-div');

export function nearestEditable(el){
  const d=docEl(); if(!d) return null;
  if(editable(el)) return el;
  let n=el;
  while(n&&!editable(n)) n=n.nextElementSibling;
  if(n) return n;
  n=el;
  while(n&&!editable(n)) n=n.previousElementSibling;
  if(n) return n;
  const nb=document.createElement('div'); nb.className='b-p';
  nb.appendChild(document.createElement('br'));
  d.appendChild(nb); return nb;
}
export function curBlock(){
  const d=docEl(); if(!d) return null;
  const s=sel();
  if(s && s.rangeCount){
    const r0=s.getRangeAt(0);
    let n=r0.startContainer;
    if(d.contains(n)){
      /* seleksi berada di container editor -> pakai offset utk cari blok */
      if(n===d){
        const kids=d.children;
        const idx=Math.min(r0.startOffset,kids.length-1);
        if(kids[idx]) return nearestEditable(kids[idx]);
      }
      if(n.nodeType===3) n=n.parentNode;
      let best=null;
      while(n && n!==d){
        if(n.classList && BLOCKCLS.some(c=>n.classList.contains(c))) best=n;
        n=n.parentNode;
      }
      if(best) return nearestEditable(best);
    }
  }
  return nearestEditable(d.lastElementChild||d.firstElementChild);
}
export function ensureCaret(){
  const d=docEl(); if(!d) return null;
  const s=sel();
  if(!(s && s.rangeCount && d.contains(s.getRangeAt(0).startContainer))){
    const b=nearestEditable(d.lastElementChild||d.firstElementChild);
    if(!b) return null;
    caretEnd(b);
  }
  let r=s.getRangeAt(0);
  /* caret jangan bertumpu pada ELEMEN — di browser itu bikin huruf pertama
     loncat ke belakang ("Halo" -> "aloH"). Turunkan ke text node nyata. */
  if(r.collapsed && r.startContainer.nodeType===1){
    const el=r.startContainer;
    if(el.classList && el.classList.contains('b-div')){
      const t=nearestEditable(el); if(t){ caretEnd(t); return sel().getRangeAt(0); }
    }
    const kid=el.childNodes[r.startOffset];
    let tn=null;
    if(kid && kid.nodeType===3) tn=kid;
    else if(kid && kid.nodeName==='BR'){
      tn=document.createTextNode(''); el.insertBefore(tn,kid);
    } else {
      const prev=el.childNodes[r.startOffset-1];
      if(prev && prev.nodeType===3){ 
        const nr=document.createRange(); nr.setStart(prev,prev.data.length); nr.collapse(true);
        s.removeAllRanges(); s.addRange(nr); return s.getRangeAt(0);
      }
      tn=document.createTextNode('');
      if(kid) el.insertBefore(tn,kid); else el.appendChild(tn);
    }
    if(tn){ const nr=document.createRange(); nr.setStart(tn,0); nr.collapse(true);
            s.removeAllRanges(); s.addRange(nr); }
    r=s.getRangeAt(0);
  }
  return r;
}
export function selectContents(node){
  const r=document.createRange(); r.selectNodeContents(node);
  const s=sel(); s.removeAllRanges(); s.addRange(r);
}
/* Apakah blok ini tidak punya teks sama sekali (hanya <br>/checkbox)? */
function blokKosong(node){
  return (node.textContent||'').replace(/[\u200b\u00a0]/g,'')==='';
}
export function caretEnd(node){
  /* blok kosong hanya berisi <br> pengganjal. Menaruh caret SESUDAH <br>
     membuat huruf pertama jatuh ke baris berikutnya ("Halo" -> "aloH").
     Ganti <br> dgn text node kosong supaya caret benar-benar di dalam teks. */
  if(node.childNodes.length===0){
    node.appendChild(document.createElement('br'));
  }
  const only=blokKosong(node);
  if(only){
    /* blok kosong: <br> DIPERTAHANKAN supaya tinggi baris tetap ada,
       tapi caret ditaruh di TEXT NODE nyata sebelum <br>. Caret berbasis
       elemen membuat huruf pertama loncat ("Halo" -> "aloH"). */
    /* buang semua text node kosong sisa penempatan caret sebelumnya */
    Array.from(node.childNodes).forEach(n=>{
      if(n.nodeType===3 && n.data==='') n.remove();
    });
    /* pastikan ada tepat satu <br> dan ia anak TERAKHIR */
    const brs=Array.from(node.querySelectorAll(':scope > br'));
    brs.slice(1).forEach(x=>x.remove());
    let br=brs[0];
    if(!br){ br=document.createElement('br'); }
    node.appendChild(br);
    /* caret di text node tepat SEBELUM <br> */
    const t=document.createTextNode('');
    node.insertBefore(t,br);
    const r=document.createRange(); r.setStart(t,0); r.collapse(true);
    const s=sel(); s.removeAllRanges(); s.addRange(r);
    return;
  }
  const r=document.createRange(); r.selectNodeContents(node); r.collapse(false);
  const s=sel(); s.removeAllRanges(); s.addRange(r);
}
