/* C1 · Perekam memo suara yang stabil (Tahap 3).

   Sesi rekaman dipegang modul ini, bukan popup. Akibatnya:
   - menutup popup (ketuk di luar, Esc) TIDAK lagi membiarkan mikrofon menyala tanpa kendali;
   - saat merekam dan popup tertutup, bilah kecil menampilkan waktu dengan tombol
     Selesai dan Buang, sehingga pengguna tetap bisa mengetik di catatan (merekam sambil mengetik);
   - aplikasi yang disembunyikan (kunci layar, pindah aplikasi) menghentikan dan
     menyimpan rekaman yang sedang berjalan, supaya tidak hilang;
   - penanda waktu (Tandai) saat merekam dicatat sebagai posisi detik rekaman;
   - potongan audio diminta tiap detik, jadi isi parsial tetap ada bila perekam gagal;
   - rekaman kosong tidak disimpan; bila penyimpanan gagal, rekaman tidak dibuang
     dan bisa dicoba lagi dari bilah.
   Hasil dikirim lewat callback onSelesai, sehingga modul ini tidak bergantung pada editor. */

import { simpanBlob } from '../../core/blobs.js?v=20261029190000';
import { toast } from '../../core/toast.js?v=20261029190000';
import { t as tr } from '../../core/i18n.js?v=20261029190000';

const KANDIDAT_MIME = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

let sesi = null;      /* { rec, stream, potongan, mulai, judul, onSelesai, timer } */
let tertunda = null;  /* { blob, dur, judul, onSelesai } — rekaman yang gagal disimpan */
let bilah = null;
let penjagaPasang = false;

export function sedangMerekam() { return !!sesi; }
export function adaSimpanTertunda() { return !!tertunda; }

/* Format yang didukung peramban ini (Android Chrome: webm/opus; Safari: mp4). */
export function pilihMime() {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return '';
  return KANDIDAT_MIME.find(m => MediaRecorder.isTypeSupported(m)) || '';
}

/* Mulai merekam. Melempar galat bila izin mikrofon ditolak atau perekam tidak bisa dibuat.
   Mengembalikan false bila sudah ada sesi yang berjalan. */
export async function mulaiRekam({ judul = '', onSelesai }) {
  if (sesi) return false;
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mime = pilihMime();
  let rec;
  try {
    rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
  } catch (e) {
    stream.getTracks().forEach(t => t.stop());
    throw e;
  }
  const s = { rec, stream, potongan: [], mulai: Date.now(), judul, onSelesai, timer: null, tanda: [] };
  sesi = s;
  rec.ondataavailable = ev => { if (ev.data && ev.data.size > 0) s.potongan.push(ev.data); };
  rec.onerror = () => { hentikanRekam(true); };
  try {
    rec.start(1000);
  } catch (e) {
    sesi = null;
    stream.getTracks().forEach(t => t.stop());
    throw e;
  }
  s.timer = setInterval(segarkanRekam, 500);
  segarkanRekam();
  return true;
}

/* C2 · Tandai posisi rekaman saat ini (detik sejak mulai). Mengembalikan false bila tidak merekam. */
export function tandaiRekam() {
  const s = sesi;
  if (!s) return false;
  const t = Math.max(0, Math.round(((Date.now() - s.mulai) / 1000) * 10) / 10);
  s.tanda.push({ t, teks: '' });
  segarkanRekam();
  return true;
}

/* Hentikan sesi. simpan=false membuang rekaman. Aman dipanggil tanpa sesi. */
export function hentikanRekam(simpan = true) {
  const s = sesi;
  if (!s) return;
  sesi = null;
  clearInterval(s.timer);

  const selesai = () => {
    s.stream.getTracks().forEach(t => t.stop());
    const dur = Math.max(1, Math.round((Date.now() - s.mulai) / 1000));
    if (simpan) {
      const blob = new Blob(s.potongan, { type: s.rec.mimeType || 'audio/webm' });
      s.potongan = [];
      if (blob.size > 0) simpanMemo({ blob, dur, judul: s.judul, tanda: s.tanda, onSelesai: s.onSelesai });
      else toast(tr('Rekaman kosong, tidak ada yang disimpan'));
    }
    segarkanRekam();
  };

  if (s.rec.state !== 'inactive') {
    /* dataavailable terakhir selalu datang sebelum stop, jadi potongan sudah lengkap di sini */
    s.rec.addEventListener('stop', selesai, { once: true });
    try { s.rec.stop(); } catch (e) { selesai(); }
  } else {
    selesai();
  }
  segarkanRekam();
}

