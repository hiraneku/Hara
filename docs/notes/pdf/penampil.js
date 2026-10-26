/* Penampil PDF di dalam aplikasi (Bagian B1, Tahap 2, langkah B1a: tampilkan).

   Sumber PDF tidak pernah diubah: penampil hanya membaca salinan byte dari blob
   lampiran. Satu halaman tampil per saat; navigasi lewat tombol, panah, atau
   PageUp/PageDown. Zoom: − / + (langkah tetap) dan Pas lebar.

   Anotasi (B1b): coret, sorot, garis, dan komentar. Disimpan TERPISAH dari
   PDF asli lewat anotasi-simpan.js. Hanya dibuka bila `blobId` diberikan. */

import { muatPdfJs } from './muat-pdfjs.js?v=20261026051921';
import {
  ZOOM_BAWAAN, zoomBerikut, zoomSebelumnya, halamanBerikut, halamanSebelumnya,
  halamanTerjepit, skalaPasLebar,
} from './logika.js?v=20261026051921';
import {
  WARNA_ANOT, anotasiHalaman, batalTerakhirHalaman, buatAnotasi, tambahAnotasi,
  titikTernormal, MAKS_TEKS_KOMENTAR,
} from './anotasi.js?v=20261026051921';
import { muatAnotasi, simpanAnotasi } from './anotasi-simpan.js?v=20261026051921';
import {
  bangunIndeks, daftarKomentar, hasilBerikut, hasilSebelumnya, kumpulkanHasil, normalisasiCari,
} from './cari-pdf.js?v=20261026051921';
import { tulisPdfGambar, gambarAnotasiKanvas } from './ekspor-pdf.js?v=20261026051921';
import { esc } from '../../core/dom.js?v=20261026051921';
import { t as tr } from '../../core/i18n.js?v=20261026051921';

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
  const cssW = vp.width / dpr, cssH = vp.height / dpr;
  kanvas.style.width = `${cssW}px`;
  kanvas.style.height = `${cssH}px`;
  const ctx = kanvas.getContext('2d');
  if (!ctx) {
    isi.innerHTML = `<p class="pdfv-info">${esc(tr('Peramban ini tidak bisa menggambar PDF.'))}</p>`;
    return;
  }
  const wadah = document.createElement('div');
  wadah.className = 'pdfv-kwrap';
  wadah.appendChild(kanvas);
  if (s.blobId) wadah.appendChild(buatLapisanAnot(s, cssW, cssH));
  isi.replaceChildren(wadah);
  gambarSorotCari(s);
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

