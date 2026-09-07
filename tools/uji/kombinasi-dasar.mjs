/* MATRIKS UJI MENYELURUH — semua kombinasi, semua urutan.
   Tujuan: menemukan SEMUA kasus rusak sekaligus, bukan satu per satu. */
import {JSDOM} from 'jsdom';
import fs from 'fs';
import { indexedDB as fakeIDB } from 'fake-indexeddb';
import path from 'path';
import { fileURLToPath } from 'url';
/* selalu jalan dari akar repo, apa pun cwd pemanggil */
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const dom=new JSDOM(fs.readFileSync('docs/index.html','utf8'),{url:'https://x.test/',pretendToBeVisual:true});
const {window:w}=dom; w.indexedDB=fakeIDB;
for(const k of ['document','getSelection','HTMLElement','Node','Range','MouseEvent','KeyboardEvent','Event','InputEvent','localStorage','Image','Blob'])
  if(w[k]!==undefined) globalThis[k]=w[k];
globalThis.window=w; globalThis.self=w; globalThis.indexedDB=w.indexedDB;
globalThis.addEventListener=w.addEventListener.bind(w);
Object.defineProperty(globalThis,'navigator',{value:w.navigator,configurable:true});
w.URL.createObjectURL=()=>'blob:x/1';w.URL.revokeObjectURL=()=>{};globalThis.URL=w.URL;
const AKAR=process.cwd();
const V=fs.readFileSync('docs/app.js','utf8').match(/\?v=(\d+)/)[1];
await import(`${AKAR}/docs/app.js?v=${V}`);
const {go}=await import(`${AKAR}/docs/core/router.js?v=${V}`);
const d=w.document,SEL=w.getSelection();
const click=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
const mb=m=>d.querySelector(`.mb[data-m="${m}"]`);
const gb=g=>d.querySelector(`.mb-g[data-g="${g}"]`);
const DOC=()=>d.querySelector('.ed-doc');
const sleep=(ms=15)=>new Promise(r=>setTimeout(r,ms));
const clean=t=>t.replace(/[\u200b\u00a0]/g,'');
const GRUP={hl:'tandai',strike:'tandai',icode:'tandai'};
const SELTOR={b:'b,strong',i:'i,em',hl:'.hl',strike:'s,strike',icode:'code.ic'};
go('notes'); click(d.querySelector('[data-open="w"]'));
function fresh(){DOC().innerHTML='';
  const p=d.createElement('div');p.className='b-p';DOC().appendChild(p);
  const t=d.createTextNode('');p.appendChild(t);
  const r=d.createRange();r.setStart(t,0);r.collapse(true);
  SEL.removeAllRanges();SEL.addRange(r);d.dispatchEvent(new w.Event('selectionchange'));}
/* browser menarik caret masuk ke elemen inline terdekat */
function tarik(){
  if(!SEL.rangeCount)return;
  const r=SEL.getRangeAt(0); const n=r.startContainer;
  if(n.nodeType!==3) return;
  const prev=n.previousSibling;
  if(prev&&prev.nodeType===1&&/^(B|I|S|SPAN|CODE|STRONG|EM)$/.test(prev.tagName)&&r.startOffset>=n.length){
    let last=prev; while(last.lastChild) last=last.lastChild;
    if(last.nodeType===3){const nr=d.createRange();nr.setStart(last,last.length);nr.collapse(true);
      SEL.removeAllRanges();SEL.addRange(nr);}}}
function ins(ch){
  const ev=new w.InputEvent('beforeinput',{bubbles:true,cancelable:true,inputType:'insertText',data:ch});
  DOC().dispatchEvent(ev);
  if(!ev.defaultPrevented){
    const r=SEL.getRangeAt(0);let n=r.startContainer,o=r.startOffset;
    if(n.nodeType===3){n.insertData(o,ch);
      const nr=d.createRange();nr.setStart(n,o+ch.length);nr.collapse(true);
      SEL.removeAllRanges();SEL.addRange(nr);}
    DOC().dispatchEvent(new w.Event('input',{bubbles:true}));}
  tarik(); d.dispatchEvent(new w.Event('selectionchange'));}
const type=s=>{for(const c of s)ins(c);};
async function tog(m){
  if(GRUP[m]){ click(gb(GRUP[m]));
    const it=d.querySelector(`#pop .pop-i[data-m="${m}"]`); if(it)click(it); await sleep(); }
  else click(mb(m));}
const isiMark=m=>[...DOC().querySelectorAll(SELTOR[m])].map(x=>clean(x.textContent)).join('');
const MARKS=['b','i','hl','strike','icode'];

