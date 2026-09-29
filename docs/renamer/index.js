/**
 * Modul Bulk Renamer — Hara
 *
 * Mengikuti kontrak modul Hara:
 * - registerViews ke router
 * - state management independen
 * - integrasi UI, preset, file picker, auto ZIP extractor, audio ID3 metadata parser, EXIF parser, manual reordering, dan ekspor catatan Hara
 */

import { registerViews, onAfterRender, cur, go } from '../core/router.js?v=20260929151703';
import { toast } from '../core/toast.js?v=20260929151703';
import { t as tr } from '../core/i18n.js?v=20260929151703';
import { openPop, closeAll } from '../notes/menus/pop.js?v=20260929151703';
import { unduh, markdownDariCatatan, namaBerkasAman } from '../notes/data-io.js?v=20260929151703';
import { state as haraStoreState } from '../core/store.js?v=20260929151703';
import { esc } from '../core/dom.js?v=20260929151703';
import {
  createRenamerItem,
  createRule,
  cloneRule,
  RULE_TYPES,
  RULE_METADATA,
  DEFAULT_PRESETS,
  FILE_STATUS,
  formatFileSize,
  sanitizeFileName,
} from './model.js?v=20260929151703';
import { runPipeline, sortFiles } from './engine.js?v=20260929151703';
import {
  renamerView,
  filterAndSearchItems,
  renderFilterTabsContent,
  renderTableContainerContent,
  renderFooterBar,
} from './view.js?v=20260929151703';
import { createZipBlob } from './zip.js?v=20260929151703';
import { extractZip, CATEGORY_LABELS } from './unzip.js?v=20260929151703';
import { parseExif } from './exif.js?v=20260929151703';
import { parseId3 } from './id3.js?v=20260929151703';

const CUSTOM_PRESETS_KEY = 'hara.renamer.custom_presets';

function muatCustomPresets() {
  try {
    const raw = localStorage.getItem(CUSTOM_PRESETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function simpanCustomPresets(list) {
  try {
    localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(list));
  } catch (e) {}
}

// State internal modul renamer
export const renamerState = {
  files: [],
  rules: [
    createRule(RULE_TYPES.CLEAN, { removeWebSpam: true, collapseSpaces: true, sanitizeOS: true }),
    createRule(RULE_TYPES.CASE, { target: 'base', format: 'kebab' }),
    createRule(RULE_TYPES.EXTENSION, { mode: 'lower' }),
  ],
  filter: 'all',
  searchQuery: '',
  sortBy: 'name-asc',
  collisionStrategy: 'warn',
  exportZipName: 'Arsip_Terganti_Nama.zip',
  undoStack: [],
  directoryHandle: null,
};

// State sementara dialog ekstraksi ZIP
let _pendingZipExtract = null;

// Data contoh untuk demo instan (termasuk simulasi EXIF kamera & Audio ID3)
const SAMPLE_DEMO_FILES = [
  { name: 'IMG_2026_09_29%20(1).JPG', camera: 'Sony A7IV', date: new Date('2026-09-29T10:15:00'), id3: null },
  { name: 'IMG_2026_09_29%20(2).JPG', camera: 'Sony A7IV', date: new Date('2026-09-29T10:16:30'), id3: null },
  { name: 'Track_01_Audio.mp3', camera: null, date: null, id3: { artist: 'NIKI', title: 'High School in Jakarta', track: '01', album: 'Nicole' } },
  { name: 'Track_02_Audio.mp3', camera: null, date: null, id3: { artist: 'NIKI', title: 'Backburner', track: '02', album: 'Nicole' } },
  { name: 'Draft%20Laporan%20Keuangan%20[FINAL].docx', camera: null, date: null, id3: null },
  { name: 'Manga_Ch01_Page (1).PNG', camera: null, date: null, id3: null },
];

export function muatBerkasDemo() {
  renamerState.files = SAMPLE_DEMO_FILES.map((item, idx) =>
    createRenamerItem({
      originalName: item.name,
      size: (idx + 1) * 1024 * 350,
      path: 'Contoh_Demo',
      lastModified: item.date ? item.date.getTime() : Date.now() - idx * 86400000,
      file: new Blob([`Contoh isi dummy berkas ${item.name}`], { type: 'text/plain' }),
      meta: {
        exif: item.camera ? { model: item.camera, date: item.date } : null,
        id3: item.id3 || null,
      },
    })
  );
  renamerState.files = sortFiles(renamerState.files, renamerState.sortBy);
  toast(tr('6 berkas contoh demo berhasil dimuat'));
  renderRenamerScreen();
}

/**
 * Memuat seluruh catatan dari Hara ke antrean Renamer
 */
export function imporCatatanHara() {
  const activeNotes = (haraStoreState.notes || []).filter(n => !n.deletedAt);
  if (activeNotes.length === 0) {
    toast(tr('Belum ada catatan di Hara untuk dimuat'));
    return;
  }

  const loaded = activeNotes.map(n => {
    const rawTitle = (n.title || '').trim() || 'Tanpa Judul';
    const safeName = `${namaBerkasAman(rawTitle)}.md`;
    const mdContent = markdownDariCatatan(n);
    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });

    return createRenamerItem({
      originalName: safeName,
      size: blob.size,
      lastModified: n.updatedAt || Date.now(),
      path: 'Catatan_Hara',
      file: blob,
      meta: {
        noteId: n.id,
        tags: n.tags || [],
      },
    });
  });

  renamerState.files = sortFiles(loaded, renamerState.sortBy);
  renamerState.exportZipName = `Ekspor_Catatan_Hara_${new Date().toISOString().slice(0, 10)}.zip`;

  // Pasang preset penamaan rapi untuk catatan
  renamerState.rules = [
    createRule(RULE_TYPES.CLEAN, { removeWebSpam: true, collapseSpaces: true, sanitizeOS: true }),
    createRule(RULE_TYPES.TOKEN, { pattern: '{date}_{name}', digits: 2 }),
    createRule(RULE_TYPES.EXTENSION, { mode: 'lower' }),
  ];

  toast(tr('Berhasil memuat {n} catatan Hara!', { n: loaded.length }));
  renderRenamerScreen();
}

