/* Markdown otomatis saat mengetik: **tebal**, # judul, - daftar, dst.
   Memakai offset absolut supaya pola tetap cocok walau teks terpecah node. */
import { docEl, sel, curBlock, caretEnd } from './caret.js?v=20260909084636';
import { setBlock, setCallout } from './blocks.js?v=20260909084636';
import { MARKTAG, MARKCLS } from './marks.js?v=20260909084636';
import { updateCount } from './cleanup.js?v=20260909084636';

export const INLINE=[
  {re:/\*\*([^*\n]+)\*\*$/,m:'b'},
  {re:/__([^_\n]+)__$/,m:'b'},
  {re:/(^|[^*])\*([^*\n]+)\*$/,m:'i',g:2},
  {re:/~~([^~\n]+)~~$/,m:'s'},
  {re:/==([^=\n]+)==$/,m:'hl'},
  {re:/`([^`\n]+)`$/,m:'code'},
];
export const LINE=[[/^###\s/,'b-h3'],[/^##\s/,'b-h2'],[/^#\s/,'b-h1'],
            [/^>\s/,'b-quote'],[/^```$/,'b-code']];

/* ── mekanik otomatis tambahan ── */

/* #halo → tag. Mekanik menyala saat sebuah DELIMITER diketik tepat
   setelah kata tag (spasi atau tanda baca penutup). Titik sengaja tidak
   menjadi pemicu: nama tag boleh mengandung titik (mis. #v1.2 yang
   disisipkan dari menu), jadi "." diketik saat mengetik nama itu
   tidak boleh memotongnya. */
const DELIM_TAG=/[ \t\u00a0\u3000,;:!?)\]}\u3001\u3002\uFF0C\uFF1A\uFF1B\uFF01\uFF1F]+$/u;
/* Kata tag — aturan sama dengan impor markdown: # + huruf/angka/_/-/.
   Wajib didahului awal blok, spasi, atau "(" supaya "#x" di tengah
   kata (mis. URL "a#b") tidak ikut menjadi tag. */
