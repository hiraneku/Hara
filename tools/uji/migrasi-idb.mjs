/* Uji ronde 11 · inti: migrasi penyimpanan dari localStorage ke IndexedDB.
   Dijalankan di proses sendiri (IndexedDB kosong, localStorage berisi data lama).
   - data lama terbaca dan tampil;
   - salinan ada di IndexedDB setelah dimuat;
   - kunci localStorage lama TIDAK dihapus (migrasi tidak destruktif).
   Jalankan: node tools/uji/migrasi-idb.mjs */
import {JSDOM} from 'jsdom';
import fs from 'fs';
import { indexedDB as fakeIDB } from 'fake-indexeddb';
import path from 'path';
import { fileURLToPath } from 'url';
import { bacaCatatanIdb } from './lib/catatan-idb.mjs';
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

let no=0,g=0;
const ok=(n,c,det='')=>{no++;if(c)console.log('LULUS',n);else{g++;console.log('FAIL',n,det?' → '+det:'');}};

console.log('══ migrasi localStorage → IndexedDB ══\n');

const lama = JSON.stringify({ schema: 2, seq: 5, openId: 'lama1', notes: [
  { id: 'lama1', title: 'Catatan lama', blocks: [{ id: 'b1', type: 'paragraph', content: 'isi dari versi sebelumnya' }], tags: [], createdAt: 1, updatedAt: 1 },
]});
w.localStorage.setItem('hara.v1', lama);

await import(`${AKAR}/docs/app.js?v=${V}`);
const {state}=await import(`${AKAR}/docs/core/store.js?v=${V}`);
const db=await import(`${AKAR}/docs/core/db-catatan.js?v=${V}`);

ok('mode penyimpanan = IndexedDB', db.modeSimpan()==='idb', String(db.modeSimpan()));
ok('catatan lama terbaca setelah migrasi', state.notes.some(n=>n.id==='lama1' && n.title==='Catatan lama'),
  JSON.stringify(state.notes.map(n=>n.id)));
const rec=await bacaCatatanIdb(w);
ok('salinan ada di IndexedDB setelah dimuat', typeof rec==='string' && rec.includes('Catatan lama'), String(rec).slice(0,80));
ok('kunci localStorage lama TIDAK dihapus', w.localStorage.getItem('hara.v1')===lama);

console.log(`\ntotal: ${no} · gagal: ${g}`);
process.exit(g?1:0);
