/* Uji cepat parser sampul (docs/musik/sampul.js) dengan berkas sintetis di memori.
   Mencakup ID3v2 (APIC), MP4 (covr), dan FLAC (PICTURE). Tanpa jsdom. */
import assert from 'node:assert/strict';
import { ambilSampul, tebakMime } from '../../docs/musik/sampul.js';

const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 0xff, 0xd9]);
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 9, 9]);

const cat = (...bagian) => {
  const total = bagian.reduce((s, b) => s + b.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const b of bagian) { out.set(b, o); o += b.length; }
  return out;
};
const str = s => Uint8Array.from([...s].map(c => c.charCodeAt(0)));
const u32be = n => Uint8Array.from([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);
const sinkron = n => Uint8Array.from([(n >> 21) & 127, (n >> 14) & 127, (n >> 7) & 127, n & 127]);
const pembaca = u => ({
  ukuran: u.length,
  baca: async (off, len) => u.slice(off, off + len),
});

/* ── ID3v2.3 ── */
function id3(frames) {
  const isi = cat(...frames);
  return cat(str('ID3'), Uint8Array.from([3, 0, 0]), sinkron(isi.length), isi, Uint8Array.from([0, 0, 0, 0]));
}
function frameApic(mime, jenis, gambar, enc = 0) {
  const isi = cat(Uint8Array.from([enc]), str(mime), Uint8Array.from([0, jenis]), Uint8Array.from([0]), gambar);
  return cat(str('APIC'), u32be(isi.length), Uint8Array.from([0, 0]), isi);
}
function frameTxt(id, teks) {
  const isi = cat(Uint8Array.from([0]), str(teks));
  return cat(str(id), u32be(isi.length), Uint8Array.from([0, 0]), isi);
}

/* ── MP4 ── */
const atom = (tipe, ...isi) => { const b = cat(...isi); return cat(u32be(b.length + 8), str(tipe), b); };
function mp4(gambar, tipeData = 13) {
  const data = atom('data', u32be(tipeData), u32be(0), gambar);
  const covr = atom('covr', data);
  const ilst = atom('ilst', covr);
  const meta = atom('meta', u32be(0), ilst);
  const udta = atom('udta', meta);
  const moov = atom('moov', atom('mvhd', new Uint8Array(100)), udta);
  return cat(atom('ftyp', str('M4A '), u32be(0)), atom('mdat', new Uint8Array(64)), moov);
}

/* ── FLAC ── */
function flac(gambar, mime = 'image/png', jenis = 3) {
  const pic = cat(u32be(jenis), u32be(mime.length), str(mime), u32be(0), u32be(0), u32be(0), u32be(0), u32be(0), u32be(gambar.length), gambar);
  const blokInfo = cat(Uint8Array.from([0x00, 0, 0, 34]), new Uint8Array(34));
  const hdrPic = cat(Uint8Array.from([0x80 | 6, (pic.length >> 16) & 255, (pic.length >> 8) & 255, pic.length & 255]), pic);
  return cat(str('fLaC'), blokInfo, hdrPic);
}

let lulus = 0;
const uji = async (nama, fn) => { await fn(); lulus++; };

await uji('tebak tipe gambar dari bytes', () => {
  assert.equal(tebakMime(JPEG), 'image/jpeg');
  assert.equal(tebakMime(PNG), 'image/png');
  assert.equal(tebakMime(str('GIF89a')), 'image/gif');
  assert.equal(tebakMime(str('RIFFxxxxWEBP')), 'image/webp');
  assert.equal(tebakMime(str('bukan gambar')), null);
});

await uji('MP3: ambil APIC sampul depan (ID3v2.3)', async () => {
  const berkas = cat(
    id3([frameTxt('TIT2', 'Judul'), frameApic('image/png', 0, PNG), frameApic('image/jpeg', 3, JPEG)]),
    new Uint8Array(200),
  );
  const s = await ambilSampul(pembaca(berkas));
  assert.ok(s, 'sampul harus ditemukan');
  assert.equal(s.mime, 'image/jpeg');
  assert.deepEqual([...s.data], [...JPEG]);
});

await uji('MP3: APIC dengan encoding UTF-16 dan deskripsi', async () => {
  const deskripsi = Uint8Array.from([0xff, 0xfe, 0x41, 0x00, 0x00, 0x00]); /* "A" + terminator UTF-16 */
  const isi = cat(Uint8Array.from([1]), str('image/jpeg'), Uint8Array.from([0, 3]), deskripsi, JPEG);
  const frame = cat(str('APIC'), u32be(isi.length), Uint8Array.from([0, 0]), isi);
  const s = await ambilSampul(pembaca(cat(id3([frame]), new Uint8Array(64))));
  assert.ok(s);
  assert.deepEqual([...s.data], [...JPEG]);
});

await uji('MP3: tanpa APIC → null', async () => {
  const s = await ambilSampul(pembaca(cat(id3([frameTxt('TIT2', 'x')]), new Uint8Array(64))));
  assert.equal(s, null);
});

await uji('MP3 ID3 kosong atau bukan audio → null', async () => {
  assert.equal(await ambilSampul(pembaca(str('bukan berkas audio sama sekali'))), null);
  assert.equal(await ambilSampul(pembaca(new Uint8Array(4))), null);
});

await uji('M4A: ambil covr', async () => {
  const s = await ambilSampul(pembaca(mp4(PNG, 14)));
  assert.ok(s);
  assert.equal(s.mime, 'image/png');
  assert.deepEqual([...s.data], [...PNG]);
});

await uji('M4A: covr JPEG', async () => {
  const s = await ambilSampul(pembaca(mp4(JPEG, 13)));
  assert.equal(s.mime, 'image/jpeg');
});

await uji('FLAC: ambil blok PICTURE', async () => {
  const s = await ambilSampul(pembaca(flac(PNG, 'image/png', 3)));
  assert.ok(s);
  assert.equal(s.mime, 'image/png');
  assert.deepEqual([...s.data], [...PNG]);
});

await uji('berkas rusak dan tipe tak didukung → null, tidak melempar', async () => {
  const rusak = cat(str('ID3'), Uint8Array.from([3, 0, 0]), sinkron(9999), new Uint8Array(10));
  assert.equal(await ambilSampul(pembaca(rusak)), null);
  assert.equal(await ambilSampul(pembaca(cat(str('OggS'), new Uint8Array(64)))), null);
  assert.equal(await ambilSampul(null), null);
});

console.log(`musik-sampul: ${lulus} uji lulus`);
