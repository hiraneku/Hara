/* Titik masuk Hara. Daftarkan modul di sini. */
import { load, state } from './core/store.js?v=20261010052725';
import { go, onAfterRender, kembali, cur } from './core/router.js?v=20261010052725';
import { toast } from './core/toast.js?v=20261010052725';
import { terapkan as terapkanTema, toggle as toggleTema } from './core/theme.js?v=20261010052725';
import { initPalette, daftarkanSumber } from './core/palette.js?v=20261010052725';
import { bukaStatistik } from './notes/statistik-ui.js?v=20261010052725';
import { notesModule } from './notes/index.js?v=20261010052725';
import { renamerModule, unduhLogRenamerCsv } from './renamer/index.js?v=20261010052725';
import { newNote, delNote, openNote, pinNote, arsipNote, duplikatNote }
  from './notes/model.js?v=20261010052725';
import { bagikanCatatan } from './notes/share.js?v=20261010052725';
import { bukaJurnalHari } from './notes/harian.js?v=20261010052725';
import { menuCatatan } from './notes/menus/note-menu.js?v=20261010052725';
import { openPop, closeAll, penambatAdalah } from './notes/menus/pop.js?v=20261010052725';
import { simpanTemplatNote } from './notes/templat.js?v=20261010052725';
import { panelKunciCatatan } from './notes/kunci.js?v=20261010052725';
import { t as tr, setBahasa, bahasaSekarang } from './core/i18n.js?v=20261010052725';

const MODULES = [notesModule, renamerModule];

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
  { id: 'log-csv', label: tr('Unduh log ganti nama (CSV)'), hint: tr('Alat'), cari: 'riwayat rename export excel', jalan: () => unduhLogRenamerCsv() },
  { id: 'stat', label: tr('Statistik & heatmap'), hint: tr('Alat'), cari: 'heatmap jurnal tugas grafik', jalan: () => bukaStatistik() },
  { id: 'theme', label: tr('Ganti tema terang / gelap'), hint: tr('Aksi'), cari: 'dark light mode', jalan: () => toggleTema() },
]);
daftarkanSumber(() => state.notes
  .filter(n => !n.archived && !n.deletedAt)
  .map(n => ({
    id: 'note-' + n.id,
    label: n.title || tr('Tanpa judul'),
    hint: tr('Catatan'),
    cari: (n.tags || []).join(' '),
    jalan: () => openNote(n.id),
  })));

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
    else if (a === 'remind') toast(tr('Modul Reminder menyusul'));
    else if (a === 'hapus') delNote();
    else if (a === 'kunci') {
      /* panel kunci: pasang PIN (catatan belum terkunci) atau kelola
         (ganti / buka kunci) — jangkar menu ··· di header */
      panelKunciCatatan(dots);
    }
    return;
  }

  const n = e.target.closest('[data-new]');
  if (n) {
    closeAll();
    if (n.dataset.new === 'note') return newNote();
    if (n.dataset.new === 'jurnal') return bukaJurnalHari();
    return toast(tr('Dibuat'));
  }

  const a = e.target.closest('[data-act]');
  if (a) return toast(tr(a.dataset.act));
});

document.getElementById('back').onclick = () => {
  /* editor: kembali ke daftar catatan (perilaku lama). Halaman lain yang
     memakai panah (Pengaturan, layar kunci) pulang ke layar sebelumnya. */
  if (cur === 'set' || cur === 'kunci') return kembali();
  go('notes');
};
document.getElementById('scrim').onclick = closeAll;
document.getElementById('fab').onclick = () => {
  document.getElementById('sheet').classList.toggle('on');
  document.getElementById('scrim').classList.toggle('on');
};
addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(); });

/* ── tema terang / gelap — tersimpan; awal mengikuti sistem ── */
document.getElementById('theme').onclick = () => { toggleTema(); };

go('home');
