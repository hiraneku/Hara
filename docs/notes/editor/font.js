/* Mengganti jenis huruf pada teks terpilih.

   Kenapa hanya daftar ini: browser cuma bisa memakai font yang benar-benar
   terpasang di perangkat, atau yang kita muat sendiri dari internet. Tidak
   ada cara menampilkan "semua font" — kalau font tidak ada, sistem diam-diam
   menggantinya dengan yang lain dan hasilnya tampak tidak berubah.

   Karena itu tiap pilihan memakai daftar cadangan berlapis: kalau font utama
   tidak ada, jatuh ke yang mirip, terakhir ke keluarga umum (sans/serif/mono).
   Tiga font pertama dimuat dari Google Fonts, jadi pasti tampil di perangkat
   mana pun selama ada internet. */

import { docEl, sel, curBlock } from './caret.js?v=20260909063332';
import { refresh } from './cleanup.js?v=20260909063332';

export const FONTS = [
  { grup:'dasar',  id: '',          nama: 'Bawaan',          stack: '',                                                   ket: 'Mengikuti tema aplikasi' },
  { grup:'dasar',  id: 'inter',     nama: 'Inter',           stack: "'Inter',system-ui,sans-serif",                       ket: 'Sans-serif · dimuat aplikasi' },
  { grup:'dasar',  id: 'serif-app', nama: 'Instrument Serif',stack: "'Instrument Serif',Georgia,serif",                   ket: 'Serif · dimuat aplikasi' },
  { grup:'dasar',  id: 'mono-app',  nama: 'JetBrains Mono',  stack: "'JetBrains Mono',ui-monospace,monospace",            ket: 'Monospace · dimuat aplikasi' },

  { grup:'sans',   id: 'arial',     nama: 'Arial',           stack: "Arial,Helvetica,'Liberation Sans',sans-serif",       ket: 'Sans-serif · hampir selalu ada' },
  { grup:'sans',   id: 'helvetica', nama: 'Helvetica',       stack: "Helvetica,Arial,'Nimbus Sans',sans-serif",           ket: 'Sans-serif · umum di Apple' },
  { grup:'sans',   id: 'verdana',   nama: 'Verdana',         stack: "Verdana,Geneva,'DejaVu Sans',sans-serif",            ket: 'Sans-serif · huruf lebar, mudah dibaca' },
  { grup:'sans',   id: 'tahoma',    nama: 'Tahoma',          stack: "Tahoma,Verdana,'DejaVu Sans',sans-serif",            ket: 'Sans-serif · lebih rapat dari Verdana' },
  { grup:'sans',   id: 'trebuchet', nama: 'Trebuchet MS',    stack: "'Trebuchet MS',Tahoma,sans-serif",                   ket: 'Sans-serif · sedikit membulat' },

  { grup:'serif',  id: 'georgia',   nama: 'Georgia',         stack: "Georgia,'Times New Roman',serif",                    ket: 'Serif · nyaman untuk teks panjang' },
  { grup:'serif',  id: 'times',     nama: 'Times New Roman', stack: "'Times New Roman',Times,'Liberation Serif',serif",   ket: 'Serif · gaya dokumen klasik' },
  { grup:'serif',  id: 'palatino',  nama: 'Palatino',        stack: "'Palatino Linotype','Book Antiqua',Palatino,serif",  ket: 'Serif · huruf agak lebar' },

  { grup:'mono',   id: 'courier',   nama: 'Courier New',     stack: "'Courier New',Courier,'Liberation Mono',monospace",  ket: 'Monospace · lebar tiap huruf sama' },
  { grup:'mono',   id: 'consolas',  nama: 'Consolas',        stack: "Consolas,'Andale Mono','DejaVu Sans Mono',monospace",ket: 'Monospace · rapat, umum untuk kode' },

  { grup:'gaya',   id: 'impact',    nama: 'Impact',          stack: "Impact,Haettenschweiler,'Arial Narrow Bold',sans-serif", ket: 'Tebal sempit · untuk judul' },
  { grup:'gaya',   id: 'comic',     nama: 'Comic Sans MS',   stack: "'Comic Sans MS','Comic Sans',cursive",               ket: 'Santai · gaya tulisan tangan' },
];

export const FONT_GRUP = [
  ['dasar', 'Bawaan aplikasi'],
  ['sans',  'Tanpa kait'],
  ['serif', 'Berkait'],
  ['mono',  'Lebar sama'],
  ['gaya',  'Bergaya'],
];

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
  /* Hanya hasil POSITIF yang di-cache. Hasil negatif sengaja TIDAK:
     font web (Google Fonts) bisa belum selesai dimuat saat pertama kali
     dicek — menandainya "tidak tersedia" selamanya membuat pilihan
     Inter/Instrument Serif/JetBrains Mono tak bisa dipilih sampai
     halaman dimuat ulang. */
  if (ada) cacheAda.set(namaUtama, true);
  return ada;
}

