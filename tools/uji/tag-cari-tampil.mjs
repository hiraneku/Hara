/* Uji: tag di isi catatan SELALU tampil & bisa dicari — setara dengan
   tag di catatan sambutan — meski cache n.tags kosong (belum simpan,
   cache basi, data lama). Cakupan: chip baris daftar, filter chip,
   halaman Tag + kolom cari tag, pencarian "#nama", klik tag di editor
   (mode tulis vs baca).
   Jalankan: node tools/uji/tag-cari-tampil.mjs */
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
await import(`${AKAR}/docs/app.js?v=${V}`);
const {go}=await import(`${AKAR}/docs/core/router.js?v=${V}`);
const {state}=await import(`${AKAR}/docs/core/store.js?v=${V}`);
const {makeNote}=await import(`${AKAR}/docs/notes/note-model.js?v=${V}`);
const {renderHasilCari}=await import(`${AKAR}/docs/notes/views/misc.js?v=${V}`);
const mode=await import(`${AKAR}/docs/notes/mode-baca.js?v=${V}`);
const d=w.document;
const click=(el,opts={})=>el&&el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,...opts}));
const sleep=(ms=25)=>new Promise(r=>setTimeout(r,ms));
let no=0,g=0;
const ok=(n,c,det='')=>{no++;if(c)console.log('LULUS',n);else{g++;console.log('FAIL',n,det?' → '+det:'');}};
const isiTag=`Rencana <span class="tg">#liburan</span> dan <span class="tg">#kerja</span>`;

/* catatan dengan tag di ISI tapi cache KOSONG (simulasi cache basi) */
state.notes.unshift(makeNote({id:'u9',title:'Catatan saya',tags:[],
  blocks:[{id:'p1',type:'paragraph',content:isiTag}]}));

console.log('══ Tag di isi: tampil & bisa dicari walau cache kosong ══\n');

/* 1. chip baris daftar (seperti catatan sambutan) */
go('notes'); await sleep(40);
const row=Array.from(d.querySelectorAll('.row[data-open="u9"]'))[0];
const chips=row?Array.from(row.querySelectorAll('.tg-chip')).map(c=>c.textContent):[];
ok('C1 chip baris tampil dari isi walau cache kosong',
  chips.includes('#liburan') && chips.includes('#kerja'), JSON.stringify(chips));

/* 2. klik chip memfilter daftar → catatan ini ikut */
const chip=row&&Array.from(row.querySelectorAll('.tg-chip')).find(c=>c.textContent==='#liburan');
click(chip); await sleep(50);
const jdl=()=>Array.from(d.querySelectorAll('.row[data-open]')).map(r=>r.querySelector('.row-t').textContent.trim());
ok('C2 klik chip memfilter dan memuat catatan bertag', jdl().includes('Catatan saya'), JSON.stringify(jdl()));
d.querySelector('[data-tag-x]')?.dispatchEvent(new w.MouseEvent('click',{bubbles:true})); await sleep(40);

/* 3. cari "#liburan" dari isi (cache kosong) */
go('search'); await sleep(40);
renderHasilCari('#liburan');
ok('C3 cari "#nama" menemukan catatan dari isi walau cache kosong',
  (d.getElementById('cari-hasil').textContent||'').includes('Catatan saya'),
  d.getElementById('cari-hasil').textContent.slice(0,120));

/* 4. halaman Tag menampilkan tag dari isi (semuaTag fallback) */
go('tags'); await sleep(50);
const pageT=d.querySelector('.page').textContent;
ok('C4 halaman Tag memuat tag dari isi walau cache kosong',
  pageT.includes('#liburan') && pageT.includes('#kerja'), pageT.slice(0,200));

