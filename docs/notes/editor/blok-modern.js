/**
 * Blok & Interaksi Modern Editor Catatan Hara:
 * 1. Blok Lipat / Toggle (`b-toggle`) — judul + isi yang bisa dilipat/dibuka
 * 2. Blok Tabel Responsif (`b-table`) — tambah/hapus baris & kolom, navigasi Tab
 * 3. Blok Memo Suara Offline (`b-audio`) — rekam suara MediaRecorder ke IndexedDB blob
 * 4. Bilah Kode Mengambang (`#code-bar`) — label bahasa + tombol Salin Kode 1-klik
 * 5. Pill Sentuh Wikilink (`#wl-pill`) — ketuk `[[Judul]]` di layar sentuh untuk langsung buka
 *
 * Seluruh blok khusus memakai `contenteditable="false"` pada pembungkus luarnya
 * sehingga mesin caret teks utama (`editor/caret.js`) sama sekali tidak terganggu.
 */

import { docEl, curBlock, caretEnd, nearestEditable } from './caret.js?v=20261029160000';
import { refresh } from './cleanup.js?v=20261029160000';
import { snap } from './history.js?v=20261029160000';
import { modeBacaBerlaku } from '../mode-baca.js?v=20261029160000';
import { cariJudul, judulSpan, bagianSpan, sasaranPdfSpan } from '../wikilink.js?v=20261029160000';
import { bukaSasaranTautan, bukaPdfSasaran } from '../lompat-tautan.js?v=20261029160000';
import { simpanBlob, urlUntuk, hapusBlob } from '../../core/blobs.js?v=20261029160000';
import { newBlockId, blockToHtml, makeBlock, touch, normalisasiTanda, tandaAudioHtml, bacaTandaDom } from '../note-model.js?v=20261029160000';
import { state } from '../../core/store.js?v=20261029160000';
import { simpan } from '../../core/autosave.js?v=20261029160000';
import { mulaiRekam, hentikanRekam, sedangMerekam, segarkanRekam, tandaiRekam } from './perekam-suara.js?v=20261029160000';
import { cur, onAfterRender, onBeforeLeave } from '../../core/router.js?v=20261029160000';
import { esc } from '../../core/dom.js?v=20261029160000';
import { toast } from '../../core/toast.js?v=20261029160000';
import { t as tr } from '../../core/i18n.js?v=20261029160000';
import { urutBaris, lolosSaring, hitungTabel, simpanKeadaanTabel, adalahRumus } from '../tabel-rumus.js?v=20261029160000';

const BAHASA_KODE = ['', 'js', 'ts', 'py', 'html', 'css', 'json', 'bash', 'sql', 'md'];

function sisipkanBlokKhusus(blokData) {
  const d = docEl();
  if (!d) return null;
  snap();
  const target = curBlock() || d.lastElementChild;
  const wrap = document.createElement('div');
  wrap.innerHTML = blockToHtml(blokData);
  const el = wrap.firstElementChild;
  if (!el) return null;
  if (target && target.parentNode === d) {
    /* Jika blok saat ini paragraf kosong murni, gantikan saja supaya tidak menumpuk baris kosong */
    const kosong = target.classList.contains('b-p') &&
      !target.querySelector('img') &&
      (target.textContent || '').replace(/[\u200b\u00a0]/g, '').trim() === '';
    if (kosong) target.replaceWith(el);
    else target.after(el);
  } else {
    d.appendChild(el);
  }
  /* Pastikan ada paragraf ketik sesudah blok non-teks di ujung dokumen */
  if (!el.nextElementSibling) {
    const p = document.createElement('div');
    p.className = 'b-p';
    p.setAttribute('data-bid', newBlockId());
    el.after(p);
  }
  refresh();
  return el;
}

/* ════════ 1. BLOK LIPAT (TOGGLE) ════════ */
export function insertToggle(summary = '', body = '') {
  const el = sisipkanBlokKhusus({
    id: newBlockId(),
    type: 'toggle',
    content: body,
    meta: { summary, open: true },
  });
  if (el) {
    const inp = el.querySelector('.tgl-sum');
    if (inp) inp.focus();
  }
  return el;
}

