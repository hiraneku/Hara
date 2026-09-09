/* Menu pilih warna teks.

   Susunan:
   1. Strip warna umum SATU BARIS memanjang (bisa digeser): hitam → abu →
      putih dulu, lalu warna-warna umum lain. Bulatan cukup besar agar
      nyaman disentuh.
   2. Roda warna sungguhan (bukan dialog kotak sistem): lingkaran pelangi
      yang dihitung per piksel — rona dari arah ketukan, jenuh dari jarak
      ke tengah — plus pengatur gelap–terang. Warna pilihan tampil di
      chip & kolom kode; kolom kode menerima hex/#rgb/rgb()/hsl().
   3. "Bawaan" untuk menghapus warna (kembali ke warna tema).

   Warna yang sedang berlaku ditandai cincin; pilihan terakhir yang
   "menunggu" didahulukan. */

import { normalizeWarna, hslKeRgb, warnaSekarang, warnaPending, warnaLekat }
  from '../editor/warna.js?v=20260909070912';
import { sorotSekarang, sorotPending, sorotLekat }
  from '../editor/sorotan.js?v=20260909070912';
import { t as tr } from '../../core/i18n.js?v=20260909070912';

/* Warna umum — HITAM → PUTIH dulu (rambatan abu), baru warna-warna umum.
   Dipakai sebagai satu strip geser. */
export const WARNA_UMUM = [
  '#000000', '#3f3f3f', '#6e6e6e', '#9e9e9e', '#c9c9c9', '#ffffff',
  '#e53935', '#fb8c00', '#fdd835', '#43a047', '#00acc1', '#1e88e5',
  '#3949ab', '#8e24aa', '#d81b60', '#795548',
];

const WARNA_MULAI = '#b91c1c';      /* warna awal roda saat belum ada warna */

/* Sasaran pewarnaan: 'teks' (warna huruf) atau 'sorotan' (latar teks).
   Pengguna memilih dulu yang mana yang sedang digarap — supaya dua warna
   itu tidak bentrok, masing-masing punya simpanan sendiri. Ingatan ini
   bertahan selama halaman terbuka (bukan per popup). */
let sasaran = 'teks';
export const sasaranSekarang = () => sasaran;
let draf = { teks: '', sorotan: '' };   /* kode yang sedang digarap per sasaran */

/* Warna yang TAMPAK untuk satu sasaran: niat (pending) didahulukan, lalu
   yang lekat, lalu isi DOM di posisi kursor. '' kalau tidak ada. */
function tampilSasaran(sas) {
  const p = sas === 'sorotan' ? sorotPending() : warnaPending();
  const l = sas === 'sorotan' ? sorotLekat() : warnaLekat();
  const s = sas === 'sorotan' ? sorotSekarang() : warnaSekarang();
  const k = p !== null ? (p || l || '') : s;
  return /^#[0-9a-f]{6}$/i.test(k) ? k.toLowerCase() : '';
}

const NAMA_SASARAN = { teks: 'Teks', sorotan: 'Sorotan' };

function chipSasaran(sas, paksa) {
  const c = paksa && paksa.sas === sas && /^#[0-9a-f]{6}$/i.test(paksa.hex)
    ? paksa.hex.toLowerCase() : tampilSasaran(sas);
  return `<span class="wsas-c${c ? '' : ' kosong'}" data-c="${sas}"${c ? ` style="background:${c}"` : ''}></span>`;
}
function tombolSasaran(sas, paksa) {
  return `<button type="button" class="wsas-b${sasaran === sas ? ' on' : ''}" data-sas="${sas}"
    aria-pressed="${sasaran === sas}">${chipSasaran(sas, paksa)}${tr(NAMA_SASARAN[sas])}</button>`;
}

