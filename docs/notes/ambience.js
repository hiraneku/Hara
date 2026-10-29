/* Suara latar belajar (C10, Tahap 4) — glue UI dan mesin audio.

   • Sumber: derau yang dibuat di kode (ambience-murni.js). Tidak ada berkas audio.
   • Pemutaran hidup di modul ini, bukan di lembar. Menutup lembar tidak menghentikannya.
   • Pengaturan (jenis, volume, batas berhenti) disimpan di localStorage (kunci hara.ambience.v1).
     Keadaan pemutaran hanya di memori: muat ulang halaman menghentikannya.
   • Browser bisa memblokir audio sebelum ada ketukan pengguna. Pemutaran dimulai hanya dari tombol Putar.
   • Di HP, browser bisa menghentikan audio saat layar terkunci. Belum diuji di perangkat sungguhan. */

import { t as tr } from '../core/i18n.js?v=20261029220000';
import { toast } from '../core/toast.js?v=20261029220000';
import { esc } from '../core/dom.js?v=20261029220000';
import { openPop, pop } from './menus/pop.js?v=20261029220000';
import { sheet } from './sheet.js?v=20261029220000';
import {
  JENIS, HENTI_MENIT, normalisasi, buatSampel, gainUntuk, sisaHenti, sudahHabis, PANJANG_DETIK,
} from './ambience-murni.js?v=20261029220000';

const KUNCI = 'hara.ambience.v1';
const LABEL_JENIS = { 'putih': 'Derau putih', 'merah-muda': 'Derau merah muda', 'cokelat': 'Derau cokelat' };
const LABEL_HENTI = { 0: 'Tanpa batas', 15: '15 menit', 30: '30 menit', 60: '1 jam' };

function muatPengaturan() {
  try { return normalisasi(JSON.parse(localStorage.getItem(KUNCI))); }
  catch (e) { return normalisasi(null); }
}
function simpanPengaturan() {
  try { localStorage.setItem(KUNCI, JSON.stringify(p)); } catch (e) { /* penyimpanan penuh: pemutaran tetap jalan */ }
}

let p = muatPengaturan();
let ctx = null;
let gain = null;
let sumber = null;
let mulaiMs = 0;
let status = 'henti';          /* 'putar' | 'henti' */
let timerHenti = null;
let tik = null;
const cacheBuffer = new Map();

/* Buffer loop per jenis dan laju sampel. Dibuat sekali, dipakai ulang. */
function bufferUntuk(jenis, sr) {
  const kunci = `${jenis}-${sr}`;
  if (cacheBuffer.has(kunci)) return cacheBuffer.get(kunci);
  const jumlah = Math.round(sr * PANJANG_DETIK);
  const buf = ctx.createBuffer(1, jumlah, sr);
  buf.copyToChannel(buatSampel(jenis, jumlah), 0);
  cacheBuffer.set(kunci, buf);
  return buf;
}

function mulaiSumber() {
  const src = ctx.createBufferSource();
  src.buffer = bufferUntuk(p.suara, ctx.sampleRate);
  src.loop = true;
  src.connect(gain);
  src.start();
  return src;
}

function hentikanTimer() {
  clearTimeout(timerHenti); timerHenti = null;
  clearInterval(tik); tik = null;
}

function jadwalkanHenti() {
  clearTimeout(timerHenti); timerHenti = null;
  const sisa = sisaHenti(mulaiMs, p.henti, Date.now());
  if (sisa === null) return;
  if (sisa <= 0) { henti(); return; }
  timerHenti = setTimeout(henti, sisa);
}

async function putar() {
  if (status === 'putar') return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) { toast(tr('Browser ini tidak mendukung suara latar.')); return; }
  try {
    ctx = new AC();
    gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.connect(ctx.destination);
    await ctx.resume();
    if (ctx.state !== 'running') {
      toast(tr('Suara diblokir browser. Ketuk Putar sekali lagi.'));
      await ctx.close().catch(() => {});
      ctx = null; gain = null;
      return;
    }
    sumber = mulaiSumber();
    gain.gain.setTargetAtTime(gainUntuk(p.volume), ctx.currentTime, 0.15);
    mulaiMs = Date.now();
    status = 'putar';
    jadwalkanHenti();
    tik = setInterval(segarkanStatus, 1000);
  } catch (e) {
    toast(tr('Suara latar tidak bisa diputar.'));
    if (ctx) ctx.close().catch(() => {});
    ctx = null; gain = null; sumber = null;
    status = 'henti';
  }
  segarkan();
}

function henti() {
  hentikanTimer();
  if (ctx && gain && sumber) {
    const c = ctx, g = gain, s = sumber;
    g.gain.setTargetAtTime(0, c.currentTime, 0.1);
    setTimeout(() => {
      try { s.stop(); } catch (e) { /* sudah berhenti */ }
      c.close().catch(() => {});
    }, 400);
  }
  ctx = null; gain = null; sumber = null;
  mulaiMs = 0;
  status = 'henti';
  segarkan();
}

