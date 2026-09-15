/* Uji: BILAH FORMAT DI ATAS TEKS YANG DISOROT (ronde 7).

   Yang dijaga:
   • muncul hanya saat ada sorotan nyata di dalam dokumen editor;
   • tidak muncul di mode baca, di luar editor, atau saat sorotan
     menyentuh gambar (gambar punya bilahnya sendiri);
   • tombolnya memakai mesin bar mekanik — Tebal benar-benar
     membungkus teks terpilih, dan ketukan kedua melepasnya;
   • tombol tidak merebut fokus: sorotan tetap utuh setelah pointerdown
     di bilah;
   • hilang saat sorotan menguncup, setelah Escape, dan saat pindah layar.

   Jalankan: node tools/uji/bilah-sorot.mjs */
import {JSDOM} from 'jsdom';
import fs from 'fs';
import { indexedDB as fakeIDB } from 'fake-indexeddb';
import path from 'path';
import { fileURLToPath } from 'url';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const AKAR=process.cwd();
const dom=new JSDOM(fs.readFileSync('docs/index.html','utf8'),{url:'https://x.test/',pretendToBeVisual:true});
const {window:w}=dom; w.indexedDB=fakeIDB;
for(const k of ['document','getSelection','HTMLElement','Node','Range','MouseEvent','KeyboardEvent','Event','InputEvent','localStorage','Image','Blob','NodeFilter'])
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
const bilah=await st('notes/editor/bilah-teks.js');
const d=w.document;
const sleep=(ms=30)=>new Promise(r=>setTimeout(r,ms));
let gagal=0;
const oke=(nama,baik,det='')=>{ if(!baik){gagal++;console.log('FAIL',nama,det?'\n      '+det:'');} else console.log('ok  ',nama); };
const klik=el=>{ if(el) el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,view:w})); };
const turun=el=>{ if(el) el.dispatchEvent(new w.MouseEvent('pointerdown',{bubbles:true,cancelable:true,view:w,button:0})); };
const bar=()=>d.getElementById('teks-bar');
const tampil=()=>!!bar() && bar().hidden === false;
const DOC=()=>d.querySelector('.ed-doc');
const blok=()=>DOC() && DOC().querySelector('.b-p');
const teksBlok=()=>blok() ? blok().textContent : '';
/* Sorot karakter [mulai,akhir) dari TEKS blok — mencari text node-nya
   sendiri, jadi tetap benar walau isinya sudah dibungkus <b>/<i>. */
const sorotTeks=(mulai,akhir)=>{
  let pos=0, nA=null, oA=0, nB=null, oB=0;
  const jalan=n=>{
    for(const c of n.childNodes){
      if(nA && nB) return;
      if(c.nodeType===3){
        const len=c.data.length;
        if(!nA && pos+len>=mulai){ nA=c; oA=mulai-pos; }
        if(!nB && pos+len>=akhir){ nB=c; oB=akhir-pos; }
        pos+=len;
      } else jalan(c);
    }
  };
  jalan(blok());
  if(!nA||!nB) return;
  const r=d.createRange(); r.setStart(nA,oA); r.setEnd(nB,oB);
  const s=w.getSelection(); s.removeAllRanges(); s.addRange(r);
  d.dispatchEvent(new w.Event('selectionchange'));
};
/* Polling singkat: bilah muncul lewat timer selectionchange, jadi
   jeda tetap bisa balapan dengan render ulang layar. */
const tungguBilah=async(harusTampil=true,ms=900)=>{
  const akhir=Date.now()+ms;
  while(Date.now()<akhir){
    if(tampil()===harusTampil) return true;
    await sleep(30);
  }
  return tampil()===harusTampil;
};
const kuncup=()=>{
  const s=w.getSelection(); s.removeAllRanges();
  d.dispatchEvent(new w.Event('selectionchange'));
};

state.notes.splice(0);
state.notes.push(makeNote({id:'e1',title:'Catatan uji',blocks:[
  makeBlock({type:'paragraph',content:'Halo dunia catatan'})]}));
state.notes.push(makeNote({id:'e2',title:'Ada gambar',blocks:[
  makeBlock({type:'image',content:'',meta:{blobId:'g1'}}),
  makeBlock({type:'paragraph',content:'teks mengalir'})]}));
await simpanBlob('g1', new w.Blob(['xx'], {type:'image/png'}));

await openNote('e1'); await sleep(120);
oke('B0 editor siap', !!DOC() && !!blok());

/* ── B1: muncul saat ada sorotan ── */
sorotTeks(0,4);
oke('B1a bilah muncul saat teks disorot', await tungguBilah(true));
oke('B1b tombol inti ada', bar() && ['b','i','u','strike','hl','icode','warna','link','clear']
  .every(m=>bar().querySelector(`[data-m="${m}"]`)), bar() && bar().innerHTML.slice(0,120));
oke('B1c bilah tidak merebut fokus (dipasang di body, bukan di dalam editor)',
  bar() && bar().parentElement === d.body);

