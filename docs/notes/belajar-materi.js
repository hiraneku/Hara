/* C5 · Tampilan belajar: materi dan catatan berdampingan (Tahap 3).

   Mode ini hanya tata letak di dalam editor. Editor tetap satu-satunya
   penulis catatan (autosave, binding, cur === 'editor' tidak berubah);
   panel materi di sebelah kiri adalah PDF dari lampiran catatan mana pun.

   - Lebar sempit (HP): satu panel tampil, dipilih lewat tab Materi / Catatan.
   - Lebar lega: dua kolom. Panel materi menempel saat catatan digulir.
   - Panel materi tidak punya pintasan keyboard global. Tombol panah hanya
     berlaku saat fokus ada di dalam panel materi, supaya tidak mengganggu
     mengetik di catatan.
   - Materi PDF dirender dengan pdf.js yang sama dengan penampil (B1/B2).
     Anotasi, OCR, dan susunan halaman tetap di penampil layar penuh.
   - Hanya materi PDF. Sumber lain (URL, video, gambar) tidak termasuk di sini. */
import { state } from '../core/store.js?v=20261028093000';
import { go, cur, onAfterRender, onBeforeLeave } from '../core/router.js?v=20261028093000';
import { t as tr } from '../core/i18n.js?v=20261028093000';
import { esc } from '../core/dom.js?v=20261028093000';
import { ambilBlob } from '../core/blobs.js?v=20261028093000';
import { toast } from '../core/toast.js?v=20261028093000';
import { saveNow } from './editor/cleanup.js?v=20261028093000';
import { muatPdfJs, fiturPdfKurang } from './pdf/muat-pdfjs.js?v=20261028093000';
import { adalahPdf, ZOOM_BAWAAN, zoomBerikut, zoomSebelumnya, halamanBerikut, halamanSebelumnya,
         skalaPasLebar } from './pdf/logika.js?v=20261028093000';

let aktif = false;     /* mode belajar nyala (bertahan lintas catatan selama sesi) */
let materiId = null;   /* blobId PDF yang sedang dipilih sebagai materi */
let sesi = null;       /* { root, isi, doc, task, render, halaman, total, zoom, pas, tok, ... } */

export const belajarAktif = () => aktif;

/* Daftar PDF dari lampiran semua catatan (termasuk yang diarsipkan). Catatan di
   Sampah dilewati. Urutan mengikuti urutan catatan lalu urutan blok. */
export function daftarMateri() {
  const hasil = [];
  for (const n of state.notes || []) {
    if (n.deletedAt) continue;
    for (const b of n.blocks || []) {
      if (b.type !== 'file' || !adalahPdf(b.meta)) continue;
      hasil.push({
        blobId: b.meta.blobId,
        nama: b.meta.name || 'PDF',
        catatan: n.title || tr('Tanpa judul'),
      });
    }
  }
  return hasil;
}

/* Bagian pembuka dan penutup untuk view editor. Kosong bila mode mati. */
export function belajarBuka() {
  if (!aktif) return '';
  const daftar = daftarMateri();
  const pilihan = daftar.length
    ? daftar.map(m => `<option value="${esc(m.blobId)}"${m.blobId === materiId ? ' selected' : ''}>${esc(m.nama)} · ${esc(m.catatan)}</option>`).join('')
    : `<option value="">${esc(tr('Belum ada PDF'))}</option>`;
  const info = daftar.length ? tr('Memuat PDF…') : tr('Belum ada PDF di catatan. Impor PDF ke catatan, lalu pilih di sini.');
  return `<div class="belajar" data-belajar-root data-tab="catatan">
  <div class="belajar-tab" role="tablist">
    <button type="button" class="belajar-tb" role="tab" data-belajar-tab="materi" aria-selected="false">${esc(tr('Materi'))}</button>
    <button type="button" class="belajar-tb on" role="tab" data-belajar-tab="catatan" aria-selected="true">${esc(tr('Catatan'))}</button>
  </div>
  <section class="belajar-materi" aria-label="${esc(tr('Materi'))}">
    <div class="belajar-bar">
      <select class="belajar-pilih" data-belajar-pilih aria-label="${esc(tr('Pilih PDF sebagai materi'))}"${daftar.length ? '' : ' disabled'}>${pilihan}</select>
      <div class="belajar-kendali">
        <button type="button" class="belajar-b" data-belajar-aksi="prev" aria-label="${esc(tr('Halaman sebelumnya'))}">‹</button>
        <span class="belajar-hal" data-belajar-hal>–</span>
        <button type="button" class="belajar-b" data-belajar-aksi="next" aria-label="${esc(tr('Halaman berikutnya'))}">›</button>
        <button type="button" class="belajar-b" data-belajar-aksi="kecil" aria-label="${esc(tr('Perkecil'))}">−</button>
        <span class="belajar-zoom" data-belajar-zoom>100%</span>
        <button type="button" class="belajar-b" data-belajar-aksi="besar" aria-label="${esc(tr('Perbesar'))}">+</button>
        <button type="button" class="belajar-teks" data-belajar-aksi="pas">${esc(tr('Pas lebar'))}</button>
      </div>
    </div>
    <div class="belajar-isi" data-belajar-isi tabindex="0" aria-label="${esc(tr('Materi'))}">
      <p class="belajar-info">${esc(info)}</p>
    </div>
  </section>
  <div class="belajar-catatan">`;
}

