/**
 * Suite Uji: ID3v2 & ID3v1 Audio Metadata Parser
 */
import { parseId3 } from '../../docs/renamer/id3.js';

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

console.log('══ Uji Parser Metadata Audio ID3 (MP3) ══\n');

// 1. Buat data biner sintetis ID3v2.3
function createSyntheticId3v2Mp3() {
  const buffer = new Uint8Array(256);
  const view = new DataView(buffer.buffer);

  // Header "ID3" + version 3.0 + flags 0
  buffer[0] = 0x49; buffer[1] = 0x44; buffer[2] = 0x33;
  buffer[3] = 0x03; buffer[4] = 0x00; buffer[5] = 0x00;

  // Tag size = 200 (synchsafe)
  buffer[6] = 0x00; buffer[7] = 0x00; buffer[8] = 0x01; buffer[9] = 0x48;

  let offset = 10;

  // Frame TIT2: "High School in Jakarta"
  const title = 'High School in Jakarta';
  buffer.set([0x54, 0x49, 0x54, 0x32], offset); // TIT2
  view.setUint32(offset + 4, title.length + 1, false); // size
  view.setUint16(offset + 8, 0, false); // flags
  buffer[offset + 10] = 0; // encoding = ISO-8859-1
  for (let i = 0; i < title.length; i++) buffer[offset + 11 + i] = title.charCodeAt(i);
  offset += 11 + title.length;

  // Frame TPE1: "NIKI"
  const artist = 'NIKI';
  buffer.set([0x54, 0x50, 0x45, 0x31], offset); // TPE1
  view.setUint32(offset + 4, artist.length + 1, false); // size
  view.setUint16(offset + 8, 0, false); // flags
  buffer[offset + 10] = 0; // encoding = ISO-8859-1
  for (let i = 0; i < artist.length; i++) buffer[offset + 11 + i] = artist.charCodeAt(i);
  offset += 11 + artist.length;

  // Frame TRCK: "01"
  const track = '01';
  buffer.set([0x54, 0x52, 0x43, 0x4B], offset); // TRCK
  view.setUint32(offset + 4, track.length + 1, false); // size
  view.setUint16(offset + 8, 0, false); // flags
  buffer[offset + 10] = 0; // encoding = ISO-8859-1
  for (let i = 0; i < track.length; i++) buffer[offset + 11 + i] = track.charCodeAt(i);

  return buffer;
}

const id3Buffer = createSyntheticId3v2Mp3();
const meta = parseId3(id3Buffer);

assert(meta.title === 'High School in Jakarta', 'parseId3 membaca judul TIT2: High School in Jakarta');
assert(meta.artist === 'NIKI', 'parseId3 membaca artis TPE1: NIKI');
assert(meta.track === '01', 'parseId3 membaca track TRCK: 01');

console.log(`\nSemua ${passed}/${total} pengujian ID3 Parser berhasil!`);
