/**
 * Suite Uji Otomatis: Fase 3 — Binary-safe ZIP Generator
 */
import { calcCrc32, createZipBlob } from '../../docs/renamer/zip.js';

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

console.log('══ Uji Generator ZIP Berkas Renamer (Fase 3) ══\n');

// 1. Uji CRC32
const testData = new TextEncoder().encode('123456789');
const crc = calcCrc32(testData);
assert(crc === 0xCBF43926, 'Kalkulasi CRC32 standar (0xCBF43926)');

// 2. Uji Pembuatan ZIP Blob
async function runZipTest() {
  const entries = [
    { name: 'foto_01.txt', data: 'Isi teks berkas 1' },
    { name: 'subfolder/foto_02.txt', data: 'Isi teks berkas 2' },
  ];
  const zipBlob = await createZipBlob(entries);
  assert(zipBlob instanceof Blob, 'createZipBlob menghasilkan instance Blob');
  assert(zipBlob.type === 'application/zip', 'Tipe mime application/zip');
  assert(zipBlob.size > 100, `Ukuran ZIP valid (${zipBlob.size} bytes)`);

  const buf = await zipBlob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  // Cek magic number ZIP (0x50, 0x4b, 0x03, 0x04)
  assert(bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04, 'ZIP header magic bytes (PK\\x03\\x04) terverifikasi');

  console.log(`\nSemua ${passed}/${total} pengujian ZIP Fase 3 berhasil!`);
}

runZipTest();
