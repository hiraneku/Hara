/**
 * Navigasi Cepat, Mode Fokus Menulis, Sampul Catatan, Progres Baca & Peta Jaringan Sentuh:
 * #12 Mode Fokus Menulis (Redupkan Paragraf Lain / Focus Dim, Typewriter Scroll, Target Kata)
 * #13 Garis Progres Baca 2.5px + Ingat Posisi Gulir Terakhir Otomatis + Sampul/Banner Catatan
 * #14 Bar Pindah Cepat Catatan Terakhir (Recent Notes 1-Jempol) + Peta Jaringan Sentuh Layar Penuh
 */

import { state, save } from '../core/store.js?v=20261025024750';
import { cur, go } from '../core/router.js?v=20261025024750';
import { docEl, curBlock } from './editor/caret.js?v=20261025024750';
import { updateCount } from './editor/cleanup.js?v=20261025024750';
import { touch } from './note-model.js?v=20261025024750';
import { openNote } from './model.js?v=20261025024750';
import { terlihat } from './kunci.js?v=20261025024750';
import { modeBacaBerlaku } from './mode-baca.js?v=20261025024750';
import { daftarRuang } from './ruang.js?v=20261025024750';
import { openPop, closeAll } from './menus/pop.js?v=20261025024750';
import { flush } from '../core/autosave.js?v=20261025024750';
import { toast } from '../core/toast.js?v=20261025024750';
import { esc } from '../core/dom.js?v=20261025024750';
import { t as tr } from '../core/i18n.js?v=20261025024750';

const KUNCI_RECENT = 'hara.v1.recentNotes';
const KUNCI_SCROLL = 'hara.v1.scrollPos';
const KUNCI_FOKUS = 'hara.v1.fokusTulis';

export const SAMPUL_PRESET = [
  ['',         'Tanpa sampul',     ''],
  ['kabut',    'Kabut Pagi',       'linear-gradient(135deg,#dbeafe 0%,#ede9fe 100%)'],
  ['hutan',    'Hutan Kalimantan', 'linear-gradient(135deg,#065f46 0%,#10b981 100%)'],
  ['senja',    'Senja Amber',      'linear-gradient(135deg,#b45309 0%,#f59e0b 100%)'],
  ['samudra',  'Samudra Malam',    'linear-gradient(135deg,#0f172a 0%,#0284c7 100%)'],
  ['sakura',   'Kelopak Senja',    'linear-gradient(135deg,#be185d 0%,#fb7185 100%)'],
  ['terakota', 'Terakota Hangat',  'linear-gradient(135deg,#7c2d12 0%,#ea580c 100%)'],
];

/* ════════ #12 PENGATURAN FOKUS MENULIS & TARGET KATA ════════ */
let _fokus = (function () {
  try {
    const raw = JSON.parse(localStorage.getItem(KUNCI_FOKUS) || '{}');
    return {
      dim: !!raw.dim,
      typewriter: !!raw.typewriter,
      targetKata: Number(raw.targetKata) || 0,
    };
  } catch {
    return { dim: false, typewriter: false, targetKata: 0 };
  }
})();

export function statusFokusMenulis() {
  return { ..._fokus };
}

export function aturFokusMenulis(patch = {}) {
  _fokus = { ..._fokus, ...patch };
  try { localStorage.setItem(KUNCI_FOKUS, JSON.stringify(_fokus)); } catch {}
  terapkanFokusDOM();
  updateCount();
  return statusFokusMenulis();
}

