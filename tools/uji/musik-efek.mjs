/* Uji cepat (<1 detik) untuk efek pemutar:
   - docs/musik/efek-data.js: definisi, batas nilai, normalisasi, dan format.
   - docs/musik/efek-dsp.js: sambungan rantai (diuji dengan mock Web Audio, bukan audio sungguhan).
   Tanpa jsdom. Hasil audio di perangkat TIDAK tercakup di sini. */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as D from '../../docs/musik/efek-data.js';
import { buatRantaiEfek } from '../../docs/musik/efek-dsp.js';

let lulus = 0;
const uji = (nama, fn) => { fn(); lulus++; };

uji('tujuh efek dalam satu kategori dengan urutan tetap', () => {
  assert.deepEqual(D.EFEK.map(e => e.id), ['reverb', 'echo', 'delay', 'lebar', 'spasial', 'pantulan', 'konvolusi']);
  assert.equal(D.EFEK_KATEGORI.nama, 'Spatial & Ambience');
  assert.equal(D.efekById('nope'), null);
});

uji('batas dan langkah nilai (klampParam)', () => {
  const reverb = D.efekById('reverb');
  const wet = reverb.utama.find(p => p.id === 'wet');
  assert.equal(D.klampParam(wet, 150), 100);
  assert.equal(D.klampParam(wet, -5), 0);
  assert.equal(D.klampParam(wet, 33.6), 34);
  const cut = reverb.utama.find(p => p.id === 'cutLow');
  assert.equal(D.klampParam(cut, 1234), 1000);
  assert.equal(D.klampParam(cut, 777), 780);
  const predelay = reverb.utama.find(p => p.id === 'predelay');
  assert.equal(D.klampParam(predelay, 600), 500);
  const peluruhan = reverb.lanjutan[0];
  assert.equal(D.klampParam(peluruhan, 0.05), 0.3);
  assert.equal(D.klampParam(peluruhan, 7.96), 8);
  const putar = D.efekById('spasial').lanjutan[0];
  assert.equal(D.klampParam(putar, 0.123), 0.1);
  assert.equal(D.klampParam(putar, 9), 1);
  assert.equal(D.klampParam(wet, NaN), 35);
  const ruang = D.efekById('konvolusi').utama.find(p => p.id === 'ruang');
  assert.equal(D.klampParam(ruang, 'gua'), 'gua');
  assert.equal(D.klampParam(ruang, 'xxx'), 'aula');
});

uji('keadaan awal: semua mati dengan nilai awal', () => {
  const awal = D.efekAwal();
  for (const e of D.EFEK) {
    assert.equal(awal[e.id].aktif, false);
    for (const p of D.semuaParam(e)) assert.equal(awal[e.id].p[p.id], p.awal, `${e.id}.${p.id}`);
  }
  assert.deepEqual(D.normalisasiEfek(null), awal);
  assert.deepEqual(D.normalisasiEfek('rusak'), awal);
});

uji('normalisasi membuang id asing dan menjepit nilai rusak', () => {
  const hasil = D.normalisasiEfek({
    reverb: { aktif: true, p: { wet: 999, ukuran: 'x', dibuangSaja: 5 } },
    ada: { aktif: true },
    echo: { aktif: 'ya' },
  });
  assert.deepEqual(Object.keys(hasil), D.EFEK.map(e => e.id));
  assert.equal(hasil.reverb.aktif, true);
  assert.equal(hasil.reverb.p.wet, 100);
  assert.equal(hasil.reverb.p.ukuran, 50);
  assert.equal(hasil.reverb.p.dibuangSaja, undefined);
  assert.equal(hasil.echo.aktif, false);
});

uji('ubahEfekPure hanya mengubah efek yang diminta', () => {
  let s = D.efekAwal();
  s = D.ubahEfekPure(s, 'delay', { aktif: true });
  assert.equal(s.delay.aktif, true);
  assert.equal(s.reverb.aktif, false);
  s = D.ubahEfekPure(s, 'delay', { p: { ulang: 99, waktu: 480 } });
  assert.equal(s.delay.p.ulang, 10);
  assert.equal(s.delay.p.waktu, 480);
  assert.equal(s.delay.p.wet, 40);
  s = D.ubahEfekPure(s, 'delay', { aktif: false });
  assert.equal(s.delay.aktif, false);
  assert.equal(s.delay.p.waktu, 480);
  assert.deepEqual(D.ubahEfekPure(s, 'tidak-ada', { aktif: true }), D.normalisasiEfek(s));
});

