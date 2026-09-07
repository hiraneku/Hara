/* MATRIKS MENYELURUH pergantian font.
   Menguji SEMUA urutan yang mungkin, dengan simulasi browser yang keras:
   caret ditarik masuk ke span terdekat + span identik digabung. */
import {JSDOM} from 'jsdom';
import fs from 'fs';
import { indexedDB as fakeIDB } from 'fake-indexeddb';
import path from 'path';
import { fileURLToPath } from 'url';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const AKAR=process.cwd();
const dom=new JSDOM(fs.readFileSync('docs/index.html','utf8'),{url:'https://x.test/',pretendToBeVisual:true});
const {window:w}=dom; w.indexedDB=fakeIDB;
for(const k of ['document','getSelection','HTMLElement','Node','Range','MouseEvent','KeyboardEvent','Event','InputEvent','localStorage','Image','Blob'])
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
let P=0,F=0;const gagal=[];
const ok=(n,c,det)=>{c?P++:(F++,gagal.push(n+(det?'\n        '+det:'')));};
const click=el=>el&&el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
const mb=m=>d.querySelector(`.mb[data-m="${m}"]`);
const gb=g=>d.querySelector(`.mb-g[data-g="${g}"]`);
const DOC=()=>d.querySelector('.ed-doc');
const BLK=()=>DOC().firstElementChild;
const sleep=(ms=18)=>new Promise(r=>setTimeout(r,ms));
const GRUP={hl:'tandai',strike:'tandai',icode:'tandai',u:'tandai'};
const INLINE=/^(B|I|S|U|SPAN|CODE|STRONG|EM)$/;
const sig=el=>el.nodeType!==1?null:el.tagName+'|'+(el.getAttribute('class')||'')+'|'+(el.getAttribute('data-font')||'');
function gabung(root){let u=true;while(u){u=false;
  for(const par of [root,...root.querySelectorAll('*')]){let n=par.firstChild;
    while(n&&n.nextSibling){const a=n,b=n.nextSibling;
      if(a.nodeType===1&&b.nodeType===1&&sig(a)&&sig(a)===sig(b)&&INLINE.test(a.tagName)){
        while(b.firstChild)a.appendChild(b.firstChild);b.remove();u=true;}else n=n.nextSibling;}}}
  root.normalize();}
