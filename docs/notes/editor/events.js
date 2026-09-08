/* Semua penangan kejadian editor: mengetik, tombol papan ketik, seleksi. */
import { docEl, sel, curBlock, caretEnd, bukaKeyboard, nearestEditable } from './caret.js?v=20260908230043';
import { setBlock, indent } from './blocks.js?v=20260908230043';
import { pending, sticky, mati, flushPending, wrapTypedPending, markAround, markPerluKeluar, keluarDariMark, bungkusMarkLekat } from './marks.js?v=20260908230043';
import { autoFormat } from './markdown.js?v=20260908230043';
import { refresh, updateCount, syncBtns, saveNow } from './cleanup.js?v=20260908230043';
import { slashAktif, bukaSlash, perbaruiSlash, tutupSlash, geserPilihan, pilihanSlash, garingLayak } from '../menus/slash-trigger.js?v=20260908230043';
import { onTitle } from '../model.js?v=20260908230043';
import { tanganiPaste } from './paste.js?v=20260908230043';
import { bungkusFontPending, fontPerluBungkus } from './font.js?v=20260908230043';
import { bungkusWarnaPending, warnaPerluBungkus } from './warna.js?v=20260908230043';
import { bungkusSorotanPending, sorotPerluBungkus } from './sorotan.js?v=20260908230043';
import { record, snap, undo, redo, isReplaying } from './history.js?v=20260908230043';

/* Terapkan format yang sedang aktif (pending sekali-pakai + sticky yang
   melekat) ke karakter yang baru saja diketik. Dipakai dua jalur:
   handler `input` biasa, dan jalur beforeinput yang kita kendalikan. */
/* Pastikan caret berada tepat setelah karakter terakhir yang ditulis.
   `node` bisa sudah terlepas dari DOM kalau format membungkusnya ulang —
   dalam kasus itu caret ditaruh di akhir blok. */
function pastikanCaretSetelah(node, offset){
  const s=sel();
  if(!s) return;
  const kini=s.rangeCount?s.getRangeAt(0):null;
  /* caret sudah berada di node teks yang hidup -> itu posisi sah,
     entah node asli atau node hasil pembungkusan format */
  if(kini && kini.collapsed && kini.startContainer &&
     kini.startContainer.isConnected && kini.startContainer.nodeType===3) return;
  if(node && node.isConnected && node.nodeType===3){
    try{
      const r=document.createRange();
      r.setStart(node, Math.min(offset, node.length));
      r.collapse(true);
      s.removeAllRanges(); s.addRange(r);
      return;
    }catch(err){}
  }
  const b=curBlock();
  if(b) caretEnd(b);
}

/* Deteksi "/" yang baru saja diketik lalu buka menu blok. */
function cekPemicuGaring(){
  const s=sel();
  if(!(s&&s.rangeCount)) return;
  const r=s.getRangeAt(0);
  const n=r.startContainer;
  if(n.nodeType!==3 || r.startOffset===0) return;
  if(n.data[r.startOffset-1]!=='/') return;
  if(!garingLayak(n, r.startOffset-1)) return;
  bukaSlash(n, r.startOffset);
}

function terapkanFormatAktif(){
  if(pending.size){ wrapTypedPending(); return; }
  if(!sticky.size) return;
  const s=sel();
  if(!(s&&s.rangeCount)) return;
  const perlu=[...sticky].filter(m=>!markAround(m,s.getRangeAt(0).startContainer));
  if(!perlu.length) return;
  perlu.forEach(m=>pending.add(m));
  wrapTypedPending();
}

