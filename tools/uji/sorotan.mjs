/* Uji fitur SOROTAN (latar teks) + sasaran Teks/Sorotan di menu warna.
   BAG=A|B|C|D — tiap bagian dijalankan di proses terpisah (keadaan
   IndexedDB/autosave tidak saling mengotori).
   - A: teks terpilih → sorotan; warna teks menumpang; lepas masing-masing;
   - B: sorotan "menunggu", lekat setelah hapus-habis, Bawaan;
   - C: warna teks + sorotan menunggu bersamaan (dua lapis), ganti di
     dalam, tersimpan;
   - D: menu — segmen Teks/Sorotan, ganti sasaran, swatch dipakai sesuai
     sasaran, cincin & chip mengikuti, strip tidak digambar ulang. */
import {JSDOM} from 'jsdom';
import fs from 'fs';
import { indexedDB as fakeIDB } from 'fake-indexeddb';
import path from 'path';
import { fileURLToPath } from 'url';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const dom=new JSDOM(fs.readFileSync('docs/index.html','utf8'),{url:'https://x.test/',pretendToBeVisual:true});
const {window:w}=dom; w.indexedDB=fakeIDB;
for(const k of ['document','getSelection','HTMLElement','Node','Range','MouseEvent','Event','InputEvent','localStorage','Image','Blob','NodeFilter'])
  if(w[k]!==undefined) globalThis[k]=w[k];
globalThis.window=w; globalThis.self=w; globalThis.indexedDB=w.indexedDB;
globalThis.addEventListener=w.addEventListener.bind(w);
Object.defineProperty(globalThis,'navigator',{value:w.navigator,configurable:true});
w.URL.createObjectURL=()=>'blob:x/1';w.URL.revokeObjectURL=()=>{};globalThis.URL=w.URL;
const AKAR=process.cwd();
const V=fs.readFileSync('docs/app.js','utf8').match(/\?v=(\d+)/)[1];
const st=(...p)=>import(`${AKAR}/docs/${p.join('/')}?v=${V}`);
await st('app.js');
const {state}=await st('core/store.js');
const nmdl=await st('notes/note-model.js');
const {makeNote,makeBlock}=nmdl;
const {openNote}=await st('notes/model.js');
const wrn=await st('notes/editor/warna.js');
const srt=await st('notes/editor/sorotan.js');
const cln=await st('notes/editor/cleanup.js');
const mnu=await st('notes/menus/warna.js');
const d=w.document;
const sleep=(ms=25)=>new Promise(r=>setTimeout(r,ms));
let no=0,g=0;const ok=(n,c,det='')=>{no++;if(c){console.log('LULUS',n);}else{g++;console.log('FAIL',n,det);}};
const DOC=()=>d.querySelector('.ed-doc');
const blok1=()=>DOC().firstElementChild;
const selR=(tn,o,len)=>{const r=d.createRange();r.setStart(tn,o);r.setEnd(tn,o+len);w.getSelection().removeAllRanges();w.getSelection().addRange(r);};
const caretDi=blok=>{const t=d.createTextNode('');blok.appendChild(t);const r=d.createRange();r.setStart(t,0);r.collapse(true);w.getSelection().removeAllRanges();w.getSelection().addRange(r);};
function ketik(blok,ch){
  const s=w.getSelection(); let r=s.getRangeAt(0);
  const ev=new w.InputEvent('beforeinput',{bubbles:true,cancelable:true,inputType:'insertText',data:ch});
  DOC().dispatchEvent(ev);
  if(!ev.defaultPrevented){
    let n=r.startContainer,o=r.startOffset;
    if(n.nodeType===3){ n.insertData(o,ch); const nr=d.createRange(); nr.setStart(n,o+ch.length); nr.collapse(true); s.removeAllRanges(); s.addRange(nr); }
  }
  DOC().dispatchEvent(new w.Event('input',{bubbles:true}));
}
async function hapusSemua(blok){
  const r=d.createRange(); r.selectNodeContents(blok);
  w.getSelection().removeAllRanges(); w.getSelection().addRange(r); await sleep(10);
  try{ d.execCommand('delete'); }catch(e){}
  DOC().dispatchEvent(new w.Event('input',{bubbles:true})); await sleep(35);
  const s=w.getSelection(); if(s.rangeCount) s.removeAllRanges();
  /* pengaman: kalau execCommand tak menghapus (jsdom), kosongkan manual */
  if ((blok.textContent||'').replace(/[\u200b\u00a0]/g,'')!=='') {
    while (blok.firstChild) blok.firstChild.remove();
  }
  caretDi(blok); await sleep(10);
}
const catatan=(id,isi)=>makeNote({id,title:id,blocks:[makeBlock({type:'paragraph',content:isi||''}),makeBlock({type:'paragraph',content:'cadangan'})]});
const click=el=>{ if(!el) return false; el.dispatchEvent(new w.MouseEvent('pointerdown',{bubbles:true,cancelable:true})); el.dispatchEvent(new w.MouseEvent('mousedown',{bubbles:true,cancelable:true})); el.dispatchEvent(new w.MouseEvent('mouseup',{bubbles:true,cancelable:true})); el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true})); return true; };
const dbgSel=(tag)=>{const sn=w.getSelection();const an=sn.anchorNode;console.log('DBGsel',tag,sn.rangeCount,sn.isCollapsed,an?an.nodeType===3?'text:'+(an.parentNode.className||an.parentNode.nodeName):an.nodeName:'-' ,sn.rangeCount?sn.getRangeAt(0).startOffset:'-');};
const BAG=process.env.BAG;
const selesai=()=>{console.log(`total: ${no} · gagal: ${g}`);process.exit(g?1:0);};
if (!BAG) {
  /* induk: jalankan keempat bagian sebagai subproses bersih */
  const { spawnSync } = await import('node:child_process');
  const sendiri = fileURLToPath(import.meta.url);
  let totalNo = 0, totalGagal = 0;
  for (const b of ['A', 'B', 'C', 'D']) {
    const r = spawnSync(process.execPath, [sendiri], {
      env: { ...process.env, BAG: b }, cwd: process.cwd(), encoding: 'utf8' });
    const m = (r.stdout || '').match(/total: (\d+) · gagal: (\d+)/);
    console.log(`── sorotan BAG ${b} ${r.status === 0 ? 'OK' : 'GAGAL'}` + (m ? ` (${m[1]}/${m[2]})` : ''));
    if (r.status !== 0) { console.log((r.stdout || '').split('\n').filter(x => /^FAIL/.test(x)).join('\n')); }
    if (m) { totalNo += Number(m[1]); totalGagal += Number(m[2]); }
  }
  console.log(`total: ${totalNo} · gagal: ${totalGagal}`);
  process.exit(totalGagal ? 1 : 0);
}

