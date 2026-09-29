/**
 * Parser & Ekstraktor ZIP Handal (Central Directory + Streaming) — Hara Renamer
 *
 * Membaca arsip ZIP dari Central Directory (EOCD).
 * Menangani zip yang memakai Data Descriptor (bit 3), WinRAR, 7-Zip, macOS Archive, dan Windows Explorer.
 * Mendukung kompresi STORE (0) dan DEFLATE (8) menggunakan native DecompressionStream.
 */

const textDecoderUtf8 = new TextDecoder('utf-8');
const textDecoderLatin1 = new TextDecoder('iso-8859-1');

/**
 * Mendekompresi raw deflate chunk menggunakan DecompressionStream native browser.
 * @param {Uint8Array} compressedData
 * @returns {Promise<Uint8Array>}
 */
async function decompressDeflateRaw(compressedData) {
  if (compressedData.length === 0) return new Uint8Array(0);
  if (typeof DecompressionStream !== 'undefined') {
    try {
      const ds = new DecompressionStream('deflate-raw');
      const writer = ds.writable.getWriter();
      writer.write(compressedData);
      writer.close();
      const response = new Response(ds.readable);
      const buffer = await response.arrayBuffer();
      return new Uint8Array(buffer);
    } catch (err) {
      try {
        const ds2 = new DecompressionStream('deflate');
        const writer2 = ds2.writable.getWriter();
        writer2.write(compressedData);
        writer2.close();
        const response2 = new Response(ds2.readable);
        const buffer2 = await response2.arrayBuffer();
        return new Uint8Array(buffer2);
      } catch (err2) {
        return compressedData;
      }
    }
  }
  return compressedData;
}

/**
 * Mencari End of Central Directory Record (EOCD: 0x06054B50) dari ujung berkas.
 * @param {Uint8Array} uint8
 * @param {DataView} view
 * @returns {number} Offset EOCD atau -1 jika tidak ditemukan
 */
function findEOCD(uint8, view) {
  const minOffset = Math.max(0, uint8.length - 65557); // 22 bytes min + 65535 max comment
  for (let i = uint8.length - 22; i >= minOffset; i--) {
    if (view.getUint32(i, true) === 0x06054B50) {
      return i;
    }
  }
  return -1;
}

/**
 * Mengekstrak seluruh berkas dari dalam ZIP secara handal.
 * @param {ArrayBuffer | Blob | Uint8Array} zipSource
 * @returns {Promise<Array<{ name: string, fullPath: string, data: Uint8Array, size: number, lastModified: number, ext: string, category: string }>>}
 */
