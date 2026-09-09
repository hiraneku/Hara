/* Templat catatan.

   Ada dua sumber templat:
   1. Bawaan — jurnal harian (judul memuat tanggal otomatis), catatan
      rapat, daftar belajar. Didefinisikan di sini sebagai HTML blok.
   2. Tersimpan — catatan apa pun bisa disimpan sebagai templat lewat
      menu "···" → "Simpan sebagai templat…" (judul + isi; properti dan
      tag tidak ikut). Tersimpan di localStorage sendiri, terpisah dari
      catatan.

   Saat templat dipakai, isinya dikonversi lewat htmlToBlocks sehingga
   setiap blok mendapat id BARU — memakai templat dua kali tidak akan
   menghasilkan dua blok dengan id sama. */

import { state } from '../core/store.js?v=20260909041737';
import { makeNote, htmlToBlocks, blocksToDom } from './note-model.js?v=20260909041737';
import { go } from '../core/router.js?v=20260909041737';
import { esc } from '../core/dom.js?v=20260909041737';
import { toast } from '../core/toast.js?v=20260909041737';

const KUNCI = 'hara.v1.tpl';

function tanggalPanjang() {
  try {
    const t = new Date();
    return t.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (e) {
    return new Date().toLocaleDateString();
  }
}

/* ── templat bawaan ── */
const BAWAAN = [
  {
    id: 'jurnal',
    nama: 'Jurnal harian',
    ket: 'Judul diisi tanggal otomatis',
    judul: () => `Jurnal · ${tanggalPanjang()}`,
    html: `
<div class="b-h2">Yang kusyukuri</div>
<div class="b-p"></div>
<div class="b-h2">Yang terjadi hari ini</div>
<div class="b-p"></div>
<div class="b-h2">Yang kupelajari</div>
<div class="b-p"></div>
<div class="b-h2">Besok</div>
<div class="b-todo"></div>`,
  },
  {
    id: 'rapat',
    nama: 'Catatan rapat',
    ket: 'Tujuan, hadir, catatan, tindak lanjut',
    judul: () => `Rapat · ${tanggalPanjang()}`,
    html: `
<div class="b-h2">Tujuan</div>
<div class="b-p"></div>
<div class="b-h2">Hadir</div>
<div class="b-li">— nama —</div>
<div class="b-li">— nama —</div>
<div class="b-h2">Catatan</div>
<div class="b-p"></div>
<div class="b-h2">Tindak lanjut</div>
<div class="b-todo">— siapa: apa, kapan —</div>
<div class="b-todo"></div>`,
  },
  {
    id: 'belajar',
    nama: 'Daftar belajar',
    ket: 'Materi + latihan yang dicentang',
    judul: () => 'Belajar',
    html: `
<div class="b-h2">Materi</div>
<div class="b-p"></div>
<div class="b-h2">Latihan</div>
<div class="b-todo">Baca ulang materi</div>
<div class="b-todo">Catat istilah penting</div>
<div class="b-todo">Kerjakan soal latihan</div>`,
  },
];

/* ── templat tersimpan pengguna ── */
function bacaTersimpan() {
  try {
    const raw = localStorage.getItem(KUNCI);
    const a = raw ? JSON.parse(raw) : [];
    return Array.isArray(a) ? a : [];
  } catch (e) {
    return [];
  }
}
function tulisTersimpan(a) {
  try {
    localStorage.setItem(KUNCI, JSON.stringify(a));
    return true;
  } catch (e) {
    toast('Templat tidak tersimpan — penyimpanan penuh');
    return false;
  }
}

export const adaTemplat = () => bacaTersimpan().length > 0;

/* Semua templat (bawaan + tersimpan) untuk menu pemilih. */
export function daftarTemplat() {
  return [
    ...BAWAAN.map(t => ({ id: 'b:' + t.id, nama: t.nama, ket: t.ket, judul: t.judul, html: t.html, bawaan: true })),
    ...bacaTersimpan().map(t => ({ id: 'u:' + t.nama, nama: t.nama, ket: 'tersimpan', judul: () => t.nama, html: t.html, bawaan: false })),
  ];
}

/* Isi menu pemilih templat. */
export function menuTemplat() {
  const semua = daftarTemplat();
  const bawaan = semua.filter(t => t.bawaan);
  const user = semua.filter(t => !t.bawaan);
  return `<div class="pop-h">Dari templat</div>
  <p class="pop-note">Pilih templat — catatan baru dibuat, lalu sunting isinya.</p>
  ${bawaan.map(t => `<button type="button" class="pop-i" data-tpl-id="${esc(t.id)}">
    <svg class="ico"><use href="#i-tpl"/></svg>${esc(t.nama)}
    <span class="sub">${esc(t.ket)}</span></button>`).join('')}
  ${user.length ? `<div class="pop-sek">Tersimpan</div>` +
    user.map(t => `<div class="pop-baris">
      <button type="button" class="pop-i" data-tpl-id="${esc(t.id)}">
        <svg class="ico"><use href="#i-copy"/></svg>${esc(t.nama)}</button>
      <button type="button" class="pop-info" data-tpl-del="${esc(t.nama)}" title="Hapus templat"
        aria-label="Hapus templat ${esc(t.nama)}"><svg class="bi"><use href="#i-trash"/></svg></button>
    </div>`).join('') : ''}
  ${!user.length ? `<div class="pop-sek">Tersimpan</div>
    <p class="pop-note">Catatan apa pun bisa dijadikan templat dari menu "···" di editor.</p>` : ''}`;
}

/* Buat catatan baru dari templat. */
export function terapkanTemplat(id) {
  const t = daftarTemplat().find(x => x.id === id);
  if (!t) return;
  const judul = (typeof t.judul === 'function' ? t.judul() : t.judul) || t.nama;
  const n = makeNote({ title: judul, blocks: htmlToBlocks(t.html) });
  state.seq++;
  state.notes.unshift(n);
  state.openId = n.id;
  try { localStorage.removeItem('hara.v1.draf-' + n.id); } catch (e) { /* privat */ }
  go('editor');
  toast(`Dibuat dari templat "${t.nama}"`);
}

/* Simpan catatan yang sedang dibuka sebagai templat pengguna.
   id blok dibuang — templat dipakai ulang nanti dengan id segar. */
export function simpanTemplatNote(n) {
  if (!n) return false;
  const nama = (n.title || '').trim() || 'Tanpa judul';
  let html = blocksToDom(n.blocks)
    .replace(/\s+data-bid="[^"]*"/g, '')
    .replace(/\s+data-blkh="[^"]*"/g, '')
    .trim();
  const semua = bacaTersimpan();
  const ada = semua.some(t => t.nama === nama);
  const simpanNama = ada ? `${nama} (${tanggalPanjang()})` : nama;
  semua.unshift({ nama: simpanNama, html, dibuat: Date.now() });
  if (!tulisTersimpan(semua)) return false;
  toast(`Tersimpan sebagai templat "${simpanNama}"`);
  return true;
}

export function hapusTemplat(nama) {
  const sisa = bacaTersimpan().filter(t => t.nama !== nama);
  if (sisa.length === bacaTersimpan().length) return false;
  tulisTersimpan(sisa);
  toast('Templat dihapus');
  return true;
}
