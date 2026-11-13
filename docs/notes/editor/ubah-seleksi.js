/* Ubah beberapa blok terpilih dengan pratinjau. Hanya blok teks biasa yang
   dikenal editor yang boleh diubah; blok khusus/lampiran membatalkan operasi. */
import { docEl, sel, caretEnd } from './caret.js?v=20261105210000';
import { openPop, closeAll } from '../menus/pop.js?v=20261105210000';
import { kartuBuatMenu } from '../kartu.js?v=20261105210000';
import { blockToHtml, newBlockId } from '../note-model.js?v=20261105210000';
import { renumber } from './blocks.js?v=20261105210000';
import { refresh } from './cleanup.js?v=20261105210000';
import { snap } from './history.js?v=20261105210000';
import { esc } from '../../core/dom.js?v=20261105210000';
import { t as tr } from '../../core/i18n.js?v=20261105210000';

const JENIS = ['b-p','b-h1','b-h2','b-h3','b-li','b-ol','b-todo','b-quote','b-cal'];
const LABEL = {
  bullet: 'Daftar berpoin', ordered: 'Daftar bernomor', todo: 'Checklist',
  quote: 'Kutipan', callout: 'Callout info', table: 'Tabel dari baris bertab/pipa', card: 'Kartu belajar',
};
let blokDipilih = [];
let teksTerpilih = '';
let rentangDipilih = null;

function blokLangsung(node, d) {
  let n = node;
  if (n && n.nodeType === 3) n = n.parentNode;
  while (n && n.parentNode !== d) n = n.parentNode;
  return n && n.parentNode === d ? n : null;
}

export function blokDariRentang(range, d = docEl()) {
  if (!d || !range || range.collapsed || !d.contains(range.startContainer) || !d.contains(range.endContainer)) return null;
  const a = blokLangsung(range.startContainer, d), z = blokLangsung(range.endContainer, d);
  if (!a || !z) return null;
  const anak = Array.from(d.children), i = anak.indexOf(a), j = anak.indexOf(z);
  if (i < 0 || j < i) return null;
  const blok = anak.slice(i, j + 1);
  if (!blok.length || blok.some(b => !JENIS.some(c => b.classList.contains(c)))) return null;
  const teks = range.toString().replace(/[\u200b\u00a0]/g, '').trim();
  if (!teks) return null;
  return { blok, teks };
}

function tabelDari(blok) {
  if (!blok || blok.length < 2) return null;
  const rows = blok.map(b => {
    const t = b.cloneNode(true);
    t.querySelectorAll('[contenteditable="false"]').forEach(x => x.remove());
    return t.textContent.trim();
  });
  if (rows.some(x => !x)) return null;
  const pipa = rows.some(x => x.includes('|'));
  if (!pipa && !rows.some(x => x.includes('\t'))) return null;
  let hasil = rows.map(x => {
    let cells = pipa ? x.split('|').map(c => c.trim()) : x.split('\t').map(c => c.trim());
    if (pipa && cells[0] === '') cells.shift();
    if (pipa && cells[cells.length - 1] === '') cells.pop();
    return cells;
  });
  /* Terima tabel Markdown sederhana juga: baris penanda kolom bukan data. */
  hasil = hasil.filter(r => !r.length || !r.every(c => /^:?-{3,}:?$/u.test(c)));
  const kolom = hasil[0]?.length || 0;
  if (hasil.length < 2 || kolom < 2 || kolom > 6 || hasil.some(r => r.length !== kolom)) return null;
  return hasil;
}

function daftarJenis(blok) {
  const isi = [
    ['bullet', 'Daftar berpoin'], ['ordered', 'Daftar bernomor'],
    ['todo', 'Checklist'], ['quote', 'Kutipan'], ['callout', 'Callout info'],
  ];
  if (tabelDari(blok)) isi.push(['table', 'Tabel dari baris bertab/pipa']);
  isi.push(['card', 'Kartu belajar']);
  return isi;
}

export function bukaMenuUbah(range, anchor = null) {
  const pilihan = blokDariRentang(range);
  if (!pilihan) return false;
  blokDipilih = pilihan.blok;
  teksTerpilih = pilihan.teks;
  rentangDipilih = range.cloneRange();
  const items = daftarJenis(blokDipilih);
  openPop(`<div class="pop-h">${tr('Ubah struktur teks')}</div>
    <p class="pop-note">${tr('{n} blok akan diproses. Tinjau dulu sebelum diterapkan.', { n: blokDipilih.length })}</p>
    ${items.map(([id, nama]) => `<button type="button" class="pop-i" data-ubah-jenis="${id}">${esc(tr(nama))}</button>`).join('')}`,
    anchor && anchor.isConnected ? anchor : null);
  return true;
}

function potongan(blok) {
  return blok.slice(0, 4).map((b, i) => {
    const salin = b.cloneNode(true);
    salin.querySelectorAll('[contenteditable="false"]').forEach(x => x.remove());
    return `<li>${esc((salin.textContent || '').trim().slice(0, 140) || tr('Baris kosong'))}</li>`;
  }).join('') + (blok.length > 4 ? `<li>${tr('dan {n} blok lain', { n: blok.length - 4 })}</li>` : '');
}

