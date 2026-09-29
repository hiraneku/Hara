/**
 * Tampilan & Antarmuka Pengguna Modul Bulk Renamer — Hara
 *
 * Desain bersih, proporsional, lurus (tidak miring), dan nyaman untuk jempol.
 */

import { esc } from '../core/dom.js?v=20260929105515';
import { t as tr } from '../core/i18n.js?v=20260929105515';
import {
  RULE_TYPES,
  RULE_METADATA,
  FILE_STATUS,
  formatFileSize,
} from './model.js?v=20260929105515';

export function renderRuleInputs(rule) {
  const p = rule.params || {};
  switch (rule.type) {
    case RULE_TYPES.REPLACE:
      return `
        <div class="rn-form-grid">
          <div class="rn-field">
            <label>${tr('Teks / Pola yang Dicari:')}</label>
            <input type="text" class="rn-input-text" data-rn-param="find" data-rn-id="${rule.id}" value="${esc(p.find || '')}" placeholder="${tr('Misal: IMG_ atau (\\d+)')}">
          </div>
          <div class="rn-field">
            <label>${tr('Ganti Menjadi:')}</label>
            <input type="text" class="rn-input-text" data-rn-param="replaceWith" data-rn-id="${rule.id}" value="${esc(p.replaceWith || '')}" placeholder="${tr('Misal: Foto_ atau $1')}">
          </div>
          <div class="rn-field-inline" style="grid-column: 1 / -1; padding-top: 2px">
            <label><input type="checkbox" data-rn-param-bool="matchCase" data-rn-id="${rule.id}" ${p.matchCase ? 'checked' : ''}> ${tr('Peka Huruf Besar/Kecil (Aa)')}</label>
            <label style="margin-left: 12px"><input type="checkbox" data-rn-param-bool="isRegex" data-rn-id="${rule.id}" ${p.isRegex ? 'checked' : ''}> ${tr('Mode Regex ($1, $2)')}</label>
          </div>
        </div>
      `;

    case RULE_TYPES.INSERT:
      return `
        <div class="rn-form-grid">
          <div class="rn-field">
            <label>${tr('Teks yang Disisipkan:')}</label>
            <input type="text" class="rn-input-text" data-rn-param="text" data-rn-id="${rule.id}" value="${esc(p.text || '')}" placeholder="${tr('Misal: [Draf] atau _v1')}">
          </div>
          <div class="rn-field">
            <label>${tr('Posisi Sisip:')}</label>
            <select class="rn-select-clean" data-rn-param="position" data-rn-id="${rule.id}">
              <option value="prefix" ${p.position === 'prefix' ? 'selected' : ''}>${tr('Awalan (Di Paling Depan)')}</option>
              <option value="suffix" ${p.position === 'suffix' ? 'selected' : ''}>${tr('Akhiran (Di Belakang Nama)')}</option>
              <option value="index" ${p.position === 'index' ? 'selected' : ''}>${tr('Posisi Karakter ke-N')}</option>
            </select>
          </div>
          ${p.position === 'index' ? `
            <div class="rn-field">
              <label>${tr('Posisi Indeks Huruf:')}</label>
              <input type="number" class="rn-input-text" data-rn-param="index" data-rn-id="${rule.id}" value="${p.index || 0}" min="0">
            </div>
          ` : ''}
        </div>
      `;

    case RULE_TYPES.NUMBERING:
      return `
        <div class="rn-form-grid">
          <div class="rn-field">
            <label>${tr('Mulai dari Nomor:')}</label>
            <input type="number" class="rn-input-text" data-rn-param="start" data-rn-id="${rule.id}" value="${p.start || 1}" min="0">
          </div>
          <div class="rn-field">
            <label>${tr('Format Digit (Padding 0):')}</label>
            <select class="rn-select-clean" data-rn-param="digits" data-rn-id="${rule.id}">
              <option value="1" ${p.digits === 1 ? 'selected' : ''}>1 Digit (1, 2, 3...)</option>
              <option value="2" ${p.digits === 2 ? 'selected' : ''}>2 Digit (01, 02, 03...)</option>
              <option value="3" ${p.digits === 3 ? 'selected' : ''}>3 Digit (001, 002, 003...)</option>
              <option value="4" ${p.digits === 4 ? 'selected' : ''}>4 Digit (0001, 0002...)</option>
            </select>
          </div>
          <div class="rn-field">
            <label>${tr('Posisi Nomor:')}</label>
            <select class="rn-select-clean" data-rn-param="position" data-rn-id="${rule.id}">
              <option value="suffix" ${p.position === 'suffix' ? 'selected' : ''}>${tr('Di Akhir Nama')}</option>
              <option value="prefix" ${p.position === 'prefix' ? 'selected' : ''}>${tr('Di Awal Nama')}</option>
              <option value="replace" ${p.position === 'replace' ? 'selected' : ''}>${tr('Ganti Seluruh Nama')}</option>
            </select>
          </div>
          <div class="rn-field">
            <label>${tr('Pemisah / Awalan:')}</label>
            <input type="text" class="rn-input-text" data-rn-param="prefix" data-rn-id="${rule.id}" value="${esc(p.prefix !== undefined ? p.prefix : '_')}" placeholder="Misal: _ atau -">
          </div>
        </div>
      `;

    case RULE_TYPES.CASE:
      return `
        <div class="rn-form-grid">
          <div class="rn-field">
            <label>${tr('Ubah Format Huruf:')}</label>
            <select class="rn-select-clean" data-rn-param="format" data-rn-id="${rule.id}">
              <option value="lower" ${p.format === 'lower' ? 'selected' : ''}>huruf kecil (lowercase)</option>
              <option value="upper" ${p.format === 'upper' ? 'selected' : ''}>HURUF BESAR (UPPERCASE)</option>
              <option value="title" ${p.format === 'title' ? 'selected' : ''}>Huruf Depan Besar (Title Case)</option>
              <option value="sentence" ${p.format === 'sentence' ? 'selected' : ''}>Kalimat Awal Besar (Sentence case)</option>
              <option value="kebab" ${p.format === 'kebab' ? 'selected' : ''}>kebab-case (pemisah strip -)</option>
              <option value="snake" ${p.format === 'snake' ? 'selected' : ''}>snake_case (pemisah garis bawah _)</option>
              <option value="camel" ${p.format === 'camel' ? 'selected' : ''}>camelCase</option>
            </select>
          </div>
          <div class="rn-field">
            <label>${tr('Bagian yang Diubah:')}</label>
            <select class="rn-select-clean" data-rn-param="target" data-rn-id="${rule.id}">
              <option value="base" ${p.target === 'base' ? 'selected' : ''}>${tr('Nama Saja (Ekstensi Tetap)')}</option>
              <option value="ext" ${p.target === 'ext' ? 'selected' : ''}>${tr('Ekstensi Saja')}</option>
              <option value="all" ${p.target === 'all' ? 'selected' : ''}>${tr('Semua (Nama & Ekstensi)')}</option>
            </select>
          </div>
        </div>
      `;

    case RULE_TYPES.TRIM:
      return `
        <div class="rn-form-grid">
          <div class="rn-field">
            <label>${tr('Mode Pangkas:')}</label>
            <select class="rn-select-clean" data-rn-param="mode" data-rn-id="${rule.id}">
              <option value="spaces" ${p.mode === 'spaces' ? 'selected' : ''}>${tr('Rapikan Spasi Ganda & Ujung')}</option>
              <option value="start" ${p.mode === 'start' ? 'selected' : ''}>${tr('Hapus N Karakter Awal')}</option>
              <option value="end" ${p.mode === 'end' ? 'selected' : ''}>${tr('Hapus N Karakter Akhir')}</option>
              <option value="chars" ${p.mode === 'chars' ? 'selected' : ''}>${tr('Hapus Karakter Khusus Tertentu')}</option>
            </select>
          </div>
          ${p.mode === 'start' || p.mode === 'end' ? `
            <div class="rn-field">
              <label>${tr('Jumlah Karakter:')}</label>
              <input type="number" class="rn-input-text" data-rn-param="count" data-rn-id="${rule.id}" value="${p.count || 0}" min="1">
            </div>
          ` : ''}
          ${p.mode === 'chars' ? `
            <div class="rn-field">
              <label>${tr('Karakter yang Dihapus:')}</label>
              <input type="text" class="rn-input-text" data-rn-param="chars" data-rn-id="${rule.id}" value="${esc(p.chars || '')}" placeholder="Misal: -_">
            </div>
          ` : ''}
        </div>
      `;

    case RULE_TYPES.EXTENSION:
      return `
        <div class="rn-form-grid">
          <div class="rn-field">
            <label>${tr('Aksi Ekstensi:')}</label>
            <select class="rn-select-clean" data-rn-param="mode" data-rn-id="${rule.id}">
              <option value="lower" ${p.mode === 'lower' ? 'selected' : ''}>${tr('Seragamkan Huruf Kecil (.jpg)')}</option>
              <option value="upper" ${p.mode === 'upper' ? 'selected' : ''}>${tr('Seragamkan Huruf Besar (.JPG)')}</option>
              <option value="change" ${p.mode === 'change' ? 'selected' : ''}>${tr('Ganti Ekstensi Baru')}</option>
              <option value="remove" ${p.mode === 'remove' ? 'selected' : ''}>${tr('Hapus Ekstensi')}</option>
            </select>
          </div>
          ${p.mode === 'change' ? `
            <div class="rn-field">
              <label>${tr('Ekstensi Baru (tanpa titik):')}</label>
              <input type="text" class="rn-input-text" data-rn-param="newExt" data-rn-id="${rule.id}" value="${esc(p.newExt || '')}" placeholder="png">
            </div>
          ` : ''}
        </div>
      `;

    case RULE_TYPES.CLEAN:
      return `
        <div class="rn-form-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))">
          <label class="rn-field-inline"><input type="checkbox" data-rn-param-bool="removeWebSpam" data-rn-id="${rule.id}" ${p.removeWebSpam ? 'checked' : ''}> ${tr('Bersihkan %20 dan kode URL')}</label>
          <label class="rn-field-inline"><input type="checkbox" data-rn-param-bool="collapseSpaces" data-rn-id="${rule.id}" ${p.collapseSpaces ? 'checked' : ''}> ${tr('Rapikan spasi / strip berlebih')}</label>
          <label class="rn-field-inline"><input type="checkbox" data-rn-param-bool="sanitizeOS" data-rn-id="${rule.id}" ${p.sanitizeOS ? 'checked' : ''}> ${tr('Sanitasi karakter terlarang OS')}</label>
          <label class="rn-field-inline"><input type="checkbox" data-rn-param-bool="removeBrackets" data-rn-id="${rule.id}" ${p.removeBrackets ? 'checked' : ''}> ${tr('Hapus tanda kurung [ ] ( )')}</label>
        </div>
      `;

    case RULE_TYPES.TOKEN:
      return `
        <div class="rn-form-grid">
          <div class="rn-field" style="grid-column: 1 / -1">
            <label>${tr('Pola Format Berkas:')}</label>
            <input type="text" class="rn-input-text" data-rn-param="pattern" data-rn-id="${rule.id}" value="${esc(p.pattern || '{name}_{num}')}" placeholder="{date}_{name}_{num}">
          </div>
          <div class="rn-tokens-bar">
            <span style="font-size:11.5px;color:var(--muted);margin-right:2px">${tr('Klik untuk menyisipkan token:')}</span>
            <span class="rn-token-chip" data-rn-insert-token="{name}">{name}</span>
            <span class="rn-token-chip" data-rn-insert-token="{num}">{num}</span>
            <span class="rn-token-chip" data-rn-insert-token="{date}">{date}</span>
            <span class="rn-token-chip" data-rn-insert-token="{time}">{time}</span>
            <span class="rn-token-chip" data-rn-insert-token="{track}">{track}</span>
            <span class="rn-token-chip" data-rn-insert-token="{artist}">{artist}</span>
            <span class="rn-token-chip" data-rn-insert-token="{title}">{title}</span>
            <span class="rn-token-chip" data-rn-insert-token="{album}">{album}</span>
            <span class="rn-token-chip" data-rn-insert-token="{camera}">{camera}</span>
            <span class="rn-token-chip" data-rn-insert-token="{size}">{size}</span>
            <span class="rn-token-chip" data-rn-insert-token="{ext}">{ext}</span>
            <span class="rn-token-chip" data-rn-insert-token="{parent}">{parent}</span>
          </div>
        </div>
      `;

    default:
      return '';
  }
}

