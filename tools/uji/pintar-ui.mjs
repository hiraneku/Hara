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
const nmdl=await st('notes/note-model.js');
const {makeNote,makeBlock}=nmdl;
const d=w.document;
const sleep=(ms=15)=>new Promise(r=>setTimeout(r,ms));
let gagal=0;
const oke=(nama,baik,det='')=>{ if(!baik){gagal++;console.log('FAIL',nama,det?'\n      '+det:'');} else console.log('ok  ',nama); };
const klik=el=>{ if(el) el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,view:w})); };


/* ── S1–S5 · integrasi fitur pintar (palette) ── */
const aksi=await st('notes/pintar-aksi.js');
const kunci=await st('notes/kunci.js');
const router3=await st('core/router.js');
const teksCatatan=n=>(n.title||'')+' '+JSON.stringify(n.blocks||[]);
const paraf=t=>[makeBlock({type:'paragraph',content:t})];
const itemId=p=>aksi.itemPintar().map(x=>x.id);
const cari=(id)=>aksi.itemPintar().find(x=>x.id===id);
const siapkan=(daftar,bukaId)=>{ state.notes.splice(0); state.notes.push(...daftar); state.openId=bukaId; };
const mkNote=(id,title,teks,extra={})=>makeNote({id,title,createdAt:Date.now(),updatedAt:Date.now(),blocks:paraf(teks),...extra});

/* S1 · Mirip dengan */
siapkan([
  mkNote('s1a','Rapat anggaran','rapat tim membahas anggaran proyek kuartal ini'),
  mkNote('s1b','Anggaran rapat','anggaran proyek dan rapat tim bulan depan'),
  mkNote('s1c','Resep kue','coklat tepung telur gula kocok lembut'),
],'s1a');
let ids1=itemId();
oke('S1a catatan serupa muncul di palette', ids1.includes('pintar-serupa-s1b'), ids1.join(','));
oke('S1b catatan tak serupa tidak muncul', !ids1.includes('pintar-serupa-s1c'));
await kunci.pasangKunci('s1b','1234');
ids1=itemId();
oke('S1d catatan terkunci tidak dijadikan saran Mirip', !ids1.includes('pintar-serupa-s1b'));
oke('S1e teks catatan terkunci tidak bocor ke hasil', !JSON.stringify(aksi.itemPintar().map(x=>x.label)).includes('Anggaran rapat'));

/* S2 · saran tag */
siapkan([
  mkNote('s2a','Kebun','tanaman pot pupuk kompos tanaman hias',{tags:['berkebun']}),
  mkNote('s2b','Pot baru','pot tanaman pupuk organik',{}),
  mkNote('s2c','Rahasia','tanaman pot pupuk rahasia kebun'),
],'s2b');
await kunci.pasangKunci('s2c','1111');
const tagSaran=aksi.itemPintar().filter(x=>x.id.startsWith('pintar-tag-'));
oke('S2a saran tag muncul dari catatan lain', tagSaran.length>0, JSON.stringify(tagSaran.map(x=>x.label)));
if(tagSaran[0]){ tagSaran[0].jalan(); await sleep(10); }
const s2b=state.notes.find(n=>n.id==='s2b');
oke('S2b klik saran menulis ke tagsManual', !!(s2b.tagsManual && s2b.tagsManual.length===1), JSON.stringify(s2b.tagsManual));
aksi.tambahTagManual('s2c','bocor');
const s2c=state.notes.find(n=>n.id==='s2c');
oke('S2c tag tidak ditulis ke catatan terkunci', !(s2c.tagsManual||[]).length);
aksi.tambahTagManual('s2b',s2b.tagsManual[0]);
oke('S2d tag ganda tidak ditambahkan dua kali', s2b.tagsManual.length===1);

