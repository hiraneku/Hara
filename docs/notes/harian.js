/* Jurnal harian (Bagian B12).

   "Catatan hari ini" = catatan berjudul "Jurnal · <tanggal>" — dicari
   dari catatan aktif; belum ada → dibuat dengan blok kosong siap tulis
   (pola templat bawaan jurnal). */

import { state, save } from '../core/store.js?v=20260910030412';
import { go } from '../core/router.js?v=20260910030412';
import { toast } from '../core/toast.js?v=20260910030412';
import { makeNote, makeBlock } from './note-model.js?v=20260910030412';
import { openNote } from './model.js?v=20260910030412';
import { terkunciAktif } from './kunci.js?v=20260910030412';
import { t as tr, bahasaSekarang } from '../core/i18n.js?v=20260910030412';

const KODE = ['id', 'en', 'ja'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli',
  'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const BULAN_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];
const PREFIX = { id: 'Jurnal', en: 'Journal', ja: 'ジャーナル' };

/* Tanggal di judul jurnal mengikuti bahasa (id: 9 September 2026;
   en: September 9, 2026; ja: 2026年9月9日). */
function tanggal(b, t) {
  const y = t.getFullYear(), d = t.getDate(), mo = t.getMonth();
  if (b === 'en') return `${BULAN_EN[mo]} ${d}, ${y}`;
  if (b === 'ja') return `${y}年${mo + 1}月${d}日`;
  return `${d} ${BULAN[mo]} ${y}`;
}

export function tanggalHariIni() {
  return tanggal(bahasaSekarang(), new Date());
}

export const judulJurnalHari = () =>
  `${PREFIX[bahasaSekarang()]} · ${tanggalHariIni()}`;

/* Semua padanan judul jurnal hari ini (id/en/ja) — dipakai mencari
   catatan lama lintas bahasa supaya jurnal tidak pernah dobel. */
export function varianJudulJurnalHari() {
  const t = new Date();
  return KODE.map(b => `${PREFIX[b]} · ${tanggal(b, t)}`);
}

export function bukaJurnalHari() {
  const kini = bahasaSekarang();
  const t = new Date();
  const urutCari = [kini, ...KODE.filter(b => b !== kini)];
  let n = null;
  for (const b of urutCari) {
    const j = `${PREFIX[b]} · ${tanggal(b, t)}`;
    n = state.notes.find(x => !x.deletedAt && (x.title || '').trim() === j);
    if (n) break;
  }
  if (n) {
    /* lewat openNote supaya kunci catatan (D19) tetap dihormati */
    const terkunci = terkunciAktif(n);
    openNote(n.id);
    if (!terkunci) toast(tr('Jurnal hari ini dibuka'));
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
  n = makeNote({
    title: `${PREFIX[kini]} · ${tanggal(kini, t)}`,
    blocks: konten,
  });
  state.seq++;
  state.notes.unshift(n);
  state.openId = n.id;
  save();
  go('editor');
  toast(tr('Jurnal hari ini dibuat — selamat menulis'));
}
