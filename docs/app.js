/* Titik masuk Hara. Daftarkan modul di sini. */
import { load, state } from './core/store.js?v=20260908021448';
import { go, onAfterRender } from './core/router.js?v=20260908021448';
import { toast } from './core/toast.js?v=20260908021448';
import { terapkan as terapkanTema, toggle as toggleTema } from './core/theme.js?v=20260908021448';
import { notesModule } from './notes/index.js?v=20260908021448';
import { newNote, delNote, openNote, pinNote, arsipNote, duplikatNote }
  from './notes/model.js?v=20260908021448';
import { menuCatatan } from './notes/menus/note-menu.js?v=20260908021448';
import { openPop, closeAll, penambatAdalah } from './notes/menus/pop.js?v=20260908021448';
import { simpanTemplatNote } from './notes/templat.js?v=20260908021448';

const MODULES = [notesModule];

load();
MODULES.forEach(m => m.init());
terapkanTema();

/* Data lama yang tidak terbaca: beri tahu, bukan sembunyikan. */
if (state.dataRusak) {
  setTimeout(() =>
    toast('Data tersimpan tidak terbaca — dicadangkan, aplikasi dimulai kosong'),
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
    else if (a === 'remind') toast('Modul Reminder menyusul');
    else if (a === 'hapus') delNote();
    return;
  }

  const n = e.target.closest('[data-new]');
  if (n) { closeAll(); return n.dataset.new === 'note' ? newNote() : toast('Dibuat'); }

  const a = e.target.closest('[data-act]');
  if (a) return toast(a.dataset.act);
});

document.getElementById('back').onclick = () => go('notes');
document.getElementById('scrim').onclick = closeAll;
document.getElementById('fab').onclick = () => {
  document.getElementById('sheet').classList.toggle('on');
  document.getElementById('scrim').classList.toggle('on');
};
addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(); });

/* ── tema terang / gelap — tersimpan; awal mengikuti sistem ── */
document.getElementById('theme').onclick = () => { toggleTema(); };

go('home');
