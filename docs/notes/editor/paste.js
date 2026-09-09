/* ════════ PASTE ════════

   Clipboard TIDAK boleh masuk mentah ke editor. Alurnya:

     clipboard → bersihkan → potong jadi baris/blok → sisip → blocks[]

   Prinsip:
   • HTML clipboard disaring keras: hanya tag inline yang memang didukung
     sistem marks yang lolos. Script, event handler, style, dan atribut
     asing dibuang total.
   • Blok lama mempertahankan id; blok baru dapat id sendiri lewat
     pastikanBlockId() yang sudah ada.
   • Autosave & history memakai mekanisme yang sudah ada — tidak ada
     penyimpanan atau riwayat kedua.
*/

import { docEl, sel, curBlock, caretEnd, nearestEditable } from './caret.js?v=20260909063332';
import { sisipGambar } from './image.js?v=20260909063332';

/* Tag inline yang boleh bertahan — sama persis dengan yang dikenal marks.js.
   Selain ini, isinya dipertahankan tapi bungkusnya dibuang. */
const INLINE_AMAN = {
  B: 'b', STRONG: 'b', I: 'i', EM: 'i', U: 'u',
  S: 's', STRIKE: 's', DEL: 's', CODE: 'code',
};

/* Blok HTML yang dipetakan ke jenis blok kita. */
const BLOK_HTML = {
  H1: 'b-h1', H2: 'b-h2', H3: 'b-h3', H4: 'b-h3', H5: 'b-h3', H6: 'b-h3',
  BLOCKQUOTE: 'b-quote', PRE: 'b-code', LI: 'b-li', P: 'b-p', DIV: 'b-p',
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
      keluar += escHtml(anak.data);
      continue;
    }
    if (anak.nodeType !== 1) continue;               /* komentar dll: buang */
    const tag = anak.tagName;

    /* Buang total beserta isinya — sumber skrip & gaya. */
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' ||
        tag === 'IFRAME' || tag === 'OBJECT' || tag === 'EMBED') continue;

    if (tag === 'BR') { keluar += ' '; continue; }

    const aman = INLINE_AMAN[tag];
    const dalam = bersihkanInline(anak);
    if (!dalam) continue;

    if (aman === 'code') keluar += `<code class="ic">${dalam}</code>`;
    else if (aman) keluar += `<${aman}>${dalam}</${aman}>`;
    else keluar += dalam;        /* tag tak dikenal: isinya saja */
  }
  return keluar;
}

/* Pecah HTML clipboard jadi daftar { cls, html }.
   Elemen blok jadi baris tersendiri; sisanya digabung sebagai satu paragraf. */
export function htmlKeBaris(html) {
  if (typeof document === 'undefined') return [];
  const wadah = document.createElement('div');
  /* innerHTML pada elemen lepas TIDAK mengeksekusi <script> maupun
     memuat sumber daya, jadi aman sebagai tahap parsing. */
  wadah.innerHTML = html;

  const baris = [];
  let sisa = '';
  const dorongSisa = () => {
    const t = sisa.trim();
    if (t) baris.push({ cls: 'b-p', html: t });
    sisa = '';
  };

  const jelajah = induk => {
    for (const anak of Array.from(induk.childNodes)) {
      if (anak.nodeType === 3) { sisa += escHtml(anak.data); continue; }
      if (anak.nodeType !== 1) continue;
      const tag = anak.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') continue;

      if (tag === 'UL' || tag === 'OL' || tag === 'TABLE' || tag === 'TBODY' ||
          tag === 'TR' || tag === 'BODY' || tag === 'HTML' || tag === 'SECTION' ||
          tag === 'ARTICLE' || tag === 'MAIN') {
        dorongSisa();
        /* daftar bernomor: tandai agar LI-nya jadi b-ol */
        const angka = tag === 'OL';
        for (const li of Array.from(anak.children)) {
          if (li.tagName === 'LI') {
            const isi = bersihkanInline(li).trim();
            if (isi) baris.push({ cls: angka ? 'b-ol' : 'b-li', html: isi });
          } else jelajah(li);
        }
        continue;
      }

      if (tag === 'HR') { dorongSisa(); baris.push({ cls: 'b-div', html: '' }); continue; }

      const cls = BLOK_HTML[tag];
      if (cls && tag !== 'DIV') {
        dorongSisa();
        const isi = tag === 'PRE'
          ? escHtml(anak.textContent)          /* kode: apa adanya */
          : bersihkanInline(anak).trim();
        if (isi || tag === 'PRE') baris.push({ cls, html: isi });
        continue;
      }

      if (tag === 'DIV' || tag === 'P') {
        dorongSisa();
        const isi = bersihkanInline(anak).trim();
        if (isi) baris.push({ cls: 'b-p', html: isi });
        continue;
      }

      /* inline biasa */
      sisa += bersihkanInline(document.createRange().createContextualFragment
        ? bungkusSatu(anak) : anak);
    }
  };
  /* bungkus satu elemen inline agar bisa dilewatkan ke bersihkanInline */
  function bungkusSatu(el) {
    const tmp = document.createElement('div');
    tmp.appendChild(el.cloneNode(true));
    return tmp;
  }

  jelajah(wadah);
  dorongSisa();
  return baris;
}

