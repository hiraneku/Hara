/**
 * Blok & Interaksi Editor Generasi Baru (Mobile-First Android):
 * #1 Menu Aksi Blok Ramah Sentuh (ketuk gagang blok / tombol bar -> Bottom Sheet 44px)
 * #2 Bar Pintas Keyboard Mobile (#qk-strip: hanya aksi yang TIDAK ada di bar bawah — Jam, =, Alat Teks, Aksi Blok)
 * #4 Blok Rumus Matematika Offline (/math — pecahan, akar, pangkat, indeks, simbol Yunani & kalkulus)
 * #5 Blok Kartu Tautan / Bookmark Visual (/bookmark — domain rapi, judul, catatan, buka 1 ketuk)
 * #6 Blok Lampiran Berkas Offline (/file — simpan PDF/dokumen ke IndexedDB blobs + unduh/buka)
 */

import { docEl, ensureCaret, caretEnd, curBlock } from './caret.js?v=20261024032151';
import { makeBlock, blockToHtml, elToBlock, duplicateBlock, newBlockId } from '../note-model.js?v=20261024032151';
import { setBlock, setCallout, moveBlock, pastikanKolomAkhir, renumber } from './blocks.js?v=20261024032151';
import { openPop, closeAll } from '../menus/pop.js?v=20261024032151';
import { refresh, saveNow } from './cleanup.js?v=20261024032151';
import { snap } from './history.js?v=20261024032151';
import { simpanBlob, ambilBlob, ukuranTerbaca } from '../../core/blobs.js?v=20261024032151';
import { state } from '../../core/store.js?v=20261024032151';
import { modeBacaBerlaku } from '../mode-baca.js?v=20261024032151';
import { toast } from '../../core/toast.js?v=20261024032151';
import { esc } from '../../core/dom.js?v=20261024032151';
import { t as tr } from '../../core/i18n.js?v=20261024032151';

const SIMBOL_MATH = {
  '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ', '\\epsilon': 'ε',
  '\\theta': 'θ', '\\lambda': 'λ', '\\mu': 'μ', '\\pi': 'π', '\\sigma': 'σ',
  '\\tau': 'τ', '\\phi': 'φ', '\\omega': 'ω', '\\Delta': 'Δ', '\\Sigma': '∑',
  '\\Omega': 'Ω', '\\infty': '∞', '\\pm': '±', '\\mp': '∓', '\\times': '×',
  '\\cdot': '·', '\\div': '÷', '\\neq': '≠', '\\leq': '≤', '\\geq': '≥',
  '\\approx': '≈', '\\equiv': '≡', '\\rightarrow': '→', '\\leftarrow': '←',
  '\\Rightarrow': '⇒', '\\Leftrightarrow': '⇔', '\\sum': '∑', '\\prod': '∏',
  '\\int': '∫', '\\partial': '∂', '\\nabla': '∇', '\\in': '∈', '\\notin': '∉',
  '\\subset': '⊂', '\\cup': '∪', '\\cap': '∩', '\\forall': '∀', '\\exists': '∃',
  '\\therefore': '∴', '\\deg': '°',
};

/** Render ekspresi TeX ringan menjadi HTML tipografi matematika 100% offline & aman XSS. */
export function renderRumusMatematika(mentah) {
  let s = esc(String(mentah || '').trim());
  if (!s) return `<span class="math-empty">${esc(tr('Ketuk untuk mengisi rumus…'))}</span>`;

  /* Matriks sederhana: \begin{matrix} a & b \\ c & d \end{matrix} */
  s = s.replace(/\\begin\{(?:p?b?matrix)\}([\s\S]*?)\\end\{(?:p?b?matrix)\}/g, (_, isi) => {
    const baris = isi.trim().split(/\\\\/).map(r =>
      `<tr>${r.split('&').map(c => `<td>${c.trim()}</td>`).join('')}</tr>`
    ).join('');
    return `<table class="math-mat">${baris}</table>`;
  });

  /* Pangkat & Subskrip lebih dulu agar tidak menyisakan kurung kurawal di dalam akar/pecahan */
  s = s.replace(/\^\{([^{}]+)\}/g, '<sup>$1</sup>');
  s = s.replace(/_\{([^{}]+)\}/g, '<sub>$1</sub>');
  s = s.replace(/\^([a-zA-Z0-9+\-]+)/g, '<sup>$1</sup>');
  s = s.replace(/_([a-zA-Z0-9+\-]+)/g, '<sub>$1</sub>');

  /* Akar kuadrat: \sqrt{isi} */
  for (let i = 0; i < 2; i++) {
    s = s.replace(/\\sqrt\{([^{}]+)\}/g,
      '<span class="math-sqrt"><span class="ms-v">√</span><span class="ms-b">$1</span></span>');
  }

  /* Pecahan bersarang hingga 3 lapis: \frac{pembilang}{penyebut} */
  for (let i = 0; i < 3; i++) {
    s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g,
      '<span class="math-frac"><span class="mf-num">$1</span><span class="mf-den">$2</span></span>');
  }

  /* Simbol Yunani & operator */
  const urutKunci = Object.keys(SIMBOL_MATH).sort((a, b) => b.length - a.length);
  for (const k of urutKunci) {
    s = s.split(k).join(SIMBOL_MATH[k]);
  }
  return s;
}

