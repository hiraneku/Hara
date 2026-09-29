/**
 * Core Rule Engine & Collision Detection — Hara Bulk Renamer (Fase 2)
 *
 * Murni komputasi logika (Pure Functions, zero-DOM dependencies).
 * Menjalankan rantai aturan (pipeline) terhadap daftar berkas secara berurutan,
 * memvalidasi integritas sistem berkas OS, dan menyelesaikan tabrakan nama.
 */

import {
  RULE_TYPES,
  FILE_STATUS,
  ILLEGAL_CHARS_REGEX,
  sanitizeFileName,
  formatFileSize,
} from './model.js?v=20260929120314';

/**
 * Daftar nama terlarang yang diproteksi sistem operasi (Windows, DOS, FAT32):
 * CON, PRN, AUX, NUL, COM1-COM9, LPT1-LPT9 (dengan atau tanpa ekstensi).
 */
export const WINDOWS_RESERVED_NAMES = new Set([
  'con', 'prn', 'aux', 'nul',
  'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9',
  'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9',
]);

/**
 * Batas panjang karakter nama berkas standar pada sebagian besar sistem berkas (255 karakter).
 */
export const MAX_FILENAME_LENGTH = 255;

/**
 * Memeriksa apakah nama dasar berkas termasuk nama sistem yang direservasi.
 * @param {string} baseName
 * @returns {boolean}
 */
export function isReservedFileName(baseName = '') {
  const clean = String(baseName || '').trim().toLowerCase();
  return WINDOWS_RESERVED_NAMES.has(clean);
}

/**
 * Format string ke berbagai jenis case/kapitalisasi.
 */
export function formatCase(text = '', format = 'lower') {
  if (!text) return '';
  switch (format) {
    case 'lower':
      return text.toLowerCase();
    case 'upper':
      return text.toUpperCase();
    case 'title':
      return text.replace(/\b(\w)/g, char => char.toUpperCase());
    case 'sentence':
      return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    case 'camel': {
      const words = text
        .replace(/[-_]+/g, ' ')
        .replace(/[^\w\s\u00C0-\u024F\u1E00-\u1EFF]/g, '')
        .trim()
        .split(/\s+/);
      return words
        .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
        .join('');
    }
    case 'kebab':
      return text
        .replace(/([a-z\d])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .replace(/[^\w\-\u00C0-\u024F\u1E00-\u1EFF]/g, '')
        .toLowerCase()
        .replace(/--+/g, '-')
        .replace(/^-|-$/g, '');
    case 'snake':
      return text
        .replace(/([a-z\d])([A-Z])/g, '$1_$2')
        .replace(/[\s-]+/g, '_')
        .replace(/[^\w_\u00C0-\u024F\u1E00-\u1EFF]/g, '')
        .toLowerCase()
        .replace(/__+/g, '_')
        .replace(/^_|_$/g, '');
    default:
      return text;
  }
}

/**
 * Mengurutkan daftar berkas sebelum rantai aturan diterapkan (Pre-sorting).
 * Menggunakan Natural Sort (memahami urutan angka seperti file1, file2, file10).
 *
 * @param {Array<RenamerFileItem>} files
 * @param {string} sortBy - 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc' | 'size-asc' | 'size-desc'
 * @returns {Array<RenamerFileItem>}
 */
export function sortFiles(files = [], sortBy = 'name-asc') {
  const cloned = [...files];
  switch (sortBy) {
    case 'name-asc':
      return cloned.sort((a, b) =>
        a.originalName.localeCompare(b.originalName, undefined, { numeric: true, sensitivity: 'base' })
      );
    case 'name-desc':
      return cloned.sort((a, b) =>
        b.originalName.localeCompare(a.originalName, undefined, { numeric: true, sensitivity: 'base' })
      );
    case 'date-asc':
      return cloned.sort((a, b) => (a.lastModified || 0) - (b.lastModified || 0));
    case 'date-desc':
      return cloned.sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));
    case 'size-asc':
      return cloned.sort((a, b) => (a.size || 0) - (b.size || 0));
    case 'size-desc':
      return cloned.sort((a, b) => (b.size || 0) - (a.size || 0));
    default:
      return cloned;
  }
}

/**
 * Mengganti token dinamis ({name}, {num}, {date}, {time}, {ext}, {size}, {parent}, dll.) dalam pola.
 */
