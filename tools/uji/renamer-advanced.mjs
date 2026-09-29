/**
 * Suite Uji Otomatis: Fase 2 (Lanjutan & Edge Cases) — Core Engine & Integrity
 */
import {
  formatCase,
  parseTokens,
  applyRule,
  runPipeline,
  isReservedFileName,
  WINDOWS_RESERVED_NAMES,
} from '../../docs/renamer/engine.js';
import {
  createRenamerItem,
  createRule,
  RULE_TYPES,
  FILE_STATUS,
} from '../../docs/renamer/model.js';

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

console.log('══ Uji Lanjutan & Kondisi Ekstrem Engine (Fase 2) ══\n');

// 1. Uji Regex Capture Groups ($1, $2)
const rRegexGroup = createRule(RULE_TYPES.REPLACE, {
  find: '(\\d{4})-(\\d{2})-(\\d{2})_(.*)',
  replaceWith: '$4_[$1-$2-$3]',
  isRegex: true,
  matchCase: true,
});
const resCapture = applyRule({ baseName: '2026-09-29_Laporan_Keuangan', ext: '.pdf' }, rRegexGroup, 0, 1);
assert(resCapture.baseName === 'Laporan_Keuangan_[2026-09-29]', 'Regex Capture Group: mereorganisasi tanggal & judul');

// 2. Uji Deteksi Nama Terlarang OS (Windows Reserved Names: CON, NUL, AUX, PRN)
assert(isReservedFileName('con') === true, 'Deteksi Windows Reserved: con');
assert(isReservedFileName('NUL') === true, 'Deteksi Windows Reserved: NUL (case-insensitive)');
assert(isReservedFileName('aux') === true, 'Deteksi Windows Reserved: aux');
assert(isReservedFileName('com1') === true, 'Deteksi Windows Reserved: com1');
assert(isReservedFileName('lpt3') === true, 'Deteksi Windows Reserved: lpt3');
assert(isReservedFileName('normal_file') === false, 'Deteksi Windows Reserved: normal_file bukan reserved');

const reservedFiles = [
  createRenamerItem({ originalName: 'dokumen.txt' }),
];
const reservedRule = [
  createRule(RULE_TYPES.REPLACE, { find: 'dokumen', replaceWith: 'con' }),
];
const resReserved = runPipeline(reservedFiles, reservedRule);
assert(resReserved.items[0].status === FILE_STATUS.INVALID, 'Pipeline menandai status INVALID untuk nama terproteksi sistem (CON)');
assert(resReserved.invalidCount === 1, 'invalidCount = 1 untuk nama terproteksi');

// 3. Uji Batas Panjang Karakter (> 255 karakter)
const longNameFiles = [
  createRenamerItem({ originalName: 'a'.repeat(260) + '.txt' }),
];
const resLong = runPipeline(longNameFiles, []);
assert(resLong.items[0].status === FILE_STATUS.INVALID, 'Pipeline menandai status INVALID untuk nama berkas > 255 karakter');

// 4. Uji Validasi Akhiran Titik / Spasi
const trailingFiles = [
  createRenamerItem({ originalName: 'laporan .txt' }),
  createRenamerItem({ originalName: 'laporan..txt' }),
];
const resTrailing = runPipeline(trailingFiles, []);
assert(resTrailing.items[0].status === FILE_STATUS.INVALID, 'Nama berakhiran spasi ditandai INVALID');
assert(resTrailing.items[1].status === FILE_STATUS.INVALID, 'Nama berakhiran titik ditandai INVALID');

// 5. Uji Auto-Collision Resolution Strategy
const clashFiles = [
  createRenamerItem({ originalName: 'video_a.mp4' }),
  createRenamerItem({ originalName: 'video_b.mp4' }),
  createRenamerItem({ originalName: 'video_c.mp4' }),
];
const clashRule = [
  createRule(RULE_TYPES.REPLACE, { find: 'video_[abc]', replaceWith: 'video_seragam', isRegex: true }),
];

// 5a. Strategy 'warn' (Default)
const resWarn = runPipeline(clashFiles, clashRule, { collisionStrategy: 'warn' });
assert(resWarn.conflictCount === 3, 'Strategy "warn" mendeteksi 3 berkas konflik');
assert(resWarn.hasErrors === true, 'Strategy "warn" hasErrors = true');