function sisipElemenBlok(blk) {
  const d = docEl();
  if (!d) return null;
  const r = ensureCaret();
  let target = null;
  if (r) {
    let n = r.startContainer;
    while (n && n !== d && n.parentNode !== d) n = n.parentNode;
    if (n && n.parentNode === d) target = n;
  }
  snap();
  const w = document.createElement('div');
  w.innerHTML = blockToHtml(blk);
  const el = w.firstElementChild;
  if (target && (target.textContent || '').trim() === '' && !target.querySelector('img')) {
    target.replaceWith(el);
  } else if (target && target.nextSibling) {
    d.insertBefore(el, target.nextSibling);
  } else {
    d.appendChild(el);
  }
  pastikanKolomAkhir(d);
  refresh();
  const sesudah = el.nextElementSibling;
  if (sesudah) caretEnd(sesudah);
  return el;
}

/* ════════ #4 BLOK RUMUS MATEMATIKA (/math) ════════ */
export function insertMathBlock(expr = 'E = mc^{2}') {
  return sisipElemenBlok(makeBlock({ type: 'math', content: '', meta: { expr } }));
}

export function bukaDialogRumus(elExisting = null) {
  const nilaiAwal = elExisting ? (elExisting.getAttribute('data-expr') || '') : '';
  const pintas = [
    ['\\frac{a}{b}', 'a/b'],
    ['\\sqrt{x}', '√x'],
    ['^{2}', 'x²'],
    ['_{i}', 'xᵢ'],
    ['\\sum_{i=1}^{n}', '∑'],
    ['\\int_{a}^{b}', '∫'],
    ['\\pi', 'π'],
    ['\\Delta', 'Δ'],
    ['\\leq', '≤'],
    ['\\geq', '≥'],
    ['\\neq', '≠'],
    ['\\Rightarrow', '⇒'],
  ];
  const html = `<div class="pop-h">${tr('Rumus Matematika')}</div>
    <div style="padding:8px 12px;display:flex;flex-direction:column;gap:8px">
      <div class="math-kbar">${pintas.map(([ins, lbl]) =>
        `<button type="button" class="math-kbtn" data-math-ins="${esc(ins)}">${esc(lbl)}</button>`
      ).join('')}</div>
      <textarea class="in" id="math-inp" rows="2" placeholder="\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}">${esc(nilaiAwal)}</textarea>
      <div class="b-math math-prev" id="math-prev">${renderRumusMatematika(nilaiAwal || 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}')}</div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        ${elExisting ? `<button type="button" class="btn btn-sec" id="math-hapus">${tr('Hapus')}</button>` : ''}
        <button type="button" class="btn btn-sec" id="math-batal">${tr('Batal')}</button>
        <button type="button" class="btn btn-pri" id="math-simpan">${tr('Simpan')}</button>
      </div>
    </div>`;
  openPop(html, elExisting || docEl());
  const p = document.getElementById('pop');
  const inp = p?.querySelector('#math-inp');
  const prev = p?.querySelector('#math-prev');
  inp?.focus();
  inp?.addEventListener('input', () => {
    if (prev) prev.innerHTML = renderRumusMatematika(inp.value);
  });
  p?.addEventListener('click', e => {
    const ins = e.target.closest('[data-math-ins]');
    if (ins && inp) {
      const s = inp.selectionStart ?? inp.value.length;
      const en = inp.selectionEnd ?? inp.value.length;
      const t = ins.dataset.mathIns;
      inp.value = inp.value.slice(0, s) + t + inp.value.slice(en);
      inp.focus();
      inp.selectionStart = inp.selectionEnd = s + t.length;
      if (prev) prev.innerHTML = renderRumusMatematika(inp.value);
      return;
    }
    if (e.target.closest('#math-batal')) { closeAll(); return; }
    if (e.target.closest('#math-hapus') && elExisting) {
      snap();
      elExisting.remove();
      pastikanKolomAkhir(docEl());
      refresh();
      closeAll();
      return;
    }
    if (e.target.closest('#math-simpan')) {
      const val = (inp?.value || '').trim();
      if (!val) { toast(tr('Isi rumus terlebih dahulu')); return; }
      closeAll();
      if (elExisting && elExisting.isConnected) {
        snap();
        elExisting.setAttribute('data-expr', val);
        const body = elExisting.querySelector('.math-body');
        if (body) body.innerHTML = renderRumusMatematika(val);
        refresh();
      } else {
        insertMathBlock(val);
      }
    }
  });
}

