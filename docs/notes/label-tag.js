/* Terapkan warna label ke tag #… di dalam editor (B10).

   Dipanggil setiap kali editor digambar ulang: setiap span .tg diberi
   data-tt (kunci palet) + variabel --lc. Tanpa ini tag di isi hanya
   hijau aksen.

   ATURAN di sini:
   • Warna BEKU saat tag sedang disunting (karet di dalamnya). Warna tag
     dihitung dari NAMANYA; kalau data-tt dihitung ulang tiap ketikan,
     menghapus/mengetik huruf di dalam tag membuat warnanya berganti-
     ganti tiap huruf. Saat karet berhenti di dalam tag, warna lama
     dipertahankan sampai karet keluar.
   • Teks yang MENYUSUP ke dalam span langsung dibereskan (bukan
     menunggu simpan): yang paling penting, spasi/tanda penutup yang
     mendarat DI DALAM tag (umum di keyboard Android/IME yang menyisip-
     kan lewat jalur komposisi) HARUS dikeluarkan. Kalau tidak, tag
     berubah jadi "#halo " + spasi di ujung baris tak terlihat (whitespace
     di ujung melipat) — terasa seperti "spasi tidak bisa diketik" — dan
     semua ketikan lanjutan ikut tertelan ke dalam tag.
     Karena itu span yang isinya bukan "#nama" murni DIPECAH: yang
     tinggal di dalam span hanya "#nama" (tag tetap tampil & terdeteksi),
     sisanya keluar menjadi teks biasa, dan karet ikut pindah ke posisi
     setelah sisa itu supaya ketikan lanjutan mendarat di teks biasa.
   • Selama IME masih mengompasisi (belum compositionend), DOM tidak
     diubah supaya komposisi tidak rusak; pembersihan menyusul begitu
     komposisi selesai. */

import { state } from '../core/store.js?v=20260910030412';
import { tandaUntukCatatan } from './label.js?v=20260910030412';
import { chipTag } from './label.js?v=20260910030412';
import { sel } from './editor/caret.js?v=20260910030412';

