/* Focus timer (C9, Tahap 4) — model murni, tanpa impor UI.

   Dua mode (acuan §2.8):
   • pomodoro : fokus lalu istirahat bergantian. Bawaan 25 menit fokus, 5 menit istirahat.
   • hitung   : hitung mundur sekali jalan. Bawaan 10 menit.

   Keadaan: { status, fase, sisaMs, akhir, siklus }
     status : 'siap' | 'jalan' | 'jeda' | 'selesai'
     fase   : 'fokus' | 'istirahat'   (mode hitung selalu 'fokus')
     sisaMs : sisa waktu saat tidak berjalan
     akhir  : timestamp akhir saat berjalan (ms). Waktu dihitung dari sini, jadi tetap benar walau tab sempat tidak aktif.
     siklus : jumlah fase fokus yang sudah selesai dalam mode pomodoro.

   Pergantian fase tidak otomatis dimulai. Pengguna menekan Mulai lagi, supaya tidak ada suara
   atau timer yang jalan tanpa diminta. */

export const FOKUS_MAKS = 180;      /* menit, fase fokus / hitung mundur pomodoro */
export const ISTIRAHAT_MAKS = 60;   /* menit */
export const HITUNG_MAKS = 240;     /* menit, mode hitung mundur */

export const BAWAAN = Object.freeze({
  mode: 'pomodoro',
  fokusMenit: 25,
  istirahatMenit: 5,
  hitungMenit: 10,
  suara: true,
});

const bulat = (v, lo, hi, bawaan) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : bawaan;
};

/* Pengaturan dari penyimpanan atau isian. Nilai rusak diganti bawaan, tidak dilempar. */
export function normalisasi(x) {
  const o = x && typeof x === 'object' ? x : {};
  return {
    mode: o.mode === 'hitung' ? 'hitung' : 'pomodoro',
    fokusMenit: bulat(o.fokusMenit, 1, FOKUS_MAKS, BAWAAN.fokusMenit),
    istirahatMenit: bulat(o.istirahatMenit, 1, ISTIRAHAT_MAKS, BAWAAN.istirahatMenit),
    hitungMenit: bulat(o.hitungMenit, 1, HITUNG_MAKS, BAWAAN.hitungMenit),
    suara: typeof o.suara === 'boolean' ? o.suara : BAWAAN.suara,
  };
}

/* Durasi satu fase dalam ms. */
export function durasiFase(p, fase) {
  if (p.mode === 'hitung') return p.hitungMenit * 60000;
  return (fase === 'istirahat' ? p.istirahatMenit : p.fokusMenit) * 60000;
}

export function keadaanAwal(p, siklus = 0) {
  return { status: 'siap', fase: 'fokus', sisaMs: durasiFase(p, 'fokus'), akhir: 0, siklus };
}

export function mulai(k, now) {
  if (k.status === 'jalan' || !(k.sisaMs > 0)) return k;
  return { ...k, status: 'jalan', akhir: now + k.sisaMs };
}

export function jeda(k, now) {
  if (k.status !== 'jalan') return k;
  return { ...k, status: 'jeda', sisaMs: Math.max(0, k.akhir - now), akhir: 0 };
}

/* Sisa waktu dalam ms untuk tampilan. */
export function sisa(k, now) {
  return k.status === 'jalan' ? Math.max(0, k.akhir - now) : k.sisaMs;
}

/* Dipanggil berkala. Bila waktu habis, mengembalikan keadaan baru dan nama fase yang selesai
   ('fokus' | 'istirahat' | 'hitung'). Bila belum habis, keadaan tidak berubah dan selesai = null. */
export function periksa(k, p, now) {
  if (k.status !== 'jalan' || now < k.akhir) return { keadaan: k, selesai: null };
  if (p.mode === 'hitung') {
    return { keadaan: { ...k, status: 'selesai', sisaMs: 0, akhir: 0 }, selesai: 'hitung' };
  }
  const selesai = k.fase;
  const fase = k.fase === 'fokus' ? 'istirahat' : 'fokus';
  const siklus = k.fase === 'fokus' ? k.siklus + 1 : k.siklus;
  return {
    keadaan: { status: 'siap', fase, sisaMs: durasiFase(p, fase), akhir: 0, siklus },
    selesai,
  };
}

/* Pengaturan baru berlaku hanya saat timer siap atau sudah selesai. Saat berjalan atau dijeda, tidak diubah. */
export function terapkanPengaturan(k, p) {
  if (k.status === 'siap' || k.status === 'selesai') return keadaanAwal(p, k.siklus);
  return k;
}

export function bisaDiubah(k) {
  return k.status === 'siap' || k.status === 'selesai';
}

/* mm:ss, atau h:mm:ss bila lebih dari satu jam. Dibulatkan ke atas supaya 0,4 dtk tampil 00:01. */
export function formatSisa(ms) {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  const jam = Math.floor(total / 3600);
  const menit = Math.floor((total % 3600) / 60);
  const detik = total % 60;
  const dua = n => String(n).padStart(2, '0');
  return jam > 0 ? `${jam}:${dua(menit)}:${dua(detik)}` : `${dua(menit)}:${dua(detik)}`;
}