export function terapkanFokusDOM() {
  document.body.classList.toggle('fokus-dim', !!_fokus.dim && cur === 'editor' && !modeBacaBerlaku());
  const d = docEl();
  if (!d) return;
  Array.from(d.children).forEach(el => el.classList.remove('fokus-aktif'));
  if (_fokus.dim && cur === 'editor' && !modeBacaBerlaku()) {
    const b = curBlock();
    if (b) {
      b.classList.add('fokus-aktif');
      if (_fokus.typewriter && typeof b.scrollIntoView === 'function') {
        try { b.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch {}
      }
    }
  }
}

export function teksProgresTargetKata(jumlahKata) {
  const target = Number(_fokus.targetKata) || 0;
  if (target <= 0) return '';
  const persen = Math.min(100, Math.round((jumlahKata / target) * 100));
  return `<span class="dot">·</span><span class="target-pill${persen >= 100 ? ' done' : ''}">` +
    `<svg class="ico" aria-hidden="true"><use href="#i-target"/></svg>` +
    `${jumlahKata}/${target} (${persen}%)</span>`;
}

export function bukaDialogFokusMenulis(jangkar) {
  const st = statusFokusMenulis();
  const html = `<div class="pop-h">${tr('Mode Fokus Menulis & Target Kata')}</div>
    <div style="padding:8px 12px;display:flex;flex-direction:column;gap:10px">
      <label class="fok-row">
        <span>${tr('Redupkan paragraf lain (Focus Dim)')}</span>
        <input type="checkbox" id="fok-dim" ${st.dim ? 'checked' : ''}>
      </label>
      <label class="fok-row">
        <span>${tr('Jaga baris aktif di tengah (Typewriter)')}</span>
        <input type="checkbox" id="fok-tw" ${st.typewriter ? 'checked' : ''}>
      </label>
      <div>
        <div class="ba-label">${tr('Target jumlah kata catatan')}</div>
        <div class="ba-grid" style="margin-bottom:6px">
          ${[0, 250, 500, 1000].map(v =>
            `<button type="button" class="ba-pill${st.targetKata === v ? ' active' : ''}" data-fok-tgt="${v}">${v === 0 ? tr('Nonaktif') : v}</button>`
          ).join('')}
        </div>
        <input type="number" class="in" id="fok-angka" min="0" step="50" value="${st.targetKata || ''}" placeholder="${tr('Atau ketik angka target…')}">
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button type="button" class="btn btn-pri" id="fok-simpan">${tr('Terapkan')}</button>
      </div>
    </div>`;
  openPop(html, jangkar || docEl());
  const p = document.getElementById('pop');
  p?.addEventListener('click', e => {
    const preset = e.target.closest('[data-fok-tgt]');
    if (preset) {
      const inp = p.querySelector('#fok-angka');
      if (inp) inp.value = preset.dataset.fokTgt === '0' ? '' : preset.dataset.fokTgt;
      return;
    }
    if (e.target.closest('#fok-simpan')) {
      const dim = !!p.querySelector('#fok-dim')?.checked;
      const typewriter = !!p.querySelector('#fok-tw')?.checked;
      const targetKata = Math.max(0, parseInt(p.querySelector('#fok-angka')?.value || '0', 10) || 0);
      aturFokusMenulis({ dim, typewriter, targetKata });
      closeAll();
      toast(tr('Pengaturan fokus menulis diterapkan'));
    }
  });
}

/* ════════ #13 GARIS PROGRES BACA + SCROLL MEMORY + SAMPUL CATATAN ════════ */
function bacaPetaScroll() {
  try { return JSON.parse(localStorage.getItem(KUNCI_SCROLL) || '{}') || {}; }
  catch { return {}; }
}

export function simpanPosisiGulir(noteId, posisiY) {
  if (!noteId) return;
  const peta = bacaPetaScroll();
  peta[noteId] = Math.max(0, Math.round(Number(posisiY) || 0));
  /* Batasi 40 catatan terakhir agar localStorage tetap super ramping */
  const kunci = Object.keys(peta);
  if (kunci.length > 40) delete peta[kunci[0]];
  try { localStorage.setItem(KUNCI_SCROLL, JSON.stringify(peta)); } catch {}
}

export function ambilPosisiGulir(noteId) {
  if (!noteId) return 0;
  const peta = bacaPetaScroll();
  return Number(peta[noteId]) || 0;
}

export function pulihkanPosisiGulir(noteId = state.openId) {
  const y = ambilPosisiGulir(noteId);
  if (y > 0) window.scrollTo(0, y);
  perbaruiGarisProgresBaca();
  return y;
}

function pastikanBarProgres() {
  let bar = document.getElementById('baca-progres');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'baca-progres';
    bar.className = 'baca-progres';
    bar.hidden = true;
    bar.innerHTML = '<div class="baca-progres-isi" id="baca-progres-isi"></div>';
    document.body.appendChild(bar);
  }
  return bar;
}

