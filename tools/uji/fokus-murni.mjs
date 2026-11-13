// Pengujian C9 · Focus timer (model murni) — tanpa DOM.
//
// Yang diuji (docs/notes/fokus-murni.js):
//   • normalisasi pengaturan: bawaan, batas, nilai rusak, mode, bunyi;
//   • mulai, jeda, lanjut, dan sisa waktu dihitung dari timestamp akhir;
//   • periksa: fokus → istirahat → fokus (siklus), mode hitung selesai sekali;
//   • pengaturan hanya berlaku saat siap atau selesai;
//   • format mm:ss dan h:mm:ss.
//
// Yang TIDAK diuji di sini: lembar, tombol, bunyi, dan penyimpanan (uji Chromium di luar repo).
//
// Jalan: node tools/uji/fokus-murni.mjs (dari folder repo).
import {
  BAWAAN, normalisasi, durasiFase, keadaanAwal, mulai, jeda, sisa, periksa,
  terapkanPengaturan, bisaDiubah, formatSisa, FOKUS_MAKS, ISTIRAHAT_MAKS, HITUNG_MAKS,
} from '../../docs/notes/fokus-murni.js';

let lulus = 0, gagal = 0;
function cek(nama, ok, detail = '') {
  if (ok) { lulus++; console.log(`OK   ${nama}${detail ? ' — ' + detail : ''}`); }
  else { gagal++; console.log(`GAGAL ${nama}${detail ? ' — ' + detail : ''}`); }
}
const MENIT = 60000;

// ── 1. normalisasi ──
console.log('── 1. normalisasi');
{
  const d = normalisasi(undefined);
  cek('bawaan: pomodoro 25/5, hitung 10, bunyi nyala', d.mode === 'pomodoro' && d.fokusMenit === 25 && d.istirahatMenit === 5 && d.hitungMenit === 10 && d.suara === true, JSON.stringify(d));
  cek('BAWAAN sama dengan hasil normalisasi kosong', JSON.stringify(normalisasi({})) === JSON.stringify(BAWAAN));
  const b = normalisasi({ mode: 'hitung', fokusMenit: 0, istirahatMenit: 999, hitungMenit: 'x', suara: 0 });
  cek('mode hitung dikenali', b.mode === 'hitung');
  cek('fokus di bawah 1 dinaikkan ke 1', b.fokusMenit === 1);
  cek('istirahat di atas batas dipotong', b.istirahatMenit === ISTIRAHAT_MAKS, String(b.istirahatMenit));
  cek('hitung non-angka kembali ke bawaan', b.hitungMenit === BAWAAN.hitungMenit);
  cek('bunyi non-boolean kembali ke bawaan', b.suara === true);
  cek('mode tak dikenal jadi pomodoro', normalisasi({ mode: 'stopwatch' }).mode === 'pomodoro');
  cek('pecahan dibulatkan', normalisasi({ fokusMenit: 24.6 }).fokusMenit === 25);
  cek('fokus di atas batas dipotong', normalisasi({ fokusMenit: 9999 }).fokusMenit === FOKUS_MAKS);
  cek('hitung di atas batas dipotong', normalisasi({ hitungMenit: 9999 }).hitungMenit === HITUNG_MAKS);
  cek('string angka diterima', normalisasi({ fokusMenit: '30' }).fokusMenit === 30);
}

// ── 2. durasi ──
console.log('── 2. durasi fase');
{
  const p = normalisasi({});
  cek('fokus 25 menit', durasiFase(p, 'fokus') === 25 * MENIT);
  cek('istirahat 5 menit', durasiFase(p, 'istirahat') === 5 * MENIT);
  const h = normalisasi({ mode: 'hitung', hitungMenit: 3 });
  cek('mode hitung memakai hitungMenit untuk semua fase', durasiFase(h, 'fokus') === 3 * MENIT && durasiFase(h, 'istirahat') === 3 * MENIT);
}

// ── 3. mulai, jeda, sisa ──
console.log('── 3. mulai, jeda, sisa');
{
  const p = normalisasi({ fokusMenit: 2 });
  let k = keadaanAwal(p);
  cek('keadaan awal siap, sisa 2 menit', k.status === 'siap' && k.sisaMs === 2 * MENIT && k.fase === 'fokus' && k.siklus === 0);
  const t0 = 1_000_000;
  k = mulai(k, t0);
  cek('mulai: status jalan, akhir = now + sisa', k.status === 'jalan' && k.akhir === t0 + 2 * MENIT);
  cek('sisa saat jalan berkurang sesuai waktu', sisa(k, t0 + 30000) === 90000);
  cek('sisa tidak negatif setelah lewat', sisa(k, t0 + 999999) === 0);
  const kTerus = mulai(k, t0 + 5000);
  cek('mulai saat sudah jalan tidak mengubah akhir', kTerus === k);
  k = jeda(k, t0 + 30000);
  cek('jeda: status jeda, sisa tersimpan 90 dtk', k.status === 'jeda' && k.sisaMs === 90000 && k.akhir === 0);
  cek('sisa saat dijeda tetap 90 dtk walau waktu berjalan', sisa(k, t0 + 200000) === 90000);
  k = mulai(k, t0 + 200000);
  cek('lanjut dari jeda: akhir dihitung ulang dari sisa', k.status === 'jalan' && k.akhir === t0 + 200000 + 90000);
  cek('jeda saat tidak jalan tidak mengubah keadaan', jeda(keadaanAwal(p), t0) .status === 'siap');
  cek('mulai dengan sisa 0 ditolak', mulai({ ...keadaanAwal(p), sisaMs: 0 }, t0).status === 'siap');
}

