/* ════════ PASTE ════════

   Clipboard TIDAK boleh masuk mentah ke editor. Alurnya:

     clipboard → bersihkan → potong jadi baris/blok → sisip → blocks[]

   Prinsip:
   • HTML clipboard disaring keras: hanya tag inline yang memang didukung
     sistem marks yang lolos — plus <a href> yang AMAN, yang diubah jadi
     tautan Hara (a.lk). Script, event handler, style, dan atribut asing
     dibuang total.
   • Teks dari luar disesuaikan ke MEKANIK Hara (editor/tempel-mekanik.js):
     "1. a / 2. b" jadi daftar bernomor, "- a" jadi butir, "- [ ] a" jadi
     to-do, "# Judul" jadi heading, "> kutipan", "---" pembatas, pagar
     kode ``` ``` jadi blok kode, dan alamat telanjang jadi tautan a.lk.
   • Baris ditentukan oleh <br> DAN elemen blok — di kedalaman mana pun.
     Clipboard yang memisahkan baris dengan <br> di dalam satu <div>/<span>
     tidak lagi menempelkan "2." ke ujung baris sebelumnya.
   • Blok lama mempertahankan id; blok baru dapat id sendiri lewat
     pastikanBlockId() yang sudah ada.
   • Autosave & history memakai mekanisme yang sudah ada — tidak ada
     penyimpanan atau riwayat kedua.
*/

import { docEl, sel, curBlock, caretEnd, nearestEditable } from './caret.js?v=20260918132843';
import { sisipGambar } from './image.js?v=20260918132843';
import { barisMekanik, teksKeBaris, bagiIndent, polaBaris, padUntuk,
  tautkanTeks, tautanAman, hrefDari, htmlTautan }
  from './tempel-mekanik.js?v=20260918132843';

/* Tag inline yang boleh bertahan — sama persis dengan yang dikenal marks.js.
   Selain ini, isinya dipertahankan tapi bungkusnya dibuang. */
const INLINE_AMAN = {
  B: 'b', STRONG: 'b', I: 'i', EM: 'i', U: 'u',
  S: 's', STRIKE: 's', DEL: 's', CODE: 'code',
};

/* Kelas blok yang mungkin menempel — harus dilepas sebelum diganti. */
const BLOK_KELAS = ['b-p','b-h1','b-h2','b-h3','b-quote','b-code','b-li','b-ol','b-todo','b-cal'];

const escHtml = s => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ── Saring HTML clipboard jadi inline aman ──
   Mengembalikan string HTML yang hanya berisi teks + tag inline dikenal. */
export function bersihkanInline(node) {
  let keluar = '';
  for (const anak of Array.from(node.childNodes)) {
    if (anak.nodeType === 3) {                       /* teks */
      /* alamat telanjang ikut ditautkan — teksnya tetap ter-escape */
      keluar += tautkanTeks(anak.data);
      continue;
    }
    if (anak.nodeType !== 1) continue;               /* komentar dll: buang */
    const tag = anak.tagName;

    /* Buang total beserta isinya — sumber skrip & gaya. */
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' ||
        tag === 'IFRAME' || tag === 'OBJECT' || tag === 'EMBED') continue;

    if (tag === 'BR') { keluar += ' '; continue; }

    /* Tautan dari aplikasi lain: disaring, lalu ditulis ulang dalam
       bentuk tautan Hara supaya bisa dibuka & disunting seperti tautan
       yang dibuat lewat menu. Alamat tak aman (javascript:, data:)
       kehilangan tautannya, teksnya tetap tampil. */
    if (tag === 'A') {
      const href = tautanAman(anak.getAttribute('href'));
      const teks = (anak.textContent || '').trim() || href;
      keluar += (href && teks) ? htmlTautan(href, teks) : bersihkanInline(anak);
      continue;
    }

    const aman = INLINE_AMAN[tag];
    const dalam = bersihkanInline(anak);
    if (!dalam) continue;

    if (aman === 'code') keluar += `<code class="ic">${dalam}</code>`;
    else if (aman) keluar += `<${aman}>${dalam}</${aman}>`;
    else keluar += dalam;        /* tag tak dikenal: isinya saja */
  }
  return keluar;
}

