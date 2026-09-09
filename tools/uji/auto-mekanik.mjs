/* Uji: mekanik otomatis saat MENGETIK (bukan lewat menu).
   • #halo lalu spasi/tanda baca/Enter → <span class="tg">#halo</span>
   • "# halo" tetap heading H1 (regresi lama)
   • "---" lalu spasi/Enter → pembatas
   • tidak menyala di blok kode / kode inline / URL / tengah kata
   Jalankan: node tools/uji/auto-mekanik.mjs */
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
const {state}=await import(`${AKAR}/docs/core/store.js?v=${V}`);
const {saveNow}=await import(`${AKAR}/docs/notes/editor/cleanup.js?v=${V}`);
const {semuaTag}=await import(`${AKAR}/docs/notes/tags.js?v=${V}`);
const {sapuTagRusak, normalizeNote, makeNote}=await import(`${AKAR}/docs/notes/note-model.js?v=${V}`);
const d=w.document,SEL=w.getSelection();
const click=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
const DOC=()=>d.querySelector('.ed-doc');
const sleep=(ms=25)=>new Promise(r=>setTimeout(r,ms));
let gagal=0; let no=0;
const cek=(n,c,det='')=>{no++;if(c)console.log('LULUS',n);else{gagal++;console.log('FAIL',n,det?' → '+det:'');}};

go('notes'); click(d.querySelector('[data-open="w"]')); await sleep(50);

/* Blok paragraf baru yang kosong + caret di dalamnya. */
function fresh(){
  DOC().innerHTML='';
  const p=d.createElement('div');p.className='b-p';DOC().appendChild(p);
  const t=d.createTextNode('');p.appendChild(t);
  const r=d.createRange();r.setStart(t,0);r.collapse(true);
  SEL.removeAllRanges();SEL.addRange(r);
  d.dispatchEvent(new w.Event('selectionchange'));
}

/* Tiruan mengetik satu karakter: jalur beforeinput → input. */
function ins(ch){
  const ev=new w.InputEvent('beforeinput',{bubbles:true,cancelable:true,inputType:'insertText',data:ch});
  DOC().dispatchEvent(ev);
  if(!ev.defaultPrevented){
    const r=SEL.getRangeAt(0);let n=r.startContainer,o=r.startOffset;
    if(n.nodeType===3){n.insertData(o,ch);
      const nr=d.createRange();nr.setStart(n,o+ch.length);nr.collapse(true);
      SEL.removeAllRanges();SEL.addRange(nr);}
    else{const t=d.createTextNode(ch);n.insertBefore(t,n.childNodes[o]||null);
      const nr=d.createRange();nr.setStart(t,1);nr.collapse(true);SEL.removeAllRanges();SEL.addRange(nr);}
    DOC().dispatchEvent(new w.Event('input',{bubbles:true}));}
  d.dispatchEvent(new w.Event('selectionchange'));
}
const type=s=>{for(const c of s)ins(c);};
const enter=()=>{
  const ev=new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true});
  DOC().dispatchEvent(ev);
  if(!ev.defaultPrevented){
    const b=DOC().firstElementChild;
    const nb=d.createElement('div');nb.className=b.className;b.after(nb);
    const t=d.createTextNode('');nb.appendChild(t);
    const r=d.createRange();r.setStart(t,0);r.collapse(true);
    SEL.removeAllRanges();SEL.addRange(r);
    DOC().dispatchEvent(new w.Event('input',{bubbles:true}));
  }
  d.dispatchEvent(new w.Event('selectionchange'));
};
const isi=()=>DOC().firstElementChild;
const isiHtml=()=>DOC().firstElementChild.innerHTML;
const isiTeks=()=>DOC().firstElementChild.textContent;
const tgAda=()=>!!DOC().querySelector('span.tg');
const tgKosong=()=>Array.from(DOC().querySelectorAll('span.tg')).some(s=>s.textContent==='');
const isiSimpan=()=>{saveNow();return state.notes.find(x=>x.id===state.openId).blocks;};