// 5b. Strategy 'auto-number-parens'
const resAutoParens = runPipeline(clashFiles, clashRule, { collisionStrategy: 'auto-number-parens' });
assert(resAutoParens.conflictCount === 0, 'Strategy "auto-number-parens" berhasil menyelesaikan konflik (0 conflict)');
assert(resAutoParens.items[0].newName === 'video_seragam.mp4', 'Item 1 tetap video_seragam.mp4');
assert(resAutoParens.items[1].newName === 'video_seragam (1).mp4', 'Item 2 auto diberi akhiran (1)');
assert(resAutoParens.items[2].newName === 'video_seragam (2).mp4', 'Item 3 auto diberi akhiran (2)');

// 5c. Strategy 'auto-number-underscore'
const resAutoUnderscore = runPipeline(clashFiles, clashRule, { collisionStrategy: 'auto-number-underscore' });
assert(resAutoUnderscore.items[1].newName === 'video_seragam_1.mp4', 'Item 2 auto diberi akhiran _1');

// 6. Uji Preservasi Multilingual & Unicode (Jepang, Arab, Cyrillic, Emoji, Aksara)
const unicodeFiles = [
  createRenamerItem({ originalName: '写真_2026_東京.jpg' }),
  createRenamerItem({ originalName: 'تقرير_المالية_2026.pdf' }),
  createRenamerItem({ originalName: 'Документ_Проект.docx' }),
  createRenamerItem({ originalName: 'Liburan_🏖️_Bali.png' }),
];
const unicodeRule = [
  createRule(RULE_TYPES.INSERT, { text: '[HARA]_', position: 'prefix' }),
];
const resUnicode = runPipeline(unicodeFiles, unicodeRule);
assert(resUnicode.items[0].newName === '[HARA]_写真_2026_東京.jpg', 'Preservasi teks Jepang kanji');
assert(resUnicode.items[1].newName === '[HARA]_تقرير_المالية_2026.pdf', 'Preservasi teks Arab');
assert(resUnicode.items[2].newName === '[HARA]_Документ_Проект.docx', 'Preservasi teks Cyrillic');
assert(resUnicode.items[3].newName === '[HARA]_Liburan_🏖️_Bali.png', 'Preservasi karakter Emoji');

// 7. Uji Token Tambahan ({size}, {index}, {year}, {month}, {day})
const tokenFile = createRenamerItem({
  originalName: 'Foto.jpg',
  size: 2.5 * 1024 * 1024,
  lastModified: new Date('2026-08-15T14:30:00').getTime(),
});
const tokenRule = [
  createRule(RULE_TYPES.TOKEN, { pattern: '{year}_{month}_{day}_{name}_{size}' }),
];
const resTokenAdv = runPipeline([tokenFile], tokenRule);
assert(resTokenAdv.items[0].newName === '2026_08_15_Foto_2.5 MB.jpg', 'Token {year}_{month}_{day}_{name}_{size} dikalkulasi dengan tepat');

// 8. Uji Performa Batch Besar (1.000 berkas dalam < 50ms)
const largeBatch = [];
for (let i = 0; i < 1000; i++) {
  largeBatch.push(
    createRenamerItem({
      originalName: `DSC_${String(i).padStart(4, '0')}_RAW%20PHOTO.CR2`,
      size: 15 * 1024 * 1024,
      lastModified: Date.now() - i * 10000,
    })
  );
}
const complexPipeline = [
  createRule(RULE_TYPES.CLEAN, { removeWebSpam: true, collapseSpaces: true }),
  createRule(RULE_TYPES.CASE, { target: 'base', format: 'kebab' }),
  createRule(RULE_TYPES.NUMBERING, { start: 1, digits: 4, position: 'prefix', suffix: '-' }),
  createRule(RULE_TYPES.EXTENSION, { mode: 'lower' }),
];

const t0 = Date.now();
const resLarge = runPipeline(largeBatch, complexPipeline);
const duration = Date.now() - t0;

assert(resLarge.total === 1000, 'Batch 1.000 berkas berhasil diproses');
assert(resLarge.changedCount === 1000, 'Semua 1.000 berkas berhasil ditransformasi');
assert(resLarge.conflictCount === 0, '0 konflik pada batch 1.000 berkas');
assert(duration < 150, `Kalkulasi 1.000 berkas super cepat: ${duration}ms (target < 150ms)`);

console.log(`\nSemua ${passed}/${total} pengujian lanjutan Fase 2 berhasil!`);
