/* Saringan tersimpan — "Smart Folder" versi ringan (Peta Master Bagian 5).

   Menyimpan kueri pencarian yang sering dipakai sebagai chip di layar
   Catatan. Satu ketukan mengaktifkan saringan, ketukan lagi
   mematikannya. Isinya memakai bahasa kueri yang sudah ada
   (tag:nama, judul:kata, #tag, "frasa") sehingga tidak ada sintaks baru
   yang harus dipelajari.

   Disimpan di localStorage, bukan di data catatan: menghapus semua
   catatan tidak menghapus saringan, dan saringan tidak ikut ke cadangan
   JSON. Privasi tetap dijaga: hitungan hanya membaca catatan yang
   terlihat (terlihat(n)) dan tidak pernah menyentuh catatan terkunci. */

import { state } from '../core/store.js?v=20261023231757';
import { esc } from '../core/dom.js?v=20261023231757';
import { toast } from '../core/toast.js?v=20261023231757';
import { go, cur } from '../core/router.js?v=20261023231757';
import { t as tr } from '../core/i18n.js?v=20261023231757';
import { terlihat } from './kunci.js?v=20261023231757';
import { pecahKueri, kueriKosong, catatanCocok } from './cari.js?v=20261023231757';
import { openPop, closeAll } from './menus/pop.js?v=20261023231757';

const KUNCI = 'hara.saringan.v1';
const MAKS = 12;
let aktifId = null;

function baca() {
  try {
    const v = JSON.parse(localStorage.getItem(KUNCI) || '[]');
    if (!Array.isArray(v)) return [];
    return v
      .filter(x => x && typeof x.id === 'string' && typeof x.kueri === 'string' && x.kueri.trim())
      .slice(0, MAKS);
  } catch (e) { return []; }
}

function tulis(daftar) {
  try { localStorage.setItem(KUNCI, JSON.stringify((daftar || []).slice(0, MAKS))); }
  catch (e) { /* mode privat: saringan hanya berlaku selama sesi */ }
}

const idBaru = () =>
  'sf' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

const namaPendek = q => {
  const s = String(q || '').trim();
  return s.length > 28 ? s.slice(0, 27) + '…' : s;
};

export const daftarSaringan = () => baca();

export function simpanSaringan(nama, kueri) {
  const q = String(kueri == null ? '' : kueri).trim().slice(0, 200);
  if (!q) return null;
  const daftar = baca();
  const namaBersih = (String(nama == null ? '' : nama).trim() || namaPendek(q)).slice(0, 40);

  /* Kueri yang sama tidak dibuat dua kali — cukup perbarui namanya. */
  const ada = daftar.find(x => x.kueri.toLowerCase() === q.toLowerCase());
  if (ada) {
    ada.nama = namaBersih;
    tulis(daftar);
    return ada;
  }
  const item = { id: idBaru(), nama: namaBersih, kueri: q };
  daftar.unshift(item);
  tulis(daftar);
  return item;
}

export function hapusSaringan(id) {
  const daftar = baca();
  const sisa = daftar.filter(x => x.id !== id);
  tulis(sisa);
  if (aktifId === id) aktifId = null;
  return sisa.length !== daftar.length;
}

export function ubahNamaSaringan(id, nama) {
  const daftar = baca();
  const item = daftar.find(x => x.id === id);
  if (!item) return false;
  item.nama = (String(nama == null ? '' : nama).trim() || namaPendek(item.kueri)).slice(0, 40);
  tulis(daftar);
  return true;
}

export function setSaringanAktif(id) {
  aktifId = null;
  if (!id) return null;
  const ada = baca().some(x => x.id === id);
  if (ada) aktifId = id;
  return aktifId;
}

export const saringanAktifId = () => aktifId;

export function saringanAktif() {
  if (!aktifId) return null;
  return baca().find(x => x.id === aktifId) || null;
}

export function saringanAktifNama() {
  const s = saringanAktif();
  return s ? s.nama : '';
}

/* Saring daftar catatan dengan saringan yang sedang aktif. */
export function saringCatatan(daftar) {
  const s = saringanAktif();
  if (!s) return daftar;
  const k = pecahKueri(s.kueri);
  if (kueriKosong(k)) return daftar;
  return (Array.isArray(daftar) ? daftar : []).filter(n => catatanCocok(n, k));
}

export function jumlahCocokSaringan(kueri, daftar = state.notes) {
  const k = pecahKueri(kueri);
  if (kueriKosong(k)) return 0;
  return (Array.isArray(daftar) ? daftar : [])
    .filter(n => n && !n.deletedAt && !n.archived && terlihat(n) && catatanCocok(n, k))
    .length;
}

export function renderSaringanBarHtml() {
  const daftar = daftarSaringan();
  if (!daftar.length) return '';
  const aktif = saringanAktifId();
  return `<div class="sf-bar" role="group" aria-label="${tr('Saringan tersimpan')}">
    ${daftar.map(x => {
      const n = jumlahCocokSaringan(x.kueri);
      const on = x.id === aktif;
      return `<button type="button" class="sf-chip${on ? ' on' : ''}" data-sf="${esc(x.id)}"
        aria-pressed="${on}" title="${esc(x.kueri)}">
        <svg class="ico"><use href="#i-search"/></svg>
        <span>${esc(x.nama)}</span><b>${n}</b></button>`;
    }).join('')}
    ${aktif ? `<button type="button" class="sf-kelola sf-bersih" data-sf-bersih
      title="${tr('Hapus filter saringan')}" aria-label="${tr('Hapus filter saringan')}">
      <svg class="ico"><use href="#i-x"/></svg></button>` : ''}
    <button type="button" class="sf-kelola" data-sf-kelola
      title="${tr('Kelola saringan')}" aria-label="${tr('Kelola saringan')}">
      <svg class="ico"><use href="#i-cog"/></svg></button>
  </div>`;
}

