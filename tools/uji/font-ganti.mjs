/* Bug: setelah bold+font, mengganti font "nyangkut" ke font lama dan
   tampilannya balik ke bawaan. Simulasi meniru browser menarik caret. */
import {JSDOM} from 'jsdom';
import fs from 'fs';
import { indexedDB as fakeIDB } from 'fake-indexeddb';
import path from 'path';
import { fileURLToPath } from 'url';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const AKAR=process.cwd();
const dom=new JSDOM(fs.readFileSync('docs/index.html','utf8'),{url:'https://x.test/',pretendToBeVisual:true});
const {window:w}=dom; w.indexedDB=fakeIDB;
for(const k of ['document','getSelection','HTMLElement','Node','Range','MouseEvent','Event','InputEvent','localStorage','Image','Blob'])
  if(w[k]!==undefined) globalThis[k]=w[k];
globalThis.window=w; globalThis.self=w; globalThis.indexedDB=w.indexedDB;
globalThis.addEventListener=w.addEventListener.bind(w);
Object.defineProperty(globalThis,'navigator',{value:w.navigator,configurable:true});
w.URL.createObjectURL=()=>'blob:x/1';w.URL.revokeObjectURL=()=>{};globalThis.URL=w.URL;
const V=fs.readFileSync('docs/app.js','utf8').match(/\?v=(\d+)/)[1];
await import(`${AKAR}/docs/app.js?v=${V}`);
const {go}=await import(`${AKAR}/docs/core/router.js?v=${V}`);
const {saveNow}=await import(`${AKAR}/docs/notes/editor/cleanup.js?v=${V}`);
const {state}=await import(`${AKAR}/docs/core/store.js?v=${V}`);
const d=w.document,SEL=w.getSelection();
let P=0,F=0;const ok=(n,c,det)=>{c?P++:(F++,console.log('  ✗',n,det?'\n      '+det:''));};
const click=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
const mb=m=>d.querySelector(`.mb[data-m="${m}"]`);
const gb=g=>d.querySelector(`.mb-g[data-g="${g}"]`);
const DOC=()=>d.querySelector('.ed-doc');
const BLK=()=>DOC().firstElementChild;
const sleep=(ms=20)=>new Promise(r=>setTimeout(r,ms));
const GRUP={hl:'tandai',strike:'tandai',icode:'tandai'};
function tarik(){
  if(!SEL.rangeCount)return;
  const r=SEL.getRangeAt(0);const n=r.startContainer;
  if(n.nodeType!==3||n.length!==0)return;
  const prev=n.previousSibling;
  if(prev&&prev.nodeType===1&&/^(B|I|S|SPAN|CODE)$/.test(prev.tagName)){
    let deep=prev;while(deep.lastChild)deep=deep.lastChild;
    if(deep.nodeType===3){const nr=d.createRange();nr.setStart(deep,deep.length);nr.collapse(true);
      SEL.removeAllRanges();SEL.addRange(nr);}}}
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
  tarik(); d.dispatchEvent(new w.Event('selectionchange'));}
const type=s=>{for(const c of s)ins(c);};
const pf=async id=>{click(gb('huruf'));const it=d.querySelector(`#pop [data-font="${id}"]`);
  if(!it)return;click(it);await sleep();tarik();d.dispatchEvent(new w.Event('selectionchange'));};
async function tog(m){
  if(GRUP[m]){click(gb(GRUP[m]));const it=d.querySelector(`#pop .pop-i[data-m="${m}"]`);if(it)click(it);await sleep();}
  else click(mb(m));
  tarik(); d.dispatchEvent(new w.Event('selectionchange'));}
const petaFont=()=>[...BLK().querySelectorAll('[data-font]')].map(x=>x.dataset.font+':'+x.textContent);
const dicentang=()=>{click(gb('huruf'));const on=d.querySelector('#pop .pop-font.on');
  const v=on?on.dataset.font:'';click(gb('huruf'));return v;};
const MARKS=['b','i','hl','strike','icode'];
const FONTS=['georgia','courier','verdana','arial','tahoma'];

console.log('══ 1. mark + font, GANTI font berkali-kali ══');
for(const m of MARKS){
  fresh(); await tog(m);
  await pf('georgia'); type('aa');
  await pf('courier'); type('bb');
  await pf('verdana'); type('cc');
  ok(`${m}: teks utuh`, BLK().textContent==='aabbcc', `teks=${JSON.stringify(BLK().textContent)}`);
  ok(`${m}: tiga font terpisah`, petaFont().join('|')==='georgia:aa|courier:bb|verdana:cc',
     `font=${JSON.stringify(petaFont())}`);
  ok(`${m}: menu menunjuk font terakhir`, dicentang()==='verdana', `tercentang=${dicentang()}`);
  ok(`${m}: tanpa span bersarang`, BLK().querySelectorAll('.fnt .fnt').length===0);
}
console.log('══ 2. ganti font TANPA mengetik di antara ══');
fresh(); await tog('b');
await pf('georgia'); await pf('courier'); await pf('verdana');
type('xyz');
ok('hanya satu span font', BLK().querySelectorAll('.fnt').length===1, `html=${JSON.stringify(BLK().innerHTML)}`);
ok('font terakhir yang dipakai', petaFont().join('')==='verdana:xyz', `font=${JSON.stringify(petaFont())}`);

console.log('══ 3. font -> mark -> ganti font ══');
for(const m of ['b','i','hl']){
  fresh();
  await pf('georgia'); type('aa');
  await tog(m); type('bb');
  await pf('courier'); type('cc');
  ok(`font->${m}->font: teks`, BLK().textContent==='aabbcc', `teks=${JSON.stringify(BLK().textContent)}`);
  ok(`font->${m}->font: courier dipakai`, petaFont().some(x=>x.startsWith('courier:cc')),
     `font=${JSON.stringify(petaFont())}`);
}
console.log('══ 4. semua pasangan font ══');
for(const f1 of FONTS) for(const f2 of FONTS){
  if(f1===f2) continue;
  fresh(); await tog('b');
  await pf(f1); type('aa');
  await pf(f2); type('bb');
  ok(`${f1}->${f2}`, petaFont().join('|')===`${f1}:aa|${f2}:bb` && BLK().textContent==='aabb',
     `font=${JSON.stringify(petaFont())} teks=${JSON.stringify(BLK().textContent)}`);
}
console.log('══ 5. bertahan setelah simpan & render ulang ══');
fresh(); await tog('b'); await pf('georgia'); type('aa');
await pf('courier'); type('bb');
saveNow(); await sleep(60);
go('notes'); go('editor'); await sleep(80);
ok('font bertahan', petaFont().join('|')==='georgia:aa|courier:bb', `font=${JSON.stringify(petaFont())}`);
ok('bold bertahan', !!DOC().querySelector('b,strong'));
console.log('══ 6. span font kosong dibersihkan ══');
fresh(); await tog('b');
await pf('georgia'); await pf('courier'); await pf('verdana');
type('z');
const kosong=[...BLK().querySelectorAll('.fnt')].filter(x=>x.textContent==='');
ok('tidak ada span font kosong', kosong.length===0, `jumlah=${kosong.length} html=${JSON.stringify(BLK().innerHTML)}`);
console.log(F?`\n${F} GAGAL / ${P+F}`:`\nSEMUA ${P} LOLOS`);