export function renamerView(state, pipelineResult) {
  const {
    files = [],
    rules = [],
    filter = 'all',
    searchQuery = '',
    sortBy = 'name-asc',
    collisionStrategy = 'warn',
    hasUndo = false,
  } = state;
  const {
    items = [],
    total = 0,
    changedCount = 0,
    conflictCount = 0,
    invalidCount = 0,
    hasErrors = false,
  } = pipelineResult;

  const totalSize = files.reduce((acc, f) => acc + (f.size || 0), 0);

  // Filter items
  let displayItems = items;
  if (filter === 'changed') {
    displayItems = items.filter(x => x.status === FILE_STATUS.OK);
  } else if (filter === 'conflict') {
    displayItems = items.filter(x => x.status === FILE_STATUS.CONFLICT || x.status === FILE_STATUS.INVALID);
  }

  // Filter pencarian
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    displayItems = displayItems.filter(
      x => x.originalName.toLowerCase().includes(q) || x.newName.toLowerCase().includes(q)
    );
  }

  return `
    <div class="rn-page">
      <!-- Header -->
      <div class="rn-head">
        <div class="rn-title-group">
          <h2>${tr('Ganti Nama Massal')}</h2>
          <p>${tr('Ubah dan rapikan nama banyak berkas atau isi ZIP secara terstruktur & aman')}</p>
        </div>
        <div class="rn-actions-top">
          <button class="btn btn-sec" data-rn-act="demo" title="${tr('Coba langsung dengan data contoh')}">
            <svg class="ico"><use href="#i-bulb"/></svg> ${tr('Contoh Demo')}
          </button>
          <button class="btn btn-sec" data-rn-act="presets" title="${tr('Gunakan resep siap pakai')}">
            <svg class="ico"><use href="#i-tpl"/></svg> ${tr('Resep Cepat')}
          </button>
          <button class="btn btn-sec" data-rn-act="save-preset" title="${tr('Simpan susunan aturan ini sebagai resep kustom')}">
            <svg class="ico"><use href="#i-copy"/></svg> ${tr('Simpan Resep')}
          </button>
          ${hasUndo ? `
            <button class="btn btn-sec" data-rn-act="undo" title="${tr('Batalkan ganti nama terakhir')}">
              <svg class="ico"><use href="#i-undo"/></svg> ${tr('Urungkan')}
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Sumber Berkas / Dropzone -->
      ${files.length === 0 ? `
        <div class="rn-dropzone" id="rn-dz">
          <div class="rn-dz-icon">
            <svg class="ico"><use href="#i-arch"/></svg>
          </div>
          <div class="rn-dz-title">${tr('Pilih Berkas, Folder, atau Berkas .ZIP')}</div>
          <div class="rn-dz-desc">${tr('Tarik berkas atau .ZIP ke sini. Berkas ZIP akan otomatis diekstrak isinya. Diproses 100% di perangkat Anda.')}</div>
          <div class="rn-dz-btns">
            <button class="btn btn-pri" data-rn-act="pick-folder">
              <svg class="ico"><use href="#i-arch"/></svg> ${tr('Pilih Folder')}
            </button>
            <button class="btn btn-sec" data-rn-act="pick-files">
              <svg class="ico"><use href="#i-plus"/></svg> ${tr('Pilih Berkas / .ZIP')}
            </button>
            <button class="btn btn-sec" data-rn-act="import-notes" title="${tr('Muat seluruh catatan yang ada di Hara untuk dirapikan / diekspor')}">
              <svg class="ico"><use href="#i-note"/></svg> ${tr('Catatan Hara')}
            </button>
            <button class="btn btn-sec" data-rn-act="demo">
              <svg class="ico"><use href="#i-bulb"/></svg> ${tr('Muat Contoh')}
            </button>
          </div>
          <input type="file" id="rn-file-input" multiple style="display:none">
          <input type="file" id="rn-folder-input" webkitdirectory multiple style="display:none">
        </div>
      ` : `
        <div class="rn-source-bar">
          <div class="rn-source-info">
            <div class="rn-source-icon">
              <svg class="ico"><use href="#i-arch"/></svg>
            </div>
            <div class="rn-source-text">
              <div class="title">${tr('{n} berkas siap diolah', { n: files.length })}</div>
              <div class="meta">${formatFileSize(totalSize)} · ${files[0].path ? esc(files[0].path) : tr('Penyimpanan lokal')}</div>
            </div>
          </div>
          <div class="rn-source-controls">
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:12px;color:var(--muted)">${tr('Urut:')}</span>
              <select class="rn-select-clean" id="rn-sort-select" style="height:32px;width:auto;font-size:12px">
                <option value="name-asc" ${sortBy === 'name-asc' ? 'selected' : ''}>Nama Asli (A–Z)</option>
                <option value="name-desc" ${sortBy === 'name-desc' ? 'selected' : ''}>Nama Asli (Z–A)</option>
                <option value="date-asc" ${sortBy === 'date-asc' ? 'selected' : ''}>Tanggal (Lama ➔ Baru)</option>
                <option value="date-desc" ${sortBy === 'date-desc' ? 'selected' : ''}>Tanggal (Baru ➔ Lama)</option>
                <option value="size-asc" ${sortBy === 'size-asc' ? 'selected' : ''}>Ukuran (Kecil ➔ Besar)</option>
                <option value="size-desc" ${sortBy === 'size-desc' ? 'selected' : ''}>Ukuran (Besar ➔ Kecil)</option>
              </select>
            </div>
            <button class="btn btn-sec" data-rn-act="pick-files" style="height:32px;font-size:12px">
              <svg class="ico"><use href="#i-plus"/></svg> ${tr('Tambah / ZIP')}
            </button>
            <button class="btn btn-sec" data-rn-act="pick-folder" style="height:32px;font-size:12px">
              <svg class="ico"><use href="#i-arch"/></svg> ${tr('Folder')}
            </button>
            <button class="btn btn-sec" data-rn-act="clear-files" style="height:32px;font-size:12px;color:var(--danger)">
              <svg class="ico"><use href="#i-trash"/></svg> ${tr('Kosongkan')}
            </button>
          </div>
          <input type="file" id="rn-file-input" multiple style="display:none">
          <input type="file" id="rn-folder-input" webkitdirectory multiple style="display:none">
        </div>
      `}

      <!-- Rantai Aturan (Pipeline Builder) -->
      <div class="rn-card">
        <div class="rn-card-head">
          <div class="rn-card-title">
            <svg class="ico"><use href="#i-listol"/></svg>
            ${tr('Aturan Transformasi (Pipeline)')}
            <span class="chip chip-a">${rules.filter(r => r.enabled).length}/${rules.length}</span>
          </div>
          <div class="rn-actions-top">
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:12px;color:var(--muted)">${tr('Konflik:')}</span>
              <select class="rn-select-clean" id="rn-collision-select" style="height:30px;width:auto;font-size:12px">
                <option value="warn" ${collisionStrategy === 'warn' ? 'selected' : ''}>${tr('Peringatkan / Blokir')}</option>
                <option value="auto-number-parens" ${collisionStrategy === 'auto-number-parens' ? 'selected' : ''}>${tr('Auto-nomor (1), (2)')}</option>
                <option value="auto-number-underscore" ${collisionStrategy === 'auto-number-underscore' ? 'selected' : ''}>${tr('Auto-nomor _1, _2')}</option>
              </select>
            </div>
            <button class="btn btn-sec" data-rn-act="add-rule" style="height:30px;font-size:12px">
              <svg class="ico"><use href="#i-plus"/></svg> ${tr('Tambah Aturan')}
            </button>
          </div>
        </div>

        <div class="rn-rules-list">
          ${rules.length === 0 ? `
            <div class="rn-empty-rules">
              ${tr('Belum ada aturan aktif. Klik "+ Tambah Aturan" atau gunakan "Resep Cepat" di atas.')}
            </div>
          ` : rules.map((rule, idx) => {
            const meta = RULE_METADATA[rule.type] || { label: rule.type, icon: 'i-cog' };
            return `
              <div class="rn-rule-item ${rule.enabled ? '' : 'disabled'}" data-rule-card="${rule.id}">
                <div class="rn-rule-header-row">
                  <div class="rn-rule-left">
                    <div class="rn-rule-order-btns">
                      <button class="rn-btn-micro" data-rn-act="move-up" data-rn-id="${rule.id}" ${idx === 0 ? 'disabled' : ''} title="${tr('Pindah ke atas')}">▲</button>
                      <button class="rn-btn-micro" data-rn-act="move-down" data-rn-id="${rule.id}" ${idx === rules.length - 1 ? 'disabled' : ''} title="${tr('Pindah ke bawah')}">▼</button>
                    </div>
                    <input type="checkbox" data-rn-act="toggle-rule" data-rn-id="${rule.id}" ${rule.enabled ? 'checked' : ''} title="${tr('Aktifkan/nonaktifkan aturan')}" style="cursor:pointer">
                    <span class="rn-rule-tag">${meta.label}</span>
                    <span class="rn-rule-desc">${meta.desc}</span>
                  </div>
                  <div>
                    <button class="rn-btn-micro" data-rn-act="del-rule" data-rn-id="${rule.id}" title="${tr('Hapus aturan')}" style="color:var(--danger)">
                      <svg class="ico" style="width:13px;height:13px"><use href="#i-x"/></svg>
                    </button>
                  </div>
                </div>
                <div>
                  ${renderRuleInputs(rule)}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Live Preview Table -->
      <div class="rn-card">
        <div class="rn-card-head">
          <div class="rn-card-title">
            <svg class="ico"><use href="#i-search"/></svg>
            ${tr('Live Preview')}
          </div>
          <div class="rn-actions-top">
            <input type="text" class="rn-input-text" id="rn-search-preview" style="height:30px;width:180px;font-size:12px" placeholder="${tr('Saring hasil...')}" value="${esc(searchQuery)}">
          </div>
        </div>

        <div class="rn-table-toolbar">
          <div class="rn-filter-tabs">
            <button class="rn-filter-btn ${filter === 'all' ? 'active' : ''}" data-rn-filter="all">${tr('Semua')} (${total})</button>
            <button class="rn-filter-btn ${filter === 'changed' ? 'active' : ''}" data-rn-filter="changed">${tr('Berubah')} (${changedCount})</button>
            <button class="rn-filter-btn ${filter === 'conflict' ? 'active' : ''}" data-rn-filter="conflict" style="${conflictCount > 0 ? 'color:var(--danger)' : ''}">
              ${tr('Konflik / Error')} (${conflictCount + invalidCount})
            </button>
          </div>
        </div>

        <div class="rn-table-container">
          ${displayItems.length === 0 ? `
            <div style="padding:40px;text-align:center;color:var(--muted)">
              ${files.length === 0 ? tr('Belum ada berkas untuk dipratinjau') : tr('Tidak ada berkas yang sesuai filter')}
            </div>
          ` : `
            <table class="rn-preview-table">
              <thead>
                <tr>
                  <th style="width:5%;text-align:center">#</th>
                  <th style="width:40%">${tr('Nama Asli')}</th>
                  <th class="rn-arrow-cell"></th>
                  <th style="width:40%">${tr('Nama Baru')}</th>
                  <th style="width:15%;text-align:right">${tr('Status')}</th>
                </tr>
              </thead>
              <tbody>
                ${displayItems.map((item, rowIdx) => {
                  const isChanged = item.status === FILE_STATUS.OK;
                  const isConflict = item.status === FILE_STATUS.CONFLICT;
                  const isInvalid = item.status === FILE_STATUS.INVALID;

                  let badgeClass = 'rn-pill-same';
                  let badgeText = tr('Sama');
                  if (isChanged) {
                    badgeClass = 'rn-pill-ok';
                    badgeText = tr('Siap');
                  } else if (isConflict) {
                    badgeClass = 'rn-pill-conflict';
                    badgeText = tr('Konflik');
                  } else if (isInvalid) {
                    badgeClass = 'rn-pill-invalid';
                    badgeText = tr('Invalid');
                  }

                  return `
                    <tr title="${item.errorMsg ? esc(item.errorMsg) : ''}">
                      <td style="text-align:center;padding:6px 4px">
                        <div style="display:flex;align-items:center;justify-content:center;gap:2px">
                          <button class="rn-btn-micro" data-rn-act="file-up" data-rn-id="${item.id}" ${rowIdx === 0 ? 'disabled' : ''} title="${tr('Pindah ke atas')}">▲</button>
                          <button class="rn-btn-micro" data-rn-act="file-down" data-rn-id="${item.id}" ${rowIdx === displayItems.length - 1 ? 'disabled' : ''} title="${tr('Pindah ke bawah')}">▼</button>
                        </div>
                      </td>
                      <td>
                        <div class="rn-name-old">${esc(item.originalName)}</div>
                      </td>
                      <td class="rn-arrow-cell">➔</td>
                      <td>
                        <div class="rn-name-target ${isChanged ? 'is-changed' : ''}">${esc(item.newName)}</div>
                        ${item.errorMsg ? `<div style="font-size:11px;color:var(--danger);margin-top:2px">${esc(item.errorMsg)}</div>` : ''}
                      </td>
                      <td style="text-align:right">
                        <span class="rn-pill ${badgeClass}">${badgeText}</span>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>

      <!-- Bilah Aksi Bawah (Sticky Bottom Action Bar) -->
      ${files.length > 0 ? `
        <div class="rn-footer-bar">
          <div class="rn-footer-info">
            <b>${total}</b> ${tr('berkas')} · <span style="color:var(--accent)"><b>${changedCount}</b> ${tr('akan diubah')}</span>
            ${conflictCount > 0 ? ` · <span class="rn-footer-error"><b>${conflictCount}</b> ${tr('konflik nama')}</span>` : ''}
            ${invalidCount > 0 ? ` · <span class="rn-footer-error"><b>${invalidCount}</b> ${tr('tidak valid')}</span>` : ''}
          </div>
          <div class="rn-actions-top">
            <button class="btn btn-sec" data-rn-act="config-zip-name" title="${tr('Ubah nama berkas .zip hasil unduhan')}">
              <svg class="ico"><use href="#i-cog"/></svg> <span style="font-family:var(--mono);font-size:12px">${esc(state.exportZipName || 'Arsip_Terganti_Nama.zip')}</span>
            </button>
            <button class="btn btn-sec" data-rn-act="export-zip" ${hasErrors || changedCount === 0 ? 'disabled style="opacity:.5;cursor:not-allowed"' : ''} title="${tr('Unduh semua berkas dengan nama baru ke berkas ZIP')}">
              <svg class="ico"><use href="#i-dl"/></svg> ${tr('Unduh ZIP')}
            </button>
            <button class="btn btn-pri" data-rn-act="apply-rename" ${hasErrors || changedCount === 0 ? 'disabled style="opacity:.5;cursor:not-allowed"' : ''}>
              <svg class="ico"><use href="#i-pen"/></svg> ${tr('Ganti Nama ({n} Berkas)', { n: changedCount })}
            </button>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}
