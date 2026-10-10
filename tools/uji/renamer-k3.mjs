/* Uji Ronde 11 · K3 — token metadata foto & audio di renamer.
   Membangun JPEG sintetis dengan blok EXIF (IFD0 + Exif SubIFD) byte demi byte,
   lalu memeriksa parseExif dan parseTokens. Tanpa DOM.
   Jalankan:  node tools/uji/renamer-k3.mjs */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const V = fs.readFileSync('docs/app.js', 'utf8').match(/\?v=(\d+)/)[1];
const { parseExif } = await import(`${process.cwd()}/docs/renamer/exif.js?v=${V}`);
const { parseTokens } = await import(`${process.cwd()}/docs/renamer/engine.js?v=${V}`);

let gagal = 0, total = 0;
const oke = (nama, ok, det = '') => {
  total++;
  if (!ok) { gagal++; console.log('FAIL', nama, det ? '\n      ' + det : ''); }
  else console.log('ok  ', nama);
};

/* ── pembangun EXIF (little-endian "II") ── */
function bangunJpeg() {
  const tiff = new Uint8Array(256);
  const dv = new DataView(tiff.buffer);
  const tulis = (s, pos) => { for (let i = 0; i < s.length; i++) tiff[pos + i] = s.charCodeAt(i); };
  // header TIFF
  tiff[0] = 0x49; tiff[1] = 0x49;             // "II"
  dv.setUint16(2, 0x002A, true);
  dv.setUint32(4, 8, true);                   // IFD0 @ 8
  // IFD0 @ 8: 4 entri
  const ifd0 = 8, sub = 64;
  const entri = (pos, tag, type, count, nilai) => {
    dv.setUint16(pos, tag, true); dv.setUint16(pos + 2, type, true);
    dv.setUint32(pos + 4, count, true); dv.setUint32(pos + 8, nilai, true);
  };
  dv.setUint16(ifd0, 4, true);
  entri(ifd0 + 2 + 0 * 12, 0x010F, 2, 6, 160);   // Make  → "Canon\0" @160
  entri(ifd0 + 2 + 1 * 12, 0x0110, 2, 4, 0);     // Model → "EOS\0" inline
  tulis('EOS\0', ifd0 + 2 + 1 * 12 + 8);
  entri(ifd0 + 2 + 2 * 12, 0x0132, 2, 20, 168);  // DateTime @168
  entri(ifd0 + 2 + 3 * 12, 0x8769, 4, 1, sub);   // pointer ke Exif SubIFD
  // Exif SubIFD @ 64: 7 entri
  dv.setUint16(sub, 7, true);
  entri(sub + 2 + 0 * 12, 0x8827, 3, 1, 0);      // ISO (SHORT inline)
  dv.setUint16(sub + 2 + 0 * 12 + 8, 400, true);
  entri(sub + 2 + 1 * 12, 0x829D, 5, 1, 208);    // FNumber → 208
  entri(sub + 2 + 2 * 12, 0x829A, 5, 1, 216);    // ExposureTime → 216
  entri(sub + 2 + 3 * 12, 0x920A, 5, 1, 224);    // FocalLength → 224
  entri(sub + 2 + 4 * 12, 0xA002, 4, 1, 4032);   // PixelXDimension (LONG inline)
  entri(sub + 2 + 5 * 12, 0xA003, 4, 1, 3024);   // PixelYDimension
  entri(sub + 2 + 6 * 12, 0x9003, 2, 20, 188);   // DateTimeOriginal @188
  // data
  tulis('Canon\0', 160);
  tulis('2024:05:01 10:30:05\0', 168);
  tulis('2024:05:01 10:30:05\0', 188);
  dv.setUint32(208, 28, true); dv.setUint32(212, 10, true);   // 2.8
  dv.setUint32(216, 1, true); dv.setUint32(220, 250, true);   // 1/250
  dv.setUint32(224, 50, true); dv.setUint32(228, 1, true);    // 50 mm
  const panjang = 12 + 232;
  const jpg = new Uint8Array(2 + 2 + 2 + 6 + 232);
  const jv = new DataView(jpg.buffer);
  jv.setUint16(0, 0xFFD8);                       // SOI
  jv.setUint16(2, 0xFFE1);                       // APP1
  jv.setUint16(4, 6 + 232 + 2);                  // panjang segmen (BE)
  jpg.set([0x45, 0x78, 0x69, 0x66, 0, 0], 6);    // "Exif\0\0"
  jpg.set(tiff.subarray(0, 232), 12);
  return { jpg: jpg.buffer, panjang };
}

