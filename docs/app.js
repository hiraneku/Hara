/* Titik masuk Hara. Daftarkan modul di sini. */
import { load, state } from './core/store.js?v=20260909063332';
import { go, onAfterRender, kembali, cur } from './core/router.js?v=20260909063332';
import { toast } from './core/toast.js?v=20260909063332';
import { terapkan as terapkanTema, toggle as toggleTema } from './core/theme.js?v=20260909063332';
import { notesModule } from './notes/index.js?v=20260909063332';
import { newNote, delNote, openNote, pinNote, arsipNote, duplikatNote }
  from './notes/model.js?v=20260909063332';
import { bagikanCatatan } from './notes/share.js?v=20260909063332';
import { bukaJurnalHari } from './notes/harian.js?v=20260909063332';
import { menuCatatan } from './notes/menus/note-menu.js?v=20260909063332';
import { openPop, closeAll, penambatAdalah } from './notes/menus/pop.js?v=20260909063332';
import { simpanTemplatNote } from './notes/templat.js?v=20260909063332';
import { panelKunciCatatan } from './notes/kunci.js?v=20260909063332';
import { t as tr } from './core/i18n.js?v=20260909063332';

const MODULES = [notesModule];

load();
MODULES.forEach(m => m.init());
terapkanTema();

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
    return toast('Dibuat');
  }

  const a = e.target.closest('[data-act]');
  if (a) return toast(a.dataset.act);
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