/* ── Pemecahan HTML clipboard jadi baris ──

   Yang menentukan hasil bukan nama tag-nya, tapi BENTUK BARISNYA. Karena
   itu clipboard dipotong dulu jadi potongan sebaris (hanya teks + format
   inline), lalu tiap potongan dilewatkan mekanik Hara — jalur yang sama
   dengan yang dipakai saat mengetik.

   Batas baris = <br> DAN elemen blok, di kedalaman mana pun. Banyak
   aplikasi (pembaca PDF, WhatsApp, Chrome Android) memisahkan baris
   dengan <br> di dalam satu <div>/<span>, dan sebagian menaruh <div> di
   dalam <span>. Dulu bentuk seperti itu diratakan jadi satu paragraf:
   "1. Halo" + <br> + "2. Dunia" menempel jadi "1. Halo 2. Dunia" —
   nomornya tidak berderet ke bawah, tapi naik ke baris di atasnya.
   Kini tiap baris berdiri sendiri, jadi nomornya turun sebagai daftar.

   <br> yang menutup baris KOSONG (dua <br> beruntun) tetap jadi baris
   kosong, sama seperti baris kosong pada teks polos. */

/* Elemen blok: apa pun tag-nya, di Hara ia memulai baris baru. */
const JENIS_BLOK = new Set(['DIV','P','SECTION','ARTICLE','HEADER','FOOTER','ASIDE',
  'NAV','FIGURE','FIGCAPTION','ADDRESS','FORM','FIELDSET','DL','DT','DD','LI',
  'TABLE','THEAD','TBODY','TFOOT','TR','TD','TH','CAPTION']);
/* Elemen blok yang jenis bloknya sudah tertentu. */
const JENIS_KHUSUS = { H1: 'h1', H2: 'h2', H3: 'h3', H4: 'h3', H5: 'h3', H6: 'h3',
  BLOCKQUOTE: 'quote', PRE: 'code' };
const CLS_JENIS = { p: 'b-p', ol: 'b-ol', li: 'b-li', todo: 'b-todo',
  quote: 'b-quote', code: 'b-code', div: 'b-div', h1: 'b-h1', h2: 'b-h2', h3: 'b-h3' };
/* Elemen yang di dalamnya ada batas baris → harus ditelusuri, bukan
   diratakan jadi satu potongan. */
const ADA_BATAS_DI_DALAM = 'br,div,p,ul,ol,li,h1,h2,h3,h4,h5,h6,blockquote,pre,hr,' +
  'table,thead,tbody,tfoot,tr,td,th,section,article,header,footer,aside,nav,' +
  'figure,figcaption,dl,dt,dd,form,fieldset,address,caption';
/* Tautan otomatis (a.lk yang teksnya = alamatnya) BUKAN "markup":
   potongan berisi teks + tautan otomatis tetap dijalankan lewat mekanik.
   Tautan yang teksnya BEDA dari alamatnya (mis. "situs Hara") justru
   informasi — alamatnya tidak boleh hilang, jadi diperlakukan markup. */
const TAUTAN_LK = /<a class="lk" href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
const adaMarkup = html => /[<>]/.test(String(html || '').replace(TAUTAN_LK,
  (m, href, teks) => hrefDari(teks) === href ? teks : m));

/* Teks datar dari potongan HTML (entity dibuka kembali). */
function teksDatar(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  return tmp.textContent || '';
}

/* Buang `n` karakter pertama dari TEKS potongan HTML (tag dilewati).
   Dipakai untuk menghapus penanda mekanik ("1. ", "- ", "# ") yang ikut
   ter-format di clipboard — nomornya pindah ke nomor otomatis Hara,
   format tebal/miring di belakangnya tetap. */
