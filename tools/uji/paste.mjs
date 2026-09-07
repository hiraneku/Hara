/* Paste & input handling: keamanan, blok, ID, caret, undo, autosave. */
import {JSDOM} from 'jsdom';
import fs from 'fs';
import { indexedDB as fakeIDB } from 'fake-indexeddb';
import path from 'path';
import { fileURLToPath } from 'url';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const AKAR=process.cwd();
const dom=new JSDOM(fs.readFileSync('docs/index.html','utf8'),{url:'https://x.test/',pretendToBeVisual:true});
const {window:w}=dom; w.indexedDB=fakeIDB;
for(const k of ['document','getSelection','HTMLElement','Node','Range','MouseEvent','KeyboardEvent','Event','InputEvent','localStorage','Image','Blob'])
  if(w[k]!==undefined) globalThis[k]=w[k];
globalThis.window=w; globalThis.self=w; globalThis.indexedDB=w.indexedDB;
globalThis.addEventListener=w.addEventListener.bind(w);
Object.defineProperty(globalThis,'navigator',{value:w.navigator,configurable:true});
w.URL.createObjectURL=()=>'blob:x/1';w.URL.revokeObjectURL=()=>{};globalThis.URL=w.URL;
const V=fs.readFileSync('docs/app.js','utf8').match(/\?v=(\d+)/)[1];
await import(`${AKAR}/docs/app.js?v=${V}`);
const {go}=await import(`${AKAR}/docs/core/router.js?v=${V}`);
const {saveNow}=await import(`${AKAR}/docs/notes/editor/cleanup.js?v=${V}`);
const {state}=await import(`${AKAR}/docs/core/store.js?v=${V}`);
const H=await import(`${AKAR}/docs/notes/editor/history.js?v=${V}`);
const d=w.document,SEL=w.getSelection();
let P=0,F=0;const gagal=[];
const ok=(n,c,det)=>{c?P++:(F++,gagal.push(n+(det?'\n        '+det:'')));};
const click=el=>el&&el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
const gb=g=>d.querySelector(`.mb-g[data-g="${g}"]`);
const DOC=()=>d.querySelector('.ed-doc');
const sleep=(ms=25)=>new Promise(r=>setTimeout(r,ms));
const bersih=t=>t.replace(/[\u200b\u00a0]/g,'');
go('notes'); click(d.querySelector('[data-open="w"]'));
const N=()=>{saveNow();return state.notes.find(x=>x.id===state.openId);};
function siap(html){
  DOC().innerHTML=html;
  DOC().dispatchEvent(new w.Event('input',{bubbles:true}));
  saveNow();
}
function taruhCaret(blokIdx,offset){
  const b=DOC().children[blokIdx];
  const jalan=d.createTreeWalker(b,4,null);
  const t=jalan.nextNode()||b.appendChild(d.createTextNode(''));
  const r=d.createRange();
  r.setStart(t,Math.min(offset,t.length));r.collapse(true);
  SEL.removeAllRanges();SEL.addRange(r);
  d.dispatchEvent(new w.Event('selectionchange'));
}
function tempel(plain,html){
  const ev=new w.Event('paste',{bubbles:true,cancelable:true});
  ev.clipboardData={ getData:t=>t==='text/html'?(html||''):(plain||''), types:['text/plain'] };
  DOC().dispatchEvent(ev);
  return ev.defaultPrevented;
}
const tipe=()=>N().blocks.map(b=>b.type);
const isi=()=>N().blocks.map(b=>b.content.replace(/<[^>]*>/g,''));
const ids=()=>N().blocks.map(b=>b.id);
const caretDi=()=>{ if(!SEL.rangeCount)return null;
  const r=SEL.getRangeAt(0);let n=r.startContainer;
  const teks=n.nodeType===3?n.data:'';
  return {teks:bersih(teks),off:r.startOffset}; };

console.log('══ 1. PLAIN TEXT satu baris ══');
siap('<div class="b-p">Halo</div>');
const id1=ids()[0];
taruhCaret(0,4);
ok('paste dicegah (ditangani sendiri)', tempel(' dunia'));
ok('teks tersambung', bersih(DOC().textContent)==='Halo dunia', JSON.stringify(bersih(DOC().textContent)));
ok('tetap 1 blok', N().blocks.length===1);
ok('ID blok TIDAK berubah', ids()[0]===id1);
ok('caret setelah sisipan', caretDi() && caretDi().off===6, JSON.stringify(caretDi()));

