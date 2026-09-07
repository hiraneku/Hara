/* Layar beranda + daftar catatan.

   Catatan diarsipkan TIDAK tampil di sini (ada di layar Arsip), catatan
   yang dihapus ada di Sampah. Daftar utama bisa difilter per tag lewat
   chip tag (klik tag di mana pun = buka daftar dengan filter itu). */
import { state } from '../../core/store.js?v=20260907100318';
import { esc, tglHari } from '../../core/dom.js?v=20260907100318';
import { rowFor } from './row.js?v=20260907100318';
import { stt } from './data.js?v=20260907100318';
import { tagDariIsi } from '../tags.js?v=20260907100318';

/* Catatan yang muncul di daftar utama: belum diarsip & belum dihapus. */
const aktif = () => state.notes.filter(n => !n.archived && !n.deletedAt);

/* cache tag + tag turunan dari isi — filter tidak pernah ketinggalan */
function punyaTag(n, tag) {
  const t = tag.toLowerCase();
  if ((n.tags || []).some(x => x.toLowerCase() === t)) return true;
  return tagDariIsi(n).some(x => x.toLowerCase() === t);
}

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
  let daftar = aktif();
  const tag = stt.tag;
  if (tag) daftar = daftar.filter(n => punyaTag(n, tag));
  const diSampah = state.notes.filter(n => n.deletedAt).length;

  const pin = daftar.filter(n => n.pinned);
  const lain = daftar.filter(n => !n.pinned);

  return `<div class="page">
  ${!daftar.length && !tag
    ? `<div class="empty" style="padding:30px 20px"><h3>Belum ada catatan</h3>
        <p>Catatan yang kamu tulis akan muncul di sini. Mulai dari yang pertama.</p>
        <button class="btn btn-pri" data-act2="new">Tulis catatan</button></div>`
    : ''}
  ${tag ? `<div class="tf-bar">
      <svg class="ico" style="color:var(--accent);width:15px;height:15px;flex:none"><use href="#i-tag"/></svg>
      <span class="tf-t">#${esc(tag)}</span>
      <span class="chip chip-a" style="flex:none">${daftar.length}</span>
      <button type="button" class="tf-x" data-tag-x aria-label="Hapus filter tag"><svg class="ico"><use href="#i-x"/></svg></button>
    </div>`
    : ''}
  ${daftar.length === 0 && tag
    ? `<div class="empty" style="padding:30px 20px"><h3>Tidak ada catatan ber-tag ini</h3>
        <p>Tulis #${esc(tag)} di catatan mana pun — chip tag di baris daftar menyinkronkannya otomatis.</p>
        <button class="btn btn-sec" data-act2="new">Tulis catatan</button></div>`
    : ''}
  ${pin.length ? overline('Disematkan') + kartu(pin) : ''}
  ${lain.length ? (pin.length ? overline('Lainnya') : '') + kartu(lain) : ''}
  <div class="list-foot">
    <span class="chip">semua ${daftar.length}</span>
    <span class="sep"></span>
    <button type="button" class="ft-btn" data-go="trash" title="Catatan yang dihapus — otomatis dibuang setelah 30 hari">
      <svg class="ico"><use href="#i-trash"/></svg>Sampah${diSampah ? ' ' + diSampah : ''}</button>
  </div>
  </div>`;
};
