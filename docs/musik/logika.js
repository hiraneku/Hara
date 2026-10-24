/* Logika murni pemutar musik: batas tempo & nada, loop A-B, format waktu,
   puncak gelombang, pengaturan per lagu, dan pengaturan layar Musik.
   Tanpa DOM dan tanpa Web Audio supaya bisa diuji sangat cepat
   (tools/uji/musik-logika.mjs). */

export const TEMPO_MIN = 0.5;
export const TEMPO_MAX = 2;
export const TEMPO_RESET = 1;
export const PITCH_MIN = -12;
export const PITCH_MAX = 12;
export const PITCH_LANGKAH = 0.01;   /* nada presisi: dua desimal semitone */
export const LOOP_MIN_DETIK = 0.5;   /* rentang A-B terpendek yang masuk akal */
export const LOMPAT_DETIK = 10;      /* langkah tombol mundur/maju */

/* Preset tempo untuk latihan (chip di layar). */
export const PRESET_TEMPO = [0.5, 0.75, 1, 1.25, 1.5];

/* Tempo dibulatkan ke 1% supaya slider & label selalu cocok. */
export function klampTempo(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return TEMPO_RESET;
  const k = Math.min(TEMPO_MAX, Math.max(TEMPO_MIN, n));
  return Math.round(k * 100) / 100;
}

/* Nada dibulatkan ke 0.01 semitone dan dijepit ke ±12. */
export function klampPitch(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  const k = Math.min(PITCH_MAX, Math.max(PITCH_MIN, n));
  const b = Math.round(k * 100) / 100;
  return b === 0 ? 0 : b;   /* hindari -0 */
}

export function klampPosisi(detik, durasi) {
  const n = Number(detik);
  const d = Number.isFinite(durasi) && durasi > 0 ? durasi : 0;
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(d, n);
}

export const persenTempo = t => `${Math.round(klampTempo(t) * 100)}%`;

/* +3.47, -12.00, 0.00 — selalu dua desimal. */
export function labelPitch(s) {
  const k = klampPitch(s);
  if (k === 0) return '0.00';
  return `${k > 0 ? '+' : '-'}${Math.abs(k).toFixed(2)}`;
}

/* Nilai angka untuk kolom input nada (tanpa tanda plus). */
export const angkaPitch = s => klampPitch(s).toFixed(2);

/* m:ss, atau h:mm:ss untuk lagu panjang. Selalu dibulatkan ke bawah. */
export function formatWaktu(detik) {
  const n = Number.isFinite(detik) && detik > 0 ? Math.floor(detik) : 0;
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  const s = n % 60;
  const dua = x => String(x).padStart(2, '0');
  return h > 0 ? `${h}:${dua(m)}:${dua(s)}` : `${m}:${dua(s)}`;
}

