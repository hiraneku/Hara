/* Uji KOMPOSISI IME + warna menyala, dengan event tiruan (jsdom).
   Konteks: di HP, kursor bisa sudah pindah (mis. ke ed-doc) sebelum pembungkusan
   setelah compositionend berjalan; dulu huruf pertama tertinggal tanpa warna.
   Pembungkusan sekarang memakai posisi yang dicatat saat compositionstart
   (komposisi.js), bukan posisi kursor saat compositionend.
   Kasus:
   1. catatan kosong, kursor pindah ke ed-doc setelah compositionend → "h" merah;
   2. "Awal", komposisi "xy" di posisi 2 (tengah) → "xy" merah, "Aw" & "al" tetap;
   3. "Awal", komposisi "x" di akhir → "x" merah, teks lain tidak berubah.
   4. tengah kata + kursor ke ed-doc sebelum pembungkusan → "xy" biru.
   5. spasi (keydown + insertText) saat komposisi belum ditutup, tanpa compositionend → "h " merah.
   6. sama, tanpa keydown → "h " biru.
   Jalankan: node tools/uji/komposisi-kursor.mjs */
import {JSDOM} from 'jsdom';
import fs from 'fs';
import { indexedDB as fakeIDB } from 'fake-indexeddb';
import path from 'path';
import { fileURLToPath } from 'url';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const dom=new JSDOM(fs.readFileSync('docs/index.html','utf8'),{url:'https://x.test/',pretendToBeVisual:true});
const {window:w}=dom; w.indexedDB=fakeIDB;
for(const k of ['document','getSelection','HTMLElement','Node','Range','MouseEvent','Event','InputEvent','localStorage','Image','Blob','NodeFilter'])
  if(w[k]!==undefined) globalThis[k]=w[k];
globalThis.window=w; globalThis.self=w; globalThis.indexedDB=w.indexedDB;
globalThis.addEventListener=w.addEventListener.bind(w);
Object.defineProperty(globalThis,'navigator',{value:w.navigator,configurable:true});
w.URL.createObjectURL=()=>'blob:x/1';w.URL.revokeObjectURL=()=>{};globalThis.URL=w.URL;
const AKAR=process.cwd();
const V=fs.readFileSync('docs/app.js','utf8').match(/\?v=(\d+)/)[1];
const st=(...p)=>import(`${AKAR}/docs/${p.join('/')}?v=${V}`);
await st('app.js');
const {makeNote,makeBlock}=await st('notes/note-model.js');
const {openNote}=await st('notes/model.js');
const wrn=await st('notes/editor/warna.js');
const d=w.document;
const sleep=(ms=25)=>new Promise(r=>setTimeout(r,ms));
let no=0,g=0;const ok=(n,c,det='')=>{no++;if(c){console.log('LULUS',n);}else{g++;console.log('FAIL',n,det);}};
const DOC=()=>d.querySelector('.ed-doc');
const catatan=(id)=>makeNote({id,title:id,blocks:[makeBlock({type:'paragraph',content:'x'}),makeBlock({type:'paragraph',content:'cadangan'})]});
const M='#e53935', B='#1e88e5';
const sel=()=>w.getSelection();
const karet=(node,off)=>{const r=d.createRange();r.setStart(node,off);r.collapse(true);sel().removeAllRanges();sel().addRange(r);};
const kompEv=(tipe,data)=>{const ev=new w.Event(tipe,{bubbles:true});ev.data=data;DOC().dispatchEvent(ev);};
const inputEv=(el,tipe,data)=>{const ev=new w.Event('input',{bubbles:true});ev.inputType=tipe;ev.data=data;el.dispatchEvent(ev);};
const keyEv=(el,key,kc)=>{const ev=new w.Event('keydown',{bubbles:true,cancelable:true});ev.key=key;ev.keyCode=kc;el.dispatchEvent(ev);};
/* sisipkan teks di posisi caret yang berlaku SAAT ITU (seperti browser) */
const sisipKaret=t=>{const r=sel().getRangeAt(0);const n=r.startContainer;if(n.nodeType===3){n.insertData(r.startOffset,t);karet(n,r.startOffset+t.length);}else{const tx=d.createTextNode(t);n.insertBefore(tx,n.childNodes[r.startOffset]||null);karet(tx,t.length);}};
/* potongan teks blok: teks + warna terhitung induknya */
const potongan=blok=>{const o=[];const jalan=n=>{for(const c of n.childNodes){if(c.nodeType===3){if(c.textContent)o.push([c.textContent,(c.parentElement.closest('[data-warna]')||{getAttribute:()=>'-'}).getAttribute('data-warna')||'-']);}else if(c.nodeType===1&&!c.classList.contains('blk-h'))jalan(c);}};jalan(blok);return o;};
const teksWarna=(blok,t)=>{ /* warna yang dipakai untuk teks t (potongan persis) */
  const p=potongan(blok).find(([x])=>x===t); return p?p[1]:null; };

await openNote('km'); await sleep(60);
const blokBaru=html=>{DOC().innerHTML=`<div class="b-p">${html}</div>`;return DOC().firstElementChild;};

