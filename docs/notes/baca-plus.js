/* Fitur penunjang baca/menulis di editor (Bagian A roadmap):
     · ukuran teks (A−/A+)  — skala font kolom catatan, tersimpan
     · mode fokus (zen)     — sembunyikan semua kecuali kolom tulis
     · cari di dalam catatan — sorot semua kemunculan (mode baca)
   Bagikan catatan (A5) ada di share.js; aksen (A6) di core/theme.js.

   bindBacaPlus() dipanggil sekali (notes/index.js); terapkanUkuranLayar()
   dipanggil tiap layar editor selesai digambar agar ukuran tersimpan
   langsung berlaku. */

import { toast } from '../core/toast.js?v=20260908225047';
import { closeAll } from './menus/pop.js?v=20260908225047';
import { docEl } from './editor/caret.js?v=20260908225047';
import { modeBacaBerlaku } from './mode-baca.js?v=20260908225047';
import { bukaDaftarIsi } from './daftar-isi.js?v=20260908225047';

const KUNCI_UKUR = 'hara.baca.ukur.v1';
/* Skala paragraf: 15px ↔ 24px (butir A1). Paragraf dasar 16px. */
const SKALA = [0.9375, 1, 1.125, 1.25, 1.375, 1.5];
const BAWAAN = 1;   /* index 1 → 16px (100%) */
const pxBaca = () => Math.round(16 * skalaSekarang());

let idxUkur = BAWAAN;
try {
  const v = parseInt(localStorage.getItem(KUNCI_UKUR), 10);
  if (!isNaN(v) && v >= 0 && v < SKALA.length) idxUkur = v;
} catch (e) { /* privat */ }

const skalaSekarang = () => SKALA[idxUkur];

/* ── ukuran teks (A−/A+) ── */
export function terapkanUkuranLayar() {
  const el = document.documentElement;
  el.style.setProperty('--tsx', String(skalaSekarang()));
  const lbl = document.getElementById('ed-ukur');
  if (lbl) lbl.textContent = pxBaca() + 'px';
}

export function aturUkuran(delta) {
  const baru = Math.max(0, Math.min(SKALA.length - 1, idxUkur + delta));
  if (baru === idxUkur) return;
  idxUkur = baru;
  try { localStorage.setItem(KUNCI_UKUR, String(idxUkur)); } catch (e) {}
  terapkanUkuranLayar();
  toast('Ukuran teks ' + pxBaca() + 'px');
}

/* ── mode fokus / zen ── */
export const zenAktif = () => document.body.classList.contains('zen');

export function setZen(on) {
  document.body.classList.toggle('zen', !!on);
  const b = document.querySelector('[data-et="zen"]');
  if (b) {
    b.classList.toggle('on', !!on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
}

export function matikanZen() { setZen(false); }

export function toggleZen() {
  if (!zenAktif()) closeAll();   /* popup tak boleh menggantung di layar fokus */
  const on = !zenAktif();
  setZen(on);
  toast(on ? 'Mode fokus — Esc atau bulatan untuk keluar' : 'Mode fokus dimatikan');
}

/* ── cari di dalam catatan (mode baca) ── */
let hasil = [];   /* elemen span.cari yang cocok */
let kini = -1;
let panel = null;

const kataAman = q => q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function buatPanel() {
  if (panel && panel.isConnected) return panel;
  panel = document.createElement('div');
  panel.id = 'cari-note';
  panel.innerHTML =
    `<svg class="ico" style="color:var(--faint)"><use href="#i-search"/></svg>
     <input id="cari-note-in" type="text" placeholder="Cari di catatan…"
       autocomplete="off" enterkeyhint="search" aria-label="Cari di dalam catatan">
     <span class="cn-hasil" id="cari-note-hasil" aria-live="polite"></span>
     <button type="button" class="cn-b" data-cn="prev" title="Sebelumnya" aria-label="Hasil sebelumnya">
       <svg class="ico"><use href="#i-up"/></svg></button>
     <button type="button" class="cn-b" data-cn="next" title="Berikutnya" aria-label="Hasil berikutnya">
       <svg class="ico"><use href="#i-down"/></svg></button>
     <button type="button" class="cn-b" data-cn="tutup" title="Tutup (Esc)" aria-label="Tutup pencarian">
       <svg class="ico"><use href="#i-x"/></svg></button>`;
  document.body.appendChild(panel);
  const inp = panel.querySelector('#cari-note-in');
  inp.addEventListener('input', () => cariDalamCatatan(inp.value));
  inp.addEventListener('keydown', ev => {
    if (ev.key === 'Enter') { ev.preventDefault(); lompat(ev.shiftKey ? -1 : 1); }
    else if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); tutupCari(); }
  });
  panel.addEventListener('click', ev => {
    const b = ev.target.closest('[data-cn]');
    if (!b) return;
    if (b.dataset.cn === 'prev') lompat(-1);
    else if (b.dataset.cn === 'next') lompat(1);
    else tutupCari();
  });
  return panel;
}

