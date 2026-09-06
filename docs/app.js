/* Titik masuk Hara. Daftarkan modul di sini. */
import { load } from './core/store.js?v=20260906155231';
import { go, onAfterRender } from './core/router.js?v=20260906155231';
import { toast } from './core/toast.js?v=20260906155231';
import { notesModule } from './notes/index.js?v=20260906155231';
import { newNote, delNote, openNote } from './notes/model.js?v=20260906155231';
import { closeAll } from './notes/menus/pop.js?v=20260906155231';

const MODULES = [notesModule];

load();
MODULES.forEach(m => m.init());

/* ── navigasi global ── */
document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]');
  if (g) return go(g.dataset.go);

  const o = e.target.closest('[data-open]');
  if (o) return openNote(o.dataset.open);

  if (e.target.closest('[data-act2="new"]')) return newNote();

  const n = e.target.closest('[data-new]');
  if (n) { closeAll(); return n.dataset.new === 'note' ? newNote() : toast('Dibuat'); }

  const a = e.target.closest('[data-act]');
  if (a) return toast(a.dataset.act);
});

document.getElementById('back').onclick = () => go('notes');
document.getElementById('del').onclick  = () => delNote();
document.getElementById('scrim').onclick = closeAll;
document.getElementById('fab').onclick = () => {
  document.getElementById('sheet').classList.toggle('on');
  document.getElementById('scrim').classList.toggle('on');
};
addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(); });

/* ── tema terang / gelap ── */
function toggleTheme() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.setAttribute('data-theme', dark ? 'light' : 'dark');
  document.querySelector('#theme use').setAttribute('href', dark ? '#i-moon' : '#i-sun');
}
document.getElementById('theme').onclick = toggleTheme;

go('home');
