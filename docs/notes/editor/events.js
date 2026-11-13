/* Semua penangan kejadian editor: mengetik, tombol papan ketik, seleksi. */
import { docEl, sel, curBlock, caretEnd, bukaKeyboard, nearestEditable, seleksiDiEditor } from './caret.js?v=20261105210000';
import { setBlock, indent } from './blocks.js?v=20261105210000';
import { pending, sticky, mati, flushPending, wrapTypedPending, markAround, markPerluKeluar, keluarDariMark, bungkusMarkLekat, toggleMark, wrapMarkKomposisi } from './marks.js?v=20261105210000';
import { autoFormat, autoTagDalam, cobaTagUjungEnter, cobaPembatasAkhir, tutupTagSebelum, tagUjungCaret, keluarDariUjungTag, tagCaretDalam, pecahSetelahTag } from './markdown.js?v=20261105210000';
import { refresh, updateCount, syncBtns, saveNow } from './cleanup.js?v=20261105210000';
import { setKomposisi, sedangKomposisi } from '../label-tag.js?v=20261105210000';
import { slashAktif, bukaSlash, perbaruiSlash, tutupSlash, geserPilihan, pilihanSlash, garingLayak } from '../menus/slash-trigger.js?v=20261105210000';
import { onTitle } from '../model.js?v=20261105210000';
import { tanganiPaste } from './paste.js?v=20261105210000';
import { modeTempel } from './tempel-mode.js?v=20261105210000';
import { kandidatTugas, saranTugasAktif } from './auto-tugas.js?v=20261105210000';
import { cocokJudulDiAkhir, jadikanWikilink } from './saran-wikilink.js?v=20261105210000';
import { state } from '../../core/store.js?v=20261105210000';
import { bungkusFontPending, fontPerluBungkus } from './font.js?v=20261105210000';
import { bungkusWarnaPending, warnaPerluBungkus, warnaIkutUjung, bungkusWarnaKomposisi, warnaUntukKomposisi } from './warna.js?v=20261105210000';
import { bungkusSorotanPending, sorotPerluBungkus, sorotIkutUjung, bungkusSorotKomposisi } from './sorotan.js?v=20261105210000';
import { record, snap, undo, redo, isReplaying } from './history.js?v=20261105210000';
import { panjangTeks, posisiKaret, rentangPosisi } from './komposisi.js?v=20261105210000';
import { pengaturanPasangan, kategoriPasangan, tutupPasangan } from './pasangan.js?v=20261105210000';
import { ulangSetelahCentang } from '../pengingat.js?v=20261105210000';
import { cobaHitungInlineSekarang } from '../alat-cerdas.js?v=20261105210000';
import { toast } from '../../core/toast.js?v=20261105210000';
import { t as tr } from '../../core/i18n.js?v=20261105210000';

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

function terapkanFormatAktif(n=1){
  /* n > 1: hasil komposisi IME (n karakter sekaligus), lihat komposisi.js */
  const bungkus = () => (n > 1 ? wrapMarkKomposisi(n) : wrapTypedPending());
  if(pending.size){ bungkus(); return; }
  if(!sticky.size) return;
  const s=sel();
  if(!(s&&s.rangeCount)) return;
  const perlu=[...sticky].filter(m=>!markAround(m,s.getRangeAt(0).startContainer));
  if(!perlu.length) return;
  perlu.forEach(m=>pending.add(m));
  bungkus();
}

