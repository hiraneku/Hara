/* Integrasi editor: kalimat bertanggal hanya memberi saran; konfirmasi
   mengubah paragraf ke to-do, dan aksi Urungkan memulihkan teks asli. */
import { JSDOM } from 'jsdom';
import fs from 'fs';
import { indexedDB as fakeIDB } from 'fake-indexeddb';
import path from 'path';
import { fileURLToPath } from 'url';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const AKAR=process.cwd();
const dom=new JSDOM(fs.readFileSync('docs/index.html','utf8'),{url:'https://x.test/',pretendToBeVisual:true});
const {window:w}=dom; w.indexedDB=fakeIDB;
for(const k of ['document','getSelection','HTMLElement','Node','Range','MouseEvent','KeyboardEvent','Event','InputEvent','localStorage','Image','Blob','NodeFilter'])
  if(w[k]!==undefined)globalThis[k]=w[k];
globalThis.window=w;globalThis.self=w;globalThis.indexedDB=w.indexedDB;
globalThis.addEventListener=w.addEventListener.bind(w);
Object.defineProperty(globalThis,'navigator',{value:w.navigator,configurable:true});
w.URL.createObjectURL=()=>'blob:x/1';w.URL.revokeObjectURL=()=>{};globalThis.URL=w.URL;
const V=fs.readFileSync('docs/app.js','utf8').match(/\?v=(\d+)/)[1];
await import(`${AKAR}/docs/app.js?v=${V}`);
const {go}=await import(`${AKAR}/docs/core/router.js?v=${V}`);
const {resetHistory}=await import(`${AKAR}/docs/notes/editor/history.js?v=${V}`);
const {aturSaranTugas}=await import(`${AKAR}/docs/notes/editor/auto-tugas.js?v=${V}`);
const d=w.document,S=w.getSelection();
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const click=e=>e&&e.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
const DOC=()=>d.querySelector('.ed-doc');
let total=0,gagal=0;
const ok=(n,c,det='')=>{total++;if(c)console.log('LULUS',n);else{gagal++;console.log('GAGAL',n,det?'→ '+det:'');}};

go('notes');click(d.querySelector('[data-open="w"]'));await wait(80);
DOC().setAttribute('contenteditable','true');DOC().innerHTML='';
const b=d.createElement('div');b.className='b-p';const t=d.createTextNode('Kirim laporan besok jam ');b.appendChild(t);DOC().appendChild(b);
const r=d.createRange();r.setStart(t,t.length);r.collapse(true);S.removeAllRanges();S.addRange(r);
d.dispatchEvent(new w.Event('selectionchange'));resetHistory(null);
const ketik=new w.InputEvent('beforeinput',{bubbles:true,cancelable:true,inputType:'insertText',data:'9'});
DOC().dispatchEvent(ketik);
if(!ketik.defaultPrevented){t.appendData('9');const rk=d.createRange();rk.setStart(t,t.length);rk.collapse(true);S.removeAllRanges();S.addRange(rk);DOC().dispatchEvent(new w.InputEvent('input',{bubbles:true,inputType:'insertText',data:'9'}));}
await wait(850);
ok('teks tetap paragraf sebelum persetujuan',b.classList.contains('b-p')&&!b.classList.contains('b-todo')&&b.textContent.includes('besok'));
const action=d.querySelector('#toast .toast-a');
ok('saran muncul dengan tombol eksplisit',!!action&&action.textContent==='Jadikan tugas',d.querySelector('#toast')?.textContent);
click(action);await wait(80);
ok('persetujuan mengubah paragraf menjadi to-do',b.classList.contains('b-todo')&&b.querySelector(':scope > .cbx'));
ok('isi tugas memakai tanggal di depan dan menyimpan kata tugas',b.textContent.replace(/\s/g,'').includes('besokjam9Kirimlaporan'),b.textContent);
const undo=d.querySelector('#toast .toast-a');
ok('tindakan menyediakan Urungkan',!!undo&&undo.textContent==='Urungkan');
click(undo);await wait(80);
ok('Urungkan memulihkan paragraf asli',b.classList.contains('b-p')&&!b.classList.contains('b-todo')&&b.textContent.includes('Kirim laporan besok jam 9'),b.outerHTML);
d.querySelector('#toast')?.classList.remove('on');
aturSaranTugas(false);
const after=d.createRange();after.setStart(b.firstChild,b.firstChild.length);after.collapse(true);S.removeAllRanges();S.addRange(after);
DOC().dispatchEvent(new w.InputEvent('input',{bubbles:true,inputType:'insertText',data:'9'}));
await wait(850);
ok('sakelar mematikan saran otomatis',!d.querySelector('#toast')?.classList.contains('on'));
aturSaranTugas(true);
console.log(`\nTotal: ${total} · Lulus: ${total-gagal} · Gagal: ${gagal}`);
if(gagal)process.exit(1);