/* 5. kolom cari tag memfilter daftar tag */
const ci=d.getElementById('cari-tag');
ok('C5 halaman Tag punya kolom cari', !!ci);
ci.value='liburan';
ci.dispatchEvent(new w.Event('input',{bubbles:true})); await sleep(40);
const daftarT=document.getElementById('tags-daftar').textContent;
ok('C6 cari tag menyaring daftar', daftarT.includes('#liburan') && !daftarT.includes('#kerja'), daftarT.slice(0,120));
ci.value='zzz';
ci.dispatchEvent(new w.Event('input',{bubbles:true})); await sleep(40);
ok('C7 cari tag tanpa hasil menampilkan pesan',
  /Tidak ada tag/.test(document.getElementById('tags-daftar').textContent));

/* 6. klik tag di editor mode TULIS = kursor (tidak pindah layar);
      Ctrl+klik / mode baca = filter */
go('notes'); await sleep(30);
click(d.querySelector('.row[data-open="u9"]')); await sleep(60);
ok('C8 editor terbuka', !!d.querySelector('.ed-doc .tg'));
click(d.querySelector('.ed-doc .tg'));
await sleep(40);
ok('C9 klik tag di mode tulis TIDAK meninggalkan editor', !!d.querySelector('.ed-doc'),
  'cur berpindah?');
click(d.querySelector('.ed-doc .tg'), {ctrlKey:true}); await sleep(50);
ok('C10 Ctrl+klik tag memfilter daftar catatan',
  !d.querySelector('.ed-doc') && /Catatan saya/.test(d.querySelector('.page')?.textContent||''),
  (d.querySelector('.page')?.textContent||'').slice(0,100));
/* mode baca: klik langsung memfilter */
d.querySelector('[data-tag-x]')?.dispatchEvent(new w.MouseEvent('click',{bubbles:true})); await sleep(30);
go('notes'); await sleep(30);
click(d.querySelector('.row[data-open="u9"]')); await sleep(60);
mode.setModeBaca(true); await sleep(30);
const baca=d.querySelector('.ed');
ok('C11 mode baca aktif', baca && baca.classList.contains('baca'));
click(d.querySelector('.ed-doc .tg')); await sleep(50);
ok('C12 klik tag di mode baca memfilter daftar',
  !d.querySelector('.ed-doc') && /Catatan saya/.test(d.querySelector('.page')?.textContent||''));
d.querySelector('[data-tag-x]')?.dispatchEvent(new w.MouseEvent('click',{bubbles:true})); await sleep(30);
mode.setModeBaca(false);

/* 7. menu tag (dari grup Sisipkan di bar mekanik) memuat tag dari isi
      walau cache kosong (semuaTag fallback), dan pilihan menyisipkan
      span.tg */
go('notes'); await sleep(30);
click(d.querySelector('.row[data-open="u9"]')); await sleep(60);
const mbSisip=Array.from(d.querySelectorAll('.mb-g')).find(x=>x.getAttribute('data-g')==='sisip');
ok('C13 grup Sisipkan di bar mekanik ada', !!mbSisip);
if(mbSisip){
  click(mbSisip); await sleep(40);
  const itemTag=Array.from(d.querySelectorAll('#pop .pop-i')).find(x=>x.getAttribute('data-m')==='tag');
  ok('C14 grup Sisipkan memuat item Tag', !!itemTag);
  click(itemTag); await sleep(40);
  const popTxt=document.getElementById('pop')?.textContent||'';
  ok('C15 menu Tag memuat #liburan dari isi walau cache kosong',
    popTxt.includes('liburan'), popTxt.slice(0,150));
  const it=Array.from(d.querySelectorAll('#pop [data-ins]')).find(x=>(x.getAttribute('data-ins')||'').includes('#liburan'));
  click(it); await sleep(40);
  const spanBaru=Array.from(d.querySelectorAll('.ed-doc span.tg')).find(s=>(s.textContent||'').includes('#liburan'));
  ok('C16 pilih tag dari menu menyisipkan span.tg di editor', !!spanBaru,
    d.querySelector('.ed-doc')?.innerHTML.slice(0,200));
}

console.log(`\ntotal: ${no} · gagal: ${g}`);
if(g)process.exit(1);
console.log('SEMUA LOLOS');
