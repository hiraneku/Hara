/* Uji: C17 — PILIHAN MUTU/KOMPRESI GAMBAR DI PENGATURAN.

   Yang dijaga:
   • empat pilihan (hemat / seimbang / tinggi / tanpa kompresi) dengan
     bawaan "seimbang" seperti perilaku lama (1600 px, mutu 82%);
   • pilihan tersimpan di localStorage dan dibaca ulang modul;
   • keputusan pengecilan (rencanaKecil) murni: gambar kecil tidak
     disentuh, GIF selalu apa adanya, "tanpa kompresi" meneruskan
     berkas asli, dan skala dihitung dari sisi terpanjang;
   • image.js benar-benar memakai keputusan itu (bukan angka tetap);
   • Pengaturan menampilkan pilihan dan memindahkan tanda centang.

   Jalankan: node tools/uji/mutu-gambar.mjs */
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
const mg=await st('notes/mutu-gambar.js');
const d=w.document;
const sleep=(ms=25)=>new Promise(r=>setTimeout(r,ms));
let gagal=0;
const oke=(nama,baik,det='')=>{ if(!baik){gagal++;console.log('FAIL',nama,det?'\n      '+det:'');} else console.log('ok  ',nama); };
const klik=el=>{ if(el) el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,view:w})); };

/* ── M1: daftar pilihan ── */
const kunci = mg.PILIHAN.map(o=>o.k);
oke('M1a empat pilihan tersedia',
  JSON.stringify(kunci) === JSON.stringify(['hemat','seimbang','tinggi','asli']), JSON.stringify(kunci));
oke('M1b tiap pilihan punya nama, keterangan, sisi & mutu',
  mg.PILIHAN.every(o=>o.nama&&o.ket&&typeof o.sisi==='number'&&typeof o.mutu==='number'));
oke('M1c bawaan = perilaku lama (1600 px · 0.82)',
  mg.mutuSekarang() === 'seimbang' && mg.opsiMutu().sisi === 1600 && mg.opsiMutu().mutu === 0.82,
  `${mg.mutuSekarang()} ${mg.opsiMutu().sisi}`);

/* ── M2: simpan pilihan ── */
oke('M2a pilihan tidak dikenal ditolak', mg.aturMutu('ngawur') === false && mg.mutuSekarang() === 'seimbang');
oke('M2b pilihan sah tersimpan di localStorage',
  mg.aturMutu('tinggi') === true &&
  localStorage.getItem('hara.gambar.v1') === 'tinggi' &&
  mg.opsiMutu().sisi === 2048 && mg.opsiMutu().mutu === 0.92,
  String(localStorage.getItem('hara.gambar.v1')));

/* ── M3: keputusan pengecilan (murni, tanpa canvas) ── */
const R = (l,t,tipe,opsi) => mg.rencanaKecil({lebar:l,tinggi:t,tipe:tipe||'image/jpeg',opsi});
const rBesar = R(4000,3000);     /* sedang 'tinggi' */
oke('M3a gambar besar dikecilkan sesuai pilihan aktif',
  rBesar.ubah === true && Math.abs(rBesar.skala - 2048/4000) < 1e-9 && rBesar.mutu === 0.92,
  JSON.stringify(rBesar));
oke('M3b gambar kecil dibiarkan apa adanya', R(1200,900).ubah === false);
oke('M3c gambar tepat di batas tidak dikecilkan', R(2048,1000).ubah === false);
oke('M3d GIF selalu apa adanya (animasi tidak hilang)',
  R(5000,5000,'image/gif').ubah === false);
oke('M3e sisi terpanjang yang menentukan skala',
  Math.abs(R(1000,4096).skala - 2048/4096) < 1e-9);
oke('M3f "tanpa kompresi" meneruskan berkas asli',
  mg.rencanaKecil({lebar:6000,tinggi:4000,tipe:'image/jpeg',
    opsi:mg.PILIHAN.find(o=>o.k==='asli')}).ubah === false);
oke('M3g berkas non-gambar tidak disentuh', R(5000,5000,'application/pdf').ubah === false);
oke('M3h ukuran tak diketahui tidak bikin gambar hilang', R(0,0).ubah === false);

/* ── M4: image.js memakai keputusan itu ── */
{
  const src = fs.readFileSync('docs/notes/editor/image.js','utf8');
  oke('M4a image.js memanggil rencanaKecil()', src.includes('rencanaKecil('));
  oke('M4b angka tetap 1600/0.82 sudah tidak tertanam di image.js',
    !/const\s+MAKS_SISI/.test(src) && !/const\s+MUTU\s*=/.test(src));
}

/* ── M5: Pengaturan ── */
state.notes.splice(0);
state.notes.push(makeNote({id:'g1',title:'Catatan',blocks:[makeBlock({type:'paragraph',content:'isi'})]}));
router.go('set'); await sleep(60);
const box = () => d.getElementById('mutu-gambar');
oke('M5a Pengaturan punya bagian Gambar', !!box());
const rows = () => box().querySelectorAll('[data-mutu]');
oke('M5b empat baris pilihan tampil', rows().length === 4, String(rows().length));
const aktif = () => Array.from(rows()).find(r=>r.querySelector('.mtu-ck.on'));
oke('M5c pilihan aktif ditandai', aktif() && aktif().dataset.mutu === 'tinggi',
  aktif() ? aktif().dataset.mutu : 'tidak ada');
mg.aturMutu('hemat');
klik(rows()[0]); await sleep(40);
oke('M5d mengetuk pilihan menyimpan & memindahkan tanda',
  mg.mutuSekarang() === 'hemat' && aktif() && aktif().dataset.mutu === 'hemat',
  `${mg.mutuSekarang()} / ${aktif() ? aktif().dataset.mutu : '-'}`);
oke('M5e pesan konfirmasi muncul', /Hemat/.test(d.getElementById('toast').textContent || ''),
  d.getElementById('toast').textContent);
oke('M5f pilihan bertahan setelah layar digambar ulang', (() => {
  router.go('home'); router.go('set');
  return aktif() && aktif().dataset.mutu === 'hemat';
})());
mg.aturMutu('seimbang');
router.go('set'); await sleep(30);

console.log(gagal ? `\ntotal: ${gagal} GAGAL` : '\nSemua uji mutu-gambar LOLOS');
if (gagal) process.exit(1);
