/* Jenis blok: paragraf, heading, kutipan, kode, daftar, to-do, callout. */
import { docEl, sel, curBlock, caretEnd, ensureCaret, nearestEditable } from './caret.js?v=20260909102312';
import { refresh } from './cleanup.js?v=20260909102312';
import { LOKALE } from '../../core/i18n.js?v=20260909102312';

export const BLOCKCLS = ['b-p','b-h1','b-h2','b-h3','b-quote','b-code','b-li','b-ol','b-todo','b-cal'];

/* Pastikan isi catatan TIDAK berakhir dengan gambar — kalau ya, tambahkan
   paragraf kosong di bawahnya sebagai kolom mengetik. Gambar yang
   mengapit (float) tidak menambah tinggi kolomnya; tanpa paragraf
   penutup, gambar paling bawah menempel ke garis pembatas dan tidak ada
   tempat melanjutkan teks (teks malah menumpuk di paragraf SEBELUM
   gambar sehingga gambar terus terdorong ke bawah). */
const flanked = b => !!b && b.classList && b.classList.contains('b-img') &&
  (b.classList.contains('f-l') || b.classList.contains('f-r'));
const kosongP = s => !!s && s.classList && s.classList.contains('b-p') &&
  !s.querySelector('img') && (s.textContent || '').replace(/[\u200b\u00a0]/g, '') === '';

export function pastikanKolomAkhir(d) {
  const el = d || docEl();
  if (!el) return;
  let t = el.lastElementChild;
  /* 1) catatan tidak boleh berakhir dengan gambar — sediakan paragraf
     kosong di bawahnya sebagai slot ketik */
  if (t && t.classList && t.classList.contains('b-img')) {
    const nb = document.createElement('div');
    nb.className = 'b-p g-slot';
    el.appendChild(nb);
    t = nb;
  }
  /* 2) paragraf kosong yang MENUTUP catatan tepat setelah gambar = slot
     ketik bawah gambar. Kalau gambar penutupnya MENGAPIT, slot jadi slot
     SISI: teks mengalir di sisi gambar dulu lalu ke bawah — area sisinya
     dilebarkan setinggi gambar supaya ketukan di sisi mana pun masuk. */
  if (kosongP(t)) {
    const prev = t.previousElementSibling;
    if (prev && prev.classList && prev.classList.contains('b-img')) {
      t.classList.add('g-slot');
      if (flanked(prev)) {
        t.classList.add('sisi');
        let h = 0;
        try {
          const r = prev.getBoundingClientRect();
          h = (r && r.height) || 0;
        } catch (e) { /* abaikan */ }
        /* tinggi sisi + satu baris penutup: seluruh sisi gambar & area
           tepat di bawahnya berada dalam kotak slot (bisa diketuk) */
        t.style.minHeight = h > 0 ? Math.ceil(h + 28) + 'px' : '6em';
      } else {
        t.classList.remove('sisi');
        t.style.minHeight = '';
      }
    } else {
      /* paragraf kosong penutup yang bukan setelah gambar: bersihkan
         sisa kelas slot (mis. gambar penutupnya sudah dihapus) */
      t.classList.remove('g-slot', 'sisi');
      t.style.minHeight = '';
    }
  }
}

export function setBlock(cls){
  const d=docEl(); if(!d) return;
  let b=curBlock(); if(!b) return;
  b=nearestEditable(b); if(!b) return;
  if(cls!=='b-p' && b.classList.contains(cls)) cls='b-p';   // toggle balik
  const cb=b.querySelector(':scope > .cbx'); if(cb) cb.remove();
  BLOCKCLS.forEach(c=>b.classList.remove(c));
  b.classList.add(cls);
  if(cls==='b-todo'){
    const box=document.createElement('button');
    box.className='cbx'; box.contentEditable='false';
    box.type='button'; box.setAttribute('role','checkbox'); box.setAttribute('aria-checked','false');
    box.innerHTML='<svg viewBox="0 0 24 24"><path d="M4 12l5 5L20 6"/></svg>';
    b.insertBefore(box,b.firstChild);
  }
  if(cls!=='b-todo') b.classList.remove('done');
  /* callout kehilangan jenisnya kalau bukan callout lagi */
  if(cls!=='b-cal') b.removeAttribute('data-cal');
  /* heading memakai elemen heading sungguhan (semantik & aksesibilitas) */
  const tagHead={'b-h1':'h1','b-h2':'h2','b-h3':'h3'}[cls];
  if(tagHead && b.tagName.toLowerCase()!==tagHead){
    const nh=document.createElement(tagHead);
    /* salin SEMUA atribut (data-bid, data-ref, gaya, kelas) — id blok
       wajib stabil saat tipe berubah */
    for(const at of Array.from(b.attributes)) nh.setAttribute(at.name, at.value);
    while(b.firstChild) nh.appendChild(b.firstChild);
    b.replaceWith(nh);
    b=nh;
  }
  renumber();
  caretEnd(b);
  ensureCaret();
  refresh();
}
export function insertHr(){
  const b=curBlock(); if(!b) return;
  const hr=document.createElement('div');
  hr.className='b-div'; hr.contentEditable='false';
  b.after(hr);
  const nb=document.createElement('div'); nb.className='b-p';
  hr.after(nb); caretEnd(nb); refresh();
}
export function indent(dir){
  const b=curBlock(); if(!b) return;
  const cur=parseInt(b.style.paddingLeft)||0;
  b.style.paddingLeft=Math.max(0,cur+dir*24)+'px';
  refresh();
}

