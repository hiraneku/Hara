/* Uji: TEMPEL DARI LUAR → MEKANIK HARA (ronde 8).

   Yang dijaga:
   • teks polos "1. a / 2. b / 3. c" jadi blok daftar bernomor Hara
     (bukan tulisan tangan), lengkap dengan nomor otomatisnya;
   • butir "- a", to-do "- [ ]/- [x]", heading "#", kutipan ">",
     callout "> [!info]", pembatas "---", dan pagar kode ``` ```;
   • alamat telanjang (https://… / www.… / surel) jadi tautan a.lk;
   • <a href> dari clipboard dipertahankan dalam bentuk tautan Hara,
     sedangkan javascript:/data: kehilangan tautannya;
   • format inline **tebal** *miring* `kode` ==sorot== ~~coret~~,
     [[wikilink]], dan #tag;
   • paste di dalam blok kode tetap teks apa adanya;
   • semuanya tersimpan sebagai blocks yang sah (bukan HTML lepas).

   Jalankan: node tools/uji/tempel-mekanik.mjs */
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
const st=(...p)=>import(`${AKAR}/docs/${p.join('/')}?v=${V}`);
await st('app.js');
const {state}=await st('core/store.js');
const {saveNow}=await st('notes/editor/cleanup.js');
const {go}=await st('core/router.js');
const tmp=await st('notes/editor/tempel-mekanik.js');
const pst=await st('notes/editor/paste.js');
const d=w.document,SEL=w.getSelection();
let gagal=0;
const oke=(nama,baik,det='')=>{ if(!baik){gagal++;console.log('FAIL',nama,det?'\n      '+det:'');} else console.log('ok  ',nama); };
const klik=el=>el&&el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
const sleep=(ms=25)=>new Promise(r=>setTimeout(r,ms));
const DOC=()=>d.querySelector('.ed-doc');
const N=()=>{ saveNow(); return state.notes.find(x=>x.id===state.openId); };
const tipe=()=>N().blocks.map(b=>b.type);
const isiBlocks=()=>N().blocks.map(b=>b.content);
const teksSimpan=()=>isiBlocks().join(' ');
const teksBulat=()=>N().blocks.map(b=>b.content.replace(/<[^>]*>/g,''));

go('notes'); klik(d.querySelector('[data-open="w"]')); await sleep(40);
function siap(html){
  DOC().innerHTML=html;
  DOC().dispatchEvent(new w.Event('input',{bubbles:true}));
  saveNow();
}
function taruhCaret(idx,off){
  const b=DOC().children[idx];
  /* text node nyata, bukan tombol gagang seret yang mungkin sudah ada */
  let t=null;
  const jalan=d.createTreeWalker(b,4,null);
  let n;
  while((n=jalan.nextNode())) t=n;
  if(!t || off<0) t=b.appendChild(d.createTextNode(''));
  const r=d.createRange(); r.setStart(t,Math.min(off,t.length)); r.collapse(true);
  SEL.removeAllRanges(); SEL.addRange(r);
  d.dispatchEvent(new w.Event('selectionchange'));
}
function tempel(plain,html){
  const ev=new w.Event('paste',{bubbles:true,cancelable:true});
  ev.clipboardData={ getData:t=>t==='text/html'?(html||''):(plain||''), types:['text/plain'] };
  DOC().dispatchEvent(ev);
  return ev.defaultPrevented;
}

/* ── 1. pemecahan teks polos (tanpa DOM editor) ── */
const cls = t => tmp.teksKeBaris(t).map(b=>b.cls);
const html = t => tmp.teksKeBaris(t).map(b=>b.html);

oke('M1a "1. a" jadi daftar bernomor', cls('1. a')[0] === 'b-ol', JSON.stringify(cls('1. a')));
oke('M1b "2)" juga diterima', cls('2) b')[0] === 'b-ol');
oke('M1c nomornya dibuang dari isi', tmp.teksKeBaris('1. a')[0].html === 'a',
  tmp.teksKeBaris('1. a')[0].html);
oke('M1d tiga baris berurutan semua b-ol', JSON.stringify(cls('1. a\n2. b\n3. c')) ===
  JSON.stringify(['b-ol','b-ol','b-ol']), JSON.stringify(cls('1. a\n2. b\n3. c')));
