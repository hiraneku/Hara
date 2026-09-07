/* Tata letak gambar: ukuran (preset + gagang seret), posisi (perataan
   kiri/tengah/kanan + geser halus), dan rotasi bebas −180°..180°.

   Ketukan pada gambar (mode tulis) memilihnya: muncul garis aksen,
   gagang seret di pojok, dan panel "Atur gambar". Semua pengaturan
   ditulis sebagai atribut pada figur (data-gw/data-gr/data-ga/data-go)
   plus CSS (width + var --gr/--go) — model membacanya balik lewat
   elToBlock, jadi tidak ada format data baru. Gambar lama tanpa atribut
   tetap dirender 100% lurus seperti sebelumnya.

   Kapan pun nilai berubah: snap() (untuk satu langkah undo) → ubah
   atribut → refresh() (rekam + simpan). */

import { cur } from '../core/router.js?v=20260907151528';
import { docEl } from './editor/caret.js?v=20260907151528';
import { refresh } from './editor/cleanup.js?v=20260907151528';
import { snap } from './editor/history.js?v=20260907151528';
import { openPop, closeAll } from './menus/pop.js?v=20260907151528';
import { modeBacaBerlaku } from './mode-baca.js?v=20260907151528';

let pilih = null;        /* figur yang sedang dipilih */
let seret = null;        /* gesture seret ukuran (gagang pojok) */
let slider = null;       /* gesture penggeser rotasi/geser di panel */

/* ── nilai & batas ── */

const jepit = (v, min, max) => Math.max(min, Math.min(max, v));
const bulat = v => Math.round(Number(v) || 0);

/* Nilai tata letak figur saat ini (default gambar lama: 100%, lurus). */
export function bacaTata(fig) {
  const gw = fig.getAttribute('data-gw');
  const w = gw ? jepit(parseInt(gw, 10) || 100, 20, 100) : 100;
  const gr = fig.getAttribute('data-gr');
  const rot = gr ? jepit(bulat(gr), -180, 180) : 0;
  const ga = fig.getAttribute('data-ga');
  const align = (ga === 'l' || ga === 'c' || ga === 'r') ? ga : null;
  const go = fig.getAttribute('data-go');
  const off = go ? jepit(bulat(go), -400, 400) : 0;
  return { w, rot, align, off };
}

/* Lebar kolom teks (induk figur = .ed-doc). jsdom/tests: fallback 800. */
function kolomLebar(fig) {
  const p = fig.parentElement;
  if (!p) return 800;
  const r = p.getBoundingClientRect();
  return (r && r.width) || p.clientWidth || 800;
}

/* Batas geser halus (px) supaya gambar tetap di dalam kolom. Nilai w &
   align bisa di-override untuk menghitung batas sebelum ditulis. */
function batasOff(fig, w, align) {
  if (w === undefined || align === undefined) {
    const t = bacaTata(fig);
    if (w === undefined) w = t.w;
    if (align === undefined) align = t.align;
  }
  if (w >= 100) return { min: 0, max: 0 };
  const kolom = kolomLebar(fig);
  const bebas = Math.max(0, (kolom * (100 - w)) / 100);
  const paruh = Math.floor(bebas / 2);
  if (align === 'l') return { min: 0, max: Math.max(0, paruh) };
  if (align === 'r') return { min: -Math.max(0, paruh), max: 0 };
  return { min: -paruh, max: paruh };
}

/* ── tulis ke figur (CSS + atribut, sumber kebenaran utk simpan) ── */

export function tulisTata(fig, t) {
  const w = jepit(bulat(t.w) || 100, 20, 100);
  const rot = jepit(bulat(t.rot), -180, 180);
  const off = jepit(bulat(t.off), -400, 400);
  const align = (t.align === 'l' || t.align === 'c' || t.align === 'r') ? t.align : null;
  fig.classList.remove('i-l', 'i-c', 'i-r');
  if (align) fig.classList.add('i-' + align);
  const khusus = w < 100 || rot !== 0 || off !== 0 || align;
  fig.classList.toggle('tata', khusus);
  if (khusus) {
    fig.style.width = w + '%';
    fig.style.setProperty('--gr', rot + 'deg');
    fig.style.setProperty('--go', off + 'px');
    fig.setAttribute('data-gw', w);
    fig.setAttribute('data-gr', rot);
    fig.setAttribute('data-go', off);
    if (align) fig.setAttribute('data-ga', align);
    else fig.removeAttribute('data-ga');
  } else {
    fig.style.width = '';
    fig.style.removeProperty('--gr');
    fig.style.removeProperty('--go');
    fig.removeAttribute('data-gw');
    fig.removeAttribute('data-gr');
    fig.removeAttribute('data-ga');
    fig.removeAttribute('data-go');
  }
}