function lepasSorotan() {
  hasil = [];
  kini = -1;
  const d = docEl();
  if (!d) return;
  /* bertingkat aman: sampai tak ada span.cari tersisa */
  let sp;
  while ((sp = d.querySelector('span.cari')))
    sp.replaceWith(...Array.from(sp.childNodes));
  /* satukan kembali simpul teks yang terpecah oleh sorotan sebelumnya.
     Tanpa ini, ketik H → teks terbelah (H|alo); ketikan berikutnya
     (Ha, Halo) tak akan pernah cocok karena kata terpotong antar
     simpul — yang tersorot hanya huruf pertama. */
  d.normalize();
}

function perbaruiHasilLbl() {
  const el = document.getElementById('cari-note-hasil');
  if (!el) return;
  el.textContent = hasil.length ? (kini + 1) + '/' + hasil.length : '';
  el.style.visibility = hasil.length ? 'visible' : 'hidden';
}

function lompat(delta) {
  if (!hasil.length) return;
  kini = (kini + delta + hasil.length) % hasil.length;
  hasil.forEach((s, i) => s.classList.toggle('cari-kini', i === kini));
  perbaruiHasilLbl();
  const s = hasil[kini];
  if (s && s.scrollIntoView) {
    try { s.scrollIntoView({ block: 'center' }); } catch (e) { /* tua */ }
  }
}

function cariDalamCatatan(q) {
  const d = docEl();
  if (!d) return;
  lepasSorotan();
  q = (q || '').trim();
  if (!q) { perbaruiHasilLbl(); return; }
  const re = new RegExp(kataAman(q), 'gi');
  const jalan = document.createTreeWalker(d, 4, null);
  let n;
  while ((n = jalan.nextNode())) {
    if (!n.data) continue;
    let ditemukan = false;
    for (;;) {
      re.lastIndex = 0;   /* mulai dari awal (regex /g) */
      const res = re.exec(n.data);
      if (!res) break;
      const match = n.splitText(res.index);
      const cocok = match.splitText(res[0].length);   /* match = teks cocok */
      const sp = document.createElement('span');
      sp.className = 'cari';
      match.parentNode.insertBefore(sp, match);
      sp.appendChild(match);
      hasil.push(sp);
      n = cocok;
      ditemukan = true;
    }
    /* setelah node teks dipecah, loncati wilayah yang baru dibuat —
       kalau tidak, walker masuk ke span sorotan dan mengulang tanpa batas */
    if (ditemukan) jalan.currentNode = n;
  }
  if (hasil.length) {
    kini = 0;
    hasil.forEach((s, i) => s.classList.toggle('cari-kini', i === 0));
  }
  perbaruiHasilLbl();
  const s = hasil[0];
  if (s && s.scrollIntoView) {
    try { s.scrollIntoView({ block: 'center' }); } catch (e) { /* tua */ }
  }
}

export function bukaCari() {
  if (!modeBacaBerlaku()) {
    toast('Pakai mode baca untuk mencari di dalam catatan');
    return;
  }
  const el = buatPanel();
  el.classList.add('on');
  const inp = el.querySelector('#cari-note-in');
  inp.value = '';
  lepasSorotan();
  perbaruiHasilLbl();
  inp.focus();
}

export function tutupCari() {
  if (panel) {
    panel.classList.remove('on');
    if (document.activeElement && panel.contains(document.activeElement))
      document.activeElement.blur();
  }
  lepasSorotan();
}

/* ── ikat kejadian ── */
export function bindBacaPlus() {
  document.addEventListener('click', e => {
    if (!e.target.closest) return;
    const diEd = e.target.closest('.ed');
    const d = docEl();
    if (!diEd || !d || !d.isConnected) return;
    const b = e.target.closest('[data-et]');
    if (!b) return;
    if (b.dataset.et === 'kecil') { aturUkuran(-1); return; }
    if (b.dataset.et === 'besar') { aturUkuran(1); return; }
    if (b.dataset.et === 'zen') { toggleZen(); return; }
    if (b.dataset.et === 'cari') { bukaCari(); return; }
    if (b.dataset.et === 'dafis') { bukaDaftarIsi(b); return; }
  });

  /* ketuk di luar panel cari (dan bukan tombolnya) → tutup */
  document.addEventListener('click', e => {
    const p = document.getElementById('cari-note');
    if (!p || !p.classList.contains('on')) return;
    if (e.target.closest && (e.target.closest('#cari-note') ||
        e.target.closest('[data-et="cari"]'))) return;
    tutupCari();
  });

  /* tombol keluar mode fokus — bulatan kanan-bawah */
  const x = document.getElementById('zen-x');
  if (x) x.addEventListener('click', () => matikanZen());

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const p = document.getElementById('cari-note');
    if (p && p.classList.contains('on')) { tutupCari(); return; }
    if (zenAktif() && !document.querySelector('.pop.on') &&
        !document.querySelector('.sheet.on')) matikanZen();
  });
}
