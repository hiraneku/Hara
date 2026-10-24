/* Uji cepat (<1 detik) untuk logika murni pemutar musik: docs/musik/logika.js.
   Tanpa jsdom — masuk ke `npm run test:cepat`. */
import assert from 'node:assert/strict';
import * as L from '../../docs/musik/logika.js';

let lulus = 0;
const uji = (nama, fn) => { fn(); lulus++; };

uji('tempo dijepit ke 0.5–2.0 dan dibulatkan 1%', () => {
  assert.equal(L.klampTempo(0.1), 0.5);
  assert.equal(L.klampTempo(9), 2);
  assert.equal(L.klampTempo(1.234), 1.23);
  assert.equal(L.klampTempo(0.755), 0.76);
  assert.equal(L.klampTempo(NaN), 1);
  assert.equal(L.klampTempo(undefined), 1);
});

uji('pitch dijepit ke ±12 semitone, presisi 0.01', () => {
  assert.equal(L.klampPitch(-99), -12);
  assert.equal(L.klampPitch(99), 12);
  assert.equal(L.klampPitch(2.6), 2.6);
  assert.equal(L.klampPitch(3.456), 3.46);
  assert.equal(L.klampPitch(-7.854), -7.85);
  assert.equal(L.klampPitch(0.004), 0);
  assert.equal(L.klampPitch(-0.2), -0.2);
  assert.ok(!Object.is(L.klampPitch(-0.001), -0));
  assert.equal(L.klampPitch('x'), 0);
});

uji('label tempo dan pitch dua desimal', () => {
  assert.equal(L.persenTempo(1), '100%');
  assert.equal(L.persenTempo(0.5), '50%');
  assert.equal(L.labelPitch(5), '+5.00');
  assert.equal(L.labelPitch(3.47), '+3.47');
  assert.equal(L.labelPitch(-3), '-3.00');
  assert.equal(L.labelPitch(-12), '-12.00');
  assert.equal(L.labelPitch(0), '0.00');
  assert.equal(L.labelPitch(20), '+12.00');
  assert.equal(L.angkaPitch(-0.5), '-0.50');
});

uji('format ukuran berkas', () => {
  assert.equal(L.formatUkuran(0), '0 KB');
  assert.equal(L.formatUkuran(512 * 1024), '512 KB');
  assert.equal(L.formatUkuran(12.4 * 1024 * 1024), '12.4 MB');
  assert.equal(L.formatUkuran(1.3 * 1024 * 1024 * 1024), '1.30 GB');
});

uji('pengaturan layar Musik dibersihkan', () => {
  assert.deepEqual(L.normalisasiSet(undefined), L.SET_AWAL);
  const s = L.normalisasiSet({ setelahSelesai: 'x', lanjutkanPosisi: 'ya', gayaSeek: 'gelombang', tempoAwal: 9 });
  assert.deepEqual(s, { setelahSelesai: 'berhenti', lanjutkanPosisi: true, gayaSeek: 'gelombang', tempoAwal: 2 });
  assert.equal(L.normalisasiSet({ setelahSelesai: 'ulangi' }).setelahSelesai, 'ulangi');
});

uji('format waktu m:ss dan h:mm:ss', () => {
  assert.equal(L.formatWaktu(0), '0:00');
  assert.equal(L.formatWaktu(65.9), '1:05');
  assert.equal(L.formatWaktu(3599), '59:59');
  assert.equal(L.formatWaktu(3600), '1:00:00');
  assert.equal(L.formatWaktu(3725), '1:02:05');
  assert.equal(L.formatWaktu(-4), '0:00');
  assert.equal(L.formatWaktu(NaN), '0:00');
});

uji('posisi dijepit ke [0, durasi]', () => {
  assert.equal(L.klampPosisi(-1, 10), 0);
  assert.equal(L.klampPosisi(12, 10), 10);
  assert.equal(L.klampPosisi(4, 10), 4);
  assert.equal(L.klampPosisi(4, 0), 0);
});

uji('tandai A lalu B menghasilkan loop aktif', () => {
  let l = { ...L.LOOP_KOSONG };
  l = L.tandaiLoop(l, 'a', 10, 100);
  assert.deepEqual(l, { a: 10, b: null, aktif: false });
  l = L.tandaiLoop(l, 'b', 20, 100);
  assert.deepEqual(l, { a: 10, b: 20, aktif: true });
});

uji('B terlalu dekat A: titik yang diketuk menang, yang lain dihapus', () => {
  const l = L.tandaiLoop({ a: 10, b: 20, aktif: true }, 'b', 10.2, 100);
  assert.equal(l.a, null);
  assert.equal(l.b, 10.2);
  assert.equal(l.aktif, false);
  const m = L.tandaiLoop({ a: 10, b: 20, aktif: true }, 'a', 19.9, 100);
  assert.equal(m.a, 19.9);
  assert.equal(m.b, null);
});

uji('titik diatur ulang dengan mengetuk lagi', () => {
  let l = L.tandaiLoop({ a: 10, b: 20, aktif: true }, 'a', 30, 100);
  /* A pindah ke 30, B 20 jadi tidak valid → B dihapus */
  assert.equal(l.a, 30);
  assert.equal(l.b, null);
  l = L.tandaiLoop({ a: 10, b: 20, aktif: true }, 'b', 50, 100);
  assert.deepEqual(l, { a: 10, b: 50, aktif: true });
});

