/* Uji Ronde 11 · K12 pencarian terindeks, peringkat relevansi, dan toleransi salah ketik.
   - paritas: cocokPersis (inti) = catatanCocok (cari.js lama) untuk banyak kueri;
   - peringkat: judul diawali > kata judul > tag > isi; tie → terbaru;
   - mirip: hanya bila hasil persis kosong; operator tag:/judul: tetap persis;
   - layani(): alur pesan Worker (indeks → cari);
   - jsdom: hasil tampil urut, catatan terkunci tidak bocor (D19), kueri basi dibuang.
   Jalankan: node tools/uji/cari-peringkat.mjs */
import {JSDOM} from 'jsdom';
import fs from 'fs';
import { indexedDB as fakeIDB } from 'fake-indexeddb';
import path from 'path';
import { fileURLToPath } from 'url';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const AKAR=process.cwd();
const dom=new JSDOM(fs.readFileSync('docs/index.html','utf8'),{url:'https://x.test/',pretendToBeVisual:true});
const {window:w}=dom; w.indexedDB=fakeIDB;
for(const k of ['document','getSelection','HTMLElement','Node','Range','MouseEvent','KeyboardEvent','Event','InputEvent','localStorage','Image','Blob','NodeFilter'])
  if(w[k]!==undefined) globalThis[k]=w[k];
globalThis.window=w; globalThis.self=w; globalThis.indexedDB=w.indexedDB;
globalThis.addEventListener=w.addEventListener.bind(w);
Object.defineProperty(globalThis,'navigator',{value:w.navigator,configurable:true});
w.URL.createObjectURL=()=>'blob:x/1';w.URL.revokeObjectURL=()=>{};globalThis.URL=w.URL;
const V=fs.readFileSync('docs/app.js','utf8').match(/\?v=(\d+)/)[1];
await import(`${AKAR}/docs/app.js?v=${V}`);
const {router}={router:await import(`${AKAR}/docs/core/router.js?v=${V}`)};
const {state}=await import(`${AKAR}/docs/core/store.js?v=${V}`);
const {makeNote}=await import(`${AKAR}/docs/notes/note-model.js?v=${V}`);
const cari=await import(`${AKAR}/docs/notes/cari.js?v=${V}`);
const inti=await import(`${AKAR}/docs/notes/cari-inti.js?v=${V}`);
const misc=await import(`${AKAR}/docs/notes/views/misc.js?v=${V}`);
const kunci=await import(`${AKAR}/docs/notes/kunci.js?v=${V}`);
const {tagUntukTampil}=await import(`${AKAR}/docs/notes/tags.js?v=${V}`);
const {plainText}=await import(`${AKAR}/docs/notes/note-model.js?v=${V}`);

let no=0,g=0;
const ok=(n,c,det='')=>{no++;if(c)console.log('LULUS',n);else{g++;console.log('FAIL',n,det?' → '+det:'');}};
const blk=(id,content)=>({id,type:'paragraph',content});
const sleep=(ms=30)=>new Promise(r=>setTimeout(r,ms));

console.log('══ K12 · pencarian terindeks & peringkat ══\n');

const fx=[
  makeNote({id:'a',title:'Resep kue lapis',updatedAt:100,tags:['dapur'],blocks:[blk('a1','gula tepung telur')]}),
  makeNote({id:'b',title:'Rapat',updatedAt:300,blocks:[blk('b1','bahas kue dan kopi kue kue')]}),
  makeNote({id:'c',title:'Belanja',updatedAt:200,blocks:[blk('c1','beli tepung dan gula')]}),
  makeNote({id:'d',title:'Kue ulang tahun',updatedAt:50,tags:['pesta'],blocks:[blk('d1','lilin')]}),
  makeNote({id:'e',title:'Catatan kosong',updatedAt:10,blocks:[blk('e1','')]}),
  makeNote({id:'f',title:'Kopi pagi',updatedAt:400,tags:['kue'],blocks:[blk('f1','hitam')]}),
];
const entri=fx.map(n=>({id:n.id,judul:n.title,tag:tagUntukTampil(n),teks:plainText(n),updatedAt:n.updatedAt}));

/* 1. paritas dengan catatanCocok lama */
const kueri=['kue','gula','tepung gula','judul:kue','tag:dapur','tag:kue','judul:"kue lapis"','#pesta','kue judul:kue','zzz','"kue lapis"','kopi tag:kue','k','bahas kopi'];
let paritasOk=true, det='';
for(const q of kueri){
  const k=cari.pecahKueri(q);
  for(const n of fx){
    const a=cari.catatanCocok(n,k), b=inti.cocokPersis(entri.find(x=>x.id===n.id),k);
    if(a!==b){paritasOk=false;det=`${q} / ${n.id}: lama=${a} inti=${b}`;}
  }
}
ok('paritas: cocokPersis = catatanCocok untuk semua kueri & catatan', paritasOk, det);

