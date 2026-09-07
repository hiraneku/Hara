/* Kebersihan DOM + hitungan huruf/kata + status tombol + autosave. */
import { docEl, sel, curBlock } from './caret.js?v=20260907004453';
import { renumber } from './blocks.js?v=20260907004453';
import { MARKSEL, markActive, pending } from './marks.js?v=20260907004453';
import { state, save } from '../../core/store.js?v=20260907004453';
import { findNote } from '../model.js?v=20260907004453';
import { domToBlocks, touch, pastikanBlockId } from '../note-model.js?v=20260907004453';
import { cur } from '../../core/router.js?v=20260907004453';
import { canUndo, canRedo, record, isReplaying } from './history.js?v=20260907004453';
import { GROUPS } from '../bar/config.js?v=20260907004453';

export function cleanup(){
  const d=docEl(); if(!d) return;
  Object.keys(MARKSEL).forEach(m=>{
    Array.from(d.querySelectorAll(MARKSEL[m])).forEach(e=>{
      if(e.textContent.replace(/[\u200b\u00a0]/g,'')==='' && !e.contains(sel().anchorNode))
        e.remove();
    });
  });
  Array.from(d.children).forEach(b=>{
    if(b.classList.contains('b-div')) return;
    /* <br> pengganjal hanya boleh ada saat blok benar-benar kosong */
    if(b.textContent.replace(/[\u200b\u00a0]/g,'')!==''){
      /* blok sudah berisi teks -> <br> pengganjal tidak diperlukan lagi */
      Array.from(b.querySelectorAll(':scope > br')).forEach(br=>br.remove());
      /* buang text node kosong sisa penempatan caret */
      const s2=sel(); const anc=s2&&s2.anchorNode;
      Array.from(b.childNodes).forEach(n=>{
        if(n.nodeType===3 && n.data==='' && n!==anc) n.remove();
      });
    }
    if(b.textContent.replace(/[\u200b\u00a0\s]/g,'')==='' && !b.querySelector('img')){
      /* Blok kosong tidak perlu <br> — tingginya dijaga CSS.
         Menyisipkan <br> justru membuat huruf pertama loncat. */
      Array.from(b.querySelectorAll(':scope > br')).forEach(br=>br.remove());
    }
  });
}
export function updateCount(){
  const el=document.getElementById('count'); if(!el) return;
  const d=docEl();
  if(!d){ el.style.display='none'; return; }
  el.style.display='flex';
  const t=((d.innerText!==undefined?d.innerText:d.textContent)||'')
            .replace(/[\u200b\u00a0]/g,' ').trim();
  const chars=t.length;
  const words=t?t.split(/\s+/).filter(Boolean).length:0;
  el.innerHTML=`<b>${chars.toLocaleString('id')}</b> huruf<span class="dot">·</span><b>${words.toLocaleString('id')}</b> kata`;
  /* Cuplikan TIDAK disimpan di sini — ia diturunkan dari blocks lewat
     excerptOf() saat daftar catatan digambar. Menyimpannya di dua tempat
     adalah persis sumber-ganda yang ingin dihindari. */
}
export function syncBtns(){
  const bu=document.querySelector('.mb[data-m="undo"]');
  if(bu) bu.classList.toggle('off',!canUndo());
  const br=document.querySelector('.mb[data-m="redo"]');
  if(br) br.classList.toggle('off',!canRedo());

  /* tombol inline datar (B, I) */
  Object.keys(MARKSEL).forEach(m=>{
    const key = m==='code'?'icode' : (m==='s'?'strike':m);
    const btn=document.querySelector('.mb[data-m="'+key+'"]');
    if(btn) btn.classList.toggle('active',markActive(m));
  });

  const b=curBlock();
  const cls=b?b.className:'';
  /* tombol blok datar, kalau ada */
  const map={h:'b-h1',h2:'b-h2',h3:'b-h3',quote:'b-quote',code:'b-code',
             todo:'b-todo',li:'b-li',ol:'b-ol',cal:'b-cal'};
  Object.entries(map).forEach(([k,c2])=>{
    const btn=document.querySelector('.mb[data-m="'+k+'"]');
    if(btn) btn.classList.toggle('active',!!b&&b.classList.contains(c2));
  });

  /* kelompok: menyala + labelnya mengikuti keadaan sekarang */
  document.querySelectorAll('.mb-g').forEach(btn=>{
    const grp=GROUPS.find(x=>x.g===btn.dataset.g);
    if(!grp) return;
    let aktif=false;
    /* aktif kalau salah satu isinya sedang berlaku */
    (grp.items||[]).forEach(it=>{
      const bc=map[it.m];
      if(bc && b && b.classList.contains(bc)) aktif=true;
      /* nama tombol -> kunci mark; ikut menyala kalau sticky/pending aktif */
      const mk={hl:'hl',strike:'s',icode:'code',b:'b',i:'i'}[it.m];
      if(mk && markActive(mk)) aktif=true;
    });
    btn.classList.toggle('active',aktif);
    /* label ikut berubah, mis. "A" -> "H1" */
    if(grp.reflect){
      const gl=btn.querySelector('.gl');
      if(gl){
        let baru=grp.label;
        for(const [k2,v] of Object.entries(grp.reflect))
          if(b&&b.classList.contains(k2)) baru=v;
        if(gl.innerHTML!==baru) gl.innerHTML=baru;
      }
    }
  });
}
let saveT=null;
export function saveSoon(){
  if(cur!=='editor') return;         /* view sudah pindah: jangan simpan DOM basi */
  clearTimeout(saveT); saveT=setTimeout(saveNow,400);
}
export function saveNow(){
  clearTimeout(saveT); saveT=null;   /* jangan biarkan jadwal lama menimpa */
  const d=docEl(); const n=findNote(state.openId);
  if(d&&n){
    /* DOM dibaca balik jadi blocks — inilah satu-satunya yang disimpan.
       Cuplikan & hitungan kata dihitung ulang dari blocks saat dibutuhkan,
       jadi tidak ada dua sumber data yang bisa berselisih. */
    n.blocks = domToBlocks(d);
    touch(n);
  }
  save();
}
export function refresh(){
  cleanup();
  /* Beri id pada blok yang baru lahir (Enter, tombol bar, tempel) SEBELUM
     snapshot undo diambil — supaya id ikut terekam dan tidak berubah
     saat undo/redo memulihkan HTML. */
  pastikanBlockId(docEl());
  renumber();                     /* nomor daftar selalu berurutan */
  if(!isReplaying()) record();   /* rekam hasil akhir tiap perubahan */
  updateCount(); syncBtns(); saveSoon();
}
