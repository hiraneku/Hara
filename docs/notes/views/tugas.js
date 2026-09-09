/* Layar Tugas & Reminder asli (Bagian B9).

   Keduanya membaca tenggat to-do lewat pengingat.js. Tidak ada
   struktur data baru — tenggat hidup di dalam isi catatan, sehingga
   layar ini tidak pernah bisa berbeda dari catatan aslinya. */

import { state } from '../../core/store.js?v=20260909063332';
import { esc } from '../../core/dom.js?v=20260909063332';
import { tugasMendatang, tenggatHariIni, sisaWaktu, labelTenggat } from '../pengingat.js?v=20260909063332';
import { rowFor } from './row.js?v=20260909063332';
import { t as tr } from '../../core/i18n.js?v=20260909063332';

const aktif = () => state.notes.filter(n => !n.archived && !n.deletedAt);

/* Satu kartu tenggat: chip "besok/hari ini/lewat", teks, judul catatan.
   Ketukan → buka catatan & lompat ke blok to-do-nya. */
const kartuTenggat = (x, penanda) => `
  <button class="row" data-todo-lompat="${x.n.id}" data-todo-bid="${x.bid}"
    title="${tr('Buka di catatan')} «${esc(x.n.title || tr('Tanpa judul'))}»">
    <div class="row-b">
      <div class="row-t" style="display:flex;align-items:center;gap:8px;min-width:0">
        <span class="tdg-chip">${esc(labelTenggat(x.teks))}</span>
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(
          (x.blok.content || '').replace(/<[^>]*>/g, ' ').replace(/^\S+\s*/, '').trim()
            || tr('Tanpa isi'))}</span></div>
      <div class="row-s">${esc(x.n.title || tr('Tanpa judul'))} · ${esc(penanda)}</div>
    </div>
  </button>`;

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
