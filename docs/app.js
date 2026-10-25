/* Titik masuk Hara. Daftarkan modul di sini. */
import { load, state } from './core/store.js?v=20261025102350';
import { go, onAfterRender, kembali, cur, adaInduk } from './core/router.js?v=20261025102350';
import { toast } from './core/toast.js?v=20261025102350';
import { mulaiPembaruan } from './core/pembaruan.js?v=20261025102350';
import { mulaiBeranda } from './home/beranda.js?v=20261025102350';
import { terapkan as terapkanTema, toggle as toggleTema } from './core/theme.js?v=20261025102350';
import { initPalette, daftarkanSumber, bukaPalette } from './core/palette.js?v=20261025102350';
import { daftarkanGrupFitur } from './core/menu-fitur.js?v=20261025102350';
import { buatTinjauan } from './notes/pintar-aksi.js?v=20261025102350';
import { bukaStatistik } from './notes/statistik-ui.js?v=20261025102350';
import { notesModule } from './notes/index.js?v=20261025102350';
import { renamerModule, unduhLogRenamerCsv, renamerAlatCtx } from './renamer/index.js?v=20261025102350';
import { musikModule } from './musik/index.js?v=20261025102350';
import { bukaRegex, bukaBelajarContoh, bukaSyaratAturan, eksporResep, pilihResepUntukImpor, bukaDuplikat } from './renamer/alat.js?v=20261025102350';
import {
  bacaCatatanKeras, hentikanBaca, dikteCatatanBaru,
  bukaCadanganTerenkripsiDialog, pilihCadanganTerenkripsiUntukPulih,
  jadikanBarisTenggatTugas, bukaTabelProperti, sumberTugasTerbuka,
  bukaTangkapCepat, bukaPanelRuangCatatan, bukaPanelVersiCatatan,
} from './notes/fitur-lanjutan-ui.js?v=20261025102350';
import { newNote, delNote, openNote, pinNote, arsipNote, duplikatNote }
  from './notes/model.js?v=20261025102350';
import { bagikanCatatan } from './notes/share.js?v=20261025102350';
import { bukaJurnalHari } from './notes/harian.js?v=20261025102350';
import { menuCatatan } from './notes/menus/note-menu.js?v=20261025102350';
import { openPop, closeAll, penambatAdalah } from './notes/menus/pop.js?v=20261025102350';
import { simpanTemplatNote } from './notes/templat.js?v=20261025102350';
import { resetSemuaCentangTodo, bukaDialogKartuGambar } from './notes/alat-cerdas.js?v=20261025102350';
import { bukaDialogSampulCatatan, bukaGrafInteraktif } from './notes/navigasi-fokus.js?v=20261025102350';
import { bukaDialogKertasCatatan } from './notes/kertas.js?v=20261025102350';
import { bukaCariGanti } from './notes/cari-ganti.js?v=20261025102350';
import { bukaInfoCatatan } from './notes/info-catatan.js?v=20261025102350';
import { panelKunciCatatan, terlihat, kunciUlangSekarang } from './notes/kunci.js?v=20261025102350';
import { itemPintar } from './notes/pintar-aksi.js?v=20261025102350';
import { t as tr, setBahasa, bahasaSekarang } from './core/i18n.js?v=20261025102350';

const MODULES = [notesModule, renamerModule, musikModule];

/* Muat data dulu (IndexedDB, asinkron), baru pasang modul. */
await load();
MODULES.forEach(m => m.init());
terapkanTema();
/* lang <html> ikut bahasa tersimpan sejak awal (a11y & font). */
setBahasa(bahasaSekarang());

/* ── Command palette (K1): Ctrl/⌘+K ──
   Sumber perintah didaftarkan di sini, di satu tempat. Palette sendiri
   tidak tahu isi modul. Catatan dibaca dari state saat palette dibuka. */