function pratinjau(jenis) {
  const label = tr(LABEL[jenis] || 'Ubah struktur teks');
  return `<div class="pop-h">${tr('Pratinjau perubahan')}</div>
    <p class="pop-note">${tr('Ubah {n} blok menjadi {jenis}? Isi dan urutannya dipertahankan.', { n: blokDipilih.length, jenis: label })}</p>
    <ul class="pop-note" style="padding-left:28px;max-height:150px;overflow:auto">${potongan(blokDipilih)}</ul>
    <div style="display:flex;justify-content:flex-end;gap:8px;padding:10px">
      <button type="button" class="btn btn-sec" data-ubah-batal>${tr('Batal')}</button>
      <button type="button" class="btn btn-pri" data-ubah-terapkan="${jenis}">${tr('Terapkan')}</button></div>`;
}

function tampilkanKartu(range) {
  const s = sel();
  if (!s || !s.rangeCount) return;
  s.removeAllRanges(); s.addRange(range.cloneRange());
  openPop(kartuBuatMenu(), null);
}

function pasangCaret(blok, sesudah = false) {
  if (!blok) return;
  if (!sesudah) { caretEnd(blok); return; }
  const berikut = blok.nextElementSibling;
  if (berikut && !berikut.matches('.b-div,.b-img,.b-table,.b-audio,.b-math,.b-file,.b-toggle,.b-bmk')) {
    caretEnd(berikut);
    return;
  }
  const p = document.createElement('div');
  p.className = 'b-p'; p.setAttribute('data-bid', newBlockId());
  blok.after(p); caretEnd(p);
}

function terapkan(jenis) {
  const d = docEl();
  if (!d || !blokDipilih.length || blokDipilih.some(b => !b.isConnected || !d.contains(b))) return false;
  const semua = Array.from(d.children);
  const indeks = blokDipilih.map(b => semua.indexOf(b));
  if (indeks.some(i => i < 0) || indeks.some((x,i) => i && x !== indeks[i-1] + 1)) return false;
  snap();
  if (jenis === 'table') {
    const rows = tabelDari(blokDipilih);
    if (!rows) return false;
    const pertama = blokDipilih[0];
    const html = blockToHtml({ id: pertama.getAttribute('data-bid') || newBlockId(), type: 'table', content: '', meta: { rows } });
    const wadah = document.createElement('div'); wadah.innerHTML = html;
    const tabel = wadah.firstElementChild;
    pertama.before(tabel);
    blokDipilih.forEach(b => b.remove());
    pasangCaret(tabel, true);
    closeAll(); refresh();
    return true;
  }
  const kelas = { bullet: 'b-li', ordered: 'b-ol', todo: 'b-todo', quote: 'b-quote', callout: 'b-cal' }[jenis];
  if (!kelas) return false;
  const hasil = [];
  for (let i = 0; i < blokDipilih.length; i++) {
    let b = blokDipilih[i];
    if (/^H[1-3]$/.test(b.tagName)) {
      const div = document.createElement('div');
      Array.from(b.attributes).forEach(a => div.setAttribute(a.name, a.value));
      while (b.firstChild) div.appendChild(b.firstChild);
      b.replaceWith(div); b = div;
      blokDipilih[i] = b;
    }
    b.querySelector(':scope > .cbx')?.remove();
    JENIS.forEach(c => b.classList.remove(c));
    b.classList.add(kelas);
    b.classList.remove('done');
    b.removeAttribute('data-n');
    b.removeAttribute('data-cal'); b.removeAttribute('data-cal-label');
    if (kelas === 'b-todo') {
      const cb = document.createElement('button');
      cb.className = 'cbx'; cb.contentEditable = 'false'; cb.type = 'button';
      cb.setAttribute('role','checkbox'); cb.setAttribute('aria-checked','false');
      cb.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 12l5 5L20 6"/></svg>';
      b.insertBefore(cb, b.firstChild);
    }
    if (kelas === 'b-cal') { b.dataset.cal = 'info'; b.dataset.calLabel = 'Info'; }
    b.removeAttribute('data-done'); b.removeAttribute('data-ulang');
    hasil.push(b);
  }
  blokDipilih = hasil;
  renumber();
  pasangCaret(blokDipilih[blokDipilih.length - 1]);
  closeAll(); refresh();
  return true;
}

export function tanganiKlikUbah(e) {
  const pilih = e.target.closest && e.target.closest('[data-ubah-jenis]');
  if (pilih) {
    e.preventDefault(); e.stopPropagation();
    const jenis = pilih.dataset.ubahJenis;
    if (jenis === 'card') {
      const range = rentangDipilih && docEl()?.contains(rentangDipilih.startContainer)
        ? rentangDipilih.cloneRange() : null;
      closeAll();
      if (range && range.toString().trim()) tampilkanKartu(range);
      else {
        /* form kartu memakai pilihan DOM; bila fokus menu mengambil seleksi,
           letakkan rentang teks tersimpan pada blok terpilih. */
        const b = blokDipilih[0];
        const n = b && Array.from(b.childNodes).find(x => x.nodeType === 3);
        if (n && teksTerpilih) {
          const r = document.createRange(); r.selectNodeContents(n);
          const s = sel(); s.removeAllRanges(); s.addRange(r);
          openPop(kartuBuatMenu(), null);
        }
      }
      return true;
    }
    openPop(pratinjau(jenis), null);
    return true;
  }
  if (e.target.closest && e.target.closest('[data-ubah-batal]')) {
    e.preventDefault(); closeAll(); blokDipilih = []; teksTerpilih = ''; rentangDipilih = null; return true;
  }
  const terapkanBtn = e.target.closest && e.target.closest('[data-ubah-terapkan]');
  if (terapkanBtn) {
    e.preventDefault();
    const jenis = terapkanBtn.dataset.ubahTerapkan;
    if (!terapkan(jenis)) closeAll();
    blokDipilih = []; teksTerpilih = ''; rentangDipilih = null;
    return true;
  }
  return false;
}
