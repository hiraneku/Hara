/* Uji perilaku fitur Warna Teks (bar mekanik):
   - tombol kelompok di bar, isi menu (palet umum, pemilih bulat, kode hex);
   - teks diblok → diwarnai / diganti / dihapus warnanya;
   - tanpa seleksi → warna menunggu ketikan berikutnya (blok berisi & kosong);
   - "Bawaan" di dalam span → karakter berikutnya keluar dari warna;
   - warna ikut tersimpan (bacaEditor) dan tidak merusak ekspor markdown. */
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
const {openNote}=await st('notes/model.js');
const wrn=await st('notes/editor/warna.js');
const fnt=await st('notes/editor/font.js');
const menu=await st('notes/menus/warna.js');
const d=w.document;
const sleep=(ms=15)=>new Promise(r=>setTimeout(r,ms));
let gagal=[]; let no=0;
const oke=(nama,baik,det='')=>{ no++; if(!baik){ gagal.push(nama+(det?'\n      '+det:'')); console.log('FAIL',nama,det?'\n      '+det:''); } };
const DOC=()=>d.querySelector('.ed-doc');
const blokPertama=()=>DOC() && DOC().firstElementChild;

/* siapkan catatan uji */
state.notes.splice(0);
state.notes.push(makeNote({id:'nw1',title:'Uji Warna',
  blocks:[makeBlock({type:'paragraph',content:'satu dua tiga'}),
          makeBlock({type:'paragraph',content:'kuatir'}),
          makeBlock({type:'paragraph',content:''}),
          makeBlock({type:'paragraph',content:''})]}));
openNote('nw1');
await sleep(60);

/* ── 1. tombol kelompok warna ada di bar ── */
oke('w1 tombol kelompok warna ada',!!d.querySelector('.mb-g[data-g="warna"]'));

