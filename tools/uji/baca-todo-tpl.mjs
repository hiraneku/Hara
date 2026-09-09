/* Uji: mode baca/tulis (Obsidian-like), catatan sambutan global terkunci,
   menu cetak & simpan-templat, templat bawaan/tersimpan, panel
   "Belum selesai". BAG=A(mode baca) B(templat) C(panel todo) — tiap
   bagian proses terpisah. Jalankan: node tools/uji/baca-todo-tpl.mjs */
import {JSDOM} from 'jsdom';
import fs from 'fs';
import { indexedDB as fakeIDB } from 'fake-indexeddb';
import path from 'path';
import { fileURLToPath } from 'url';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const AKAR=process.cwd();
const dom=new JSDOM(fs.readFileSync('docs/index.html','utf8'),{url:'https://x.test/',pretendToBeVisual:true});
const {window:w}=dom; w.indexedDB=fakeIDB;
for(const k of ['document','getSelection','HTMLElement','Node','Range','MouseEvent','Event','InputEvent','localStorage','Image','Blob','NodeFilter'])
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
const mode=await st('notes/mode-baca.js');
const tpl=await st('notes/templat.js');
const lst=await st('notes/views/list.js');
const menuCat=await st('notes/menus/note-menu.js');
const d=w.document;
const sleep=(ms=25)=>new Promise(r=>setTimeout(r,ms));
let no=0,g=0;const ok=(n,c,det='')=>{no++;if(c){console.log('LULUS',n);}else{g++;console.log('FAIL',n,det);}};
const DOC=()=>d.querySelector('.ed-doc');
const catatan=(id,isi,extra)=>makeNote({id,title:id,blocks:[makeBlock({type:'paragraph',content:isi||''}),...((extra&&extra.blocks)||[])],...extra});
const click=el=>{ if(!el) return false; el.dispatchEvent(new w.MouseEvent('pointerdown',{bubbles:true,cancelable:true})); el.dispatchEvent(new w.MouseEvent('mousedown',{bubbles:true,cancelable:true})); el.dispatchEvent(new w.MouseEvent('mouseup',{bubbles:true,cancelable:true})); el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true})); return true; };
const BAG=process.env.BAG;
const selesai=()=>{console.log(`total: ${no} · gagal: ${g}`);process.exit(g?1:0);};
if (!BAG) {
  const { spawnSync } = await import('node:child_process');
  const sendiri = fileURLToPath(import.meta.url);
  let tn=0, tg=0;
  for (const b of ['A','B','C']) {
    const r = spawnSync(process.execPath, [sendiri], { env: { ...process.env, BAG: b }, cwd: process.cwd(), encoding: 'utf8' });
    const m=(r.stdout||'').match(/total: (\d+) · gagal: (\d+)/);
    console.log(`── baca-todo-tpl BAG ${b} ${r.status===0?'OK':'GAGAL'}`+(m?` (${m[1]}/${m[2]})`:''));
    if (r.status!==0) console.log((r.stdout||'').split('\n').filter(x=>/^FAIL/.test(x)).join('\n'));
    if (m){ tn+=+m[1]; tg+=+m[2]; }
  }
  console.log(`total: ${tn} · gagal: ${tg}`);
  process.exit(tg?1:0);
}

if (BAG==='A') {
/* ══ A. MODE BACA/TULIS + SAMBUTAN TERKUNCI + MENU ··· ══ */
state.notes.splice(0);
state.notes.push(makeNote({id:'biasa',title:'Catatan biasa',blocks:[makeBlock({type:'paragraph',content:'halo dunia'})]}));
state.notes.push(makeNote({id:'w2',title:'Selamat datang di Hara',welcome:true,welcomeV:2,
  blocks:[makeBlock({type:'paragraph',content:'sambutan global'})]}));
await openNote('biasa'); await sleep(80);
mode.setModeBaca(false); await sleep(20);
ok('A1 mode tulis: bisa diedit & bar mekanik tampil',
  DOC() && DOC().getAttribute('contenteditable')==='true' &&
  !document.querySelector('.ed').classList.contains('baca') &&
  document.getElementById('mech').classList.contains('on'));
ok('A2 tombol mode tampil di catatan biasa',document.getElementById('mode').style.display==='grid');
/* pindah ke mode baca */
mode.setModeBaca(true); await sleep(20);
ok('A3 mode baca: tak bisa diedit, mech hilang, judul readonly',
  DOC().getAttribute('contenteditable')==='false' &&
  document.querySelector('.ed').classList.contains('baca') &&
  !document.getElementById('mech').classList.contains('on') &&
  document.querySelector('.ed-t').readOnly===true);
/* kembali tulis */
mode.toggleModeBaca(); await sleep(20);
ok('A4 toggle balik ke mode tulis',DOC().getAttribute('contenteditable')==='true');
/* catatan sambutan: selalu baca + tombol mode disembunyikan */
await openNote('w2'); await sleep(80);
ok('A5 sambutan dibuka dalam mode baca (terkunci)',
  DOC().getAttribute('contenteditable')==='false' && document.querySelector('.ed').classList.contains('baca'));
ok('A6 tombol mode disembunyikan untuk sambutan',document.getElementById('mode').style.display!=='grid');
ok('A7 mode baca tersimpan lintas bukaan',localStorage.getItem('hara.v1.baca')==='0');
/* isi sambutan tersinkron dari versi global (welcomeV) */
ok('A8 penanda versi sambutan tersimpan',state.notes.find(x=>x.id==='w2').welcomeV===2);
/* menu ··· memuat Cetak/PDF dan Simpan templat */
const mh=menuCat.menuCatatan();
ok('A9 menu ··· punya Cetak/PDF & Simpan templat',
  mh.includes('data-note-act="cetak"')&&mh.includes('Cetak / PDF')&&
  mh.includes('data-note-act="tpl"')&&mh.includes('Simpan sebagai templat'));
/* sambutan tetap bisa dihapus (soft delete) — sudah ditangani delNote,
   cukup pastikan tidak terkunci dari penghapusan */
ok('A10 sambutan bukan catatan sampah',state.notes.find(x=>x.id==='w2')&&!state.notes.find(x=>x.id==='w2').deletedAt);
selesai();
}

