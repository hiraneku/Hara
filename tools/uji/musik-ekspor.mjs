/* Uji pemrosesan ekspor yang tidak butuh AudioContext (docs/musik/ekspor-dsp.js):
   tempo, nada, ekor lagu, header WAV, nama berkas, dan MP3 lewat lamejs.
   Ekualiser dan kompresor dijalankan browser (OfflineAudioContext) dan TIDAK diuji di sini.
   Jalankan: node tools/uji/musik-ekspor.mjs */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(AKAR);
const V = fs.readFileSync('docs/app.js', 'utf8').match(/\?v=(\d+)/)[1];
const D = await import(`${AKAR}/docs/musik/ekspor-dsp.js?v=${V}`);

const HZ = 44100;
const sinus = (f, detik, amp = 0.5) => {
  const n = Math.round(detik * HZ);
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = amp * Math.sin(2 * Math.PI * f * i / HZ);
  return x;
};
const rms = (x, a = 0, b = x.length) => {
  let s = 0;
  for (let i = a; i < b; i++) s += x[i] * x[i];
  return Math.sqrt(s / Math.max(1, b - a));
};
/* Frekuensi dari jumlah perpotongan nol naik di bagian tengah. */
const frekuensi = (x, detikBagian = 1) => {
  const a = Math.floor(x.length / 2 - detikBagian * HZ / 2);
  const b = a + Math.floor(detikBagian * HZ);
  let naik = 0;
  for (let i = a + 1; i < b; i++) if (x[i - 1] < 0 && x[i] >= 0) naik++;
  return naik / detikBagian;
};

let lulus = 0;
const uji = async (nama, fn) => { await fn(); lulus++; console.log('ok  ', nama); };

await uji('tempo 1 dan nada 0 tidak mengubah apa pun', () => {
  const L = sinus(440, 0.5), R = sinus(440, 0.5);
  const hasil = D.tempoDanNada(L, R, 1, 0);
  assert.equal(hasil.L, L);
  assert.equal(hasil.R, R);
});

await uji('tempo 0.5 menghasilkan dua kali panjang, 2 menghasilkan setengahnya', () => {
  const L = sinus(440, 2);
  const lambat = D.tempoDanNada(L, L, 0.5, 0);
  assert.ok(Math.abs(lambat.L.length - L.length * 2) <= L.length * 0.01, `panjang ${lambat.L.length}`);
  const cepat = D.tempoDanNada(L, L, 2, 0);
  assert.ok(Math.abs(cepat.L.length - L.length / 2) <= L.length * 0.01, `panjang ${cepat.L.length}`);
});

await uji('tempo mengubah kecepatan, bukan nada (frekuensi tetap 440 Hz)', () => {
  const L = sinus(440, 2);
  const hasil = D.tempoDanNada(L, L, 0.75, 0);
  const f = frekuensi(hasil.L);
  assert.ok(Math.abs(f - 440) / 440 < 0.03, `frekuensi ${f}`);
});

await uji('nada +12 semitone menggandakan frekuensi tanpa mengubah panjang', () => {
  const L = sinus(1000, 2);
  const hasil = D.tempoDanNada(L, L, 1, 12);
  const f = frekuensi(hasil.L);
  assert.ok(Math.abs(f - 2000) / 2000 < 0.03, `frekuensi ${f}`);
  assert.ok(Math.abs(hasil.L.length - L.length) <= L.length * 0.01);
});

await uji('ekor lagu tidak terpotong: bagian terakhir tetap berbunyi', () => {
  const L = sinus(440, 2, 0.5);
  const hasil = D.tempoDanNada(L, L, 0.5, 0);
  const akhir = hasil.L.length;
  assert.ok(rms(hasil.L, akhir - HZ * 0.2, akhir) > 0.2, 'ekor kosong');
});

await uji('WAV: header PCM 16-bit stereo 44.1 kHz dan sampel benar', () => {
  const L = Float32Array.from([0, 0.5, -0.5, 1]);
  const R = Float32Array.from([0, -1, 1, 0]);
  const blob = D.kodeWav(L, R);
  return blob.arrayBuffer().then(buf => {
    const v = new DataView(buf);
    const teks = (o, n) => String.fromCharCode(...new Uint8Array(buf, o, n));
    assert.equal(teks(0, 4), 'RIFF');
    assert.equal(teks(8, 4), 'WAVE');
    assert.equal(teks(12, 4), 'fmt ');
    assert.equal(v.getUint16(20, true), 1, 'PCM');
    assert.equal(v.getUint16(22, true), 2, 'stereo');
    assert.equal(v.getUint32(24, true), 44100);
    assert.equal(v.getUint16(34, true), 16);
    assert.equal(teks(36, 4), 'data');
    assert.equal(v.getUint32(40, true), L.length * 4);
    assert.equal(buf.byteLength, 44 + L.length * 4);
    assert.equal(v.getInt16(44 + 4, true), 16384, 'kiri 0.5');
    assert.equal(v.getInt16(46 + 4, true), -32767, 'kanan -1');
    assert.equal(v.getInt16(44 + 12, true), 32767, 'kiri 1 dijepit');
  });
});

await uji('nama berkas ekspor: karakter terlarang diganti, ekstensi sesuai format', () => {
  assert.equal(D.namaEkspor('明日の僕らはどう? [mQhA7Bw5oRY]', 'mp3'), '明日の僕らはどう_ [mQhA7Bw5oRY] (ekspor).mp3');
  assert.equal(D.namaEkspor('a/b:c', 'wav'), 'a_b_c (ekspor).wav');
  assert.equal(D.namaEkspor('', 'wav'), 'lagu (ekspor).wav');
});

const lameKode = fs.readFileSync('docs/vendor/lamejs/lame.min.js', 'utf8');
const konteks = vm.createContext({});
vm.runInContext(lameKode + '\n;this.lamejs = lamejs;', konteks);
await uji('MP3: lamejs menghasilkan berkas MPEG yang bisa dibaca (ID3 atau sinkron frame)', async () => {
  const L = sinus(440, 1, 0.5), R = sinus(660, 1, 0.5);
  const blob = D.kodeMp3(konteks.lamejs, L, R, 192);
  const buf = new Uint8Array(await blob.arrayBuffer());
  assert.ok(buf.length > 2000, `ukuran ${buf.length}`);
  const sinkron = (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) || (buf[0] === 0x49 && buf[1] === 0x44);
  assert.ok(sinkron, 'header MP3 tidak valid');
  assert.equal(blob.type, 'audio/mpeg');
});

console.log(`\nmusik-ekspor: ${lulus} uji lulus`);