if (BAG==='A'||BAG==='D') {
/* ══ A. DASAR EDITOR (teks terpilih → sorotan; + warna teks; lepas) ══ */
state.notes.splice(0);
state.notes.push(catatan('sx','satu dua tiga'));
await openNote('sx'); await sleep(90);
let b=blok1();
let tn=Array.from(b.childNodes).find(n=>n.nodeType===3);
selR(tn,5,3); await sleep(30);
srt.setSorotan('#fdd835'); await sleep(30);
let wsr=b.querySelector('.wsr');
ok('A1 teks terpilih bersorotan',!!wsr&&wsr.getAttribute('data-sorotan')==='#fdd835'&&/background/.test(wsr.getAttribute('style')||''),b.innerHTML.slice(0,160));
ok('A2 isi & posisi utuh',b.textContent==='satu dua tiga'&&wsr.textContent==='dua',b.textContent);
selR(Array.from(wsr.childNodes).find(n=>n.nodeType===3),0,3); await sleep(20);
wrn.setWarna('#1e40af'); await sleep(30);
const wrnE=b.querySelector('.wrn');
ok('A3 warna teks menumpang di dalam sorotan',!!wrnE&&wrnE.getAttribute('data-warna')==='#1e40af'&&b.innerHTML.indexOf('wsr')<b.innerHTML.indexOf('wrn'),b.innerHTML.slice(0,220));
selR(Array.from(wrnE.childNodes).find(n=>n.nodeType===3),0,3); await sleep(20);
wrn.setWarna(''); await sleep(30);
ok('A4 hapus warna teks tidak menyentuh sorotan',!!b.querySelector('.wsr')&&!b.querySelector('.wrn')&&b.querySelector('.wsr').textContent==='dua',b.innerHTML.slice(0,200));
selR(Array.from(b.querySelector('.wsr').childNodes).find(n=>n.nodeType===3),0,3); await sleep(20);
srt.setSorotan(''); await sleep(30);
ok('A5 hapus sorotan melepas bungkus',!b.querySelector('.wsr')&&b.textContent==='satu dua tiga',b.innerHTML.slice(0,160));
if (BAG==='A') selesai();
}

