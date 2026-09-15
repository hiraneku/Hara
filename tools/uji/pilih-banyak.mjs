/* Uji: PILIH BANYAK catatan dari daftar (tahan-lama / tombol "Pilih").

   Yang dijaga di sini:
   • menahan satu baris menyalakan mode pilih; gerakan >10px membatalkan
     (sapuan & scroll tetap jalan);
   • selama mode pilih, mengetuk baris MENANDAI — tidak membuka catatan;
   • bilah mini: jumlah terpilih, pilih semua, semat, arsip, hapus;
   • aksi sekaligus berhenti di satu penyimpanan & satu pesan, dan
     "Urungkan" memulihkan SEMUA yang barusan dihapus;
   • pilihan tidak menempel saat pindah layar / keluar dengan Escape.

   Jalankan: node tools/uji/pilih-banyak.mjs */
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
const st=(...p)=>import(`${AKAR}/docs/${p.join('/')}?v=${V}`);
await st('app.js');
const {state}=await st('core/store.js');
const {makeNote,makeBlock}=await st('notes/note-model.js');
const router=await st('core/router.js');
const pilih=await st('notes/pilih.js');
const d=w.document;
const sleep=(ms=25)=>new Promise(r=>setTimeout(r,ms));
let gagal=0;
const oke=(nama,baik,det='')=>{ if(!baik){gagal++;console.log('FAIL',nama,det?'\n      '+det:'');} else console.log('ok  ',nama); };
const klik=el=>{ if(el) el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,view:w})); };
const tekan=(el,x=0,y=0)=>el&&el.dispatchEvent(new w.MouseEvent('pointerdown',{bubbles:true,cancelable:true,view:w,clientX:x,clientY:y}));
const gerak=(el,x,y)=>el&&el.dispatchEvent(new w.MouseEvent('pointermove',{bubbles:true,cancelable:true,view:w,clientX:x,clientY:y}));
const lepas=el=>el&&el.dispatchEvent(new w.MouseEvent('pointerup',{bubbles:true,cancelable:true,view:w}));
const tombolKey=key=>d.dispatchEvent(new w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));
const bilah=()=>d.getElementById('pilih-bar');
const baris=id=>d.querySelector(`#wrap .row[data-open="${id}"]`);
const picked=id=>baris(id)&&baris(id).classList.contains('picked');
const catatan=id=>state.notes.find(n=>n.id===id);

state.notes.splice(0);
state.notes.push(
  makeNote({id:'p1',title:'Satu',blocks:[makeBlock({type:'paragraph',content:'satu'})]}),
  makeNote({id:'p2',title:'Dua',blocks:[makeBlock({type:'paragraph',content:'dua'})]}),
  makeNote({id:'p3',title:'Tiga',blocks:[makeBlock({type:'paragraph',content:'tiga'})]}));

router.go('notes'); await sleep(60);
oke('P0 tombol "Pilih" ada di bilah daftar', !!d.querySelector('[data-pilih-buka]'));
oke('P0b belum ada kotak centang sebelum mode pilih', !d.querySelector('.pilih-ck'));

/* ── P1: masuk mode pilih lewat tombol ── */
klik(d.querySelector('[data-pilih-buka]')); await sleep(30);
oke('P1a mode pilih menyala', pilih.sedangPilih() && d.body.classList.contains('sedang-pilih'));
oke('P1b bilah mini tampil', bilah() && bilah().hidden === false);
oke('P1c tiap baris dapat kotak centang', d.querySelectorAll('#wrap .pilih-ck').length === 3,
  String(d.querySelectorAll('#wrap .pilih-ck').length));
oke('P1d belum ada yang terpilih', pilih.jumlahPilih() === 0);

/* ── P2: ketukan di baris = menandai, bukan membuka ── */
const openId0 = state.openId;
klik(baris('p2')); await sleep(30);
oke('P2a baris ditandai', picked('p2'));
oke('P2b catatan tidak ikut terbuka', router.cur === 'notes' && state.openId === openId0,
  `cur=${router.cur} open=${state.openId}`);
oke('P2c jumlah terpilih = 1', pilih.jumlahPilih() === 1 && /1/.test(bilah().textContent));
klik(baris('p2')); await sleep(20);
oke('P2d ketuk lagi = lepas; pilihan terakhir habis → mode mati', !pilih.sedangPilih());

/* ── P3: tahan lama menyalakan mode pilih ── */
tekan(baris('p1'), 20, 20);
await sleep(200);
oke('P3a belum menyala sebelum 0,5 detik', !pilih.sedangPilih());
await sleep(420);
oke('P3b setelah ditahan → mode pilih menyala, baris itu terpilih',
  pilih.sedangPilih() && picked('p1'));
lepas(baris('p1')); await sleep(20);

/* klik susulan tepat sesudah tahan tidak membuka catatan */
const openId1 = state.openId;
klik(baris('p1')); await sleep(20);
oke('P3c klik susulan tidak membuka catatan (hanya menandai)',
  router.cur === 'notes' && state.openId === openId1);

/* ── P4: gerakan membatalkan tahan (sapuan/scroll tetap jalan) ── */
klik(d.querySelector('[data-pilih-x]')); await sleep(20);
tekan(baris('p1'), 20, 20);
await sleep(120);
gerak(baris('p1'), 60, 22);       /* >10px → batal */
await sleep(450);
oke('P4 gerakan >10px membatalkan tahan', !pilih.sedangPilih());
lepas(baris('p1'));

