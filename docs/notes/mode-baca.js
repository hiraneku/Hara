/* Mode baca / mode tulis (seperti Obsidian) untuk catatan.

   Mode baca membuat isi catatan tidak bisa disunting: bar mekanik
   disembunyikan, judul & properti dibaca saja, gagang blok hilang.
   Mode tulis mengembalikan semuanya. Mode disimpan per pemakaian
   (localStorage) dan berlaku untuk semua catatan.

   Catatan SAMBUTAN (welcome) bersifat global & terkunci: ia selalu
   tampil dalam mode baca, tombol ganti mode disembunyikan, dan isinya
   hanya bisa diubah oleh aplikasi itu sendiri (sinkron lewat welcomeV
   di core/store.js). Penghapusan oleh pengguna tetap dibolehkan. */

import { state } from '../core/store.js?v=20260908031211';
import { cur } from '../core/router.js?v=20260908031211';
import { docEl } from './editor/caret.js?v=20260908031211';

const KUNCI = 'hara.v1.baca';
let _baca = false;
try { _baca = localStorage.getItem(KUNCI) === '1'; } catch (e) { /* privat */ }

/* Catatan sistem yang tidak boleh disunting siapa pun — kecuali
   pemiliknya (aplikasi). Pengguna tetap boleh menghapusnya. */
export const catatanTerkunci = n => !!(n && n.welcome && !n.deletedAt);

const catatanBuka = () => state.notes.find(x => x.id === state.openId);

/* Mode baca yang berlaku untuk catatan yang sedang dibuka. */
export const modeBacaBerlaku = () => catatanTerkunci(catatanBuka()) ? true : _baca;

export function setModeBaca(b) {
  _baca = !!b;
  try { localStorage.setItem(KUNCI, _baca ? '1' : '0'); } catch (e) { /* privat */ }
  sinkronModeBaca();
}

export const toggleModeBaca = () => setModeBaca(!modeBacaBerlaku());

/* Terapkan mode ke DOM editor yang sedang tampil. Dipanggil setiap kali
   layar editor selesai digambar dan setiap kali mode diubah. */
export function sinkronModeBaca() {
  const ed = document.querySelector('.ed');
  const btn = document.getElementById('mode');
  const mech = document.getElementById('mech');
  if (!ed) { if (btn) btn.style.display = 'none'; return; }

  const n = catatanBuka();
  const terkunci = catatanTerkunci(n);
  const baca = terkunci || _baca;

  ed.classList.toggle('baca', baca);

  const d = docEl();
  if (d) d.setAttribute('contenteditable', String(!baca));

  const judul = ed.querySelector('.ed-t');
  if (judul) judul.readOnly = baca;

  if (mech) mech.classList.toggle('on', cur === 'editor' && !baca);

  /* tombol ganti mode: hanya untuk catatan yang bisa disunting */
  if (btn) {
    const tampil = cur === 'editor' && !terkunci;
    btn.style.display = tampil ? 'grid' : 'none';
    const use = btn.querySelector('use');
    if (use) use.setAttribute('href', baca ? '#i-pen' : '#i-book');
    const label = terkunci
      ? 'Catatan sambutan — dibaca saja'
      : (baca ? 'Ubah catatan (mode tulis)' : 'Baca (mode baca)');
    btn.title = label;
    btn.setAttribute('aria-label', label);
  }

  /* di mode baca kursor tidak boleh menempel di isi catatan */
  if (baca && d) {
    const s = window.getSelection();
    if (s && s.rangeCount && d.contains(s.getRangeAt(0).startContainer)) {
      try { s.removeAllRanges(); } catch (e) { /* tua */ }
    }
    if (d.blur) d.blur();
  }
}
