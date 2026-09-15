/* Uji: PENCARIAN TAJAM (ronde 7).

   Yang dijaga:
   • operator tag:nama / judul:kata / judul:"frasa" / #nama / "frasa";
   • perilaku lama tidak berubah: semua kata harus cocok, #tag tetap
     jalan, catatan terkunci tak pernah muncul;
   • hasil disorot <mark> dengan teks yang tetap ter-escape (tidak bisa
     menyuntik HTML lewat catatan);
   • riwayat pencarian: tersimpan saat Enter, terbaru di depan, tanpa
     duplikat, bisa dibersihkan, dan TIDAK ikut ke data catatan.

   Jalankan: node tools/uji/cari-tajam.mjs */
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
const misc=await st('notes/views/misc.js');
const cari=await st('notes/cari.js');
const d=w.document;
const sleep=(ms=25)=>new Promise(r=>setTimeout(r,ms));
let gagal=0;
const oke=(nama,baik,det='')=>{ if(!baik){gagal++;console.log('FAIL',nama,det?'\n      '+det:'');} else console.log('ok  ',nama); };
const klik=el=>{ if(el) el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,view:w})); };
const tik=el=>el&&el.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
const ubah=el=>el&&el.dispatchEvent(new w.Event('change',{bubbles:true}));
const hasil=()=>d.getElementById('cari-hasil');
const judulHasil=()=>Array.from(hasil().querySelectorAll('.row[data-open]'))
  .map(r=>r.querySelector('.row-t').textContent.trim());

state.notes.splice(0);
const T = (content, extra={}) => makeNote({blocks:[makeBlock({type:'paragraph',content})], ...extra});
state.notes.push(
  makeNote({id:'c1',title:'Resep kue lapis',tags:['dapur'],blocks:[
    makeBlock({type:'paragraph',content:'Gula <b>pasir</b> &amp; tepung, catatan lama'})]}),
  makeNote({id:'c2',title:'Catatan proyek',tags:['kerja'],blocks:[
    makeBlock({type:'paragraph',content:'Resep jadwal rilis &amp; pembagian tugas'})]}),
  makeNote({id:'c3',title:'Liburan pantai',tags:['dapur','jalan'],blocks:[
    makeBlock({type:'paragraph',content:'Bawa gula aren untuk kopi'})]}),
  makeNote({id:'c4',title:'Buku pinjaman',tags:['kerja'],blocks:[
    makeBlock({type:'paragraph',content:'Kembalikan sebelum kue habis'})]}));

/* ── C1: pemecah kueri ── */
const k1 = cari.pecahKueri('tag:dapur judul:resep');
oke('C1a tag & judul dipisah benar',
  JSON.stringify(k1) === JSON.stringify({tag:['dapur'],judul:['resep'],kata:[]}), JSON.stringify(k1));
const k2 = cari.pecahKueri('judul:"resep kue"');
oke('C1b nilai berkutip boleh berspasi', k2.judul.length === 1 && k2.judul[0] === 'resep kue',
  JSON.stringify(k2));
const k3 = cari.pecahKueri('#dapur gula');
oke('C1c #nama jadi filter tag, sisanya kata biasa',
  k3.tag[0] === 'dapur' && k3.kata[0] === 'gula', JSON.stringify(k3));
const k4 = cari.pecahKueri('judul:resep title:proyek');
oke('C1d title: sama dengan judul:', k4.judul.length === 2, JSON.stringify(k4));
const k5 = cari.pecahKueri('warna:biru');
oke('C1e operator tak dikenal diperlakukan sebagai teks', k5.kata[0] === 'warna:biru', JSON.stringify(k5));

/* ── C2: pencocokan ── */
const cocok = (q,id) => {
  const n = state.notes.find(x=>x.id===id);
  return cari.catatanCocok(n, cari.pecahKueri(q));
};
oke('C2a tag: menyaring per tag', cocok('tag:dapur','c1') && cocok('tag:dapur','c3') && !cocok('tag:dapur','c2'));
oke('C2b judul: hanya judul', cocok('judul:resep','c1') && !cocok('judul:resep','c2'));
oke('C2c frasa utuh dengan kutip', cocok('judul:"kue lapis"','c1') && !cocok('judul:"lapis kue"','c1'));
oke('C2d kata biasa tetap "semua harus cocok"', cocok('gula','c1') && cocok('resep gula','c1') && !cocok('gula proyek','c1'));
oke('C2e kata biasa membaca tag juga', cocok('kerja','c2'));
oke('C2f operator digabung = DAN', cocok('tag:dapur gula','c3') && cocok('tag:dapur gula','c1') && !cocok('tag:kerja gula','c3'));