/**
 * Render ulang layar renamer jika sedang aktif.
 */
export function renderRenamerScreen() {
  if (cur !== 'renamer') return;
  const wrap = document.getElementById('wrap');
  if (!wrap) return;

  const pipelineRes = runPipeline(renamerState.files, renamerState.rules, {
    collisionStrategy: renamerState.collisionStrategy,
  });
  const scrollY = wrap.scrollTop;
  wrap.innerHTML = renamerView(
    {
      files: renamerState.files,
      rules: renamerState.rules,
      filter: renamerState.filter,
      searchQuery: renamerState.searchQuery,
      sortBy: renamerState.sortBy,
      collisionStrategy: renamerState.collisionStrategy,
      exportZipName: renamerState.exportZipName,
      hasUndo: renamerState.undoStack.length > 0,
    },
    pipelineRes
  );
  wrap.scrollTop = scrollY;
}

/**
 * Perbarui pratinjau live secara presisi & langsung tanpa menghancurkan
 * elemen input yang sedang diketik pengguna (mencegah keyboard tertutup di HP / kehilangan fokus).
 */
export function updateLivePreviewOnly() {
  if (cur !== 'renamer') return;
  const tableContainer = document.querySelector('.rn-table-container');
  if (!tableContainer) {
    return renderRenamerScreen();
  }

  const pipelineRes = runPipeline(renamerState.files, renamerState.rules, {
    collisionStrategy: renamerState.collisionStrategy,
  });

  const displayItems = filterAndSearchItems(
    pipelineRes.items,
    renamerState.filter,
    renamerState.searchQuery
  );

  // 1. Update tabel preview
  tableContainer.innerHTML = renderTableContainerContent(displayItems, renamerState.files.length);

  // 2. Update tab filter & angka
  const filterTabs = document.querySelector('.rn-filter-tabs');
  if (filterTabs) {
    filterTabs.innerHTML = renderFilterTabsContent(renamerState, pipelineRes);
  }

  // 3. Update footer bar
  const footerBar = document.querySelector('.rn-footer-bar');
  const newFooterHtml = renderFooterBar(renamerState, pipelineRes);
  if (footerBar) {
    if (newFooterHtml) {
      footerBar.outerHTML = newFooterHtml;
    } else {
      footerBar.remove();
    }
  } else if (newFooterHtml) {
    const container = document.querySelector('.rn-container');
    if (container) {
      container.insertAdjacentHTML('beforeend', newFooterHtml);
    }
  }

  // 4. Update badge jumlah aturan aktif
  const chipRules = document.querySelector('.rn-card-title .chip-a');
  if (chipRules) {
    const activeCount = renamerState.rules.filter(r => r.enabled).length;
    chipRules.textContent = `${activeCount}/${renamerState.rules.length}`;
  }
}

/**
 * Membaca EXIF dari berkas gambar JPEG
 */
async function ekstrakExifItem(file) {
  if (!file || !(file instanceof Blob)) return null;
  const name = file.name || '';
  if (!/\.(jpe?g)$/i.test(name)) return null;

  try {
    const slice = file.slice(0, 65536);
    const buf = await slice.arrayBuffer();
    return parseExif(buf);
  } catch (e) {
    return null;
  }
}

/**
 * Membaca ID3 dari berkas audio
 */
async function ekstrakId3Item(file) {
  if (!file || !(file instanceof Blob)) return null;
  const name = file.name || '';
  if (!/\.(mp3|m4a|flac|wav|ogg)$/i.test(name)) return null;

  try {
    const size = file.size;
    // Baca 16KB awal (ID3v2) dan 128 byte akhir (ID3v1)
    const sliceStart = await file.slice(0, 16384).arrayBuffer();
    let id3Data = parseId3(sliceStart);

    if (!id3Data.title && size > 128) {
      const sliceEnd = await file.slice(size - 128, size).arrayBuffer();
      id3Data = parseId3(sliceEnd);
    }
    return id3Data;
  } catch (e) {
    return null;
  }
}

/**
 * Membuka Modal Pemilihan Berkas dari dalam ZIP
 */
function bukaModalSeleksiZip(zipFileName, rawExtractedFiles) {
  const categories = new Set();
  const fileItems = rawExtractedFiles.map((f, idx) => {
    categories.add(f.category);
    return {
      ...f,
      id: `zip-f-${idx}`,
      selected: true,
    };
  });

  _pendingZipExtract = {
    zipName: zipFileName,
    files: fileItems,
    selectedCategory: 'all',
  };

  renderModalSeleksiZipContent();
}