/* ════════ #5 BLOK KARTU TAUTAN / BOOKMARK (/bookmark) ════════ */
export function domainDariUrl(url) {
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : 'https://' + url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return 'tautan';
  }
}

export function insertBookmarkBlock(url, title = '', desc = '') {
  const bersihUrl = /^https?:\/\//i.test(String(url || '').trim())
    ? String(url).trim()
    : 'https://' + String(url || '').trim();
  const judul = String(title || '').trim() || domainDariUrl(bersihUrl);
  return sisipElemenBlok(makeBlock({
    type: 'bookmark',
    content: '',
    meta: { url: bersihUrl, title: judul, desc: String(desc || '').trim() },
  }));
}

export function bukaDialogBookmark(elExisting = null) {
  const u0 = elExisting ? (elExisting.getAttribute('data-url') || '') : '';
  const t0 = elExisting ? (elExisting.getAttribute('data-title') || '') : '';
  const d0 = elExisting ? (elExisting.getAttribute('data-desc') || '') : '';
  const html = `<div class="pop-h">${tr('Kartu Tautan Web')}</div>
    <div style="padding:8px 12px;display:flex;flex-direction:column;gap:8px">
      <input class="in" id="bmk-url" type="url" placeholder="https://contoh.id/artikel" value="${esc(u0)}">
      <input class="in" id="bmk-judul" type="text" placeholder="${tr('Judul kartu (opsional)')}" value="${esc(t0)}">
      <input class="in" id="bmk-ket" type="text" placeholder="${tr('Catatan singkat (opsional)')}" value="${esc(d0)}">
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button type="button" class="btn btn-sec" id="bmk-batal">${tr('Batal')}</button>
        <button type="button" class="btn btn-pri" id="bmk-simpan">${tr('Simpan')}</button>
      </div>
    </div>`;
  openPop(html, elExisting || docEl());
  const p = document.getElementById('pop');
  p?.querySelector('#bmk-url')?.focus();
  p?.querySelector('#bmk-batal')?.addEventListener('click', closeAll);
  p?.querySelector('#bmk-simpan')?.addEventListener('click', () => {
    const rawUrl = (p.querySelector('#bmk-url')?.value || '').trim();
    if (!rawUrl) { toast(tr('Masukkan alamat tautan terlebih dahulu')); return; }
    const j = (p.querySelector('#bmk-judul')?.value || '').trim();
    const ket = (p.querySelector('#bmk-ket')?.value || '').trim();
    closeAll();
    if (elExisting && elExisting.isConnected) {
      snap();
      const full = /^https?:\/\//i.test(rawUrl) ? rawUrl : 'https://' + rawUrl;
      elExisting.setAttribute('data-url', full);
      elExisting.setAttribute('data-title', j || domainDariUrl(full));
      elExisting.setAttribute('data-desc', ket);
      const baru = blockToHtml(makeBlock({
        id: elExisting.getAttribute('data-bid') || newBlockId(),
        type: 'bookmark',
        meta: { url: full, title: j || domainDariUrl(full), desc: ket },
      }));
      const w = document.createElement('div');
      w.innerHTML = baru;
      elExisting.replaceWith(w.firstElementChild);
      refresh();
    } else {
      insertBookmarkBlock(rawUrl, j, ket);
    }
  });
}

