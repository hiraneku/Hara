/* Suara latar belajar (C10, Tahap 4) — model murni, tanpa DOM dan tanpa Web Audio.

   Sumber bunyi: derau yang dibuat di kode (putih, merah muda, cokelat). Tidak ada berkas audio
   pihak ketiga, jadi tidak ada isu lisensi. Rekaman alam (hujan, kafe) belum dipakai karena
   lisensinya perlu diverifikasi dulu.

   Pengaturan: jenis, volume 0–100, dan batas berhenti otomatis (0 = tanpa batas, atau 15/30/60 menit). */

export const JENIS = ['putih', 'merah-muda', 'cokelat'];
export const HENTI_MENIT = [0, 15, 30, 60];
export const VOLUME_BAWAAN = 40;
export const JENIS_BAWAAN = 'merah-muda';
export const PANJANG_DETIK = 4;     /* panjang sampel yang diulang */
const FADE_MAKS = 960;              /* ~20 dtk pada 48 kHz: menghindari klik di sambungan ulang */
const RMS_TARGET = 0.2;

export function normalisasi(p) {
  const o = p && typeof p === 'object' ? p : {};
  const suara = JENIS.includes(o.suara) ? o.suara : JENIS_BAWAAN;
  const v = Number(o.volume);
  const volume = Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : VOLUME_BAWAAN;
  const h = Number(o.henti);
  const henti = HENTI_MENIT.includes(h) ? h : 0;
  return { suara, volume, henti };
}

/* Sampel derau sepanjang `jumlah` sampel. `acak` adalah fungsi yang mengembalikan [0,1) (dapat dibuat
   deterministik untuk uji). Keluaran: Float32Array, RMS mendekati RMS_TARGET, dibatasi ke ±0.95,
   dengan fade masuk dan keluar agar sambungan ulang tidak berbunyi klik. */
export function buatSampel(jenis, jumlah, acak = Math.random) {
  const n = Math.max(1, Math.floor(jumlah));
  const out = new Float32Array(n);
  const jenisAman = JENIS.includes(jenis) ? jenis : JENIS_BAWAAN;

  if (jenisAman === 'putih') {
    for (let i = 0; i < n; i++) out[i] = acak() * 2 - 1;
  } else if (jenisAman === 'merah-muda') {
    /* Paul Kellet, filter tiga tingkat yang disederhanakan */
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < n; i++) {
      const w = acak() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.96900 * b2 + w * 0.1538520;
      b3 = 0.86650 * b3 + w * 0.3104856;
      b4 = 0.55000 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.0168980;
      out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  } else {
    /* cokelat: integrator dengan kebocoran kecil, agar tidak hanyut */
    let last = 0;
    for (let i = 0; i < n; i++) {
      const w = acak() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      out[i] = last * 3.5;
    }
  }

  /* hilangkan DC, lalu normalkan RMS */
  let rata = 0;
  for (let i = 0; i < n; i++) rata += out[i];
  rata /= n;
  let kuadrat = 0;
  for (let i = 0; i < n; i++) { out[i] -= rata; kuadrat += out[i] * out[i]; }
  const rms = Math.sqrt(kuadrat / n) || 1;
  const skala = RMS_TARGET / rms;
  for (let i = 0; i < n; i++) out[i] = Math.max(-0.95, Math.min(0.95, out[i] * skala));

  /* fade masuk dan keluar */
  const f = Math.min(FADE_MAKS, Math.floor(n / 4));
  for (let i = 0; i < f; i++) {
    const g = i / f;
    out[i] *= g;
    out[n - 1 - i] *= g;
  }
  return out;
}

/* Penguat keluaran dari volume 0–100. Kurva kuadrat: perubahan terasa lebih halus di volume rendah. */
export function gainUntuk(volume) {
  const v = Math.min(100, Math.max(0, Number(volume) || 0)) / 100;
  return 0.6 * v * v;
}

/* Sisa waktu sebelum berhenti otomatis, dalam ms. null bila tanpa batas atau belum mulai. */
export function sisaHenti(mulaiMs, henti, sekarang) {
  if (!henti || !mulaiMs) return null;
  return Math.max(0, mulaiMs + henti * 60000 - sekarang);
}

export function sudahHabis(mulaiMs, henti, sekarang) {
  const s = sisaHenti(mulaiMs, henti, sekarang);
  return s !== null && s <= 0;
}
