/* Bilah format di ATAS teks yang disorot (ronde 7).

   Sorot teks di editor → bilah kecil muncul di atasnya: Tebal · Miring ·
   Garis bawah · Coret · Sorot · Kode · Warna · Tautan · Hapus format.
   Tombolnya memakai mesin yang SAMA dengan bar mekanik (jalankan() di
   bar/render.js), jadi tidak ada dua jalur perintah yang bisa berperilaku
   berbeda — termasuk snapshot undo-nya.

   Prinsip yang dijaga:
   • bilah tidak boleh merebut fokus atau membubarkan sorotan —
     pointerdown/mousedown di-preventDefault, pola yang sama dengan
     tombol bar mekanik;
   • muncul hanya saat ada sorotan NYATA dan berada di dalam dokumen
     editor mode tulis. Mode baca tidak boleh diubah, dan di layar lain
     memang tidak ada sasaran;
   • sorotan yang menyentuh gambar dilewati — gambar punya bilahnya
     sendiri (tata-gambar.js);
   • hilang saat sorotan menguncup, saat menggulir, pindah layar,
     jendela berubah ukuran, atau Escape. */

import { docEl, sel } from './caret.js?v=20260918132648';
import { cur, onAfterRender, onBeforeLeave } from '../../core/router.js?v=20260918132648';
import { jalankan } from '../bar/render.js?v=20260918132648';
import { openPop } from '../menus/pop.js?v=20260918132648';
import { warnaMenu } from '../menus/warna.js?v=20260918132648';
import { t as tr } from '../../core/i18n.js?v=20260918132648';

const JEDA = 90;          /* ms — selectionchange datang beruntun */
const LUANG = 8;          /* px jarak bilah dari sorotan / tepi layar */

const TOMBOL = [
  { m: 'b',      l: '<b>B</b>',                                   t: 'Tebal' },
  { m: 'i',      l: '<i>I</i>',                                   t: 'Miring' },
  { m: 'u',      l: '<u>U</u>',                                   t: 'Garis bawah' },
  { m: 'strike', l: '<s>S</s>',                                   t: 'Coret' },
  { m: 'hl',     l: '<svg class="bi"><use href="#i-pen"/></svg>', t: 'Sorot' },
  { m: 'icode',  l: '<svg class="bi"><use href="#i-code"/></svg>', t: 'Kode inline' },
  { m: 'warna',  l: '<svg class="bi"><use href="#i-drop"/></svg>', t: 'Warna teks & sorotan' },
  { m: 'link',   l: '<svg class="bi"><use href="#i-link2"/></svg>', t: 'Tautan web' },
  { m: 'clear',  l: '<svg class="bi"><use href="#i-eraser"/></svg>', t: 'Hapus format' },
];

let el = null;
let timer = null;

function bilah() {
  if (el && el.isConnected) return el;
  el = document.createElement('div');
  el.id = 'teks-bar';
  el.className = 'teks-bar';
  el.hidden = true;
  el.setAttribute('role', 'toolbar');
  el.setAttribute('aria-label', tr('Format teks yang disorot'));
  el.innerHTML = TOMBOL.map(b =>
    `<button type="button" class="tb-i" data-m="${b.m}" title="${tr(b.t)}"
       aria-label="${tr(b.t)}">${b.l}</button>`).join('');
  /* jangan biarkan tombol merebut fokus → sorotan tetap utuh */
  el.addEventListener('mousedown', e => e.preventDefault());
  el.addEventListener('pointerdown', e => e.preventDefault());
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-m]');
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    const m = b.dataset.m;
    if (m === 'warna') {           /* palet warna punya menunya sendiri */
      openPop(warnaMenu(), b);
      return;
    }
    jalankan(m, b);
  });
  document.body.appendChild(el);
  return el;
}

export function sembunyikanBilahTeks() {
  clearTimeout(timer);
  if (el) el.hidden = true;
}

/* Sorotan yang bisa diberi format — null bila tidak ada. */
function sorotanAktif() {
  if (cur !== 'editor') return null;
  const d = docEl();
  if (!d || !d.isConnected) return null;
  /* mode baca: dokumen tidak disunting, jadi tidak ada format yang bisa
     diterapkan (tombolnya akan bohong) */
  const ed = document.querySelector('.ed');
  if (ed && ed.classList.contains('baca')) return null;
  const s = sel();
  if (!(s && s.rangeCount)) return null;
  const r = s.getRangeAt(0);
  if (r.collapsed) return null;
  if (!d.contains(r.startContainer) || !d.contains(r.endContainer)) return null;
  /* sorotan yang menyentuh gambar = urusan bilah gambar */
  let isi = null;
  try { isi = r.cloneContents(); } catch (e) { return null; }
  if (isi && isi.querySelector && isi.querySelector('[data-blob],img')) return null;
  return r;
}

function tempatkan(r) {
  const b = bilah();
  b.hidden = false;
  let rect = null;
  try { rect = r.getBoundingClientRect(); } catch (e) { rect = null; }
  const lw = b.offsetWidth || 320;
  const lh = b.offsetHeight || 44;
  const lebar = window.innerWidth || 360;
  let x = rect && rect.width ? rect.left + rect.width / 2 - lw / 2 : LUANG;
  let y = rect && rect.width ? rect.top - lh - LUANG : 80;
  /* kalau tidak muat di atas sorotan (mis. sorotan di baris pertama),
     bilah turun ke bawah sorotan */
  if (rect && rect.width && y < LUANG) y = rect.bottom + LUANG;
  x = Math.max(LUANG, Math.min(x, lebar - lw - LUANG));
  b.style.left = Math.round(x) + 'px';
  b.style.top = Math.round(Math.max(LUANG, y)) + 'px';
}

export function segarkanBilahTeks() {
  const r = sorotanAktif();
  if (!r) { sembunyikanBilahTeks(); return; }
  tempatkan(r);
}

export function bindBilahTeks() {
  document.addEventListener('selectionchange', () => {
    clearTimeout(timer);
    timer = setTimeout(segarkanBilahTeks, JEDA);
  });
  /* menyorot dengan tetikus: seleksi selesai saat tombol dilepas */
  document.addEventListener('pointerup', () => setTimeout(segarkanBilahTeks, 10), true);
  document.addEventListener('keyup', e => {
    if (cur === 'editor' && (e.shiftKey || e.key === 'Shift')) setTimeout(segarkanBilahTeks, 10);
  });
  document.addEventListener('scroll', sembunyikanBilahTeks, true);
  window.addEventListener('resize', sembunyikanBilahTeks);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') sembunyikanBilahTeks(); });
  /* layar berganti / catatan ditutup → bilah tidak boleh menggantung */
  onAfterRender(() => sembunyikanBilahTeks());
  onBeforeLeave(() => sembunyikanBilahTeks());
}
