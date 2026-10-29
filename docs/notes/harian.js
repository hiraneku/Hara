/* Jurnal harian (Bagian B12).

   "Catatan hari ini" = catatan berjudul "Jurnal · <tanggal>" — dicari
   dari catatan aktif; belum ada → dibuat dengan blok kosong siap tulis
   (pola templat bawaan jurnal). */

import { state, save } from '../core/store.js?v=20261029120000';
import { go } from '../core/router.js?v=20261029120000';
import { toast } from '../core/toast.js?v=20261029120000';
import { makeNote, makeBlock } from './note-model.js?v=20261029120000';
import { openNote, findNote } from './model.js?v=20261029120000';
import { terkunciAktif } from './kunci.js?v=20261029120000';
import { t as tr, bahasaSekarang } from '../core/i18n.js?v=20261029120000';
import { flush } from '../core/autosave.js?v=20261029120000';
import { esc } from '../core/dom.js?v=20261029120000';
import { judulJurnal, tanggalJurnal, cariJurnal, tanggalDariJudul } from './jurnal-tanggal.js?v=20261029120000';
import { tampilkanKalenderTanggal } from './views/tugas.js?v=20261029120000';

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

/* ── B8 lanjutan: navigasi antar-hari di jurnal dan tautan balik ke kalender ── */

/* Tanggal jurnal dari catatan yang sedang dibuka, atau null bila catatan itu bukan jurnal. */
export function tanggalJurnalAktif() {
  const n = state.openId ? findNote(state.openId) : null;
  return n ? tanggalDariJudul(n.title) : null;
}

/* Bilah navigasi di atas judul, hanya untuk catatan jurnal. Kosong untuk catatan lain. */
export function jurnalBarHtml(n) {
  const t = n ? tanggalDariJudul(n.title) : null;
  if (!t) return '';
  const kini = bahasaSekarang();
  const sebelum = new Date(t.getFullYear(), t.getMonth(), t.getDate() - 1);
  const sesudah = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1);
  const tglSebelum = tanggalJurnal(kini, sebelum);
  const tglSesudah = tanggalJurnal(kini, sesudah);
  return `<nav class="jurnal-bar" aria-label="${esc(tr('Navigasi jurnal'))}">
    <button type="button" class="jurnal-b" data-jur="prev" aria-label="${esc(tr('Jurnal sebelumnya'))}: ${esc(tglSebelum)}">‹ ${esc(tglSebelum)}</button>
    <button type="button" class="jurnal-b jurnal-kal" data-jur="kalender">${esc(tr('Lihat di kalender'))}</button>
    <button type="button" class="jurnal-b" data-jur="next" aria-label="${esc(tr('Jurnal berikutnya'))}: ${esc(tglSesudah)}">${esc(tglSesudah)} ›</button>
  </nav>`;
}

/* Dipanggil dari handler [data-jur]. prev/next pindah satu hari (buka atau buat jurnal, sama
   seperti Buka jurnal di kalender). kalender membuka layar Tugas dengan hari itu terpilih. */
export function navigasiJurnal(aksi) {
  const t = tanggalJurnalAktif();
  if (!t) return;
  flush();                       /* isi yang belum tersimpan ikut tersimpan sebelum pindah */
  if (aksi === 'kalender') return tampilkanKalenderTanggal(t.getTime());
  const arah = aksi === 'next' ? 1 : -1;
  bukaJurnalTanggal(new Date(t.getFullYear(), t.getMonth(), t.getDate() + arah));
}