initPalette();
daftarkanSumber(() => [
  { id: 'go-home', label: tr('Beranda'), hint: tr('Layar'), jalan: () => go('home') },
  { id: 'go-notes', label: tr('Catatan'), hint: tr('Layar'), jalan: () => go('notes') },
  { id: 'go-task', label: tr('Tugas'), hint: tr('Layar'), cari: 'to-do tenggat', jalan: () => go('task') },
  { id: 'go-rem', label: tr('Reminder'), hint: tr('Layar'), cari: 'pengingat tenggat', jalan: () => go('rem') },
  { id: 'go-search', label: tr('Cari'), hint: tr('Layar'), jalan: () => go('search') },
  { id: 'go-tags', label: tr('Tag'), hint: tr('Layar'), jalan: () => go('tags') },
  { id: 'go-arsip', label: tr('Arsip'), hint: tr('Layar'), jalan: () => go('arsip') },
  { id: 'go-trash', label: tr('Sampah'), hint: tr('Layar'), jalan: () => go('trash') },
  { id: 'go-set', label: tr('Pengaturan'), hint: tr('Layar'), cari: 'setelan opsi', jalan: () => go('set') },
  { id: 'go-renamer', label: tr('Ganti Nama Massal'), hint: tr('Alat'), cari: 'rename berkas', jalan: () => go('renamer') },
  { id: 'new-note', label: tr('Catatan baru'), hint: tr('Aksi'), cari: 'tulis buat', jalan: () => newNote() },
  { id: 'new-jurnal', label: tr('Jurnal hari ini'), hint: tr('Aksi'), cari: 'harian diary', jalan: () => bukaJurnalHari() },
  { id: 'alat-regex', label: tr('Renamer: regex & pustaka pola'), hint: tr('Alat'), cari: 'regex pola pustaka', jalan: () => { go('renamer'); bukaRegex(renamerAlatCtx()); } },
  { id: 'alat-contoh', label: tr('Renamer: belajar dari contoh'), hint: tr('Alat'), cari: 'flash fill contoh pola', jalan: () => { go('renamer'); bukaBelajarContoh(renamerAlatCtx()); } },
  { id: 'alat-syarat', label: tr('Renamer: syarat & grup aturan'), hint: tr('Alat'), cari: 'kondisi bersyarat grup when', jalan: () => { go('renamer'); bukaSyaratAturan(renamerAlatCtx()); } },
  { id: 'alat-dup', label: tr('Renamer: cari berkas duplikat'), hint: tr('Alat'), cari: 'duplikat hash sha gambar mirip', jalan: () => { go('renamer'); bukaDuplikat(renamerAlatCtx()); } },
  { id: 'resep-ekspor', label: tr('Renamer: ekspor resep'), hint: tr('Alat'), cari: 'resep preset simpan json', jalan: () => { go('renamer'); eksporResep(renamerAlatCtx()); } },
  { id: 'resep-impor', label: tr('Renamer: impor resep'), hint: tr('Alat'), cari: 'resep preset muat json', jalan: () => { go('renamer'); pilihResepUntukImpor(renamerAlatCtx()); } },
  { id: 'baca-keras', label: tr('Baca catatan ini keras'), hint: tr('Aksi'), cari: 'baca keras suara tts dengarkan', jalan: () => { bacaCatatanKeras(); } },
  { id: 'baca-stop', label: tr('Hentikan baca keras'), hint: tr('Aksi'), cari: 'hentikan diam suara', jalan: () => { hentikanBaca(); } },
  { id: 'dikte', label: tr('Dikte: catatan baru'), hint: tr('Aksi'), cari: 'dikte suara stt bicara ketik', jalan: () => { dikteCatatanBaru(); } },
  { id: 'cad-unduh', label: tr('Cadangan terenkripsi: unduh'), hint: tr('Aksi'), cari: 'cadangan backup sandi enkripsi frasa', jalan: () => { bukaCadanganTerenkripsiDialog(); } },
  { id: 'cad-pulih', label: tr('Cadangan terenkripsi: pulihkan'), hint: tr('Aksi'), cari: 'cadangan backup pulihkan sandi frasa', jalan: () => { pilihCadanganTerenkripsiUntukPulih(); } },
  { id: 'tenggat-tugas', label: tr('Ubah baris bertenggat jadi tugas'), hint: tr('Aksi'), cari: 'tenggat reminder tugas jadikan', jalan: () => { jadikanBarisTenggatTugas(); } },
  { id: 'tabel-props', label: tr('Tabel properti'), hint: tr('Aksi'), cari: 'tabel properti database tabel kolom', jalan: () => { bukaTabelProperti(); } },
  { id: 'graf-jaringan', label: tr('Peta jaringan catatan'), hint: tr('Alat'), cari: 'graf graph jaringan peta wikilink', jalan: () => { bukaGrafInteraktif(); } },
  { id: 'log-csv', label: tr('Unduh log ganti nama (CSV)'), hint: tr('Alat'), cari: 'riwayat rename export excel', jalan: () => unduhLogRenamerCsv() },
  { id: 'stat', label: tr('Statistik & heatmap'), hint: tr('Alat'), cari: 'heatmap jurnal tugas grafik', jalan: () => bukaStatistik() },
  { id: 'theme', label: tr('Ganti tema terang / gelap'), hint: tr('Aksi'), cari: 'dark light mode', jalan: () => toggleTema() },
]);
daftarkanSumber(() => state.notes
  .filter(n => !n.archived && !n.deletedAt && terlihat(n))
  .map(n => ({
    id: 'note-' + n.id,
    label: n.title || tr('Tanpa judul'),
    hint: tr('Catatan'),
    cari: (n.tags || []).join(' '),
    jalan: () => openNote(n.id),
  })));

