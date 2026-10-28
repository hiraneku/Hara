/* Pratinjau tautan [[Judul]] — kartu kecil berisi cuplikan catatan yang ditaut.

   • Desktop: arahkan kursor ke tautan (jeda 350 ms) → kartu muncul.
   • HP / tablet: tahan jari di tautan (450 ms) → kartu muncul. Klik yang
     menyusul setelah tahan-lama DIBUANG, supaya tidak ikut membuka pill
     "Buka «Judul»" atau mengubah posisi kursor.
   • Tombol "Buka catatan" di kartu membuka catatannya. Ketuk di luar,
     tekan Esc, atau gulir untuk menutup.
   • Tautan mati (catatan belum ada) menampilkan petunjuk, bukan cuplikan.
   • Catatan terkunci (PIN) tidak menampilkan isinya — konsisten dengan D19. */

import { state } from '../core/store.js?v=20261028024700';
import { t as tr } from '../core/i18n.js?v=20261028024700';
import { esc } from '../core/dom.js?v=20261028024700';
import { cariJudul, judulSpan } from './wikilink.js?v=20261028024700';
import { excerptOf } from './note-model.js?v=20261028024700';
import { terlihat } from './kunci.js?v=20261028024700';
import { openNote } from './model.js?v=20261028024700';

const JEDA_HOVER = 350;
const JEDA_TAHAN = 450;
const JEDA_TUTUP = 180;
const GESER_BATAL = 10;     /* px: lebih dari ini = sedang menggulir, batalkan tahan */
const PANJANG_CUPLIKAN = 180;

let kartu = null;
let elAktif = null;
let timerBuka = null;
let timerTutup = null;
let timerTahan = null;
let tahanBaru = false;      /* tahan-lama baru saja memunculkan kartu → klik berikutnya dibuang */
let titikTahan = null;
let terpasang = false;

/* Data yang ditampilkan untuk sebuah judul tautan. null = tidak ada catatan. */
export function isiPratinjau(judul) {
  const n = cariJudul(judul);
  if (!n) return null;
  const bisaLihat = terlihat(n);
  return {
    id: n.id,
    judul: String(n.title || '').trim() || tr('Tanpa judul'),
    terkunci: !bisaLihat,
    cuplikan: bisaLihat ? excerptOf(n, PANJANG_CUPLIKAN) : '',
  };
}

/* HTML kartu. Semua teks catatan di-escape. */
export function htmlPratinjau(info) {
  if (!info) {
    return `<div class="pt-h">${esc(tr('Catatan belum dibuat'))}</div>
      <div class="pt-t">${esc(tr('Belum ada catatan dengan judul ini. Ketuk tautan untuk membuatnya.'))}</div>`;
  }
  const isi = info.terkunci
    ? tr('Catatan terkunci. Buka dulu untuk melihat isinya.')
    : (info.cuplikan || tr('Kosong'));
  return `<div class="pt-h">${esc(info.judul)}</div>
    <div class="pt-t${info.terkunci ? ' pt-kunci' : ''}">${esc(isi)}</div>
    <div class="pt-f"><button type="button" class="pt-btn" data-pratinjau-buka="${esc(info.id)}">${esc(tr('Buka catatan'))} ↗</button></div>`;
}

const elTautan = target => {
  const el = target && target.closest ? target.closest('.ed-doc .wl') : null;
  return el || null;
};

function pastikanKartu() {
  if (kartu) return kartu;
  kartu = document.createElement('div');
  kartu.className = 'pratinjau-tautan';
  kartu.setAttribute('role', 'dialog');
  kartu.hidden = true;
  document.body.appendChild(kartu);
  kartu.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-pratinjau-buka]');
    if (!b) return;
    e.preventDefault();
    const id = b.dataset.pratinjauBuka;
    sembunyi();
    if (state.notes.some(n => n.id === id)) openNote(id);
  });
  kartu.addEventListener('pointerenter', () => clearTimeout(timerTutup));
  kartu.addEventListener('pointerleave', () => jadwalTutup());
  return kartu;
}

function posisikan(el) {
  const r = el.getBoundingClientRect();
  const lebar = kartu.offsetWidth || 280;
  const tinggi = kartu.offsetHeight || 120;
  const vw = window.innerWidth, vh = window.innerHeight;
  let x = r.left + r.width / 2 - lebar / 2;
  x = Math.max(8, Math.min(x, vw - lebar - 8));
  let y = r.bottom + 8;
  if (y + tinggi > vh - 8) y = r.top - tinggi - 8;
  y = Math.max(8, y);
  kartu.style.left = x + 'px';
  kartu.style.top = y + 'px';
}

function tampil(el) {
  if (!el || !el.isConnected) return;
  const info = isiPratinjau(judulSpan(el));
  const k = pastikanKartu();
  elAktif = el;
  k.innerHTML = htmlPratinjau(info);
  k.hidden = false;
  posisikan(el);
}

export function sembunyi() {
  clearTimeout(timerBuka);
  clearTimeout(timerTutup);
  elAktif = null;
  if (kartu) kartu.hidden = true;
}

function jadwalTutup() {
  clearTimeout(timerTutup);
  timerTutup = setTimeout(sembunyi, JEDA_TUTUP);
}

export function pasangPratinjauTautan() {
  if (terpasang) return;
  terpasang = true;

  /* Mouse: hover. */
  document.addEventListener('pointerover', e => {
    if (e.pointerType !== 'mouse') return;
    const el = elTautan(e.target);
    if (!el) return;
    clearTimeout(timerTutup);
    if (el === elAktif) return;
    clearTimeout(timerBuka);
    timerBuka = setTimeout(() => tampil(el), JEDA_HOVER);
  });
  document.addEventListener('pointerout', e => {
    if (e.pointerType !== 'mouse') return;
    if (!elTautan(e.target)) return;
    clearTimeout(timerBuka);
    jadwalTutup();
  });

  /* Sentuh / pena: tahan-lama. */
  document.addEventListener('pointerdown', e => {
    tahanBaru = false;
    if (e.pointerType === 'mouse') return;
    clearTimeout(timerTahan);
    const el = elTautan(e.target);
    if (!el) {
      if (kartu && !kartu.hidden && !kartu.contains(e.target)) sembunyi();
      return;
    }
    if (el.classList.contains('dead')) return;
    titikTahan = { x: e.clientX, y: e.clientY };
    timerTahan = setTimeout(() => {
      tahanBaru = true;
      tampil(el);
    }, JEDA_TAHAN);
  }, true);
  document.addEventListener('pointermove', e => {
    if (!titikTahan || !timerTahan) return;
    if (Math.hypot(e.clientX - titikTahan.x, e.clientY - titikTahan.y) > GESER_BATAL) {
      clearTimeout(timerTahan);
      timerTahan = null;
    }
  }, true);
  const batalTahan = () => { clearTimeout(timerTahan); timerTahan = null; };
  document.addEventListener('pointerup', batalTahan, true);
  document.addEventListener('pointercancel', batalTahan, true);

  /* Klik yang menyusul tahan-lama dibuang (capture di window: jalan paling awal). */
  window.addEventListener('click', e => {
    if (!tahanBaru) return;
    tahanBaru = false;
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);

  /* Menutup: Esc, gulir, atau ubah ukuran. */
  document.addEventListener('keydown', e => { if (e.key === 'Escape') sembunyi(); });
  window.addEventListener('scroll', () => sembunyi(), { passive: true, capture: true });
  window.addEventListener('resize', () => sembunyi());
}