export function perbaruiGarisProgresBaca() {
  const bar = pastikanBarProgres();
  const aktif = cur === 'editor' && modeBacaBerlaku();
  bar.hidden = !aktif;
  if (!aktif) return 0;
  const tinggiDok = Math.max(1, (document.documentElement.scrollHeight || 0) - (window.innerHeight || 0));
  const y = Math.max(0, window.scrollY || document.documentElement.scrollTop || 0);
  const persen = Math.max(0, Math.min(100, Math.round((y / tinggiDok) * 100)));
  const isi = document.getElementById('baca-progres-isi');
  if (isi) isi.style.width = `${persen}%`;
  return persen;
}

export function setSampulCatatan(noteId, kodeSampul) {
  const n = state.notes.find(x => x.id === noteId);
  if (!n) return false;
  if (!kodeSampul) delete n.cover;
  else n.cover = String(kodeSampul);
  touch(n);
  save();
  sinkronSampulDOM();
  return true;
}

export function cssSampul(kode) {
  const f = SAMPUL_PRESET.find(([k]) => k === kode);
  return f ? f[2] : '';
}

export function sinkronSampulDOM() {
  const n = state.notes.find(x => x.id === state.openId);
  const el = document.getElementById('ed-cover');
  if (!el) return;
  const bg = n && n.cover ? cssSampul(n.cover) : '';
  if (!bg) {
    el.hidden = true;
    el.style.background = '';
  } else {
    el.hidden = false;
    el.style.background = bg;
  }
}

export function bukaDialogSampulCatatan() {
  const n = state.notes.find(x => x.id === state.openId);
  if (!n) return;
  const kini = n.cover || '';
  const html = `<div class="pop-h">${tr('Sampul / Banner Catatan')}</div>
    <div style="padding:8px 12px;display:flex;flex-direction:column;gap:8px">
      ${SAMPUL_PRESET.map(([kode, nama, grad]) => `
        <button type="button" class="pop-i${kini === kode ? ' sel' : ''}" data-cover-pick="${kode}">
          <span class="cover-dot" style="background:${grad || 'var(--bg-soft)'}"></span>
          ${esc(tr(nama))}
        </button>`).join('')}
    </div>`;
  openPop(html, document.getElementById('morebtn') || docEl());
  document.getElementById('pop')?.addEventListener('click', e => {
    const pick = e.target.closest('[data-cover-pick]');
    if (!pick) return;
    setSampulCatatan(n.id, pick.dataset.coverPick);
    closeAll();
    toast(tr('Sampul catatan diperbarui'));
  });
}

/* ════════ #14 BAR CATATAN TERAKHIR DIBUKA (QUICK-SWITCH 1 JEMPOL) ════════ */
export function daftarCatatanTerakhir() {
  let ids = [];
  try { ids = JSON.parse(localStorage.getItem(KUNCI_RECENT) || '[]'); } catch { ids = []; }
  if (!Array.isArray(ids)) ids = [];
  return ids
    .map(id => state.notes.find(n => n.id === id && !n.deletedAt && terlihat(n)))
    .filter(Boolean)
    .slice(0, 6);
}

export function catatRiwayatBuka(noteId) {
  if (!noteId) return;
  const n = state.notes.find(x => x.id === noteId);
  if (!n || n.deletedAt || !terlihat(n)) return;
  let ids = [];
  try { ids = JSON.parse(localStorage.getItem(KUNCI_RECENT) || '[]'); } catch { ids = []; }
  if (!Array.isArray(ids)) ids = [];
  ids = [noteId, ...ids.filter(id => id !== noteId)].slice(0, 8);
  try { localStorage.setItem(KUNCI_RECENT, JSON.stringify(ids)); } catch {}
}

export function renderBarCatatanTerakhirHtml() {
  const list = daftarCatatanTerakhir();
  if (list.length < 2) return '';
  return `<div class="recent-bar" id="recent-bar" role="navigation" aria-label="${esc(tr('Catatan terakhir dibuka'))}">
    ${list.map(n => {
      const aktif = n.id === state.openId;
      const j = (n.title || tr('Tanpa judul')).slice(0, 24);
      return `<button type="button" class="recent-pill${aktif ? ' on' : ''}" data-recent-open="${esc(n.id)}">${esc(j)}</button>`;
    }).join('')}
  </div>`;
}