oke('M1e "1.b" tanpa spasi BUKAN daftar', cls('1.b')[0] === 'b-p');
oke('M1f butir "- a" / "* a" / "+ a" jadi b-li',
  cls('- a')[0] === 'b-li' && cls('* a')[0] === 'b-li' && cls('+ a')[0] === 'b-li');
oke('M1g to-do tidak dicentang', tmp.teksKeBaris('- [ ] a')[0].cls === 'b-todo' &&
  !tmp.teksKeBaris('- [ ] a')[0].dicek);
oke('M1h to-do [x] datang tercentang', tmp.teksKeBaris('- [x] a')[0].dicek === true);
oke('M1i heading # ## ### jadi h1 h2 h3',
  JSON.stringify(cls('# A\n## B\n### C')) === JSON.stringify(['b-h1','b-h2','b-h3']));
oke('M1j "#### A" tetap paragraf', cls('#### A')[0] === 'b-p');
oke('M1k "#tag" bukan heading', tmp.teksKeBaris('#halo')[0].html.includes('class="tg"'),
  tmp.teksKeBaris('#halo')[0].html);
oke('M1l kutipan "> a" jadi b-quote', cls('> a')[0] === 'b-quote');
oke('M1m callout "> [!info] a" jadi b-cal info',
  tmp.teksKeBaris('> [!info] a')[0].cls === 'b-cal' &&
  tmp.teksKeBaris('> [!info] a')[0].attr['data-cal'] === 'info',
  JSON.stringify(tmp.teksKeBaris('> [!info] a')[0]));
oke('M1n callout asing "perhatian" tetap kutipan',
  cls('> [!perhatian] a')[0] === 'b-quote');
oke('M1o "---" jadi pembatas', cls('---')[0] === 'b-div');
oke('M1p "-- a" tetap paragraf', cls('-- a')[0] === 'b-p');

/* ── 2. pagar kode ── */
{
  const b = tmp.teksKeBaris('```\n1. bukan daftar\n<b>x</b>\n```');
  oke('M2a pagar kode jadi SATU blok kode', b.length === 1 && b[0].cls === 'b-code',
    JSON.stringify(b.map(x=>x.cls)));
  oke('M2b isi kode tidak ikut mekanik (tanpa daftar, tetap ter-escape)',
    b[0].html.includes('1. bukan daftar') && b[0].html.includes('&lt;b&gt;'),
    b[0].html);
  const b2 = tmp.teksKeBaris('```\ntanpa penutup\n1. a');
  oke('M2c pagar tanpa penutup tidak menelan isi', b2.length === 3 && b2[2].cls === 'b-ol',
    JSON.stringify(b2.map(x=>x.cls)));
}

/* ── 3. format inline & tautan ── */
const inl = t => tmp.inlineKeHtml(t);
oke('M3a tebal', inl('**tebal**') === '<b>tebal</b>', inl('**tebal**'));
oke('M3b miring', inl('*miring*') === '<i>miring</i>', inl('*miring*'));
oke('M3c tebal tidak terbaca miring', inl('**a**').startsWith('<b>'));
oke('M3d coret & sorot', inl('~~x~~') === '<s>x</s>' && inl('==y==') === '<span class="hl">y</span>');
oke('M3e kode inline', inl('`a b`') === '<code class="ic">a b</code>');
oke('M3f wikilink jadi span.wl', inl('[[Catatan Saya]]') === '<span class="wl">[[Catatan Saya]]</span>',
  inl('[[Catatan Saya]]'));
oke('M3g tag jadi span.tg', inl('lihat #proyek/hara dulu') ===
  'lihat <span class="tg">#proyek/hara</span> dulu', inl('lihat #proyek/hara dulu'));
oke('M3h tag di tengah kata tidak jadi tag', inl('a#b') === 'a#b', inl('a#b'));
oke('M3i tag menurut aturan diperiksa (tanda baca menutup)',
  inl('#halo,') === '<span class="tg">#halo</span>,', inl('#halo,'));
oke('M3j teks HTML tetap ter-escape', inl('<b>x</b>') === '&lt;b&gt;x&lt;/b&gt;', inl('<b>x</b>'));

oke('M3k alamat https jadi tautan', inl('lihat https://x.com/a?b=1#c dulu') ===
  'lihat <a class="lk" href="https://x.com/a?b=1#c" target="_blank" rel="noopener">https://x.com/a?b=1#c</a> dulu',
  inl('lihat https://x.com/a?b=1#c dulu'));