export function bindEditor() {
  const inDoc=t=>t&&t.closest&&t.closest('.ed-doc');
  /* ── PASTE ──
     Clipboard tidak boleh masuk mentah. Dibersihkan dulu, lalu disisipkan
     sebagai blok/inline yang sah. Satu paste = satu langkah undo, dan
     penyimpanan memakai jalur refresh() -> autosave yang sudah ada. */
  document.addEventListener('paste', e => {
    if (!inDoc(e.target)) return;
    snap();                       /* rekam keadaan SEBELUM paste */
    let berhasil = false;
    try { berhasil = tanganiPaste(e); }
    catch (err) { berhasil = false; }   /* clipboard aneh: jangan crash */
    if (!berhasil) return;              /* biarkan browser menangani */
    e.preventDefault();
    autoFormat();
    refresh();                    /* pastikanBlockId + record + autosave */
  });

  document.addEventListener('beforeinput',e=>{
    if(!inDoc(e.target)) return;
    if(pending.size && e.inputType==='insertText') flushPending();

    /* ── Sisipkan huruf pertama SENDIRI ──
       Di contenteditable, karakter pertama pada blok yang belum berisi teks
       kerap ditempatkan browser di posisi yang salah — caret dilempar ke awal
       blok sehingga "Halo" menjadi "aloH". Di sini kita kendalikan penuh:
       tulis karakter tepat di posisi caret, lalu majukan caret satu langkah.
       Format aktif (bold/italic/sorot) ikut terjaga karena kita menulis ke
       DALAM node tempat caret berada, bukan ke blok. */
    if(e.inputType!=='insertText' || !e.data) return;
    const b=curBlock();
    if(!b) return;
    if((b.textContent||'').replace(/[\u200b\u00a0]/g,'')!==''){
      /* blok sudah berisi teks: kalau ada font menunggu, bungkus di sini */
      /* Mode bawaan MELEKAT: tiap karakter diperiksa, bukan cuma yang
         pertama. Browser kerap menarik caret kembali ke dalam span font
         setelah karakter sebelumnya — di sini kita pecah keluar lagi. */
      /* Mark yang dimatikan tapi caret masih di dalamnya — diperiksa TIAP
         karakter, karena browser menarik caret kembali masuk setelah
         karakter sebelumnya. Mark yang sedang sticky JANGAN dikeluarkan —
         ia baru saja dinyalakan lagi oleh pengguna. */
      const markKeluar = markPerluKeluar().filter(m => !sticky.has(m));
      /* Font, sorotan & warna perlu dibungkus untuk karakter ini: ada
         yang menunggu, mode "Bawaan" di dalam span, caret di span yang
         tidak cocok dengan yang lekat, ATAU format lekat yang caret-nya
         sedang di luar span — mis. semua teks barusan dihapus sampai
         span-nya ikut hilang. Dalam kasus terakhir, karakter berikutnya
         harus dibungkus lagi supaya format tidak "mati sendiri". */
      const fontBungkus = fontPerluBungkus();
      const sorotBungkus = sorotPerluBungkus();
      const warnaBungkus = warnaPerluBungkus();

      if (markKeluar.length || fontBungkus || sorotBungkus || warnaBungkus) {
        e.preventDefault();
        /* Bungkus dulu — untuk "Bawaan" fungsi mengembalikan null, itu
           wajar: ia hanya memecah keluar dari span, karakternya tetap
           harus ditulis. Urutan bungkus: font paling luar, sorotan
           (latar) di tengah, warna teks paling dalam — supaya teks yang
           diketik langsung masuk ke lapisan yang tepat tanpa sarang
           silang. */
        if (fontBungkus) bungkusFontPending();
        if (sorotBungkus) bungkusSorotanPending();
        if (warnaBungkus) bungkusWarnaPending();
        markKeluar.forEach(m => keluarDariMark(m));
        const s2 = sel();
        if (s2 && s2.rangeCount) {
          const r2 = s2.getRangeAt(0);
          let t2 = r2.startContainer, o2 = r2.startOffset;
          if (t2.nodeType !== 3) {
            const baru = document.createTextNode('');
            const ref = t2.childNodes[o2] || null;
            if (ref) t2.insertBefore(baru, ref); else t2.appendChild(baru);
            t2 = baru; o2 = 0;
          }
          t2.insertData(o2, e.data);
          const nr2 = document.createRange();
          nr2.setStart(t2, o2 + e.data.length); nr2.collapse(true);
          s2.removeAllRanges(); s2.addRange(nr2);
          /* Kita sudah preventDefault, jadi handler `input` tidak akan
             menerapkan format. Bungkus karakter ini di sini — termasuk
             mark sticky yang barusan dikeluarkan dari elemen lamanya. */
          terapkanFormatAktif();
          if(slashAktif()) perbaruiSlash(); else cekPemicuGaring();
          /* PENJAGA: pastikan caret berada tepat setelah karakter yang
             barusan ditulis. Membungkus format mengganti node, dan caret
             yang tertinggal di node lama membuat huruf berikutnya
             tersisip di posisi salah ("aabbccdd" -> "aaccddbb"). */
          pastikanCaretSetelah(t2, o2 + e.data.length);
          autoFormat(); refresh();
        }
      }
      return;
    }

    const s=sel();
    if(!s || !s.rangeCount) return;
    let r=s.getRangeAt(0);
    /* Node caret bisa sudah dilepas dari DOM (blok ditulis ulang oleh
       setBlock/cleanup). Menulis ke node yatim = teks hilang. Pulihkan. */
    if(!r.startContainer.isConnected || !b.contains(r.startContainer)){
      caretEnd(b);
      if(!s.rangeCount) return;
      r=s.getRangeAt(0);
      if(!b.contains(r.startContainer)) return;
    }

    e.preventDefault();
    /* font yang menunggu/lekat -> bungkus dulu, huruf masuk ke dalamnya */
    if (fontPerluBungkus()) { bungkusFontPending(); r = sel().getRangeAt(0); }
    /* sorotan yang menunggu/lekat -> bungkus di lapisan tengah */
    if (sorotPerluBungkus()) { bungkusSorotanPending(); r = sel().getRangeAt(0); }
    /* warna yang menunggu/lekat -> bungkus paling dalam (bisa
       berdampingan dgn font/sorotan) */
    if (warnaPerluBungkus()) { bungkusWarnaPending(); r = sel().getRangeAt(0); }
    /* mark lekat (tebal/dll.) tanpa elemen di posisi caret — mis. blok
       dikosongkan sehingga <b> ikut dibuang — sediakan wadah kosong
       supaya karakter pertama masuk ke dalamnya, bukan polos */
    if (sticky.size) { bungkusMarkLekat(); if (sel().rangeCount) r = sel().getRangeAt(0); }
    /* buang <br> pengganjal — ia pemaksa baris baru yang mendorong teks */
    Array.from(b.querySelectorAll(':scope > br')).forEach(br=>br.remove());

    let node=r.startContainer, off=r.startOffset;
    if(node.nodeType===3){
      node.insertData(off, e.data);
      off+=e.data.length;
    }else{
      /* caret bertumpu pada elemen -> buat text node di posisi yang tepat */
      const t=document.createTextNode(e.data);
      const ref=node.childNodes[off]||null;
      if(ref) node.insertBefore(t,ref); else node.appendChild(t);
      node=t; off=t.length;
    }
    const nr=document.createRange();
    nr.setStart(node,off); nr.collapse(true);
    s.removeAllRanges(); s.addRange(nr);
    if(slashAktif()) perbaruiSlash(); else cekPemicuGaring();
    autoFormat(); refresh();
  });
  document.addEventListener('input',e=>{
    if(inDoc(e.target)){
      if(isReplaying()) return;
      /* menu "/" mengikuti apa yang diketik */
      if(slashAktif()) perbaruiSlash();
      else cekPemicuGaring();
      if(pending.size || sticky.size) terapkanFormatAktif();
      /* Sticky menyala tapi karakter barusan mendarat DI LUAR elemen format
         (mis. teks tadi dihapus habis sehingga <b> ikut dibuang). Bungkus
         ulang karakter itu supaya format benar-benar berlaku, bukan cuma
         tombolnya yang menyala. */
      autoFormat(); refresh();
    }
    else if(e.target.classList && e.target.classList.contains('ed-t')){ onTitle(e.target); updateCount(); }
  });
  let _lastAnchor=null;
  document.addEventListener('selectionchange',()=>{
    if(!docEl()) return;
    const s=sel();
    const a=s&&s.anchorNode;
    const blk=curBlock();
    if(_lastAnchor && blk!==_lastAnchor){ pending.clear(); sticky.clear(); mati.clear(); }
    _lastAnchor=blk;
    syncBtns();
  });
  document.addEventListener('keydown',e=>{
    if(!inDoc(e.target)) return;
    /* ── menu "/" sedang terbuka: kuasai tombol navigasi ── */
    if(slashAktif()){
      if(e.key==='Escape'){ e.preventDefault(); tutupSlash(); return; }
      if(e.key==='ArrowDown'){ e.preventDefault(); geserPilihan(1); return; }
      if(e.key==='ArrowUp'){ e.preventDefault(); geserPilihan(-1); return; }
      if(e.key==='Enter'||e.key==='Tab'){
        const p=pilihanSlash();
        if(p){ e.preventDefault(); p.dispatchEvent(new MouseEvent('click',{bubbles:true})); return; }
      }
    }
    const mod=e.ctrlKey||e.metaKey;
    if(mod && (e.key==='z'||e.key==='Z')){
      e.preventDefault();
      if(e.shiftKey) redo(); else undo();
      refresh(); return;
    }
    if(mod && (e.key==='y'||e.key==='Y')){ e.preventDefault(); redo(); refresh(); return; }
    /* Enter / Tab / Backspace mengubah struktur -> rekam dulu */
    if(e.key==='Enter'||e.key==='Tab'||e.key==='Backspace') snap();
    const b=curBlock();
    /* Gambar tidak boleh terhapus oleh tombol hapus keyboard — cukup
       tombol X di gambar. Ketika karet berada di ujung blok yang menempel
       gambar (mulai paragraf yang mengikuti / akhir paragraf sebelum
       gambar), Backspace/Delete diabaikan. */
    if((e.key==='Backspace'||e.key==='Delete') && b &&
       !(e.ctrlKey||e.metaKey||e.altKey)){
      const d9 = docEl();
      const s9=sel();
      const r9=(s9&&s9.rangeCount)?s9.getRangeAt(0):null;
      if(d9 && r9 && r9.collapsed && d9.contains(r9.startContainer)){
        let tetangga=null;
        if(e.key==='Backspace'){
          const pre=document.createRange();
          pre.selectNodeContents(b);
          try{ pre.setEnd(r9.startContainer,r9.startOffset); }catch(err){}
          if(pre.toString().replace(/[\u200b\u00a0]/g,'')==='')
            tetangga=b.previousElementSibling;
        }else{
          const ekor=document.createRange();
          ekor.selectNodeContents(b);
          try{ ekor.setStart(r9.startContainer,r9.startOffset); }catch(err){}
          if(ekor.toString().replace(/[\u200b\u00a0]/g,'')==='')
            tetangga=b.nextElementSibling;
        }
        if(tetangga && tetangga.classList &&
           tetangga.classList.contains('b-img')){
          e.preventDefault();
          return;
        }
      }
    }
    /* Enter di dalam daftar: item kosong = keluar dari daftar */
    if(e.key==='Enter' && !e.shiftKey && b &&
       (b.classList.contains('b-ol')||b.classList.contains('b-li')||b.classList.contains('b-todo'))){
      const kosong=(b.textContent||'').replace(/[\u200b\u00a0\s]/g,'')==='';
      if(kosong){
        e.preventDefault();
        setBlock('b-p');
        refresh();
        return;
      }
      /* item berisi: biarkan browser membuat blok baru, lalu rapikan */
      setTimeout(()=>{
        const nb=curBlock();
        if(nb && nb!==b){
          nb.removeAttribute('data-n');
          const cb=nb.querySelector(':scope > .cbx');
          if(cb) cb.remove();
          if(b.classList.contains('b-todo')){
            nb.classList.remove('done');
            const box=document.createElement('button');
            box.className='cbx'; box.contentEditable='false';
            box.type='button'; box.setAttribute('role','checkbox'); box.setAttribute('aria-checked','false');
            box.innerHTML='<svg viewBox="0 0 24 24"><path d="M4 12l5 5L20 6"/></svg>';
            nb.insertBefore(box,nb.firstChild);
          }
        }
        refresh();
      },0);
      return;
    }
    if(e.key==='Enter' && !e.shiftKey && b &&
       (b.classList.contains('b-h1')||b.classList.contains('b-h2')||
        b.classList.contains('b-h3')||b.classList.contains('b-cal'))){
      e.preventDefault();
      const s=sel();
      const r=(s&&s.rangeCount)?s.getRangeAt(0):null;
      /* Indent ikut pindah ke blok baru, supaya bagian terusan tidak
         melompat ke kiri saat heading/callout yang di-indent dipecah. */
      const buatBaru=cls=>{
        const tag={'b-h1':'h1','b-h2':'h2','b-h3':'h3'}[cls]||'div';
        const nb=document.createElement(tag);
        nb.className=cls;
        if(b.style && b.style.paddingLeft) nb.style.paddingLeft=b.style.paddingLeft;
        return nb;
      };
      /* Paragraf kosong di bawah blok — perilaku lama untuk kasus tepi. */
      const taruhBawah=()=>{ const nb=buatBaru('b-p'); b.after(nb); caretEnd(nb); refresh(); };

      if(r && b.contains(r.startContainer)){
        /* Apa pun yang tertulis SEBELUM kursor — untuk tahu apakah kursor
           di awal blok. */
        const sblm=document.createRange();
        sblm.selectNodeContents(b);
        try{ sblm.setEnd(r.startContainer,r.startOffset); }catch(err){}
        if(sblm.toString().replace(/[\u200b\u00a0]/g,'')===''){
          const kosong=(b.textContent||'').replace(/[\u200b\u00a0]/g,'')==='';
          /* blok kosong -> paragraf di bawah (perilaku lama dipertahankan) */
          if(kosong) return taruhBawah();
          /* kursor di AWAL isi -> paragraf baru di ATAS, bukan di bawah */
          const nb=buatBaru('b-p');
          b.before(nb); caretEnd(nb); refresh(); return;
        }
        /* Sisa teks setelah kursor: pindahkan ke blok baru. Kalau tidak,
           sisa teks tertinggal di blok lama dan ketikan berikutnya muncul
           di BAWAH sisa itu — itulah bug lama. */
        const ekor=document.createRange();
        ekor.selectNodeContents(b);
        try{ ekor.setStart(r.startContainer,r.startOffset); }catch(err){}
        if(!ekor.collapsed){
          const frag=ekor.extractContents();
          if((frag.textContent||'').replace(/[\u200b\u00a0]/g,'')!==''){
            /* heading: sisa teks tetap heading (seperti markdown — baris
               baru di dalam # ikut jadi #). callout: keluar jadi paragraf. */
            const cls=b.classList.contains('b-cal') ? 'b-p' : b.className;
            const nb=buatBaru(cls);
            if(frag.childNodes.length) nb.appendChild(frag);
            b.after(nb);
            /* caret di AWAL blok baru, sebelum sisa teks — persis perilaku
               Enter pada pengolah kata. */
            const tn=document.createTextNode('');
            nb.insertBefore(tn,nb.firstChild);
            const nr=document.createRange(); nr.setStart(tn,0); nr.collapse(true);
            s.removeAllRanges(); s.addRange(nr);
            refresh(); return;
          }
        }
      }
      taruhBawah();
      return;
    }
    if(e.key==='Tab'){ e.preventDefault(); indent(e.shiftKey?-1:1); return; }
    if(e.key==='Backspace' && b && !b.classList.contains('b-p')){
      const s=sel();
      if(s.rangeCount && s.getRangeAt(0).collapsed){
        const r=s.getRangeAt(0);
        const pre=document.createRange();
        pre.selectNodeContents(b); pre.setEnd(r.startContainer,r.startOffset);
        if(pre.toString().replace(/[\u200b\u00a0]/g,'')===''){
          e.preventDefault(); setBlock('b-p');
        }
      }
    }
  });
  document.addEventListener('click',e=>{
    const c=e.target.closest('.ed-doc .cbx');
    if(c){
      const on=!c.classList.contains('on');
      c.classList.toggle('on',on);
      c.setAttribute('aria-checked',on?'true':'false');
      c.parentElement.classList.toggle('done',on);
      /* to-do selesai: catat waktu centang supaya bisa dipakai konteks
         lain (mis. tenggat lewat yang baru selesai); simpan segera.
         Saat dibatalkan, waktu centang dihapus supaya model tidak
         menganggapnya pernah tuntas (meta.done = tidak selesai lagi). */
      if(on){
        try{ c.parentElement.setAttribute('data-done',String(Date.now())); }
        catch(e){}
        saveNow();
      } else {
        c.parentElement.removeAttribute('data-done');
        saveNow();
      }
    }
  });

  /* Enter di kolom judul -> langsung lanjut mengetik isi catatan.
     Kursor ditaruh di AKHIR blok pertama, keyboard boleh muncul. */
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    const t = e.target;
    if (!t || !t.classList || !t.classList.contains('ed-t')) return;
    e.preventDefault();
    const d = docEl();
    if (!d) return;
    bukaKeyboard();
    d.focus();
    const b = nearestEditable(d.firstElementChild || d);
    if (b) caretEnd(b);
  });
}