/* ════════ #14 PETA JARINGAN CATATAN INTERAKTIF (TOUCH PAN & ZOOM) ════════ */
function ekstrakWikilinkJudul(note) {
  const w = document.createElement('div');
  const hasil = [];
  for (const b of note.blocks || []) {
    if (!b || b.type === 'code' || b.type === 'divider') continue;
    w.innerHTML = b.content || '';
    w.querySelectorAll('span.wl').forEach(sn => {
      const m = /^\[\[(.+?)\]\]$/.exec((sn.textContent || '').trim());
      if (!m) return;
      const judul = (m[1].split('|')[0] || '').trim();
      if (judul && !hasil.includes(judul.toLowerCase())) hasil.push(judul.toLowerCase());
    });
  }
  return hasil;
}

export function bukaGrafInteraktif() {
  document.getElementById('graf-modal')?.remove();

  const ruangList = daftarRuang();
  let filterRuang = '';
  let cari = '';
  let zoom = 1;
  let panX = 0;
  let panY = 0;

  const overlay = document.createElement('div');
  overlay.id = 'graf-modal';
  overlay.className = 'sketsa-modal';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', tr('Peta Jaringan Catatan'));

  overlay.innerHTML = `
    <div class="sk-box">
      <div class="sk-top">
        <div class="sk-judul">${tr('Peta Jaringan Catatan')}</div>
        <button type="button" class="btn btn-sec" id="gf-tutup"><svg class="ico"><use href="#i-x"/></svg>${tr('Tutup')}</button>
      </div>
      <div class="gf-filter">
        <input type="search" class="in" id="gf-cari" placeholder="${esc(tr('Filter judul atau #tag…'))}">
        <select class="in" id="gf-ruang" style="max-width:150px">
          <option value="">${tr('Semua ruang')}</option>
          ${ruangList.map(r => `<option value="${esc(r.id)}">${esc(r.nama)}</option>`).join('')}
        </select>
      </div>
      <div class="gf-viewport" id="gf-viewport">
        <div class="gf-canvas" id="gf-canvas"></div>
      </div>
      <div class="sk-bar">
        <div class="sk-row">
          <button type="button" class="sk-tool" id="gf-zout">− ${tr('Perkecil')}</button>
          <button type="button" class="sk-tool" id="gf-reset">100%</button>
          <button type="button" class="sk-tool" id="gf-zin">+ ${tr('Perbesar')}</button>
          <span class="sk-spacer"></span>
          <span class="gf-info" id="gf-info"></span>
        </div>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  const kanvas = overlay.querySelector('#gf-canvas');
  const viewport = overlay.querySelector('#gf-viewport');
  const infoEl = overlay.querySelector('#gf-info');

  const terapkanTransform = () => {
    kanvas.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  };

  const renderGraf = () => {
    /* Hormati privasi penuh: hanya catatan terlihat(n) dan belum dihapus */
    const catatan = state.notes.filter(n => {
      if (n.deletedAt || !terlihat(n)) return false;
      if (filterRuang && n.folderId !== filterRuang) return false;
      if (cari) {
        const q = cari.toLowerCase();
        const cocokJudul = (n.title || '').toLowerCase().includes(q);
        const cocokTag = (n.tags || []).some(t => ('#' + t).toLowerCase().includes(q));
        if (!cocokJudul && !cocokTag) return false;
      }
      return true;
    });

    const W = 720, H = 480;
    const byJudul = new Map();
    catatan.forEach(n => {
      const j = String(n.title || '').trim().toLowerCase();
      if (j) byJudul.set(j, n);
    });

    const titik = catatan.map((n, i) => {
      const radius = catatan.length <= 1 ? 0 : Math.min(185, 85 + catatan.length * 6);
      const sudut = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(1, catatan.length);
      return {
        id: n.id,
        judul: (n.title || tr('(tanpa judul)')).slice(0, 22),
        aktif: n.id === state.openId,
        x: Math.round(W / 2 + radius * Math.cos(sudut)),
        y: Math.round(H / 2 + radius * Math.sin(sudut)),
      };
    });

    const mapTitik = new Map(titik.map(t => [t.id, t]));
    const garis = [];
    for (const n of catatan) {
      const a = mapTitik.get(n.id);
      for (const jTarget of ekstrakWikilinkJudul(n)) {
        const target = byJudul.get(jTarget);
        const b = target ? mapTitik.get(target.id) : null;
        if (a && b && a.id !== b.id) {
          garis.push(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="var(--border-strong)" stroke-width="1.5"/>`);
        }
      }
    }

    kanvas.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position:absolute;inset:0;pointer-events:none">${garis.join('')}</svg>` +
      titik.map(t => `<button type="button" class="gf-node${t.aktif ? ' me' : ''}" data-gf-buka="${esc(t.id)}" style="left:${t.x}px;top:${t.y}px">${esc(t.judul)}</button>`).join('');
    if (infoEl) infoEl.textContent = `${catatan.length} ${tr('catatan')} · ${garis.length} ${tr('tautan')}`;
    terapkanTransform();
  };

  /* Geser (pan) satu jari di layar sentuh */
  let geser = null;
  viewport.addEventListener('pointerdown', e => {
    if (e.target.closest('[data-gf-buka]')) return;
    geser = { x0: e.clientX - panX, y0: e.clientY - panY };
  });
  viewport.addEventListener('pointermove', e => {
    if (!geser) return;
    panX = e.clientX - geser.x0;
    panY = e.clientY - geser.y0;
    terapkanTransform();
  });
  viewport.addEventListener('pointerup', () => { geser = null; });
  viewport.addEventListener('pointercancel', () => { geser = null; });

  overlay.querySelector('#gf-cari')?.addEventListener('input', e => { cari = e.target.value; renderGraf(); });
  overlay.querySelector('#gf-ruang')?.addEventListener('change', e => { filterRuang = e.target.value; renderGraf(); });

  overlay.addEventListener('click', async e => {
    const buka = e.target.closest('[data-gf-buka]');
    if (buka) {
      const id = buka.dataset.gfBuka;
      overlay.remove();
      await flush();
      openNote(id);
      return;
    }
    if (e.target.closest('#gf-zin')) { zoom = Math.min(2.5, +(zoom + 0.25).toFixed(2)); terapkanTransform(); }
    else if (e.target.closest('#gf-zout')) { zoom = Math.max(0.5, +(zoom - 0.25).toFixed(2)); terapkanTransform(); }
    else if (e.target.closest('#gf-reset')) { zoom = 1; panX = 0; panY = 0; terapkanTransform(); }
    else if (e.target.closest('#gf-tutup') || e.target === overlay) overlay.remove();
  });

  renderGraf();
}