export async function extractZip(zipSource) {
  let buffer;
  if (zipSource instanceof Blob) {
    buffer = await zipSource.arrayBuffer();
  } else if (zipSource instanceof ArrayBuffer) {
    buffer = zipSource;
  } else if (zipSource instanceof Uint8Array) {
    buffer = zipSource.buffer.slice(zipSource.byteOffset, zipSource.byteOffset + zipSource.byteLength);
  } else {
    throw new Error('Format sumber ZIP tidak valid');
  }

  const uint8 = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const files = [];

  const eocdOffset = findEOCD(uint8, view);

  // METODE 1: Membaca via Central Directory (Standar Industri, 100% akurat)
  if (eocdOffset !== -1) {
    const totalEntries = view.getUint16(eocdOffset + 10, true);
    const cdSize = view.getUint32(eocdOffset + 12, true);
    const cdOffset = view.getUint32(eocdOffset + 16, true);

    let offset = cdOffset;
    for (let i = 0; i < totalEntries && offset + 46 <= uint8.length; i++) {
      const signature = view.getUint32(offset, true);
      if (signature !== 0x02014B50) break;

      const flags = view.getUint16(offset + 8, true);
      const compression = view.getUint16(offset + 10, true);
      const modTime = view.getUint16(offset + 12, true);
      const modDate = view.getUint16(offset + 14, true);
      const compressedSize = view.getUint32(offset + 20, true);
      const uncompressedSize = view.getUint32(offset + 24, true);
      const fileNameLen = view.getUint16(offset + 28, true);
      const extraLen = view.getUint16(offset + 30, true);
      const commentLen = view.getUint16(offset + 32, true);
      const localHeaderOffset = view.getUint32(offset + 42, true);

      const isUtf8 = (flags & 0x0800) !== 0;
      const nameBytes = uint8.subarray(offset + 46, offset + 46 + fileNameLen);
      const decoder = isUtf8 ? textDecoderUtf8 : textDecoderLatin1;
      const rawName = decoder.decode(nameBytes);

      // Hitung tanggal dari MS-DOS date/time
      const year = ((modDate >> 9) & 0x7F) + 1980;
      const month = ((modDate >> 5) & 0x0F) - 1;
      const day = modDate & 0x1F;
      const hour = (modTime >> 11) & 0x1F;
      const minute = (modTime >> 5) & 0x3F;
      const second = (modTime & 0x1F) * 2;
      const lastModified = new Date(year, Math.max(0, month), Math.max(1, day), hour, minute, second).getTime() || Date.now();

      // Lewati folder (nama berakhiran '/')
      if (!rawName.endsWith('/') && !rawName.endsWith('\\')) {
        // Baca data dari Local File Header
        if (localHeaderOffset + 30 <= uint8.length) {
          const localFileNameLen = view.getUint16(localHeaderOffset + 26, true);
          const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
          const dataStart = localHeaderOffset + 30 + localFileNameLen + localExtraLen;
          const rawCompressedData = uint8.subarray(dataStart, dataStart + compressedSize);

          let fileData;
          if (compression === 0) {
            fileData = rawCompressedData;
          } else if (compression === 8) {
            fileData = await decompressDeflateRaw(rawCompressedData);
          } else {
            fileData = rawCompressedData;
          }

          const cleanName = rawName.split(/[/\\]/).pop();
          if (cleanName && !cleanName.startsWith('__MACOSX') && !cleanName.startsWith('._')) {
            const ext = (cleanName.includes('.') ? cleanName.split('.').pop() : '').toLowerCase();
            files.push({
              name: cleanName,
              fullPath: rawName,
              data: fileData,
              size: fileData.byteLength || uncompressedSize,
              lastModified,
              ext: ext ? `.${ext}` : '',
              category: getFileCategory(cleanName),
            });
          }
        }
      }

      offset += 46 + fileNameLen + extraLen + commentLen;
    }

    if (files.length > 0) return files;
  }

  // METODE 2: Fallback memindai Local File Headers dari awal
  let offset = 0;
  while (offset + 30 <= uint8.length) {
    const signature = view.getUint32(offset, true);
    if (signature !== 0x04034B50) break;

    const flags = view.getUint16(offset + 6, true);
    const compression = view.getUint16(offset + 8, true);
    const modTime = view.getUint16(offset + 10, true);
    const modDate = view.getUint16(offset + 12, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const uncompressedSize = view.getUint32(offset + 22, true);
    const fileNameLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);

    const isUtf8 = (flags & 0x0800) !== 0;
    const nameBytes = uint8.subarray(offset + 30, offset + 30 + fileNameLen);
    const decoder = isUtf8 ? textDecoderUtf8 : textDecoderLatin1;
    const rawName = decoder.decode(nameBytes);

    const year = ((modDate >> 9) & 0x7F) + 1980;
    const month = ((modDate >> 5) & 0x0F) - 1;
    const day = modDate & 0x1F;
    const hour = (modTime >> 11) & 0x1F;
    const minute = (modTime >> 5) & 0x3F;
    const second = (modTime & 0x1F) * 2;
    const lastModified = new Date(year, Math.max(0, month), Math.max(1, day), hour, minute, second).getTime() || Date.now();

    const dataOffset = offset + 30 + fileNameLen + extraLen;

    if (!rawName.endsWith('/') && !rawName.endsWith('\\') && compressedSize > 0) {
      const rawCompressedData = uint8.subarray(dataOffset, dataOffset + compressedSize);
      let fileData = rawCompressedData;
      if (compression === 8) {
        fileData = await decompressDeflateRaw(rawCompressedData);
      }

      const cleanName = rawName.split(/[/\\]/).pop();
      if (cleanName && !cleanName.startsWith('__MACOSX') && !cleanName.startsWith('._')) {
        const ext = (cleanName.includes('.') ? cleanName.split('.').pop() : '').toLowerCase();
        files.push({
          name: cleanName,
          fullPath: rawName,
          data: fileData,
          size: fileData.byteLength || uncompressedSize,
          lastModified,
          ext: ext ? `.${ext}` : '',
          category: getFileCategory(cleanName),
        });
      }
    }

    offset = dataOffset + compressedSize;
  }

  return files;
}

/**
 * Mengelompokkan berkas ke dalam kategori umum.
 * @param {string} fileName
 * @returns {string} 'images' | 'docs' | 'text' | 'audio' | 'video' | 'archive' | 'other'
 */
export function getFileCategory(fileName = '') {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'ico', 'heic', 'cr2', 'nef'].includes(ext)) {
    return 'images';
  }
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'].includes(ext)) {
    return 'docs';
  }
  if (['txt', 'md', 'json', 'csv', 'xml', 'html', 'css', 'js', 'mjs', 'ts', 'log', 'yaml', 'yml'].includes(ext)) {
    return 'text';
  }
  if (['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg', 'opus', 'wma'].includes(ext)) {
    return 'audio';
  }
  if (['mp4', 'mkv', 'mov', 'avi', 'webm', 'flv', 'wmv'].includes(ext)) {
    return 'video';
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return 'archive';
  }
  return 'other';
}

/**
 * Label kategori untuk tampilan UI.
 */
export const CATEGORY_LABELS = {
  all: 'Semua Berkas',
  images: 'Gambar / Foto',
  docs: 'Dokumen Kantor',
  text: 'Teks & Kode',
  audio: 'Audio / Musik',
  video: 'Video',
  archive: 'Arsip',
  other: 'Lainnya',
};