/* ── pilih / batalkan pilihan ── */

function deseleksi() {
  if (!pilih) return;
  const f = pilih;
  pilih = null;
  f.classList.remove('img-pilih');
  const g = f.querySelector('.img-grip');
  if (g) g.remove();
}

function pasangGrip(fig) {
  if (fig.querySelector('.img-grip')) return;
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'img-grip';
  b.setAttribute('aria-label', 'Ubah ukuran gambar — seret');
  b.title = 'Seret untuk mengubah ukuran';
  b.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5H5v4M15 5h4v4M9 19H5v-4M15 19h4v-4"/></svg>';
  fig.appendChild(b);
}

function bukaPanel(fig) {
  if (!fig || !fig.isConnected || !pilih || pilih !== fig) return;
  if (modeBacaBerlaku()) { deseleksi(); closeAll(); return; }
  const t = bacaTata(fig);
  const chip = (v, on) =>
    `<button type="button" class="g-chip${on ? ' on' : ''}" data-gw="${v}"` +
    ` aria-pressed="${on}">${v}%</button>`;
  const chipsW = [40, 60, 80, 100].map(v => chip(v, t.w === v)).join('');
  const chipsA = [
    ['l', 'Kiri'], ['c', 'Tengah'], ['r', 'Kanan'],
  ].map(([k, nama]) =>
    `<button type="button" class="g-chip${t.align === k ? ' on' : ''}" data-ga="${k}"` +
    ` aria-pressed="${t.align === k}">${nama}</button>`).join('');
  const pctRot = Math.round(((t.rot + 180) / 360) * 1000) / 10;
  const { min: minO, max: maxO } = batasOff(fig);
  const pctOff = (maxO > minO)
    ? Math.round(((t.off - minO) / (maxO - minO)) * 1000) / 10
    : 50;
  const bagGeser = t.w < 100 ? `
<div class="g-bag">
  <div class="g-lbl">Geser halus <span class="g-dim" id="g-dim"></span></div>
  <div class="g-row2">
    <button type="button" class="g-chip kcil${t.off === 0 ? ' on' : ''}" data-goff="0">0</button>
    <div class="g-sl" data-gsl="off" data-min="${minO}" data-max="${maxO}"
      role="slider" aria-label="Geser kiri-kanan" aria-valuemin="${minO}"
      aria-valuemax="${maxO}" aria-valuenow="${t.off}" tabindex="0">
      <div class="g-sl-in"><button type="button" class="g-th"
        style="left:${pctOff}%"></button></div>
    </div>
    <span class="g-sat" id="g-off-nilai">${t.off} px</span>
  </div>
</div>` : '';
  openPop(`<div class="pop-h">Atur gambar</div>
<div class="g-bag">
  <div class="g-lbl">Ukuran</div>
  <div class="g-chips" role="group" aria-label="Ukuran gambar">${chipsW}</div>
</div>
<div class="g-bag">
  <div class="g-lbl">Posisi</div>
  <div class="g-chips" role="group" aria-label="Posisi gambar">${chipsA}</div>
</div>
<div class="g-bag">
  <div class="g-lbl">Miring</div>
  <div class="g-row2">
    <button type="button" class="g-chip kcil${t.rot === 0 ? ' on' : ''}" data-grot="0">0°</button>
    <div class="g-sl" data-gsl="rot" data-min="-180" data-max="180"
      role="slider" aria-label="Rotasi gambar" aria-valuemin="-180"
      aria-valuemax="180" aria-valuenow="${t.rot}" tabindex="0">
      <div class="g-sl-in"><button type="button" class="g-th"
        style="left:${pctRot}%"></button></div>
    </div>
    <input class="g-num" id="g-rot" type="number" min="-180" max="180" step="1"
      value="${t.rot}" inputmode="numeric" aria-label="Rotasi dalam derajat">
    <span class="g-sat">°</span>
  </div>
</div>${bagGeser}`, fig);
  const dim = document.getElementById('g-dim');
  if (dim) dim.textContent = `${minO}…${maxO} px`;
}

