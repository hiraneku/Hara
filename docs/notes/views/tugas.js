/* Layar Tugas & Reminder (Bagian B9) + matriks prioritas (K7),
   kalender bulanan (K9), dan kalender .ics (K8).

   Semua tenggat hidup di dalam isi catatan (lihat pengingat.js), sehingga
   layar ini tidak pernah bisa berbeda dari catatan aslinya. Matriks dan
   kalender hanya membaca; ekspor/impor ICS memakai ics.js. */

import { state, save } from '../../core/store.js?v=20261105210000';
import { acaraPadaTanggal, labelWaktuAcara, normalisasiAcara, timestampDariDinding } from '../kalender-acara-murni.js?v=20261105210001';
import { esc } from '../../core/dom.js?v=20261105210000';
import { tugasMendatang, tenggatHariIni, tenggatTodo, sisaWaktu, chipTenggat, jadwalUlang, ulangSetelahCentang } from '../pengingat.js?v=20261105210000';
import { kuadranTugas, kalenderBulan, jatuhPada } from '../kalender.js?v=20261105210000';
import { bangunIcs, uraiIcs, barisTodoDariAcara } from '../ics.js?v=20261105210000';
import { rowFor } from './row.js?v=20261105210000';
import { terlihat } from '../kunci.js?v=20261105210000';
import { t as tr, bahasaSekarang } from '../../core/i18n.js?v=20261105210000';
import { hariBerjurnal } from '../jurnal-tanggal.js?v=20261105210000';
import { toast } from '../../core/toast.js?v=20261105210000';
import { touch, makeNote } from '../note-model.js?v=20261105210000';
import { go, cur } from '../../core/router.js?v=20261105210000';
import { flush } from '../../core/autosave.js?v=20261105210000';
import { openNote } from '../model.js?v=20261105210000';

const aktif = () => state.notes.filter(n => !n.archived && !n.deletedAt && terlihat(n));
const SEHARI = 86400000;
const awalHari = ms => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };

/* Keadaan tampilan kalender (bukan data): bulan yang dilihat & hari dipilih. */
const sekarangAwal = () => awalHari(Date.now());
let kalBulan = (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); })();
let kalPilih = sekarangAwal();
let acaraEditId = '';
const LAPISAN_KUNCI = 'hara.kalender.lapisan.v1';
const lapisanDefault = { tenggat: true, acara: true, jurnal: true };
const bacaLapisan = () => {
  try { return { ...lapisanDefault, ...JSON.parse(localStorage.getItem(LAPISAN_KUNCI) || '{}') }; }
  catch { return { ...lapisanDefault }; }
};
let lapisan = bacaLapisan();
const isoHari = ms => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const zonaLokal = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export function ubahLapisanKalender(kunci, aktif) {
  if (!Object.hasOwn(lapisanDefault, kunci)) return;
  lapisan[kunci] = !!aktif;
  try { localStorage.setItem(LAPISAN_KUNCI, JSON.stringify(lapisan)); } catch { /* preferensi sesi tetap berlaku */ }
  if (cur === 'task') go('task');
}

export function bukaEditAcara(id) {
  acaraEditId = id || '';
  if (cur === 'task') go('task');
};

export function hapusAcaraKalender(id) {
  const index = state.acaraKalender.findIndex(a => a.id === id);
  if (index < 0) return;
  const [dihapus] = state.acaraKalender.splice(index, 1);
  save(); acaraEditId = '';
  if (cur === 'task') go('task');
  toast(tr('Acara dihapus'), { label: tr('Urungkan'), cb: () => {
    if (!state.acaraKalender.some(a => a.id === dihapus.id)) {
      state.acaraKalender.splice(Math.min(index, state.acaraKalender.length), 0, dihapus);
      save(); if (cur === 'task') go('task');
    }
  } });
}

