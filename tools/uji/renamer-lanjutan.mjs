/* Uji Ronde 12 · K21–K25 & K27 & K29 (renamer lanjutan) — murni, tanpa DOM.
   - K27 normalisasi Unicode / hapus diakritik;
   - K23 kondisi when + grup (enabled, when grup);
   - K24 penjelas regex & pustaka pola valid;
   - K21 belajar dari contoh (flash fill) menemukan pola token & awalan;
   - K25 resep JSON round-trip & validasi;
   - K22 SHA-256 (WebCrypto), dHash, jarak Hamming, pengelompokan duplikat;
   - K29 jalur sinkron jalankanPipeline (worker dipakai ≥ BATAS_WORKER).
   Jalankan: node tools/uji/renamer-lanjutan.mjs */
import path from 'path';
import { fileURLToPath } from 'url';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const V = '20261010050549';
const R = p => import(`${process.cwd()}/docs/renamer/${p}?v=${V}`);
const model = await R('model.js');
const engine = await R('engine.js');
const L = await R('lanjutan.js');
const P = await R('pekerja.js');
const { RULE_TYPES, RULE_METADATA } = model;

let no = 0, gagal = 0;
const cek = (nama, kondisi, detail = '') => {
  no++;
  if (kondisi) console.log(`  ✓ ${nama}`);
  else { gagal++; console.log(`  ✗ ${nama} ${detail}`); }
};
const eq = (nama, a, b) => cek(nama, JSON.stringify(a) === JSON.stringify(b), `(dapat ${JSON.stringify(a)}, harap ${JSON.stringify(b)})`);

const file = (name, extra = {}) => {
  const { baseName, ext } = model.parseFileName(name);
  return { id: name, baseName, ext, path: name, size: 100, lastModified: 0, meta: {}, ...extra };
};
const aturan = (type, params, extra = {}) => ({ id: type + Math.random(), type, enabled: true, params, ...extra });

console.log('K27 · normalisasi Unicode');
const nfd = 'Cafe\u0301_N\u0303andu\u0301';           // "Café_Ñandú" dalam NFD
eq('NFC menggabungkan kombinasi', engine.applyRule({ baseName: nfd, ext: '.txt' }, aturan(RULE_TYPES.NORMALIZE, { form: 'nfc' }), 0, 1).baseName, 'Café_Ñandú');
eq('strip menghapus diakritik', engine.applyRule({ baseName: 'Café_Ñandú', ext: '.txt' }, aturan(RULE_TYPES.NORMALIZE, { form: 'strip' }), 0, 1).baseName, 'Cafe_Nandu');
eq('NFKC mengubah lebar penuh', engine.applyRule({ baseName: 'ＡＢＣ１', ext: '' }, aturan(RULE_TYPES.NORMALIZE, { form: 'nfkc' }), 0, 1).baseName, 'ABC1');
cek('NORMALIZE terdaftar di RULE_METADATA', !!RULE_METADATA[RULE_TYPES.NORMALIZE]);

console.log('K23 · kondisi & grup');
const ctx = { name: 'foto.JPG', ext: '.JPG', size: 2000, mtime: 5 };
cek('ext equals tanpa titik & case-insensitive', L.cocokKondisi({ field: 'ext', op: 'equals', value: 'jpg' }, ctx));
cek('size gt', L.cocokKondisi({ field: 'size', op: 'gt', value: 1000 }, ctx));
cek('size lt gagal bila tidak', !L.cocokKondisi({ field: 'size', op: 'lt', value: 1000 }, ctx));
cek('regex tidak valid → false', !L.cocokKondisi({ field: 'name', op: 'regex', value: '(' }, ctx));
cek('mode any: satu cocok', L.cocokWhen({ mode: 'any', conds: [{ field: 'ext', op: 'equals', value: 'png' }, { field: 'name', op: 'starts', value: 'foto' }] }, ctx));
cek('mode all: salah satu gagal', !L.cocokWhen({ mode: 'all', conds: [{ field: 'ext', op: 'equals', value: 'jpg' }, { field: 'size', op: 'lt', value: 10 }] }, ctx));
{
  const items = [file('a.jpg'), file('b.png')];
  const r = engine.runPipeline(items, [aturan(RULE_TYPES.CASE, { target: 'base', format: 'upper' }, { when: { mode: 'all', conds: [{ field: 'ext', op: 'equals', value: 'jpg' }] } })]);
  eq('when: hanya jpg yang diubah', r.items.map(i => i.newName), ['A.jpg', 'b.png']);
  const r2 = engine.runPipeline(items, [aturan(RULE_TYPES.CASE, { target: 'base', format: 'upper' }, { group: 'g1' })], { groups: { g1: { enabled: false } } });
  eq('grup nonaktif: aturan dilewati', r2.items.map(i => i.newName), ['a.jpg', 'b.png']);
  const r3 = engine.runPipeline(items, [aturan(RULE_TYPES.CASE, { target: 'base', format: 'upper' }, { group: 'g1' })], { groups: { g1: { enabled: true, when: { mode: 'all', conds: [{ field: 'ext', op: 'equals', value: 'png' }] } } } });
  eq('grup dengan when: hanya berkas yang lolos', r3.items.map(i => i.newName), ['a.jpg', 'B.png']);
}

