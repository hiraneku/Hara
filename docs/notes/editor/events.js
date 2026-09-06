/* Semua penangan kejadian editor: mengetik, tombol papan ketik, seleksi. */
import { docEl, sel, curBlock, caretEnd } from './caret.js';
import { setBlock, indent } from './blocks.js';
import { pending, flushPending, wrapTypedPending } from './marks.js';
import { autoFormat } from './markdown.js';
import { refresh, updateCount, syncBtns, saveNow } from './cleanup.js';
import { onTitle } from '../model.js';

export function bindEditor() {
  const inDoc=t=>t&&t.closest&&t.closest('.ed-doc');
  document.addEventListener('beforeinput',e=>{
    if(!inDoc(e.target)) return;
    if(pending.size && e.inputType==='insertText') flushPending();
  });
  document.addEventListener('input',e=>{
    if(inDoc(e.target)){ if(pending.size) wrapTypedPending(); autoFormat(); refresh(); }
    else if(e.target.classList && e.target.classList.contains('ed-t')){ onTitle(e.target); updateCount(); }
  });
  let _lastAnchor=null;
  document.addEventListener('selectionchange',()=>{
    if(!docEl()) return;
    const s=sel();
    const a=s&&s.anchorNode;
    const blk=curBlock();
    if(pending.size && _lastAnchor && blk!==_lastAnchor) pending.clear();
    _lastAnchor=blk;
    syncBtns();
  });
  document.addEventListener('keydown',e=>{
    if(!inDoc(e.target)) return;
    const b=curBlock();
    if(e.key==='Enter' && !e.shiftKey && b &&
       (b.classList.contains('b-h1')||b.classList.contains('b-h2')||b.classList.contains('b-cal'))){
      e.preventDefault();
      const nb=document.createElement('div'); nb.className='b-p';
      b.after(nb); caretEnd(nb); refresh(); return;
    }
    if(e.key==='Tab'){ e.preventDefault(); indent(e.shiftKey?-1:1); return; }
    if(e.key==='Backspace' && b && !b.classList.contains('b-p')){
      const s=sel();
      if(s.rangeCount && s.getRangeAt(0).collapsed){
        const r=s.getRangeAt(0);
        const pre=document.createRange();
        pre.selectNodeContents(b); pre.setEnd(r.startContainer,r.startOffset);
        if(pre.toString().replace(/[\u200b\u00a0]/g,'')===''){
          e.preventDefault(); setBlock('b-p');
        }
      }
    }
  });
  document.addEventListener('click',e=>{
    const c=e.target.closest('.ed-doc .cbx');
    if(c){ c.classList.toggle('on'); c.parentElement.classList.toggle('done',c.classList.contains('on')); }
  });
}
