/* Layar Tugas & Reminder (Bagian B9) + matriks prioritas (K7),
   kalender bulanan (K9), dan kalender .ics (K8).

   Semua tenggat hidup di dalam isi catatan (lihat pengingat.js), sehingga
   layar ini tidak pernah bisa berbeda dari catatan aslinya. Matriks dan
   kalender hanya membaca; ekspor/impor ICS memakai ics.js. */

import { state, save } from '../../core/store.js?v=20261010022204';
import { esc } from '../../core/dom.js?v=20261010022204';
import { tugasMendatang, tenggatHariIni, tenggatTodo, sisaWaktu, chipTenggat, jadwalUlang } from '../pengingat.js?v=20261010022204';
import { kuadranTugas, kalenderBulan, jatuhPada } from '../kalender.js?v=20261010022204';
import { bangunIcs, uraiIcs, barisTodoDariAcara } from '../ics.js?v=20261010022204';
import { rowFor } from './row.js?v=20261010022204';
import { t as tr } from '../../core/i18n.js?v=20261010022204';
import { toast } from '../../core/toast.js?v=20261010022204';
import { touch, makeNote } from '../note-model.js?v=20261010022204';
import { go, cur } from '../../core/router.js?v=20261010022204';
import { flush } from '../../core/autosave.js?v=20261010022204';
import { openNote } from '../model.js?v=20261010022204';

const aktif = () => state.notes.filter(n => !n.archived && !n.deletedAt);
const SEHARI = 86400000;
const awalHari = ms => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };

/* Keadaan tampilan kalender (bukan data): bulan yang dilihat & hari dipilih. */
const sekarangAwal = () => awalHari(Date.now());
let kalBulan = (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); })();
let kalPilih = sekarangAwal();

/* ── kartu tenggat ── */

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

/* ── K7 · matriks prioritas ── */
const KUADRAN = [
  ['kerjakan', 'Kerjakan sekarang', 'mendesak & penting'],
  ['jadwalkan', 'Jadwalkan', 'penting, belum mendesak'],
  ['cepat', 'Selesaikan cepat', 'mendesak, tidak terlalu penting'],
  ['nanti', 'Nanti', 'belum mendesak, tidak penting'],
];

const matriksHtml = daftar => {
  const q = kuadranTugas(tugasMendatang(daftar));
  const total = KUADRAN.reduce((s, [k]) => s + q[k].length, 0);
  if (!total) return '';
  const sel = (items) => items.length
    ? items.slice(0, 6).map(x => `<button class="mtx-i" type="button" data-todo-lompat="${x.n.id}" data-todo-bid="${x.bid}"
        title="${esc(x.n.title || tr('Tanpa judul'))}">${esc(x.sisa || tr('Tanpa isi'))}</button>`).join('')
      + (items.length > 6 ? `<span class="mtx-lagi">+${items.length - 6}</span>` : '')
    : `<span class="mtx-kosong">—</span>`;
  return `<div class="sec" style="margin-top:22px"><h2>${tr('Matriks prioritas')}</h2></div>
    <div class="mtx">${KUADRAN.map(([k, judul, ket]) => `
      <section class="mtx-q mtx-${k}" aria-label="${esc(tr(judul))}">
        <header><b>${esc(tr(judul))}</b><small>${esc(tr(ket))}</small></header>
        <div class="mtx-isi">${sel(q[k])}</div>
      </section>`).join('')}</div>`;
};