oke('M3l www. dapat https://', inl('www.hara.app').includes('href="https://www.hara.app"'));
oke('M3m titik di ujung masuk ke kalimat, bukan ke alamat',
  inl('buka www.hara.app.') === 'buka <a class="lk" href="https://www.hara.app" target="_blank" rel="noopener">www.hara.app</a>.',
  inl('buka www.hara.app.'));
oke('M3n surel jadi mailto:', inl('kirim ke a@b.com ya').includes('href="mailto:a@b.com"'));
oke('M3o alamat menempel kata tidak ditautkan',
  inl('lihathttps://x.com') === 'lihathttps://x.com', inl('lihathttps://x.com'));
oke('M3p javascript: tidak pernah jadi tautan', !/href/i.test(inl('javascript:alert(1)')));
oke('M3q tautanAman menolak skema berbahaya',
  tmp.tautanAman('javascript:alert(1)') === '' && tmp.tautanAman('data:text/html,x') === '' &&
  tmp.tautanAman('https://x.com') === 'https://x.com' && tmp.tautanAman('mailto:a@b.c') === 'mailto:a@b.c');

/* tautan bentuk markdown & kurung siku */
oke('M3r [teks](alamat) jadi tautan Hara',
  inl('[Judul](https://x.com/a)') ===
  '<a class="lk" href="https://x.com/a" target="_blank" rel="noopener">Judul</a>',
  inl('[Judul](https://x.com/a)'));
oke('M3s <alamat> jadi tautan Hara',
  inl('<https://x.com/a>') ===
  '<a class="lk" href="https://x.com/a" target="_blank" rel="noopener">https://x.com/a</a>',
  inl('<https://x.com/a>'));
oke('M3t [x](javascript:…) tidak jadi tautan', !/href/i.test(inl('[x](javascript:alert(1))')),
  inl('[x](javascript:alert(1))'));

/* ── 4. indentasi ── */
{
  const b = tmp.barisMekanik('  - anak');
  oke('M4a butir bersarang dapat padding di atas padding daftar',
    b.cls === 'b-li' && b.pad === 22 + 24, JSON.stringify(b));
  const b2 = tmp.barisMekanik('\t\t- cucu');
  oke('M4b tab dihitung dua spasi', b2.pad === 22 + 48, JSON.stringify(b2));
  oke('M4c satu spasi di awal bukan indentasi (spasi tetap ada)',
    tmp.barisMekanik(' lanjut').html === ' lanjut' && !tmp.barisMekanik(' lanjut').pad,
    JSON.stringify(tmp.barisMekanik(' lanjut')));
}

/* ── 5. lewat editor: daftar bernomor ── */
siap('<div class="b-p"></div>');
taruhCaret(0,0);
tempel('1. satu\n2. dua\n3. tiga');
await sleep(40);
oke('E1a tiga blok daftar bernomor', JSON.stringify(tipe()) ===
  JSON.stringify(['ordered-list','ordered-list','ordered-list']), JSON.stringify(tipe()));
oke('E1b isinya tanpa angka', isiBlocks().join('|') === 'satu|dua|tiga', JSON.stringify(isiBlocks()));
oke('E1c nomor otomatis terpasang di DOM (1. 2. 3.)',
  Array.from(DOC().querySelectorAll('.b-ol')).map(b=>b.getAttribute('data-n')).join('') === '1.2.3.',
  JSON.stringify(Array.from(DOC().querySelectorAll('.b-ol')).map(b=>b.getAttribute('data-n'))));
oke('E1d tersimpan sebagai blocks ordered-list',
  JSON.stringify(tipe()) === JSON.stringify(['ordered-list','ordered-list','ordered-list']));

/* daftar putus oleh paragraf: nomor mulai lagi dari 1 */
siap('<div class="b-p"></div>');
taruhCaret(0,0);
tempel('1. satu\n2. dua\ncatatan\n1. lagi');
await sleep(30);
oke('E1e paragraf memutus deretan nomor',
  Array.from(DOC().querySelectorAll('.b-ol')).map(b=>b.getAttribute('data-n')).join() === '1.,2.,1.',
  JSON.stringify(Array.from(DOC().querySelectorAll('.b-ol')).map(b=>b.getAttribute('data-n'))));

