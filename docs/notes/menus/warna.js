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
  from '../editor/warna.js?v=20260907111935';

/* Warna umum — HITAM → PUTIH dulu (rambatan abu), baru warna-warna umum.
   Dipakai sebagai satu strip geser. */
export const WARNA_UMUM = [
  '#000000', '#3f3f3f', '#6e6e6e', '#9e9e9e', '#c9c9c9', '#ffffff',
  '#e53935', '#fb8c00', '#fdd835', '#43a047', '#00acc1', '#1e88e5',
  '#3949ab', '#8e24aa', '#d81b60', '#795548',
];

const WARNA_MULAI = '#b91c1c';      /* warna awal roda saat teks polos */

export function warnaMenu(hexPaksa) {
  /* hexPaksa: warna yang BARU SAJA dipakai (mis. ketukan swatch). Dipakai
     sebagai sumber kebenaran render ulang — seleksi bisa sedang tidak
     terbaca (jsdom) atau belum pulih setelah sentuhan layar. */
  const menunggu = warnaPending();
  const kini = hexPaksa || (menunggu !== null ? (menunggu || warnaLekat() || '') : warnaSekarang());
  const hexKini = /^#[0-9a-f]{6}$/i.test(kini) ? kini.toLowerCase() : '';
  const hexAwal = hexKini || WARNA_MULAI;

  const swatch = WARNA_UMUM.map(w => {
    const on = hexKini === w;
    return `<button type="button" class="wsw${on ? ' on' : ''}" data-warna="${w}"
      title="${w}" aria-label="Warna ${w}"${on ? ' aria-pressed="true"' : ''}
      style="background:${w}"></button>`;
  }).join('');

  return `<div class="pop-h">Warna teks</div>
    <p class="pop-note">Tanpa blok teks, warna dipakai untuk yang diketik setelah ini.</p>
    <div class="wpal">${swatch}</div>
    <div class="wroda">
      <canvas id="roda-w" class="wroda-l" width="192" height="192"
        role="img" aria-label="Roda warna: ketuk untuk memilih rona dan jenuh warna"></canvas>
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

function rodaGambar(cv, h, s, l) {
  const ctx = cv.getContext ? cv.getContext('2d') : null;
  if (!ctx) return;
  const R = cv.width / 2;
  const img = ctx.createImageData(cv.width, cv.height);
  const dat = img.data;
  const PI2 = Math.PI * 2;
  for (let y = 0; y < cv.height; y++) {
    const dy = y - R + 0.5;
    for (let x = 0; x < cv.width; x++) {
      const dx = x - R + 0.5;
      if (dx * dx + dy * dy > R * R) continue;
      const hue = (Math.atan2(dy, dx) + PI2) % PI2 * 180 / Math.PI;
      const jenuh = Math.min(1, Math.hypot(dx, dy) / R);
      const [rr, gg, bb] = hslKeRgb(hue, jenuh, l);
      const i = (y * cv.width + x) * 4;
      dat[i] = rr; dat[i + 1] = gg; dat[i + 2] = bb; dat[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  /* penanda posisi warna sekarang — dua lapis agar terlihat di warna
     terang maupun gelap */
  const rad = h * Math.PI / 180;
  const tx = R + Math.cos(rad) * s * R;
  const ty = R + Math.sin(rad) * s * R;
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0,0,0,.55)';
  ctx.beginPath(); ctx.arc(tx, ty, 7, 0, PI2); ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#fff';
  ctx.beginPath(); ctx.arc(tx, ty, 7, 0, PI2); ctx.stroke();
}

/* Pasang interaksi roda — dipanggil setiap popup warna dibuka. */
export function rodaPasang() {
  const cv = document.getElementById('roda-w');
  const g = document.getElementById('roda-g');
  const hex = document.getElementById('warna-hex');
  const chip = document.getElementById('warna-chip');
  if (!cv || !g || !hex) return;

  const awal = hexKeHsl(normalizeWarna(hex.value) || WARNA_MULAI);
  let h = awal[0], s = awal[1], l = awal[2];

  const segar = () => {
    const heks = hslKeHex(h, s, l);
    if (chip) chip.style.background = heks;
    hex.value = heks;
    hex.classList.remove('salah');
    rodaGambar(cv, h, s, l);
  };

  g.value = Math.round(l * 100);
  segar();

  cv.addEventListener('pointerdown', e => {
    e.preventDefault();
    ambilPosisi(e);
    if (cv.setPointerCapture && e.pointerId !== undefined) {
      try { cv.setPointerCapture(e.pointerId); } catch (err) { /* abaikan */ }
    }
  });
  cv.addEventListener('pointermove', e => {
    if (!e.buttons) return;
    ambilPosisi(e);
  });

  function ambilPosisi(e) {
    const rc = cv.getBoundingClientRect();
    if (!rc || !rc.width) return;
    const dx = (e.clientX || rc.left + rc.width / 2) - (rc.left + rc.width / 2);
    const dy = (e.clientY || rc.top + rc.height / 2) - (rc.top + rc.height / 2);
    if (Math.hypot(dx, dy) > rc.width / 2) return;   /* di luar lingkaran */
    h = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
    s = Math.min(1, Math.hypot(dx, dy) / (rc.width / 2));
    segar();
  }

  g.addEventListener('input', () => {
    l = Number(g.value) / 100;
    segar();
  });

  hex.addEventListener('input', () => {
    const c = normalizeWarna(hex.value);
    if (c) {
      /* kode dikenali → kolom menampilkan bentuk kanoniknya, roda & chip
         ikut. Umpan balik ini penting: kode "rgb(...)" langsung berubah
         jadi "#rrggbb" = tanda bahwa kode diterima. */
      const [hh, ss, ll] = hexKeHsl(c);
      h = hh; s = ss; l = ll;
      g.value = Math.round(l * 100);
      hex.value = c;
      hex.classList.remove('salah');
      if (chip) chip.style.background = c;
      rodaGambar(cv, h, s, l);
    } else {
      hex.classList.toggle('salah', hex.value.trim() !== '');
    }
  });
}