async function simpanMemo(memo) {
  const blobId = 'aud_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  try {
    await simpanBlob(blobId, memo.blob);
  } catch (e) {
    tertunda = memo;
    segarkanRekam();
    toast(tr('Memo suara gagal disimpan. Coba simpan lagi dari bilah rekam.'));
    return;
  }
  tertunda = null;
  memo.onSelesai({ blobId, dur: memo.dur, judul: memo.judul, tanda: memo.tanda || [] });
  segarkanRekam();
}

/* Coba simpan ulang rekaman yang gagal. */
export async function simpanUlang() {
  if (!tertunda) return;
  const m = tertunda;
  tertunda = null;
  await simpanMemo(m);
}

/* Buang rekaman yang gagal disimpan. */
export function buangTertunda() {
  tertunda = null;
  segarkanRekam();
}

export function formatWaktu(detik) {
  return `${String(Math.floor(detik / 60)).padStart(2, '0')}:${String(detik % 60).padStart(2, '0')}`;
}

function pastikanBilah() {
  if (bilah && bilah.isConnected) return bilah;
  bilah = document.createElement('div');
  bilah.id = 'aud-rec-bar';
  bilah.className = 'aud-rec-bar';
  bilah.hidden = true;
  bilah.setAttribute('role', 'status');
  bilah.innerHTML = `
    <span class="aud-rec-dot" aria-hidden="true"></span>
    <span class="aud-rec-bar-teks"></span>
    <button type="button" class="btn btn-sec" data-aud-bar="tanda"></button>
    <button type="button" class="btn btn-pri" data-aud-bar="aksi"></button>
    <button type="button" class="btn btn-sec" data-aud-bar="buang"></button>`;
  bilah.addEventListener('click', e => {
    const b = e.target.closest('[data-aud-bar]');
    if (!b) return;
    if (b.dataset.audBar === 'tanda') {
      if (tandaiRekam()) toast(tr('Tanda ditambahkan'));
    } else if (b.dataset.audBar === 'aksi') {
      if (sesi) hentikanRekam(true);
      else simpanUlang();
    } else if (b.dataset.audBar === 'buang') {
      if (sesi) hentikanRekam(false);
      else buangTertunda();
    }
  });
  document.body.appendChild(bilah);
  return bilah;
}

/* Perbarui waktu di popup (bila terbuka) dan bilah rekam (bila popup tertutup). */
export function segarkanRekam() {
  if (typeof document === 'undefined') return;
  /* Popup yang ditutup tetap menyisakan isinya di DOM, jadi yang dicek adalah kelas 'on'. */
  const pop = document.getElementById('pop');
  const popupBuka = !!(pop && pop.classList.contains('on') && document.getElementById('aud-waktu'));
  const elWaktu = document.getElementById('aud-waktu');
  const elDot = document.getElementById('aud-dot');
  if (elWaktu && sesi) elWaktu.textContent = formatWaktu(Math.floor((Date.now() - sesi.mulai) / 1000));
  if (elDot) elDot.classList.toggle('on', !!sesi);

  const b = pastikanBilah();
  const teks = b.querySelector('.aud-rec-bar-teks');
  const aksi = b.querySelector('[data-aud-bar="aksi"]');
  const buang = b.querySelector('[data-aud-bar="buang"]');
  const tanda = b.querySelector('[data-aud-bar="tanda"]');
  tanda.hidden = !sesi;
  if (sesi) {
    teks.textContent = `${tr('Merekam')} ${formatWaktu(Math.floor((Date.now() - sesi.mulai) / 1000))}`;
    aksi.textContent = tr('Selesai & simpan');
    buang.textContent = tr('Buang');
    tanda.textContent = tr('Tandai');
  } else if (tertunda) {
    teks.textContent = tr('Memo suara belum tersimpan');
    aksi.textContent = tr('Simpan lagi');
    buang.textContent = tr('Buang');
  }
  b.classList.toggle('on', !!sesi);
  b.querySelector('.aud-rec-dot').classList.toggle('on', !!sesi);
  /* Saat popup terbuka dan sedang merekam, popup sudah memuat kendalinya sendiri. */
  b.hidden = (popupBuka && !!sesi) || (!sesi && !tertunda);
}

/* Hentikan dan simpan saat aplikasi disembunyikan. Dipasang sekali saat modul dimuat. */
export function pasangPenjagaLatar() {
  if (penjagaPasang || typeof document === 'undefined') return;
  penjagaPasang = true;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && sesi) hentikanRekam(true);
  });
  window.addEventListener('pagehide', () => { if (sesi) hentikanRekam(true); });
}

pasangPenjagaLatar();