let _navTerpasang = false;
export function bindNavigasiFokus() {
  if (_navTerpasang) return;
  _navTerpasang = true;

  window.addEventListener('scroll', () => {
    if (cur !== 'editor') return;
    if (state.openId) simpanPosisiGulir(state.openId, window.scrollY || document.documentElement.scrollTop || 0);
    perbaruiGarisProgresBaca();
  }, { passive: true });

  document.addEventListener('selectionchange', () => {
    if (_fokus.dim && cur === 'editor') terapkanFokusDOM();
  });

  document.addEventListener('click', async e => {
    const rec = e.target.closest && e.target.closest('[data-recent-open]');
    if (rec) {
      e.preventDefault();
      const id = rec.dataset.recentOpen;
      if (id && id !== state.openId) {
        await flush();
        openNote(id);
      }
      return;
    }
    if (e.target.closest && e.target.closest('[data-buka-graf]')) {
      e.preventDefault();
      bukaGrafInteraktif();
      return;
    }
    const ft = e.target.closest && e.target.closest('[data-et="fokus-tulis"]');
    if (ft) {
      e.preventDefault();
      /* dari menu ··· (P1): tutup menu dulu, jangkar = tombol ··· */
      const diPop = !!ft.closest('#pop');
      const jangkar = diPop ? (document.getElementById('dots') || ft) : ft;
      if (diPop) closeAll();
      bukaDialogFokusMenulis(jangkar);
    }
  });
}
