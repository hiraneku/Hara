/* Uji Ronde 11 · K2/K5 — perilaku di editor & layar Tugas (jsdom):
   - to-do berulang: dicentang → tetap kosong, tenggat bergeser, tersimpan
     sebagai meta.ulangKe, dan tidak masuk daftar "selesai";
   - to-do sekali-jalan tetap ditandai selesai seperti sebelumnya;
   - layar Tugas menampilkan penanda ↻, prioritas, dan jam.
   Jalankan: node tools/uji/ulang-tugas.mjs */
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
const {makeNote,makeBlock}=await st('notes/note-model.js');
const {openNote}=await st('notes/model.js');
const {saveNow}=await st('notes/editor/cleanup.js');
const router=await st('core/router.js');
const pg=await st('notes/pengingat.js');
const d=w.document;
const sleep=(ms=40)=>new Promise(r=>setTimeout(r,ms));

let gagal=0, total=0;
const oke=(nama,baik,det='')=>{ total++; if(!baik){gagal++;console.log('FAIL',nama,det?'\n      '+det:'');} else console.log('ok  ',nama); };
const klik=el=>{ if(el) el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,view:w})); };

const kini=Date.now();
state.notes.splice(0);
state.notes.push(makeNote({id:'u1',title:'Rutin',createdAt:kini-1000,updatedAt:kini,blocks:[
  makeBlock({type:'todo',content:'setiap hari minum air'}),
  makeBlock({type:'todo',content:'besok kirim berkas !!'}),
]}));

await openNote('u1'); await sleep();
const kotak=()=>Array.from(d.querySelectorAll('.ed-doc .b-todo'));
const [rutin, sekali]=kotak();
oke('ada dua to-do di editor', !!rutin && !!sekali, `jumlah=${kotak().length}`);

/* ── berulang ── */
klik(rutin.querySelector(':scope > .cbx')); await sleep();
const ulangAttr=Number(rutin.getAttribute('data-ulang'));
oke('berulang: dicentang tetap kosong (tidak ada kelas done/on)',
  !rutin.classList.contains('done') && !rutin.querySelector(':scope > .cbx').classList.contains('on'));
oke('berulang: data-ulang menunjuk kejadian berikutnya (besok)',
  ulangAttr > 0 && ulangAttr === (()=>{const t=new Date();t.setHours(0,0,0,0);t.setDate(t.getDate()+1);return t.getTime();})(),
  `data-ulang=${rutin.getAttribute('data-ulang')}`);
oke('berulang: tidak menulis data-done', !rutin.hasAttribute('data-done'));

/* ── sekali-jalan tetap seperti semula ── */
klik(sekali.querySelector(':scope > .cbx')); await sleep();
oke('sekali-jalan: dicentang → kelas done + data-done', sekali.classList.contains('done') && sekali.hasAttribute('data-done'));
oke('sekali-jalan: tidak mendapat data-ulang', !sekali.hasAttribute('data-ulang'));

/* ── tersimpan ke model ── */
saveNow(); await sleep();
const n=state.notes.find(x=>x.id==='u1');
const bRutin=n.blocks.find(b=>b.content && b.content.includes('minum air'));
const bSekali=n.blocks.find(b=>b.content && b.content.includes('kirim berkas'));
oke('model: meta.ulangKe tersimpan dari DOM', bRutin && bRutin.meta.ulangKe === ulangAttr,
  JSON.stringify(bRutin && bRutin.meta));
oke('model: to-do berulang tidak dianggap checked', bRutin && bRutin.meta.checked === false);
oke('model: to-do sekali-jalan checked + done', bSekali && bSekali.meta.checked === true && !!bSekali.meta.done);

/* ── layar Tugas ── */
router.go('task'); await sleep();
const teks=d.body.textContent;
oke('Tugas: to-do berulang tampil dengan penanda ↻ dan tenggat besok',
  teks.includes('↻') && teks.includes('minum air'), teks.slice(0,300));
/* to-do yang BELUM dicentang untuk memeriksa prioritas, jam, dan isi (sisa) */
state.notes.push(makeNote({id:'u2',title:'Klien',createdAt:kini-500,updatedAt:kini,blocks:[
  makeBlock({type:'todo',content:'lusa jam 10:00 rapat klien !!!'}),
]}));
router.go('notes'); await sleep(); router.go('task'); await sleep();
const teks2=Array.from(d.querySelectorAll('[data-todo-lompat]')).map(e=>e.textContent.replace(/\s+/g,' ')).join(' | ');
const prio=d.querySelector('.tdg-prio');
oke('Tugas: prioritas !!! tampil', !!prio && prio.textContent==='!!!', prio ? prio.textContent : 'tidak ada');
oke('Tugas: jam tampil di chip (10:00)', teks2.includes('10:00'));
oke('Tugas: isi tanpa frasa tanggal/jam/prioritas', teks2.includes('rapat klien') && !teks2.includes('lusa jam'), teks2);

/* ── mesin tenggat: to-do berulang yang sudah dicentang tidak dihitung ── */
const daftarTugas=pg.tugasMendatang(state.notes);
oke('tugasMendatang: berulang yang bergeser ke besok tetap ada (berulang)',
  daftarTugas.some(x=>x.berulang && x.sisa==='minum air'));

console.log(`\ntotal: ${total} · gagal: ${gagal}`);
process.exit(gagal?1:0);