/* 1. catatan kosong; kursor pindah ke ed-doc sebelum timeout pembungkusan */
{
  const b=blokBaru('');
  karet(b,0);
  await sleep(20);   /* beri waktu event selectionchange (asinkron) lewat dulu */
  wrn.setWarna('#e53935');
  kompEv('compositionstart','');
  const tn=d.createTextNode('h'); b.appendChild(tn); karet(tn,1);
  kompEv('compositionend','h');
  karet(DOC(),0);                     /* kursor pindah ke ed-doc, seperti di HP */
  await sleep(120);
  ok('catatan kosong + kursor ke ed-doc: h berwarna', teksWarna(b,'h')===M, JSON.stringify(potongan(b)));
}
/* 2. komposisi di tengah kata: "Aw|al" + "xy" */
{
  const b=blokBaru('Awal');
  const tn0=b.firstChild;
  karet(tn0,2);
  await sleep(20);   /* beri waktu event selectionchange (asinkron) lewat dulu */
  wrn.setWarna('#1e88e5');
  kompEv('compositionstart','');
  tn0.insertData(2,'xy'); karet(tn0,4);
  kompEv('compositionend','xy');
  await sleep(120);
  const p=potongan(b).map(x=>x.join('|')).join(' ; ');
  const teks=b.textContent;
  ok('tengah kata: teks utuh Awxyal', teks==='Awxyal', `teks=${teks}`);
  ok('tengah kata: xy berwarna biru, Aw & al tidak', teksWarna(b,'xy')===B && teksWarna(b,'Aw')!==B && teksWarna(b,'al')!==B, p);
}
/* 3. komposisi di akhir kata */
{
  const b=blokBaru('Awal');
  const tn0=b.firstChild;
  karet(tn0,4);
  await sleep(20);   /* beri waktu event selectionchange (asinkron) lewat dulu */
  wrn.setWarna('#e53935');
  kompEv('compositionstart','');
  tn0.insertData(4,'x'); karet(tn0,5);
  kompEv('compositionend','x');
  await sleep(120);
  ok('akhir kata: x berwarna, teks utuh', b.textContent==='Awalx' && teksWarna(b,'x')===M, JSON.stringify(potongan(b)));
}

/* 4. di tengah kata, lalu kursor pindah ke ed-doc sebelum pembungkusan */
{
  const b=blokBaru('Awal');
  const tn0=b.firstChild;
  karet(tn0,2);
  await sleep(20);
  wrn.setWarna('#1e88e5');
  kompEv('compositionstart','');
  tn0.insertData(2,'xy'); karet(tn0,4);
  kompEv('compositionend','xy');
  karet(DOC(),0);
  await sleep(120);
  ok('tengah + kursor ke ed-doc: xy biru, teks utuh', b.textContent==='Awxyal' && teksWarna(b,'xy')===B && teksWarna(b,'Aw')!==B && teksWarna(b,'al')!==B, JSON.stringify(potongan(b)));
}

/* 5. spasi (keydown + insertText) datang saat komposisi belum ditutup browser:
      TIDAK ada compositionend. Dulu huruf pertama tidak pernah dibungkus. */
{
  const b=blokBaru('');
  const tn=d.createTextNode(''); b.appendChild(tn);
  karet(tn,0);
  await sleep(20);
  wrn.setWarna('#e53935');
  kompEv('compositionstart','');
  tn.insertData(0,'h'); karet(tn,1);
  inputEv(b,'insertCompositionText','h');
  keyEv(b,' ',32);
  sisipKaret(' ');
  inputEv(b,'insertText',' ');
  await sleep(120);
  ok('spasi tanpa compositionend: "h " berwarna merah', b.textContent==='h ' && teksWarna(b,'h ')===M, JSON.stringify(potongan(b)));
  /* ketikan sesudahnya ikut berwarna (warna tidak mati) */
  sisipKaret('a');
  inputEv(b,'insertText','a');
  await sleep(60);
  ok('ketikan sesudah spasi tetap berwarna', b.textContent==='h a' && teksWarna(b,'h a')===M, JSON.stringify(potongan(b)));
}
/* 6. sama seperti 5, tetapi tanpa keydown (IME Android sering tidak mengirim keydown) */
{
  const b=blokBaru('');
  const tn=d.createTextNode(''); b.appendChild(tn);
  karet(tn,0);
  await sleep(20);
  wrn.setWarna('#1e88e5');
  kompEv('compositionstart','');
  tn.insertData(0,'h'); karet(tn,1);
  inputEv(b,'insertCompositionText','h');
  sisipKaret(' ');
  inputEv(b,'insertText',' ');
  await sleep(120);
  ok('input insertText tanpa keydown menutup komposisi: "h " berwarna biru', b.textContent==='h ' && teksWarna(b,'h ')===B, JSON.stringify(potongan(b)));
}

console.log(`\nHASIL KOMPOSISI-KURSOR: ${no-g} lulus, ${g} gagal`);
process.exit(g?1:0);
