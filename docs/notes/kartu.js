/* Flashcard (C7, Tahap 4) — glue UI.

   • Jadikan kartu: formulir lembar bawah. Depan terisi dari teks yang disorot, belakang diisi pengguna.
   • Latihan kartu: satu kartu tampil, "Lihat jawaban" membaliknya, lalu "Ingat" atau "Belum".
     "Belum" memindahkan kartu ke belakang antrean dalam sesi yang sama.
   • Hitungan benar/salah disimpan per kartu. Tidak ada penjadwalan ulang (§2.7).
   Logika murni ada di kartu-murni.js. */

import { state, save } from '../core/store.js?v=20261105210000';
import { openPop, setPopIsi, closeAll, pop } from './menus/pop.js?v=20261105210000';
import { sheet } from './sheet.js?v=20261105210000';
import { docEl, sel } from './editor/caret.js?v=20261105210000';
import { toast } from '../core/toast.js?v=20261105210000';
import { esc } from '../core/dom.js?v=20261105210000';
import { t as tr } from '../core/i18n.js?v=20261105210000';
import { buatKartu, catatNilai, antrianAwal, kartuBerikutnya, langkahAntrean, ringkasLatihanKartu } from './kartu-murni.js?v=20261105210000';

const PESAN = {
  'depan-kosong': 'Isi bagian depan kartu (pertanyaan).',
  'belakang-kosong': 'Isi bagian belakang kartu (jawaban).',
  'terlalu-panjang': 'Teks kartu terlalu panjang. Persingkat sampai 2000 karakter.',
};

/* Catatan yang sedang dibuka, untuk sumber kartu. */
function catatAktif() {
  return state.notes.find(n => n.id === state.openId) || null;
}

/* Teks yang disorot di editor, dipakai sebagai depan kartu. */
function teksSorot() {
  const d = docEl();
  const s = sel();
  if (!d || !s || !s.rangeCount) return '';
  const r = s.getRangeAt(0);
  if (!d.contains(r.commonAncestorContainer)) return '';
  return r.toString();
}

/* Menu Jadikan kartu. Dipanggil dari bar sebelum popup dibuka, jadi seleksi masih ada. */
export function kartuBuatMenu() {
  const catatan = catatAktif();
  const depan = teksSorot().replace(/\s+/g, ' ').trim();
  const isi = `<div class="kt-form">
      <label class="sh-lab" for="kt-d">${tr('Depan (pertanyaan)')}</label>
      <input class="sh-inp pop-in" id="kt-d" type="text" maxlength="2000" autocomplete="off" value="${esc(depan)}">
      <label class="sh-lab" for="kt-b">${tr('Belakang (jawaban)')}</label>
      <input class="sh-inp pop-in" id="kt-b" type="text" maxlength="2000" autocomplete="off" placeholder="${esc(tr('Tulis jawabannya'))}">
      <p class="sh-note">${tr('Sumber')}: ${esc(catatan ? (catatan.title || tr('Tanpa judul')) : '—')}</p>
    </div>`;
  const kaki = `<button class="btn btn-pri" data-kt="ok">${tr('Simpan kartu')}</button>`;
  return sheet({ ikon: 'i-plus', judul: tr('Jadikan kartu'), isi, kaki, kelas: 'kt-sh' });
}

/* Dipanggil dari pop.js saat tombol Simpan kartu ditekan atau Enter di kolom. */
export function applyKartuBaru() {
  const p = pop();
  const d = p ? p.querySelector('#kt-d') : null;
  const b = p ? p.querySelector('#kt-b') : null;
  const catatan = catatAktif();
  const hasil = buatKartu({
    depan: d ? d.value : '',
    belakang: b ? b.value : '',
    sumberId: catatan ? catatan.id : null,
    sumberJudul: catatan ? (catatan.title || '') : '',
  });
  if (!hasil.ok) {
    toast(tr(PESAN[hasil.alasan] || PESAN['depan-kosong']));
    if (hasil.alasan === 'belakang-kosong' && b) b.focus();
    return false;
  }
  state.kartu.push(hasil.kartu);
  save();
  closeAll();
  toast(tr('Kartu disimpan · {n} kartu', { n: state.kartu.length }));
  return true;
}

/* ── Latihan ── */

let sesi = null;   /* { antrean, again, hard, good, easy, telahUlang: Set } */

function kartuDenganId(id) {
  return state.kartu.find(k => k.id === id) || null;
}

function urutanSemuaKartu() {
  return [...state.kartu].sort((a, b) => (a.dueAt || 0) - (b.dueAt || 0)
    || (a.dibuat - b.dibuat) || (a.id < b.id ? -1 : 1)).map(k => k.id);
}

function mulaiSesi(semua = false) {
  sesi = {
    antrean: semua ? urutanSemuaKartu() : antrianAwal(state.kartu),
    lagi: 0, sulit: 0, baik: 0, mudah: 0, modeSemua: semua,
    telahUlang: new Set(), balik: false,
  };
}

function tampilkan(html) {
  const p = pop();
  if (p && p.classList.contains('on')) setPopIsi(html);
  else openPop(html, null);
}