console.log('══ Auto mekanik mengetik: #tag, heading, pembatas ══\n');

/* ── #halo → tag ── */
fresh(); type('Halo #halo ');
cek('T1 tag di tengah kalimat: span.tg muncul', tgAda());
cek('T2 teks utuh (spasi & huruf tidak berubah)', isiTeks()==='Halo #halo ', JSON.stringify(isiTeks()));
cek('T3 tidak ada span tag kosong', !tgKosong(), isiHtml());

fresh(); type('#halo ');
cek('T4 tag di awal baris: span.tg muncul', tgAda());
cek('T5 "#halo " bukan heading (blok tetap paragraf)', DOC().firstElementChild.classList.contains('b-p'), isi().className);
cek('T6 teks awal baris utuh', isiTeks()==='#halo ', JSON.stringify(isiTeks()));

fresh(); type('#halo ');
const tg=DOC().querySelector('span.tg');
cek('T7 tag memuat "#halo" persis', !!tg && tg.textContent==='#halo', tg&&tg.textContent);

/* lanjut mengetik setelah tag: kursor di belakang delimiter */
fresh(); type('Halo #halo x');
cek('T8 ketikan lanjutan mendarat setelah spasi penutup', isiTeks()==='Halo #halo x', JSON.stringify(isiTeks()));

/* tanda baca sebagai penutup */
fresh(); type('Halo #halo, dunia');
cek('T9 koma menutup tag tanpa span kosong', tgAda() && !tgKosong(), isiHtml());
cek('T10 teks koma utuh', isiTeks()==='Halo #halo, dunia', JSON.stringify(isiTeks()));
fresh(); type('Halo #halo!');
cek('T11 tanda seru menutup tag', isiTeks()==='Halo #halo!' && tgAda(), isiHtml());

/* tag bersarang */
fresh(); type('Tag #proyek/hara ');
cek('T12 tag bersarang (#a/b) ikut otomatis', isiTeks()==='Tag #proyek/hara ' && tgAda() &&
     DOC().querySelector('span.tg') && DOC().querySelector('span.tg').textContent==='#proyek/hara', isiHtml());

/* jangan menyala di tempat yang salah */
fresh(); type('lihat https://x.test/#bagian ya');
cek('T13 "#bagian" di URL tidak jadi tag', !tgAda(), isiHtml());
fresh(); type('a#b c');
cek('T14 "#b" di tengah kata tidak jadi tag', !tgAda(), isiHtml());
fresh(); type('`x` #halo ');
const ic=DOC().querySelector('code.ic');
cek('T15 kode inline utuh & tag di luarnya', !!ic && ic.textContent==='x' && tgAda() &&
     isiTeks()==='x #halo ', isiHtml());
fresh(); DOC().firstElementChild.className='b-code';
const tn=DOC().firstElementChild.appendChild(d.createTextNode(''));
const r0=d.createRange();r0.setStart(tn,0);r0.collapse(true);
SEL.removeAllRanges();SEL.addRange(r0);
type('#halo ');
cek('T16 dalam blok kode "#halo" tidak jadi tag', !tgAda(), isiHtml());

/* ── Enter menutup tag di ujung baris ── */
fresh(); type('Tulis #halo'); enter(); await sleep(10);
cek('T17 Enter mengubah #halo di ujung baris jadi tag', tgAda() && isiTeks()==='Tulis #halo', isiHtml());
cek('T18 Enter sesudah tag memecah menjadi 2 blok', DOC().children.length===2, String(DOC().children.length));

/* ── tersimpan sebagai blok tag sungguhan (bukan teks polos) ── */
fresh(); type('Catatan #halo dan #dunia ');
const blk=isiSimpan();
cek('T19 isi tersimpan memakai span.tg', (blk[0].content||'').includes('class="tg"'), blk[0].content);
const tagnote=blk[0].content;
cek('T20 dua tag tersimpan utuh', !/class="tg"[^>]*><\/span>/.test(tagnote) &&
     (tagnote.match(/class="tg"/g)||[]).length===2, tagnote);