/* ── 6. lewat editor: heading, butir, to-do, kutipan, pembatas ── */
siap('<div class="b-p"></div>');
taruhCaret(0,0);
tempel('# Judul\n- butir satu\n- [ ] belum\n- [x] sudah\n> kutipan\n---');
await sleep(40);
oke('E2a jenis blok sesuai mekanik', JSON.stringify(tipe()) === JSON.stringify(
  ['heading','bullet','todo','todo','quote','divider']), JSON.stringify(tipe()));
{
  const todo = N().blocks.filter(b=>b.type==='todo');
  oke('E2b to-do [x] tersimpan tercentang',
    todo.length===2 && todo[0].meta.checked === false && todo[1].meta.checked === true,
    JSON.stringify(todo.map(t=>t.meta)));
  oke('E2c kotak centang ada di DOM', DOC().querySelectorAll('.b-todo > .cbx').length === 2);
  oke('E2d tanda centang menyala untuk yang [x]',
    DOC().querySelectorAll('.b-todo > .cbx.on').length === 1);
}
oke('E2e heading jadi h1 dengan teks tanpa "#"',
  DOC().querySelector('h1') && DOC().querySelector('h1').textContent.trim() === 'Judul',
  DOC().querySelector('h1') ? DOC().querySelector('h1').textContent : 'tanpa h1');
oke('E2f pembatas jadi elemen .b-div', !!DOC().querySelector('.b-div'));

/* ── 7. lewat editor: tautan ── */
siap('<div class="b-p"></div>');
taruhCaret(0,0);
tempel('Buka https://hiraneku.github.io/Hara/ sekarang');
await sleep(30);
const a1 = DOC().querySelector('a.lk');
oke('E3a alamat telanjang jadi tautan di editor', !!a1, JSON.stringify(DOC().innerHTML.slice(0,160)));
oke('E3b href & atribut aman benar',
  a1 && a1.getAttribute('href')==='https://hiraneku.github.io/Hara/' &&
  a1.getAttribute('target')==='_blank' && a1.getAttribute('rel')==='noopener',
  a1 ? a1.outerHTML : '-');
oke('E3c spasi sekitar tautan utuh',
  DOC().textContent.replace(/\u200b/g,'') === 'Buka https://hiraneku.github.io/Hara/ sekarang',
  JSON.stringify(DOC().textContent));
oke('E3d tautan ikut tersimpan di content blok',
  /<a [^>]*class="lk"[^>]*href="https:\/\/hiraneku\.github\.io\/Hara\/"/.test(isiBlocks()[0]),
  isiBlocks()[0]);

/* tautan utuh sebagai satu-satunya isi */
siap('<div class="b-p"></div>');
taruhCaret(0,0);
tempel('https://x.com/a');
await sleep(30);
oke('E3e alamat sendirian jadi tautan penuh',
  DOC().querySelector('a.lk') && DOC().querySelector('a.lk').textContent === 'https://x.com/a');

/* ── 8. HTML dari luar: <a href> dan wadah <div> ── */
siap('<div class="b-p"></div>');
taruhCaret(0,0);
tempel('Hara','<div>Lihat <a href="https://hara.app">situs Hara</a> ya</div>');
await sleep(30);
{
  const a = DOC().querySelector('a.lk');
  oke('E4a <a href> clipboard jadi tautan Hara',
    a && a.getAttribute('href')==='https://hara.app' && a.textContent==='situs Hara' &&
    a.getAttribute('rel')==='noopener', a ? a.outerHTML : JSON.stringify(DOC().innerHTML));
}
siap('<div class="b-p"></div>');
taruhCaret(0,0);
tempel('1. a\n2. b','<div>1. a</div><div>2. b</div>');
await sleep(40);
oke('E4b halaman web yang menyalin daftar sebagai <div> tetap jadi daftar bernomor',
  JSON.stringify(tipe()) === JSON.stringify(['ordered-list','ordered-list']), JSON.stringify(tipe()));
siap('<div class="b-p"></div>');
taruhCaret(0,0);
tempel('x','<div>teks <b>tebal</b> dan <a href="mailto:a@b.com">surel</a></div>');
await sleep(30);
oke('E4c markup inline di wadah tetap dipakai (bukan diubah jadi teks)',
  !!DOC().querySelector('b') && !!DOC().querySelector('a.lk[href="mailto:a@b.com"]'),
  JSON.stringify(DOC().innerHTML));