function renderModalSeleksiZipContent() {
  if (!_pendingZipExtract) return;
  const { zipName, files, selectedCategory } = _pendingZipExtract;

  const counts = { all: files.length };
  files.forEach(f => {
    counts[f.category] = (counts[f.category] || 0) + 1;
  });

  const displayFiles = selectedCategory === 'all'
    ? files
    : files.filter(f => f.category === selectedCategory);

  const selectedCount = files.filter(f => f.selected).length;

  const html = `
    <div class="rn-modal-box" style="max-width: 600px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">
        <div>
          <h3 class="rn-modal-title">${tr('Pilih Berkas dari ZIP')}</h3>
          <p style="font-size:12.5px;color:var(--muted);margin:3px 0 0">
            ${esc(zipName)} · ${tr('{n} berkas ditemukan', { n: files.length })}
          </p>
        </div>
        <button class="btn btn-sec" data-pop-close style="height:28px;padding:0 8px;font-size:11px">✕</button>
      </div>

      <!-- Kategori Filter -->
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
        <button class="rn-token-chip ${selectedCategory === 'all' ? 'on' : ''}" data-rn-zip-cat="all" style="${selectedCategory === 'all' ? 'background:var(--accent);color:#fff;font-weight:600' : ''}">
          Semua (${counts.all})
        </button>
        ${Object.entries(CATEGORY_LABELS).filter(([k]) => k !== 'all' && counts[k]).map(([k, label]) => `
          <button class="rn-token-chip ${selectedCategory === k ? 'on' : ''}" data-rn-zip-cat="${k}" style="${selectedCategory === k ? 'background:var(--accent);color:#fff;font-weight:600' : ''}">
            ${label} (${counts[k]})
          </button>
        `).join('')}
      </div>

      <!-- Tombol Aksi Seleksi Cepat -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 2px;font-size:12px;color:var(--muted)">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
          <input type="checkbox" id="rn-zip-select-all" ${selectedCount === files.length ? 'checked' : ''}>
          <span>${tr('Pilih Semua')} (${selectedCount}/${files.length})</span>
        </label>
        <span style="font-size:11.5px">${tr('Centang berkas yang ingin dimasukkan')}</span>
      </div>

      <!-- Daftar Berkas Checkbox -->
      <div style="max-height: 240px; overflow-y: auto; border: 1px solid var(--border); border-radius: var(--r-md); background: var(--bg); display: flex; flex-direction: column">
        ${displayFiles.map(f => `
          <label style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid var(--border);cursor:pointer;font-size:12.5px">
            <input type="checkbox" class="rn-zip-item-chk" data-rn-zip-id="${f.id}" ${f.selected ? 'checked' : ''}>
            <span style="font-family:var(--mono);flex:1;word-break:break-all">${esc(f.name)}</span>
            <span style="color:var(--muted);font-size:11px;flex:none">${formatFileSize(f.size)}</span>
          </label>
        `).join('')}
      </div>

      <!-- Footer Modal Ekstraksi -->
      <div class="rn-actions-top" style="justify-content:space-between;margin-top:12px">
        <button class="btn btn-sec" data-pop-close>${tr('Batal')}</button>
        <button class="btn btn-pri" id="rn-zip-confirm-extract" ${selectedCount === 0 ? 'disabled style="opacity:.5"' : ''}>
          ${tr('Ekstrak & Muat ({n} Berkas)', { n: selectedCount })}
        </button>
      </div>
    </div>
  `;

  openPop(html);
}

/**
 * Membuka File System Access Directory Picker (jika didukung)
 */