let gagal=[];
const cek=(nama,syarat,detail)=>{ if(!syarat) gagal.push(nama+(detail?'  → '+detail:'')); };

console.log('══ A. SATU mark: on→ketik→off→ketik ══');
for(const m of MARKS){
  fresh(); await tog(m); type('aaa'); await tog(m); type('bbb');
  cek(`A/${m}`, clean(DOC().textContent)==='aaabbb' && isiMark(m)==='aaa',
      JSON.stringify(clean(DOC().textContent))+' | mark='+JSON.stringify(isiMark(m)));
}

console.log('══ B. DUA mark digabung, matikan SATU ══');
for(const m1 of MARKS) for(const m2 of MARKS){
  if(m1===m2) continue;
  fresh();
  await tog(m1); await tog(m2); type('aaa');
  await tog(m2);                       /* matikan yang kedua */
  type('bbb');
  const teks=clean(DOC().textContent);
  const p1=isiMark(m1), p2=isiMark(m2);
  cek(`B/${m1}+${m2} off:${m2}`,
      teks==='aaabbb' && p1==='aaabbb' && p2==='aaa',
      `teks=${JSON.stringify(teks)} ${m1}=${JSON.stringify(p1)} ${m2}=${JSON.stringify(p2)}`);
}

console.log('══ C. DUA mark, matikan yang PERTAMA ══');
for(const m1 of MARKS) for(const m2 of MARKS){
  if(m1===m2) continue;
  fresh();
  await tog(m1); await tog(m2); type('aaa');
  await tog(m1);                       /* matikan yang pertama */
  type('bbb');
  const teks=clean(DOC().textContent);
  cek(`C/${m1}+${m2} off:${m1}`,
      teks==='aaabbb' && isiMark(m2)==='aaabbb' && isiMark(m1)==='aaa',
      `teks=${JSON.stringify(teks)} ${m1}=${JSON.stringify(isiMark(m1))} ${m2}=${JSON.stringify(isiMark(m2))}`);
}

console.log('══ D. DUA mark, matikan KEDUANYA ══');
for(const m1 of MARKS) for(const m2 of MARKS){
  if(m1===m2) continue;
  fresh();
  await tog(m1); await tog(m2); type('aaa');
  await tog(m1); await tog(m2);
  type('bbb');
  const teks=clean(DOC().textContent);
  cek(`D/${m1}+${m2} off:both`,
      teks==='aaabbb' && isiMark(m1)==='aaa' && isiMark(m2)==='aaa',
      `teks=${JSON.stringify(teks)}`);
}

console.log('══ E. TIGA mark digabung ══');
const tri=[['b','i','hl'],['b','hl','strike'],['i','strike','icode'],['b','i','icode']];
for(const [m1,m2,m3] of tri){
  fresh();
  await tog(m1); await tog(m2); await tog(m3); type('aaa');
  await tog(m2); type('bbb');
  const teks=clean(DOC().textContent);
  cek(`E/${m1}+${m2}+${m3} off:${m2}`,
      teks==='aaabbb' && isiMark(m2)==='aaa' && isiMark(m1)==='aaabbb',
      `teks=${JSON.stringify(teks)}`);
}

console.log('══ F. mark + FONT ══');
for(const m of MARKS){
  fresh();
  await tog(m);
  click(gb('huruf')); click(d.querySelector('#pop [data-font="georgia"]')); await sleep();
  type('aaa');
  await tog(m); type('bbb');
  const teks=clean(DOC().textContent);
  cek(`F/${m}+font off:${m}`, teks==='aaabbb' && isiMark(m)==='aaa',
      `teks=${JSON.stringify(teks)}`);
}
console.log('══ G. font dimatikan saat mark aktif ══');
for(const m of ['b','hl']){
  fresh();
  await tog(m);
  click(gb('huruf')); click(d.querySelector('#pop [data-font="courier"]')); await sleep();
  type('aaa');
  click(gb('huruf')); click(d.querySelector('#pop [data-font=""]')); await sleep();
  type('bbb');
  const teks=clean(DOC().textContent);
  cek(`G/${m}+font off:font`, teks==='aaabbb', `teks=${JSON.stringify(teks)}`);
}
console.log('\n════════ HASIL ════════');
if(!gagal.length) console.log('SEMUA KOMBINASI LOLOS');
else { console.log(gagal.length+' KOMBINASI GAGAL:'); gagal.forEach(x=>console.log('  ✗',x)); }