uji('format nilai memakai pemisah Indonesia dan satuan', () => {
  const cari = (id, pid) => D.semuaParam(D.efekById(id)).find(p => p.id === pid);
  assert.equal(D.formatNilai(cari('reverb', 'wet'), 25), '25%');
  assert.equal(D.formatNilai(cari('echo', 'jeda'), 350), '350 ms');
  assert.equal(D.formatNilai(cari('reverb', 'cutLow'), 1000), '1.000 Hz');
  assert.equal(D.formatNilai(cari('reverb', 'cutLow'), 80), '80 Hz');
  assert.equal(D.formatNilai(cari('reverb', 'peluruhan'), 2.5), '2,5 s');
  assert.equal(D.formatNilai(cari('reverb', 'peluruhan'), 2), '2 s');
  assert.equal(D.formatNilai(cari('spasial', 'putar'), 0.05), '0,05 Hz');
  assert.equal(D.formatNilai(cari('spasial', 'arah'), -40), 'Kiri 40');
  assert.equal(D.formatNilai(cari('spasial', 'arah'), 0), 'Tengah');
  assert.equal(D.formatNilai(cari('spasial', 'arah'), 25), 'Kanan 25');
  assert.equal(D.formatNilai(cari('delay', 'ulang'), 4), '4 kali');
  assert.equal(D.formatNilai(cari('konvolusi', 'gainIr'), 3), '+3 dB');
  assert.equal(D.formatNilai(cari('konvolusi', 'gainIr'), -12), '-12 dB');
  assert.equal(D.formatNilai(cari('konvolusi', 'ruang'), 'gua'), 'Gua');
});

uji('file IR bawaan ada dan berformat WAV, dengan lisensi', () => {
  const dir = fileURLToPath(new URL('../../docs/musik/ir/', import.meta.url));
  for (const r of D.IR_RUANG) {
    const berkas = dir + r.file;
    assert.ok(existsSync(berkas), r.file);
    const b = readFileSync(berkas);
    assert.equal(b.toString('ascii', 0, 4), 'RIFF');
    assert.equal(b.toString('ascii', 8, 12), 'WAVE');
  }
  assert.ok(existsSync(dir + 'LICENSE-voxengo.txt'));
});

/* ── Mock Web Audio: mencatat setiap node dan sambungannya ── */
function buatKonteks() {
  const semua = [];
  const param = () => ({ value: 0, setTargetAtTime(v) { this.value = v; } });
  const node = (tipe, extra = {}) => {
    const n = {
      tipe, keluar: new Set(), stopped: false,
      connect(tujuan) { this.keluar.add(tujuan); return tujuan; },
      disconnect() { this.keluar.clear(); },
      start() {}, stop() { this.stopped = true; },
      ...extra,
    };
    semua.push(n);
    return n;
  };
  const c = {
    currentTime: 0,
    semua,
    createGain: () => node('gain', { gain: param() }),
    createDelay: () => node('delay', { delayTime: param() }),
    createBiquadFilter: () => node('biquad', { frequency: param(), Q: { value: 1 }, type: 'lowpass' }),
    createChannelSplitter: () => node('splitter'),
    createChannelMerger: () => node('merger'),
    createStereoPanner: () => node('panner', { pan: param() }),
    createOscillator: () => node('osc', { frequency: param(), type: 'sine' }),
    createConvolver: () => node('konvolver', { buffer: null }),
    decodeAudioData: () => Promise.reject(new Error('mock: tanpa decode')),
  };
  return c;
}

/* Node yang bisa dicapai dari `dari` lewat sambungan keluar. */
function terjangkau(dari) {
  const lihat = new Set([dari]);
  const antre = [dari];
  while (antre.length) {
    const n = antre.shift();
    for (const t of n.keluar) if (!lihat.has(t)) { lihat.add(t); antre.push(t); }
  }
  return lihat;
}

const masukKeluar = () => {
  const c = buatKonteks();
  const masuk = c.createGain();
  const keluar = c.createGain();
  const rantai = buatRantaiEfek(c, masuk, keluar);
  return { c, masuk, keluar, rantai };
};