/* ── regresi: "# halo" tetap heading 1 ── */
fresh(); type('# halo');
cek('T21 "# spasi" tetap heading H1', isi().classList.contains('b-h1'), isi().className);
cek('T22 heading tanpa span tag', !tgAda(), isiHtml());

/* ── pembatas "---" ── */
fresh(); type('--- ');
cek('T23 "--- " + spasi → garis pembatas', !!DOC().querySelector('.b-div'), isiHtml());
cek('T24 pembatas menyisakan paragraf baru di bawahnya',
  DOC().lastElementChild.classList.contains('b-p'), DOC().lastElementChild.className);
fresh(); type('--- '); const sblm=DOC().children.length; type('x');
cek('T25 ketikan lanjutan masuk paragraf baru di bawah pembatas',
  DOC().children.length===sblm && DOC().lastElementChild.textContent==='x' &&
  DOC().lastElementChild.classList.contains('b-p'), isiHtml());
fresh(); type('---'); enter(); await sleep(10);
cek('T26 "---" + Enter → garis pembatas', !!DOC().querySelector('.b-div'), isiHtml());
cek('T27 pembatas tersimpan sebagai type=divider', isiSimpan().some(b=>b.type==='divider'),
  JSON.stringify(isiSimpan().map(b=>b.type)));

/* regresi: "- " tetap daftar */
fresh(); type('- item');
cek('T28 "- item" tetap daftar (bukan pembatas)', isi().classList.contains('b-li'), isi().className);

/* ── regresi laporan pengguna: lanjutan ketikan TIDAK ikut jadi tag ── */
fresh(); type('Halo #halo dunia');
const spA=DOC().querySelector('span.tg');
cek('T29 ketikan lanjutan tidak masuk ke dalam tag', !!spA && spA.textContent==='#halo' &&
     isiTeks()==='Halo #halo dunia', isiHtml());
cek('T30 lanjutan ketikan adalah teks biasa di luar span',
  DOC().querySelector('span.tg').nextSibling && DOC().querySelector('span.tg').nextSibling.nodeType===3 &&
  DOC().querySelector('span.tg').nextSibling.textContent===' dunia', isiHtml());

/* dua tag berurutan di kalimat yang sama */
fresh(); type('Tag #satu dan #dua ya');
const spans2=DOC().querySelectorAll('span.tg');
cek('T31 dua tag otomatis dalam satu kalimat', spans2.length===2 &&
     spans2[0].textContent==='#satu' && spans2[1].textContent==='#dua', isiHtml());
cek('T32 teks utuh dengan dua tag', isiTeks()==='Tag #satu dan #dua ya', JSON.stringify(isiTeks()));

/* simulasi "caret ditarik masuk ke ujung tag" oleh browser: caret
   dipaksa ke ujung-dalam span (tanpa selectionchange), lalu mengetik —
   huruf harus keluar ke teks biasa, span tidak ikut bertambah */
fresh(); type('Halo #halo ');
const spB=DOC().querySelector('span.tg');
const tnB=spB.firstChild;
const rB=d.createRange(); rB.setStart(tnB, tnB.length); rB.collapse(true);
SEL.removeAllRanges(); SEL.addRange(rB);
type('xyz');
cek('T33 caret di ujung-dalam tag: ketikan dikeluarkan ke teks biasa',
  DOC().querySelector('span.tg').textContent==='#halo' && isiTeks()==='Halo #halo xyz', isiHtml());

/* warna tag tidak berubah-ubah: nama tag tetap, data-tt-nya stabil */
fresh(); type('Halo #halo ');
const t1=DOC().querySelector('span.tg').getAttribute('data-tt');
type('q'); type('w');
const t2=DOC().querySelector('span.tg').getAttribute('data-tt');
cek('T34 warna tag stabil saat lanjutan diketik (nama tak berubah)', t1===t2 && !!t1,
  `${t1} -> ${t2}`);

