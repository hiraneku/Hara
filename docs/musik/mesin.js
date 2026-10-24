/* Mesin audio pemutar musik.

   - Tempo & pitch: SoundTouch (vendor/soundtouch, LGPL-2.1). Tempo mengubah
     kecepatan tanpa mengubah nada; pitch (semitone) berdiri sendiri.
     Diverifikasi di Node: tempo 0,5 menghasilkan 2× jumlah frame dengan
     frekuensi sama; pitch +12 menggandakan frekuensi.
   - Loop A-B dijalankan di sini: saat posisi mencapai B, lompat ke A.
   - Media Session: judul & kontrol di layar kunci, sejauh didukung platform.

   Modul ini tidak menyentuh penyimpanan. Perubahan diumumkan lewat dengar(). */

import { PitchShifter } from '../vendor/soundtouch/soundtouch.js?v=20261024040822';
import {
  klampTempo, klampPitch, klampPosisi, loopBerikutnya, tandaiLoop,
  sahkanLoop, puncakGelombang, LOOP_KOSONG, LOMPAT_DETIK,
} from './logika.js?v=20261024040822';

const pendengar = new Set();
export function dengar(fn) {
  pendengar.add(fn);
  return () => pendengar.delete(fn);
}
function kirim(jenis) {
  const k = keadaan();
  pendengar.forEach(fn => { try { fn(jenis, k); } catch (e) { /* pendengar rusak tidak boleh menghentikan audio */ } });
}

let ctx = null;
let gain = null;
let shifter = null;
let buffer = null;
let idAktif = null;
let judulAktif = '';
let status = 'kosong';           /* kosong | memuat | jeda | putar | selesai */
let durasi = 0;
let tempo = 1;
let pitch = 0;
let loop = { ...LOOP_KOSONG };
let token = 0;                   /* membatalkan muat yang sudah usang */
let timer = null;
const cacheGelombang = new Map(); /* id → puncak, hanya di memori */

export const didukung = () => !!(self.AudioContext || self.webkitAudioContext);

export function keadaan() {
  const posisi = shifter ? klampPosisi(shifter.timePlayed, durasi) : 0;
  return {
    status,
    id: idAktif,
    judul: judulAktif,
    durasi,
    posisi: status === 'selesai' ? durasi : posisi,
    tempo,
    pitch,
    loop: { ...loop },
  };
}

function pastikanCtx() {
  if (!ctx) {
    const AC = self.AudioContext || self.webkitAudioContext;
    ctx = new AC();
    gain = ctx.createGain();
    gain.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') return ctx.resume().then(() => ctx);
  return Promise.resolve(ctx);
}

function lepasShifter() {
  if (shifter) {
    try { shifter.disconnect(); } catch (e) { /* sudah terlepas */ }
    shifter = null;
  }
  buffer = null;
  hentikanTimer();
}

function mulaiTimer() {
  if (timer) return;
  timer = setInterval(() => { kirim('waktu'); aturPosisiSistem(); }, 200);
}
function hentikanTimer() {
  if (timer) { clearInterval(timer); timer = null; }
}

function onPlay(d) {
  if (!shifter) return;
  /* Loop: lompat ke A begitu posisi mencapai B. */
  const lompat = loopBerikutnya(d.timePlayed, loop);
  if (lompat !== null && durasi > 0) shifter.percentagePlayed = lompat / durasi;
}

function selesaiAlami() {
  if (status !== 'putar') return;
  try { shifter.disconnect(); } catch (e) { /* abaikan */ }
  status = 'selesai';
  hentikanTimer();
  kirim('status');
  aturPosisiSistem();
}

/* Muat lagu dari berkas. `atur` sudah dibersihkan (normalisasiAtur). */
export async function muatLagu(id, berkas, atur, judul) {
  const giliran = ++token;
  lepasShifter();
  idAktif = id;
  judulAktif = judul || '';
  status = 'memuat';
  kirim('status');
  const c = await pastikanCtx();
  const data = await berkas.arrayBuffer();
  const buf = await c.decodeAudioData(data);
  if (giliran !== token) return false;     /* pengguna sudah pindah lagu */

  buffer = buf;
  durasi = buf.duration;
  shifter = new PitchShifter(c, buffer, 2048, selesaiAlami);
  shifter.on('play', onPlay);
  tempo = klampTempo(atur.tempo);
  pitch = klampPitch(atur.pitch);
  loop = sahkanLoop(atur.loop, durasi);
  shifter.tempo = tempo;
  shifter.pitchSemitones = pitch;
  const p = klampPosisi(atur.posisi, durasi);
  if (p > 0 && durasi > 0) shifter.percentagePlayed = Math.min(p, durasi - 0.05) / durasi;
  status = 'jeda';
  cacheGelombang.delete(id);
  kirim('lagu');
  aturMediaSession();
  aturPosisiSistem();
  return true;
}

export async function putar() {
  if (!shifter) return false;
  const c = await pastikanCtx();
  /* Selama menunggu konteks, lagu bisa sudah diganti atau dilepas. */
  if (!shifter) return false;
  if (status === 'putar') return true;
  if (status === 'selesai') shifter.percentagePlayed = 0;
  /* Konteks bisa tertidur saat aplikasi di latar; bangunkan lagi. */
  if (c.state === 'suspended') await c.resume();
  shifter.connect(gain);
  status = 'putar';
  mulaiTimer();
  kirim('status');
  aturMediaSession();
  return true;
}

export function jeda() {
  if (!shifter || status !== 'putar') return;
  try { shifter.disconnect(); } catch (e) { /* abaikan */ }
  status = 'jeda';
  hentikanTimer();
  kirim('status');
  aturMediaSession();
  aturPosisiSistem();
}

export function togglePutar() {
  return status === 'putar' ? jeda() : putar();
}

export function seek(detik) {
  if (!shifter || durasi <= 0) return;
  /* Jangan sampai tepat di akhir, supaya tidak langsung dianggap selesai. */
  const p = Math.min(klampPosisi(detik, durasi), durasi - 0.05);
  shifter.percentagePlayed = Math.max(0, p) / durasi;
  if (status === 'selesai') status = 'jeda';
  kirim('waktu');
  aturPosisiSistem();
}

export function lompat(selisih) {
  seek(keadaan().posisi + selisih);
}

export function setTempo(t) {
  tempo = klampTempo(t);
  if (shifter) shifter.tempo = tempo;
  kirim('atur');
  aturPosisiSistem();
}

export function setPitch(s) {
  pitch = klampPitch(s);
  if (shifter) shifter.pitchSemitones = pitch;
  kirim('atur');
}

/* Tandai A atau B di posisi sekarang. */
export function tandai(titik) {
  if (!shifter) return;
  loop = tandaiLoop(loop, titik, shifter.timePlayed, durasi);
  kirim('atur');
}

export function setLoopAktif(on) {
  if (loop.a === null || loop.b === null) return;
  loop = { ...loop, aktif: !!on };
  kirim('atur');
}

export function resetLoop() {
  loop = { ...LOOP_KOSONG };
  kirim('atur');
}

/* Durasi tanpa mendekode seluruh berkas (hemat memori untuk impor). */
export function bacaDurasi(berkas) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(berkas);
    const a = new Audio();
    a.preload = 'metadata';
    const bersih = () => { a.removeAttribute('src'); a.load(); URL.revokeObjectURL(url); };
    a.onloadedmetadata = () => {
      const d = a.duration;
      bersih();
      if (Number.isFinite(d) && d > 0) res(d);
      else rej(new Error('durasi tidak terbaca'));
    };
    a.onerror = () => { bersih(); rej(new Error('format tidak didukung')); };
    a.src = url;
  });
}

