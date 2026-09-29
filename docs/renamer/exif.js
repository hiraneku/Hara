/**
 * Parser Metadata EXIF Kamera Mandiri — Hara Renamer
 *
 * Membaca header JPEG EXIF secara langsung (pure JavaScript, zero dependencies).
 * Mengekstrak tanggal asli pengambilan foto (DateTimeOriginal) dan model kamera.
 */

/**
 * Membaca metadata EXIF dari ArrayBuffer atau Uint8Array berkas JPEG.
 * @param {ArrayBuffer | Uint8Array} buffer
 * @returns {Object} { dateTimeOriginal: string, date: Date | null, make: string, model: string }
 */
export function parseExif(buffer) {
  const result = {
    dateTimeOriginal: null,
    date: null,
    make: null,
    model: null,
  };

  try {
    const dataView = buffer instanceof DataView
      ? buffer
      : new DataView(buffer instanceof ArrayBuffer ? buffer : buffer.buffer, buffer.byteOffset, buffer.byteLength);

    // Cek JPEG SOI (Start of Image) marker: 0xFFD8
    if (dataView.getUint16(0) !== 0xFFD8) {
      return result;
    }

    let offset = 2;
    const length = dataView.byteLength;

    // Telusuri marker JPEG hingga menemukan APP1 (0xFFE1)
    while (offset < length - 4) {
      const marker = dataView.getUint16(offset);
      offset += 2;

      // Jika menemukan SOS (Start of Scan) marker 0xFFDA, hentikan pencarian header
      if (marker === 0xFFDA) break;

      const sectionLength = dataView.getUint16(offset);

      // APP1 marker (Exif)
      if (marker === 0xFFE1) {
        // Cek header "Exif\0\0" (0x45786966 0x0000)
        if (dataView.getUint32(offset + 2) === 0x45786966 && dataView.getUint16(offset + 6) === 0x0000) {
          const tiffOffset = offset + 8;
          const isLittleEndian = dataView.getUint16(tiffOffset) === 0x4949; // "II" = Little Endian, "MM" = Big Endian

          // Cek magic number TIFF (0x002A)
          if (dataView.getUint16(tiffOffset + 2, isLittleEndian) === 0x002A) {
            const ifd0Offset = dataView.getUint32(tiffOffset + 4, isLittleEndian);
            readIFD(dataView, tiffOffset, tiffOffset + ifd0Offset, isLittleEndian, result);
          }
        }
        break;
      }

      offset += sectionLength;
    }
  } catch (e) {
    // Abaikan jika berkas korup atau EXIF tidak lengkap
  }

  return result;
}

function readIFD(dataView, tiffStart, ifdOffset, isLittleEndian, result) {
  if (ifdOffset + 2 > dataView.byteLength) return;
  const numEntries = dataView.getUint16(ifdOffset, isLittleEndian);
  let exifSubIFDOffset = null;

  for (let i = 0; i < numEntries; i++) {
    const entryOffset = ifdOffset + 2 + i * 12;
    if (entryOffset + 12 > dataView.byteLength) break;

    const tag = dataView.getUint16(entryOffset, isLittleEndian);
    const type = dataView.getUint16(entryOffset + 2, isLittleEndian);
    const numValues = dataView.getUint32(entryOffset + 4, isLittleEndian);
    const valueOffset = entryOffset + 8;

    // 0x010F: Camera Make
    if (tag === 0x010F) {
      result.make = readString(dataView, tiffStart, valueOffset, numValues, isLittleEndian);
    }
    // 0x0110: Camera Model
    else if (tag === 0x0110) {
      result.model = readString(dataView, tiffStart, valueOffset, numValues, isLittleEndian);
    }
    // 0x0132: DateTime
    else if (tag === 0x0132 && !result.dateTimeOriginal) {
      result.dateTimeOriginal = readString(dataView, tiffStart, valueOffset, numValues, isLittleEndian);
    }
    // 0x8769: Exif SubIFD Pointer
    else if (tag === 0x8769) {
      exifSubIFDOffset = dataView.getUint32(valueOffset, isLittleEndian);
    }
  }

  // Baca Exif SubIFD jika ada
  if (exifSubIFDOffset) {
    const subOffset = tiffStart + exifSubIFDOffset;
    if (subOffset + 2 <= dataView.byteLength) {
      const subEntries = dataView.getUint16(subOffset, isLittleEndian);
      for (let j = 0; j < subEntries; j++) {
        const entryOffset = subOffset + 2 + j * 12;
        if (entryOffset + 12 > dataView.byteLength) break;

        const tag = dataView.getUint16(entryOffset, isLittleEndian);
        const numValues = dataView.getUint32(entryOffset + 4, isLittleEndian);
        const valueOffset = entryOffset + 8;

        // 0x9003: DateTimeOriginal
        if (tag === 0x9003) {
          result.dateTimeOriginal = readString(dataView, tiffStart, valueOffset, numValues, isLittleEndian);
        }
      }
    }
  }

  // Parse string tanggal EXIF (format "YYYY:MM:DD HH:MM:SS") ke Date object
  if (result.dateTimeOriginal) {
    const parts = result.dateTimeOriginal.match(/(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
    if (parts) {
      const [, y, m, d, hh, mm, ss] = parts;
      result.date = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss));
    }
  }
}

function readString(dataView, tiffStart, valueOffset, numValues, isLittleEndian) {
  let strOffset = valueOffset;
  if (numValues > 4) {
    const offsetInTIFF = dataView.getUint32(valueOffset, isLittleEndian);
    strOffset = tiffStart + offsetInTIFF;
  }
  let str = '';
  for (let i = 0; i < numValues; i++) {
    if (strOffset + i >= dataView.byteLength) break;
    const code = dataView.getUint8(strOffset + i);
    if (code === 0) break; // null terminator
    str += String.fromCharCode(code);
  }
  return str.trim();
}
