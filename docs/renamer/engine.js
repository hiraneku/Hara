/**
 * Core Rule Engine & Collision Detection — Hara Bulk Renamer
 *
 * Murni komputasi logika (Pure Functions, zero-DOM dependencies).
 * Menjalankan rantai aturan (pipeline) terhadap daftar berkas secara berurutan,
 * memvalidasi hasil, dan mendeteksi tabrakan nama (name collision).
 */

import {
  RULE_TYPES,
  FILE_STATUS,
  ILLEGAL_CHARS_REGEX,
  sanitizeFileName,
} from './model.js?v=20260929100848';

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
      return text.replace(/\b\w/g, char => char.toUpperCase());
    case 'sentence':
      return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    case 'camel': {
      const words = text
        .replace(/[-_]+/g, ' ')
        .replace(/[^\w\s]/g, '')
        .trim()
        .split(/\s+/);
      return words
        .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
        .join('');
    }
    case 'kebab':
      return text
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .replace(/[^\w-]/g, '')
        .toLowerCase()
        .replace(/--+/g, '-')
        .replace(/^-|-$/g, '');
    case 'snake':
      return text
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[\s-]+/g, '_')
        .replace(/[^\w_]/g, '')
        .toLowerCase()
        .replace(/__+/g, '_')
        .replace(/^_|_$/g, '');
    default:
      return text;
  }
}

/**
 * Mengganti token dinamis ({name}, {num}, {date}, {ext}, dll.) dalam pola.
 */
export function parseTokens(pattern, { name, ext, index, count, lastModified, path, digits = 2, startNum = 1 }) {
  const d = new Date(lastModified || Date.now());
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;
  const timeStr = `${String(d.getHours()).padStart(2, '0')}-${String(d.getMinutes()).padStart(2, '0')}`;

  const numVal = startNum + index;
  const numPadded = String(numVal).padStart(digits, '0');
  const cleanExt = (ext || '').replace(/^\./, '');

  return pattern
    .replace(/\{name\}/gi, name || '')
    .replace(/\{ext\}/gi, cleanExt)
    .replace(/\{num\}/gi, numPadded)
    .replace(/\{date\}/gi, dateStr)
    .replace(/\{time\}/gi, timeStr)
    .replace(/\{parent\}/gi, path || '')
    .replace(/\{total\}/gi, String(count || 1));
}

/**
 * Menerapkan satu aturan transformasi pada nama berkas.
 * @param {Object} state - { baseName: string, ext: string }
 * @param {Object} rule - Aturan yang akan diterapkan
 * @param {number} index - Indeks urutan berkas dalam antrean (0-based)
 * @param {number} totalCount - Total berkas
 * @param {Object} meta - Metadata berkas (lastModified, path, dll.)
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
          baseName = baseName.replace(regex, replaceWith);
        } else {
          if (matchAll) {
            const flags = matchCase ? 'g' : 'gi';
            const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            baseName = baseName.replace(new RegExp(escaped, flags), replaceWith);
          } else {
            const idx = matchCase ? baseName.indexOf(find) : baseName.toLowerCase().indexOf(find.toLowerCase());
            if (idx !== -1) {
              baseName = baseName.slice(0, idx) + replaceWith + baseName.slice(idx + find.length);
            }
          }
        }
      } catch (err) {
        // Regex invalid, abaikan agar tidak crash
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
        path: meta.path,
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
 * Menghitung nama baru, memvalidasi integritas, dan mendeteksi tabrakan nama (konflik).
 *
 * @param {Array<RenamerFileItem>} fileItems
 * @param {Array<RenamerRule>} rules
 * @returns {PipelineResult}
 */
export function runPipeline(fileItems = [], rules = []) {
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
        path: item.path,
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

  // 2. Deteksi Validitas & Konflik Nama (Name Collisions)
  const nameOccurrences = new Map();

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

    // Kelompokkan berdasarkan path folder + newName
    const key = `${item.path || ''}///${item.newName.toLowerCase()}`;
    if (!nameOccurrences.has(key)) {
      nameOccurrences.set(key, []);
    }
    nameOccurrences.get(key).push(item);
  });

  // Tandai status akhir untuk setiap berkas
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
