/* Menu "···" di header editor: aksi untuk catatan yang sedang dibuka.
   Isi mengikuti keadaan catatan (label Sematkan/Lepas, Arsipkan/
   Kembalikan). Aksi dijalankan lewat delegasi klik global di app.js
   dengan atribut data-note-act. */
import { state } from '../../core/store.js?v=20261030100000';
import { esc } from '../../core/dom.js?v=20261030100000';
import { punyaKunci, terbukaSesi } from '../kunci.js?v=20261030100000';
import { belajarAktif } from '../belajar-materi.js?v=20261030100000';
import { t as tr } from '../../core/i18n.js?v=20261030100000';

export function menuCatatan() {
  const n = state.notes.find(x => x.id === state.openId);
  if (!n) return `<div class="pop-h">${tr('Catatan')}</div>`;

  const judul = esc(n.title || tr('Tanpa judul'));
  const sedangTerbukaPin = punyaKunci(n) && terbukaSesi(n.id);
  /* P1: kendali baca pindah ke sini di layar sempit (tidak ada lagi baris
     A−/A+ di atas judul). Ketuk → menu ditutup, lalu aksinya dijalankan
     oleh penangan data-et (baca-plus.js / navigasi-fokus.js). */
  return `<div class="pop-h">${tr('Kendali baca')}</div>
  <button class="pop-i" data-et="kecil" data-pop-baca>
    <span class="pop-ab" aria-hidden="true">A−</span>${tr('Perkecil teks bacaan')}</button>
  <button class="pop-i" data-et="besar" data-pop-baca>
    <span class="pop-ab" aria-hidden="true">A+</span>${tr('Perbesar teks bacaan')}</button>
  <button class="pop-i" data-et="cari" data-pop-baca>
    <svg class="ico"><use href="#i-search"/></svg>${tr('Cari di dalam catatan')}</button>
  <button class="pop-i" data-et="ganti" data-pop-baca>
    <svg class="ico"><use href="#i-rename"/></svg>${tr('Cari & ganti')}</button>
  <button class="pop-i" data-et="dafis" data-pop-baca>
    <svg class="ico"><use href="#i-list"/></svg>${tr('Daftar isi — lompat ke heading')}</button>
  <button class="pop-i" data-et="fokus-tulis" data-pop-baca>
    <svg class="ico"><use href="#i-target"/></svg>${tr('Mode fokus menulis & target kata')}</button>
  <button class="pop-i" data-et="zen" data-pop-baca>
    <svg class="ico"><use href="#i-zen"/></svg>${tr('Mode fokus — sembunyikan semua kecuali catatan')}</button>
  <div class="pop-h">${tr('Aksi catatan')}</div>
  <p class="pop-note">${judul}</p>
  <button class="pop-i" data-note-act="pin">
    <svg class="ico"><use href="#i-pin"/></svg>${n.pinned ? tr('Lepas sematan') : tr('Sematkan')}</button>
  <button class="pop-i" data-note-act="sampul">
    <svg class="ico"><use href="#i-drop"/></svg>${tr('Sampul catatan…')}</button>
  <button class="pop-i" data-note-act="kertas">
    <svg class="ico"><use href="#i-note"/></svg>${tr('Latar kertas…')}</button>
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
  <button class="pop-i" data-note-act="belajar" aria-pressed="${belajarAktif() ? 'true' : 'false'}">
    <svg class="ico"><use href="#i-book"/></svg>${tr('Mode belajar: materi dan catatan')}</button>
  <button class="pop-i" data-note-act="cetak">
    <svg class="ico"><use href="#i-print"/></svg>${tr('Cetak / PDF…')}</button>
  <button class="pop-i" data-note-act="tpl">
    <svg class="ico"><use href="#i-copy"/></svg>${tr('Simpan sebagai templat…')}</button>
  <button class="pop-i" data-note-act="remind">
    <svg class="ico"><use href="#i-bell"/></svg>${tr('Jadikan pengingat')}</button>
  <button class="pop-i pop-danger" data-note-act="hapus">
    <svg class="ico"><use href="#i-trash"/></svg>${tr('Hapus — masuk sampah dulu')}</button>`;
}
