import {JSDOM} from 'jsdom';
import fs from 'fs';
import { indexedDB as fakeIDB } from 'fake-indexeddb';
import path from 'path';
import { fileURLToPath } from 'url';
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
const {saveNow}=await import(`${AKAR}/docs/notes/editor/cleanup.js?v=${V}`);
const {state}=await import(`${AKAR}/docs/core/store.js?v=${V}`);
const NM=await import(`${AKAR}/docs/notes/note-model.js?v=${V}`);
const d=w.document,SEL=w.getSelection();
const click=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
const mb=m=>d.querySelector(`.mb[data-m="${m}"]`);
const gb=g=>d.querySelector(`.mb-g[data-g="${g}"]`);
const DOC=()=>d.querySelector('.ed-doc');
const sleep=(ms=25)=>new Promise(r=>setTimeout(r,ms));
let kurang=[];
const cek=(n,c,det)=>{ if(!c) kurang.push(n+(det?' → '+det:'')); };
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
  d.dispatchEvent(new w.Event('selectionchange'));}
const type=s=>{for(const c of s)ins(c);};
const blk=()=>{saveNow();return state.notes.find(x=>x.id===state.openId).blocks;};

console.log('══ Editor dasar: acceptance criteria ══\n');
/* 1. tipe blok */
const TIPE=[['h','heading'],['h2','heading'],['h3','heading'],['li','bullet'],
            ['ol','ordered-list'],['todo','todo'],['quote','quote'],['code','code']];
for(const [m,tipe] of TIPE){
  fresh(); type('isi');
  click(gb(m==='h'||m==='h2'||m==='h3'||m==='quote'||m==='code'?'gaya':'daftar'));
  const it=d.querySelector(`#pop .pop-i[data-m="${m}"]`);
  if(it){click(it);await sleep();}
  const b=blk()[0];
  cek(`tipe ${m} -> ${tipe}`, b.type===tipe, `dapat "${b.type}"`);
}
fresh(); type('x'); click(gb('sisip'));
const hrIt=d.querySelector('#pop .pop-i[data-m="hr"]'); if(hrIt){click(hrIt);await sleep();}
cek('divider jadi type=divider', blk().some(b=>b.type==='divider'), JSON.stringify(blk().map(b=>b.type)));

/* 2. Enter membuat block ID baru */
fresh(); type('Hello');
const idSblm=blk()[0].id;
const cur=DOC().firstElementChild;
const ev=new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true});
DOC().dispatchEvent(ev);
if(!ev.defaultPrevented){
  const nb=d.createElement('div');nb.className=cur.className;cur.after(nb);
  const t=d.createTextNode('');nb.appendChild(t);
  const r=d.createRange();r.setStart(t,0);r.collapse(true);
  SEL.removeAllRanges();SEL.addRange(r);
  DOC().dispatchEvent(new w.Event('input',{bubbles:true}));}
await sleep();
const stlh=blk();
cek('Enter -> 2 blok', stlh.length===2, `dapat ${stlh.length}`);
cek('blok lama pertahankan ID', stlh[0] && stlh[0].id===idSblm);
cek('blok baru dapat ID beda', stlh[1] && stlh[1].id!==idSblm);

/* 3. ubah tipe pertahankan ID */
fresh(); type('judul');
const idP=blk()[0].id;
click(gb('gaya')); const hIt=d.querySelector('#pop .pop-i[data-m="h"]');
if(hIt){click(hIt);await sleep();}
cek('ubah tipe pertahankan ID', blk()[0].id===idP, `${idP} -> ${blk()[0].id}`);

/* 4. todo meta.checked */
fresh(); type('tugas');
click(gb('daftar')); const tIt=d.querySelector('#pop .pop-i[data-m="todo"]');
if(tIt){click(tIt);await sleep();}
let b0=blk()[0];
cek('todo: content bersih tanpa [ ]', !/\[[ x]\]/.test(b0.content), JSON.stringify(b0.content));
cek('todo: meta.checked=false', b0.meta.checked===false, JSON.stringify(b0.meta));
const cbx=DOC().querySelector('.cbx');
if(cbx){click(cbx);await sleep();}
b0=blk()[0];
cek('centang -> meta.checked=true', b0.meta.checked===true, JSON.stringify(b0.meta));
cek('centang tidak ubah content', b0.content.indexOf('tugas')>=0, JSON.stringify(b0.content));

/* 5. slash menu */
fresh(); type('x');
if(mb('slash')) { click(mb('slash')); await sleep(); }
else cek('tombol slash ada di bar', false, '(tombol / tidak ada)');
const items=[...d.querySelectorAll('#pop [data-blk]')];
cek('slash punya 13 blok/aksi dasar', items.length>=13, `ada ${items.length}`);
const label=items.map(x=>x.textContent.trim()).join('|');
for(const perlu of ['Teks','Heading 1','Heading 2','Heading 3','Daftar','bernomor','To-do','Kutipan','Kode','Pembatas'])
  cek(`slash punya "${perlu}"`, label.includes(perlu));
cek('slash: Gambar ada', /Gambar/i.test(label), label.slice(0,80));
cek('slash: Tanggal hari ini & Warna tag ada (B13)',
  /Tanggal hari ini/.test(label) && /Warna tag/.test(label), label.slice(0,160));
cek('slash: TANPA Callout (menu khusus, bukan blok dasar)', !/Callout/.test(label), label.slice(0,160));
/* ketik "/" memicu menu? */
fresh(); ins('/');
cek('ketik "/" membuka menu', d.getElementById('pop').classList.contains('on'));
/* tutup supaya tes filter mulai dari keadaan bersih */
{ const ke=new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true});
  DOC().dispatchEvent(ke); }
/* filter */
fresh(); ins('/');
const semuaSlash=d.querySelectorAll('#pop [data-blk]').length;
for(const c of 'head') ins(c);
const terfilter=[...d.querySelectorAll('#pop [data-blk]')];
cek('slash bisa difilter', terfilter.length>0 && terfilter.length<semuaSlash,
    `dari ${semuaSlash} jadi ${terfilter.length}`);
/* keyboard nav */
const kev=new w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true});
d.dispatchEvent(kev);
cek('slash: navigasi keyboard', kev.defaultPrevented || !!d.querySelector('#pop .pop-i.sel'));

/* 6. link */
cek('tombol link ada', !!mb('link'));
/* 7. underline */
fresh(); click(gb('tandai')); await sleep();
cek('underline didukung', !!d.querySelector('#pop .pop-i[data-m="u"]'), '(tidak ada di menu Penandaan)');
const uIt=d.querySelector('#pop .pop-i[data-m="u"]');
if(uIt){ click(uIt); await sleep(); type('garis');
  cek('underline terpasang', !!DOC().querySelector('u'), JSON.stringify(DOC().innerHTML)); }

console.log(kurang.length? 'BELUM TERPENUHI ('+kurang.length+'):' : 'SEMUA TERPENUHI');
kurang.forEach(x=>console.log('  ✗',x));