/* ── terapkan nilai jadi (satu langkah undo) ── */

function terapkan(patch) {
  if (!pilih || !pilih.isConnected) return;
  if (modeBacaBerlaku()) { deseleksi(); closeAll(); return; }
  const fig = pilih;
  const lama = bacaTata(fig);

  let w = patch.w !== undefined ? jepit(bulat(patch.w), 20, 100) : lama.w;
  let align = (patch.align !== undefined)
    ? patch.align
    : lama.align;
  align = (align === 'l' || align === 'c' || align === 'r') ? align : null;
  const rot = patch.rot !== undefined ? jepit(bulat(patch.rot), -180, 180) : lama.rot;

  /* perataan pada gambar selebar kolom otomatis mengecilkan dulu */
  if (patch.align && w >= 100) w = 80;
  if (w >= 100) align = null;

  let off = patch.off !== undefined ? bulat(patch.off) : lama.off;
  const b = batasOff(fig, w, align);
  off = w < 100 ? jepit(off, b.min, b.max) : 0;

  if (w === lama.w && rot === lama.rot && align === lama.align && off === lama.off) return;
  snap();                          /* satu langkah undo */
  tulisTata(fig, { w, rot, align, off });
  refresh();                       /* rekam hasil akhir + simpan */
  bukaPanel(fig);                  /* segarkan penanda & batas panel */
}

/* Perubahan live (slider/gagang): tanpa refresh, diakhiri gesture. */
function ubahLive(patch) {
  if (!pilih || !pilih.isConnected || modeBacaBerlaku()) return;
  tulisTata(pilih, { ...bacaTata(pilih), ...patch });
}

/* Panel memakai nilai terbaru (mis. setelah lebar berubah) — hanya
   kalau panel memang sedang terbuka. */
function segarkanPanel() {
  const p = document.getElementById('pop');
  if (p && p.classList.contains('on')) bukaPanel(pilih);
}

/* ── gesture: gagang seret ukuran ── */

function mulaiSeret(e) {
  if (!pilih) return;
  e.preventDefault();
  e.stopPropagation();
  const pa = pilih.parentElement;
  const kiri = pa ? pa.getBoundingClientRect().left : 0;
  const kolom = kolomLebar(pilih);
  seret = { x0: e.clientX, kolom, kiri, jalan: false };
  window.addEventListener('pointermove', gerakSeret);
  window.addEventListener('pointerup', lepasSeret);
  window.addEventListener('pointercancel', lepasSeret);
}

function gerakSeret(e) {
  if (!seret || !pilih) return;
  if (!seret.jalan) {
    if (Math.abs(e.clientX - seret.x0) < 4) return;
    seret.jalan = true;
    snap();                       /* satu langkah undo utk seluruh seretan */
    pilih.classList.add('seret'); /* matikan transisi lebar saat menyeret */
  }
  const w = Math.round(jepit(((e.clientX - seret.kiri) / (seret.kolom || 1)) * 100, 20, 100));
  ubahLive({ w });
  if (pilih.getAttribute('data-gw')) {
    pilih.setAttribute('data-gw', w);   /* baca balik selalu benar */
    pilih.style.width = w + '%';
  }
}

function lepasSeret() {
  window.removeEventListener('pointermove', gerakSeret);
  window.removeEventListener('pointerup', lepasSeret);
  window.removeEventListener('pointercancel', lepasSeret);
  if (!seret) return;
  const jalan = seret.jalan;
  seret = null;
  if (!pilih) return;
  pilih.classList.remove('seret');
  if (jalan) {
    refresh();                    /* rekam + simpan */
    segarkanPanel();
  }
}

/* ── gesture: penggeser panel ── */

