/**
 * Studio Kanvas Coretan & Tanda Tangan (/sketch) + Filter Pindai Dokumen Foto (Document Scan).
 * Dirancang 100% mobile-first untuk layar sentuh Android (target sentuh >=42px, touch-action: none,
 * serta fallback SVG/Blob murni agar tetap berjalan mulus di lingkungan uji tanpa GPU canvas).
 */

import { simpanBlob, ambilBlob } from '../../core/blobs.js?v=20261025065303';
import { toast } from '../../core/toast.js?v=20261025065303';
import { t as tr } from '../../core/i18n.js?v=20261025065303';
import { ensureCaret, caretEnd } from './caret.js?v=20261025065303';
import { makeBlock, blockToHtml } from '../note-model.js?v=20261025065303';
import { refresh } from './cleanup.js?v=20261025065303';
import { snap } from './history.js?v=20261025065303';
import { pasangGambar } from './image.js?v=20261025065303';
import { pastikanKolomAkhir } from './blocks.js?v=20261025065303';
import { bacaGoresan, serialGoresan, hitObjek, KANVAS_BATAS, faktorGaya } from './goresan.js?v=20261025065303';
import { lapisanAwal, bisaDiedit, tambahLapisan, hapusLapisan, pindahLapisan, urutanGambar, urutanRender } from './lapisan.js?v=20261025065303';
import { daftarPreset, simpanPresetKustom, hapusPresetKustom, MAKS_PRESET_KUSTOM } from './preset-pena.js?v=20261025065303';
import { kenaliBentuk } from './bentuk.js?v=20261025065303';

/* A4: berapa lama ujung dibiarkan diam sebelum coretan dikenali sebagai bentuk. */
const JEDA_TAHAN_MS = 650;
const JARAK_BATAL_TAHAN = 12;

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

