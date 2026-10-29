/* Latar kertas per catatan (B7a) dan templat kertas kustom (B7c).

   Pilihan: Polos (bawaan, tanpa latar), Titik, Garis buku, Grid, dan Templat kustom.
   Disimpan di catatan sebagai `kertas` HANYA bila bukan polos, sama seperti `cover`,
   sehingga catatan lama tidak berubah. Kustom juga menyimpan `kertasAtur`
   (pola, spasi, warna, margin). Latar digambar CSS di `.ed-doc`; isi blok tidak disentuh.
   Templat isi (templat.js) tidak ikut menyimpan latar.
   Templat kustom buatan sendiri disimpan di localStorage (maks 8), seperti preset pena (A3). */

import { state, save } from '../core/store.js?v=20261029220000';
import {
  touch, KERTAS_JENIS, KERTAS_POLA, KERTAS_SPASI, KERTAS_WARNA, KERTAS_MARGIN,
  kelasKertasNote, variabelKertasNote, sanitasiAturKertas,
} from './note-model.js?v=20261029220000';
import { openPop, closeAll } from './menus/pop.js?v=20261029220000';
import { toast } from '../core/toast.js?v=20261029220000';
import { esc } from '../core/dom.js?v=20261029220000';
import { t as tr } from '../core/i18n.js?v=20261029220000';

export const KUNCI_TEMPLAT_KERTAS = 'hara.kertas.v1';
export const MAKS_TEMPLAT_KERTAS = 8;

const PILIHAN = [
  ['polos', 'Polos'],
  ['titik', 'Titik'],
  ['garis', 'Garis buku'],
  ['grid', 'Grid'],
];
const LABEL_POLA = { titik: 'Titik', garis: 'Garis buku', grid: 'Grid' };
const LABEL_WARNA = { abu: 'Abu-abu', biru: 'Biru', hijau: 'Hijau', merah: 'Merah', coklat: 'Cokelat' };
const LABEL_MARGIN = { 0: 'Tanpa', 48: 'Sempit', 72: 'Sedang', 96: 'Lebar' };
const VARIABEL_KERTAS = ['--kt-spasi', '--kt-warna', '--kt-margin'];

const sama = (x, y) => !!x && !!y && x.pola === y.pola && x.spasi === y.spasi
  && x.warna === y.warna && x.margin === y.margin;

/* Atur latar satu catatan. jenis 'polos' (atau kosong) menghapus latar.
   jenis 'kustom' butuh `atur` yang valid. Mengembalikan false bila catatan tidak ada,
   jenisnya tidak dikenal, atau pengaturan kustom tidak valid. */
export function setKertasCatatan(noteId, jenis, atur) {
  const n = state.notes.find(x => x.id === noteId);
  if (!n) return false;
  if (jenis && jenis !== 'polos' && !KERTAS_JENIS.includes(jenis)) return false;
  if (jenis === 'kustom') {
    const a = sanitasiAturKertas(atur);
    if (!a) return false;
    n.kertas = 'kustom';
    n.kertasAtur = a;
  } else if (!jenis || jenis === 'polos') {
    delete n.kertas;
    delete n.kertasAtur;
  } else {
    n.kertas = jenis;
    delete n.kertasAtur;
  }
  touch(n);
  save();
  sinkronKertasDOM();
  return true;
}

/* Terapkan latar catatan yang sedang dibuka ke elemen .ed-doc. */
export function sinkronKertasDOM() {
  const el = document.querySelector('.ed-doc');
  if (!el) return;
  const n = state.notes.find(x => x.id === state.openId);
  [...el.classList].filter(c => c.startsWith('kertas-')).forEach(c => el.classList.remove(c));
  kelasKertasNote(n).split(' ').filter(Boolean).forEach(c => el.classList.add(c));
  VARIABEL_KERTAS.forEach(p => el.style.removeProperty(p));
  const v = variabelKertasNote(n);
  if (v) Object.entries(v).forEach(([p, x]) => el.style.setProperty(p, x));
}

/* Templat kustom tersimpan. Entri yang rusak dibuang diam-diam. */
export function muatTemplatKertas() {
  try {
    const d = JSON.parse(localStorage.getItem(KUNCI_TEMPLAT_KERTAS) || '[]');
    if (!Array.isArray(d)) return [];
    return d.map(sanitasiAturKertas).filter(Boolean).slice(0, MAKS_TEMPLAT_KERTAS);
  } catch { return []; }
}