function potongTeksAwal(html, n) {
  if (!n && n !== 0) return html;
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  const jalan = document.createTreeWalker(tmp, 4, null);   /* 4 = SHOW_TEXT */
  let sisa = n, t;
  while (sisa > 0 && (t = jalan.nextNode())) {
    const ambil = Math.min(sisa, t.data.length);
    t.data = t.data.slice(ambil);
    sisa -= ambil;
  }
  return tmp.innerHTML;
}

/* Satu potongan sebaris → baris siap sisip. null = potongan hampa.
   `levelLuar` = kedalaman daftar bersarang dari struktur HTML (indentasi
   yang ditulis dengan spasi/&nbsp; dihitung sendiri oleh bagiIndent). */
function jadikanSegmen(nodes, jenis, dicek, levelLuar) {
  if (jenis === 'div') return { cls: 'b-div', html: '' };
  if (jenis === 'code')
    return { cls: 'b-code', html: escHtml(nodes.map(n => n.textContent || '').join('')) };

  const tmp = document.createElement('div');
  for (const n of nodes) tmp.appendChild(n.cloneNode(true));
  const html0 = bersihkanInline(tmp);
  const mentah = teksDatar(html0).replace(/[\s\u00a0]+$/, '');
  if (!mentah) return null;
  const { level, isi, panjang } = bagiIndent(mentah);
  if (!isi) return null;
  const dalam = level + (levelLuar || 0);

  /* Teks polos (paling sering): seluruh mekanik tempel berlaku. */
  if (jenis === 'p' && !adaMarkup(html0)) {
    const b = barisMekanik(mentah);
    if (dalam > 0) b.pad = padUntuk(b.cls, dalam);
    return b;
  }

  /* Ber-markup: format inline dipertahankan, tapi penanda mekanik di
     depan tetap diakui — "**1.** a" tidak boleh jadi paragraf biasa. */
  if (jenis === 'p') {
    const p = polaBaris(isi);
    if (!p) return { cls: 'b-p', html: html0.trim() };
    /* html0 di-trim: spasi/&nbsp; di depan sudah tidak ada lagi di sana,
       jadi jangan ikut dihitung sebagai karakter yang dipotong. */
    const spasiAwal = mentah.length - mentah.replace(/^[ \t\u00a0]+/, '').length;
    const buang = Math.max(0, panjang + p.panjang - spasiAwal);
    const b = { cls: p.cls, html: p.cls === 'b-div' ? ''
      : potongTeksAwal(html0.trim(), buang).trim(),
      asli: html0.trim() };
    if (p.attr) b.attr = p.attr;
    if (p.cls === 'b-todo') b.dicek = !!p.dicek;
    if (dalam > 0) b.pad = padUntuk(p.cls, dalam);
    return b;
  }

  /* Jenis sudah ditentukan struktur HTML-nya: daftar, heading, kutipan,
     atau to-do (kotak centang dari halaman/aplikasi lain). */
  const b = { cls: CLS_JENIS[jenis] || 'b-p', html: html0.trim() };
  if (jenis === 'todo' && dicek) b.dicek = true;
  if (dalam > 0) b.pad = padUntuk(b.cls, dalam);
  return b;
}

/* Telusuri DOM clipboard; tiap batas baris menutup satu potongan.
   `bungkus` = elemen inline yang isinya ikut baris ini (mis. <a> yang
   di dalamnya ada <br>) supaya format/tautannya tidak hilang. */
