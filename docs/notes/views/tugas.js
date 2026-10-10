/* Layar Tugas & Reminder asli (Bagian B9).

   Keduanya membaca tenggat to-do lewat pengingat.js. Tidak ada
   struktur data baru — tenggat hidup di dalam isi catatan, sehingga
   layar ini tidak pernah bisa berbeda dari catatan aslinya. */

import { state, save } from '../../core/store.js?v=20261010020553';
import { esc } from '../../core/dom.js?v=20261010020553';
import { tugasMendatang, tenggatHariIni, sisaWaktu, chipTenggat, jadwalUlang } from '../pengingat.js?v=20261010020553';
import { rowFor } from './row.js?v=20261010020553';
import { t as tr } from '../../core/i18n.js?v=20261010020553';
import { toast } from '../../core/toast.js?v=20261010020553';
import { touch } from '../note-model.js?v=20261010020553';
import { go, cur } from '../../core/router.js?v=20261010020553';

const aktif = () => state.notes.filter(n => !n.archived && !n.deletedAt);

/* Satu kartu tenggat: chip "besok/hari ini/lewat", teks, judul catatan.
   Ketukan → buka catatan & lompat ke blok to-do-nya. */
/* K4·K6: tunda / jadwal ulang langsung dari kartu (sekali-jalan saja). */
const PILIHAN_TUNDA = [['hari', 'Hari ini'], ['besok', 'Besok'], ['minggu depan', 'Minggu depan']];

const kartuTenggat = (x, penanda) => {
  const bisaTunda = !x.berulang && jadwalUlang(x.blok.content, 'besok') !== null;
  return `<div class="tdg-item">
  <button class="row" data-todo-lompat="${x.n.id}" data-todo-bid="${x.bid}"
    title="${tr('Buka di catatan')} «${esc(x.n.title || tr('Tanpa judul'))}»">
    <div class="row-b">
      <div class="row-t" style="display:flex;align-items:center;gap:8px;min-width:0">
        <span class="tdg-chip">${x.prioritas ? '<b class="tdg-prio" aria-label="' + tr('prioritas') + '">' + '!'.repeat(x.prioritas) + '</b> ' : ''}${x.berulang ? '↻ ' : ''}${esc(chipTenggat(x))}</span>
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(
          x.sisa || (x.blok.content || '').replace(/<[^>]*>/g, ' ').trim()
            || tr('Tanpa isi'))}</span></div>
      <div class="row-s">${esc(x.n.title || tr('Tanpa judul'))} · ${esc(penanda)}</div>
    </div>
  </button>
  ${bisaTunda ? `<div class="tdg-tunda" role="group" aria-label="${tr('Jadwal ulang')}">
    ${PILIHAN_TUNDA.map(([kode, label]) => `<button class="tdg-btn" type="button"
      data-tunda="${esc(kode)}" data-note="${esc(x.n.id)}" data-bid="${esc(x.bid)}">${tr(label)}</button>`).join('')}
  </div>` : ''}
</div>`;
};

/* Menjadwalkan ulang satu to-do. Model diubah lalu disimpan; layar
   Tugas/Reminder digambar ulang supaya daftarnya langsung benar. */
export function tundaTodo(noteId, bid, pilihan) {
  const n = state.notes.find(x => x.id === noteId);
  const b = n && (n.blocks || []).find(x => x.id === bid);
  if (!b) return toast(tr('To-do tidak ditemukan'));
  const baru = jadwalUlang(b.content, pilihan);
  if (baru === null) return toast(tr('Tidak bisa dijadwal ulang'));
  b.content = baru;
  touch(n);
  save();
  toast(tr('Dijadwal ulang'));
  if (cur === 'task' || cur === 'rem') go(cur);
}

export const tugasView = () => {
  /* tugasMendatang() sudah mengecualikan to-do yang dicentang (checked),
     jadi cukup tampilkan apa adanya — sematan tidak menghapus tenggat. */
  const daftar = aktif();
  const tunggak = tugasMendatang(daftar);
  return `<div class="page">
    <div class="sec"><h2>${tr('Mendatang · 7 hari')}</h2></div>
    ${tunggak.length
      ? `<div class="card">${tunggak.map(x => kartuTenggat(x, sisaWaktu(x.waktu))).join('')}</div>`
      : `<div class="empty" style="padding:40px 20px"><h3>${tr('Tenang — tidak ada tenggat')}</h3>
         <p>${tr('Tulis to-do dengan tenggat di awal baris:')} <b style="font-family:var(--mono);font-weight:500">${tr('besok lari pagi')}</b>, <b style="font-family:var(--mono);font-weight:500">${tr('jumat lapor pajak')}</b>, atau <b style="font-family:var(--mono);font-weight:500">2026-12-31 target</b>.</p>
         <button class="btn btn-pri" data-act2="new">${tr('Tulis catatan baru')}</button></div>`}
    <div class="sec" style="margin-top:22px"><h2>${tr('Catatan berisi to-do')}</h2></div>
    <div class="card">${daftar.filter(n => (n.blocks || []).some(b => b.type === 'todo')).map(rowFor).join('') || `<p class="dm-kosong" style="padding:14px 16px">${tr('Belum ada catatan berisi to-do.')}</p>`}</div>
  </div>`;
};

export const reminderView = () => {
  const daftar = aktif();
  const tuntas = tenggatHariIni(daftar).filter(x => x.blok.meta && x.blok.meta.done);
  const tunggak = tenggatHariIni(daftar).filter(x => !(x.blok.meta && x.blok.meta.done));
  return `<div class="page">
    <div class="sec"><h2>${tr('Perlu perhatian')}</h2></div>
    ${tunggak.length
      ? `<div class="card">${tunggak.map(x => kartuTenggat(x, sisaWaktu(x.waktu))).join('')}</div>`
      : `<div class="empty" style="padding:40px 20px"><h3>${tr('Semua beres')}</h3>
         <p>${tr('Tidak ada to-do yang jatuh tempo hari ini. Tenggat lewat pun akan muncul di sini sampai kamu menuntaskannya.')}</p></div>`}
    <div class="sec" style="margin-top:22px"><h2>${tr('Baru selesai')}</h2></div>
    ${tuntas.length
      ? `<div class="card">${tuntas.slice(0, 8).map(x => kartuTenggat(x, (tr('selesai') + ' ' + sisaWaktu)(x.blok.meta.done))).join('')}</div>`
      : `<p class="dm-kosong" style="padding:2px 2px 6px">${tr('Belum ada yang selesai hari ini.')}</p>`}
  </div>`;
};