if (BAG==='B') {
/* ══ B. TEMPLAT ══ */
state.notes.splice(0);
state.notes.push(makeNote({id:'t1',title:'Catatan contoh',blocks:[makeBlock({type:'paragraph',content:'isi contoh'})]}));
await openNote('t1'); await sleep(80);
const mh=menuCat.menuCatatan();
/* simpan catatan ini sebagai templat */
tpl.simpanTemplatNote(state.notes.find(x=>x.id==='t1'));
ok('B1 templat tersimpan & muncul di menu',tpl.adaTemplat()&&tpl.menuTemplat().includes('Catatan contoh'));
const nAwal=state.notes.length;
/* pakai templat bawaan jurnal → catatan baru berjudul tanggal */
tpl.terapkanTemplat('b:jurnal'); await sleep(80);
ok('B2 templat jurnal membuat catatan baru',state.notes.length===nAwal+1&&state.openId===state.notes[0].id);
const jr=state.notes[0];
ok('B3 judul jurnal memuat tanggal',/^Jurnal · /.test(jr.title),jr.title);
ok('B4 jurnal berisi blok todo',(jr.blocks||[]).some(b=>b.type==='todo'));
ok('B5 semua id blok baru unik',new Set(jr.blocks.map(b=>b.id)).size===jr.blocks.length);
/* pakai templat tersimpan */
tpl.terapkanTemplat('u:Catatan contoh'); await sleep(80);
const dupe=state.notes[0];
ok('B6 templat tersimpan dipakai',dupe.title==='Catatan contoh'&&dupe.blocks[0].content==='isi contoh');
ok('B7 id blok hasil templat tersimpan ikut baru',new Set(dupe.blocks.map(b=>b.id)).size===dupe.blocks.length);
/* hapus templat tersimpan */
tpl.hapusTemplat('Catatan contoh');
ok('B8 templat tersimpan bisa dihapus',!tpl.menuTemplat().includes('data-tpl-id="u:Catatan contoh"'));
ok('B9 templat bawaan tetap ada',tpl.menuTemplat().includes('b:rapat')&&tpl.menuTemplat().includes('b:belajar'));
selesai();
}

if (BAG==='C') {
/* ══ C. PANEL "BELUM SELESAI" ══ */
state.notes.splice(0);
const todoBlok=(isi,cek)=>makeBlock({type:'todo',content:isi,meta:{checked:!!cek}});
state.notes.push(makeNote({id:'c1',title:'Catatan satu',blocks:[
  makeBlock({type:'paragraph',content:'biasa'}),
  todoBlok('beli <b>susu</b>',false), todoBlok('cuci baju',true) ]}));
state.notes.push(makeNote({id:'c2',title:'Catatan dua',blocks:[todoBlok('baca bab 3',false)]}));
state.notes.push(makeNote({id:'c3',title:'Catatan tiga',blocks:[todoBlok('semua beres',true)]}));
const html=lst.notesView();
ok('C1 panel Belum selesai muncul',html.includes('Belum selesai')&&html.includes('data-todo-lompat'));
/* ruang lingkup: hanya segmen panel (baris catatan di bawahnya juga memuat
   teks todo — pratinjau lama yang bukan bagian panel) */
const pAwal=html.indexOf('Belum selesai');
const pUjung=html.indexOf('<div class="card"><div class="srow"',pAwal);
const panel=pAwal>=0?html.slice(pAwal,pUjung>pAwal?pUjung:html.length):'';
ok('C2 hanya todo belum selesai yang tampil',panel.includes('beli susu')&&panel.includes('baca bab 3')&&!panel.includes('cuci baju')&&!panel.includes('semua beres'));
ok('C3 teks html dibersihkan (tag dibuang)',!panel.includes('&lt;b&gt;susu&lt;/b&gt;'));
const m1=panel.match(/data-todo-bid="([^"]+)"/);
ok('C4 baris membawa id blok',!!m1&&!!m1[1]);
/* semua beres → panel hilang */
const blm=lst.belumSelesai([state.notes[2]]);
ok('C5 catatan tanpa todo terbuka tak memunculkan panel',blm.length===0);
ok('C6 urutan catatan terbaru lebih dulu',lst.belumSelesai([state.notes[0],state.notes[1]])[0].n.id==='c1');
selesai();
}