function pecahBaris(induk, keluar, opsi) {
  const bungkus = opsi.bungkus || [];
  const jenis = opsi.jenis || 'p';
  let kini = [];

  const bungkusNodes = nodes => {
    let out = nodes;
    for (let i = bungkus.length - 1; i >= 0; i--) {
      const w = bungkus[i].cloneNode(false);
      for (const n of out) w.appendChild(n);
      out = [w];
    }
    return out;
  };
  /* olehBr = potongan ini ditutup oleh <br>: baris kosong dari dua <br>
     beruntun harus tetap ada, sedangkan potongan hampa di ujung blok
     (mis. <div>a<br></div>) cuma artefak — jangan jadi blok kosong. */
  const tutup = olehBr => {
    const nodes = kini; kini = [];
    if (!nodes.length) { if (olehBr) keluar.push({ kosong: true }); return; }
    const b = jadikanSegmen(bungkusNodes(nodes), jenis, opsi.dicek, opsi.level);
    if (b) keluar.push(b);
    else if (olehBr) keluar.push({ kosong: true });
  };

  for (const anak of Array.from(induk.childNodes)) {
    if (anak.nodeType === 3) { kini.push(anak); continue; }
    if (anak.nodeType !== 1) continue;
    const tag = anak.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' ||
        tag === 'IFRAME' || tag === 'OBJECT' || tag === 'EMBED') continue;

    if (tag === 'BR') { tutup(true); continue; }
    if (tag === 'HR') { tutup(false); keluar.push({ cls: 'b-div', html: '' }); continue; }

    const khusus = JENIS_KHUSUS[tag];
    if (khusus === 'code') {                        /* <pre>: satu blok kode */
      tutup(false);
      keluar.push({ cls: 'b-code', html: escHtml(anak.textContent || '') });
      continue;
    }
    if (tag === 'UL' || tag === 'OL' || tag === 'MENU' || tag === 'DIR') {
      tutup(false);
      /* Daftar yang bersarang di dalam butir = satu langkah indentasi,
         sama seperti tombol indent di editor. */
      const level = (opsi.level || 0) + (opsi.dalamLi ? 1 : 0);
      const anakJenis = tag === 'OL' ? 'ol' : 'li';
      for (const li of Array.from(anak.children)) {
        if (li.tagName === 'LI')
          pecahBaris(li, keluar, { jenis: anakJenis, bungkus, level, dalamLi: true });
        else pecahBaris(li, keluar, { jenis, bungkus, level, dalamLi: opsi.dalamLi });
      }
      continue;
    }
    if (khusus) {                                   /* heading & kutipan */
      tutup(false);
      pecahBaris(anak, keluar, { jenis: khusus, bungkus, level: opsi.level, dalamLi: opsi.dalamLi });
      continue;
    }
    if (JENIS_BLOK.has(tag)) {
      tutup(false);
      /* Kotak centang di awal blok → to-do Hara, bukan teks "☐". */
      const kotak = anak.firstElementChild &&
        anak.firstElementChild.tagName === 'INPUT' &&
        /checkbox/i.test(anak.firstElementChild.getAttribute('type') || '')
        ? anak.firstElementChild : null;
      pecahBaris(anak, keluar, {
        jenis: kotak ? 'todo' : jenis,
        dicek: kotak ? (kotak.hasAttribute('checked') || kotak.checked === true) : false,
        bungkus, level: opsi.level, dalamLi: opsi.dalamLi,
      });
      continue;
    }

    /* Inline: kalau di dalamnya ada batas baris, telusuri — dengan
       pembungkus supaya tebal/miring/tautan tidak hilang. Kalau tidak,
       elemen ini bagian dari baris yang sedang berjalan. */
    if (anak.querySelector && anak.querySelector(ADA_BATAS_DI_DALAM)) {
      tutup(false);
      const tumpuk = (INLINE_AMAN[tag] || tag === 'A') ? bungkus.concat([anak]) : bungkus;
      pecahBaris(anak, keluar, { jenis, dicek: opsi.dicek, bungkus: tumpuk,
        level: opsi.level, dalamLi: opsi.dalamLi });
      continue;
    }
    kini.push(anak);
  }
  tutup(false);
}

