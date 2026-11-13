import assert from 'node:assert/strict';
const data = new Map();
globalThis.localStorage = { getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,String(v)), removeItem: k => data.delete(k) };
const L = await import('../../docs/musik/lirik.js');
const P = await import('../../docs/musik/pintar.js');
const R = await import('../../docs/musik/riwayat.js');
const Logika = await import('../../docs/musik/logika.js');
let n = 0;
const uji = (nama, fn) => { fn(); n++; };

uji('LRC parses multiple timestamps, decimal precision and sorts lines', () => {
  const a = L.parseLrc('[ti:Song]\n[00:02.50]second\n[00:01.2][00:03.050]first and third\nnoise');
  assert.deepEqual(a.map(x => [x.waktu, x.teks]), [[1.2,'first and third'],[2.5,'second'],[3.05,'first and third']]);
});
uji('normalisasi kenyaringan memberi penguatan terbatas dan menjaga headroom puncak', () => {
  assert.equal(Logika.gainNormalisasi(0, 0), 1);
  assert.ok(Logika.gainNormalisasi(0.03, 0.05) <= 3);
  assert.ok(Math.abs(Logika.gainNormalisasi(0.18, 0.5) - 1) < 0.001);
  assert.ok(Logika.gainNormalisasi(0.1, 1) <= 0.9);
});
uji('active lyric returns the last line at or before position', () => {
  const a = L.parseLrc('[00:01.00]one\n[00:03.00]two');
  assert.equal(L.lirikAktif(a, 0), null);
  assert.equal(L.lirikAktif(a, 2)?.teks, 'one');
  assert.equal(L.lirikAktif(a, 5)?.teks, 'two');
});
uji('smart rules are normalized, transparent and dynamically select tracks', () => {
  const id = P.buatPintar('  Favorit   Jazz ', { favorit: true, artis: 'jazz', minDetik: 90, sort: 'durasi' });
  assert.ok(id);
  const d = P.semuaPintar()[0];
  const tracks = [
    { id: 'a', nama: 'A', artis: 'Jazz Trio', favorit: true, durasi: 120, ditambahkan: 100 },
    { id: 'b', nama: 'B', artis: 'Jazz', favorit: false, durasi: 200, ditambahkan: 100 },
    { id: 'c', nama: 'C', artis: 'Rock', favorit: true, durasi: 200, ditambahkan: 100 },
  ];
  assert.deepEqual(P.laguPintar(d, tracks, 500).map(x => x.id), ['a']);
  assert.match(P.teksAturan(d.aturan), /hanya favorit/);
  assert.match(P.teksAturan(d.aturan), /artis memuat/);
  P.hapusPintar(id);
  assert.equal(P.semuaPintar().length, 0);
});
uji('history can be disabled, resumed, summarized and cleared locally', () => {
  R.hapusRiwayat();
  R.catatPutar('a', 1000);
  R.catatPutar('a', 2000); // deduplicated consecutive play
  R.catatPutar('b', 3000);
  assert.equal(R.statistikRiwayat().total, 2);
  assert.equal(R.statistikRiwayat().lagu, 2);
  R.aturRiwayatAktif(false);
  R.catatPutar('c', 5000);
  assert.equal(R.ambilRiwayat().length, 2);
  R.aturRiwayatAktif(true);
  R.catatPutar('c', 6000);
  assert.equal(R.ambilRiwayat()[0].id, 'c');
  R.hapusRiwayat();
  assert.equal(R.statistikRiwayat().total, 0);
});
console.log(`musik-peningkatan: ${n} uji lulus`);
