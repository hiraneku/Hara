/* Format inline: tebal, miring, coret, sorot, kode inline.
   `pending` = niat format yang menyala tapi belum diketik. */
import { docEl, sel, curBlock, ensureCaret } from './caret.js?v=20260908040442';
import { refresh } from './cleanup.js?v=20260908040442';

export const MARKSEL = { b:'b,strong', i:'i,em', u:'u', s:'s,strike', hl:'.hl', code:'code.ic' };
export const MARKTAG = { b:'b', i:'i', u:'u', s:'s', hl:'span', code:'code' };
export const MARKCLS = { hl:'hl', code:'ic' };
export const pending = new Set();

/* Format yang sedang "dinyalakan" lewat tombol. Berbeda dari `pending`:
   pending habis begitu diterapkan ke DOM, sedangkan sticky bertahan supaya
   tombol tetap menyala walau teksnya dihapus sampai blok kosong.
   Dimatikan hanya oleh: klik tombol lagi, pindah blok, atau seleksi teks. */
export const sticky = new Set();

/* Mark yang sengaja DIMATIKAN pengguna. Melekat lintas ketikan: selama
   masih di sini, tiap karakter dipastikan ditulis DI LUAR elemen mark —
   karena browser kerap menarik caret kembali masuk. Berakhir saat mark
   dinyalakan lagi, pindah blok, atau ada seleksi baru. */
export const mati = new Set();

/* Apakah caret sedang di blok kosong? Saat kosong, elemen format sudah
   dibuang cleanup() sehingga DOM tidak bisa dijadikan penanda status —
   di situlah sticky mengambil alih. */
export function blokKosong(){
  const b = curBlock();
  if (!b) return false;
  return (b.textContent || '').replace(/[\u200b\u00a0]/g, '') === '';
}

try { document.execCommand('styleWithCSS', false, false); } catch (e) {}

export function markEl(m){
  const e=document.createElement(MARKTAG[m]);
  if(MARKCLS[m]) e.className=MARKCLS[m];
  return e;
}
export function markAround(m,node){
  const d=docEl(); let n=node;
  if(n && n.nodeType===3) n=n.parentNode;
  while(n && n!==d){ if(n.matches && n.matches(MARKSEL[m])) return n; n=n.parentNode; }
  return null;
}
export function markActive(m){
  const d=docEl(); if(!d) return false;
  const s=sel(); if(!(s&&s.rangeCount&&d.contains(s.getRangeAt(0).startContainer))) return false;
  const r=s.getRangeAt(0);
  /* niat 'pending' hanya berlaku saat kursor kosong; kalau ada teks terpilih
     yang menentukan adalah isi DOM, bukan niat sebelumnya */
  if(r.collapsed && pending.has(m)) return true;
  /* sengaja dimatikan -> tombol padam walau caret masih di dalam elemen */
  if(r.collapsed && mati.has(m)) return false;
  /* sticky menjaga tombol tetap menyala setelah teks dihapus habis */
  if(r.collapsed && sticky.has(m)) return true;
  if(markAround(m,r.startContainer)) return true;
  if(!r.collapsed){
    const f=r.cloneContents();
    if(f.querySelector && f.querySelector(MARKSEL[m])) return true;
  }
  return false;
}
export function unwrapAll(root,m){
  Array.from(root.querySelectorAll(MARKSEL[m])).forEach(e=>{
    while(e.firstChild) e.parentNode.insertBefore(e.firstChild,e);
    e.remove();
  });
}
export function toggleMark(m){
  const d=docEl(); if(!d) return;
  const r=ensureCaret(); if(!r) return;

  if(r.collapsed){                       // tak ada teks terpilih -> niat ketik
    /* Mark yang sedang dimatikan tidak boleh dianggap nyala, walau caret
       masih bertetangga dengan elemen lamanya. */
    const nyala = mati.has(m) ? false
      : (pending.has(m) || sticky.has(m) || !!markAround(m,r.startContainer));
    if(nyala){                           // MATIKAN
      pending.delete(m);
      sticky.delete(m);
      /* Jangan cuma memindahkan caret — browser akan menariknya kembali.
         Tandai niat "mati", lalu pecah keluar saat mengetik. */
      if(markAround(m,r.startContainer)) mati.add(m);
      else mati.delete(m);
    } else {                             // NYALAKAN
      /* Caret mungkin masih di dalam elemen mark lama (sisa mode mati).
         Keluar dulu — kalau tidak, teks baru bersarang di elemen lama
         dan tersisip di posisi yang salah. */
      if(mati.has(m) && markAround(m,r.startContainer)) keluarDariMark(m);
      mati.delete(m);
      pending.add(m);
      sticky.add(m);
    }
    refresh(); return;
  }

  pending.clear(); sticky.clear(); mati.clear(); /* seleksi nyata mengalahkan niat lama */
  const on=markActive(m);
  const host=markAround(m,r.startContainer);
  const whole = host && host.textContent.replace(/[\u200b\u00a0]/g,'')
                        === r.toString().replace(/[\u200b\u00a0]/g,'');
  if(on && whole){                       // seluruh isi mark terpilih -> buka
    const kids=Array.from(host.childNodes), par=host.parentNode;
    kids.forEach(k=>par.insertBefore(k,host));
    host.remove(); par.normalize();
    if(kids.length){
      const nr=document.createRange();
      nr.setStartBefore(kids[0]); nr.setEndAfter(kids[kids.length-1]);
      sel().removeAllRanges(); sel().addRange(nr);
    }
  } else {
    const frag=r.extractContents();
    unwrapAll(frag,m);
    let node;
    if(on){ node=frag; }                 // lepas
    else { node=markEl(m); node.appendChild(frag); }   // pasang
    const first=node.nodeType===11?node.firstChild:node;
    const last =node.nodeType===11?node.lastChild :node;
    r.insertNode(node);
    if(first&&last){
      const nr=document.createRange();
      nr.setStartBefore(first); nr.setEndAfter(last);
      sel().removeAllRanges(); sel().addRange(nr);
    }
    const b=curBlock(); if(b) b.normalize();
  }
  refresh();
}
export function wrapTypedPending(){
  const s2=sel();
  if(!(s2&&s2.rangeCount)) return false;
  const r=s2.getRangeAt(0);
  const node=r.startContainer;
  /* Tidak ada karakter untuk dibungkus (caret di elemen, atau di awal
     node). Bersihkan pending supaya niat lama TIDAK nyangkut lalu
     terpakai pada karakter yang salah di kemudian hari. */
  if(node.nodeType!==3 || r.startOffset===0){ pending.clear(); return false; }
  /* sticky sengaja TIDAK dibuang — tombol harus tetap menyala */
  const marks=[...pending]; pending.clear();
  if(!marks.length) return false;
  const start=r.startOffset-1;
  const rr=document.createRange();
  rr.setStart(node,start); rr.setEnd(node,r.startOffset);
  const frag=rr.extractContents();
  let outer=frag;
  marks.forEach(m=>{ const e=markEl(m); e.appendChild(outer); outer=e; });
  rr.insertNode(outer);
  /* Caret WAJIB berada tepat setelah karakter yang baru dibungkus.
     Kalau tidak, ketikan berikutnya tersisip di posisi lama dan urutan
     huruf jadi kacau ("aabbccdd" -> "aaccddbb"). */
  let deep=outer; while(deep.lastChild) deep=deep.lastChild;
  const nr=document.createRange();
  if(deep.nodeType===3) nr.setStart(deep,deep.length);
  else nr.setStartAfter(deep);
  nr.collapse(true);
  sel().removeAllRanges(); sel().addRange(nr);
  return true;
}
/* Mark LEKAT yang caret-nya sedang berada DI LUAR elemennya — sediakan
   wadah kosong di posisi caret supaya karakter berikutnya langsung masuk.
   Dipakai jalur ketikan karakter pertama pada blok kosong: teks lama sudah
   dihapus habis sehingga elemen mark ikut dibuang, tapi tombol harus tetap
   menyala dan ketikan baru harus tetap berformat. */
