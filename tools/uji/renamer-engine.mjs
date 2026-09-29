/**
 * Suite Uji Otomatis: Fase 2 — Core Engine & Collision Detection
 */
import {
  formatCase,
  parseTokens,
  applyRule,
  runPipeline,
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

console.log('══ Uji Core Engine & Collision Detection (Fase 2) ══\n');

// 1. Uji formatCase
assert(formatCase('Halo Dunia', 'lower') === 'halo dunia', 'formatCase: lower');
assert(formatCase('halo dunia', 'upper') === 'HALO DUNIA', 'formatCase: upper');
assert(formatCase('halo dunia kita', 'title') === 'Halo Dunia Kita', 'formatCase: title');
assert(formatCase('halo_dunia_proyek', 'camel') === 'haloDuniaProyek', 'formatCase: camel');
assert(formatCase('Halo Dunia Proyek', 'kebab') === 'halo-dunia-proyek', 'formatCase: kebab');
assert(formatCase('Halo Dunia Proyek', 'snake') === 'halo_dunia_proyek', 'formatCase: snake');

// 2. Uji Aturan REPLACE
const r1 = createRule(RULE_TYPES.REPLACE, { find: 'IMG_', replaceWith: 'FOTO_' });
const res1 = applyRule({ baseName: 'IMG_001', ext: '.jpg' }, r1, 0, 1);
assert(res1.baseName === 'FOTO_001', 'Rule Replace: string biasa');

const r2 = createRule(RULE_TYPES.REPLACE, { find: '\\d+', replaceWith: 'NUM', isRegex: true });
const res2 = applyRule({ baseName: 'Item_999_draft', ext: '.png' }, r2, 0, 1);
assert(res2.baseName === 'Item_NUM_draft', 'Rule Replace: pola regex');

// 3. Uji Aturan INSERT
const rIns = createRule(RULE_TYPES.INSERT, { text: '[FINAL]_', position: 'prefix' });
const resIns = applyRule({ baseName: 'Laporan', ext: '.pdf' }, rIns, 0, 1);
assert(resIns.baseName === '[FINAL]_Laporan', 'Rule Insert: prefix');

// 4. Uji Aturan NUMBERING
const rNum = createRule(RULE_TYPES.NUMBERING, { start: 1, digits: 3, position: 'suffix', prefix: '_' });
const resNum0 = applyRule({ baseName: 'Track', ext: '.mp3' }, rNum, 0, 10);
const resNum9 = applyRule({ baseName: 'Track', ext: '.mp3' }, rNum, 9, 10);
assert(resNum0.baseName === 'Track_001', 'Rule Numbering: index 0 -> 001');
assert(resNum9.baseName === 'Track_010', 'Rule Numbering: index 9 -> 010');

// 5. Uji Aturan CLEAN
const rClean = createRule(RULE_TYPES.CLEAN, { removeWebSpam: true, collapseSpaces: true });
const resClean = applyRule({ baseName: 'Laporan%20Keuangan%202026', ext: '.xlsx' }, rClean, 0, 1);
assert(resClean.baseName === 'Laporan Keuangan 2026', 'Rule Clean: membersihkan %20 dan spasi');

// 6. Uji Aturan TOKEN
const rTok = createRule(RULE_TYPES.TOKEN, { pattern: '{name}_v{num}', digits: 2 });
const resTok = applyRule({ baseName: 'Dokumen', ext: '.docx' }, rTok, 1, 5);
assert(resTok.baseName === 'Dokumen_v02', 'Rule Token: {name}_v{num}');

// 7. Uji Pipeline Rantai Aturan (Chaining)
const files = [
  createRenamerItem({ originalName: 'IMG_2026%20(1).JPG' }),
  createRenamerItem({ originalName: 'IMG_2026%20(2).JPG' }),
];
const pipelineRules = [
  createRule(RULE_TYPES.CLEAN, { removeWebSpam: true, removeBrackets: true, collapseSpaces: true }),
  createRule(RULE_TYPES.CASE, { target: 'base', format: 'kebab' }),
  createRule(RULE_TYPES.NUMBERING, { start: 1, digits: 2, position: 'suffix', prefix: '-' }),
  createRule(RULE_TYPES.EXTENSION, { mode: 'lower' }),
];
const resultPipeline = runPipeline(files, pipelineRules);
assert(resultPipeline.items[0].newName === 'img-2026-01.jpg', 'Pipeline Chaining item 1 -> img-2026-01.jpg');
assert(resultPipeline.items[1].newName === 'img-2026-02.jpg', 'Pipeline Chaining item 2 -> img-2026-02.jpg');
assert(resultPipeline.changedCount === 2, 'Pipeline changedCount = 2');
assert(resultPipeline.conflictCount === 0, 'Pipeline conflictCount = 0');

// 8. Uji Deteksi Konflik (Name Collision)
const duplicateFiles = [
  createRenamerItem({ originalName: 'foto_a.jpg' }),
  createRenamerItem({ originalName: 'foto_b.jpg' }),
];
const conflictRule = [
  createRule(RULE_TYPES.REPLACE, { find: 'foto_[ab]', replaceWith: 'foto_sama', isRegex: true }),
];
const conflictRes = runPipeline(duplicateFiles, conflictRule);
assert(conflictRes.conflictCount === 2, 'Deteksi konflik: 2 berkas nama kembar ditandai');
assert(conflictRes.items[0].status === FILE_STATUS.CONFLICT, 'Item 1 berstatus conflict');
assert(conflictRes.hasErrors === true, 'Pipeline menandai hasErrors = true saat ada konflik');

console.log(`\nSemua ${passed}/${total} pengujian Fase 2 berhasil!`);
