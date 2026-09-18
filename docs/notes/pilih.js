/* Pilih banyak catatan di daftar (tahan-lama), lalu beraksi sekaligus.

   Cara pakai:
   • Tahan ~0,5 detik di sebuah baris daftar → mode pilih menyala;
   • atau ketuk tombol "Pilih" di bilah daftar (jalan pintas untuk
     perangkat yang sulit menahan lama, dan untuk papan ketik);
   • saat mode pilih, satu ketukan di baris = menandai/melepas;
   • bilah mini di atas layar: ✕ (selesai), jumlah terpilih, "Pilih
     semua", Sematkan/Lepas semat, Arsipkan/Kembalikan, Hapus.

   Kenapa tahan-lama dan bukan Ctrl+klik: di ponsel tidak ada Ctrl.
   Gestur ini tidak mengganggu sapuan D21 (swipe.js) — timer batal
   begitu jari bergerak lebih dari 10px, jadi geser tetap = sapuan,
   dan scroll tetap = scroll.

   Selama mode pilih, sapuan baris dimatikan (swipe.js memeriksa
   sedangPilih) dan tombol semat kecil di baris disembunyikan (CSS):
   semuanya lewat bilah mini supaya tidak ada aksi yang salah sasaran. */

import { cur, go, onAfterRender, onBeforeLeave } from '../core/router.js?v=20260918132648';
import { toast } from '../core/toast.js?v=20260918132648';
import { getar } from './bar/prefs.js?v=20260918132648';
import { t as tr } from '../core/i18n.js?v=20260918132648';
import { findNote, hapusBanyakDariList, sematBanyak, arsipBanyak } from './model.js?v=20260918132648';

const TAHAN = 480;        /* ms menahan sebelum mode pilih menyala */
const GESER_BATAL = 10;   /* px — lebih dari ini dianggap scroll/sapuan */
const TAHAN_KLIK = 550;   /* ms menekan klik susulan setelah tahan */

/* Layar yang boleh memakai mode pilih: hanya daftar berisi baris catatan.
   Di editor/mode baca tidak ada baris daftar, jadi tidak ada sasaran. */
const LAYAR = ['home', 'notes', 'arsip', 'search'];

/* Tutup baris yang sedang terbuka karena sapuan (D21). Ditulis di sini
   dan bukan memanggil swipe.js supaya tidak ada lingkaran impor
   pilih → swipe → pilih (swipe.js sendiri yang memeriksa sedangPilih). */
function tutupBarisTerbuka() {
  document.querySelectorAll('.srow.open').forEach(s => {
    s.classList.remove('open');
    s.querySelectorAll('.sa').forEach(b => b.setAttribute('tabindex', '-1'));
    const l = s.querySelector('.srow-b');
    if (l) l.style.transform = '';
  });
}

let on = false;
const ids = new Set();
let tekanKlikSampai = 0;   /* klik susulan setelah tekan lama ditekan */

export const sedangPilih = () => on;
export const jumlahPilih = () => ids.size;
export const idTerpilih = () => [...ids];

/* ── bilah mini ─────────────────────────────────────────────────────
   Dibuat sekali, ditempel ke <body> (bukan #wrap) supaya tidak ikut
   digambar ulang tiap pindah layar. Tingginya sama dengan header
   (56px) dan menutupinya selama mode pilih — pola contextual bar. */
function bilah() {
  let b = document.getElementById('pilih-bar');
  if (b) return b;
  b = document.createElement('div');
  b.id = 'pilih-bar';
  b.className = 'pilih-bar';
  b.setAttribute('role', 'toolbar');
  b.setAttribute('aria-label', tr('Aksi untuk catatan terpilih'));
  b.hidden = true;
  document.body.appendChild(b);
  return b;
}