const KATA_TAG=/(^|[\s(])(#[\p{L}\p{N}_\/-]+)$/u;
/* "---" (garis penuh) lalu spasi/Enter → pembatas. */
const PEMBATAS_GARIS=/^-{3,}$/;

export function absOff(b,c,o){
  let n=0,done=false;
  (function walk(el){
    if(done) return;
    for(const ch of Array.from(el.childNodes)){
      if(done) return;
      if(ch===c && ch.nodeType===3){ n+=o; done=true; return; }
      if(ch.nodeType===3) n+=ch.data.length;
      else { if(ch===c){ done=true; return; } walk(ch); }
    }
  })(b);
  return n;
}
export function ptFromAbs(b,abs){
  let rem=abs,res=null;
  (function walk(el){
    if(res) return;
    for(const ch of Array.from(el.childNodes)){
      if(res) return;
      if(ch.nodeType===3){
        if(rem<=ch.data.length){ res={node:ch,off:rem}; return; }
        rem-=ch.data.length;
      } else walk(ch);
    }
  })(b);
  return res;
}
export function autoFormat(){
  const d=docEl(); if(!d) return;
  const s=sel(); if(!(s&&s.rangeCount)) return;
  const r=s.getRangeAt(0); if(!r.collapsed) return;
  const b=curBlock(); if(!b) return;
  /* Di dalam blok kode, markdown otomatis TIDAK berlaku — isi ditulis
     apa adanya (janji yang sama tertulis di menu Bantuan). */
  if(b.classList.contains('b-code')) return;
  const node=r.startContainer;
  if(!node||node.nodeType!==3) return;
  const full=b.textContent;
  const caretAbs0=absOff(b,node,r.startOffset);
  const before0=full.slice(0,caretAbs0);
  /* cek dulu: apakah ADA pola yang cocok? kalau tidak, JANGAN sentuh DOM
     maupun caret — menyentuhnya tiap ketikan membuat editor tak bisa dipakai */
  const mayLine = LINE.some(([re])=>re.test(full))
    || /^[-*+]\s/.test(full) || /^[-*+]?\s*\[[\sx]?\]\s/.test(full)
    || /^\d+[.)]\s/.test(full)
    || /^(?:>\s*)?\[!\w+\]\s/i.test(full)
    || (caretAbs0 === full.length && /^-{3,}[ \t]+$/.test(full));
  const mDelim = DELIM_TAG.exec(before0);
  const mungkinTag = !!mDelim && KATA_TAG.test(before0.slice(0, -mDelim[0].length));
  const mayInline = /\[\[[^\]\n]+\]\]$/.test(before0)
    || INLINE.some(pp=>pp.re.test(before0));
  if(!mayLine && !mayInline && !mungkinTag) return;

  /* to-do & daftar */
  /* buang n karakter pertama dari BLOK (bukan dari node kursor) */
  const eat=n=>{
    let left=n;
    const walk=el=>{
      for(const c of Array.from(el.childNodes)){
        if(left<=0) return;
        if(c.nodeType===3){
          const take=Math.min(left,c.data.length);
          c.deleteData(0,take); left-=take;
          if(c.data==='' && c.parentNode.childNodes.length>1) c.remove();
        } else walk(c);
      }
    };
    walk(b);
  };
  /* > [!info] / [!tip] / [!warn] / [!danger] */
  const mc=full.match(/^(?:>\s*)?\[!(info|tip|warn|warning|danger|bahaya|peringatan)\]\s/i);
  if(mc && !b.classList.contains('b-cal')){
    eat(mc[0].length);
    const peta={warning:'warn',peringatan:'warn',bahaya:'danger'};
    const j=(peta[mc[1].toLowerCase()]||mc[1].toLowerCase());
    setCallout(j); return;
  }
  /* pembatas: baris yang isinya cuma "---" lalu spasi/tab di ujungnya.
     Kebalikan daftar: "- " baru menjadi butir kalau spasi mengikuti satu
     tanda hubung; tiga tanda hubung beruntun jelas niat garis. */
  if(caretAbs0 === full.length && /^-{3,}[ \t]+$/.test(full)){
    jadiPembatas(b); return;
  }
  /* daftar bernomor: "1. " */
  const mo=full.match(/^\d+[.)]\s/);
  if(mo && !b.classList.contains('b-ol')){ eat(mo[0].length); setBlock('b-ol'); return; }

  const todo=b.classList.contains('b-li')?/^[-*+]?\s*\[[\sx]?\]\s/:/^[-*+]\s\[[\sx]?\]\s/;
  const mt=full.match(todo);
  if(mt && !b.classList.contains('b-todo')){
    /* `- [x] ` / `- [X] ` langsung jadi todo TERCENTANG */
    const dicek=/\[[xX]\]/.test(mt[0]);
    eat(mt[0].length);
    b.classList.remove('b-li'); setBlock('b-todo');
    if(dicek){
      const cb=b.querySelector(':scope > .cbx');
      if(cb) cb.classList.add('on');
      b.classList.add('done');
    }
    return;
  }
  for(const [re,cls] of LINE){
    const m2=full.match(re);
    if(m2 && !b.classList.contains(cls)){ eat(m2[0].length); setBlock(cls); return; }
  }
  if(!b.classList.contains('b-li') && !b.classList.contains('b-todo')){
    const ml=full.match(/^[-*+]\s/);
    if(ml){ eat(ml[0].length); setBlock('b-li'); return; }
  }
  /* wikilink */
  const caretAbs=caretAbs0;
  const before=before0;
  const wl=before.match(/\[\[([^\]\n]+)\]\]$/);
  if(wl){ replaceAbs(b,caretAbs,wl[0].length,'span','wl','[['+wl[1]+']]'); return; }
  /* tag #nama — delimiter yang baru diketik menutup kata tag; delimiter
     tetap di luar span, caret ikut pindah ke belakangnya */
  if(mungkinTag && cobaTagAkhir(b,true)) return;
  /* inline mark */
  for(const p of INLINE){
    const m2=before.match(p.re);
    if(!m2) continue;
    const inner=m2[p.g||1];
    const lead=(p.g===2 && m2[1])?m2[1].length:0;
    const len=m2[0].length-lead;
    replaceAbs(b,caretAbs,len,MARKTAG[p.m],MARKCLS[p.m]||'',inner);
    return;
  }
}
export function replaceAbs(b,end,len,tag,cls,text){
  const start=end-len; if(start<0) return;
  const p1=ptFromAbs(b,start), p2=ptFromAbs(b,end);
  if(!p1||!p2) return;
  const el=document.createElement(tag);
  if(cls) el.className=cls;
  el.textContent=text;
  const r=document.createRange();
  try{ r.setStart(p1.node,p1.off); r.setEnd(p2.node,p2.off); }catch(e){ return; }
  r.deleteContents(); r.insertNode(el);
  /* text node kosong, BUKAN zero-width: penanda yang tersimpan merusak
     spasi saat browser menggabungkan elemen bersebelahan */
  const sp=document.createTextNode(''); el.after(sp);
  const nr=document.createRange(); nr.setStart(sp,0); nr.collapse(true);
  sel().removeAllRanges(); sel().addRange(nr);
  updateCount();
}

/* ── #halo → tag: dipakai saat mengetik (autoFormat) dan saat Enter ── */

/* Ganti rentang [awalAbs, akhirAbs) dengan span tag. Total panjang teks
   blok tidak berubah (span menyumbang teks yang sama), jadi caret bisa
   dipasang ulang dengan offset absolut yang sama seperti sebelum
   penggantian. */