function nilaiSlider(sl, pct) {
  const min = Number(sl.dataset.min || 0);
  const max = Number(sl.dataset.max || 0);
  const jenis = sl.dataset.gsl;
  const v = Math.round(min + (max - min) * Math.max(0, Math.min(1, pct)));
  return { jenis, v: jenis === 'off' ? jepit(v, min, max) : jepit(v, -180, 180) };
}

function mulaiSlider(e, sl) {
  e.preventDefault();
  slider = { sl, jalan: false };
  window.addEventListener('pointermove', gerakSlider);
  window.addEventListener('pointerup', lepasSlider);
  window.addEventListener('pointercancel', lepasSlider);
  gerakSlider(e);   /* lompat langsung ke titik ketukan */
}

function gerakSlider(e) {
  if (!slider) return;
  const inEl = slider.sl.querySelector('.g-sl-in');
  if (!inEl || !pilih) return;
  const r = inEl.getBoundingClientRect();
  const pct = r.width ? (e.clientX - r.left) / r.width : 0;
  const { jenis, v } = nilaiSlider(slider.sl, pct);
  const kini = bacaTata(pilih)[jenis];
  if (!slider.jalan) {
    if (v === kini) return;   /* ketukan di posisi yang sama: tak ada kerja */
    slider.jalan = true;
    snap();                   /* satu langkah undo utk satu gerakan */
  }
  const thumb = slider.sl.querySelector('.g-th');
  if (thumb) thumb.style.left = Math.round(pct * 1000) / 10 + '%';
  if (jenis === 'rot') {
    ubahLive({ rot: v });
    const num = document.getElementById('g-rot');
    if (num) num.value = v;
    const chip0 = slider.sl.closest('#pop') && slider.sl.closest('#pop').querySelector('[data-grot="0"]');
    if (chip0) chip0.classList.toggle('on', v === 0);
  } else {
    ubahLive({ off: v });
    const nv = document.getElementById('g-off-nilai');
    if (nv) nv.textContent = v + ' px';
    const dim = document.getElementById('g-dim');
    if (dim) dim.textContent = `${slider.sl.dataset.min}…${slider.sl.dataset.max} px`;
  }
  slider.sl.setAttribute('aria-valuenow', v);
}

function lepasSlider() {
  window.removeEventListener('pointermove', gerakSlider);
  window.removeEventListener('pointerup', lepasSlider);
  window.removeEventListener('pointercancel', lepasSlider);
  if (!slider) return;
  const jalan = slider.jalan;
  slider = null;
  if (jalan) refresh();
}

/* Rotasi dari kolom derajat (change / Enter). */
function commitRot() {
  if (!pilih) return;
  const num = document.getElementById('g-rot');
  if (!num) return;
  const v = Math.round(Number(num.value));
  if (isNaN(v)) { num.value = bacaTata(pilih).rot; return; }
  const rot = jepit(v, -180, 180);
  if (rot !== bacaTata(pilih).rot) terapkan({ rot });
  else num.value = rot;
}

/* geser halus 0 px */
function resetOff() {
  if (pilih) terapkan({ off: 0 });
}

/* ── pemasangan ── */

