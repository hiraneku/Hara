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

import { state } from '../core/store.js?v=20261026034335';
import { esc } from '../core/dom.js?v=20261026034335';
import { toast } from '../core/toast.js?v=20261026034335';
import { go, cur } from '../core/router.js?v=20261026034335';
import { t as tr } from '../core/i18n.js?v=20261026034335';
import { terlihat } from './kunci.js?v=20261026034335';
import { pecahKueri, kueriKosong, catatanCocok } from './cari.js?v=20261026034335';
import { petaNamaRuang } from './ruang.js?v=20261026034335';
import { openPop, closeAll } from './menus/pop.js?v=20261026034335';
import { sheet, shField, shAksi } from './sheet.js?v=20261026034335';

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
  const ctx = { namaRuang: petaNamaRuang() };
  return (Array.isArray(daftar) ? daftar : []).filter(n => catatanCocok(n, k, ctx));
}

export function jumlahCocokSaringan(kueri, daftar = state.notes) {
  const k = pecahKueri(kueri);
  if (kueriKosong(k)) return 0;
  const ctx = { namaRuang: petaNamaRuang() };
  return (Array.isArray(daftar) ? daftar : [])
    .filter(n => n && !n.deletedAt && !n.archived && terlihat(n) && catatanCocok(n, k, ctx))
    .length;
}

export function renderSaringanBarHtml() {
  const daftar = daftarSaringan();
  if (!daftar.length) return '';
  const aktif = saringanAktifId();
  const chip = x => {
    const n = jumlahCocokSaringan(x.kueri);
    const on = x.id === aktif;
    return `<button type="button" class="sf-chip${on ? ' on' : ''}" data-sf="${esc(x.id)}"
      aria-pressed="${on}" title="${esc(x.kueri)}">
      <svg class="ico" aria-hidden="true"><use href="#${on ? 'i-check2' : 'i-filter'}"/></svg>
      <span class="sf-nm">${esc(x.nama)}</span><b class="sf-ct">${n}</b></button>`;
  };
  return `<div class="sf-bar" role="group" aria-label="${tr('Saringan tersimpan')}">
    <div class="sf-track">${daftar.map(chip).join('')}</div>
    <div class="sf-aksi">
      ${aktif ? `<button type="button" class="sf-kelola sf-bersih" data-sf-bersih
        title="${tr('Hapus filter saringan')}" aria-label="${tr('Hapus filter saringan')}">
        <svg class="ico"><use href="#i-x"/></svg></button>` : ''}
      <button type="button" class="sf-kelola" data-sf-kelola
        title="${tr('Kelola saringan')}" aria-label="${tr('Kelola saringan')}">
        <svg class="ico"><use href="#i-cog"/></svg></button>
    </div>
  </div>`;
}

export const renderSimpanSaringanHtml = () =>
  `<button type="button" class="sf-simpan" data-sf-baru>
    <span class="sf-simpan-i" aria-hidden="true"><svg class="ico"><use href="#i-plus"/></svg></span>
    <span class="sf-simpan-t">${tr('Simpan pencarian ini')}</span>
    <svg class="ico sf-simpan-go" aria-hidden="true"><use href="#i-chev"/></svg>
  </button>`;

/* ── panel simpan & kelola ── */
export function bukaSimpanSaringan(kueri) {
  const q = String(kueri == null ? '' : kueri).trim();
  if (!q) { toast(tr('Ketik kata kunci dulu di kolom cari')); return; }
  openPop(sheet({
    ikon: 'i-bookmark',
    judul: tr('Simpan saringan'),
    catatan: esc(tr('Saringan menyimpan kata kunci pencarian agar bisa dipakai lagi dengan satu ketukan.')),
    isi: shField({
      id: 'sf-nama', ikon: 'i-filter', label: tr('Nama saringan'),
      value: namaPendek(q), placeholder: tr('Nama saringan'), maxlength: 40,
    }) + `<div class="sh-lab">${tr('Kata kunci')}</div>
      <div class="sf-cuplik"><svg class="ico" aria-hidden="true"><use href="#i-search"/></svg>
        <span>${esc(q)}</span></div>`,
    kaki: shAksi({ batal: tr('Batal'), tutup: true, utama: tr('Simpan'), utamaId: 'sf-simpan' }),
  }));
}

export function bukaKelolaSaringan() {
  const daftar = daftarSaringan();
  const baris = daftar.map(x => `<div class="sf-manage" data-sf-baris="${esc(x.id)}">
      <input class="sh-inp" type="text" maxlength="40" autocomplete="off"
        data-sf-nama-input="${esc(x.id)}" value="${esc(x.nama)}"
        aria-label="${tr('Nama saringan')}">
      <button type="button" class="sf-mini" data-sf-nama-simpan="${esc(x.id)}"
        title="${tr('Simpan nama')}" aria-label="${tr('Simpan nama')}">
        <svg class="ico"><use href="#i-check2"/></svg></button>
      <button type="button" class="sf-mini bahaya" data-sf-hapus="${esc(x.id)}"
        title="${tr('Hapus saringan')}" aria-label="${tr('Hapus saringan')}">
        <svg class="ico"><use href="#i-trash"/></svg></button>
      <div class="sf-manage-ket"><svg class="ico" aria-hidden="true"><use href="#i-search"/></svg>
        <span>${esc(x.kueri)}</span><b>${jumlahCocokSaringan(x.kueri)}</b></div>
    </div>`).join('');

  openPop(sheet({
    ikon: 'i-filter',
    judul: tr('Kelola saringan'),
    catatan: daftar.length ? esc(tr('Ubah nama atau hapus saringan. Ketuk chip di layar Catatan untuk memakainya.')) : '',
    isi: daftar.length ? baris : `<p class="sh-kosong">${tr('Belum ada saringan tersimpan')}</p>`,
    kaki: shAksi({ batal: tr('Tutup'), tutup: true }),
  }));
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
      const q = (document.querySelector('.sh .sf-cuplik')?.textContent || '').trim();
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