if (BAG==='B') {
/* ══ B. SOROTAN MENUNGGU + LEKAT + HAPUS-HABIS + BAWAAN ══ */
state.notes.splice(0);
state.notes.push(catatan('sx',''));
await openNote('sx'); await sleep(90);
const b=blok1();
srt.setSorotan('#fdd835'); await sleep(20);
ketik(b,'H');ketik(b,'a');ketik(b,'l');ketik(b,'o'); await sleep(30);
ok('B1 sorotan menunggu dipakai ketikan',(b.querySelector('.wsr')||{}).getAttribute('data-sorotan')==='#fdd835'&&b.querySelector('.wsr').textContent==='Halo',b.innerHTML.slice(0,140));
await hapusSemua(b);
ok('B2 setelah hapus habis sorotan lekat bertahan',srt.sorotLekat()==='#fdd835'&&srt.sorotSekarang()==='#fdd835',`lekat=${srt.sorotLekat()}`);
ketik(b,'H');ketik(b,'i'); await sleep(30);
ok('B3 ketikan baru ikut sorotan lagi',(b.querySelector('.wsr')||{}).textContent==='Hi',b.innerHTML.slice(0,140));
const tA=Array.from(b.querySelector('.wsr').childNodes).find(n=>n.nodeType===3);
const rr=d.createRange(); rr.setStart(tA,tA.length); rr.collapse(true);
w.getSelection().removeAllRanges(); w.getSelection().addRange(rr); await sleep(10);
srt.setSorotan(''); await sleep(15);
ok('B4 Bawaan memadamkan sorotan',srt.sorotLekat()===null&&srt.modeBawaanSorot());
ketik(b,'x'); await sleep(25);
ok('B5 ketikan setelah Bawaan keluar dari sorotan',b.textContent==='Hix'&&(b.querySelector('.wsr')||{}).textContent==='Hi',b.innerHTML.slice(0,160));
selesai();
}

if (BAG==='C') {
/* ══ C. WARNA+SOROTAN MENUNGGU BERSAMA (dua lapis) ══ */
state.notes.splice(0);
state.notes.push(catatan('sx',''));
await openNote('sx'); await sleep(90);
const b=blok1();
srt.setSorotan('#fdd835'); await sleep(15);
wrn.setWarna('#7c3aed'); await sleep(15);
ketik(b,'w');ketik(b,'o');ketik(b,'w'); await sleep(35);
ok('C1 dua lapis: sorotan luar, warna dalam',!!b.querySelector('.wsr .wrn')&&b.querySelector('.wsr .wrn').getAttribute('data-warna')==='#7c3aed'&&b.querySelector('.wsr').getAttribute('data-sorotan')==='#fdd835',b.innerHTML.slice(0,240));
ok('C2 teks utuh',b.textContent==='wow',b.textContent);
const wtn=Array.from(b.querySelector('.wsr .wrn').childNodes).find(n=>n.nodeType===3);
const rr2=d.createRange(); rr2.setStart(wtn,wtn.length); rr2.collapse(true);
w.getSelection().removeAllRanges(); w.getSelection().addRange(rr2); await sleep(15);
wrn.setWarna('#0ea5e9'); await sleep(15);
ketik(b,'!'); await sleep(30);
ok('C3 ganti warna teks di dalam sorotan berjalan',b.textContent==='wow!'&&!b.querySelector('.wsr .wrn .wsr')&&b.innerHTML.includes('#0ea5e9'),b.innerHTML.slice(0,240));
const data=cln.bacaEditor();
const isi=(data.blocks.filter(x=>x.content&&x.content.includes('data-sorotan=')).map(x=>x.content)||[]).join('|');
ok('C4 isi tersimpan memuat sorotan',isi.includes('data-sorotan="#fdd835"')&&isi.includes('data-warna="#0ea5e9"'),isi.slice(0,220));
selesai();
}