/* K30: pencarian lintas modul — tugas yang belum selesai dan berkas renamer ikut dalam palette. */
daftarkanSumber(() => sumberTugasTerbuka());
/* Fitur pintar (lokal): catatan serupa, saran tag, ringkasan, tinjauan, tangkap cepat. */
daftarkanSumber(() => itemPintar());
daftarkanSumber(() => renamerAlatCtx().state.files.map(f => ({
  id: 'rn-' + f.id,
  label: f.originalName,
  hint: tr('Renamer'),
  jalan: () => go('renamer'),
})));

/* Menu "Lainnya" di Beranda. Setiap fitur punya `utama`: true berarti tampil
   di grid layar utama; semua fitur (termasuk sub-fitur) bisa dicari dengan bar
   pencarian. `judul` grup dipakai sebagai keterangan "Di …" di hasil cari. */
daftarkanGrupFitur(() => [
  { judul: tr('Catatan'), item: [
    { id: 'u-notes', label: tr('Catatan'), hint: tr('Tulis dan atur catatan'), ikon: 'i-note', utama: true, jalan: () => go('notes') },
    { id: 'f-baru', label: tr('Catatan baru'), hint: tr('Mulai dari halaman kosong'), ikon: 'i-plus', jalan: () => newNote() },
    { id: 'f-jurnal', label: tr('Jurnal hari ini'), hint: tr('Tulis catatan harian'), ikon: 'i-book', jalan: () => bukaJurnalHari() },
    { id: 'f-dikte', label: tr('Dikte suara'), hint: tr('Bicara, jadi catatan baru'), ikon: 'i-mic', jalan: () => dikteCatatanBaru() },
    { id: 'l-search', label: tr('Cari catatan'), hint: tr('Cari di semua catatan'), ikon: 'i-search', jalan: () => go('search') },
    { id: 'l-arsip', label: tr('Arsip'), hint: tr('Catatan yang disimpan'), ikon: 'i-arch', jalan: () => go('arsip') },
    { id: 'l-tags', label: tr('Tag'), hint: tr('Semua tag catatan'), ikon: 'i-tag', jalan: () => go('tags') },
    { id: 'l-trash', label: tr('Sampah'), hint: tr('Catatan yang dihapus'), ikon: 'i-trash', jalan: () => go('trash') },
    { id: 'd-stat', label: tr('Statistik & heatmap'), hint: tr('Aktivitas dan tugas'), ikon: 'i-sigma', jalan: () => bukaStatistik() },
    { id: 'd-graf', label: tr('Peta jaringan'), hint: tr('Hubungan antar catatan'), ikon: 'i-graph', jalan: () => bukaGrafInteraktif() },
    { id: 'd-tabel', label: tr('Tabel properti'), hint: tr('Papan Kanban & kalender'), ikon: 'i-tpl', jalan: () => bukaTabelProperti() },
    { id: 'd-tinjau', label: tr('Tinjauan minggu ini'), hint: tr('Ringkasan pekan ini'), ikon: 'i-history', jalan: () => buatTinjauan() },
    { id: 'd-baca', label: tr('Baca catatan ini keras'), hint: tr('Dengarkan isi catatan'), ikon: 'i-play', jalan: () => bacaCatatanKeras() },
    { id: 'd-baca-stop', label: tr('Hentikan baca keras'), ikon: 'i-pause', jalan: () => hentikanBaca() },
  ] },
  { judul: tr('Tugas & pengingat'), item: [
    { id: 'u-kal', label: tr('Kalender'), hint: tr('Jadwal bulanan dari tenggat'), ikon: 'i-cal', utama: true, jalan: () => {
      go('task');
      setTimeout(() => document.getElementById('kal-bagian')?.scrollIntoView?.({ behavior: 'smooth' }), 60);
    } },
    { id: 'u-task', label: tr('Tugas'), hint: tr('Daftar to-do dan tenggat'), ikon: 'i-check2', utama: true, jalan: () => go('task') },
    { id: 'u-rem', label: tr('Pengingat'), hint: tr('Pengingat pada waktu tertentu'), ikon: 'i-bell', utama: true, jalan: () => go('rem') },
    { id: 'f-tugas', label: tr('Tangkap cepat: tugas'), hint: tr('Tugas dengan tenggat'), ikon: 'i-check2', jalan: () => bukaTangkapCepat('task', false) },
    { id: 'f-ingat', label: tr('Tangkap cepat: pengingat'), hint: tr('Ingatkan pada waktu tertentu'), ikon: 'i-bell', jalan: () => bukaTangkapCepat('rem', true) },
    { id: 'd-tenggat', label: tr('Jadikan tugas'), hint: tr('Ubah baris bertenggat jadi tugas'), ikon: 'i-clock', jalan: () => jadikanBarisTenggatTugas() },
  ] },
  { judul: tr('Musik'), item: [
    { id: 'u-music', label: tr('Musik'), hint: tr('Pemutar musik lokal'), ikon: 'i-music', utama: true, jalan: () => go('musik') },
    { id: 'm-daftar', label: tr('Daftar putar'), hint: tr('Susun lagu dalam daftar'), ikon: 'i-list', jalan: () => go('musik-daftar') },
    { id: 'm-eq', label: tr('Ekualiser'), hint: tr('Atur nada rentang frekuensi'), ikon: 'i-filter', jalan: () => go('musik-eq') },
    { id: 'm-ekspor', label: tr('Ekspor lagu'), hint: tr('Simpan lagu sebagai WAV atau MP3'), ikon: 'i-dl', jalan: () => go('musik-ekspor') },
  ] },
  { judul: tr('Ganti Nama Massal'), item: [
    { id: 'u-renamer', label: tr('Ganti Nama Massal'), hint: tr('Ubah nama banyak berkas'), ikon: 'i-rename', utama: true, jalan: () => go('renamer') },
    { id: 'r-regex', label: tr('Regex & pustaka pola'), ikon: 'i-sigma', jalan: () => { go('renamer'); bukaRegex(renamerAlatCtx()); } },
    { id: 'r-contoh', label: tr('Belajar dari contoh'), ikon: 'i-sparkle', jalan: () => { go('renamer'); bukaBelajarContoh(renamerAlatCtx()); } },
    { id: 'r-syarat', label: tr('Syarat & grup aturan'), ikon: 'i-filter', jalan: () => { go('renamer'); bukaSyaratAturan(renamerAlatCtx()); } },
    { id: 'r-dup', label: tr('Cari berkas duplikat'), ikon: 'i-copy', jalan: () => { go('renamer'); bukaDuplikat(renamerAlatCtx()); } },
    { id: 'r-resep-ekspor', label: tr('Ekspor resep'), ikon: 'i-dl', jalan: () => { go('renamer'); eksporResep(renamerAlatCtx()); } },
    { id: 'r-resep-impor', label: tr('Impor resep'), ikon: 'i-up', jalan: () => { go('renamer'); pilihResepUntukImpor(renamerAlatCtx()); } },
    { id: 'r-log', label: tr('Unduh log ganti nama'), hint: tr('Berkas CSV'), ikon: 'i-dl', jalan: () => unduhLogRenamerCsv() },
  ] },
  { judul: tr('Pengaturan'), item: [
    { id: 'u-set', label: tr('Pengaturan'), hint: tr('Tampilan, data, dan cadangan'), ikon: 'i-cog', utama: true, jalan: () => go('set') },
    { id: 'd-cad-unduh', label: tr('Cadangan terenkripsi: unduh'), hint: tr('Lindungi dengan frasa sandi'), ikon: 'i-lock', jalan: () => bukaCadanganTerenkripsiDialog() },
    { id: 'd-cad-pulih', label: tr('Cadangan terenkripsi: pulihkan'), ikon: 'i-unlock', jalan: () => pilihCadanganTerenkripsiUntukPulih() },
    { id: 't-tema', label: tr('Ganti tema terang / gelap'), ikon: 'i-moon', jalan: () => toggleTema() },
    { id: 'u-home', label: tr('Beranda'), ikon: 'i-home', jalan: () => go('home') },
  ] },
]);

