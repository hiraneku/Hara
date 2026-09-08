/* Layar pendukung modul catatan: cari, tag, sampah, arsip, pengaturan.
   Reminder & Tugas masih menunggu modulnya sendiri (tools/reminder,
   tools/tasks) — tombolnya bilang jujur, tidak pura-pura bekerja. */
import { state } from '../../core/store.js?v=20260908152800';
import { esc, stamp } from '../../core/dom.js?v=20260908152800';
import { rowFor } from './row.js?v=20260908152800';
import { plainText } from '../note-model.js?v=20260908152800';
import { semuaTag } from '../tags.js?v=20260908152800';
import { AK, akSekarang } from '../../core/theme.js?v=20260908152800';
import { tandaTag, WARNA_TAG } from '../label.js?v=20260908152800';

/* ── Cari: membaca data nyata (judul + isi + tag) ── */
export function renderHasilCari(q) {
  const w = document.getElementById('cari-hasil');
  if (!w) return;
  q = (q || '').trim();
  if (!q) {
    w.innerHTML = '<p class="dm-kosong" style="padding:6px 2px">Ketik kata kunci untuk mencari di judul, isi, dan tag.</p>';
    return;
  }
  const tagSaja = /^#/.test(q);
  const kata = (tagSaja ? q.slice(1) : q).toLowerCase().split(/\s+/).filter(Boolean);
  let daftar = state.notes.filter(n => !n.deletedAt);
  daftar = daftar.filter(n => {
    if (tagSaja)
      return kata.every(k => (n.tags || []).some(t => t.toLowerCase().includes(k)));
    const teks = `${n.title || ''} ${(n.tags || []).join(' ')} ${plainText(n)}`.toLowerCase();
    return kata.every(k => teks.includes(k));
  });
  daftar.sort((a, b) => b.updatedAt - a.updatedAt);
  const hasil = daftar.slice(0, 40);
  if (!hasil.length) {
    w.innerHTML = `<p class="dm-kosong" style="padding:6px 2px">Tidak ada yang cocok dengan “${esc(q)}”.</p>`;
    return;
  }
  w.innerHTML = `<div class="overline" style="margin:2px 2px 8px">${hasil.length} hasil${daftar.length > hasil.length ? ' dari ' + daftar.length : ''}</div>
    <div class="card">${hasil.map(rowFor).join('')}</div>`;
}