// ── 4. periksa: pergantian fase ──
console.log('── 4. periksa dan siklus pomodoro');
{
  const p = normalisasi({ fokusMenit: 25, istirahatMenit: 5 });
  const t0 = 5_000_000;
  let k = mulai(keadaanAwal(p), t0);
  let r = periksa(k, p, t0 + 25 * MENIT - 1);
  cek('sebelum habis: keadaan tidak berubah dan selesai null', r.keadaan === k && r.selesai === null);
  r = periksa(k, p, t0 + 25 * MENIT);
  cek('habis fokus: selesai = fokus', r.selesai === 'fokus', String(r.selesai));
  cek('habis fokus: beralih ke istirahat, siap, siklus 1', r.keadaan.status === 'siap' && r.keadaan.fase === 'istirahat' && r.keadaan.siklus === 1 && r.keadaan.sisaMs === 5 * MENIT, JSON.stringify(r.keadaan));
  cek('pergantian fase tidak otomatis mulai', r.keadaan.status !== 'jalan');
  k = mulai(r.keadaan, t0 + 30 * MENIT);
  r = periksa(k, p, t0 + 35 * MENIT);
  cek('habis istirahat: selesai = istirahat', r.selesai === 'istirahat');
  cek('habis istirahat: kembali ke fokus, siklus tetap 1', r.keadaan.fase === 'fokus' && r.keadaan.siklus === 1);
  k = mulai(r.keadaan, t0 + 40 * MENIT);
  r = periksa(k, p, t0 + 65 * MENIT);
  cek('siklus kedua selesai: siklus 2', r.keadaan.siklus === 2 && r.selesai === 'fokus');
  const diam = periksa(keadaanAwal(p), p, t0 + 999 * MENIT);
  cek('keadaan siap tidak pernah selesai sendiri', diam.selesai === null);
  const jedaK = jeda(mulai(keadaanAwal(p), t0), t0 + 1000);
  cek('keadaan dijeda tidak pernah selesai sendiri', periksa(jedaK, p, t0 + 999 * MENIT).selesai === null);
}

// ── 5. periksa: mode hitung mundur ──
console.log('── 5. periksa mode hitung');
{
  const p = normalisasi({ mode: 'hitung', hitungMenit: 1 });
  const t0 = 9_000_000;
  const k = mulai(keadaanAwal(p), t0);
  const r = periksa(k, p, t0 + MENIT);
  cek('hitung mundur selesai: status selesai, selesai = hitung', r.keadaan.status === 'selesai' && r.selesai === 'hitung' && r.keadaan.sisaMs === 0, JSON.stringify(r.keadaan));
  cek('selesai tidak mengulang dan tidak mengulang bunyi', periksa(r.keadaan, p, t0 + 2 * MENIT).selesai === null);
  cek('keadaan selesai tidak bisa dimulai lagi tanpa ulang', mulai(r.keadaan, t0 + 2 * MENIT).status === 'selesai');
}

// ── 6. pengaturan hanya berlaku saat siap atau selesai ──
console.log('── 6. terapkan pengaturan');
{
  const p1 = normalisasi({ fokusMenit: 25 });
  const p2 = normalisasi({ fokusMenit: 50 });
  const siap = keadaanAwal(p1, 3);
  const t = terapkanPengaturan(siap, p2);
  cek('siap: pengaturan baru langsung terpakai, siklus dipertahankan', t.sisaMs === 50 * MENIT && t.siklus === 3);
  const jalan = mulai(siap, 100);
  cek('jalan: pengaturan tidak mengubah keadaan', terapkanPengaturan(jalan, p2) === jalan);
  const dijeda = jeda(jalan, 200);
  cek('dijeda: pengaturan tidak mengubah keadaan', terapkanPengaturan(dijeda, p2) === dijeda);
  cek('bisaDiubah: siap dan selesai ya, jalan dan jeda tidak', bisaDiubah(siap) && !bisaDiubah(jalan) && !bisaDiubah(dijeda) && bisaDiubah({ status: 'selesai' }));
}

// ── 7. format ──
console.log('── 7. format sisa waktu');
{
  cek('0 dtk → 00:00', formatSisa(0) === '00:00');
  cek('400 md dibulatkan ke atas → 00:01', formatSisa(400) === '00:01');
  cek('59.001 md → 01:00', formatSisa(59001) === '01:00');
  cek('25 menit → 25:00', formatSisa(25 * MENIT) === '25:00');
  cek('1 jam → 1:00:00', formatSisa(3600000) === '1:00:00');
  cek('1 jam 2 menit 3 dtk → 1:02:03', formatSisa(3723000) === '1:02:03');
  cek('negatif ditahan ke 00:00', formatSisa(-5000) === '00:00');
}

console.log(`\nHasil: ${lulus} lulus, ${gagal} gagal`);
if (gagal) process.exit(1);