/* Data lama yang tidak terbaca: beri tahu, bukan sembunyikan. */
if (state.dataRusak) {
  setTimeout(() =>
    toast(tr('Data tersimpan tidak terbaca — dicadangkan, aplikasi dimulai kosong')),
    500);
}

/* Penghitung catatan di nav — diperbarui tiap layar digambar. */
function perbaruiJumlah() {
  const ct = document.querySelector('.nav-i[data-go="notes"] .ct');
  if (!ct) return;
  const n = state.notes.filter(x => !x.archived && !x.deletedAt).length;
  ct.textContent = n;
  ct.style.display = n ? '' : 'none';
}
onAfterRender(perbaruiJumlah);

/* ── navigasi global ── */
document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]');
  if (g) return go(g.dataset.go);

  /* tombol \"Kembali\" di halaman Pengaturan — pulang ke layar asal */
  const kb = e.target.closest('[data-kembali-set]');
  if (kb) return kembali();

  const o = e.target.closest('[data-open]');
  if (o) return openNote(o.dataset.open);

  if (e.target.closest('[data-act2="new"]')) return newNote();

  /* menu "···" di header editor — ketuk lagi = tutup (toggle) */
  const dots = e.target.closest('#dots');
  if (dots) {
    if (penambatAdalah(dots)) return closeAll();
    return openPop(menuCatatan(), dots);
  }

  /* aksi menu catatan (Sematkan / Arsipkan / Duplikat / Hapus) */
  const nm = e.target.closest('[data-note-act]');
  if (nm) {
    closeAll();
    const a = nm.dataset.noteAct;
    if (a === 'pin') pinNote();
    else if (a === 'arsip') arsipNote();
    else if (a === 'duplikat') duplikatNote();
    else if (a === 'cetak') {
      /* popup ditutup dulu, lalu biarkan peramban mencetak — CSS @media
         print membereskan tata letak (bar, gagang, warna latar tetap) */
      setTimeout(() => { try { window.print(); } catch (err) { /* tua */ } }, 60);
      return;
    }
    else if (a === 'tpl') {
      const n = state.notes.find(x => x.id === state.openId);
      simpanTemplatNote(n);
      return;
    }
    else if (a === 'bagi') { bagikanCatatan(); return; }
    else if (a === 'remind') { bukaTangkapCepat('rem', true); return; }
    else if (a === 'ruang') { bukaPanelRuangCatatan(document.getElementById('dots')); return; }
    else if (a === 'tts') { bacaCatatanKeras(); return; }
    else if (a === 'tenggat-tugas') { jadikanBarisTenggatTugas(); return; }
    else if (a === 'versi') { bukaPanelVersiCatatan(document.getElementById('dots')); return; }
    else if (a === 'sampul') { bukaDialogSampulCatatan(); return; }
    else if (a === 'kertas') { bukaDialogKertasCatatan(); return; }
    else if (a === 'reset-todo') { resetSemuaCentangTodo(); return; }
    else if (a === 'kartu-gambar') { bukaDialogKartuGambar(); return; }
    else if (a === 'cari-ganti') { bukaCariGanti(document.getElementById('dots')); return; }
    else if (a === 'info') { bukaInfoCatatan(document.getElementById('dots')); return; }
    else if (a === 'kunci-ulang') { kunciUlangSekarang(); return; }
    else if (a === 'hapus') delNote();
    else if (a === 'kunci') {
      /* panel kunci: pasang PIN (catatan belum terkunci) atau kelola
         (ganti / buka kunci) — jangkar menu ··· di header */
      panelKunciCatatan(dots);
    }
    return;
  }

  if (e.target.closest('#pal-btn')) {
    return bukaPalette();
  }

  const n = e.target.closest('[data-new]');
  if (n) {
    closeAll();
    if (n.dataset.new === 'note') return newNote();
    if (n.dataset.new === 'jurnal') return bukaJurnalHari();
    if (n.dataset.new === 'task') return bukaTangkapCepat('task', false);
    if (n.dataset.new === 'rem') return bukaTangkapCepat('rem', false);
    return toast(tr('Dibuat'));
  }

  const a = e.target.closest('[data-act]');
  if (a) return toast(tr(a.dataset.act));
});

document.getElementById('back').onclick = () => {
  /* editor: kembali ke daftar catatan (perilaku lama). Halaman lain yang
     memakai panah (Pengaturan, layar kunci, Musik) pulang ke layar sebelumnya,
     dan layar anak Musik (Pengaturan, Daftar Putar, Ekualiser, Ekspor) pulang ke Musik. */
  if (cur === 'set' || cur === 'kunci' || cur === 'musik' || adaInduk()) return kembali();
  go('notes');
};
document.getElementById('scrim').onclick = closeAll;
for (const id of ['fab', 'fab-bnav']) document.getElementById(id).onclick = () => {
  document.getElementById('sheet').classList.toggle('on');
  document.getElementById('scrim').classList.toggle('on');
};
addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(); });

/* ── tema terang / gelap — tersimpan; awal mengikuti sistem ── */
document.getElementById('theme').onclick = () => { toggleTema(); };

/* ── pembaruan isi di dalam APK (hanya aktif di APK) ── */
mulaiPembaruan();
mulaiBeranda();

go('home');