export const miscViews = {

rem:()=>`<div class="page"><div class="empty"><h3>Belum ada pengingat</h3>
  <p>Pengingat akan jadi modul terpisah (tools/reminder) — belum dibuat di prototipe ini.</p>
  <button class="btn btn-pri" data-act="Modul Reminder menyusul">Buat pengingat</button></div></div>`,

task:()=>`<div class="page"><div class="empty"><h3>Belum ada tugas</h3>
  <p>Tugas akan jadi modul terpisah (tools/tasks) — belum dibuat di prototipe ini.</p>
  <button class="btn btn-pri" data-act="Modul Tugas menyusul">Buat tugas</button></div></div>`,

search:()=>`<div class="page">
  <div style="display:flex;align-items:center;gap:10px;background:var(--sunken);border-radius:var(--r-md);
    padding:0 13px;height:44px;margin-bottom:20px">
    <svg class="ico" style="color:var(--faint)"><use href="#i-search"/></svg>
    <input id="cari-in" placeholder="Cari di judul, isi, dan tag" autocomplete="off"
      aria-label="Cari catatan"
      style="flex:1;border:none;background:none;outline:none;font-size:15px"></div>
  <div id="cari-hasil"><p class="dm-kosong" style="padding:6px 2px">Ketik kata kunci untuk mencari di judul, isi, dan tag.</p></div>
  <p class="note" style="padding:20px 2px 0">Pencarian membaca data asli: semua kata harus cocok (judul, isi, atau tag). Tag juga bisa dicari lewat chip # di baris daftar.</p></div>`,

tags:()=>{
  const sem = semuaTag();
  if (!sem.length)
    return `<div class="page"><div class="empty"><h3>Belum ada tag</h3>
      <p>Tag adalah <span class="tg">#kata</span> di dalam catatan. Begitu ada, tag muncul di sini dan di chip baris daftar.</p></div></div>`;
  const baris = sem.map(t => {
    const pemakai = state.notes.filter(n => !n.deletedAt && (n.tags || []).includes(t.nama))
      .slice(0, 2).map(n => n.title).filter(Boolean);
    const ket = `${t.jumlah} catatan` + (pemakai.length ? ' · ' + pemakai.join(' · ') : '');
    return `<button class="row" data-tag="${esc(t.nama)}">
      <span class="tag-dot" data-tt="${tandaTag(t.nama)}" style="--lc:${WARNA_TAG[tandaTag(t.nama)]}"></span>
      <div class="row-b"><div class="row-t">#${esc(t.nama)}</div>
      <div class="row-s" style="white-space:normal;line-height:1.45">${esc(ket)}</div></div>
      <span class="row-m">${t.jumlah}</span></button>`;
  }).join('');
  return `<div class="page">
    <div class="overline" style="margin:0 0 8px">Semua tag</div>
    <div class="card">${baris}</div>
    <p class="note" style="padding:20px 2px 0">Klik tag untuk memfilter daftar catatan. Tag muncul otomatis dari <span class="tg">#tag</span> di isi — tidak perlu dikelola manual.</p></div>`;
},

arsip:()=>{
  const a = state.notes.filter(n => n.archived && !n.deletedAt);
  return `<div class="page">
    ${a.length
      ? `<div class="card">${a.map(rowFor).join('')}</div>
         <p class="note">Buka catatan lalu pilih "Kembalikan dari arsip" (menu ···) untuk memindahkannya kembali ke daftar utama.</p>`
      : `<div class="empty"><h3>Arsip kosong</h3>
         <p>Catatan yang diarsipkan hilang dari daftar utama tapi tetap tersimpan di sini dan bisa dikembalikan.</p></div>`}
  </div>`;
},

/* Tempat sampah: soft delete 30 hari. Pulihkan kapan pun; hapus permanen
   butuh dua ketukan ("Hapus" lalu "Yakin?") dalam 3,5 detik. */
trash:()=>{
  const s = state.notes.filter(n => n.deletedAt)
    .sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
  if (!s.length)
    return `<div class="page"><div class="empty"><h3>Sampah kosong</h3>
      <p>Catatan yang dihapus menunggu di sini selama 30 hari sebelum dibuang otomatis — siapa tahu masih dibutuhkan.</p></div></div>`;
  const baris = s.map(n => `
    <div class="row" style="min-height:0;padding:11px 16px">
      <div class="row-b"><div class="row-t"${n.title ? '' : ' style="color:var(--faint)"'}>${esc(n.title) || 'Tanpa judul'}</div>
        <div class="row-s">Dihapus ${stamp(n.deletedAt)}</div></div>
      <button type="button" class="btn btn-sec" style="height:32px;font-size:12.5px;flex:none"
        data-pulih="${n.id}">Pulihkan</button>
      <button type="button" class="btn btn-sec btn-danger" style="height:32px;font-size:12.5px;flex:none"
        data-putus="${n.id}" data-putus-judul="${esc(n.title || 'Tanpa judul')}">Hapus</button>
    </div>`).join('');
  return `<div class="page">
    <div class="overline" style="margin:0 0 8px">Tempat sampah · ${s.length}</div>
    <div class="card">${baris}</div>
    <p class="note" style="padding:20px 2px 0">Catatan di sini dibuang otomatis setelah 30 hari. "Hapus" butuh dua ketukan supaya tidak ada yang terhapus permanen tanpa sengaja.</p>
  </div>`;
},

set:()=>{ const akPilih = akSekarang() || '';
  const swAksen = AK.map(a =>
    `<button type="button" class="ak-dot${(a.k || '') === akPilih ? ' on' : ''}"
       data-ak="${a.k || ''}" aria-pressed="${(a.k || '') === akPilih}"
       title="${esc(a.nama)}" aria-label="${esc(a.nama)}" style="--w:${a.w}"></button>`).join('');
  return `<div class="page">
  <div class="sec"><h2>Tampilan</h2></div>
  <div class="card" style="margin-bottom:24px">
    <div class="row"><div class="row-b"><div class="row-t">Tema</div><div class="row-s">Sekarang <span id="tema-st">…</span></div></div>
      <button type="button" class="btn btn-sec" data-toggle-tema>Ganti</button></div>
    <div class="row"><div class="row-b"><div class="row-t">Getar saat menekan tombol</div>
      <div class="row-s">Umpan balik singkat di perangkat yang mendukung</div></div>
      <button class="sw" data-getar role="switch"><span></span></button></div>
    <div class="row" style="flex-wrap:wrap;gap:8px 0">
      <div class="row-b"><div class="row-t">Warna aksen</div>
        <div class="row-s">Tombol utama, sorotan, dan tanda aktif</div></div>
      <div class="aksen" role="group" aria-label="Warna aksen">${swAksen}</div></div>
  </div>
  <div class="sec"><h2>Isi bar mekanik</h2></div>
  <div class="card" style="margin-bottom:24px" id="bar-prefs"></div>
  <p class="note">Undo dan Redo selalu tampil — tanpa keduanya kesalahan ketik tak bisa dibatalkan.</p>
  <div class="sec"><h2>Data</h2></div>
  <div class="card">
    <div class="row"><div class="row-b"><div class="row-t">Impor</div>
      <div class="row-s">Cadangan JSON Hara (termasuk gambar) · berkas .md · .zip markdown</div></div>
      <button type="button" class="btn btn-sec" data-impor>Pilih berkas…</button></div>
    <div class="row"><div class="row-b"><div class="row-t">Ekspor cadangan JSON</div>
      <div class="row-s">Semua catatan (sampah & arsip ikut) + gambar — bisa dipulihkan utuh kapan pun</div></div>
      <button type="button" class="btn btn-sec" data-ekspor="json">JSON</button></div>
    <div class="row"><div class="row-b"><div class="row-t">Ekspor Markdown</div>
      <div class="row-s">Satu berkas .md per catatan (frontmatter + wikilink utuh) dalam .zip — siap dibaca Obsidian</div></div>
      <button type="button" class="btn btn-sec" data-ekspor="md">Markdown</button></div>
    <div class="row"><div class="row-b"><div class="row-t">Penyimpanan</div>
      <div class="row-s" id="ruang">menghitung…</div></div></div>
  </div>
  <input type="file" id="impor-in" hidden
    accept=".json,.md,.markdown,.txt,.zip,application/json,text/markdown,application/zip">
  <p class="note" style="padding:20px 0 0">Keluar-masuk kapan saja: cadangan JSON untuk memulihkan semua persis, Markdown untuk berpindah ke aplikasi lain tanpa kehilangan isi. Gambar ikut dalam cadangan JSON; ekspor Markdown hanya membawa teks.</p></div>`}};
