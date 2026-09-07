/* Kondisi tepi yang belum diuji sama sekali. */
import {JSDOM} from 'jsdom';
import fs from 'fs';
import { indexedDB as fakeIDB } from 'fake-indexeddb';
const dom=new JSDOM(fs.readFileSync('docs/index.html','utf8'),{url:'https://x.test/',pretendToBeVisual:true});
const {window:w}=dom; w.indexedDB=fakeIDB;
for(const k of ['document','getSelection','HTMLElement','Node','Range','MouseEvent','Event','InputEvent','localStorage','Image','Blob'])
  if(w[k]!==undefined) globalThis[k]=w[k];
globalThis.window=w; globalThis.self=w; globalThis.indexedDB=w.indexedDB;
globalThis.addEventListener=w.addEventListener.bind(w);
Object.defineProperty(globalThis,'navigator',{value:w.navigator,configurable:true});
w.URL.createObjectURL=()=>'blob:x/1';w.URL.revokeObjectURL=()=>{};globalThis.URL=w.URL;
const V=fs.readFileSync('docs/app.js','utf8').match(/\?v=(\d+)/)[1];
await import(`./docs/app.js?v=${V}`);
const {go}=await import(`./docs/core/router.js?v=${V}`);
const M=await import(`./docs/notes/editor/marks.js?v=${V}`);
const d=w.document,SEL=w.getSelection();
const click=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
const mb=m=>d.querySelector(`.mb[data-m="${m}"]`);
const DOC=()=>d.querySelector('.ed-doc');
const clean=t=>t.replace(/[\u200b\u00a0]/g,'');
const sleep=(ms=15)=>new Promise(r=>setTimeout(r,ms));
go('notes'); click(d.querySelector('[data-open="w"]'));
let gagal=[];
const cek=(n,s,det)=>{ if(!s) gagal.push(n+(det?'\n      '+det:'')); };
function fresh(){DOC().innerHTML='';
  const p=d.createElement('div');p.className='b-p';DOC().appendChild(p);
  const t=d.createTextNode('');p.appendChild(t);
  const r=d.createRange();r.setStart(t,0);r.collapse(true);
  SEL.removeAllRanges();SEL.addRange(r);d.dispatchEvent(new w.Event('selectionchange'));return p;}
function ins(ch){
  const ev=new w.InputEvent('beforeinput',{bubbles:true,cancelable:true,inputType:'insertText',data:ch});
  DOC().dispatchEvent(ev);
  if(!ev.defaultPrevented){
    const r=SEL.getRangeAt(0);let n=r.startContainer,o=r.startOffset;
    if(n.nodeType===3){n.insertData(o,ch);
      const nr=d.createRange();nr.setStart(n,o+ch.length);nr.collapse(true);
      SEL.removeAllRanges();SEL.addRange(nr);}
    else{const t=d.createTextNode(ch);n.insertBefore(t,n.childNodes[o]||null);
      const nr=d.createRange();nr.setStart(t,1);nr.collapse(true);SEL.removeAllRanges();SEL.addRange(nr);}
    DOC().dispatchEvent(new w.Event('input',{bubbles:true}));}
  d.dispatchEvent(new w.Event('selectionchange'));}
const type=s=>{for(const c of s)ins(c);};

console.log('══ P. pending nyangkut saat caret di ELEMEN ══');
fresh();
click(mb('b'));
/* paksa caret ke ELEMEN, bukan text node — kondisi nyata di browser */
const blk=DOC().firstElementChild;
let r=d.createRange(); r.setStart(blk,0); r.collapse(true);
SEL.removeAllRanges(); SEL.addRange(r);
d.dispatchEvent(new w.Event('selectionchange'));
type('abc');
cek('P/pending tidak nyangkut', M.pending.size===0,
    `pending=${JSON.stringify([...M.pending])} html=${JSON.stringify(blk.innerHTML)}`);
cek('P/teks benar', clean(DOC().textContent)==='abc',
    `teks=${JSON.stringify(clean(DOC().textContent))}`);
cek('P/bold terpasang', !!DOC().querySelector('b,strong'),
    `html=${JSON.stringify(blk.innerHTML)}`);

console.log('══ Q. mengetik di TENGAH teks berformat ══');
fresh();
click(mb('b')); type('halo');
/* pindahkan caret ke tengah "halo" */
const bEl=DOC().querySelector('b');
const tn=[...bEl.childNodes].find(x=>x.nodeType===3&&x.data.includes('halo'));
if(tn){
  const off=tn.data.indexOf('halo')+2;
  r=d.createRange(); r.setStart(tn,off); r.collapse(true);
  SEL.removeAllRanges(); SEL.addRange(r);
  d.dispatchEvent(new w.Event('selectionchange'));
  click(mb('b'));                 /* matikan bold di tengah */
  type('XY');
  cek('Q/sisip di tengah', clean(DOC().textContent)==='haXYlo',
      `teks=${JSON.stringify(clean(DOC().textContent))}`);
}
console.log('══ R. toggle TANPA mengetik lalu pindah blok ══');
fresh();
click(mb('b')); click(mb('i'));
const p2=d.createElement('div');p2.className='b-p';
p2.appendChild(d.createTextNode('lain'));DOC().appendChild(p2);
r=d.createRange();r.setStart(p2.firstChild,4);r.collapse(true);
SEL.removeAllRanges();SEL.addRange(r);d.dispatchEvent(new w.Event('selectionchange'));
cek('R/pending bersih', M.pending.size===0, `pending=${JSON.stringify([...M.pending])}`);
cek('R/sticky bersih', M.sticky.size===0, `sticky=${JSON.stringify([...M.sticky])}`);
type('z');
cek('R/teks polos', !/z/.test([...DOC().querySelectorAll('b,strong,i,em')].map(x=>x.textContent).join('')),
    `html=${JSON.stringify(DOC().innerHTML)}`);

console.log('══ S. toggle sama DUA KALI cepat (tanpa ketik) ══');
fresh();
click(mb('b')); click(mb('b'));
cek('S/pending kosong', M.pending.size===0, `pending=${JSON.stringify([...M.pending])}`);
cek('S/sticky kosong', M.sticky.size===0, `sticky=${JSON.stringify([...M.sticky])}`);
type('abc');
cek('S/teks polos', !DOC().querySelector('b,strong'), `html=${JSON.stringify(DOC().innerHTML)}`);
cek('S/teks benar', clean(DOC().textContent)==='abc', `teks=${JSON.stringify(clean(DOC().textContent))}`);

console.log('\n════════ HASIL ════════');
if(!gagal.length) console.log('SEMUA LOLOS');
else { console.log(gagal.length+' GAGAL:'); gagal.forEach(x=>console.log('  ✗',x)); }