/* ── 9. keamanan tautan ── */
siap('<div class="b-p"></div>');
taruhCaret(0,0);
tempel('klik','<p><a href="javascript:alert(1)">klik</a> <a href="data:text/html,x">x</a> <a href="https://ok.test">aman</a></p>');
await sleep(30);
{
  const html2 = DOC().innerHTML;
  const simpan2 = teksSimpan();
  oke('E5a javascript: kehilangan tautannya', !/javascript:/i.test(html2) && !/javascript:/i.test(simpan2),
    html2.slice(0,150));
  oke('E5b teksnya tetap ada', /klik/.test(DOC().textContent));
  oke('E5c tautan yang sah tetap dibuat', DOC().querySelector('a.lk[href="https://ok.test"]') !== null);
}

/* ── 10. di dalam blok kode: apa adanya ── */
siap('<div class="b-code">kode()</div>');
taruhCaret(0,6);
tempel('\n1. bukan daftar\nhttps://x.com');
await sleep(30);
oke('E6a tetap satu blok kode', tipe().length === 1 && tipe()[0]==='code', JSON.stringify(tipe()));
oke('E6b tanpa tautan & tanpa daftar di dalam kode',
  !DOC().querySelector('a.lk') && !DOC().querySelector('.b-ol') && /1\. bukan daftar/.test(DOC().textContent),
  JSON.stringify(DOC().textContent.slice(0,60)));

/* ── 11. tag hasil tempelan langsung hidup ── */
siap('<div class="b-p"></div>');
taruhCaret(0,0);
tempel('catatan #proyek/hara selesai');
await sleep(60);
oke('E7a tag jadi span.tg', !!DOC().querySelector('span.tg'));
oke('E7b tag tersimpan & terbaca model (cache tag ikut isi)',
  N().tags.includes('proyek/hara'), JSON.stringify(N().tags));
oke('E7c span tag punya warna label (data-tt)',
  DOC().querySelector('span.tg').hasAttribute('data-tt'),
  DOC().querySelector('span.tg').outerHTML);

/* ── 12. satu langkah undo ── */
{
  const H=await st('notes/editor/history.js');
  siap('<div class="b-p">Awal</div>');
  H.resetHistory();
  taruhCaret(0,4);
  tempel('1. a\n2. b\n3. c');
  await sleep(30);
  oke('E8a sebelum undo: kalimat lama utuh + 3 butir daftar (nomor berderet)',
    tipe().length===4 && tipe()[0]==='paragraph' && teksBulat()[0]==='Awal' &&
    tipe()[1]==='ordered-list' && tipe()[2]==='ordered-list' && tipe()[3]==='ordered-list' &&
    JSON.stringify(teksBulat())===JSON.stringify(['Awal','a','b','c']),
    JSON.stringify(tipe()) + ' ' + JSON.stringify(teksBulat()));
  H.undo(); await sleep(20); saveNow();
  oke('E8b undo mengembalikan satu blok', tipe().length===1 && tipe()[0]==='paragraph',
    JSON.stringify(tipe()));
}

/* ── 13. blok heading yang ditempeli daftar tidak nyangkut jadi heading ── */
siap('<h1 class="b-h1"></h1>');
taruhCaret(0,0);
tempel('1. a\n2. b');
await sleep(40);
oke('E9b heading kosong berganti jadi daftar bernomor',
  DOC().children[0] && DOC().children[0].tagName.toLowerCase() !== 'h1' &&
  DOC().children[0].classList.contains('b-ol'),
  DOC().children[0].outerHTML.slice(0,120));
oke('E9c dua butir daftar tersimpan',
  JSON.stringify(tipe()) === JSON.stringify(['ordered-list','ordered-list']), JSON.stringify(tipe()));

/* ── 14. tempel di tengah kalimat tidak memaksa mekanik ── */
siap('<div class="b-p">Catatan: </div>');
taruhCaret(0,10);
tempel('1. bukan daftar');
await sleep(30);
oke('E9d "Catatan: 1. …" tetap paragraf & teksnya tidak hilang',
  tipe().length===1 && tipe()[0]==='paragraph' &&
  /Catatan: 1\. bukan daftar/.test(DOC().textContent),
  JSON.stringify(tipe()) + ' ' + JSON.stringify(DOC().textContent));
