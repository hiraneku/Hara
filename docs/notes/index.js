/* Modul Catatan — mendaftarkan diri ke core.
   Pola yang sama nanti dipakai tools/reminder dan tools/tasks. */
import { registerViews, onBeforeLeave, onAfterRender, cur, go } from '../core/router.js?v=20260907015135';
import { homeView, notesView } from './views/list.js?v=20260907015135';
import { editorView } from './views/editor.js?v=20260907015135';
import { miscViews } from './views/misc.js?v=20260907015135';
import { bindEditor } from './editor/events.js?v=20260907015135';
import { renderBar }  from './bar/render.js?v=20260907015135';
import { bindPop, closeAll } from './menus/pop.js?v=20260907015135';
import { saveNow, updateCount, syncBtns, bacaEditor, tulisKeCatatan } from './editor/cleanup.js?v=20260907015135';
import { konfigurasi, onStatus, flush, reset as resetAutosave, STATUS, cobaUlang }
  from '../core/autosave.js?v=20260907015135';
import { bacaDraf, hapusDraf } from '../core/recovery.js?v=20260907015135';
import { toast } from '../core/toast.js?v=20260907015135';
import { blocksToDom } from './note-model.js?v=20260907015135';
import { pending, sticky, mati } from './editor/marks.js?v=20260907015135';
import { docEl, caretEnd } from './editor/caret.js?v=20260907015135';
import { resetHistory } from './editor/history.js?v=20260907015135';
import { pasangGambar, hapusGambar } from './editor/image.js?v=20260907015135';
import { bebaskanUrl, pakaiRuang, ukuranTerbaca } from '../core/blobs.js?v=20260907015135';
import { BISA_SEMBUNYI, prefs, tersembunyi, toggleTampil, setGetar } from './bar/prefs.js?v=20260907015135';
import { renderBar as gambarBar } from './bar/render.js?v=20260907015135';
import { state } from '../core/store.js?v=20260907015135';

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

/* ════════ INDIKATOR STATUS SIMPAN ════════
   Menumpang di bar mekanik yang sudah ada — tidak membuat UI baru. */
function tampilkanStatus(s) {
  const el = document.getElementById('save-st');
  if (!el) return;
  const teks = {
    [STATUS.IDLE]:   '',
    [STATUS.DIRTY]:  '',
    [STATUS.SAVING]: 'Menyimpan…',
    [STATUS.SAVED]:  'Tersimpan',
    [STATUS.ERROR]:  'Gagal menyimpan <button class="st-retry" data-retry>Coba lagi</button>',
  }[s] || '';
  el.innerHTML = teks;
  el.className = 'save-st' + (s === STATUS.ERROR ? ' err' : s === STATUS.SAVED ? ' ok' : '');
  /* "Tersimpan" cukup sekilas, tidak perlu menetap */
  clearTimeout(tampilkanStatus._t);
  if (s === STATUS.SAVED)
    tampilkanStatus._t = setTimeout(() => { if (el.classList.contains('ok')) el.innerHTML = ''; }, 1800);
}

/* ════════ BILAH RECOVERY ════════ */
function tutupBilahRecovery() {
  const b = document.getElementById('rec-bar');
  if (b) b.remove();
}

/* Tawarkan pemulihan HANYA kalau draf memang milik catatan yang dibuka
   dan isinya berbeda dari yang sudah tersimpan. */
function tawarkanRecovery() {
  tutupBilahRecovery();
  if (cur !== 'editor') return;
  const n = state.notes.find(x => x.id === state.openId);
  if (!n) return;

  const draf = bacaDraf(n.id);          /* difilter per noteId */
  if (!draf) return;

  /* draf identik dengan yang tersimpan -> tidak perlu ditawarkan */
  if (JSON.stringify(draf.blocks) === JSON.stringify(n.blocks)) {
    hapusDraf();
    return;
  }

  const ed = document.querySelector('.ed');
  if (!ed) return;
  const bar = document.createElement('div');
  bar.className = 'rec-bar';
  bar.id = 'rec-bar';
  bar.innerHTML =
    `<span class="rec-t">Ada perubahan yang belum tersimpan.</span>
     <button class="btn btn-pri" data-rec="restore">Pulihkan</button>
     <button class="btn btn-sec" data-rec="discard">Buang</button>`;
  ed.insertBefore(bar, ed.firstChild);
}

/* Pulihkan draf KE CATATAN YANG SAMA — tidak pernah membuat catatan baru,
   dan id catatan maupun id blok tidak diubah. */
function pulihkanDraf() {
  const n = state.notes.find(x => x.id === state.openId);
  if (!n) return;
  const draf = bacaDraf(n.id);
  if (!draf) { tutupBilahRecovery(); return; }

  n.blocks = draf.blocks;               /* id blok ikut apa adanya */
  if (typeof draf.title === 'string') n.title = draf.title;

  const d = docEl();
  if (d) d.innerHTML = blocksToDom(n.blocks);
  const ti = document.querySelector('.ed-t');
  if (ti && typeof draf.title === 'string') ti.value = draf.title;

  hapusDraf();
  tutupBilahRecovery();
  saveNow();
  pasangGambar();
  updateCount();
  toast('Perubahan dipulihkan');
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

    /* Hubungkan editor <-> autosave manager. Editor tidak menyentuh
       storage; manager yang mengatur debounce, urutan, dan draf. */
    konfigurasi({ baca: bacaEditor, tulis: tulisKeCatatan });
    onStatus(tampilkanStatus);

    renderBar();
    bindEditor();
    bindPop();

    /* simpan sebelum meninggalkan editor */
    onBeforeLeave(from => {
      /* tuntaskan perubahan tertunda SEBELUM layar berganti */
      if (from === 'editor') { flush(); resetAutosave(); }
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
      sticky.clear();
      mati.clear();
      const d = docEl();
      if (d && d.firstElementChild) caretEnd(d.firstElementChild);
      /* undo tidak boleh melintas antar catatan */
      if (d) resetHistory();
      updateCount();
      syncBtns();
      pasangGambar();
      isiPengaturan();
      tawarkanRecovery();
    });

    /* simpan saat aplikasi ditutup / dipindah ke belakang */
    /* ── lifecycle: jangan sampai ada yang tertinggal ── */
    const tuntaskan = () => { if (cur === 'editor') { saveNow(); } };
    window.addEventListener('pagehide', tuntaskan);
    window.addEventListener('beforeunload', tuntaskan);
    window.addEventListener('blur', tuntaskan);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') tuntaskan();
    });

    /* tombol "Coba lagi" pada indikator status */
    document.addEventListener('click', e => {
      if (e.target.closest('[data-retry]')) cobaUlang();
    });

    /* pilihan Pulihkan / Buang pada bilah recovery */
    document.addEventListener('click', e => {
      const r = e.target.closest('[data-rec]');
      if (!r) return;
      if (r.dataset.rec === 'restore') pulihkanDraf();
      else { hapusDraf(); tutupBilahRecovery(); toast('Perubahan dibuang'); }
    });
  }
};
