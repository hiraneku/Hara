/* Mesin audio pemutar musik.

   - Tempo & pitch: SoundTouch (vendor/soundtouch, LGPL-2.1). Tempo mengubah
     kecepatan tanpa mengubah nada; pitch (semitone) berdiri sendiri.
     Diverifikasi di Node: tempo 0,5 menghasilkan 2× jumlah frame dengan
     frekuensi sama; pitch +12 menggandakan frekuensi.
   - Loop A-B dijalankan di sini: saat posisi mencapai B, lompat ke A.
   - Media Session: judul & kontrol di layar kunci, sejauh didukung platform.

   Modul ini tidak menyentuh penyimpanan. Perubahan diumumkan lewat dengar(). */

import { PitchShifter } from '../vendor/soundtouch/soundtouch.js?v=20261026051921';
import { buatRantaiEfek } from './efek-dsp.js?v=20261026051921';
import {
  klampTempo, klampPitch, klampPosisi, loopBerikutnya, tandaiLoop,
  sahkanLoop, puncakGelombang, LOOP_KOSONG, LOMPAT_DETIK,
  EQ_FREKUENSI, EQ_AWAL, normalisasiEq,
} from './logika.js?v=20261026051921';

const pendengar = new Set();
/* Umumkan perubahan dari luar mesin (mis. sampul baru tersedia). */
export function beritahu(jenis) { kirim(jenis); }

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
/* Deck: satu lagu yang sedang/akan diputar, dengan node pemudarnya sendiri.
   Deck aktif memegang status (judul, durasi, loop, dst.); deck keluar memudar
   sebentar saat transisi crossfade. */
let pudarAktif = null;           /* GainNode pemudar untuk deck aktif */
let deckAktif = null;
let berikut = null;              /* deck berikutnya yang sudah dimuat (crossfade) */
let tokenBerikut = 0;
let memudar = [];                /* deck keluar yang masih memudar */
let tokenPudar = 0;              /* membatalkan pemudaran sleep timer */
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

/* Volume dinaikkan sedikit dibanding keluaran mentah SoundTouch, lalu dijepit
   kompresor supaya tidak pecah. */
export const VOLUME = 1.6;
let elemenSistem = null;     /* <audio> tersembunyi: agar Android/Chrome menampilkan kontrol media */
let kompres = null;
/* Ekualiser: 10 filter peaking berantai (dibangun saat konteks audio dibuat).
   Preamp = offset gain sebelum pita; Q = lebar pita untuk semua pita. */
let eqNodes = null;
let eqKeadaan = normalisasiEq(EQ_AWAL);
let efekMasuk = null;
let efekKeluar = null;
let efekRantai = null;
let efekKeadaan = null;

/* Atur efek pemutar. set: { id: { aktif, p } } dari efek.js. Berlaku langsung saat bermain. */
export function aturEfek(set) {
  efekKeadaan = set;
  if (efekRantai) efekRantai.atur(set);
}

function terapkanEq() {
  const aktif = eqKeadaan.aktif;
  if (eqNodes) {
    eqNodes.forEach((n, i) => {
      n.gain.value = aktif ? eqKeadaan.gain[i] : 0;
      n.Q.value = eqKeadaan.q;
    });
  }
  if (gain) gain.gain.value = VOLUME * Math.pow(10, (aktif ? eqKeadaan.preamp : 0) / 20);
}

/* Atur ekualiser. gain: 10 nilai dB (-20..20, dua desimal); q: 0.3..4; preamp: dB.
   aktif=false = datar dan preamp nol (bypass). */
export function setEq(patch = {}) {
  eqKeadaan = normalisasiEq({ ...eqKeadaan, ...patch });
  terapkanEq();
  kirim('eq');
}

function bangunKeluaran(c) {
  gain = c.createGain();
  eqNodes = EQ_FREKUENSI.map(f => {
    const n = c.createBiquadFilter();
    n.type = 'peaking';
    n.frequency.value = f;
    n.Q.value = eqKeadaan.q;
    n.gain.value = 0;
    return n;
  });
  kompres = c.createDynamicsCompressor();
  kompres.threshold.value = -2;
  kompres.knee.value = 0;
  kompres.ratio.value = 20;
  kompres.attack.value = 0.003;
  kompres.release.value = 0.15;
  gain.connect(eqNodes[0]);
  for (let i = 0; i < eqNodes.length - 1; i++) eqNodes[i].connect(eqNodes[i + 1]);
  /* Rantai efek: ekualiser -> efek aktif -> kompresor. Efek mati tidak memproses audio. */
  efekMasuk = c.createGain();
  efekKeluar = c.createGain();
  eqNodes[eqNodes.length - 1].connect(efekMasuk);
  efekKeluar.connect(kompres);
  efekRantai = buatRantaiEfek(c, efekMasuk, efekKeluar);
  if (efekKeadaan) efekRantai.atur(efekKeadaan);
  terapkanEq();
  /* Lewat MediaStream ke elemen <audio> supaya dianggap pemutaran media (layar kunci).
     Bila tidak didukung, keluar langsung ke speaker seperti sebelumnya. */
  if (c.createMediaStreamDestination && typeof Audio !== 'undefined') {
    const tujuan = c.createMediaStreamDestination();
    kompres.connect(tujuan);
    elemenSistem = new Audio();
    elemenSistem.srcObject = tujuan.stream;
    elemenSistem.setAttribute('playsinline', '');
    if (!('srcObject' in elemenSistem)) { elemenSistem = null; kompres.connect(c.destination); }
  } else {
    kompres.connect(c.destination);
  }
}