/* baris tunggal berjenis di blok KOSONG: sama seperti mengetik "1. " */
siap('<div class="b-p"></div>');
taruhCaret(0,0);
tempel('1. Halo');
await sleep(30);
oke('E9e satu baris "1. Halo" di blok kosong langsung jadi item daftar',
  JSON.stringify(tipe())===JSON.stringify(['ordered-list']) &&
  teksBulat()[0]==='Halo' && DOC().querySelectorAll('.b-ol').length===1,
  JSON.stringify(tipe()) + ' ' + JSON.stringify(teksBulat()));
siap('<div class="b-p"></div>');
taruhCaret(0,0);
tempel('- tugas');
await sleep(30);
oke('E9f satu baris "- tugas" di blok kosong jadi butir',
  JSON.stringify(tipe())===JSON.stringify(['bullet']) && teksBulat()[0]==='tugas',
  JSON.stringify(tipe()) + ' ' + JSON.stringify(teksBulat()));

/* ── 15. karet yang nyangkut di tombol tidak menelan teks ──
   Setelah layar digambar ulang, blok kosong punya tombol gagang seret
   (contenteditable=false). Kalau karet berjangkar di situ, teks tempelan
   mendarat DI DALAM tombol dan hilang saat blok dibaca kembali. */
siap('<div class="b-p"></div>');
{
  const b = DOC().children[0];
  b.innerHTML = '<button class="blk-h" contenteditable="false" type="button"></button>';
  const r = d.createRange();
  r.setStart(b.firstChild, 0); r.collapse(true);
  SEL.removeAllRanges(); SEL.addRange(r);
  d.dispatchEvent(new w.Event('selectionchange'));
  tempel('teks penting');
  await sleep(30);
  oke('E10a karet di dalam tombol tidak menelan teks',
    /teks penting/.test(DOC().textContent), JSON.stringify(DOC().innerHTML.slice(0,140)));
  oke('E10b teks tidak masuk ke dalam tombol',
    !(DOC().querySelector('.blk-h') || {textContent:''}).textContent.includes('teks penting'),
    JSON.stringify(DOC().innerHTML.slice(0,140)));
  saveNow();
  oke('E10c teks ikut tersimpan', /teks penting/.test(N().blocks[0].content),
    JSON.stringify(N().blocks[0].content));
}

