/* Jurnal harian (Bagian B12).

   "Catatan hari ini" = catatan berjudul "Jurnal · <tanggal>" — dicari
   dari catatan aktif; belum ada → dibuat dengan blok kosong siap tulis
   (pola templat bawaan jurnal). */

import { state, save } from '../core/store.js?v=20260909032733';
import { go } from '../core/router.js?v=20260909032733';
import { toast } from '../core/toast.js?v=20260909032733';
import { makeNote, makeBlock } from './note-model.js?v=20260909032733';

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli',
  'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export function tanggalHariIni() {
  const t = new Date();
  return `${t.getDate()} ${BULAN[t.getMonth()]} ${t.getFullYear()}`;
}

export const judulJurnalHari = () => `Jurnal · ${tanggalHariIni()}`;

export function bukaJurnalHari() {
  const judul = judulJurnalHari();
  let n = state.notes.find(x => !x.deletedAt && (x.title || '').trim() === judul);
  if (n) {
    state.openId = n.id;
    go('editor');
    toast('Jurnal hari ini dibuka');
    return;
  }
  n = makeNote({ title: judul, blocks: [
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
  toast('Jurnal hari ini dibuat — selamat menulis');
}