/* Pecah HTML clipboard jadi daftar { cls, html }.
   Elemen blok dan <br> jadi baris tersendiri; sisanya digabung sebagai
   satu paragraf. */
export function htmlKeBaris(html) {
  if (typeof document === 'undefined') return [];
  const wadah = document.createElement('div');
  /* innerHTML pada elemen lepas TIDAK mengeksekusi <script> maupun
     memuat sumber daya, jadi aman sebagai tahap parsing. */
  wadah.innerHTML = html;

  const keluar = [];
  pecahBaris(wadah, keluar, { jenis: 'p' });

  /* Baris kosong di ujung dibuang, yang di tengah (dua <br> beruntun)
     tetap ada — sama dengan perlakuan teks polos. */
  while (keluar.length && keluar[0].kosong) keluar.shift();
  while (keluar.length && keluar[keluar.length - 1].kosong) keluar.pop();
  return keluar.map(b => b.kosong ? { cls: 'b-p', html: '' } : b);
}

/* Teks polos → daftar baris: tiap baris lewat mekanik Hara
   (tempel-mekanik.js) — daftar bernomor, butir, to-do, heading,
   kutipan, pembatas, pagar kode, tautan, dan format inline. */
export { teksKeBaris };

/* Teks polos APA ADANYA — dipakai saat menempel ke dalam blok kode:
   markdown, tautan, dan daftar tidak boleh diubah di sana. */
export function polosKeBaris(teks) {
  return String(teks == null ? '' : teks)
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(b => ({ cls: 'b-p', html: escHtml(b) }));
}

/* ── Sisipkan hasil paste ──
   `baris` = [{cls, html}]. Mengembalikan true kalau berhasil. */