/* Sinyal saat font web selesai dimuat (atau gagal dimuat). Menu font
   yang dibuka terlalu dini akan disegarkan setelah ini, sehingga label
   "Tidak tersedia" yang prematur terkoreksi sendiri. */
let janjiSiap = null;
export function ketikaFontMuat() {
  if (typeof document === 'undefined' || !document.fonts || !document.fonts.ready)
    return Promise.resolve();
  if (!janjiSiap) {
    janjiSiap = document.fonts.ready.then(() => { cacheAda.clear(); });
  }
  return janjiSiap;
}

export const fontMasihMuat = () =>
  !!(typeof document !== 'undefined' && document.fonts && document.fonts.status &&
     document.fonts.status !== 'loaded');

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
  /* niat pengguna mengalahkan isi DOM — kalau tidak, menu menampilkan
     font LAMA sebagai terpilih padahal sudah diganti */
  if (_lekat) return _lekat;
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
const NONE = '\u0000none';        /* penanda "kembali ke bawaan" */
let _pending = null;
/* Seleksi ulang berdasarkan offset karakter di dalam satu induk, dipakai
   setelah normalize() menggabungkan text node. */
function pilihTeks(induk, dari, panjang) {
  const s = sel();
  if (!s || !panjang) return;
  let sisa = dari;
  const jalan = document.createTreeWalker(induk, 4, null);  /* SHOW_TEXT */
  let n;
  while ((n = jalan.nextNode())) {
    if (sisa <= n.data.length) break;
    sisa -= n.data.length;
  }
  if (!n) return;
  const r = document.createRange();
  r.setStart(n, sisa);
  r.setEnd(n, Math.min(n.data.length, sisa + panjang));
  s.removeAllRanges(); s.addRange(r);
}

/* Font yang sedang "dinyalakan" pengguna. Melekat lintas ketikan, persis
   seperti `sticky` pada marks. Tanpa ini, ketikan setelah karakter pertama
   bisa jatuh ke span font LAMA saat browser menarik caret ke sana. */
let _lekat = null;
export const fontLekat = () => _lekat;
/* Mode bawaan MELEKAT: bertahan lintas ketikan sampai dibatalkan.
   Tanpa ini, huruf ke-2 diserahkan ke browser yang menarik caret
   kembali ke dalam span font lama. */
let _modeBawaan = false;
export const fontPending = () => (_pending === NONE ? '' : _pending);
export const adaPendingNone = () => _pending === NONE;
export const modeBawaan = () => _modeBawaan;

/* Font perlu dibungkus untuk ketikan berikutnya?
   • ada font yang menunggu (atau "Bawaan" yang menunggu);
   • mode Bawaan menyala dan caret ada di dalam span font — dipecah keluar
     tiap karakter, karena browser menarik caret kembali masuk;
   • font lekat menyala tapi caret TIDAK di dalam span font yang cocok —
     termasuk saat semua teks barusan dihapus sampai span-nya ikut hilang:
     karakter berikutnya harus dibungkus lagi supaya font tidak mati
     dengan sendirinya. */