function gantiTag(b, awalAbs, akhirAbs, teks, caretAbs) {
  const p1 = ptFromAbs(b, awalAbs), p2 = ptFromAbs(b, akhirAbs);
  if (!p1 || !p2) return false;
  const el = document.createElement('span');
  el.className = 'tg';
  el.textContent = teks;
  const r = document.createRange();
  try { r.setStart(p1.node, p1.off); r.setEnd(p2.node, p2.off); } catch (e) { return false; }
  r.deleteContents(); r.insertNode(el);
  const s = sel();
  if (!s) return true;
  const pk = ptFromAbs(b, caretAbs);
  if (pk) {
    const nr = document.createRange();
    nr.setStart(pk.node, Math.min(pk.off, pk.node.length));
    nr.collapse(true);
    s.removeAllRanges(); s.addRange(nr);
  }
  updateCount();
  return true;
}

/* Apakah teks sebelum kursor berakhir dengan kata tag? Kalau ya dan
   bolehDelim, delimiter penutup (spasi/tanda baca di ujung) disisihkan
   lebih dulu — kata tag itulah yang diganti, delimiter tetap teks biasa.
   Skip di dalam elemen tag/tautan/kode: di sana "#x " adalah isi biasa
   (mis. alias tautan, kode inline, atau lanjutan tag yang sedang
   diketik) dan tidak boleh dibungkus lagi. */
export function cobaTagAkhir(b, bolehDelim) {
  if (!b || !b.classList || b.classList.contains('b-code')) return false;
  const s = sel();
  if (!(s && s.rangeCount)) return false;
  const r = s.getRangeAt(0);
  if (!r.collapsed) return false;
  const node = r.startContainer;
  if (!node || node.nodeType !== 3) return false;
  const pa = node.parentElement;
  if (pa && pa.closest && pa.closest('span.tg, span.wl, code, pre, a')) return false;
  const caretAbs0 = absOff(b, node, r.startOffset);
  const before0 = b.textContent.slice(0, caretAbs0);
  let akhir = before0, potong = 0;
  if (bolehDelim) {
    const md = DELIM_TAG.exec(before0);
    if (!md) return false;
    potong = md[0].length;
    /* Delimiter harus TEPAT satu karakter yang baru diketik. Kalau
       rumpunnya lebih panjang (mis. ", " setelah koma tadi sudah
       menutup tag), tag sudah terkonversi di karakter pertama — jangan
       konversi ulang, nanti ada span kosong tersisa. */
    if (potong !== 1) return false;
    akhir = before0.slice(0, -potong);
  }
  const m = KATA_TAG.exec(akhir);
  if (!m) return false;
  const tag = m[2];
  /* ujung tag = posisi kursor dikurangi delimiter; awal = ujung − panjang
     tag. Karakter pemimpin (m[1], spasi/"(") TIDAK ikut dihitung — ia
     berada sebelum tanda # dan harus tetap utuh. */
  const akhirAbs = caretAbs0 - potong;
  const awalAbs = akhirAbs - tag.length;
  if (awalAbs < 0) return false;
  return gantiTag(b, awalAbs, akhirAbs, tag, caretAbs0);
}

/* ── "---" → pembatas ── */

/* Ganti blok `b` dengan garis pembatas + paragraf kosong sesudahnya
   (tempat mengetik lanjutan). Persis seperti tombol pembatas di menu. */
export function jadiPembatas(b) {
  if (!b || !b.parentNode) return false;
  const hr = document.createElement('div');
  hr.className = 'b-div';
  hr.contentEditable = 'false';
  const nb = document.createElement('div');
  nb.className = 'b-p';
  b.replaceWith(hr);
  hr.after(nb);
  caretEnd(nb);
  return true;
}

/* Saat Enter ditekan di ujung baris "---": blok menjadi pembatas.
   (Versi "--- lalu spasi" ditangani autoFormat lewat panggilan
   jadiPembatas di atas; jalur Enter menutup kasus tanpa spasi.) */
export function cobaPembatasAkhir(b) {
  if (!b || !b.classList || b.classList.contains('b-code') ||
      b.classList.contains('b-img') || b.classList.contains('b-div')) return false;
  const s = sel();
  if (!(s && s.rangeCount)) return false;
  const r = s.getRangeAt(0);
  if (!r.collapsed) return false;
  const node = r.startContainer;
  if (!node || node.nodeType !== 3) return false;
  const caretAbs0 = absOff(b, node, r.startOffset);
  const full = b.textContent;
  if (caretAbs0 !== full.length) return false;
  if (!PEMBATAS_GARIS.test(full)) return false;
  jadiPembatas(b);
  return true;
}