export function bungkusMarkLekat(){
  if(!sticky.size) return;
  const s=sel();
  if(!(s&&s.rangeCount)) return;
  const perlu=[...sticky].filter(m=>!markAround(m,s.getRangeAt(0).startContainer));
  if(!perlu.length) return;
  perlu.forEach(m=>pending.add(m));
  flushPending();
}

export function flushPending(){
  if(!pending.size) return;
  const r=ensureCaret(); if(!r) return;
  const marks=[...pending]; pending.clear();
  /* Wadah kosong TANPA penanda zero-width. Penanda itu dulu dipakai
     sebagai pijakan caret, tapi ia ikut tersimpan dan — saat browser
     menggabungkan dua elemen mark bersebelahan — mendarat di antara
     spasi dan kata berikutnya sehingga spasinya ikut termakan. */
  let inner=document.createTextNode(''), node=inner;
  marks.forEach(m=>{ const e=markEl(m); e.appendChild(node); node=e; });
  r.insertNode(node);
  const nr=document.createRange(); nr.setStart(inner,0); nr.collapse(true);
  sel().removeAllRanges(); sel().addRange(nr);
}

/* Pecah keluar dari elemen mark `m` di posisi caret, lalu tempatkan caret
   di text node DI LUAR elemen itu. Dipakai saat mark dimatikan tapi caret
   masih berada di dalamnya. Meniru keluarDariFont() di font.js. */
export function keluarDariMark(m){
  const s=sel();
  if(!(s&&s.rangeCount)) return false;
  const r=s.getRangeAt(0);
  const host=markAround(m,r.startContainer);
  if(!host) return false;

  /* pisahkan isi host: sebelum-caret tetap, sesudah-caret jadi elemen baru */
  const sisa=document.createRange();
  sisa.selectNodeContents(host);
  try{ sisa.setStart(r.startContainer,r.startOffset); }catch(e){ return false; }
  const buntut=sisa.extractContents();

  /* pakai kembali text node polos setelah host — kalau bikin node baru
     tiap kali, caret balik ke offset 0 dan huruf tersisip terbalik */
  let titik=host.nextSibling;
  if(!(titik && titik.nodeType===3 && !markAround(m,titik))){
    titik=document.createTextNode('');
    host.after(titik);
  }
  if(buntut.textContent!==''){
    const kanan=host.cloneNode(false);
    kanan.appendChild(buntut);
    titik.after(kanan);
  }
  if(host.textContent.replace(/[\u200b\u00a0]/g,'')==='') host.remove();
  /* jangan tinggalkan elemen mark kosong bersebelahan */

  const nr=document.createRange();
  nr.setStart(titik,titik.length);      /* di AKHIR teks yang sudah ada */
  nr.collapse(true);
  s.removeAllRanges(); s.addRange(nr);
  return true;
}

/* Mark mana saja yang sedang dimatikan TAPI caret masih di dalamnya. */
export function markPerluKeluar(){
  const s=sel();
  if(!(s&&s.rangeCount)||!mati.size) return [];
  const n=s.getRangeAt(0).startContainer;
  return [...mati].filter(m=>markAround(m,n));
}