/* Puncak untuk waveform lagu aktif (di-cache di memori per id). */
export function puncakAktif(jumlah = 240) {
  if (!buffer || !idAktif) return null;
  const kunci = `${idAktif}:${jumlah}`;
  if (!cacheGelombang.has(kunci)) {
    cacheGelombang.set(kunci, puncakGelombang(buffer.getChannelData(0), jumlah));
  }
  return cacheGelombang.get(kunci);
}

/* Lepas lagu aktif (mis. setelah dihapus dari pustaka). */
export function lepas() {
  token++;
  lepasShifter();
  idAktif = null;
  judulAktif = '';
  durasi = 0;
  loop = { ...LOOP_KOSONG };
  status = 'kosong';
  kirim('status');
}

/* ── Media Session (layar kunci & kontrol headset) ── */

let sistemDipasang = false;
let aksiBerikutnya = null;

export function pasangAksiSistem({ sebelumnya, berikutnya }) {
  aksiBerikutnya = { sebelumnya, berikutnya };
  if (sistemDipasang || !('mediaSession' in navigator)) return;
  sistemDipasang = true;
  const ms = navigator.mediaSession;
  const daftar = {
    play: () => putar(),
    pause: () => jeda(),
    seekbackward: () => lompat(-LOMPAT_DETIK),
    seekforward: () => lompat(LOMPAT_DETIK),
    seekto: d => { if (d && typeof d.seekTime === 'number') seek(d.seekTime); },
    previoustrack: () => aksiBerikutnya?.sebelumnya?.(),
    nexttrack: () => aksiBerikutnya?.berikutnya?.(),
  };
  for (const [aksi, fn] of Object.entries(daftar)) {
    try { ms.setActionHandler(aksi, fn); } catch (e) { /* platform tidak mendukung aksi ini (mis. iOS) */ }
  }
}

function aturMediaSession() {
  if (!('mediaSession' in navigator)) return;
  const ms = navigator.mediaSession;
  try {
    ms.metadata = new MediaMetadata({ title: judulAktif || 'Musik', artist: 'Hara', album: 'Musik' });
    ms.playbackState = status === 'putar' ? 'playing' : 'paused';
  } catch (e) { /* abaikan */ }
}

function aturPosisiSistem() {
  if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;
  if (!shifter || durasi <= 0) return;
  try {
    navigator.mediaSession.setPositionState({
      duration: durasi,
      playbackRate: tempo,
      position: Math.min(keadaan().posisi, durasi),
    });
  } catch (e) { /* posisi tak valid: lewati */ }
}