function tulisTemplatKertas(list) {
  try { localStorage.setItem(KUNCI_TEMPLAT_KERTAS, JSON.stringify(list)); } catch {}
}

/* Menyimpan pengaturan sebagai templat baru. Tidak menyimpan duplikat dan maksimal 8.
   Mengembalikan { ok, alasan? } dengan alasan 'tidak-valid' | 'ada' | 'penuh'. */
export function simpanTemplatKertas(atur) {
  const a = sanitasiAturKertas(atur);
  if (!a) return { ok: false, alasan: 'tidak-valid' };
  const list = muatTemplatKertas();
  if (list.some(x => sama(x, a))) return { ok: false, alasan: 'ada' };
  if (list.length >= MAKS_TEMPLAT_KERTAS) return { ok: false, alasan: 'penuh' };
  list.push(a);
  tulisTemplatKertas(list);
  return { ok: true, nomor: list.length };
}

/* ── Dialog ── */

let penangkapKlik = null;
let penangkapIsian = null;
let draft = null;              /* pengaturan kustom yang sedang diatur di dialog */

const atur0 = () => ({ pola: 'garis', spasi: KERTAS_SPASI.bawaan, warna: 'abu', margin: 0 });

function htmlDaftar(n) {
  const kini = KERTAS_JENIS.includes(n.kertas) ? n.kertas : 'polos';
  const aktif = kini === 'kustom' ? sanitasiAturKertas(n.kertasAtur) : null;
  const tpl = muatTemplatKertas();
  const cocokTpl = tpl.some(a => sama(a, aktif));
  return `<div class="pop-h">${esc(tr('Latar kertas catatan'))}</div>
    <div class="kt-isi">
      ${PILIHAN.map(([kode, nama]) => `
        <button type="button" class="pop-i${kini === kode ? ' sel' : ''}" data-kertas-pick="${kode}">
          ${esc(tr(nama))}
        </button>`).join('')}
      <button type="button" class="pop-i${kini === 'kustom' && !cocokTpl ? ' sel' : ''}" data-kertas-kustom>
        ${esc(tr('Templat kustom…'))}
      </button>
      ${tpl.length ? `<p class="pop-note">${esc(tr('Templat kertas tersimpan'))}</p>` : ''}
      ${tpl.map((a, i) => `
        <button type="button" class="pop-i${sama(a, aktif) ? ' sel' : ''}" data-kertas-tpl="${i}">
          ${esc(tr('Templat'))} ${i + 1} · ${esc(tr(LABEL_POLA[a.pola]))}, ${a.spasi} px
        </button>`).join('')}
    </div>`;
}

function htmlForm(a) {
  const opsiPola = KERTAS_POLA.map(p =>
    `<option value="${p}"${a.pola === p ? ' selected' : ''}>${esc(tr(LABEL_POLA[p]))}</option>`).join('');
  const opsiMargin = KERTAS_MARGIN.map(m =>
    `<option value="${m}"${a.margin === m ? ' selected' : ''}>${esc(tr(LABEL_MARGIN[m]))}${m ? ` (${m} px)` : ''}</option>`).join('');
  const warna = Object.keys(KERTAS_WARNA).map(k => `
    <button type="button" class="kt-warna${a.warna === k ? ' sel' : ''}" data-kf-warna="${k}"
      style="background:${KERTAS_WARNA[k]}" title="${esc(tr(LABEL_WARNA[k]))}"
      aria-label="${esc(tr(LABEL_WARNA[k]))}" aria-pressed="${a.warna === k}"></button>`).join('');
  return `<div class="pop-h">${esc(tr('Templat kustom'))}</div>
    <div class="kt-isi">
      <label class="kt-baris"><span>${esc(tr('Pola'))}</span><select data-kf="pola">${opsiPola}</select></label>
      <label class="kt-baris"><span>${esc(tr('Spasi'))} <span data-kf-out>${a.spasi} px</span></span>
        <input type="range" data-kf="spasi" min="${KERTAS_SPASI.min}" max="${KERTAS_SPASI.max}" step="2" value="${a.spasi}"></label>
      <div class="kt-baris"><span>${esc(tr('Warna'))}</span><span class="kt-warnas">${warna}</span></div>
      <label class="kt-baris"><span>${esc(tr('Margin'))}</span><select data-kf="margin">${opsiMargin}</select></label>
      <button type="button" class="pop-i sel" data-kf-pakai>${esc(tr('Pakai di catatan ini'))}</button>
      <button type="button" class="pop-i" data-kf-simpan>${esc(tr('Simpan sebagai templat'))}</button>
      <button type="button" class="pop-i" data-kf-kembali>${esc(tr('Kembali'))}</button>
    </div>`;
}

