/* Posisi kursor. Bagian paling rawan — semua bug "aloH" berasal dari sini.
   Aturan: caret HARUS bertumpu pada text node, tidak pernah pada elemen. */
import { BLOCKCLS } from './blocks.js?v=20260907072821';

export const docEl = () => document.querySelector('.ed-doc');

/* ── Kunci papan ketik ──
   Sebagian browser memunculkan keyboard begitu elemen contenteditable
   berstatus fokus. inputmode="none" memberitahu sistem agar tidak
   menampilkannya. Dilepas saat pengguna benar-benar menyentuh teks. */
export function kunciKeyboard() {
  const d = docEl();
  if (d) d.setAttribute('inputmode', 'none');
}
export function bukaKeyboard() {
  const d = docEl();
  if (d) d.removeAttribute('inputmode');
}
document.addEventListener('pointerdown', e => {
  if (e.target.closest && e.target.closest('.ed-doc')) bukaKeyboard();
}, true);
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
  if(!node) return;
  if(node.classList&&node.classList.contains('b-div')){
    const t=nearestEditable(node); if(t&&t!==node) return caretEnd(t);
    return;
  }
  /* Blok kosong: JANGAN pakai <br> pengganjal. <br> adalah pemaksa baris
     baru — huruf pertama yang diketik sebelum <br> tampak terdorong ke
     baris kedua ("Halo" -> "aloH"). Tinggi baris sudah dijamin CSS
     (.ed-doc>* { min-height }), jadi <br> tidak diperlukan sama sekali. */
  if(blokKosong(node)){
    Array.from(node.querySelectorAll(':scope > br')).forEach(br=>br.remove());
    Array.from(node.childNodes).forEach(n=>{
      if(n.nodeType===3 && n.data==='') n.remove();
    });
    const t=document.createTextNode('');
    node.appendChild(t);
    const r=document.createRange(); r.setStart(t,0); r.collapse(true);
    const s=sel(); s.removeAllRanges(); s.addRange(r);
    return;
  }
  const r=document.createRange(); r.selectNodeContents(node); r.collapse(false);
  const s=sel(); s.removeAllRanges(); s.addRange(r);
}