/* Jika elemen gagal diputar, keluarkan audio langsung agar tetap terdengar. */
let langsungDipasang = false;
function mulaiElemenSistem() {
  if (!elemenSistem) return;
  const p = elemenSistem.play();
  if (p && typeof p.catch === 'function') {
    p.catch(() => {
      if (!langsungDipasang && ctx && kompres) { langsungDipasang = true; kompres.connect(ctx.destination); }
    });
  }
}
function hentikanElemenSistem() {
  if (elemenSistem) { try { elemenSistem.pause(); } catch (e) { /* abaikan */ } }
}

function pastikanCtx() {
  if (!ctx) {
    const AC = self.AudioContext || self.webkitAudioContext;
    ctx = new AC();
    bangunKeluaran(ctx);
  }
  if (ctx.state === 'suspended') return ctx.resume().then(() => ctx);
  return Promise.resolve(ctx);
}

function lepasShifter() {
  hentikanElemenSistem();
  batalkanBerikut();
  lepasMemudar();
  tokenPudar++;
  if (deckAktif) deckAktif.aktif = false;
  deckAktif = null;
  if (shifter) {
    try { shifter.disconnect(); } catch (e) { /* sudah terlepas */ }
    shifter = null;
  }
  if (pudarAktif) {
    try { pudarAktif.disconnect(); } catch (e) { /* abaikan */ }
    pudarAktif = null;
  }
  buffer = null;
  hentikanTimer();
}

/* Bangun deck dari buffer. Deck belum tersambung ke keluaran. Event dari deck yang
   tidak aktif diabaikan, sehingga deck keluar tidak mengubah status lagu baru. */
function buatDeck(c, buf, id, judul, atur) {
  const d = {
    aktif: false, id, judul, buf, durasi: buf.duration,
    tempo: klampTempo(atur.tempo), pitch: klampPitch(atur.pitch),
    loop: sahkanLoop(atur.loop, buf.duration), shifter: null, pudar: null,
  };
  d.shifter = new PitchShifter(c, buf, 2048, () => { if (d.aktif) selesaiAlami(); });
  d.shifter.on('play', e => { if (d.aktif) onPlay(e); });
  d.shifter.tempo = d.tempo;
  d.shifter.pitchSemitones = d.pitch;
  d.pudar = c.createGain();
  d.pudar.connect(gain);
  return d;
}

function lepasSatuMemudar(k) {
  try { k.shifter.disconnect(); } catch (e) { /* abaikan */ }
  try { k.pudar.disconnect(); } catch (e) { /* abaikan */ }
  memudar = memudar.filter(x => x !== k);
}
function lepasMemudar() {
  memudar.slice().forEach(lepasSatuMemudar);
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
  hentikanElemenSistem();
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
  let buf;
  try {
    const c = await pastikanCtx();
    const data = await berkas.arrayBuffer();
    buf = await c.decodeAudioData(data);
  } catch (e) {
    if (giliran === token) {                /* gagal decode: jangan tinggal di 'memuat' */
      idAktif = null; judulAktif = ''; status = 'kosong';
      kirim('status');
    }
    throw e;
  }
  if (giliran !== token) return false;     /* pengguna sudah pindah lagu */
  const c = ctx;

  buffer = buf;
  const d = buatDeck(c, buf, id, judul, atur);
  d.aktif = true;
  deckAktif = d;
  pudarAktif = d.pudar;
  shifter = d.shifter;
  durasi = d.durasi;
  tempo = d.tempo;
  pitch = d.pitch;
  loop = d.loop;
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
  if (!shifter) return false;              /* bisa lepas saat menunggu resume */
  tokenPudar++;                            /* batalkan pemudaran sleep timer yang tertunda */
  if (pudarAktif) {
    pudarAktif.gain.cancelScheduledValues(c.currentTime);
    pudarAktif.gain.setValueAtTime(1, c.currentTime);
  }
  shifter.connect(pudarAktif);
  mulaiElemenSistem();
  status = 'putar';
  mulaiTimer();
  kirim('status');
  aturMediaSession();
  return true;
}