console.log('══ 2. paste di AWAL / TENGAH / AKHIR ══');
siap('<div class="b-p">HaloDunia</div>');
taruhCaret(0,0); tempel('X');
ok('awal: "XHaloDunia"', bersih(DOC().textContent)==='XHaloDunia', JSON.stringify(bersih(DOC().textContent)));
siap('<div class="b-p">HaloDunia</div>');
taruhCaret(0,4); tempel('-X-');
ok('tengah: "Halo-X-Dunia"', bersih(DOC().textContent)==='Halo-X-Dunia', JSON.stringify(bersih(DOC().textContent)));
siap('<div class="b-p">HaloDunia</div>');
taruhCaret(0,9); tempel('!');
ok('akhir: "HaloDunia!"', bersih(DOC().textContent)==='HaloDunia!', JSON.stringify(bersih(DOC().textContent)));

console.log('══ 3. MULTI-LINE jadi beberapa blok ══');
siap('<div class="b-p">Awal</div>');
const idAwal=ids()[0];
taruhCaret(0,4);
tempel('satu\ndua\ntiga');
ok('jadi 3 blok', N().blocks.length===3, `dapat ${N().blocks.length}: ${JSON.stringify(isi())}`);
ok('baris pertama menyambung', isi()[0]==='Awalsatu', JSON.stringify(isi()[0]));
ok('blok pertama pertahankan ID', ids()[0]===idAwal);
ok('blok baru dapat ID sendiri', ids()[1]!==idAwal && ids()[2]!==idAwal);
ok('semua ID unik', new Set(ids()).size===ids().length, JSON.stringify(ids()));

console.log('══ 4. multi-line di TENGAH: teks tidak hilang ══');
siap('<div class="b-p">ABCDEF</div>');
taruhCaret(0,3);
tempel('satu\ndua');
ok('ABC+satu di blok 1', isi()[0]==='ABCsatu', JSON.stringify(isi()));
ok('dua+DEF di blok 2', isi()[1]==='duaDEF', JSON.stringify(isi()));
ok('tidak ada teks hilang', isi().join('')==='ABCsatuduaDEF', JSON.stringify(isi().join('')));

console.log('══ 5. RICH TEXT: format sederhana bertahan ══');
siap('<div class="b-p"></div>');
taruhCaret(0,0);
tempel('tebal miring','<b>tebal</b> <i>miring</i>');
ok('bold bertahan', !!DOC().querySelector('b'), JSON.stringify(DOC().innerHTML));
ok('italic bertahan', !!DOC().querySelector('i'));
ok('teks benar', bersih(DOC().textContent)==='tebal miring', JSON.stringify(bersih(DOC().textContent)));

console.log('══ 6. KEAMANAN: script & handler dibuang ══');
siap('<div class="b-p"></div>');
taruhCaret(0,0);
tempel('x','<p onclick="alert(1)">klik</p><script>alert(2)<\/script><img src=x onerror="alert(3)"><p>aman</p>');
const html=DOC().innerHTML;
ok('tanpa onclick', !/onclick/i.test(html), html.slice(0,120));
ok('tanpa <script>', !/<script/i.test(html));
ok('tanpa onerror', !/onerror/i.test(html));
const simpan=JSON.stringify(N().blocks);
ok('tersimpan pun bersih', !/onclick|onerror|<script/i.test(simpan), simpan.slice(0,140));
ok('teks tetap masuk', /klik/.test(DOC().textContent) && /aman/.test(DOC().textContent));

console.log('══ 7. rich text -> blok yang sesuai ══');
siap('<div class="b-p"></div>');
taruhCaret(0,0);
tempel('J\na\nb','<h1>J</h1><ul><li>a</li><li>b</li></ul>');
ok('heading terbaca', tipe().includes('heading'), JSON.stringify(tipe()));
ok('bullet terbaca', tipe().filter(t=>t==='bullet').length===2, JSON.stringify(tipe()));
siap('<div class="b-p"></div>');
taruhCaret(0,0);
tempel('a\nb','<ol><li>a</li><li>b</li></ol>');
ok('ordered-list terbaca', tipe().filter(t=>t==='ordered-list').length===2, JSON.stringify(tipe()));

console.log('══ 8. paste ke CODE BLOCK = teks biasa ══');
siap('<div class="b-code">kode()</div>');
const idKode=ids()[0];
taruhCaret(0,6);
tempel('\nbaris2','<b>tebal</b>');
ok('tetap 1 blok', N().blocks.length===1, `dapat ${N().blocks.length}`);
ok('tetap type=code', tipe()[0]==='code', tipe()[0]);
ok('ID kode tidak berubah', ids()[0]===idKode);
ok('tanpa tag bold', !DOC().querySelector('.b-code b'), JSON.stringify(DOC().innerHTML));

