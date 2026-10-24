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


/* ── MB2 · tabel lanjutan di editor ── */
const router2=await st('core/router.js');
const tabelSaring=await st('notes/tabel-rumus.js');
state.notes.splice(0);
const rowsUji=[
  ['Nama','Nilai','Hitung'],
  ['budi','10','=B2*2'],
  ['Ani','2','=SUM(B2:B3)'],
  ['Dodi','30','=1/0'],
];
state.notes.push(makeNote({id:'tb1',title:'Tabel uji',createdAt:Date.now(),updatedAt:Date.now(),blocks:[makeBlock({id:'blk-t1',type:'table',content:'',meta:{rows:rowsUji}})]}));
state.openId='tb1';
router2.go('editor'); await sleep(40);
const tbl=()=>d.querySelector('.b-table');
const sel=()=>tbl().querySelector('[data-tbl-kol]');
const badan=()=>[...tbl().querySelectorAll('tbody tr')];
const teksKolom0=()=>badan().map(tr=>tr.querySelector('td').textContent.trim());
const cell=(r,c)=>badan()[r].querySelectorAll('td')[c];

oke('MB2a tabel dirender dengan toolbar urut & saring', !!tbl() && !!sel() && !!tbl().querySelector('[data-tbl-saring]'));
oke('MB2b rumus =B2*2 menampilkan hasil 20 di atribut data-hasil', cell(0,2).getAttribute('data-hasil')==='20', cell(0,2).getAttribute('data-hasil'));
oke('MB2c =SUM(B2:B3) → 12', cell(1,2).getAttribute('data-hasil')==='12', cell(1,2).getAttribute('data-hasil'));
oke('MB2d =1/0 → #DIV/0! (galat)', cell(2,2).getAttribute('data-hasil')==='#DIV/0!');
oke('MB2e sel biasa tanpa data-hasil', !cell(0,0).hasAttribute('data-hasil'));
oke('MB2f teks rumus tetap apa adanya (tidak diganti hasil)', cell(0,2).textContent.trim()==='=B2*2');

/* urut naik menurut kolom Nilai (kolom 1) */
sel().value='1';
const btnNaik=tbl().querySelector('[data-tbl-act="urut-naik"]');
klik(btnNaik); await sleep(30);
oke('MB2g urut naik menurut Nilai: 2, 10, 30', JSON.stringify(badan().map(tr=>tr.querySelectorAll('td')[1].textContent.trim()))==='["2","10","30"]', JSON.stringify(badan().map(tr=>tr.querySelectorAll('td')[1].textContent.trim())));
oke('MB2h urut tidak memutus rumus (hasil tetap dihitung)', cell(0,2).getAttribute('data-hasil')!==null);
const btnTurun=tbl().querySelector('[data-tbl-act="urut-turun"]');
klik(btnTurun); await sleep(30);
oke('MB2i urut turun: 30, 10, 2', JSON.stringify(badan().map(tr=>tr.querySelectorAll('td')[1].textContent.trim()))==='["30","10","2"]');
oke('MB2j header tidak ikut bergeser', tbl().querySelector('thead th').textContent.trim()==='Nama');

/* saring */
const saring=tbl().querySelector('[data-tbl-saring]');
sel().value='0';
sel().dispatchEvent(new w.Event('change',{bubbles:true}));
saring.value='ani';
saring.dispatchEvent(new w.Event('input',{bubbles:true}));
oke('MB2k saring "ani" menyembunyikan baris lain', badan().filter(tr=>tr.hidden).length===2 && badan().find(tr=>!tr.hidden).querySelector('td').textContent.trim()==='Ani');
oke('MB2l data tidak hilang saat disaring (DOM tetap 3 baris)', badan().length===3);
const sim=tabelSaring.ambilKeadaanTabel('blk-t1');
oke('MB2m keadaan saring disimpan per blok (tidak masuk data)', sim.saring==='ani' && sim.kol===0, JSON.stringify(sim));
saring.value='';
saring.dispatchEvent(new w.Event('input',{bubbles:true}));
oke('MB2n kosongkan saringan → semua baris tampil lagi', badan().every(tr=>!tr.hidden));

/* hasil rumus diperbarui saat mengetik */
const sel0=cell(0,1);
sel0.textContent='7';
tbl().dispatchEvent(new w.Event('input',{bubbles:true}));
const barisBudi=badan().find(tr=>tr.querySelector('td').textContent.trim()==='budi');
oke('MB2o mengetik nilai mengubah rumus yang merujuknya (budi: 14)', barisBudi && barisBudi.querySelectorAll('td')[2].getAttribute('data-hasil')==='14', barisBudi && barisBudi.querySelectorAll('td')[2].getAttribute('data-hasil'));
const formulaSel=cell(2,2);
formulaSel.textContent='=A1';
tbl().dispatchEvent(new w.Event('input',{bubbles:true}));
oke('MB2p rumus merujuk judul kolom (teks) → #NILAI!', formulaSel.getAttribute('data-hasil')==='#NILAI!', formulaSel.getAttribute('data-hasil'));

/* mode baca: toolbar urut & saring tetap terlihat */
const mb=d.getElementById('mode');
klik(mb); await sleep(30);
oke('MB2q mode baca: toolbar saring tetap ada (tidak terkunci di balik mode)', !!tbl() && !!tbl().querySelector('[data-tbl-saring]'));

console.log(gagal?`ADA ${gagal} GAGAL`:'SEMUA MB2 OK');
process.exit(gagal?1:0);