/* ════════ #6 BLOK LAMPIRAN BERKAS (/file) ════════ */
export function insertFileBlock(blobId, name, size = 0, mime = 'application/octet-stream') {
  return sisipElemenBlok(makeBlock({
    type: 'file',
    content: '',
    meta: { blobId, name: String(name || 'berkas'), size: Number(size) || 0, mime },
  }));
}

export async function lampirkanBerkasKeCatatan(file) {
  if (!file) return null;
  if (file.size > 25 * 1024 * 1024) {
    toast(tr('Ukuran berkas maksimal 25 MB'));
    return null;
  }
  const blobId = 'fl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  try {
    await simpanBlob(blobId, file);
  } catch {
    toast(tr('Ruang penyimpanan penuh'));
    return null;
  }
  insertFileBlock(blobId, file.name || 'lampiran', file.size || 0, file.type || 'application/octet-stream');
  toast(`${tr('Lampiran disimpan')}: ${file.name || 'berkas'} (${ukuranTerbaca(file.size || 0)})`);
  return blobId;
}

export function pilihLampiranBerkas() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.style.display = 'none';
  document.body.appendChild(inp);
  inp.onchange = async () => {
    const f = inp.files && inp.files[0];
    inp.remove();
    if (f) await lampirkanBerkasKeCatatan(f);
  };
  inp.click();
}

