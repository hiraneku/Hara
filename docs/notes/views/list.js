/* Layar beranda + daftar catatan. */
import { state } from '../../core/store.js?v=20260907035221';
import { rowFor } from './row.js?v=20260907035221';

export const homeView = () => `<div class="page">
  <div class="hello"><div class="d">Sabtu, 6 September</div>
  <div class="s">${state.notes.length ? state.notes.length + ' catatan tersimpan. Tanpa pengingat hari ini.' : 'Belum ada apa-apa.'}</div></div>
  <div class="sec"><h2>Catatan</h2></div>
  ${state.notes.length ? `<div class="card">${state.notes.map(rowFor).join('')}</div>`
   : `<div class="empty" style="padding:40px 20px"><h3>Belum ada catatan</h3>
     <p>Ketuk tombol + untuk menulis yang pertama.</p>
     <button class="btn btn-pri" data-act2="new">Tulis catatan</button></div>`}
</div>`;

export const notesView = () => `<div class="page">
  ${state.notes.length ? `<div class="card">${state.notes.map(rowFor).join('')}</div>
   <div style="margin-top:16px"><span class="chip chip-a">semua ${state.notes.length}</span></div>`
  : `<div class="empty"><h3>Belum ada catatan</h3>
    <p>Catatan yang kamu tulis akan muncul di sini. Mulai dari yang pertama.</p>
    <button class="btn btn-pri" data-act2="new">Tulis catatan</button></div>`}
</div>`;
