/* Uji ronde 11 · inti: penyimpanan IndexedDB (setelah migrasi).
   - simpanTahan() benar-benar menulis (Promise resolve setelah tersimpan);
   - beberapa save() beruntun: yang tertulis adalah keadaan TERBARU;
   - data tak terbaca: dicadangkan ke kunci rusak-<ts>, kunci utama dikosongkan,
     bendera dataRusak menyala, dan aplikasi tetap bisa mulai.
   Jalankan: node tools/uji/penyimpanan-idb.mjs */
import {JSDOM} from 'jsdom';
import fs from 'fs';
import { indexedDB as fakeIDB } from 'fake-indexeddb';
import path from 'path';
import { fileURLToPath } from 'url';
import { bacaCatatanIdb, tulisCatatanIdb, bacaKunciIdb, daftarKunciIdb } from './lib/catatan-idb.mjs';
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
const {state, simpanTahan, save, load}=await import(`${AKAR}/docs/core/store.js?v=${V}`);

let no=0,g=0;
const ok=(n,c,det='')=>{no++;if(c)console.log('LULUS',n);else{g++;console.log('FAIL',n,det?' → '+det:'');}};

console.log('══ penyimpanan IndexedDB ══\n');

/* 1. simpanTahan benar-benar menulis */
const w0=state.notes.find(n=>n.id==='w') || state.notes[0];
w0.title='Judul uji tahan';
const hasil1=await simpanTahan();
ok('simpanTahan resolve true', hasil1===true);
const r1=await bacaCatatanIdb(w);
ok('setelah simpanTahan, IndexedDB memuat judul baru', typeof r1==='string' && r1.includes('Judul uji tahan'));
ok('status gagal tidak menyala', state.dataGagal===false);

/* 2. beberapa save() beruntun: yang tertulis keadaan terbaru */
w0.title='Judul A'; save();
w0.title='Judul B'; save();
w0.title='Judul C'; save();
await simpanTahan();
const r2=await bacaCatatanIdb(w);
ok('save() beruntun: yang tertulis judul terakhir (C)', r2.includes('Judul C') && !r2.includes('Judul A') && !r2.includes('Judul B'),
  (r2.match(/"title":"[^"]*"/g)||[]).slice(0,4).join(' '));

/* 3. data tak terbaca: dicadangkan, kunci utama dikosongkan, aplikasi tetap hidup */
await tulisCatatanIdb(w, '{ini bukan json');
await load();
ok('data rusak: bendera dataRusak menyala', state.dataRusak===true);
ok('data rusak: aplikasi tetap punya catatan (bawaan)', state.notes.length>=1);
const utama=await bacaCatatanIdb(w);
ok('data rusak: kunci utama dikosongkan', utama==='', JSON.stringify(utama));
const kunci=await daftarKunciIdb(w);
const cad=kunci.find(k=>String(k).startsWith('rusak-'));
ok('data rusak: salinan mentah tersimpan di kunci rusak-<ts>', !!cad, JSON.stringify(kunci));
ok('data rusak: salinan berisi data asli', cad && (await bacaKunciIdb(w,cad))==='{ini bukan json');

console.log(`\ntotal: ${no} · gagal: ${g}`);
process.exit(g?1:0);