if (BAG==='D') {
/* ══ D. MENU: SEGMEN TEKS/SOROTAN + SWATCH ══ */
state.notes.splice(0);
state.notes.push(catatan('sx','satu dua tiga'));
await openNote('sx'); await sleep(90);
const b=blok1();
const tn=Array.from(b.childNodes).find(n=>n.nodeType===3);
selR(tn,5,3); await sleep(40);
const gb=gr=>d.querySelector(`.mb-g[data-g="${gr}"]`);
click(gb('warna')); await sleep(60);
const pop=()=>d.querySelector('#pop');
ok('D1 segmen Teks & Sorotan ada',!!pop().querySelector('[data-sas="teks"]')&&!!pop().querySelector('[data-sas="sorotan"]'));
ok('D2 sasaran awal = teks',mnu.sasaranSekarang()==='teks'&&pop().querySelector('[data-sas="teks"]').classList.contains('on'));
const wpalD=pop().querySelector('.wpal');
click(pop().querySelector('[data-sas="sorotan"]')); await sleep(50);
ok('D3 sasaran pindah ke sorotan',mnu.sasaranSekarang()==='sorotan'&&pop().querySelector('[data-sas="sorotan"]').classList.contains('on'));
ok('D4 popup & strip tidak digambar ulang',pop().querySelector('.wpal')===wpalD);
const swK=pop().querySelector('[data-warna="#fdd835"]');
click(swK); await sleep(60);
ok('D5 swatch memberi SOROTAN (bukan warna teks)',(b.querySelector('.wsr')||{}).getAttribute('data-sorotan')==='#fdd835'&&!b.querySelector('.wrn'),b.innerHTML.slice(0,200));
ok('D6 popup tetap terbuka & cincin di kuning',pop().classList.contains('on')&&pop().querySelector('.wsw.on')===swK);
/* pilih lagi kata yang tadi disorot (seleksi asli bisa luruh setelah
   pembungkusan DOM di jsdom) lalu beralih ke sasaran Teks */
const wsrX=b.querySelector('.wsr');
selR(Array.from(wsrX.childNodes).find(n=>n.nodeType===3),0,3); await sleep(20);
click(pop().querySelector('[data-sas="teks"]')); await sleep(40);
ok('D7 cincin mengikuti sasaran teks (belum ada warna)',!pop().querySelector('.wsw.on'));
const swM=pop().querySelector('[data-warna="#e53935"]');
click(swM); await sleep(60);
ok('D8 warna teks menyusul di teks bersorotan',(b.querySelector('.wrn')||{}).getAttribute('data-warna')==='#e53935'&&(b.querySelector('.wsr')||{}).getAttribute('data-sorotan')==='#fdd835',b.innerHTML.slice(0,240));
ok('D9 chip segmen menampilkan dua warna',/background:#e53935/.test(pop().querySelector('[data-sas="teks"]').innerHTML)&&/background:#fdd835/.test(pop().querySelector('[data-sas="sorotan"]').innerHTML),pop().innerHTML.slice(0,300));
ok('D10 strip tidak digambar ulang sepanjang interaksi',pop().querySelector('.wpal')===wpalD);
const wrnX=b.querySelector('.wrn');
selR(Array.from(wrnX.childNodes).find(n=>n.nodeType===3),0,3); await sleep(20);
click(pop().querySelector('[data-warna-hapus]')); await sleep(50);
ok('D11 Bawaan hapus warna teks, sorotan tetap',!b.querySelector('.wrn')&&(b.querySelector('.wsr')||{}).getAttribute('data-sorotan')==='#fdd835',b.innerHTML.slice(0,200));
selesai();
}