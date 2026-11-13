/* Local history restore must be reviewed first and reject a stale diff. */
import {JSDOM} from 'jsdom';import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';import {indexedDB as fakeIDB} from 'fake-indexeddb';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'));const root=process.cwd(),dom=new JSDOM(fs.readFileSync('docs/index.html','utf8'),{url:'https://history.test/',pretendToBeVisual:true}),{window:w}=dom;w.indexedDB=fakeIDB;
for(const k of ['document','getSelection','HTMLElement','Node','Range','MouseEvent','KeyboardEvent','Event','InputEvent','localStorage','Image','NodeFilter'])if(w[k]!==undefined)globalThis[k]=w[k];globalThis.window=w;globalThis.self=w;globalThis.indexedDB=w.indexedDB;globalThis.addEventListener=w.addEventListener.bind(w);Object.defineProperty(globalThis,'navigator',{value:w.navigator,configurable:true});w.URL.createObjectURL=()=>'blob:x';w.URL.revokeObjectURL=()=>{};globalThis.URL=w.URL;
const V=fs.readFileSync('docs/app.js','utf8').match(/\?v=(\d+)/)[1];await import(`${root}/docs/app.js?v=${V}`);const {state}=await import(`${root}/docs/core/store.js?v=${V}`);const {makeNote}=await import(`${root}/docs/notes/note-model.js?v=${V}`);const {tulisKv}=await import(`${root}/docs/core/db-catatan.js?v=${V}`);const {bukaPanelVersiCatatan}=await import(`${root}/docs/notes/fitur-lanjutan-ui.js?v=${V}`);
const wait=ms=>new Promise(r=>setTimeout(r,ms)),click=x=>x&&x.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));let total=0,fail=0;const ok=(n,c)=>{total++;if(c)console.log('LULUS',n);else{fail++;console.log('GAGAL',n)}};
const n=makeNote({id:'history-review',title:'History review',blocks:[{type:'paragraph',content:'current version'}]});state.notes=[n];state.openId=n.id;
await tulisKv('versi:'+n.id,[{at:Date.now()-1000,title:n.title,blocks:[{type:'paragraph',content:'old version'}]}]);
await bukaPanelVersiCatatan(null);await wait(20);
ok('daftar riwayat hanya menawarkan tinjau, bukan pulihkan langsung',!!w.document.querySelector('[data-versi-banding]')&&!w.document.querySelector('[data-versi-pulih]'));
click(w.document.querySelector('[data-versi-banding]'));await wait(15);
ok('perbedaan tampil sebelum tombol pemulihan',w.document.querySelector('#pop')?.textContent.includes('old version')&&w.document.querySelector('#pop')?.textContent.includes('current version'));
n.blocks=[{type:'paragraph',content:'edited after preview'}];
click(w.document.querySelector('[data-versi-pulih]'));await wait(40);
ok('pratinjau basi menolak pemulihan dan mempertahankan edit terbaru',n.blocks[0].content==='edited after preview'&&w.document.querySelector('#toast')?.textContent.includes('Catatan berubah setelah pratinjau')&&!!w.document.querySelector('[data-versi-banding]'));
click(w.document.querySelector('[data-versi-banding]'));await wait(15);click(w.document.querySelector('[data-versi-pulih]'));await wait(70);
ok('setelah tinjau ulang, pemulihan eksplisit mengembalikan versi terpilih',state.notes.find(x=>x.id===n.id)?.blocks[0].content==='old version');
console.log(`\nTotal: ${total} · Lulus: ${total-fail} · Gagal: ${fail}`);if(fail)process.exit(1);process.exit(0);