export function jeda() {
  if (!shifter || status !== 'putar') return;
  hentikanElemenSistem();
  tokenPudar++;
  lepasMemudar();
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

/* Pudarkan volume lagu aktif selama `detik`, lalu jeda. Dipakai sleep timer.
   Dibatalkan bila pengguna main, jeda, atau ganti lagu sebelum selesai. */
export function pudarSementara(detik = 10) {
  if (!shifter || status !== 'putar' || !pudarAktif || !ctx) return false;
  const g = ++tokenPudar;
  const t = ctx.currentTime;
  pudarAktif.gain.cancelScheduledValues(t);
  pudarAktif.gain.setValueAtTime(pudarAktif.gain.value, t);
  pudarAktif.gain.linearRampToValueAtTime(0, t + detik);
  setTimeout(() => {
    if (g !== tokenPudar) return;
    jeda();
    if (pudarAktif && ctx) {
      pudarAktif.gain.cancelScheduledValues(ctx.currentTime);
      pudarAktif.gain.setValueAtTime(1, ctx.currentTime);
    }
  }, detik * 1000);
  return true;
}

/* ── Crossfade: siapkan lagu berikutnya lebih dulu, lalu mulai transisi ── */

/* Muat lagu berikutnya ke deck tersendiri (belum diputar). */
export async function siapkanBerikut(id, berkas, atur, judul) {
  const giliran = ++tokenBerikut;
  const c = await pastikanCtx();
  const data = await berkas.arrayBuffer();
  const buf = await c.decodeAudioData(data);
  if (giliran !== tokenBerikut || !ctx) return false;   /* sudah dibatalkan */
  batalkanBerikut(true);
  const d = buatDeck(c, buf, id, judul, atur);
  const p = klampPosisi(atur.posisi, d.durasi);
  if (p > 0 && d.durasi > 0) d.shifter.percentagePlayed = Math.min(p, d.durasi - 0.05) / d.durasi;
  berikut = d;
  return true;
}

export function idBerikut() {
  return berikut ? berikut.id : null;
}

export function batalkanBerikut(tanpaNaikToken) {
  if (!tanpaNaikToken) tokenBerikut++;
  if (!berikut) return;
  try { berikut.shifter.disconnect(); } catch (e) { /* belum tersambung */ }
  try { berikut.pudar.disconnect(); } catch (e) { /* abaikan */ }
  berikut = null;
}

/* Mulai transisi: lagu aktif memudar keluar, lagu berikutnya naik dalam `detik`.
   Setelah itu lagu berikutnya menjadi lagu aktif. Mengembalikan false bila tidak ada
   lagu berikutnya yang siap atau pemutar sedang tidak main. */
export function mulaiPudarKeBerikut(detik) {
  if (!berikut || !shifter || !deckAktif || !ctx || status !== 'putar') return false;
  const c = ctx;
  const t = c.currentTime;
  const d = Math.max(0.5, Number(detik) || 0);
  const b = berikut;
  berikut = null;
  tokenPudar++;

  /* Keluar: pemudar lagu lama turun ke 0, lalu lepas. */
  const keluar = { shifter, pudar: pudarAktif, deck: deckAktif };
  deckAktif.aktif = false;
  if (pudarAktif) {
    pudarAktif.gain.cancelScheduledValues(t);
    pudarAktif.gain.setValueAtTime(pudarAktif.gain.value, t);
    pudarAktif.gain.linearRampToValueAtTime(0, t + d);
  }
  memudar.push(keluar);
  setTimeout(() => lepasSatuMemudar(keluar), d * 1000 + 300);

  /* Masuk: pemudar lagu baru naik dari 0 ke 1. */
  b.pudar.gain.cancelScheduledValues(t);
  b.pudar.gain.setValueAtTime(0, t);
  b.pudar.gain.linearRampToValueAtTime(1, t + d);
  b.shifter.connect(b.pudar);
  b.aktif = true;

  deckAktif = b;
  pudarAktif = b.pudar;
  shifter = b.shifter;
  buffer = b.buf;
  durasi = b.durasi;
  idAktif = b.id;
  judulAktif = b.judul;
  tempo = b.tempo;
  pitch = b.pitch;
  loop = b.loop;
  cacheGelombang.delete(b.id);
  kirim('lagu');
  aturMediaSession();
  aturPosisiSistem();
  return true;
}

/* Durasi tanpa mendekode seluruh berkas (hemat memori untuk impor). */
/* Durasi berkas audio. Metadata elemen audio dicoba dulu. Bila gagal atau tidak
   terhingga (umum pada WebM dari perekam, yang tidak menyimpan durasi), durasi
   dihitung dari hasil decode. */
export function bacaDurasi(berkas) {
  return bacaDurasiMedia(berkas).catch(async () => {
    const c = await pastikanCtx();
    const buf = await c.decodeAudioData(await berkas.arrayBuffer());
    if (!(buf.duration > 0)) throw new Error('durasi tidak terbaca');
    return buf.duration;
  });
}

function bacaDurasiMedia(berkas) {
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
