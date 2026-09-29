/**
 * Binary-safe ZIP Generator — Hara Renamer
 *
 * Menghasilkan berkas .zip murni di browser tanpa dependensi eksternal.
 * Mendukung berkas teks maupun biner (gambar, audio, dokumen) dengan metode STORE.
 */

// Tabel CRC32
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[i] = c;
}

export function calcCrc32(uint8Array) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < uint8Array.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ uint8Array[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

const encoder = new TextEncoder();

/**
 * Membuat Blob berkas ZIP dari daftar entri berkas.
 * @param {Array<{ name: string, data: Uint8Array | ArrayBuffer | Blob | string }>} entries
 * @returns {Promise<Blob>}
 */
export async function createZipBlob(entries = []) {
  const normalizedEntries = [];

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    let dataBytes;

    if (entry.data instanceof Uint8Array) {
      dataBytes = entry.data;
    } else if (entry.data instanceof ArrayBuffer) {
      dataBytes = new Uint8Array(entry.data);
    } else if (entry.data instanceof Blob) {
      const buffer = await entry.data.arrayBuffer();
      dataBytes = new Uint8Array(buffer);
    } else if (typeof entry.data === 'string') {
      dataBytes = encoder.encode(entry.data);
    } else {
      dataBytes = new Uint8Array(0);
    }

    const crc = calcCrc32(dataBytes);
    normalizedEntries.push({
      nameBytes,
      dataBytes,
      crc,
      size: dataBytes.length,
    });
  }

  // Hitung total ukuran buffer
  let localHeadersSize = 0;
  let centralDirSize = 0;

  for (const item of normalizedEntries) {
    localHeadersSize += 30 + item.nameBytes.length + item.size;
    centralDirSize += 46 + item.nameBytes.length;
  }

  const totalSize = localHeadersSize + centralDirSize + 22; // 22 bytes EOCD
  const buffer = new Uint8Array(totalSize);
  const view = new DataView(buffer.buffer);

  let offset = 0;
  const centralDirEntries = [];

  // Tulis Local File Headers & Data
  for (const item of normalizedEntries) {
    const localHeaderOffset = offset;
    centralDirEntries.push({ item, localHeaderOffset });

    // Local file header signature (0x04034b50)
    view.setUint32(offset, 0x04034B50, true); offset += 4;
    view.setUint16(offset, 20, true); offset += 2; // version needed
    view.setUint16(offset, 0x0800, true); offset += 2; // general purpose flag (UTF-8)
    view.setUint16(offset, 0, true); offset += 2; // compression method (STORE)
    view.setUint16(offset, 0, true); offset += 2; // last mod time
    view.setUint16(offset, 0, true); offset += 2; // last mod date
    view.setUint32(offset, item.crc, true); offset += 4; // crc-32
    view.setUint32(offset, item.size, true); offset += 4; // compressed size
    view.setUint32(offset, item.size, true); offset += 4; // uncompressed size
    view.setUint16(offset, item.nameBytes.length, true); offset += 2; // file name length
    view.setUint16(offset, 0, true); offset += 2; // extra field length

    // File name
    buffer.set(item.nameBytes, offset); offset += item.nameBytes.length;

    // File data
    buffer.set(item.dataBytes, offset); offset += item.size;
  }

  // Tulis Central Directory
  const centralDirStartOffset = offset;
  for (const { item, localHeaderOffset } of centralDirEntries) {
    // Central file header signature (0x02014b50)
    view.setUint32(offset, 0x02014B50, true); offset += 4;
    view.setUint16(offset, 20, true); offset += 2; // version made by
    view.setUint16(offset, 20, true); offset += 2; // version needed
    view.setUint16(offset, 0x0800, true); offset += 2; // general purpose flag (UTF-8)
    view.setUint16(offset, 0, true); offset += 2; // compression method (STORE)
    view.setUint16(offset, 0, true); offset += 2; // last mod time
    view.setUint16(offset, 0, true); offset += 2; // last mod date
    view.setUint32(offset, item.crc, true); offset += 4; // crc-32
    view.setUint32(offset, item.size, true); offset += 4; // compressed size
    view.setUint32(offset, item.size, true); offset += 4; // uncompressed size
    view.setUint16(offset, item.nameBytes.length, true); offset += 2; // file name length
    view.setUint16(offset, 0, true); offset += 2; // extra field length
    view.setUint16(offset, 0, true); offset += 2; // comment length
    view.setUint16(offset, 0, true); offset += 2; // disk number start
    view.setUint16(offset, 0, true); offset += 2; // internal file attributes
    view.setUint32(offset, 0, true); offset += 4; // external file attributes
    view.setUint32(offset, localHeaderOffset, true); offset += 4; // relative offset of local header

    // File name
    buffer.set(item.nameBytes, offset); offset += item.nameBytes.length;
  }

  const centralDirLength = offset - centralDirStartOffset;

  // Tulis End of Central Directory Record (EOCD) (0x06054b50)
  view.setUint32(offset, 0x06054B50, true); offset += 4;
  view.setUint16(offset, 0, true); offset += 2; // number of this disk
  view.setUint16(offset, 0, true); offset += 2; // disk where central dir starts
  view.setUint16(offset, normalizedEntries.length, true); offset += 2; // entries on this disk
  view.setUint16(offset, normalizedEntries.length, true); offset += 2; // total entries
  view.setUint32(offset, centralDirLength, true); offset += 4; // size of central directory
  view.setUint32(offset, centralDirStartOffset, true); offset += 4; // offset of start of central directory
  view.setUint16(offset, 0, true); offset += 2; // comment length

  return new Blob([buffer], { type: 'application/zip' });
}