/* ════════ 2. BLOK TABEL RESPONSIF ════════ */
export function insertTable(rows = null) {
  const defaultRows = rows || [
    [tr('Kolom 1'), tr('Kolom 2'), tr('Kolom 3')],
    ['', '', ''],
    ['', '', ''],
  ];
  const el = sisipkanBlokKhusus({
    id: newBlockId(),
    type: 'table',
    content: '',
    meta: { rows: defaultRows },
  });
  if (el) {
    const firstTd = el.querySelector('tbody td, thead th');
    if (firstTd) firstTd.focus();
  }
  return el;
}

function bacaRowsDariEl(tblEl) {
  const trs = Array.from(tblEl.querySelectorAll('tr'));
  return trs.map(row =>
    Array.from(row.querySelectorAll('th,td')).map(cell => (cell.textContent || '').trim())
  );
}

/* MB2: saring hanya menyembunyikan baris di DOM (data tetap utuh) dan
   menyimpan keadaannya per blok, tanpa menyentuh catatan. */
function terapkanSaringTabel(box) {
  const kol = Number((box.querySelector('[data-tbl-kol]') || {}).value) || 0;
  const teks = (box.querySelector('[data-tbl-saring]') || {}).value || '';
  simpanKeadaanTabel(box.getAttribute('data-bid') || '', kol, teks);
  const lolos = lolosSaring(bacaRowsDariEl(box), kol, teks);
  Array.from(box.querySelectorAll('tbody tr')).forEach((tr, i) => {
    tr.hidden = lolos[i] === false;
  });
}

/* MB2: hasil rumus ditulis sebagai atribut data-hasil (CSS menampilkannya di
   bawah sel). Teks sel tidak berubah, jadi tidak ikut tersimpan. */
function segarkanRumusTabel(box) {
  const hasil = hitungTabel(bacaRowsDariEl(box));
  Array.from(box.querySelectorAll('tr')).forEach((tr, ri) => {
    Array.from(tr.querySelectorAll('th,td')).forEach((cell, ci) => {
      if (adalahRumus((cell.textContent || '').trim())) cell.setAttribute('data-hasil', (hasil[ri] && hasil[ri][ci]) ?? '');
      else cell.removeAttribute('data-hasil');
    });
  });
}

function renderUlangTabel(bTable, rows) {
  snap();
  const bid = bTable.getAttribute('data-bid') || newBlockId();
  const wrap = document.createElement('div');
  wrap.innerHTML = blockToHtml({ id: bid, type: 'table', content: '', meta: { rows } });
  const baru = wrap.firstElementChild;
  if (baru) {
    bTable.replaceWith(baru);
    sinkronBacaBlokModern();
    refresh();
  }
}

/* ════════ 3. BLOK MEMO SUARA OFFLINE (AUDIO) ════════ */
export function insertAudioBlock(blobId, durasiDetik = 0, judul = '', tanda = []) {
  const el = sisipkanBlokKhusus({
    id: newBlockId(),
    type: 'audio',
    content: '',
    meta: {
      blobId,
      duration: Math.max(0, Math.round(durasiDetik)),
      title: judul || tr('Memo suara'),
      marks: normalisasiTanda(tanda),
    },
  });
  pasangAudio();
  return el;
}

export async function pasangAudio() {
  const d = docEl();
  if (!d) return;
  const items = Array.from(d.querySelectorAll('.b-audio[data-blob]'));
  for (const box of items) {
    const id = box.getAttribute('data-blob');
    const aud = box.querySelector('audio');
    if (!id || !aud || aud.getAttribute('src')) continue;
    try {
      const u = await urlUntuk(id);
      if (u) aud.setAttribute('src', u);
    } catch (e) {}
  }
}

/* C2 · Input di dalam blok memo (judul dan catatan tanda waktu) adalah kolom teks biasa.
   Penangan keydown/beforeinput editor di .ed-doc akan mengambil fokus dan membuang
   ketikan pertama, jadi keduanya dihentikan sebelum sampai ke editor. Event `input`
   tetap lewat karena autosave bergantung padanya. */
for (const jenis of ['keydown', 'beforeinput']) {
  document.addEventListener(jenis, e => {
    const t = e.target;
    if (t && t.tagName === 'INPUT' && t.closest && t.closest('.b-audio')) e.stopPropagation();
  }, true);
}

