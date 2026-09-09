/* Modul Catatan — mendaftarkan diri ke core.
   Pola yang sama nanti dipakai tools/reminder dan tools/tasks. */
import { registerViews, onBeforeLeave, onAfterRender, cur, go } from '../core/router.js?v=20260909105048';
import { homeView, notesView } from './views/list.js?v=20260909105048';
import { editorView } from './views/editor.js?v=20260909105048';
import { miscViews, renderHasilCari } from './views/misc.js?v=20260909105048';
import { tugasView, reminderView } from './views/tugas.js?v=20260909105048';
import { bindEditor } from './editor/events.js?v=20260909105048';
import { renderBar }  from './bar/render.js?v=20260909105048';
import { bindPop, closeAll, openPop } from './menus/pop.js?v=20260909105048';
import { saveNow, updateCount, syncBtns, bacaEditor, tulisKeCatatan, saveSoon }
  from './editor/cleanup.js?v=20260909105048';
import { konfigurasi, onStatus, flush, reset as resetAutosave, STATUS, cobaUlang,
         adaPerubahanTertunda }
  from '../core/autosave.js?v=20260909105048';
import { bacaDraf, hapusDraf } from '../core/recovery.js?v=20260909105048';
import { toast } from '../core/toast.js?v=20260909105048';
import { esc } from '../core/dom.js?v=20260909105048';
import { blocksToDom, domToBlocks, touch } from './note-model.js?v=20260909105048';
import { renumber, pastikanKolomAkhir } from './editor/blocks.js?v=20260909105048';
import { pending, sticky, mati } from './editor/marks.js?v=20260909105048';
import { docEl, caretEnd } from './editor/caret.js?v=20260909105048';
import { resetHistory } from './editor/history.js?v=20260909105048';
import { pasangGambar, hapusGambar, bersihkanBlobYatim, pasangThumbDaftar } from './editor/image.js?v=20260909105048';
import { bebaskanUrl, pakaiRuang, ukuranTerbaca } from '../core/blobs.js?v=20260909105048';
import { BISA_SEMBUNYI, prefs, tersembunyi, toggleTampil, setGetar } from './bar/prefs.js?v=20260909105048';
import { renderBar as gambarBar } from './bar/render.js?v=20260909105048';
import { state, sinkronWelcome } from '../core/store.js?v=20260909105048';
import { labelMode, toggle as toggleTema, setAk } from '../core/theme.js?v=20260909105048';
import { purgeSampahOtomatis, pulihkanSampah, hapusPermanen, buatNoteBerjudul, openNote,
         sematDariList, hapusNoteDariList, arsipNoteId }
  from './model.js?v=20260909105048';
import { toggleModeBaca, sinkronModeBaca, modeBacaBerlaku } from './mode-baca.js?v=20260909105048';
import { bindBacaPlus, terapkanUkuranLayar, tutupCari, matikanZen }
  from './baca-plus.js?v=20260909105048';
import { bindDaftarIsi } from './daftar-isi.js?v=20260909105048';
import { setUrut, menuUrut, namaUrut } from './urut.js?v=20260909105048';
import { bukaJurnalHari } from './harian.js?v=20260909105048';
import { layarKunciView, bindKunci } from './kunci.js?v=20260909105048';
import { bindSwipe } from './swipe.js?v=20260909105048';
import { bindTagWarna } from './tagwarna.js?v=20260909105048';
import { bindGaleri } from './galeri.js?v=20260909105048';
import { menuTemplat, terapkanTemplat, hapusTemplat } from './templat.js?v=20260909105048';
import { pasangSeret } from './drag.js?v=20260909105048';
import { muatPanels, tautkanSebutan } from './panels.js?v=20260909105048';
import { bindTataGambar, bersihkanPilihanGambar } from './tata-gambar.js?v=20260909105048';
import { setTag, stt } from './views/data.js?v=20260909105048';
import { aturProp, hapusProp, namaProp, barisProps, KET_PROP, contohProp } from './meta-ui.js?v=20260909105048';
import { cariJudul, judulSpan, tandaiTautan } from './wikilink.js?v=20260909105048';
import { t as tr, setBahasa, terjemahStatis } from '../core/i18n.js?v=20260909105048';
import { cadanganJson, eksporSemuaMarkdown, markdownDariCatatan, namaBerkasAman,
         unduh, buatZip, siapImpor, terapkanImpor }
  from './data-io.js?v=20260909105048';

