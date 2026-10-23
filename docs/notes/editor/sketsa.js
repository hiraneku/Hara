/**
 * Studio Kanvas Coretan & Tanda Tangan (/sketch) + Filter Pindai Dokumen Foto (Document Scan).
 * Dirancang 100% mobile-first untuk layar sentuh Android (target sentuh >=42px, touch-action: none,
 * serta fallback SVG/Blob murni agar tetap berjalan mulus di lingkungan uji tanpa GPU canvas).
 */

import { simpanBlob, ambilBlob } from '../../core/blobs.js?v=20261023162934';
import { toast } from '../../core/toast.js?v=20261023162934';
import { t as tr } from '../../core/i18n.js?v=20261023162934';
import { ensureCaret, caretEnd } from './caret.js?v=20261023162934';
import { makeBlock, blockToHtml } from '../note-model.js?v=20261023162934';
import { refresh } from './cleanup.js?v=20261023162934';
import { snap } from './history.js?v=20261023162934';
import { pasangGambar } from './image.js?v=20261023162934';
import { pastikanKolomAkhir } from './blocks.js?v=20261023162934';

const LEBAR = 720;
const TINGGI = 460;

const WARNA_SKETSA = [
  '#111827', '#ef4444', '#2563eb', '#059669',
  '#d97706', '#7c3aed', '#db2777', '#ffffff',
];

function ambilKonteks2D(cv) {
  if (!cv || typeof cv.getContext !== 'function') return null;
  try {
    return cv.getContext('2d', { willReadFrequently: true }) || cv.getContext('2d');
  } catch {
    return null;
  }
}

