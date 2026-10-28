/* Jurnal harian (Bagian B12).

   "Catatan hari ini" = catatan berjudul "Jurnal · <tanggal>" — dicari
   dari catatan aktif; belum ada → dibuat dengan blok kosong siap tulis
   (pola templat bawaan jurnal). */

import { state, save } from '../core/store.js?v=20261028081025';
import { go } from '../core/router.js?v=20261028081025';
import { toast } from '../core/toast.js?v=20261028081025';
import { makeNote, makeBlock } from './note-model.js?v=20261028081025';
import { openNote } from './model.js?v=20261028081025';
import { terkunciAktif } from './kunci.js?v=20261028081025';
import { t as tr, bahasaSekarang } from '../core/i18n.js?v=20261028081025';
import { judulJurnal, tanggalJurnal, cariJurnal } from './jurnal-tanggal.js?v=20261028081025';

export function tanggalHariIni() {
  return tanggalJurnal(bahasaSekarang(), new Date());
}

export const judulJurnalHari = () => judulJurnal(bahasaSekarang(), new Date());

/* Jurnal hari ini (tombol beranda dan lembar baru). */
export function bukaJurnalHari() {
  bukaJurnalTanggal(new Date(), true);
}

/* Buka jurnal untuk tanggal t, atau buat bila belum ada (B8: dipanggil dari kalender).
   Pencarian dan pembuatan memakai judul yang sama, jadi tidak ada jurnal ganda. */
export function bukaJurnalTanggal(t, hariIni = false) {
  const kini = bahasaSekarang();
  const n = cariJurnal(state.notes, t, kini);
  const tgl = tanggalJurnal(kini, t);
  if (n) {
    /* lewat openNote supaya kunci catatan (D19) tetap dihormati */
    const terkunci = terkunciAktif(n);
    openNote(n.id);
    if (!terkunci) toast(hariIni ? tr('Jurnal hari ini dibuka') : tr('Jurnal {t} dibuka', { t: tgl }));
    return;
  }
  const konten = kini === 'en' ? [
    makeBlock({ type: 'heading', content: 'Grateful for', meta: { level: 2 } }),
    makeBlock({ type: 'paragraph', content: '' }),
    makeBlock({ type: 'heading', content: 'What happened today', meta: { level: 2 } }),
    makeBlock({ type: 'paragraph', content: '' }),
    makeBlock({ type: 'heading', content: 'Tomorrow', meta: { level: 2 } }),
    makeBlock({ type: 'todo', content: '' }),
  ] : kini === 'ja' ? [
    makeBlock({ type: 'heading', content: '今日の感謝', meta: { level: 2 } }),
    makeBlock({ type: 'paragraph', content: '' }),
    makeBlock({ type: 'heading', content: '今日あったこと', meta: { level: 2 } }),
    makeBlock({ type: 'paragraph', content: '' }),
    makeBlock({ type: 'heading', content: '明日', meta: { level: 2 } }),
    makeBlock({ type: 'todo', content: '' }),
  ] : [
    makeBlock({ type: 'heading', content: 'Yang kusyukuri', meta: { level: 2 } }),
    makeBlock({ type: 'paragraph', content: '' }),
    makeBlock({ type: 'heading', content: 'Yang terjadi hari ini', meta: { level: 2 } }),
    makeBlock({ type: 'paragraph', content: '' }),
    makeBlock({ type: 'heading', content: 'Besok', meta: { level: 2 } }),
    makeBlock({ type: 'todo', content: '' }),
  ];
  const baru = makeNote({
    title: judulJurnal(kini, t),
    blocks: konten,
  });
  state.seq++;
  state.notes.unshift(baru);
  state.openId = baru.id;
  save();
  go('editor');
  toast(hariIni
    ? tr('Jurnal hari ini dibuat — selamat menulis')
    : tr('Jurnal {t} dibuat — selamat menulis', { t: tgl }));
}
