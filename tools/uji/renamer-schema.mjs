/**
 * Suite Uji Otomatis: Fase 1 — Model & Skema Data Renamer
 */
import {
  parseFileName,
  sanitizeFileName,
  createRenamerItem,
  createRule,
  cloneRule,
  RULE_TYPES,
  FILE_STATUS,
  DEFAULT_PRESETS,
} from '../../docs/renamer/model.js';

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (!condition) {
    console.error(`GAGAL: ${message}`);
    process.exit(1);
  }
  console.log(`LULUS T${total} ${message}`);
  passed++;
}

console.log('══ Uji Skema Model Data Renamer (Fase 1) ══\n');

// 1. Uji parseFileName
const f1 = parseFileName('foto_liburan.jpg');
assert(f1.baseName === 'foto_liburan' && f1.ext === '.jpg', 'parseFileName memecah nama & ekstensi standar');

const f2 = parseFileName('arsip.tar.gz');
assert(f2.baseName === 'arsip.tar' && f2.ext === '.gz', 'parseFileName menangani ekstensi ganda (mengambil titik terakhir)');

const f3 = parseFileName('.gitignore');
assert(f3.baseName === '.gitignore' && f3.ext === '', 'parseFileName menangani dotfile tanpa ekstensi');

const f4 = parseFileName('dokumen_tanpa_ekstensi');
assert(f4.baseName === 'dokumen_tanpa_ekstensi' && f4.ext === '', 'parseFileName menangani berkas tanpa ekstensi');

// 2. Uji sanitizeFileName
const s1 = sanitizeFileName('laporan/keuangan:2026*final?.pdf');
assert(s1 === 'laporan_keuangan_2026_final_.pdf', 'sanitizeFileName mengganti karakter ilegal OS dengan _');

// 3. Uji createRenamerItem
const item1 = createRenamerItem({ originalName: 'Draf_Proyek.docx', size: 1024 });
assert(item1.id.startsWith('f-'), 'createRenamerItem menghasilkan id unik');
assert(item1.baseName === 'Draf_Proyek' && item1.ext === '.docx', 'createRenamerItem mengisi baseName & ext');
assert(item1.status === FILE_STATUS.UNCHANGED, 'createRenamerItem default status unchanged');

// 4. Uji createRule & cloneRule
const rReplace = createRule(RULE_TYPES.REPLACE, { find: 'Draf', replaceWith: 'Final' });
assert(rReplace.type === 'replace' && rReplace.params.find === 'Draf', 'createRule inisialisasi tipe replace');
assert(rReplace.enabled === true, 'createRule default enabled');

const rClone = cloneRule(rReplace);
assert(rClone.id !== rReplace.id, 'cloneRule menghasilkan id baru');
assert(rClone.params.find === 'Draf', 'cloneRule menyalin parameter');

// 5. Uji Semua Tipe Aturan
Object.values(RULE_TYPES).forEach(type => {
  const r = createRule(type);
  assert(r.type === type && typeof r.params === 'object', `createRule mendukung tipe ${type}`);
});

// 6. Uji Presets Bawaan
assert(DEFAULT_PRESETS.length >= 4, 'DEFAULT_PRESETS memuat preset bawaan');
DEFAULT_PRESETS.forEach(p => {
  assert(p.id && p.name && Array.isArray(p.rules), `Preset "${p.name}" memiliki struktur valid`);
});

console.log(`\nSemua ${passed}/${total} pengujian Fase 1 berhasil!`);
