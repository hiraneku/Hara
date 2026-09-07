/* Layar pendukung: reminder, tugas, cari, tag, arsip, pengaturan.
   Sebagian masih statis — akan pindah ke tools/ masing-masing nanti. */
import { state } from '../../core/store.js?v=20260907055942';
import { rowFor } from './row.js?v=20260907055942';

export const miscViews = {



rem:()=>`<div class="page"><div class="empty"><h3>Belum ada pengingat</h3>
  <p>Pengingat yang kamu buat akan muncul di sini, dikelompokkan per hari.</p>
  <button class="btn btn-pri" onclick="toast('Reminder baru')">Buat pengingat</button></div></div>`,

task:()=>`<div class="page"><div class="empty"><h3>Belum ada tugas</h3>
  <p>Tugas dengan tenggat akan ikut muncul di Beranda bersama pengingat hari itu.</p>
  <button class="btn btn-pri" onclick="toast('Tugas baru')">Buat tugas</button></div></div>`,

search:()=>`<div class="page">
  <div style="display:flex;align-items:center;gap:10px;background:var(--sunken);border-radius:var(--r-md);
    padding:0 13px;height:44px;margin-bottom:22px">
    <svg class="ico" style="color:var(--faint)"><use href="#i-search"/></svg>
    <input placeholder="Cari — coba tag:hara atau &quot;frasa persis&quot;" style="flex:1;border:none;background:none;outline:none;font-size:15px"></div>
  <div class="overline" style="margin-bottom:10px">Operator</div>
  <div class="card">
    ${[['tag:','cari berdasarkan tag'],['folder:','batasi ke satu folder'],['judul:','cocokkan judul saja'],
       ['"frasa persis"','pencocokan utuh'],['-kecuali','buang kata ini'],['sebelum: / sesudah:','rentang tanggal']]
      .map(([a,b])=>`<div class="row" style="min-height:48px;padding:10px 16px">
      <code class="ic">${a}</code><div class="row-b"><div class="row-s">${b}</div></div></div>`).join('')}
  </div></div>
<p class="note">Target: hasil muncul di bawah 50 ms untuk 10.000 catatan — indeks tersimpan, tanpa pemindaian ulang saat aplikasi dibuka.</p>`,

tags:()=>`<div class="page"><div class="card"><button class="row" onclick="go('editor')">
  <svg class="ico" style="color:var(--faint)"><use href="#i-tag"/></svg>
  <div class="row-b"><div class="row-t">hara</div><div class="row-s">1 catatan</div></div></button></div></div>`,

arsip:()=>{
  const a = state.notes.filter(n => n.archived);
  return `<div class="page">
    ${a.length
      ? `<div class="card">${a.map(rowFor).join('')}</div>
         <p class="note">Buka catatan lalu pilih "Kembalikan dari arsip" (menu ···) untuk memindahkannya kembali ke daftar utama.</p>`
      : `<div class="empty"><h3>Arsip kosong</h3>
         <p>Catatan yang diarsipkan hilang dari daftar utama tapi tetap tersimpan di sini dan bisa dikembalikan.</p></div>`}
  </div>`;
},

set:()=>`<div class="page">
  <div class="sec"><h2>Tampilan</h2></div>
  <div class="card" style="margin-bottom:24px">
    <div class="row"><div class="row-b"><div class="row-t">Tema</div><div class="row-s">Sekarang <span id="tema-st">…</span></div></div>
      <button class="btn btn-sec" onclick="toggleTheme()">Ganti</button></div>
    <div class="row"><div class="row-b"><div class="row-t">Getar saat menekan tombol</div>
      <div class="row-s">Umpan balik singkat di perangkat yang mendukung</div></div>
      <button class="sw" data-getar role="switch"><span></span></button></div>
  </div>
  <div class="sec"><h2>Isi bar mekanik</h2></div>
  <div class="card" style="margin-bottom:24px" id="bar-prefs"></div>
  <p class="note">Undo dan Redo selalu tampil — tanpa keduanya kesalahan ketik tak bisa dibatalkan.</p>
  <div class="sec"><h2>Data</h2></div>
  <div class="card">
    <div class="row"><div class="row-b"><div class="row-t">Impor vault Obsidian</div>
      <div class="row-s">Wikilink & frontmatter dipertahankan</div></div>
      <button class="btn btn-sec" onclick="toast('Pilih folder vault')">Pilih</button></div>
    <div class="row"><div class="row-b"><div class="row-t">Ekspor semua</div>
      <div class="row-s">Markdown · JSON · PDF</div></div>
      <button class="btn btn-sec" onclick="toast('Mengekspor…')">Ekspor</button></div>
    <div class="row"><div class="row-b"><div class="row-t">Penyimpanan</div>
      <div class="row-s" id="ruang">menghitung…</div></div></div>
  </div>
  <p class="note" style="padding:24px 0 0">Hara v0.1 · prototipe desain · data tersimpan di perangkat</p></div>`};

const titles={home:'Beranda',notes:'Catatan',editor:'',rem:'Reminder',task:'Tugas',
  search:'Cari',tags:'Tag',arsip:'Arsip',set:'Pengaturan'
};
