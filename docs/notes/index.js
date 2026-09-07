/* Modul Catatan — mendaftarkan diri ke core.
   Pola yang sama nanti dipakai tools/reminder dan tools/tasks. */
import { registerViews, onBeforeLeave, onAfterRender, cur, go } from '../core/router.js?v=20260907003342';
import { homeView, notesView } from './views/list.js?v=20260907003342';
import { editorView } from './views/editor.js?v=20260907003342';
import { miscViews } from './views/misc.js?v=20260907003342';
import { bindEditor } from './editor/events.js?v=20260907003342';
import { renderBar }  from './bar/render.js?v=20260907003342';
import { bindPop, closeAll } from './menus/pop.js?v=20260907003342';
import { saveNow, updateCount, syncBtns } from './editor/cleanup.js?v=20260907003342';
import { pending } from './editor/marks.js?v=20260907003342';
import { docEl, caretEnd } from './editor/caret.js?v=20260907003342';
import { resetHistory } from './editor/history.js?v=20260907003342';
import { pasangGambar, hapusGambar } from './editor/image.js?v=20260907003342';
import { bebaskanUrl, pakaiRuang, ukuranTerbaca } from '../core/blobs.js?v=20260907003342';
import { BISA_SEMBUNYI, prefs, tersembunyi, toggleTampil, setGetar } from './bar/prefs.js?v=20260907003342';
import { renderBar as gambarBar } from './bar/render.js?v=20260907003342';
import { state } from '../core/store.js?v=20260907003342';

/* Halaman Pengaturan: daftar kontrol bar + saklar getar + ruang terpakai. */
function isiPengaturan() {
  const box = document.getElementById('bar-prefs');
  if (box) {
    box.innerHTML = BISA_SEMBUNYI.map(x => {
      const k = x.g || x.m;
      const on = !tersembunyi(k);
      return `<div class="row"><div class="row-b"><div class="row-t">${x.nama}</div></div>
        <button class="sw${on ? ' on' : ''}" data-bar="${k}" role="switch"
          aria-checked="${on}"><span></span></button></div>`;
    }).join('');
  }
  const sg = document.querySelector('[data-getar]');
  if (sg) sg.classList.toggle('on', prefs.getar);

  const ruang = document.getElementById('ruang');
  if (ruang) {
    const n = state.notes.length;
    pakaiRuang().then(({ pakai }) => {
      ruang.textContent = `${n} catatan · ${pakai ? ukuranTerbaca(pakai) + ' terpakai' : 'ukuran tak diketahui'}`;
    });
  }
}

export const notesModule = {
  id: 'notes',
  name: 'Catatan',
  color: '#3F6F5B',

  init() {
    registerViews(
      { home: homeView, notes: notesView, editor: editorView, ...miscViews },
      { home: 'Beranda', notes: 'Catatan', editor: '', rem: 'Reminder', task: 'Tugas',
        search: 'Cari', tags: 'Tag', arsip: 'Arsip', set: 'Pengaturan' }
    );

    renderBar();
    bindEditor();
    bindPop();

    /* simpan sebelum meninggalkan editor */
    onBeforeLeave(from => {
      if (from === 'editor') saveNow();
      bebaskanUrl();          /* objectURL lama tidak dipakai lagi */
    });

    /* saklar di halaman Pengaturan */
    document.addEventListener('click', e => {
      const sb = e.target.closest('[data-bar]');
      if (sb) {
        toggleTampil(sb.dataset.bar);
        sb.classList.toggle('on');
        sb.setAttribute('aria-checked', sb.classList.contains('on'));
        gambarBar();
        return;
      }
      const sg = e.target.closest('[data-getar]');
      if (sg) {
        setGetar(!prefs.getar);
        sg.classList.toggle('on', prefs.getar);
      }
    });

    /* tombol silang pada gambar */
    document.addEventListener('click', e => {
      const x = e.target.closest('[data-imgx]');
      if (x) hapusGambar(x.dataset.imgx);
    });

    /* siapkan editor tiap kali layar selesai digambar */
    onAfterRender(() => {
      closeAll();
      pending.clear();
      const d = docEl();
      if (d && d.firstElementChild) caretEnd(d.firstElementChild);
      /* undo tidak boleh melintas antar catatan */
      if (d) resetHistory();
      updateCount();
      syncBtns();
      pasangGambar();
      isiPengaturan();
    });

    /* simpan saat aplikasi ditutup / dipindah ke belakang */
    window.addEventListener('pagehide', () => { if (cur === 'editor') saveNow(); });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && cur === 'editor') saveNow();
    });
  }
};