/* ── B2: sorotan menguncup → hilang ── */
kuncup();
oke('B2 sorotan menguncup → bilah hilang', await tungguBilah(false, 300));

/* ── B3: Tebal lewat bilah ── */
sorotTeks(0,4); await tungguBilah(true);
klik(bar().querySelector('[data-m="b"]')); await sleep(60);
oke('B3a teks terpilih menjadi tebal', /<(b|strong)(\s[^>]*)?>Halo<\/(b|strong)>/i.test(blok().innerHTML),
  blok().innerHTML);
oke('B3b isi blok tidak berubah', teksBlok() === 'Halo dunia catatan', teksBlok());
sorotTeks(0,4); await tungguBilah(true);
klik(bar().querySelector('[data-m="b"]')); await sleep(60);
oke('B3c ketukan kedua melepas tebal', !/<(b|strong)[\s>]/i.test(blok().innerHTML), blok().innerHTML);

/* ── B4: sorotan yang menyentuh gambar dilewati ── */
await openNote('e2'); await sleep(120);
{
  const t=DOC().querySelector('.b-p').firstChild;
  const r=d.createRange(); r.setStartBefore(DOC().querySelector('.b-img')); r.setEnd(t,2);
  const s=w.getSelection(); s.removeAllRanges(); s.addRange(r);
  d.dispatchEvent(new w.Event('selectionchange'));
  oke('B4 sorotan yang menyentuh gambar tidak memunculkan bilah', await tungguBilah(false, 300));
}

/* ── B5: mode baca tidak menampilkan bilah ── */
await openNote('e1'); await sleep(120);
sorotTeks(0,4);
oke('B5a bilah muncul lagi setelah kembali ke mode tulis', await tungguBilah(true));
d.querySelector('.ed').classList.add('baca');
bilah.segarkanBilahTeks(); await sleep(30);
oke('B5b di mode baca bilah tidak muncul', !tampil());
d.querySelector('.ed').classList.remove('baca');

/* ── B6: sorotan di luar editor dilewati ── */
{
  /* elemen di luar editor — mis. judul panel data */
  const luar=d.createElement('p'); luar.textContent='di luar editor';
  d.body.appendChild(luar);
  const judul=luar.firstChild;
  const r=d.createRange(); r.setStart(judul,0); r.setEnd(judul,3);
  const s=w.getSelection(); s.removeAllRanges(); s.addRange(r);
  bilah.segarkanBilahTeks(); await sleep(30);
  oke('B6 sorotan di luar editor tidak memunculkan bilah', !tampil());
}

/* ── B7: pointerdown di bilah tidak membubarkan sorotan ── */
sorotTeks(0,4); await tungguBilah(true);
const sebelum=w.getSelection().getRangeAt(0).toString();
turun(bar().querySelector('[data-m="i"]')); await sleep(20);
oke('B7a pointerdown di bilah tidak mengubah sorotan',
  w.getSelection().rangeCount > 0 && w.getSelection().getRangeAt(0).toString() === sebelum,
  `${sebelum} → ${w.getSelection().rangeCount ? w.getSelection().getRangeAt(0).toString() : '-'}`);
klik(bar().querySelector('[data-m="i"]')); await sleep(60);
oke('B7b Miring diterapkan ke sorotan', /<(i|em)(\s[^>]*)?>Halo<\/(i|em)>/i.test(blok().innerHTML),
  blok().innerHTML);

/* ── B8: Escape & pindah layar ── */
sorotTeks(0,4); await tungguBilah(true);
oke('B8a bilah tampil sebelum Escape', tampil());
d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
await sleep(30);
oke('B8b Escape menyembunyikan bilah', !tampil());

/* ── B9: warna & tautan memakai menu yang sudah ada ── */
sorotTeks(0,4); await tungguBilah(true);
klik(bar().querySelector('[data-m="warna"]')); await sleep(60);
const pop=d.getElementById('pop');
oke('B9a tombol warna membuka palet warna (bukan menambah jalur baru)',
  !!pop && pop.classList.contains('on') && !!pop.querySelector('.pop-warna, [data-warna]'),
  pop ? pop.className : 'tanpa pop');
klik(d.getElementById('scrim')); await sleep(40);
sorotTeks(0,4); await tungguBilah(true);
klik(bar().querySelector('[data-m="link"]')); await sleep(60);
oke('B9b tombol tautan membuka menu tautan',
  pop.classList.contains('on') && /http|Tautan|link/i.test(pop.textContent||''),
  (pop.textContent||'').slice(0,80));
klik(d.getElementById('scrim')); await sleep(40);

router.go('notes'); await sleep(60);
oke('B9c pindah layar menyembunyikan bilah', !tampil());

console.log(gagal ? `\ntotal: ${gagal} GAGAL` : '\nSemua uji bilah-sorot LOLOS');
if (gagal) process.exit(1);
