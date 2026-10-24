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
  const s = L.normalisasiSet({ setelahSelesai: 'x', lanjutkanPosisi: 'ya', tempoAwal: 9 });
  assert.deepEqual(s, { setelahSelesai: 'berhenti', lanjutkanPosisi: true, tempoAwal: 2 });
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

uji('ekualiser: gain dijepit ±12 dB, bulat 0.5 dB, dan NaN jadi 0', () => {
  assert.equal(L.klampEq(7.6), 7.5);
  assert.equal(L.klampEq(7.8), 8);
  assert.equal(L.klampEq(-20), -12);
  assert.equal(L.klampEq(20), 12);
  assert.equal(L.klampEq(NaN), 0);
  assert.equal(L.klampEq(undefined), 0);
  assert.equal(L.klampEq(-0.2), 0);
});

uji('ekualiser: Q dijepit 0.3–4 dan dibulatkan 0.1', () => {
  assert.equal(L.klampQ(9), 4);
  assert.equal(L.klampQ(0.01), 0.3);
  assert.equal(L.klampQ(1.26), 1.3);
  assert.equal(L.klampQ(NaN), 1);
});

uji('ekualiser: normalisasi selalu 10 pita, preamp dan Q ikut dijepit', () => {
  const n = L.normalisasiEq({ gain: [1, 2, 99], preamp: -40, q: 8 });
  assert.deepEqual(n.gain, [1, 2, 12, 0, 0, 0, 0, 0, 0, 0]);
  assert.equal(n.preamp, -12);
  assert.equal(n.q, 4);
  assert.equal(n.gain.length, L.EQ_FREKUENSI.length);
  assert.equal(L.normalisasiEq({ aktif: false }).aktif, false);
  assert.equal(L.normalisasiEq(null).aktif, true);
  assert.equal(L.normalisasiEq(null).gain.length, 10);
});

uji('ekualiser: 10 pita standar oktaf dari 31 Hz sampai 16 kHz', () => {
  assert.deepEqual([...L.EQ_FREKUENSI], [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]);
  assert.equal(L.labelFrekuensi(31), '31 Hz');
  assert.equal(L.labelFrekuensi(1000), '1 kHz');
  assert.equal(L.labelFrekuensi(16000), '16 kHz');
});

uji('ekualiser: semua preset 10 pita dan dalam batas', () => {
  for (const k of Object.keys(L.PRESET_EQ)) {
    assert.equal(L.PRESET_EQ[k].length, 10, k);
    for (const v of L.PRESET_EQ[k]) assert.ok(v >= L.EQ_MIN && v <= L.EQ_MAX, k);
    assert.ok(L.NAMA_PRESET_EQ[k], 'nama ' + k);
  }
  assert.ok(L.PRESET_EQ.datar.every(v => v === 0));
  assert.equal(Object.keys(L.PRESET_EQ).length, 8);
});

uji('ekualiser: nama preset dirapikan, kosong ditolak, maks 24 karakter', () => {
  assert.equal(L.namaPresetValid('  Malam   santai '), 'Malam santai');
  assert.equal(L.namaPresetValid('   '), null);
  assert.equal(L.namaPresetValid('x'.repeat(40)).length, 24);
});

uji('ekualiser: preset buatan sendiri dibersihkan, tanpa nama ganda, maks 10', () => {
  const raw = [{ nama: 'A', gain: [1] }, { nama: ' A ', gain: [2] }, { nama: '  ', gain: [] }, null];
  for (let i = 0; i < 15; i++) raw.push({ nama: 'P' + i, gain: [i] });
  const k = L.normalisasiKustom(raw);
  assert.equal(k[0].nama, 'A');
  assert.equal(k[0].gain.length, 10);
  assert.equal(k.length, L.EQ_KUSTOM_MAKS);
  assert.deepEqual(L.normalisasiKustom('bukan array'), []);
});