export function simpanAcaraKalender(form) {
  const data = new FormData(form), sepanjangHari = data.get('sepanjangHari') === 'on';
  const zonaWaktu = String(data.get('zonaWaktu') || zonaLokal());
  const input = {
    id: acaraEditId || undefined, judul: data.get('judul'), kategori: data.get('kategori'),
    sepanjangHari, zonaWaktu,
  };
  if (sepanjangHari) {
    input.tanggalMulai = data.get('tanggalMulai');
    input.tanggalAkhir = data.get('tanggalAkhir') || input.tanggalMulai;
  } else {
    input.mulai = timestampDariDinding(data.get('tanggalMulai'), data.get('jamMulai'), zonaWaktu);
    input.selesai = timestampDariDinding(data.get('tanggalAkhir') || data.get('tanggalMulai'), data.get('jamAkhir'), zonaWaktu);
  }
  const valid = normalisasiAcara(input);
  if (!valid) { toast(tr('Periksa judul, tanggal, zona waktu, dan rentang acara')); return false; }
  if (acaraEditId) {
    const i = state.acaraKalender.findIndex(a => a.id === acaraEditId);
    if (i >= 0) state.acaraKalender[i] = { ...valid, dibuat: state.acaraKalender[i].dibuat, diubah: Date.now() };
    else state.acaraKalender.push(valid);
  } else state.acaraKalender.push(valid);
  state.acaraKalender.sort((a, b) => a.sepanjangHari ? (b.sepanjangHari ? a.tanggalMulai.localeCompare(b.tanggalMulai) : -1) : b.sepanjangHari ? 1 : a.mulai - b.mulai);
  acaraEditId = '';
  save(); toast(tr('Acara disimpan'));
  if (cur === 'task') go('task');
  return true;
}

/* ── kartu tenggat ── */

/* K4·K6: tunda / jadwal ulang langsung dari kartu (sekali-jalan saja). */
const PILIHAN_TUNDA = [['hari', 'Hari ini'], ['besok', 'Besok'], ['minggu depan', 'Minggu depan']];

const kartuTenggat = (x, penanda) => {
  const bisaTunda = !x.berulang && jadwalUlang(x.blok.content, 'besok') !== null;
  const sudahSelesai = !!(x.blok.meta && x.blok.meta.checked);
  return `<div class="tdg-item">
  <div class="tdg-main-row">
    <button type="button" class="tobox-btn${sudahSelesai ? ' on' : ''}"
      data-todo-cek="${esc(x.n.id)}" data-todo-bid="${esc(x.bid)}"
      aria-label="${sudahSelesai ? tr('Tandai belum selesai') : tr('Tandai selesai')}">
      <svg viewBox="0 0 24 24"><path d="M4 12l5 5L20 6"/></svg>
    </button>
    <button class="row" data-todo-lompat="${x.n.id}" data-todo-bid="${x.bid}"
      title="${tr('Buka di catatan')} «${esc(x.n.title || tr('Tanpa judul'))}»">
      <div class="row-b">
        <div class="row-t" style="display:flex;align-items:center;gap:8px;min-width:0">
          <span class="tdg-chip">${x.prioritas ? '<b class="tdg-prio" aria-label="' + tr('prioritas') + '">' + '!'.repeat(x.prioritas) + '</b> ' : ''}${x.berulang ? '↻ ' : ''}${esc(chipTenggat(x))}</span>
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;${sudahSelesai ? 'text-decoration:line-through;opacity:.65' : ''}">${esc(
            x.sisa || (x.blok.content || '').replace(/<[^>]*>/g, ' ').trim()
              || tr('Tanpa isi'))}</span></div>
        <div class="row-s">${esc(x.n.title || tr('Tanpa judul'))} · ${esc(penanda)}</div>
      </div>
    </button>
  </div>
  ${bisaTunda ? `<div class="tdg-tunda" role="group" aria-label="${tr('Jadwal ulang')}">
    ${PILIHAN_TUNDA.map(([kode, label]) => `<button class="tdg-btn" type="button"
      data-tunda="${esc(kode)}" data-note="${esc(x.n.id)}" data-bid="${esc(x.bid)}">${tr(label)}</button>`).join('')}
  </div>` : ''}
</div>`;
};

/**
 * Centang / batalkan centang to-do langsung dari daftar (Catatan / Tugas / Reminder)
 * tanpa perlu membuka editor catatan. Mendukung tugas berulang & Urungkan.
 */