function lepasPenangkap() {
  const pop = document.getElementById('pop');
  if (!pop) return;
  if (penangkapKlik) pop.removeEventListener('click', penangkapKlik);
  if (penangkapIsian) {
    pop.removeEventListener('input', penangkapIsian);
    pop.removeEventListener('change', penangkapIsian);
  }
  penangkapKlik = null;
  penangkapIsian = null;
}

/* Menampilkan dialog di mode 'daftar' atau 'form'. Penangkap dipasang ulang
   setiap kali, jadi tidak ada pendengar lama yang menumpuk. */
function tampilkan(noteId, mode) {
  const n = state.notes.find(x => x.id === noteId);
  if (!n) return;
  const anchor = document.getElementById('morebtn') || document.querySelector('.ed-doc');
  openPop(mode === 'form' ? htmlForm(draft) : htmlDaftar(n), anchor);
  const pop = document.getElementById('pop');
  if (!pop) return;
  lepasPenangkap();
  penangkapKlik = e => klikDialog(e, noteId);
  penangkapIsian = e => isianDialog(e);
  pop.addEventListener('click', penangkapKlik);
  pop.addEventListener('input', penangkapIsian);
  pop.addEventListener('change', penangkapIsian);
}

function selesai(pesan) {
  lepasPenangkap();
  closeAll();
  toast(pesan);
}

function klikDialog(e, noteId) {
  const t = e.target;
  const pick = t.closest('[data-kertas-pick]');
  if (pick) {
    setKertasCatatan(noteId, pick.dataset.kertasPick);
    selesai(tr('Latar kertas diperbarui'));
    return;
  }
  const tpl = t.closest('[data-kertas-tpl]');
  if (tpl) {
    const a = muatTemplatKertas()[Number(tpl.dataset.kertasTpl)];
    if (a && setKertasCatatan(noteId, 'kustom', a)) selesai(tr('Latar kertas diperbarui'));
    return;
  }
  if (t.closest('[data-kertas-kustom]')) {
    const n = state.notes.find(x => x.id === noteId);
    draft = (n && n.kertas === 'kustom' && sanitasiAturKertas(n.kertasAtur)) || atur0();
    tampilkan(noteId, 'form');
    return;
  }
  const warna = t.closest('[data-kf-warna]');
  if (warna && draft) { draft.warna = warna.dataset.kfWarna; tampilkan(noteId, 'form'); return; }
  if (t.closest('[data-kf-kembali]')) { tampilkan(noteId, 'daftar'); return; }
  if (t.closest('[data-kf-pakai]') && draft) {
    if (setKertasCatatan(noteId, 'kustom', draft)) selesai(tr('Latar kertas diperbarui'));
    return;
  }
  if (t.closest('[data-kf-simpan]') && draft) {
    const r = simpanTemplatKertas(draft);
    if (r.ok) toast(tr('Templat kertas disimpan'));
    else if (r.alasan === 'ada') toast(tr('Templat ini sudah tersimpan'));
    else if (r.alasan === 'penuh') toast(tr('Templat kertas sudah penuh (maks 8)'));
  }
}

/* Mengubah isian form. Hanya memperbarui `draft`; render ulang tidak perlu. */
function isianDialog(e) {
  const f = e.target.closest('[data-kf]');
  if (!f || !draft) return;
  const k = f.dataset.kf;
  if (k === 'spasi') {
    draft.spasi = Math.round(Number(f.value));
    const out = document.querySelector('#pop [data-kf-out]');
    if (out) out.textContent = `${draft.spasi} px`;
  } else if (k === 'pola') draft.pola = f.value;
  else if (k === 'margin') draft.margin = Number(f.value);
}

export function bukaDialogKertasCatatan() {
  const n = state.notes.find(x => x.id === state.openId);
  if (!n) return;
  draft = null;
  tampilkan(n.id, 'daftar');
}