export async function unduhLampiranBerkas(blobId, nama = 'lampiran') {
  const blob = await ambilBlob(blobId);
  if (!blob) {
    toast(tr('Berkas lampiran tidak ditemukan'));
    return false;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nama;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return true;
}

/* ════════ #1 MENU AKSI BLOK RAMAH SENTUH (BOTTOM SHEET 44PX) ════════ */
const LATAR_BLOK = [
  ['',        'Polos',   'transparent'],
  ['amber',   'Kuning',  'rgba(245, 158, 11, 0.16)'],
  ['emerald', 'Hijau',   'rgba(16, 185, 129, 0.16)'],
  ['sky',     'Biru',    'rgba(14, 165, 233, 0.16)'],
  ['violet',  'Ungu',    'rgba(139, 92, 246, 0.16)'],
  ['rose',    'Merah',   'rgba(244, 63, 94, 0.16)'],
];

export function setWarnaLatarBlok(blokEl, kode) {
  if (!blokEl) return;
  snap();
  if (!kode) blokEl.removeAttribute('data-bg');
  else blokEl.setAttribute('data-bg', kode);
  refresh();
}

export function duplikatBlok(blokEl) {
  const d = docEl();
  if (!d || !blokEl || blokEl.parentNode !== d) return null;
  snap();
  const model = elToBlock(blokEl);
  if (!model) return null;
  const salinan = duplicateBlock(model);
  const w = document.createElement('div');
  w.innerHTML = blockToHtml(salinan);
  const elBaru = w.firstElementChild;
  if (blokEl.nextSibling) d.insertBefore(elBaru, blokEl.nextSibling);
  else d.appendChild(elBaru);
  renumber();
  refresh();
  return elBaru;
}

export function hapusBlokTertentu(blokEl) {
  const d = docEl();
  if (!d || !blokEl || blokEl.parentNode !== d) return false;
  snap();
  const tetangga = blokEl.nextElementSibling || blokEl.previousElementSibling;
  blokEl.remove();
  if (!d.children.length) {
    const w = document.createElement('div');
    w.innerHTML = blockToHtml(makeBlock({ type: 'paragraph' }));
    d.appendChild(w.firstElementChild);
  }
  pastikanKolomAkhir(d);
  refresh();
  if (tetangga && tetangga.isConnected) caretEnd(tetangga);
  return true;
}

export function salinTautanKeBlok(blokEl) {
  const n = state.notes.find(x => x.id === state.openId);
  if (!n || !blokEl) return '';
  let ref = blokEl.getAttribute('data-ref');
  if (!ref) {
    ref = 'b' + Math.random().toString(36).slice(2, 7);
    snap();
    blokEl.setAttribute('data-ref', ref);
    refresh();
  }
  const taut = `![[${n.title || tr('Tanpa judul')}#^${ref}]]`;
  try { navigator.clipboard?.writeText?.(taut); } catch {}
  toast(`${tr('Rujukan blok disalin')}: ${taut}`);
  return taut;
}

export function bukaMenuAksiBlok(blokTarget = null) {
  if (modeBacaBerlaku()) return;
  const d = docEl();
  const blok = (blokTarget && d && blokTarget.parentNode === d) ? blokTarget : curBlock();
  if (!blok) return;
  const bgAktif = blok.getAttribute('data-bg') || '';

  const tipeBtn = [
    ['b-p', 'Teks'], ['b-h1', 'H1'], ['b-h2', 'H2'], ['b-h3', 'H3'],
    ['b-todo', 'To-do'], ['b-li', 'Poin'], ['b-ol', 'Nomor'],
    ['b-quote', 'Kutipan'], ['b-code', 'Kode'], ['cal', 'Info'],
  ];

  const html = `<div class="pop-h">${tr('Aksi Blok')}</div>
    <div class="ba-sheet">
      <div class="ba-label">${tr('Ubah tipe blok')}</div>
      <div class="ba-grid">
        ${tipeBtn.map(([kode, lbl]) =>
          `<button type="button" class="ba-pill" data-ba-turn="${kode}">${esc(tr(lbl))}</button>`
        ).join('')}
      </div>
      <div class="ba-label">${tr('Warna latar blok')}</div>
      <div class="ba-swatches">
        ${LATAR_BLOK.map(([kode, lbl, css]) =>
          `<button type="button" class="ba-bg${bgAktif === kode ? ' on' : ''}" data-ba-bg="${kode}" title="${esc(tr(lbl))}" style="background:${css}">${kode ? '' : '<svg class="ico" aria-hidden="true"><use href="#i-minus"/></svg>'}</button>`
        ).join('')}
      </div>
      <div class="ba-actions">
        <button type="button" class="pop-i" data-ba-act="up"><svg class="ico"><use href="#i-up"/></svg>${tr('Pindah ke atas')}</button>
        <button type="button" class="pop-i" data-ba-act="down"><svg class="ico"><use href="#i-down"/></svg>${tr('Pindah ke bawah')}</button>
        <button type="button" class="pop-i" data-ba-act="dup"><svg class="ico"><use href="#i-copy"/></svg>${tr('Duplikat blok')}</button>
        <button type="button" class="pop-i" data-ba-act="ref"><svg class="ico"><use href="#i-link2"/></svg>${tr('Salin tautan blok')}</button>
        <button type="button" class="pop-i pop-danger" data-ba-act="del"><svg class="ico"><use href="#i-trash"/></svg>${tr('Hapus blok')}</button>
      </div>
    </div>`;

  openPop(html, blok);
  const p = document.getElementById('pop');
  p?.addEventListener('click', e => {
    const turn = e.target.closest('[data-ba-turn]');
    if (turn) {
      caretEnd(blok);
      const t = turn.dataset.baTurn;
      closeAll();
      if (t === 'cal') setCallout('info');
      else setBlock(t);
      return;
    }
    const bg = e.target.closest('[data-ba-bg]');
    if (bg) {
      setWarnaLatarBlok(blok, bg.dataset.baBg);
      closeAll();
      return;
    }
    const act = e.target.closest('[data-ba-act]');
    if (!act) return;
    const k = act.dataset.baAct;
    closeAll();
    if (k === 'up') { caretEnd(blok); moveBlock(-1); }
    else if (k === 'down') { caretEnd(blok); moveBlock(1); }
    else if (k === 'dup') duplikatBlok(blok);
    else if (k === 'ref') salinTautanKeBlok(blok);
    else if (k === 'del') hapusBlokTertentu(blok);
  });
}

/* ════════ #2 BAR PINTAS KEYBOARD MOBILE ════════ */
export function sisipCapJamSekarang() {
  const b0 = curBlock();
  const s0 = window.getSelection();
  if (b0 && (!(s0 && s0.rangeCount) || s0.getRangeAt(0).startContainer === docEl())) {
    caretEnd(b0);
  }
  const r = ensureCaret();
  if (!r) return;
  const d = new Date();
  const jam = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} `;
  snap();
  const tn = document.createTextNode(jam);
  r.deleteContents();
  r.insertNode(tn);
  const nr = document.createRange();
  nr.setStart(tn, tn.data.length);
  nr.collapse(true);
  const s = window.getSelection();
  s.removeAllRanges();
  s.addRange(nr);
  refresh();
}

export function renderQuickKeysHtml() {
  const tombol = (aksi, ikon, label, isi = '') =>
    `<button type="button" class="qk-btn" data-qk="${aksi}" title="${esc(label)}" aria-label="${esc(label)}">` +
    (ikon ? `<svg class="ico" aria-hidden="true"><use href="#${ikon}"/></svg>` : '') +
    (isi ? `<span class="qk-t">${isi}</span>` : '') + '</button>';

  return `<div class="qk-strip" id="qk-strip" role="toolbar" aria-label="${esc(tr('Pintas cepat keyboard'))}">
    ${tombol('jam', 'i-clock', tr('Cap jam sekarang'))}
    ${tombol('calc', '', tr('Hitung ekspresi'), '=')}
    ${tombol('teks', 'i-sparkle', tr('Alat teks pintar'))}
    ${tombol('blok', 'i-more', tr('Aksi blok'))}
  </div>`;
}

let _terpasang = false;
export function bindBlokGenerasiBaru() {
  if (_terpasang) return;
  _terpasang = true;

  /* Ketuk (tanpa seret) pada gagang blok .blk-h membuka Menu Aksi Blok Sentuh */
  let titikTurun = null;
  document.addEventListener('pointerdown', e => {
    const h = e.target.closest && e.target.closest('.blk-h');
    if (!h) { titikTurun = null; return; }
    titikTurun = { x: e.clientX, y: e.clientY, h };
  }, true);

  document.addEventListener('click', e => {
    /* Gagang blok diketuk tanpa geser -> Menu Aksi Blok */
    const h = e.target.closest && e.target.closest('.blk-h');
    if (h && !modeBacaBerlaku()) {
      const jauh = titikTurun
        ? Math.hypot((e.clientX || 0) - titikTurun.x, (e.clientY || 0) - titikTurun.y)
        : 0;
      if (jauh < 6) {
        e.preventDefault();
        e.stopPropagation();
        bukaMenuAksiBlok(h.parentElement);
        return;
      }
    }

    /* Klik blok rumus matematika -> sunting rumus */
    const mathEl = e.target.closest && e.target.closest('.ed-doc .b-math');
    if (mathEl && !modeBacaBerlaku()) {
      e.preventDefault();
      bukaDialogRumus(mathEl);
      return;
    }

    /* Aksi kartu bookmark */
    const bmkEdit = e.target.closest && e.target.closest('[data-bmk-edit]');
    if (bmkEdit && !modeBacaBerlaku()) {
      e.preventDefault();
      e.stopPropagation();
      bukaDialogBookmark(bmkEdit.closest('.b-bmk'));
      return;
    }
    const bmkDel = e.target.closest && e.target.closest('[data-bmk-del]');
    if (bmkDel && !modeBacaBerlaku()) {
      e.preventDefault();
      e.stopPropagation();
      hapusBlokTertentu(bmkDel.closest('.b-bmk'));
      return;
    }

    /* Aksi blok lampiran berkas */
    const flDl = e.target.closest && e.target.closest('[data-file-dl]');
    if (flDl) {
      e.preventDefault();
      const box = flDl.closest('.b-file');
      if (box) unduhLampiranBerkas(box.getAttribute('data-blob'), box.getAttribute('data-name') || 'lampiran');
      return;
    }
    const flDel = e.target.closest && e.target.closest('[data-file-del]');
    if (flDel && !modeBacaBerlaku()) {
      e.preventDefault();
      hapusBlokTertentu(flDel.closest('.b-file'));
      return;
    }

    /* Bar Pintas Keyboard Mobile */
    const qk = e.target.closest && e.target.closest('[data-qk]');
    if (qk && !modeBacaBerlaku()) {
      e.preventDefault();
      docEl()?.focus();
      const k = qk.dataset.qk;
      if (k === 'jam') sisipCapJamSekarang();
      else if (k === 'calc') {
        import('../alat-cerdas.js?v=20261024032151').then(m => m.cobaHitungInlineSekarang(true));
      }
      else if (k === 'teks') {
        import('../alat-cerdas.js?v=20261024032151').then(m => m.bukaAlatTeksPintar());
      }
      else if (k === 'blok') bukaMenuAksiBlok();
    }
  });

  /* Jangan biarkan ketukan bar cepat menghilangkan seleksi editor */
  document.addEventListener('pointerdown', e => {
    if (e.target.closest && e.target.closest('#qk-strip')) e.preventDefault();
  });
}