function gambarBilah() {
  const b = bilah();
  const n = ids.size;
  const semuaTersemat = n > 0 && idTerpilih().every(id => {
    const x = findNote(id);
    return x && x.pinned;
  });
  const semuaArsip = n > 0 && idTerpilih().every(id => {
    const x = findNote(id);
    return x && x.archived;
  });
  b.innerHTML = `
    <button type="button" class="pb-i pb-x" data-pilih-x title="${tr('Selesai memilih')}"
      aria-label="${tr('Selesai memilih')}"><svg class="ico"><use href="#i-x"/></svg></button>
    <span class="pb-n">${n ? tr('{n} dipilih', { n }) : tr('Pilih catatan')}</span>
    <button type="button" class="pb-t" data-pilih-semua>${tr('Pilih semua')}</button>
    <button type="button" class="pb-i" data-pilih-semat ${n ? '' : 'disabled'}
      title="${semuaTersemat ? tr('Lepas sematan') : tr('Sematkan')}"
      aria-label="${semuaTersemat ? tr('Lepas sematan') : tr('Sematkan')}">
      <svg class="ico"><use href="#i-pin"/></svg></button>
    <button type="button" class="pb-i" data-pilih-arsip ${n ? '' : 'disabled'}
      title="${semuaArsip ? tr('Kembalikan dari arsip') : tr('Arsipkan')}"
      aria-label="${semuaArsip ? tr('Kembalikan dari arsip') : tr('Arsipkan')}">
      <svg class="ico"><use href="#i-arch"/></svg></button>
    <button type="button" class="pb-i pb-danger" data-pilih-hapus ${n ? '' : 'disabled'}
      title="${tr('Hapus — masuk sampah')}" aria-label="${tr('Hapus — masuk sampah')}">
      <svg class="ico"><use href="#i-trash"/></svg></button>`;
  b.hidden = !on;
}

/* Selaraskan DOM daftar dengan keadaan mode pilih: kotak centang,
   penanda baris terpilih, dan bilah mini. Dipanggil tiap pilihan
   berubah DAN tiap layar selesai digambar (daftar digambar ulang). */
function terapkanDom() {
  const baris = document.querySelectorAll('#wrap .row[data-open]');
  baris.forEach(row => {
    const id = row.dataset.open;
    let ck = row.querySelector(':scope > .pilih-ck');
    if (!on) {
      if (ck) ck.remove();
      row.classList.remove('picked');
      row.removeAttribute('aria-pressed');
      return;
    }
    if (!ck) {
      ck = document.createElement('span');
      ck.className = 'pilih-ck';
      ck.setAttribute('aria-hidden', 'true');
      row.insertBefore(ck, row.firstChild);
    }
    const dipilih = ids.has(id);
    row.classList.toggle('picked', dipilih);
    row.setAttribute('aria-pressed', dipilih ? 'true' : 'false');
  });
  document.body.classList.toggle('sedang-pilih', on);
  if (on) gambarBilah(); else bilah().hidden = true;
}

/* Buang id yang catatannya sudah tidak ada / sudah di sampah — sisa
   pilihan dari layar sebelumnya tidak boleh ikut terhitung. */
function sapuIdBasi() {
  [...ids].forEach(id => {
    const n = findNote(id);
    if (!n || n.deletedAt) ids.delete(id);
  });
}

export function mulaiPilih(id) {
  if (!LAYAR.includes(cur)) return;
  on = true;
  ids.clear();
  if (id) ids.add(id);
  tutupBarisTerbuka();
  terapkanDom();
  if (id) getar(14);
}

/* Matikan mode pilih. `gambar` = gambar ulang layar (untuk aksi yang
   mengubah daftar); pemanggil internal yang sudah menggambar sendiri
   memakai false. */
export function batalPilih(gambar = false) {
  if (!on) return;
  on = false;
  ids.clear();
  terapkanDom();
  if (gambar) go(cur);
}

/* Pilih/lepas satu baris. Mengetuk baris terakhir yang masih terpilih
   berarti "selesai" — mode pilih ikut mati, seperti di aplikasi ponsel. */
export function togglePilih(id) {
  if (!id) return;
  if (ids.has(id)) {
    ids.delete(id);
    if (!ids.size) { batalPilih(); return; }
  } else {
    ids.add(id);
    getar(8);
  }
  terapkanDom();
}

function pilihSemua() {
  const baris = document.querySelectorAll('#wrap .row[data-open]');
  if (!baris.length) return;
  let adaBaru = false;
  baris.forEach(row => {
    const id = row.dataset.open;
    if (!ids.has(id)) { ids.add(id); adaBaru = true; }
  });
  if (!baris.length || !adaBaru) {   /* ketuk dua kali = lepas semua */
    baris.forEach(row => ids.delete(row.dataset.open));
    if (!ids.size) { batalPilih(); return; }
  }
  terapkanDom();
}

