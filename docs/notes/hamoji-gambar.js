/**
 * Studio Gambar Emoji / Stiker Kustom Hamoji
 *
 * Memungkinkan pengguna menggambar emoji/stiker sendiri di kanvas transparan,
 * menyimpan ke koleksi pribadi (sinkron localStorage + IndexedDB + cadangan JSON),
 * mengedit ulang atau menghapus, serta menempelkannya langsung dalam Mode Stiker
 * transparan (bisa digeser, diperbesar/diperkecil, dan diputar di atas catatan).
 */

import { openPop } from './menus/pop.js?v=20261024033444';
import { WARNA_UMUM } from './menus/warna.js?v=20261024033444';
import { normalizeWarna } from './editor/warna.js?v=20261024033444';
import { esc } from '../core/dom.js?v=20261024033444';
import { toast } from '../core/toast.js?v=20261024033444';
import { t as tr } from '../core/i18n.js?v=20261024033444';

export const KANVAS_UKUR = 256;
const MAKS_UNDO = 25;

/* Palet cepat: warna umum + warna kulit, pipi merona, putih, hitam pekat */
const PALET_GAMBAR = [
  '#1C1B18', '#FFFFFF', ...WARNA_UMUM.slice(0, 8),
  '#FF6B9D', '#FFB4C8', '#FFD166', '#A06CD5', '#FDE2C4', '#8D5524',
];

const UKURAN_KUAS = [3, 6, 12, 20];

let _studio = null;

function ctxAman(cv) {
  if (!cv || typeof cv.getContext !== 'function') return null;
  try {
    return cv.getContext('2d', { willReadFrequently: true }) || cv.getContext('2d');
  } catch (e) {
    return null;
  }
}

/**
 * Pangkas otomatis area transparan di sekeliling goresan pada kanvas 2D
 * supaya stiker pas mengikuti bentuk gambar tanpa tepi kosong berlebihan.
 * Jika kanvas kosong, mengembalikan null.
 */
export function pangkasKanvasTransparan(cv, margin = 8) {
  const c = ctxAman(cv);
  if (!c) return null;
  const w = cv.width, h = cv.height;
  let data;
  try {
    data = c.getImageData(0, 0, w, h).data;
  } catch (e) {
    return null;
  }
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = data[(y * w + x) * 4 + 3];
      if (a > 6) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) return null;

  const x0 = Math.max(0, minX - margin);
  const y0 = Math.max(0, minY - margin);
  const x1 = Math.min(w - 1, maxX + margin);
  const y1 = Math.min(h - 1, maxY + margin);
  const cw = Math.max(1, x1 - x0 + 1);
  const ch = Math.max(1, y1 - y0 + 1);

  const out = document.createElement('canvas');
  out.width = cw;
  out.height = ch;
  const oc = ctxAman(out);
  if (!oc) return null;
  oc.drawImage(cv, x0, y0, cw, ch, 0, 0, cw, ch);
  return { dataUrl: out.toDataURL('image/png'), width: cw, height: ch };
}

/**
 * Fallback vektor SVG murni dari jejak goresan apabila lingkungan (mis. jsdom)
 * tidak menyediakan implementasi raster Canvas 2D penuh.
 */
