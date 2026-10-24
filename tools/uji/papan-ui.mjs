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


/* ── MB1 · papan Kanban & kalender di modal Tabel properti ── */
const fla=await st('notes/fitur-lanjutan-ui.js');
const papan=await st('notes/papan.js');
state.notes.splice(0);
const hari=(y,m,dd)=>`${y}-${String(m).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;
state.notes.push(makeNote({id:'k1',title:'Proyek A',createdAt:Date.now(),updatedAt:Date.now(),props:[{k:'status',v:'Draf'},{k:'tenggat',v:hari(2026,10,9)}],blocks:[makeBlock({type:'paragraph',content:'x'})]}));
state.notes.push(makeNote({id:'k2',title:'Proyek B',createdAt:Date.now(),updatedAt:Date.now(),props:[{k:'status',v:'selesai'},{k:'tanggal',v:hari(2026,10,9)}],blocks:[makeBlock({type:'paragraph',content:'x'})]}));
state.notes.push(makeNote({id:'k3',title:'Terkunci',createdAt:Date.now(),updatedAt:Date.now(),props:[{k:'status',v:'Draf'}],blocks:[makeBlock({type:'paragraph',content:'x'})]}));
state.notes.push(makeNote({id:'k4',title:'Proyek D',createdAt:Date.now(),updatedAt:Date.now(),props:[{k:'status',v:'Draf'},{k:'prioritas',v:'Tinggi'}],blocks:[makeBlock({type:'paragraph',content:'x'})]}));

fla.bukaTabelProperti('kanban');
const papanEl=()=>d.getElementById('pop');
oke('MB1a Kanban: kolom contoh status tampil (Draf, Sedang dikerjakan, Selesai, Diarsipkan)',
  ['Draf','Sedang dikerjakan','Selesai','Diarsipkan'].every(t=>[...papanEl().querySelectorAll('.kb-head span:first-child')].some(s=>s.textContent===t)));
oke('MB1b kartu "Proyek A" ada di kolom Draf', [...papanEl().querySelectorAll('.kb-col')].some(c=>c.querySelector('.kb-head span').textContent==='Draf' && c.textContent.includes('Proyek A')));
const btnPindah=papanEl().querySelector('[data-kb-id="k1"][data-kb-st="Selesai"]');
oke('MB1c tombol pindah ke Selesai ada', !!btnPindah);
klik(btnPindah);
oke('MB1d pindah kolom mengubah properti status menjadi Selesai', state.notes.find(x=>x.id==='k1').props.find(p=>p.k==='status').v==='Selesai');
oke('MB1e papan digambar ulang setelah pindah', papanEl().querySelector('[data-kb-id="k1"][data-kb-st="Draf"]')!==null);

/* ganti kelompok ke prioritas */
const pilihKel=papanEl().querySelector('[data-papan-kelompok]');
oke('MB1f pilihan "Kelompokkan menurut" ada & berisi prioritas', !!pilihKel && [...pilihKel.options].some(o=>o.value==='prioritas'));
pilihKel.value='prioritas'; pilihKel.dispatchEvent(new w.Event('change',{bubbles:true}));
oke('MB1g kelompok prioritas: kolom "Tinggi" berisi Proyek D', [...papanEl().querySelectorAll('.kb-col')].some(c=>c.querySelector('.kb-head span').textContent==='Tinggi' && c.textContent.includes('Proyek D')));

/* kalender */
fla.bukaTabelProperti('kalender');
const kalTanggal=()=>[...papanEl().querySelectorAll('[data-kal-hari]')];
oke('MB1h kalender: sel hari ada', kalTanggal().length>=28);
const selTgl=papanEl().querySelector('[data-kal-kunci]');
oke('MB1i sumbu kalender memuat "tenggat" & "tanggal"', !!selTgl && ['tenggat','tanggal'].every(k=>[...selTgl.options].some(o=>o.value===k)));
/* bulan awal = bulan sekarang; pindah ke Oktober 2026 agar data uji tampil */
papan._uji.tampilan.tahun=2026; papan._uji.tampilan.bulan0=9;
fla.bukaTabelProperti('kalender');
const sel9=papanEl().querySelector('[data-kal-hari="2026-10-09"]');
oke('MB1j 9 Oktober 2026 menandai 1 catatan (tenggat)', !!sel9 && sel9.textContent.includes('1'));
klik(sel9);
oke('MB1k klik hari menampilkan judul catatan di hari itu', papanEl().innerHTML.includes('Proyek A') && !papanEl().innerHTML.includes('Tidak ada catatan di hari ini'));
oke('MB1l hari terpilih ditandai', !!papanEl().querySelector('[data-kal-hari="2026-10-09"].on'));
const geserNext=papanEl().querySelector('[data-kal-geser="1"]');
klik(geserNext);
oke('MB1m tombol bulan berikutnya → November 2026', papan._uji.tampilan.bulan0===10 && papan._uji.tampilan.tahun===2026);
klik(papanEl().querySelector('[data-kal-geser="-1"]'));
oke('MB1n tombol bulan sebelumnya kembali ke Oktober', papan._uji.tampilan.bulan0===9);
oke('MB1o hari terpilih direset saat bulan berganti', papan._uji.tampilan.hari==='');

console.log(gagal?`ADA ${gagal} GAGAL`:'SEMUA MB1 OK');
process.exit(gagal?1:0);
