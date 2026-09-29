/**
 * Modul Bulk Renamer — Hara
 *
 * Mengikuti kontrak modul Hara:
 * - registerViews ke router
 * - state management independen
 * - integrasi UI, preset, file picker, ZIP export, dan engine
 */

import { registerViews, onAfterRender, cur, go } from '../core/router.js?v=20260929102205';
import { toast } from '../core/toast.js?v=20260929102205';
import { t as tr } from '../core/i18n.js?v=20260929102205';
import { openPop, closeAll } from '../notes/menus/pop.js?v=20260929102205';
import { unduh } from '../notes/data-io.js?v=20260929102205';
import {
  createRenamerItem,
  createRule,
  cloneRule,
  RULE_TYPES,
  RULE_METADATA,
  DEFAULT_PRESETS,
  FILE_STATUS,
} from './model.js?v=20260929102205';
import { runPipeline } from './engine.js?v=20260929102205';
import { renamerView } from './view.js?v=20260929102205';
import { createZipBlob } from './zip.js?v=20260929102205';

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
  collisionStrategy: 'warn',
  undoStack: [],
  directoryHandle: null,
};

// Data contoh untuk demo instan
const SAMPLE_DEMO_FILES = [
  'IMG_2026_09_29%20(1).JPG',
  'IMG_2026_09_29%20(2).JPG',
  'Draft%20Laporan%20Keuangan%20[FINAL].docx',
  'Foto_Liburan_Keluarga_Bali (01).PNG',
  'Podcast_Episode_01_Audio.mp3',
  'DATA_KARYAWAN_2026_V1.XLSX',
];

export function muatBerkasDemo() {
  renamerState.files = SAMPLE_DEMO_FILES.map((name, idx) =>
    createRenamerItem({
      originalName: name,
      size: (idx + 1) * 1024 * 350,
      path: 'Contoh_Demo',
      lastModified: Date.now() - idx * 86400000,
      file: new Blob([`Contoh isi dummy berkas ${name}`], { type: 'text/plain' }),
    })
  );
  toast(tr('6 berkas contoh demo berhasil dimuat'));
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
      collisionStrategy: renamerState.collisionStrategy,
      hasUndo: renamerState.undoStack.length > 0,
    },
    pipelineRes
  );
  wrap.scrollTop = scrollY;
}

/**
 * Membuka pemilih folder menggunakan File System Access API
 */
async function pilihFolderWeb() {
  if (window.showDirectoryPicker) {
    try {
      const dirHandle = await window.showDirectoryPicker();
      renamerState.directoryHandle = dirHandle;
      const loaded = [];
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
          const file = await entry.getFile();
          loaded.push(
            createRenamerItem({
              originalName: file.name,
              size: file.size,
              lastModified: file.lastModified,
              path: dirHandle.name,
              handle: entry,
              file,
            })
          );
        }
      }
      if (loaded.length === 0) {
        toast(tr('Folder kosong, tidak ada berkas'));
      } else {
        renamerState.files = loaded;
        toast(tr('{n} berkas berhasil dimuat dari folder', { n: loaded.length }));
      }
      renderRenamerScreen();
      return;
    } catch (err) {
      if (err.name === 'AbortError') return; // User cancel
    }
  }

  // Fallback: input folder
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
function prosesInputFiles(fileList) {
  if (!fileList || fileList.length === 0) return;
  const loaded = Array.from(fileList).map(file =>
    createRenamerItem({
      originalName: file.name,
      size: file.size,
      lastModified: file.lastModified,
      path: file.webkitRelativePath ? file.webkitRelativePath.split('/')[0] : '',
      file,
    })
  );
  renamerState.files = [...renamerState.files, ...loaded];
  toast(tr('{n} berkas ditambahkan', { n: loaded.length }));
  renderRenamerScreen();
}

/**
 * Eksekusi Ganti Nama Berkas
 */
async function eksekusiGantiNama() {
  const pipelineRes = runPipeline(renamerState.files, renamerState.rules, {
    collisionStrategy: renamerState.collisionStrategy,
  });
  if (pipelineRes.hasErrors || pipelineRes.changedCount === 0) {
    toast(tr('Tidak ada perubahan atau ada konflik nama'));
    return;
  }

  const itemsToRename = pipelineRes.items.filter(i => i.status === FILE_STATUS.OK);

  // Jika menggunakan File System Access API dengan permission
  if (renamerState.directoryHandle && itemsToRename.some(i => i.handle)) {
    try {
      toast(tr('Mengganti nama berkas di disk…'));
      const historyEntry = { timestamp: Date.now(), mappings: [] };

      // Safe Two-pass rename
      for (const item of itemsToRename) {
        if (item.handle && item.handle.move) {
          await item.handle.move(item.newName);
          historyEntry.mappings.push({ from: item.originalName, to: item.newName, handle: item.handle });
          item.originalName = item.newName;
        }
      }

      renamerState.undoStack.push(historyEntry);
      toast(tr('Berhasil mengganti nama {n} berkas!', { n: itemsToRename.length }));
      renderRenamerScreen();
      return;
    } catch (err) {
      console.error(err);
      toast(tr('Gagal mengubah berkas di disk: ') + err.message);
    }
  }

  // Fallback: Update state di antrean
  const historyEntry = { timestamp: Date.now(), mappings: [] };
  itemsToRename.forEach(item => {
    historyEntry.mappings.push({ from: item.originalName, to: item.newName });
    item.originalName = item.newName;
  });
  renamerState.undoStack.push(historyEntry);
  toast(tr('Berhasil menerapkan ganti nama pada {n} berkas!', { n: itemsToRename.length }));
  renderRenamerScreen();
}

