/* Menu "···" di header editor: aksi untuk catatan yang sedang dibuka.
   Isi mengikuti keadaan catatan (label Sematkan/Lepas, Arsipkan/
   Kembalikan). Aksi dijalankan lewat delegasi klik global di app.js
   dengan atribut data-note-act. */
import { state } from '../../core/store.js?v=20261024003448';
import { esc } from '../../core/dom.js?v=20261024003448';
import { punyaKunci, terbukaSesi } from '../kunci.js?v=20261024003448';
import { t as tr } from '../../core/i18n.js?v=20261024003448';

export function menuCatatan() {
  const n = state.notes.find(x => x.id === state.openId);
  if (!n) return `<div class="pop-h">${tr('Catatan')}</div>`;

  const judul = esc(n.title || tr('Tanpa judul'));
  const sedangTerbukaPin = punyaKunci(n) && terbukaSesi(n.id);
  return `<div class="pop-h">${tr('Aksi catatan')}</div>
  <p class="pop-note">${judul}</p>
  <button class="pop-i" data-note-act="pin">
    <svg class="ico"><use href="#i-pin"/></svg>${n.pinned ? tr('Lepas sematan') : tr('Sematkan')}</button>
  <button class="pop-i" data-note-act="sampul">
    <svg class="ico"><use href="#i-drop"/></svg>${tr('Sampul catatan…')}</button>
  <button class="pop-i" data-note-act="ruang">
    <svg class="ico"><use href="#i-arch"/></svg>${tr('Pindahkan ke ruang…')}</button>
  <button class="pop-i" data-note-act="arsip">
    <svg class="ico"><use href="#i-arch"/></svg>${n.archived ? tr('Kembalikan dari arsip') : tr('Arsipkan')}</button>
  <button class="pop-i" data-note-act="duplikat">
    <svg class="ico"><use href="#i-copy"/></svg>${tr('Duplikat')}</button>
  ${sedangTerbukaPin ? `<button class="pop-i" data-note-act="kunci-ulang">
    <svg class="ico"><use href="#i-lock"/></svg>${tr('Kunci lagi sekarang')}</button>` : ''}
  <button class="pop-i" data-note-act="kunci">
    <svg class="ico"><use href="#i-lock"/></svg>${punyaKunci(n) ? tr('Ganti / buka kunci') : tr('Kunci catatan…')}</button>
  <button class="pop-i" data-note-act="ekspor">
    <svg class="ico"><use href="#i-dl"/></svg>${tr('Ekspor .md')}</button>
  <button class="pop-i" data-note-act="bagi">
    <svg class="ico"><use href="#i-share"/></svg>${tr('Bagikan / salin…')}</button>
  <button class="pop-i" data-note-act="kartu-gambar">
    <svg class="ico"><use href="#i-img"/></svg>${tr('Kartu gambar & HTML…')}</button>
  <button class="pop-i" data-note-act="cari-ganti">
    <svg class="ico"><use href="#i-search"/></svg>${tr('Cari & ganti')}</button>
  <button class="pop-i" data-note-act="info">
    <svg class="ico"><use href="#i-info"/></svg>${tr('Info catatan')}</button>
  <button class="pop-i" data-note-act="reset-todo">
    <svg class="ico"><use href="#i-check2"/></svg>${tr('Reset semua centang To-do')}</button>
  <button class="pop-i" data-note-act="tts">
    <svg class="ico"><use href="#i-bulb"/></svg>${tr('Baca keras (TTS)')}</button>
  <button class="pop-i" data-note-act="tenggat-tugas">
    <svg class="ico"><use href="#i-check2"/></svg>${tr('Ubah baris bertenggat jadi tugas')}</button>
  <button class="pop-i" data-note-act="versi">
    <svg class="ico"><use href="#i-undo"/></svg>${tr('Riwayat versi lokal…')}</button>
  <button class="pop-i" data-note-act="cetak">
    <svg class="ico"><use href="#i-print"/></svg>${tr('Cetak / PDF…')}</button>
  <button class="pop-i" data-note-act="tpl">
    <svg class="ico"><use href="#i-copy"/></svg>${tr('Simpan sebagai templat…')}</button>
  <button class="pop-i" data-note-act="remind">
    <svg class="ico"><use href="#i-bell"/></svg>${tr('Jadikan pengingat')}</button>
  <button class="pop-i pop-danger" data-note-act="hapus">
    <svg class="ico"><use href="#i-trash"/></svg>${tr('Hapus — masuk sampah dulu')}</button>`;
}