console.log('══ 9. paste ke TODO: checked tetap di meta ══');
siap('<div class="b-todo done"><button class="cbx on"></button>Tugas</div>');
const idTodo=ids()[0];
taruhCaret(0,5);
tempel(' lanjut');
const bt=N().blocks[0];
ok('tetap type=todo', bt.type==='todo', bt.type);
ok('meta.checked tetap true', bt.meta.checked===true, JSON.stringify(bt.meta));
ok('content tanpa [x]', !/\[[ x]\]/.test(bt.content), JSON.stringify(bt.content));
ok('ID todo tidak berubah', ids()[0]===idTodo);
ok('teks tersambung', /Tugas lanjut/.test(bt.content), JSON.stringify(bt.content));

console.log('══ 10. UNDO setelah paste = satu langkah ══');
siap('<div class="b-p">Awal</div>');
H.resetHistory();
taruhCaret(0,4);
tempel('satu\ndua\ntiga');
await sleep(30);
ok('sebelum undo: 3 blok', N().blocks.length===3);
H.undo(); await sleep(20); saveNow();
ok('undo mengembalikan 1 blok', N().blocks.length===1, `dapat ${N().blocks.length}`);
ok('undo mengembalikan teks', isi()[0]==='Awal', JSON.stringify(isi()));
H.redo(); await sleep(20); saveNow();
ok('redo mengembalikan paste', N().blocks.length===3, `dapat ${N().blocks.length}`);

console.log('══ 11. clipboard rusak tidak bikin crash ══');
siap('<div class="b-p">aman</div>');
taruhCaret(0,4);
let crash=false;
try{
  const ev=new w.Event('paste',{bubbles:true,cancelable:true});
  ev.clipboardData={ getData(){ throw new Error('rusak'); }, types:[] };
  DOC().dispatchEvent(ev);
}catch(err){ crash=true; }
ok('tidak crash', !crash);
ok('isi utuh', bersih(DOC().textContent)==='aman', JSON.stringify(bersih(DOC().textContent)));
/* clipboard kosong */
siap('<div class="b-p">tetap</div>');
taruhCaret(0,5);
tempel('','');
ok('clipboard kosong aman', bersih(DOC().textContent)==='tetap');

console.log('══ 12. AUTOSAVE + reload ══');
siap('<div class="b-p">Mulai</div>');
taruhCaret(0,5);
tempel('satu\ndua');
await sleep(900);
const raw=w.localStorage.getItem('hara.v1')||'';
ok('tersimpan otomatis', /Mulaisatu/.test(raw), raw.slice(0,80));
ok('tersimpan sebagai blocks', /"blocks"/.test(raw));
ok('tanpa field html', !/"html":/.test(raw));
const idSblmMuat=ids();
go('notes'); go('editor'); await sleep(80);
ok('isi sama setelah render ulang', isi().join('|')==='Mulaisatu|dua', JSON.stringify(isi()));
ok('ID bertahan setelah render ulang', ids().join()===idSblmMuat.join(), JSON.stringify(ids()));

console.log('══ 13. paste menggantikan SELEKSI ══');
siap('<div class="b-p">AAABBBCCC</div>');
{ const t=DOC().firstElementChild.firstChild;
  const r=d.createRange(); r.setStart(t,3); r.setEnd(t,6);
  SEL.removeAllRanges(); SEL.addRange(r);
  d.dispatchEvent(new w.Event('selectionchange')); }
tempel('XXX');
ok('seleksi tergantikan', bersih(DOC().textContent)==='AAAXXXCCC', JSON.stringify(bersih(DOC().textContent)));

console.log('══ 14. tidak ada ID duplikat setelah banyak paste ══');
siap('<div class="b-p">start</div>');
for(let i=0;i<4;i++){
  taruhCaret(DOC().children.length-1, 0);
  tempel(`p${i}a\np${i}b`);
  await sleep(10);
}
const semua=ids();
ok('semua ID unik', new Set(semua).size===semua.length, `${semua.length} blok, ${new Set(semua).size} unik`);
ok('semua blok punya ID', semua.every(x=>x&&x.length>3));

console.log('\n════════ HASIL ════════');
if(!gagal.length) console.log(`SEMUA ${P} LOLOS`);
else { console.log(`${F} GAGAL / ${P+F}`); gagal.forEach(x=>console.log('  ✗',x)); }