export function belajarTutup() {
  return aktif ? '</div></div>' : '';
}

/* Menyalakan atau mematikan mode. Catatan disimpan dulu supaya editor yang
   digambar ulang membaca isi terbaru. */
export function toggleBelajar(nyala = !aktif) {
  if (cur !== 'editor') {
    toast(tr('Buka catatan dulu, lalu pilih Mode belajar'));
    return;
  }
  aktif = !!nyala;
  if (!aktif) lepasMateri();
  saveNow();
  go('editor', { segar: true, gulir: document.getElementById('wrap').scrollTop });
}

/* Perintah palet: sama dengan toggle, tetapi juga bisa dipanggil dari layar lain
   (akan membuka editor bila catatan terakhir masih ada). */
export function jalankanBelajarPalet() {
  if (cur === 'editor') return toggleBelajar();
  if (!state.openId) {
    toast(tr('Buka catatan dulu, lalu pilih Mode belajar'));
    return;
  }
  aktif = true;
  go('editor');
}

/* Dipanggil setiap editor digambar (termasuk segar). */
export function pasangMateri() {
  lepasMateri();
  const root = document.querySelector('[data-belajar-root]');
  if (!root) return;
  const isi = root.querySelector('[data-belajar-isi]');
  const pilih = root.querySelector('[data-belajar-pilih]');
  const daftar = daftarMateri();
  if (!materiId || !daftar.some(m => m.blobId === materiId)) materiId = daftar[0]?.blobId || null;

  sesi = { root, isi, doc: null, task: null, render: null, halaman: 1, total: 0,
           zoom: ZOOM_BAWAAN, pas: true, tok: 0, timer: null, ro: null, lebarTerakhir: -1 };
  const s = sesi;

  root.addEventListener('click', e => {
    const tab = e.target.closest('[data-belajar-tab]');
    if (tab) return pilihTab(root, tab.dataset.belajarTab);
    const b = e.target.closest('[data-belajar-aksi]');
    if (b && !b.disabled) aksi(s, b.dataset.belajarAksi);
  });
  pilih?.addEventListener('change', () => { if (pilih.value) muatMateri(s, pilih.value); });
  isi.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); aksi(s, 'next'); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); aksi(s, 'prev'); }
  });

  if (typeof ResizeObserver === 'function') {
    s.ro = new ResizeObserver(() => {
      /* hanya saat lebar isi benar-benar berubah (misalnya diputar atau tab dibuka) */
      const w = isi.clientWidth;
      if (w === s.lebarTerakhir) return;
      s.lebarTerakhir = w;
      if (!s.pas || !s.doc) return;
      clearTimeout(s.timer);
      s.timer = setTimeout(() => tampil(s), 150);
    });
    s.ro.observe(isi);
  }

  if (!materiId) return info(s, tr('Belum ada PDF di catatan. Impor PDF ke catatan, lalu pilih di sini.'));
  muatMateri(s, materiId);
}

/* Melepas sesi materi: batalkan render, tutup dokumen pdf.js, hentikan pengamat ukuran. */
export function lepasMateri() {
  const s = sesi;
  if (!s) return;
  sesi = null;
  clearTimeout(s.timer);
  s.ro?.disconnect();
  try { s.render?.cancel(); } catch {}
  try { s.task?.destroy(); } catch {}
}

/* Dipanggil saat meninggalkan editor (go tanpa segar). */
onBeforeLeave(() => { if (cur === 'editor') lepasMateri(); });
/* Setiap editor digambar ulang dalam mode belajar, panel materi dipasang lagi. */
onAfterRender(v => { if (v === 'editor' && aktif) pasangMateri(); });

function pilihTab(root, nama) {
  root.dataset.tab = nama === 'materi' ? 'materi' : 'catatan';
  root.querySelectorAll('[data-belajar-tab]').forEach(b => {
    const on = b.dataset.belajarTab === root.dataset.tab;
    b.classList.toggle('on', on);
    b.setAttribute('aria-selected', String(on));
  });
}

function info(s, pesan) {
  if (!s.isi) return;
  s.isi.innerHTML = `<p class="belajar-info">${esc(pesan)}</p>`;
  setLabel(s);
}

