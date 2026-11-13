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


/* ── P1 · kendali baca pindah ke menu catatan; bar format sembunyi di HP ── */
const router=await st('core/router.js');
const menu=await st('notes/menus/note-menu.js');
const bar=await st('notes/bar/perilaku.js');
const mech=()=>d.getElementById('mech');
state.notes.splice(0);
state.notes.push(makeNote({id:'p1',title:'Uji P1',createdAt:Date.now(),updatedAt:Date.now(),blocks:[makeBlock({type:'paragraph',content:'isi'})]}));
state.openId='p1';
router.go('editor'); await sleep(30);

oke('P1a tombol lipat kendali baca dihapus', !d.getElementById('ed-aksi-buka'));
oke('P1b baris kendali baca tetap ada untuk layar lebar', !!d.getElementById('ed-aksi-isi'));
const mh=menu.menuCatatan();
oke('P1c menu ··· memuat kendali baca (kecil/besar/cari/ganti/dafis/fokus/zen)',
  ['kecil','besar','cari','ganti','dafis','fokus-tulis','zen'].every(k=>mh.includes(`data-et="${k}"`)));
oke('P1d item cari & ganti tidak dobel di menu', (mh.match(/data-note-act="cari-ganti"/g)||[]).length===0);

/* ukuran layar sempit: bar sembunyi saat tidak ada keyboard */
const lebarAsli=w.innerWidth;
w.innerWidth=390;
const kotak=d.createElement('input'); d.body.appendChild(kotak);
kotak.blur(); d.activeElement && d.activeElement.blur && d.activeElement.blur();
bar.pasangPerilakuBar();
bar._uji.perbarui();
oke('P1e HP tanpa keyboard → bar sembunyi', mech().classList.contains('mech-sembunyi'));
kotak.focus(); bar._uji.perbarui();
oke('P1f fokus kolom teks → bar tampil', !mech().classList.contains('mech-sembunyi'));
kotak.blur(); await sleep(5); bar._uji.perbarui();
oke('P1g keyboard tutup → bar sembunyi lagi', mech().classList.contains('mech-sembunyi'));

/* menu terbuka → bar tampil walau tanpa fokus teks */
d.getElementById('pop').classList.add('on'); bar._uji.perbarui();
oke('P1h menu terbuka → bar tampil', !mech().classList.contains('mech-sembunyi'));
d.getElementById('pop').classList.remove('on'); bar._uji.perbarui();

/* gulir ke bawah saat fokus teks → sembunyi; ke atas → tampil lagi */
kotak.focus();
const wrap=d.getElementById('wrap');
wrap.scrollTop=0; wrap.dispatchEvent(new w.Event('scroll'));
wrap.scrollTop=300; wrap.dispatchEvent(new w.Event('scroll'));
oke('P1i gulir ke bawah → bar sembunyi', mech().classList.contains('mech-sembunyi'));
wrap.scrollTop=120; wrap.dispatchEvent(new w.Event('scroll'));
oke('P1j gulir ke atas → bar tampil', !mech().classList.contains('mech-sembunyi'));

/* layar lebar: bar tidak pernah disembunyikan oleh aturan ini */
w.innerWidth=1200; wrap.scrollTop=400; wrap.dispatchEvent(new w.Event('scroll'));
kotak.blur(); bar._uji.perbarui();
oke('P1k layar lebar → bar tetap tampil', !mech().classList.contains('mech-sembunyi'));
w.innerWidth=lebarAsli; kotak.remove();

/* P2: bar kembali ke ujung kiri saat masuk editor (Undo/Redo/`/`/B/I terlihat) */
const bxP2=d.querySelector('.mech-in');
bxP2.scrollLeft=200;
router.go('editor'); await sleep(30);
oke('P2a bar kembali ke kiri saat masuk editor', d.querySelector('.mech-in')===bxP2 && bxP2.scrollLeft===0, String(bxP2.scrollLeft));

/* kendali baca dari menu ··· : menu ditutup, aksinya jalan */
const pop=d.getElementById('pop');
const dots=d.getElementById('dots');
menu.menuCatatan && (pop.innerHTML=menu.menuCatatan());
pop.classList.add('on');
const tZen=pop.querySelector('[data-et="zen"]');
oke('P1l tombol Zen ada di dalam menu ···', !!tZen);
if (tZen) tZen.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,view:w}));
await sleep(20);
oke('P1m klik Zen dari menu ··· → mode fokus aktif & menu tertutup',
  d.body.classList.contains('zen') && !pop.classList.contains('on'),
  'zen='+d.body.classList.contains('zen')+' pop='+pop.classList.contains('on'));
const tZenKeluar=d.querySelector('#ed-aksi-isi [data-et="zen"]');
if (tZenKeluar) tZenKeluar.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,view:w}));
await sleep(20);
oke('P1n Zen dimatikan lagi dari baris kendali (layar lebar)', !d.body.classList.contains('zen'));

/* ── P3 · daftar bertahap ── */
state.notes.splice(0);
for(let i=0;i<120;i++){
  state.notes.push(makeNote({id:'q'+i,title:'Catatan '+i,createdAt:Date.now()-i*1000,updatedAt:Date.now()-i*1000,blocks:[makeBlock({type:'paragraph',content:'isi '+i})]}));
}
const list=await st('notes/views/list.js');
router.go('notes'); await sleep(30);
const jmlBaris=()=>d.querySelectorAll('#wrap .row[data-open]').length;
oke('P3a awal hanya 40 baris di DOM', jmlBaris()===list.LANGKAH_DAFTAR && jmlBaris()===40, String(jmlBaris()));
oke('P3b tombol Muat lagi ada', !!d.querySelector('[data-muat-tombol]'));
oke('P3c pilih semua = seluruh 120 id, bukan 40 yang tampil', list.idDaftarNotes().length===120, String(list.idDaftarNotes().length));
d.querySelector('[data-muat-tombol]').dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,view:w}));
await sleep(30);
oke('P3d klik Muat lagi → 80 baris', jmlBaris()===80, String(jmlBaris()));
wrap.scrollTop=250;
d.querySelector('[data-muat-tombol]').dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,view:w}));
await sleep(30);
oke('P3e Muat lagi kedua → 120 baris, tombol hilang', jmlBaris()===120 && !d.querySelector('[data-muat-tombol]'), String(jmlBaris()));
oke('P3f posisi gulir dijaga saat memuat', wrap.scrollTop===250, String(wrap.scrollTop));

/* filter/urut berubah → batas kembali ke 40 */
const urut=await st('notes/urut.js');
urut.setUrut('az'); router.go('notes'); await sleep(30);
oke('P3g urut diganti → kembali 40 baris', jmlBaris()===40, String(jmlBaris()));

/* pilih semua mengambil seluruh daftar, bukan yang tampil */
const pilih=await st('notes/pilih.js');
router.go('notes'); await sleep(30);
const tombolPilih=d.querySelector('[data-pilih-buka]');
if(tombolPilih){ tombolPilih.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,view:w})); await sleep(20); }
const bilah=d.querySelector('[data-pilih-semua]');
if(bilah){ bilah.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,view:w})); await sleep(20); }
oke('P3h pilih semua mencakup seluruh 120 catatan', pilih.jumlahPilih()===120, String(pilih.jumlahPilih()));

console.log(gagal?`ADA ${gagal} GAGAL`:'SEMUA P1/P3 OK');
process.exit(gagal?1:0);
