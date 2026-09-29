/**
 * Model Data & Spesifikasi Skema untuk Modul Bulk Renamer — Hara
 *
 * Mengikuti prinsip arsitektur Hara:
 * - Data murni bebas efek samping DOM (pure state).
 * - Immutability & validasi ketat.
 * - Format serializable (kompatibel dengan JSON & localStorage).
 */

let _seq = 0;
export function newId(prefix = 'rn') {
  return `${prefix}-${Date.now().toString(36)}-${(++_seq).toString(36)}`;
}

/**
 * Memecah nama berkas lengkap menjadi nama dasar (baseName) dan ekstensi (ext).
 * Menangani kasus khusus seperti berkas dotfile (.gitignore), ekstensi ganda, dll.
 * @param {string} fullName
 * @returns {{ baseName: string, ext: string }}
 */
export function parseFileName(fullName = '') {
  const str = String(fullName || '').trim();
  if (!str) return { baseName: '', ext: '' };

  const lastDot = str.lastIndexOf('.');
  // Jika tidak ada titik, atau titik berada di awal (dotfile seperti .env / .gitignore)
  if (lastDot <= 0) {
    return { baseName: str, ext: '' };
  }

  const baseName = str.slice(0, lastDot);
  const ext = str.slice(lastDot); // Menyimpan titik, misal: ".jpg"
  return { baseName, ext };
}

/**
 * Karakter ilegal di berbagai sistem berkas (Windows, macOS, Linux, Android):
 * / \ : * ? " < > | dan karakter kontrol ASCII (0-31)
 */
