/* Uji Ronde 11 · K10 transklusi blok (rujukan baca-saja) & K11 catatan yatim.
   - rujukanDariBlok, selesaikanRujukan, rujukanCatatan, catatanYatim (murni);
   - panelRujukanBlok / panelYatim: status ok, rusak, dan terkunci;
   - rujukan `![[…]]` tidak dihitung sebagai tautan (wikilink) biasa.
   Jalankan: node tools/uji/transklusi-yatim.mjs */
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
const {state}=await import(`${AKAR}/docs/core/store.js?v=${V}`);
const {makeNote}=await import(`${AKAR}/docs/notes/note-model.js?v=${V}`);
const tr=await import(`${AKAR}/docs/notes/transklusi.js?v=${V}`);
const pn=await import(`${AKAR}/docs/notes/panels.js?v=${V}`);
const kunci=await import(`${AKAR}/docs/notes/kunci.js?v=${V}`);

let no=0,g=0;
const ok=(n,c,det='')=>{no++;if(c)console.log('LULUS',n);else{g++;console.log('FAIL',n,det?' → '+det:'');}};
const blk=(id,content,meta)=>({id,type:'paragraph',content,meta:meta||{}});

console.log('══ K10 · transklusi blok & K11 · catatan yatim ══\n');

/* Fixture: Proyek (sumber, blok ber-ref ab12), Catatan Harian (merujuk), Sendiri (yatim) */
const proyek=makeNote({id:'p1',title:'Proyek',blocks:[
  blk('pb1','Rencana <span class="wl">[[Target]]</span> rilis Q4'),
  blk('pb2','Blok kedua tanpa ref',{}),
  blk('pb3','Kalimat untuk ditransklusikan',{ref:'ab12'}),
]});
const target=makeNote({id:'t1',title:'Target',blocks:[blk('tb1','Target kuartal')]});
const harian=makeNote({id:'h1',title:'Harian',blocks:[
  blk('hb1','![[Proyek#^ab12]]'),
  blk('hb2','![[Proyek#^zz99]]'),
  blk('hb3','![[Hilang#^ab12]]'),
  blk('hb4','Catatan biasa tanpa rujukan'),
  blk('hb5','Teks ![[Proyek#^ab12]] di tengah kalimat'),
]});
const sendiri=makeNote({id:'s1',title:'Sendiri',blocks:[blk('sb1','Tidak menaut apa pun')]});
state.notes=[proyek,target,harian,sendiri];

/* 1. deteksi rujukan */
ok('K10 rujukan: blok persis ![[Judul#^id]] terdeteksi',
  JSON.stringify(tr.rujukanDariBlok(harian.blocks[0])) === JSON.stringify({judul:'Proyek',ref:'ab12'}));
ok('K10 rujukan: blok biasa bukan rujukan', tr.rujukanDariBlok(harian.blocks[3]) === null);
ok('K10 rujukan: embed di tengah kalimat bukan rujukan', tr.rujukanDariBlok(harian.blocks[4]) === null);
ok('K10 rujukan: blok kode bukan rujukan',
  tr.rujukanDariBlok({id:'c',type:'code',content:'![[Proyek#^ab12]]'}) === null);

/* 2. resolusi */
const r0=tr.selesaikanRujukan('Proyek','ab12');
ok('K10 resolusi: status ok dengan blok yang benar', r0.status==='ok' && r0.blok.id==='pb3', r0.status);
ok('K10 resolusi: teks ringkas berisi isi blok', r0.status==='ok' && r0.teks==='Kalimat untuk ditransklusikan');
ok('K10 resolusi: ref tidak ada → blok-hilang', tr.selesaikanRujukan('Proyek','zz99').status==='blok-hilang');
ok('K10 resolusi: catatan tidak ada → catatan-hilang', tr.selesaikanRujukan('Hilang','ab12').status==='catatan-hilang');
ok('K10 resolusi: judul tidak peka huruf besar', tr.selesaikanRujukan('  proyek ','ab12').status==='ok');

/* 3. hasil per catatan */
const daftar=tr.rujukanCatatan(harian).map(x=>x.hasil.status);
ok('K10 rujukanCatatan: urutan & status benar',
  daftar.join()==='ok,blok-hilang,catatan-hilang', daftar.join());