/* ── K9 · kalender bulanan ── */
const kalenderHtml = daftar => {
  const awal = new Date(kalBulan);
  const tahun = awal.getFullYear(), bulan = awal.getMonth();
  const semua = daftar.flatMap(n => tenggatTodo(n).map(x => ({ n, ...x })));
  const peta = kalenderBulan(semua, tahun, bulan);
  const hariPertama = (new Date(tahun, bulan, 1).getDay() + 6) % 7;   /* Senin = 0 */
  const jumlah = new Date(tahun, bulan + 1, 0).getDate();
  const hariSingkat = Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 0, 1 + i).toLocaleDateString(undefined, { weekday: 'narrow' }));
  const judulBulan = awal.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const hariIni = sekarangAwal();

  let sel = '';
  for (let i = 0; i < hariPertama; i++) sel += '<span class="kal-kosong"></span>';
  for (let tgl = 1; tgl <= jumlah; tgl++) {
    const ms = new Date(tahun, bulan, tgl).getTime();
    const isi = peta.get(tgl) || [];
    const kelas = ['kal-hari'];
    if (ms === hariIni) kelas.push('kal-kini');
    if (ms === kalPilih) kelas.push('kal-pilih');
    if (isi.length) kelas.push('kal-ada');
    sel += `<button type="button" class="${kelas.join(' ')}" data-kal-hari="${ms}"
      aria-label="${tgl}${isi.length ? ' · ' + isi.length : ''}" aria-pressed="${ms === kalPilih}">
      <span>${tgl}</span>${isi.length ? `<i class="kal-titik">${isi.length > 9 ? '9+' : isi.length}</i>` : ''}</button>`;
  }

  const terpilih = semua.filter(x => jatuhPada(x, kalPilih));
  const judulPilih = new Date(kalPilih).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  return `<div class="sec" style="margin-top:22px"><h2>${tr('Kalender')}</h2></div>
  <div class="card kal">
    <div class="kal-head">
      <button type="button" class="kal-nav" data-kal="prev" aria-label="${tr('Bulan sebelumnya')}">‹</button>
      <b>${esc(judulBulan)}</b>
      <button type="button" class="kal-nav" data-kal="next" aria-label="${tr('Bulan berikutnya')}">›</button>
      <button type="button" class="kal-today" data-kal="today">${tr('Hari ini')}</button>
    </div>
    <div class="kal-grid" role="grid">
      ${hariSingkat.map(h => `<span class="kal-dow">${esc(h)}</span>`).join('')}
      ${sel}
    </div>
    <div class="kal-detail">
      <div class="kal-judul">${esc(judulPilih)}</div>
      ${terpilih.length
        ? terpilih.map(x => kartuTenggat(x, sisaWaktu(x.waktu))).join('')
        : `<p class="dm-kosong">${tr('Tidak ada tenggat di hari ini.')}</p>`}
    </div>
  </div>`;
};

/* Navigasi kalender: ganti bulan atau kembali ke hari ini. Dipanggil dari index.js. */
export function geserKalender(aksi, ms) {
  if (aksi === 'prev' || aksi === 'next') {
    const d = new Date(kalBulan);
    d.setMonth(d.getMonth() + (aksi === 'next' ? 1 : -1), 1);
    kalBulan = d.getTime();
  } else if (aksi === 'today') {
    const d = new Date(); kalBulan = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    kalPilih = sekarangAwal();
  } else if (aksi === 'pilih' && ms) {
    kalPilih = Number(ms);
    const d = new Date(kalPilih); kalBulan = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  }
  if (cur === 'task') go('task');
}

/* ── K8 · ekspor & impor .ics ── */
export function unduhIcs() {
  const teks = bangunIcs(aktif());
  if (!teks.includes('BEGIN:VEVENT')) return toast(tr('Belum ada tenggat untuk diekspor'));
  const url = URL.createObjectURL(new Blob([teks], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = 'hara-tugas.ics';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(tr('Kalender diunduh'));
}

/* Acara dari berkas .ics → satu catatan baru berisi to-do. */
export async function imporIcs(berkas) {
  if (!berkas) return;
  const acara = uraiIcs(await berkas.text());
  if (!acara.length) return toast(tr('Tidak ada acara di berkas .ics'));
  flush();
  const n = makeNote({
    title: tr('Impor kalender'),
    blocks: acara.map(a => ({ type: 'todo', content: barisTodoDariAcara(a) })),
  });
  state.seq++;
  state.notes.unshift(n);
  save();
  toast(tr('Diimpor') + ' ' + acara.length);
  openNote(n.id);
}

/* ── tampilan ── */
const aksiIcsHtml = () => `<div class="ics-aksi">
    <button class="btn" type="button" data-ics-unduh>${tr('Unduh kalender (.ics)')}</button>
    <label class="btn" style="cursor:pointer">${tr('Impor .ics')}
      <input type="file" accept=".ics,text/calendar" data-ics-impor hidden></label>
  </div>`;

export const tugasView = () => {
  /* tugasMendatang() sudah mengecualikan to-do yang dicentang (checked),
     jadi cukup tampilkan apa adanya — sematan tidak menghapus tenggat. */
  const daftar = aktif();
  const tunggak = tugasMendatang(daftar);
  return `<div class="page">
    <div class="sec"><h2>${tr('Mendatang · 7 hari')}</h2></div>
    ${aksiIcsHtml()}
    ${tunggak.length
      ? `<div class="card">${tunggak.map(x => kartuTenggat(x, sisaWaktu(x.waktu))).join('')}</div>`
      : `<div class="empty" style="padding:40px 20px"><h3>${tr('Tenang — tidak ada tenggat')}</h3>
         <p>${tr('Tulis to-do dengan tenggat di awal baris:')} <b style="font-family:var(--mono);font-weight:500">${tr('besok lari pagi')}</b>, <b style="font-family:var(--mono);font-weight:500">${tr('jumat lapor pajak')}</b>, atau <b style="font-family:var(--mono);font-weight:500">2026-12-31 target</b>.</p>
         <button class="btn btn-pri" data-act2="new">${tr('Tulis catatan baru')}</button></div>`}
    ${matriksHtml(daftar)}
    ${kalenderHtml(daftar)}
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