export const ILLEGAL_CHARS_REGEX = /[/\\:*?"<>|\x00-\x1f]/g;

/**
 * Membersihkan karakter ilegal dari nama berkas.
 * @param {string} name
 * @param {string} [replacement='_']
 * @returns {string}
 */
export function sanitizeFileName(name = '', replacement = '_') {
  return String(name || '')
    .replace(ILLEGAL_CHARS_REGEX, replacement)
    .trim();
}

/**
 * Format ukuran berkas manusiawi (Bytes, KB, MB, GB).
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes = 0) {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1);
  return `${val} ${units[i]}`;
}

/**
 * Status kalkulasi item berkas dalam pipeline:
 * - 'ok'        : Nama baru valid, siap diganti.
 * - 'unchanged' : Nama baru identik dengan nama asli (tidak ada perubahan).
 * - 'conflict'  : Terjadi tabrakan nama (nama kembar dengan berkas lain).
 * - 'invalid'   : Nama baru tidak valid (kosong atau mengandung karakter terlarang).
 */
export const FILE_STATUS = {
  OK: 'ok',
  UNCHANGED: 'unchanged',
  CONFLICT: 'conflict',
  INVALID: 'invalid',
};

/**
 * Membuat item berkas baru untuk antrean renamer.
 * @param {Object} params
 * @param {string} [params.id]
 * @param {string} params.originalName - Nama berkas asli (mis. "IMG_001.JPG")
 * @param {number} [params.size] - Ukuran dalam bytes
 * @param {number} [params.lastModified] - Timestamp tanggal berkas
 * @param {string} [params.path] - Jalur relatif atau nama folder induk
 * @param {any} [params.handle] - FileSystemFileHandle (jika via Web FS API)
 * @param {File} [params.file] - Objek File asli browser
 * @param {Object} [params.meta] - Metadata tambahan (EXIF, tanggal kamera, dll.)
 * @returns {RenamerFileItem}
 */
export function createRenamerItem({
  id = newId('f'),
  originalName,
  size = 0,
  lastModified = Date.now(),
  path = '',
  handle = null,
  file = null,
  meta = {},
}) {
  const { baseName, ext } = parseFileName(originalName);
  return {
    id,
    originalName: String(originalName || ''),
    baseName,
    ext,
    newName: String(originalName || ''),
    status: FILE_STATUS.UNCHANGED,
    errorMsg: '',
    size,
    lastModified,
    path,
    handle,
    file,
    meta: { ...meta },
  };
}

/**
 * Definisi Tipe-Tipe Aturan (Rule Types) yang Didukung Hara Renamer
 */
export const RULE_TYPES = {
  REPLACE: 'replace',       // Cari & ganti teks atau regex
  INSERT: 'insert',         // Sisip teks di awalan, akhiran, atau posisi indeks
  NUMBERING: 'numbering',   // Penomoran urut otomatis (01, 001, dst.)
  CASE: 'case',             // Ubah kapitalisasi (lower, UPPER, Title, camel, kebab, snake)
  TRIM: 'trim',             // Pangkas karakter, spasi ganda, atau N karakter awal/akhir
  EXTENSION: 'extension',   // Ubah format ekstensi (lowercase, ganti ekstensi)
  CLEAN: 'clean',           // Pembersihan instan (karakter ilegal, spam web %20, bracket)
  TOKEN: 'token',           // Pola kustom dengan token pintar ({date}, {name}, {num}, dll.)
};

/**
 * Spesifikasi dan Bawaan Parameter untuk Setiap Tipe Aturan
 */
export const RULE_METADATA = {
  [RULE_TYPES.REPLACE]: {
    label: 'Cari & Ganti',
    desc: 'Ganti teks atau pola regex dengan kata lain',
    icon: 'i-search',
    defaultParams: {
      find: '',
      replaceWith: '',
      isRegex: false,
      matchCase: false,
      matchAll: true,
    },
  },
  [RULE_TYPES.INSERT]: {
    label: 'Sisipkan Teks',
    desc: 'Tambah teks di awal (awalan), akhir (akhiran), atau indeks tertentu',
    icon: 'i-plus',
    defaultParams: {
      text: '',
      position: 'prefix', // 'prefix' | 'suffix' | 'index' | 'after' | 'before'
      index: 0,
      pivotText: '',
    },
  },
  [RULE_TYPES.NUMBERING]: {
    label: 'Penomoran Urut',
    desc: 'Beri nomor berurutan dengan digit rapi (01, 002)',
    icon: 'i-listol',
    defaultParams: {
      start: 1,
      step: 1,
      digits: 2,         // Jumlah digit (padding 0): 1 -> "1", 2 -> "01", 3 -> "001"
      position: 'suffix', // 'prefix' | 'suffix' | 'index' | 'replace'
      index: 0,
      prefix: '_',
      suffix: '',
    },
  },
  [RULE_TYPES.CASE]: {
    label: 'Ubah Huruf',
    desc: 'Ubah ke huruf kecil, BESAR, Title Case, camelCase, kebab-case',
    icon: 'i-txt',
    defaultParams: {
      target: 'base',    // 'base' | 'ext' | 'all'
      format: 'lower',   // 'lower' | 'upper' | 'title' | 'sentence' | 'camel' | 'kebab' | 'snake'
    },
  },
  [RULE_TYPES.TRIM]: {
    label: 'Pangkas Karakter',
    desc: 'Hapus karakter pertama/terakhir, potong panjang, atau rapikan spasi',
    icon: 'i-eraser',
    defaultParams: {
      mode: 'spaces',    // 'spaces' | 'start' | 'end' | 'both' | 'chars'
      count: 0,          // Jumlah karakter untuk mode start/end
      chars: '',         // Karakter spesifik yang ingin dibuang
    },
  },
  [RULE_TYPES.EXTENSION]: {
    label: 'Ekstensi Berkas',
    desc: 'Ubah, seragamkan huruf kecil, atau perbaiki ekstensi',
    icon: 'i-hash',
    defaultParams: {
      mode: 'lower',     // 'lower' | 'upper' | 'change' | 'remove'
      newExt: '',        // Ekstensi baru (misal: "jpg" atau ".png")
    },
  },
  [RULE_TYPES.CLEAN]: {
    label: 'Pembersihan Cepat',
    desc: 'Bersihkan karakter ilegal OS, spam %20, dan tanda kurung sampah',
    icon: 'i-drop',
    defaultParams: {
      sanitizeOS: true,
      removeWebSpam: true,
      collapseSpaces: true,
      removeBrackets: false,
    },
  },
  [RULE_TYPES.TOKEN]: {
    label: 'Pola Format Kustom',
    desc: 'Susun nama memakai token: {name}, {num}, {date}, {ext}, {parent}',
    icon: 'i-code',
    defaultParams: {
      pattern: '{name}_{num}',
      dateFormat: 'YYYY-MM-DD',
      startNum: 1,
      digits: 2,
    },
  },
};

/**
 * Membuat objek aturan baru dengan nilai default yang valid.
 * @param {string} type - Salah satu dari RULE_TYPES
 * @param {Object} [customParams={}] - Parameter kustom
 * @returns {RenamerRule}
 */
export function createRule(type, customParams = {}) {
  const meta = RULE_METADATA[type];
  if (!meta) {
    throw new Error(`Tipe aturan tidak dikenal: ${type}`);
  }
  return {
    id: newId('rule'),
    type,
    enabled: true,
    params: {
      ...meta.defaultParams,
      ...customParams,
    },
  };
}

/**
 * Menduplikasi aturan dengan ID unik baru.
 * @param {RenamerRule} rule
 * @returns {RenamerRule}
 */
export function cloneRule(rule) {
  return {
    ...JSON.parse(JSON.stringify(rule)),
    id: newId('rule'),
  };
}

/**
 * Daftar Preset Bawaan (Resep Cepat) yang Sangat Bermanfaat Sehari-hari
 */
export const DEFAULT_PRESETS = [
  {
    id: 'preset-clean-web',
    name: 'Bersihkan Unduhan Web',
    desc: 'Ganti %20, strip berlebih, dan ubah spasi jadi garis bawah',
    rules: [
      {
        type: RULE_TYPES.CLEAN,
        params: { sanitizeOS: true, removeWebSpam: true, collapseSpaces: true, removeBrackets: false },
      },
      {
        type: RULE_TYPES.REPLACE,
        params: { find: ' ', replaceWith: '_', isRegex: false, matchCase: false, matchAll: true },
      },
      {
        type: RULE_TYPES.EXTENSION,
        params: { mode: 'lower' },
      },
    ],
  },
  {
    id: 'preset-camera-date',
    name: 'Foto Kamera & Tanggal',
    desc: 'Format foto dengan tanggal YYYY-MM-DD dan nomor urut 3 digit',
    rules: [
      {
        type: RULE_TYPES.TOKEN,
        params: { pattern: '{date}_Foto_{num}', dateFormat: 'YYYY-MM-DD', startNum: 1, digits: 3 },
      },
      {
        type: RULE_TYPES.EXTENSION,
        params: { mode: 'lower' },
      },
    ],
  },
  {
    id: 'preset-series-numbering',
    name: 'Penomoran Seri / Episode',
    desc: 'Beri nomor urut 2 digit di awal nama berkas',
    rules: [
      {
        type: RULE_TYPES.NUMBERING,
        params: { start: 1, step: 1, digits: 2, position: 'prefix', index: 0, prefix: '', suffix: ' - ' },
      },
    ],
  },
  {
    id: 'preset-clean-kebab',
    name: 'Standar Web (kebab-case)',
    desc: 'Semua huruf kecil, spasi diganti strip tanda hubung',
    rules: [
      {
        type: RULE_TYPES.CASE,
        params: { target: 'base', format: 'kebab' },
      },
      {
        type: RULE_TYPES.EXTENSION,
        params: { mode: 'lower' },
      },
    ],
  },
  {
    id: 'preset-audio-track',
    name: 'Format Musik & Lagu (ID3)',
    desc: 'Format trek musik: {track} - {artist} - {title}',
    rules: [
      {
        type: RULE_TYPES.TOKEN,
        params: { pattern: '{track} - {artist} - {title}' },
      },
      {
        type: RULE_TYPES.EXTENSION,
        params: { mode: 'lower' },
      },
    ],
  },
  {
    id: 'preset-manga-chapter',
    name: 'Komik & Manga (Halaman)',
    desc: 'Format halaman komik: [Manga] - Ch.01 - Page {num}',
    rules: [
      {
        type: RULE_TYPES.TOKEN,
        params: { pattern: '[Manga] - Ch.01 - Page {num}', digits: 3, startNum: 1 },
      },
      {
        type: RULE_TYPES.EXTENSION,
        params: { mode: 'lower' },
      },
    ],
  },
  {
    id: 'preset-invoice-doc',
    name: 'Dokumen & Invoice (INV_Tanggal)',
    desc: 'Format invoice/faktur: INV_{date}_{num}',
    rules: [
      {
        type: RULE_TYPES.TOKEN,
        params: { pattern: 'INV_{date}_{num}', digits: 3, startNum: 1 },
      },
      {
        type: RULE_TYPES.EXTENSION,
        params: { mode: 'lower' },
      },
    ],
  },
];