uji('titik loop dijepit ke durasi', () => {
  const l = L.tandaiLoop({ ...L.LOOP_KOSONG }, 'b', 500, 100);
  assert.equal(l.b, 100);
});

uji('loop lompat ke A saat mencapai B hanya bila aktif', () => {
  const aktif = { a: 5, b: 10, aktif: true };
  assert.equal(L.loopBerikutnya(9.9, aktif), null);
  assert.equal(L.loopBerikutnya(10, aktif), 5);
  assert.equal(L.loopBerikutnya(11, aktif), 5);
  assert.equal(L.loopBerikutnya(11, { ...aktif, aktif: false }), null);
  assert.equal(L.loopBerikutnya(11, { a: 5, b: null, aktif: true }), null);
  assert.equal(L.loopBerikutnya(11, null), null);
});

uji('sahkanLoop membuang loop yang tidak cocok dengan durasi', () => {
  assert.deepEqual(L.sahkanLoop({ a: 5, b: 200, aktif: true }, 100), L.LOOP_KOSONG);
  assert.deepEqual(L.sahkanLoop({ a: 5, b: 5.2, aktif: true }, 100), L.LOOP_KOSONG);
  assert.deepEqual(L.sahkanLoop({ a: -1, b: 5, aktif: true }, 100), L.LOOP_KOSONG);
  assert.deepEqual(L.sahkanLoop({ a: 5, b: 9, aktif: true }, 100), { a: 5, b: 9, aktif: true });
  assert.deepEqual(L.sahkanLoop(null, 100), L.LOOP_KOSONG);
});

uji('normalisasiAtur menyaring input penyimpanan yang rusak', () => {
  const a = L.normalisasiAtur({ tempo: 7, pitch: 'banyak', loop: 'x', posisi: 999 }, 180);
  assert.deepEqual(a, { tempo: 2, pitch: 0, loop: L.LOOP_KOSONG, posisi: 180 });
  const b = L.normalisasiAtur(undefined, 60);
  assert.deepEqual(b, { tempo: 1, pitch: 0, loop: L.LOOP_KOSONG, posisi: 0 });
  const c = L.normalisasiAtur({ tempo: 0.75, pitch: -4, loop: { a: 1, b: 8, aktif: true }, posisi: 33 }, 60);
  assert.deepEqual(c, { tempo: 0.75, pitch: -4, loop: { a: 1, b: 8, aktif: true }, posisi: 33 });
});

uji('puncak gelombang dinormalkan dan jumlah bin tepat', () => {
  const data = new Float32Array(1000);
  for (let i = 0; i < 1000; i++) data[i] = Math.sin(i / 10) * (i < 500 ? 0.2 : 0.8);
  const p = L.puncakGelombang(data, 10);
  assert.equal(p.length, 10);
  assert.equal(Math.max(...p), 1);
  assert.ok(p[0] < p[9], 'bagian keras harus lebih tinggi');
  assert.equal(L.puncakGelombang(new Float32Array(0), 5).every(v => v === 0), true);
  assert.equal(L.puncakGelombang(new Float32Array(3), 5).length, 5);
});

uji('nama lagu dari berkas', () => {
  assert.equal(L.namaDariBerkas('Lagu_Favorit-01.mp3'), 'Lagu Favorit 01');
  assert.equal(L.namaDariBerkas('  a   b  .flac'), 'a b');
  assert.equal(L.namaDariBerkas('.mp3'), 'Tanpa judul');
  assert.equal(L.namaDariBerkas(''), 'Tanpa judul');
});

uji('tebakan berkas audio', () => {
  assert.equal(L.kemungkinanAudio({ name: 'a.MP3', type: '' }), true);
  assert.equal(L.kemungkinanAudio({ name: 'x', type: 'audio/ogg' }), true);
  assert.equal(L.kemungkinanAudio({ name: 'foto.jpg', type: 'image/jpeg' }), false);
  assert.equal(L.kemungkinanAudio({ name: 'catatan.txt' }), false);
});

uji('lagu terakhir: terakhir diputar, lalu terakhir diimpor', () => {
  assert.equal(L.laguTerakhir([]), null);
  const d = [
    { id: 'a', ditambahkan: 1, terakhirMain: 0 },
    { id: 'b', ditambahkan: 2, terakhirMain: 0 },
    { id: 'c', ditambahkan: 3, terakhirMain: 9 },
  ];
  assert.equal(L.laguTerakhir(d).id, 'c');
  assert.equal(L.laguTerakhir(d.slice(0, 2)).id, 'b');
});

uji('hue sampul stabil dan dalam 0..359', () => {
  assert.equal(L.hueDariId('lagu-1'), L.hueDariId('lagu-1'));
  for (const id of ['', 'a', 'lagu-123', 'x'.repeat(200)]) {
    const h = L.hueDariId(id);
    assert.ok(h >= 0 && h < 360);
  }
});

console.log(`musik-logika: ${lulus} uji lulus`);
