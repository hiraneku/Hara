/* Layar pendukung modul catatan: cari, tag, sampah, arsip, pengaturan.
   Reminder & Tugas masih menunggu modulnya sendiri (tools/reminder,
   tools/tasks) — tombolnya bilang jujur, tidak pura-pura bekerja. */
import { state } from '../../core/store.js?v=20260909063332';
import { esc, stamp } from '../../core/dom.js?v=20260909063332';
import { rowFor } from './row.js?v=20260909063332';
import { plainText } from '../note-model.js?v=20260909063332';
import { semuaTag } from '../tags.js?v=20260909063332';
import { AK, akSekarang } from '../../core/theme.js?v=20260909063332';
import { t as tr, bahasaSekarang } from '../../core/i18n.js?v=20260909063332';
import { tandaTag, WARNA_TAG } from '../label.js?v=20260909063332';
import { terlihat } from '../kunci.js?v=20260909063332';

/* ── Cari: membaca data nyata (judul + isi + tag) ── */
export function renderHasilCari(q) {
  const w = document.getElementById('cari-hasil');
  if (!w) return;
  q = (q || '').trim();
  if (!q) {
    w.innerHTML = '<p class="dm-kosong" style="padding:6px 2px">' + tr('Ketik kata kunci untuk mencari di judul, isi, dan tag.') + '</p>';
    return;
  }
  const tagSaja = /^#/.test(q);
  const kata = (tagSaja ? q.slice(1) : q).toLowerCase().split(/\s+/).filter(Boolean);
  /* D19: catatan terkunci yang belum dibuka tidak ikut hasil cari sama
     sekali — kalau tidak, barisnya bisa membocorkan bahwa catatan
     tertentu mengandung kata kunci itu. */
  let daftar = state.notes.filter(n => !n.deletedAt && terlihat(n));
  daftar = daftar.filter(n => {
    if (tagSaja)
      return kata.every(k => (n.tags || []).some(t => t.toLowerCase().includes(k)));
    const teks = `${n.title || ''} ${(n.tags || []).join(' ')} ${plainText(n)}`.toLowerCase();
    return kata.every(k => teks.includes(k));
  });
  daftar.sort((a, b) => b.updatedAt - a.updatedAt);
  const hasil = daftar.slice(0, 40);
  if (!hasil.length) {
    w.innerHTML = `<p class="dm-kosong" style="padding:6px 2px">${tr('Tidak ada yang cocok dengan “{q}”.', { q: esc(q) })}</p>`;
    return;
  }
  w.innerHTML = `<div class="overline" style="margin:2px 2px 8px">${hasil.length === daftar.length
      ? tr('{n} hasil', { n: hasil.length })
      : tr('{n} hasil dari {m}', { n: hasil.length, m: daftar.length })}</div>
    <div class="card">${hasil.map(rowFor).join('')}</div>`;
}