function setLabel(s) {
  const hal = s.root.querySelector('[data-belajar-hal]');
  const zoom = s.root.querySelector('[data-belajar-zoom]');
  if (hal) hal.textContent = s.total ? `${s.halaman} / ${s.total}` : '–';
  if (zoom) zoom.textContent = `${Math.round(s.zoom * 100)}%`;
  const prev = s.root.querySelector('[data-belajar-aksi="prev"]');
  const next = s.root.querySelector('[data-belajar-aksi="next"]');
  if (prev) prev.disabled = !s.total || s.halaman <= 1;
  if (next) next.disabled = !s.total || s.halaman >= s.total;
}

function aksi(s, a) {
  if (sesi !== s || !s.doc) return;
  if (a === 'prev') { s.halaman = halamanSebelumnya(s.halaman, s.total); s.isi.scrollTop = 0; tampil(s); }
  else if (a === 'next') { s.halaman = halamanBerikut(s.halaman, s.total); s.isi.scrollTop = 0; tampil(s); }
  else if (a === 'besar') { s.pas = false; s.zoom = zoomBerikut(s.zoom); tampil(s); }
  else if (a === 'kecil') { s.pas = false; s.zoom = zoomSebelumnya(s.zoom); tampil(s); }
  else if (a === 'pas') { s.pas = true; tampil(s); }
}

function lepasDokumen(s) {
  try { s.render?.cancel(); } catch {}
  try { s.task?.destroy(); } catch {}
  s.render = null; s.task = null; s.doc = null; s.total = 0;
}

async function muatMateri(s, blobId) {
  if (sesi !== s) return;
  materiId = blobId;
  lepasDokumen(s);
  s.halaman = 1;
  s.lebarTerakhir = -1;
  info(s, tr('Memuat PDF…'));
  const kurang = fiturPdfKurang();
  if (kurang.length) return info(s, tr('Peramban ini terlalu lama untuk menampilkan PDF. Perbarui peramban atau WebView.'));

  const blob = await ambilBlob(blobId);
  if (sesi !== s) return;
  if (!blob) return info(s, tr('Berkas lampiran tidak ditemukan'));
  const data = new Uint8Array(await blob.arrayBuffer());
  if (sesi !== s) return;

  let lib;
  try { lib = await muatPdfJs(); }
  catch { if (sesi === s) info(s, tr('PDF tidak bisa dibuka. Berkasnya mungkin rusak atau dilindungi kata sandi.')); return; }
  if (sesi !== s) return;

  const task = lib.getDocument({ data, isEvalSupported: false, useSystemFonts: false });
  s.task = task;
  task.onPassword = () => {
    info(s, tr('PDF dilindungi kata sandi dan belum bisa dibuka.'));
    try { task.destroy(); } catch {}
  };
  let doc;
  try { doc = await task.promise; }
  catch {
    if (sesi === s && s.task === task) info(s, tr('PDF tidak bisa dibuka. Berkasnya mungkin rusak atau dilindungi kata sandi.'));
    return;
  }
  if (sesi !== s || s.task !== task) { try { doc.destroy(); } catch {} return; }
  s.doc = doc;
  s.total = doc.numPages;
  s.pas = true;
  await tampil(s);
}

async function tampil(s) {
  if (sesi !== s || !s.doc) return;
  const tok = ++s.tok;
  try { s.render?.cancel(); } catch {}
  const page = await s.doc.getPage(s.halaman);
  if (sesi !== s || tok !== s.tok) return;

  const lebarAsli = page.getViewport({ scale: 1 }).width;
  if (s.pas) s.zoom = skalaPasLebar(lebarAsli, s.isi.clientWidth);
  setLabel(s);

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const vp = page.getViewport({ scale: s.zoom * dpr });
  const kanvas = document.createElement('canvas');
  kanvas.className = 'belajar-kanvas';
  kanvas.width = Math.floor(vp.width);
  kanvas.height = Math.floor(vp.height);
  kanvas.style.width = `${vp.width / dpr}px`;
  kanvas.style.height = `${vp.height / dpr}px`;
  const ctx = kanvas.getContext('2d');
  if (!ctx) return info(s, tr('Peramban ini tidak bisa menggambar PDF.'));
  const bungkus = document.createElement('div');
  bungkus.className = 'belajar-kwrap';
  bungkus.appendChild(kanvas);
  s.isi.replaceChildren(bungkus);

  s.render = page.render({ canvasContext: ctx, viewport: vp });
  try { await s.render.promise; }
  catch (err) { if (err?.name !== 'RenderingCancelledException' && sesi === s) info(s, tr('PDF tidak bisa dibuka. Berkasnya mungkin rusak atau dilindungi kata sandi.')); }
}
