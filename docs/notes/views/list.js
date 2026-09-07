/* Layar beranda + daftar catatan.

   Catatan diarsipkan TIDAK tampil di sini (ada di layar Arsip).
   Catatan disematkan dikelompokkan di atas dengan overline DISEMATKAN. */
import { state } from '../../core/store.js?v=20260907052638';
import { tglHari } from '../../core/dom.js?v=20260907052638';
import { rowFor } from './row.js?v=20260907052638';

const aktif = () => state.notes.filter(n => !n.archived);

const overline = teks => `<div class="overline" style="margin:0 0 8px">${teks}</div>`;

const kartu = daftar => `<div class="card">${daftar.map(rowFor).join('')}</div>`;

export const homeView = () => {
  const daftar = aktif();
  const terbaru = [...daftar].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4);
  return `<div class="page">
  <div class="hello"><div class="d">${tglHari()}</div>
  <div class="s">${daftar.length ? daftar.length + ' catatan tersimpan.' : 'Belum ada apa-apa.'}</div></div>
  <div class="sec"><h2>Catatan</h2></div>
  ${daftar.length ? kartu(terbaru)
   : `<div class="empty" style="padding:40px 20px"><h3>Belum ada catatan</h3>
     <p>Ketuk tombol + untuk menulis yang pertama.</p>
     <button class="btn btn-pri" data-act2="new">Tulis catatan</button></div>`}
</div>`;
};

export const notesView = () => {
  const daftar = aktif();
  if (!daftar.length)
    return `<div class="page">
      <div class="empty"><h3>Belum ada catatan</h3>
        <p>Catatan yang kamu tulis akan muncul di sini. Mulai dari yang pertama.</p>
        <button class="btn btn-pri" data-act2="new">Tulis catatan</button></div></div>`;

  const pin = daftar.filter(n => n.pinned);
  const lain = daftar.filter(n => !n.pinned);
  return `<div class="page">
  ${pin.length ? overline('Disematkan') + kartu(pin) : ''}
  ${lain.length ? (pin.length ? overline('Lainnya') : '') + kartu(lain) : ''}
  <div style="margin-top:16px"><span class="chip chip-a">semua ${daftar.length}</span></div>
  </div>`;
};
