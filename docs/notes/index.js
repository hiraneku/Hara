/* Modul Catatan — mendaftarkan diri ke core.
   Pola yang sama nanti dipakai tools/reminder dan tools/tasks. */
import { registerViews, onBeforeLeave, onAfterRender, cur, go } from '../core/router.js';
import { homeView, notesView } from './views/list.js';
import { editorView } from './views/editor.js';
import { miscViews } from './views/misc.js';
import { bindEditor } from './editor/events.js';
import { renderBar }  from './bar/render.js';
import { bindPop, closeAll } from './menus/pop.js';
import { saveNow, updateCount, syncBtns } from './editor/cleanup.js';
import { pending } from './editor/marks.js';
import { docEl, caretEnd } from './editor/caret.js';
import { resetHistory } from './editor/history.js';

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
    onBeforeLeave(from => { if (from === 'editor') saveNow(); });

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
    });

    /* simpan saat aplikasi ditutup / dipindah ke belakang */
    window.addEventListener('pagehide', () => { if (cur === 'editor') saveNow(); });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && cur === 'editor') saveNow();
    });
  }
};
