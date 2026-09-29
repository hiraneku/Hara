/**
 * Suite Uji Otomatis: Fase 5 — Fitur Lanjutan (Pre-sorting, EXIF, Undo Inspector)
 */
import { sortFiles } from '../../docs/renamer/engine.js';
import { createRenamerItem } from '../../docs/renamer/model.js';
import { parseExif } from '../../docs/renamer/exif.js';

let total = 0;
let passed = 0;

function assert(condition, message) {
  total++;
  if (!condition) {
    console.error(`GAGAL: ${message}`);
    process.exit(1);
  }
  console.log(`LULUS T${total} ${message}`);
  passed++;
}

console.log('══ Uji Fitur Lanjutan (Fase 5) ══\n');

// 1. Uji Natural Sorting (Pre-sorting Nama)
const unsortedFiles = [
  createRenamerItem({ originalName: 'item10.jpg', size: 100, lastModified: 1000 }),
  createRenamerItem({ originalName: 'item1.jpg', size: 50, lastModified: 3000 }),
  createRenamerItem({ originalName: 'item2.jpg', size: 200, lastModified: 2000 }),
];

const sortedNameAsc = sortFiles(unsortedFiles, 'name-asc');
assert(sortedNameAsc[0].originalName === 'item1.jpg', 'Natural sort name-asc: item1 pertama');
assert(sortedNameAsc[1].originalName === 'item2.jpg', 'Natural sort name-asc: item2 kedua');
assert(sortedNameAsc[2].originalName === 'item10.jpg', 'Natural sort name-asc: item10 ketiga (bukan sebelum item2)');

const sortedNameDesc = sortFiles(unsortedFiles, 'name-desc');
assert(sortedNameDesc[0].originalName === 'item10.jpg', 'Sort name-desc: item10 pertama');

// 2. Uji Sort Tanggal & Ukuran
const sortedDateAsc = sortFiles(unsortedFiles, 'date-asc');
assert(sortedDateAsc[0].originalName === 'item10.jpg', 'Sort date-asc: timestamp terkecil pertama');

const sortedSizeDesc = sortFiles(unsortedFiles, 'size-desc');
assert(sortedSizeDesc[0].originalName === 'item2.jpg', 'Sort size-desc: ukuran 200 pertama');

// 3. Uji Parser EXIF pada Header JPEG Sintetis
function createSyntheticExifJpeg() {
  // SOI (2) + APP1 marker (2) + length (2) + Exif\0\0 (6) + TIFF Header (8) + IFD0 (2 + 12 + 4) + String (20)
  const buffer = new Uint8Array(256);
  const view = new DataView(buffer.buffer);

  // JPEG SOI
  view.setUint16(0, 0xFFD8);

  // APP1 Marker
  view.setUint16(2, 0xFFE1);
  view.setUint16(4, 120); // Length

  // Exif\0\0
  buffer[6] = 0x45; buffer[7] = 0x78; buffer[8] = 0x69; buffer[9] = 0x66; buffer[10] = 0x00; buffer[11] = 0x00;

  // TIFF Header (II / Little Endian)
  const tiffOffset = 12;
  view.setUint16(tiffOffset, 0x4949, true);
  view.setUint16(tiffOffset + 2, 0x002A, true);
  view.setUint32(tiffOffset + 4, 8, true); // IFD0 offset = 8 dari TIFF

  // IFD0: 1 entry (DateTime 0x0132)
  const ifd0 = tiffOffset + 8;
  view.setUint16(ifd0, 1, true); // 1 tag

  const tagOffset = ifd0 + 2;
  view.setUint16(tagOffset, 0x0132, true); // tag DateTime
  view.setUint16(tagOffset + 2, 2, true); // type ASCII
  view.setUint32(tagOffset + 4, 20, true); // count 20
  view.setUint32(tagOffset + 8, 30, true); // offset string dari TIFF

  // Tulis tanggal "2026:09:29 14:30:00\0"
  const dateStr = '2026:09:29 14:30:00';
  for (let i = 0; i < dateStr.length; i++) {
    buffer[tiffOffset + 30 + i] = dateStr.charCodeAt(i);
  }

  return buffer;
}

const syntheticJpeg = createSyntheticExifJpeg();
const exifData = parseExif(syntheticJpeg);
assert(exifData.dateTimeOriginal === '2026:09:29 14:30:00', 'parseExif mengekstrak DateTimeOriginal');
assert(exifData.date instanceof Date, 'parseExif mengonversi ke Date object');
assert(exifData.date.getFullYear() === 2026, 'Tahun EXIF = 2026');
assert(exifData.date.getMonth() === 8, 'Bulan EXIF = September (8)');
assert(exifData.date.getDate() === 29, 'Tanggal EXIF = 29');

console.log(`\nSemua ${passed}/${total} pengujian lanjutan Fase 5 berhasil!`);