function svgDariJejak(jejak, latar, w = LEBAR, h = TINGGI) {
  const bgRect = latar === 'gelap'
    ? `<rect width="${w}" height="${h}" fill="#18181b"/>`
    : latar === 'putih'
      ? `<rect width="${w}" height="${h}" fill="#ffffff"/>`
      : '';
  const isi = jejak.map(st => {
    const gy = st.alat === 'pena' ? faktorGaya(st.gaya) : { skala: 1, alpha: 1 };
    const op = st.alat === 'stabilo' ? 0.36 : gy.alpha;
    const lebar = st.ukuran * gy.skala;
    if (st.alat === 'elips' && st.pts.length >= 2) {
      const a = st.pts[0], b = st.pts[st.pts.length - 1];
      const rx = Math.abs(b.x - a.x) / 2, ry = Math.abs(b.y - a.y) / 2;
      return `<ellipse cx="${Math.min(a.x, b.x) + rx}" cy="${Math.min(a.y, b.y) + ry}" rx="${rx}" ry="${ry}" fill="none" stroke="${st.warna}" stroke-width="${st.ukuran}"/>`;
    }
    if (st.alat === 'poligon' && st.pts.length >= 3) {
      return `<polygon points="${st.pts.map(p => `${p.x},${p.y}`).join(' ')}" fill="none" stroke="${st.warna}" stroke-width="${st.ukuran}" stroke-linejoin="round"/>`;
    }
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
      return `<circle cx="${p.x}" cy="${p.y}" r="${Math.max(2, lebar / 2)}" fill="${st.warna}" opacity="${op}"/>`;
    }
    const d = st.pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${Math.round(p.x)} ${Math.round(p.y)}`).join(' ');
    return `<path d="${d}" fill="none" stroke="${st.warna}" stroke-width="${lebar}" stroke-linecap="round" stroke-linejoin="round" opacity="${op}"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bgRect}${isi}</svg>`;
}

/* Objek visual di kanvas: gambar, atau kotak abu-abu bila gambar belum/tidak bisa dimuat. */
function gambarSatuObjek(ctx, o, img, dipilih) {
  if (!ctx) return;
  ctx.save();
  if (img) {
    try { ctx.drawImage(img, o.x, o.y, o.w, o.h); } catch {}
  } else {
    ctx.fillStyle = 'rgba(148,163,184,0.25)';
    ctx.fillRect(o.x, o.y, o.w, o.h);
  }
  if (dipilih) {
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#2563eb';
    ctx.strokeRect(o.x, o.y, o.w, o.h);
  }
  ctx.restore();
}

/* Ukuran asli gambar. Bila gagal dimuat atau tidak ada jawaban, pakai ukuran cadangan. */
function ukuranGambarBerkas(berkas) {
  const cadangan = { w: 300, h: 200 };
  return new Promise(resolve => {
    let selesai = false;
    const u = URL.createObjectURL(berkas);
    const selesaikan = hasil => {
      if (selesai) return;
      selesai = true;
      clearTimeout(batas);
      URL.revokeObjectURL(u);
      resolve(hasil);
    };
    const batas = setTimeout(() => selesaikan(cadangan), 1500);
    try {
      const im = new Image();
      im.onload = () => selesaikan(im.naturalWidth && im.naturalHeight
        ? { w: im.naturalWidth, h: im.naturalHeight } : cadangan);
      im.onerror = () => selesaikan(cadangan);
      im.src = u;
    } catch {
      selesaikan(cadangan);
    }
  });
}

async function eksporKanvasKeBlob(cv, ctx, jejak, latar) {
  if (ctx && typeof cv.toBlob === 'function') {
    const blob = await new Promise(resolve => {
      try { cv.toBlob(b => resolve(b), 'image/png'); }
      catch { resolve(null); }
    });
    if (blob) return blob;
  }
  const svg = svgDariJejak(jejak, latar, cv.width || LEBAR, cv.height || TINGGI);
  return new Blob([svg], { type: 'image/svg+xml' });
}

function gambarKisiLatar(ctx, pola, latar, w = LEBAR, h = TINGGI) {
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  if (latar === 'putih') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
  } else if (latar === 'gelap') {
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, w, h);
  }
  if (pola === 'titik') {
    ctx.fillStyle = latar === 'gelap' ? 'rgba(255,255,255,0.16)' : 'rgba(15,23,42,0.16)';
    for (let y = 24; y < h; y += 24) {
      for (let x = 24; x < w; x += 24) {
        ctx.beginPath();
        ctx.arc(x, y, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (pola === 'garis') {
    ctx.strokeStyle = latar === 'gelap' ? 'rgba(255,255,255,0.12)' : 'rgba(37,99,235,0.14)';
    ctx.lineWidth = 1;
    for (let y = 32; y < h; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
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
    const gy = st.alat === 'pena' ? faktorGaya(st.gaya) : { skala: 1, alpha: 1 };
    ctx.lineWidth = st.alat === 'stabilo' ? st.ukuran * 2.6 : st.ukuran * gy.skala;
    ctx.globalAlpha = st.alat === 'stabilo' ? 0.34 : gy.alpha;
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const a = st.pts[0];
  const b = st.pts[st.pts.length - 1];
  if (st.alat === 'elips' && st.pts.length >= 2) {
    const rx = Math.abs(b.x - a.x) / 2, ry = Math.abs(b.y - a.y) / 2;
    ctx.beginPath();
    ctx.ellipse(Math.min(a.x, b.x) + rx, Math.min(a.y, b.y) + ry, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }
  if (st.alat === 'poligon' && st.pts.length >= 3) {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    for (let i = 1; i < st.pts.length; i++) ctx.lineTo(st.pts[i].x, st.pts[i].y);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    return;
  }
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
export async function sisipkanBlobSketsa(blob, figTarget = null, goresanSimpan = '') {
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
    if (goresanSimpan) figTarget.setAttribute('data-goresan', goresanSimpan);
    else figTarget.removeAttribute('data-goresan');
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
  const meta = { blobId: id, alt: 'sketsa', sketch: true };
  if (goresanSimpan) meta.goresan = goresanSimpan;
  const blk = makeBlock({ type: 'image', meta });
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
  /* A3: gaya sapuan pena (tinta, kuas, pensil). Hanya berlaku untuk alat pena. */
  let gaya = 'tinta';
  let pola = 'titik';
  let latar = 'putih';
  const jejak = [];
  const tumpukRedo = [];
  let aktif = null;
  let gambarDasar = null;
  /* true bila sketsa punya latar gambar (foto atau sketsa lama berbentuk PNG).
     Dalam kondisi itu goresan tidak disimpan sebagai data, hanya gambar hasil. */
  let adaLatarFoto = false;
  /* Objek visual (gambar yang dipindah & diubah ukurannya). Akhir daftar = paling atas. */
  const objek = [];
  let pilihanId = null;
  /* A5: lapisan. Urutan array = tumpukan (akhir = paling atas). Lapisan aktif menerima goresan dan objek baru. */
  let lapisan = lapisanAwal();
  let lapisanAktif = lapisan[0].id;
  let seret = null;
  const gambarObjekCache = new Map();
  /* A7: ukuran kanvas kerja (default 720×460). A6: zoom hanya ukuran tampilan. */
  let kw = LEBAR;
  let kh = TINGGI;
  let zoom = 1;
  let geser = null;
  /* A4: bentuk yang sedang dipratinjau atau baru dipakai. asli = coretan sebelum dikenali. */
  let bentukSementara = null;

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
      <div class="sk-bentuk" id="sk-bentuk" hidden>
        <span class="sk-bentuk-nama" id="sk-bentuk-nama" aria-live="polite"></span>
        <button type="button" class="sk-tool" id="sk-bentuk-batal">${tr('Coretan asli')}</button>
        <button type="button" class="sk-tool on" id="sk-bentuk-pakai">${tr('Pakai bentuk')}</button>
      </div>
      <div class="sk-bar">
        <div class="sk-row">
          <button type="button" class="sk-tool" data-sk-alat="geser" title="${tr('Geser tampilan')}"><svg class="ico"><use href="#i-finger"/></svg>${tr('Geser')}</button>
          <button type="button" class="sk-tool" data-sk-alat="pilih" title="${tr('Pilih & pindahkan')}"><svg class="ico"><use href="#i-move"/></svg>${tr('Pilih')}</button>
          <button type="button" class="sk-tool on" data-sk-alat="pena" title="${tr('Pena')}"><svg class="ico"><use href="#i-pen"/></svg>${tr('Pena')}</button>
          <button type="button" class="sk-tool" data-sk-alat="stabilo" title="${tr('Stabilo')}"><svg class="ico"><use href="#i-marker"/></svg>${tr('Stabilo')}</button>
          <button type="button" class="sk-tool" data-sk-alat="garis" title="${tr('Garis')}"><svg class="ico"><use href="#i-minus"/></svg>${tr('Garis')}</button>
          <button type="button" class="sk-tool" data-sk-alat="panah" title="${tr('Panah')}"><svg class="ico"><use href="#i-arrow-ne"/></svg>${tr('Panah')}</button>
          <button type="button" class="sk-tool" data-sk-alat="kotak" title="${tr('Kotak')}"><svg class="ico"><use href="#i-square"/></svg>${tr('Kotak')}</button>
          <button type="button" class="sk-tool" data-sk-alat="hapus" title="${tr('Hapus')}"><svg class="ico"><use href="#i-eraser"/></svg>${tr('Hapus')}</button>
        </div>
        <div class="sk-row">
          <div class="sk-swatches">
            ${WARNA_SKETSA.map((c, i) => `<button type="button" class="sk-sw${i === 0 ? ' on' : ''}" data-sk-warna="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}
          </div>
          <div class="sk-sizes">
            ${[2, 4, 8, 14].map(u => `<button type="button" class="sk-sz${u === 4 ? ' on' : ''}" data-sk-uk="${u}">${u}px</button>`).join('')}
          </div>
        </div>
        <div class="sk-row" id="sk-lapisan-baris"></div>
        <div class="sk-row" id="sk-presets-baris"></div>
        <div class="sk-row">
          <button type="button" class="sk-tool" id="sk-zoom-kecil" title="${tr('Perkecil tampilan')}">−</button>
          <button type="button" class="sk-tool" id="sk-zoom-reset" title="${tr('Tampilan pas layar')}">100%</button>
          <button type="button" class="sk-tool" id="sk-zoom-besar" title="${tr('Perbesar tampilan')}">+</button>
          <span class="sk-spacer"></span>
          <button type="button" class="sk-tool" id="sk-lebar-kecil">${tr('Lebar')} −</button>
          <button type="button" class="sk-tool" id="sk-lebar-besar">${tr('Lebar')} +</button>
          <button type="button" class="sk-tool" id="sk-tinggi-kecil">${tr('Tinggi')} −</button>
          <button type="button" class="sk-tool" id="sk-tinggi-besar">${tr('Tinggi')} +</button>
          <span class="sk-kanvas-info" id="sk-kanvas-info" aria-live="polite"></span>
        </div>
        <div class="sk-row">
          <button type="button" class="sk-tool" id="sk-tambah-gambar"><svg class="ico"><use href="#i-img"/></svg>${tr('Tambah gambar')}</button>
          <button type="button" class="sk-tool" id="sk-besar" disabled>${tr('Perbesar')}</button>
          <button type="button" class="sk-tool" id="sk-kecil" disabled>${tr('Perkecil')}</button>
          <button type="button" class="sk-tool" id="sk-hapus-objek" disabled><svg class="ico"><use href="#i-trash"/></svg>${tr('Hapus objek')}</button>
        </div>
        <div class="sk-row">
          <button type="button" class="sk-tool" data-sk-pola="polos">${tr('Polos')}</button>
          <button type="button" class="sk-tool on" data-sk-pola="titik">${tr('Titik')}</button>
          <button type="button" class="sk-tool" data-sk-pola="garis">${tr('Garis buku')}</button>
          <span class="sk-spacer"></span>
          <button type="button" class="sk-tool sk-ikon" id="sk-undo" aria-label="${tr('Urungkan')}" title="${tr('Urungkan')}"><svg class="ico"><use href="#i-undo"/></svg></button>
          <button type="button" class="sk-tool sk-ikon" id="sk-redo" aria-label="${tr('Ulangi')}" title="${tr('Ulangi')}"><svg class="ico"><use href="#i-redo"/></svg></button>
          <button type="button" class="sk-tool" id="sk-bersih">${tr('Bersihkan')}</button>
        </div>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  const cv = overlay.querySelector('#sk-canvas');
  const ctx = ambilKonteks2D(cv);

  const gambarObjekDiKanvas = o => {
    if (!gambarObjekCache.has(o.blob)) {
      gambarObjekCache.set(o.blob, null);
      ambilBlob(o.blob).then(blob => {
        if (!blob) return;
        const u = URL.createObjectURL(blob);
        const im = new Image();
        im.onload = () => { gambarObjekCache.set(o.blob, im); URL.revokeObjectURL(u); renderUlang(); };
        im.onerror = () => URL.revokeObjectURL(u);
        im.src = u;
      }).catch(() => {});
    }
    return gambarObjekCache.get(o.blob);
  };

  const perbaruiBarObjek = () => {
    const ada = objek.some(o => o.id === pilihanId);
    ['sk-besar', 'sk-kecil', 'sk-hapus-objek'].forEach(id => {
      const b = overlay.querySelector('#' + id);
      if (b) b.disabled = !ada;
    });
  };

  const tambahObjekDariBerkas = async berkas => {
    if (!lapisanAktifBolehDiedit()) return;
    const blobId = buatIdBlob('ob_');
    try { await simpanBlob(blobId, berkas); }
    catch { toast(tr('Ruang penyimpanan penuh')); return; }
    const dim = await ukuranGambarBerkas(berkas);
    const skala = Math.min(1, (kw * 0.5) / dim.w);
    const w = dim.w * skala;
    const h = dim.h * skala;
    const id = 'o' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    objek.push({ id, blob: blobId, x: (kw - w) / 2, y: (kh - h) / 2, w, h, lapisan: lapisanAktif });
    pilihanId = id;
    perbaruiBarObjek();
    renderUlang();
  };

  const ubahUkuranPilihan = faktor => {
    const o = objek.find(x => x.id === pilihanId);
    if (!o) return;
    const cx = o.x + o.w / 2;
    const cy = o.y + o.h / 2;
    o.w = Math.max(8, o.w * faktor);
    o.h = Math.max(8, o.h * faktor);
    o.x = cx - o.w / 2;
    o.y = cy - o.h / 2;
    renderUlang();
  };

  const stage = overlay.querySelector('.sk-stage');

  const perbaruiInfoKanvas = () => {
    const info = overlay.querySelector('#sk-kanvas-info');
    if (info) info.textContent = kw + '×' + kh;
  };

  /* A6: skala pas layar (sama dengan tampilan awal), dikali zoom */
  /* A8: di landscape pendek, kanvas mengisi tinggi stage (bukan 54% tinggi layar), supaya zoom 100% tidak melompat */
  const landscapePendek = () => !!(window.matchMedia && window.matchMedia('(orientation: landscape) and (max-height: 600px)').matches);
  const skalaPasLayar = () => {
    const lebarTersedia = stage ? stage.clientWidth - 16 : 0;
    if (lebarTersedia <= 0) return 1;
    const tinggiStage = stage ? stage.clientHeight - 16 : 0;
    const tinggiTersedia = landscapePendek() && tinggiStage > 0 ? tinggiStage : (window.innerHeight || 800) * 0.54;
    return Math.min(lebarTersedia / kw, tinggiTersedia / kh);
  };

  const terapkanZoom = () => {
    cv.style.aspectRatio = kw + '/' + kh;
    if (zoom === 1) {
      cv.style.width = '';
      cv.style.height = '';
      cv.style.maxHeight = '';
      cv.style.maxWidth = '';
    } else {
      const skala = skalaPasLayar() * zoom;
      cv.style.width = Math.round(kw * skala) + 'px';
      cv.style.height = Math.round(kh * skala) + 'px';
      cv.style.maxHeight = 'none';
      /* A8: di landscape CSS memberi max-width:100%; zoom harus bisa melebihi lebar stage (digulir) */
      cv.style.maxWidth = 'none';
      cv.style.aspectRatio = 'auto';
    }
    const tombol = overlay.querySelector('#sk-zoom-reset');
    if (tombol) tombol.textContent = Math.round(zoom * 100) + '%';
  };

  const ubahZoom = delta => {
    zoom = Math.min(4, Math.max(0.5, Math.round((zoom + delta) * 100) / 100));
    terapkanZoom();
    if (stage && zoom !== 1) {
      stage.scrollLeft = Math.max(0, (stage.scrollWidth - stage.clientWidth) / 2);
      stage.scrollTop = Math.max(0, (stage.scrollHeight - stage.clientHeight) / 2);
    }
  };

  /* A7: saat mengecilkan, tidak boleh ada goresan atau objek yang keluar dari sisi kanan/bawah */
  const muatDalamKanvas = (nw, nh) => {
    for (const st of jejak) for (const p of st.pts) if (p.x > nw || p.y > nh) return false;
    for (const o of objek) if (o.x + o.w > nw || o.y + o.h > nh) return false;
    return true;
  };

  const ubahKanvas = (dw, dh) => {
    if (adaLatarFoto) {
      toast(tr('Sketsa berlatar foto tidak bisa diubah ukuran kanvasnya'));
      return;
    }
    const nw = Math.min(KANVAS_BATAS.maxW, Math.max(KANVAS_BATAS.minW, kw + dw));
    const nh = Math.min(KANVAS_BATAS.maxH, Math.max(KANVAS_BATAS.minH, kh + dh));
    if (nw === kw && nh === kh) {
      toast(tr('Ukuran kanvas sudah mencapai batas'));
      return;
    }
    if ((nw < kw || nh < kh) && !muatDalamKanvas(nw, nh)) {
      toast(tr('Ada goresan atau objek di luar area baru'));
      return;
    }
    kw = nw;
    kh = nh;
    cv.width = kw;
    cv.height = kh;
    perbaruiInfoKanvas();
    terapkanZoom();
    renderUlang();
  };

  /* A4: pengenalan bentuk. Ujung yang ditahan diam sebentar mengganti coretan dengan bentuk rapi.
     Bentuk tampil dulu; pengguna bisa memakai bentuk atau kembali ke coretan asli. */
  const barBentuk = overlay.querySelector('#sk-bentuk');
  const sembunyiBentuk = () => { if (barBentuk) barBentuk.hidden = true; };
  const tampilBentuk = nama => {
    if (!barBentuk) return;
    barBentuk.querySelector('#sk-bentuk-nama').textContent = tr('Bentuk dikenali') + ': ' + tr(nama);
    barBentuk.hidden = false;
  };
  let timerTahan = null;
  let titikTahan = null;
  const hentikanTimerTahan = () => { clearTimeout(timerTahan); timerTahan = null; };
  const mulaiTimerTahan = () => {
    hentikanTimerTahan();
    timerTahan = setTimeout(tahanTerdeteksi, JEDA_TAHAN_MS);
  };
  const tahanTerdeteksi = () => {
    timerTahan = null;
    if (!aktif || alat !== 'pena' || bentukSementara) return;
    const hasil = kenaliBentuk(aktif.pts);
    if (!hasil) return;
    const asli = aktif;
    const bentuk = { alat: hasil.alat, warna: asli.warna, ukuran: asli.ukuran, gaya: 'tinta', lapisan: asli.lapisan, pts: hasil.pts };
    bentukSementara = { asli, bentuk, nama: hasil.nama };
    titikTahan = asli.pts[asli.pts.length - 1];
    aktif = bentuk;
    tampilBentuk(hasil.nama);
    renderUlang();
  };
  /* Jari bergerak lagi setelah ditahan: kembali ke coretan asli dan lanjut menggambar. */
  const batalkanTahanBentuk = () => {
    if (!bentukSementara) return;
    aktif = bentukSementara.asli;
    bentukSementara = null;
    sembunyiBentuk();
  };

  /* A3: preset gaya pena. Bawaan dan kustom muncul di satu baris; kustom bisa disimpan dan dihapus. */
  const barPreset = overlay.querySelector('#sk-presets-baris');
  const presetCocok = p => alat === 'pena' && p.warna === warna && p.ukuran === ukuran && p.gaya === gaya;

  const tandaPreset = () => {
    if (!barPreset) return;
    const daftar = daftarPreset();
    const cocok = daftar.find(p => !p.bawaan && presetCocok(p)) || daftar.find(presetCocok) || null;
    barPreset.querySelectorAll('[data-sk-preset]').forEach(b => b.classList.toggle('on', !!cocok && b.dataset.skPreset === cocok.id));
    const hapus = barPreset.querySelector('#sk-preset-hapus');
    if (hapus) hapus.disabled = !cocok || cocok.bawaan;
  };

  const bangunBarPreset = () => {
    if (!barPreset) return;
    barPreset.replaceChildren();
    for (const p of daftarPreset()) {
      const nama = p.bawaan ? tr(p.nama) : p.nama;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'sk-tool';
      b.dataset.skPreset = p.id;
      b.title = `${nama} · ${p.ukuran}px`;
      const titik = document.createElement('span');
      titik.className = 'sk-pdot';
      titik.style.background = p.warna;
      b.append(titik, document.createTextNode(' ' + nama));
      barPreset.appendChild(b);
    }
    const simpan = document.createElement('button');
    simpan.type = 'button';
    simpan.className = 'sk-tool';
    simpan.id = 'sk-preset-simpan';
    simpan.textContent = tr('Simpan preset');
    const hapus = document.createElement('button');
    hapus.type = 'button';
    hapus.className = 'sk-tool';
    hapus.id = 'sk-preset-hapus';
    hapus.textContent = tr('Hapus preset');
    barPreset.append(simpan, hapus);
    tandaPreset();
  };

  const terapkanPreset = p => {
    alat = 'pena';
    warna = p.warna;
    ukuran = p.ukuran;
    gaya = p.gaya;
    overlay.querySelectorAll('[data-sk-alat]').forEach(b => b.classList.toggle('on', b.dataset.skAlat === 'pena'));
    overlay.querySelectorAll('[data-sk-warna]').forEach(b => b.classList.toggle('on', b.dataset.skWarna.toLowerCase() === warna));
    overlay.querySelectorAll('[data-sk-uk]').forEach(b => b.classList.toggle('on', Number(b.dataset.skUk) === ukuran));
    if (pilihanId) { pilihanId = null; perbaruiBarObjek(); renderUlang(); }
    tandaPreset();
  };

  const aksiSimpanPreset = () => {
    const hasil = simpanPresetKustom({ warna, ukuran, gaya });
    if (!hasil.ok) {
      toast(hasil.alasan === 'penuh'
        ? tr('Preset kustom sudah penuh (maks {n}). Hapus salah satu dulu.', { n: MAKS_PRESET_KUSTOM })
        : hasil.alasan === 'ada'
          ? tr('Gaya ini sudah tersimpan sebagai preset')
          : tr('Preset tidak bisa disimpan'));
      return;
    }
    bangunBarPreset();
    toast(tr('Preset disimpan'));
  };

  const aksiHapusPreset = () => {
    const cocok = daftarPreset().find(p => !p.bawaan && presetCocok(p));
    if (!cocok) { toast(tr('Pilih preset kustom dulu')); return; }
    hapusPresetKustom(cocok.id);
    bangunBarPreset();
    toast(tr('Preset dihapus'));
  };

  bangunBarPreset();

  /* A5: lapisan. Lapisan aktif menerima goresan dan objek baru. Lapisan tersembunyi atau terkunci tidak bisa diedit. */
  const pesanLapisanTerkunci = () => tr('Lapisan ini terkunci atau disembunyikan');
  const lapisanAktifBolehDiedit = () => {
    if (bisaDiedit(lapisan, lapisanAktif)) return true;
    toast(pesanLapisanTerkunci());
    return false;
  };
  const lepasPilihanTerkunci = () => {
    const o = objek.find(x => x.id === pilihanId);
    if (o && !bisaDiedit(lapisan, o.lapisan)) pilihanId = null;
  };
  const buatTombol = (id, teks, cls) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    if (id) b.id = id;
    b.textContent = teks;
    return b;
  };
  const bangunBarLapisan = () => {
    const baris = overlay.querySelector('#sk-lapisan-baris');
    if (!baris) return;
    const idx = lapisan.findIndex(l => l.id === lapisanAktif);
    const label = document.createElement('span');
    label.className = 'sk-lap-label';
    label.textContent = tr('Lapisan');
    baris.replaceChildren(label);
    /* urutan dari bawah ke atas, sama dengan urutan array */
    for (const l of lapisan) {
      const grup = document.createElement('span');
      grup.className = 'sk-lap' + (l.id === lapisanAktif ? ' on' : '') + (bisaDiedit(lapisan, l.id) ? '' : ' kunci');
      const nama = buatTombol('', l.nama, 'sk-tool sk-lap-nama');
      nama.dataset.skLap = l.id;
      nama.setAttribute('aria-pressed', String(l.id === lapisanAktif));
      const tampil = buatTombol('', l.tampil ? tr('Sembunyikan') : tr('Tampilkan'), 'sk-tool sk-lap-aksi');
      tampil.dataset.skLapTampil = l.id;
      const kunci = buatTombol('', l.kunci ? tr('Buka kunci') : tr('Kunci'), 'sk-tool sk-lap-aksi');
      kunci.dataset.skLapKunci = l.id;
      grup.append(nama, tampil, kunci);
      baris.append(grup);
    }
    const tambah = buatTombol('sk-lap-tambah', tr('Lapisan baru'), 'sk-tool');
    const naik = buatTombol('sk-lap-naik', tr('Naik'), 'sk-tool');
    naik.disabled = idx >= lapisan.length - 1;
    const turun = buatTombol('sk-lap-turun', tr('Turun'), 'sk-tool');
    turun.disabled = idx <= 0;
    const hapus = buatTombol('sk-lap-hapus', tr('Hapus lapisan'), 'sk-tool');
    hapus.disabled = lapisan.length <= 1;
    baris.append(tambah, naik, turun, hapus);
  };
  bangunBarLapisan();

  const renderUlang = () => {
    if (!ctx) return;
    gambarKisiLatar(ctx, pola, latar, kw, kh);
    if (gambarDasar) {
      try { ctx.drawImage(gambarDasar, 0, 0, kw, kh); } catch {}
    }
    /* A5: per lapisan dari bawah; objek di bawah goresan dalam satu lapisan (A2); lapisan tersembunyi dilewati */
    for (const r of urutanRender(lapisan, objek, aktif ? [...jejak, aktif] : jejak)) {
      if (r.tipe === 'objek') gambarSatuObjek(ctx, r.item, gambarObjekDiKanvas(r.item), r.item.id === pilihanId);
      else gambarSatuJejak(ctx, r.item);
    }
  };

  /* Bila mengedit sketsa yang sudah ada, muat blob gambarnya ke latar */
  if (figEdit) {
    /* Sketsa yang menyimpan goresan (data-goresan) dimuat sebagai objek, bukan PNG.
       Gambar yang sudah di-scan atau foto biasa tetap memakai jalur PNG lama. */
    const gor = figEdit.hasAttribute('data-scan') || figEdit.hasAttribute('data-orig-blob')
      ? null
      : bacaGoresan(figEdit.getAttribute('data-goresan') || '');
    if (gor && (gor.goresan.length || gor.objek.length
      || gor.kanvas.w !== LEBAR || gor.kanvas.h !== TINGGI
      || JSON.stringify(gor.lapisan) !== JSON.stringify(lapisanAwal()))) {
      kw = gor.kanvas.w;
      kh = gor.kanvas.h;
      cv.width = kw;
      cv.height = kh;
      jejak.push(...gor.goresan);
      objek.push(...gor.objek);
      lapisan = gor.lapisan;
      lapisanAktif = ([...lapisan].reverse().find(l => bisaDiedit(lapisan, l.id)) || lapisan[0]).id;
      bangunBarLapisan();
      latar = gor.latar;
      pola = gor.pola;
      overlay.querySelectorAll('[data-sk-pola]').forEach(b => b.classList.toggle('on', b.dataset.skPola === pola));
    } else {
      adaLatarFoto = true;
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
  }

  const titikDariEvent = e => {
    const r = cv.getBoundingClientRect();
    if (!r.width || !r.height) return { x: e.clientX || 120, y: e.clientY || 120 };
    return {
      x: ((e.clientX - r.left) / r.width) * kw,
      y: ((e.clientY - r.top) / r.height) * kh,
    };
  };

  /* Tekan-tahan lama di Android bisa memunculkan menu konteks dan mengganggu coretan */
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('pointerdown', e => {
    e.preventDefault();
    sembunyiBentuk();
    bentukSementara = null;
    if (alat === 'geser') {
      /* A6: alat Geser menggeser area tampilan yang di-zoom, tidak menggambar */
      geser = { x: e.clientX, y: e.clientY, l: stage.scrollLeft, t: stage.scrollTop };
      return;
    }
    const p = titikDariEvent(e);
    if (alat === 'pilih') {
      /* A5: hanya objek di lapisan yang bisa diedit yang bisa dipilih */
      const bisa = objek.filter(o => bisaDiedit(lapisan, o.lapisan));
      const i = hitObjek(bisa, p.x, p.y);
      pilihanId = null;
      if (i < 0 && hitObjek(objek, p.x, p.y) >= 0) toast(pesanLapisanTerkunci());
      if (i >= 0) {
        const o = bisa[i];
        /* objek yang disentuh dipindah ke atas tumpukan lalu ikut digeser */
        objek.splice(objek.indexOf(o), 1);
        objek.push(o);
        pilihanId = o.id;
        seret = { id: o.id, dx: p.x - o.x, dy: p.y - o.y };
      }
      perbaruiBarObjek();
      renderUlang();
      return;
    }
    if (!lapisanAktifBolehDiedit()) return;
    tumpukRedo.length = 0;
    aktif = { alat, warna, ukuran, ...(alat === 'pena' ? { gaya } : {}), lapisan: lapisanAktif, pts: [p] };
    mulaiTimerTahan();
    renderUlang();
  });
  cv.addEventListener('pointermove', e => {
    if (geser) {
      e.preventDefault();
      stage.scrollLeft = geser.l - (e.clientX - geser.x);
      stage.scrollTop = geser.t - (e.clientY - geser.y);
      return;
    }
    if (seret) {
      e.preventDefault();
      const o = objek.find(x => x.id === seret.id);
      if (o) {
        const p = titikDariEvent(e);
        o.x = p.x - seret.dx;
        o.y = p.y - seret.dy;
        renderUlang();
      }
      return;
    }
    if (!aktif) return;
    e.preventDefault();
    const p = titikDariEvent(e);
    if (bentukSementara) {
      /* Gerak kecil saat menahan (getaran jari) diabaikan; gerak jauh membatalkan pengenalan */
      if (Math.hypot(p.x - titikTahan.x, p.y - titikTahan.y) <= JARAK_BATAL_TAHAN) return;
      batalkanTahanBentuk();
    }
    aktif.pts.push(p);
    mulaiTimerTahan();
    renderUlang();
  });
  const akhiriGoresan = () => {
    hentikanTimerTahan();
    if (geser) { geser = null; return; }
    if (seret) { seret = null; return; }
    if (!aktif) return;
    jejak.push(aktif);
    aktif = null;
    renderUlang();
  };
  cv.addEventListener('pointerup', akhiriGoresan);
  cv.addEventListener('pointercancel', akhiriGoresan);

  overlay.addEventListener('click', async e => {
    const btnPreset = e.target.closest('[data-sk-preset]');
    if (btnPreset) {
      const p = daftarPreset().find(x => x.id === btnPreset.dataset.skPreset);
      if (p) terapkanPreset(p);
      return;
    }
    if (e.target.closest('#sk-preset-simpan')) { aksiSimpanPreset(); return; }
    if (e.target.closest('#sk-preset-hapus')) { aksiHapusPreset(); return; }
    const btnAlat = e.target.closest('[data-sk-alat]');
    if (btnAlat) {
      alat = btnAlat.dataset.skAlat;
      overlay.querySelectorAll('[data-sk-alat]').forEach(b => b.classList.toggle('on', b === btnAlat));
      if (alat !== 'pilih' && pilihanId) { pilihanId = null; perbaruiBarObjek(); renderUlang(); }
      tandaPreset();
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
      tandaPreset();
      return;
    }
    const btnUk = e.target.closest('[data-sk-uk]');
    if (btnUk) {
      ukuran = Number(btnUk.dataset.skUk) || 4;
      overlay.querySelectorAll('[data-sk-uk]').forEach(b => b.classList.toggle('on', b === btnUk));
      tandaPreset();
      return;
    }
    const btnPola = e.target.closest('[data-sk-pola]');
    if (btnPola) {
      pola = btnPola.dataset.skPola;
      overlay.querySelectorAll('[data-sk-pola]').forEach(b => b.classList.toggle('on', b === btnPola));
      renderUlang();
      return;
    }
    if (e.target.closest('#sk-zoom-besar')) { ubahZoom(0.25); return; }
    if (e.target.closest('#sk-zoom-kecil')) { ubahZoom(-0.25); return; }
    if (e.target.closest('#sk-zoom-reset')) { zoom = 1; terapkanZoom(); return; }
    if (e.target.closest('#sk-lebar-besar')) { ubahKanvas(KANVAS_BATAS.langkah, 0); return; }
    if (e.target.closest('#sk-lebar-kecil')) { ubahKanvas(-KANVAS_BATAS.langkah, 0); return; }
    if (e.target.closest('#sk-tinggi-besar')) { ubahKanvas(0, KANVAS_BATAS.langkah); return; }
    if (e.target.closest('#sk-tinggi-kecil')) { ubahKanvas(0, -KANVAS_BATAS.langkah); return; }
    if (e.target.closest('#sk-tambah-gambar')) {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = 'image/*';
      inp.onchange = () => {
        const berkas = inp.files && inp.files[0];
        if (berkas) tambahObjekDariBerkas(berkas);
      };
      inp.click();
      return;
    }
    /* A5: baris lapisan */
    const lapPilih = e.target.closest('[data-sk-lap]');
    if (lapPilih) { lapisanAktif = lapPilih.dataset.skLap; bangunBarLapisan(); return; }
    const lapTampil = e.target.closest('[data-sk-lap-tampil]');
    const lapKunci = e.target.closest('[data-sk-lap-kunci]');
    if (lapTampil || lapKunci) {
      const l = lapisan.find(x => x.id === (lapTampil || lapKunci).dataset[lapTampil ? 'skLapTampil' : 'skLapKunci']);
      if (l) { if (lapTampil) l.tampil = !l.tampil; else l.kunci = !l.kunci; }
      lepasPilihanTerkunci();
      perbaruiBarObjek();
      bangunBarLapisan();
      renderUlang();
      return;
    }
    if (e.target.closest('#sk-lap-tambah')) {
      const r = tambahLapisan(lapisan);
      if (!r.ok) { toast(tr('Maksimal 8 lapisan')); return; }
      lapisan = r.list;
      lapisanAktif = r.id;
      bangunBarLapisan();
      return;
    }
    const lapGerak = e.target.closest('#sk-lap-naik, #sk-lap-turun');
    if (lapGerak) {
      const r = pindahLapisan(lapisan, lapisanAktif, lapGerak.id === 'sk-lap-naik' ? 1 : -1);
      if (r.ok) lapisan = r.list;
      bangunBarLapisan();
      renderUlang();
      return;
    }
    if (e.target.closest('#sk-lap-hapus')) {
      const isi = jejak.filter(st => st.lapisan === lapisanAktif).length
        + objek.filter(o => o.lapisan === lapisanAktif).length;
      const r = hapusLapisan(lapisan, lapisanAktif, isi);
      if (!r.ok) {
        toast(r.alasan === 'berisi' ? tr('Lapisan masih berisi. Kosongkan dulu') : tr('Minimal satu lapisan'));
        return;
      }
      const i = lapisan.findIndex(l => l.id === lapisanAktif);
      lapisan = r.list;
      lapisanAktif = lapisan[Math.max(0, Math.min(i - 1, lapisan.length - 1))].id;
      bangunBarLapisan();
      renderUlang();
      return;
    }
    if (e.target.closest('#sk-besar')) { ubahUkuranPilihan(1.15); return; }
    if (e.target.closest('#sk-kecil')) { ubahUkuranPilihan(0.87); return; }
    if (e.target.closest('#sk-hapus-objek')) {
      const i = objek.findIndex(o => o.id === pilihanId);
      if (i >= 0) objek.splice(i, 1);
      pilihanId = null;
      perbaruiBarObjek();
      renderUlang();
      return;
    }
    if (e.target.closest('#sk-bentuk-batal')) {
      if (bentukSementara) {
        if (aktif === bentukSementara.bentuk) {
          /* masih ditahan: bentuk belum masuk jejak, cukup kembalikan coretan yang sedang digambar */
          batalkanTahanBentuk();
        } else {
          const i = jejak.indexOf(bentukSementara.bentuk);
          if (i >= 0) jejak[i] = bentukSementara.asli;
        }
        bentukSementara = null;
        renderUlang();
      }
      sembunyiBentuk();
      return;
    }
    if (e.target.closest('#sk-bentuk-pakai')) {
      bentukSementara = null;
      sembunyiBentuk();
      return;
    }
    if (e.target.closest('#sk-undo')) {
      bentukSementara = null;
      sembunyiBentuk();
      /* A5: goresan di lapisan terkunci atau tersembunyi tidak boleh diurungkan */
      if (jejak.length) {
        if (!bisaDiedit(lapisan, jejak[jejak.length - 1].lapisan)) toast(pesanLapisanTerkunci());
        else { tumpukRedo.push(jejak.pop()); renderUlang(); }
      }
      return;
    }
    if (e.target.closest('#sk-redo')) {
      if (tumpukRedo.length) {
        if (!bisaDiedit(lapisan, tumpukRedo[tumpukRedo.length - 1].lapisan)) toast(pesanLapisanTerkunci());
        else { jejak.push(tumpukRedo.pop()); renderUlang(); }
      }
      return;
    }
    if (e.target.closest('#sk-bersih')) {
      bentukSementara = null;
      sembunyiBentuk();
      /* A5: hanya item di lapisan yang bisa diedit yang dibersihkan */
      const sisaJejak = jejak.filter(st => !bisaDiedit(lapisan, st.lapisan));
      const sisaObjek = objek.filter(o => !bisaDiedit(lapisan, o.lapisan));
      jejak.length = 0;
      jejak.push(...sisaJejak);
      objek.length = 0;
      objek.push(...sisaObjek);
      pilihanId = null;
      perbaruiBarObjek();
      gambarDasar = null;
      adaLatarFoto = false;
      renderUlang();
      return;
    }
    if (e.target.closest('#sk-batal') || e.target === overlay) {
      overlay.remove();
      return;
    }
    if (e.target.closest('#sk-simpan')) {
      if (!jejak.length && !objek.length && !gambarDasar && kw === LEBAR && kh === TINGGI) {
        toast(tr('Coret sesuatu terlebih dahulu'));
        return;
      }
      /* kotak pilihan jangan ikut tersimpan ke gambar */
      pilihanId = null;
      renderUlang();
      const goresanSimpan = adaLatarFoto
        ? ''
        : serialGoresan({ goresan: jejak, objek, latar, pola, lapisan }, kw, kh);
      if (!adaLatarFoto && (jejak.length || objek.length) && !goresanSimpan) {
        toast(tr('Goresan terlalu banyak untuk disimpan sebagai objek; hanya gambar yang disimpan'));
      }
      const blob = await eksporKanvasKeBlob(cv, ctx, urutanGambar(lapisan, jejak), latar);
      overlay.remove();
      await sisipkanBlobSketsa(blob, figEdit, goresanSimpan);
    }
  });

  perbaruiInfoKanvas();
  terapkanZoom();
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