/* Sesi rekaman dipegang perekam-suara.js (tidak mati saat popup ditutup). */
function memoSelesai(noteId, { blobId, dur, judul, tanda = [] }) {
  const judulAkhir = judul || tr('Memo suara');
  if (noteId && state.openId === noteId && docEl()) {
    insertAudioBlock(blobId, dur, judulAkhir, tanda);
    toast(tr('Memo suara disimpan ke catatan'));
    return;
  }
  /* Catatan asal sudah tidak terbuka (pengguna pindah saat merekam): sisipkan ke datanya langsung. */
  const n = noteId ? state.notes.find(x => x.id === noteId && !x.deletedAt) : null;
  if (n && Array.isArray(n.blocks)) {
    n.blocks.push(makeBlock({
      type: 'audio',
      content: '',
      meta: { blobId, duration: Math.max(0, Math.round(dur)), title: judulAkhir, marks: normalisasiTanda(tanda) },
    }));
    touch(n);
    simpan();
    toast(tr('Memo suara disimpan ke catatan'));
    return;
  }
  hapusBlob(blobId).catch(() => {});
  toast(tr('Catatan asal sudah tidak ada. Memo suara dibuang.'));
}

export async function bukaPerekamMemoSuara(anchor) {
  const { openPop: bukaPop, closeAll: tutupPop } = await import('../menus/pop.js?v=20261029160000');
  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
    toast(tr('Perekam suara tidak tersedia di peramban ini'));
    return;
  }
  const sedang = sedangMerekam();
  const noteId = state.openId;
  bukaPop(`
    <div class="rn-modal-box" style="max-width:340px">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <h3 class="rn-modal-title">${tr('Memo Suara Offline')}</h3>
        <button type="button" class="iconbtn" data-pop-close style="width:28px;height:28px"><svg class="ico"><use href="#i-x"/></svg></button>
      </div>
      <input type="text" class="rn-input-text" id="aud-judul" placeholder="${tr('Judul memo (opsional)')}" maxlength="60">
      <div class="aud-rec-status">
        <span class="aud-rec-dot${sedang ? ' on' : ''}" id="aud-dot"></span>
        <span id="aud-waktu">00:00</span>
      </div>
      <div class="rn-actions-top" style="justify-content:flex-end;gap:8px">
        <button type="button" class="btn btn-sec" id="aud-tanda"${sedang ? '' : ' disabled'}>${tr('Tandai')}</button>
        <button type="button" class="btn btn-sec" id="aud-batal">${tr(sedang ? 'Buang' : 'Batal')}</button>
        <button type="button" class="btn btn-pri" id="aud-mulai">${tr(sedang ? 'Selesai & Simpan' : 'Mulai rekam')}</button>
      </div>
    </div>
  `, anchor);
  if (sedang) segarkanRekam();

  const btnMulai = document.getElementById('aud-mulai');
  const btnBatal = document.getElementById('aud-batal');
  const btnTanda = document.getElementById('aud-tanda');
  if (btnTanda) {
    btnTanda.onclick = () => {
      if (tandaiRekam()) toast(tr('Tanda ditambahkan'));
    };
  }

  if (btnBatal) {
    btnBatal.onclick = () => {
      if (sedangMerekam()) hentikanRekam(false);
      tutupPop();
    };
  }

  if (btnMulai) {
    btnMulai.onclick = async () => {
      if (sedangMerekam()) {
        hentikanRekam(true);
        tutupPop();
        return;
      }
      const judulInp = document.getElementById('aud-judul');
      const judul = (judulInp ? judulInp.value : '').trim() || tr('Memo suara');
      try {
        const mulai = await mulaiRekam({ judul, onSelesai: m => memoSelesai(noteId, m) });
        if (!mulai) return;
        btnMulai.textContent = tr('Selesai & Simpan');
        if (btnBatal) btnBatal.textContent = tr('Buang');
        if (btnTanda) btnTanda.disabled = false;
      } catch (err) {
        toast(tr('Izin mikrofon ditolak atau tidak tersedia'));
      }
    };
  }
}

