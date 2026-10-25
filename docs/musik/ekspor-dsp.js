/* Pemrosesan ekspor lagu yang tidak butuh AudioContext, jadi bisa jalan di worker
   dan diuji di Node:
   - tempo & nada: SoundTouch (vendor/soundtouch), dijalankan offline;
   - penulis WAV (PCM 16-bit) dan MP3 (lamejs, dikirim dari luar).
   Ekualiser dan kompresor TIDAK ada di sini: di ekspor.js dijalankan lewat
   OfflineAudioContext dengan node yang sama dengan pemutar (mesin.js).
   Semua hasil 44.100 Hz stereo. */

import { SoundTouch, SimpleFilter } from '../vendor/soundtouch/soundtouch.js?v=20261025024750';

export const SAMPEL_HZ = 44100;
const BLOK = 4096;
const PAD_DETIK = 1;          /* keheningan di akhir agar ekor hasil SoundTouch tidak terpotong */

/* Sumber stereo untuk SimpleFilter. Setelah data habis, keluarkan keheningan
   sampai `total` frame, lalu berhenti. */
class SumberStereo {
  constructor(L, R, total) { this.L = L; this.R = R; this.total = total; }
  extract(target, numFrames = 0, posisi = 0) {
    if (posisi >= this.total) return 0;
    const n = Math.min(numFrames, this.total - posisi);
    const panjang = this.L.length;
    for (let i = 0; i < n; i++) {
      const k = posisi + i;
      target[i * 2] = k < panjang ? this.L[k] : 0;
      target[i * 2 + 1] = k < panjang ? this.R[k] : 0;
    }
    return n;
  }
}

/* Ubah tempo (tanpa mengubah nada) dan nada (semitone, tanpa mengubah tempo).
   Panjang hasil = panjang asli / tempo. */
export function tempoDanNada(L, R, tempo = 1, pitch = 0) {
  if (tempo === 1 && pitch === 0) return { L, R };
  const st = new SoundTouch();
  st.tempo = tempo;
  st.pitchSemitones = pitch;
  const total = L.length + Math.round(SAMPEL_HZ * PAD_DETIK);
  const filter = new SimpleFilter(new SumberStereo(L, R, total), st);
  const potongan = [];
  const blok = new Float32Array(BLOK * 2);
  let n;
  while ((n = filter.extract(blok, BLOK)) > 0) potongan.push(blok.slice(0, n * 2));
  const keluar = Math.round(L.length / tempo);
  const outL = new Float32Array(keluar);
  const outR = new Float32Array(keluar);
  let k = 0;
  for (const p of potongan) {
    for (let i = 0; i < p.length / 2 && k < keluar; i++, k++) {
      outL[k] = p[i * 2];
      outR[k] = p[i * 2 + 1];
    }
  }
  return { L: outL.subarray(0, k), R: outR.subarray(0, k) };
}

const tulis = (v, off, teks) => { for (let i = 0; i < teks.length; i++) v.setUint8(off + i, teks.charCodeAt(i)); };

/* WAV PCM 16-bit stereo. */
export function kodeWav(L, R, sampelHz = SAMPEL_HZ) {
  const n = L.length;
  const data = n * 4;
  const buf = new ArrayBuffer(44 + data);
  const v = new DataView(buf);
  tulis(v, 0, 'RIFF'); v.setUint32(4, 36 + data, true); tulis(v, 8, 'WAVE');
  tulis(v, 12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
  v.setUint32(24, sampelHz, true); v.setUint32(28, sampelHz * 4, true);
  v.setUint16(32, 4, true); v.setUint16(34, 16, true);
  tulis(v, 36, 'data'); v.setUint32(40, data, true);
  const kelip = x => Math.max(-32768, Math.min(32767, Math.round(x * 32767)));
  for (let i = 0; i < n; i++) {
    v.setInt16(44 + i * 4, kelip(L[i]), true);
    v.setInt16(46 + i * 4, kelip(R[i]), true);
  }
  return new Blob([buf], { type: 'audio/wav' });
}

/* MP3 dengan lamejs (diteruskan sebagai argumen: objek lamejs). */
export function kodeMp3(lame, L, R, kbps = 192, sampelHz = SAMPEL_HZ) {
  const enc = new lame.Mp3Encoder(2, sampelHz, kbps);
  const kelip = x => Math.max(-32768, Math.min(32767, Math.round(x * 32767)));
  const li = Int16Array.from(L, kelip);
  const ri = Int16Array.from(R, kelip);
  const bagian = [];
  const BLOK_MP3 = 1152;
  for (let i = 0; i < li.length; i += BLOK_MP3) {
    const b = enc.encodeBuffer(li.subarray(i, i + BLOK_MP3), ri.subarray(i, i + BLOK_MP3));
    if (b.length) bagian.push(b);
  }
  const akhir = enc.flush();
  if (akhir.length) bagian.push(akhir);
  return new Blob(bagian, { type: 'audio/mpeg' });
}

/* Nama berkas hasil ekspor: "Judul (ekspor).wav". Karakter terlarang diganti. */
export function namaEkspor(judul, format) {
  const dasar = String(judul || 'lagu').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').replace(/\s+/g, ' ').trim().slice(0, 100) || 'lagu';
  return `${dasar} (ekspor).${format === 'mp3' ? 'mp3' : 'wav'}`;
}
