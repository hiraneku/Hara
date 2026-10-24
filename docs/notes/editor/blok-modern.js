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

import { docEl, curBlock, caretEnd, nearestEditable } from './caret.js?v=20261024021602';
import { refresh } from './cleanup.js?v=20261024021602';
import { snap } from './history.js?v=20261024021602';
import { modeBacaBerlaku } from '../mode-baca.js?v=20261024021602';
import { cariJudul, judulSpan } from '../wikilink.js?v=20261024021602';
import { openNote } from '../model.js?v=20261024021602';
import { simpanBlob, urlUntuk, hapusBlob } from '../../core/blobs.js?v=20261024021602';
import { newBlockId, blockToHtml } from '../note-model.js?v=20261024021602';
import { cur, onAfterRender, onBeforeLeave } from '../../core/router.js?v=20261024021602';
import { esc } from '../../core/dom.js?v=20261024021602';
import { toast } from '../../core/toast.js?v=20261024021602';
import { t as tr } from '../../core/i18n.js?v=20261024021602';

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
export function insertAudioBlock(blobId, durasiDetik = 0, judul = '') {
  const el = sisipkanBlokKhusus({
    id: newBlockId(),
    type: 'audio',
    content: '',
    meta: {
      blobId,
      duration: Math.max(0, Math.round(durasiDetik)),
      title: judul || tr('Memo suara'),
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

let _perekam = null;
let _timerRekam = null;

export async function bukaPerekamMemoSuara(anchor) {
  const { openPop: bukaPop, closeAll: tutupPop } = await import('../menus/pop.js?v=20261024021602');
  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
    toast(tr('Perekam suara tidak tersedia di peramban ini'));
    return;
  }
  bukaPop(`
    <div class="rn-modal-box" style="max-width:340px">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <h3 class="rn-modal-title">${tr('Memo Suara Offline')}</h3>
        <button type="button" class="iconbtn" data-pop-close style="width:28px;height:28px"><svg class="ico"><use href="#i-x"/></svg></button>
      </div>
      <input type="text" class="rn-input-text" id="aud-judul" placeholder="${tr('Judul memo (opsional)')}" maxlength="60">
      <div class="aud-rec-status">
        <span class="aud-rec-dot" id="aud-dot"></span>
        <span id="aud-waktu">00:00</span>
      </div>
      <div class="rn-actions-top" style="justify-content:flex-end;gap:8px">
        <button type="button" class="btn btn-sec" id="aud-batal">${tr('Batal')}</button>
        <button type="button" class="btn btn-pri" id="aud-mulai">${tr('Mulai rekam')}</button>
      </div>
    </div>
  `, anchor);

  let mulaiMs = 0;
  let potongan = [];
  let stream = null;

  const bersihkanStream = () => {
    clearInterval(_timerRekam);
    _timerRekam = null;
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    _perekam = null;
  };

  const btnMulai = document.getElementById('aud-mulai');
  const btnBatal = document.getElementById('aud-batal');
  const elWaktu = document.getElementById('aud-waktu');
  const elDot = document.getElementById('aud-dot');

  if (btnBatal) {
    btnBatal.onclick = () => {
      if (_perekam && _perekam.state !== 'inactive') {
        _perekam.onstop = null;
        try { _perekam.stop(); } catch (e) {}
      }
      bersihkanStream();
      tutupPop();
    };
  }

  if (btnMulai) {
    btnMulai.onclick = async () => {
      if (_perekam && _perekam.state === 'recording') {
        _perekam.stop();
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        potongan = [];
        const rec = new MediaRecorder(stream);
        _perekam = rec;
        mulaiMs = Date.now();
        btnMulai.textContent = tr('Selesai & Simpan');
        if (elDot) elDot.classList.add('on');
        _timerRekam = setInterval(() => {
          const dtk = Math.floor((Date.now() - mulaiMs) / 1000);
          if (elWaktu) elWaktu.textContent = `${String(Math.floor(dtk / 60)).padStart(2, '0')}:${String(dtk % 60).padStart(2, '0')}`;
        }, 500);
        rec.ondataavailable = ev => { if (ev.data && ev.data.size > 0) potongan.push(ev.data); };
        rec.onstop = async () => {
          const dur = Math.max(1, Math.round((Date.now() - mulaiMs) / 1000));
          const judulInp = document.getElementById('aud-judul');
          const judul = (judulInp ? judulInp.value : '').trim() || tr('Memo suara');
          bersihkanStream();
          const blob = new Blob(potongan, { type: rec.mimeType || 'audio/webm' });
          const blobId = 'aud_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
          await simpanBlob(blobId, blob);
          tutupPop();
          insertAudioBlock(blobId, dur, judul);
          toast(tr('Memo suara disimpan ke catatan'));
        };
        rec.start();
      } catch (err) {
        bersihkanStream();
        toast(tr('Izin mikrofon ditolak atau tidak tersedia'));
      }
    };
  }
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
}

/* ════════ 4. BILAH KODE MENGAMBANG (#code-bar) & 5. PILL SENTUH WIKILINK (#wl-pill) ════════ */
let _codeBar = null;
let _aktifCodeEl = null;
let _wlPill = null;
let _aktifWlJudul = '';

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

export function tampilkanPillWikilink(wlEl) {
  const judul = judulSpan(wlEl);
  if (!judul) return;
  const ada = cariJudul(judul);
  if (!ada) return;
  _aktifWlJudul = judul;
  if (!_wlPill || !_wlPill.isConnected) {
    const p = document.createElement('div');
    p.id = 'wl-pill';
    p.className = 'wl-float-pill';
    p.hidden = true;
    p.addEventListener('mousedown', e => e.preventDefault());
    p.addEventListener('click', () => {
      const target = cariJudul(_aktifWlJudul);
      sembunyikanOverlayModern();
      if (target) openNote(target.id);
    });
    document.body.appendChild(p);
    _wlPill = p;
  }
  _wlPill.innerHTML = `<svg class="ico" style="width:13px;height:13px"><use href="#i-link2"/></svg>` +
    `<span>${esc(tr('Buka'))} «${esc(ada.title)}»</span>` +
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
    if (e.target.closest('.b-toggle') || e.target.closest('.b-table') || e.target.closest('.b-audio')) {
      refresh();
    }
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
