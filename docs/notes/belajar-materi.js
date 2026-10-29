/* C5 · Tampilan belajar: materi dan catatan berdampingan (Tahap 3).
   C3 · Picture-in-picture untuk video materi (Tahap 3).

   Mode ini hanya tata letak di dalam editor. Editor tetap satu-satunya
   penulis catatan (autosave, binding, cur === 'editor' tidak berubah);
   panel materi di sebelah kiri berisi materi dari lampiran catatan mana pun,
   atau URL video langsung yang ditempel pengguna.

   - Lebar sempit (HP): satu panel tampil, dipilih lewat tab Materi / Catatan.
   - Lebar lega: dua kolom. Panel materi menempel saat catatan digulir.
   - Panel materi tidak punya pintasan keyboard global. Tombol panah hanya
     berlaku saat fokus ada di dalam panel materi.
   - Materi PDF dirender dengan pdf.js yang sama dengan penampil (B1/B2).
   - Materi video (lampiran lokal atau URL langsung) diputar dengan <video>.
     Tombol Picture-in-picture hanya tampil bila peramban mendukungnya.
   - Video yang sedang PiP dipindahkan ke wadah tersembunyi saat panel digambar
     ulang, sehingga jendela mengambang tetap jalan saat mencatat.
   - Iframe tidak didukung: sanitasi membuangnya, dan konten lintas-asal di
     dalamnya tidak bisa dibuka atau di-PiP-kan oleh halaman ini. */
import { state } from '../core/store.js?v=20261029160000';
import { go, cur, onAfterRender, onBeforeLeave } from '../core/router.js?v=20261029160000';
import { t as tr } from '../core/i18n.js?v=20261029160000';
import { esc } from '../core/dom.js?v=20261029160000';
import { ambilBlob } from '../core/blobs.js?v=20261029160000';
import { toast } from '../core/toast.js?v=20261029160000';
import { saveNow } from './editor/cleanup.js?v=20261029160000';
import { muatPdfJs, fiturPdfKurang, OPSI_WASM_PDFJS } from './pdf/muat-pdfjs.js?v=20261029160000';
import { adalahPdf, ZOOM_BAWAAN, zoomBerikut, zoomSebelumnya, halamanBerikut, halamanSebelumnya,
         skalaPasLebar } from './pdf/logika.js?v=20261029160000';
import { simpanBlob, hapusBlob } from '../core/blobs.js?v=20261029160000';
import { sematkanBlokGambar } from './editor/image.js?v=20261029160000';
import { snap } from './editor/history.js?v=20261029160000';
import { formatWaktu } from './editor/perekam-suara.js?v=20261029160000';

const ID_TAHAN = 'belajar-pip-tahan';
const GALAT_VIDEO = 'Video tidak bisa diputar. Formatnya tidak didukung, sumbernya tidak tersedia, atau dibatasi.';

let aktif = false;     /* mode belajar nyala (bertahan lintas catatan selama sesi) */
let materiId = null;   /* id materi yang dipilih: blobId (PDF/video lampiran) atau 'url-N' */
let sesi = null;       /* { root, isi, doc, task, render, halaman, total, zoom, pas, tok, ... } */
let urlMateri = [];    /* URL video langsung yang ditempel pengguna (ingatan sesi) */
let urlSeq = 0;

export const belajarAktif = () => aktif;

/* Berkas video: mime video/*, atau nama berakhiran ekstensi video bila mime kosong. */
export function adalahVideo(meta) {
  const mime = String(meta?.mime || '').toLowerCase();
  if (mime.startsWith('video/')) return true;
  return /\.(mp4|webm|ogv|m4v|mov)$/i.test(String(meta?.name || '')) && (mime === '' || mime === 'application/octet-stream');
}

/* Picture-in-picture tersedia bila peramban punya API standar, atau API Safari. */
export function pipDidukung() {
  if (document.pictureInPictureEnabled && typeof HTMLVideoElement !== 'undefined'
      && HTMLVideoElement.prototype.requestPictureInPicture) return true;
  const v = document.createElement('video');
  return typeof v.webkitSupportsPresentationMode === 'function' && v.webkitSupportsPresentationMode('picture-in-picture');
}