/* ── 16. BENTUK CLIPBOARD NYATA: batas baris dari <br> & elemen blok di
   kedalaman mana pun ──

   Klip dari pembaca PDF, WhatsApp, atau Chrome Android sering memisahkan
   baris dengan <br> di dalam satu <div>/<span>; sebagian malah menaruh
   <div> di dalam <span>. Dulu bentuk begitu diratakan jadi SATU potongan,
   sehingga "1. Halo" + <br> + "2. Dunia" menempel jadi "1. Halo 2. Dunia"
   — nomornya tidak berderet ke bawah, malah naik ke baris di atasnya. */
{
  const hb = html => pst.htmlKeBaris(html);
  const clsHB = html => hb(html).map(b => b.cls);
  const angka = ['b-ol','b-ol','b-ol'];

  oke('F1a <span> berisi <br>: tiap baris berdiri sendiri',
    JSON.stringify(clsHB('<span>1. a<br>2. b<br>3. c</span>')) === JSON.stringify(angka),
    JSON.stringify(clsHB('<span>1. a<br>2. b<br>3. c</span>')));
  oke('F1b <div> berisi <br>',
    JSON.stringify(clsHB('<div>1. a<br>2. b<br>3. c</div>')) === JSON.stringify(angka));
  oke('F1c <p> berisi <br>',
    JSON.stringify(clsHB('<p>1. a<br>2. b<br>3. c</p>')) === JSON.stringify(angka));
  oke('F1d teks telanjang + <br> di akar',
    JSON.stringify(clsHB('1. a<br>2. b<br>3. c')) === JSON.stringify(angka));
  oke('F1e <span> per baris dipisah <br> (Chrome Android)',
    JSON.stringify(clsHB('<meta charset="utf-8">' +
      '<span style="font-size:14px">1. a</span><br>' +
      '<span style="font-size:14px">2. b</span>')) === JSON.stringify(['b-ol','b-ol']));
  oke('F1f nomor asli tidak tertinggal sebagai teks',
    hb('<span>1. a<br>2. b</span>').every(b => !/^\s*\d+[.)]/.test(b.html.replace(/<[^>]*>/g,''))),
    JSON.stringify(hb('<span>1. a<br>2. b</span>').map(b => b.html)));
  oke('F2a <div> di dalam <span> juga jadi baris',
    JSON.stringify(clsHB('<span><div>1. a</div><div>2. b</div></span>')) === JSON.stringify(['b-ol','b-ol']),
    JSON.stringify(clsHB('<span><div>1. a</div><div>2. b</div></span>')));
  oke('F2b teks + <div> + teks di dalam <span> → tiga baris',
    JSON.stringify(clsHB('<span>1. a<div>2. b</div>3. c</span>')) === JSON.stringify(angka),
    JSON.stringify(clsHB('<span>1. a<div>2. b</div>3. c</span>')));
  oke('F3a nomor yang dicetak tebal tetap jadi item daftar, tebalnya utuh',
    hb('<div><b>1. Halo</b><br>2. Dunia</div>')[0].cls === 'b-ol' &&
    hb('<div><b>1. Halo</b><br>2. Dunia</div>')[0].html === '<b>Halo</b>' &&
    hb('<div><b>1. Halo</b><br>2. Dunia</div>')[1].html === 'Dunia',
    JSON.stringify(hb('<div><b>1. Halo</b><br>2. Dunia</div>')));
  oke('F3b heading ber-markup ikut mekanik',
    hb('<div><b># Judul</b></div>')[0].cls === 'b-h1' &&
    hb('<div><b># Judul</b></div>')[0].html === '<b>Judul</b>',
    JSON.stringify(hb('<div><b># Judul</b></div>')));
  oke('F3d penanda ber-markup yang ter-indentasi tidak memakan isinya',
    hb('<div>&nbsp;&nbsp;<b>1. Halo</b></div>')[0].cls === 'b-ol' &&
    hb('<div>&nbsp;&nbsp;<b>1. Halo</b></div>')[0].html === '<b>Halo</b>' &&
    hb('<div>&nbsp;&nbsp;<b>1. Halo</b></div>')[0].pad === 54,
    JSON.stringify(hb('<div>&nbsp;&nbsp;<b>1. Halo</b></div>')));
  oke('F3c butir ber-markup ikut mekanik',
    hb('<div><i>- a</i></div>')[0].cls === 'b-li' &&
    hb('<div><i>- a</i></div>')[0].html === '<i>a</i>',
    JSON.stringify(hb('<div><i>- a</i></div>')));
  oke('F4a dua <br> beruntun = satu baris kosong di tengah',
    hb('<div>a<br><br>b</div>').length === 3 &&
    hb('<div>a<br><br>b</div>')[1].html === '' &&
    hb('<div>a<br><br>b</div>')[2].html === 'b',
    JSON.stringify(hb('<div>a<br><br>b</div>')));
  oke('F4b <br> di ujung tiap <div> tidak menambah blok kosong',
    hb('<div>1. a<br></div><div>2. b<br></div>').length === 2,
    JSON.stringify(hb('<div>1. a<br></div><div>2. b<br></div>')));
  oke('F4c <div>&nbsp;</div> kosong tidak jadi baris',
    hb('<div>a</div><div>&nbsp;</div><div>b</div>').length === 2,
    JSON.stringify(hb('<div>a</div><div>&nbsp;</div><div>b</div>')));
  oke('F5a daftar bersarang HTML jadi indentasi Hara',
    hb('<ul><li>a<ul><li>a1</li></ul></li><li>b</li></ul>')[1].pad === 46,
    JSON.stringify(hb('<ul><li>a<ul><li>a1</li></ul></li><li>b</li></ul>')));
  oke('F5b indentasi &nbsp; juga jadi langkah indentasi',
    hb('<div>&nbsp;&nbsp;1. sub</div><div>1. utama</div>')[0].pad === 54,
    JSON.stringify(hb('<div>&nbsp;&nbsp;1. sub</div><div>1. utama</div>')));
  oke('F6a kotak centang dari halaman lain jadi to-do Hara',
    hb('<div><input type="checkbox" checked> tugas</div>')[0].cls === 'b-todo' &&
    hb('<div><input type="checkbox" checked> tugas</div>')[0].dicek === true &&
    hb('<div><input type="checkbox"> tugas</div>')[0].cls === 'b-todo',
    JSON.stringify(hb('<div><input type="checkbox" checked> tugas</div>')));
  oke('F7a tautan yang teksnya beda dari alamatnya tidak diratakan jadi teks',
    hb('<div><a href="https://x.test">situs</a> ya</div>')[0].html
      .includes('<a class="lk" href="https://x.test"'));
  oke('F8a <pre> tetap satu blok kode & <hr> jadi pembatas',
    JSON.stringify(clsHB('<p>a</p><hr><pre>kode\nbaris</pre>')) ===
      JSON.stringify(['b-p','b-div','b-code']),
    JSON.stringify(clsHB('<p>a</p><hr><pre>kode\nbaris</pre>')));
}

