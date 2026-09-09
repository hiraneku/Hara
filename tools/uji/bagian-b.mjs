import {JSDOM} from 'jsdom';
import fs from 'fs';
import { indexedDB as fakeIDB } from 'fake-indexeddb';
import path from 'path';
import { fileURLToPath } from 'url';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const AKAR=process.cwd();

const dom=new JSDOM(fs.readFileSync('docs/index.html','utf8'),{url:'https://x.test/',pretendToBeVisual:true});
const {window:w}=dom; w.indexedDB=fakeIDB;
for(const k of ['document','getSelection','HTMLElement','Node','Range','MouseEvent','KeyboardEvent','Event','InputEvent','localStorage','Image','NodeFilter'])
  if(w[k]!==undefined) globalThis[k]=w[k];
globalThis.window=w; globalThis.self=w; globalThis.indexedDB=w.indexedDB;
globalThis.addEventListener=w.addEventListener.bind(w);
Object.defineProperty(globalThis,'navigator',{value:w.navigator,configurable:true});
w.URL.createObjectURL=()=>'blob:x/1';w.URL.revokeObjectURL=()=>{};globalThis.URL=w.URL;
const V=fs.readFileSync('docs/app.js','utf8').match(/\?v=(\d+)/)[1];
const st=(...p)=>import(`${AKAR}/docs/${p.join('/')}?v=${V}`);
await st('app.js');
const {state}=await st('core/store.js');
const nmdl=await st('notes/note-model.js');
const {makeNote,makeBlock}=nmdl;
const d=w.document;
const sleep=(ms=15)=>new Promise(r=>setTimeout(r,ms));
let gagal=0;
const oke=(nama,baik,det='')=>{ if(!baik){gagal++;console.log('FAIL',nama,det?'\n      '+det:'');} else console.log('ok  ',nama); };
const klik=el=>{ if(el) el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,view:w})); };

state.notes.splice(0);
const lama=Date.now()-86400000;
state.notes.push(makeNote({id:'b1',title:'Zebra',pinned:true,createdAt:lama,updatedAt:lama,blocks:[makeBlock({type:'paragraph',content:'x'})]}));
state.notes.push(makeNote({id:'b2',title:'Apel',createdAt:lama,updatedAt:Date.now(),blocks:[makeBlock({type:'paragraph',content:'x'})]}));
state.notes.push(makeNote({id:'b3',title:'Mangga',createdAt:Date.now(),updatedAt:lama,blocks:[makeBlock({type:'paragraph',content:'x'})]}));
const kini=Date.now();
state.notes.push(makeNote({id:'b4',title:'Proyek',createdAt:kini-2000,updatedAt:lama-3*86400000,tags:['kerja','pribadi'],blocks:[
  makeBlock({type:'paragraph',content:'x'}),
  makeBlock({type:'todo',content:'besok rapat final'}),
  makeBlock({type:'todo',content:'hari ini kirim laporan'}),
  makeBlock({type:'todo',content:'jumat review'}),
]}));
state.notes.push(makeNote({id:'b5',title:'Artikel',createdAt:kini-3000,updatedAt:lama-4*86400000,blocks:[
  makeBlock({type:'heading',content:'Pendahuluan',meta:{level:1}}),
  makeBlock({type:'paragraph',content:'isi'}),
  makeBlock({type:'heading',content:'Metode',meta:{level:2}}),
  makeBlock({type:'paragraph',content:'isi'}),
]}));

/* ── B7 urut ── */
const router=await st('core/router.js');
const urut=await st('notes/urut.js');
router.go('notes'); await sleep(30);
const ambilJudul=()=>Array.from(d.querySelectorAll('.row[data-open]')).map(r=>r.querySelector('.row-t').textContent.trim());
oke('B7a chip urut ada & default Terakhir diedit', !!d.querySelector('[data-urut-buka]') &&
  d.querySelector('[data-urut-buka] b').textContent==='Terakhir diedit');
urut.setUrut('az'); router.go('notes'); await sleep(30);
oke('B7b urut A–Z (pin tetap atas)', JSON.stringify(ambilJudul())===JSON.stringify(['Zebra','Apel','Artikel','Mangga','Proyek']), JSON.stringify(ambilJudul()));
urut.setUrut('buat'); router.go('notes'); await sleep(30);
oke('B7c urut Terbaru dibuat', JSON.stringify(ambilJudul())===JSON.stringify(['Zebra','Mangga','Proyek','Artikel','Apel']), JSON.stringify(ambilJudul()));
urut.setUrut('edit'); router.go('notes'); await sleep(30);
oke('B7d urut Terakhir diedit', JSON.stringify(ambilJudul())===JSON.stringify(['Zebra','Apel','Mangga','Proyek','Artikel']), JSON.stringify(ambilJudul()));
const chipKerja=Array.from(d.querySelectorAll('.row[data-open="b4"] .tg-chip')).find(c=>c.getAttribute('data-tag')==='kerja');
klik(chipKerja); await sleep(40);
const jdlFilter=()=>Array.from(d.querySelectorAll('.row[data-open]')).map(r=>r.querySelector('.row-t').textContent.trim());
oke('B7e klik chip tag memfilter daftar', JSON.stringify(jdlFilter())===JSON.stringify(['Proyek']), JSON.stringify(jdlFilter()));
const bx=Array.from(d.querySelectorAll('[data-tag-x]'))[0];
oke('B7f ada tombol lepas filter', !!bx);
if(bx){ klik(bx); await sleep(30); }
oke('B7g lepas filter kembali semua', jdlFilter().length===5, JSON.stringify(jdlFilter()));

