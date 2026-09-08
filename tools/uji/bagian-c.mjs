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
const {makeNote,makeBlock}=await st('notes/note-model.js');
const {openNote}=await st('notes/model.js');
const {simpanBlob}=await st('core/blobs.js');
const router=await st('core/router.js');
const d=w.document;
const sleep=(ms=15)=>new Promise(r=>setTimeout(r,ms));
let gagal=0;
const oke=(nama,baik,det='')=>{ if(!baik){gagal++;console.log('FAIL',nama,det?'\n      '+det:'');} else console.log('ok  ',nama); };
const klik=el=>{ if(el) el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,view:w})); };

state.notes.splice(0);
await simpanBlob('c1', new w.Blob(['xx'], {type:'image/png'}));
state.notes.push(makeNote({id:'k1',title:'Catatan Bergambar',blocks:[
  makeBlock({type:'image',content:'',meta:{blobId:'c1',alt:'foto lama',w:60,rot:15,align:'r'}}),
  makeBlock({type:'paragraph',content:'teks mengalir di sisi gambar'}),
  makeBlock({type:'todo',content:'catat'}),
]}));
state.notes.push(makeNote({id:'k2',title:'Tanpa Gambar',blocks:[
  makeBlock({type:'paragraph',content:'polos'}),
]}));

/* ── C16 thumbnail di daftar ── */
router.go('notes'); await sleep(80);
const row1=()=>d.querySelector('.row[data-open="k1"]');
const row2=()=>d.querySelector('.row[data-open="k2"]');
const th1=()=>row1() && row1().querySelector('img.row-th[data-blob="c1"]');
oke('C16a baris catatan bergambar punya img thumbnail', !!th1());
oke('C16b catatan tanpa gambar tidak punya thumbnail', !row2().querySelector('.row-th'));
oke('C16c thumbnail dipasang src-nya (objectURL)', !!th1() && !!th1().getAttribute('src'),
  th1() && th1().outerHTML.slice(0,120));

/* ── C14 ganti gambar ── */
await openNote('k1'); await sleep(120);
const DOC=()=>d.querySelector('.ed-doc');
const fig=()=>DOC().querySelector('.b-img');
oke('C14a editor memuat gambar (blob c1)', !!DOC().querySelector('img[data-blob="c1"][src]'));
const bar=()=>d.getElementById('mbar');
const gantiBtn=()=>bar() && bar().querySelector('[data-mganti]');
/* pemilihan gambar dilakukan lewat pointerdown (lihat tata-gambar.js) */
const klikP=el=>{ if(el) el.dispatchEvent(new w.MouseEvent('pointerdown',{bubbles:true,cancelable:true,button:0})); };
klikP(fig()); await sleep(30);
oke('C14b gambar terpilih + bilah mini punya tombol ganti',
  fig().classList.contains('img-pilih') && !!gantiBtn(), bar()?bar().innerHTML.slice(0,150):'');
/* klik tombol ganti → pemilih berkas dibuat (input file) */
klik(gantiBtn()); await sleep(20);
oke('C14c tombol ganti membuka pemilih berkas',
  !!d.querySelector('input[type="file"]'));
const inp=d.querySelector('input[type="file"]'); if(inp) inp.remove();

/* ganti isi gambar lewat jalur inti (file tiruan; Image dibuat instan) */
const AsliImage=globalThis.Image;
class ImgCepat {
  constructor(){ this.naturalWidth=0; this.naturalHeight=0; this.width=0; this.height=0; }
  set src(v){ this.naturalWidth=800; this.naturalHeight=600;
    this.width=800; this.height=600;
    queueMicrotask(()=>{ if(typeof this.onload==='function') this.onload(); }); }
  addEventListener(t,f){ if(t==='load') this.onload=f; }
}
globalThis.Image=ImgCepat; w.Image=ImgCepat;
const {gantiGambar}=await st('notes/editor/image.js');
const fileTiruan={ type:'image/png', name:'foto-baru.png', size:1 };
const kelasSblm=[...fig().classList].join(' ');
const gwSblm=fig().getAttribute('data-gw');
const grSblm=fig().getAttribute('data-gr');
await gantiGambar(fig(), fileTiruan);
await sleep(80);
globalThis.Image=AsliImage; w.Image=AsliImage;
const imgBaru=()=>DOC().querySelector('.b-img img');
const idBaru=imgBaru() && imgBaru().getAttribute('data-blob');
oke('C14d blob gambar diganti (id baru, bukan c1)', !!idBaru && idBaru!=='c1', idBaru||'');
oke('C14e kelas tata letak & rotasi/lebar tetap',
  [...fig().classList].join(' ')===kelasSblm &&
  fig().getAttribute('data-gw')===gwSblm && fig().getAttribute('data-gr')===grSblm &&
  fig().classList.contains('w-apit') && fig().classList.contains('f-r'),
  [...fig().classList].join(' '));