/* ── 17. (nyata) tempel pesan berurutan dari luar aplikasi ── */
/* Kalimat yang sudah ada TIDAK boleh ditelan jadi item pertama — dulu
   "...kalimat" + "1. Halo / 2. Dunia" menghasilkan satu paragraf
   "...kalimat Halo" plus satu item tersisa, jadi nomornya tidak berderet. */
siap('<div class="b-p">Catatan saya: </div>');
taruhCaret(0,14);
tempel('1. Halo\n2. Dunia', '<div>1. Halo<br>2. Dunia</div>');
await sleep(40);
oke('F10a paragraf lama utuh, daftar mulai sebagai blok baru di bawahnya',
  JSON.stringify(tipe())===JSON.stringify(['paragraph','ordered-list','ordered-list']) &&
  teksBulat()[0].trim()==='Catatan saya:' && teksBulat()[1]==='Halo' && teksBulat()[2]==='Dunia',
  JSON.stringify(tipe()) + ' ' + JSON.stringify(teksBulat()));
oke('F10b tak ada sisa nomor di teks mana pun',
  N().blocks.every(b => !/\d+\./.test(b.content.replace(/<[^>]*>/g,''))),
  JSON.stringify(N().blocks.map(b=>b.content)));
/* Teks prosa banyak baris tetap menyambung seperti sebelumnya. */
siap('<div class="b-p">Awal </div>');
taruhCaret(0,5);
tempel('kata lain\nbaris dua');
await sleep(40);
oke('F10c teks prosa tetap menyambung ke kalimat lama',
  JSON.stringify(tipe())===JSON.stringify(['paragraph','paragraph']) &&
  teksBulat()[0]==='Awal kata lain' && teksBulat()[1]==='baris dua',
  JSON.stringify(tipe()) + ' ' + JSON.stringify(teksBulat()));

siap('<div class="b-p"></div>');
taruhCaret(0,0);
tempel('1. Halo\n2. Dunia',
  '<meta charset="utf-8"><div>1. Halo<br>2. Dunia</div>');
await sleep(40);
oke('F9a angka turun ke bawah: dua blok daftar bernomor',
  JSON.stringify(tipe()) === JSON.stringify(['ordered-list','ordered-list']),
  JSON.stringify(tipe()));
oke('F9b butir pertama isinya "Halo" — bukan "Halo 2. Dunia"',
  N().blocks[0] && N().blocks[0].content === 'Halo',
  JSON.stringify(N().blocks.map(b => b.content)));
oke('F9c butir kedua terpisah dengan isi "Dunia"',
  N().blocks[1] && N().blocks[1].content === 'Dunia',
  JSON.stringify(N().blocks.map(b => b.content)));
oke('F9d DOM memakai dua blok daftar Hara', DOC().querySelectorAll('.b-ol').length === 2,
  JSON.stringify(DOC().innerHTML));
oke('F9e nomornya berderet ke bawah: 1. lalu 2.',
  Array.from(DOC().querySelectorAll('.b-ol')).map(b => b.getAttribute('data-n')).join(' ') === '1. 2.',
  JSON.stringify(Array.from(DOC().querySelectorAll('.b-ol')).map(b => b.getAttribute('data-n'))));
siap('<div class="b-p"></div>');
taruhCaret(0,0);
tempel('1. Halo\n2. Dunia', '<span style="font-size:14px">1. Halo</span><br>' +
  '<span style="font-size:14px">2. Dunia</span>');
await sleep(40);
oke('F9f bentuk span+br juga turun jadi daftar bernomor',
  JSON.stringify(tipe()) === JSON.stringify(['ordered-list','ordered-list']) &&
  N().blocks[0].content === 'Halo',
  JSON.stringify(tipe()) + ' ' + JSON.stringify(N().blocks.map(b => b.content)));

console.log(gagal ? `\ntotal: ${gagal} GAGAL` : '\nSemua uji tempel-mekanik LOLOS');
if (gagal) process.exit(1);