/* ── B9 layar Tugas & Reminder ── */
router.go('task'); await sleep(30);
oke('B9a layar Tugas menampilkan tenggat', d.body.textContent.includes('rapat final') &&
  d.body.textContent.includes('kirim laporan') && d.body.textContent.includes('review'),
  d.body.textContent.slice(0,220));
router.go('rem'); await sleep(30);
oke('B9b Reminder menampilkan yang hari ini', d.body.textContent.includes('kirim laporan') &&
  !d.body.textContent.includes('rapat final'));
router.go('notes'); await sleep(20);
klik(d.querySelector('.row[data-open="b4"]')); await sleep(40);
const doc=()=>d.querySelector('.ed-doc');
const rapat=Array.from(doc().querySelectorAll('.b-todo')).find(x=>x.textContent.includes('rapat final'));
klik(rapat.querySelector('.cbx')); await sleep(50);
router.go('rem'); await sleep(30);
oke('B9c todo dicentang tidak muncul di Reminder', !d.body.textContent.includes('rapat final'));

/* ── B8 daftar isi ── */
router.go('notes'); await sleep(20);
klik(d.querySelector('.row[data-open="b5"]')); await sleep(50);
const ea=d.querySelector('[data-et="dafis"]');
oke('B8a tombol daftar isi ada', !!ea);
klik(ea); await sleep(20);
const daf=Array.from(d.querySelectorAll('[data-daf-i]'));
oke('B8b daftar isi berisi 2 heading', daf.length===2 && daf[0].textContent.includes('Pendahuluan'), 'jml='+daf.length);
klik(daf[1]); await sleep(20);
oke('B8c pilihan menutup popup', !d.getElementById('pop').classList.contains('on'));

/* ── B10 warna tag ── */
const n4=state.notes.find(x=>x.id==='b4');
n4.blocks.push(makeBlock({type:'paragraph',content:'<span class="tg">#kerja</span> lalu <span class="tg">#pribadi</span>'}));
router.go('notes'); await sleep(20);
const baris4=()=>Array.from(d.querySelectorAll('.row[data-open="b4"] .tg-chip')).map(c=>c.textContent);
oke('B10a chip baris menampilkan tag', baris4().length>=2, JSON.stringify(baris4()));
const chip1=Array.from(d.querySelectorAll('.row[data-open="b4"] .tg-chip')).find(c=>c.getAttribute('data-tag')==='kerja');
oke('B10b chip berwarna dari hash', !!chip1 && chip1.getAttribute('data-tt') && chip1.getAttribute('data-tt')!=='', chip1?chip1.outerHTML.slice(0,120):'');
klik(d.querySelector('.row[data-open="b4"]')); await sleep(50);
const spTag=()=>Array.from(doc().querySelectorAll('span.tg'));
oke('B10c span.tg di editor punya data-tt', spTag().length>=2 && spTag().every(s=>s.getAttribute('data-tt')), 'jml='+spTag().length);

/* ── B11 templat (sudah ada) — menu ··· punya Simpan sebagai templat ── */
router.go('editor'); await sleep(30);
const {menuCatatan}=await st('notes/menus/note-menu.js');
const mn=menuCatatan();
oke('B11a menu catatan punya Simpan sebagai templat', mn.includes('tpl') && mn.includes('templat'));

/* ── B12 jurnal hari ini ── */
const hr=await st('notes/harian.js');
router.go('home'); await sleep(30);
oke('B12a tombol jurnal di beranda', !!d.querySelector('[data-jurnal-hari]'));
klik(d.querySelector('[data-jurnal-hari]')); await sleep(50);
oke('B12b jurnal dibuat & terbuka', d.querySelector('.ed-t') && state.openId &&
  state.notes.find(x=>x.id===state.openId).title.startsWith('Jurnal'),
  (state.notes.find(x=>x.id===state.openId)||{}).title);
const jml=state.notes.filter(x=>x.title && x.title.startsWith('Jurnal')).length;
router.go('home'); await sleep(20);
klik(d.querySelector('[data-jurnal-hari]')); await sleep(40);
oke('B12c tidak membuat jurnal ganda', jml===1 && state.notes.filter(x=>x.title && x.title.startsWith('Jurnal')).length===1);

/* ── B13 slash tambahan ── */
const {SLASH}=await st('notes/menus/slash.js');
const nma=SLASH.map(x=>x[1]);
oke('B13a slash memuat Tanggal hari ini & Warna tag', nma.includes('Tanggal hari ini') && nma.includes('Warna tag…'), nma.join('|'));

