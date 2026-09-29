/**
 * Suite Uji: Round-trip ZIP Multi-file & Category Filter
 */
import { createZipBlob } from '../../docs/renamer/zip.js';
import { extractZip, getFileCategory, CATEGORY_LABELS } from '../../docs/renamer/unzip.js';

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
  console.log('══ Uji Ekstraksi Multi-Berkas ZIP & Kategori ══\n');

  const filesInZip = [
    { name: 'laporan_keuangan.docx', data: 'Konten Docx' },
    { name: 'tabel_gaji.xlsx', data: 'Konten Xlsx' },
    { name: 'foto_1.jpg', data: new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]) },
    { name: 'foto_2.png', data: new Uint8Array([0x89, 0x50, 0x4E, 0x47]) },
    { name: 'logo.svg', data: '<svg></svg>' },
    { name: 'catatan.txt', data: 'Catatan teks biasa' },
    { name: 'readme.md', data: '# Readme' },
    { name: 'lagu.mp3', data: 'Audio mp3 dummy' },
    { name: 'video.mp4', data: 'Video mp4 dummy' },
  ];

  const zipBlob = await createZipBlob(filesInZip);
  assert(zipBlob instanceof Blob, 'Membuat ZIP Blob berhasil');

  const extracted = await extractZip(zipBlob);
  assert(extracted.length === 9, `Semua 9 berkas di dalam ZIP berhasil diekstrak (didapat: ${extracted.length})`);

  // Cek kategori masing-masing
  const docFiles = extracted.filter(f => f.category === 'docs');
  const imgFiles = extracted.filter(f => f.category === 'images');
  const txtFiles = extracted.filter(f => f.category === 'text');
  const audioFiles = extracted.filter(f => f.category === 'audio');
  const videoFiles = extracted.filter(f => f.category === 'video');

  assert(docFiles.length === 2, 'Kategori docs: 2 berkas (.docx, .xlsx)');
  assert(imgFiles.length === 3, 'Kategori images: 3 berkas (.jpg, .png, .svg)');
  assert(txtFiles.length === 2, 'Kategori text: 2 berkas (.txt, .md)');
  assert(audioFiles.length === 1, 'Kategori audio: 1 berkas (.mp3)');
  assert(videoFiles.length === 1, 'Kategori video: 1 berkas (.mp4)');

  console.log(`\nSemua ${passed}/${total} pengujian Ekstraksi ZIP & Kategori berhasil!`);
}

runTest();
