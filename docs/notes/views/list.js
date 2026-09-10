/* Layar beranda + daftar catatan.

   Catatan diarsipkan TIDAK tampil di sini (ada di layar Arsip), catatan
   yang dihapus ada di Sampah. Daftar utama bisa difilter per tag lewat
   chip tag (klik tag di mana pun = buka daftar dengan filter itu). */
import { state } from '../../core/store.js?v=20260910030412';
import { esc, tglHari } from '../../core/dom.js?v=20260910030412';
import { rowFor } from './row.js?v=20260910030412';
import { stt } from './data.js?v=20260910030412';
import { tagDariIsi } from '../tags.js?v=20260910030412';
import { urutkanCatatan, namaUrut, urutSekarang } from '../urut.js?v=20260910030412';
import { judulJurnalHari } from '../harian.js?v=20260910030412';
import { terlihat } from '../kunci.js?v=20260910030412';
import { t as tr } from '../../core/i18n.js?v=20260910030412';

/* ── "Belum selesai": kumpulan todo yang belum dicentang dari semua
   catatan aktif. Satu ketukan lompat ke catatan & bloknya. ── */
function teksPolos(html) {
  return (html || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/[\u200b\u00a0]/g, ' ').replace(/\s+/g, ' ').trim();
}
const TODO_MAKS = 150;   /* batas tampil — sisanya tetap ada di catatannya */

export const belumSelesai = daftar =>
  daftar.filter(n => terlihat(n))
  .map(n => ({
    n,
    items: (n.blocks || [])
      .filter(b => b.type === 'todo' && !(b.meta && b.meta.checked))
      .map(b => ({ bid: b.id, teks: teksPolos(b.content) }))
      .filter(x => x.teks),
  }))
  .filter(x => x.items.length)
  .sort((a, b) => b.n.updatedAt - a.n.updatedAt)
  .slice(0, 12)
  .flatMap(x => x.items.slice(0, TODO_MAKS).map(i => ({ n: x.n, ...i })));

const kartuTodo = daftar =>
  `<div class="sec" style="margin-top:6px"><h2>${tr('Belum selesai')}</h2></div>
  <div class="card">${daftar.map(i => `
    <button class="row trowe" data-todo-lompat="${i.n.id}" data-todo-bid="${i.bid}"
      title="${tr('Buka di catatan')} «${esc(i.n.title || tr('Tanpa judul'))}»">
      <span class="tobox" aria-hidden="true"></span>
      <div class="row-b">
        <div class="row-t">${esc(i.teks)}</div>
        <div class="row-s">${esc(i.n.title || tr('Tanpa judul'))}</div>
      </div>
    </button>`).join('')}
  </div>`;

/* Catatan yang muncul di daftar utama: belum diarsip & belum dihapus. */
const aktif = () => state.notes.filter(n => !n.archived && !n.deletedAt);

/* cache tag + tag turunan dari isi — filter tidak pernah ketinggalan.
   Untuk catatan terkunci yang belum dibuka di sesi ini, isi tidak
   dibaca: cukup cache `tags`-nya (catatan dikunci setelah tag ditulis,
   jadi cache-nya sudah akurat; isi tetap tak tersentuh). */
function punyaTag(n, tag) {
  const t = tag.toLowerCase();
  if ((n.tags || []).some(x => x.toLowerCase() === t)) return true;
  if (!terlihat(n)) return false;
  return tagDariIsi(n).some(x => x.toLowerCase() === t);
}

const overline = teks => `<div class="overline" style="margin:0 0 8px">${teks}</div>`;

/* `geser`: baris di daftar penuh (catatan / arsip) mendapat aksi sapuan
   D21; beranda & hasil cari memakai baris polos. */
const kartu = (daftar, geser) =>
  `<div class="card">${daftar.map(n => rowFor(n, geser)).join('')}</div>`;

