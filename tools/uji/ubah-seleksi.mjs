/* Pratinjau transformasi blok terseleksi: daftar/todo, tabel berstruktur,
   batal, isi dan ID blok terjaga. */
import { JSDOM } from 'jsdom';
import fs from 'fs';
import { indexedDB as fakeIDB } from 'fake-indexeddb';
import path from 'path';
import { fileURLToPath } from 'url';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const AKAR=process.cwd();
const dom=new JSDOM(fs.readFileSync('docs/index.html','utf8'),{url:'https://x.test/',pretendToBeVisual:true});
const {window:w}=dom;w.indexedDB=fakeIDB;
for(const k of ['document','getSelection','HTMLElement','Node','Range','MouseEvent','KeyboardEvent','Event','InputEvent','localStorage','Image','Blob','NodeFilter'])if(w[k]!==undefined)globalThis[k]=w[k];
globalThis.window=w;globalThis.self=w;globalThis.indexedDB=w.indexedDB;
globalThis.addEventListener=w.addEventListener.bind(w);Object.defineProperty(globalThis,'navigator',{value:w.navigator,configurable:true});
w.URL.createObjectURL=()=>'blob:x/1';w.URL.revokeObjectURL=()=>{};globalThis.URL=w.URL;
const V=fs.readFileSync('docs/app.js','utf8').match(/\?v=(\d+)/)[1];
await import(`${AKAR}/docs/app.js?v=${V}`);
const {go}=await import(`${AKAR}/docs/core/router.js?v=${V}`);
const {state}=await import(`${AKAR}/docs/core/store.js?v=${V}`);
const {resetHistory,undo}=await import(`${AKAR}/docs/notes/editor/history.js?v=${V}`);
const U=await import(`${AKAR}/docs/notes/editor/ubah-seleksi.js?v=${V}`);
const d=w.document,S=w.getSelection(),wait=ms=>new Promise(r=>setTimeout(r,ms));
const DOC=()=>d.querySelector('.ed-doc');
let total=0,gagal=0;
const ok=(n,c,det='')=>{total++;if(c)console.log('LULUS',n);else{gagal++;console.log('GAGAL',n,det?'→ '+det:'');}};
const klik=el=>el&&el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
function setup(lines){
  DOC().setAttribute('contenteditable','true');DOC().innerHTML='';
  const blocks=lines.map((text,i)=>{const b=d.createElement('div');b.className='b-p';b.dataset.bid='sel-'+i;b.appendChild(d.createTextNode(text));DOC().appendChild(b);return b;});
  const first=blocks[0].firstChild,last=blocks.at(-1).firstChild;
  const r=d.createRange();r.setStart(first,0);r.setEnd(last,last.length);S.removeAllRanges();S.addRange(r);resetHistory(null);
  return blocks;
}
function preview(jenis){
  const r=S.getRangeAt(0).cloneRange();
  if(!U.bukaMenuUbah(r,null)) return false;
  const action=d.querySelector(`[data-ubah-jenis="${jenis}"]`);
  if(!action)return false;
  klik(action); // uji delegasi klik dokumen/pop yang dipakai antarmuka sebenarnya
  return !!d.querySelector(`[data-ubah-terapkan="${jenis}"]`);
}