function svgDariJejak(jejak, ukuran = KANVAS_UKUR) {
  if (!Array.isArray(jejak) || !jejak.length) return null;
  const paths = jejak.map(j => {
    if (j.alat === 'stamp') {
      return svgBentuk(j.bentuk, j.x, j.y, j.size * 2.2, j.warna);
    }
    if (!j.pts || !j.pts.length) return '';
    if (j.pts.length === 1) {
      const p = j.pts[0];
      return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(j.size / 2).toFixed(1)}" fill="${esc(j.warna)}" opacity="${j.alpha ?? 1}"/>`;
    }
    const d = j.pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    return `<path d="${d}" fill="none" stroke="${esc(j.warna)}" stroke-width="${j.size}" stroke-linecap="round" stroke-linejoin="round" opacity="${j.alpha ?? 1}"/>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ukuran} ${ukuran}" width="${ukuran}" height="${ukuran}">${paths}</svg>`;
  return {
    dataUrl: 'data:image/svg+xml;utf8,' + encodeURIComponent(svg),
    width: ukuran,
    height: ukuran,
  };
}

function svgBentuk(bentuk, cx, cy, r, warna) {
  if (bentuk === 'heart') {
    const s = r / 16;
    return `<path transform="translate(${(cx - 12 * s).toFixed(1)},${(cy - 12 * s).toFixed(1)}) scale(${s.toFixed(2)})" d="M12 21s-7-4.5-9-8.5C1.2 8.8 3.6 5 7.5 5c2.1 0 3.7 1.1 4.5 2.4C12.8 6.1 14.4 5 16.5 5 20.4 5 22.8 8.8 21 12.5 19 16.5 12 21 12 21z" fill="${esc(warna)}"/>`;
  }
  if (bentuk === 'star') {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + (i * Math.PI) / 5;
      const rad = i % 2 === 0 ? r : r * 0.45;
      pts.push(`${(cx + Math.cos(ang) * rad).toFixed(1)},${(cy + Math.sin(ang) * rad).toFixed(1)}`);
    }
    return `<polygon points="${pts.join(' ')}" fill="${esc(warna)}"/>`;
  }
  return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="${esc(warna)}" stroke-width="${Math.max(2, r * 0.22).toFixed(1)}"/>`;
}

function gambarBentuk2D(ctx, bentuk, cx, cy, r, warna) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle = warna;
  ctx.strokeStyle = warna;
  if (bentuk === 'heart') {
    const s = r / 12;
    ctx.translate(cx - 12 * s, cy - 12 * s);
    ctx.scale(s, s);
    const p = new Path2D('M12 21s-7-4.5-9-8.5C1.2 8.8 3.6 5 7.5 5c2.1 0 3.7 1.1 4.5 2.4C12.8 6.1 14.4 5 16.5 5 20.4 5 22.8 8.8 21 12.5 19 16.5 12 21 12 21z');
    ctx.fill(p);
  } else if (bentuk === 'star') {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + (i * Math.PI) / 5;
      const rad = i % 2 === 0 ? r : r * 0.45;
      const x = cx + Math.cos(ang) * rad;
      const y = cy + Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.lineWidth = Math.max(2.5, r * 0.22);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function hexKeRgba(hex) {
  const c = normalizeWarna(hex) || '#1c1b18';
  const m = /^#([0-9a-f]{6})$/i.exec(c);
  if (!m) return [28, 27, 24, 255];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}

function isiArea2D(ctx, sx, sy, warnaHex) {
  const w = KANVAS_UKUR, h = KANVAS_UKUR;
  const x0 = Math.max(0, Math.min(w - 1, Math.round(sx)));
  const y0 = Math.max(0, Math.min(h - 1, Math.round(sy)));
  let img;
  try { img = ctx.getImageData(0, 0, w, h); } catch (e) { return; }
  const d = img.data;
  const idx0 = (y0 * w + x0) * 4;
  const sr = d[idx0], sg = d[idx0 + 1], sb = d[idx0 + 2], sa = d[idx0 + 3];
  const [trR, trG, trB, trA] = hexKeRgba(warnaHex);
  if (Math.abs(sr - trR) < 8 && Math.abs(sg - trG) < 8 && Math.abs(sb - trB) < 8 && Math.abs(sa - trA) < 8) return;

  const cocok = i =>
    Math.abs(d[i] - sr) <= 28 &&
    Math.abs(d[i + 1] - sg) <= 28 &&
    Math.abs(d[i + 2] - sb) <= 28 &&
    Math.abs(d[i + 3] - sa) <= 28;

  const visited = new Uint8Array(w * h);
  const stack = [x0, y0];
  while (stack.length) {
    const y = stack.pop();
    const x = stack.pop();
    const p = y * w + x;
    if (visited[p]) continue;
    const i = p * 4;
    if (!cocok(i)) continue;
    visited[p] = 1;
    d[i] = trR; d[i + 1] = trG; d[i + 2] = trB; d[i + 3] = trA;
    if (x > 0) stack.push(x - 1, y);
    if (x < w - 1) stack.push(x + 1, y);
    if (y > 0) stack.push(x, y - 1);
    if (y < h - 1) stack.push(x, y + 1);
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * Render HTML Studio Gambar di dalam popup Hamoji.
 */
export function studioGambarHtml(awal = null) {
  const warna = (awal && awal.warna) || '#1C1B18';
  const nama = (awal && awal.name) || '';
  return `
    <div class="rn-modal-box hamoji-modal hamoji-studio-modal" id="hamoji-studio">
      <div class="hamoji-header-row">
        <div class="hamoji-title-box">
          <button type="button" class="iconbtn" id="hs-back" title="${tr('Kembali ke Hamoji')}" aria-label="${tr('Kembali ke Hamoji')}" style="width:28px;height:28px">
            <svg class="ico"><use href="#i-back"/></svg>
          </button>
          <h3 class="hamoji-title-text">${awal && awal.id ? tr('Edit Stiker Gambar') : tr('Gambar Emoji / Stiker')}</h3>
          <span class="hamoji-mode-pill is-sticker">${tr('Stiker')}</span>
        </div>
        <button type="button" class="iconbtn" data-pop-close aria-label="${tr('Tutup')}" style="width:28px;height:28px">
          <svg class="ico"><use href="#i-x"/></svg>
        </button>
      </div>

      <!-- Area Kanvas Transparan -->
      <div class="hs-canvas-stage">
        <div class="hs-canvas-wrap">
          <canvas id="hs-canvas" width="${KANVAS_UKUR}" height="${KANVAS_UKUR}" aria-label="${tr('Kanvas gambar stiker')}"></canvas>
        </div>
        <div class="hs-side-acts">
          <button type="button" class="hs-act-btn" id="hs-undo" title="${tr('Batalkan')}" aria-label="${tr('Batalkan')}">
            <svg class="ico"><use href="#i-undo"/></svg>
          </button>
          <button type="button" class="hs-act-btn" id="hs-redo" title="${tr('Ulangi')}" aria-label="${tr('Ulangi')}">
            <svg class="ico"><use href="#i-redo"/></svg>
          </button>
          <button type="button" class="hs-act-btn" id="hs-flip" title="${tr('Cerminkan horizontal')}" aria-label="${tr('Cerminkan horizontal')}"><svg class="ico"><use href="#i-flip"/></svg></button>
          <button type="button" class="hs-act-btn hs-danger" id="hs-clear" title="${tr('Bersihkan kanvas')}" aria-label="${tr('Bersihkan kanvas')}">
            <svg class="ico"><use href="#i-trash"/></svg>
          </button>
        </div>
      </div>

      <!-- Pilihan Alat Gambar -->
      <div class="hs-tools-row" role="toolbar" aria-label="${tr('Alat gambar')}">
        <button type="button" class="hs-tool active" data-hs-tool="pen" title="${tr('Kuas halus')}">${tr('Kuas')}</button>
        <button type="button" class="hs-tool" data-hs-tool="soft" title="${tr('Kuas lembut / pipi merona')}">${tr('Lembut')}</button>
        <button type="button" class="hs-tool" data-hs-tool="fill" title="${tr('Isi warna area')}">${tr('Isi')}</button>
        <button type="button" class="hs-tool" data-hs-tool="eraser" title="${tr('Penghapus transparan')}">${tr('Hapus')}</button>
        <button type="button" class="hs-tool hs-ikon" data-hs-tool="circle" title="${tr('Cap lingkaran')}" aria-label="${tr('Cap lingkaran')}"><svg class="ico"><use href="#i-circle"/></svg></button>
        <button type="button" class="hs-tool hs-ikon" data-hs-tool="heart" title="${tr('Cap hati')}" aria-label="${tr('Cap hati')}"><svg class="ico"><use href="#i-heart"/></svg></button>
        <button type="button" class="hs-tool hs-ikon" data-hs-tool="star" title="${tr('Cap bintang')}" aria-label="${tr('Cap bintang')}"><svg class="ico"><use href="#i-star"/></svg></button>
      </div>

      <!-- Ukuran Kuas -->
      <div class="hs-size-row">
        <span class="hs-lbl">${tr('Ukuran')}</span>
        <div class="hs-size-dots">
          ${UKURAN_KUAS.map(u => `
            <button type="button" class="hs-size-btn${u === 6 ? ' active' : ''}" data-hs-size="${u}" aria-label="${u}px">
              <span style="width:${Math.max(4, Math.min(16, Math.round(u * 0.75)))}px;height:${Math.max(4, Math.min(16, Math.round(u * 0.75)))}px"></span>
            </button>
          `).join('')}
        </div>
        <input type="range" id="hs-size-range" min="2" max="28" value="6" aria-label="${tr('Ukuran kuas')}">
        <span class="hs-size-val" id="hs-size-val">6px</span>
      </div>

      <!-- Palet Warna + Pemilih Bebas -->
      <div class="hs-palette-row">
        <div class="hs-swatches">
          ${PALET_GAMBAR.map(w => `
            <button type="button" class="hs-sw${w.toLowerCase() === warna.toLowerCase() ? ' active' : ''}"
              data-hs-color="${w}" style="background:${w}" title="${w}" aria-label="${w}"></button>
          `).join('')}
        </div>
        <label class="hs-picker-wrap" title="${tr('Pilih warna bebas')}">
          <input type="color" id="hs-color-picker" value="${esc(warna)}">
        </label>
      </div>

      <!-- Nama Emoji & Tombol Simpan -->
      <div class="hs-save-row">
        <input type="text" class="hamoji-custom-input" id="hs-name" maxlength="40"
          value="${esc(nama)}" placeholder="${tr('Nama emoji/stiker (mis. Kucing Senyum)')}">
        <div class="hs-save-btns">
          <button type="button" class="btn btn-sec" id="hs-save-only">${tr('Simpan')}</button>
          <button type="button" class="btn btn-pri" id="hs-save-stick">${tr('Simpan & Tempel')}</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Buka Studio Gambar dan ikat seluruh event kanvas + tombol.
 * @param {object} opsi - { anchor, awal, onSimpan(item, tempelLangsung), onKembali() }
 */
export function bukaStudioGambar(opsi = {}) {
  const { anchor, awal = null, onSimpan, onKembali } = opsi;
  openPop(studioGambarHtml(awal), anchor);

  const root = document.getElementById('hamoji-studio');
  const cv = document.getElementById('hs-canvas');
  if (!root || !cv) return;

  const ctx = ctxAman(cv);
  const stateStudio = {
    alat: 'pen',
    ukuran: 6,
    warna: '#1C1B18',
    sedangGambar: false,
    ptsAktif: [],
    jejak: [],       /* fallback & riwayat jejak */
    undoStack: [],
    redoStack: [],
    editId: awal && awal.id ? awal.id : '',
  };
  _studio = stateStudio;

  const simpanSnapshot = () => {
    if (ctx) {
      try {
        stateStudio.undoStack.push({
          img: ctx.getImageData(0, 0, KANVAS_UKUR, KANVAS_UKUR),
          jejak: stateStudio.jejak.slice(),
        });
        if (stateStudio.undoStack.length > MAKS_UNDO) stateStudio.undoStack.shift();
        stateStudio.redoStack.length = 0;
        return;
      } catch (e) {}
    }
    stateStudio.undoStack.push({ img: null, jejak: stateStudio.jejak.slice() });
    stateStudio.redoStack.length = 0;
  };

  /* Muat gambar awal bila sedang mode edit */
  if (awal && awal.dataUrl && ctx && typeof Image !== 'undefined') {
    const im = new Image();
    im.onload = () => {
      ctx.clearRect(0, 0, KANVAS_UKUR, KANVAS_UKUR);
      const pad = 20;
      const skala = Math.min((KANVAS_UKUR - pad * 2) / (im.naturalWidth || KANVAS_UKUR), (KANVAS_UKUR - pad * 2) / (im.naturalHeight || KANVAS_UKUR), 1);
      const dw = (im.naturalWidth || KANVAS_UKUR) * skala;
      const dh = (im.naturalHeight || KANVAS_UKUR) * skala;
      ctx.drawImage(im, (KANVAS_UKUR - dw) / 2, (KANVAS_UKUR - dh) / 2, dw, dh);
    };
    im.src = awal.dataUrl;
  }

  const koordinat = e => {
    const r = cv.getBoundingClientRect();
    const w = r.width || KANVAS_UKUR;
    const h = r.height || KANVAS_UKUR;
    const cx = e.clientX !== undefined ? e.clientX : (r.left + w / 2);
    const cy = e.clientY !== undefined ? e.clientY : (r.top + h / 2);
    return {
      x: Math.max(0, Math.min(KANVAS_UKUR, ((cx - r.left) / w) * KANVAS_UKUR)),
      y: Math.max(0, Math.min(KANVAS_UKUR, ((cy - r.top) / h) * KANVAS_UKUR)),
    };
  };

  const mulaiGores = e => {
    e.preventDefault();
    const p = koordinat(e);
    const { alat, ukuran, warna } = stateStudio;

    if (alat === 'fill') {
      simpanSnapshot();
      if (ctx) isiArea2D(ctx, p.x, p.y, warna);
      return;
    }

    if (alat === 'circle' || alat === 'heart' || alat === 'star') {
      simpanSnapshot();
      stateStudio.jejak.push({ alat: 'stamp', bentuk: alat, x: p.x, y: p.y, size: ukuran, warna });
      if (ctx) gambarBentuk2D(ctx, alat, p.x, p.y, Math.max(10, ukuran * 2.2), warna);
      return;
    }

    simpanSnapshot();
    stateStudio.sedangGambar = true;
    stateStudio.ptsAktif = [p];
    if (cv.setPointerCapture && e.pointerId !== undefined) {
      try { cv.setPointerCapture(e.pointerId); } catch (err) {}
    }
    if (ctx) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = ukuran;
      ctx.globalCompositeOperation = alat === 'eraser' ? 'destination-out' : 'source-over';
      ctx.globalAlpha = alat === 'soft' ? 0.35 : 1;
      ctx.strokeStyle = alat === 'eraser' ? 'rgba(0,0,0,1)' : warna;
      ctx.fillStyle = alat === 'eraser' ? 'rgba(0,0,0,1)' : warna;
      ctx.beginPath();
      ctx.arc(p.x, p.y, ukuran / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    }
  };

  const gerakGores = e => {
    if (!stateStudio.sedangGambar) return;
    e.preventDefault();
    const p = koordinat(e);
    const pts = stateStudio.ptsAktif;
    const prev = pts[pts.length - 1];
    pts.push(p);
    if (ctx && prev) {
      const mx = (prev.x + p.x) / 2;
      const my = (prev.y + p.y) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(mx, my);
    }
  };

  const akhiriGores = () => {
    if (!stateStudio.sedangGambar) return;
    stateStudio.sedangGambar = false;
    if (ctx) {
      try { ctx.stroke(); ctx.restore(); } catch (e) {}
    }
    if (stateStudio.ptsAktif.length) {
      if (stateStudio.alat === 'eraser') {
        stateStudio.jejak.push({
          alat: 'eraser', pts: stateStudio.ptsAktif.slice(),
          size: stateStudio.ukuran, warna: 'transparent', alpha: 1,
        });
      } else {
        stateStudio.jejak.push({
          alat: stateStudio.alat,
          pts: stateStudio.ptsAktif.slice(),
          size: stateStudio.ukuran,
          warna: stateStudio.warna,
          alpha: stateStudio.alat === 'soft' ? 0.35 : 1,
        });
      }
    }
    stateStudio.ptsAktif = [];
  };

  cv.addEventListener('pointerdown', mulaiGores);
  cv.addEventListener('pointermove', gerakGores);
  cv.addEventListener('pointerup', akhiriGores);
  cv.addEventListener('pointercancel', akhiriGores);

  /* Kontrol Undo / Redo / Flip / Clear */
  const pulihKeadaan = snap => {
    stateStudio.jejak = snap.jejak.slice();
    if (ctx && snap.img) ctx.putImageData(snap.img, 0, 0);
  };

  root.querySelector('#hs-undo')?.addEventListener('click', () => {
    if (!stateStudio.undoStack.length) return;
    const kini = {
      img: ctx ? ctx.getImageData(0, 0, KANVAS_UKUR, KANVAS_UKUR) : null,
      jejak: stateStudio.jejak.slice(),
    };
    stateStudio.redoStack.push(kini);
    pulihKeadaan(stateStudio.undoStack.pop());
  });

  root.querySelector('#hs-redo')?.addEventListener('click', () => {
    if (!stateStudio.redoStack.length) return;
    const kini = {
      img: ctx ? ctx.getImageData(0, 0, KANVAS_UKUR, KANVAS_UKUR) : null,
      jejak: stateStudio.jejak.slice(),
    };
    stateStudio.undoStack.push(kini);
    pulihKeadaan(stateStudio.redoStack.pop());
  });

  root.querySelector('#hs-flip')?.addEventListener('click', () => {
    simpanSnapshot();
    stateStudio.jejak = stateStudio.jejak.map(j => ({
      ...j,
      x: j.x !== undefined ? KANVAS_UKUR - j.x : undefined,
      pts: j.pts ? j.pts.map(p => ({ x: KANVAS_UKUR - p.x, y: p.y })) : undefined,
    }));
    if (ctx) {
      const salinan = document.createElement('canvas');
      salinan.width = KANVAS_UKUR; salinan.height = KANVAS_UKUR;
      const sc = ctxAman(salinan);
      if (sc) {
        sc.drawImage(cv, 0, 0);
        ctx.clearRect(0, 0, KANVAS_UKUR, KANVAS_UKUR);
        ctx.save();
        ctx.translate(KANVAS_UKUR, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(salinan, 0, 0);
        ctx.restore();
      }
    }
  });

  root.querySelector('#hs-clear')?.addEventListener('click', () => {
    simpanSnapshot();
    stateStudio.jejak = [];
    if (ctx) ctx.clearRect(0, 0, KANVAS_UKUR, KANVAS_UKUR);
  });

  /* Pilih Alat */
  root.addEventListener('click', e => {
    const tb = e.target.closest('[data-hs-tool]');
    if (tb) {
      stateStudio.alat = tb.dataset.hsTool;
      root.querySelectorAll('[data-hs-tool]').forEach(b => b.classList.toggle('active', b === tb));
      return;
    }
    const sb = e.target.closest('[data-hs-size]');
    if (sb) {
      const u = Number(sb.dataset.hsSize) || 6;
      stateStudio.ukuran = u;
      const rng = root.querySelector('#hs-size-range');
      const val = root.querySelector('#hs-size-val');
      if (rng) rng.value = String(u);
      if (val) val.textContent = u + 'px';
      root.querySelectorAll('[data-hs-size]').forEach(b => b.classList.toggle('active', b === sb));
      return;
    }
    const cb = e.target.closest('[data-hs-color]');
    if (cb) {
      stateStudio.warna = cb.dataset.hsColor;
      if (stateStudio.alat === 'eraser') {
        stateStudio.alat = 'pen';
        root.querySelectorAll('[data-hs-tool]').forEach(b => b.classList.toggle('active', b.dataset.hsTool === 'pen'));
      }
      const pk = root.querySelector('#hs-color-picker');
      if (pk && /^#[0-9a-f]{6}$/i.test(stateStudio.warna)) pk.value = stateStudio.warna;
      root.querySelectorAll('[data-hs-color]').forEach(b => b.classList.toggle('active', b === cb));
    }
  });

  root.querySelector('#hs-size-range')?.addEventListener('input', e => {
    const u = Math.max(1, Math.min(32, Number(e.target.value) || 6));
    stateStudio.ukuran = u;
    const val = root.querySelector('#hs-size-val');
    if (val) val.textContent = u + 'px';
    root.querySelectorAll('[data-hs-size]').forEach(b => b.classList.toggle('active', Number(b.dataset.hsSize) === u));
  });

  root.querySelector('#hs-color-picker')?.addEventListener('input', e => {
    stateStudio.warna = e.target.value || '#1C1B18';
    if (stateStudio.alat === 'eraser') {
      stateStudio.alat = 'pen';
      root.querySelectorAll('[data-hs-tool]').forEach(b => b.classList.toggle('active', b.dataset.hsTool === 'pen'));
    }
    root.querySelectorAll('[data-hs-color]').forEach(b => b.classList.remove('active'));
  });

  root.querySelector('#hs-back')?.addEventListener('click', () => {
    if (typeof onKembali === 'function') onKembali();
  });

  const prosesSimpan = tempel => {
    const hasil = pangkasKanvasTransparan(cv) || svgDariJejak(stateStudio.jejak);
    if (!hasil || !hasil.dataUrl) {
      toast(tr('Gambar dulu emoji atau stikermu di kanvas'));
      return;
    }
    const namaInp = root.querySelector('#hs-name');
    const nama = (namaInp ? namaInp.value : '').trim() || tr('Stiker Gambar');
    if (typeof onSimpan === 'function') {
      onSimpan({
        id: stateStudio.editId || '',
        name: nama,
        dataUrl: hasil.dataUrl,
        width: hasil.width,
        height: hasil.height,
        warna: stateStudio.warna,
      }, tempel);
    }
  };

  root.querySelector('#hs-save-only')?.addEventListener('click', () => prosesSimpan(false));
  root.querySelector('#hs-save-stick')?.addEventListener('click', () => prosesSimpan(true));
}
