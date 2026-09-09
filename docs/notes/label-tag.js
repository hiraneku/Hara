/* Terapkan warna label ke tag #… di dalam editor (B10).

   Dipanggil setiap kali editor digambar ulang: setiap span .tg diberi
   data-tt (kunci palet) + variabel --lc. Tanpa ini tag di isi hanya
   hijau aksen.

   DUA aturan penting di sini:
   • Warna BEKU saat tag sedang disunting (karet di dalamnya). Warna tag
     dihitung dari NAMANYA; kalau data-tt dihitung ulang tiap ketikan,
     menghapus/mengetik huruf di dalam tag membuat warnanya berganti-
     ganti tiap huruf. Saat karet berhenti di dalam tag, warna lama
     dipertahankan sampai karet keluar.
   • Span tag yang TIDAK SAH langsung dibereskan (bukan menunggu simpan):
     span kosong dihapus; span yang isinya tidak lagi berbentuk "#nama"
     (mis. huruf lanjutan menyusup ke depan #, tag terbelah Enter, atau
     nama mengandung spasi) dibuka bungkusnya menjadi teks biasa. Sisa
     korup tidak boleh tampil seperti tag atau ikut terdeteksi. */

import { state } from '../core/store.js?v=20260909122014';
import { tandaUntukCatatan } from './label.js?v=20260909122014';
import { chipTag } from './label.js?v=20260909122014';
import { sel } from './editor/caret.js?v=20260909122014';

/* Nama tag dari satu span.tg — teksnya "#nama" atau "#nama" plus spasi. */
export function namaDariSpan(span) {
  const t = (span.textContent || '').trim().replace(/^#/, '');
  return t.split(/\s/)[0] || '';
}

/* Bentuk sah sebuah tag di isi: "#" lalu huruf/angka/_/-// (tanpa spasi
   atau karakter lain). Dipakai untuk memutuskan span masih tag atau
   sudah korup. */
const BENTUK_SAH = /^#[\p{L}\p{N}_\/.-]+$/u;

/* Buka bungkus span: anak-anaknya (biasanya satu node teks) dinaikkan ke
   induk, span dibuang. Teks tetap utuh — hanya "ke-tag"-annya yang
   hilang. */
function lepasBungkus(span) {
  const p = span.parentNode;
  if (!p) return;
  while (span.firstChild) p.insertBefore(span.firstChild, span);
  span.remove();
}

/* Span tag yang sedang memuat karet (sedang disunting pengguna), atau
   null. */
function spanKaret() {
  const s = sel();
  if (!(s && s.rangeCount)) return null;
  const c = s.getRangeAt(0).startContainer;
  if (c.nodeType === 3) {
    const el = c.parentElement;
    return (el && el.closest) ? el.closest('span.tg') : null;
  }
  if (c.nodeType === 1 && c.classList && c.classList.contains('tg')) return c;
  return null;
}

/* Isi span tidak lagi \"#nama\" murni, tapi MASIH dimulai #nama yang utuh
   (teks lanjutan menyusup ke dalam span — mis. \"#halo X\" atau \"#halo,\").
   Pecah: tag #nama tetap tinggal sebagai span, sisa isi dikeluarkan jadi
   teks biasa. Mengembalikan false kalau tidak ada #nama utuh di awal
   (mis. huruf menyusup di depan #, atau \"#\" sendirian) — pemanggil lalu
   membuka bungkus seluruhnya. */
function pecahSpan(span) {
  const teks = span.textContent || '';
  const m = /^#[\p{L}\p{N}_\/.-]+/u.exec(teks);
  if (!m) return false;
  const nama = m[0];
  if (nama.length >= teks.length) return false;
  const sisa = teks.slice(nama.length);
  span.textContent = nama;
  span.after(document.createTextNode(sisa));
  return true;
}

/* Warnai setiap span.tg di dalam `root` (biasanya .ed-doc).
   Warna memakai tanda catatan bila ada manual, selain itu hash nama. */
export function tandaiLabelTag(root, n) {
  if (!root || !root.querySelectorAll) return;
  const cat = n || state.notes.find(x => x.id === state.openId);
  const karet = spanKaret();
  for (const span of Array.from(root.querySelectorAll('span.tg'))) {
    if (!span.isConnected) continue;
    const teks = span.textContent || '';

    /* span tag bersarang (tag di dalam tag) → buka yang luar */
    if (span.querySelector('span.tg')) { lepasBungkus(span); continue; }
    /* kosong → hapus sama sekali */
    if (!teks.trim()) { span.remove(); continue; }
    /* tidak lagi berbentuk #nama → pulihkan SEKARANG (bukan menunggu
       simpan). Kalau awal isinya masih #nama utuh dengan teks menyusup
       di belakangnya (spasi/tanda/…), PECAH: tag tetap tampil & tetap
       terdeteksi, sisanya keluar jadi teks biasa. Kalau tidak (huruf
       menyusup di depan #, atau # sendirian), buka bungkus seluruhnya.
       Saat karet MASIH di dalam span yang sedang disusupi, biarkan
       dulu — komposisi ketikan bisa melewati keadaan sementara;
       dibereskan pada refresh berikutnya setelah karet keluar. */
    if (!BENTUK_SAH.test(teks)) {
      if (span === karet) {
        if (!span.hasAttribute('data-tt'))
          span.setAttribute('data-tt', tandaUntukCatatan(cat, namaDariSpan(span)));
        continue;
      }
      if (pecahSpan(span)) {
        span.setAttribute('data-tt', tandaUntukCatatan(cat, namaDariSpan(span)));
        continue;
      }
      lepasBungkus(span);
      continue;
    }

    /* sah & sedang disunting (karet di dalam): pertahankan warna lama
       supaya tidak berkedip tiap huruf; beri warna pertama kalinya */
    if (span === karet) {
      if (!span.hasAttribute('data-tt'))
        span.setAttribute('data-tt', tandaUntukCatatan(cat, namaDariSpan(span)));
      continue;
    }
    span.setAttribute('data-tt', tandaUntukCatatan(cat, namaDariSpan(span)));
  }
}
