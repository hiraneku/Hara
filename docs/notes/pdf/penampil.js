/* Penampil PDF di dalam aplikasi (Bagian B1, Tahap 2, langkah B1a: tampilkan).

   Sumber PDF tidak pernah diubah: penampil hanya membaca salinan byte dari blob
   lampiran. Satu halaman tampil per saat; navigasi lewat tombol, panah, atau
   PageUp/PageDown. Zoom: − / + (langkah tetap) dan Pas lebar. Anotasi belum ada
   di langkah ini (B1b). */

import { muatPdfJs } from './muat-pdfjs.js?v=20261025071610';
import {
  ZOOM_BAWAAN, zoomBerikut, zoomSebelumnya, halamanBerikut, halamanSebelumnya,
  halamanTerjepit, skalaPasLebar,
} from './logika.js?v=20261025071610';
import { esc } from '../../core/dom.js?v=20261025071610';
import { t as tr } from '../../core/i18n.js?v=20261025071610';

let aktif = null;   /* sesi penampil yang sedang terbuka (satu saja) */

function pesanGalat(err) {
  if (err && err.message === 'PDF_FITUR_KURANG') {
    return tr('Peramban ini terlalu lama untuk menampilkan PDF. Perbarui peramban atau WebView.');
  }
  return tr('PDF tidak bisa dibuka. Berkasnya mungkin rusak atau dilindungi kata sandi.');
}

export function tutupPenampilPdf() {
  const s = aktif;
  if (!s) return;
  aktif = null;
  try { s.render?.cancel(); } catch {}
  lepaskanTugas(s.task);
  document.removeEventListener('keydown', s.kunciTombol, true);
  window.removeEventListener('resize', s.ubahUkuran);
  s.overlay.remove();
}

function labelHalaman(s) {
  const ol = s.overlay;
  ol.querySelector('[data-pdf-hal]').textContent = `${s.halaman} / ${s.total}`;
  ol.querySelector('[data-pdf-zoom]').textContent = `${Math.round(s.zoom * 100)}%`;
  ol.querySelector('[data-pdf="prev"]').disabled = s.halaman <= 1;
  ol.querySelector('[data-pdf="next"]').disabled = s.halaman >= s.total;
}

async function tampilkanHalaman(s) {
  if (aktif !== s || !s.doc) return;
  s.render?.cancel();
  const page = await s.doc.getPage(s.halaman);
  if (aktif !== s) return;
  const isi = s.overlay.querySelector('[data-pdf-isi]');
  const lebarAsli = page.getViewport({ scale: 1 }).width;
  if (s.pas) s.zoom = skalaPasLebar(lebarAsli, isi.clientWidth);
  labelHalaman(s);

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const vp = page.getViewport({ scale: s.zoom * dpr });
  const kanvas = document.createElement('canvas');
  kanvas.className = 'pdfv-kanvas';
  kanvas.width = Math.floor(vp.width);
  kanvas.height = Math.floor(vp.height);
  kanvas.style.width = `${vp.width / dpr}px`;
  kanvas.style.height = `${vp.height / dpr}px`;
  const ctx = kanvas.getContext('2d');
  if (!ctx) {
    isi.innerHTML = `<p class="pdfv-info">${esc(tr('Peramban ini tidak bisa menggambar PDF.'))}</p>`;
    return;
  }
  isi.replaceChildren(kanvas);
  isi.scrollTop = 0;
  s.render = page.render({ canvasContext: ctx, viewport: vp });
  try {
    await s.render.promise;
  } catch (err) {
    if (err?.name !== 'RenderingCancelledException') throw err;
  }
}

function pindahHalaman(s, nomor) {
  const baru = halamanTerjepit(nomor, s.total);
  if (baru === s.halaman) return;
  s.halaman = baru;
  tampilkanHalaman(s);
}

function ubahZoom(s, zoom) {
  s.pas = false;
  s.zoom = zoom;
  tampilkanHalaman(s);
}