/* C2 · penanda waktu memo: baca dari DOM, tulis ulang daftarnya (urutan dirapikan saat tampil). */
function tulisTanda(box, daftar) {
  const lama = box.querySelector('.aud-marks');
  const wrap = document.createElement('div');
  wrap.innerHTML = tandaAudioHtml(daftar);
  const baru = wrap.firstElementChild;
  if (lama) lama.replaceWith(baru); else box.appendChild(baru);
  const baca = modeBacaBerlaku();
  baru.querySelectorAll('.aud-mark-teks').forEach(i => { i.readOnly = baca; });
}

/* Sinkronkan atribut editable di dalam blok toggle/tabel/audio sesuai Mode Baca / Tulis */
export function sinkronBacaBlokModern() {
  const d = docEl();
  if (!d) return;
  const baca = modeBacaBerlaku();
  d.querySelectorAll('.b-toggle .tgl-sum').forEach(inp => { inp.readOnly = baca; });
  d.querySelectorAll('.b-toggle .tgl-isi').forEach(isi => {
    isi.setAttribute('contenteditable', String(!baca));
  });
  d.querySelectorAll('.b-table th, .b-table td').forEach(cell => {
    cell.setAttribute('contenteditable', String(!baca));
  });
  d.querySelectorAll('.b-audio .aud-title').forEach(inp => { inp.readOnly = baca; });
  d.querySelectorAll('.b-audio .aud-mark-teks').forEach(inp => { inp.readOnly = baca; });
}

/* ════════ 4. BILAH KODE MENGAMBANG (#code-bar) & 5. PILL SENTUH WIKILINK (#wl-pill) ════════ */
let _codeBar = null;
let _aktifCodeEl = null;
let _wlPill = null;
let _aktifWlJudul = '';
let _aktifWlBagian = '';   /* bagian #Heading / #^ref dari tautan yang sedang ditunjuk pil */
let _aktifWlPdf = null;    /* B3b: sasaran halaman PDF ([[Nama.pdf#hal=N]]) yang ditunjuk pil */

function pastikanCodeBar() {
  if (_codeBar && _codeBar.isConnected) return _codeBar;
  const bar = document.createElement('div');
  bar.id = 'code-bar';
  bar.className = 'code-float-bar';
  bar.hidden = true;
  bar.innerHTML = `
    <select class="code-lang-sel" aria-label="${tr('Bahasa kode')}">
      ${BAHASA_KODE.map(b => `<option value="${b}">${b ? b.toUpperCase() : tr('Kode')}</option>`).join('')}
    </select>
    <button type="button" class="code-copy-btn" data-code-copy>
      <svg class="ico" style="width:13px;height:13px"><use href="#i-copy"/></svg>
      <span>${tr('Salin')}</span>
    </button>
  `;
  bar.addEventListener('mousedown', e => {
    if (e.target.tagName !== 'SELECT') e.preventDefault();
  });
  bar.querySelector('.code-lang-sel').addEventListener('change', e => {
    if (!_aktifCodeEl) return;
    const v = e.target.value;
    if (v) _aktifCodeEl.setAttribute('data-lang', v);
    else _aktifCodeEl.removeAttribute('data-lang');
    refresh();
  });
  bar.querySelector('[data-code-copy]').addEventListener('click', async () => {
    if (!_aktifCodeEl) return;
    const teks = (_aktifCodeEl.innerText !== undefined ? _aktifCodeEl.innerText : _aktifCodeEl.textContent || '')
      .replace(/\u200b/g, '');
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(teks);
      } else {
        const ta = document.createElement('textarea');
        ta.value = teks;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      toast(tr('Kode disalin'));
    } catch (e) {
      toast(tr('Kode disalin'));
    }
  });
  document.body.appendChild(bar);
  _codeBar = bar;
  return bar;
}

export function sembunyikanOverlayModern() {
  if (_codeBar) _codeBar.hidden = true;
  if (_wlPill) _wlPill.hidden = true;
  _aktifCodeEl = null;
  _aktifWlJudul = '';
  _aktifWlBagian = '';
  _aktifWlPdf = null;
}

function tampilkanCodeBarUntuk(codeEl) {
  if (!codeEl || cur !== 'editor') return;
  _aktifCodeEl = codeEl;
  const bar = pastikanCodeBar();
  const sel = bar.querySelector('.code-lang-sel');
  const baca = modeBacaBerlaku();
  if (sel) {
    sel.value = codeEl.getAttribute('data-lang') || '';
    sel.disabled = baca;
    sel.style.display = baca && !sel.value ? 'none' : '';
  }
  bar.hidden = false;
  try {
    const r = codeEl.getBoundingClientRect();
    const kanan = Math.max(12, (window.innerWidth || 800) - r.right + 8);
    bar.style.top = Math.max(62, Math.round(r.top + 6)) + 'px';
    bar.style.right = Math.round(kanan) + 'px';
  } catch (e) {}
}

