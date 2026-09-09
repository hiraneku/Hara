/* Uji: catatan SAMBUTAN mengikuti bahasa antarmuka (id/en/ja),
   dengan isi asli per bahasa — dan HANYA catatan sambutan yang
   tersinkron; catatan pengguna lain tidak pernah diterjemahkan.
   Jalankan: node tools/uji/welcome-bahasa.mjs */
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
const store=await import(`${AKAR}/docs/core/store.js?v=${V}`);
const {state}=store;
const i18n=await import(`${AKAR}/docs/core/i18n.js?v=${V}`);
const nmdl=await import(`${AKAR}/docs/notes/note-model.js?v=${V}`);
const {makeNote}=nmdl;
const {ISI_WELCOME,JUDUL_WELCOME,WELCOME_V}=await import(`${AKAR}/docs/notes/views/welcome.js?v=${V}`);
const d=w.document;
let no=0,g=0;
const ok=(n,c,det='')=>{no++;if(c)console.log('LULUS',n);else{g++;console.log('FAIL',n,det?' → '+det:'');}};
const wl=()=>state.notes.find(x=>x.welcome&&!x.deletedAt);
const isiCat=n=>n.blocks.map(b=>b.content).join('\n');

console.log('══ Sambutan mengikuti bahasa antarmuka ══\n');

ok('W1 kamus isi punya 3 bahasa asli', !!ISI_WELCOME.id && !!ISI_WELCOME.en && !!ISI_WELCOME.ja);
ok('W2 tiga isi berbeda satu sama lain',
  ISI_WELCOME.id!==ISI_WELCOME.en && ISI_WELCOME.en!==ISI_WELCOME.ja && ISI_WELCOME.id!==ISI_WELCOME.ja);
ok('W3 isi en asli (bukan sisa Indonesia)', !/Selamat datang di Hara — aplikasi catatan/.test(ISI_WELCOME.en) &&
   /Welcome to Hara/.test(ISI_WELCOME.en));
ok('W4 isi ja asli (bukan sisa Indonesia/Inggris)', !/aplikasi catatan pribadi/.test(ISI_WELCOME.ja) &&
   !/Welcome to Hara/.test(ISI_WELCOME.ja) && /Hara（ハラ）へようこそ/.test(ISI_WELCOME.ja));

/* pertama kali (tanpa data): seed mengikuti bahasa aktif (id bawaan) */
ok('W5 seed awal: welcomeLang=id', wl() && wl().welcomeLang==='id', wl()&&wl().welcomeLang);
ok('W6 seed awal: judul Indonesia', wl().title==='Selamat datang di Hara', wl().title);
ok('W7 seed awal: versi isi terbaru', wl().welcomeV===WELCOME_V, String(wl().welcomeV));
ok('W8 seed awal: isi Indonesia asli', /Cukup ketik — sisanya otomatis/.test(isiCat(wl())));

/* catatan pengguna lain tidak ikut tersinkron */
state.notes.push(makeNote({id:'u1',title:'Catatan pribadi saya',
  blocks:[{id:'b1',type:'paragraph',content:'Isi <b>asli</b> pengguna, jangan diterjemahkan.'}],tags:['saya']}));
const u1Sblm={title:state.notes.find(n=>n.id==='u1').title, isi:isiCat(state.notes.find(n=>n.id==='u1'))};

/* ganti bahasa → sambutan ikut (judul + isi + welcomeLang) */
i18n.setBahasa('en');
const berubah1=store.sinkronWelcome();
ok('W9 pindah en: sinkron mengubah sambutan', berubah1===true);
ok('W10 pindah en: judul Welcome to Hara', wl().title==='Welcome to Hara', wl().title);
ok('W11 pindah en: welcomeLang=en', wl().welcomeLang==='en', wl().welcomeLang);
ok('W12 pindah en: isi Inggris asli', /Just type — formatting follows/.test(isiCat(wl())) &&
   !/Cukup ketik/.test(isiCat(wl())));
ok('W13 pindah en: catatan pengguna TIDAK berubah',
  state.notes.find(n=>n.id==='u1').title===u1Sblm.title && isiCat(state.notes.find(n=>n.id==='u1'))===u1Sblm.isi);
ok('W14 idempoten: sinkron ulang tidak mengubah apa pun', store.sinkronWelcome()===false);

i18n.setBahasa('ja');
ok('W15 pindah ja: sinkron mengubah sambutan', store.sinkronWelcome()===true);
ok('W16 pindah ja: judul Hara へようこそ', wl().title==='Hara へようこそ', wl().title);
ok('W17 pindah ja: welcomeLang=ja', wl().welcomeLang==='ja', wl().welcomeLang);
ok('W18 pindah ja: isi Jepang asli', /打つだけ — あとは自動で/.test(isiCat(wl())) &&
   !/Just type/.test(isiCat(wl())) && !/Cukup ketik/.test(isiCat(wl())));
ok('W19 pindah ja: catatan pengguna TIDAK berubah',
  isiCat(state.notes.find(n=>n.id==='u1'))===u1Sblm.isi);

/* muat ulang dari penyimpanan: sambutan lama versi 3 (bahasa id, tanpa
   field welcomeLang) langsung dinaikkan ke versi & bahasa aktif */
store.save();
i18n.setBahasa('id');
const lama=JSON.parse(w.localStorage.getItem('hara.v1'));
const wLama=lama.notes.find(n=>n.id==='w');
delete wLama.welcomeLang; wLama.welcomeV=3;      /* bentuk lama */
wLama.title='Selamat datang di Hara';
const pLama=wLama.blocks[0];                     /* contoh isi Indonesia lama */
lama.notes.forEach(n=>{ if(n.id!=='w'&&n.id!=='u1'){} });
w.localStorage.setItem('hara.v1',JSON.stringify(lama));
store.load();
const wBaru=state.notes.find(n=>n.id==='w');
ok('W20 muat ulang (bahasa id): sambutan v4 & welcomeLang=id',
  wBaru && wBaru.welcomeV===WELCOME_V && wBaru.welcomeLang==='id', wBaru&&`${wBaru.welcomeV}/${wBaru.welcomeLang}`);
ok('W21 muat ulang: isi Indonesia terbaru', wBaru && /Cukup ketik/.test(isiCat(wBaru)));
ok('W22 muat ulang: catatan pengguna tetap utuh',
  state.notes.find(n=>n.id==='u1') && isiCat(state.notes.find(n=>n.id==='u1'))===u1Sblm.isi);

/* bahasa Inggris tersimpan → muat ulang langsung menghasilkan sambutan Inggris */
i18n.setBahasa('en');
const dataEn=JSON.parse(w.localStorage.getItem('hara.v1'));
w.localStorage.setItem('hara.v1',JSON.stringify(dataEn));
store.load();
ok('W23 muat ulang saat bahasa en: welcomeLang=en & isi Inggris',
  wl() && wl().welcomeLang==='en' && /Welcome to Hara/.test(wl().title) &&
  /Just type/.test(isiCat(wl())), wl()&&`${wl().welcomeLang}:${wl().title}`);

console.log(`\ntotal: ${no} · gagal: ${g}`);
if(g)process.exit(1);
console.log('SEMUA LOLOS');
