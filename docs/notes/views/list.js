/* Layar beranda + daftar catatan.

   Catatan diarsipkan TIDAK tampil di sini (ada di layar Arsip), catatan
   yang dihapus ada di Sampah. Daftar utama bisa difilter per tag lewat
   chip tag (klik tag di mana pun = buka daftar dengan filter itu). */
import { state } from '../../core/store.js?v=20261025001200';
import { esc, tglHari } from '../../core/dom.js?v=20261025001200';
import { rowFor } from './row.js?v=20261025001200';
import { stt } from './data.js?v=20261025001200';
import { tagDariIsi } from '../tags.js?v=20261025001200';
import { urutkanCatatan, namaUrut, urutSekarang } from '../urut.js?v=20261025001200';
import { judulJurnalHari } from '../harian.js?v=20261025001200';
import { terlihat } from '../kunci.js?v=20261025001200';
import { daftarRuang, ruangAktif, modeTampilDaftar } from '../ruang.js?v=20261025001200';
import { t as tr } from '../../core/i18n.js?v=20261025001200';
import { renderSaringanBarHtml, saringCatatan, saringanAktif } from '../saringan.js?v=20261025001200';
import { renderKilasBalikHtml } from '../kilas-balik.js?v=20261025001200';

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
    <div class="trowe-wrap">
      <button type="button" class="tobox-btn" data-todo-cek="${esc(i.n.id)}" data-todo-bid="${esc(i.bid)}"
        title="${tr('Tandai selesai')}" aria-label="${tr('Tandai selesai')}">
        <svg viewBox="0 0 24 24"><path d="M4 12l5 5L20 6"/></svg>
      </button>
      <button class="row trowe" data-todo-lompat="${i.n.id}" data-todo-bid="${i.bid}"
        title="${tr('Buka di catatan')} «${esc(i.n.title || tr('Tanpa judul'))}»">
        <div class="row-b">
          <div class="row-t">${esc(i.teks)}</div>
          <div class="row-s">${esc(i.n.title || tr('Tanpa judul'))}</div>
        </div>
      </button>
    </div>`).join('')}
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
const kartu = (daftar, geser) => {
  const isGrid = geser === 'utama' && modeTampilDaftar() === 'grid';
  return `<div class="card${isGrid ? ' card-grid' : ''}">${daftar.map(n => rowFor(n, isGrid ? null : geser)).join('')}</div>`;
};

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

/* ── P3 · daftar bertahap (K34) ──
   Daftar utama tidak lagi merender semua baris sekaligus: hanya LANGKAH
   pertama yang masuk DOM. Baris berikutnya datang saat tombol "Muat lagi"
   ditekan, atau saat sentinel mendekati layar (pasangMuatLebih). Batas
   kembali ke LANGKAH setiap filter/urut/ruang/tampilan berubah.
   Pilih semua & hitungan memakai daftar penuh (idDaftarNotes), bukan DOM. */
export const LANGKAH_DAFTAR = 40;
let batasDaftar = LANGKAH_DAFTAR;
let kunciBatas = '';
let idDaftarPenuh = [];
let pengamatMuat = null;

/* id semua catatan di daftar utama yang sedang difilter (bukan hanya yang tampil) */
export const idDaftarNotes = () => idDaftarPenuh.slice();

/* tambah satu langkah baris — dipanggil pengamat / tombol Muat lagi */
export const tambahBatasDaftar = () => { batasDaftar += LANGKAH_DAFTAR; };

/* Pasang pengamat untuk sentinel "Muat lagi" (IntersectionObserver).
   `onMuat` menggambar ulang daftar. Tanpa IntersectionObserver (uji
   jsdom, peramban tua), tombol tetap bisa dipakai. */
export function pasangMuatLebih(onMuat) {
  if (pengamatMuat) { pengamatMuat.disconnect(); pengamatMuat = null; }
  const el = document.querySelector('[data-muat-lebih]');
  if (!el || typeof IntersectionObserver === 'undefined') return;
  pengamatMuat = new IntersectionObserver(entri => {
    if (!entri.some(x => x.isIntersecting)) return;
    if (pengamatMuat) { pengamatMuat.disconnect(); pengamatMuat = null; }
    onMuat();
  }, { root: document.getElementById('wrap'), rootMargin: '320px 0px' });
  pengamatMuat.observe(el);
}

export const notesView = () => {
  const semuaAktif = aktif();
  let daftar = semuaAktif;
  const rg = ruangAktif();
  if (rg) daftar = daftar.filter(n => n.folderId === rg);
  const tag = stt.tag;
  if (tag) daftar = daftar.filter(n => punyaTag(n, tag));
  daftar = saringCatatan(daftar);
  const sfAktif = saringanAktif();
  const diSampah = state.notes.filter(n => n.deletedAt).length;
  const ruangList = daftarRuang();
  const isGrid = modeTampilDaftar() === 'grid';

  const pin = urutkanCatatan(daftar.filter(n => n.pinned));
  const lain = urutkanCatatan(daftar.filter(n => !n.pinned));

  /* batas tampil: reset bila keadaan filter/urut/ruang/tampilan berubah */
  const kunci = JSON.stringify([rg || '', tag || '', sfAktif || null, urutSekarang(), modeTampilDaftar()]);
  if (kunci !== kunciBatas) { kunciBatas = kunci; batasDaftar = LANGKAH_DAFTAR; }
  idDaftarPenuh = [...pin, ...lain].map(n => n.id);
  const pinTampil = pin.slice(0, batasDaftar);
  const lainTampil = lain.slice(0, Math.max(0, batasDaftar - pin.length));
  const sisa = daftar.length - pinTampil.length - lainTampil.length;

  return `<div class="page">
  <div class="ruang-bar" role="tablist" aria-label="${tr('Ruang catatan')}">
    <button type="button" class="ruang-pill${!rg ? ' on' : ''}" data-ruang-pilih="">
      <span>${tr('Semua')}</span><span class="ruang-n">${semuaAktif.length}</span>
    </button>
    ${ruangList.map(r => {
      const jml = semuaAktif.filter(n => n.folderId === r.id).length;
      return `<button type="button" class="ruang-pill${rg === r.id ? ' on' : ''}" data-ruang-pilih="${esc(r.id)}">
        <span>${esc(r.nama)}</span><span class="ruang-n">${jml}</span>
      </button>`;
    }).join('')}
    <button type="button" class="ruang-pill ruang-add" data-ruang-tambah title="${tr('Buat ruang / folder baru')}">+ ${tr('Ruang')}</button>
  </div>
  ${renderSaringanBarHtml()}
  ${!semuaAktif.length && !tag && !sfAktif
    ? `<div class="empty" style="padding:30px 20px"><h3>${tr('Belum ada catatan')}</h3>
        <p>${tr('Catatan yang kamu tulis akan muncul di sini. Mulai dari yang pertama.')}</p>
        <button class="btn btn-pri" data-act2="new">${tr('Tulis catatan')}</button></div>`
    : ''}
  ${semuaAktif.length > 0 && !daftar.length && rg && !tag && !sfAktif
    ? `<div class="empty" style="padding:26px 20px"><h3>${tr('Ruang ini masih kosong')}</h3>
        <p>${tr('Buka catatan mana pun lalu pilih menu ··· → Pindahkan ke ruang, atau tulis catatan baru di sini.')}</p>
        <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
          <button class="btn btn-pri" data-act2="new">${tr('Tulis catatan')}</button>
          <button class="btn btn-sec" data-ruang-hapus="${esc(rg)}">${tr('Hapus ruang')}</button>
        </div></div>`
    : ''}
  ${tag ? `<div class="tf-bar">
      <svg class="ico" style="color:var(--accent);width:15px;height:15px;flex:none"><use href="#i-tag"/></svg>
      <span class="tf-t">#${esc(tag)}</span>
      <span class="chip chip-a" style="flex:none">${daftar.length}</span>
      <button type="button" class="tf-x" data-tag-x aria-label="${tr('Hapus filter tag')}"><svg class="ico"><use href="#i-x"/></svg></button>
    </div>`
    : ''}
  ${daftar.length === 0 && sfAktif && !tag
    ? `<div class="empty" style="padding:30px 20px"><h3>${tr('Tidak ada catatan untuk saringan ini')}</h3>
        <p>${tr('Coba kata kunci lain, atau hapus saringan supaya semua catatan tampil lagi.')}</p>
        <button class="btn btn-sec" data-sf-bersih>${tr('Hapus filter saringan')}</button></div>`
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
    <button type="button" class="urut-chip${isGrid ? ' on' : ''}" data-tampil-toggle
      title="${tr('Ganti tampilan Daftar / Kartu Grid')}">
      <svg class="ico"><use href="#i-list"/></svg>${isGrid ? tr('Grid') : tr('Daftar')}</button>
    <button type="button" class="urut-chip" data-buka-db title="${tr('Tabel properti & papan Kanban')}">
      <svg class="ico"><use href="#i-tpl"/></svg>${tr('Properti')}</button>
    <button type="button" class="urut-chip" data-buka-graf title="${tr('Peta jaringan catatan interaktif')}">
      <svg class="ico"><use href="#i-graph"/></svg>${tr('Graf')}</button>
    ${daftar.length && !isGrid ? `<button type="button" class="urut-chip" data-pilih-buka
      title="${tr('Pilih beberapa catatan — bisa juga dengan menahan satu baris')}">
      <svg class="ico"><use href="#i-check2"/></svg>${tr('Pilih')}</button>` : ''}
  </div>
  ${renderKilasBalikHtml(daftar)}
  ${pinTampil.length ? overline(tr('Disematkan')) + kartu(pinTampil, 'utama') : ''}
  ${lainTampil.length ? (pinTampil.length ? overline(tr('Lainnya')) : '') + kartu(lainTampil, 'utama') : ''}
  ${sisa > 0 ? `<div class="muat-lebih" data-muat-lebih>
    <button type="button" class="btn btn-sec" data-muat-tombol>${tr('Muat {n} lagi', { n: Math.min(sisa, LANGKAH_DAFTAR) })}</button>
    <span class="muat-n">${tr('{n} dari {t} ditampilkan', { n: daftar.length - sisa, t: daftar.length })}</span>
  </div>` : ''}
  <div class="list-foot">
    <span class="chip">${tr('semua {n}', { n: daftar.length })}</span>
    <span class="sep"></span>
    <button type="button" class="ft-btn" data-buka-stat title="${tr('Statistik menulis & heatmap aktivitas')}">
      <svg class="ico"><use href="#i-graph"/></svg>${tr('Statistik')}</button>
    <span class="sep"></span>
    <button type="button" class="ft-btn" data-go="trash" title="${tr('Catatan yang dihapus — otomatis dibuang setelah 30 hari')}">
      <svg class="ico"><use href="#i-trash"/></svg>${tr('Sampah')}${diSampah ? ' ' + diSampah : ''}</button>
  </div>
  </div>`;
};
