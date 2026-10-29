// Pengujian C10 · Suara latar (model murni) — tanpa DOM.
//
// Yang diuji (docs/notes/ambience-murni.js):
//   • normalisasi pengaturan: bawaan, nilai rusak, batas volume, batas berhenti;
//   • buatSampel: panjang, nilai terbatas, RMS, DC, fade ujung, deterministik dengan benih;
//   • urutan kecerahan: putih > merah muda > cokelat (selisih sampel berurutan sebagai ukuran frekuensi tinggi);
//   • gainUntuk: nol di volume 0, naik monoton, batas atas;
//   • sisaHenti dan sudahHabis: tanpa batas, belum mulai, berjalan, dan habis.
//
// Yang TIDAK diuji di sini: pemutaran Web Audio, lembar, dan penyimpanan (uji Chromium di luar repo).
//
// Jalan: node tools/uji/ambience-murni.mjs (dari folder repo).
import {
  JENIS, HENTI_MENIT, VOLUME_BAWAAN, JENIS_BAWAAN, normalisasi, buatSampel,
  gainUntuk, sisaHenti, sudahHabis,
} from '../../docs/notes/ambience-murni.js';

let lulus = 0, gagal = 0;
function cek(nama, ok, detail = '') {
  if (ok) { lulus++; console.log(`OK   ${nama}${detail ? ' — ' + detail : ''}`); }
  else { gagal++; console.log(`GAGAL ${nama}${detail ? ' — ' + detail : ''}`); }
}