console.log('K24 · penjelas regex & pustaka');
const j = L.jelaskanRegex('(\\d{4})-(?:x|y)[a-z]+?$');
cek('regex valid dijelaskan', j.ok && j.bagian.length > 0);
cek('grup penangkap dikenali', j.bagian.some(b => b.token === '(' && /penangkap/.test(b.arti)));
cek('kuantifier {4} dijelaskan', j.bagian.some(b => b.token === '{4}' && /tepat 4/.test(b.arti)));
cek('lazy +? dijelaskan', j.bagian.some(b => b.token === '+?' && /sesedikit/.test(b.arti)));
cek('regex tak valid ditolak', !L.jelaskanRegex('a(').ok);
cek('pustaka: setiap pola valid', L.PUSTAKA_POLA.every(p => L.validasiRegex(p.pola).ok));
cek('pustaka: tanggal ISO menghasilkan pengganti benar', '2026-10-10'.replace(new RegExp(L.PUSTAKA_POLA[0].pola), L.PUSTAKA_POLA[0].ganti) === '10.10.2026');

console.log('K21 · belajar dari contoh (flash fill)');
{
  const hasil = L.belajarDariContoh([
    { indeks: 0, asal: 'IMG_0001.jpg', hasil: 'foto-01.jpg' },
    { indeks: 1, asal: 'IMG_0002.jpg', hasil: 'foto-02.jpg' },
  ]);
  cek('contoh nomor: ada kandidat', hasil.kandidat.length > 0);
  cek('kandidat pertama memakai TOKEN foto-{num}', hasil.kandidat.some(k => k.rule.type === RULE_TYPES.TOKEN && k.rule.params.pattern === 'foto-{num}' && k.rule.params.digits === 2));
  const awalan = L.belajarDariContoh([{ indeks: 0, asal: 'a.txt', hasil: 'x_a.txt' }, { indeks: 1, asal: 'b.txt', hasil: 'x_b.txt' }]);
  cek('contoh awalan: INSERT prefix "x_"', awalan.kandidat.some(k => k.rule.type === RULE_TYPES.INSERT && k.rule.params.text === 'x_' && k.rule.params.position === 'prefix'));
  const huruf = L.belajarDariContoh([{ indeks: 0, asal: 'LIBUR.jpg', hasil: 'libur.jpg' }]);
  cek('contoh huruf: CASE lower ditemukan', huruf.kandidat.some(k => k.rule.type === RULE_TYPES.CASE && k.rule.params.format === 'lower'));
  eq('contoh kosong → tanpa kandidat', L.belajarDariContoh([]).kandidat, []);
}

console.log('K25 · resep JSON');
{
  const rules = [aturan(RULE_TYPES.NORMALIZE, { form: 'strip' }), aturan(RULE_TYPES.CASE, { target: 'base', format: 'kebab' }, { when: { mode: 'any', conds: [{ field: 'ext', op: 'equals', value: 'jpg' }] } })];
  const teks = L.buatResep(rules, 'Uji');
  const bac = L.bacaResep(teks);
  cek('round-trip berhasil', bac.ok);
  eq('round-trip mempertahankan jenis & kondisi', bac.aturan.map(r => r.type), [RULE_TYPES.NORMALIZE, RULE_TYPES.CASE]);
  cek('kondisi when ikut tersimpan', bac.ok && bac.aturan[1].when && bac.aturan[1].when.conds[0].value === 'jpg');
  cek('JSON rusak ditolak', !L.bacaResep('{x').ok);
  cek('format asing ditolak', !L.bacaResep('{"format":"lain"}').ok);
  cek('jenis tak dikenal ditolak', !L.bacaResep(JSON.stringify({ format: 'hara-renamer-resep', versi: 1, aturan: [{ type: 'hapus-semua' }] })).ok);
}

console.log('K22 · deteksi duplikat');
{
  const sha = await L.hitungSha256(new TextEncoder().encode('abc').buffer);
  eq('SHA-256("abc") benar', sha, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  const naik = Array.from({ length: 72 }, (_, i) => i);
  const turun = Array.from({ length: 72 }, (_, i) => 1000 - i);
  eq('dHash gradien turun → semua 1', L.dHashDariPiksel(turun), 'f'.repeat(16));
  eq('dHash gradien naik → semua 0', L.dHashDariPiksel(naik), '0'.repeat(16));
  eq('jarak Hamming ff vs 00 = 8', L.jarakHamming('ff', '00'), 8);
  const g = L.kelompokDuplikat([
    { id: 'a', sha: 'X', dhash: '0000000000000000' },
    { id: 'b', sha: 'X', dhash: '0000000000000000' },
    { id: 'c', sha: 'Y', dhash: 'ffffffffffffff00' },   // jauh dari a/b (56 bit) dan d/e
    { id: 'd', sha: 'Z', dhash: 'ffffffffffffffff' },
    { id: 'e', sha: 'W', dhash: 'fffffffffffffffe' },   // mirip d (1 bit)
  ]);
  eq('persis: a+b dikelompokkan', g.find(x => x.jenis === 'persis').anggota, ['a', 'b']);
  eq('mirip: d+e (jarak 1) dikelompokkan', g.find(x => x.jenis === 'mirip').anggota, ['d', 'e']);
  eq('c tanpa pasangan tidak dikelompokkan', g.some(x => x.anggota.includes('c')), false);
}

console.log('K29 · pipeline batch');
{
  const items = Array.from({ length: 12 }, (_, i) => file(`IMG_${String(i).padStart(4, '0')}.jpg`));
  const hasil = await P.jalankanPipeline(items, [aturan(RULE_TYPES.TOKEN, { pattern: 'x-{num}', digits: 2, startNum: 1 })]);
  eq('jalur sinkron: 12 berkas diproses', hasil.items.length, 12);
  eq('jalur sinkron: nama pertama benar', hasil.items[0].newName, 'x-01.jpg');
  cek('BATAS_WORKER terdefinisi', P.BATAS_WORKER >= 100);
}

console.log(`\nHasil: ${no - gagal}/${no} lolos${gagal ? `, ${gagal} gagal` : ''}`);
process.exit(gagal ? 1 : 0);