export function toggleTodoDariDaftar(noteId, bid) {
  const n = state.notes.find(x => x.id === noteId);
  const b = n && (n.blocks || []).find(x => x.id === bid && x.type === 'todo');
  if (!n || !b) return false;
  const sblm = JSON.parse(JSON.stringify(b.meta || {}));
  b.meta = { ...(b.meta || {}) };
  const akanCentang = !b.meta.checked;

  if (akanCentang) {
    const nx = ulangSetelahCentang(b.content || '', Number(b.meta.ulangKe) || 0);
    if (nx) {
      b.meta.ulangKe = nx;
      b.meta.checked = false;
      delete b.meta.done;
      touch(n);
      save();
      if (cur === 'notes' || cur === 'task' || cur === 'rem') go(cur);
      toast(tr('Berulang · berikutnya') + ' ' + new Date(nx).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }));
      return true;
    }
    b.meta.checked = true;
    b.meta.done = Date.now();
  } else {
    b.meta.checked = false;
    delete b.meta.done;
  }

  touch(n);
  save();
  if (cur === 'notes' || cur === 'task' || cur === 'rem') go(cur);
  toast(akanCentang ? tr('Tugas selesai') : tr('Dikembalikan ke belum selesai'), {
    label: tr('Urungkan'),
    fn: () => {
      b.meta = sblm;
      touch(n);
      save();
      if (cur === 'notes' || cur === 'task' || cur === 'rem') go(cur);
    },
  });
  return true;
}

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

const bagianZona = (ms, zona) => {
  const p = new Intl.DateTimeFormat('en', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(ms));
  const v = Object.fromEntries(p.map(x => [x.type, x.value]));
  return { tanggal: `${v.year}-${v.month}-${v.day}`, jam: `${v.hour}:${v.minute}` };
};
const formAcaraHtml = () => {
  const acara = state.acaraKalender.find(a => a.id === acaraEditId);
  const zona = acara?.zonaWaktu || zonaLokal();
  const awal = acara?.sepanjangHari ? { tanggal: acara.tanggalMulai, jam: '09:00' } : acara ? bagianZona(acara.mulai, zona) : { tanggal: isoHari(kalPilih), jam: '09:00' };
  const akhir = acara?.sepanjangHari ? { tanggal: acara.tanggalAkhir, jam: '10:00' } : acara ? bagianZona(acara.selesai, zona) : { tanggal: isoHari(kalPilih), jam: '10:00' };
  const zonaPilihan = [...new Set([zona, 'Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura', 'UTC'])];
  return `<details class="kal-form-detail" ${acara ? 'open' : ''}><summary>${acara ? tr('Edit acara') : tr('Tambah acara')}</summary>
    <form class="kal-acara-form" data-kal-acara-form>
      <label>${tr('Judul')}<input name="judul" maxlength="240" required value="${esc(acara?.judul || '')}" placeholder="${tr('Nama acara')}"></label>
      <div class="kal-form-grid">
        <label>${tr('Mulai')}<input type="date" name="tanggalMulai" required value="${awal.tanggal}"></label>
        <label>${tr('Sampai')}<input type="date" name="tanggalAkhir" required value="${akhir.tanggal}"></label>
      </div>
      <div class="kal-form-grid kal-waktu" ${acara?.sepanjangHari ? 'hidden' : ''}>
        <label>${tr('Jam mulai')}<input type="time" name="jamMulai" value="${awal.jam}" ${acara?.sepanjangHari ? '' : 'required'}></label>
        <label>${tr('Jam selesai')}<input type="time" name="jamAkhir" value="${akhir.jam}" ${acara?.sepanjangHari ? '' : 'required'}></label>
      </div>
      <label class="kal-centang"><input type="checkbox" name="sepanjangHari" data-kal-sepanjang ${acara?.sepanjangHari ? 'checked' : ''}> ${tr('Sepanjang hari')}</label>
      <div class="kal-form-grid">
        <label>${tr('Kategori')}<select name="kategori">
          ${[['personal','Pribadi'],['work','Kerja'],['study','Belajar'],['other','Lainnya']].map(([v,l]) => `<option value="${v}" ${(acara?.kategori || 'personal') === v ? 'selected' : ''}>${tr(l)}</option>`).join('')}
        </select></label>
        <label>${tr('Zona waktu')}<select name="zonaWaktu">${zonaPilihan.map(z => `<option value="${esc(z)}" ${z === zona ? 'selected' : ''}>${esc(z)}${z === zonaLokal() ? ` · ${tr('lokal')}` : ''}</option>`).join('')}</select></label>
      </div>
      <p class="kal-form-hint">${tr('Jam ditafsirkan pada zona waktu yang dipilih. Tanggal acara sepanjang hari tidak bergeser antar-zona.')}</p>
      <div class="kal-form-aksi"><button class="btn btn-pri" type="submit">${acara ? tr('Simpan perubahan') : tr('Simpan acara')}</button>${acara ? `<button class="btn" type="button" data-kal-batal-edit>${tr('Batal')}</button>` : ''}</div>
    </form></details>`;
};
const kartuAcara = acara => `<div class="kal-acara kal-acara-${esc(acara.kategori)}">
  <div class="kal-acara-teks"><b>${esc(acara.judul)}</b><span>${esc(labelWaktuAcara(acara, bahasaSekarang()))} · ${tr(acara.kategori === 'work' ? 'Kerja' : acara.kategori === 'study' ? 'Belajar' : acara.kategori === 'personal' ? 'Pribadi' : 'Lainnya')}</span></div>
  <div class="kal-acara-aksi"><button type="button" class="kal-acara-btn" data-kal-edit="${esc(acara.id)}">${tr('Edit')}</button><button type="button" class="kal-acara-btn" data-kal-hapus="${esc(acara.id)}">${tr('Hapus')}</button></div>
</div>`;