/* ── C3: sorot hasil ── */
oke('C3a sorotHtml menandai kata', cari.sorotHtml('Gula pasir','gula').includes('<mark class="cari-hl">Gula</mark>'));
oke('C3b teks tetap ter-escape (tanpa suntikan HTML)',
  cari.sorotHtml('<img src=x onerror=1>','img') === '&lt;<mark class="cari-hl">img</mark> src=x onerror=1&gt;',
  cari.sorotHtml('<img src=x onerror=1>','img'));
oke('C3c rentang bertumpuk digabung, tanpa mark bersarang',
  (cari.sorotHtml('abcde', ['abc','cde']).match(/<mark/g)||[]).length === 1,
  cari.sorotHtml('abcde', ['abc','cde']));
oke('C3d tanpa kata → hanya escape', cari.sorotHtml('<b>x</b>', []) === '&lt;b&gt;x&lt;/b&gt;');

/* ── C4: layar cari ── */
localStorage.removeItem('hara.cari.v1');
router.go('search'); await sleep(50);
const ci = () => d.getElementById('cari-in');
oke('C4a kolom cari ada', !!ci());
misc.renderHasilCari('tag:dapur'); await sleep(30);
oke('C4b hasil tag:dapur benar',
  judulHasil().includes('Resep kue lapis') && judulHasil().includes('Liburan pantai') &&
  !judulHasil().includes('Catatan proyek'), JSON.stringify(judulHasil()));
oke('C4c chip operator tampil di kepala hasil',
  (hasil().textContent||'').includes('tag:dapur'));
misc.renderHasilCari('gula'); await sleep(30);
oke('C4d hasil teks disorot <mark>', hasil().querySelectorAll('mark.cari-hl').length >= 2,
  String(hasil().querySelectorAll('mark.cari-hl').length));
const markTeks = Array.from(hasil().querySelectorAll('mark.cari-hl')).map(m=>m.textContent.toLowerCase());
oke('C4e yang disorot memang kata kuncinya', markTeks.every(t=>t.includes('gula')), JSON.stringify(markTeks));
misc.renderHasilCari('judul:"kue lapis"'); await sleep(30);
oke('C4f frasa di judul menemukan satu catatan', judulHasil().length === 1 && judulHasil()[0] === 'Resep kue lapis',
  JSON.stringify(judulHasil()));
misc.renderHasilCari('tidakada'); await sleep(30);
oke('C4g pesan kosong tetap seperti dulu',
  (hasil().textContent||'').includes('Tidak ada yang cocok dengan “tidakada”.'), hasil().textContent);

/* ── C5: riwayat pencarian ── */
ci().value = 'gula';
tik(ci()); await sleep(30);
oke('C5a Enter menyimpan riwayat', cari.riwayatCari()[0] === 'gula', JSON.stringify(cari.riwayatCari()));
ci().value = 'tag:dapur';
tik(ci()); await sleep(20);
ci().value = 'gula';
ubah(ci()); await sleep(20);
oke('C5b tanpa duplikat & terbaru di depan',
  JSON.stringify(cari.riwayatCari()) === JSON.stringify(['gula','tag:dapur']),
  JSON.stringify(cari.riwayatCari()));
for (let i=0;i<8;i++){ cari.simpanRiwayat('kueri-' + i); }
oke('C5c riwayat dibatasi 6', cari.riwayatCari().length === 6, String(cari.riwayatCari().length));
oke('C5d kueri kosong / hanya operator kosong tidak disimpan',
  cari.simpanRiwayat('   ') === false && cari.simpanRiwayat('tag:') === false);
misc.renderHasilCari(''); await sleep(30);
const chipRx = hasil().querySelectorAll('[data-cari-riwayat]');
oke('C5e riwayat tampil sebagai chip saat kolom kosong', chipRx.length === 6, String(chipRx.length));
klik(chipRx[0]); await sleep(30);
oke('C5f chip riwayat mengisi kolom & menjalankan pencarian',
  ci().value === 'kueri-7' && (hasil().textContent||'').includes('Tidak ada yang cocok'),
  `value=${ci().value}`);
misc.renderHasilCari(''); await sleep(20);
klik(hasil().querySelector('[data-riwayat-hapus]')); await sleep(20);
oke('C5g tombol bersihkan menghapus riwayat', cari.riwayatCari().length === 0,
  JSON.stringify(cari.riwayatCari()));
/* pertahankan kueri saat layar digambar ulang (mis. aksi dari hasil) */
ci().value = 'gula';
ci().dispatchEvent(new w.Event('input', {bubbles:true}));
router.go('notes'); router.go('search'); await sleep(60);
oke('C5i kueri bertahan saat layar digambar ulang',
  ci().value === 'gula' && judulHasil().length >= 1,
  `value=${ci().value} hasil=${judulHasil().length}`);
oke('C5h riwayat tidak menulis apa pun ke data catatan',
  !state.notes.some(n => JSON.stringify(n).includes('kueri-')));

console.log(gagal ? `\ntotal: ${gagal} GAGAL` : '\nSemua uji cari-tajam LOLOS');
if (gagal) process.exit(1);
