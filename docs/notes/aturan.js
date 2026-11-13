import { state, save, onAfterSave } from '../core/store.js?v=20261105210000';
import { bacaKv, tulisKv } from '../core/db-catatan.js?v=20261105210000';
import { terlihat } from './kunci.js?v=20261105210000';
import { t as tr } from '../core/i18n.js?v=20261105210000';
import { esc } from '../core/dom.js?v=20261105210000';
import { openPop } from './menus/pop.js?v=20261105210000';
import { sheet, shAksi } from './sheet.js?v=20261105210000';
import { normalisasiAturan, semuaTugasSelesai, pratinjauAturan, terapkanPratinjau, urungkanAturan } from './aturan-murni.js?v=20261105210000';

const KEY = 'hara.rules.n7.v1', LOG = 'hara.rules.log.v1', BATAS_LOG = 50;
let aktif = false, guard = false, seen = new Map(), pending = null;
const bacaRules = () => { try { return normalisasiAturan(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { return []; } };
const simpanRules = x => { try { localStorage.setItem(KEY, JSON.stringify(normalisasiAturan(x))); return true; } catch { return false; } };
async function bacaLog() { try { const x = await bacaKv(LOG); return Array.isArray(x) ? x : []; } catch { return []; } }
async function tulisLog(log) { try { await tulisKv(LOG, log.slice(0, BATAS_LOG)); } catch {} }
const idBaru = () => 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const capNote = n => JSON.stringify({ at: n.updatedAt || 0, selesai: semuaTugasSelesai(n) });

async function simpanPerubahan(perubahan, ruleNama) {
  if (!perubahan.length) return;
  const log = await bacaLog();
  log.unshift({ id: idBaru(), at: Date.now(), ruleNama, perubahan });
  await tulisLog(log);
}

function jalankanOtomatis() {
  if (!aktif || guard) return;
  const rules = bacaRules().filter(r => r.aktif);
  if (!rules.length) return;
  const changed = [];
  for (const n of state.notes || []) {
    if (!n?.id || n.deletedAt || !terlihat(n)) continue;
    const kunci = capNote(n);
    const lama = seen.get(n.id);
    seen.set(n.id, kunci);
    const sebelumnya = lama === undefined ? null : JSON.parse(lama);
    const sekarang = JSON.parse(kunci);
    const tugasBaruSelesai = sebelumnya?.selesai === false && sekarang.selesai === true;
    if (lama === undefined && !rules.some(r => r.pemicu === 'simpan')) continue;
    const semua = [];
    for (const pemicu of ['simpan', ...(tugasBaruSelesai ? ['tugas-selesai'] : [])]) {
      const matchedRules = rules.filter(r => r.pemicu === pemicu);
      if (!matchedRules.length) continue;
      const p = pratinjauAturan(matchedRules, [n], { pemicu, waktu: Date.now() });
      semua.push(...p);
    }
    if (!semua.length) continue;
    /* Mesin pratinjau mengelompokkan aksi satu aturan; satukan agar note hanya ditulis sekali. */
    let after = n;
    const ruleNames = [];
    for (const p of semua) { after = p.sesudah; ruleNames.push(...(p.aturan || []).map(x => x.nama)); }
    Object.assign(n, after);
    seen.set(n.id, capNote(n));
    changed.push({ noteId: n.id, aturan: [...new Set(ruleNames)], sebelum: semua[0].sebelum, sesudah: after });
  }
  if (!changed.length) return;
  guard = true;
  try {
    void simpanPerubahan(changed, [...new Set(changed.flatMap(x => x.aturan))].join(', '));
    save();
  } finally { guard = false; }
}

function barisRule(r) { return `<div class="n7-rule"><div class="n7-rule-top"><label><input type="checkbox" data-n7-toggle="${esc(r.id)}"${r.aktif ? ' checked' : ''}> ${esc(r.nama)}</label><button type="button" class="sf-mini bahaya" data-n7-delete="${esc(r.id)}" aria-label="${tr('Hapus aturan')}">×</button></div><small>${esc(r.pemicu)} · ${esc(JSON.stringify(r.kondisi))} → ${esc(JSON.stringify(r.aksi))}</small></div>`; }

async function tampilkan(pesan = '') {
  const rules = bacaRules(), log = await bacaLog();
  let form = `<div class="n7-form">
    <label class="sh-lab">${tr('Nama aturan')}<input class="sh-inp" id="n7-name" maxlength="80" placeholder="${tr('Mis. tugas Kuliah selesai')}"></label>
    <label class="sh-lab">${tr('Pemicu')}<select class="sh-inp" id="n7-trigger"><option value="simpan">${tr('Saat note disimpan')}</option><option value="tugas-selesai">${tr('Saat semua tugas selesai')}</option></select></label>
    <div class="n7-grid"><label class="sh-lab">${tr('Tag harus cocok (opsional)')}<input class="sh-inp" id="n7-tag"></label><label class="sh-lab">${tr('Judul memuat (opsional)')}<input class="sh-inp" id="n7-title"></label>
    <label class="sh-lab">${tr('Properti')}<input class="sh-inp" id="n7-prop-key" placeholder="${tr('Nama')}"></label><label class="sh-lab">${tr('Nilai properti')}<input class="sh-inp" id="n7-prop-value"></label></div>
    <label class="n7-check"><input type="checkbox" id="n7-todos"> ${tr('Semua tugas dalam note harus selesai')}</label>
    <label class="sh-lab">${tr('Lakukan')}<select class="sh-inp" id="n7-action"><option value="atur-properti">${tr('Atur properti')}</option><option value="tambah-tag">${tr('Tambah tag manual')}</option><option value="sematkan">${tr('Sematkan note')}</option><option value="arsipkan">${tr('Arsipkan note')}</option></select></label>
    <label class="sh-lab">${tr('Kunci aksi')}<input class="sh-inp" id="n7-action-key"></label><label class="sh-lab">${tr('Nilai aksi')}<input class="sh-inp" id="n7-action-value"></label>
    <button type="button" class="btn btn-sec" data-n7-preview>${tr('Pratinjau aturan')}</button>
    ${pesan ? `<p role="alert">${esc(pesan)}</p>` : ''}
    ${pending ? `<div class="n7-preview"><b>${tr('Pratinjau')}</b>${pending.map(p => `<p>${esc(p.sesudah.title || tr('Tanpa judul'))}: ${esc(p.aturan.map(a => a.nama).join(', '))}</p>`).join('') || `<p>${tr('Tidak ada note yang cocok sekarang.')}</p>`}<button type="button" class="btn btn-pri" data-n7-apply>${tr('Aktifkan aturan dan terapkan pratinjau')}</button></div>` : ''}
  </div>`;
  const history = `<div class="n7-history"><b>${tr('Riwayat tindakan')}</b>${log.length ? log.slice(0, 12).map(x => `<div class="n7-log"><span>${esc(new Date(x.at).toLocaleString())} · ${esc(x.ruleNama || '')} · ${x.perubahan.length} ${tr('note')}</span><button type="button" class="sf-mini" data-n7-undo="${esc(x.id)}">${tr('Urungkan')}</button></div>`).join('') : `<p>${tr('Belum ada tindakan otomatis.')}</p>`}</div>`;
  openPop(sheet({ ikon: 'i-settings', judul: tr('Otomasi aturan'), catatan: esc(tr('Aturan hanya berjalan di note yang terlihat. Pratinjau dulu; semua aksi tercatat dan dapat diurungkan.')),
    isi: form + `<div class="n7-rules"><b>${tr('Aturan tersimpan')}</b>${rules.length ? rules.map(barisRule).join('') : `<p>${tr('Belum ada aturan.')}</p>`}</div>` + history,
    kaki: shAksi({ batal: tr('Tutup'), tutup: true }) }));
}

export function bindAturan() {
  if (aktif) return; aktif = true;
  seen = new Map((state.notes || []).map(n => [n.id, capNote(n)]));
  onAfterSave(jalankanOtomatis);
  document.addEventListener('click', async e => {
    if (e.target.closest?.('[data-aturan-buka]')) { pending = null; await tampilkan(); return; }
    if (e.target.closest?.('[data-n7-preview]')) {
      const q = id => document.getElementById(id)?.value.trim() || '';
      const kondisi = { ...(q('n7-tag') ? { tag: q('n7-tag') } : {}), ...(q('n7-title') ? { titleIncludes: q('n7-title') } : {}), ...(q('n7-prop-key') ? { property: { k: q('n7-prop-key'), v: q('n7-prop-value') } } : {}), ...(document.getElementById('n7-todos')?.checked ? { semuaTugasSelesai: true } : {}) };
      if (!Object.keys(kondisi).length) { await tampilkan(tr('Tambahkan setidaknya satu kondisi agar aturan tidak mengenai semua note.')); return; }
      const tipe = q('n7-action');
      const aksi = tipe === 'atur-properti' ? { tipe, kunci: q('n7-action-key'), nilai: q('n7-action-value') } : tipe === 'tambah-tag' ? { tipe, tag: q('n7-action-key') } : { tipe, nilai: true };
      const rule = { id: idBaru(), nama: q('n7-name') || tr('Aturan baru'), aktif: true, pemicu: q('n7-trigger'), kondisi, aksi };
      pending = pratinjauAturan([rule], (state.notes || []).filter(n => !n.deletedAt && terlihat(n)), { pemicu: rule.pemicu });
      pending.rule = rule;
      await tampilkan(); return;
    }
    if (e.target.closest?.('[data-n7-apply]')) {
      if (!pending?.rule) return;
      const rule = { ...pending.rule, aktif: true }, rules = bacaRules().filter(x => x.id !== rule.id); rules.unshift(rule);
      if (!simpanRules(rules)) { await tampilkan(tr('Aturan tidak dapat disimpan di perangkat ini.')); return; }
      if (pending.length) {
        const next = terapkanPratinjau(state.notes, pending); state.notes.splice(0, state.notes.length, ...next);
        await simpanPerubahan(pending.map(p => ({ ...p, aturan: [{ id: rule.id, nama: rule.nama }] })), rule.nama); save();
      }
      pending = null; await tampilkan(tr('Aturan disimpan dan diaktifkan.')); return;
    }
    const toggle = e.target.closest?.('[data-n7-toggle]');
    if (toggle) { const rs = bacaRules(); const r = rs.find(x => x.id === toggle.dataset.n7Toggle); if (r) { r.aktif = toggle.checked; simpanRules(rs); } return; }
    const del = e.target.closest?.('[data-n7-delete]');
    if (del) { simpanRules(bacaRules().filter(x => x.id !== del.dataset.n7Delete)); await tampilkan(); return; }
    const undo = e.target.closest?.('[data-n7-undo]');
    if (undo) {
      const log = await bacaLog(), item = log.find(x => x.id === undo.dataset.n7Undo);
      if (!item) return;
      const hasil = urungkanAturan(state.notes, item.perubahan);
      if (!hasil.berhasil) { await tampilkan(tr('Note berubah sejak aksi; urungkan dibatalkan agar suntingan baru aman.')); return; }
      state.notes.splice(0, state.notes.length, ...hasil.notes); log.splice(log.indexOf(item), 1); await tulisLog(log);
      for (const perubahan of item.perubahan) { const note = state.notes.find(n => n.id === perubahan.noteId); if (note) seen.set(note.id, capNote(note)); }
      guard = true; try { save(); } finally { guard = false; }
      await tampilkan(tr('Aksi aturan berhasil diurungkan.'));
    }
  });
}