/* ── aksi sekaligus ─────────────────────────────────────────────────
   Semua lewat model.js supaya aturan penyimpanan/tempat sampah tetap
   satu pintu. Sesudah aksi, mode pilih mati dan daftar digambar ulang. */
function aksiSemat() {
  const daftar = idTerpilih();
  if (!daftar.length) return;
  const semua = daftar.every(id => { const n = findNote(id); return n && n.pinned; });
  sematBanyak(daftar, !semua);
  batalPilih(true);
}

function aksiArsip() {
  const daftar = idTerpilih();
  if (!daftar.length) return;
  /* semua terpilih sudah di arsip → aksinya "kembalikan"; selain itu
     arsipkan. Berlaku di layar mana pun (daftar, arsip, hasil cari). */
  const semua = daftar.every(id => { const n = findNote(id); return n && n.archived; });
  arsipBanyak(daftar, !semua);
  batalPilih(true);
}

function aksiHapus() {
  const daftar = idTerpilih();
  if (!daftar.length) return;
  const n = hapusBanyakDariList(daftar);
  batalPilih(true);
  if (!n) toast(tr('Tidak ada yang bisa dihapus'));
}

export function bindPilih() {
  /* bilah mini + tombol "Pilih" di bilah daftar */
  document.addEventListener('click', e => {
    if (e.target.closest('[data-pilih-buka]')) { mulaiPilih(); return; }
    if (e.target.closest('[data-pilih-x]'))    { batalPilih(); return; }
    if (e.target.closest('[data-pilih-semua]')){ pilihSemua(); return; }
    if (e.target.closest('[data-pilih-semat]')){ aksiSemat(); return; }
    if (e.target.closest('[data-pilih-arsip]')){ aksiArsip(); return; }
    if (e.target.closest('[data-pilih-hapus]')){ aksiHapus(); return; }
  }, true);

  /* klik susulan tepat sesudah tekan lama tidak boleh membuka catatan
     (tahan → mode pilih menyala → jari diangkat → klik masuk). */
  document.addEventListener('click', e => {
    if (!tekanKlikSampai || Date.now() > tekanKlikSampai) return;
    tekanKlikSampai = 0;
    if (e.target.closest('#wrap .row[data-open]')) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);

  /* saat mode pilih: ketukan di baris = menandai, bukan membuka */
  document.addEventListener('click', e => {
    if (!on) return;
    const row = e.target.closest('#wrap .row[data-open]');
    if (!row) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    togglePilih(row.dataset.open);
  }, true);

  /* tekan lama: nyalakan mode pilih (atau tandai baris berikutnya) */
  let timer = null, x0 = 0, y0 = 0, sasaran = null;
  const batal = () => { clearTimeout(timer); timer = null; sasaran = null; };
  document.addEventListener('pointerdown', e => {
    if (e.target.closest('.pilih-bar')) return;
    const row = e.target.closest('#wrap .row[data-open]');
    if (!row) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    sasaran = row; x0 = e.clientX; y0 = e.clientY;
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      const id = sasaran && sasaran.dataset.open;
      sasaran = null;
      if (!id) return;
      if (on) togglePilih(id); else mulaiPilih(id);
      tekanKlikSampai = Date.now() + TAHAN_KLIK;
    }, TAHAN);
  }, true);
  document.addEventListener('pointermove', e => {
    if (!timer) return;
    if (Math.abs(e.clientX - x0) > GESER_BATAL || Math.abs(e.clientY - y0) > GESER_BATAL) batal();
  }, true);
  document.addEventListener('pointerup', batal, true);
  document.addEventListener('pointercancel', batal, true);
  document.addEventListener('scroll', batal, true);
  window.addEventListener('blur', batal);

  /* Escape = selesai memilih */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && on) { e.preventDefault(); e.stopPropagation(); batalPilih(); }
  }, true);

  /* pindah layar: pilihan tidak boleh menempel ke layar lain */
  onBeforeLeave(() => { if (on) batalPilih(); });

  /* daftar digambar ulang (mis. urutan diganti, catatan disematkan) —
     kotak centang & bilah diselaraskan lagi */
  onAfterRender(() => { sapuIdBasi(); if (on) terapkanDom(); });
}