function gantiSuara(jenis) {
  p = normalisasi({ ...p, suara: jenis });
  simpanPengaturan();
  if (status === 'putar' && ctx) {
    const lama = sumber;
    sumber = mulaiSumber();
    if (lama) { try { lama.stop(ctx.currentTime + 0.1); } catch (e) { /* abaikan */ } }
  }
  segarkan();
}

function gantiVolume(v) {
  p = normalisasi({ ...p, volume: v });
  simpanPengaturan();
  if (status === 'putar' && gain) gain.gain.setTargetAtTime(gainUntuk(p.volume), ctx.currentTime, 0.05);
  /* tanpa segarkan penuh: slider sedang digeser */
}

function gantiHenti(menit) {
  p = normalisasi({ ...p, henti: menit });
  simpanPengaturan();
  if (status === 'putar') {
    if (sudahHabis(mulaiMs, p.henti, Date.now())) { henti(); return; }
    jadwalkanHenti();
  }
  segarkan();
}

function teksStatus() {
  if (status !== 'putar') return tr('Berhenti');
  const sisa = sisaHenti(mulaiMs, p.henti, Date.now());
  if (sisa === null) return tr('Sedang diputar');
  const detik = Math.ceil(sisa / 1000);
  const m = Math.floor(detik / 60), s = detik % 60;
  return `${tr('Sedang diputar')} · ${tr('Sisa')} ${m}:${String(s).padStart(2, '0')}`;
}

function isi() {
  const jenis = JENIS.map(j => `<button type="button" class="ab-pil" data-ab-suara="${esc(j)}" aria-pressed="${p.suara === j}">${esc(tr(LABEL_JENIS[j]))}</button>`).join('');
  const henti = HENTI_MENIT.map(m => `<option value="${m}"${p.henti === m ? ' selected' : ''}>${esc(tr(LABEL_HENTI[m]))}</option>`).join('');
  return `<div class="ab-wrap">
      <div class="ab-status" id="ab-status" aria-live="polite">${esc(teksStatus())}</div>
      <div class="ab-mode" role="group" aria-label="${esc(tr('Jenis suara'))}">${jenis}</div>
      <label class="ab-lab" for="ab-volume">${esc(tr('Volume'))}</label>
      <input class="ab-rentang" id="ab-volume" type="range" min="0" max="100" step="1" value="${p.volume}" data-ab-volume>
      <label class="ab-lab" for="ab-henti">${esc(tr('Berhenti otomatis'))}</label>
      <select class="ab-input" id="ab-henti" data-ab-henti>${henti}</select>
      <button type="button" class="btn ${status === 'putar' ? 'btn-sec' : 'btn-pri'} ab-lebar" data-ab-aksi="${status === 'putar' ? 'henti' : 'putar'}">${esc(tr(status === 'putar' ? 'Berhenti' : 'Putar'))}</button>
      <p class="ab-catatan">${esc(tr('Derau dibuat di aplikasi, tanpa berkas audio. Suara tetap jalan saat lembar ditutup, dan berhenti saat halaman dimuat ulang.'))}</p>
    </div>`;
}

function segarkanStatus() {
  if (status !== 'putar') { hentikanTimer(); return; }
  const el = document.getElementById('ab-status');
  if (el) el.textContent = teksStatus();
  if (sudahHabis(mulaiMs, p.henti, Date.now())) henti();
}

/* Segarkan isi lembar bila sedang terbuka. */
function segarkan() {
  const el = pop();
  if (!el || !el.classList.contains('on')) return;
  const w = el.querySelector('.ab-wrap');
  if (w) w.outerHTML = isi();
}

/* Lembar Suara latar. Dipanggil dari menu Lainnya dan dari palet perintah. */
export function bukaAmbience() {
  openPop(sheet({
    ikon: 'i-music',
    judul: tr('Suara latar'),
    catatan: esc(tr('Derau untuk belajar, dengan volume dan batas berhenti.')),
    isi: isi(),
    kelas: 'ab-sh',
  }), null);
  if (status === 'putar' && !tik) tik = setInterval(segarkanStatus, 1000);
}

/* Keadaan untuk uji dan diagnosis. Tidak dipakai UI. */
export function ambienceKeadaan() {
  return {
    status,
    suara: p.suara,
    volume: p.volume,
    henti: p.henti,
    sisaMs: status === 'putar' ? sisaHenti(mulaiMs, p.henti, Date.now()) : null,
    ctxState: ctx ? ctx.state : null,
  };
}

/* Pemasangan sekali, dari app.js. Delegasi di dokumen, karena lembar dibuat ulang. */
let terpasang = false;
export function pasangAmbience() {
  if (terpasang) return;
  terpasang = true;

  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-ab-aksi], [data-ab-suara]');
    if (!b || !pop() || !pop().contains(b)) return;
    if (b.dataset.abAksi === 'putar') putar();
    else if (b.dataset.abAksi === 'henti') henti();
    else if (b.dataset.abSuara) gantiSuara(b.dataset.abSuara);
  });

  document.addEventListener('input', e => {
    if (e.target && e.target.matches && e.target.matches('[data-ab-volume]')) gantiVolume(Number(e.target.value));
  });

  document.addEventListener('change', e => {
    if (e.target && e.target.matches && e.target.matches('[data-ab-henti]')) gantiHenti(Number(e.target.value));
  });
}
