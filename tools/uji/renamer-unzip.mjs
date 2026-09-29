/**
 * Suite Uji: Round-trip ZIP Create & Extract
 */
import { createZipBlob } from '../../docs/renamer/zip.js';
import { extractZip } from '../../docs/renamer/unzip.js';

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

async function runTest() {
  console.log('══ Uji Ekstraksi Berkas ZIP Otomatis ══\n');

  const filesInZip = [
    { name: 'dokumen_laporan.txt', data: 'Halo ini isi laporan keuangan 2026' },
    { name: 'foto_pantai.jpg', data: new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]) },
    { name: 'subfolder/catatan_penting.md', data: '# Judul Catatan Penting' },
  ];

  const zipBlob = await createZipBlob(filesInZip);
  assert(zipBlob instanceof Blob, 'Membuat ZIP Blob berhasil');

  const extracted = await extractZip(zipBlob);
  assert(extracted.length === 3, 'Ekstraksi ZIP menghasilkan 3 berkas');
  assert(extracted[0].name === 'dokumen_laporan.txt', 'Berkas 1 nama tepat: dokumen_laporan.txt');
  assert(extracted[1].name === 'foto_pantai.jpg', 'Berkas 2 nama tepat: foto_pantai.jpg');
  assert(extracted[2].name === 'catatan_penting.md', 'Berkas 3 nama tepat: catatan_penting.md');

  const decoder = new TextDecoder();
  const text1 = decoder.decode(extracted[0].data);
  assert(text1 === 'Halo ini isi laporan keuangan 2026', 'Isi berkas teks 1 utuh sesuai aslinya');

  console.log(`\nSemua ${passed}/${total} pengujian Ekstraksi ZIP berhasil!`);
}

runTest();