export const homeView = () => {
  const daftar = aktif();
  /* yang disemat selalu menang di beranda, sisanya ikut pilihan urut */
  const urut = a => urutkanCatatan(a);
  const terbaru = [...urut(daftar.filter(n => n.pinned)),
                   ...urut(daftar.filter(n => !n.pinned))].slice(0, 4);
  return `<div class="page">
  <div class="hello"><div class="d">${tglHari()}</div>
  <div class="s">${daftar.length ? tr('{n} catatan tersimpan.', { n: daftar.length }) : tr('Belum ada apa-apa.')}</div></div>
  <button type="button" class="btn btn-sec jurnal-btn" data-jurnal-hari title="${tr('Catatan harian untuk hari ini')}">
    <svg class="ico"><use href="#i-cal"/></svg>${tr('Catatan hari ini')} · ${esc(judulJurnalHari())}</button>
  <div class="sec"><h2>${tr('Catatan')}</h2></div>
  ${daftar.length ? kartu(terbaru)
   : `<div class="empty" style="padding:40px 20px"><h3>${tr('Belum ada catatan')}</h3>
     <p>${tr('Ketuk tombol + untuk menulis yang pertama.')}</p>
     <button class="btn btn-pri" data-act2="new">${tr('Tulis catatan')}</button></div>`}
</div>`;
};

export const notesView = () => {
  let daftar = aktif();
  const tag = stt.tag;
  if (tag) daftar = daftar.filter(n => punyaTag(n, tag));
  const diSampah = state.notes.filter(n => n.deletedAt).length;

  const pin = urutkanCatatan(daftar.filter(n => n.pinned));
  const lain = urutkanCatatan(daftar.filter(n => !n.pinned));

  return `<div class="page">
  ${!daftar.length && !tag
    ? `<div class="empty" style="padding:30px 20px"><h3>${tr('Belum ada catatan')}</h3>
        <p>${tr('Catatan yang kamu tulis akan muncul di sini. Mulai dari yang pertama.')}</p>
        <button class="btn btn-pri" data-act2="new">${tr('Tulis catatan')}</button></div>`
    : ''}
  ${tag ? `<div class="tf-bar">
      <svg class="ico" style="color:var(--accent);width:15px;height:15px;flex:none"><use href="#i-tag"/></svg>
      <span class="tf-t">#${esc(tag)}</span>
      <span class="chip chip-a" style="flex:none">${daftar.length}</span>
      <button type="button" class="tf-x" data-tag-x aria-label="${tr('Hapus filter tag')}"><svg class="ico"><use href="#i-x"/></svg></button>
    </div>`
    : ''}
  ${daftar.length === 0 && tag
    ? `<div class="empty" style="padding:30px 20px"><h3>${tr('Tidak ada catatan ber-tag ini')}</h3>
        <p>${tr('Tulis #{tag} di catatan mana pun — chip tag di baris daftar menyinkronkannya otomatis.', { tag: esc(tag) })}</p>
        <button class="btn btn-sec" data-act2="new">${tr('Tulis catatan')}</button></div>`
    : ''}
  ${(() => { const t = belumSelesai(daftar); return t.length ? kartuTodo(t) : ''; })()}
  <div class="list-bar">
    <button type="button" class="urut-chip" data-urut-buka aria-haspopup="menu"
      title="${tr('Urutkan daftar catatan')}"><svg class="ico"><use href="#i-sort"/></svg>${tr('Urut:')}
      <b>${esc(namaUrut(urutSekarang()))}</b></button>
  </div>
  ${pin.length ? overline(tr('Disematkan')) + kartu(pin, 'utama') : ''}
  ${lain.length ? (pin.length ? overline(tr('Lainnya')) : '') + kartu(lain, 'utama') : ''}
  <div class="list-foot">
    <span class="chip">${tr('semua {n}', { n: daftar.length })}</span>
    <span class="sep"></span>
    <button type="button" class="ft-btn" data-go="trash" title="${tr('Catatan yang dihapus — otomatis dibuang setelah 30 hari')}">
      <svg class="ico"><use href="#i-trash"/></svg>${tr('Sampah')}${diSampah ? ' ' + diSampah : ''}</button>
  </div>
  </div>`;
};