export function sisipBaris(baris, { kodeMentah = false } = {}) {
  const d = docEl();
  if (!d || !baris.length) return false;
  const s = sel();
  if (!(s && s.rangeCount)) return false;

  let r = s.getRangeAt(0);
  if (!d.contains(r.startContainer)) return false;

  /* Karet dikendalikan sendiri: DOM di bawahnya berubah (blok bisa
     berganti elemen, mis. div → h1) dan seleksi browser bisa berpindah
     jangkar saat itu. Text node karet disimpan, lalu dipasang ulang
     tepat sebelum menyisipkan. */
  const karet = { node: r.startContainer, off: r.startOffset };
  const pasangKaret = () => {
    if (!karet || karet.node.nodeType !== 3 || !karet.node.isConnected) return;
    const nr = document.createRange();
    nr.setStart(karet.node, Math.min(karet.off, karet.node.length));
    nr.collapse(true);
    s.removeAllRanges(); s.addRange(nr);
  };

  /* seleksi aktif ikut tergantikan */
  if (!r.collapsed) r.deleteContents();
  r = s.getRangeAt(0);

  let blok = curBlock();
  if (!blok) return false;
  blok = nearestEditable(blok);
  if (!blok) return false;

  /* Karet bisa berjangkar di dalam ELEMEN yang contenteditable=false —
     gagang seret atau kotak centang to-do, mis. setelah layar digambar
     ulang pada blok kosong. Kalau dibiarkan, teks tempelan mendarat di
     dalam tombol itu dan ikut terbuang saat blok dibaca kembali.
     Pindahkan karet ke text node tepat sesudah tombolnya. */
  if (r.startContainer.nodeType === 1 &&
      r.startContainer.closest && r.startContainer.closest('[contenteditable="false"]')) {
    const tombol = r.startContainer.closest('[contenteditable="false"]');
    const jangkar = document.createTextNode('');
    tombol.after(jangkar);
    const nr = document.createRange();
    nr.setStart(jangkar, 0); nr.collapse(true);
    s.removeAllRanges(); s.addRange(nr);
    r = nr;
  }

  /* Di dalam blok kode, paste SELALU teks biasa — newline jadi baris
     dalam blok yang sama, bukan blok baru. */
  if (kodeMentah || blok.classList.contains('b-code')) {
    const teks = baris.map(b => b.html.replace(/<[^>]*>/g, '')).join('\n');
    sisipTeksDiCaret(teks);
    return true;
  }

  const kosong = teksKosong(blok);
  const clsAwal = baris[0].cls;
  const berjenis = !!(clsAwal && clsAwal !== 'b-p');   /* mis. "1. a", "# Judul" */

  /* ── satu baris ──
     Baris berjenis yang mendarat di blok KOSONG langsung memakai jenis
     itu (sama seperti mengetik "1. " di awal baris). Kalau blok aktif
     sudah berisi tulisan, penandanya JANGAN dibuang — teksnya disisipkan
     apa adanya ("1. bukan daftar"), karena memaksa jenis blok di tengah
     kalimat akan memotong kalimat yang sudah ada. */
  if (baris.length === 1) {
    if (berjenis && !kosong) {
      sisipHtmlDiCaret(baris[0].asli || baris[0].html);
      return true;
    }
    if (berjenis) {
      BLOK_KELAS.forEach(c => blok.classList.remove(c));
      blok.classList.add(clsAwal);
      lengkapiBlok(blok, baris[0]);
      blok = samakanElemen(blok, clsAwal);
      pasangKaret();
    }
    sisipHtmlDiCaret(baris[0].html);
    return true;
  }

  /* ── banyak baris ──
     Baris pertama menyambung teks di blok aktif (blok ini MEMPERTAHANKAN
     id-nya); sisanya jadi blok baru sesudahnya. KECUALI kalau baris
     pertama punya jenis sendiri dan blok aktif sudah berisi tulisan:
     kalimat yang ada tidak boleh ditelan jadi bagian item pertama
     ("...kalimat" + "1. Halo / 2. Dunia" → kalimat utuh, daftarnya di
     bawahnya, nomornya tetap berderet satu-dua-tiga). */
  if (berjenis && !kosong) {
    let ujung = blok;
    for (let i = 0; i < baris.length; i++) ujung = tambahBlok(ujung, baris[i]);
    caretEnd(ujung);
    return true;
  }

  const ekor = ambilEkorBlok(blok, r);       /* teks setelah caret */

  /* Blok aktif kosong: pakai jenis baris pertama, jangan paksa jadi
     paragraf. Blok aktif tetap memakai id lamanya. */
  if (kosong && berjenis) {
    BLOK_KELAS.forEach(c => blok.classList.remove(c));
    blok.classList.add(clsAwal);
    lengkapiBlok(blok, baris[0]);
    blok = samakanElemen(blok, clsAwal);
  }
  pasangKaret();
  sisipHtmlDiCaret(baris[0].html);

  let acuan = blok;
  for (let i = 1; i < baris.length; i++) acuan = tambahBlok(acuan, baris[i]);

  /* kembalikan ekor ke akhir blok terakhir, lalu taruh caret sebelum ekor */
  const akhir = acuan;
  caretEnd(akhir);
  if (ekor) {
    const s2 = sel();
    const r2 = s2.getRangeAt(0);
    const frag = document.createRange().createContextualFragment(ekor);
    const tanda = document.createTextNode('');
    r2.insertNode(tanda);
    tanda.after(frag);
    const r3 = document.createRange();
    r3.setStart(tanda, 0); r3.collapse(true);
    s2.removeAllRanges(); s2.addRange(r3);
  }
  return true;
}

/* Heading memakai elemen <h1>/<h2>/<h3> sungguhan (semantik & CSS-nya
   mengandalkan tag), sedangkan jenis lain memakai <div>. Blok pertama
   hasil tempelan memakai ulang elemen yang sudah ada — jadi elemennya
   ikut diganti seperti yang dilakukan setBlock() saat mengetik.
   Semua atribut disalin supaya data-bid (id blok) tetap sama. */