/* 512 KB, 12.4 MB, 1.3 GB. */
export function formatUkuran(bytes) {
  const b = Number(bytes);
  if (!Number.isFinite(b) || b <= 0) return '0 KB';
  if (b < 1024 * 1024) return `${Math.max(1, Math.round(b / 1024))} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/* Titik loop A-B. Kedua titik null = belum ada loop. Loop hanya berjalan
   bila kedua titik ada dan aktif. */
export const LOOP_KOSONG = Object.freeze({ a: null, b: null, aktif: false });

/* Pasang titik A atau B di posisi `pos`. Kalau pasangan jadi tidak valid
   (B tidak lebih dari A + LOOP_MIN_DETIK), titik yang LAIN dihapus, sehingga
   titik yang baru diketuk selalu menang. Pasangan lengkap otomatis aktif. */
export function tandaiLoop(loop, titik, pos, durasi) {
  const p = klampPosisi(pos, durasi);
  let a = loop?.a ?? null;
  let b = loop?.b ?? null;
  if (titik === 'a') a = p; else b = p;
  if (a !== null && b !== null && b - a < LOOP_MIN_DETIK) {
    if (titik === 'a') b = null; else a = null;
  }
  const lengkap = a !== null && b !== null;
  return { a, b, aktif: lengkap };
}

/* Mengembalikan loop yang sudah dibersihkan terhadap durasi lagu, atau
   LOOP_KOSONG bila tidak valid. */
export function sahkanLoop(loop, durasi) {
  const d = Number.isFinite(durasi) && durasi > 0 ? durasi : 0;
  const a = Number(loop?.a), b = Number(loop?.b);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return { ...LOOP_KOSONG };
  if (a < 0 || b > d || b - a < LOOP_MIN_DETIK) return { ...LOOP_KOSONG };
  return { a, b, aktif: loop.aktif === true };
}

/* Posisi lompatan: kembali ke A saat posisi mencapai B. null = tidak lompat. */
export function loopBerikutnya(posisi, loop) {
  if (!loop || !loop.aktif || loop.a === null || loop.b === null) return null;
  return posisi >= loop.b ? loop.a : null;
}

/* Pengaturan per lagu. Input dari penyimpanan dianggap tidak tepercaya. */
export function normalisasiAtur(raw, durasi, tempoAwal = TEMPO_RESET) {
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    tempo: klampTempo(r.tempo ?? tempoAwal),
    pitch: klampPitch(r.pitch ?? 0),
    loop: sahkanLoop(r.loop, durasi),
    posisi: klampPosisi(r.posisi ?? 0, durasi),
  };
}

export const ATUR_AWAL = Object.freeze({
  tempo: TEMPO_RESET, pitch: 0, loop: { ...LOOP_KOSONG }, posisi: 0,
});

/* Pengaturan layar Musik (menu Pengaturan Musik). Nilai tak dikenal kembali ke awal. */
export const PILIHAN_SETELAH_SELESAI = ['berhenti', 'berikutnya', 'ulangi'];
export const SET_AWAL = Object.freeze({
  setelahSelesai: 'berhenti',
  lanjutkanPosisi: true,
  tempoAwal: TEMPO_RESET,
});

export function normalisasiSet(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    setelahSelesai: PILIHAN_SETELAH_SELESAI.includes(r.setelahSelesai)
      ? r.setelahSelesai : SET_AWAL.setelahSelesai,
    lanjutkanPosisi: typeof r.lanjutkanPosisi === 'boolean'
      ? r.lanjutkanPosisi : SET_AWAL.lanjutkanPosisi,
    tempoAwal: klampTempo(r.tempoAwal ?? SET_AWAL.tempoAwal),
  };
}

/* Puncak gelombang untuk waveform: nilai absolut maksimum per bin, dinormalkan
   ke 0..1. Hanya memakai satu kanal (cukup untuk visual). */
export function puncakGelombang(data, jumlah = 240) {
  const n = Math.max(1, Math.floor(jumlah));
  const out = new Float32Array(n);
  const len = data ? data.length : 0;
  if (!len) return out;
  const langkah = len / n;
  let maks = 0;
  for (let i = 0; i < n; i++) {
    const awal = Math.floor(i * langkah);
    const akhir = Math.min(len, Math.max(awal + 1, Math.floor((i + 1) * langkah)));
    let m = 0;
    for (let j = awal; j < akhir; j++) {
      const v = data[j] < 0 ? -data[j] : data[j];
      if (v > m) m = v;
    }
    out[i] = m;
    if (m > maks) maks = m;
  }
  if (maks > 0) for (let i = 0; i < n; i++) out[i] = out[i] / maks;
  return out;
}

/* Judul dari nama berkas: buang ekstensi, ganti _ dan - jadi spasi. */
export function namaDariBerkas(nama) {
  const dasar = String(nama || '').replace(/\.[^./\\]+$/, '');
  const rapi = dasar.replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return rapi || 'Tanpa judul';
}

const EKSTENSI_AUDIO = ['mp3', 'm4a', 'aac', 'wav', 'ogg', 'oga', 'opus', 'flac', 'webm', 'mp4'];

/* Tebakan awal apakah berkas audio. Keputusan akhir ada di decodeAudioData. */
export function kemungkinanAudio({ name = '', type = '' } = {}) {
  if (String(type).startsWith('audio/')) return true;
  const m = /\.([^./\\]+)$/.exec(String(name));
  return !!m && EKSTENSI_AUDIO.includes(m[1].toLowerCase());
}

/* Lagu yang terakhir diputar (atau terakhir diimpor bila belum pernah). */
export function laguTerakhir(daftar) {
  if (!Array.isArray(daftar) || daftar.length === 0) return null;
  return daftar.reduce((best, x) =>
    (x.terakhirMain || x.ditambahkan || 0) >= (best.terakhirMain || best.ditambahkan || 0) ? x : best);
}

/* Warna cadangan per lagu (dipakai bila tidak ada sampul), dari hash id.
   Mengembalikan sudut hue 0..359. */
export function hueDariId(id) {
  let h = 0;
  const s = String(id || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}

/* ── Ekualiser: 10 pita (standar oktaf), gain ±12 dB langkah 0.5, Q global,
   preamp, grafik respons, dan preset buatan sendiri ── */
export const EQ_FREKUENSI = Object.freeze([31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]);
export const EQ_MIN = -12;
export const EQ_MAX = 12;
export const EQ_LANGKAH = 0.5;
export const EQ_Q_MIN = 0.3;
export const EQ_Q_MAX = 4;
export const EQ_Q_AWAL = 1;
export const EQ_KUSTOM_MAKS = 10;
export const EQ_NAMA_MAKS = 24;

const datar = Object.freeze(Array(10).fill(0));
export const PRESET_EQ = Object.freeze({
  datar,
  bass: Object.freeze([6, 5, 4, 2, 1, 0, 0, 0, 0, 0]),
  vokal: Object.freeze([-2, -2, -1, 0, 2, 3, 3, 2, 1, 0]),
  terang: Object.freeze([0, 0, 0, 0, 0, 1, 2, 3, 4, 5]),
  rock: Object.freeze([4, 3, 1, -1, -2, -1, 1, 3, 4, 4]),
  pop: Object.freeze([-1, 1, 3, 4, 3, 0, -1, -1, 1, 2]),
  klub: Object.freeze([5, 4, 1, 0, -1, -1, 0, 1, 3, 4]),
  akustik: Object.freeze([2, 2, 2, 1, 0, 0, 1, 2, 3, 3]),
});
export const NAMA_PRESET_EQ = Object.freeze({
  datar: 'Datar', bass: 'Bass', vokal: 'Vokal', terang: 'Terang',
  rock: 'Rock', pop: 'Pop', klub: 'Klub', akustik: 'Akustik',
});

/* Gain pita / preamp: dibulatkan ke langkah 0.5 dB dan dijepit ke ±12. */
export function klampEq(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  const b = Math.round(Math.min(EQ_MAX, Math.max(EQ_MIN, n)) / EQ_LANGKAH) * EQ_LANGKAH;
  return b === 0 ? 0 : b;
}

/* Lebar pita Q: 0.3–4, dibulatkan 0.1. */
export function klampQ(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return EQ_Q_AWAL;
  return Math.round(Math.min(EQ_Q_MAX, Math.max(EQ_Q_MIN, n)) * 10) / 10;
}

export const EQ_AWAL = Object.freeze({ aktif: true, preamp: 0, q: EQ_Q_AWAL, gain: datar, kustom: Object.freeze([]) });

export function namaPresetValid(s) {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, EQ_NAMA_MAKS);
  return t || null;
}

function normalisasiGain(g) {
  return EQ_FREKUENSI.map((_, i) => klampEq(Array.isArray(g) ? g[i] ?? 0 : 0));
}

export function normalisasiKustom(raw) {
  if (!Array.isArray(raw)) return [];
  const hasil = [];
  for (const x of raw) {
    const nama = x && namaPresetValid(x.nama);
    if (!nama || hasil.some(h => h.nama === nama)) continue;
    hasil.push({ nama, gain: normalisasiGain(x.gain) });
    if (hasil.length >= EQ_KUSTOM_MAKS) break;
  }
  return hasil;
}

export function normalisasiEq(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    aktif: typeof r.aktif === 'boolean' ? r.aktif : EQ_AWAL.aktif,
    preamp: klampEq(r.preamp),
    q: klampQ(r.q),
    gain: normalisasiGain(r.gain),
    kustom: normalisasiKustom(r.kustom),
  };
}

/* Data EQ versi lama (5 pita, sebelum 20261024 v2): pindahkan ke pita terdekat. */
export function migrasiEqLama(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.gain)) return null;
  const lama = [60, 230, 910, 3600, 14000];
  const gain = Array(10).fill(0);
  lama.forEach((hz, i) => {
    const j = EQ_FREKUENSI.reduce((best, f, k) => (Math.abs(Math.log(f / hz)) < Math.abs(Math.log(EQ_FREKUENSI[best] / hz)) ? k : best), 0);
    gain[j] = klampEq(raw.gain[i]);
  });
  return normalisasiEq({ aktif: raw.aktif, gain });
}

export const labelFrekuensi = hz => (hz >= 1000 ? `${hz / 1000} kHz` : `${hz} Hz`);

/* Respons satu filter peaking (rumus RBJ, sama dengan BiquadFilter Web Audio),
   dalam dB pada frekuensi f. */
export function responPeaking(f, f0, dB, Q, fs = 48000) {
  const A = Math.pow(10, dB / 40);
  const w0 = 2 * Math.PI * f0 / fs;
  const alpha = Math.sin(w0) / (2 * Q);
  const cos0 = Math.cos(w0);
  const b = [1 + alpha * A, -2 * cos0, 1 - alpha * A];
  const a = [1 + alpha / A, -2 * cos0, 1 - alpha / A];
  const w = 2 * Math.PI * f / fs;
  const num = poliKompleks(b, w);
  const den = poliKompleks(a, w);
  return 10 * Math.log10((num.re ** 2 + num.im ** 2) / (den.re ** 2 + den.im ** 2));
}

/* b0 + b1·e^(−jw) + b2·e^(−2jw) */
function poliKompleks([b0, b1, b2], w) {
  return {
    re: b0 + b1 * Math.cos(w) + b2 * Math.cos(2 * w),
    im: -(b1 * Math.sin(w) + b2 * Math.sin(2 * w)),
  };
}

/* Kurva respons seluruh ekualiser: titik [hz, dB] berskala log dari 20 Hz ke 20 kHz.
   Preamp ikut dihitung sebagai offset; bila nonaktif, kurva datar. */
export function kurvaEq(eq, titik = 160) {
  const e = normalisasiEq(eq);
  const hasil = [];
  for (let i = 0; i < titik; i++) {
    const hz = 20 * Math.pow(1000, i / (titik - 1));
    let db = 0;
    if (e.aktif) {
      db = e.preamp;
      EQ_FREKUENSI.forEach((f0, k) => {
        if (e.gain[k] !== 0) db += responPeaking(hz, f0, e.gain[k], e.q);
      });
    }
    hasil.push([hz, db]);
  }
  return hasil;
}

/* ── Daftar putar (tahap 2) ── */

/* Pindah satu item ke atas (-1) atau ke bawah (+1). Tidak berubah bila di tepi. */
export function pindahItem(daftar, i, arah) {
  const j = i + arah;
  const b = daftar.slice();
  if (i < 0 || i >= b.length || j < 0 || j >= b.length) return b;
  [b[i], b[j]] = [b[j], b[i]];
  return b;
}

/* Tambah id tanpa duplikat, di akhir. */
export function tambahUnik(daftar, id) {
  return daftar.includes(id) ? daftar.slice() : [...daftar, id];
}

/* Nama daftar: rapikan spasi, batasi panjang. null bila kosong. */
export function namaDaftarValid(s) {
  const t = String(s || '').replace(/\s+/g, ' ').trim().slice(0, 60);
  return t || null;
}

/* Bersihkan data daftar putar dari penyimpanan. */
export function normalisasiDaftarPutar(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(x => x && typeof x.id === 'string' && namaDaftarValid(x.nama))
    .map(x => ({
      id: x.id,
      nama: namaDaftarValid(x.nama),
      lagu: Array.isArray(x.lagu) ? x.lagu.filter(v => typeof v === 'string').reduce(tambahUnik, []) : [],
    }));
}
