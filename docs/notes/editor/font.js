/* Mengganti jenis huruf pada teks terpilih.

   Kenapa hanya daftar ini: browser cuma bisa memakai font yang benar-benar
   terpasang di perangkat, atau yang kita muat sendiri dari internet. Tidak
   ada cara menampilkan "semua font" — kalau font tidak ada, sistem diam-diam
   menggantinya dengan yang lain dan hasilnya tampak tidak berubah.

   Karena itu tiap pilihan memakai daftar cadangan berlapis: kalau font utama
   tidak ada, jatuh ke yang mirip, terakhir ke keluarga umum (sans/serif/mono).
   Tiga font pertama dimuat dari Google Fonts, jadi pasti tampil di perangkat
   mana pun selama ada internet. */

import { docEl, sel, curBlock } from './caret.js?v=20260906152703';
import { refresh } from './cleanup.js?v=20260906152703';

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

/* ── Apakah font benar-benar ada di perangkat? ──
   Android hanya membawa Roboto dan Noto; Arial, Georgia, Verdana, dan
   kawan-kawan umumnya TIDAK ada di sana. Kalau font tidak tersedia,
   sistem diam-diam memakai font lain — tombolnya tampak tidak berfungsi.

   Caranya: ukur lebar teks memakai font uji, lalu bandingkan dengan lebar
   saat memakai font yang diminta dengan cadangan font uji yang sama.
   Kalau lebarnya berbeda, berarti font yang diminta benar-benar dipakai. */
const UJI = ['monospace', 'serif', 'sans-serif'];
const CONTOH = 'mmmmmmmmmmlliWWWWWWWW0123456789';
let kanvas = null;

function lebar(stack) {
  if (!kanvas) {
    const c = document.createElement('canvas');
    kanvas = c.getContext && c.getContext('2d');
  }
  if (!kanvas) return null;
  kanvas.font = '72px ' + stack;
  return kanvas.measureText(CONTOH).width;
}

const cacheAda = new Map();

export function fontTersedia(namaUtama) {
  if (!namaUtama) return true;
  if (cacheAda.has(namaUtama)) return cacheAda.get(namaUtama);
  let ada = false;
  try {
    /* pakai Font Loading API kalau tersedia — paling akurat */
    if (document.fonts && document.fonts.check) {
      if (document.fonts.check(`16px "${namaUtama}"`)) ada = true;
    }
    if (!ada) {
      for (const dasar of UJI) {
        const patokan = lebar(dasar);
        const coba = lebar(`"${namaUtama}",${dasar}`);
        if (patokan === null) { ada = true; break; }   /* tak bisa mengukur: anggap ada */
        if (Math.abs(coba - patokan) > 0.5) { ada = true; break; }
      }
    }
  } catch (e) { ada = true; }
  cacheAda.set(namaUtama, ada);
  return ada;
}

/* Nama font utama dari sebuah stack, tanpa tanda kutip. */
export const namaUtama = stack =>
  (stack || '').split(',')[0].replace(/['"]/g, '').trim();

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

/* Font yang menunggu dipakai untuk ketikan berikutnya.
   Diakses lewat fungsi, bukan variabel — nilai `let` yang diekspor tidak
   ikut terbarui di modul yang mengimpornya. */
let _pending = null;
export const fontPending = () => _pending;
export const bersihkanPending = () => { _pending = null; };

export function setFont(id) {
  const d = docEl();
  if (!d) return;
  const s = sel();
  if (!(s && s.rangeCount && d.contains(s.getRangeAt(0).startContainer))) return;
  const r = s.getRangeAt(0);

  /* ── Tanpa teks terpilih ──
     JANGAN mengubah teks yang sudah tertulis. Pilihan font hanya berlaku
     untuk yang diketik SETELAH ini, persis seperti tombol tebal/miring.
     Untuk mengubah teks lama, pengguna harus memblok teksnya dulu. */
  if (r.collapsed) {
    _pending = id || null;
    refresh();
    return;
  }

  /* ── Ada teks terpilih: ganti font pada bagian itu saja ── */
  _pending = null;
  /* Kalau seleksi persis mengisi sebuah span font, buka bungkusnya dulu —
     kalau tidak, span lama tetap tertinggal dan "Bawaan" tampak gagal. */
  const induk = fontAround(r.startContainer);
  if (induk && induk === fontAround(r.endContainer) &&
      induk.textContent === r.toString()) {
    const anak = Array.from(induk.childNodes), ind = induk.parentNode;
    anak.forEach(k => ind.insertBefore(k, induk));
    induk.remove();
    ind.normalize();
    if (anak.length) {
      const nr = document.createRange();
      nr.setStartBefore(anak[0]);
      nr.setEndAfter(anak[anak.length - 1]);
      s.removeAllRanges(); s.addRange(nr);
    }
    if (!id) { refresh(); return; }
    return setFont(id);
  }
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

/* Bungkus karakter yang baru diketik dengan font yang menunggu.
   Dipanggil dari handler beforeinput sebelum karakter disisipkan. */
export function bungkusFontPending() {
  if (!_pending) return null;
  const id = _pending;
  _pending = null;
  const s = sel();
  if (!(s && s.rangeCount)) return null;
  const r = s.getRangeAt(0);
  const el = document.createElement('span');
  el.className = 'fnt';
  el.setAttribute('data-font', id);
  const t = document.createTextNode('');
  el.appendChild(t);
  r.insertNode(el);
  const nr = document.createRange();
  nr.setStart(t, 0);
  nr.collapse(true);
  s.removeAllRanges();
  s.addRange(nr);
  return el;
}

function taruhCaretAkhir(b) {
  const r = document.createRange();
  r.selectNodeContents(b);
  r.collapse(false);
  const s = sel();
  s.removeAllRanges();
  s.addRange(r);
}

/* Pindah blok membatalkan font yang menunggu — sama seperti tebal/miring. */
let blokTerakhir = null;
document.addEventListener('selectionchange', () => {
  const b = curBlock();
  if (_pending && blokTerakhir && b !== blokTerakhir) _pending = null;
  blokTerakhir = b;
});