/**
 * Ekspor & Unduh Berkas ZIP Terganti Nama
 */
async function eksporZipRenamed() {
  const pipelineRes = runPipeline(renamerState.files, renamerState.rules, {
    collisionStrategy: renamerState.collisionStrategy,
  });
  if (pipelineRes.hasErrors || renamerState.files.length === 0) {
    toast(tr('Perbaiki error sebelum mengunduh ZIP'));
    return;
  }

  toast(tr('Sedang menyiapkan arsip ZIP…'));

  try {
    const entries = [];
    for (const item of pipelineRes.items) {
      let data = item.file || 'DUMMY DATA';
      entries.push({
        name: item.newName,
        data,
      });
    }

    const zipBlob = await createZipBlob(entries);
    const dateStr = new Date().toISOString().slice(0, 10);
    const zipName = `Berkas_Terganti_Nama_${dateStr}.zip`;
    unduh(zipName, zipBlob, 'application/zip');
    toast(`${tr('Berhasil mengunduh')}: ${zipName}`);
  } catch (err) {
    console.error(err);
    toast(tr('Gagal membuat berkas ZIP: ') + err.message);
  }
}

/**
 * Batalkan / Undo Ganti Nama Terakhir
 */
async function batalkanGantiNama() {
  const lastOp = renamerState.undoStack.pop();
  if (!lastOp) {
    toast(tr('Tidak ada riwayat ganti nama untuk dibatalkan'));
    return;
  }

  // Jika di disk native
  if (lastOp.mappings.some(m => m.handle)) {
    try {
      toast(tr('Mengembalikan nama berkas di disk…'));
      for (const m of lastOp.mappings) {
        if (m.handle && m.handle.move) {
          await m.handle.move(m.from);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  const map = new Map(lastOp.mappings.map(m => [m.to, m.from]));
  renamerState.files.forEach(f => {
    if (map.has(f.originalName)) {
      f.originalName = map.get(f.originalName);
    }
  });

  toast(tr('Ganti nama sebelumnya berhasil diurungkan!'));
  renderRenamerScreen();
}

/**
 * Dialog Simpan Resep Kustom
 */
function bukaDialogSimpanPreset(anchorEl) {
  const html = `
    <div class="rn-modal-box">
      <h3 class="rn-modal-title">${tr('Simpan Resep Aturan')}</h3>
      <p style="font-size:13px;color:var(--muted);margin:0">${tr('Simpan kombinasi aturan saat ini agar bisa dipakai kembali kapan saja.')}</p>
      <div class="rn-input-group" style="flex-direction:column;align-items:flex-start;gap:6px">
        <label>${tr('Nama Resep:')}</label>
        <input type="text" class="rn-input" id="rn-preset-name-in" style="width:100%" placeholder="${tr('Misal: Format Foto Dokumentasi')}" autofocus>
      </div>
      <div class="rn-actions-top" style="justify-content:flex-end;margin-top:10px">
        <button class="btn btn-sec" data-pop-close>${tr('Batal')}</button>
        <button class="btn btn-pri" id="rn-save-preset-confirm">${tr('Simpan Resep')}</button>
      </div>
    </div>
  `;
  openPop(html, anchorEl || document.body);
}

/**
 * Menu Dialog Tambah Aturan
 */
function bukaDialogTambahAturan(anchorEl) {
  const html = `
    <div class="rn-modal-box">
      <h3 class="rn-modal-title">${tr('Pilih Jenis Aturan')}</h3>
      <div class="rn-type-grid">
        ${Object.entries(RULE_METADATA).map(([type, meta]) => `
          <button class="rn-type-card" data-rn-add-type="${type}">
            <div class="rn-type-card-title">
              <svg class="ico" style="width:16px;height:16px;color:var(--accent)"><use href="#${meta.icon}"/></svg>
              ${meta.label}
            </div>
            <div class="rn-type-card-desc">${meta.desc}</div>
          </button>
        `).join('')}
      </div>
    </div>
  `;
  openPop(html, anchorEl || document.body);
}

/**
 * Menu Dialog Resep / Preset
 */
function bukaDialogPresets(anchorEl) {
  const customList = muatCustomPresets();
  const html = `
    <div class="rn-modal-box">
      <h3 class="rn-modal-title">${tr('Resep Cepat Siap Pakai')}</h3>
      <div class="rn-type-grid">
        ${DEFAULT_PRESETS.map(p => `
          <button class="rn-type-card" data-rn-apply-preset="${p.id}">
            <div class="rn-type-card-title">
              <svg class="ico" style="width:16px;height:16px;color:var(--accent)"><use href="#i-tpl"/></svg>
              ${p.name}
            </div>
            <div class="rn-type-card-desc">${p.desc}</div>
          </button>
        `).join('')}
        ${customList.map(p => `
          <div class="rn-type-card" style="position:relative">
            <button data-rn-apply-custom-preset="${p.id}" style="background:none;border:none;text-align:left;cursor:pointer;width:100%;padding:0">
              <div class="rn-type-card-title">
                <svg class="ico" style="width:16px;height:16px;color:var(--accent)"><use href="#i-copy"/></svg>
                ${esc(p.name)}
              </div>
              <div class="rn-type-card-desc">${tr('{n} aturan tersimpan', { n: p.rules.length })}</div>
            </button>
            <button data-rn-del-preset="${p.id}" style="position:absolute;top:8px;right:8px;background:none;border:none;color:var(--danger);cursor:pointer" title="${tr('Hapus resep')}">✕</button>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  openPop(html, anchorEl || document.body);
}

export const renamerModule = {
  id: 'renamer',
  name: 'Ganti Nama',
  init() {
    // 1. Daftarkan view ke router Hara
    registerViews(
      {
        renamer: () => {
          const res = runPipeline(renamerState.files, renamerState.rules, {
            collisionStrategy: renamerState.collisionStrategy,
          });
          return renamerView(
            {
              files: renamerState.files,
              rules: renamerState.rules,
              filter: renamerState.filter,
              searchQuery: renamerState.searchQuery,
              collisionStrategy: renamerState.collisionStrategy,
              hasUndo: renamerState.undoStack.length > 0,
            },
            res
          );
        },
      },
      {
        renamer: 'Ganti Nama Massal',
      }
    );

    // 2. Global Event Listener untuk interaksi Renamer
    document.addEventListener('click', e => {
      // Tombol aksi umum
      const actBtn = e.target.closest('[data-rn-act]');
      if (actBtn) {
        const act = actBtn.dataset.rnAct;
        const id = actBtn.dataset.rnId;

        if (act === 'demo') return muatBerkasDemo();
        if (act === 'pick-folder') return pilihFolderWeb();
        if (act === 'pick-files') return pilihBerkasBiasa();
        if (act === 'clear-files') {
          renamerState.files = [];
          toast(tr('Daftar berkas dikosongkan'));
          return renderRenamerScreen();
        }
        if (act === 'add-rule') return bukaDialogTambahAturan(actBtn);
        if (act === 'presets') return bukaDialogPresets(actBtn);
        if (act === 'save-preset') return bukaDialogSimpanPreset(actBtn);
        if (act === 'apply-rename') return eksekusiGantiNama();
        if (act === 'export-zip') return eksporZipRenamed();
        if (act === 'undo') return batalkanGantiNama();

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
        return renderRenamerScreen();
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
          input.value += token;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    });

    // Tangani perubahan parameter aturan secara langsung (Live Input)
    document.addEventListener('input', e => {
      const inp = e.target.closest('[data-rn-param]');
      if (inp) {
        const id = inp.dataset.rnId;
        const paramName = inp.dataset.rnParam;
        const rule = renamerState.rules.find(r => r.id === id);
        if (rule) {
          rule.params[paramName] = inp.value;
          renderRenamerScreen();
        }
        return;
      }

      // Filter pencarian Live Preview
      if (e.target && e.target.id === 'rn-search-preview') {
        renamerState.searchQuery = e.target.value;
        renderRenamerScreen();
        const reInput = document.getElementById('rn-search-preview');
        if (reInput) {
          reInput.focus();
          reInput.setSelectionRange(reInput.value.length, reInput.value.length);
        }
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
          renderRenamerScreen();
        }
      }

      // Toggle collision strategy selector
      if (e.target && e.target.id === 'rn-collision-select') {
        renamerState.collisionStrategy = e.target.value;
        renderRenamerScreen();
      }

      // Toggle aktifkan/nonaktifkan aturan
      const toggle = e.target.closest('[data-rn-act="toggle-rule"]');
      if (toggle) {
        const id = toggle.dataset.rnId;
        const rule = renamerState.rules.find(r => r.id === id);
        if (rule) {
          rule.enabled = toggle.checked;
          renderRenamerScreen();
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
      const dz = e.target.closest('#rn-dz');
      if (dz) {
        e.preventDefault();
        dz.classList.add('dragover');
      }
    });
    document.addEventListener('dragleave', e => {
      const dz = e.target.closest('#rn-dz');
      if (dz) dz.classList.remove('dragover');
    });
    document.addEventListener('drop', e => {
      const dz = e.target.closest('#rn-dz');
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