function urlAman(teks) {
  try {
    const u = new URL(teks);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
}

function namaDariUrl(teks) {
  try {
    const u = new URL(teks);
    const akhir = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || '');
    return akhir || u.host;
  } catch { return teks; }
}

/* Semua materi yang bisa dipilih: PDF dan video dari lampiran catatan (catatan di
   Sampah dilewati), lalu URL video langsung. Urutan mengikuti urutan catatan. */
export function daftarMateri() {
  const hasil = [];
  for (const n of state.notes || []) {
    if (n.deletedAt) continue;
    for (const b of n.blocks || []) {
      if (b.type !== 'file') continue;
      const catatan = n.title || tr('Tanpa judul');
      if (adalahPdf(b.meta)) {
        hasil.push({ id: b.meta.blobId, jenis: 'pdf', nama: b.meta.name || 'PDF', catatan });
      } else if (adalahVideo(b.meta)) {
        hasil.push({ id: b.meta.blobId, jenis: 'video', nama: b.meta.name || 'Video', catatan });
      }
    }
  }
  for (const u of urlMateri) {
    hasil.push({ id: u.id, jenis: 'url', nama: u.nama, catatan: tr('URL video'), url: u.url });
  }
  return hasil;
}

function opsiMateriHtml(daftar) {
  if (!daftar.length) return `<option value="">${esc(tr('Belum ada materi'))}</option>`;
  return daftar.map(m => `<option value="${esc(m.id)}"${m.id === materiId ? ' selected' : ''}>${esc(m.nama)} · ${esc(m.catatan)}</option>`).join('');
}

