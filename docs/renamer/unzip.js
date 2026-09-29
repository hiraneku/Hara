/**
 * Parser & Ekstraktor ZIP Mandiri — Hara Renamer
 *
 * Mengekstrak seluruh isi berkas di dalam .zip (mendukung metode STORE & DEFLATE).
 * Berjalan murni di browser/Node tanpa dependensi pihak ketiga.
 */

const textDecoderUtf8 = new TextDecoder('utf-8');
const textDecoderLatin1 = new TextDecoder('iso-8859-1');

/**
 * Mendekompresi raw deflate chunk menggunakan DecompressionStream native browser.
 * @param {Uint8Array} compressedData
 * @returns {Promise<Uint8Array>}
 */
async function decompressDeflateRaw(compressedData) {
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
      // Fallback coba deflate standar jika deflate-raw gagal
      const ds2 = new DecompressionStream('deflate');
      const writer2 = ds2.writable.getWriter();
      writer2.write(compressedData);
      writer2.close();
      const response2 = new Response(ds2.readable);
      const buffer2 = await response2.arrayBuffer();
      return new Uint8Array(buffer2);
    }
  }
  return compressedData;
}

/**
 * Mengekstrak semua berkas dari dalam berkas ZIP (ArrayBuffer / Blob / Uint8Array).
 * @param {ArrayBuffer | Blob | Uint8Array} zipSource
 * @returns {Promise<Array<{ name: string, data: Uint8Array, size: number, lastModified: number }>>}
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

  let offset = 0;
  const length = buffer.byteLength;

  while (offset + 30 <= length) {
    const signature = view.getUint32(offset, true);

    // Local file header: 0x04034B50 (PK\x03\x04)
    if (signature === 0x04034B50) {
      const flags = view.getUint16(offset + 6, true);
      const compression = view.getUint16(offset + 8, true);
      const modTime = view.getUint16(offset + 10, true);
      const modDate = view.getUint16(offset + 12, true);
      let compressedSize = view.getUint32(offset + 18, true);
      let uncompressedSize = view.getUint32(offset + 22, true);
      const fileNameLen = view.getUint16(offset + 26, true);
      const extraLen = view.getUint16(offset + 28, true);

      const isUtf8 = (flags & 0x0800) !== 0;
      const nameBytes = uint8.subarray(offset + 30, offset + 30 + fileNameLen);
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

      const dataOffset = offset + 30 + fileNameLen + extraLen;

      // Lewati folder (nama berakhiran '/')
      if (!rawName.endsWith('/') && !rawName.endsWith('\\')) {
        const rawCompressedData = uint8.subarray(dataOffset, dataOffset + compressedSize);
        let fileData;

        if (compression === 0) {
          // Uncompressed (STORE)
          fileData = rawCompressedData;
        } else if (compression === 8) {
          // Deflate
          try {
            fileData = await decompressDeflateRaw(rawCompressedData);
          } catch (e) {
            fileData = rawCompressedData;
          }
        } else {
          fileData = rawCompressedData;
        }

        // Ambil nama berkas tanpa prefix folder berulang untuk display yang bersih
        const cleanName = rawName.split(/[/\\]/).pop();

        if (cleanName && !cleanName.startsWith('__MACOSX') && !cleanName.startsWith('._')) {
          files.push({
            name: cleanName,
            fullPath: rawName,
            data: fileData,
            size: fileData.byteLength || uncompressedSize,
            lastModified,
          });
        }
      }

      offset = dataOffset + compressedSize;
    } else {
      // Jika bukan signature local file header, cari header berikutnya atau hentikan (Central Directory)
      break;
    }
  }

  return files;
}