const SEL=w.getSelection();
const DOC=()=>d.querySelector('.ed-doc');
function fresh(){ DOC().innerHTML='';
  const p=d.createElement('div'); p.className='b-p'; DOC().appendChild(p);
  const t=d.createTextNode(''); p.appendChild(t);
  const r=d.createRange(); r.setStart(t,0); r.collapse(true);
  SEL.removeAllRanges(); SEL.addRange(r);
  d.dispatchEvent(new w.Event('selectionchange')); }
function ins(ch){
  const ev=new w.InputEvent('beforeinput',{bubbles:true,cancelable:true,inputType:'insertText',data:ch});
  DOC().dispatchEvent(ev);
  if(!ev.defaultPrevented){
    const r=SEL.getRangeAt(0); const n=r.startContainer,o=r.startOffset;
    if(n.nodeType===3){ n.insertData(o,ch);
      const nr=d.createRange(); nr.setStart(n,o+ch.length); nr.collapse(true);
      SEL.removeAllRanges(); SEL.addRange(nr); }
    else { const t=d.createTextNode(ch); n.insertBefore(t,n.childNodes[o]||null);
      const nr=d.createRange(); nr.setStart(t,1); nr.collapse(true);
      SEL.removeAllRanges(); SEL.addRange(nr); }
    DOC().dispatchEvent(new w.Event('input',{bubbles:true})); }
  d.dispatchEvent(new w.Event('selectionchange')); }
const type=s=>{ for(const c of s) ins(c); };
router.go('notes'); await sleep(20);
klik(d.querySelector('.row[data-open="b4"]')); await sleep(50);
fresh(); type('/'); await sleep(30);
const itemTanggal=d.querySelector('#pop .pop-i[data-blk="date"]');
const itemWarna=d.querySelector('#pop .pop-i[data-blk="tagwarna"]');
oke('B13b menu / menampilkan kedua aksi', !!itemTanggal && !!itemWarna);
if(itemTanggal){ klik(itemTanggal); await sleep(30); }
oke('B13c aksi Tanggal menyisipkan tanggal', /20\d\d/.test(DOC().textContent), DOC().textContent.slice(0,60));
type('halo '); type('/'); await sleep(30);
const it2=d.querySelector('#pop .pop-i[data-blk="tagwarna"]');
if(it2){ klik(it2); await sleep(40); }
oke('B13d aksi Warna tag membuka panel tag catatan',
  d.getElementById('pop').classList.contains('on') &&
  /Warna tag catatan/.test(d.getElementById('pop').textContent) &&
  d.getElementById('pop').textContent.includes('kerja'),
  d.getElementById('pop').textContent.slice(0,120));
const p1=d.querySelector('#pop [data-tag-w]');
if(p1){ klik(p1); await sleep(30); }
oke('B13e pilih tag → palet warna', /tl-s/.test(d.getElementById('pop').innerHTML) &&
  /data-tl-k/.test(d.getElementById('pop').innerHTML),
  d.getElementById('pop').innerHTML.slice(0,100));
const sw=d.querySelector('#pop [data-tl-k]');
if(sw){ klik(sw); await sleep(40); }
oke('B13f warna tersimpan ke catatan', !!(state.notes.find(x=>x.id==='b4').warna||{})['kerja'],
  JSON.stringify((state.notes.find(x=>x.id==='b4').warna||{})));
oke('B13g popup tertutup setelah pilih', !d.getElementById('pop').classList.contains('on'));
router.go('notes'); await sleep(30);
const chipWarna=Array.from(d.querySelectorAll('.row[data-open="b4"] .tg-chip')).find(c=>c.getAttribute('data-tag')==='kerja');
oke('B13h chip daftar memakai warna manual', !!chipWarna && chipWarna.getAttribute('data-tt')==='slate',
  chipWarna?chipWarna.outerHTML.slice(0,120):'tidak ada');

/* akses Pengaturan dari header (semua ukuran layar) */
const setBtn=d.getElementById('setbtn');
oke('H1a tombol gear di header', !!setBtn && setBtn.getAttribute('data-go')==='set');
router.go('home'); await sleep(20);
klik(setBtn); await sleep(40);
oke('H1b gear membuka halaman Pengaturan',
  (d.getElementById('title').textContent||'').includes('Pengaturan') && !!d.getElementById('bar-prefs'),
  d.getElementById('title').textContent);
/* tombol Kembali di Pengaturan */
oke('H1c panah kembali tampil di header Pengaturan',
  d.getElementById('back').style.display==='grid');
const kbRow=d.querySelector('[data-kembali-set]');
oke('H1d ada baris Kembali di halaman Pengaturan', !!kbRow && /Kembali/.test(kbRow.textContent),
  kbRow?kbRow.textContent:'tidak ada');
klik(kbRow); await sleep(40);
oke('H1e Kembali pulang ke layar asal (home)',
  (d.getElementById('title').textContent||'').includes('Beranda'),
  d.getElementById('title').textContent);

console.log(gagal?`ADA ${gagal} GAGAL`:'SEMUA B-SMOKE OK');
process.exit(gagal?1:0);