export const miscViews = {

rem:()=>`<div class="page"><div class="empty"><h3>${tr('Belum ada pengingat')}</h3>
  <p>${tr('Pengingat akan jadi modul terpisah — belum dibuat di prototipe ini.')}</p>
  <button class="btn btn-pri" data-act="Modul Reminder menyusul">${tr('Buat pengingat')}</button></div></div>`,

task:()=>`<div class="page"><div class="empty"><h3>${tr('Belum ada tugas')}</h3>
  <p>${tr('Tugas akan jadi modul terpisah — belum dibuat di prototipe ini.')}</p>
  <button class="btn btn-pri" data-act="Modul Tugas menyusul">${tr('Buat tugas')}</button></div></div>`,

search:()=>`<div class="page">
  <div style="display:flex;align-items:center;gap:10px;background:var(--sunken);border-radius:var(--r-md);
    padding:0 13px;height:44px;margin-bottom:20px">
    <svg class="ico" style="color:var(--faint)"><use href="#i-search"/></svg>
    <input id="cari-in" placeholder="${tr('Cari di judul, isi, dan tag')}" autocomplete="off"
      aria-label="${tr('Cari catatan')}"
      style="flex:1;border:none;background:none;outline:none;font-size:15px"></div>
  <div id="cari-hasil"><p class="dm-kosong" style="padding:6px 2px">${tr('Ketik kata kunci untuk mencari di judul, isi, dan tag.')}</p></div>
  <p class="note" style="padding:20px 2px 0">${tr('Pencarian membaca data asli: semua kata harus cocok (judul, isi, atau tag). Tag juga bisa dicari lewat chip # di baris daftar.')}</p></div>`,

tags:()=>{
  const sem = semuaTag();
  if (!sem.length)
    return `<div class="page"><div class="empty"><h3>${tr('Belum ada tag')}</h3>
      <p>${tr('Tag adalah #kata di dalam catatan. Begitu ada, tag muncul di sini dan di chip baris daftar.')}
      </p></div></div>`;
  const baris = sem.map(t => {
    const pemakai = state.notes.filter(n => !n.deletedAt && terlihat(n) && (n.tags || []).includes(t.nama))
      .slice(0, 2).map(n => n.title).filter(Boolean);
    const ket = `${tr('{n} catatan', { n: t.jumlah }) }` + (pemakai.length ? ' · ' + pemakai.join(' · ') : '');
    return `<button class="row" data-tag="${esc(t.nama)}">
      <span class="tag-dot" data-tt="${tandaTag(t.nama)}" style="--lc:${WARNA_TAG[tandaTag(t.nama)]}"></span>
      <div class="row-b"><div class="row-t">#${esc(t.nama)}</div>
      <div class="row-s" style="white-space:normal;line-height:1.45">${esc(ket)}</div></div>
      <span class="row-m">${t.jumlah}</span></button>`;
  }).join('');
  return `<div class="page">
    <div class="overline" style="margin:0 0 8px">${tr('Semua tag')}</div>
    <div class="card">${baris}</div>
    <p class="note" style="padding:20px 2px 0">${tr('Klik tag untuk memfilter daftar catatan. Tag muncul otomatis dari #tag di isi — tidak perlu dikelola manual.')}</p></div>`;
},

arsip:()=>{
  const a = state.notes.filter(n => n.archived && !n.deletedAt);
  return `<div class="page">
    ${a.length
      ? `<div class="card">${a.map(n => rowFor(n, 'arsip')).join('')}</div>
         <p class="note">${tr('Geser baris ke kiri untuk mengembalikan atau menghapus. Buka catatan lalu pilih "Kembalikan dari arsip" (menu ···) juga bisa.')}</p>`
      : `<div class="empty"><h3>${tr('Arsip kosong')}</h3>
         <p>${tr('Catatan yang diarsipkan hilang dari daftar utama tapi tetap tersimpan di sini dan bisa dikembalikan.')}</p></div>`}
  </div>`;
},

/* Tempat sampah: soft delete 30 hari. Pulihkan kapan pun; hapus permanen
   butuh dua ketukan ("Hapus" lalu "Yakin?") dalam 3,5 detik. */
trash:()=>{
  const s = state.notes.filter(n => n.deletedAt)
    .sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
  if (!s.length)
    return `<div class="page"><div class="empty"><h3>${tr('Sampah kosong')}</h3>
      <p>${tr('Catatan yang dihapus menunggu di sini selama 30 hari sebelum dibuang otomatis — siapa tahu masih dibutuhkan.')}</p></div></div>`;
  const baris = s.map(n => {
    /* D19: catatan terkunci tetap tampil buta di sampah (bisa dipulihkan
       atau dihapus) — judul aslinya tidak boleh bocor ke layar ini. */
    const boleh = terlihat(n);
    const judul = boleh ? (esc(n.title) || tr('Tanpa judul')) : tr('Catatan terkunci');
    const ringkas = boleh
      ? `${tr('Dihapus')} ${stamp(n.deletedAt)}`
      : `${tr('Terkunci PIN · dihapus')} ${stamp(n.deletedAt)}`;
    return `
    <div class="row" style="min-height:0;padding:11px 16px">
      <div class="row-b"><div class="row-t"${boleh && !n.title ? ' style="color:var(--faint)"' : ''}>${judul}</div>
        <div class="row-s">${ringkas}</div></div>
      <button type="button" class="btn btn-sec" style="height:32px;font-size:12.5px;flex:none"
        data-pulih="${n.id}">${tr('Pulihkan')}</button>
      <button type="button" class="btn btn-sec btn-danger" style="height:32px;font-size:12.5px;flex:none"
        data-putus="${n.id}" data-putus-judul="${boleh ? esc(n.title || tr('Tanpa judul')) : tr('Catatan terkunci')}">${tr('Hapus')}</button>
    </div>`;
  }).join('');
  return `<div class="page">
    <div class="overline" style="margin:0 0 8px">${tr('Tempat sampah')} · ${s.length}</div>
    <div class="card">${baris}</div>
    <p class="note" style="padding:20px 2px 0">${tr('Catatan di sini dibuang otomatis setelah 30 hari. "Hapus" butuh dua ketukan supaya tidak ada yang terhapus permanen tanpa sengaja.')}</p>
  </div>`;
},

set:()=>{ const akPilih = akSekarang() || '';
  const swAksen = AK.map(a =>
    `<button type="button" class="ak-dot${(a.k || '') === akPilih ? ' on' : ''}"
       data-ak="${a.k || ''}" aria-pressed="${(a.k || '') === akPilih}"
       title="${esc(a.nama)}" aria-label="${esc(a.nama)}" style="--w:${a.w}"></button>`).join('');
  return `<div class="page">
  <div class="card" style="margin-bottom:24px">
    <button type="button" class="row" data-kembali-set title="${tr('Ke layar sebelumnya')}">
      <svg class="ico" style="color:var(--accent);width:17px;height:17px"><use href="#i-back"/></svg>
      <div class="row-b"><div class="row-t">${tr('Kembali')}</div>
        <div class="row-s">${tr('Ke layar sebelumnya')}</div></div>
    </button>
  </div>
  <div class="sec"><h2>${tr('Tampilan')}</h2></div>
  <div class="card" style="margin-bottom:24px">
    <div class="row"><div class="row-b"><div class="row-t">${tr('Tema')}</div><div class="row-s">${tr('Sekarang')} <span id="tema-st">…</span></div></div>
      <button type="button" class="btn btn-sec" data-toggle-tema>${tr('Ganti')}</button></div>
    <div class="row"><div class="row-b"><div class="row-t">${tr('Getar saat menekan tombol')}</div>
      <div class="row-s">${tr('Umpan balik singkat di perangkat yang mendukung')}</div></div>
      <button class="sw" data-getar role="switch"><span></span></button></div>
    <div class="row" style="flex-wrap:wrap;gap:8px 0">
      <div class="row-b"><div class="row-t">${tr('Warna aksen')}</div>
        <div class="row-s">${tr('Tombol utama, sorotan, dan tanda aktif')}</div></div>
      <div class="aksen" role="group" aria-label="${tr('Warna aksen')}">${swAksen}</div></div>
  </div>
  <div class="sec"><h2>${tr('Bahasa')}</h2></div>
  <div class="card" style="margin-bottom:24px">
    <div class="row"><div class="row-b">
        <div class="row-t">${tr('Bahasa aplikasi')}</div>
        <div class="row-s">${tr('Seluruh antarmuka ikut berganti — isi catatan tidak pernah diterjemahkan')}</div></div>
      <div class="lang-pilih"><select data-bahasa aria-label="${tr('Bahasa aplikasi')}">
          <option value="id"${bahasaSekarang() === 'en' ? '' : ' selected'}>Indonesia</option>
          <option value="en"${bahasaSekarang() === 'en' ? ' selected' : ''}>English</option>
        </select></div></div>
  </div>
  <div class="sec"><h2>${tr('Isi bar mekanik')}</h2></div>
  <div class="card" style="margin-bottom:24px" id="bar-prefs"></div>
  <p class="note">${tr('Undo dan Redo selalu tampil — tanpa keduanya kesalahan ketik tak bisa dibatalkan.')}</p>
  <div class="sec"><h2>${tr('Data')}</h2></div>
  <div class="card">
    <div class="row"><div class="row-b"><div class="row-t">${tr('Impor')}</div>
      <div class="row-s">${tr('Cadangan JSON Hara (termasuk gambar) · berkas .md · .zip markdown')}</div></div>
      <button type="button" class="btn btn-sec" data-impor>${tr('Pilih berkas…')}</button></div>
    <div class="row" style="gap:10px"><div class="row-b"><div class="row-t">${tr('Unduh cadangan')}</div>
      <div class="row-s">${tr('Semua catatan (sampah & arsip ikut) + gambar, satu berkas JSON — pulihkan utuh kapan pun')}</div></div>
      <button type="button" class="btn btn-pri" data-ekspor="json"
        style="height:38px;flex:none;gap:7px;padding:0 15px">
        <svg class="ico" style="width:15px;height:15px"><use href="#i-dl"/></svg>${tr('Unduh')}</button></div>
    <div class="row"><div class="row-b"><div class="row-t">${tr('Ekspor Markdown')}</div>
      <div class="row-s">${tr('Satu berkas .md per catatan (frontmatter + wikilink utuh) dalam .zip — siap dibaca Obsidian')}</div></div>
      <button type="button" class="btn btn-sec" data-ekspor="md">${tr('Markdown')}</button></div>
    <div class="row"><div class="row-b"><div class="row-t">${tr('Penyimpanan')}</div>
      <div class="row-s" id="ruang">${tr('menghitung…')}</div></div></div>
  </div>
  <input type="file" id="impor-in" hidden
    accept=".json,.md,.markdown,.txt,.zip,application/json,text/markdown,application/zip">
  <p class="note" style="padding:20px 0 0">${tr('Keluar-masuk kapan saja: Unduh cadangan untuk memulihkan semua persis, Markdown untuk berpindah ke aplikasi lain tanpa kehilangan isi. Gambar ikut dalam cadangan; ekspor Markdown hanya membawa teks.')} ${tr('Catatan terkunci ikut dicadangkan — PIN dan sidik jari tidak pernah meninggalkan perangkat, jadi setelah dipulihkan di perangkat lain kuncinya dipasang ulang bila perlu.')}</p> Unduh cadangan untuk memulihkan semua persis, Markdown untuk berpindah ke aplikasi lain tanpa kehilangan isi. Gambar ikut dalam cadangan; ekspor Markdown hanya membawa teks. Catatan terkunci ikut dicadangkan — PIN dan sidik jari tidak pernah meninggalkan perangkat, jadi setelah dipulihkan di perangkat lain kuncinya dipasang ulang bila perlu.</p></div>`}};
