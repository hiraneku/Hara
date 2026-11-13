/* Vault health, attachment inventory, and conflict-safe backup restore. */
import { JSDOM } from 'jsdom';
import fs from 'fs';
import { indexedDB as fakeIDB } from 'fake-indexeddb';
import path from 'path';
import { fileURLToPath } from 'url';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const root=process.cwd(),dom=new JSDOM(fs.readFileSync('docs/index.html','utf8'),{url:'https://x.test/',pretendToBeVisual:true});
const {window:w}=dom;w.indexedDB=fakeIDB;
for(const k of ['document','getSelection','HTMLElement','Node','Range','MouseEvent','KeyboardEvent','Event','InputEvent','localStorage','Image','NodeFilter'])if(w[k]!==undefined)globalThis[k]=w[k];
globalThis.window=w;globalThis.self=w;globalThis.indexedDB=w.indexedDB;globalThis.addEventListener=w.addEventListener.bind(w);Object.defineProperty(globalThis,'navigator',{value:w.navigator,configurable:true});w.URL.createObjectURL=()=>'blob:x';w.URL.revokeObjectURL=()=>{};globalThis.URL=w.URL;
const V=fs.readFileSync('docs/app.js','utf8').match(/\?v=(\d+)/)[1];await import(`${root}/docs/app.js?v=${V}`);
const {state}=await import(`${root}/docs/core/store.js?v=${V}`);
const {makeNote}=await import(`${root}/docs/notes/note-model.js?v=${V}`);
const {periksaVault,inventarisLampiran}=await import(`${root}/docs/notes/vault-quality.js?v=${V}`);
const {pasangKunci,resetSesi}=await import(`${root}/docs/notes/kunci.js?v=${V}`);
const {simpanBlob,ambilBlob}=await import(`${root}/docs/core/blobs.js?v=${V}`);
const {terapkanImporJson}=await import(`${root}/docs/notes/data-io.js?v=${V}`);
let total=0,fail=0;const ok=(n,c,d='')=>{total++;if(c)console.log('LULUS',n);else{fail++;console.log('GAGAL',n,d)}};
const b64=bytes=>Buffer.from(bytes).toString('base64');
const bytesOf=async blob=>new Uint8Array(await blob.arrayBuffer());

console.log('── Pemeriksaan non-destruktif ──');
state.notes=[
 makeNote({id:'vh-a',title:'Repeat',blocks:[{type:'paragraph',content:'[[Missing Page]]'}]}),
 makeNote({id:'vh-b',title:' repeat ',blocks:[{type:'paragraph',content:'Isi'}]}),
 makeNote({id:'vh-empty',title:'',blocks:[{type:'paragraph',content:''}]}),
 makeNote({id:'vh-secret',title:'Secret Locked',blocks:[{type:'paragraph',content:'[[Private Gap]]'}]}),
 makeNote({id:'vh-hash',title:'C#',blocks:[{type:'paragraph',content:'[[C#]]'}]}),
];
await pasangKunci('vh-secret','1234');resetSesi();
let report=periksaVault();
ok('judul ganda dinormalkan spasi dan kapitalnya',report.duplicates.length===1&&report.duplicates[0].notes.length===2);
ok('catatan kosong dilaporkan tanpa isi sensitif',report.emptyNotes.length===1&&report.emptyNotes[0].id==='vh-empty');
ok('wikilink mati terdeteksi',report.brokenLinks.some(x=>x.target==='Missing Page'));
ok('judul sah yang mengandung tanda pagar tidak salah ditandai',!report.brokenLinks.some(x=>x.target==='C'));
ok('isi catatan terkunci tidak diperiksa / tidak bocor',!report.brokenLinks.some(x=>x.target==='Private Gap')&&!report.emptyNotes.some(x=>x.id==='vh-secret'));
ok('pemeriksaan tidak mengubah model catatan',state.notes.length===5&&state.notes[0].blocks[0].content==='[[Missing Page]]');

console.log('── Inventaris lampiran ──');
await simpanBlob('vh-used',new Blob(['used'],{type:'text/plain'}));
await simpanBlob('vh-orphan',new Blob(['orphan'],{type:'application/octet-stream'}));
await simpanBlob('ocr-vh-used',new Blob(['sidecar'],{type:'application/json'}));
state.notes[0].blocks=[{type:'paragraph',content:'<img data-blob="vh-used">'}];
const items=await inventarisLampiran();
ok('lampiran yang direferensikan dikenali sebagai digunakan',items.find(x=>x.id==='vh-used')?.referenced&&!items.find(x=>x.id==='vh-used')?.deletable);
ok('blob yatim ditandai dapat dihapus hanya setelah aksi eksplisit',items.find(x=>x.id==='vh-orphan')?.deletable===true);
ok('data OCR sampingan tidak ditandai untuk dihapus',items.find(x=>x.id==='ocr-vh-used')?.auxiliary&&!items.find(x=>x.id==='ocr-vh-used')?.deletable);

console.log('── Pulihkan backup per konflik dan blob collision ──');
const old=new Uint8Array([1,2,3]),incomingBytes=new Uint8Array([8,9,10]);
await simpanBlob('collision-blob',new Blob([old],{type:'application/test'}));
const incoming=makeNote({id:'restore-conflict',title:'Incoming',blocks:[{type:'paragraph',content:'<img data-blob="collision-blob">'}]});
state.notes=[makeNote({id:'restore-conflict',title:'Local',blocks:[{type:'paragraph',content:'local'}]})];
let r={catatan:[incoming],blobs:{'collision-blob':{b64:b64(incomingBytes),tipe:'application/test'}},ruang:[],seq:1,kartu:[],ujian:[]};
let h=await terapkanImporJson(r,'gabung',{[incoming.id]:'lokal'});
ok('pilihan lokal mempertahankan konflik',state.notes[0].title==='Local'&&h.dipertahankan===1&&h.diganti===0);
ok('cadangan konflik yang ditolak tidak menimpa lampiran',Buffer.compare(Buffer.from(await bytesOf(await ambilBlob('collision-blob'))),Buffer.from(old))===0);
state.notes=[makeNote({id:'restore-conflict',title:'Local',blocks:[{type:'paragraph',content:'local'}]})];
r={catatan:[makeNote({id:'restore-conflict',title:'Incoming',blocks:[{type:'paragraph',content:'<img data-blob="collision-blob">'}]})],blobs:{'collision-blob':{b64:b64(incomingBytes),tipe:'application/test'}},ruang:[],seq:1,kartu:[],ujian:[]};
h=await terapkanImporJson(r,'gabung',{[r.catatan[0].id]:'impor'});
const imported=state.notes[0],ref=imported.blocks[0].content.match(/data-blob="([^"]+)/)?.[1],blob=ref&&await ambilBlob(ref);
ok('memilih versi cadangan memperbarui catatan dan remap blob ID bentrok',imported.title==='Incoming'&&ref!=='collision-blob'&&!!blob);
ok('remap mempertahankan isi blob cadangan dan tidak menimpa lokal',!!blob&&Buffer.compare(Buffer.from(await bytesOf(blob)),Buffer.from(incomingBytes))===0&&Buffer.compare(Buffer.from(await bytesOf(await ambilBlob('collision-blob'))),Buffer.from(old))===0);

console.log(`\nTotal: ${total} · Lulus: ${total-fail} · Gagal: ${fail}`);if(fail)process.exit(1);process.exit(0);
