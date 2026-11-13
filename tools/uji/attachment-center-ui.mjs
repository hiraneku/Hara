/* Attachment manager requires two clicks for orphan deletion and never offers
   delete for a referenced attachment. */
import {JSDOM} from 'jsdom';import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';import {indexedDB as fakeIDB} from 'fake-indexeddb';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'));const root=process.cwd(),dom=new JSDOM(fs.readFileSync('docs/index.html','utf8'),{url:'https://files.test/',pretendToBeVisual:true}),{window:w}=dom;w.indexedDB=fakeIDB;
for(const k of ['document','getSelection','HTMLElement','Node','Range','MouseEvent','KeyboardEvent','Event','InputEvent','localStorage','Image','NodeFilter'])if(w[k]!==undefined)globalThis[k]=w[k];globalThis.window=w;globalThis.self=w;globalThis.indexedDB=w.indexedDB;globalThis.addEventListener=w.addEventListener.bind(w);Object.defineProperty(globalThis,'navigator',{value:w.navigator,configurable:true});w.URL.createObjectURL=()=>'blob:x';w.URL.revokeObjectURL=()=>{};globalThis.URL=w.URL;
const V=fs.readFileSync('docs/app.js','utf8').match(/\?v=(\d+)/)[1];await import(`${root}/docs/app.js?v=${V}`);const {go}=await import(`${root}/docs/core/router.js?v=${V}`);const {state}=await import(`${root}/docs/core/store.js?v=${V}`);const {makeNote}=await import(`${root}/docs/notes/note-model.js?v=${V}`);const {simpanBlob,ambilBlob}=await import(`${root}/docs/core/blobs.js?v=${V}`);
const wait=ms=>new Promise(r=>setTimeout(r,ms)),click=x=>x&&x.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));let total=0,fail=0;const ok=(n,c)=>{total++;if(c)console.log('LULUS',n);else{fail++;console.log('GAGAL',n)}};
state.notes=[makeNote({id:'attach-source',title:'Source',blocks:[{type:'paragraph',content:'<img data-blob="file-used">'}]})];
await simpanBlob('file-used',new Blob(['used']));await simpanBlob('file-orphan',new Blob(['orphan']));go('set');await wait(30);click(w.document.querySelector('[data-attachment-center]'));await wait(60);
ok('lampiran terpakai tidak menawarkan hapus',!!w.document.querySelector('[data-vq-download="file-used"]')&&!w.document.querySelector('[data-vq-confirm="file-used"]'));
click(w.document.querySelector('[data-vq-confirm="file-orphan"]'));await wait(40);
ok('klik pertama hanya menampilkan konfirmasi, blob masih ada',!!w.document.querySelector('[data-vq-delete="file-orphan"]')&&!!await ambilBlob('file-orphan'));
click(w.document.querySelector('[data-vq-delete="file-orphan"]'));await wait(60);
ok('klik konfirmasi kedua menghapus hanya blob yatim',!await ambilBlob('file-orphan')&&!!await ambilBlob('file-used'));
console.log(`\nTotal: ${total} · Lulus: ${total-fail} · Gagal: ${fail}`);if(fail)process.exit(1);process.exit(0);
