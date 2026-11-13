/* Uji auto-pair editor: kurung/kutip, skip-over, hapus pasangan kosong,
   konteks aman, seleksi, Undo, dan preferensi. */
import { JSDOM } from 'jsdom';
import fs from 'fs';
import { indexedDB as fakeIDB } from 'fake-indexeddb';
import path from 'path';
import { fileURLToPath } from 'url';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const AKAR = process.cwd();
const dom = new JSDOM(fs.readFileSync('docs/index.html', 'utf8'), {
  url: 'https://x.test/', pretendToBeVisual: true,
});
const { window: w } = dom; w.indexedDB = fakeIDB;
for (const k of ['document','getSelection','HTMLElement','Node','Range','MouseEvent','KeyboardEvent','Event','InputEvent','localStorage','Image','Blob','NodeFilter'])
  if (w[k] !== undefined) globalThis[k] = w[k];
globalThis.window = w; globalThis.self = w; globalThis.indexedDB = w.indexedDB;
globalThis.addEventListener = w.addEventListener.bind(w);
Object.defineProperty(globalThis, 'navigator', { value: w.navigator, configurable: true });
w.URL.createObjectURL = () => 'blob:x/1'; w.URL.revokeObjectURL = () => {}; globalThis.URL = w.URL;
const V = fs.readFileSync('docs/app.js', 'utf8').match(/\?v=(\d+)/)[1];
await import(`${AKAR}/docs/app.js?v=${V}`);
const { go } = await import(`${AKAR}/docs/core/router.js?v=${V}`);
const { resetHistory, undo } = await import(`${AKAR}/docs/notes/editor/history.js?v=${V}`);
const { aturPasangan } = await import(`${AKAR}/docs/notes/editor/pasangan.js?v=${V}`);
const d = w.document, S = w.getSelection();
const wait = (ms=30) => new Promise(r => setTimeout(r, ms));
const DOC = () => d.querySelector('.ed-doc');
let total=0, gagal=0;
const ok=(nama, nilai, detail='')=>{
  total++;
  if (nilai) console.log('LULUS', nama);
  else { gagal++; console.log('GAGAL', nama, detail ? '→ '+detail : ''); }
};

go('notes');
d.querySelector('[data-open="w"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
await wait(50);
function fresh(teks='', kelas='b-p'){
  DOC().setAttribute('contenteditable','true');
  DOC().innerHTML='';
  const b=d.createElement('div'); b.className=kelas;
  const t=d.createTextNode(teks); b.appendChild(t); DOC().appendChild(b);
  const r=d.createRange(); r.setStart(t,teks.length); r.collapse(true);
  S.removeAllRanges(); S.addRange(r); d.dispatchEvent(new w.Event('selectionchange'));
  resetHistory(null);
  return b;
}
function type(ch){
  const ev=new w.InputEvent('beforeinput',{bubbles:true,cancelable:true,inputType:'insertText',data:ch});
  DOC().dispatchEvent(ev);
  if(!ev.defaultPrevented){
    const r=S.getRangeAt(0);
    if(!r.collapsed) r.deleteContents();
    const n=r.startContainer, o=r.startOffset;
    if(n.nodeType===3){
      n.insertData(o,ch);
      const nr=d.createRange(); nr.setStart(n,o+ch.length); nr.collapse(true);
      S.removeAllRanges(); S.addRange(nr);
    }else{
      const t=d.createTextNode(ch); n.insertBefore(t,n.childNodes[o]||null);
      const nr=d.createRange(); nr.setStart(t,ch.length); nr.collapse(true);
      S.removeAllRanges(); S.addRange(nr);
    }
    DOC().dispatchEvent(new w.InputEvent('input',{bubbles:true,inputType:'insertText',data:ch}));
  }
  d.dispatchEvent(new w.Event('selectionchange'));
}
function press(key){
  const ev=new w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true});
  DOC().dispatchEvent(ev); return ev.defaultPrevented;
}
const txt=()=>DOC().firstElementChild.textContent;
const pos=()=>{
  const r=S.getRangeAt(0);
  const pre=d.createRange(); pre.selectNodeContents(DOC().firstElementChild);
  pre.setEnd(r.startContainer,r.startOffset); return pre.toString().length;
};

