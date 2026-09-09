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
   menghasilkan dua blok dengan id sama.

   Bahasa (D20): label menu templat, keterangan, dan struktur bawaan
   yang DIBUAT baru mengikuti bahasa aktif — templat yang dipakai
   menciptakan catatan baru, jadi isinya lahir dalam bahasa itu
   (sama seperti tombol "Catatan hari ini"). Templat tersimpan
   pengguna adalah data: nama & isinya tidak diterjemahkan. */

import { state } from '../core/store.js?v=20260909074309';
import { makeNote, htmlToBlocks, blocksToDom } from './note-model.js?v=20260909074309';
import { go } from '../core/router.js?v=20260909074309';
import { esc } from '../core/dom.js?v=20260909074309';
import { toast } from '../core/toast.js?v=20260909074309';
import { t as tr, LOKALE, bahasaSekarang } from '../core/i18n.js?v=20260909074309';
import { judulJurnalHari } from './harian.js?v=20260909074309';

const KUNCI = 'hara.v1.tpl';

/* Tanggal panjang untuk judul catatan yang dibuat dari templat
   ("Rapat · 9 September 2026" / "Meeting · September 9, 2026" /
   "会議 · 2026年9月9日"). */
function tanggalPanjang() {
  try {
    const t = new Date();
    return t.toLocaleDateString(LOKALE(),
      { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (e) {
    const t = new Date();
    if (bahasaSekarang() === 'ja')
      return `${t.getFullYear()}年${t.getMonth() + 1}月${t.getDate()}日`;
    if (bahasaSekarang() === 'en')
      return `${t.getMonth() + 1}/${t.getDate()}/${t.getFullYear()}`;
    return `${t.getDate()}/${t.getMonth() + 1}/${t.getFullYear()}`;
  }
}

/* Isi bawaan mengikuti bahasa aktif saat DITERAPKAN (fungsi dipanggil
   di terapkanTemplat). Nama & keterangan dipakai sebagai kunci menu
   (tr() saat dirender) dan sebagai judul bawaan bila judul() kosong. */
const BAWAAN = [
  {
    id: 'jurnal',
    nama: 'Jurnal harian',
    ket: 'Judul diisi tanggal otomatis',
    judul: () => judulJurnalHari(),
    html: () => HTML_JURNAL[bahasaSekarang()] || HTML_JURNAL.id,
  },
  {
    id: 'rapat',
    nama: 'Catatan rapat',
    ket: 'Tujuan, hadir, catatan, tindak lanjut',
    judul: () => `${PREFIX_RAPAT[bahasaSekarang()]} · ${tanggalPanjang()}`,
    html: () => HTML_RAPAT[bahasaSekarang()] || HTML_RAPAT.id,
  },
  {
    id: 'belajar',
    nama: 'Daftar belajar',
    ket: 'Materi + latihan yang dicentang',
    judul: () => PREFIX_BELAJAR[bahasaSekarang()],
    html: () => HTML_BELAJAR[bahasaSekarang()] || HTML_BELAJAR.id,
  },
];

/* Isi bawaan dibuat saat templat DITERAPKAN — lahir dalam bahasa yang
   sedang aktif (sama seperti tombol "Catatan hari ini"). */
const HTML_JURNAL = {
  id: `
<div class="b-h2">Yang kusyukuri</div>
<div class="b-p"></div>
<div class="b-h2">Yang terjadi hari ini</div>
<div class="b-p"></div>
<div class="b-h2">Yang kupelajari</div>
<div class="b-p"></div>
<div class="b-h2">Besok</div>
<div class="b-todo"></div>`,
  en: `
<div class="b-h2">Grateful for</div>
<div class="b-p"></div>
<div class="b-h2">What happened today</div>
<div class="b-p"></div>
<div class="b-h2">What I learned</div>
<div class="b-p"></div>
<div class="b-h2">Tomorrow</div>
<div class="b-todo"></div>`,
  ja: `
<div class="b-h2">今日の感謝</div>
<div class="b-p"></div>
<div class="b-h2">今日あったこと</div>
<div class="b-p"></div>
<div class="b-h2">今日学んだこと</div>
<div class="b-p"></div>
<div class="b-h2">明日</div>
<div class="b-todo"></div>`,
};
const PREFIX_RAPAT = { id: 'Rapat', en: 'Meeting', ja: '会議' };
const HTML_RAPAT = {
  id: `
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
  en: `
<div class="b-h2">Purpose</div>
<div class="b-p"></div>
<div class="b-h2">Present</div>
<div class="b-li">— name —</div>
<div class="b-li">— name —</div>
<div class="b-h2">Notes</div>
<div class="b-p"></div>
<div class="b-h2">Action items</div>
<div class="b-todo">— who: what, when —</div>
<div class="b-todo"></div>`,
  ja: `
<div class="b-h2">目的</div>
<div class="b-p"></div>
<div class="b-h2">参加者</div>
<div class="b-li">— 名前 —</div>
<div class="b-li">— 名前 —</div>
<div class="b-h2">メモ</div>
<div class="b-p"></div>
<div class="b-h2">アクション項目</div>
<div class="b-todo">— だれが: なにを、いつまでに —</div>
<div class="b-todo"></div>`,
};
const PREFIX_BELAJAR = { id: 'Belajar', en: 'Learning', ja: '勉強' };
const HTML_BELAJAR = {
  id: `
<div class="b-h2">Materi</div>
<div class="b-p"></div>
<div class="b-h2">Latihan</div>
<div class="b-todo">Baca ulang materi</div>
<div class="b-todo">Catat istilah penting</div>
<div class="b-todo">Kerjakan soal latihan</div>`,
  en: `
<div class="b-h2">Material</div>
<div class="b-p"></div>
<div class="b-h2">Practice</div>
<div class="b-todo">Review the material</div>
<div class="b-todo">Note key terms</div>
<div class="b-todo">Do practice problems</div>`,
  ja: `
<div class="b-h2">教材</div>
<div class="b-p"></div>
<div class="b-h2">練習</div>
<div class="b-todo">教材を見直す</div>
<div class="b-todo">重要な用語をメモする</div>
<div class="b-todo">練習問題を解く</div>`,
};

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
    toast(tr('Templat tidak tersimpan — penyimpanan penuh'));
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

/* Isi menu pemilih templat. Nama & keterangan templat bawaan adalah
   kunci antarmuka (diterjemahkan); templat pengguna data apa adanya. */
export function menuTemplat() {
  const semua = daftarTemplat();
  const bawaan = semua.filter(t => t.bawaan);
  const user = semua.filter(t => !t.bawaan);
  return `<div class="pop-h">${tr('Dari templat…')}</div>
  <p class="pop-note">${tr('Pilih templat — catatan baru dibuat, lalu sunting isinya.')}</p>
  ${bawaan.map(t => `<button type="button" class="pop-i" data-tpl-id="${esc(t.id)}">
    <svg class="ico"><use href="#i-tpl"/></svg>${esc(tr(t.nama))}
    <span class="sub">${esc(tr(t.ket))}</span></button>`).join('')}
  ${user.length ? `<div class="pop-sek">${tr('Tersimpan')}</div>` +
    user.map(t => `<div class="pop-baris">
      <button type="button" class="pop-i" data-tpl-id="${esc(t.id)}">
        <svg class="ico"><use href="#i-copy"/></svg>${esc(t.nama)}</button>
      <button type="button" class="pop-info" data-tpl-del="${esc(t.nama)}" title="${tr('Hapus templat')}"
        aria-label="${tr('Hapus templat')} ${esc(t.nama)}"><svg class="bi"><use href="#i-trash"/></svg></button>
    </div>`).join('') : ''}
  ${!user.length ? `<div class="pop-sek">${tr('Tersimpan')}</div>
    <p class="pop-note">${tr('Catatan apa pun bisa dijadikan templat dari menu "···" di editor.')}</p>` : ''}`;
}

/* Buat catatan baru dari templat. */
export function terapkanTemplat(id) {
  const tpl = daftarTemplat().find(x => x.id === id);
  if (!tpl) return;
  const judul = (typeof tpl.judul === 'function' ? tpl.judul() : tpl.judul) || tpl.nama;
  const html = typeof tpl.html === 'function' ? tpl.html() : tpl.html;
  const n = makeNote({ title: judul, blocks: htmlToBlocks(html) });
  state.seq++;
  state.notes.unshift(n);
  state.openId = n.id;
  try { localStorage.removeItem('hara.v1.draf-' + n.id); } catch (e) { /* privat */ }
  go('editor');
  toast(`${tr('Dibuat dari templat')} "${tpl.bawaan ? tr(tpl.nama) : tpl.nama}"`);
}

/* Simpan catatan yang sedang dibuka sebagai templat pengguna.
   id blok dibuang — templat dipakai ulang nanti dengan id segar. */
export function simpanTemplatNote(n) {
  if (!n) return false;
  const nama = (n.title || '').trim() || tr('Tanpa judul');
  let html = blocksToDom(n.blocks)
    .replace(/\s+data-bid="[^"]*"/g, '')
    .replace(/\s+data-blkh="[^"]*"/g, '')
    .trim();
  const semua = bacaTersimpan();
  const ada = semua.some(x => x.nama === nama);
  const simpanNama = ada ? `${nama} (${tanggalPanjang()})` : nama;
  semua.unshift({ nama: simpanNama, html, dibuat: Date.now() });
  if (!tulisTersimpan(semua)) return false;
  toast(`${tr('Tersimpan sebagai templat')} "${simpanNama}"`);
  return true;
}

export function hapusTemplat(nama) {
  const sisa = bacaTersimpan().filter(t => t.nama !== nama);
  if (sisa.length === bacaTersimpan().length) return false;
  tulisTersimpan(sisa);
  toast(tr('Templat dihapus'));
  return true;
}