uji('ekualiser: migrasi data 5 pita lama ke pita terdekat', () => {
  const m = L.migrasiEqLama({ aktif: false, gain: [6, 4, 1, 0, -3] });
  assert.equal(m.aktif, false);
  assert.deepEqual(m.gain, [0, 6, 0, 4, 0, 1, 0, 0, 0, -3]);
  assert.equal(L.migrasiEqLama(null), null);
});

uji('ekualiser: respons peaking = gain di pusat, ~0 jauh, Q besar lebih sempit', () => {
  assert.ok(Math.abs(L.responPeaking(1000, 1000, 6, 1) - 6) < 1e-6);
  assert.ok(Math.abs(L.responPeaking(1000, 1000, -9, 2) + 9) < 1e-6);
  assert.ok(Math.abs(L.responPeaking(20000, 1000, 6, 1)) < 0.05);
  assert.ok(L.responPeaking(2000, 1000, 6, 4) < L.responPeaking(2000, 1000, 6, 0.5));
});

uji('ekualiser: kurva datar saat nonaktif atau gain nol, dan naik dengan preamp', () => {
  assert.ok(L.kurvaEq({ aktif: true, gain: [] }).every(([, db]) => db === 0));
  assert.ok(L.kurvaEq({ aktif: false, gain: [12, 12, 12, 12, 12, 12, 12, 12, 12, 12], preamp: 6 }).every(([, db]) => db === 0));
  const kurva = L.kurvaEq({ aktif: true, gain: Array(10).fill(0), preamp: 3 }, 20);
  assert.equal(kurva.length, 20);
  assert.ok(kurva.every(([, db]) => Math.abs(db - 3) < 1e-9));
  assert.ok(Math.abs(kurva[0][0] - 20) < 1e-9 && Math.abs(kurva[19][0] - 20000) < 1e-6);
});

uji('daftar putar: pindah item ke atas/bawah, tepi tidak berubah, tidak mengubah asal', () => {
  const asal = ['a', 'b', 'c'];
  assert.deepEqual(L.pindahItem(asal, 1, -1), ['b', 'a', 'c']);
  assert.deepEqual(L.pindahItem(asal, 1, 1), ['a', 'c', 'b']);
  assert.deepEqual(L.pindahItem(asal, 0, -1), ['a', 'b', 'c']);
  assert.deepEqual(L.pindahItem(asal, 2, 1), ['a', 'b', 'c']);
  assert.deepEqual(asal, ['a', 'b', 'c']);
});

uji('daftar putar: tambah tanpa duplikat', () => {
  assert.deepEqual(L.tambahUnik(['a', 'b'], 'c'), ['a', 'b', 'c']);
  assert.deepEqual(L.tambahUnik(['a', 'b'], 'a'), ['a', 'b']);
});

uji('daftar putar: nama dirapikan, kosong ditolak, maks 60 karakter', () => {
  assert.equal(L.namaDaftarValid('  Pagi   hari \n '), 'Pagi hari');
  assert.equal(L.namaDaftarValid('   '), null);
  assert.equal(L.namaDaftarValid(null), null);
  assert.equal(L.namaDaftarValid('x'.repeat(100)).length, 60);
});

uji('daftar putar: normalisasi membuang data rusak dan duplikat lagu', () => {
  const hasil = L.normalisasiDaftarPutar([
    { id: 'd1', nama: 'Satu', lagu: ['a', 'a', 'b', 7] },
    { id: 'd2', nama: '   ', lagu: ['x'] },
    null,
    { id: 'd3', nama: 'Dua' },
  ]);
  assert.deepEqual(hasil.map(d => d.id), ['d1', 'd3']);
  assert.deepEqual(hasil[0].lagu, ['a', 'b']);
  assert.deepEqual(hasil[1].lagu, []);
  assert.deepEqual(L.normalisasiDaftarPutar('bukan array'), []);
});

console.log(`musik-logika: ${lulus} uji lulus`);