/* 2. peringkat */
const r1=inti.peringkat(entri,cari.pecahKueri('kue'));
ok('peringkat: judul yang diawali kata cocok di depan', r1.ids[0]==='a' || r1.ids[0]==='d', r1.ids.join());
ok('peringkat: catatan dengan tag cocok ikut (f) dan isi (b) tercantum', r1.ids.includes('f') && r1.ids.includes('b'));
ok('peringkat: kata yang tak ada tidak ikut', !r1.ids.includes('c') && !r1.ids.includes('e'));
ok('peringkat: mirip=false saat ada hasil persis', r1.mirip===false);
const r2=inti.peringkat(entri,cari.pecahKueri('kopi'));
ok('peringkat: kata di judul (f) mengalahkan kata di isi (b)', r2.ids.indexOf('f')<r2.ids.indexOf('b'), r2.ids.join());
const r3=inti.peringkat(entri,cari.pecahKueri('gula'));
ok('peringkat: hanya yang cocok (a dan c)', r3.ids.sort().join()==='a,c', r3.ids.join());
const r4=inti.peringkat(entri,cari.pecahKueri('tepung'));
ok('peringkat: seri skor → terbaru (c) lebih dulu dari yang lebih tua', r4.ids.length===2 && r4.ids[0]==='c', r4.ids.join());

/* 3. toleransi salah ketik */
const m1=inti.peringkat(entri,cari.pecahKueri('kuee'));
ok('mirip: salah 1 huruf (kuee) menemukan catatan kue', m1.mirip===true && m1.ids.includes('a') && m1.ids.includes('d'), JSON.stringify(m1));
const m2=inti.peringkat(entri,cari.pecahKueri('telor'));
ok('mirip: "telor" (kata 5 huruf, beda 1) menemukan telur', m2.ids.includes('a') && m2.mirip===true, JSON.stringify(m2));
const m3=inti.peringkat(entri,cari.pecahKueri('ku'));
ok('mirip: kata 2 huruf tidak diberi toleransi (hasil persis, bukan mirip)', m3.mirip===false && m3.ids.length>0, JSON.stringify(m3));
const m4=inti.peringkat(entri,cari.pecahKueri('xyzabc'));
ok('mirip: kata jauh tidak cocok', m4.ids.length===0 && m4.mirip===false);
const m5=inti.peringkat(entri,cari.pecahKueri('tag:kua'));
ok('mirip: operator tag: tetap persis (tidak fuzzy)', m5.ids.length===0, JSON.stringify(m5));
const m6=inti.peringkat(entri,cari.pecahKueri('judul:kuee'));
ok('mirip: operator judul: tetap persis (tidak fuzzy)', m6.ids.length===0, JSON.stringify(m6));

/* 4. Levenshtein */
ok('lev: kitten→sitting = 3', inti.lev('kitten','sitting',5)===3);
ok('lev: batas dini mengembalikan > batas', inti.lev('abcdef','uvwxyz',2)>2);
ok('batasSalah: 0/1/2 sesuai panjang', inti.batasSalah('abc')===0 && inti.batasSalah('abcd')===1 && inti.batasSalah('abcdefgh')===2);

/* 5. alur Worker: indeks → cari (tanpa DOM) */
const b1=inti.layani({jenis:'indeks',indeks:entri,seq:1});
ok('layani: indeks disiapkan', b1.jenis==='siap' && b1.jumlah===fx.length);
const b2=inti.layani({jenis:'cari',k:cari.pecahKueri('gula'),seq:2});
ok('layani: cari memakai indeks yang tersimpan & membalas seq', b2.jenis==='hasil' && b2.seq===2 && b2.ids.sort().join()==='a,c');
const b3=inti.layani({jenis:'entah'});
ok('layani: jenis tak dikenal → galat', b3.jenis==='galat');

/* 6. cariPeringkat tanpa Worker (jsdom) = hasil sinkron */
const cp=await cari.cariPeringkat(fx,cari.pecahKueri('gula'));
ok('cariPeringkat: cadangan sinkron (tanpa Worker) memberi hasil yang sama',
  cp.ids.sort().join()==='a,c', JSON.stringify(cp));

/* 7. jsdom: layar Cari — urutan, D19 (terkunci tidak bocor), kueri basi dibuang */
state.notes.unshift(...fx);
const sec=makeNote({id:'rahasia',title:'Rahasia kue',updatedAt:999,blocks:[blk('rb','kue sangat rahasia')]});
state.notes.unshift(sec);
await kunci.pasangKunci('rahasia','4321').catch(()=>{});
router.go('search'); await sleep(60);
const hasil=()=>w.document.getElementById('cari-hasil');

misc.renderHasilCari('kue'); await sleep(60);
const judulTampil=[...hasil().querySelectorAll('[data-open]')].map(x=>x.getAttribute('data-open'));
ok('layar cari: hasil tampil', judulTampil.length>0, hasil().innerHTML.slice(0,120));
ok('D19: catatan terkunci yang belum dibuka tidak tampil di hasil', !judulTampil.includes('rahasia'), judulTampil.join());

misc.renderHasilCari('kue'); misc.renderHasilCari('gula'); await sleep(60);
const gulaTampil=[...hasil().querySelectorAll('[data-open]')].map(x=>x.getAttribute('data-open'));
ok('kueri berurutan: hasil akhir ("gula") yang tampil, bukan yang lama', gulaTampil.sort().join()==='a,c', gulaTampil.join());

misc.renderHasilCari('kuee'); await sleep(60);
ok('layar cari: kueri mirip memberi label "Mungkin maksudnya"',
  hasil().textContent.includes('Mungkin maksudnya'), hasil().textContent.slice(0,160));

misc.renderHasilCari('xyzabc'); await sleep(60);
ok('layar cari: tanpa hasil memberi pesan kosong', hasil().textContent.includes('Tidak ada yang cocok'));

misc.renderHasilCari(''); await sleep(20);
ok('layar cari: kueri kosong menampilkan petunjuk', hasil().textContent.includes('Ketik kata kunci'));

console.log(`\ntotal: ${no} · gagal: ${g}`);
process.exit(g?1:0);
