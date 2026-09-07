/* Simulasi browser yang JAUH lebih agresif:
   - normalize() DOM setelah tiap perubahan (browser sungguhan melakukannya)
   - caret ditarik ke elemen inline TERDALAM, termasuk bersarang
   - urutan panjang: ketik-toggle-ketik-toggle berkali-kali */
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
const INLINE=/^(B|I|S|SPAN|CODE|STRONG|EM|STRIKE)$/;
go('notes'); click(d.querySelector('[data-open="w"]'));
function fresh(){DOC().innerHTML='';
  const p=d.createElement('div');p.className='b-p';DOC().appendChild(p);
  const t=d.createTextNode('');p.appendChild(t);
  const r=d.createRange();r.setStart(t,0);r.collapse(true);
  SEL.removeAllRanges();SEL.addRange(r);d.dispatchEvent(new w.Event('selectionchange'));}

/* ── Browser sungguhan: setelah DOM diubah, text node bersebelahan
   digabung, dan caret di batas elemen ditarik ke posisi teks terdekat
   (masuk ke elemen inline TERDALAM). ── */
function normalisasiBrowser(){
  if(!SEL.rangeCount) return;
  const r=SEL.getRangeAt(0);
  let n=r.startContainer, o=r.startOffset;
  if(n.nodeType!==3) return;
  /* caret di AKHIR text node & tetangga sebelumnya elemen inline
     -> tarik ke node teks TERDALAM di dalamnya */
  /* Browser hanya menormalkan caret di node teks KOSONG di batas elemen.
     Node yang sudah berisi teks tidak ditarik keluar. */
  if(n.length!==0) return;
  const prev=n.previousSibling;
  if(o>=n.length && prev && prev.nodeType===1 && INLINE.test(prev.tagName)){
    let deep=prev; while(deep.lastChild) deep=deep.lastChild;
    if(deep.nodeType===3){
      const nr=d.createRange(); nr.setStart(deep,deep.length); nr.collapse(true);
      SEL.removeAllRanges(); SEL.addRange(nr); return;
    }
  }
  /* caret di AWAL text node & tetangga sesudahnya elemen inline
     -> browser kadang menarik ke DALAM awal elemen itu */
  const next=n.nextSibling;
  if(o===0 && n.length===0 && next && next.nodeType===1 && INLINE.test(next.tagName)){
    let deep=next; while(deep.firstChild) deep=deep.firstChild;
    if(deep.nodeType===3){
      const nr=d.createRange(); nr.setStart(deep,0); nr.collapse(true);
      SEL.removeAllRanges(); SEL.addRange(nr);
    }
  }
}
function ins(ch){
  const ev=new w.InputEvent('beforeinput',{bubbles:true,cancelable:true,inputType:'insertText',data:ch});
  DOC().dispatchEvent(ev);
  if(!ev.defaultPrevented){
    const r=SEL.getRangeAt(0);let n=r.startContainer,o=r.startOffset;
    if(n.nodeType===3){n.insertData(o,ch);
      const nr=d.createRange();nr.setStart(n,o+ch.length);nr.collapse(true);
      SEL.removeAllRanges();SEL.addRange(nr);}
    DOC().dispatchEvent(new w.Event('input',{bubbles:true}));}
  normalisasiBrowser();
  d.dispatchEvent(new w.Event('selectionchange'));}
const type=s=>{for(const c of s)ins(c);};
async function tog(m){
  if(GRUP[m]){ click(gb(GRUP[m]));
    const it=d.querySelector(`#pop .pop-i[data-m="${m}"]`); if(it)click(it); await sleep(); }
  else click(mb(m));
  normalisasiBrowser();}
const isiMark=m=>[...DOC().querySelectorAll(SELTOR[m])].map(x=>clean(x.textContent)).join('');
const MARKS=['b','i','hl','strike','icode'];
let gagal=[];
const cek=(nama,syarat,detail)=>{ if(!syarat) gagal.push(nama+(detail?'\n      '+detail:'')); };

console.log('══ H. urutan PANJANG: on/off berulang ══');
for(const m of MARKS){
  fresh();
  await tog(m); type('aa'); await tog(m); type('bb');
  await tog(m); type('cc'); await tog(m); type('dd');
  const teks=clean(DOC().textContent);
  cek(`H/${m} on-off-on-off`, teks==='aabbccdd' && isiMark(m)==='aacc',
      `teks=${JSON.stringify(teks)} mark=${JSON.stringify(isiMark(m))}`);
}
console.log('══ I. bold+italic, semua urutan toggle ══');
for(const urut of [['b','i'],['i','b']])
for(const mati1 of ['b','i']){
  fresh();
  await tog(urut[0]); await tog(urut[1]); type('aaa');
  await tog(mati1); type('bbb');
  const lain=mati1==='b'?'i':'b';
  const teks=clean(DOC().textContent);
  cek(`I/${urut.join('+')} off:${mati1}`,
      teks==='aaabbb' && isiMark(mati1)==='aaa' && isiMark(lain)==='aaabbb',
      `teks=${JSON.stringify(teks)} ${mati1}=${JSON.stringify(isiMark(mati1))} ${lain}=${JSON.stringify(isiMark(lain))}`);
}
console.log('══ J. semua pasangan, ketik panjang ══');
for(const m1 of MARKS) for(const m2 of MARKS){
  if(m1===m2) continue;
  fresh();
  await tog(m1); await tog(m2); type('satu');
  await tog(m2); type('duatiga');
  const teks=clean(DOC().textContent);
  cek(`J/${m1}+${m2}`, teks==='satuduatiga' && isiMark(m2)==='satu' && isiMark(m1)==='satuduatiga',
      `teks=${JSON.stringify(teks)} ${m1}=${JSON.stringify(isiMark(m1))} ${m2}=${JSON.stringify(isiMark(m2))}`);
}
console.log('══ K. nyalakan mark kedua DI TENGAH ══');
for(const m1 of MARKS) for(const m2 of MARKS){
  if(m1===m2) continue;
  fresh();
  await tog(m1); type('aaa');
  await tog(m2); type('bbb');          /* m2 menyusul, m1 masih aktif */
  const teks=clean(DOC().textContent);
  cek(`K/${m1} lalu +${m2}`, teks==='aaabbb' && isiMark(m1)==='aaabbb' && isiMark(m2)==='bbb',
      `teks=${JSON.stringify(teks)} ${m1}=${JSON.stringify(isiMark(m1))} ${m2}=${JSON.stringify(isiMark(m2))}`);
}
console.log('\n════════ HASIL ════════');
if(!gagal.length) console.log('SEMUA LOLOS');
else { console.log(gagal.length+' GAGAL:'); gagal.forEach(x=>console.log('  ✗',x)); }
