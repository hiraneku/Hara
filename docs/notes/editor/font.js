/* Mengganti jenis huruf pada teks terpilih.

   Kenapa hanya daftar ini: browser cuma bisa memakai font yang benar-benar
   terpasang di perangkat, atau yang kita muat sendiri dari internet. Tidak
   ada cara menampilkan "semua font" — kalau font tidak ada, sistem diam-diam
   menggantinya dengan yang lain dan hasilnya tampak tidak berubah.

   Karena itu tiap pilihan memakai daftar cadangan berlapis: kalau font utama
   tidak ada, jatuh ke yang mirip, terakhir ke keluarga umum (sans/serif/mono).
   Tiga font pertama dimuat dari Google Fonts, jadi pasti tampil di perangkat
   mana pun selama ada internet. */

import { docEl, sel, curBlock } from './caret.js?v=20260906151809';
import { refresh } from './cleanup.js?v=20260906151809';

export const FONTS = [
  { id: '',          nama: 'Bawaan',          stack: '',                                                   ket: 'Mengikuti tema aplikasi' },
  { id: 'inter',     nama: 'Inter',           stack: "'Inter',system-ui,sans-serif",                       ket: 'Sans-serif · dimuat aplikasi' },
  { id: 'serif-app', nama: 'Instrument Serif',stack: "'Instrument Serif',Georgia,serif",                   ket: 'Serif · dimuat aplikasi' },
  { id: 'mono-app',  nama: 'JetBrains Mono',  stack: "'JetBrains Mono',ui-monospace,monospace",            ket: 'Monospace · dimuat aplikasi' },

  { id: 'arial',     nama: 'Arial',           stack: "Arial,Helvetica,'Liberation Sans',sans-serif",       ket: 'Sans-serif · hampir selalu ada' },
  { id: 'helvetica', nama: 'Helvetica',       stack: "Helvetica,Arial,'Nimbus Sans',sans-serif",           ket: 'Sans-serif · umum di Apple' },
  { id: 'verdana',   nama: 'Verdana',         stack: "Verdana,Geneva,'DejaVu Sans',sans-serif",            ket: 'Sans-serif · huruf lebar, mudah dibaca' },
  { id: 'tahoma',    nama: 'Tahoma',          stack: "Tahoma,Verdana,'DejaVu Sans',sans-serif",            ket: 'Sans-serif · lebih rapat dari Verdana' },
  { id: 'trebuchet', nama: 'Trebuchet MS',    stack: "'Trebuchet MS',Tahoma,sans-serif",                   ket: 'Sans-serif · sedikit membulat' },

  { id: 'georgia',   nama: 'Georgia',         stack: "Georgia,'Times New Roman',serif",                    ket: 'Serif · nyaman untuk teks panjang' },
  { id: 'times',     nama: 'Times New Roman', stack: "'Times New Roman',Times,'Liberation Serif',serif",   ket: 'Serif · gaya dokumen klasik' },
  { id: 'palatino',  nama: 'Palatino',        stack: "'Palatino Linotype','Book Antiqua',Palatino,serif",  ket: 'Serif · huruf agak lebar' },

  { id: 'courier',   nama: 'Courier New',     stack: "'Courier New',Courier,'Liberation Mono',monospace",  ket: 'Monospace · lebar tiap huruf sama' },
  { id: 'consolas',  nama: 'Consolas',        stack: "Consolas,'Andale Mono','DejaVu Sans Mono',monospace",ket: 'Monospace · rapat, umum untuk kode' },

  { id: 'impact',    nama: 'Impact',          stack: "Impact,Haettenschweiler,'Arial Narrow Bold',sans-serif", ket: 'Tebal sempit · untuk judul' },
  { id: 'comic',     nama: 'Comic Sans MS',   stack: "'Comic Sans MS','Comic Sans',cursive",               ket: 'Santai · gaya tulisan tangan' },
];

export const cariFont = id => FONTS.find(f => f.id === id);

/* Elemen font yang membungkus sebuah node. */
export function fontAround(node) {
  const d = docEl();
  let n = node;
  if (n && n.nodeType === 3) n = n.parentNode;
  while (n && n !== d) {
    if (n.matches && n.matches('span.fnt')) return n;
    n = n.parentNode;
  }
  return null;
}

/* Font yang sedang berlaku di posisi kursor. */
export function fontSekarang() {
  const d = docEl();
  if (!d) return '';
  const s = sel();
  if (!(s && s.rangeCount && d.contains(s.getRangeAt(0).startContainer))) return '';
  const el = fontAround(s.getRangeAt(0).startContainer);
  return el ? (el.getAttribute('data-font') || '') : '';
}

/* Buang bungkus font di dalam sebuah fragmen. */
function lepasDalam(frag) {
  if (!frag.querySelectorAll) return;
  Array.from(frag.querySelectorAll('span.fnt')).forEach(e => {
    while (e.firstChild) e.parentNode.insertBefore(e.firstChild, e);
    e.remove();
  });
}

export function setFont(id) {
  const d = docEl();
  if (!d) return;
  const s = sel();
  if (!(s && s.rangeCount && d.contains(s.getRangeAt(0).startContainer))) return;
  const r = s.getRangeAt(0);

  /* Tanpa teks terpilih: terapkan ke seluruh blok. Ini yang paling
     diharapkan di HP — memblok teks di layar sentuh itu merepotkan. */
  if (r.collapsed) {
    let b = curBlock();
    if (!b) return;
    Array.from(b.querySelectorAll('span.fnt')).forEach(e => {
      while (e.firstChild) e.parentNode.insertBefore(e.firstChild, e);
      e.remove();
    });
    b.normalize();
    if (id) {
      const el = document.createElement('span');
      el.className = 'fnt';
      el.setAttribute('data-font', id);
      /* pindahkan seluruh isi blok ke dalam span, checkbox tetap di luar */
      const cbx = b.querySelector(':scope > .cbx');
      Array.from(b.childNodes).forEach(n => { if (n !== cbx) el.appendChild(n); });
      b.appendChild(el);
    }
    taruhCaretAkhir(b);
    refresh();
    return;
  }

  /* Ada teks terpilih: ganti font hanya pada bagian itu. */
  const frag = r.extractContents();
  lepasDalam(frag);
  let node;
  if (id) {
    node = document.createElement('span');
    node.className = 'fnt';
    node.setAttribute('data-font', id);
    node.appendChild(frag);
  } else {
    node = frag;
  }
  const awal = node.nodeType === 11 ? node.firstChild : node;
  const akhir = node.nodeType === 11 ? node.lastChild : node;
  r.insertNode(node);
  if (awal && akhir) {
    const nr = document.createRange();
    nr.setStartBefore(awal);
    nr.setEndAfter(akhir);
    s.removeAllRanges();
    s.addRange(nr);
  }
  const b = curBlock();
  if (b) b.normalize();
  refresh();
}

function taruhCaretAkhir(b) {
  const r = document.createRange();
  r.selectNodeContents(b);
  r.collapse(false);
  const s = sel();
  s.removeAllRanges();
  s.addRange(r);
}
