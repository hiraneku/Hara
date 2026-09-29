/**
 * Tampilan & Antarmuka Pengguna Modul Bulk Renamer — Hara
 */

import { esc } from '../core/dom.js?v=20260929100848';
import { t as tr } from '../core/i18n.js?v=20260929100848';
import {
  RULE_TYPES,
  RULE_METADATA,
  FILE_STATUS,
  formatFileSize,
} from './model.js?v=20260929100848';

export function renderRuleInputs(rule) {
  const p = rule.params || {};
  switch (rule.type) {
    case RULE_TYPES.REPLACE:
      return `
        <div class="rn-input-group">
          <label>${tr('Cari:')}</label>
          <input type="text" class="rn-input" data-rn-param="find" data-rn-id="${rule.id}" value="${esc(p.find || '')}" placeholder="${tr('Teks yang dicari')}">
        </div>
        <div class="rn-input-group">
          <label>${tr('Ganti jadi:')}</label>
          <input type="text" class="rn-input" data-rn-param="replaceWith" data-rn-id="${rule.id}" value="${esc(p.replaceWith || '')}" placeholder="${tr('Teks baru')}">
        </div>
        <div class="rn-input-group" style="margin-left:auto">
          <label><input type="checkbox" data-rn-param-bool="matchCase" data-rn-id="${rule.id}" ${p.matchCase ? 'checked' : ''}> ${tr('Huruf peka (Aa)')}</label>
          <label style="margin-left:8px"><input type="checkbox" data-rn-param-bool="isRegex" data-rn-id="${rule.id}" ${p.isRegex ? 'checked' : ''}> Regex</label>
        </div>
      `;

    case RULE_TYPES.INSERT:
      return `
        <div class="rn-input-group">
          <label>${tr('Teks:')}</label>
          <input type="text" class="rn-input" data-rn-param="text" data-rn-id="${rule.id}" value="${esc(p.text || '')}" placeholder="${tr('Teks sisipan')}">
        </div>
        <div class="rn-input-group">
          <label>${tr('Posisi:')}</label>
          <select class="rn-select" data-rn-param="position" data-rn-id="${rule.id}">
            <option value="prefix" ${p.position === 'prefix' ? 'selected' : ''}>${tr('Awalan (Depan)')}</option>
            <option value="suffix" ${p.position === 'suffix' ? 'selected' : ''}>${tr('Akhiran (Belakang)')}</option>
            <option value="index" ${p.position === 'index' ? 'selected' : ''}>${tr('Posisi Huruf ke-N')}</option>
          </select>
        </div>
        ${p.position === 'index' ? `
          <div class="rn-input-group">
            <label>${tr('Indeks:')}</label>
            <input type="number" class="rn-input" style="width:70px" data-rn-param="index" data-rn-id="${rule.id}" value="${p.index || 0}" min="0">
          </div>
        ` : ''}
      `;

    case RULE_TYPES.NUMBERING:
      return `
        <div class="rn-input-group">
          <label>${tr('Mulai:')}</label>
          <input type="number" class="rn-input" style="width:65px" data-rn-param="start" data-rn-id="${rule.id}" value="${p.start || 1}" min="0">
        </div>
        <div class="rn-input-group">
          <label>${tr('Digit (001):')}</label>
          <select class="rn-select" data-rn-param="digits" data-rn-id="${rule.id}">
            <option value="1" ${p.digits === 1 ? 'selected' : ''}>1 (1, 2, 3)</option>
            <option value="2" ${p.digits === 2 ? 'selected' : ''}>2 (01, 02)</option>
            <option value="3" ${p.digits === 3 ? 'selected' : ''}>3 (001, 002)</option>
            <option value="4" ${p.digits === 4 ? 'selected' : ''}>4 (0001, 0002)</option>
          </select>
        </div>
        <div class="rn-input-group">
          <label>${tr('Posisi:')}</label>
          <select class="rn-select" data-rn-param="position" data-rn-id="${rule.id}">
            <option value="suffix" ${p.position === 'suffix' ? 'selected' : ''}>${tr('Akhir Nama')}</option>
            <option value="prefix" ${p.position === 'prefix' ? 'selected' : ''}>${tr('Awal Nama')}</option>
            <option value="replace" ${p.position === 'replace' ? 'selected' : ''}>${tr('Ganti Seluruh Nama')}</option>
          </select>
        </div>
        <div class="rn-input-group">
          <label>${tr('Pemisah:')}</label>
          <input type="text" class="rn-input" style="width:60px" data-rn-param="prefix" data-rn-id="${rule.id}" value="${esc(p.prefix || '')}" placeholder="_">
        </div>
      `;

    case RULE_TYPES.CASE:
      return `
        <div class="rn-input-group">
          <label>${tr('Ubah ke:')}</label>
          <select class="rn-select" data-rn-param="format" data-rn-id="${rule.id}">
            <option value="lower" ${p.format === 'lower' ? 'selected' : ''}>huruf kecil (lowercase)</option>
            <option value="upper" ${p.format === 'upper' ? 'selected' : ''}>HURUF BESAR (UPPERCASE)</option>
            <option value="title" ${p.format === 'title' ? 'selected' : ''}>Huruf Depan Besar (Title Case)</option>
            <option value="sentence" ${p.format === 'sentence' ? 'selected' : ''}>Kalimat (Sentence case)</option>
            <option value="kebab" ${p.format === 'kebab' ? 'selected' : ''}>kebab-case (pemisah strip)</option>
            <option value="snake" ${p.format === 'snake' ? 'selected' : ''}>snake_case (pemisah garis bawah)</option>
            <option value="camel" ${p.format === 'camel' ? 'selected' : ''}>camelCase</option>
          </select>
        </div>
        <div class="rn-input-group">
          <label>${tr('Target:')}</label>
          <select class="rn-select" data-rn-param="target" data-rn-id="${rule.id}">
            <option value="base" ${p.target === 'base' ? 'selected' : ''}>${tr('Nama Saja (tanpa ekstensi)')}</option>
            <option value="ext" ${p.target === 'ext' ? 'selected' : ''}>${tr('Ekstensi Saja')}</option>
            <option value="all" ${p.target === 'all' ? 'selected' : ''}>${tr('Semua (Nama & Ekstensi)')}</option>
          </select>
        </div>
      `;

    case RULE_TYPES.TRIM:
      return `
        <div class="rn-input-group">
          <label>${tr('Mode Pangkas:')}</label>
          <select class="rn-select" data-rn-param="mode" data-rn-id="${rule.id}">
            <option value="spaces" ${p.mode === 'spaces' ? 'selected' : ''}>${tr('Rapikan Spasi Ganda & Ujung')}</option>
            <option value="start" ${p.mode === 'start' ? 'selected' : ''}>${tr('Hapus N Karakter Awal')}</option>
            <option value="end" ${p.mode === 'end' ? 'selected' : ''}>${tr('Hapus N Karakter Akhir')}</option>
            <option value="chars" ${p.mode === 'chars' ? 'selected' : ''}>${tr('Hapus Karakter Khusus')}</option>
          </select>
        </div>
        ${p.mode === 'start' || p.mode === 'end' ? `
          <div class="rn-input-group">
            <label>${tr('Jumlah Karakter:')}</label>
            <input type="number" class="rn-input" style="width:70px" data-rn-param="count" data-rn-id="${rule.id}" value="${p.count || 0}" min="1">
          </div>
        ` : ''}
        ${p.mode === 'chars' ? `
          <div class="rn-input-group">
            <label>${tr('Karakter:')}</label>
            <input type="text" class="rn-input" style="width:100px" data-rn-param="chars" data-rn-id="${rule.id}" value="${esc(p.chars || '')}" placeholder="-_">
          </div>
        ` : ''}
      `;

    case RULE_TYPES.EXTENSION:
      return `
        <div class="rn-input-group">
          <label>${tr('Aksi Ekstensi:')}</label>
          <select class="rn-select" data-rn-param="mode" data-rn-id="${rule.id}">
            <option value="lower" ${p.mode === 'lower' ? 'selected' : ''}>${tr('Seragamkan Huruf Kecil (.jpg)')}</option>
            <option value="upper" ${p.mode === 'upper' ? 'selected' : ''}>${tr('Seragamkan Huruf Besar (.JPG)')}</option>
            <option value="change" ${p.mode === 'change' ? 'selected' : ''}>${tr('Ganti Ekstensi Baru')}</option>
            <option value="remove" ${p.mode === 'remove' ? 'selected' : ''}>${tr('Hapus Ekstensi')}</option>
          </select>
        </div>
        ${p.mode === 'change' ? `
          <div class="rn-input-group">
            <label>${tr('Ekstensi Baru:')}</label>
            <input type="text" class="rn-input" style="width:80px" data-rn-param="newExt" data-rn-id="${rule.id}" value="${esc(p.newExt || '')}" placeholder="png">
          </div>
        ` : ''}
      `;

    case RULE_TYPES.CLEAN:
      return `
        <div class="rn-input-group" style="flex-wrap:wrap;gap:12px">
          <label><input type="checkbox" data-rn-param-bool="removeWebSpam" data-rn-id="${rule.id}" ${p.removeWebSpam ? 'checked' : ''}> ${tr('Bersihkan %20 dan kode web')}</label>
          <label><input type="checkbox" data-rn-param-bool="collapseSpaces" data-rn-id="${rule.id}" ${p.collapseSpaces ? 'checked' : ''}> ${tr('Rapikan spasi/garis bawah berlebih')}</label>
          <label><input type="checkbox" data-rn-param-bool="sanitizeOS" data-rn-id="${rule.id}" ${p.sanitizeOS ? 'checked' : ''}> ${tr('Hapus karakter ilegal OS')}</label>
          <label><input type="checkbox" data-rn-param-bool="removeBrackets" data-rn-id="${rule.id}" ${p.removeBrackets ? 'checked' : ''}> ${tr('Hapus tanda kurung [ ] ( )')}</label>
        </div>
      `;

    case RULE_TYPES.TOKEN:
      return `
        <div class="rn-input-group" style="width:100%">
          <label>${tr('Pola:')}</label>
          <input type="text" class="rn-input" style="flex:1" data-rn-param="pattern" data-rn-id="${rule.id}" value="${esc(p.pattern || '{name}_{num}')}" placeholder="{date}_{name}_{num}">
        </div>
        <div style="font-size:11px;color:var(--muted);display:flex;gap:6px;flex-wrap:wrap;margin-top:2px">
          <span>${tr('Token tersedia:')}</span>
          <code style="cursor:pointer" data-rn-insert-token="{name}">{name}</code>
          <code style="cursor:pointer" data-rn-insert-token="{num}">{num}</code>
          <code style="cursor:pointer" data-rn-insert-token="{date}">{date}</code>
          <code style="cursor:pointer" data-rn-insert-token="{ext}">{ext}</code>
          <code style="cursor:pointer" data-rn-insert-token="{parent}">{parent}</code>
        </div>
      `;

    default:
      return '';
  }
}