export function bindEditor() {
  const inDoc=t=>t&&t.closest&&t.closest('.ed-doc');
  let timerSaranTugas = null;
  let timerSaranWikilink = null;
  let saranTugasTerakhir = '';
  let saranWikilinkTerakhir = '';
  const cekSaranTugas = target => {
    if (!saranTugasAktif()) return;
    const b = curBlock();
    if (!b || b !== target || !b.classList.contains('b-p') || !b.isConnected) return;
    /* Hanya paragraf polos agar konversi tidak meratakan format/link pengguna. */
    const anakInline = Array.from(b.children).filter(x => !x.classList.contains('blk-h'));
    if (anakInline.length) return;
    const teks = Array.from(b.childNodes).filter(n => n.nodeType === 3).map(n => n.data).join('');
    const s = sel();
    if (!s || !s.rangeCount || !s.getRangeAt(0).collapsed || !b.contains(s.getRangeAt(0).startContainer)) return;
    if (posisiKaret(b) !== teks.replace(/\u200b/g, '').length) return;
    const calon = kandidatTugas(teks);
    if (!calon) return;
    const id = b.getAttribute('data-bid') || '';
    const tanda = `${id}\n${teks}`;
    if (tanda === saranTugasTerakhir) return;
    saranTugasTerakhir = tanda;
    const rentang = `${calon.frasaTanggal}${calon.jam ? ' · ' + calon.jam : ''}`;
    toast(tr('Tanggal {tanggal} dikenali.', { tanggal: rentang }), {
      label: tr('Jadikan tugas'),
      cb: () => {
        if (!b.isConnected || !docEl()?.contains(b) || b.textContent.replace(/\u200b/g, '') !== teks.replace(/\u200b/g, '')) return;
        const isiLama = b.textContent;
        snap();
        b.textContent = calon.isiTodo;
        const n = b.firstChild;
        if (n && n.nodeType === 3) {
          const r = document.createRange(); r.setStart(n, n.length); r.collapse(true);
          const ss = sel(); ss.removeAllRanges(); ss.addRange(r);
        }
        setBlock('b-todo');
        saveNow();
        toast(tr('Tugas bertanggal dibuat.'), { label: tr('Urungkan'), cb: () => {
          if (!b.isConnected || b.textContent.replace(/\u200b/g, '') !== calon.isiTodo) return;
          snap(); b.textContent = isiLama;
          b.classList.remove('b-todo'); b.classList.add('b-p');
          const box = b.querySelector(':scope > .cbx'); if (box) box.remove();
          const text = Array.from(b.childNodes).find(x => x.nodeType === 3);
          if (text) { const r=document.createRange(); r.setStart(text,text.length); r.collapse(true); const ss=sel(); ss.removeAllRanges(); ss.addRange(r); }
          refresh(); saveNow();
        } }, 5000);
      },
    }, 5000);
  };
  const jadwalkanSaranTugas = () => {
    clearTimeout(timerSaranTugas);
    const target = curBlock();
    timerSaranTugas = setTimeout(() => cekSaranTugas(target), 700);
  };
  const cekSaranWikilink = target => {
    if (!target || !target.isConnected || target !== curBlock() || !target.classList.contains('b-p')) return;
    if (Array.from(target.children).some(x => !x.classList.contains('blk-h'))) return;
    const node = Array.from(target.childNodes).find(n => n.nodeType === 3);
    if (!node || node.data !== target.textContent) return;
    const s = sel();
    if (!s || !s.rangeCount || !s.getRangeAt(0).collapsed || !target.contains(s.getRangeAt(0).startContainer)) return;
    if (posisiKaret(target) !== node.data.length) return;
    if (kandidatTugas(node.data)) return; /* saran tugas lebih relevan dari tautan */
    const calon = cocokJudulDiAkhir(node.data, state.openId);
    if (!calon) return;
    const tanda = `${target.getAttribute('data-bid') || ''}\n${node.data}\n${calon.id}`;
    if (tanda === saranWikilinkTerakhir) return;
    saranWikilinkTerakhir = tanda;
    toast(tr('Catatan “{judul}” cocok.', { judul: calon.judul }), {
      label: tr('Jadikan wikilink'),
      cb: () => {
        if (!target.isConnected || target.textContent !== calon.teks || target !== curBlock()) return;
        const masihCocok = cocokJudulDiAkhir(target.textContent, state.openId);
        if (!masihCocok || masihCocok.id !== calon.id) return;
        jadikanWikilink(target, calon);
      },
    }, 4500);
  };
  const jadwalkanSaranWikilink = () => {
    clearTimeout(timerSaranWikilink);
    const target = curBlock();
    timerSaranWikilink = setTimeout(() => cekSaranWikilink(target), 1100);
  };
  const bisaPasang = b => {
    if (!b || b.classList.contains('b-code') || b.classList.contains('b-math')) return false;
    const s = sel();
    if (!s || !s.rangeCount) return false;
    const r = s.getRangeAt(0);
    if (!b.contains(r.startContainer) || !b.contains(r.endContainer)) return false;
    let n = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement;
    if (n && n.closest && n.closest('code,pre,a,span.wl,span.tg,[contenteditable="false"]')) return false;
    /* Jangan memasangkan tanda baca di tengah URL yang sedang diketik. */
    if (r.collapsed && b.contains(r.startContainer)) {
      const pos = posisiKaret(b), teks = b.textContent || '';
      const sebelum = teks.slice(0, pos), sesudah = teks.slice(pos);
      const token = (sebelum.match(/\S+$/)?.[0] || '') + (sesudah.match(/^\S*/)?.[0] || '');
      if (/^(?:https?:\/\/|www\.|mailto:)/i.test(token)) return false;
    }
    return true;
  };
  const adaPembuka = (teks, buka, tutup) => {
    if (buka === tutup) {
      let jumlah = 0, escaped = false;
      for (const ch of teks) {
        if (ch === buka && !escaped) jumlah++;
        if (ch === '\\' && !escaped) escaped = true; else escaped = false;
      }
      return jumlah % 2 === 1;
    }
    let tingkat = 0;
    for (const ch of teks) {
      if (ch === buka) tingkat++;
      else if (ch === tutup && tingkat) tingkat--;
    }
    return tingkat > 0;
  };
  const prosesPasangan = (e, b) => {
    if (e.inputType !== 'insertText' || typeof e.data !== 'string' || e.data.length !== 1 ||
        sedangKomposisi() || !bisaPasang(b)) return false;
    const setelan = pengaturanPasangan();
    const s = sel();
    if (!s || !s.rangeCount) return false;
    const r = s.getRangeAt(0);
    const teksSebelum = (b.textContent || '').replace(/\u200b/g, '');
    const posCaret = posisiKaret(b);
    const sebelum = r.collapsed ? teksSebelum.slice(0, posCaret) : '';

    /* Tanda tutup yang sudah ada di depan caret dilewati, bukan digandakan.
       Rentang berbasis offset juga bekerja saat delimiter terpisah oleh span. */
    const pembuka = ({ ')':'(', ']':'[', '}':'{', "'":"'", '"':'"', '`':'`' })[e.data];
    const kategoriTutup = pembuka && kategoriPasangan(pembuka);
    if (r.collapsed && kategoriTutup && setelan[kategoriTutup] &&
        teksSebelum[posCaret] === e.data && adaPembuka(sebelum, pembuka, e.data)) {
      e.preventDefault();
      if (e.data === '`') snap(); /* penutup inline-code bisa memicu autoformat */
      const lewati = rentangPosisi(b, posCaret, 1);
      if (lewati) {
        const nr = document.createRange();
        nr.setStart(lewati.endContainer, lewati.endOffset); nr.collapse(true);
        s.removeAllRanges(); s.addRange(nr);
      }
      autoFormat(); refresh();
      return true;
    }

    const kategori = kategoriPasangan(e.data);
    const tutup = kategori && tutupPasangan(e.data);
    if (!tutup || !setelan[kategori]) return false;
    if (!bisaPasang(b)) return false;
    /* Jangan melewati jalur pembungkusan format aktif. */
    if (pending.size || sticky.size || fontPerluBungkus() || warnaPerluBungkus() || sorotPerluBungkus()) return false;
    if (e.data === "'" && r.collapsed) {
      const teks = b.textContent || '', pos = posisiKaret(b);
      const kiri = teks[pos - 1] || '', kanan = teks[pos] || '';
      /* Apostrof di tengah kata dan kutip penutup tidak membuka pasangan. */
      if ((/[\p{L}\p{N}]/u.test(kiri) && /[\p{L}\p{N}]/u.test(kanan)) ||
          (kiri && !/[\s([{—–:;]/u.test(kiri))) return false;
    }
    if ((e.data === '"' || e.data === '`') && r.collapsed) {
      const teks = b.textContent || '', pos = posisiKaret(b), kiri = teks[pos - 1] || '';
      if (kiri && !/[\s([{—–:;]/u.test(kiri)) return false;
    }

    e.preventDefault();
    snap();
    const isi = r.extractContents();
    const adaIsi = isi.childNodes.length > 0;
    const frag = document.createDocumentFragment();
    const bukaNode = document.createTextNode(e.data);
    const tutupNode = document.createTextNode(tutup);
    frag.append(bukaNode, isi, tutupNode);
    r.insertNode(frag);
    const nr = document.createRange();
    if (adaIsi) {
      nr.setStartAfter(bukaNode); nr.setEndBefore(tutupNode);
    } else { nr.setStartAfter(bukaNode); nr.collapse(true); }
    s.removeAllRanges(); s.addRange(nr);
    refresh();
    return true;
  };
  /* ── PASTE ──
     Clipboard tidak boleh masuk mentah. Dibersihkan dulu, lalu disisipkan
     sebagai blok/inline yang sah. Satu paste = satu langkah undo, dan
     penyimpanan memakai jalur refresh() -> autosave yang sudah ada. */
  document.addEventListener('paste', e => {
    if (!inDoc(e.target)) return;
    snap();                       /* rekam keadaan SEBELUM paste */
    const caraTempel = e.shiftKey ? 'plain' : modeTempel();
    let berhasil = false;
    try { berhasil = tanganiPaste(e, caraTempel); }
    catch (err) { berhasil = false; }   /* clipboard aneh: jangan crash */
    if (!berhasil) return;              /* biarkan browser menangani */
    e.preventDefault();
    if (caraTempel !== 'plain') autoFormat();
    refresh();                    /* pastikanBlockId + record + autosave */
    jadwalkanSaranTugas();
    jadwalkanSaranWikilink();
  });

  /* ── KOMPOSISI IME (keyboard Android/iOS) ──
     Selama IME mengompasisi, DOM TIDAK BOLEH diubah: browser menyimpan
     rentang teks komposisinya sendiri, dan begitu kita mengganti struktur
     di situ (mis. membungkus #halo jadi span tepat saat spasi penutup
     masuk), teks komposisi mendarat di tempat yang salah — spasi penutup
     "hilang" dan huruf lanjutan menempel ke dalam tag. Jadi: selama
     komposisi teks dibiarkan apa adanya; begitu komposisi selesai, tag
     dirapikan (autoTagDalam) dan tampilan disegarkan. */
  /* Posisi awal komposisi: blok dan panjang teksnya. Dipakai untuk menghitung
     berapa karakter yang benar-benar masuk. Jangan bergantung pada e.data
     saja — di beberapa keyboard HP e.data kosong saat compositionend. */
  let kompAwal=null;        /* posisi awal komposisi: blok, panjang teks, posisi kursor */
  let kompAkhir=null;       /* posisi kursor setelah ketikan komposisi terakhir */
  let kompWarnaBlok=null;   /* blok yang diberi warna sementara selama komposisi */

  /* Rentang hasil komposisi di dalam blok: jumlah karakter dan posisi awalnya.
     Dihitung dari POSISI (awal dan akhir), bukan dari kursor saat itu. Kalau
     compositionstart datang setelah teks sudah masuk (urutan event berbeda di
     beberapa keyboard HP), posisi awal dibetulkan dari panjang e.data. */
  function rentangKomposisi(awal, akhir, dataAkhir){
    if(!awal || !awal.blok) return null;
    const akhirEff = akhir || (curBlock()===awal.blok ? { blok:awal.blok, pos:posisiKaret(awal.blok) } : null);
    const sama = akhirEff && akhirEff.blok===awal.blok;
    if(sama){
      const d = akhirEff.pos - awal.pos;
      if(d>0) return { n:d, awal:{ blok:awal.blok, pos:awal.pos } };
    }
    const dLen = panjangTeks(awal.blok) - awal.len;
    if(dLen>0 && sama) return { n:dLen, awal:{ blok:awal.blok, pos:awal.pos } };
    const dData = (dataAkhir||'').length;
    if(dData>0 && sama) return { n:dData, awal:{ blok:awal.blok, pos:Math.max(0, akhirEff.pos - dData) } };
    return null;
  }

  /* Komposisi selesai: format, warna, sorotan, lalu perapian. Dipakai dari
     compositionend (ditunda sebentar, supaya input yang menyusul lewat dulu),
     dan dari input/keydown yang menandakan komposisi sudah ditutup browser
     TANPA compositionend — ini terjadi saat spasi ditekan di keyboard HP
     ketika huruf pertama masih dalam komposisi. Dulu bendera komposisi cuma
     dimatikan, sehingga huruf itu tidak pernah dibungkus warnanya. */
  function akhiriKomposisi(akhir, dataAkhir, ditunda){
    const awal=kompAwal; kompAwal=null; kompAkhir=null;
    const r = rentangKomposisi(awal, akhir, dataAkhir);
    const n = r ? r.n : 0;
    const kerjakan = () => {
      setKomposisi(false);
      /* format yang menyala (tebal/miring/…) baru dibungkus sekarang —
         selama komposisi DOM sengaja tidak disentuh. */
      if(pending.size || sticky.size){ try{ terapkanFormatAktif(n); }catch(err){} }
      if(r){
        try{ bungkusWarnaKomposisi(n, r.awal); }catch(err){}
        try{ bungkusSorotKomposisi(n, r.awal); }catch(err){}
      }
      /* warna sementara blok (opsi A) dilepas SETELAH pembungkusan di atas,
         supaya huruf komposisi tidak sempat tampil hitam */
      if(kompWarnaBlok){ kompWarnaBlok.style.removeProperty('color'); kompWarnaBlok=null; }
      try{ autoTagDalam(curBlock()); }catch(err){ /* jangan ganggu ketikan */ }
      try{ autoFormat(); }catch(err){}
      refresh();
      jadwalkanSaranTugas();
      jadwalkanSaranWikilink();
    };
    if(ditunda) setTimeout(kerjakan,0); else kerjakan();
  }

  /* Tombol yang BUKAN bagian komposisi IME: keyCode 229 / Unidentified dipakai
     IME untuk seluruh ketikannya, dan modifier tidak mengakhiri komposisi. */
  const tombolBukanIme = e => e.keyCode!==229 && e.key!=='Unidentified' &&
    !['Shift','Control','Alt','Meta','CapsLock'].includes(e.key);
  document.addEventListener('compositionstart',()=>{
    if(!docEl()) return;
    setKomposisi(true);
    const b=curBlock();
    /* pos: posisi kursor dalam blok saat komposisi mulai. Pembungkusan di
       compositionend memakai ini, bukan kursor saat itu (lihat komposisi.js). */
    kompAwal = b ? { blok:b, len:panjangTeks(b), pos:posisiKaret(b) } : null;
    kompAkhir = null;
    /* Keluhan 1 (opsi A, versi aman): kalau warna menyala dan blok hanya
       berisi spasi (catatan kosong, atau spasi di awal), warna DIPASANG KE
       ELEMEN BLOK selama komposisi, bukan ke node teks. Node teks dan posisi
       kursor tidak disentuh, jadi komposisi IME tidak terganggu. Spasi tidak
       terlihat, jadi tidak ada yang ikut berwarna selain huruf komposisi.
       Warna blok dihapus setelah pembungkusan di compositionend. Catatan:
       membuat span kosong di sini TIDAK berhasil; Chromium tetap menaruh
       huruf komposisi di teks lama di luar span. */
    kompWarnaBlok=null;
    try{
      const hexKomp=warnaUntukKomposisi();
      if(b && hexKomp && /^\s*$/.test(b.textContent||'')){
        b.style.color=hexKomp;
        kompWarnaBlok=b;
      }
    }catch(err){ /* jangan ganggu komposisi */ }
  });
  document.addEventListener('compositionend',e=>{
    if(!docEl()) return;
    /* biarkan input yang menyusul (bila ada) lewat tanpa mengubah DOM;
       rentang dihitung sekarang dari posisi yang dicatat, perapian menyusul */
    akhiriKomposisi(kompAkhir, e.data, true);
  });

  document.addEventListener('beforeinput',e=>{
    if(!inDoc(e.target)) return;
    /* Ctrl+B / Ctrl+I / Ctrl+U / Ctrl+Shift+X: browser mengirim perintah
       format NATIVE (formatBold dst). Di blok kosong perintah itu tidak
       berefek, dan tidak lewat mekanik format aplikasi. Dialihkan ke
       toggleMark — sama persis dengan tombol bilah. */
    const FORMAT_NATIVE = { formatBold:'b', formatItalic:'i', formatUnderline:'u', formatStrikeThrough:'s' };
    if(FORMAT_NATIVE[e.inputType]){
      e.preventDefault();
      if(isReplaying()) return;
      snap();
      toggleMark(FORMAT_NATIVE[e.inputType]);
      refresh();
      return;
    }
    /* IME sedang mengompasisi: jangan sentuh DOM, biarkan browser/IME
       menangani teksnya (tag dirapikan setelah komposisi selesai) */
    if(sedangKomposisi()) return;
    const blokPasangan = curBlock();
    if (blokPasangan && prosesPasangan(e, blokPasangan)) return;
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
      /* ── tag otomatis di ujung ketikan ──
         Karakter penutup (spasi/tanda baca) mengubah #nama jadi tag
         SEKARANG, sebelum browser sempat menaruh karakter. Konversi
         setelah karakter masuk membuat browser bisa "menarik kembali"
         kursor ke dalam span tag — ketikan lanjutan lalu menyambung di
         dalam tag (ikut berwarna tag, warnanya berubah tiap huruf).
         Lewati saat ada format yang sedang menunggu — biarkan jalur
         lama yang menanganinya. */
      if (!pending.size && !sticky.size && tutupTagSebelum(b, e.data)) {
        e.preventDefault();
        refresh();
        return;
      }
      /* blok sudah berisi teks: kalau ada font menunggu, bungkus di sini */
      /* Mode bawaan MELEKAT: tiap karakter diperiksa, bukan cuma yang
         pertama. Browser kerap menarik caret kembali ke dalam span font
         setelah karakter sebelumnya — di sini kita pecah keluar lagi. */
      /* Mark yang dimatikan tapi caret masih di dalamnya — diperiksa TIAP
         karakter, karena browser menarik caret kembali masuk setelah
         karakter sebelumnya. Mark yang sedang sticky JANGAN dikeluarkan —
         ia baru saja dinyalakan lagi oleh pengguna. */
      const markKeluar = markPerluKeluar().filter(m => !sticky.has(m));
      /* Pengaman ujung tag: browser menarik caret kembali ke dalam span
         tag yang baru dibuat. Kalau caret menyelinap ke ujung-dalam tag,
         keluarkan dulu — kalau tidak, ketikan lanjutan ikut jadi tag
         (warnanya berubah-ubah tiap huruf). Mengetik di TENGAH tag
         (menyunting) tetap dibolehkan. */
      const tagUjung = tagUjungCaret();
      /* Font, sorotan & warna perlu dibungkus untuk karakter ini: ada
         yang menunggu, mode "Bawaan" di dalam span, caret di span yang
         tidak cocok dengan yang lekat, ATAU format lekat yang caret-nya
         sedang di luar span — mis. semua teks barusan dihapus sampai
         span-nya ikut hilang. Dalam kasus terakhir, karakter berikutnya
         harus dibungkus lagi supaya format tidak "mati sendiri". */
      const fontBungkus = fontPerluBungkus();
      const sorotBungkus = sorotPerluBungkus();
      const warnaBungkus = warnaPerluBungkus();
      /* warna/sorotan lekat dengan caret di ujung span-nya: tulis manual ke
         dalam span (browser bisa melempar karakter keluar span) */
      const warnaIkut = warnaIkutUjung();
      const sorotIkut = sorotIkutUjung();

      if (markKeluar.length || tagUjung || fontBungkus || sorotBungkus || warnaBungkus || warnaIkut || sorotIkut) {
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
        if (tagUjung) keluarDariUjungTag(tagUjung);
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
          jadwalkanSaranTugas();
          jadwalkanSaranWikilink();
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
    jadwalkanSaranTugas();
    jadwalkanSaranWikilink();
  });
  document.addEventListener('input',e=>{
    if(inDoc(e.target)){
      if(isReplaying()) return;
      if(sedangKomposisi()){
        const bk=curBlock();
        const dalamKomposisi = bk && kompAwal && bk===kompAwal.blok;
        if(e.inputType==='insertCompositionText'){
          /* ujung komposisi terakhir: kursor setelah huruf komposisi masuk */
          if(dalamKomposisi) kompAkhir={ blok:bk, pos:posisiKaret(bk) };
          return;
        }
        /* input biasa (mis. spasi dari keyboard HP) saat komposisi belum ditutup
           browser: komposisi selesai di sini, sampai kursor sekarang */
        if(e.inputType && e.inputType.startsWith('insert') && e.inputType!=='insertFromComposition'){
          akhiriKomposisi(dalamKomposisi ? { blok:bk, pos:posisiKaret(bk) } : null, null, false);
        } else {
          /* IME sedang mengompasisi: DOM tidak disentuh sama sekali (lihat
             catatan di compositionstart). Perapian menyusul setelah selesai. */
          return;
        }
      }
      /* menu "/" mengikuti apa yang diketik */
      if(slashAktif()) perbaruiSlash();
      else cekPemicuGaring();
      if(pending.size || sticky.size) terapkanFormatAktif();
      /* Sticky menyala tapi karakter barusan mendarat DI LUAR elemen format
         (mis. teks tadi dihapus habis sehingga <b> ikut dibuang). Bungkus
         ulang karakter itu supaya format benar-benar berlaku, bukan cuma
         tombolnya yang menyala. */
      autoFormat();
      /* Ketikan satu gumpalan (komposisi/autocorrect): spasi masuk
         sekaligus dengan kata lanjutan — tag #… di dalamnya tetap
         terbungkus */
      try { autoTagDalam(curBlock()); } catch (err) { /* jangan ganggu ketikan */ }
      if (e.data === ' ') {
        const blkHitung = curBlock();
        if (blkHitung && (blkHitung.textContent || '').includes('=')) {
          try { cobaHitungInlineSekarang(false); } catch (err) {}
        }
      }
      refresh();
    }
    else if(e.target.classList && e.target.classList.contains('ed-t')){ onTitle(e.target); updateCount(); }
  });
  let _lastAnchor=null;
  document.addEventListener('selectionchange',()=>{
    if(!docEl()) return;
    /* seleksi di luar editor = bukan pindah blok (keyboard turun) */
    if(!seleksiDiEditor()){ syncBtns(); return; }
    const blk=curBlock();
    if(_lastAnchor && _lastAnchor!==blk){ pending.clear(); sticky.clear(); mati.clear(); }
    _lastAnchor=blk;
    syncBtns();
  });
  document.addEventListener('keydown',e=>{
    if(!inDoc(e.target)) return;
    /* IME sedang mengompasisi: Enter/panah/angka dipakai memilih kandidat
       IME — jangan dirampas editor (dulu Enter memecah blok saat pengguna
       hanya mengonfirmasi kata di keyboard Android). Kalau bendera kita
       masih tertinggal padahal browser sudah tidak mengompasisi,
       bersihkan dulu supaya editor tidak terkunci. */
    if(e.isComposing) return;
    /* komposisi masih menyala padahal tombol biasa ditekan (mis. spasi):
       komposisi dianggap selesai, teksnya dibungkus dulu, baru tombolnya diproses */
    if(sedangKomposisi() && tombolBukanIme(e)) akhiriKomposisi(kompAwal && kompAwal.blok===curBlock() ? { blok:kompAwal.blok, pos:posisiKaret(kompAwal.blok) } : null, null, false);
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
    /* Backspace di dalam pasangan kosong menghapus kedua delimiter sekaligus. */
    if(e.key==='Backspace' && !mod && !e.altKey && !e.shiftKey){
      const bp = curBlock(), sp = sel();
      const rp = sp && sp.rangeCount ? sp.getRangeAt(0) : null;
      const setelan = pengaturanPasangan();
      if(bp && rp && rp.collapsed && bp.contains(rp.startContainer) && bisaPasang(bp)){
        const teks=(bp.textContent||'').replace(/\u200b/g,'');
        const pos=posisiKaret(bp), buka=teks[pos-1], tutup=teks[pos];
        const kategori=kategoriPasangan(buka);
        if(kategori && setelan[kategori] && tutupPasangan(buka)===tutup){
          const hapus=rentangPosisi(bp,pos-1,2);
          if(hapus){
            e.preventDefault(); snap(); hapus.deleteContents();
            sp.removeAllRanges(); sp.addRange(hapus); refresh(); return;
          }
        }
      }
    }
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
    /* ── Enter menutup baris mekanik yang belum sempat ditutup spasi:
       "#halo" di ujung baris → jadi tag lalu baris dipecah sendiri
       (hasil pasti di semua browser); baris isinya cuma "---" →
       pembatas. ── */
    if(e.key==='Enter' && !e.shiftKey && !e.isComposing && b &&
       !b.classList.contains('b-code') && !b.classList.contains('b-img') &&
       !b.classList.contains('b-div')){
      /* Enter saat caret DI DALAM tag (browser menarik kursor masuk):
         jangan biarkan baris terbelah di tengah span — pecahkan SETELAH
         tag. Tag utuh di atas; tidak ada sisa huruf berwarna atau tag
         hantu di paragraf baru. */
      const tDlm = tagCaretDalam();
      if (tDlm && (b.classList.contains('b-p') || /^b-h[123]$/.test(b.className||''))) {
        e.preventDefault();
        pecahSetelahTag(b, tDlm);
        refresh();
        return;
      }
      if(cobaTagUjungEnter(b)){
        e.preventDefault();
        const nb=document.createElement('div');
        nb.className='b-p';
        b.after(nb);
        const tn=document.createTextNode('');
        nb.appendChild(tn);
        const sX=sel();
        if(sX){
          const nr=document.createRange(); nr.setStart(tn,0); nr.collapse(true);
          sX.removeAllRanges(); sX.addRange(nr);
        }
        refresh();
        return;
      }
      if(cobaPembatasAkhir(b)){
        e.preventDefault();
        refresh();
        return;
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
      /* to-do BERULANG (K2): dicentang = geser tenggat ke kejadian berikutnya,
         lalu kembali kosong. Tidak ditandai selesai — tenggat berikutnya menunggu. */
      if(on){
        const blokEl=c.parentElement;
        const nx=ulangSetelahCentang(blokEl.innerHTML.replace(/<button[\s\S]*?<\/button>/,''), Number(blokEl.getAttribute('data-ulang'))||0);
        if(nx){
          blokEl.setAttribute('data-ulang',String(nx));
          blokEl.removeAttribute('data-done');
          saveNow();
          toast(tr('Berulang · berikutnya')+' '+new Date(nx).toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short'}));
          return;
        }
      }
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
  document.addEventListener('input', e => {
    if (inDoc(e.target) && !sedangKomposisi()) {
      jadwalkanSaranTugas();
      jadwalkanSaranWikilink();
    }
  });

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