/* ── P5: pilih semua + semat sekaligus ── */
tekan(baris('p3'), 5, 5); await sleep(520); lepas(baris('p3'));
klik(bilah().querySelector('[data-pilih-semua]')); await sleep(30);
oke('P5a pilih semua menandai seluruh baris', pilih.jumlahPilih() === 3 &&
  ['p1','p2','p3'].every(picked));
klik(bilah().querySelector('[data-pilih-semat]')); await sleep(40);
oke('P5b semat sekaligus', ['p1','p2','p3'].every(id=>catatan(id).pinned));
oke('P5c mode pilih mati sesudah aksi', !pilih.sedangPilih());
oke('P5d kotak centang dibersihkan', !d.querySelector('.pilih-ck'));

/* ── P6: arsip sekaligus ── */
klik(d.querySelector('[data-pilih-buka]')); await sleep(20);
klik(baris('p1')); klik(baris('p2')); await sleep(20);
klik(bilah().querySelector('[data-pilih-arsip]')); await sleep(40);
oke('P6a dua catatan terarsip', catatan('p1').archived && catatan('p2').archived);
oke('P6b yang tidak dipilih tidak ikut', !catatan('p3').archived);
oke('P6c daftar utama tinggal catatan yang tersisa',
  !!d.querySelector('#wrap .row[data-open="p3"]') && !d.querySelector('#wrap .row[data-open="p1"]'));

/* ── P7: hapus sekaligus + Urungkan memulihkan semuanya ── */
catatan('p1').archived = false; catatan('p2').archived = false;   /* siapkan */
router.go('notes'); await sleep(40);
klik(d.querySelector('[data-pilih-buka]')); await sleep(20);
klik(baris('p3')); klik(baris('p1')); await sleep(20);
oke('P7a dua baris terpilih', pilih.jumlahPilih() === 2, String(pilih.jumlahPilih()));
klik(bilah().querySelector('[data-pilih-hapus]')); await sleep(40);
oke('P7b catatan masuk sampah (soft delete)',
  !!catatan('p3').deletedAt && !!catatan('p1').deletedAt);
oke('P7c mode pilih mati sesudah hapus', !pilih.sedangPilih());
const toastEl = d.getElementById('toast');
oke('P7d pesan menyebut jumlah', /2/.test(toastEl.textContent || ''), toastEl.textContent);
const url = toastEl.querySelector('.toast-a');
oke('P7e ada tombol Urungkan', !!url);
klik(url); await sleep(60);
oke('P7f Urungkan memulihkan SEMUA yang barusan dihapus',
  !catatan('p3').deletedAt && !catatan('p1').deletedAt,
  [catatan('p3').deletedAt, catatan('p1').deletedAt].join(','));

/* ── P8: pilihan tidak menempel saat pindah layar ── */
router.go('notes'); await sleep(40);
klik(d.querySelector('[data-pilih-buka]')); await sleep(20);
klik(baris('p1')); await sleep(20);
oke('P8a terpilih dulu', pilih.jumlahPilih() === 1);
router.go('set'); await sleep(40);
oke('P8b pindah layar mematikan mode pilih & bilah', !pilih.sedangPilih() && bilah().hidden === true);
router.go('notes'); await sleep(40);
tekan(baris('p2'), 5, 5); await sleep(520); lepas(baris('p2'));
tombolKey('Escape'); await sleep(20);
oke('P8c Escape mengakhiri mode pilih', !pilih.sedangPilih());

/* ── P9: tombol semat kecil di baris disembunyikan selama memilih ── */
tekan(baris('p2'), 5, 5); await sleep(520); lepas(baris('p2'));
oke('P9a baris terpilih punya aria-pressed', baris('p2').getAttribute('aria-pressed') === 'true');
oke('P9b CSS menyembunyikan tombol semat saat memilih',
  fs.readFileSync('docs/styles/notes.css','utf8').includes('body.sedang-pilih .row .pinx'));
klik(d.querySelector('[data-pilih-x]')); await sleep(20);

/* ── P10: arsip — tombol Pilih muncul, dan "Kembalikan" bekerja ── */
catatan('p2').archived = true; catatan('p3').archived = true;    /* siapkan */
router.go('arsip'); await sleep(50);
oke('P10a arsip punya tombol Pilih', !!d.querySelector('[data-pilih-buka]'));
klik(d.querySelector('[data-pilih-buka]')); await sleep(20);
{
  const barisArsip = d.querySelectorAll('#wrap .row[data-open]');
  oke('P10b kotak centang hanya di baris catatan arsip',
    barisArsip.length === 2 && d.querySelectorAll('#wrap .pilih-ck').length === 2);
}
klik(baris('p1')); await sleep(20);
klik(bilah().querySelector('[data-pilih-arsip]')); await sleep(40);
oke('P10c "Kembalikan" dari layar arsip', !catatan('p1').archived,
  String(catatan('p1').archived));

console.log(gagal ? `\ntotal: ${gagal} GAGAL` : '\nSemua uji pilih-banyak LOLOS');
if (gagal) process.exit(1);