function samakanElemen(el, cls) {
  const tagHeading = { 'b-h1': 'h1', 'b-h2': 'h2', 'b-h3': 'h3' }[cls];
  const sekarang = el.tagName.toLowerCase();
  const headingSekarang = sekarang === 'h1' || sekarang === 'h2' || sekarang === 'h3';
  if (tagHeading && sekarang !== tagHeading) return tukarElemen(el, tagHeading);
  if (!tagHeading && headingSekarang) return tukarElemen(el, 'div');
  return el;
}

function tukarElemen(el, tag) {
  const baru = document.createElement(tag);
  for (const at of Array.from(el.attributes)) baru.setAttribute(at.name, at.value);
  while (el.firstChild) baru.appendChild(el.firstChild);
  el.replaceWith(baru);
  return baru;
}

/* Sisa yang tidak dibawa classList: padding indentasi, atribut jenis
   (data-cal callout), dan kotak centang to-do. Dipakai untuk blok
   pertama maupun blok lanjutan, jadi hasil tempelan selalu berbentuk
   blok yang sama dengan hasil mekanik saat mengetik. */
function lengkapiBlok(el, baris) {
  if (!el || !baris) return;
  if (baris.pad) el.style.paddingLeft = baris.pad + 'px';
  if (baris.attr) for (const k of Object.keys(baris.attr)) el.setAttribute(k, baris.attr[k]);
  if (baris.cls === 'b-div') el.contentEditable = 'false';
  if (baris.cls === 'b-todo') {
    if (baris.dicek) el.classList.add('done');
    if (!el.querySelector(':scope > .cbx')) {
      const box = document.createElement('button');
      box.className = 'cbx' + (baris.dicek ? ' on' : '');
      box.contentEditable = 'false';
      box.type = 'button';
      box.setAttribute('role', 'checkbox');
      box.setAttribute('aria-checked', baris.dicek ? 'true' : 'false');
      box.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 12l5 5L20 6"/></svg>';
      el.insertBefore(box, el.firstChild);
    }
  }
}

/* Blok yang isinya cuma sisa-sisa tak terlihat (karet, spasi, &nbsp;). */
function teksKosong(el) {
  return (el && el.textContent || '').replace(/[\u200b\u00a0\s]/g, '') === '';
}

/* Blok baru sesudah `acuan` — tanpa data-bid: id-nya didapat sendiri
   lewat pastikanBlockId() saat disimpan. */
function tambahBlok(acuan, b) {
  const el = document.createElement('div');
  el.className = b.cls || 'b-p';
  el.innerHTML = b.html || '';
  lengkapiBlok(el, b);
  acuan.after(el);
  return el;
}

/* Potong isi blok setelah caret, kembalikan HTML-nya. */
function ambilEkorBlok(blok, r) {
  const sisa = document.createRange();
  sisa.selectNodeContents(blok);
  try { sisa.setStart(r.startContainer, r.startOffset); }
  catch (e) { return ''; }
  /* Tidak ada isi setelah karet: JANGAN dipotong. extractContents() pada
     text node kosong akan melepas node itu dari blok — dan node itulah
     tempat karet berada, sehingga sisipan berikutnya mendarat di luar
     blok (mis. teks muncul sebelum <h1> yang baru dibentuk). */
  const uji = sisa.cloneContents();
  const adaIsi = (uji.textContent || '') !== '' ||
    !!(uji.querySelector && uji.querySelector('img,[data-blob],br'));
  if (!adaIsi) return '';
  const frag = sisa.extractContents();
  const tmp = document.createElement('div');
  tmp.appendChild(frag);
  return tmp.innerHTML;
}