console.log('── Kurung otomatis ──');
fresh(); type('(');
ok('kurung buka membuat pasangan dan menaruh caret di tengah',txt()==='()'&&pos()===1,`${DOC().innerHTML} ; ${txt()} @${pos()}`);
type('a'); type('b'); type(')');
ok('skip-over tidak menggandakan kurung tutup',txt()==='(ab)'&&pos()===4,`${txt()} @${pos()}`);
fresh(); type('['); ok('kurung siku dipasangkan',txt()==='[]'&&pos()===1,txt());
fresh(); type('{'); ok('kurung kurawal dipasangkan',txt()==='{}'&&pos()===1,txt());
fresh(); type('('); ok('Backspace menghapus pasangan kosong sekaligus',press('Backspace')&&txt()==='',txt());
fresh('kata');
const rSel=d.createRange(); rSel.selectNodeContents(DOC().firstElementChild);
S.removeAllRanges(); S.addRange(rSel); type('(');
ok('seleksi dibungkus dan tetap terseleksi',txt()==='(kata)'&&S.toString()==='kata',`${txt()} / ${S.toString()}`);

console.log('── Kutip dan kode inline ──');
fresh(); type('"'); type('h'); type('i'); type('"');
ok('kutip buka/tutup tidak ganda',txt()==='"hi"'&&pos()===4,`${txt()} @${pos()}`);
fresh(); type('`'); type('x'); type('`');
ok('backtick penutup memicu kode inline otomatis',!!DOC().querySelector('code.ic')&&txt()==='x',DOC().innerHTML);
fresh(); type('I'); type("'"); type('m');
ok('apostrof dalam kata tidak dipasangkan',txt()==="I'm",txt());

console.log('── Konteks dan Undo ──');
fresh('', 'b-code'); type('(');
ok('tidak memasangkan di blok kode',txt()==='(',txt());
fresh();
const code=d.createElement('code'); code.className='ic'; code.textContent='x'; DOC().firstElementChild.appendChild(code);
const rCode=d.createRange(); rCode.setStart(code.firstChild,1); rCode.collapse(true); S.removeAllRanges(); S.addRange(rCode);
type('(');
ok('tidak memasangkan di kode inline',code.textContent==='x(',code.outerHTML);
fresh();
DOC().dispatchEvent(new w.CompositionEvent('compositionstart',{bubbles:true,data:''}));
const ime=new w.InputEvent('beforeinput',{bubbles:true,cancelable:true,inputType:'insertCompositionText',data:'(',isComposing:true});
DOC().dispatchEvent(ime);
if(!ime.defaultPrevented){const rr=S.getRangeAt(0),nn=rr.startContainer,oo=rr.startOffset;nn.insertData(oo,'(');const r2=d.createRange();r2.setStart(nn,oo+1);r2.collapse(true);S.removeAllRanges();S.addRange(r2);DOC().dispatchEvent(new w.InputEvent('input',{bubbles:true,inputType:'insertCompositionText',data:'(',isComposing:true}));}
DOC().dispatchEvent(new w.CompositionEvent('compositionend',{bubbles:true,data:'('}));
await wait(15);
ok('tidak memasangkan saat komposisi IME',txt()==='(',txt());
fresh('https://example.test/'); type('(');
ok('tidak memasangkan di URL',txt()==='https://example.test/(',txt());
fresh(); type('(');
ok('satu Undo membatalkan kedua delimiter',undo()&&txt()==='',txt());

console.log('── Preferensi ──');
aturPasangan('kurung',false); fresh(); type('(');
ok('pengaturan dapat mematikan auto-pair kurung',txt()==='(',txt());
aturPasangan('kurung',true);
go('set'); await wait(30);
ok('Pengaturan menampilkan sakelar kurung dan kutip',
  !!d.querySelector('[data-pasangan="kurung"]')&&!!d.querySelector('[data-pasangan="kutip"]'));
ok('Pengaturan menampilkan saran tugas dan mode tempel',
  !!d.querySelector('[data-saran-tugas]')&&!!d.querySelector('[data-tempel-mode]'));
const sw=d.querySelector('[data-pasangan="kutip"]');
if(sw) sw.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
go('notes'); d.querySelector('[data-open="w"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true})); await wait(30);
fresh(); type('"');
ok('sakelar Pengaturan menonaktifkan auto-pair kutip',txt()==='"',txt());
aturPasangan('kutip',true);

console.log(`\nTotal: ${total} · Lulus: ${total-gagal} · Gagal: ${gagal}`);
if(gagal) process.exit(1);
