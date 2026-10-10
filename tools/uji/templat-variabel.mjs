/* Uji Ronde 11 · K16 variabel templat.
   - murni: variabelDalam, isianDiperlukan, gantiVariabel (escape, tak dikenal dibiarkan);
   - templat tersimpan dengan {proyek} → formulir isian; {tanggal}/{judul}/{tahun} otomatis;
   - nilai di-escape di isi HTML; variabel yang tak diisi tetap apa adanya;
   - alur klik sungguhan: pilih templat → formulir → Buat catatan.
   Jalankan: node tools/uji/templat-variabel.mjs */
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
const {state}=await import(`${AKAR}/docs/core/store.js?v=${V}`);
const {makeNote,plainText}=await import(`${AKAR}/docs/notes/note-model.js?v=${V}`);
const tv=await import(`${AKAR}/docs/notes/templat-var.js?v=${V}`);
const tp=await import(`${AKAR}/docs/notes/templat.js?v=${V}`);
const pop=await import(`${AKAR}/docs/notes/menus/pop.js?v=${V}`);

let no=0,g=0;
const ok=(n,c,det='')=>{no++;if(c)console.log('LULUS',n);else{g++;console.log('FAIL',n,det?' → '+det:'');}};
const sleep=(ms=30)=>new Promise(r=>setTimeout(r,ms));
const klik=el=>el&&el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));

console.log('══ K16 · variabel templat ══\n');

/* 1. murni */
ok('variabelDalam: nama unik, urut, tanpa peka huruf', tv.variabelDalam('{Tanggal} {nama} {nama} { proyek }').join()==='tanggal,nama,proyek');
ok('isianDiperlukan: buang bawaan', tv.isianDiperlukan('{tanggal} {Nama}','{judul} {proyek}').join()==='nama,proyek');
ok('gantiVariabel: escape diterapkan pada nilai', tv.gantiVariabel('{a}',{a:'<b>&'},s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;'))==='&lt;b>&amp;');
ok('gantiVariabel: nama tak dikenal dibiarkan', tv.gantiVariabel('x {zz} y',{a:1})==='x {zz} y');
ok('gantiVariabel: nilai yang berisi {…} tidak diganti ulang', tv.gantiVariabel('{a}',{a:'{a}'})==='{a}');
ok('gantiVariabel: nilai kosong → kosong', tv.gantiVariabel('[{a}]',{a:''})==='[]');
ok('gantiVariabel: teks tanpa variabel tidak berubah', tv.gantiVariabel('halo dunia',{a:1})==='halo dunia');

/* 2. nilai bawaan */
const nb=tp.nilaiBawaanTemplat(new Date(2026,9,10));
ok('bawaan: tahun dari tanggal', nb.tahun==='2026');
ok('bawaan: tanggal dan bulan terisi', nb.tanggal.length>0 && nb.bulan.length>0 && nb.hari.length>0, JSON.stringify(nb));

/* 3. simpan templat dengan variabel */
const sumber=makeNote({id:'sumber',title:'Kunjungan',blocks:[
  {id:'k1',type:'paragraph',content:'Klien: {proyek} · {tanggal}'},
  {id:'k2',type:'paragraph',content:'Judul: {judul}, tahun {tahun}'},
]});
tp.simpanTemplatNote(sumber);
const tanpa=makeNote({id:'tanpa',title:'Catatan singkat',blocks:[{id:'t1',type:'paragraph',content:'isi biasa'}]});
tp.simpanTemplatNote(tanpa);
ok('isianTemplat: hanya nama isian (proyek)', tp.isianTemplat('u:Kunjungan').join()==='proyek', tp.isianTemplat('u:Kunjungan').join());
ok('isianTemplat: templat tanpa variabel → kosong', tp.isianTemplat('u:Catatan singkat').length===0);
ok('formIsianTemplat: ada input untuk proyek', tp.formIsianTemplat('u:Kunjungan').includes('data-tpl-isi="proyek"'));
ok('formIsianTemplat: templat tanpa isian → kosong', tp.formIsianTemplat('u:Catatan singkat')==='');

/* 4. buat catatan dengan isian ber-escape */
const sebelum=state.notes.length;
tp.terapkanTemplat('u:Kunjungan',{proyek:'Atlas <Q> & Co'});
const baru=state.notes[0];
ok('terapkan: catatan baru dibuat', state.notes.length===sebelum+1);
ok('terapkan: judul tanpa variabel tetap "Kunjungan"', baru.title==='Kunjungan', baru.title);
const teks=plainText(baru);
ok('terapkan: isian masuk isi (teks polos, bukan HTML mentah)', teks.includes('Klien: Atlas <Q> & Co'), teks);
ok('terapkan: {judul} diisi judul catatan', teks.includes('Judul: Kunjungan, tahun '+new Date().getFullYear()), teks);
ok('terapkan: {tanggal} terisi, tidak ada kurung tersisa di baris klien', !/\{tanggal\}/.test(teks));
ok('terapkan: id blok unik', new Set(baru.blocks.map(b=>b.id)).size===baru.blocks.length);

/* 5. isian tak diisi → tetap apa adanya */
tp.terapkanTemplat('u:Kunjungan',{});
const kosong=plainText(state.notes[0]);
ok('isian kosong: {proyek} dibiarkan (tidak hilang diam-diam)', kosong.includes('{proyek}'), kosong);

/* 6. alur klik: pilih → formulir → buat */
const jmlSebelumKlik=state.notes.length;
pop.openPop(tp.menuTemplat(), null);
klik(w.document.querySelector('[data-tpl-id="u:Kunjungan"]')); await sleep(40);
const inp=w.document.querySelector('[data-tpl-isi="proyek"]');
ok('klik: memilih templat dengan isian menampilkan formulir', !!inp && state.notes.length===jmlSebelumKlik);
if (inp){
  inp.value='Gamma';
  klik(w.document.querySelector('[data-tpl-buat="u:Kunjungan"]')); await sleep(40);
  ok('klik: "Buat catatan" membuat catatan dengan isian', state.notes.length===jmlSebelumKlik+1 && plainText(state.notes[0]).includes('Klien: Gamma'), plainText(state.notes[0]).slice(0,80));
}
pop.openPop(tp.menuTemplat(), null);
klik(w.document.querySelector('[data-tpl-id="u:Catatan singkat"]')); await sleep(40);
ok('klik: templat tanpa isian langsung dibuat', state.notes.length===jmlSebelumKlik+2);

console.log(`\ntotal: ${no} · gagal: ${g}`);
process.exit(g?1:0);
