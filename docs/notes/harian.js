/* Jurnal harian (Bagian B12).

   "Catatan hari ini" = catatan berjudul "Jurnal · <tanggal>" — dicari
   dari catatan aktif; belum ada → dibuat dengan blok kosong siap tulis
   (pola templat bawaan jurnal). */

import { state, save } from '../core/store.js?v=20260909054938';
import { go } from '../core/router.js?v=20260909054938';
import { toast } from '../core/toast.js?v=20260909054938';
import { makeNote, makeBlock } from './note-model.js?v=20260909054938';
import { openNote } from './model.js?v=20260909054938';
import { terkunciAktif } from './kunci.js?v=20260909054938';
import { t as tr, isInggris } from '../core/i18n.js?v=20260909054938';

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli',
  'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const BULAN_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

/* Tanggal di judul jurnal mengikuti bahasa yang sedang aktif (id: 9
   September 2026; en: September 9, 2026). Catatan jurnal yang dibuat
   saat mode Indonesia tetap ditemukan saat mode Inggris — dicari dulu
   judul lokal, lalu padanan Indonesia, jadi tidak pernah dobel. */
export function tanggalHariIni() {
  const t = new Date();
  if (isInggris())
    return `${BULAN_EN[t.getMonth()]} ${t.getDate()}, ${t.getFullYear()}`;
  return `${t.getDate()} ${BULAN[t.getMonth()]} ${t.getFullYear()}`;
}

export const judulJurnalHari = () => `${isInggris() ? 'Journal' : 'Jurnal'} · ${tanggalHariIni()}`;

/* Padanan Indonesia dari judul jurnal hari ini — untuk mencari catatan
   lama yang dibuat sebelum bahasa Inggris ada / saat bahasa Indonesia. */
export function judulJurnalHariId() {
  const t = new Date();
  return `Jurnal · ${t.getDate()} ${BULAN[t.getMonth()]} ${t.getFullYear()}`;
}

/* Padanan Inggris — dipakai saat bahasa Indonesia aktif supaya jurnal
   yang dibuat di mode Inggris tidak diduplikasi. */
export function judulJurnalHariEn() {
  const t = new Date();
  return `Journal · ${BULAN_EN[t.getMonth()]} ${t.getDate()}, ${t.getFullYear()}`;
}

export function bukaJurnalHari() {
  const judul = judulJurnalHari();
  let n = state.notes.find(x => !x.deletedAt && (x.title || '').trim() === judul);
  if (!n) {
    /* jurnal lama dengan judul bahasa lain tetap dipakai — jangan
       duplikat: mode Inggris mencari judul Indonesia, mode Indonesia
       mencari judul Inggris. */
    const padanan = isInggris() ? judulJurnalHariId() : judulJurnalHariEn();
    n = state.notes.find(x => !x.deletedAt && (x.title || '').trim() === padanan);
  }
  if (n) {
    /* lewat openNote supaya kunci catatan (D19) tetap dihormati */
    const terkunci = terkunciAktif(n);
    openNote(n.id);
    if (!terkunci) toast(tr('Jurnal hari ini dibuka'));
    return;
  }
  n = makeNote({ title: judul, blocks: isInggris() ? [
    makeBlock({ type: 'heading', content: 'Grateful for', meta: { level: 2 } }),
    makeBlock({ type: 'paragraph', content: '' }),
    makeBlock({ type: 'heading', content: "What happened today", meta: { level: 2 } }),
    makeBlock({ type: 'paragraph', content: '' }),
    makeBlock({ type: 'heading', content: 'Tomorrow', meta: { level: 2 } }),
    makeBlock({ type: 'todo', content: '' }),
  ] : [
    makeBlock({ type: 'heading', content: 'Yang kusyukuri', meta: { level: 2 } }),
    makeBlock({ type: 'paragraph', content: '' }),
    makeBlock({ type: 'heading', content: 'Yang terjadi hari ini', meta: { level: 2 } }),
    makeBlock({ type: 'paragraph', content: '' }),
    makeBlock({ type: 'heading', content: 'Besok', meta: { level: 2 } }),
    makeBlock({ type: 'todo', content: '' }),
  ] });
  state.seq++;
  state.notes.unshift(n);
  state.openId = n.id;
  save();
  go('editor');
  toast(tr('Jurnal hari ini dibuat — selamat menulis'));
}