export function renamerView(state, pipelineResult) {
  const { files = [], rules = [], filter = 'all', hasUndo = false } = state;
  const { items = [], total = 0, changedCount = 0, conflictCount = 0, invalidCount = 0, hasErrors = false } = pipelineResult;

  const totalSize = files.reduce((acc, f) => acc + (f.size || 0), 0);

  // Filter items
  let displayItems = items;
  if (filter === 'changed') {
    displayItems = items.filter(x => x.status === FILE_STATUS.OK);
  } else if (filter === 'conflict') {
    displayItems = items.filter(x => x.status === FILE_STATUS.CONFLICT || x.status === FILE_STATUS.INVALID);
  }

  return `
    <div class="rn-page">
      <!-- Header -->
      <div class="rn-head">
        <div class="rn-title-group">
          <h2>${tr('Ganti Nama Massal')}</h2>
          <p>${tr('Ubah dan rapikan nama banyak berkas sekaligus dengan aman & live preview')}</p>
        </div>
        <div class="rn-actions-top">
          <button class="btn btn-sec" data-rn-act="demo" title="${tr('Coba langsung dengan data contoh')}">
            <svg class="ico"><use href="#i-bulb"/></svg> ${tr('Contoh Demo')}
          </button>
          <button class="btn btn-sec" data-rn-act="presets" title="${tr('Gunakan resep siap pakai')}">
            <svg class="ico"><use href="#i-tpl"/></svg> ${tr('Resep Cepat')}
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
          <div class="rn-dz-title">${tr('Pilih Berkas atau Folder untuk Diganti Nama')}</div>
          <div class="rn-dz-desc">${tr('Tarik berkas ke sini, atau pilih dari penyimpanan perangkat. Semua diproses langsung di perangkat Anda (local-first).')}</div>
          <div class="rn-dz-btns">
            <button class="btn btn-pri" data-rn-act="pick-folder">
              <svg class="ico"><use href="#i-arch"/></svg> ${tr('Pilih Folder')}
            </button>
            <button class="btn btn-sec" data-rn-act="pick-files">
              <svg class="ico"><use href="#i-plus"/></svg> ${tr('Pilih Berkas')}
            </button>
            <button class="btn btn-sec" data-rn-act="demo">
              <svg class="ico"><use href="#i-bulb"/></svg> ${tr('Muat Berkas Contoh')}
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
              <div class="title">${tr('{n} berkas dipilih', { n: files.length })}</div>
              <div class="meta">${formatFileSize(totalSize)} · ${files[0].path ? files[0].path : tr('Penyimpanan lokal')}</div>
            </div>
          </div>
          <div class="rn-actions-top">
            <button class="btn btn-sec" data-rn-act="pick-files" style="height:32px;font-size:12px">
              <svg class="ico"><use href="#i-plus"/></svg> ${tr('Tambah')}
            </button>
            <button class="btn btn-sec" data-rn-act="pick-folder" style="height:32px;font-size:12px">
              <svg class="ico"><use href="#i-arch"/></svg> ${tr('Ganti Folder')}
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
      <div class="rn-section-card">
        <div class="rn-sec-header">
          <div class="rn-sec-title">
            <svg class="ico" style="color:var(--accent)"><use href="#i-listol"/></svg>
            ${tr('Aturan Transformasi (Pipeline)')}
            <span class="chip chip-a">${rules.filter(r => r.enabled).length}/${rules.length}</span>
          </div>
          <div class="rn-actions-top">
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
              <div class="rn-rule-card ${rule.enabled ? '' : 'disabled'}" data-rule-card="${rule.id}">
                <div class="rn-rule-head">
                  <div class="rn-rule-reorder">
                    <button class="rn-btn-micro" data-rn-act="move-up" data-rn-id="${rule.id}" ${idx === 0 ? 'disabled style="opacity:.3"' : ''} title="${tr('Pindah ke atas')}">▲</button>
                    <button class="rn-btn-micro" data-rn-act="move-down" data-rn-id="${rule.id}" ${idx === rules.length - 1 ? 'disabled style="opacity:.3"' : ''} title="${tr('Pindah ke bawah')}">▼</button>
                  </div>
                  <input type="checkbox" data-rn-act="toggle-rule" data-rn-id="${rule.id}" ${rule.enabled ? 'checked' : ''} title="${tr('Aktifkan/nonaktifkan aturan')}">
                  <div class="rn-rule-info">
                    <span class="rn-rule-type-badge">${meta.label}</span>
                  </div>
                  <div class="rn-rule-actions">
                    <button class="rn-btn-micro" data-rn-act="del-rule" data-rn-id="${rule.id}" title="${tr('Hapus aturan')}" style="color:var(--danger)">
                      <svg class="ico" style="width:14px;height:14px"><use href="#i-x"/></svg>
                    </button>
                  </div>
                </div>
                <div class="rn-rule-body">
                  ${renderRuleInputs(rule)}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Live Preview Table -->
      <div class="rn-section-card">
        <div class="rn-sec-header">
          <div class="rn-sec-title">
            <svg class="ico" style="color:var(--accent)"><use href="#i-search"/></svg>
            ${tr('Live Preview')}
          </div>
          <div class="rn-preview-tabs">
            <button class="rn-tab ${filter === 'all' ? 'on' : ''}" data-rn-filter="all">${tr('Semua')} (${total})</button>
            <button class="rn-tab ${filter === 'changed' ? 'on' : ''}" data-rn-filter="changed">${tr('Berubah')} (${changedCount})</button>
            <button class="rn-tab ${filter === 'conflict' ? 'on' : ''}" data-rn-filter="conflict" style="${conflictCount > 0 ? 'color:var(--danger)' : ''}">
              ${tr('Konflik')} (${conflictCount + invalidCount})
            </button>
          </div>
        </div>

        <div class="rn-table-wrap">
          ${displayItems.length === 0 ? `
            <div style="padding:40px;text-align:center;color:var(--muted)">
              ${files.length === 0 ? tr('Belum ada berkas untuk dipratinjau') : tr('Tidak ada berkas yang sesuai filter')}
            </div>
          ` : `
            <table class="rn-table">
              <thead>
                <tr>
                  <th style="width:42%">${tr('Nama Asli')}</th>
                  <th style="width:5%;text-align:center"></th>
                  <th style="width:42%">${tr('Nama Baru')}</th>
                  <th style="width:11%;text-align:right">${tr('Status')}</th>
                </tr>
              </thead>
              <tbody>
                ${displayItems.map(item => {
                  const isChanged = item.status === FILE_STATUS.OK;
                  const isConflict = item.status === FILE_STATUS.CONFLICT;
                  const isInvalid = item.status === FILE_STATUS.INVALID;

                  let badgeClass = 'rn-badge-unchanged';
                  let badgeText = tr('Sama');
                  if (isChanged) {
                    badgeClass = 'rn-badge-ok';
                    badgeText = tr('Siap');
                  } else if (isConflict) {
                    badgeClass = 'rn-badge-conflict';
                    badgeText = tr('Konflik');
                  } else if (isInvalid) {
                    badgeClass = 'rn-badge-invalid';
                    badgeText = tr('Invalid');
                  }

                  return `
                    <tr title="${item.errorMsg ? esc(item.errorMsg) : ''}">
                      <td>
                        <div class="rn-name-orig">${esc(item.originalName)}</div>
                      </td>
                      <td style="text-align:center">
                        <span class="rn-arrow">➔</span>
                      </td>
                      <td>
                        <div class="rn-name-new ${isChanged ? 'changed' : ''}">${esc(item.newName)}</div>
                        ${item.errorMsg ? `<div style="font-size:11px;color:var(--danger);margin-top:2px">${esc(item.errorMsg)}</div>` : ''}
                      </td>
                      <td style="text-align:right">
                        <span class="rn-badge ${badgeClass}">${badgeText}</span>
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
        <div class="rn-bottom-bar">
          <div class="rn-summary">
            <b>${total}</b> ${tr('berkas')} · <span style="color:var(--accent)"><b>${changedCount}</b> ${tr('akan diubah')}</span>
            ${conflictCount > 0 ? ` · <span class="rn-summary-err"><b>${conflictCount}</b> ${tr('konflik terdeteksi!')}</span>` : ''}
          </div>
          <div class="rn-actions-top">
            <button class="btn btn-pri" data-rn-act="apply-rename" ${hasErrors || changedCount === 0 ? 'disabled style="opacity:.5;cursor:not-allowed"' : ''}>
              <svg class="ico"><use href="#i-pen"/></svg> ${tr('Ganti Nama ({n} Berkas)', { n: changedCount })}
            </button>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}