export function warnaMenu() {
  const hexKini = tampilSasaran(sasaran);
  const hexAwal = hexKini || WARNA_MULAI;

  const swatch = WARNA_UMUM.map(w => {
    const on = hexKini === w;
    return `<button type="button" class="wsw${on ? ' on' : ''}" data-warna="${w}"
      title="${w}" aria-label="Warna ${w}"${on ? ' aria-pressed="true"' : ''}
      style="background:${w}"></button>`;
  }).join('');

  return `<div class="pop-h">${tr('Warna teks & sorotan')}</div>
    <p class="pop-note">${tr('Pilih sasaran dulu: Teks mewarnai huruf, Sorotan mewarnai latarnya. Keduanya bisa aktif bersamaan.')}</p>
    <div class="wsas" role="group" aria-label="${tr('Yang diberi warna')}">${tombolSasaran('teks')}${tombolSasaran('sorotan')}</div>
    <div class="wpal">${swatch}</div>
    <div class="wroda">
      <canvas id="roda-w" class="wroda-l" width="192" height="192"
        role="img" aria-label="${tr('Roda warna: ketuk untuk memilih rona dan jenuh warna')}"></canvas>
      <div class="wroda-s">
        <input type="range" id="roda-g" min="0" max="100" value="55"
          aria-label="Gelap terang" title="Gelap–terang">
      </div>
    </div>
    <div class="wcus">
      <span class="wchip" id="warna-chip" aria-hidden="true"></span>
      <input id="warna-hex" class="pop-in whex" value="${hexAwal}"
        placeholder="kode: #3b82f6 / rgb(59, 130, 246)" autocomplete="off"
        spellcheck="false" aria-label="Kode warna">
      <button type="button" class="btn btn-sec wpakai" data-warna-pakai>Pakai</button>
    </div>
    <button type="button" class="pop-i" data-warna-hapus>
      <svg class="ico"><use href="#i-eraser"/></svg>Bawaan — hapus warna
      <span class="sub">teks mengikuti warna tema</span></button>`;
}

/* ── konversi warna untuk roda ── */