/* B3b: teks label pil — nama PDF dan halamannya, atau judul catatan. */
function sasaranPdfAktif(pdf, ada) {
  if (pdf) return `${pdf.judul} · ${tr('Halaman')} ${pdf.halaman}`;
  return ada ? ada.title : '';
}

export function tampilkanPillWikilink(wlEl) {
  const judul = judulSpan(wlEl);
  if (!judul) return;
  const pdf = sasaranPdfSpan(wlEl);   /* B3b: tautan halaman PDF */
  const ada = pdf ? null : cariJudul(judul);
  if (!ada && !(pdf && pdf.berkas)) return;
  _aktifWlJudul = judul;
  _aktifWlBagian = bagianSpan(wlEl);
  _aktifWlPdf = pdf && pdf.berkas ? pdf : null;
  if (!_wlPill || !_wlPill.isConnected) {
    const p = document.createElement('div');
    p.id = 'wl-pill';
    p.className = 'wl-float-pill';
    p.hidden = true;
    p.addEventListener('mousedown', e => e.preventDefault());
    p.addEventListener('click', () => {
      const sasPdf = _aktifWlPdf;      /* disimpan dulu: sembunyikanOverlayModern() mengosongkannya */
      const target = cariJudul(_aktifWlJudul);
      const bagian = _aktifWlBagian;
      sembunyikanOverlayModern();
      if (sasPdf) { bukaPdfSasaran(sasPdf); return; }
      if (target) bukaSasaranTautan(target, bagian);
    });
    document.body.appendChild(p);
    _wlPill = p;
  }
  _wlPill.innerHTML = `<svg class="ico" style="width:13px;height:13px"><use href="#i-link2"/></svg>` +
    `<span>${esc(tr('Buka'))} «${esc(sasaranPdfAktif(_aktifWlPdf, ada))}»</span>` +
    `<svg class="ico" style="width:12px;height:12px"><use href="#i-arrow-ne"/></svg>`;
  _wlPill.hidden = false;
  try {
    const r = wlEl.getBoundingClientRect();
    const x = Math.max(10, Math.min((window.innerWidth || 360) - 200, r.left));
    const y = r.top > 96 ? r.top - 36 : r.bottom + 6;
    _wlPill.style.left = Math.round(x) + 'px';
    _wlPill.style.top = Math.round(Math.max(60, y)) + 'px';
  } catch (e) {}
}