/* mengetik di TENGAH tag (menyunting) tetap dibolehkan */
fresh(); type('Halo #halo ');
const spC=DOC().querySelector('span.tg');
const tnC=spC.firstChild;
const rC=d.createRange(); rC.setStart(tnC, 2); rC.collapse(true);
SEL.removeAllRanges(); SEL.addRange(rC);
type('X');
cek('T35 sunting tengah tag tetap bisa (sisip di tengah nama)',
  DOC().querySelector('span.tg').textContent==='#hXalo', DOC().querySelector('span.tg').textContent);

/* ══ tag hantu: dihapus dari isi → hilang dari cache & agregat ══ */
fresh(); type('Catatan #halo dan #dunia ');
saveNow(); await sleep(10);
cek('T36 dua tag masuk cache setelah simpan',
  state.notes.find(x=>x.id===state.openId).tags.includes('halo') &&
  state.notes.find(x=>x.id===state.openId).tags.includes('dunia'),
  JSON.stringify(state.notes.find(x=>x.id===state.openId).tags));
/* hapus seluruh isi catatan (tag dihapus dari isi) */
DOC().firstElementChild.innerHTML='';
const kos=d.createTextNode(''); DOC().firstElementChild.appendChild(kos);
const rK=d.createRange(); rK.setStart(kos,0); rK.collapse(true);
SEL.removeAllRanges(); SEL.addRange(rK);
d.dispatchEvent(new w.Event('selectionchange'));
saveNow(); await sleep(10);
const nHapus=state.notes.find(x=>x.id===state.openId);
cek('T37 tag yang dihapus dari isi hilang dari cache (tidak hantu)',
  !nHapus.tags.includes('halo') && !nHapus.tags.includes('dunia'),
  JSON.stringify(nHapus.tags));
cek('T38 agregat tag tidak lagi memuat tag yang dihapus',
  !semuaTag().some(t=>t.nama==='halo'||t.nama==='dunia'),
  JSON.stringify(semuaTag()));

/* hapus SATU dari dua tag: sisanya tetap */
fresh(); type('#satu dan #dua ');
saveNow(); await sleep(10);
const spSatu=DOC().querySelector('span.tg');   /* span #satu */
const nDuaSblm=state.notes.find(x=>x.id===state.openId).tags.slice();
spSatu.remove();                                /* hapus #satu dari isi */
saveNow(); await sleep(10);
const nSatu=state.notes.find(x=>x.id===state.openId);
cek('T39 hapus satu tag: hanya tag yang tersisa di isi yang di-cache',
  nSatu.tags.length===1 && nSatu.tags[0]==='dua',
  `sblm ${JSON.stringify(nDuaSblm)} → sdh ${JSON.stringify(nSatu.tags)}`);

/* ══ Enter tidak boleh membelah tag ══ */
/* (a) caret di ujung-dalam tag lalu Enter → pecah SETELAH tag */
fresh(); type('Halo #halo ');
const spE=DOC().querySelector('span.tg');
const tnE=spE.firstChild;
const rE=d.createRange(); rE.setStart(tnE, tnE.length); rE.collapse(true);
SEL.removeAllRanges(); SEL.addRange(rE);
enter(); await sleep(10);
const blkAtas=DOC().children[0];
const blkBawah=DOC().children[1];
const tgAtas=blkAtas.querySelector('span.tg');
cek('T40 Enter saat caret di ujung-dalam tag: tag utuh di baris atas',
  !!tgAtas && tgAtas.textContent==='#halo' && blkAtas.textContent==='Halo #halo', blkAtas.innerHTML);