/* ── Hapus semua format pada teks terpilih (atau seluruh blok bila tak ada seleksi) ── */
export function clearFormat(){
  const d=docEl(); if(!d) return;
  const b=curBlock(); if(!b) return;
  const s=sel();
  const r=(s&&s.rangeCount&&d.contains(s.getRangeAt(0).startContainer))?s.getRangeAt(0):null;

  if(r && !r.collapsed){
    /* hanya bagian yang diblok */
    const frag=r.extractContents();
    const teks=frag.textContent;
    const tn=document.createTextNode(teks);
    r.insertNode(tn);
    const nr=document.createRange();
    nr.setStart(tn,0); nr.setEnd(tn,tn.length);
    s.removeAllRanges(); s.addRange(nr);
  }else{
    /* seluruh blok: buang bungkus inline, kembalikan ke paragraf biasa */
    const teks=b.textContent.replace(/[\u200b]/g,'');
    const cbx=b.querySelector(':scope > .cbx'); if(cbx) cbx.remove();
    BLOCKCLS.forEach(c=>b.classList.remove(c));
    b.classList.add('b-p');
    b.classList.remove('done');
    b.style.paddingLeft='';
    b.innerHTML='';
    if(teks){ b.appendChild(document.createTextNode(teks)); caretEnd(b); }
    else { caretEnd(b); }
  }
  ensureCaret();
  refresh();
}

/* ── Pindahkan blok ke atas / bawah ── */
export function moveBlock(dir){
  const d=docEl(); if(!d) return;
  const b=curBlock(); if(!b) return;
  /* simpan posisi kursor di dalam blok */
  const s=sel();
  let off=null;
  if(s&&s.rangeCount&&b.contains(s.getRangeAt(0).startContainer)){
    const r=s.getRangeAt(0);
    off={node:r.startContainer,o:r.startOffset};
  }
  if(dir<0){
    const prev=b.previousElementSibling;
    if(!prev) return;
    b.parentNode.insertBefore(b,prev);
  }else{
    const next=b.nextElementSibling;
    if(!next) return;
    b.parentNode.insertBefore(next,b);
  }
  /* pulihkan kursor ke node yang sama (elemennya ikut pindah, jadi masih valid) */
  if(off){
    try{
      const r=document.createRange();
      r.setStart(off.node,off.o); r.collapse(true);
      s.removeAllRanges(); s.addRange(r);
    }catch(e){ caretEnd(b); }
  }else caretEnd(b);
  b.scrollIntoView&&b.scrollIntoView({block:'nearest'});
  refresh();
}

/* ── Nomori ulang semua daftar bernomor.
      Tiap deretan b-ol yang bersambung dihitung dari 1. ── */
export function renumber(){
  const d=docEl(); if(!d) return;
  let n=0;
  Array.from(d.children).forEach(b=>{
    if(b.classList&&b.classList.contains('b-ol')){
      n++; b.setAttribute('data-n',n+'.');
    }else if(!b.classList||!b.classList.contains('b-div')){
      n=0;   /* deretan terputus oleh blok lain */
    }
  });
}

/* ── Ubah jenis callout: info / tip / peringatan / bahaya ── */
export const CALLOUTS={
  info:  {label:'Info',        ikon:'i-info'},
  tip:   {label:'Tip',         ikon:'i-bulb'},
  warn:  {label:'Peringatan',  ikon:'i-warn'},
  danger:{label:'Bahaya',      ikon:'i-danger'},
};
export function setCallout(jenis){
  const d=docEl(); if(!d) return;
  let b=curBlock(); if(!b) return;
  b=nearestEditable(b); if(!b) return;
  if(!b.classList.contains('b-cal')) setBlock('b-cal');
  b=nearestEditable(curBlock());
  if(!b) return;
  b.setAttribute('data-cal',jenis);
  b.setAttribute('data-cal-label',(CALLOUTS[jenis]||CALLOUTS.info).label);
  ensureCaret();
  refresh();
}

/* ── Sisipkan tanggal hari ini di posisi kursor ──
   Format mengikuti bahasa aktif (id: "Minggu, 6 September 2026";
   en: "Sunday, September 6, 2026"; ja: "2026年9月6日日曜日"). */
export function tanggalHariIni() {
  const t = new Date();
  try {
    return t.toLocaleDateString(LOKALE(),
      { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  } catch (e) {
    return `${t.getDate()}/${t.getMonth() + 1}/${t.getFullYear()}`;
  }
}
export function insertTanggal(teks){
  const r=ensureCaret(); if(!r) return;
  const t=document.createTextNode(teks||tanggalHariIni());
  r.deleteContents(); r.insertNode(t);
  const nr=document.createRange();
  nr.setStart(t,t.length); nr.collapse(true);
  const s=sel(); s.removeAllRanges(); s.addRange(nr);
  refresh();
}
