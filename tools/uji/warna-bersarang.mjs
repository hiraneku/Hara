/* Uji RATAKAN SPAN BERSARANG (cleanup.js) — urutan huruf tidak boleh tertukar.
   Kasus: span warna/sorotan di DALAM span warna lain, di tengah, di awal, dan
   di akhir teks induk. Sebelum perbaikan, "Aw[xy]al" menjadi "Awal[xy]" (span
   dalam dipindah keluar). Sesudah perbaikan, induk dipecah: urutan tetap.
   Jalankan: node tools/uji/warna-bersarang.mjs */
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
const cln=await st('notes/editor/cleanup.js');
const d=w.document;
const sleep=(ms=25)=>new Promise(r=>setTimeout(r,ms));
let no=0,g=0;const ok=(n,c,det='')=>{no++;if(c){console.log('LULUS',n);}else{g++;console.log('FAIL',n,det);}};
const DOC=()=>d.querySelector('.ed-doc');
const catatan=(id)=>makeNote({id,title:id,blocks:[makeBlock({type:'paragraph',content:'x'}),makeBlock({type:'paragraph',content:'cadangan'})]});

/* ringkas: daftar [teks, warna] per span/teks langsung di blok */
const ringkas = blok => {
  const hasil=[];
  const jalan=(node,warna)=>{
    for(const c of node.childNodes){
      if(c.nodeType===3){ if(c.textContent.length) hasil.push([c.textContent.replace(/\u200b/g,''), warna]); }
      else if(c.nodeType===1){
        const w2 = c.getAttribute('data-warna') || c.getAttribute('data-sorotan') || warna;
        jalan(c, w2);
      }
    }
  };
  jalan(blok, '-');
  return hasil;
};

await openNote('rs'); await sleep(60);
const blokBaru = html => { DOC().innerHTML = `<div class="b-p">${html}</div>`; return DOC().firstElementChild; };
const M='#e53935', B='#1e88e5';

/* 1. tengah: merah[Aw] biru[xy] merah[al] — urutan dipertahankan, warna tiap potongan benar */
{
  const b = blokBaru(`<span class="wrn" data-warna="${M}" style="color:rgb(229,57,53)">Aw<span class="wrn" data-warna="${B}" style="color:rgb(30,136,229)">xy</span>al</span>`);
  cln.cleanup();
  const r = ringkas(b).map(x=>x.join('|')).join(' ; ');
  const teks = b.textContent.replace(/\u200b/g,'');
  ok('bersarang di tengah: teks utuh & urutan Aw,xy,al', teks==='Awxyal' && r===`Aw|${M} ; xy|${B} ; al|${M}`, `teks=${teks} r=${r}`);
}
/* 2. awal: biru[xy] di dalam merah, merah sisa "al" — tidak ada sisi kiri */
{
  const b = blokBaru(`<span class="wrn" data-warna="${M}" style="color:rgb(229,57,53)"><span class="wrn" data-warna="${B}" style="color:rgb(30,136,229)">xy</span>al</span>`);
  cln.cleanup();
  const r = ringkas(b).map(x=>x.join('|')).join(' ; ');
  ok('bersarang di awal: xy lalu al', b.textContent.replace(/\u200b/g,'')==='xyal' && r===`xy|${B} ; al|${M}`, `r=${r}`);
}
/* 3. akhir: merah[Aw] biru[xy] — tidak ada sisi kanan */
{
  const b = blokBaru(`<span class="wrn" data-warna="${M}" style="color:rgb(229,57,53)">Aw<span class="wrn" data-warna="${B}" style="color:rgb(30,136,229)">xy</span></span>`);
  cln.cleanup();
  const r = ringkas(b).map(x=>x.join('|')).join(' ; ');
  ok('bersarang di akhir: Aw lalu xy', b.textContent.replace(/\u200b/g,'')==='Awxy' && r===`Aw|${M} ; xy|${B}`, `r=${r}`);
}
/* 4. sorotan bersarang di tengah (wsr di dalam wsr) — urutan tetap */
{
  const b = blokBaru(`<span class="wsr" data-sorotan="#fff176" style="background-color:rgb(255,241,118)">Aw<span class="wsr" data-sorotan="#a5d6a7" style="background-color:rgb(165,214,167)">xy</span>al</span>`);
  cln.cleanup();
  const r = ringkas(b).map(x=>x.join('|')).join(' ; ');
  ok('sorotan bersarang di tengah: urutan tetap', b.textContent.replace(/\u200b/g,'')==='Awxyal' && r==='Aw|#fff176 ; xy|#a5d6a7 ; al|#fff176', `r=${r}`);
}
/* 4b. caret di dalam span dalam saat dipecah tetap di sana (tidak jatuh ke blok) */
{
  const b = blokBaru(`<span class="wrn" data-warna="${M}" style="color:rgb(229,57,53)">Aw<span class="wrn" data-warna="${B}" style="color:rgb(30,136,229)">xy</span>al</span>`);
  const dalam = Array.from(b.querySelectorAll('span.wrn')).find(e => e.textContent === 'xy' || e.parentElement.classList.contains('wrn') && e.textContent === 'xy');
  const tn = dalam.firstChild;
  const r = d.createRange(); r.setStart(tn, 2); r.collapse(true);
  w.getSelection().removeAllRanges(); w.getSelection().addRange(r);
  cln.cleanup();
  const s = w.getSelection();
  ok('caret tetap di teks xy setelah pecah', s.rangeCount && s.anchorNode && s.anchorNode.nodeType===3 && s.anchorNode.data==='xy' && s.anchorOffset===2, `node=${s.anchorNode&&s.anchorNode.nodeName}:${s.anchorNode&&s.anchorNode.data} off=${s.anchorOffset}`);
}
/* 5. tanpa bersarang — tidak berubah */
{
  const b = blokBaru(`<span class="wrn" data-warna="${M}" style="color:rgb(229,57,53)">Awal</span>`);
  cln.cleanup();
  ok('tanpa sarang: tetap satu span', b.querySelectorAll('span.wrn').length===1 && b.textContent==='Awal');
}

console.log(`\nHASIL WARNA-BERSARANG: ${no-g} lulus, ${g} gagal`);
process.exit(g?1:0);
