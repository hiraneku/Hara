/**
 * Parser Metadata Audio ID3 (MP3/FLAC/M4A) Mandiri — Hara Renamer
 *
 * Membaca tag ID3v2 & ID3v1 dari berkas audio secara murni (zero dependencies).
 * Mengekstrak Artist, Title, Album, Track, Year, dan Genre.
 */

const textDecoderUtf8 = new TextDecoder('utf-8');
const textDecoderLatin1 = new TextDecoder('iso-8859-1');
const textDecoderUtf16 = new TextDecoder('utf-16');

function decodeFrameText(bytes, encodingByte) {
  if (bytes.length <= 1) return '';
  const textBytes = bytes.subarray(1); // Lewati byte encoding

  try {
    switch (encodingByte) {
      case 0: // ISO-8859-1
        return textDecoderLatin1.decode(textBytes).replace(/\0+$/, '').trim();
      case 1: // UTF-16 with BOM
      case 2: // UTF-16BE
        return textDecoderUtf16.decode(textBytes).replace(/\0+$/, '').trim();
      case 3: // UTF-8
        return textDecoderUtf8.decode(textBytes).replace(/\0+$/, '').trim();
      default:
        return textDecoderLatin1.decode(textBytes).replace(/\0+$/, '').trim();
    }
  } catch (e) {
    return textDecoderLatin1.decode(textBytes).replace(/\0+$/, '').trim();
  }
}

/**
 * Membaca metadata ID3 dari ArrayBuffer / Uint8Array berkas audio.
 * @param {ArrayBuffer | Uint8Array} buffer
 * @returns {Object} { artist: string, title: string, album: string, track: string, year: string, genre: string }
 */
export function parseId3(buffer) {
  const result = {
    artist: null,
    title: null,
    album: null,
    track: null,
    year: null,
    genre: null,
  };

  if (!buffer) return result;

  const uint8 = buffer instanceof Uint8Array
    ? buffer
    : new Uint8Array(buffer instanceof ArrayBuffer ? buffer : buffer.buffer, buffer.byteOffset, buffer.byteLength);

  if (uint8.length < 10) return result;

  const view = new DataView(uint8.buffer, uint8.byteOffset, uint8.byteLength);

  // 1. Cek Header ID3v2 ("ID3" = 0x49, 0x44, 0x33)
  if (uint8[0] === 0x49 && uint8[1] === 0x44 && uint8[2] === 0x33) {
    const majorVersion = uint8[3]; // 3 = ID3v2.3, 4 = ID3v2.4
    const flags = uint8[5];

    // Synchsafe integer size (7 bits per byte)
    const tagSize = ((uint8[6] & 0x7F) << 21) |
                    ((uint8[7] & 0x7F) << 14) |
                    ((uint8[8] & 0x7F) << 7) |
                    (uint8[9] & 0x7F);

    let offset = 10;
    const endOffset = Math.min(uint8.length, 10 + tagSize);

    // Iterasi frame-frame ID3v2
    while (offset + 10 <= endOffset) {
      // Jika menemukan padding null byte, hentikan
      if (uint8[offset] === 0) break;

      const frameId = String.fromCharCode(uint8[offset], uint8[offset + 1], uint8[offset + 2], uint8[offset + 3]);
      let frameSize;

      if (majorVersion === 4) {
        // ID3v2.4 menggunakan synchsafe integer untuk frame size
        frameSize = ((uint8[offset + 4] & 0x7F) << 21) |
                    ((uint8[offset + 5] & 0x7F) << 14) |
                    ((uint8[offset + 6] & 0x7F) << 7) |
                    (uint8[offset + 7] & 0x7F);
      } else {
        // ID3v2.3 dan ID3v2.2 menggunakan normal integer
        frameSize = view.getUint32(offset + 4, false);
      }

      if (frameSize <= 0 || offset + 10 + frameSize > uint8.length) break;

      const encodingByte = uint8[offset + 10];
      const frameData = uint8.subarray(offset + 10, offset + 10 + frameSize);

      switch (frameId) {
        case 'TIT2': // Title
        case 'TT2':
          result.title = decodeFrameText(frameData, encodingByte);
          break;
        case 'TPE1': // Artist
        case 'TP1':
          result.artist = decodeFrameText(frameData, encodingByte);
          break;
        case 'TALB': // Album
        case 'TAL':
          result.album = decodeFrameText(frameData, encodingByte);
          break;
        case 'TRCK': // Track Number
        case 'TRK': {
          const rawTrack = decodeFrameText(frameData, encodingByte);
          result.track = rawTrack.split('/')[0].trim(); // Ambil angka depan jika format 1/12
          break;
        }
        case 'TYER': // Year (ID3v2.3)
        case 'TDRC': // Recording Date (ID3v2.4)
          result.year = decodeFrameText(frameData, encodingByte).slice(0, 4);
          break;
        case 'TCON': // Genre
          result.genre = decodeFrameText(frameData, encodingByte);
          break;
      }

      offset += 10 + frameSize;
    }

    if (result.title || result.artist) {
      return result;
    }
  }

  // 2. Fallback: Cek ID3v1 di 128 byte terakhir berkas
  if (uint8.length >= 128) {
    const v1Offset = uint8.length - 128;
    if (uint8[v1Offset] === 0x54 && uint8[v1Offset + 1] === 0x41 && uint8[v1Offset + 2] === 0x47) { // "TAG"
      if (!result.title) {
        result.title = textDecoderLatin1.decode(uint8.subarray(v1Offset + 3, v1Offset + 33)).replace(/\0+$/, '').trim();
      }
      if (!result.artist) {
        result.artist = textDecoderLatin1.decode(uint8.subarray(v1Offset + 33, v1Offset + 63)).replace(/\0+$/, '').trim();
      }
      if (!result.album) {
        result.album = textDecoderLatin1.decode(uint8.subarray(v1Offset + 63, v1Offset + 93)).replace(/\0+$/, '').trim();
      }
      if (!result.year) {
        result.year = textDecoderLatin1.decode(uint8.subarray(v1Offset + 93, v1Offset + 97)).replace(/\0+$/, '').trim();
      }
      // ID3v1.1 Track number
      if (uint8[v1Offset + 125] === 0 && uint8[v1Offset + 126] !== 0) {
        result.track = String(uint8[v1Offset + 126]);
      }
    }
  }

  return result;
}