cek('T41 Enter saat caret di dalam tag: baris bawah TANPA sisa span berwarna',
  !!blkBawah && !blkBawah.querySelector('span.tg') &&
  !/^[^#]/.test(blkBawah.querySelector('span.tg')?'x':''), blkBawah.innerHTML);
/* ketikan lanjutan di baris bawah normal */
const tnBwh=blkBawah.firstChild;
const rBwh=d.createRange(); rBwh.setStart(tnBwh,0); rBwh.collapse(true);
SEL.removeAllRanges(); SEL.addRange(rBwh);
type('teks baru');
cek('T42 ketikan di baris bawah setelah Enter polos (bukan bagian tag)',
  !DOC().children[1].querySelector('span.tg') &&
  (DOC().children[1].textContent||'').trim()==='teks baru', DOC().children[1].innerHTML);

/* (b) caret di TENGAH tag lalu Enter: teks setelah tag pindah ke bawah,
      tag tetap utuh di atas */
fresh(); type('Halo #halo dan dunia ');
const spM=DOC().querySelector('span.tg');
const tnM=spM.firstChild;
const rM=d.createRange(); rM.setStart(tnM, 3); rM.collapse(true);
SEL.removeAllRanges(); SEL.addRange(rM);
enter(); await sleep(10);
const bA2=DOC().children[0];
const bB2=DOC().children[1];
cek('T43 Enter di tengah tag: tag tetap utuh (#halo, bukan #hal / sisa)',
  !!bA2.querySelector('span.tg') &&
  bA2.querySelector('span.tg').textContent==='#halo', bA2.innerHTML);
cek('T44 sisa teks setelah tag pindah ke baris bawah tanpa warna tag',
  !!bB2 && !bB2.querySelector('span.tg') &&
  bB2.textContent.indexOf('dan dunia')>=0, bB2.innerHTML);

/* ══ sapuan data lama: remnant span tag rusak dibersihkan saat muat ══ */
const rmt1=sapuTagRusak('A<span class="tg">o</span> halo');
cek('T45 remnant tag terbelah (isi tanpa #) dilepas bungkusnya (polos)',
  rmt1==='Ao halo', rmt1);
const rmt2=sapuTagRusak('x<span class="tg"></span> y');
cek('T46 span tag kosong dihapus', rmt2==='x y', rmt2);
const rmt3=sapuTagRusak('B<span class="tg">#halo</span> c');
cek('T47 span tag sah TIDAK disentuh', rmt3==='B<span class="tg">#halo</span> c', rmt3);
const nLegacy=normalizeNote({id:'l1',title:'lama',blocks:[
  {id:'b1',type:'paragraph',content:'A<span class="tg">o</span> dan <span class="tg"></span>B'},
  {id:'b2',type:'code',content:'<span class="tg">o</span>'},
],tags:['halo']});
cek('T48 normalisasi data lama membersihkan remnant & span kosong',
  nLegacy.blocks[0].content==='Ao dan B', nLegacy.blocks[0].content);
cek('T49 blok kode tidak disentuh sapuan',
  nLegacy.blocks[1].content==='<span class="tg">o</span>', nLegacy.blocks[1].content);

/* ══ tag manual (impor frontmatter) tetap, tag isi yang dihapus hilang ══ */
const nMan=makeNote({id:'m1',title:'manual',tags:['kerjaku'],tagsManual:['proyek-x'],
  blocks:[{id:'c1',type:'paragraph',content:'<span class="tg">#kerjaku</span>'}]});
const {sinkronTag}=await import(`${AKAR}/docs/notes/tags.js?v=${V}`);
sinkronTag(nMan);
cek('T50 tag isi + tag manual digabung di cache', nMan.tags.length===2 &&
     nMan.tags.includes('kerjaku') && nMan.tags.includes('proyek-x'), JSON.stringify(nMan.tags));
nMan.blocks[0].content='tanpa tag';
sinkronTag(nMan);
cek('T51 hapus span isi: tag isi hilang, tag manual tetap',
  nMan.tags.length===1 && nMan.tags[0]==='proyek-x', JSON.stringify(nMan.tags));

console.log(`\ntotal: ${no} · gagal: ${gagal}`);
if(gagal){ console.log('❌ ADA GAGAL'); process.exit(1); }
console.log('SEMUA LOLOS');