export const renderSimpanSaringanHtml = () =>
  `<button type="button" class="sf-simpan" data-sf-baru>
    <svg class="ico"><use href="#i-plus"/></svg>${tr('Simpan pencarian ini')}</button>`;

/* ── panel simpan & kelola ── */
export function bukaSimpanSaringan(kueri) {
  const q = String(kueri == null ? '' : kueri).trim();
  if (!q) { toast(tr('Ketik kata kunci dulu di kolom cari')); return; }
  openPop(`<div class="sf-sheet">
    <div class="pop-h">${tr('Simpan saringan')}</div>
    <p class="pop-note">${tr('Saringan menyimpan kata kunci pencarian agar bisa dipakai lagi dengan satu ketukan.')}</p>
    <label class="cg-f"><span>${tr('Nama saringan')}</span>
      <input id="sf-nama" class="in" type="text" maxlength="40" autocomplete="off"
        value="${esc(namaPendek(q))}" placeholder="${tr('Nama saringan')}"></label>
    <div class="sf-cuplik">${esc(q)}</div>
    <div class="cg-aksi">
      <button type="button" class="btn btn-sec" data-pop-close>${tr('Batal')}</button>
      <button type="button" class="btn btn-pri" id="sf-simpan">${tr('Simpan')}</button>
    </div>
  </div>`);
}

export function bukaKelolaSaringan() {
  const daftar = daftarSaringan();
  openPop(`<div class="sf-sheet">
    <div class="pop-h">${tr('Kelola saringan')}</div>
    ${daftar.length ? `<p class="pop-note">${tr('Ubah nama atau hapus saringan. Ketuk chip di layar Catatan untuk memakainya.')}</p>` : ''}
    ${daftar.length ? daftar.map(x => `<div class="sf-manage" data-sf-baris="${esc(x.id)}">
      <input class="in" type="text" maxlength="40" autocomplete="off"
        data-sf-nama-input="${esc(x.id)}" value="${esc(x.nama)}"
        aria-label="${tr('Nama saringan')}">
      <button type="button" class="sf-mini" data-sf-nama-simpan="${esc(x.id)}"
        title="${tr('Simpan nama')}" aria-label="${tr('Simpan nama')}">
        <svg class="ico"><use href="#i-check2"/></svg></button>
      <button type="button" class="sf-mini danger" data-sf-hapus="${esc(x.id)}"
        title="${tr('Hapus saringan')}" aria-label="${tr('Hapus saringan')}">
        <svg class="ico"><use href="#i-trash"/></svg></button>
      <div class="sf-manage-ket">${esc(x.kueri)} · ${jumlahCocokSaringan(x.kueri)} ${tr('catatan')}</div>
    </div>`).join('') : `<p class="pop-note">${tr('Belum ada saringan tersimpan')}</p>`}
    <div class="cg-aksi">
      <button type="button" class="btn btn-sec" data-pop-close>${tr('Tutup')}</button>
    </div>
  </div>`);
}

/* Layar Catatan digambar ulang setelah saringan berubah. */
function segarkan() {
  if (cur === 'notes' || cur === 'home' || cur === 'arsip') go(cur);
}

export function bindSaringan() {
  document.addEventListener('click', e => {
    if (!e.target.closest) return;

    const chip = e.target.closest('[data-sf]');
    if (chip) {
      const id = chip.dataset.sf;
      setSaringanAktif(saringanAktifId() === id ? null : id);
      segarkan();
      return;
    }

    if (e.target.closest('[data-sf-bersih]')) {
      setSaringanAktif(null);
      segarkan();
      return;
    }

    const kelola = e.target.closest('[data-sf-kelola]');
    if (kelola) { bukaKelolaSaringan(); return; }

    if (e.target.closest('[data-sf-baru]')) {
      const inp = document.getElementById('cari-in');
      bukaSimpanSaringan(inp ? inp.value : '');
      return;
    }

    if (e.target.closest('#sf-simpan')) {
      const nama = document.getElementById('sf-nama')?.value || '';
      const q = (document.querySelector('.sf-sheet .sf-cuplik')?.textContent || '').trim();
      if (!q) { toast(tr('Ketik kata kunci dulu di kolom cari')); return; }
      const item = simpanSaringan(nama, q);
      if (item) toast(tr('Saringan disimpan'));
      closeAll();
      return;
    }

    const hapus = e.target.closest('[data-sf-hapus]');
    if (hapus) {
      if (hapusSaringan(hapus.dataset.sfHapus)) toast(tr('Saringan dihapus'));
      closeAll();
      segarkan();
      return;
    }

    const simpanNama = e.target.closest('[data-sf-nama-simpan]');
    if (simpanNama) {
      const id = simpanNama.dataset.sfNamaSimpan;
      const inp = document.querySelector(`[data-sf-nama-input="${id}"]`);
      if (inp && ubahNamaSaringan(id, inp.value)) toast(tr('Saringan diperbarui'));
      closeAll();
      segarkan();
      return;
    }
  });
}
