/* Flashcard (C7, Tahap 4) — glue UI.

   • Jadikan kartu: formulir lembar bawah. Depan terisi dari teks yang disorot, belakang diisi pengguna.
   • Latihan kartu: satu kartu tampil, "Lihat jawaban" membaliknya, lalu "Ingat" atau "Belum".
     "Belum" memindahkan kartu ke belakang antrean dalam sesi yang sama.
   • Hitungan benar/salah disimpan per kartu. Tidak ada penjadwalan ulang (§2.7).
   Logika murni ada di kartu-murni.js. */

import { state, save } from '../core/store.js?v=20261029190000';
import { openPop, setPopIsi, closeAll, pop } from './menus/pop.js?v=20261029190000';
import { sheet } from './sheet.js?v=20261029190000';
import { docEl, sel } from './editor/caret.js?v=20261029190000';
import { toast } from '../core/toast.js?v=20261029190000';
import { esc } from '../core/dom.js?v=20261029190000';
import { t as tr } from '../core/i18n.js?v=20261029190000';
import { buatKartu, catatNilai, antrianAwal, langkahAntrean, ringkasSesi } from './kartu-murni.js?v=20261029190000';

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

let sesi = null;   /* { antrean: [id], ingat, belum, balik } */

function kartuDenganId(id) {
  return state.kartu.find(k => k.id === id) || null;
}

function mulaiSesi() {
  const antrean = antrianAwal(state.kartu);
  sesi = { antrean, ingat: 0, belum: 0, balik: false };
}

function tampilkan(html) {
  const p = pop();
  if (p && p.classList.contains('on')) setPopIsi(html);
  else openPop(html, null);
}

function renderLatihan() {
  if (!sesi) return;
  const ringkas = ringkasSesi(sesi);
  if (!sesi.antrean.length) {
    const isi = `<div class="kt-kartu kt-selesai">
        <div class="kt-teks">${tr('Selesai')}</div>
        <p class="sh-note">${tr('Kartu ingat')}: ${ringkas.ingat} · ${tr('Belum')}: ${ringkas.belum}</p>
      </div>`;
    const kaki = `<div class="kt-baris">
        <button class="btn btn-sec" data-kt-aksi="ulang">${tr('Ulangi latihan')}</button>
        <button class="btn btn-pri" data-kt-aksi="tutup">${tr('Tutup')}</button>
      </div>`;
    tampilkan(sheet({ ikon: 'i-book', judul: tr('Latihan kartu'), isi, kaki, kelas: 'kt-sh' }));
    return;
  }
  const k = kartuDenganId(sesi.antrean[0]);
  const isi = `<div class="kt-kartu">
      <div class="sh-lab">${tr('Depan')}</div>
      <div class="kt-teks">${esc(k ? k.depan : '')}</div>
      ${sesi.balik ? `<div class="sh-lab kt-garis">${tr('Belakang')}</div>
        <div class="kt-teks">${esc(k ? k.belakang : '')}</div>` : ''}
      <p class="sh-note">${esc(k && k.sumberJudul ? k.sumberJudul : '')}</p>
    </div>
    <p class="sh-note kt-hitung">${tr('Sisa')}: ${sesi.antrean.length} · ${tr('Kartu ingat')}: ${ringkas.ingat} · ${tr('Belum')}: ${ringkas.belum}</p>`;
  const kaki = sesi.balik
    ? `<div class="kt-baris">
         <button class="btn btn-sec" data-kt-aksi="belum">${tr('Belum')}</button>
         <button class="btn btn-pri" data-kt-aksi="ingat">${tr('Kartu ingat')}</button>
       </div>`
    : `<div class="kt-baris">
         <button class="btn btn-pri" data-kt-aksi="balik">${tr('Lihat jawaban')}</button>
       </div>`;
  tampilkan(sheet({ ikon: 'i-book', judul: tr('Latihan kartu'), isi, kaki: kaki + `<button class="btn btn-sec kt-hapus" data-kt-aksi="hapus">${tr('Hapus kartu ini')}</button>`, kelas: 'kt-sh' }));
}

/* Tombol Latihan kartu di bar. */
export function bukaLatihan() {
  if (!state.kartu.length) {
    toast(tr('Belum ada kartu. Sorot teks, lalu pilih Jadikan kartu.'));
    return;
  }
  mulaiSesi();
  renderLatihan();
}

/* Dipanggil dari pop.js untuk tombol [data-kt-aksi]. */
export function kartuAksi(aksi) {
  if (!sesi && aksi !== 'ulang') return;
  if (aksi === 'tutup') { sesi = null; closeAll(); return; }
  if (aksi === 'ulang') { mulaiSesi(); renderLatihan(); return; }
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
  if (aksi !== 'ingat' && aksi !== 'belum') return;
  const k = kartuDenganId(id);
  if (k) { catatNilai(k, aksi); save(); }
  sesi.antrean = langkahAntrean(sesi.antrean, id, aksi);
  sesi[aksi]++;
  sesi.balik = false;
  renderLatihan();
}