go('notes');d.querySelector('[data-open="w"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));await wait(50);
console.log('── Checklist dengan pratinjau ──');
let blocks=setup(['Beli susu','Bayar listrik']);
const ids=blocks.map(b=>b.dataset.bid);
ok('menu konversi menerima rentang multi-blok',preview('todo'));
ok('sebelum konfirmasi blok tidak berubah',blocks.every(b=>b.classList.contains('b-p')));
klik(d.querySelector('[data-ubah-terapkan="todo"]'));await wait(40);
ok('semua blok menjadi todo',blocks.every(b=>b.classList.contains('b-todo')&&b.querySelector(':scope > .cbx')));
ok('teks dan ID blok tetap sama',blocks.every((b,i)=>b.textContent.includes(['Beli susu','Bayar listrik'][i])&&b.dataset.bid===ids[i]));
ok('aksi dapat dibatalkan sebagai satu undo',undo());
await wait(30);
ok('undo mengembalikan paragraf asal',Array.from(DOC().children).slice(0,2).every(b=>b.classList.contains('b-p')&&!b.classList.contains('b-todo')));

console.log('── Kutipan, callout, dan kartu ──');
blocks=setup(['Alasan pertama','Alasan kedua']);
ok('kutipan dapat dipratinjau',preview('quote'));
klik(d.querySelector('[data-ubah-terapkan="quote"]'));await wait(25);
ok('blok terpilih menjadi kutipan tanpa kehilangan isi',Array.from(DOC().children).slice(0,2).every(b=>b.classList.contains('b-quote')&&b.textContent.includes('Alasan')));
blocks=setup(['Ingat fakta ini','Tambahan']);
ok('callout dapat dipratinjau',preview('callout'));
klik(d.querySelector('[data-ubah-terapkan="callout"]'));await wait(25);
ok('callout info memakai tipe info dan mempertahankan isi',Array.from(DOC().children).slice(0,2).every(b=>b.classList.contains('b-cal')&&b.dataset.cal==='info'));
blocks=setup(['Sebutkan ibu kota','Jakarta']);
const kartuAwal=state.kartu.length;
ok('aksi kartu membuka formulir konfirmasi',preview('card')===false && !!d.querySelector('#kt-d'));
ok('depan kartu memakai teks yang dipilih',d.querySelector('#kt-d')?.value==='Sebutkan ibu kotaJakarta',d.querySelector('#kt-d')?.value);
ok('kartu belum dibuat tanpa menekan Simpan',state.kartu.length===kartuAwal);

console.log('── Batal dan daftar ──');
blocks=setup(['Satu','Dua']);
ok('menu daftar tersedia',preview('bullet'));
klik(d.querySelector('[data-ubah-batal]'));
ok('batal tidak mengubah blok',blocks.every(b=>b.classList.contains('b-p')));
ok('daftar bernomor dapat dipratinjau',preview('ordered'));
klik(d.querySelector('[data-ubah-terapkan="ordered"]'));await wait(30);
ok('daftar bernomor diterapkan dan bernomor urut',blocks.every(b=>b.classList.contains('b-ol'))&&blocks.map(b=>b.dataset.n).join(',')==='1.,2.');

console.log('── Tabel dan batas aman ──');
blocks=setup(['Nama | Peran','Ayu | Editor','Bima | Penulis']);
ok('baris berpipa menawarkan konversi tabel',preview('table'));
ok('pratinjau tabel belum mengubah sumber',blocks.every(b=>b.classList.contains('b-p')));
klik(d.querySelector('[data-ubah-terapkan="table"]'));await wait(40);
const table=DOC().querySelector('.b-table');
ok('pilihan berubah menjadi tabel 2 kolom dengan isi utuh',!!table&&table.querySelectorAll('thead th').length===2&&table.querySelectorAll('tbody tr').length===2,
  table&&table.innerHTML.slice(0,250));
ok('ID blok pertama dipertahankan pada tabel',table?.dataset.bid==='sel-0',table?.dataset.bid);
const { htmlToBlocks }=await import(`${AKAR}/docs/notes/note-model.js?v=${V}`);
const modelTable=htmlToBlocks(table.outerHTML).find(b=>b.type==='table');
ok('model menyimpan blok table terstruktur',modelTable?.meta.rows.length===3&&modelTable.meta.rows[0].join('|')==='Nama|Peran');
blocks=setup(['| Judul | Nilai |','| :--- | ---: |','| A | 5 |']);
ok('baris pemisah tabel Markdown tidak dianggap data',preview('table'));
klik(d.querySelector('[data-ubah-terapkan="table"]'));await wait(30);
const mdTable=htmlToBlocks(DOC().querySelector('.b-table').outerHTML).find(b=>b.type==='table');
ok('tabel Markdown menyimpan header dan baris data saja',mdTable?.meta.rows.length===2&&mdTable.meta.rows[1].join('|')==='A|5');

blocks=setup(['Satu','Dua']);
if(!U.bukaMenuUbah(S.getRangeAt(0).cloneRange(),null)) throw Error('menu gagal');
ok('teks tanpa pemisah tidak menawarkan tabel',!d.querySelector('[data-ubah-jenis="table"]'));
blocks=setup(['Pertama','Kedua']);
DOC().children[1].className='b-img';
ok('rentang bercampur blok khusus ditolak',!U.bukaMenuUbah(S.getRangeAt(0).cloneRange(),null));

console.log(`\nTotal: ${total} · Lulus: ${total-gagal} · Gagal: ${gagal}`);
if(gagal)process.exit(1);