function tarik(){
  if(!SEL.rangeCount)return;
  const r=SEL.getRangeAt(0);const n=r.startContainer;
  if(n.nodeType!==3||n.length!==0)return;
  const prev=n.previousSibling;
  if(prev&&prev.nodeType===1&&INLINE.test(prev.tagName)){
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
  gabung(DOC()); tarik(); d.dispatchEvent(new w.Event('selectionchange'));}
const type=s=>{for(const c of s)ins(c);};
const pf=async id=>{click(gb('huruf'));
  const it=d.querySelector(`#pop [data-font="${id}"]`);
  if(!it){ok('tombol font '+id,false,'tidak ada');return;}
  click(it);await sleep();gabung(DOC());tarik();
  d.dispatchEvent(new w.Event('selectionchange'));};
async function tog(m){
  if(GRUP[m]){click(gb(GRUP[m]));const it=d.querySelector(`#pop .pop-i[data-m="${m}"]`);if(it)click(it);await sleep();}
  else click(mb(m));
  gabung(DOC());tarik();d.dispatchEvent(new w.Event('selectionchange'));}
/* font efektif pada sepotong teks = span .fnt TERDEKAT yang membungkusnya */
function fontEfektif(teks){
  const jalan=d.createTreeWalker(BLK(),4,null);let n;
  while((n=jalan.nextNode())){
    if(!n.data.includes(teks))continue;
    let p=n.parentNode;
    while(p&&p!==BLK()){
      if(p.classList&&p.classList.contains('fnt'))return p.getAttribute('data-font');
      p=p.parentNode;}
    return '';           /* tidak dibungkus span font = bawaan */
  }
  return null;           /* teks tidak ditemukan */
}
const FONTS=['georgia','courier','verdana','arial','tahoma','impact'];
const MARKS=['b','i','u','hl','strike','icode'];

console.log('══ A. bawaan setelah SATU font ══');
for(const f of FONTS){
  fresh(); await pf(f); type('aa');
  await pf(''); type('bb');
  ok(`A/${f}->bawaan`, fontEfektif('bb')==='' && BLK().textContent==='aabb',
     `bb pakai "${fontEfektif('bb')}" teks=${JSON.stringify(BLK().textContent)}`);
}
console.log('══ B. bawaan setelah DUA font berturut ══');
for(const f1 of FONTS) for(const f2 of FONTS){
  if(f1===f2) continue;
  fresh(); await pf(f1); type('aa'); await pf(f2); type('bb');
  await pf(''); type('cc');
  ok(`B/${f1},${f2}->bawaan`, fontEfektif('cc')==='' && BLK().textContent==='aabbcc',
     `cc pakai "${fontEfektif('cc')}" teks=${JSON.stringify(BLK().textContent)}`);
}
console.log('══ C. bawaan setelah TIGA font ══');
for(const [f1,f2,f3] of [['georgia','courier','verdana'],['arial','tahoma','impact'],
                          ['courier','georgia','arial'],['impact','verdana','tahoma']]){
  fresh(); await pf(f1); type('aa'); await pf(f2); type('bb'); await pf(f3); type('cc');
  await pf(''); type('dd');
  ok(`C/${f1},${f2},${f3}->bawaan`, fontEfektif('dd')==='' && BLK().textContent==='aabbccdd',
     `dd pakai "${fontEfektif('dd')}" teks=${JSON.stringify(BLK().textContent)}`);
}
console.log('══ D. bawaan BERKALI-KALI ══');
for(const f of FONTS){
  fresh(); await pf(f); type('aa');
  await pf(''); type('bb');
  await pf(''); type('cc');
  ok(`D/${f} bawaan 2x`, fontEfektif('bb')==='' && fontEfektif('cc')==='' && BLK().textContent==='aabbcc',
     `bb="${fontEfektif('bb')}" cc="${fontEfektif('cc')}"`);
}
console.log('══ E. font -> bawaan -> font lagi ══');
for(const f1 of FONTS) for(const f2 of FONTS){
  if(f1===f2) continue;
  fresh(); await pf(f1); type('aa'); await pf(''); type('bb'); await pf(f2); type('cc');
  ok(`E/${f1}->bawaan->${f2}`,
     fontEfektif('aa')===f1 && fontEfektif('bb')==='' && fontEfektif('cc')===f2 && BLK().textContent==='aabbcc',
     `aa="${fontEfektif('aa')}" bb="${fontEfektif('bb')}" cc="${fontEfektif('cc')}"`);
}
console.log('══ F. GANTI font tanpa mengetik di antara ══');
for(const [f1,f2,f3] of [['georgia','courier','verdana'],['arial','impact','tahoma']]){
  fresh(); await pf(f1); await pf(f2); await pf(f3); type('aa');
  ok(`F/${f1},${f2},${f3} tanpa ketik`, fontEfektif('aa')===f3,
     `aa pakai "${fontEfektif('aa')}" harus ${f3}`);
  fresh(); await pf(f1); await pf(''); type('bb');
  ok(`F/${f1}->bawaan tanpa ketik`, fontEfektif('bb')==='', `bb pakai "${fontEfektif('bb')}"`);
}
console.log('══ G. bawaan saat MARK aktif ══');
for(const m of MARKS){
  fresh(); await tog(m); await pf('georgia'); type('aa');
  await pf(''); type('bb');
  ok(`G/${m}+font->bawaan`, fontEfektif('bb')==='' && BLK().textContent==='aabb',
     `bb pakai "${fontEfektif('bb')}" teks=${JSON.stringify(BLK().textContent)}`);
}
console.log('══ H. bawaan lalu MARK berubah ══');
for(const m of MARKS){
  fresh(); await pf('courier'); type('aa'); await pf('');
  await tog(m); type('bb');
  ok(`H/bawaan lalu ${m}`, fontEfektif('bb')==='' && BLK().textContent==='aabb',
     `bb pakai "${fontEfektif('bb')}"`);
}
console.log('══ I. bawaan di blok TANPA font ══');
fresh(); type('aa'); await pf(''); type('bb');
ok('I/bawaan pada teks polos', fontEfektif('bb')==='' && BLK().textContent==='aabb',
   `bb="${fontEfektif('bb')}" teks=${JSON.stringify(BLK().textContent)}`);
console.log('══ J. bawaan setelah pindah blok ══');
fresh(); await pf('georgia'); type('aa');
{ const p2=d.createElement('div');p2.className='b-p';
  const t2=d.createTextNode('bb');p2.appendChild(t2);DOC().appendChild(p2);
  const r=d.createRange();r.setStart(t2,2);r.collapse(true);
  SEL.removeAllRanges();SEL.addRange(r);d.dispatchEvent(new w.Event('selectionchange')); }
await pf(''); type('cc');
ok('J/blok kedua pakai bawaan',
   !DOC().children[1].querySelector('.fnt') || DOC().children[1].textContent==='bbcc',
   `html=${JSON.stringify(DOC().children[1].innerHTML)}`);
console.log('══ K. bawaan lalu SIMPAN & muat ulang ══');
fresh(); await pf('georgia'); type('aa'); await pf(''); type('bb');
saveNow(); await sleep(60); go('notes'); go('editor'); await sleep(80);
ok('K/bertahan setelah reload', fontEfektif('bb')==='' && fontEfektif('aa')==='georgia',
   `aa="${fontEfektif('aa')}" bb="${fontEfektif('bb')}"`);
console.log('══ L. menu menampilkan pilihan yang BENAR ══');
const dicentang=()=>{click(gb('huruf'));const on=d.querySelector('#pop .pop-font.on');
  const v=on?on.dataset.font:'(none)';click(gb('huruf'));return v;};
for(const f of ['georgia','courier','arial']){
  fresh(); await pf(f); type('aa');
  ok(`L/menu tunjuk ${f}`, dicentang()===f, `tercentang="${dicentang()}"`);
  await pf('');
  ok(`L/menu tunjuk bawaan setelah ${f}`, dicentang()==='', `tercentang="${dicentang()}"`);
}
console.log('══ M. span font BERSARANG (akar bug "font sebelumnya") ══');
{
  const FT=await import(`${AKAR}/docs/notes/editor/font.js?v=${V}`);
  /* dua lapis */
  DOC().innerHTML='<div class="b-p"><span class="fnt" data-font="georgia">luar'+
    '<span class="fnt" data-font="courier">dalam</span></span></div>';
  let blk=DOC().firstElementChild;
  let dalam=blk.querySelector('[data-font="courier"]');
  let t=dalam.firstChild;
  let r=d.createRange(); r.setStart(t,t.length); r.collapse(true);
  SEL.removeAllRanges(); SEL.addRange(r); d.dispatchEvent(new w.Event('selectionchange'));
  FT.keluarDariFont();
  let p=SEL.getRangeAt(0).startContainer; if(p.nodeType===3)p=p.parentNode;
  let sisa=[]; while(p&&p!==blk){ if(p.classList&&p.classList.contains('fnt'))sisa.push(p.dataset.font); p=p.parentNode; }
  ok('M/keluar dari 2 lapis bersarang', sisa.length===0, `masih di dalam: ${JSON.stringify(sisa)}`);

  /* tiga lapis */
  DOC().innerHTML='<div class="b-p"><span class="fnt" data-font="arial">a'+
    '<span class="fnt" data-font="georgia">b<span class="fnt" data-font="courier">c</span></span></span></div>';
  blk=DOC().firstElementChild;
  dalam=blk.querySelector('[data-font="courier"]');
  t=dalam.firstChild;
  r=d.createRange(); r.setStart(t,t.length); r.collapse(true);
  SEL.removeAllRanges(); SEL.addRange(r); d.dispatchEvent(new w.Event('selectionchange'));
  FT.keluarDariFont();
  p=SEL.getRangeAt(0).startContainer; if(p.nodeType===3)p=p.parentNode;
  sisa=[]; while(p&&p!==blk){ if(p.classList&&p.classList.contains('fnt'))sisa.push(p.dataset.font); p=p.parentNode; }
  ok('M/keluar dari 3 lapis bersarang', sisa.length===0, `masih di dalam: ${JSON.stringify(sisa)}`);

  /* mengetik setelah keluar dari sarang -> harus BAWAAN */
  DOC().innerHTML='<div class="b-p"><span class="fnt" data-font="georgia">aa'+
    '<span class="fnt" data-font="courier">bb</span></span></div>';
  blk=DOC().firstElementChild;
  dalam=blk.querySelector('[data-font="courier"]');
  t=dalam.firstChild;
  r=d.createRange(); r.setStart(t,t.length); r.collapse(true);
  SEL.removeAllRanges(); SEL.addRange(r); d.dispatchEvent(new w.Event('selectionchange'));
  await pf(''); type('cc');
  ok('M/ketik setelah bawaan di sarang', fontEfektif('cc')==='',
     `cc pakai "${fontEfektif('cc')}" html=${JSON.stringify(BLK().innerHTML)}`);

  /* cleanup meratakan sarang */
  DOC().innerHTML='<div class="b-p"><span class="fnt" data-font="georgia">'+
    '<span class="fnt" data-font="courier">x</span></span></div>';
  blk=DOC().firstElementChild;
  t=blk.querySelector('[data-font="courier"]').firstChild;
  r=d.createRange(); r.setStart(t,1); r.collapse(true);
  SEL.removeAllRanges(); SEL.addRange(r);
  DOC().dispatchEvent(new w.Event('input',{bubbles:true}));
  await sleep(30);
  ok('M/cleanup meratakan sarang', DOC().querySelectorAll('.fnt .fnt').length===0,
     `html=${JSON.stringify(BLK().innerHTML)}`);
}

console.log('\n════════ HASIL ════════');
if(!gagal.length) console.log(`SEMUA ${P} LOLOS`);
else { console.log(`${F} GAGAL / ${P+F}`); gagal.slice(0,25).forEach(x=>console.log('  ✗',x)); }