export function fontPerluBungkus() {
  if (_pending === NONE || _pending) return true;
  const s = sel();
  const host = (s && s.rangeCount)
    ? fontAround(s.getRangeAt(0).startContainer) : null;
  if (_modeBawaan) return !!host;
  if (!_lekat) return false;
  return !host || host.getAttribute('data-font') !== _lekat;
}

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
    if (id) { _pending = id; _lekat = id; _modeBawaan = false; refresh(); return; }

    /* ── "Bawaan" ──
       Caret sedang di dalam span font? Jangan cuma memindahkan caret ke
       luar — browser akan menariknya kembali masuk. Catat niatnya, lalu
       pecah keluar tepat saat huruf pertama diketik. */
    _lekat = null;
    if (fontAround(r.startContainer)) { _pending = NONE; _modeBawaan = true; }
    else { _pending = null; _modeBawaan = false; }
    refresh();
    return;
  }

  /* ── Ada teks terpilih: ganti font pada bagian itu saja ── */
  _pending = null; _lekat = null; _modeBawaan = false;
  /* Kalau seleksi persis mengisi sebuah span font, buka bungkusnya dulu —
     kalau tidak, span lama tetap tertinggal dan "Bawaan" tampak gagal. */
  const induk = fontAround(r.startContainer);
  if (induk && induk === fontAround(r.endContainer) &&
      induk.textContent === r.toString()) {
    const anak = Array.from(induk.childNodes), ind = induk.parentNode;
    /* simpan posisi KARAKTER dulu — normalize() menggabungkan text node
       sehingga referensi node lama menjadi yatim */
    const pra = document.createRange();
    pra.selectNodeContents(ind);
    pra.setEnd(induk, 0);
    const awal = pra.toString().length;
    const panjang = induk.textContent.length;
    anak.forEach(k => ind.insertBefore(k, induk));
    induk.remove();
    ind.normalize();
    if (panjang) pilihTeks(ind, awal, panjang);
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
/* Pecah keluar dari span font di posisi caret, lalu kembalikan titik
   sisip yang berada DI LUAR span. */
export function keluarDariFont() {
  const s = sel();
  if (!(s && s.rangeCount)) return false;
  if (!fontAround(s.getRangeAt(0).startContainer)) return false;

  /* Span font BISA BERSARANG. Keluar satu lapis saja membuat caret
     mendarat di span font LUAR — pengguna melihat "font sebelumnya"
     atau bahkan "sebelum-sebelumnya" dipakai lagi. Jadi keluar berulang
     sampai benar-benar tidak ada lagi span font yang membungkus. */
  let aman = 0;
  while (fontAround(sel().getRangeAt(0).startContainer) && aman++ < 12) {
    if (!keluarSatuLapis()) break;
  }
  return true;
}

/* Pecah keluar dari SATU span font di posisi caret. */
function keluarSatuLapis() {
  const s = sel();
  if (!(s && s.rangeCount)) return false;
  const r = s.getRangeAt(0);
  const host = fontAround(r.startContainer);
  if (!host) return false;

  /* pisahkan isi span jadi sebelum-caret dan sesudah-caret */
  const sisa = document.createRange();
  sisa.selectNodeContents(host);
  try { sisa.setStart(r.startContainer, r.startOffset); } catch (e) { return false; }
  const buntut = sisa.extractContents();

  /* Titik ketik: text node kosong SEGAR tepat sesudah host. Tidak boleh
     memakai text node yang sudah ada di sebelah kanan host — isinya milik
     teks lanjutan, dan caret di AKHIR node itu akan melompati teks
     (kasus: span font yang disusul teks polos). */
  const titik = document.createTextNode('');
  host.after(titik);
  if (buntut.textContent !== '') {
    /* sisa font tetap berfont dan tetap MENDAHULUI teks lanjutan,
       supaya urutan karakter tidak berubah: host, titik, kanan */
    const kanan = host.cloneNode(false);
    kanan.appendChild(buntut);
    titik.after(kanan);
  }
  const indukHost = host.parentNode;
  if (host.textContent === '') host.remove();

  const nr = document.createRange();
  nr.setStart(titik, 0);
  nr.collapse(true);
  s.removeAllRanges();
  s.addRange(nr);
  /* bersihkan induk yang jadi kosong akibat pemecahan */
  if (indukHost && indukHost.classList && indukHost.classList.contains('fnt') &&
      indukHost.textContent === '') indukHost.remove();
  return true;
}

export function bungkusFontPending() {
  /* niat "kembali ke bawaan": keluar dari span, tanpa membuat span baru */
  if (_pending === NONE) {
    _pending = null;
    keluarDariFont();
    return null;
  }
  /* Mode Bawaan MELEKAT: selama masih menyala, tiap karakter yang mendarat
     di dalam span font dipecah keluar (tanpa membuat span baru). */
  if (_modeBawaan && !_pending) { keluarDariFont(); return null; }
  /* Font lekat dipakai ulang saat caret sedang di luar span yang cocok —
     persis kasus "teks dihapus habis, fontnya jangan ikut hilang". */
  const id = _pending || (!_modeBawaan ? _lekat : '');
  if (!id) return null;
  _pending = null;
  const s = sel();
  if (!(s && s.rangeCount)) return null;
  let r = s.getRangeAt(0);

  /* Kursor sedang di dalam span font lain: keluar dulu, jangan bersarang.
     Span bersarang membuat DOM menumpuk dan menyulitkan pelepasan font. */
  const host = fontAround(r.startContainer);
  if (host && host.getAttribute('data-font') !== id) {
    keluarDariFont();
    if (!s.rangeCount) return null;
    r = s.getRangeAt(0);
  }

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

/* Pindah blok membatalkan font yang menunggu — sama seperti tebal/miring. */
let blokTerakhir = null;
document.addEventListener('selectionchange', () => {
  const b = curBlock();
  if (blokTerakhir && b !== blokTerakhir) { _pending = null; _lekat = null; _modeBawaan = false; }
  blokTerakhir = b;
});

/* Apakah caret berada di span font yang BUKAN font yang sedang dipilih?
   Kalau ya, ketikan berikutnya harus dipecah keluar dulu — kalau tidak,
   ia ikut font lama dan pilihan baru tampak "nyangkut". */
export function fontPerluKeluar() {
  if (!_lekat) return false;
  const s = sel();
  if (!(s && s.rangeCount)) return false;
  const host = fontAround(s.getRangeAt(0).startContainer);
  return !!(host && host.getAttribute('data-font') !== _lekat);
}