export async function bukaPenampilPdf(data, nama = 'PDF') {
  tutupPenampilPdf();
  const overlay = document.createElement('div');
  overlay.className = 'pdfv';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', String(nama));
  overlay.innerHTML = `
    <div class="pdfv-bar">
      <span class="pdfv-nama" title="${esc(nama)}">${esc(nama)}</span>
      <button type="button" class="pdfv-b" data-pdf="prev" aria-label="${esc(tr('Halaman sebelumnya'))}">‹</button>
      <span class="pdfv-hal" data-pdf-hal aria-live="polite">–</span>
      <button type="button" class="pdfv-b" data-pdf="next" aria-label="${esc(tr('Halaman berikutnya'))}">›</button>
      <button type="button" class="pdfv-b" data-pdf="kecil" aria-label="${esc(tr('Perkecil'))}">−</button>
      <span class="pdfv-zoom" data-pdf-zoom>100%</span>
      <button type="button" class="pdfv-b" data-pdf="besar" aria-label="${esc(tr('Perbesar'))}">+</button>
      <button type="button" class="pdfv-teks" data-pdf="pas">${esc(tr('Pas lebar'))}</button>
      <button type="button" class="pdfv-teks" data-pdf="tutup">${esc(tr('Tutup'))}</button>
    </div>
    <div class="pdfv-isi" data-pdf-isi><p class="pdfv-info">${esc(tr('Memuat PDF…'))}</p></div>`;
  document.body.appendChild(overlay);

  const s = {
    overlay, doc: null, task: null, render: null,
    halaman: 1, total: 0, zoom: ZOOM_BAWAAN, pas: true,
    kunciTombol: null, ubahUkuran: null,
  };
  aktif = s;

  s.kunciTombol = e => {
    if (aktif !== s) return;
    if (e.key === 'Escape') { e.preventDefault(); tutupPenampilPdf(); }
    else if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); pindahHalaman(s, halamanBerikut(s.halaman, s.total)); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); pindahHalaman(s, halamanSebelumnya(s.halaman, s.total)); }
  };
  document.addEventListener('keydown', s.kunciTombol, true);

  let timerUkuran = null;
  s.ubahUkuran = () => {
    if (!s.pas || !s.doc) return;
    clearTimeout(timerUkuran);
    timerUkuran = setTimeout(() => tampilkanHalaman(s), 200);
  };
  window.addEventListener('resize', s.ubahUkuran);

  overlay.addEventListener('click', e => {
    const b = e.target.closest('[data-pdf]');
    if (!b || aktif !== s || b.disabled) return;
    const aksi = b.dataset.pdf;
    if (aksi === 'tutup') tutupPenampilPdf();
    else if (aksi === 'prev') pindahHalaman(s, halamanSebelumnya(s.halaman, s.total));
    else if (aksi === 'next') pindahHalaman(s, halamanBerikut(s.halaman, s.total));
    else if (aksi === 'besar') ubahZoom(s, zoomBerikut(s.zoom));
    else if (aksi === 'kecil') ubahZoom(s, zoomSebelumnya(s.zoom));
    else if (aksi === 'pas') { s.pas = true; tampilkanHalaman(s); }
  });

  let lib;
  try {
    lib = await muatPdfJs();
  } catch (err) {
    if (aktif === s) gagalTampil(s, pesanGalat(err));
    return;
  }
  if (aktif !== s) return;

  const task = lib.getDocument({ data: new Uint8Array(data), isEvalSupported: false, useSystemFonts: false });
  s.task = task;
  task.onPassword = () => {
    s.dilindungi = true;   /* destroy() menolak promise; pesan ini tidak boleh tertimpa */
    gagalTampil(s, tr('PDF dilindungi kata sandi dan belum bisa dibuka.'));
    lepaskanTugas(task);
  };
  let doc;
  try {
    doc = await task.promise;
  } catch (err) {
    if (aktif === s && !s.dilindungi) gagalTampil(s, pesanGalat(err));
    return;
  }
  if (aktif !== s) { lepaskanTugas(task); return; }
  s.doc = doc;
  s.total = doc.numPages;
  labelHalaman(s);
  await tampilkanHalaman(s);
}

/* pdf.js 6.x: dokumen dilepas lewat PDFDocumentLoadingTask.destroy() (PDFDocumentProxy tidak punya destroy). */
function lepaskanTugas(task) {
  try { task?.destroy()?.catch?.(() => {}); } catch {}
}

function gagalTampil(s, pesan) {
  const isi = s.overlay.querySelector('[data-pdf-isi]');
  if (isi) isi.innerHTML = `<p class="pdfv-info pdfv-galat">${esc(pesan)}</p>`;
}