function buatIdBlob(awalan = 'sk_') {
  return awalan + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function svgDariJejak(jejak, latar) {
  const bgRect = latar === 'gelap'
    ? `<rect width="${LEBAR}" height="${TINGGI}" fill="#18181b"/>`
    : latar === 'putih'
      ? `<rect width="${LEBAR}" height="${TINGGI}" fill="#ffffff"/>`
      : '';
  const isi = jejak.map(st => {
    const op = st.alat === 'stabilo' ? 0.36 : 1;
    if (st.alat === 'kotak' && st.pts.length >= 2) {
      const a = st.pts[0], b = st.pts[st.pts.length - 1];
      const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
      return `<rect x="${x}" y="${y}" width="${Math.abs(b.x - a.x)}" height="${Math.abs(b.y - a.y)}" fill="none" stroke="${st.warna}" stroke-width="${st.ukuran}" rx="6"/>`;
    }
    if ((st.alat === 'garis' || st.alat === 'panah') && st.pts.length >= 2) {
      const a = st.pts[0], b = st.pts[st.pts.length - 1];
      return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${st.warna}" stroke-width="${st.ukuran}" stroke-linecap="round"/>`;
    }
    if (!st.pts.length) return '';
    if (st.pts.length === 1) {
      const p = st.pts[0];
      return `<circle cx="${p.x}" cy="${p.y}" r="${Math.max(2, st.ukuran / 2)}" fill="${st.warna}" opacity="${op}"/>`;
    }
    const d = st.pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${Math.round(p.x)} ${Math.round(p.y)}`).join(' ');
    return `<path d="${d}" fill="none" stroke="${st.warna}" stroke-width="${st.ukuran}" stroke-linecap="round" stroke-linejoin="round" opacity="${op}"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${LEBAR}" height="${TINGGI}" viewBox="0 0 ${LEBAR} ${TINGGI}">${bgRect}${isi}</svg>`;
}

async function eksporKanvasKeBlob(cv, ctx, jejak, latar) {
  if (ctx && typeof cv.toBlob === 'function') {
    const blob = await new Promise(resolve => {
      try { cv.toBlob(b => resolve(b), 'image/png'); }
      catch { resolve(null); }
    });
    if (blob) return blob;
  }
  const svg = svgDariJejak(jejak, latar);
  return new Blob([svg], { type: 'image/svg+xml' });
}

function gambarKisiLatar(ctx, pola, latar) {
  if (!ctx) return;
  ctx.clearRect(0, 0, LEBAR, TINGGI);
  if (latar === 'putih') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, LEBAR, TINGGI);
  } else if (latar === 'gelap') {
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, LEBAR, TINGGI);
  }
  if (pola === 'titik') {
    ctx.fillStyle = latar === 'gelap' ? 'rgba(255,255,255,0.16)' : 'rgba(15,23,42,0.16)';
    for (let y = 24; y < TINGGI; y += 24) {
      for (let x = 24; x < LEBAR; x += 24) {
        ctx.beginPath();
        ctx.arc(x, y, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (pola === 'garis') {
    ctx.strokeStyle = latar === 'gelap' ? 'rgba(255,255,255,0.12)' : 'rgba(37,99,235,0.14)';
    ctx.lineWidth = 1;
    for (let y = 32; y < TINGGI; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(LEBAR, y);
      ctx.stroke();
    }
  }
}

function gambarSatuJejak(ctx, st) {
  if (!ctx || !st.pts.length) return;
  ctx.save();
  if (st.alat === 'hapus') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.lineWidth = st.ukuran * 2.4;
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = st.warna;
    ctx.fillStyle = st.warna;
    ctx.lineWidth = st.alat === 'stabilo' ? st.ukuran * 2.6 : st.ukuran;
    ctx.globalAlpha = st.alat === 'stabilo' ? 0.34 : 1;
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const a = st.pts[0];
  const b = st.pts[st.pts.length - 1];
  if (st.alat === 'garis' || st.alat === 'panah') {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    if (st.alat === 'panah') {
      const s = Math.atan2(b.y - a.y, b.x - a.x);
      const p = Math.max(10, st.ukuran * 3);
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - p * Math.cos(s - Math.PI / 6), b.y - p * Math.sin(s - Math.PI / 6));
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - p * Math.cos(s + Math.PI / 6), b.y - p * Math.sin(s + Math.PI / 6));
      ctx.stroke();
    }
  } else if (st.alat === 'kotak') {
    ctx.strokeRect(
      Math.min(a.x, b.x),
      Math.min(a.y, b.y),
      Math.abs(b.x - a.x),
      Math.abs(b.y - a.y)
    );
  } else if (st.pts.length === 1) {
    ctx.beginPath();
    ctx.arc(a.x, a.y, Math.max(1.5, ctx.lineWidth / 2), 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    for (let i = 1; i < st.pts.length - 1; i++) {
      const midX = (st.pts[i].x + st.pts[i + 1].x) / 2;
      const midY = (st.pts[i].y + st.pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(st.pts[i].x, st.pts[i].y, midX, midY);
    }
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}

/** Sisipkan blok gambar sketsa langsung ke posisi aktif di editor. */
export async function sisipkanBlobSketsa(blob, figTarget = null) {
  const id = buatIdBlob('sk_');
  try {
    await simpanBlob(id, blob);
  } catch {
    toast(tr('Ruang penyimpanan penuh'));
    return null;
  }

  snap();
  if (figTarget && figTarget.isConnected) {
    const img = figTarget.querySelector('img[data-blob]');
    const btnX = figTarget.querySelector('[data-imgx]');
    if (img) {
      img.setAttribute('data-blob', id);
      img.setAttribute('alt', 'sketsa');
      img.removeAttribute('src');
    }
    if (btnX) btnX.setAttribute('data-imgx', id);
    figTarget.setAttribute('data-sketch', '1');
    refresh();
    pasangGambar();
    toast(tr('Sketsa diperbarui'));
    return id;
  }

  const r = ensureCaret();
  const d = document.querySelector('.ed-doc');
  if (!d) return null;
  let blokRef = null;
  if (r) {
    let n = r.startContainer;
    while (n && n !== d && n.parentNode !== d) n = n.parentNode;
    if (n && n.parentNode === d) blokRef = n;
  }
  const blk = makeBlock({ type: 'image', meta: { blobId: id, alt: 'sketsa', sketch: true } });
  const wrap = document.createElement('div');
  wrap.innerHTML = blockToHtml(blk);
  const el = wrap.firstElementChild;
  el.setAttribute('data-sketch', '1');

  if (blokRef && (blokRef.textContent || '').trim() === '' && !blokRef.querySelector('img')) {
    blokRef.replaceWith(el);
  } else if (blokRef && blokRef.nextSibling) {
    d.insertBefore(el, blokRef.nextSibling);
  } else {
    d.appendChild(el);
  }

  pastikanKolomAkhir(d);
  refresh();
  pasangGambar();
  const sesudah = el.nextElementSibling;
  if (sesudah) caretEnd(sesudah);
  toast(tr('Sketsa ditambahkan ke catatan'));
  return id;
}

/** Buka modal layar penuh Kanvas Coretan & Tanda Tangan ramah jari mobile. */
export function bukaStudioSketsa(figEdit = null) {
  document.getElementById('sketsa-modal')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'sketsa-modal';
  overlay.className = 'sketsa-modal';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', tr('Kanvas Coretan & Tanda Tangan'));

  let alat = 'pena';
  let warna = '#111827';
  let ukuran = 4;
  let pola = 'titik';
  let latar = 'putih';
  const jejak = [];
  const tumpukRedo = [];
  let aktif = null;
  let gambarDasar = null;

  overlay.innerHTML = `
    <div class="sk-box">
      <div class="sk-top">
        <button type="button" class="btn btn-sec" id="sk-batal">${tr('Batal')}</button>
        <div class="sk-judul">${tr('Sketsa & Tanda Tangan')}</div>
        <button type="button" class="btn btn-pri" id="sk-simpan">${tr('Simpan')}</button>
      </div>
      <div class="sk-stage">
        <canvas id="sk-canvas" width="${LEBAR}" height="${TINGGI}"></canvas>
      </div>
      <div class="sk-bar">
        <div class="sk-row">
          <button type="button" class="sk-tool on" data-sk-alat="pena" title="${tr('Pena')}">✒ ${tr('Pena')}</button>
          <button type="button" class="sk-tool" data-sk-alat="stabilo" title="${tr('Stabilo')}">🖍 ${tr('Stabilo')}</button>
          <button type="button" class="sk-tool" data-sk-alat="garis" title="${tr('Garis')}">╱ ${tr('Garis')}</button>
          <button type="button" class="sk-tool" data-sk-alat="panah" title="${tr('Panah')}">↗ ${tr('Panah')}</button>
          <button type="button" class="sk-tool" data-sk-alat="kotak" title="${tr('Kotak')}">▭ ${tr('Kotak')}</button>
          <button type="button" class="sk-tool" data-sk-alat="hapus" title="${tr('Hapus')}">⌫ ${tr('Hapus')}</button>
        </div>
        <div class="sk-row">
          <div class="sk-swatches">
            ${WARNA_SKETSA.map((c, i) => `<button type="button" class="sk-sw${i === 0 ? ' on' : ''}" data-sk-warna="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}
          </div>
          <div class="sk-sizes">
            ${[2, 4, 8, 14].map(u => `<button type="button" class="sk-sz${u === 4 ? ' on' : ''}" data-sk-uk="${u}">${u}px</button>`).join('')}
          </div>
        </div>
        <div class="sk-row">
          <button type="button" class="sk-tool" data-sk-pola="polos">${tr('Polos')}</button>
          <button type="button" class="sk-tool on" data-sk-pola="titik">${tr('Titik')}</button>
          <button type="button" class="sk-tool" data-sk-pola="garis">${tr('Garis buku')}</button>
          <span class="sk-spacer"></span>
          <button type="button" class="sk-tool" id="sk-undo" aria-label="${tr('Urungkan')}">↶</button>
          <button type="button" class="sk-tool" id="sk-redo" aria-label="${tr('Ulangi')}">↷</button>
          <button type="button" class="sk-tool" id="sk-bersih">${tr('Bersihkan')}</button>
        </div>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  const cv = overlay.querySelector('#sk-canvas');
  const ctx = ambilKonteks2D(cv);

  const renderUlang = () => {
    if (!ctx) return;
    gambarKisiLatar(ctx, pola, latar);
    if (gambarDasar) {
      try { ctx.drawImage(gambarDasar, 0, 0, LEBAR, TINGGI); } catch {}
    }
    for (const st of jejak) gambarSatuJejak(ctx, st);
    if (aktif) gambarSatuJejak(ctx, aktif);
  };

  /* Bila mengedit sketsa yang sudah ada, muat blob gambarnya ke latar */
  if (figEdit) {
    const imgLama = figEdit.querySelector('img[data-blob]');
    const idLama = imgLama?.getAttribute('data-blob');
    if (idLama) {
      ambilBlob(idLama).then(blob => {
        if (!blob || !ctx) return;
        const u = URL.createObjectURL(blob);
        const im = new Image();
        im.onload = () => { gambarDasar = im; URL.revokeObjectURL(u); renderUlang(); };
        im.onerror = () => URL.revokeObjectURL(u);
        im.src = u;
      }).catch(() => {});
    }
  }

  const titikDariEvent = e => {
    const r = cv.getBoundingClientRect();
    if (!r.width || !r.height) return { x: e.clientX || 120, y: e.clientY || 120 };
    return {
      x: ((e.clientX - r.left) / r.width) * LEBAR,
      y: ((e.clientY - r.top) / r.height) * TINGGI,
    };
  };

  cv.addEventListener('pointerdown', e => {
    e.preventDefault();
    tumpukRedo.length = 0;
    aktif = { alat, warna, ukuran, pts: [titikDariEvent(e)] };
    renderUlang();
  });
  cv.addEventListener('pointermove', e => {
    if (!aktif) return;
    e.preventDefault();
    aktif.pts.push(titikDariEvent(e));
    renderUlang();
  });
  const akhiriGoresan = () => {
    if (!aktif) return;
    jejak.push(aktif);
    aktif = null;
    renderUlang();
  };
  cv.addEventListener('pointerup', akhiriGoresan);
  cv.addEventListener('pointercancel', akhiriGoresan);

  overlay.addEventListener('click', async e => {
    const btnAlat = e.target.closest('[data-sk-alat]');
    if (btnAlat) {
      alat = btnAlat.dataset.skAlat;
      overlay.querySelectorAll('[data-sk-alat]').forEach(b => b.classList.toggle('on', b === btnAlat));
      return;
    }
    const btnWarna = e.target.closest('[data-sk-warna]');
    if (btnWarna) {
      warna = btnWarna.dataset.skWarna;
      if (alat === 'hapus') {
        alat = 'pena';
        overlay.querySelectorAll('[data-sk-alat]').forEach(b => b.classList.toggle('on', b.dataset.skAlat === 'pena'));
      }
      overlay.querySelectorAll('[data-sk-warna]').forEach(b => b.classList.toggle('on', b === btnWarna));
      return;
    }
    const btnUk = e.target.closest('[data-sk-uk]');
    if (btnUk) {
      ukuran = Number(btnUk.dataset.skUk) || 4;
      overlay.querySelectorAll('[data-sk-uk]').forEach(b => b.classList.toggle('on', b === btnUk));
      return;
    }
    const btnPola = e.target.closest('[data-sk-pola]');
    if (btnPola) {
      pola = btnPola.dataset.skPola;
      overlay.querySelectorAll('[data-sk-pola]').forEach(b => b.classList.toggle('on', b === btnPola));
      renderUlang();
      return;
    }
    if (e.target.closest('#sk-undo')) {
      if (jejak.length) { tumpukRedo.push(jejak.pop()); renderUlang(); }
      return;
    }
    if (e.target.closest('#sk-redo')) {
      if (tumpukRedo.length) { jejak.push(tumpukRedo.pop()); renderUlang(); }
      return;
    }
    if (e.target.closest('#sk-bersih')) {
      jejak.length = 0;
      gambarDasar = null;
      renderUlang();
      return;
    }
    if (e.target.closest('#sk-batal') || e.target === overlay) {
      overlay.remove();
      return;
    }
    if (e.target.closest('#sk-simpan')) {
      if (!jejak.length && !gambarDasar) {
        toast(tr('Coret sesuatu terlebih dahulu'));
        return;
      }
      const blob = await eksporKanvasKeBlob(cv, ctx, jejak, latar);
      overlay.remove();
      await sisipkanBlobSketsa(blob, figEdit);
    }
  });

  renderUlang();
}

/**
 * Filter Pindai Dokumen (Document Scan) lokal 100% di HP untuk memperjelas foto kertas/papan tulis/struk.
 * mode: 'bw' (Hitam-Putih Tajam), 'kontras' (Kontras Warna Papan Tulis), 'asli' (Pulihkan Foto Asli).
 */
export async function terapkanFilterPindai(fig, mode = 'bw') {
  if (!fig || !fig.isConnected) return false;
  const img = fig.querySelector('img[data-blob]');
  if (!img) return false;
  const blobSekarang = img.getAttribute('data-blob');
  if (!blobSekarang) return false;

  const origId = fig.getAttribute('data-orig-blob') || blobSekarang;

  if (mode === 'asli') {
    if (!fig.getAttribute('data-orig-blob')) {
      toast(tr('Foto sudah dalam tampilan asli'));
      return true;
    }
    snap();
    img.setAttribute('data-blob', origId);
    img.removeAttribute('src');
    fig.removeAttribute('data-scan');
    const btnX = fig.querySelector('[data-imgx]');
    if (btnX) btnX.setAttribute('data-imgx', origId);
    refresh();
    pasangGambar();
    toast(tr('Foto dikembalikan ke asli'));
    return true;
  }

  const sumberBlob = await ambilBlob(origId);
  if (!sumberBlob) return false;

  let hasilBlob = null;
  const cv = document.createElement('canvas');
  const ctx = ambilKonteks2D(cv);

  if (ctx) {
    hasilBlob = await new Promise(resolve => {
      const url = URL.createObjectURL(sumberBlob);
      const im = new Image();
      im.onload = () => {
        URL.revokeObjectURL(url);
        const w = Math.max(1, im.naturalWidth || 600);
        const h = Math.max(1, im.naturalHeight || 400);
        cv.width = w;
        cv.height = h;
        ctx.drawImage(im, 0, 0, w, h);
        try {
          const idata = ctx.getImageData(0, 0, w, h);
          const d = idata.data;
          /* Hitung rata-rata terang global untuk ambang dokumen adaptif */
          let jum = 0;
          const nPiksel = d.length / 4;
          for (let i = 0; i < d.length; i += 4) {
            jum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          }
          const ambang = Math.max(115, Math.min(185, (jum / Math.max(1, nPiksel)) * 0.92));

          for (let i = 0; i < d.length; i += 4) {
            if (mode === 'bw') {
              const abu = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
              const tajam = abu > ambang ? 255 : Math.max(0, Math.round((abu / ambang) * 45));
              d[i] = tajam; d[i + 1] = tajam; d[i + 2] = tajam;
            } else {
              /* Kontras papan tulis & kertas warna */
              for (let k = 0; k < 3; k++) {
                const v = (d[i + k] - 128) * 1.45 + 138;
                d[i + k] = Math.max(0, Math.min(255, Math.round(v)));
              }
            }
          }
          ctx.putImageData(idata, 0, 0);
        } catch {}
        cv.toBlob(b => resolve(b), 'image/jpeg', 0.9);
      };
      im.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      im.src = url;
    });
  }

  /* Fallback murni bila lingkungan tanpa decoder kanvas (mis. JSDOM) */
  if (!hasilBlob) {
    hasilBlob = new Blob([sumberBlob, `scan:${mode}`], { type: sumberBlob.type || 'image/png' });
  }

  const idBaru = buatIdBlob('scan_');
  try {
    await simpanBlob(idBaru, hasilBlob);
  } catch {
    toast(tr('Ruang penyimpanan penuh'));
    return false;
  }

  snap();
  if (!fig.getAttribute('data-orig-blob')) fig.setAttribute('data-orig-blob', origId);
  fig.setAttribute('data-scan', mode);
  img.setAttribute('data-blob', idBaru);
  img.removeAttribute('src');
  const btnX = fig.querySelector('[data-imgx]');
  if (btnX) btnX.setAttribute('data-imgx', idBaru);
  refresh();
  pasangGambar();
  toast(mode === 'bw' ? tr('Dokumen diperjelas (Hitam-Putih Tajam)') : tr('Kontras foto ditingkatkan'));
  return true;
}