export async function bukaPenampilPdf(data, nama = 'PDF', opsi = {}) {
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
    <div class="pdfv-bar pdfv-bar2 pdfv-bar-cari">
      <input type="search" class="pdfv-cari-input" data-pdf-cari-input placeholder="${esc(tr('Cari di PDF'))}" aria-label="${esc(tr('Cari di PDF'))}" autocomplete="off" enterkeyhint="search">
      <button type="button" class="pdfv-teks" data-cari="cari">${esc(tr('Cari'))}</button>
      <button type="button" class="pdfv-b" data-cari="prev" aria-label="${esc(tr('Hasil sebelumnya'))}">‹</button>
      <button type="button" class="pdfv-b" data-cari="next" aria-label="${esc(tr('Hasil berikutnya'))}">›</button>
      <span class="pdfv-status" data-cari-status aria-live="polite"></span>
    </div>
    ${opsi.blobId ? `
    <div class="pdfv-bar pdfv-bar2" data-anot-bar>
      <button type="button" class="pdfv-teks" data-anot="coret">${esc(tr('Coret'))}</button>
      <button type="button" class="pdfv-teks" data-anot="sorot">${esc(tr('Sorot'))}</button>
      <button type="button" class="pdfv-teks" data-anot="garis">${esc(tr('Garis'))}</button>
      <button type="button" class="pdfv-teks" data-anot="komentar">${esc(tr('Komentar'))}</button>
      <button type="button" class="pdfv-teks" data-anot-batal>${esc(tr('Batal'))}</button>
      <button type="button" class="pdfv-teks" data-anot-ekspor>${esc(tr('Ekspor PDF'))}</button>
      <span class="pdfv-status" data-anot-status aria-live="polite"></span>
    </div>` : ''}
    <div class="pdfv-isi" data-pdf-isi><p class="pdfv-info">${esc(tr('Memuat PDF…'))}</p></div>`;
  document.body.appendChild(overlay);

  const s = {
    overlay, doc: null, task: null, render: null,
    halaman: 1, total: 0, zoom: ZOOM_BAWAAN, pas: true,
    kunciTombol: null, ubahUkuran: null,
    blobId: opsi.blobId || null,   /* id blob PDF asli; anotasi disimpan dengan kunci turunannya */
    anot: [],                      /* seluruh anotasi dokumen ini */
    alat: null,                    /* 'coret' | 'sorot' | 'garis' | 'komentar' | null */
    lapisan: null, ukuran: null, sementara: null,
    lib: null,                     /* modul pdf.js yang sudah dimuat (untuk Util) */
    cari: { kueri: '', indeksJanji: null, gagal: 0, hasil: [], posisi: -1 },
  };
  aktif = s;

  s.kunciTombol = e => {
    if (aktif !== s) return;
    if (e.key === 'Escape') { e.preventDefault(); tutupPenampilPdf(); return; }
    /* Di kolom pencarian, panah dipakai untuk menggerakkan kursor, bukan pindah halaman. */
    if (e.target && e.target.matches && e.target.matches('input, textarea')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); pindahHalaman(s, halamanBerikut(s.halaman, s.total)); }
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
    const alatCari = e.target.closest('[data-cari]');
    if (alatCari && aktif === s) {
      const j = alatCari.dataset.cari;
      if (j === 'cari') cariUi(s);
      else if (j === 'next') langkahHit(s, hasilBerikut);
      else if (j === 'prev') langkahHit(s, hasilSebelumnya);
      return;
    }
    const alatAnot = e.target.closest('[data-anot]');
    if (alatAnot && aktif === s) {
      const j = alatAnot.dataset.anot;
      s.alat = s.alat === j ? null : j;
      segarkanAlatAnot(s);
      return;
    }
    if (e.target.closest('[data-anot-batal]') && aktif === s) { batalAnotHalaman(s); return; }
    if (e.target.closest('[data-anot-ekspor]') && aktif === s) { eksporAnot(s, nama); return; }
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

  const kolomCari = overlay.querySelector('[data-pdf-cari-input]');
  kolomCari.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); cariUi(s); }
  });
  kolomCari.addEventListener('input', () => {
    if (!kolomCari.value.trim()) { resetCari(s); setStatusCari(s, ''); }
  });

  let lib;
  try {
    lib = await muatPdfJs();
  } catch (err) {
    if (aktif === s) gagalTampil(s, pesanGalat(err));
    return;
  }
  if (aktif !== s) return;
  s.lib = lib;

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
  if (s.blobId) {
    try { s.anot = await muatAnotasi(s.blobId); }
    catch { setStatusAnot(s, tr('Anotasi tidak bisa dibaca. Ditampilkan kosong.')); }
  }
  labelHalaman(s);
  await tampilkanHalaman(s);
}

/* pdf.js 6.x: dokumen dilepas lewat PDFDocumentLoadingTask.destroy() (PDFDocumentProxy tidak punya destroy). */
function lepaskanTugas(task) {
  try { task?.destroy()?.catch?.(() => {}); } catch {}
}

/* ── Pencarian teks (B5) ── */

/* Kotak satu item teks dalam koordinat 0–1 terhadap halaman (rotasi 0). */
function kotakItem(it, vp, lib) {
  const m = lib.Util.transform(vp.transform, it.transform);
  const tinggi = Math.hypot(m[2], m[3]);
  return { x: m[4] / vp.width, y: (m[5] - tinggi) / vp.height, w: it.width / vp.width, h: tinggi / vp.height };
}

/* Teks semua halaman dibaca sekali per dokumen, lalu disimpan. Halaman yang gagal
   dibaca dilewati dan dihitung di s.cari.gagal. Mengembalikan null bila penampil
   sudah ditutup di tengah jalan. */
function pastikanIndeks(s) {
  if (!s.cari.indeksJanji) {
    s.cari.indeksJanji = (async () => {
      const daftar = [];
      for (let i = 1; i <= s.total; i++) {
        setStatusCari(s, `${tr('Membaca teks halaman')} ${i} / ${s.total}`);
        let indeks;
        try {
          const page = await s.doc.getPage(i);
          const vp = page.getViewport({ scale: 1 });
          const isi = await page.getTextContent();
          indeks = bangunIndeks(isi.items
            .filter(it => typeof it.str === 'string')
            .map(it => ({ str: it.str, eol: !!it.hasEOL, box: kotakItem(it, vp, s.lib) })));
          page.cleanup();
        } catch {
          s.cari.gagal++;
          indeks = bangunIndeks([]);
        }
        if (aktif !== s) return null;
        daftar.push({ halaman: i, jenis: 'teks', indeks });
      }
      return daftar;
    })();
  }
  return s.cari.indeksJanji;
}

async function cariUi(s) {
  if (!s.doc) return;
  const kueri = s.overlay.querySelector('[data-pdf-cari-input]').value;
  if (!normalisasiCari(kueri)) { resetCari(s); setStatusCari(s, ''); return; }
  s.cari.kueri = kueri;
  setStatusCari(s, tr('Mencari…'));
  const daftar = await pastikanIndeks(s);
  if (aktif !== s || !daftar) return;
  s.cari.hasil = kumpulkanHasil([...daftar, ...daftarKomentar(s.anot)], kueri);
  s.cari.posisi = s.cari.hasil.length ? 0 : -1;
  if (!s.cari.hasil.length) {
    const adaTeks = daftar.some(d => d.indeks.norm.length > 0);
    gambarSorotCari(s);
    const pesan = adaTeks
      ? tr('Tidak ditemukan')
      : tr('PDF ini tidak punya teks yang bisa dicari. Halaman hasil pindai belum bisa dicari.');
    setStatusCari(s, pesan + (s.cari.gagal ? ` · ${s.cari.gagal} ${tr('halaman tidak bisa dibaca')}` : ''));
    return;
  }
  tampilkanHit(s);
}

function resetCari(s) {
  s.cari.kueri = '';
  s.cari.hasil = [];
  s.cari.posisi = -1;
  gambarSorotCari(s);
}

function setStatusCari(s, pesan) {
  const el = s.overlay.querySelector('[data-cari-status]');
  if (el) el.textContent = pesan;
}

function statusHit(s) {
  const n = s.cari.hasil.length;
  const h = s.cari.hasil[s.cari.posisi];
  const lokasi = h.jenis === 'komentar'
    ? `${tr('komentar di halaman')} ${h.halaman}`
    : `${tr('halaman')} ${h.halaman}`;
  return `${s.cari.posisi + 1} ${tr('dari')} ${n} · ${lokasi}`
    + (s.cari.gagal ? ` · ${s.cari.gagal} ${tr('halaman tidak bisa dibaca')}` : '');
}

/* Membuka halaman hasil yang aktif (bila beda) lalu menyorot kotaknya. */
function tampilkanHit(s) {
  const h = s.cari.hasil[s.cari.posisi];
  if (!h) return;
  if (h.halaman !== s.halaman) {
    s.halaman = h.halaman;
    labelHalaman(s);
    tampilkanHalaman(s);
  } else {
    gambarSorotCari(s);
  }
  setStatusCari(s, statusHit(s));
}

function langkahHit(s, fungsi) {
  const n = s.cari.hasil.length;
  if (!n) return;
  s.cari.posisi = fungsi(s.cari.posisi, n);
  tampilkanHit(s);
}

/* Kotak sorot untuk semua hasil di halaman ini. Hasil yang aktif diberi warna lebih kuat.
   Hasil komentar tidak punya kotak. */
function gambarSorotCari(s) {
  const wadah = s.overlay.querySelector('.pdfv-kwrap');
  if (!wadah) return;
  wadah.querySelector('.pdfv-cari-layer')?.remove();
  const diHalaman = s.cari.hasil.filter(h => h.halaman === s.halaman && h.kotak.length);
  if (!diHalaman.length) return;
  const aktifHit = s.cari.hasil[s.cari.posisi];
  const layer = document.createElement('div');
  layer.className = 'pdfv-cari-layer';
  for (const h of diHalaman) {
    for (const k of h.kotak) {
      const kotak = document.createElement('div');
      kotak.className = 'pdfv-cari-kotak' + (h === aktifHit ? ' on' : '');
      kotak.style.left = `${k.x * 100}%`;
      kotak.style.top = `${k.y * 100}%`;
      kotak.style.width = `${k.w * 100}%`;
      kotak.style.height = `${k.h * 100}%`;
      layer.appendChild(kotak);
    }
  }
  wadah.appendChild(layer);
}

/* ── Anotasi ── */

const NS_SVG = 'http://www.w3.org/2000/svg';

function elSvg(nama, attr) {
  const e = document.createElementNS(NS_SVG, nama);
  for (const k of Object.keys(attr)) e.setAttribute(k, String(attr[k]));
  return e;
}

/* Satu anotasi → elemen SVG. Koordinat ternormalisasi diubah ke piksel
   lapisan (lebar × tinggi kanvas di layar). */
function bentukAnot(a, w, h) {
  const X = x => x * w, Y = y => y * h;
  if (a.jenis === 'coret') {
    return elSvg('polyline', {
      points: a.pts.map(p => `${X(p.x)},${Y(p.y)}`).join(' '),
      fill: 'none', stroke: a.warna, 'stroke-width': 3,
      'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    });
  }
  if (a.jenis === 'sorot') {
    return elSvg('rect', {
      x: X(Math.min(a.x1, a.x2)), y: Y(Math.min(a.y1, a.y2)),
      width: X(Math.abs(a.x2 - a.x1)), height: Y(Math.abs(a.y2 - a.y1)),
      fill: a.warna, 'fill-opacity': 0.35,
    });
  }
  if (a.jenis === 'garis') {
    return elSvg('line', {
      x1: X(a.x1), y1: Y(a.y1), x2: X(a.x2), y2: Y(a.y2),
      stroke: a.warna, 'stroke-width': 3, 'stroke-linecap': 'round',
    });
  }
  /* komentar: penanda bulat; teksnya ada di atribut dan ditampilkan saat diketuk */
  return elSvg('circle', {
    cx: X(a.x), cy: Y(a.y), r: 10, fill: a.warna,
    class: 'komen', 'data-teks': a.teks,
  });
}

/* Pratinjau saat sedang menggambar (belum disimpan). */
function previewDari(g) {
  const warna = WARNA_ANOT[g.jenis];
  if (g.jenis === 'coret') return { jenis: 'coret', warna, pts: g.pts };
  return { jenis: g.jenis, warna, x1: g.p0.x, y1: g.p0.y, x2: g.p1.x, y2: g.p1.y };
}

function gambarAnot(s) {
  const svg = s.lapisan;
  if (!svg || !s.ukuran) return;
  const { w, h } = s.ukuran;
  svg.replaceChildren();
  for (const a of anotasiHalaman(s.anot, s.halaman)) svg.appendChild(bentukAnot(a, w, h));
  if (s.sementara) svg.appendChild(bentukAnot(s.sementara, w, h));
}

function buatLapisanAnot(s, w, h) {
  const svg = elSvg('svg', { class: 'pdfv-anot', viewBox: `0 0 ${w} ${h}`, width: w, height: h });
  s.lapisan = svg;
  s.ukuran = { w, h };
  gambarAnot(s);
  pasangPenunjukAnot(s, svg);
  return svg;
}

function setStatusAnot(s, pesan) {
  const el = s.overlay.querySelector('[data-anot-status]');
  if (el) el.textContent = pesan;
}

function segarkanAlatAnot(s) {
  s.overlay.querySelectorAll('[data-anot]').forEach(b =>
    b.classList.toggle('on', b.dataset.anot === s.alat));
  if (s.lapisan) s.lapisan.classList.toggle('aktif', !!s.alat);
  if (s.lapisan) s.lapisan.style.cursor = s.alat ? 'crosshair' : '';
}

async function simpanAnotUi(s) {
  try {
    await simpanAnotasi(s.blobId, s.anot);
    setStatusAnot(s, tr('Anotasi tersimpan'));
  } catch {
    setStatusAnot(s, tr('Anotasi belum tersimpan. Coba lagi.'));
  }
}

function tambahAnotDanSimpan(s, a) {
  s.anot = tambahAnotasi(s.anot, a);
  gambarAnot(s);
  return simpanAnotUi(s);
}

/* Ekspor PDF hasil anotasi (B1c). Tiap halaman dirender ke gambar, anotasinya
   digambar di atasnya, lalu semua ditulis ke PDF baru lewat ekspor-pdf.js.
   PDF asli tidak diubah. Berkas diunduh lewat tautan biasa. */
async function eksporAnot(s, nama) {
  if (s.mengekspor || !s.doc) return;
  s.mengekspor = true;
  try {
    const halaman = [];
    for (let i = 1; i <= s.total; i++) {
      setStatusAnot(s, `${tr('Mengekspor halaman')} ${i} / ${s.total}`);
      const page = await s.doc.getPage(i);
      const v1 = page.getViewport({ scale: 1 });
      const skala = Math.min(2, 2200 / Math.max(v1.width, v1.height));
      const vp = page.getViewport({ scale: skala });
      const kanvas = document.createElement('canvas');
      kanvas.width = Math.round(vp.width);
      kanvas.height = Math.round(vp.height);
      const ctx = kanvas.getContext('2d');
      if (!ctx) throw new Error('kanvas tidak tersedia');
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      const daftar = anotasiHalaman(s.anot, i);
      gambarAnotasiKanvas(ctx, kanvas.width, kanvas.height, daftar);
      const blob = await new Promise((res, rej) =>
        kanvas.toBlob(b => (b ? res(b) : rej(new Error('jpeg'))), 'image/jpeg', 0.9));
      const jpeg = new Uint8Array(await blob.arrayBuffer());
      halaman.push({
        w: v1.width, h: v1.height, pxW: kanvas.width, pxH: kanvas.height, jpeg,
        komentar: daftar.filter(a => a.jenis === 'komentar').map(a => ({ x: a.x, y: a.y, teks: a.teks })),
      });
      kanvas.width = 0;
      kanvas.height = 0;
    }
    const pdf = tulisPdfGambar(halaman);
    unduhBerkas(new Blob([pdf], { type: 'application/pdf' }), namaEkspor(nama));
    setStatusAnot(s, tr('PDF hasil anotasi sudah dibuat'));
  } catch (err) {
    setStatusAnot(s, tr('Ekspor gagal. Coba lagi.'));
  } finally {
    s.mengekspor = false;
  }
}

function namaEkspor(nama) {
  const dasar = String(nama || 'PDF').replace(/\.pdf$/i, '').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'PDF';
  return dasar + '-anotasi.pdf';
}

function unduhBerkas(blob, nama) {
  const a = document.createElement('a');
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = nama;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function batalAnotHalaman(s) {
  const baru = batalTerakhirHalaman(s.anot, s.halaman);
  if (baru.length === s.anot.length) {
    setStatusAnot(s, tr('Tidak ada anotasi di halaman ini'));
    return;
  }
  s.anot = baru;
  gambarAnot(s);
  simpanAnotUi(s);
}

function pasangPenunjukAnot(s, svg) {
  let g = null;   /* gerakan yang sedang berlangsung */
  const titik = e => titikTernormal(e.clientX, e.clientY, svg.getBoundingClientRect());

  svg.addEventListener('pointerdown', e => {
    if (!s.alat || !s.blobId) return;
    const p = titik(e);
    if (!p) return;
    e.preventDefault();
    if (s.alat === 'komentar') {
      const teks = (window.prompt(tr('Tulis komentar'), '') || '').trim().slice(0, MAKS_TEKS_KOMENTAR);
      if (!teks) return;
      tambahAnotDanSimpan(s, buatAnotasi('komentar', s.halaman, { x: p.x, y: p.y, teks }));
      return;
    }
    g = { jenis: s.alat, p0: p, p1: p, pts: [p] };
    try { svg.setPointerCapture(e.pointerId); } catch { /* tidak semua peramban */ }
    s.sementara = previewDari(g);
    gambarAnot(s);
  });

  svg.addEventListener('pointermove', e => {
    if (!g) return;
    const p = titik(e);
    if (!p) return;
    g.p1 = p;
    if (g.jenis === 'coret') g.pts.push(p);
    s.sementara = previewDari(g);
    gambarAnot(s);
  });

  const akhiri = e => {
    if (!g) return;
    const cur = g;
    g = null;
    s.sementara = null;
    const p = titik(e) || cur.p1;
    if (cur.jenis === 'coret') {
      const pts = [...cur.pts, p];
      if (pts.length >= 2) tambahAnotDanSimpan(s, buatAnotasi('coret', s.halaman, { pts }));
      else gambarAnot(s);
      return;
    }
    const x1 = cur.p0.x, y1 = cur.p0.y, x2 = p.x, y2 = p.y;
    /* ketukan tanpa geser tidak membuat apa-apa */
    if (Math.abs(x2 - x1) < 0.004 && Math.abs(y2 - y1) < 0.004) { gambarAnot(s); return; }
    tambahAnotDanSimpan(s, buatAnotasi(cur.jenis, s.halaman, { x1, y1, x2, y2 }));
  };
  svg.addEventListener('pointerup', akhiri);
  svg.addEventListener('pointercancel', () => { g = null; s.sementara = null; gambarAnot(s); });

  /* komentar yang sudah ada: diketuk saat tidak sedang menggambar */
  svg.addEventListener('click', e => {
    if (s.alat) return;
    const t = e.target.closest ? e.target.closest('.komen') : null;
    if (t) window.alert(t.getAttribute('data-teks'));
  });
}

function gagalTampil(s, pesan) {
  const isi = s.overlay.querySelector('[data-pdf-isi]');
  if (isi) isi.innerHTML = `<p class="pdfv-info pdfv-galat">${esc(pesan)}</p>`;
}