/* Bagian pembuka dan penutup untuk view editor. Kosong bila mode mati. */
export function belajarBuka() {
  if (!aktif) return '';
  const daftar = daftarMateri();
  const info = daftar.length ? tr('Memuat PDF…') : tr('Belum ada materi. Lampirkan PDF atau video ke catatan, atau tempel URL video.');
  return `<div class="belajar" data-belajar-root data-tab="catatan" data-jenis="">
  <div class="belajar-tab" role="tablist">
    <button type="button" class="belajar-tb" role="tab" data-belajar-tab="materi" aria-selected="false">${esc(tr('Materi'))}</button>
    <button type="button" class="belajar-tb on" role="tab" data-belajar-tab="catatan" aria-selected="true">${esc(tr('Catatan'))}</button>
  </div>
  <section class="belajar-materi" aria-label="${esc(tr('Materi'))}">
    <div class="belajar-bar">
      <select class="belajar-pilih" data-belajar-pilih aria-label="${esc(tr('Pilih materi'))}"${daftar.length ? '' : ' disabled'}>${opsiMateriHtml(daftar)}</select>
      <div class="belajar-kendali">
        <span data-belajar-pdf-only>
          <button type="button" class="belajar-b" data-belajar-aksi="prev" aria-label="${esc(tr('Halaman sebelumnya'))}">‹</button>
          <span class="belajar-hal" data-belajar-hal>–</span>
          <button type="button" class="belajar-b" data-belajar-aksi="next" aria-label="${esc(tr('Halaman berikutnya'))}">›</button>
          <button type="button" class="belajar-b" data-belajar-aksi="kecil" aria-label="${esc(tr('Perkecil'))}">−</button>
          <span class="belajar-zoom" data-belajar-zoom>100%</span>
          <button type="button" class="belajar-b" data-belajar-aksi="besar" aria-label="${esc(tr('Perbesar'))}">+</button>
          <button type="button" class="belajar-teks" data-belajar-aksi="pas">${esc(tr('Pas lebar'))}</button>
        </span>
        <button type="button" class="belajar-teks" data-belajar-pip data-belajar-aksi="pip" aria-pressed="false" hidden>${esc(tr('Picture-in-picture'))}</button>
        <button type="button" class="belajar-teks" data-belajar-frame data-belajar-aksi="frame" hidden>${esc(tr('Ambil frame'))}</button>
        <span class="belajar-hint" data-belajar-frame-info hidden>${esc(tr('Frame tidak bisa diambil: server video tidak mengizinkan akses lintas-asal (CORS).'))}</span>
      </div>
    </div>
    <div class="belajar-url">
      <input type="url" class="belajar-url-in" data-belajar-url placeholder="${esc(tr('Tempel URL video langsung (.mp4, .webm)'))}" aria-label="${esc(tr('Tempel URL video langsung (.mp4, .webm)'))}" autocomplete="off" spellcheck="false">
      <button type="button" class="belajar-teks" data-belajar-aksi="url-pakai">${esc(tr('Pakai'))}</button>
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
   digambar ulang membaca isi terbaru. Video PiP tidak ikut dihentikan. */
export function toggleBelajar(nyala = !aktif) {
  if (cur !== 'editor') {
    toast(tr('Buka catatan dulu, lalu pilih Mode belajar'));
    return;
  }
  aktif = !!nyala;
  saveNow();
  lepasMateri();
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
  const daftar = daftarMateri();
  if (!materiId || !daftar.some(m => m.id === materiId)) materiId = daftar[0]?.id || null;

  sesi = { root, isi, doc: null, task: null, render: null, halaman: 1, total: 0,
           zoom: ZOOM_BAWAAN, pas: true, tok: 0, timer: null, ro: null, lebarTerakhir: -1 };
  const s = sesi;

  root.addEventListener('click', e => {
    const tab = e.target.closest('[data-belajar-tab]');
    if (tab) return pilihTab(root, tab.dataset.belajarTab);
    const b = e.target.closest('[data-belajar-aksi]');
    if (b && !b.disabled) aksi(s, b.dataset.belajarAksi);
  });
  root.querySelector('[data-belajar-pilih]')?.addEventListener('change', e => {
    if (sesi === s && e.target.value) muatMateri(s, e.target.value);
  });
  root.querySelector('[data-belajar-url]')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); tambahUrl(s); }
  });
  isi.addEventListener('keydown', e => {
    if (!s.doc) return;   /* panah hanya untuk PDF; video memakai kontrolnya sendiri */
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

  if (!materiId) {
    setJenis(s, '');
    return info(s, tr('Belum ada materi. Lampirkan PDF atau video ke catatan, atau tempel URL video.'));
  }
  muatMateri(s, materiId);
}

/* Melepas sesi materi. Video yang sedang PiP dipindah ke wadah tersembunyi,
   yang lain dibuang. Dipanggil sebelum editor digambar ulang. */
export function lepasMateri() {
  const s = sesi;
  if (!s) return;
  sesi = null;
  clearTimeout(s.timer);
  s.ro?.disconnect();
  try { s.render?.cancel(); } catch {}
  try { s.task?.destroy(); } catch {}
  kosongkanIsi(s);
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

function segarkanPilihan(s) {
  const sel = s.root.querySelector('[data-belajar-pilih]');
  if (!sel) return;
  const daftar = daftarMateri();
  sel.innerHTML = opsiMateriHtml(daftar);
  sel.disabled = !daftar.length;
  sel.value = materiId || '';
}

/* Mengatur bagian kendali sesuai jenis materi yang tampil. */
function setJenis(s, jenis) {
  s.root.dataset.jenis = jenis;
  s.root.querySelectorAll('[data-belajar-pdf-only]').forEach(e => { e.hidden = jenis !== 'pdf'; });
  segarkanPip(s);
}

function info(s, pesan) {
  if (!s.isi) return;
  kosongkanIsi(s);
  s.isi.innerHTML = `<p class="belajar-info">${esc(pesan)}</p>`;
  setLabel(s);
  segarkanPip(s);
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
  if (sesi !== s) return;
  if (a === 'pip') return togglePip(s);
  if (a === 'frame') return tangkapFrame(s);
  if (a === 'url-pakai') return tambahUrl(s);
  if (!s.doc) return;
  if (a === 'prev') { s.halaman = halamanSebelumnya(s.halaman, s.total); s.isi.scrollTop = 0; tampil(s); }
  else if (a === 'next') { s.halaman = halamanBerikut(s.halaman, s.total); s.isi.scrollTop = 0; tampil(s); }
  else if (a === 'besar') { s.pas = false; s.zoom = zoomBerikut(s.zoom); tampil(s); }
  else if (a === 'kecil') { s.pas = false; s.zoom = zoomSebelumnya(s.zoom); tampil(s); }
  else if (a === 'pas') { s.pas = true; tampil(s); }
}

/* ── Video ── */

function wadahTahan() {
  let t = document.getElementById(ID_TAHAN);
  if (!t) {
    t = document.createElement('div');
    t.id = ID_TAHAN;
    t.className = 'belajar-pip-tahan';
    t.setAttribute('aria-hidden', 'true');
    document.body.appendChild(t);
  }
  return t;
}

/* Video yang sedang PiP dipindah ke wadah tersembunyi (jangan dilepas dari DOM,
   karena itu bisa menutup jendela mengambang). Video lain dibuang. */
function kosongkanIsi(s) {
  if (!s?.isi) return;
  for (const v of [...s.isi.querySelectorAll('video')]) {
    if (document.pictureInPictureElement === v) wadahTahan().appendChild(v);
    else buangVideo(v);
  }
}

function buangVideo(v) {
  if (!v || v._dibuang) return;
  v._dibuang = true;
  if (document.pictureInPictureElement === v) document.exitPictureInPicture?.().catch(() => {});
  try { v.pause(); } catch {}
  v.removeAttribute('src');
  try { v.load(); } catch {}
  if (v._blobUrl) URL.revokeObjectURL(v._blobUrl);
  v.remove();
}

function buatVideo(kunci, src, blobUrl, lintasAsal = false) {
  const v = document.createElement('video');
  v.className = 'belajar-video';
  v.controls = true;
  v.playsInline = true;
  v.preload = 'metadata';
  v._kunci = kunci;
  v._blobUrl = blobUrl;
  v._dibuang = false;
  v._cors = lintasAsal;
  if (lintasAsal) v.crossOrigin = 'anonymous';
  v.addEventListener('error', () => {
    if (v._dibuang || !v.error) return;
    /* URL lintas-asal yang servernya menolak CORS: putar ulang tanpa CORS. Video
       tetap bisa diputar dan di-PiP; hanya pengambilan frame yang tidak tersedia. */
    if (v._cors) {
      v._cors = false;
      v.removeAttribute('crossorigin');
      v.load();
      return;
    }
    if (sesi && sesi.isi.contains(v)) info(sesi, tr(GALAT_VIDEO));
  });
  v.addEventListener('loadeddata', () => {
    if (v._dibuang) return;
    v._frameOk = probeCanvasBersih(v);
    if (sesi && sesi.isi.contains(v)) segarkanPip(sesi);
  });
  v.addEventListener('enterpictureinpicture', () => { if (sesi) segarkanPip(sesi); });
  v.addEventListener('leavepictureinpicture', () => {
    if (sesi && sesi.isi.contains(v)) segarkanPip(sesi);
    else buangVideo(v);
  });
  v.src = src;
  return v;
}

async function muatVideo(s, item) {
  info(s, tr('Memuat video…'));
  if (sesi !== s || materiId !== item.id) return;
  /* video yang masih PiP dan berasal dari materi yang sama dipakai lagi (tidak dimuat ulang) */
  const pip = document.pictureInPictureElement;
  let v = pip && pip._kunci === item.id ? pip : null;
  if (!v) {
    let src; let blobUrl = null;
    if (item.jenis === 'url') {
      src = item.url;
    } else {
      const blob = await ambilBlob(item.id);
      if (sesi !== s || materiId !== item.id) return;
      if (!blob) return info(s, tr('Berkas lampiran tidak ditemukan'));
      if (blob.type && !document.createElement('video').canPlayType(blob.type)) {
        return info(s, tr('Format video ini tidak didukung peramban ini.'));
      }
      blobUrl = URL.createObjectURL(blob);
      src = blobUrl;
    }
    v = buatVideo(item.id, src, blobUrl, item.jenis === 'url');
  }
  if (sesi !== s || materiId !== item.id) {
    if (v !== pip) buangVideo(v);
    return;
  }
  s.isi.replaceChildren(v);
  segarkanPip(s);
}

async function togglePip(s) {
  const v = s.isi.querySelector('video');
  if (!v) return;
  try {
    if (document.pictureInPictureElement === v) {
      await document.exitPictureInPicture();
    } else if (document.pictureInPictureEnabled && v.requestPictureInPicture) {
      await v.requestPictureInPicture();
    } else if (typeof v.webkitSetPresentationMode === 'function' && v.webkitSupportsPresentationMode?.('picture-in-picture')) {
      v.webkitSetPresentationMode(v.webkitPresentationMode === 'picture-in-picture' ? 'inline' : 'picture-in-picture');
    } else {
      toast(tr('Peramban ini tidak mendukung picture-in-picture untuk video.'));
      return;
    }
  } catch {
    toast(tr('Gagal membuka picture-in-picture'));
  }
  segarkanPip(s);
}

function segarkanPip(s) {
  const btn = s?.root?.querySelector('[data-belajar-pip]');
  if (!btn) return;
  const v = s.isi?.querySelector('video');
  const on = !!v && document.pictureInPictureElement === v;
  /* tombol hanya untuk video yang benar-benar termuat (bukan saat galat atau memuat) */
  btn.hidden = !(s.root.dataset.jenis === 'video' && pipDidukung() && v);
  btn.setAttribute('aria-pressed', String(on));
  btn.textContent = on ? tr('Tutup picture-in-picture') : tr('Picture-in-picture');
  segarkanFrame(s);
}

/* ── Tangkap frame (C4) ── */

/* Kanvas yang sudah menggambar video tidak boleh ternoda (tainted). Video lokal
   (blob:) dan video lintas-asal yang dimuat dengan CORS lolos; yang tanpa CORS
   tidak. Diperiksa sekali saat metadata/data pertama tiba. */
function probeCanvasBersih(v) {
  try {
    const c = document.createElement('canvas');
    c.width = 1; c.height = 1;
    c.getContext('2d').drawImage(v, 0, 0, 1, 1);
    c.toDataURL('image/png');
    return true;
  } catch { return false; }
}

/* Tombol Ambil frame hanya untuk video yang sudah termuat dan bisa diambil.
   Bila sumber lintas-asal tidak mengizinkan CORS, tampil keterangan singkat. */
function segarkanFrame(s) {
  const btn = s?.root?.querySelector('[data-belajar-frame]');
  if (!btn) return;
  const info = s.root.querySelector('[data-belajar-frame-info]');
  const v = s.isi?.querySelector('video');
  const adaVideo = s.root.dataset.jenis === 'video' && !!v && v.readyState >= 2;
  btn.hidden = !(adaVideo && v._frameOk === true);
  if (info) info.hidden = !(adaVideo && v._frameOk === false);
}

/* Mengambil frame pada posisi video sekarang, lalu menyisipkannya sebagai blok
   gambar di posisi kursor catatan. Frame disimpan sebagai blob JPEG sendiri,
   jadi tetap ada walau video dihapus dari daftar materi. */
async function tangkapFrame(s) {
  const v = s.isi?.querySelector('video');
  if (!v || v._frameOk !== true || v.readyState < 2 || !v.videoWidth) return;
  const idCatatan = state.openId;
  const d = document.querySelector('.ed-doc');
  if (!d) return;

  const kanvas = document.createElement('canvas');
  kanvas.width = v.videoWidth;
  kanvas.height = v.videoHeight;
  let blob;
  try {
    kanvas.getContext('2d').drawImage(v, 0, 0);
    blob = await new Promise((ok, gagal) =>
      kanvas.toBlob(b => (b ? ok(b) : gagal(new Error('kosong'))), 'image/jpeg', 0.92));
  } catch {
    toast(tr('Frame tidak bisa diambil dari sumber ini'));
    return;
  }

  const waktu = formatWaktu(Math.floor(v.currentTime));
  const nama = daftarMateri().find(m => m.id === materiId)?.nama || 'Video';
  const id = 'fr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  try { await simpanBlob(id, blob); }
  catch { toast(tr('Gagal menyimpan gambar')); return; }

  /* sasaran sudah bergeser (pindah catatan, keluar editor) selama menyimpan? buang blob */
  const masihSama = () => cur === 'editor' && state.openId === idCatatan
    && document.querySelector('.ed-doc') === d && d.isConnected;
  if (!masihSama()) { try { await hapusBlob(id); } catch {} return; }

  snap();
  await sematkanBlokGambar(id, `${tr('Frame video')} · ${waktu} · ${nama}`);
  toast(tr('Frame disisipkan ke catatan'));
}

/* URL video langsung: hanya http/https. Halaman biasa (mis. tautan video dengan
   iframe) tidak akan bisa diputar dan menampilkan galat. */
function tambahUrl(s) {
  const kolom = s.root.querySelector('[data-belajar-url]');
  const teks = (kolom?.value || '').trim();
  if (!urlAman(teks)) {
    toast(tr('URL harus diawali http:// atau https://'));
    return;
  }
  let u = urlMateri.find(x => x.url === teks);
  if (!u) {
    u = { id: 'url-' + (++urlSeq), url: teks, nama: namaDariUrl(teks) };
    urlMateri.push(u);
  }
  if (kolom) kolom.value = '';
  materiId = u.id;
  segarkanPilihan(s);
  muatMateri(s, u.id);
}

/* ── Pemuatan materi ── */

async function muatMateri(s, id) {
  if (sesi !== s) return;
  const item = daftarMateri().find(m => m.id === id);
  if (!item) return;
  materiId = id;
  lepasDokumen(s);
  s.halaman = 1;
  s.lebarTerakhir = -1;
  setJenis(s, item.jenis === 'pdf' ? 'pdf' : 'video');
  if (item.jenis === 'pdf') return muatPdf(s, item.id);
  return muatVideo(s, item);
}

function lepasDokumen(s) {
  try { s.render?.cancel(); } catch {}
  try { s.task?.destroy(); } catch {}
  s.render = null; s.task = null; s.doc = null; s.total = 0;
}

async function muatPdf(s, blobId) {
  info(s, tr('Memuat PDF…'));
  const kurang = fiturPdfKurang();
  if (kurang.length) return info(s, tr('Peramban ini terlalu lama untuk menampilkan PDF. Perbarui peramban atau WebView.'));

  const blob = await ambilBlob(blobId);
  if (sesi !== s || materiId !== blobId) return;
  if (!blob) return info(s, tr('Berkas lampiran tidak ditemukan'));
  const data = new Uint8Array(await blob.arrayBuffer());
  if (sesi !== s || materiId !== blobId) return;

  let lib;
  try { lib = await muatPdfJs(); }
  catch { if (sesi === s) info(s, tr('PDF tidak bisa dibuka. Berkasnya mungkin rusak atau dilindungi kata sandi.')); return; }
  if (sesi !== s || materiId !== blobId) return;

  const task = lib.getDocument({ data, isEvalSupported: false, useSystemFonts: false, ...OPSI_WASM_PDFJS });
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
  if (sesi !== s || s.task !== task || materiId !== blobId) { try { doc.destroy(); } catch {} return; }
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
  kosongkanIsi(s);
  s.isi.replaceChildren(bungkus);

  s.render = page.render({ canvasContext: ctx, viewport: vp });
  try { await s.render.promise; }
  catch (err) { if (err?.name !== 'RenderingCancelledException' && sesi === s) info(s, tr('PDF tidak bisa dibuka. Berkasnya mungkin rusak atau dilindungi kata sandi.')); }
}