/* Teks polos → daftar baris. Baris kosong beruntun dipadatkan. */
export function teksKeBaris(teks) {
  return String(teks || '')
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

  /* seleksi aktif ikut tergantikan */
  if (!r.collapsed) r.deleteContents();
  r = s.getRangeAt(0);

  let blok = curBlock();
  if (!blok) return false;
  blok = nearestEditable(blok);
  if (!blok) return false;

  /* Di dalam blok kode, paste SELALU teks biasa — newline jadi baris
     dalam blok yang sama, bukan blok baru. */
  if (kodeMentah || blok.classList.contains('b-code')) {
    const teks = baris.map(b => b.html.replace(/<[^>]*>/g, '')).join('\n');
    sisipTeksDiCaret(teks);
    return true;
  }

  /* ── satu baris: cukup sisipkan inline di posisi caret ── */
  if (baris.length === 1) {
    sisipHtmlDiCaret(baris[0].html);
    return true;
  }

  /* ── banyak baris ──
     Baris pertama menyambung teks di blok aktif (blok ini MEMPERTAHANKAN
     id-nya). Sisanya jadi blok baru sesudahnya — masing-masing dapat id
     baru lewat pastikanBlockId() saat disimpan. */
  const ekor = ambilEkorBlok(blok, r);       /* teks setelah caret */

  /* Kalau baris pertama punya jenis blok sendiri (heading, item daftar,
     dll) DAN blok aktif kosong, pakai jenis itu — jangan paksa jadi
     paragraf. Blok aktif tetap memakai id lamanya. */
  const kosong = (blok.textContent || '').replace(/[\u200b\u00a0\s]/g, '') === '';
  const clsAwal = baris[0].cls;
  let mulai = 0;
  if (kosong && clsAwal && clsAwal !== 'b-p') {
    BLOK_KELAS.forEach(c => blok.classList.remove(c));
    blok.classList.add(clsAwal);
    if (clsAwal === 'b-todo' && !blok.querySelector(':scope > .cbx')) {
      const box = document.createElement('button');
      box.className = 'cbx'; box.contentEditable = 'false';
      box.type = 'button'; box.setAttribute('role','checkbox'); box.setAttribute('aria-checked','false');
      box.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 12l5 5L20 6"/></svg>';
      blok.insertBefore(box, blok.firstChild);
    }
  }
  sisipHtmlDiCaret(baris[mulai].html);

  let acuan = blok;
  for (let i = 1; i < baris.length; i++) {
    const b = document.createElement('div');
    b.className = baris[i].cls || 'b-p';
    if (baris[i].cls === 'b-div') b.contentEditable = 'false';
    b.innerHTML = baris[i].html || '';
    /* JANGAN salin data-bid: blok baru wajib dapat id sendiri */
    acuan.after(b);
    acuan = b;
  }

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

/* Potong isi blok setelah caret, kembalikan HTML-nya. */
function ambilEkorBlok(blok, r) {
  const sisa = document.createRange();
  sisa.selectNodeContents(blok);
  try { sisa.setStart(r.startContainer, r.startOffset); }
  catch (e) { return ''; }
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
  if (!baris.length) baris = teksKeBaris(teks || html.replace(/<[^>]*>/g, ''));

  /* buang baris kosong di ujung agar tidak menambah blok hampa */
  while (baris.length > 1 && !baris[baris.length - 1].html.trim()) baris.pop();
  while (baris.length > 1 && !baris[0].html.trim()) baris.shift();
  if (!baris.length) return false;

  return sisipBaris(baris, { kodeMentah: diKode });
}