export function parseTokens(pattern, { name, ext, index, count, lastModified, size = 0, path, meta = {}, digits = 2, startNum = 1 }) {
  // Gunakan tanggal asli EXIF kamera jika tersedia, fallback ke lastModified
  const exifDate = meta && meta.exif && meta.exif.date ? meta.exif.date : null;
  const d = exifDate instanceof Date ? exifDate : new Date(lastModified || Date.now());

  const yyyy = String(d.getFullYear());
  const yy = yyyy.slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');

  const dateStr = `${yyyy}-${mm}-${dd}`;
  const timeStr = `${hh}-${min}-${ss}`;

  const numVal = startNum + index;
  const numPadded = String(numVal).padStart(digits, '0');
  const cleanExt = (ext || '').replace(/^\./, '');
  const sizeStr = formatFileSize(size);

  const cameraStr = meta && meta.exif && (meta.exif.model || meta.exif.make)
    ? `${meta.exif.make || ''} ${meta.exif.model || ''}`.trim().replace(/\s+/g, '_')
    : 'Camera';

  const id3 = meta && meta.id3 ? meta.id3 : {};
  const artistStr = id3.artist || 'Unknown_Artist';
  const titleStr = id3.title || name || 'Unknown_Title';
  const albumStr = id3.album || 'Unknown_Album';
  const trackStr = id3.track ? String(id3.track).padStart(2, '0') : numPadded;

  return pattern
    .replace(/\{name\}/gi, name || '')
    .replace(/\{ext\}/gi, cleanExt)
    .replace(/\{num\}/gi, numPadded)
    .replace(/\{index\}/gi, String(index + 1))
    .replace(/\{date\}/gi, dateStr)
    .replace(/\{time\}/gi, timeStr)
    .replace(/\{year\}/gi, yyyy)
    .replace(/\{yy\}/gi, yy)
    .replace(/\{month\}/gi, mm)
    .replace(/\{day\}/gi, dd)
    .replace(/\{hour\}/gi, hh)
    .replace(/\{min\}/gi, min)
    .replace(/\{size\}/gi, sizeStr)
    .replace(/\{camera\}/gi, cameraStr)
    .replace(/\{artist\}/gi, artistStr)
    .replace(/\{title\}/gi, titleStr)
    .replace(/\{album\}/gi, albumStr)
    .replace(/\{track\}/gi, trackStr)
    .replace(/\{parent\}/gi, path || '')
    .replace(/\{total\}/gi, String(count || 1));
}

/**
 * Menerapkan satu aturan transformasi pada nama berkas.
 * @param {Object} state - { baseName: string, ext: string }
 * @param {Object} rule - Aturan yang akan diterapkan
 * @param {number} index - Indeks urutan berkas dalam antrean (0-based)
 * @param {number} totalCount - Total berkas
 * @param {Object} meta - Metadata berkas (lastModified, size, path, dll.)
 * @returns {{ baseName: string, ext: string }}
 */