uji('tanpa efek aktif: masuk langsung ke keluar', () => {
  const { c, masuk, keluar, rantai } = masukKeluar();
  rantai.atur(D.efekAwal());
  assert.deepEqual([...masuk.keluar], [keluar]);
  assert.equal(c.semua.filter(n => n !== masuk && n !== keluar).length, 0, 'tidak ada node dibangun');
});

uji('efek aktif dibangun dan tersambung masuk -> efek -> keluar', () => {
  const { c, masuk, keluar, rantai } = masukKeluar();
  let s = D.ubahEfekPure(D.efekAwal(), 'echo', { aktif: true });
  rantai.atur(s);
  const dicapai = terjangkau(masuk);
  assert.ok(dicapai.has(keluar), 'keluar bisa dicapai dari masuk');
  const masukSatu = c.semua.filter(n => n.keluar.has(keluar));
  assert.equal(masukSatu.length, 1, 'keluar hanya menerima satu sambungan (dari efek terakhir)');
  assert.notEqual(masuk.keluar.has(keluar), true, 'masuk tidak langsung ke keluar lagi');
});

uji('mematikan efek melepas semua node-nya (tidak memproses audio)', () => {
  const { c, masuk, keluar, rantai } = masukKeluar();
  let s = D.ubahEfekPure(D.efekAwal(), 'reverb', { aktif: true });
  s = D.ubahEfekPure(s, 'delay', { aktif: true });
  rantai.atur(s);
  const sebelum = c.semua.length;
  assert.ok(sebelum > 60, `reverb + delay cukup banyak node (${sebelum})`);
  s = D.ubahEfekPure(s, 'reverb', { aktif: false });
  rantai.atur(s);
  s = D.ubahEfekPure(s, 'delay', { aktif: false });
  rantai.atur(s);
  assert.deepEqual([...masuk.keluar], [keluar]);
  for (const n of c.semua) {
    if (n === masuk || n === keluar) continue;
    assert.equal(n.keluar.size, 0, `node ${n.tipe} tidak lagi tersambung`);
  }
});

uji('beberapa efek aktif sekaligus dan urutan dipertahankan', () => {
  const { c, masuk, keluar, rantai } = masukKeluar();
  let s = D.efekAwal();
  for (const id of ['spasial', 'reverb', 'lebar']) s = D.ubahEfekPure(s, id, { aktif: true });
  rantai.atur(s);
  // Setiap perubahan parameter tidak boleh membangun ulang atau memutus sambungan.
  const jumlahNode = c.semua.length;
  s = D.ubahEfekPure(s, 'reverb', { p: { wet: 60 } });
  rantai.atur(s);
  assert.equal(c.semua.length, jumlahNode, 'ubah parameter tidak membangun node baru');
  assert.ok(terjangkau(masuk).has(keluar));
});

uji('setiap efek bisa dibangun dan dilepas tanpa galat', () => {
  for (const e of D.EFEK) {
    const { masuk, keluar, rantai } = masukKeluar();
    const s = D.ubahEfekPure(D.efekAwal(), e.id, { aktif: true });
    rantai.atur(s);
    assert.ok(terjangkau(masuk).has(keluar), e.id);
    rantai.atur(D.efekAwal());
    assert.deepEqual([...masuk.keluar], [keluar], e.id);
  }
});

uji('semua filter memakai Q Butterworth (-3.01 dB): Q lowpass/highpass dinyatakan dalam dB', () => {
  // Q 0 dB (linear 1) sudah berpuncak; di dalam loop umpan balik puncak itu membuat energi naik terus.
  for (const e of D.EFEK) {
    const ctx = buatKonteks();
    const r = buatRantaiEfek(ctx, ctx.createGain(), ctx.createGain());
    r.atur(D.ubahEfekPure(D.efekAwal(), e.id, { aktif: true }));
    const filter = ctx.semua.filter(n => n.tipe === 'biquad');
    assert.ok(filter.length > 0, `${e.id} punya filter`);
    for (const n of filter) assert.ok(Math.abs(n.Q.value + 3.0103) < 1e-3, `${e.id}: Q=${n.Q.value}`);
  }
});

console.log(`musik-efek: ${lulus} uji lulus`);