const { jpg } = bangunJpeg();
const ex = parseExif(jpg);

oke('EXIF: merek kamera', ex.make === 'Canon', `dapat ${ex.make}`);
oke('EXIF: model kamera', ex.model === 'EOS', `dapat ${ex.model}`);
oke('EXIF: tanggal asli', ex.date instanceof Date && ex.date.getFullYear() === 2024 && ex.date.getMonth() === 4);
oke('EXIF K3: ISO 400', ex.iso === 400, `dapat ${ex.iso}`);
oke('EXIF K3: bukaan f/2.8', ex.fnumber !== null && Math.abs(ex.fnumber - 2.8) < 0.001, `dapat ${ex.fnumber}`);
oke('EXIF K3: rana 1/250 s', ex.exposure !== null && Math.abs(ex.exposure - 0.004) < 1e-9, `dapat ${ex.exposure}`);
oke('EXIF K3: fokus 50 mm', ex.focal === 50, `dapat ${ex.focal}`);
oke('EXIF K3: dimensi 4032×3024', ex.width === 4032 && ex.height === 3024, `dapat ${ex.width}x${ex.height}`);

const meta = { exif: ex, id3: { genre: 'Rock Pop' } };
const nama = (pola, m = meta) => parseTokens(pola, { name: 'foto', ext: 'jpg', index: 0, count: 1, lastModified: 0, meta: m });

oke('token {camera} tetap bekerja', nama('{camera}') === 'Canon_EOS', nama('{camera}'));
oke('token {iso}', nama('{iso}') === '400');
oke('token {aperture}', nama('{aperture}') === 'f2.8', nama('{aperture}'));
oke('token {shutter} → 1-250s', nama('{shutter}') === '1-250s', nama('{shutter}'));
oke('token {focal}', nama('{focal}') === '50mm', nama('{focal}'));
oke('token {res} & {width}×{height}', nama('{res}') === '4032x3024' && nama('{width}x{height}') === '4032x3024');
oke('token {genre} (spasi → _)', nama('{genre}') === 'Rock_Pop', nama('{genre}'));
oke('gabungan pola ramah berkas',
  nama('{camera}_{iso}_{aperture}_{shutter}_{focal}') === 'Canon_EOS_400_f2.8_1-250s_50mm',
  nama('{camera}_{iso}_{aperture}_{shutter}_{focal}'));

/* tanpa data → 'unknown', tidak pernah kosong atau 'undefined' */
const kosong = nama('{iso}|{aperture}|{shutter}|{focal}|{res}|{genre}', {});
oke('tanpa EXIF/ID3 → unknown (bukan kosong/undefined)',
  kosong === 'unknown|unknown|unknown|unknown|unknown|unknown', kosong);

/* berkas non-JPEG / rusak → parseExif tidak melempar, field null */
const rusak = parseExif(new Uint8Array([1, 2, 3, 4]).buffer);
oke('berkas bukan JPEG: field baru null, tak melempar',
  rusak.iso === null && rusak.fnumber === null && rusak.width === null);

/* rana ≥ 1 detik ditulis sebagai detik, bukan pecahan */
const longExp = nama('{shutter}', { exif: { exposure: 2.5 } });
oke('rana 2.5 s → 2.5s', longExp === '2.5s', longExp);

console.log(`\ntotal: ${total} · gagal: ${gagal}`);
process.exit(gagal ? 1 : 0);
