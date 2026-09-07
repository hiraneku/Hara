/* Menangkap kelas bug: penanda zero-width tersimpan & merusak spasi,
   serta huruf berpindah saat berganti format.
   Simulasi meniru browser: elemen inline identik bersebelahan DIGABUNG. */
import {JSDOM} from 'jsdom';
import fs from 'fs';
import { indexedDB as fakeIDB } from 'fake-indexeddb';
import path from 'path';
import { fileURLToPath } from 'url';
/* selalu jalan dari akar repo, apa pun cwd pemanggil */
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const dom=new JSDOM(fs.readFileSync('docs/index.html','utf8'),{url:'https://x.test/',pretendToBeVisual:true});
const {window:w}=dom; w.indexedDB=fakeIDB;
for(const k of ['document','getSelection','HTMLElement','Node','Range','MouseEvent','Event','InputEvent','localStorage','Image','Blob'])
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
let P=0,F=0;const ok=(n,c,det)=>{c?P++:(F++,console.log('  ✗',n,det?'\n      '+det:''));};
const click=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
const mb=m=>d.querySelector(`.mb[data-m="${m}"]`);
const gb=g=>d.querySelector(`.mb-g[data-g="${g}"]`);
const DOC=()=>d.querySelector('.ed-doc');
const BLK=()=>DOC().firstElementChild;
const sleep=(ms=15)=>new Promise(r=>setTimeout(r,ms));
const GRUP={hl:'tandai',strike:'tandai',icode:'tandai'};
const MARKS=['b','i','hl','strike','icode'];
const sig=el=>el.nodeType!==1?null:el.tagName+'|'+(el.getAttribute('class')||'');
function gabung(root){
  let ubah=true;
  while(ubah){ ubah=false;
    for(const par of [root,...root.querySelectorAll('*')]){
      let n=par.firstChild;
      while(n&&n.nextSibling){
        const a=n,b=n.nextSibling;
        if(a.nodeType===1&&b.nodeType===1&&sig(a)&&sig(a)===sig(b)&&
           /^(B|I|S|SPAN|CODE|STRONG|EM)$/.test(a.tagName)){
          while(b.firstChild) a.appendChild(b.firstChild); b.remove(); ubah=true;
        } else n=n.nextSibling;
      }}}
  root.normalize();
}
go('notes'); click(d.querySelector('[data-open="w"]'));
function fresh(){DOC().innerHTML='';
  const p=d.createElement('div');p.className='b-p';DOC().appendChild(p);
  const t=d.createTextNode('');p.appendChild(t);
  const r=d.createRange();r.setStart(t,0);r.collapse(true);
  SEL.removeAllRanges();SEL.addRange(r);d.dispatchEvent(new w.Event('selectionchange'));}
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
  gabung(DOC()); d.dispatchEvent(new w.Event('selectionchange'));}
const type=s=>{for(const c of s)ins(c);};
async function tog(m){
  if(GRUP[m]){click(gb(GRUP[m]));const it=d.querySelector(`#pop .pop-i[data-m="${m}"]`);if(it)click(it);await sleep();}
  else click(mb(m));
  gabung(DOC()); d.dispatchEvent(new w.Event('selectionchange'));}
const teks=()=>BLK().textContent;

console.log('══ 1. SPASI bertahan: off lalu on lagi ══');
for(const m of MARKS){
  fresh(); await tog(m); type('satu dua ');
  await tog(m); await tog(m);
  type('tiga');
  ok(`${m}: spasi utuh`, teks()==='satu dua tiga', `teks=${JSON.stringify(teks())}`);
  ok(`${m}: tanpa penanda tersembunyi`, !/\u200b/.test(teks()), `mentah=${JSON.stringify(teks())}`);
}
console.log('══ 2. GANTI format: huruf tidak berpindah ══');
for(const m1 of MARKS) for(const m2 of MARKS){
  if(m1===m2) continue;
  fresh(); await tog(m1); type('Halo');
  await tog(m1); await tog(m2);
  type('Halo');
  ok(`${m1}->${m2}: "HaloHalo"`, teks()==='HaloHalo', `teks=${JSON.stringify(teks())}`);
}
console.log('══ 3. spasi di antara dua format berbeda ══');
for(const [m1,m2] of [['b','i'],['i','hl'],['hl','strike'],['strike','icode']]){
  fresh(); await tog(m1); type('kata ');
  await tog(m1); await tog(m2); type('lain');
  ok(`${m1}->${m2}: spasi utuh`, teks()==='kata lain', `teks=${JSON.stringify(teks())}`);
}
console.log('══ 4. tanpa penanda di DOM sama sekali ══');
fresh(); await tog('b'); type('a b '); await tog('b'); type('c d ');
await tog('b'); type('e f');
ok('tidak ada U+200B', !/\u200b/.test(DOC().innerHTML), `html=${JSON.stringify(DOC().innerHTML)}`);
ok('teks lengkap', teks()==='a b c d e f', `teks=${JSON.stringify(teks())}`);
console.log('══ 5. banyak spasi beruntun ══');
fresh(); await tog('b'); type('x   y');
await tog('b'); type('   z');
ok('spasi ganda utuh', teks()==='x   y   z', `teks=${JSON.stringify(teks())}`);
console.log(F?`\n${F} GAGAL / ${P+F}`:`\nSEMUA ${P} LOLOS`);
