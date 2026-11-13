/* Shell/settings accessibility smoke: icon names, focus ring, dialog semantics,
   keyboard dismissal, and minimum touch targets for new vault tooling. */
import { JSDOM } from 'jsdom';
import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';import {indexedDB as fakeIDB} from 'fake-indexeddb';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'));const root=process.cwd();
const html=fs.readFileSync('docs/index.html','utf8'),css=fs.readFileSync('docs/styles/base.css','utf8')+'\n'+fs.readFileSync('docs/styles/notes.css','utf8');
const dom=new JSDOM(html,{url:'https://a11y.test/',pretendToBeVisual:true});const {window:w}=dom;w.indexedDB=fakeIDB;
for(const k of ['document','getSelection','HTMLElement','Node','Range','MouseEvent','KeyboardEvent','Event','InputEvent','localStorage','Image','Blob','NodeFilter'])if(w[k]!==undefined)globalThis[k]=w[k];
globalThis.window=w;globalThis.self=w;globalThis.indexedDB=w.indexedDB;globalThis.addEventListener=w.addEventListener.bind(w);Object.defineProperty(globalThis,'navigator',{value:w.navigator,configurable:true});w.URL.createObjectURL=()=>'blob:x';w.URL.revokeObjectURL=()=>{};globalThis.URL=w.URL;
const V=fs.readFileSync('docs/app.js','utf8').match(/\?v=(\d+)/)[1];await import(`${root}/docs/app.js?v=${V}`);const {go}=await import(`${root}/docs/core/router.js?v=${V}`);
let total=0,fail=0;const ok=(n,c,d='')=>{total++;if(c)console.log('LULUS',n);else{fail++;console.log('GAGAL',n,d)}};const click=x=>x&&x.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
console.log('── Navigasi dan fokus ──');
for(const id of ['back','pal-btn','theme','mode','hamoji-btn','del','setbtn','dots','fab','fab-bnav','zen-x']){const b=w.document.getElementById(id);if(!b)continue;const name=(b.getAttribute('aria-label')||b.getAttribute('title')||b.textContent||'').trim();ok(`${id} memiliki nama aksesibel`,!!name);}
ok('indikator fokus keyboard dan reduced-motion tersedia',/:focus-visible\s*\{/.test(css)&&/prefers-reduced-motion:reduce/.test(css));
go('set');await new Promise(r=>setTimeout(r,30));
ok('Pengaturan membuka kontrol pemeriksaan dan lampiran',!!w.document.querySelector('[data-vault-health]')&&!!w.document.querySelector('[data-attachment-center]'));
click(w.document.querySelector('[data-vault-health]'));
const dlg=w.document.querySelector('#pop [role="dialog"]');
ok('pemeriksaan memakai dialog bernama dan modal',!!dlg&&dlg.getAttribute('aria-modal')==='true'&&!!dlg.getAttribute('aria-labelledby'));
ok('tombol dialog punya sasaran sentuh minimum 44px',/\.vq-dialog button\s*\{[^}]*min-height:\s*44px/s.test(css));
w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
ok('Escape menutup dialog pemeriksaan',!w.document.querySelector('#pop')?.classList.contains('on'));
click(w.document.querySelector('[data-attachment-center]'));
const dialog=w.document.querySelector('#pop [role="dialog"][aria-labelledby="vq-title"]');
ok('pusat lampiran juga dialog modal bernama',!!dialog);
const controls=dialog?.querySelectorAll('button');
controls?.[controls.length-1]?.focus();w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',bubbles:true}));
ok('Tab dibatasi tetap di dalam dialog',w.document.activeElement===controls?.[0]);
w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
console.log(`\nTotal: ${total} · Lulus: ${total-fail} · Gagal: ${fail}`);if(fail)process.exit(1);process.exit(0);