/* Nama tag dari satu span.tg — teksnya "#nama" atau "#nama" plus spasi. */
export function namaDariSpan(span) {
  const t = (span.textContent || '').trim().replace(/^#/, '');
  return t.split(/\s/)[0] || '';
}

/* Bentuk sah sebuah tag di isi: "#" lalu huruf/angka/_/-// (tanpa spasi
   atau karakter lain). Dipakai untuk memutuskan span masih tag atau
   sudah disusupi teks lain. */
const BENTUK_SAH = /^#[\p{L}\p{N}_\/.-]+$/u;
/* Awalan nama tag: "#" + sebanyak mungkin karakter nama. Dipakai untuk
   memisahkan "#nama" dari sisa yang menyusup di belakangnya. */
const AWAL_NAMA = /^#[\p{L}\p{N}_\/.-]*/u;

/* IME sedang mengompasisi? Selama ini DOM tidak boleh diubah-ubah. */
let komposisi = false;
export function setKomposisi(v) { komposisi = !!v; }
export function sedangKomposisi() { return komposisi; }

/* Buka bungkus span: anak-anaknya dinaikkan ke induk, span dibuang.
   Teks tetap utuh — hanya "ke-tag"-an-nya yang hilang. */
function lepasBungkus(span) {
  const p = span.parentNode;
  if (!p) return;
  while (span.firstChild) p.insertBefore(span.firstChild, span);
  span.remove();
}

/* Span tag yang sedang memuat karet (sedang disunting pengguna), atau
   null. Karet bisa bertumpu pada node teks (biasa) ATAU pada elemen
   (umum di Android/GBoard setelah komposisi) — dalam kasus terakhir,
   span tepat di kiri/kanan posisi karet dianggap sedang disunting. */
function spanKaret() {
  const s = sel();
  if (!(s && s.rangeCount)) return null;
  const r = s.getRangeAt(0);
  return spanUntukKaret(r.startContainer, r.startOffset);
}

function spanUntukKaret(c, off) {
  if (!c) return null;
  if (c.nodeType === 3) {
    const el = c.parentElement;
    return (el && el.closest) ? el.closest('span.tg') : null;
  }
  if (c.nodeType !== 1) return null;
  if (c.classList && c.classList.contains('tg')) return c;
  const anak = c.childNodes;
  const kanan = anak[off], kiri = anak[off - 1];
  for (const k of [kanan, kiri])
    if (k && k.nodeType === 1 && k.classList && k.classList.contains('tg')) return k;
  return null;
}

/* Posisi karet dihitung dalam KARAKTER dari awal isi span (0 = sebelum
   karakter pertama). Null bila karet tidak berada di dalam span. */
function posisiKaretDalam(span) {
  const s = sel();
  if (!(s && s.rangeCount)) return null;
  const r = s.getRangeAt(0);
  const c = r.startContainer;
  if (!c || !span.contains(c)) return null;
  try {
    const pre = document.createRange();
    pre.selectNodeContents(span);
    pre.setEnd(c, Math.min(r.startOffset, c.nodeType === 3 ? c.length : c.childNodes.length));
    return pre.toString().length;
  } catch (e) { return null; }
}

/* Pindahkan karet ke posisi `offset` karakter sesudah span (0 = tepat
   menempel di belakang span). Dipakai setelah isi span dipecah. */
function tempatkanKaretSetelah(span, offset) {
  const s = sel();
  if (!s) return false;
  let sisa = Math.max(0, offset | 0);
  let n = span.nextSibling;
  while (n) {
    const panjang = (n.textContent || '').length;
    if (n.nodeType === 3) {
      const r = document.createRange();
      r.setStart(n, Math.min(sisa, n.length)); r.collapse(true);
      s.removeAllRanges(); s.addRange(r);
      return true;
    }
    if (sisa <= panjang) {
      const r = document.createRange();
      r.setStartBefore(n); r.collapse(true);
      s.removeAllRanges(); s.addRange(r);
      return true;
    }
    sisa -= panjang; n = n.nextSibling;
  }
  return false;
}

/* Isi span tidak lagi "#nama" murni, tapi awalnya masih "#…". PECAH:
   yang tinggal di dalam span hanya awalan nama, sisanya (spasi, tanda
   baca, elemen) dikeluarkan ke belakang span sebagai teks/nodes biasa.
   Mengembalikan panjang awalan yang tetap di dalam span (0 bila tidak
   ada yang bisa dipisahkan, mis. isi persis "#", atau huruf menyusup di
   DEPAN "#" — pemanggil membuka bungkus seluruhnya). */
function pecahSpan(span) {
  const teks = span.textContent || '';
  const m = AWAL_NAMA.exec(teks);
  if (!m) return 0;
  const nama = m[0];
  if (nama.length >= teks.length) return 0;
  const induk = span.parentNode;
  if (!induk) return 0;

  let sudah = 0;                 /* karakter yang tetap di dalam span */
  const keluar = [];             /* node yang dikeluarkan, urut */
  for (const anak of Array.from(span.childNodes)) {
    const panjang = (anak.textContent || '').length;
    if (sudah + panjang <= nama.length) { sudah += panjang; continue; }
    if (anak.nodeType === 3 && sudah < nama.length) {
      keluar.push(anak.splitText(nama.length - sudah));
      sudah = nama.length;
      continue;
    }
    sudah += panjang;
    keluar.push(anak);
  }
  if (!keluar.length) return 0;
  const jangkar = span.nextSibling;
  for (const k of keluar) induk.insertBefore(k, jangkar);
  return nama.length;
}

/* Warnai setiap span.tg di dalam `root` (biasanya .ed-doc).
   Warna memakai tanda catatan bila ada manual, selain itu hash nama. */
export function tandaiLabelTag(root, n) {
  if (!root || !root.querySelectorAll) return;
  const cat = n || state.notes.find(x => x.id === state.openId);
  const karet = spanKaret();

  const warnai = span => {
    if (span === karet) {
      /* sedang disunting: pertahankan warna lama supaya tidak berkedip
         tiap huruf; beri warna pertama kalinya bila belum ada */
      if (!span.hasAttribute('data-tt'))
        span.setAttribute('data-tt', tandaUntukCatatan(cat, namaDariSpan(span)));
      return;
    }
    span.setAttribute('data-tt', tandaUntukCatatan(cat, namaDariSpan(span)));
  };

  for (const span of Array.from(root.querySelectorAll('span.tg'))) {
    if (!span.isConnected) continue;
    const teks = span.textContent || '';

    /* span tag bersarang (tag di dalam tag) → buka yang luar.
       Tidak diubah saat IME mengompasisi (DOM berubah = komposisi rusak). */
    if (span.querySelector('span.tg')) { if (!komposisi) lepasBungkus(span); continue; }
    /* kosong → hapus sama sekali */
    if (!teks.trim()) { if (!komposisi) span.remove(); continue; }

    if (BENTUK_SAH.test(teks)) { warnai(span); continue; }

    /* tak lagi "#nama" murni: ada teks menyusup ke dalam span */
    if (komposisi) { warnai(span); continue; }

    const pos = posisiKaretDalam(span);        /* catat SEBELUM DOM diubah */
    const panjangAwal = pecahSpan(span);
    const sisaTeks = span.textContent || '';
    if (panjangAwal) {
      /* karet yang tadinya berada di bagian yang keluar dipindah ke
         posisi yang sama pada teks yang baru dikeluarkan — ketikan
         lanjutan mendarat di teks biasa, bukan kembali ke dalam tag */
      if (pos !== null && pos > panjangAwal)
        tempatkanKaretSetelah(span, pos - panjangAwal);
      if (BENTUK_SAH.test(sisaTeks)) { warnai(span); continue; }
      /* setelah dipotong isinya tak sah juga (mis. hanya "#") → buang
         bungkusnya; karet sudah dipindah ke luar span */
      lepasBungkus(span);
      continue;
    }

    /* tidak ada yang bisa dipisahkan */
    if (span === karet) {        /* sedang mengetik nama baru ("#") */
      warnai(span);
      continue;
    }
    /* karet di dalam tapi tak bisa dipecah (huruf menyusup di depan #)
       → pindahkan karet ke luar dulu supaya tidak terlempar saat
       bungkusnya dibuka */
    if (pos !== null) tempatkanKaretSetelah(span, 0);
    lepasBungkus(span);
  }
}