export function bindBlokModern() {
  /* Klik di dalam dokumen editor: toggle lipatan, kontrol tabel, kontrol audio, code bar, wikilink pill */
  document.addEventListener('click', async e => {
    if (!e.target.closest) return;

    /* 1. Toggle lipat / buka (bekerja baik di Mode Tulis maupun Mode Baca!) */
    const tglBtn = e.target.closest('[data-tgl-btn]');
    if (tglBtn) {
      e.preventDefault();
      const box = tglBtn.closest('.b-toggle');
      if (box) {
        const buka = box.getAttribute('data-open') !== '0';
        box.setAttribute('data-open', buka ? '0' : '1');
        tglBtn.setAttribute('aria-expanded', buka ? 'false' : 'true');
        if (!modeBacaBerlaku()) refresh();
      }
      return;
    }

    const tglDel = e.target.closest('[data-tgl-del]');
    if (tglDel && !modeBacaBerlaku()) {
      const box = tglDel.closest('.b-toggle');
      if (box) {
        snap();
        const next = nearestEditable(box);
        box.remove();
        if (next) caretEnd(next);
        refresh();
      }
      return;
    }

    /* 2. Aksi Tabel (+ baris, + kolom, - baris, - kolom, hapus tabel) */
    const tblAct = e.target.closest('[data-tbl-act]');
    if (tblAct && !modeBacaBerlaku()) {
      e.preventDefault();
      const box = tblAct.closest('.b-table');
      if (!box) return;
      const rows = bacaRowsDariEl(box);
      const cols = Math.max(1, rows[0] ? rows[0].length : 2);
      const act = tblAct.dataset.tblAct;
      if (act === 'add-row') {
        rows.push(Array(cols).fill(''));
        renderUlangTabel(box, rows);
      } else if (act === 'del-row') {
        if (rows.length > 2) {
          rows.pop();
          renderUlangTabel(box, rows);
        } else {
          toast(tr('Minimal 1 baris isi dipertahankan'));
        }
      } else if (act === 'add-col') {
        rows.forEach((r, i) => r.push(i === 0 ? `${tr('Kolom')} ${cols + 1}` : ''));
        renderUlangTabel(box, rows);
      } else if (act === 'del-col') {
        if (cols > 1) {
          rows.forEach(r => r.pop());
          renderUlangTabel(box, rows);
        }
      } else if (act === 'urut-naik' || act === 'urut-turun') {
        /* MB2: urut mengubah urutan baris data (tersimpan), header tetap */
        const kol = Number((box.querySelector('[data-tbl-kol]') || {}).value) || 0;
        const teks = (box.querySelector('[data-tbl-saring]') || {}).value || '';
        simpanKeadaanTabel(box.getAttribute('data-bid') || '', kol, teks);
        renderUlangTabel(box, urutBaris(rows, kol, act === 'urut-naik'));
      } else if (act === 'del-table') {
        snap();
        const next = nearestEditable(box);
        box.remove();
        if (next) caretEnd(next);
        refresh();
      }
      return;
    }

    /* 3. Kontrol Memo Suara (Putar/Jeda, Kecepatan, Hapus) */
    const audPlay = e.target.closest('[data-aud-play]');
    if (audPlay) {
      const box = audPlay.closest('.b-audio');
      const aud = box && box.querySelector('audio');
      if (!aud) return;
      if (!aud.getAttribute('src')) await pasangAudio();
      if (aud.paused) {
        aud.play().catch(() => toast(tr('Berkas suara tidak dapat diputar')));
        box.classList.add('playing');
      } else {
        aud.pause();
        box.classList.remove('playing');
      }
      return;
    }

    const audSpeed = e.target.closest('[data-aud-speed]');
    if (audSpeed) {
      const box = audSpeed.closest('.b-audio');
      const aud = box && box.querySelector('audio');
      if (!aud) return;
      const urutan = [1, 1.5, 2];
      const next = urutan[(urutan.indexOf(aud.playbackRate) + 1) % urutan.length] || 1;
      aud.playbackRate = next;
      audSpeed.textContent = next + '×';
      return;
    }

    /* 3b. Penanda waktu memo (C2): tandai posisi putar, lompat ke tanda, hapus tanda */
    const audTanda = e.target.closest('[data-aud-mark]');
    if (audTanda) {
      if (modeBacaBerlaku()) return;
      const box = audTanda.closest('.b-audio');
      const aud = box && box.querySelector('audio');
      if (!aud) return;
      if (!aud.getAttribute('src')) await pasangAudio();
      const daftar = bacaTandaDom(box.querySelector('.aud-marks'));
      snap();
      daftar.push({ t: aud.currentTime || 0, teks: '' });
      tulisTanda(box, daftar);
      refresh();
      toast(tr('Tanda ditambahkan'));
      return;
    }

    const audSeek = e.target.closest('[data-aud-seek]');
    if (audSeek) {
      const box = audSeek.closest('.b-audio');
      const li = audSeek.closest('.aud-mark');
      const aud = box && box.querySelector('audio');
      if (!aud || !li) return;
      if (!aud.getAttribute('src')) await pasangAudio();
      aud.currentTime = Number(li.getAttribute('data-t')) || 0;
      if (aud.paused) {
        aud.play().catch(() => toast(tr('Berkas suara tidak dapat diputar')));
        box.classList.add('playing');
      }
      return;
    }

    const audTandaDel = e.target.closest('[data-aud-mark-del]');
    if (audTandaDel) {
      if (modeBacaBerlaku()) return;
      const box = audTandaDel.closest('.b-audio');
      const li = audTandaDel.closest('.aud-mark');
      if (!box || !li) return;
      const daftar = bacaTandaDom(box.querySelector('.aud-marks'));
      const i = Array.from(li.parentNode.children).indexOf(li);
      if (i < 0) return;
      snap();
      daftar.splice(i, 1);
      tulisTanda(box, daftar);
      refresh();
      return;
    }

    const audDel = e.target.closest('[data-aud-del]');
    if (audDel && !modeBacaBerlaku()) {
      const box = audDel.closest('.b-audio');
      if (box) {
        const blobId = box.getAttribute('data-blob');
        snap();
        const next = nearestEditable(box);
        box.remove();
        if (next) caretEnd(next);
        refresh();
        if (blobId) { try { await hapusBlob(blobId); } catch (err) {} }
        toast(tr('Memo suara dihapus'));
      }
      return;
    }

    /* 4. Tampilkan bilah kode saat blok kode diklik/disentuh */
    const codeEl = e.target.closest('.ed-doc .b-code');
    if (codeEl) {
      tampilkanCodeBarUntuk(codeEl);
    } else if (!e.target.closest('#code-bar') && _codeBar) {
      _codeBar.hidden = true;
    }

    /* Sembunyikan pill wikilink bila klik di luar wikilink & di luar pill */
    if (!e.target.closest('.ed-doc .wl') && !e.target.closest('#wl-pill') && _wlPill) {
      _wlPill.hidden = true;
    }
  });

  /* Hover desktop pada blok kode juga memunculkan tombol Salin dengan mulus */
  document.addEventListener('mouseover', e => {
    const codeEl = e.target.closest && e.target.closest('.ed-doc .b-code');
    if (codeEl && codeEl !== _aktifCodeEl) tampilkanCodeBarUntuk(codeEl);
  });

  /* Perubahan isi pada Toggle / Tabel / Judul Audio langsung memicu autosave */
  document.addEventListener('input', e => {
    if (!e.target.closest) return;
    const box = e.target.closest('.b-table');
    if (box && e.target.matches && e.target.matches('[data-tbl-saring]')) {
      terapkanSaringTabel(box);
      return;
    }
    if (e.target.closest('.b-toggle') || box || e.target.closest('.b-audio')) {
      if (box) segarkanRumusTabel(box);
      refresh();
    }
  });

  /* MB2: ganti kolom urut/saring → saring ulang baris yang terlihat */
  document.addEventListener('change', e => {
    if (!e.target.closest || !e.target.matches || !e.target.matches('[data-tbl-kol]')) return;
    const box = e.target.closest('.b-table');
    if (box) terapkanSaringTabel(box);
  });

  /* Navigasi Tab / Shift+Tab antar sel di dalam Tabel */
  document.addEventListener('keydown', e => {
    if (e.key !== 'Tab' || !e.target.closest) return;
    const cell = e.target.closest('.b-table th, .b-table td');
    if (!cell) return;
    e.preventDefault();
    const box = cell.closest('.b-table');
    const cells = Array.from(box.querySelectorAll('th, td'));
    const idx = cells.indexOf(cell);
    const nextIdx = e.shiftKey ? idx - 1 : idx + 1;
    if (nextIdx >= 0 && nextIdx < cells.length) {
      cells[nextIdx].focus();
    } else if (!e.shiftKey && !modeBacaBerlaku()) {
      /* Tab di sel paling akhir otomatis menambah baris baru! */
      const rows = bacaRowsDariEl(box);
      const cols = Math.max(1, rows[0] ? rows[0].length : 2);
      rows.push(Array(cols).fill(''));
      renderUlangTabel(box, rows);
    }
  });

  /* Update progress pemutaran audio */
  document.addEventListener('ended', e => {
    const box = e.target && e.target.closest && e.target.closest('.b-audio');
    if (box) box.classList.remove('playing');
  }, true);

  document.getElementById('wrap')?.addEventListener('scroll', () => {
    if (_codeBar && !_codeBar.hidden && _aktifCodeEl) tampilkanCodeBarUntuk(_aktifCodeEl);
    if (_wlPill && !_wlPill.hidden) _wlPill.hidden = true;
  }, { passive: true });

  onAfterRender(() => {
    sembunyikanOverlayModern();
    if (cur === 'editor') {
      sinkronBacaBlokModern();
      pasangAudio();
    }
  });

  onBeforeLeave(() => {
    sembunyikanOverlayModern();
  });
}