/* Halaman Pengaturan: daftar kontrol bar + saklar getar + ruang terpakai. */
function isiPengaturan() {
  const box = document.getElementById('bar-prefs');
  if (box) {
    box.innerHTML = BISA_SEMBUNYI.map(x => {
      const k = x.g || x.m;
      const on = !tersembunyi(k);
      return `<div class="row"><div class="row-b"><div class="row-t">${tr(x.nama)}</div></div>
        <button class="sw${on ? ' on' : ''}" data-bar="${k}" role="switch"
          aria-checked="${on}"><span></span></button></div>`;
    }).join('');
  }
  const sg = document.querySelector('[data-getar]');
  if (sg) sg.classList.toggle('on', prefs.getar);

  const temaSt = document.getElementById('tema-st');
  if (temaSt) temaSt.textContent = labelMode();

  const ruang = document.getElementById('ruang');
  if (ruang) {
    const n = state.notes.length;
    pakaiRuang().then(({ pakai }) => {
      ruang.textContent = `${tr('{n} catatan', { n })} · ${pakai ? ukuranTerbaca(pakai) + ' ' + tr('terpakai') : tr('ukuran tak diketahui')}`;
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
    [STATUS.DIRTY]:  tr('Belum tersimpan'),
    [STATUS.SAVING]: tr('Menyimpan…'),
    [STATUS.SAVED]:  tr('Tersimpan'),
    [STATUS.ERROR]:  tr('Gagal menyimpan') + ' <button class="st-retry" data-retry>' + tr('Coba lagi') + '</button>',
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
    `<span class="rec-t">${tr('Ada perubahan yang belum tersimpan.')}</span>
     <button class="btn btn-pri" data-rec="restore">${tr('Pulihkan')}</button>
     <button class="btn btn-sec" data-rec="discard">${tr('Buang')}</button>`;
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
  pastikanKolomAkhir(d);
  renumber();
  const ti = document.querySelector('.ed-t');
  if (ti && typeof draf.title === 'string') ti.value = draf.title;

  hapusDraf();
  tutupBilahRecovery();
  saveNow();
  pasangGambar();
  updateCount();
  /* riwayat undo direset supaya tidak ada snapshot lama yang bisa
     memulihkan keadaan SEBELUM draf dipulihkan */
  resetHistory();
  syncBtns();
  const d2 = docEl();
  if (d2 && d2.firstElementChild) caretEnd(d2.firstElementChild);
  toast(tr('Perubahan dipulihkan'));
}

/* Render ulang isi editor dari DOM saat ini — tanpa menyentuh data.
   Dipakai saat masuk mode baca: tata letak disusun ulang dari model
   yang sama persis dengan mode tulis, jadi keadaan DOM yang basi
   (kelas/atribut gambar, placeholder, dsb.) ikut dinormalkan. Posisi
   gulir dipertahankan. src gambar lama disalin ke gambar baru supaya
   tidak ada jeda "gambar kosong" (teks melebar) selama pemasangan
   ulang async. */
function segarkanIsiEditor() {
  const d = docEl();
  if (!d) return;
  const y = (window.scrollY !== undefined ? window.scrollY
    : document.documentElement.scrollTop) || 0;
  /* kumpulkan src & rasio gambar lama per blob id */
  const srcLama = {};
  const rasioLama = {};
  Array.from(d.querySelectorAll('img[data-blob]')).forEach(img => {
    const id = img.getAttribute('data-blob');
    const s = img.getAttribute('src');
    if (id && s) srcLama[id] = s;
    if (id && img.naturalWidth && img.naturalHeight)
      rasioLama[id] = img.naturalWidth + '/' + img.naturalHeight;
  });
  const bl = domToBlocks(d);
  d.innerHTML = blocksToDom(bl);
  pastikanKolomAkhir(d);
  renumber();
  tandaiTautan(d);
  updateCount();
  syncBtns();
  /* salin src & rasio lama dulu — gambar langsung punya ukuran yang
     benar, tidak ada jeda "gambar kosong" (teks melebar) */
  Array.from(d.querySelectorAll('img[data-blob]')).forEach(img => {
    const id = img.getAttribute('data-blob');
    if (!id) return;
    if (rasioLama[id] && !img.style.aspectRatio)
      img.style.aspectRatio = rasioLama[id];
    if (srcLama[id] && !img.getAttribute('src'))
      img.setAttribute('src', srcLama[id]);
  });
  pasangGambar();
  window.scrollTo(0, y);
}

/* ════════ PROPERTI CATATAN (frontmatter yang bisa disunting) ════════ */
function catatanBuka() {
  return state.notes.find(x => x.id === state.openId);
}

/* Gambar ulang area properti di editor (setelah tambah/hapus baris). */
function renderPropsArea() {
  const box = document.getElementById('props-box');
  const n = catatanBuka();
  if (!box || !n) return;
  box.innerHTML = barisProps(n, 'pv') +
    `<button type="button" class="prop-add" data-prop-add>+ properti</button>`;
}

/* Isi popup "Tambah properti": kunci bawaan yang belum terpakai +
   kolom kunci bebas. */
function menuTambahProp() {
  const n = catatanBuka();
  if (!n) return '';
  const ada = new Set((n.props || []).map(p => p.k));
  const opsi = Object.keys(KET_PROP).filter(k => !ada.has(k));
  const rows = opsi.map(k => {
    const ket = KET_PROP[k];
    const sub = (ket.contoh || []).slice(0, 2).map(c => contohProp(c)).join(' · ');
    return `<button type="button" class="pop-i" data-prop-opt="${k}">
      <svg class="ico"><use href="#i-plus"/></svg>${tr(namaProp(k))}${sub ? `<span class="sub">${sub}</span>` : ''}</button>`;
  }).join('');
  return `<div class="pop-h">${tr('Tambah properti')}</div>
    ${rows || `<p class="prop-pop-hint">${tr('Semua properti bawaan sudah terpasang — pakai kunci lain di bawah.')}</p>`}
    <div style="display:flex;gap:6px;padding:4px 10px 10px">
      <input id="prop-baru" class="pop-in" placeholder="${tr('kunci lain… (mis. klien)')}" aria-label="${tr('Nama properti baru')}">
      <button type="button" class="btn btn-pri" data-prop-ok style="height:34px;flex:none">${tr('Tambah')}</button>
    </div>`;
}

function tambahProp(k) {
  const n = catatanBuka();
  if (!n) return;
  aturProp(n, k, '');
  touch(n);
  saveSoon();
  renderPropsArea();
  const inp = document.querySelector(`#props-box [data-prop-k="${k}"]`);
  if (inp) { inp.focus(); inp.select && inp.select(); }
}

/* ════════ PANEL BAWAH EDITOR: lompat ke catatan & blok ════════ */
/* tambatan popup templat (tombol "Dari templat…") — untuk membuka ulang
   menu setelah templat tersimpan dihapus */
let tambatTpl = null;

function lompatKe(noteId, bid) {
  if (!noteId) return;
  openNote(noteId);
  if (!bid) return;
  setTimeout(() => {
    const d = docEl();
    if (!d) return;
    const el = d.querySelector(`[data-bid="${bid}"]`);
    if (!el) return;
    try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { /* tua */ }
    el.classList.add('blk-lompat');
    setTimeout(() => el.classList.remove('blk-lompat'), 1900);
  }, 90);
}

/* ════════ DATA MASUK-KELUAR (Pengaturan & menu ···) ════════ */
/* Ringkasan impor yang sudah dibaca, menunggu keputusan Gabung/Timpa. */
let imporTertunda = null;

function eksporMdCatatanSekarang() {
  const n = state.notes.find(x => x.id === state.openId);
  if (!n) return;
  const teks = markdownDariCatatan(n);
  unduh(`${namaBerkasAman(n.title)}.md`, teks, 'text/markdown');
  toast(`${tr('Ekspor .md')}: ${namaBerkasAman(n.title)}.md`);
}

function pilihBerkasImpor() {
  const inp = document.getElementById('impor-in');
  if (inp) inp.click();
}

async function prosesBerkasImpor(berkas) {
  const nama = berkas.name || 'berkas';
  try {
    let ringkas;
    if (/\.zip$/i.test(nama)) {
      const buf = new Uint8Array(await berkas.arrayBuffer());
      ringkas = await siapImpor(nama, '', buf);
    } else {
      const teks = await berkas.text();
      ringkas = await siapImpor(nama, teks, null);
    }
    imporTertunda = ringkas;
    const jml = ringkas.catatan.length;
    const detil = ringkas.jenis === 'json'
      ? `${tr('{n} catatan', { n: ringkas.catatan.length }) }` +
        (ringkas.jumlahBlob ? ` + ${ringkas.jumlahBlob} ${tr('gambar')}` : '')
      : `${tr('{n} catatan baru', { n: ringkas.catatan.length })}`;
    const tombol = ringkas.jenis === 'json'
      ? `<button class="btn btn-sec" style="flex:1" data-impor-batal>${tr('Batal')}</button>
         <button class="btn btn-sec" style="flex:1" data-impor-terapkan="gabung">${tr('Gabung')}</button>
         <button class="btn btn-pri" style="flex:1" data-impor-terapkan="timpa">${tr('Timpa semua')}</button>`
      : `<button class="btn btn-sec" style="flex:1" data-impor-batal>${tr('Batal')}</button>
         <button class="btn btn-pri" style="flex:1" data-impor-terapkan="gabung">Impor ${jml}</button>`;
    const barisTombol = document.querySelector('[data-impor]');
    openPop(`<div class="pop-h">${tr('Impor')}: ${esc(nama)}</div>
      <p class="pop-note">${detil}.${ringkas.jenis === 'json' ? tr(' Gabung = sisip & perbarui; Timpa semua = kembalikan persis cadangan.') : tr(' Tiap catatan baru ditambahkan — tidak ada yang ditimpa.')}</p>
      <div style="display:flex;gap:8px;padding:2px 10px 10px">${tombol}</div>`,
      barisTombol || undefined);
  } catch (e) {
    toast(e && e.message ? e.message : tr('Impor gagal'));
  }
}

async function terapkanImporTertunda(mode) {
  const r = imporTertunda;
  imporTertunda = null;
  if (!r) return;
  try {
    const h = await terapkanImpor(r, mode);
    toast(mode === 'timpa' && r.jenis === 'json'
      ? `${tr('Cadangan dipulihkan')}: ${tr('{n} catatan', { n: h.catatan })}, ${h.dipulihkan} ${tr('gambar')}`
      : `${r.jenis === 'json' ? tr('Impor JSON') : tr('Impor markdown')} ${tr('selesai')}: ${h.baru || h.catatan} ${tr('catatan')}${h.dipulihkan ? ', ' + h.dipulihkan + ' ' + tr('gambar') : ''}`);
    go(cur || 'notes');
  } catch (e) {
    toast(tr('Impor gagal') + ': ' + (e && e.message ? e.message : e));
  }
}

/* ════════ HAPUS PERMANEN DUA KETUKAN (Sampah) ════════ */
let timerYakin = null;
function hapusDuaKetuk(b) {
  if (b.classList.contains('yakin')) { hapusPermanen(b.dataset.putus); return; }
  b.classList.add('yakin');
  b.textContent = tr('Yakin?');
  clearTimeout(timerYakin);
  timerYakin = setTimeout(() => {
    document.querySelectorAll('[data-putus].yakin').forEach(x => {
      x.classList.remove('yakin');
      x.textContent = tr('Hapus');
    });
  }, 3500);
}

export const notesModule = {
  id: 'notes',
  name: 'Catatan',
  color: '#3F6F5B',

  init() {
    registerViews(
      { home: homeView, notes: notesView, editor: editorView, kunci: layarKunciView,
        ...miscViews, task: tugasView, rem: reminderView },   /* timpa placeholder asli */
      { home: 'Beranda', notes: 'Catatan', editor: '', kunci: 'Terkunci',
        rem: 'Reminder', task: 'Tugas', search: 'Cari', tags: 'Tag',
        arsip: 'Arsip', trash: 'Sampah', set: 'Pengaturan' }
    );

    /* Hubungkan editor <-> autosave manager. Editor tidak menyentuh
       storage; manager yang mengatur debounce, urutan, dan draf. */
    konfigurasi({ baca: bacaEditor, tulis: tulisKeCatatan });
    onStatus(tampilkanStatus);
    /* panel bawah editor ikut segar setiap kali simpan tuntas */
    onStatus(s => { if (s === STATUS.SAVED && cur === 'editor') muatPanels(); });

    renderBar();
    bindEditor();
    bindPop();
    bindTataGambar();
    bindBacaPlus();           /* A−/A+, zen, cari-di-catatan */
    bindDaftarIsi();          /* B8: lompat ke heading */
    bindTagWarna();           /* B10: panel warna tag */
    bindGaleri();             /* C15: sisip ulang dari galeri */
    bindKunci();              /* D19: layar PIN & panel kunci catatan */
    bindSwipe();              /* D21: sapuan hapus/arsip pada baris daftar */

    /* sapuan sampah: catatan yang sudah >30 hari di tempat sampah
       dibuang saat aplikasi dibuka */
    purgeSampahOtomatis();

    /* simpan sebelum meninggalkan editor */
    onBeforeLeave(from => {
      /* tuntaskan perubahan tertunda SEBELUM layar berganti */
      if (from === 'editor') { flush(); resetAutosave(); }
      const mb = document.getElementById('mode');
      if (mb) mb.style.display = 'none';
      matikanZen();
      tutupCari();
      bebaskanUrl();          /* objectURL lama tidak dipakai lagi */
    });

    /* kontrol halaman Pengaturan: bar mekanik, getar, tema, aksen */
    /* ── bahasa (Bahasa di Pengaturan) ──
       Dropdown pilihan bahasa: begitu diganti langsung berlaku —
       terjemahan elemen statis (nav, tombol header) diperbarui, bar
       mekanik & layar yang sedang dibuka digambar ulang. Layar yang
       dirender ulang bukan editor — mengganti bahasa hanya bisa
       dilakukan dari Pengaturan. */
    document.addEventListener('change', e => {
      const lb = e.target.closest('[data-bahasa]');
      if (!lb) return;
      setBahasa(lb.value);
      terjemahStatis(document);
      /* isi & judul catatan SAMBUTAN mengikuti bahasa — hanya catatan
         sambutan; catatan pengguna lain tidak pernah diterjemahkan */
      sinkronWelcome();
      gambarBar();
      if (cur !== 'editor') go(cur);
    });

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
        return;
      }
      const tt = e.target.closest('[data-toggle-tema]');
      if (tt) {
        toggleTema();
        const s = document.getElementById('tema-st');
        if (s) s.textContent = labelMode();
        return;
      }
      const ak = e.target.closest('[data-ak]');
      if (ak) {
        setAk(ak.dataset.ak || null);
        document.querySelectorAll('[data-ak]')
          .forEach(b => b.classList.toggle('on', (b.dataset.ak || '') === (ak.dataset.ak || '')));
        return;
      }
    });

    /* ganti mode baca / tulis — tombol #mode di header editor */
    document.addEventListener('click', e => {
      const mb = e.target.closest('#mode');
      if (mb) {
        e.preventDefault(); e.stopImmediatePropagation();
        toggleModeBaca();
        tutupCari();                /* cari hanya untuk mode baca */
        bersihkanPilihanGambar();   /* bilah gambar tak boleh tampil di mode baca */
        /* tata letak mode baca harus persis sama dengan mode tulis:
           gambar di-render ulang dari model DOM yang sama */
        if (modeBacaBerlaku()) segarkanIsiEditor();
      }
    });

    /* buat catatan dari templat (lembar + baru) — diproses di modul
       Catatan, bukan app.js, supaya sheet tidak menelan aksinya */
    document.addEventListener('click', e => {
      const t = e.target.closest('[data-new="tpl"]');
      if (t) {
        e.stopImmediatePropagation();
        closeAll();
        /* anchor = FAB (sheet sudah tertutup, tombolnya tak terlihat) */
        const fab = document.getElementById('fab');
        tambatTpl = fab;
        openPop(menuTemplat(), fab || t);
      }
    });
    /* pilih templat → catatan baru; hapus templat tersimpan */
    document.addEventListener('click', e => {
      const pi = e.target.closest('[data-tpl-id]');
      if (pi) { closeAll(); terapkanTemplat(pi.dataset.tplId); return; }
      const pd = e.target.closest('[data-tpl-del]');
      if (pd) {
        hapusTemplat(pd.dataset.tplDel);
        if (tambatTpl && tambatTpl.isConnected) openPop(menuTemplat(), tambatTpl);
        else closeAll();
        return;
      }
    });
    /* baris "Belum selesai" → lompat ke catatan & bloknya */
    document.addEventListener('click', e => {
      const t = e.target.closest('[data-todo-lompat]');
      if (t) lompatKe(t.dataset.todoLompat, t.dataset.todoBid || null);
    });

    /* tombol silang pada gambar */
    document.addEventListener('click', e => {
      const x = e.target.closest('[data-imgx]');
      if (x) hapusGambar(x.dataset.imgx);
    });

    /* klik: properti, tag, wikilink, panel, sampah.
       TERDAFTAR SEBELUM delegasi app.js — tag di dalam baris catatan
       (data-open) memakai stopImmediatePropagation supaya barisnya
       tidak ikut terbuka. */
    document.addEventListener('click', e => {
      /* ── properti ── */
      const pa = e.target.closest('[data-prop-add]');
      if (pa) { openPop(menuTambahProp(), pa); return; }
      const po = e.target.closest('[data-prop-opt]');
      if (po) { tambahProp(po.dataset.propOpt); closeAll(); return; }
      const pok = e.target.closest('[data-prop-ok]');
      if (pok) {
        const inp = document.getElementById('prop-baru');
        const v = (inp ? inp.value : '').trim().toLowerCase();
        if (!/^[a-z0-9][a-z0-9_-]{0,24}$/.test(v)) {
          toast(tr('Kunci properti: huruf/angka kecil tanpa spasi'));
          if (inp) inp.focus();
          return;
        }
        tambahProp(v);
        closeAll();
        return;
      }
      const pd = e.target.closest('[data-prop-del]');
      if (pd) {
        const n = catatanBuka();
        if (!n) return;
        hapusProp(n, pd.dataset.propDel);
        touch(n);
        saveSoon();
        renderPropsArea();
        return;
      }

      /* ── jurnal: tombol catatan hari ini (beranda & lembar baru) ── */
      const jh = e.target.closest('[data-jurnal-hari]');
      if (jh) { bukaJurnalHari(); return; }

      /* ── urut daftar (B7): buka menu urut; pilih opsi ── */
      const ub = e.target.closest('[data-urut-buka]');
      if (ub) {
        openPop(menuUrut(), ub);
        return;
      }
      const us = e.target.closest('[data-urut-set]');
      if (us) {
        closeAll();
        setUrut(us.dataset.urutSet);
        go(cur);              /* gambar ulang daftar dengan urutan baru */
        toast(tr('Diurutkan') + ': ' + tr(namaUrut()));
        return;
      }

      /* ── pin: tombol semat kecil di baris daftar (A4) ──
         Daftar digambar ulang TANPA melompat ke atas: di layar Cari
         cukup segarkan hasilnya, di layar lain posisi scroll dijaga. */
      const px = e.target.closest('[data-pinx]');
      if (px) {
        e.preventDefault();
        e.stopImmediatePropagation();
        sematDariList(px.dataset.pinx);
        const w = document.getElementById('wrap');
        const sblm = w ? w.scrollTop : 0;
        if (cur === 'search') {
          const ci = document.getElementById('cari-in');
          renderHasilCari(ci ? ci.value : '');
        } else {
          go(cur);
          if (w) w.scrollTop = sblm;
        }
        return;
      }

      /* ── tag: chip daftar, baris halaman tag, atau #tag di editor ── */
      const tg = e.target.closest('[data-tag], .ed-doc .tg');
      if (tg) {
        e.preventDefault();
        e.stopImmediatePropagation();
        let nama = tg.dataset ? tg.dataset.tag : null;
        if (!nama && tg.textContent) nama = tg.textContent.replace(/^#/, '').trim();
        if (!nama) return;
        setTag(stt.tag === nama ? null : nama);
        go('notes');
        return;
      }
      const tx = e.target.closest('[data-tag-x]');
      if (tx) { e.preventDefault(); setTag(null); go('notes'); return; }

      /* ── wikilink dalam editor ──
         Mati (belum ada catatannya): satu ketukan langsung membuatnya.
         Hidup: klik biasa = sunting teks; Ctrl/Cmd/Alt+klik = buka. */
      const wl = e.target.closest('.ed-doc .wl');
      if (wl) {
        const judul = judulSpan(wl);
        if (!judul) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        const ada = cariJudul(judul);
        if (!ada) buatNoteBerjudul(judul);
        else if (e.ctrlKey || e.metaKey || e.altKey) openNote(ada.id);
        return;
      }

      /* ── panel data bawah editor ── */
      const taut = e.target.closest('[data-sebut-taut]');
      if (taut) {
        const [sid, bid] = taut.dataset.sebutTaut.split(':');
        const n = catatanBuka();
        const judul = n ? String(n.title || '').trim() : '';
        if (sid && bid && judul && tautkanSebutan(sid, bid, judul)) {
          muatPanels();
          toast(tr('Mention diubah jadi tautan'));
        }
        return;
      }
      const buat = e.target.closest('[data-dm-buat]');
      if (buat) { buatNoteBerjudul(buat.dataset.dmBuat); return; }
      const buka = e.target.closest('[data-dm-buka]');
      if (buka) { lompatKe(buka.dataset.dmBuka, buka.dataset.dmBid || null); return; }

      /* ── sampah ── */
      const ph = e.target.closest('[data-pulih]');
      if (ph) { pulihkanSampah(ph.dataset.pulih); return; }
      const pu = e.target.closest('[data-putus]');
      if (pu) { hapusDuaKetuk(pu); return; }

      /* ── aksi sapuan baris daftar (D21) ── */
      const swd = e.target.closest('[data-sw-del]');
      if (swd) {
        hapusNoteDariList(swd.dataset.swDel);   /* soft-delete + Urungkan */
        segarkanSetelahSapuan();
        return;
      }
      const swa = e.target.closest('[data-sw-ars]');
      if (swa) {
        arsipNoteId(swa.dataset.swArs);
        segarkanSetelahSapuan();
        return;
      }
    });

/* Gambar ulang daftar sesudah aksi sapuan, posisi scroll dipertahankan. */
function segarkanSetelahSapuan() {
  const w = document.getElementById('wrap');
  const sblm = w ? w.scrollTop : 0;
  go(cur === 'notes' || cur === 'arsip' ? cur : 'notes');
  if (w) w.scrollTop = sblm;
}

    /* ── data masuk-keluar: ekspor / impor / konfirmasi ── */
    document.addEventListener('click', e => {
      const nx = e.target.closest('[data-note-act="ekspor"]');
      if (nx) { closeAll(); eksporMdCatatanSekarang(); return; }

      const eks = e.target.closest('[data-ekspor]');
      if (eks) {
        if (eks.dataset.ekspor === 'json') {
          cadanganJson().then(({ nama, teks }) => {
            unduh(nama, teks, 'application/json');
            toast(`${tr('Cadangan diunduh')}: ${nama}`);
          }).catch(() => toast(tr('Ekspor JSON gagal')));
        } else {
          const { nama, entri } = eksporSemuaMarkdown();
          if (!entri.length) { toast(tr('Tidak ada catatan untuk diekspor')); return; }
          if (entri.length === 1) {
            unduh(entri[0].nama, entri[0].teks, 'text/markdown');
            toast(`${tr('Ekspor')}: ${entri[0].nama}`);
          } else {
            unduh(nama, buatZip(entri), 'application/zip');
            toast(`${tr('{n} catatan', { n: entri.length })} → ${nama}`);
          }
        }
        return;
      }
      const ip = e.target.closest('[data-impor]');
      if (ip) { pilihBerkasImpor(); return; }
      const tb = e.target.closest('[data-impor-batal]');
      if (tb) { closeAll(); imporTertunda = null; return; }
      const tt = e.target.closest('[data-impor-terapkan]');
      if (tt) { closeAll(); terapkanImporTertunda(tt.dataset.imporTerapkan); return; }
    });
    document.addEventListener('change', e => {
      const inp = e.target.closest ? e.target.closest('#impor-in') : null;
      if (inp && inp.files && inp.files[0]) {
        const f = inp.files[0];
        inp.value = '';
        prosesBerkasImpor(f);
      }
    });

    /* ketik: properti langsung menempel ke model; cari langsung mencari */
    document.addEventListener('input', e => {
      const pi = e.target.closest ? e.target.closest('.props [data-prop-k]') : null;
      if (pi) {
        const n = catatanBuka();
        if (!n) return;
        aturProp(n, pi.dataset.propK, pi.value);
        touch(n);
        saveSoon();
        return;
      }
      if (cur === 'search' && e.target && e.target.id === 'cari-in') {
        renderHasilCari(e.target.value);
      }
    });

    /* tombol: Enter kunci properti bebas + akses keyboard panel/graph */
    document.addEventListener('keydown', e => {
      const b = document.getElementById('prop-baru');
      if (b && e.target === b && e.key === 'Enter') {
        e.preventDefault();
        const ok = document.querySelector('#pop [data-prop-ok]');
        if (ok) ok.click();
        return;
      }
      const t = e.target;
      if ((e.key === 'Enter' || e.key === ' ') && t && t.matches &&
          t.matches('[data-dm-buka],[data-dm-buat],[data-pinx]')) {
        e.preventDefault();
        t.click();
      }
    });

    /* siapkan editor tiap kali layar selesai digambar */
    let idPetunjukBuka = null;   /* catatan yang sudah menerima petunjuk singkat */
    onAfterRender(() => {
      /* D19: layar kunci tidak menyentuh editor sama sekali — isi
         catatan terkunci tidak boleh dirender / diproses di belakang
         pintu PIN. */
      if (cur === 'kunci') return;
      /* petunjuk mengetik tidak menetap di bar: tampil sekali sebagai
         notif 5 detik setiap kali MASUK catatan (mode tulis) */
      if (cur === 'editor' && state.openId !== idPetunjukBuka) {
        idPetunjukBuka = state.openId;
        const mech = document.getElementById('mech');
        if (mech && mech.classList.contains('on'))
          toast(tr('Ketuk untuk mengaktifkan · ketuk catatan untuk mengetik'), null, 5000);
      } else if (cur !== 'editor') {
        idPetunjukBuka = null;
      }
      closeAll();
      bersihkanPilihanGambar();   /* seleksi gambar tak boleh menempel antar layar */
      pending.clear();
      sticky.clear();
      mati.clear();
      const d = docEl();
      if (d && d.firstElementChild) caretEnd(d.firstElementChild);
      pastikanKolomAkhir(d);   /* catatan tak boleh berakhir di gambar */
      pasangSeret(d);
      /* undo tidak boleh melintas antar catatan */
      if (d) resetHistory();
      /* nomor daftar tampil sejak render pertama, bukan menunggu ketikan */
      renumber();
      updateCount();
      syncBtns();
      pasangGambar();
      pasangThumbDaftar(document.getElementById('wrap'));   /* C16 */
      isiPengaturan();
      tawarkanRecovery();
      tandaiTautan(docEl());
      /* panel data (tautan/backlink/mention/graph) & hasil cari */
      muatPanels();
      sinkronModeBaca();
      terapkanUkuranLayar();   /* A−/A+ tersimpan langsung berlaku */
      if (cur === 'search') {
        const ci = document.getElementById('cari-in');
        if (ci) ci.focus();
      }
    });

    /* simpan saat aplikasi ditutup / dipindah ke belakang */
    /* ── lifecycle: jangan sampai ada yang tertinggal ──
       Hanya menyimpan kalau ADA perubahan tertunda. Sebelumnya `blur`
       selalu memaksa tulis ulang penuh — untuk catatan panjang itu
       pemborosan tiap kali jendela kehilangan fokus (mis. membuka
       panel devtools atau berpindah tab). */
    const tuntaskan = () => {
      if (cur === 'editor' && adaPerubahanTertunda()) saveNow();
    };
    window.addEventListener('pagehide', tuntaskan);
    window.addEventListener('beforeunload', tuntaskan);
    window.addEventListener('blur', tuntaskan);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') tuntaskan();
    });

    /* ── sapuan blob yatim saat aplikasi dibuka ──
       Jalur yang tidak kita kendalikan langsung (undo sisip gambar,
       simpan gagal di tengah, dsb.) bisa meninggalkan berkas di
       IndexedDB yang tidak dirujuk catatan mana pun. Sapuan ringan ini
       membersihkannya sekali tiap sesi. */
    setTimeout(() => bersihkanBlobYatim(), 4000);

    /* tombol "Coba lagi" pada indikator status */
    document.addEventListener('click', e => {
      if (e.target.closest('[data-retry]')) cobaUlang();
    });

    /* pilihan Pulihkan / Buang pada bilah recovery */
    document.addEventListener('click', e => {
      const r = e.target.closest('[data-rec]');
      if (!r) return;
      if (r.dataset.rec === 'restore') pulihkanDraf();
      else { hapusDraf(); tutupBilahRecovery(); toast(tr('Perubahan dibuang')); }
    });

  }
};
