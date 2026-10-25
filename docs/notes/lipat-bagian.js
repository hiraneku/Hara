/* Lipat bagian berdasarkan heading (Peta Master Bagian 5).

   Catatan panjang di HP paling sering dibaca sebagai beberapa bagian,
   bukan satu gulungan. Satu heading H1/H2/H3 bisa dilipat: semua blok
   setelahnya disembunyikan sampai heading berikutnya yang levelnya sama
   atau lebih tinggi.

   Yang disimpan hanya ID blok heading (data-bid stabil) di
   localStorage — isi catatan tidak berubah sama sekali. Lipatan bekerja
   di Mode Baca, saat isi tidak sedang disunting: menyembunyikan blok
   yang bisa diketik hanya akan membingungkan caret dan papan ketik.

   Cara pakai:
   - Daftar Isi (tombol di kendali baca) punya tombol lipat per heading,
     plus Lipat semua / Buka semua;
   - di Mode Baca, mengetuk area chevron di kiri heading juga melipat. */

import { state } from '../core/store.js?v=20261025081850';
import { onAfterRender, cur } from '../core/router.js?v=20261025081850';
import { docEl } from './editor/caret.js?v=20261025081850';
import { modeBacaBerlaku } from './mode-baca.js?v=20261025081850';

const KUNCI = 'hara.lipat.v1';
const MAKS_CATATAN = 300;
const MAKS_HEADING = 200;

function bacaPeta() {
  try {
    const v = JSON.parse(localStorage.getItem(KUNCI) || '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch (e) { return {}; }
}

function tulisPeta(peta) {
  try { localStorage.setItem(KUNCI, JSON.stringify(peta)); }
  catch (e) { /* mode privat: lipatan hanya berlaku selama sesi */ }
}

export function daftarLipat(noteId = state.openId) {
  const peta = bacaPeta();
  const isi = peta[noteId];
  return Array.isArray(isi) ? isi.filter(x => typeof x === 'string' && x) : [];
}

export function setIdTerlipat(noteId, ids) {
  if (!noteId) return;
  const peta = bacaPeta();
  const bersih = Array.from(new Set((Array.isArray(ids) ? ids : []).filter(x => typeof x === 'string' && x)))
    .slice(0, MAKS_HEADING);
  if (bersih.length) peta[noteId] = bersih;
  else delete peta[noteId];

  const kunci = Object.keys(peta);
  if (kunci.length > MAKS_CATATAN) {
    kunci.slice(0, kunci.length - MAKS_CATATAN).forEach(k => delete peta[k]);
  }
  tulisPeta(peta);
}

const level = el => {
  if (!el || !el.tagName) return 0;
  const m = /^H([123])$/.exec(el.tagName);
  return m ? Number(m[1]) : 0;
};

export const headingBisaLipat = root =>
  Array.from((root || docEl())?.children || []).filter(el => level(el));

/* Terapkan ulang lipatan dari ID tersimpan. Dipanggil setiap layar editor
   selesai digambar, saat Mode Baca dinyalakan/dimatikan, dan setelah
   toggle. Selalu membersihkan kelas lama lebih dulu supaya hasilnya
   deterministik — tidak ada sisa lipatan dari catatan sebelumnya. */
export function terapkanLipatan(root = docEl(), noteId = state.openId) {
  if (!root) return 0;

  root.querySelectorAll('.blk-terlipat').forEach(el => el.classList.remove('blk-terlipat'));
  root.querySelectorAll('.blk-lipat').forEach(el => {
    el.classList.remove('blk-lipat');
    el.removeAttribute('aria-expanded');
  });

  if (!modeBacaBerlaku()) return 0;
  const ids = new Set(daftarLipat(noteId));
  if (!ids.size) return 0;

  const anak = Array.from(root.children);
  let disembunyikan = 0;
  anak.forEach((el, i) => {
    const lv = level(el);
    if (!lv) return;
    const bid = el.getAttribute && el.getAttribute('data-bid');
    if (!bid || !ids.has(bid)) return;

    el.classList.add('blk-lipat');
    el.setAttribute('aria-expanded', 'false');
    for (let j = i + 1; j < anak.length; j++) {
      const l2 = level(anak[j]);
      if (l2 && l2 <= lv) break;
      anak[j].classList.add('blk-terlipat');
      disembunyikan++;
    }
  });
  return disembunyikan;
}

export function toggleLipatHeading(el, noteId = state.openId) {
  if (!el || !modeBacaBerlaku()) return false;
  const bid = el.getAttribute && el.getAttribute('data-bid');
  if (!bid) return false;

  const ids = new Set(daftarLipat(noteId));
  const sekarang = !ids.has(bid);
  if (sekarang) ids.add(bid);
  else ids.delete(bid);
  setIdTerlipat(noteId, [...ids]);
  terapkanLipatan(docEl(), noteId);
  return sekarang;
}

export function lipatSemua(noteId = state.openId) {
  const d = docEl();
  if (!d || !modeBacaBerlaku()) return 0;
  const ids = headingBisaLipat(d).map(h => h.getAttribute('data-bid')).filter(Boolean);
  setIdTerlipat(noteId, ids);
  terapkanLipatan(d, noteId);
  return ids.length;
}

export function bukaSemuaLipat(noteId = state.openId) {
  setIdTerlipat(noteId, []);
  const d = docEl();
  if (d) terapkanLipatan(d, noteId);
}

export const bisaLipat = () => modeBacaBerlaku();

export function bindLipatBagian() {
  onAfterRender(() => {
    if (cur === 'editor') terapkanLipatan();
  });

  /* Ketuk area chevron di kiri heading saat Mode Baca. Teks heading tetap
     bisa disorot seperti biasa; yang dilipat hanya ketukan di gutter. */
  document.addEventListener('click', e => {
    if (!modeBacaBerlaku() || !e.target.closest) return;
    const h = e.target.closest('.ed-doc > h1, .ed-doc > h2, .ed-doc > h3');
    if (!h) return;

    const s = window.getSelection ? window.getSelection() : null;
    if (s && !s.isCollapsed) return;

    const r = h.getBoundingClientRect ? h.getBoundingClientRect() : null;
    const x = Number(e.clientX) || 0;
    if (r && x > r.left + 22) return;

    e.preventDefault();
    toggleLipatHeading(h);
  });
}
