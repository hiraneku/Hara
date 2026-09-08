/* Kebersihan DOM + hitungan huruf/kata + status tombol + autosave. */
import { docEl, sel, curBlock } from './caret.js?v=20260908052529';
import { renumber, pastikanKolomAkhir } from './blocks.js?v=20260908052529';
import { seimbangkanGagangGambar } from '../tata-gambar.js?v=20260908052529';
import { MARKSEL, markActive, pending } from './marks.js?v=20260908052529';
import { state, save } from '../../core/store.js?v=20260908052529';
import { findNote } from '../model.js?v=20260908052529';
import { domToBlocks, touch, pastikanBlockId, pastikanGandel } from '../note-model.js?v=20260908052529';
import { sinkronTag } from '../tags.js?v=20260908052529';
import { tandaiTautan } from '../wikilink.js?v=20260908052529';
import { tandaiBerubah, flush } from '../../core/autosave.js?v=20260908052529';
import { cur } from '../../core/router.js?v=20260908052529';
import { canUndo, canRedo, record, isReplaying } from './history.js?v=20260908052529';
import { GROUPS } from '../bar/config.js?v=20260908052529';
import { warnaSekarang, warnaPending } from './warna.js?v=20260908052529';
import { sorotSekarang, sorotPending } from './sorotan.js?v=20260908052529';

export function cleanup(){
  const d=docEl(); if(!d) return;

  /* ── Buang penanda zero-width warisan ──
     Versi lama menyisipkan U+200B sebagai pijakan caret. Penanda itu ikut
     tersimpan dan merusak spasi saat browser menggabungkan elemen mark
     bersebelahan ("satu dua tiga" jadi "satu duatiga"). Sekarang penanda
     tidak pernah dibuat lagi; sisa yang sudah terlanjur ada dibersihkan
     di sini — kecuali node tempat caret sedang berada, supaya posisi
     mengetik tidak melompat. */
  {
    const s0=sel();
    const anc=s0&&s0.anchorNode;
    const jalan=document.createTreeWalker(d,4,null);
    const buang=[];
    let n;
    while((n=jalan.nextNode())){
      if(n!==anc && n.data && n.data.indexOf('\u200b')>=0) buang.push(n);
    }
    buang.forEach(t=>{ t.data=t.data.replace(/\u200b/g,''); });
  }

  /* ── Ratakan span BERSARANG (font fnt, warna wrn, sorotan wsr) ──
     Span di dalam span membuat "keluar dari bungkus" hanya melepas satu
     lapis, sehingga bungkus LUAR yang lama muncul lagi. Yang paling dalam
     yang berlaku, jadi bungkus luarnya dibuang. */
  ['fnt', 'wrn', 'wsr'].forEach(kls => {
    let putar = 0;
    while (putar++ < 8) {
      const sarang = d.querySelector(`span.${kls} span.${kls}`);
      if (!sarang) break;
      const induk = sarang.parentNode;
      if (!induk || !induk.classList || !induk.classList.contains(kls)) break;
      /* isi induk selain span dalam tetap memakai bungkus induk */
      const sisaTeks = Array.from(induk.childNodes).some(
        n => n !== sarang && (n.textContent || '').replace(/[\u200b\u00a0]/g, '') !== '');
      if (sisaTeks) {
        /* pindahkan span dalam keluar, tepat setelah induk */
        induk.after(sarang);
      } else {
        /* induk cuma membungkus span dalam -> buang induknya */
        induk.replaceWith(sarang);
      }
    }
  });

  /* Span bungkus kosong = sisa pergantian font/warna. Kalau dibiarkan ia
     menumpuk dan caret bisa tersangkut di dalamnya, sehingga pengaturan
     baru tampak tidak berlaku sementara menu menampilkan yang lama. */
  ['fnt', 'wrn', 'wsr'].forEach(kls => {
    Array.from(d.querySelectorAll(`span.${kls}`)).forEach(el=>{
      const s1=sel();
      if(el.textContent.replace(/[\u200b\u00a0]/g,'')==='' &&
         !(s1 && s1.anchorNode && el.contains(s1.anchorNode))) el.remove();
    });
  });
  Object.keys(MARKSEL).forEach(m=>{
    Array.from(d.querySelectorAll(MARKSEL[m])).forEach(e=>{
      if(e.textContent.replace(/[\u200b\u00a0]/g,'')==='' && !e.contains(sel().anchorNode))
        e.remove();
    });
  });
  Array.from(d.children).forEach(b=>{
    if(b.classList.contains('b-div')) return;
    /* <br> hasil Shift+Enter adalah baris baru SAH dan dipertahankan —
       hanya blok KOSONG yang tidak boleh menyimpan <br> pengganjal. */
    if(b.textContent.replace(/[\u200b\u00a0]/g,'')!==''){
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
      const mk={hl:'hl',strike:'s',icode:'code',b:'b',i:'i',u:'u'}[it.m];
      if(mk && markActive(mk)) aktif=true;
    });
    /* kelompok warna: aktif kalau teks di kursor berwarna/bersorotan,
       atau ada yang sedang menunggu ketikan berikutnya */
    if (grp.g === 'warna') aktif = warnaSekarang() !== '' || warnaPending() !== '' ||
                                   sorotSekarang() !== '' || sorotPending() !== '';
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
/* ── Jembatan ke Autosave Manager ──
   Editor tidak menulis ke storage sendiri. Ia hanya melaporkan perubahan;
   penjadwalan, urutan penulisan, dan draf recovery diurus autosave.js. */

/* Baca keadaan editor sekarang jadi data yang siap disimpan. */
export function bacaEditor(){
  const d=docEl(); const n=findNote(state.openId);
  if(!d||!n) return null;
  return { noteId:n.id, title:n.title, blocks:domToBlocks(d) };
}

/* Terapkan data ke catatan lalu tulis ke penyimpanan utama. */
export function tulisKeCatatan(data){
  const n=findNote(data.noteId);
  if(!n) return false;
  n.blocks=data.blocks;
  if(typeof data.title==='string') n.title=data.title;
  /* tag diikuti isi: cache n.tags dihitung ulang dari span .tg */
  sinkronTag(n);
  touch(n);
  return save();          /* save() mengembalikan false kalau gagal */
}

export function saveSoon(){
  if(cur!=='editor') return;   /* view sudah pindah: jangan simpan DOM basi */
  tandaiBerubah();
}

export function saveNow(){
  if(cur!=='editor') return flush();
  /* pastikan perubahan terakhir ikut terbaca sebelum dipaksa tulis */
  tandaiBerubah();
  return flush();
}

export function refresh(){
  cleanup();
  /* Beri id pada blok yang baru lahir (Enter, tombol bar, tempel) SEBELUM
     snapshot undo diambil — supaya id ikut terekam dan tidak berubah
     saat undo/redo memulihkan HTML. */
  pastikanBlockId(docEl());
  /* gagang seret ikut pada blok yang baru lahir (Enter, tempel, undo) */
  pastikanGandel(docEl());
  /* gambar tidak boleh menjadi blok terakhir — sediakan kolom ketik */
  pastikanKolomAkhir(docEl());
  /* seleksi gambar & gagangnya seimbang dengan DOM (undo/redo) */
  seimbangkanGagangGambar();
  /* wikilink: yang belum ada catatannya tampil putus-putus */
  tandaiTautan(docEl());
  renumber();                     /* nomor daftar selalu berurutan */
  if(!isReplaying()) record();   /* rekam hasil akhir tiap perubahan */
  updateCount(); syncBtns(); saveSoon();
}