/* 4. catatan terkunci: isinya tidak boleh dibaca */
const pinOk = await kunci.pasangKunci('p1','1234').then(()=>true,()=>false);
if(pinOk){
  const rk=tr.selesaikanRujukan('Proyek','ab12');
  ok('K10 terkunci: sumber terkunci tidak dibaca', rk.status==='terkunci' && rk.teks===undefined, rk.status);
  const pnl=pn.panelRujukanBlok(harian);
  ok('K10 terkunci: panel tidak memuat teks rahasia', !pnl.includes('Kalimat untuk ditransklusikan'));
  kunci.resetSesi('p1');
  ok('K10 terkunci: setelah sesi direset, status kembali terkunci',
    tr.selesaikanRujukan('Proyek','ab12').status==='terkunci');
  kunci.lepasKunci('p1');
} else {
  console.log('LEWAT kunci: kripsi tidak tersedia di jsdom');
}

/* 5. panel rujukan blok */
const pH=pn.panelRujukanBlok(harian);
ok('K10 panel: judul "Rujukan blok" dengan jumlah 3 (hb5 bukan rujukan)', pH.includes('Rujukan blok') && pH.includes('<span class="n">3</span>'));
ok('K10 panel: rujukan ok menampilkan teks blok', pH.includes('Kalimat untuk ditransklusikan'));
ok('K10 panel: rujukan ok membawa data-dm-buka & data-dm-bid ke blok sumber',
  pH.includes('data-dm-buka="p1" data-dm-bid="pb3"'));
ok('K10 panel: rujukan rusak ditandai bl-rusak', (pH.match(/bl-rusak/g)||[]).length===2);
ok('K10 panel: catatan tanpa rujukan memberi pesan kosong',
  pn.panelRujukanBlok(sendiri).includes('dm-kosong'));
ok('K10 panel: isi rujukan di-escape (tidak ada HTML mentah)',
  (()=>{const x=makeNote({id:'x1',title:'X',blocks:[blk('xb','<img src=x onerror=1>',{ref:'qq'})]});
        state.notes.push(x);
        const h=makeNote({id:'h9',title:'H9',blocks:[blk('hb9','![[X#^qq]]')]});
        state.notes.push(h);
        const out=pn.panelRujukanBlok(h).includes('<img');
        state.notes=state.notes.filter(n=>n.id!=='x1'&&n.id!=='h9');
        return !out;})());

/* 6. K11 · catatan yatim */
ok('K11 yatim: catatan tanpa tautan masuk dan tidak ditaut', tr.catatanYatim(sendiri)===true);
ok('K11 yatim: catatan yang menaut ke catatan lain bukan yatim', tr.catatanYatim(proyek)===false);
ok('K11 yatim: catatan yang ditaut catatan lain bukan yatim', tr.catatanYatim(target)===false);
ok('K11 yatim: catatan hanya merujuk (embed) tetap yatim bila tanpa tautan wikilink',
  tr.catatanYatim(harian)===true);
ok('K11 yatim: tautan ke catatan yang tak ada tidak menghitung',
  tr.catatanYatim(makeNote({id:'z',title:'Z',blocks:[blk('zb','[[Tak ada]]')]}))===true);
ok('K11 yatim: catatan tanpa judul hanya dihitung dari sisi keluar',
  tr.catatanYatim(makeNote({id:'nt',title:'',blocks:[blk('ntb','Teks')]}))===true);
ok('K11 panelYatim: catatan biasa menghasilkan string kosong', pn.panelYatim(proyek)==='');
ok('K11 panelYatim: catatan yatim menampilkan panel', pn.panelYatim(sendiri).includes('Catatan yatim'));

/* 7. embed tidak dianggap tautan mati / sebutan */
const wrap=w.document.createElement('div');
wrap.innerHTML='!<span class="wl">[[Proyek#^ab12]]</span>';
w.document.body.appendChild(wrap);
const {tandaiTautan}=await import(`${AKAR}/docs/notes/wikilink.js?v=${V}`);
tandaiTautan(wrap);
ok('K10 wikilink: span di belakang "!" tidak ditandai mati',
  !wrap.querySelector('span.wl').classList.contains('dead'));
ok('K10 wikilink: panel Tautan keluar tidak mencatat "Proyek#^ab12" sebagai tautan',
  !pn.panelTautan(makeNote({id:'q',title:'Q',blocks:[blk('qb','!<span class="wl">[[Proyek#^ab12]]</span>')]})).includes('Proyek#^ab12'));

console.log(`\ntotal: ${no} · gagal: ${g}`);
process.exit(g?1:0);