oke('C14f alt ikut berganti', (imgBaru().getAttribute('alt')||'')==='foto-baru.png');
/* model tersimpan dengan blob baru + tata letak lama */
const {saveNow}=await st('notes/editor/cleanup.js');
saveNow(); await sleep(50);
const k1=state.notes.find(x=>x.id==='k1');
const g=k1.blocks.find(b=>b.type==='image');
oke('C14g model memakai blob baru & mempertahankan w/rot/align',
  !!g && g.meta.blobId===idBaru && Number(g.meta.w)===60 &&
  Number(g.meta.rot)===15 && g.meta.align==='r',
  JSON.stringify(g&&g.meta));

/* ── C15 galeri gambar ── */
/* buka kelompok sisip di bar → klik "Dari galeri" */
const grp=()=>d.querySelector('.mb-g[data-g="sisip"]');
oke('C15a kelompok sisip ada', !!grp());
klik(grp()); await sleep(30);
const itemGal=()=>d.querySelector('#pop .pop-i[data-m="gal"]');
oke('C15b menu sisip punya item Dari galeri', !!itemGal());
klik(itemGal()); await sleep(40);
const pop=()=>d.getElementById('pop');
oke('C15c galeri terbuka dengan 1 gambar (c1 lama sudah dibuang)',
  !!pop().querySelector('.gal-kisi') &&
  pop().querySelectorAll('.gal-i').length===1 &&
  !!pop().querySelector(`.gal-i[data-gal="${idBaru}"]`),
  pop().textContent.slice(0,120));
oke('C15d keterangan sumber catatan tampil',
  /Catatan Bergambar/.test(pop().textContent));
/* klik gambar galeri → disisipkan di editor */
const sebelum=DOC().querySelectorAll('.b-img').length;
const galItem=pop().querySelector('.gal-i');
klik(galItem); await sleep(120);
const sesudah=DOC().querySelectorAll('.b-img').length;
const dipakai=DOC().querySelectorAll(`.b-img img[data-blob="${idBaru}"]`).length;
oke('C15e ketuk galeri menyisipkan gambar (blob sama, tanpa salin)',
  sesudah===sebelum+1 && dipakai===2, `sblm=${sebelum} sdh=${sesudah} pakai=${dipakai}`);
oke('C15f popup galeri tertutup setelah pilih', !pop().classList.contains('on'));

/* galeri dari daftar dengan 2 gambar → urut terbaru paling depan */
state.notes.push(makeNote({id:'k3',title:'Baru Banget',updatedAt:Date.now()+1,blocks:[
  makeBlock({type:'image',content:'',meta:{blobId:'c1',alt:''}}),
]}));
globalThis.Image=ImgCepat; w.Image=ImgCepat;   /* thumb instan di jsdom */
const {bukaGaleri}=await st('notes/galeri.js');
await bukaGaleri(d.querySelector('.ed-doc')); await sleep(30);
globalThis.Image=AsliImage; w.Image=AsliImage;
oke('C15g galeri menampilkan gambar k3 (c1) juga', pop().querySelectorAll('.gal-i').length===2);

console.log(gagal?`ADA ${gagal} GAGAL`:'SEMUA C-SMOKE OK');
process.exit(gagal?1:0);