export function applyRule(state, rule, index, totalCount, meta = {}) {
  if (!rule || !rule.enabled) return state;

  let { baseName, ext } = state;
  const p = rule.params || {};

  switch (rule.type) {
    case RULE_TYPES.REPLACE: {
      const { find = '', replaceWith = '', isRegex = false, matchCase = false, matchAll = true } = p;
      if (!find) break;
      try {
        if (isRegex) {
          const flags = (matchAll ? 'g' : '') + (matchCase ? '' : 'i');
          const regex = new RegExp(find, flags);
          // Mendukung capture group regex ($1, $2, dll.)
          baseName = baseName.replace(regex, replaceWith);
        } else {
          if (matchAll) {
            const flags = matchCase ? 'g' : 'gi';
            const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            baseName = baseName.replace(new RegExp(escaped, flags), () => replaceWith);
          } else {
            const idx = matchCase ? baseName.indexOf(find) : baseName.toLowerCase().indexOf(find.toLowerCase());
            if (idx !== -1) {
              baseName = baseName.slice(0, idx) + replaceWith + baseName.slice(idx + find.length);
            }
          }
        }
      } catch (err) {
        // Regex invalid: abaikan agar tidak merusak alur eksekusi
      }
      break;
    }

    case RULE_TYPES.INSERT: {
      const { text = '', position = 'prefix', index: posIndex = 0, pivotText = '' } = p;
      if (!text) break;
      if (position === 'prefix') {
        baseName = text + baseName;
      } else if (position === 'suffix') {
        baseName = baseName + text;
      } else if (position === 'index') {
        const idx = Math.max(0, Math.min(posIndex, baseName.length));
        baseName = baseName.slice(0, idx) + text + baseName.slice(idx);
      } else if (position === 'after' && pivotText) {
        const idx = baseName.indexOf(pivotText);
        if (idx !== -1) {
          const target = idx + pivotText.length;
          baseName = baseName.slice(0, target) + text + baseName.slice(target);
        }
      } else if (position === 'before' && pivotText) {
        const idx = baseName.indexOf(pivotText);
        if (idx !== -1) {
          baseName = baseName.slice(0, idx) + text + baseName.slice(idx);
        }
      }
      break;
    }

    case RULE_TYPES.NUMBERING: {
      const { start = 1, step = 1, digits = 2, position = 'suffix', index: posIndex = 0, prefix = '_', suffix = '' } = p;
      const currentNumber = Number(start) + index * Number(step);
      const formattedNum = prefix + String(currentNumber).padStart(Number(digits), '0') + suffix;

      if (position === 'prefix') {
        baseName = formattedNum + baseName;
      } else if (position === 'suffix') {
        baseName = baseName + formattedNum;
      } else if (position === 'replace') {
        baseName = formattedNum;
      } else if (position === 'index') {
        const idx = Math.max(0, Math.min(posIndex, baseName.length));
        baseName = baseName.slice(0, idx) + formattedNum + baseName.slice(idx);
      }
      break;
    }

    case RULE_TYPES.CASE: {
      const { target = 'base', format = 'lower' } = p;
      if (target === 'base' || target === 'all') {
        baseName = formatCase(baseName, format);
      }
      if (target === 'ext' || target === 'all') {
        if (ext) {
          const cleanExt = ext.startsWith('.') ? ext.slice(1) : ext;
          ext = '.' + formatCase(cleanExt, format);
        }
      }
      break;
    }

    case RULE_TYPES.TRIM: {
      const { mode = 'spaces', count = 0, chars = '' } = p;
      if (mode === 'spaces') {
        baseName = baseName.replace(/\s+/g, ' ').trim();
      } else if (mode === 'start' && count > 0) {
        baseName = baseName.slice(count);
      } else if (mode === 'end' && count > 0) {
        baseName = baseName.slice(0, Math.max(0, baseName.length - count));
      } else if (mode === 'both' && count > 0) {
        baseName = baseName.slice(count, Math.max(count, baseName.length - count));
      } else if (mode === 'chars' && chars) {
        const escaped = chars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regStart = new RegExp(`^[${escaped}]+`, 'g');
        const regEnd = new RegExp(`[${escaped}]+$`, 'g');
        baseName = baseName.replace(regStart, '').replace(regEnd, '');
      }
      break;
    }

    case RULE_TYPES.EXTENSION: {
      const { mode = 'lower', newExt = '' } = p;
      if (mode === 'lower') {
        ext = ext.toLowerCase();
      } else if (mode === 'upper') {
        ext = ext.toUpperCase();
      } else if (mode === 'change' && newExt) {
        ext = newExt.startsWith('.') ? newExt : '.' + newExt;
      } else if (mode === 'remove') {
        ext = '';
      }
      break;
    }

    case RULE_TYPES.CLEAN: {
      const { sanitizeOS = true, removeWebSpam = true, collapseSpaces = true, removeBrackets = false } = p;
      if (removeWebSpam) {
        baseName = baseName
          .replace(/%20/gi, ' ')
          .replace(/%28/gi, '(')
          .replace(/%29/gi, ')')
          .replace(/%5B/gi, '[')
          .replace(/%5D/gi, ']')
          .replace(/%2B/gi, '+');
      }
      if (removeBrackets) {
        baseName = baseName.replace(/\[.*?\]|\(.*?\)|{.*?}/g, '').trim();
      }
      if (collapseSpaces) {
        baseName = baseName.replace(/[\s_]+/g, ' ').trim();
      }
      if (sanitizeOS) {
        baseName = sanitizeFileName(baseName, '_');
      }
      break;
    }

    case RULE_TYPES.TOKEN: {
      const { pattern = '{name}_{num}', startNum = 1, digits = 2 } = p;
      baseName = parseTokens(pattern, {
        name: baseName,
        ext,
        index,
        count: totalCount,
        lastModified: meta.lastModified,
        size: meta.size,
        path: meta.path,
        meta,
        digits,
        startNum,
      });
      break;
    }
  }

  return { baseName, ext };
}

/**
 * Menjalankan seluruh pipeline aturan pada sekumpulan berkas.
 * Menghitung nama baru, memvalidasi integritas OS, dan mendeteksi tabrakan nama (konflik).
 *
 * @param {Array<RenamerFileItem>} fileItems
 * @param {Array<RenamerRule>} rules
 * @param {Object} [options={}] - Opsi lanjutan (collisionStrategy, dll.)
 * @returns {PipelineResult}
 */