/* Sisip HTML inline tepat di caret, caret berakhir SESUDAH sisipan. */
export function sisipHtmlDiCaret(html) {
  const s = sel();
  if (!(s && s.rangeCount)) return;
  const r = s.getRangeAt(0);
  const frag = document.createRange().createContextualFragment(html);
  const akhirNode = frag.lastChild;
  r.insertNode(frag);
  if (akhirNode) {
    const nr = document.createRange();
    if (akhirNode.nodeType === 3) nr.setStart(akhirNode, akhirNode.length);
    else nr.setStartAfter(akhirNode);
    nr.collapse(true);
    s.removeAllRanges(); s.addRange(nr);
  }
}

/* Sisip teks polos (boleh mengandung newline) di caret. */
export function sisipTeksDiCaret(teks) {
  const s = sel();
  if (!(s && s.rangeCount)) return;
  const r = s.getRangeAt(0);
  const t = document.createTextNode(teks);
  r.insertNode(t);
  const nr = document.createRange();
  nr.setStart(t, t.length); nr.collapse(true);
  s.removeAllRanges(); s.addRange(nr);
}

/* Ambil berkas gambar pertama dari clipboard, kalau ada.
   Menyalin gambar dari peramban/aplikasi lain menaruhnya di `items`
   sebagai File, bukan sebagai teks. */
function ambilGambar(cd) {
  try {
    const item = cd.items;
    if (item) {
      for (const it of Array.from(item)) {
        if (it.kind === 'file' && /^image\//.test(it.type || '')) {
          const f = it.getAsFile && it.getAsFile();
          if (f) return f;
        }
      }
    }
    const files = cd.files;
    if (files && files.length) {
      for (const f of Array.from(files)) {
        if (/^image\//.test(f.type || '')) return f;
      }
    }
  } catch (err) { /* clipboard aneh: abaikan, lanjut ke teks */ }
  return null;
}

/* ── Titik masuk: dipanggil dari handler paste ── */
export function tanganiPaste(e) {
  const d = docEl();
  if (!d) return false;
  const cd = e.clipboardData || (typeof window !== 'undefined' && window.clipboardData);
  if (!cd) return false;

  /* ── Gambar di clipboard ──
     Ditangani lebih dulu: berkasnya masuk IndexedDB lewat jalur gambar
     yang sudah ada, jadi catatan tetap ringan dan tidak menyimpan base64. */
  const berkas = ambilGambar(cd);
  if (berkas) { sisipGambar(berkas); return true; }

  let html = '', teks = '';
  try { html = cd.getData('text/html') || ''; } catch (err) {}
  try { teks = cd.getData('text/plain') || ''; } catch (err) {}
  if (!html && !teks) return false;

  const blok = curBlock();
  const diKode = !!(blok && blok.classList.contains('b-code'));

  let baris = [];
  if (html && !diKode) {
    try { baris = htmlKeBaris(html); }
    catch (err) { baris = []; }          /* parsing gagal -> jatuh ke teks */
  }
  /* Tidak ada HTML (atau parsingnya gagal): teks polos dari luar —
     daftar bernomor, butir, heading, tautan — ikut mekanik Hara. */
  if (!baris.length) {
    const mentah = teks || html.replace(/<[^>]*>/g, '');
    /* di dalam blok kode: apa adanya — daftar & tautan tidak diubah */
    baris = diKode ? polosKeBaris(mentah) : teksKeBaris(mentah);
  }

  /* Buang baris HAMPA di ujung agar tidak menambah blok kosong.
     Pembatas (b-div) isinya memang kosong tapi bukan baris hampa — harus
     ikut tersisip, kalau tidak "---" di akhir tempelan hilang. */
  const hampa = b => (!b.cls || b.cls === 'b-p') && !String(b.html || '').trim();
  while (baris.length > 1 && hampa(baris[baris.length - 1])) baris.pop();
  while (baris.length > 1 && hampa(baris[0])) baris.shift();
  if (!baris.length) return false;

  return sisipBaris(baris, { kodeMentah: diKode });
}