/* S3 · tangkap cepat (palette) */
const promptAsli=w.prompt;
w.prompt=()=> 'besok jam 3 sore rapat tim';
siapkan([mkNote('s3a','Lain','isi')],'s3a');
cari('pintar-tangkap').jalan();
w.prompt=promptAsli;
await sleep(20);
const baru=state.notes[0];
const todo=baru && (baru.blocks||[]).find(b=>b.type==='todo');
oke('S3a tangkap cepat membuat catatan dengan to-do', !!todo && /rapat tim/.test(todo.content||''), JSON.stringify(baru&&baru.blocks));
oke('S3b toast menampilkan jam 15:00', /15:00/.test(d.getElementById('toast')?.textContent||''), d.getElementById('toast')?.textContent);
w.prompt=()=>null;
const jumlahSebelum=state.notes.length;
cari('pintar-tangkap').jalan();
w.prompt=promptAsli;
oke('S3c batal (prompt null) tidak membuat catatan', state.notes.length===jumlahSebelum);

/* S4 · tinjauan mingguan */
siapkan([
  mkNote('s4a','Catatan biasa','isi biasa'),
  mkNote('s4b','RAHASIA-S4','isi sangat rahasia',{}),
],'s4a');
await kunci.pasangKunci('s4b','2222');
const jumlahS4=state.notes.length;
cari('pintar-tinjauan').jalan();
await sleep(20);
const tin=state.notes[0];
oke('S4a tinjauan membuat catatan baru', state.notes.length===jumlahS4+1 && /^Tinjauan /.test(tin.title||''), tin&&tin.title);
const teksTin=teksCatatan(tin);
oke('S4b tinjauan menghitung hanya catatan tak terkunci', /Dibuat: 1 catatan/.test(teksTin), teksTin.slice(0,200));
oke('S4c judul catatan terkunci tidak muncul di tinjauan', !teksTin.includes('RAHASIA-S4'));

/* S5 · ringkasan ekstraktif */
const panjang='Proyek kebun sekolah dimulai bulan lalu. Tim menanam sayuran dan tanaman obat di lahan belakang. Hasil panen pertama dibagikan ke warga sekitar. Rencana berikutnya adalah membuat kompos dari sampah dapur. Dana tambahan sedang diajukan ke dinas.';
siapkan([mkNote('s5a','Kebun sekolah',panjang),mkNote('s5b','Rahasia 5',panjang)],'s5a');
await kunci.pasangKunci('s5b','3333');
const jumlahS5=state.notes.length;
cari('pintar-ringkas').jalan();
await sleep(20);
oke('S5a ringkasan membuat catatan baru', state.notes.length===jumlahS5+1 && /^Ringkasan: Kebun sekolah/.test(state.notes[0].title||''), state.notes[0]&&state.notes[0].title);
oke('S5b ringkasan hanya kalimat asli (ada di sumber)', plainTextOk(state.notes[0], panjang));
state.openId='s5b';
const jumlahS5b=state.notes.length;
aksi.buatRingkasan('s5b');
oke('S5c ringkasan catatan terkunci DITOLAK', state.notes.length===jumlahS5b, state.notes[0]&&state.notes[0].title);
oke('S5d tombol ringkas tidak muncul untuk catatan terkunci', !aksi.itemPintar().some(x=>x.id==='pintar-ringkas'));

function plainTextOk(n, sumber){
  /* tiap kalimat di ringkasan harus kalimat asli dari sumber (tanpa karangan) */
  const para=(n.blocks||[]).filter(b=>b.type==='paragraph');
  const teks=para.length? String(para[0].content||'').replace(/<[^>]*>/g,'') : '';
  const kalimat=teks.split(/(?<=\.)\s+/).map(x=>x.trim()).filter(Boolean);
  return kalimat.length===3 && kalimat.every(k=>sumber.includes(k));
}

console.log(gagal?`ADA ${gagal} GAGAL`:'SEMUA PINTAR-UI OK');
process.exit(gagal?1:0);