export function runPipeline(fileItems = [], rules = [], options = {}) {
  const { collisionStrategy = 'warn' } = options;

  if (!Array.isArray(fileItems) || fileItems.length === 0) {
    return {
      items: [],
      total: 0,
      changedCount: 0,
      conflictCount: 0,
      invalidCount: 0,
      hasErrors: false,
    };
  }

  const totalCount = fileItems.length;
  const activeRules = rules.filter(r => r && r.enabled);

  // 1. Eksekusi transformasi untuk tiap berkas
  const evaluatedItems = fileItems.map((item, index) => {
    let state = { baseName: item.baseName, ext: item.ext };

    for (const rule of activeRules) {
      state = applyRule(state, rule, index, totalCount, {
        lastModified: item.lastModified,
        size: item.size,
        path: item.path,
        exif: item.meta ? item.meta.exif : null,
        id3: item.meta ? item.meta.id3 : null,
      });
    }

    const calculatedName = `${state.baseName}${state.ext}`;
    return {
      ...item,
      calculatedBaseName: state.baseName,
      calculatedExt: state.ext,
      newName: calculatedName,
      status: FILE_STATUS.UNCHANGED,
      errorMsg: '',
    };
  });

  // 2. Validasi Integritas Sistem Berkas
  evaluatedItems.forEach(item => {
    // Validasi nama kosong
    if (!item.calculatedBaseName && !item.calculatedExt) {
      item.status = FILE_STATUS.INVALID;
      item.errorMsg = 'Nama berkas tidak boleh kosong';
      return;
    }

    // Validasi karakter terlarang OS
    if (ILLEGAL_CHARS_REGEX.test(item.newName)) {
      item.status = FILE_STATUS.INVALID;
      item.errorMsg = 'Mengandung karakter terlarang sistem operasi (/ \\ : * ? " < > |)';
      return;
    }

    // Validasi panjang nama berkas (> 255 karakter)
    if (item.newName.length > MAX_FILENAME_LENGTH) {
      item.status = FILE_STATUS.INVALID;
      item.errorMsg = `Nama berkas terlalu panjang (${item.newName.length} huruf, batas maksimal 255)`;
      return;
    }

    // Validasi nama terproteksi sistem (Windows Reserved: CON, NUL, PRN, AUX, dll.)
    if (isReservedFileName(item.calculatedBaseName)) {
      item.status = FILE_STATUS.INVALID;
      item.errorMsg = `"${item.calculatedBaseName}" adalah nama terproteksi sistem operasi`;
      return;
    }

    // Validasi spasi/titik di akhir nama dasar atau nama berkas (rawan error di Windows)
    if (
      item.newName.endsWith(' ') ||
      item.newName.endsWith('.') ||
      item.calculatedBaseName.endsWith(' ') ||
      item.calculatedBaseName.endsWith('.')
    ) {
      item.status = FILE_STATUS.INVALID;
      item.errorMsg = 'Nama berkas atau nama dasar tidak boleh diakhiri tanda titik atau spasi';
      return;
    }
  });

  // 3. Deteksi Tabrakan Nama (Name Collision Resolution)
  const nameOccurrences = new Map();

  evaluatedItems.forEach(item => {
    if (item.status === FILE_STATUS.INVALID) return;

    const key = `${item.path || ''}///${item.newName.toLowerCase()}`;
    if (!nameOccurrences.has(key)) {
      nameOccurrences.set(key, []);
    }
    nameOccurrences.get(key).push(item);
  });

  // Opsi Auto-Resolve Tabrakan Nama
  if (collisionStrategy === 'auto-number-parens' || collisionStrategy === 'auto-number-underscore') {
    nameOccurrences.forEach((group) => {
      if (group.length > 1) {
        group.forEach((item, idx) => {
          if (idx > 0) {
            const suffix = collisionStrategy === 'auto-number-parens' ? ` (${idx})` : `_${idx}`;
            item.calculatedBaseName = `${item.calculatedBaseName}${suffix}`;
            item.newName = `${item.calculatedBaseName}${item.calculatedExt}`;
          }
        });
      }
    });

    // Validasi ulang setelah auto-numbering
    nameOccurrences.clear();
    evaluatedItems.forEach(item => {
      if (item.status === FILE_STATUS.INVALID) return;
      const key = `${item.path || ''}///${item.newName.toLowerCase()}`;
      if (!nameOccurrences.has(key)) {
        nameOccurrences.set(key, []);
      }
      nameOccurrences.get(key).push(item);
    });
  }

  // 4. Kalkulasi Status & Ringkasan Akhir
  let changedCount = 0;
  let conflictCount = 0;
  let invalidCount = 0;

  evaluatedItems.forEach(item => {
    if (item.status === FILE_STATUS.INVALID) {
      invalidCount++;
      return;
    }

    const key = `${item.path || ''}///${item.newName.toLowerCase()}`;
    const group = nameOccurrences.get(key) || [];

    if (group.length > 1) {
      item.status = FILE_STATUS.CONFLICT;
      item.errorMsg = `Tabrakan nama: ${group.length} berkas menghasilkan nama yang sama (${item.newName})`;
      conflictCount++;
    } else if (item.newName !== item.originalName) {
      item.status = FILE_STATUS.OK;
      changedCount++;
    } else {
      item.status = FILE_STATUS.UNCHANGED;
    }
  });

  return {
    items: evaluatedItems,
    total: totalCount,
    changedCount,
    conflictCount,
    invalidCount,
    hasErrors: conflictCount > 0 || invalidCount > 0,
  };
}
