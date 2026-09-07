/* Kondisi yang BELUM diuji: caret bertumpu pada ELEMEN (bukan text node).
   Ini yang terjadi di browser sungguhan saat elemen inline baru dibuat —
   caret sering diletakkan sebagai (elemen, offset) alih-alih (teks, offset). */
import {JSDOM} from 'jsdom';
import fs from 'fs';
import { indexedDB as fakeIDB } from 'fake-indexeddb';
const dom=new JSDOM(fs.readFileSync('docs/index.html','utf8'),{url:'https://x.test/',pretendToBeVisual:true});
const {window:w}=dom; w.indexedDB=fakeIDB;
for(const k of ['document','getSelection','HTMLElement','Node','Range','MouseEvent','KeyboardEvent','Event','InputEvent','localStorage','Image','Blob'])
  if(w[k]!==undefined) globalThis[k]=w[k];
globalThis.window=w; globalThis.self=w; globalThis.indexedDB=w.indexedDB;
globalThis.addEventListener=w.addEventListener.bind(w);
Object.defineProperty(globalThis,'navigator',{value:w.navigator,configurable:true});
w.URL.createObjectURL=()=>'blob:x/1';w.URL.revokeObjectURL=()=>{};globalThis.URL=w.URL;
const V=fs.readFileSync('docs/app.js','utf8').match(/\?v=(\d+)/)[1];
await import(`./docs/app.js?v=${V}`);
const {go}=await import(`./docs/core/router.js?v=${V}`);
const d=w.document,SEL=w.getSelection();
const click=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
const mb=m=>d.querySelector(`.mb[data-m="${m}"]`);
const gb=g=>d.querySelector(`.mb-g[data-g="${g}"]`);
const DOC=()=>d.querySelector('.ed-doc');
const sleep=(ms=15)=>new Promise(r=>setTimeout(r,ms));
const clean=t=>t.replace(/[\u200b\u00a0]/g,'');
const GRUP={hl:'tandai',strike:'tandai',icode:'tandai'};
const SELTOR={b:'b,strong',i:'i,em',hl:'.hl',strike:'s,strike',icode:'code.ic'};
const MARKS=['b','i','hl','strike','icode'];
go('notes'); click(d.querySelector('[data-open="w"]'));
function fresh(){DOC().innerHTML='';
  const p=d.createElement('div');p.className='b-p';DOC().appendChild(p);
  const t=d.createTextNode('');p.appendChild(t);
  const r=d.createRange();r.setStart(t,0);r.collapse(true);
  SEL.removeAllRanges();SEL.addRange(r);d.dispatchEvent(new w.Event('selectionchange'));}
/* MODE A: caret dipindah ke (elemen,offset) — perilaku browser nyata */
function caretKeElemen(){
  if(!SEL.rangeCount)return;
  const r=SEL.getRangeAt(0); const n=r.startContainer;
  if(n.nodeType!==3) return;
  if(r.startOffset!==n.length) return;
  const par=n.parentNode; const idx=Array.from(par.childNodes).indexOf(n);
  const nr=d.createRange(); nr.setStart(par,idx+1); nr.collapse(true);
  SEL.removeAllRanges(); SEL.addRange(nr);
}
function ins(ch,mode){
  const ev=new w.InputEvent('beforeinput',{bubbles:true,cancelable:true,inputType:'insertText',data:ch});
  DOC().dispatchEvent(ev);
  if(!ev.defaultPrevented){
    const r=SEL.getRangeAt(0);let n=r.startContainer,o=r.startOffset;
    if(n.nodeType===3){n.insertData(o,ch);
      const nr=d.createRange();nr.setStart(n,o+ch.length);nr.collapse(true);
      SEL.removeAllRanges();SEL.addRange(nr);}
    else{const t=d.createTextNode(ch);n.insertBefore(t,n.childNodes[o]||null);
      const nr=d.createRange();nr.setStart(t,1);nr.collapse(true);
      SEL.removeAllRanges();SEL.addRange(nr);}
    DOC().dispatchEvent(new w.Event('input',{bubbles:true}));}
  if(mode==='elemen') caretKeElemen();
  d.dispatchEvent(new w.Event('selectionchange'));}
const type=(s,mode)=>{for(const c of s)ins(c,mode);};
async function tog(m){
  if(GRUP[m]){ click(gb(GRUP[m]));
    const it=d.querySelector(`#pop .pop-i[data-m="${m}"]`); if(it)click(it); await sleep(); }
  else click(mb(m));}
const isiMark=m=>[...DOC().querySelectorAll(SELTOR[m])].map(x=>clean(x.textContent)).join('');
let gagal=[];
const cek=(n,s,det)=>{ if(!s) gagal.push(n+(det?'\n      '+det:'')); };

console.log('══ L. caret di ELEMEN: satu mark on→off ══');
for(const m of MARKS){
  fresh(); await tog(m); type('aaa','elemen'); await tog(m); type('bbb','elemen');
  const t=clean(DOC().textContent);
  cek(`L/${m}`, t==='aaabbb' && isiMark(m)==='aaa', `teks=${JSON.stringify(t)} mark=${JSON.stringify(isiMark(m))}`);
}
console.log('══ M. caret di ELEMEN: DUA mark, matikan satu ══');
for(const m1 of MARKS) for(const m2 of MARKS){
  if(m1===m2) continue;
  fresh(); await tog(m1); await tog(m2); type('aaa','elemen');
  await tog(m2); type('bbb','elemen');
  const t=clean(DOC().textContent);
  cek(`M/${m1}+${m2} off:${m2}`, t==='aaabbb' && isiMark(m2)==='aaa' && isiMark(m1)==='aaabbb',
      `teks=${JSON.stringify(t)} ${m1}=${JSON.stringify(isiMark(m1))} ${m2}=${JSON.stringify(isiMark(m2))}`);
}
console.log('══ N. caret di ELEMEN: on-off berulang ══');
for(const m of MARKS){
  fresh();
  await tog(m); type('aa','elemen'); await tog(m); type('bb','elemen');
  await tog(m); type('cc','elemen'); await tog(m); type('dd','elemen');
  const t=clean(DOC().textContent);
  cek(`N/${m}`, t==='aabbccdd' && isiMark(m)==='aacc', `teks=${JSON.stringify(t)} mark=${JSON.stringify(isiMark(m))}`);
}
console.log('══ O. mark + font, caret di ELEMEN ══');
for(const m of MARKS){
  fresh(); await tog(m);
  click(gb('huruf')); click(d.querySelector('#pop [data-font="georgia"]')); await sleep();
  type('aaa','elemen'); await tog(m); type('bbb','elemen');
  const t=clean(DOC().textContent);
  cek(`O/${m}+font`, t==='aaabbb', `teks=${JSON.stringify(t)}`);
}
console.log('\n════════ HASIL ════════');
if(!gagal.length) console.log('SEMUA LOLOS');
else { console.log(gagal.length+' GAGAL:'); gagal.forEach(x=>console.log('  ✗',x)); }