export function hexKeHsl(hex) {
  const t = hex.replace('#', '');
  const r = parseInt(t.slice(0, 2), 16) / 255;
  const g = parseInt(t.slice(2, 4), 16) / 255;
  const b = parseInt(t.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (!d) return [0, 0, l];
  let h;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [((h * 60) % 360 + 360) % 360, s, l];
}

export function hslKeHex(h, s, l) {
  const [r, g, b] = hslKeRgb(h, s, l);
  return '#' + [r, g, b].map(k => k.toString(16).padStart(2, '0')).join('');
}

/* ── gambar roda (kanvas). jsdom/tanpa kanvas: dilewati dengan aman. ── */

const RODA_PX = 192;               /* ukuran roda dalam px CSS */
let rodaH = 0, rodaS = 0, rodaL = 0.55;   /* warna yang sedang digarap */
let rodaEl = null;                 /* {cv,g,hex,chip} popup yang aktif */
let diskL = null, diskPx = 0, diskCv = null;   /* cache cakram: (l, px) */

/* Kanvas dicetak pada resolusi PERANGKAT (devicePixelRatio, dibatasi 2×)
   supaya di layar rapat tampak tajam, bukan buram. */
function rodaUkuran(cv) {
  const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
  const px = Math.max(1, Math.round(RODA_PX * dpr));
  if (cv.width !== px || cv.height !== px) { cv.width = px; cv.height = px; }
  return px;
}

/* Cakram roda untuk satu nilai gelap–terang `l`, di-resolusi perangkat.
   Tepi lingkaran di-anti-alias (bulu 1 px CSS) supaya pinggirannya mulus,
   bukan bergerigi. Dibuat sekali per nilai l lalu dipakai ulang. */
function cakramRoda(l, px) {
  if (diskCv && diskL === l && diskPx === px) return diskCv;
  const off = document.createElement('canvas');
  off.width = px; off.height = px;
  const c2 = off.getContext('2d');
  if (!c2) return null;
  const R = px / 2;
  const img = c2.createImageData(px, px);
  const dat = img.data;
  const PI2 = Math.PI * 2;
  const bulu = Math.max(1, px / RODA_PX);        /* 1 px CSS */
  for (let y = 0; y < px; y++) {
    const dy = y - R + 0.5;
    for (let x = 0; x < px; x++) {
      const dx = x - R + 0.5;
      const d = Math.hypot(dx, dy);
      if (d > R + bulu) continue;
      /* alfa tepi: penuh di dalam, menipis 1 px CSS di bibir lingkaran */
      const alfa = d > R - bulu ? Math.max(0, Math.min(1, (R + bulu - d) / (2 * bulu))) : 1;
      const hue = (Math.atan2(dy, dx) + PI2) % PI2 * 180 / Math.PI;
      const jenuh = Math.min(1, d / R);
      const [rr, gg, bb] = hslKeRgb(hue, jenuh, l);
      const i = (y * px + x) * 4;
      dat[i] = rr; dat[i + 1] = gg; dat[i + 2] = bb;
      dat[i + 3] = Math.round(alfa * 255);
    }
  }
  c2.putImageData(img, 0, 0);
  diskCv = off; diskL = l; diskPx = px;
  return off;
}

function rodaGambar(cv, h, s, l) {
  const c2 = cv.getContext ? cv.getContext('2d') : null;
  if (!c2) return;
  const px = rodaUkuran(cv);
  const off = cakramRoda(l, px);
  if (!off) return;
  c2.clearRect(0, 0, px, px);
  c2.drawImage(off, 0, 0);
  /* penanda posisi warna sekarang — digambar vektor di resolusi perangkat
     (tajam), dua lapis agar terlihat di warna terang maupun gelap */
  const R = px / 2;
  const sk = px / RODA_PX;
  const mr = 7 * sk;
  const rad = h * Math.PI / 180;
  const jarak = Math.max(0, Math.min(1, s)) * (R - mr - 2 * sk);
  const tx = R + Math.cos(rad) * jarak;
  const ty = R + Math.sin(rad) * jarak;
  const gores = (r, w, warna) => {
    c2.lineWidth = w; c2.strokeStyle = warna;
    c2.beginPath(); c2.arc(tx, ty, r, 0, Math.PI * 2); c2.stroke();
  };
  gores(mr, 4 * sk, 'rgba(0,0,0,.55)');
  gores(mr, 2 * sk, '#fff');
}

function rodaSegar() {
  const el = rodaEl;
  if (!el) return;
  const heks = hslKeHex(rodaH, rodaS, rodaL);
  if (el.chip) el.chip.style.background = heks;
  el.hex.value = heks;
  el.hex.classList.remove('salah');
  if (el.g) el.g.value = Math.round(rodaL * 100);
  rodaGambar(el.cv, rodaH, rodaS, rodaL);
}

/* Pindahkan cincin penanda di strip ke warna milik sasaran yang aktif. */
function terapkanCincin(akarmenu) {
  const target = tampilSasaran(sasaran);
  akarmenu.querySelectorAll('.wsw').forEach(b => {
    const on = b.dataset.warna === target;
    b.classList.toggle('on', on);
    if (on) b.setAttribute('aria-pressed', 'true');
    else b.removeAttribute('aria-pressed');
  });
}

/* Ganti sasaran pewarnaan (Teks <-> Sorotan) di popup yang sedang terbuka.
   Kode yang sedang digarap di kolom hex disimpan sebagai draf sasaran
   lama, lalu kolom hex + roda + cincin dipindah ke warna sasaran baru.
   Popup tidak digambar ulang — posisi strip yang sedang digeser tetap. */
export function pilihSasaran(t) {
  if (!NAMA_SASARAN[t]) return;
  const p = document.getElementById('pop');
  const hexEl = p && p.querySelector('#warna-hex');
  if (t === sasaran && hexEl) { rodaPasang(); return; }
  if (hexEl && /^#[0-9a-f]{6}$/i.test(hexEl.value)) draf[sasaran] = hexEl.value.toLowerCase();
  sasaran = t;
  if (hexEl) {
    hexEl.value = draf[t] || tampilSasaran(t) || WARNA_MULAI;
    hexEl.classList.remove('salah');
  }
  const wsasEl = p && p.querySelector('.wsas');
  if (wsasEl) wsasEl.innerHTML = tombolSasaran('teks') + tombolSasaran('sorotan');
  if (p) {
    if (p.querySelector('#roda-w')) rodaPasang();
    terapkanCincin(p);
  }
}

/* Segarkan ulang label segmen + chip warna sasaran di popup yang sedang
   terbuka (dipakai setelah swatch dipakai — chip harus ikut berubah).
   Hanya area .wsas yang diganti, strip & roda tidak disentuh.
   `paksa` = warna yang barusan dipakai ({sas,hex}); dipakai sebagai
   sumber chip sasaran itu (seleksi bisa belum terbaca saat itu). */
export function perbaruiSasaranPop(paksa) {
  const p = document.getElementById('pop');
  const w = p && p.querySelector('.wsas');
  if (w) w.innerHTML = tombolSasaran('teks', paksa) + tombolSasaran('sorotan', paksa);
}

/* Pasang interaksi roda. Dipanggil saat popup dibuka DAN saat swatch strip
   diklik (sinkron ulang). Aman dipanggil berulang pada elemen yang sama:
   listener hanya dipasang sekali per elemen (penanda dataset), sisanya
   murni sinkronisasi keadaan dari kolom kode. */
export function rodaPasang() {
  const cv = document.getElementById('roda-w');
  const g = document.getElementById('roda-g');
  const hex = document.getElementById('warna-hex');
  const chip = document.getElementById('warna-chip');
  if (!cv || !g || !hex) return;
  rodaEl = { cv, g, hex, chip };
  const awal = hexKeHsl(normalizeWarna(hex.value) || WARNA_MULAI);
  rodaH = awal[0]; rodaS = awal[1]; rodaL = awal[2];
  rodaSegar();
  if (cv.dataset.roda) return;      /* interaksi sudah terpasang */

  const ambilPosisi = e => {
    const rc = cv.getBoundingClientRect();
    if (!rc || !rc.width) return;
    const dx = (e.clientX || rc.left + rc.width / 2) - (rc.left + rc.width / 2);
    const dy = (e.clientY || rc.top + rc.height / 2) - (rc.top + rc.height / 2);
    if (Math.hypot(dx, dy) > rc.width / 2) return;   /* di luar lingkaran */
    rodaH = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
    rodaS = Math.min(1, Math.hypot(dx, dy) / (rc.width / 2));
    rodaSegar();
  };
  cv.addEventListener('pointerdown', e => {
    e.preventDefault();
    ambilPosisi(e);
    if (cv.setPointerCapture && e.pointerId !== undefined) {
      try { cv.setPointerCapture(e.pointerId); } catch (err) { /* abaikan */ }
    }
  });
  cv.addEventListener('pointermove', e => {
    if (e.buttons) ambilPosisi(e);
  });

  g.addEventListener('input', () => {
    rodaL = Number(g.value) / 100;
    rodaSegar();
  });

  hex.addEventListener('input', () => {
    const c = normalizeWarna(hex.value);
    if (c) {
      /* kode dikenali → kolom menampilkan bentuk kanoniknya, roda & chip
         ikut. Umpan balik ini penting: kode "rgb(...)" langsung berubah
         jadi "#rrggbb" = tanda bahwa kode diterima. */
      const [hh, ss, ll] = hexKeHsl(c);
      rodaH = hh; rodaS = ss; rodaL = ll;
      rodaSegar();
    } else {
      hex.classList.toggle('salah', hex.value.trim() !== '');
    }
  });
}