async function bukaFolderPicker() {
  if ('showDirectoryPicker' in window) {
    try {
      const handle = await window.showDirectoryPicker();
      renamerState.directoryHandle = handle;
      const loaded = [];
      for await (const entry of handle.values()) {
        if (entry.kind === 'file') {
          const file = await entry.getFile();
          const exif = await ekstrakExifItem(file);
          const id3 = await ekstrakId3Item(file);
          loaded.push(
            createRenamerItem({
              originalName: file.name,
              size: file.size,
              lastModified: file.lastModified,
              path: handle.name || '',
              file,
              meta: { handle: entry, exif, id3 },
            })
          );
        }
      }
      renamerState.files = sortFiles(loaded, renamerState.sortBy);
      toast(tr('{n} berkas berhasil dimuat dari folder!', { n: loaded.length }));
      return renderRenamerScreen();
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }

  const inp = document.getElementById('rn-folder-input');
  if (inp) inp.click();
}

/**
 * Membuka pemilih berkas biasa
 */
function pilihBerkasBiasa() {
  const inp = document.getElementById('rn-file-input');
  if (inp) inp.click();
}

/**
 * Menangani pemilihan file dari input
 */
async function prosesInputFiles(fileList) {
  if (!fileList || fileList.length === 0) return;
  const regularFiles = [];

  for (let i = 0; i < fileList.length; i++) {
    const f = fileList[i];
    const isZip = f.name.toLowerCase().endsWith('.zip');

    if (isZip) {
      try {
        const buf = await f.arrayBuffer();
        const extracted = await extractZip(buf);
        if (extracted && extracted.length > 0) {
          bukaModalSeleksiZip(f.name, extracted);
          return;
        } else {
          toast(tr('Arsip ZIP kosong atau tidak dapat diekstrak'));
        }
      } catch (err) {
        console.error(err);
        toast(tr('Gagal membaca berkas ZIP'));
      }
    } else {
      const exif = await ekstrakExifItem(f);
      const id3 = await ekstrakId3Item(f);
      regularFiles.push(
        createRenamerItem({
          originalName: f.name,
          size: f.size,
          lastModified: f.lastModified,
          path: f.webkitRelativePath || '',
          file: f,
          meta: { exif, id3 },
        })
      );
    }
  }

  if (regularFiles.length > 0) {
    renamerState.files = sortFiles([...renamerState.files, ...regularFiles], renamerState.sortBy);
    toast(tr('Berhasil memuat {n} berkas!', { n: regularFiles.length }));
    renderRenamerScreen();
  }
}

/**
 * Eksekusi ganti nama di browser (Download file ZIP atau Direct FileSystem API)
 */
async function terapkanGantiNama() {
  const pipelineRes = runPipeline(renamerState.files, renamerState.rules, {
    collisionStrategy: renamerState.collisionStrategy,
  });

  if (pipelineRes.hasErrors) {
    toast(tr('Ada konflik nama berkas atau nama tidak valid. Mohon perbaiki aturan terlebih dahulu.'));
    return;
  }

  const toRename = pipelineRes.items.filter(x => x.status === FILE_STATUS.OK);
  if (toRename.length === 0) {
    toast(tr('Tidak ada nama berkas yang perlu diubah.'));
    return;
  }

  // Jika kita punya direct Directory Handle (File System API)
  if (renamerState.directoryHandle && 'move' in FileSystemFileHandle.prototype) {
    try {
      let success = 0;
      for (const item of toRename) {
        if (item.meta && item.meta.handle) {
          await item.meta.handle.move(item.newName);
          item.originalName = item.newName;
          const [b, e] = (function (fn) {
            const idx = fn.lastIndexOf('.');
            return idx > 0 ? [fn.slice(0, idx), fn.slice(idx + 1)] : [fn, ''];
          })(item.newName);
          item.baseName = b;
          item.ext = e;
          success++;
        }
      }
      toast(tr('Berhasil mengubah langsung {n} berkas di dalam folder!', { n: success }));
      renamerState.files = sortFiles(renamerState.files, renamerState.sortBy);
      return renderRenamerScreen();
    } catch (e) {
      console.warn('Direct move unsupported or denied, fallback to ZIP', e);
    }
  }

  // Fallback: Kemas seluruh file ke ZIP dengan nama baru
  try {
    toast(tr('Sedang mengemas berkas ke dalam ZIP...'));
    const zipEntries = [];
    for (const item of pipelineRes.items) {
      let contentBlob = item.file;
      if (!contentBlob) {
        contentBlob = new Blob([`Contoh dummy ${item.newName}`], { type: 'text/plain' });
      }
      const buf = await contentBlob.arrayBuffer();
      zipEntries.push({
        name: item.newName,
        data: buf,
        lastModified: item.lastModified,
      });
    }

    const zipBlob = await createZipBlob(zipEntries);
    const targetZipName = (renamerState.exportZipName || 'Arsip_Terganti_Nama.zip').trim();
    const finalZipName = targetZipName.toLowerCase().endsWith('.zip') ? targetZipName : `${targetZipName}.zip`;

    unduh(zipBlob, finalZipName);

    // Simpan history untuk Undo
    renamerState.undoStack.push({
      files: renamerState.files.map(f => ({ ...f })),
      rules: renamerState.rules.map(r => cloneRule(r)),
      timestamp: Date.now(),
    });

    // Update in-memory state nama berkas
    pipelineRes.items.forEach(it => {
      const target = renamerState.files.find(f => f.id === it.id);
      if (target) {
        target.originalName = it.newName;
        target.baseName = it.baseName;
        target.ext = it.ext;
      }
    });

    toast(tr('Arsip "{name}" berhasil diunduh!', { name: finalZipName }));
    renderRenamerScreen();
  } catch (err) {
    console.error(err);
    toast(tr('Gagal mengemas ZIP: ') + err.message);
  }
}

/**
 * Unduh langsung paket ZIP tanpa mengubah memori aktif
 */
async function unduhArsipZip() {
  const pipelineRes = runPipeline(renamerState.files, renamerState.rules, {
    collisionStrategy: renamerState.collisionStrategy,
  });

  if (pipelineRes.hasErrors) {
    toast(tr('Ada konflik nama berkas atau nama tidak valid. Mohon selesaikan terlebih dahulu.'));
    return;
  }

  try {
    toast(tr('Sedang membuat arsip ZIP...'));
    const zipEntries = [];
    for (const item of pipelineRes.items) {
      let contentBlob = item.file;
      if (!contentBlob) {
        contentBlob = new Blob([`Dummy ${item.newName}`], { type: 'text/plain' });
      }
      const buf = await contentBlob.arrayBuffer();
      zipEntries.push({
        name: item.newName,
        data: buf,
        lastModified: item.lastModified,
      });
    }

    const zipBlob = await createZipBlob(zipEntries);
    const targetZipName = (renamerState.exportZipName || 'Arsip_Terganti_Nama.zip').trim();
    const finalZipName = targetZipName.toLowerCase().endsWith('.zip') ? targetZipName : `${targetZipName}.zip`;

    unduh(zipBlob, finalZipName);
    toast(tr('Arsip "{name}" berhasil diunduh!', { name: finalZipName }));
  } catch (e) {
    console.error(e);
    toast(tr('Gagal mengunduh ZIP: ') + e.message);
  }
}

/**
 * Dialog Kustomisasi Nama File ZIP Target
 */
function bukaDialogKustomNamaZip() {
  const current = renamerState.exportZipName || 'Arsip_Terganti_Nama.zip';
  const html = `
    <div class="rn-modal-box">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <h3 class="rn-modal-title">${tr('Ubah Nama Berkas ZIP')}</h3>
        <button class="btn btn-sec" data-pop-close style="height:28px;padding:0 8px;font-size:11px">✕</button>
      </div>
      <p style="font-size:13px;color:var(--muted);margin:0">
        ${tr('Tentukan nama berkas .zip saat Anda mengklik tombol "Unduh ZIP".')}
      </p>
      <div class="rn-field">
        <label>${tr('Nama Berkas ZIP:')}</label>
        <input type="text" class="rn-input-text" id="rn-zip-name-input" value="${esc(current)}" placeholder="Misal: Foto_Liburan_Bali_2026.zip" autofocus>
      </div>
      <div class="rn-actions-top" style="justify-content: flex-end; margin-top: 10px">
        <button class="btn btn-sec" data-pop-close>${tr('Batal')}</button>
        <button class="btn btn-pri" id="rn-save-zip-name-btn">${tr('Simpan Nama ZIP')}</button>
      </div>
    </div>
  `;
  openPop(html);
}

/**
 * Dialog Tambah Aturan Baru
 */
function bukaDialogTambahAturan() {
  const options = Object.entries(RULE_METADATA).map(([key, meta]) => `
    <button class="rn-type-card" data-rn-add-type="${key}">
      <div class="rn-type-card-title">
        <svg class="ico" style="width:16px;height:16px;color:var(--accent)"><use href="#${meta.icon}"/></svg>
        ${meta.label}
      </div>
      <div class="rn-type-card-desc">${meta.desc}</div>
    </button>
  `).join('');

  const html = `
    <div class="rn-modal-box">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <h3 class="rn-modal-title">${tr('Pilih Jenis Aturan')}</h3>
        <button class="btn btn-sec" data-pop-close style="height:28px;padding:0 8px;font-size:11px">✕</button>
      </div>
      <div class="rn-type-grid">
        ${options}
      </div>
    </div>
  `;
  openPop(html);
}

/**
 * Dialog Resep Cepat & Preset
 */
function bukaDialogPresets() {
  const customList = muatCustomPresets();
  const presetsHtml = DEFAULT_PRESETS.map(p => `
    <button class="rn-preset-card" data-rn-apply-preset="${p.id}">
      <div class="rn-preset-card-title">${p.name}</div>
      <div class="rn-preset-card-desc">${p.desc}</div>
    </button>
  `).join('');

  const customPresetsHtml = customList.length === 0 ? '' : `
    <div style="font-weight:700;font-size:13px;color:var(--muted);margin-top:16px;text-transform:uppercase;letter-spacing:.05em">
      ${tr('Resep Tersimpan Saya')}
    </div>
    <div class="rn-preset-grid" style="margin-top:6px">
      ${customList.map(p => `
        <div class="rn-preset-card" style="display:flex;align-items:center;justify-content:space-between">
          <div style="cursor:pointer;flex:1" data-rn-apply-custom-preset="${p.id}">
            <div class="rn-preset-card-title">${esc(p.name)}</div>
            <div class="rn-preset-card-desc">${p.rules.length} ${tr('aturan')}</div>
          </div>
          <button class="rn-btn-micro" data-rn-del-preset="${p.id}" style="color:var(--danger)" title="${tr('Hapus resep')}">
            <svg class="ico" style="width:13px;height:13px"><use href="#i-trash"/></svg>
          </button>
        </div>
      `).join('')}
    </div>
  `;

  const html = `
    <div class="rn-modal-box" style="max-width: 600px">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <h3 class="rn-modal-title">${tr('Resep Cepat')}</h3>
        <button class="btn btn-sec" data-pop-close style="height:28px;padding:0 8px;font-size:11px">✕</button>
      </div>
      <div class="rn-preset-grid">
        ${presetsHtml}
      </div>
      ${customPresetsHtml}
    </div>
  `;
  openPop(html);
}

/**
 * Dialog Simpan Susunan Aturan Aktif sebagai Preset Baru
 */
function bukaDialogSimpanPreset() {
  if (renamerState.rules.length === 0) {
    toast(tr('Tambahkan minimal 1 aturan untuk disimpan sebagai resep'));
    return;
  }
  const html = `
    <div class="rn-modal-box">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <h3 class="rn-modal-title">${tr('Simpan Resep Aturan')}</h3>
        <button class="btn btn-sec" data-pop-close style="height:28px;padding:0 8px;font-size:11px">✕</button>
      </div>
      <p style="font-size:13px;color:var(--muted);margin:0">${tr('Simpan kombinasi aturan saat ini agar bisa dipakai kembali kapan saja.')}</p>
      <div class="rn-field">
        <label>${tr('Nama Resep:')}</label>
        <input type="text" class="rn-input-text" id="rn-preset-name-in" placeholder="${tr('Misal: Format Foto Dokumentasi')}" autofocus>
      </div>
      <div class="rn-actions-top" style="justify-content:flex-end;margin-top:10px">
        <button class="btn btn-sec" data-pop-close>${tr('Batal')}</button>
        <button class="btn btn-pri" id="rn-save-preset-confirm">${tr('Simpan Resep')}</button>
      </div>
    </div>
  `;
  openPop(html);
}

/**
 * Dialog Konfirmasi Undo
 */
function bukaDialogUndo() {
  if (renamerState.undoStack.length === 0) return;
  const html = `
    <div class="rn-modal-box">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <h3 class="rn-modal-title">${tr('Kembalikan Nama Berkas?')}</h3>
        <button class="btn btn-sec" data-pop-close style="height:28px;padding:0 8px;font-size:11px">✕</button>
      </div>
      <p style="font-size:13px;color:var(--muted);margin:0">
        ${tr('Apakah Anda yakin ingin membatalkan perubahan nama dan mengembalikannya ke nama sebelum aksi terakhir?')}
      </p>
      <div class="rn-actions-top" style="justify-content:flex-end;margin-top:12px">
        <button class="btn btn-sec" data-pop-close>${tr('Tidak')}</button>
        <button class="btn btn-pri" id="rn-undo-confirm">${tr('Ya, Batalkan')}</button>
      </div>
    </div>
  `;
  openPop(html);
}

function batalkanGantiNamaKonfirmasi() {
  const previous = renamerState.undoStack.pop();
  if (previous) {
    renamerState.files = previous.files;
    renamerState.rules = previous.rules;
    closeAll();
    toast(tr('Perubahan nama berhasil dibatalkan (Undo)!'));
    renderRenamerScreen();
  }
}

/**
 * Inisialisasi Modul Bulk Renamer
 */
export const renamerModule = {
  id: 'renamer',
  label: 'Bulk Renamer',
  icon: 'i-edit',
  init() {
    registerViews({
      renamer: () => {
        const pipelineRes = runPipeline(renamerState.files, renamerState.rules, {
          collisionStrategy: renamerState.collisionStrategy,
        });
        return renamerView(
          {
            files: renamerState.files,
            rules: renamerState.rules,
            filter: renamerState.filter,
            searchQuery: renamerState.searchQuery,
            sortBy: renamerState.sortBy,
            collisionStrategy: renamerState.collisionStrategy,
            exportZipName: renamerState.exportZipName,
            hasUndo: renamerState.undoStack.length > 0,
          },
          pipelineRes
        );
      },
    });

    onAfterRender(() => {
      if (cur !== 'renamer') return;
      // Dropzone event binding
      const dz = document.getElementById('rn-dropzone');
      if (dz) {
        dz.addEventListener('dragover', e => {
          e.preventDefault();
          dz.classList.add('dragover');
        });
        dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
        dz.addEventListener('drop', e => {
          e.preventDefault();
          dz.classList.remove('dragover');
          if (e.dataTransfer && e.dataTransfer.files) {
            prosesInputFiles(e.dataTransfer.files);
          }
        });
      }
    });

    // Delegasi Event Klik Global Modul Renamer
    document.addEventListener('click', e => {
      const actBtn = e.target.closest('[data-rn-act]');
      if (actBtn) {
        const act = actBtn.dataset.rnAct;
        const id = actBtn.dataset.rnId;

        // Aksi Sumber Berkas
        if (act === 'pick-files') return pilihBerkasBiasa();
        if (act === 'pick-folder') return bukaFolderPicker();
        if (act === 'demo') return muatBerkasDemo();
        if (act === 'import-hara-notes') return imporCatatanHara();
        if (act === 'clear-files') {
          renamerState.files = [];
          toast(tr('Daftar berkas dikosongkan'));
          return renderRenamerScreen();
        }

        // Aksi Aturan & Preset
        if (act === 'add-rule') return bukaDialogTambahAturan();
        if (act === 'presets') return bukaDialogPresets();
        if (act === 'save-preset') return bukaDialogSimpanPreset();
        if (act === 'config-zip-name') return bukaDialogKustomNamaZip();
        if (act === 'undo') return bukaDialogUndo();
        if (act === 'export-zip') return unduhArsipZip();
        if (act === 'apply-rename') return terapkanGantiNama();

        // Operasi geser baris file manual
        if (act === 'file-up' && id) {
          const idx = renamerState.files.findIndex(f => f.id === id);
          if (idx > 0) {
            const temp = renamerState.files[idx];
            renamerState.files[idx] = renamerState.files[idx - 1];
            renamerState.files[idx - 1] = temp;
            updateLivePreviewOnly();
            return;
          }
        }
        if (act === 'file-down' && id) {
          const idx = renamerState.files.findIndex(f => f.id === id);
          if (idx < renamerState.files.length - 1) {
            const temp = renamerState.files[idx];
            renamerState.files[idx] = renamerState.files[idx + 1];
            renamerState.files[idx + 1] = temp;
            updateLivePreviewOnly();
            return;
          }
        }

        // Operasi per aturan
        if (act === 'del-rule' && id) {
          renamerState.rules = renamerState.rules.filter(r => r.id !== id);
          return renderRenamerScreen();
        }
        if (act === 'move-up' && id) {
          const idx = renamerState.rules.findIndex(r => r.id === id);
          if (idx > 0) {
            const temp = renamerState.rules[idx];
            renamerState.rules[idx] = renamerState.rules[idx - 1];
            renamerState.rules[idx - 1] = temp;
            return renderRenamerScreen();
          }
        }
        if (act === 'move-down' && id) {
          const idx = renamerState.rules.findIndex(r => r.id === id);
          if (idx < renamerState.rules.length - 1) {
            const temp = renamerState.rules[idx];
            renamerState.rules[idx] = renamerState.rules[idx + 1];
            renamerState.rules[idx + 1] = temp;
            return renderRenamerScreen();
          }
        }
      }

      // Simpan Nama ZIP Kustom
      if (e.target && e.target.id === 'rn-save-zip-name-btn') {
        const inp = document.getElementById('rn-zip-name-input');
        const val = (inp ? inp.value : '').trim();
        if (val) {
          renamerState.exportZipName = val;
          closeAll();
          toast(tr('Nama berkas ZIP diperbarui: ') + val);
          updateLivePreviewOnly();
        }
        return;
      }

      // Kategori Filter dalam Dialog ZIP
      const zipCatBtn = e.target.closest('[data-rn-zip-cat]');
      if (zipCatBtn && _pendingZipExtract) {
        _pendingZipExtract.selectedCategory = zipCatBtn.dataset.rnZipCat;
        renderModalSeleksiZipContent();
        return;
      }

      // Checkbox Pilih Semua dalam Dialog ZIP
      if (e.target && e.target.id === 'rn-zip-select-all' && _pendingZipExtract) {
        const checked = e.target.checked;
        _pendingZipExtract.files.forEach(f => { f.selected = checked; });
        renderModalSeleksiZipContent();
        return;
      }

      // Checkbox per item dalam Dialog ZIP
      const itemChk = e.target.closest('.rn-zip-item-chk');
      if (itemChk && _pendingZipExtract) {
        const id = itemChk.dataset.rnZipId;
        const target = _pendingZipExtract.files.find(f => f.id === id);
        if (target) {
          target.selected = itemChk.checked;
          renderModalSeleksiZipContent();
        }
        return;
      }

      // Konfirmasi Ekstrak Berkas Terpilih dari ZIP
      if (e.target && e.target.id === 'rn-zip-confirm-extract' && _pendingZipExtract) {
        const selected = _pendingZipExtract.files.filter(f => f.selected);
        const newItems = [];
        for (const zf of selected) {
          const zBlob = new Blob([zf.data]);
          const exif = /\.(jpe?g)$/i.test(zf.name) ? parseExif(zf.data) : null;
          const id3 = /\.(mp3|m4a|flac|wav)$/i.test(zf.name) ? parseId3(zf.data) : null;
          newItems.push(
            createRenamerItem({
              originalName: zf.name,
              size: zf.size,
              lastModified: zf.lastModified,
              path: _pendingZipExtract.zipName,
              file: zBlob,
              meta: { exif, id3 },
            })
          );
        }

        renamerState.files = sortFiles([...renamerState.files, ...newItems], renamerState.sortBy);
        const count = newItems.length;
        const zipName = _pendingZipExtract.zipName;
        _pendingZipExtract = null;
        closeAll();
        toast(tr('Berhasil mengekstrak {n} berkas dari {name}', { n: count, name: zipName }));
        renderRenamerScreen();
        return;
      }

      // Konfirmasi Undo
      if (e.target && e.target.id === 'rn-undo-confirm') {
        return batalkanGantiNamaKonfirmasi();
      }

      // Konfirmasi Simpan Preset
      if (e.target && e.target.id === 'rn-save-preset-confirm') {
        const nameIn = document.getElementById('rn-preset-name-in');
        const name = (nameIn ? nameIn.value : '').trim();
        if (!name) {
          toast(tr('Nama resep tidak boleh kosong'));
          return;
        }
        const customList = muatCustomPresets();
        customList.push({
          id: 'custom-' + Date.now(),
          name,
          rules: renamerState.rules.map(r => ({ type: r.type, params: { ...r.params } })),
        });
        simpanCustomPresets(customList);
        closeAll();
        toast(tr('Resep "{name}" berhasil disimpan!', { name }));
        return;
      }

      // Terapkan Custom Preset
      const customPresetBtn = e.target.closest('[data-rn-apply-custom-preset]');
      if (customPresetBtn) {
        closeAll();
        const pId = customPresetBtn.dataset.rnApplyCustomPreset;
        const customList = muatCustomPresets();
        const p = customList.find(x => x.id === pId);
        if (p) {
          renamerState.rules = p.rules.map(r => createRule(r.type, r.params));
          toast(tr('Resep "{name}" diterapkan!', { name: p.name }));
          return renderRenamerScreen();
        }
      }

      // Hapus Custom Preset
      const delPresetBtn = e.target.closest('[data-rn-del-preset]');
      if (delPresetBtn) {
        const pId = delPresetBtn.dataset.rnDelPreset;
        let customList = muatCustomPresets();
        customList = customList.filter(x => x.id !== pId);
        simpanCustomPresets(customList);
        toast(tr('Resep dihapus'));
        bukaDialogPresets();
        return;
      }

      // Filter tabs
      const filterBtn = e.target.closest('[data-rn-filter]');
      if (filterBtn) {
        renamerState.filter = filterBtn.dataset.rnFilter;
        updateLivePreviewOnly();
        return;
      }

      // Tambah tipe aturan dari modal
      const addTypeBtn = e.target.closest('[data-rn-add-type]');
      if (addTypeBtn) {
        closeAll();
        const type = addTypeBtn.dataset.rnAddType;
        renamerState.rules.push(createRule(type));
        toast(tr('Aturan baru ditambahkan'));
        return renderRenamerScreen();
      }

      // Terapkan preset dari modal
      const presetBtn = e.target.closest('[data-rn-apply-preset]');
      if (presetBtn) {
        closeAll();
        const pId = presetBtn.dataset.rnApplyPreset;
        const preset = DEFAULT_PRESETS.find(p => p.id === pId);
        if (preset) {
          renamerState.rules = preset.rules.map(r => createRule(r.type, r.params));
          toast(tr('Resep "{name}" diterapkan!', { name: preset.name }));
          return renderRenamerScreen();
        }
      }

      // Sisip token ke input pattern
      const tokenChip = e.target.closest('[data-rn-insert-token]');
      if (tokenChip) {
        const token = tokenChip.dataset.rnInsertToken;
        const input = document.querySelector('[data-rn-param="pattern"]');
        if (input) {
          const startPos = input.selectionStart ?? input.value.length;
          const endPos = input.selectionEnd ?? input.value.length;
          const prevVal = input.value;
          input.value = prevVal.slice(0, startPos) + token + prevVal.slice(endPos);
          input.selectionStart = input.selectionEnd = startPos + token.length;
          input.focus();
          const ruleId = input.dataset.rnId;
          const rule = renamerState.rules.find(r => r.id === ruleId);
          if (rule) {
            rule.params.pattern = input.value;
          }
          updateLivePreviewOnly();
        }
      }
    });

    // Tangani perubahan parameter aturan secara langsung (Live Input tanpa reload DOM)
    document.addEventListener('input', e => {
      const inp = e.target.closest('[data-rn-param]');
      if (inp) {
        const id = inp.dataset.rnId;
        const paramName = inp.dataset.rnParam;
        const rule = renamerState.rules.find(r => r.id === id);
        if (rule) {
          if (paramName === 'start' || paramName === 'count' || paramName === 'index') {
            const numVal = parseInt(inp.value, 10);
            rule.params[paramName] = isNaN(numVal) ? 0 : numVal;
          } else {
            rule.params[paramName] = inp.value;
          }
          updateLivePreviewOnly();
        }
        return;
      }

      // Filter pencarian Live Preview
      if (e.target && e.target.id === 'rn-search-preview') {
        renamerState.searchQuery = e.target.value;
        updateLivePreviewOnly();
        return;
      }
    });

    document.addEventListener('change', e => {
      // Checkbox parameter
      const boolInp = e.target.closest('[data-rn-param-bool]');
      if (boolInp) {
        const id = boolInp.dataset.rnId;
        const paramName = boolInp.dataset.rnParamBool;
        const rule = renamerState.rules.find(r => r.id === id);
        if (rule) {
          rule.params[paramName] = boolInp.checked;
          updateLivePreviewOnly();
        }
      }

      // Select parameter di dalam aturan
      const selectInp = e.target.closest('select[data-rn-param]');
      if (selectInp) {
        const id = selectInp.dataset.rnId;
        const paramName = selectInp.dataset.rnParam;
        const rule = renamerState.rules.find(r => r.id === id);
        if (rule) {
          if (paramName === 'digits') {
            rule.params[paramName] = parseInt(selectInp.value, 10) || 1;
          } else {
            rule.params[paramName] = selectInp.value;
          }
          // Jika select mengubah posisi/mode yang memunculkan/menyembunyikan field lain
          if (paramName === 'position' || paramName === 'mode') {
            renderRenamerScreen();
          } else {
            updateLivePreviewOnly();
          }
        }
      }

      // Pre-sorting select
      if (e.target && e.target.id === 'rn-sort-select') {
        renamerState.sortBy = e.target.value;
        renamerState.files = sortFiles(renamerState.files, renamerState.sortBy);
        renderRenamerScreen();
      }

      // Toggle collision strategy selector
      if (e.target && e.target.id === 'rn-collision-select') {
        renamerState.collisionStrategy = e.target.value;
        updateLivePreviewOnly();
      }

      // Toggle aktifkan/nonaktifkan aturan
      const toggle = e.target.closest('[data-rn-act="toggle-rule"]');
      if (toggle) {
        const id = toggle.dataset.rnId;
        const rule = renamerState.rules.find(r => r.id === id);
        if (rule) {
          rule.enabled = toggle.checked;
          const card = toggle.closest('.rn-rule-item');
          if (card) {
            if (rule.enabled) card.classList.remove('disabled');
            else card.classList.add('disabled');
          }
          updateLivePreviewOnly();
        }
      }

      // File & Folder input change
      if (e.target && (e.target.id === 'rn-file-input' || e.target.id === 'rn-folder-input')) {
        prosesInputFiles(e.target.files);
        e.target.value = '';
      }
    });

    // Drag and drop handler pada dropzone
    document.addEventListener('dragover', e => {
      const dz = e.target.closest('#rn-dropzone') || e.target.closest('#rn-dz');
      if (dz) {
        e.preventDefault();
        dz.classList.add('dragover');
      }
    });
    document.addEventListener('dragleave', e => {
      const dz = e.target.closest('#rn-dropzone') || e.target.closest('#rn-dz');
      if (dz) dz.classList.remove('dragover');
    });
    document.addEventListener('drop', e => {
      const dz = e.target.closest('#rn-dropzone') || e.target.closest('#rn-dz');
      if (dz) {
        e.preventDefault();
        dz.classList.remove('dragover');
        if (e.dataTransfer && e.dataTransfer.files) {
          prosesInputFiles(e.dataTransfer.files);
        }
      }
    });
  },
};