/* ── 2. menu: strip hitam→putih + warna umum, roda, hex, hapus ── */
const html=menu.warnaMenu();
oke('w2 menu punya judul',html.includes('Warna teks'));
const sw=(html.match(/class="wsw/g)||[]).length;
oke('w3 strip = hitam di awal, putih ikut, jumlah = WARNA_UMUM',
  sw===menu.WARNA_UMUM.length && html.includes('data-warna="#000000"') &&
  html.includes('data-warna="#ffffff"'),`sw=${sw}`);
oke('w3b urutan: hitam-putih sebelum warna-warna lain',
  html.indexOf('data-warna="#000000"')<html.indexOf('data-warna="#e53935"') &&
  html.indexOf('data-warna="#ffffff"')<html.indexOf('data-warna="#e53935"'));
oke('w4 roda bulat + gelap-terang + kolom kode + Pakai (tanpa dialog sistem)',
  html.includes('id="roda-w"')&&html.includes('id="roda-g"')&&
  html.includes('warna-hex')&&html.includes('data-warna-pakai')&&
  !html.includes('type="color"'));
oke('w5 opsi hapus warna (Bawaan)',html.includes('data-warna-hapus')&&html.includes('hapus warna'));
oke('w6a normalisasi hex: pendek, panjang, dgn/tanpa #',
  wrn.normalizeWarna('3b82f6')==='#3b82f6'&&wrn.normalizeWarna('#e62')==='#ee6622'&&
  wrn.normalizeWarna('#abc')==='#aabbcc'&&wrn.normalizeWarna('#ff0000cc')==='#ff0000');
oke('w6b normalisasi rgb()/rgba()/hsl() — kode RGB benar diterima',
  wrn.normalizeWarna('rgb(59, 130, 246)')==='#3b82f6'&&
  wrn.normalizeWarna('rgba(59,130,246,0.4)')==='#3b82f6'&&
  wrn.normalizeWarna('RGB(0,0,0)')==='#000000'&&
  wrn.normalizeWarna('hsl(220,100%,50%)')==='#0055ff',
  `rgb=${wrn.normalizeWarna('rgb(59, 130, 246)')} hsl=${wrn.normalizeWarna('hsl(220,100%,50%)')}`);
oke('w6c kode buruk/format lain tetap ditolak',
  wrn.normalizeWarna('xyz')===null&&wrn.normalizeWarna('')===null&&
  wrn.normalizeWarna('rgb(59,x,246)')===null&&wrn.normalizeWarna('12')===null);

/* ── 2b. roda sungguhan: slider gelap-terang & kolom kode dua arah ── */
const popEl=d.getElementById('pop');
popEl.innerHTML=menu.warnaMenu();
menu.rodaPasang();
const rhex=popEl.querySelector('#warna-hex');
const rsl=popEl.querySelector('#roda-g');
const chip=popEl.querySelector('#warna-chip');
oke('w6d roda mulai dari warna hex yang valid',/^#[0-9a-f]{6}$/.test(rhex.value),rhex.value);
rsl.value=0; rsl.dispatchEvent(new w.Event('input',{bubbles:true}));
oke('w6e gelap penuh → hitam',rhex.value==='#000000',rhex.value);
rsl.value=100; rsl.dispatchEvent(new w.Event('input',{bubbles:true}));
oke('w6f terang penuh → putih',rhex.value==='#ffffff',rhex.value);
rhex.value='rgb(59,130,246)';
rhex.dispatchEvent(new w.Event('input',{bubbles:true}));
oke('w6g kode rgb() diterima & slider ikut',rhex.value==='#3b82f6'&&rsl.value==='60',`${rhex.value} sl=${rsl.value}`);
oke('w6h chip mengikuti warna',wrn.normalizeWarna(chip.style.background||'')==='#3b82f6',chip.style.background);
rhex.value='nope'; rhex.dispatchEvent(new w.Event('input',{bubbles:true}));
oke('w6i kode buruk ditandai (salah)',rhex.classList.contains('salah'));
/* ketuk roda: tepi kanan = rona 0° jenuh penuh, gelap-terang tetap */
const rcv=popEl.querySelector('#roda-w');
rcv.getBoundingClientRect=()=>({left:100,top:50,right:292,bottom:242,width:192,height:192,x:100,y:50});
const lsekarang=menu.hexKeHsl('#3b82f6')[2];
rcv.dispatchEvent(new w.MouseEvent('pointerdown',{bubbles:true,cancelable:true,clientX:292,clientY:146}));
oke('w6j ketukan roda: rona 0° jenuh penuh (gelap-terang tetap)',
  rhex.value===menu.hslKeHex(0,1,lsekarang),`${rhex.value} ≠ ${menu.hslKeHex(0,1,lsekarang)}`);
popEl.innerHTML='';

/* ── 3. seleksi teks lalu beri warna ── */
function selTeks(tn,o,len){
  const r=d.createRange(); r.setStart(tn,o); r.setEnd(tn,o+len);
  w.getSelection().removeAllRanges(); w.getSelection().addRange(r);
}
const b1=blokPertama();
const tn1=Array.from(b1.childNodes).find(n=>n.nodeType===3);
oke('w7 blok siap',!!b1&&!!tn1);
selTeks(tn1,5,3);            /* blok "dua" */
wrn.setWarna('#e6194b');
await sleep(30);
oke('w8 teks diblok terbungkus span warna',b1.innerHTML.includes('class="wrn"')&&b1.innerHTML.includes('data-warna="#e6194b"')&&/style="color:[^"]+"/.test(b1.innerHTML),b1.innerHTML.slice(0,160));
oke('w9 isi teks utuh',b1.textContent==='satu dua tiga',b1.textContent);
oke('w10 bungkus tepat di kata dua',/dua/.test((b1.querySelector('.wrn')||{}).textContent||''),b1.innerHTML.slice(0,200));

/* ── 4. pilih warna lain pada teks berwarna → ganti (tidak bertumpuk) ── */
const wr1=b1.querySelector('.wrn');
const wtn=Array.from(wr1.childNodes).find(n=>n.nodeType===3);
selTeks(wtn,0,3);
wrn.setWarna('#2563EB');
await sleep(20);
oke('w11 ganti warna, span tetap satu',(b1.querySelectorAll('.wrn').length)===1 && b1.innerHTML.includes('data-warna="#2563eb"'),b1.innerHTML.slice(0,200));

/* ── 5. hapus warna pada teks terpilih ── */
const wr2=b1.querySelector('.wrn');
const wtn2=Array.from(wr2.childNodes).find(n=>n.nodeType===3);
selTeks(wtn2,0,3);
wrn.setWarna('');
await sleep(20);
oke('w12 hapus warna melepas bungkus',!b1.querySelector('.wrn')&&b1.textContent==='satu dua tiga');

/* ── 6. tanpa seleksi: warna menunggu ketikan berikutnya ── */
const b2=b1.nextElementSibling;      /* "kuatir" */
const tn2=Array.from(b2.childNodes).find(n=>n.nodeType===3);
selTeks(tn2,0,0);
await sleep(40);            /* biarkan selectionchange pindah-blok tuntas */
wrn.setWarna('#15803D');
await sleep(10);
oke('w13 warna menunggu terlihat (warnaSekarang)',wrn.warnaSekarang()==='#15803d'||wrn.warnaPending()==='#15803d',`${wrn.warnaSekarang()}/${wrn.warnaPending()}`);
/* ketik "x" — simulasikan browser: dispatch beforeinput; kalau handler
   mencegah (format aktif), ia yang menyisipkan; kalau tidak, sisip manual */
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
ketik(b2,'x');
await sleep(25);
oke('w14 huruf pertama masuk span warna',b2.innerHTML.includes('class="wrn"')&&b2.innerHTML.includes('#15803d'),b2.innerHTML.slice(0,200));
ketik(b2,'y');
await sleep(25);
oke('w15 ketikan lanjutan tetap di dalam warna',(b2.querySelector('.wrn')||{}).textContent==='xy',b2.innerHTML.slice(0,200));
oke('w16 teks lama di luar span tetap polos',/^xy/.test(b2.textContent));

/* ── 7. mode hapus-warna: karakter berikutnya keluar dari span ── */
const wrx=b2.querySelector('.wrn');
const wtnx=Array.from(wrx.childNodes).find(n=>n.nodeType===3);
const s=w.getSelection();
const r=d.createRange(); r.setStart(wtnx,2); r.collapse(true);
s.removeAllRanges(); s.addRange(r);
wrn.setWarna('');
await sleep(10);
ketik(b2,'z');
await sleep(25);
oke('w17 karakter setelah "Bawaan" keluar dari span',b2.textContent==='xyzkuatir'&&(b2.querySelector('.wrn')||{}).textContent==='xy',b2.innerHTML.slice(0,220));

/* ── 8. blok kosong + warna menunggu ── */
const b3=b2.nextElementSibling;
const caretDi=blok=>{ const t=d.createTextNode(''); blok.appendChild(t); const rr=d.createRange(); rr.setStart(t,0); rr.collapse(true); w.getSelection().removeAllRanges(); w.getSelection().addRange(rr); return t; };
caretDi(b3);
await sleep(40);
wrn.setWarna('#7C3AED');
await sleep(10);
ketik(b3,'h');
await sleep(25);
oke('w18 blok kosong: huruf pertama berwarna',(b3.querySelector('.wrn')||{}).textContent==='h'&&b3.innerHTML.includes('#7c3aed'),b3.innerHTML.slice(0,160));

/* ── 8b. font + warna sama-sama menunggu: ketikan masuk ke keduanya ── */
const b4=b3.nextElementSibling;      /* blok kosong keempat */
caretDi(b4);
await sleep(40);
fnt.setFont('serif');
wrn.setWarna('#B91C1C');
await sleep(10);
ketik(b4,'a'); await sleep(25);
ketik(b4,'b'); await sleep(25);
const wrA=b4.querySelector('.wrn'), ftA=b4.querySelector('.fnt');
oke('w21 font+warna menunggu: huruf masuk ke span bertingkat',
  b4.textContent==='ab' && !!wrA && wrA.textContent==='ab' &&
  !!ftA && ftA.contains(wrA), b4.innerHTML.slice(0,220));
ketik(b4,'c'); await sleep(25);
oke('w22 ketikan lanjutan tetap dalam warna DAN font',
  (b4.querySelector('.wrn')||{}).textContent==='abc', b4.innerHTML.slice(0,220));
/* Bawaan warna di ujung span berwarna: d keluar warna, tetap di font */
const wrB=b4.querySelector('.wrn');
const tnB=Array.from(wrB.childNodes).find(n=>n.nodeType===3);
const rB=d.createRange(); rB.setStart(tnB,tnB.data.length); rB.collapse(true);
w.getSelection().removeAllRanges(); w.getSelection().addRange(rB);
await sleep(40);
wrn.setWarna('');
await sleep(10);
ketik(b4,'d'); await sleep(25);
oke('w23 "Bawaan" warna di tengah font: huruf keluar warna, font tetap',
  b4.textContent==='abcd' && (b4.querySelector('.wrn')||{}).textContent==='abc' &&
  (b4.querySelector('.fnt')||{}).textContent==='abcd' &&
  b4.querySelectorAll('.wrn').length===1, b4.innerHTML.slice(0,260));

/* ── 9. isi tersimpan (bacaEditor → blocks) memuat span warna ── */
const cln=await st('notes/editor/cleanup.js');
const data=cln.bacaEditor();
const isi=(data.blocks.filter(x=>x.content&&x.content.includes('data-warna=')).map(x=>x.content)||[]).join(' | ');
oke('w19 blok yang disimpan memuat warna',isi.includes('#15803d')&&isi.includes('#7c3aed'),isi.slice(0,160));

/* ── 10. markdown keluar tetap aman (warna dibaca sebagai teks) ── */
cln.saveNow();                    /* tulis DOM ke state catatan sekarang */
await sleep(80);
const io=await st('notes/data-io.js');
const cat=state.notes.find(n=>n.id==='nw1');
const md=io.markdownDariCatatan(cat);
oke('w20 ekspor markdown tak rusak oleh span warna',md.includes('satu dua tiga')&&md.includes('xyz'),md.split('\n').slice(0,8).join(' | '));

console.log(`total: ${no} · gagal: ${gagal.length}`);
if(gagal.length) console.log(gagal.join('\n'));
process.exit(gagal.length?1:0);