/* Generator benih tetap (mulberry32), agar hasil uji sama setiap jalan. */
function benih(s) {
  let a = s >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MENIT = 60000;
const N = 48000; /* 1 dtk pada 48 kHz sudah cukup untuk statistik */

// ── 1. normalisasi ──
console.log('── 1. normalisasi');
{
  const d = normalisasi(undefined);
  cek('bawaan: merah muda, volume 40, tanpa batas', d.suara === JENIS_BAWAAN && d.volume === VOLUME_BAWAAN && d.henti === 0, JSON.stringify(d));
  cek('jenis tidak dikenal jadi bawaan', normalisasi({ suara: 'hujan' }).suara === JENIS_BAWAAN);
  cek('jenis yang dikenal dipertahankan', JENIS.every(j => normalisasi({ suara: j }).suara === j));
  cek('volume dibatasi ke 0–100', normalisasi({ volume: 250 }).volume === 100 && normalisasi({ volume: -5 }).volume === 0);
  cek('volume pecahan dibulatkan', normalisasi({ volume: 33.6 }).volume === 34);
  cek('volume rusak jadi bawaan', normalisasi({ volume: 'banyak' }).volume === VOLUME_BAWAAN && normalisasi({ volume: NaN }).volume === VOLUME_BAWAAN);
  cek('henti di luar daftar jadi 0', normalisasi({ henti: 20 }).henti === 0 && normalisasi({ henti: 'abc' }).henti === 0);
  cek('henti berupa teks angka yang valid diterima', normalisasi({ henti: '30' }).henti === 30);
  cek('henti yang diizinkan dipertahankan', HENTI_MENIT.every(m => normalisasi({ henti: m }).henti === m));
  cek('masukan bukan objek jadi bawaan', JSON.stringify(normalisasi(null)) === JSON.stringify(normalisasi({})));
}

// ── 2. buatSampel ──
console.log('── 2. buatSampel');
const hasil = {};
for (const j of JENIS) {
  const s = buatSampel(j, N, benih(42));
  hasil[j] = s;
  let maks = 0, jumlah = 0, kuadrat = 0, adaNaN = false;
  for (let i = 0; i < s.length; i++) {
    const x = s[i];
    if (!Number.isFinite(x)) adaNaN = true;
    maks = Math.max(maks, Math.abs(x));
    jumlah += x; kuadrat += x * x;
  }
  const rms = Math.sqrt(kuadrat / s.length);
  const rata = jumlah / s.length;
  cek(`${j}: panjang sesuai dan tanpa NaN`, s.length === N && !adaNaN);
  cek(`${j}: nilai terbatas ±0.95`, maks <= 0.95 + 1e-9, `maks ${maks.toFixed(3)}`);
  cek(`${j}: RMS mendekati 0.2`, Math.abs(rms - 0.2) < 0.03, `rms ${rms.toFixed(3)}`);
  cek(`${j}: tanpa DC (rata-rata kecil)`, Math.abs(rata) < 0.01, `rata ${rata.toExponential(2)}`);
  cek(`${j}: fade ujung (sampel pertama dan terakhir ~0)`, Math.abs(s[0]) < 1e-6 && Math.abs(s[s.length - 1]) < 1e-3);
}
{
  const a = buatSampel('merah-muda', 4000, benih(7));
  const b = buatSampel('merah-muda', 4000, benih(7));
  const c = buatSampel('merah-muda', 4000, benih(8));
  cek('benih sama menghasilkan sampel sama', a.every((x, i) => x === b[i]));
  cek('benih beda menghasilkan sampel beda', a.some((x, i) => x !== c[i]));
  const t = buatSampel('hujan', 4000, benih(7));
  cek('jenis tidak dikenal memakai merah muda', t.every((x, i) => x === a[i]));
  cek('jumlah 0 atau negatif tetap menghasilkan sampel', buatSampel('putih', 0, benih(1)).length === 1 && buatSampel('putih', -3, benih(1)).length === 1);
}

// ── 3. kecerahan ──
console.log('── 3. urutan kecerahan');
{
  /* ukuran kasar frekuensi tinggi: rata-rata selisih kuadrat sampel berurutan dibagi energi */
  const kecerahan = s => {
    let d = 0, e = 0;
    for (let i = 1; i < s.length; i++) d += (s[i] - s[i - 1]) ** 2;
    for (let i = 0; i < s.length; i++) e += s[i] ** 2;
    return d / e;
  };
  const kp = kecerahan(hasil['putih']), km = kecerahan(hasil['merah-muda']), kc = kecerahan(hasil['cokelat']);
  cek('putih lebih cerah dari merah muda', kp > km, `${kp.toFixed(3)} > ${km.toFixed(3)}`);
  cek('merah muda lebih cerah dari cokelat', km > kc, `${km.toFixed(3)} > ${kc.toFixed(3)}`);
}

// ── 4. gainUntuk ──
console.log('── 4. gainUntuk');
{
  cek('volume 0 berarti diam', gainUntuk(0) === 0);
  cek('volume 100 berarti 0.6', Math.abs(gainUntuk(100) - 0.6) < 1e-12);
  let monoton = true, prev = -1;
  for (let v = 0; v <= 100; v += 5) { const g = gainUntuk(v); if (g < prev) monoton = false; prev = g; }
  cek('naik monoton dari 0 ke 100', monoton);
  cek('di luar rentang dijepit', gainUntuk(-20) === 0 && Math.abs(gainUntuk(300) - 0.6) < 1e-12);
  cek('volume rusak diperlakukan 0', gainUntuk('x') === 0);
}

// ── 5. batas berhenti ──
console.log('── 5. sisaHenti dan sudahHabis');
{
  const t0 = 1_000_000;
  cek('tanpa batas: sisa null, tidak habis', sisaHenti(t0, 0, t0 + 99 * MENIT) === null && !sudahHabis(t0, 0, t0 + 99 * MENIT));
  cek('belum mulai: sisa null', sisaHenti(0, 15, t0) === null && !sudahHabis(0, 15, t0));
  cek('baru mulai: sisa penuh 15 menit', sisaHenti(t0, 15, t0) === 15 * MENIT);
  cek('5 menit berjalan: sisa 10 menit', sisaHenti(t0, 15, t0 + 5 * MENIT) === 10 * MENIT);
  cek('tepat habis: sisa 0 dan habis', sisaHenti(t0, 15, t0 + 15 * MENIT) === 0 && sudahHabis(t0, 15, t0 + 15 * MENIT));
  cek('lewat batas: sisa tidak negatif', sisaHenti(t0, 30, t0 + 90 * MENIT) === 0);
  cek('sebelum batas: belum habis', !sudahHabis(t0, 60, t0 + 59 * MENIT));
}

console.log(`\nHasil: ${lulus} lulus, ${gagal} gagal`);
if (gagal) process.exit(1);