export function bindTataGambar() {
  document.addEventListener('pointerdown', e => {
    if (e.button !== undefined && e.button !== 0) return;
    const popup = document.getElementById('pop');
    const popBuka = popup && popup.classList.contains('on');

    /* penggeser di panel */
    const sl = e.target.closest ? e.target.closest('[data-gsl]') : null;
    if (sl && popBuka) { if (pilih) mulaiSlider(e, sl); return; }

    /* gagang seret ukuran (anak figur yang dipilih) */
    const grip = e.target.closest ? e.target.closest('.img-grip') : null;
    if (grip) { if (pilih) mulaiSeret(e); return; }

    const d = docEl();
    const fig = (d && e.target.closest) ? e.target.closest('.b-img') : null;
    if (fig && fig.parentElement === d) {
      if (modeBacaBerlaku()) { deseleksi(); return; }
      if (e.target.closest('.img-x') || e.target.closest('.img-grip')) return;
      if (pilih !== fig) {
        deseleksi();
        pilih = fig;
        fig.classList.add('img-pilih');
        pasangGrip(fig);
      }
      return;
    }

    /* ketukan di luar gambar: bersihkan pilihan */
    if (e.target.closest && e.target.closest('#pop')) return;
    deseleksi();
  });

  /* klik pada figur: buka panel, atau tutup kalau sudah terbuka */
  document.addEventListener('click', e => {
    const d = docEl();
    const cfig = (d && e.target.closest) ? e.target.closest('.b-img') : null;
    if (cfig && cfig.parentElement === d && pilih === cfig) {
      if (modeBacaBerlaku()) { deseleksi(); return; }
      if (e.target.closest('.img-x') || e.target.closest('.img-grip') ||
          e.target.closest('#pop')) return;
      const popup = document.getElementById('pop');
      const on = popup && popup.classList.contains('on');
      if (on) { deseleksi(); closeAll(); }
      else bukaPanel(cfig);
      return;
    }
  });

  /* aksi tombol panel */
  document.addEventListener('click', e => {
    if (!pilih || !pilih.isConnected) {
      /* figur sudah hilang (undo/menghapus): panel basi ditutup saja */
      const p = document.getElementById('pop');
      if (p && p.classList.contains('on') && p.querySelector('[data-gw],[data-gsl]')) {
        closeAll();
      }
      return;
    }
    if (!e.target.closest || !e.target.closest('#pop')) return;
    const gw = e.target.closest('[data-gw]');
    if (gw) { terapkan({ w: parseInt(gw.dataset.gw, 10) }); return; }
    const ga = e.target.closest('[data-ga]');
    if (ga) { terapkan({ align: ga.dataset.ga }); return; }
    const grot = e.target.closest('[data-grot]');
    if (grot) { terapkan({ rot: 0 }); return; }
    const goff = e.target.closest('[data-goff]');
    if (goff) { resetOff(); return; }
  });

  /* kolom derajat: terapkan saat nilai dikunci */
  document.addEventListener('change', e => {
    if (e.target && e.target.id === 'g-rot') commitRot();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target && e.target.id === 'g-rot') {
      e.preventDefault();
      commitRot();
      const p = document.getElementById('pop');
      if (p && p.contains(e.target)) e.target.blur();
      return;
    }
    /* panah pada penggeser yang difokus */
    const th = e.target && e.target.closest ? e.target.closest('.g-th') : null;
    if (!th) return;
    const sl = th.closest('[data-gsl]');
    if (!sl) return;
    const { jenis } = nilaiSlider(sl, 0);
    const langkah = jenis === 'off' ? 2 : 1;
    const kali = e.shiftKey ? 10 : 1;
    const delta = (e.key === 'ArrowRight' || e.key === 'ArrowUp')
      ? langkah * kali
      : (e.key === 'ArrowLeft' || e.key === 'ArrowDown')
        ? -langkah * kali
        : 0;
    if (!delta) return;
    e.preventDefault();
    const kini = pilih ? bacaTata(pilih)[jenis] : 0;
    const b = jenis === 'off' && pilih ? batasOff(pilih) : { min: -180, max: 180 };
    const v = jepit(kini + delta, b.min, b.max);
    snap();
    ubahLive({ [jenis]: v });
    refresh();
    if (jenis === 'off' && pilih) {
      const nv = document.getElementById('g-off-nilai');
      if (nv) nv.textContent = v + ' px';
      const minV = Number(sl.dataset.min || 0);
      const maxV = Number(sl.dataset.max || 0);
      const pct = maxV > minV ? ((v - minV) / (maxV - minV)) * 100 : 50;
      th.style.left = Math.round(pct * 10) / 10 + '%';
      sl.setAttribute('aria-valuenow', v);
    } else {
      const num = document.getElementById('g-rot');
      if (num) num.value = v;
      th.style.left = Math.round(((v + 180) / 360) * 1000) / 10 + '%';
    }
  });

}

/* bersihkan saat catatan berganti / layar pindah (dipanggil dari
   index.js — onAfterRender & onBeforeLeave editor). */
export function bersihkanPilihanGambar() {
  deseleksi();
  closeAll();
}