function renderLatihan() {
  if (!sesi) return;
  const r = ringkasLatihanKartu(sesi);
  if (!sesi.antrean.length) {
    const berikutnya = kartuBerikutnya(state.kartu);
    const waktuBerikut = Number.isFinite(berikutnya)
      ? `<p class="sh-note">${tr('Kartu berikutnya jatuh tempo')}: ${esc(new Date(berikutnya).toLocaleString())}</p>` : '';
    const isi = `<div class="kt-kartu kt-selesai">
        <div class="kt-teks">${tr('Sesi selesai')}</div>
        <p class="sh-note">${tr('Lagi')}: ${r.lagi} · ${tr('Sulit')}: ${r.sulit} · ${tr('Ingat')}: ${r.baik} · ${tr('Mudah')}: ${r.mudah}</p>
        ${waktuBerikut || `<p class="sh-note">${tr('Semua kartu sudah dijadwalkan.')}</p>`}
      </div>`;
    const kaki = `<div class="kt-baris">
        <button class="btn btn-sec" data-kt-aksi="semua">${tr('Latihan semua kartu')}</button>
        <button class="btn btn-pri" data-kt-aksi="tutup">${tr('Tutup')}</button>
      </div>`;
    tampilkan(sheet({ ikon: 'i-book', judul: tr('Latihan kartu'), isi, kaki, kelas: 'kt-sh' }));
    return;
  }
  const k = kartuDenganId(sesi.antrean[0]);
  const sisa = sesi.antrean.length;
  const isi = `<div class="kt-kartu">
      <div class="sh-lab">${tr('Depan')}</div>
      <div class="kt-teks">${esc(k ? k.depan : '')}</div>
      ${sesi.balik ? `<div class="sh-lab kt-garis">${tr('Belakang')}</div>
        <div class="kt-teks">${esc(k ? k.belakang : '')}</div>` : ''}
      <p class="sh-note">${esc(k && k.sumberJudul ? k.sumberJudul : '')}</p>
    </div>
    <p class="sh-note kt-hitung">${tr('Sisa')}: ${sisa} · ${tr('Lagi')}: ${r.lagi} · ${tr('Sulit')}: ${r.sulit} · ${tr('Ingat')}: ${r.baik} · ${tr('Mudah')}: ${r.mudah}</p>`;
  const kaki = sesi.balik
    ? `<div class="kt-rating">
         <button class="btn btn-sec" data-kt-aksi="again">${tr('Lagi')}<small>${tr('Ulangi segera')}</small></button>
         <button class="btn btn-sec" data-kt-aksi="hard">${tr('Sulit')}<small>${tr('Jadwal pendek')}</small></button>
         <button class="btn btn-pri" data-kt-aksi="good">${tr('Ingat')}<small>${tr('Jadwal normal')}</small></button>
         <button class="btn btn-pri" data-kt-aksi="easy">${tr('Mudah')}<small>${tr('Jadwal panjang')}</small></button>
       </div>`
    : `<div class="kt-baris"><button class="btn btn-pri" data-kt-aksi="balik">${tr('Lihat jawaban')}</button></div>`;
  tampilkan(sheet({ ikon: 'i-book', judul: tr('Latihan kartu'), isi,
    kaki: kaki + `<button class="btn btn-sec kt-hapus" data-kt-aksi="hapus">${tr('Hapus kartu ini')}</button>`, kelas: 'kt-sh' }));
}

export function bukaLatihan() {
  if (!state.kartu.length) {
    toast(tr('Belum ada kartu. Sorot teks, lalu pilih Jadikan kartu.'));
    return;
  }
  mulaiSesi(false);
  renderLatihan();
}

export function kartuAksi(aksi) {
  if (aksi === 'tutup') { sesi = null; closeAll(); return; }
  if (aksi === 'semua') { mulaiSesi(true); renderLatihan(); return; }
  if (!sesi) return;
  if (aksi === 'balik') { sesi.balik = true; renderLatihan(); return; }
  const id = sesi.antrean[0];
  if (aksi === 'hapus') {
    state.kartu = state.kartu.filter(k => k.id !== id);
    save();
    sesi.antrean = sesi.antrean.filter(x => x !== id);
    sesi.balik = false;
    toast(tr('Kartu dihapus'));
    renderLatihan();
    return;
  }
  const alias = aksi === 'ingat' ? 'good' : aksi === 'belum' ? 'again' : aksi;
  if (!['again', 'hard', 'good', 'easy'].includes(alias)) return;
  const k = kartuDenganId(id);
  if (k) { catatNilai(k, alias); save(); }
  const namaHitung = { again: 'lagi', hard: 'sulit', good: 'baik', easy: 'mudah' }[alias];
  sesi[namaHitung]++;
  if (alias === 'again' && !sesi.telahUlang.has(id)) {
    sesi.antrean = langkahAntrean(sesi.antrean, id, alias);
    sesi.telahUlang.add(id);
  } else {
    sesi.antrean = sesi.antrean.filter(x => x !== id);
  }
  sesi.balik = false;
  renderLatihan();
}
