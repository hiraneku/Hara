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

console.log(`\ntotal: ${no} · gagal: ${gagal}`);
if(gagal){ console.log('❌ ADA GAGAL'); process.exit(1); }
console.log('SEMUA LOLOS');