/* ── K9 · kalender bulanan ── */
const kalenderHtml = daftar => {
  const awal = new Date(kalBulan);
  const tahun = awal.getFullYear(), bulan = awal.getMonth();
  const semua = daftar.flatMap(n => tenggatTodo(n).map(x => ({ n, ...x })));
  const peta = kalenderBulan(lapisan.tenggat ? semua : [], tahun, bulan);
  const acaraSemua = lapisan.acara ? state.acaraKalender : [];
  const acaraHari = ms => acaraSemua.filter(a => acaraPadaTanggal(a, isoHari(ms)));
  const hariPertama = (new Date(tahun, bulan, 1).getDay() + 6) % 7;   /* Senin = 0 */
  const jumlah = new Date(tahun, bulan + 1, 0).getDate();
  const hariSingkat = Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 0, 1 + i).toLocaleDateString(undefined, { weekday: 'narrow' }));
  const judulBulan = awal.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const hariIni = sekarangAwal();
  /* B8: hari yang sudah punya jurnal. Catatan terkunci yang tidak terlihat tidak ikut. */
  const berjurnal = hariBerjurnal(state.notes.filter(n => terlihat(n)), tahun, bulan, bahasaSekarang());

  let sel = '';
  for (let i = 0; i < hariPertama; i++) sel += '<span class="kal-kosong"></span>';
  for (let tgl = 1; tgl <= jumlah; tgl++) {
    const ms = new Date(tahun, bulan, tgl).getTime();
    const isi = peta.get(tgl) || [];
    const acaraIsi = acaraHari(ms);
    const jumlahTitik = isi.length + acaraIsi.length;
    const kelas = ['kal-hari'];
    if (ms === hariIni) kelas.push('kal-kini');
    if (ms === kalPilih) kelas.push('kal-pilih');
    if (jumlahTitik) kelas.push('kal-ada');
    const adaJurnal = lapisan.jurnal && berjurnal.has(tgl);
    sel += `<button type="button" class="${kelas.join(' ')}" data-kal-hari="${ms}"
      aria-label="${tgl}${isi.length ? ' · ' + isi.length + ' ' + tr('tenggat') : ''}${acaraIsi.length ? ' · ' + acaraIsi.length + ' ' + tr('acara') : ''}${adaJurnal ? ' · ' + tr('ada jurnal') : ''}" aria-pressed="${ms === kalPilih}">
      <span>${tgl}</span>${jumlahTitik ? `<i class="kal-titik">${jumlahTitik > 9 ? '9+' : jumlahTitik}</i>` : ''}${acaraIsi.length ? '<i class="kal-acara-titik" aria-hidden="true"></i>' : ''}${adaJurnal ? '<i class="kal-jurnal-titik" aria-hidden="true"></i>' : ''}</button>`;
  }

  const terpilih = lapisan.tenggat ? semua.filter(x => jatuhPada(x, kalPilih)) : [];
  const acaraTerpilih = lapisan.acara ? acaraHari(kalPilih).sort((a, b) => a.sepanjangHari ? (b.sepanjangHari ? a.tanggalMulai.localeCompare(b.tanggalMulai) : -1) : b.sepanjangHari ? 1 : a.mulai - b.mulai) : [];
  const judulPilih = new Date(kalPilih).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  return `<div class="sec" id="kal-bagian" style="margin-top:22px"><h2>${tr('Kalender')}</h2></div>
  <div class="card kal">
    <div class="kal-head">
      <button type="button" class="kal-nav" data-kal="prev" aria-label="${tr('Bulan sebelumnya')}">‹</button>
      <b>${esc(judulBulan)}</b>
      <button type="button" class="kal-nav" data-kal="next" aria-label="${tr('Bulan berikutnya')}">›</button>
      <button type="button" class="kal-today" data-kal="today">${tr('Hari ini')}</button>
    </div>
    <div class="kal-lapisan" role="group" aria-label="${tr('Tampilkan lapisan kalender')}">
      ${[['tenggat','Tenggat & pengingat'],['acara','Acara'],['jurnal','Jurnal']].map(([k,l]) => `<label class="kal-layer"><input type="checkbox" data-kal-lapisan="${k}" ${lapisan[k] ? 'checked' : ''}><span class="kal-layer-dot kal-layer-${k}"></span>${tr(l)}</label>`).join('')}
    </div>
    <div class="kal-grid" role="grid">
      ${hariSingkat.map(h => `<span class="kal-dow">${esc(h)}</span>`).join('')}
      ${sel}
    </div>
    <div class="kal-detail">
      <div class="kal-judul">${esc(judulPilih)}</div>
      ${lapisan.jurnal ? `<div class="kal-jurnal-status">${berjurnal.has(new Date(kalPilih).getDate()) ? tr('Jurnal tersedia') : tr('Belum ada jurnal untuk tanggal ini.')}</div><button type="button" class="kal-jurnal" data-kal-jurnal="${kalPilih}">${tr(berjurnal.has(new Date(kalPilih).getDate()) ? 'Buka jurnal' : 'Buat jurnal')}</button>` : ''}
      ${acaraTerpilih.length ? `<div class="kal-acara-daftar">${acaraTerpilih.map(kartuAcara).join('')}</div>` : ''}
      ${terpilih.length ? `<div class="kal-tenggat-daftar">${terpilih.map(x => kartuTenggat(x, sisaWaktu(x.waktu))).join('')}</div>` : ''}
      ${!acaraTerpilih.length && !terpilih.length ? `<p class="dm-kosong">${tr('Tidak ada agenda pada tanggal ini.')}</p>` : ''}
      ${lapisan.acara ? formAcaraHtml() : ''}
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

/* B8 lanjutan: dari jurnal, buka layar Tugas dengan tanggal itu terpilih di kalender.
   ms bisa tengah hari; dipangkas ke awal hari supaya cocok dengan sel kalender. */
export function tampilkanKalenderTanggal(ms) {
  kalPilih = awalHari(Number(ms));
  const d = new Date(kalPilih);
  kalBulan = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  go('task');
  /* kalender ada di bawah daftar tugas. Gulir ke kartunya supaya tombol Buka jurnal
     langsung terlihat (di HP tidak tertutup bilah navigasi bawah). */
  setTimeout(() => document.getElementById('kal-bagian')?.scrollIntoView({ block: 'start' }), 0);
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
      ? `<div class="card">${tuntas.slice(0, 8).map(x => kartuTenggat(x, tr('selesai') + ' ' + sisaWaktu(x.blok.meta.done))).join('')}</div>`
      : `<p class="dm-kosong" style="padding:2px 2px 6px">${tr('Belum ada yang selesai hari ini.')}</p>`}
  </div>`;
};
