/**
 * Dialog alat lanjutan Bulk Renamer (K21–K25, K22, K23).
 * Dibuka dari command palette. Logika ada di lanjutan.js; modul ini hanya UI.
 * Menerima `ctx` dari index.js: { state, render, esc }.
 */

import { openPop, closeAll } from '../notes/menus/pop.js?v=20261029100000';
import { t as tr } from '../core/i18n.js?v=20261029100000';
import { toast } from '../core/toast.js?v=20261029100000';
import { unduh } from '../notes/data-io.js?v=20261029100000';
import { RULE_TYPES, RULE_METADATA, createRule } from './model.js?v=20261029100000';
import {
  PUSTAKA_POLA, jelaskanRegex, validasiRegex, belajarDariContoh,
  buatResep, bacaResep, hitungSha256, dHashDariBlob, kelompokDuplikat,
  OP_KONDISI, FIELD_KONDISI,
} from './lanjutan.js?v=20261029100000';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const kotak = html => `<div class="rn-modal-box" style="max-width:520px">${html}</div>`;
const judul = (t) => `<div style="display:flex;align-items:center;justify-content:space-between"><h3 class="rn-modal-title">${esc(t)}</h3><button class="btn btn-sec" data-pop-close style="height:28px;padding:0 8px;font-size:11px">✕</button></div>`;

/** Pasang penangan klik untuk dialog yang baru dibuka. */
function sambung(ctx, handler) {
  const el = document.getElementById('pop');
  if (!el) return;
  el.onclick = e => {
    const b = e.target.closest('[data-alat]');
    if (b) handler(b.dataset.alat, b, el);
  };
  el.oninput = e => { if (e.target.dataset && e.target.dataset.alatInput) handler('input:' + e.target.dataset.alatInput, e.target, el); };
  el.onchange = e => { if (e.target.dataset && e.target.dataset.alatInput) handler('change:' + e.target.dataset.alatInput, e.target, el); };
}

/* ───────── K24 · regex dengan penjelasan & pustaka ───────── */
export function bukaRegex(ctx) {
  const isi = () => `
    ${judul(tr('Regex: penjelasan & pustaka'))}
    <input class="rn-input-text" id="alat-pola" data-alat-input="pola" placeholder="(\\d{4})-(\\d{2})" style="width:100%;margin-top:8px">
    <div id="alat-penjelasan" style="font-size:12.5px;margin-top:8px;max-height:200px;overflow:auto"></div>
    <div style="margin-top:10px;font-size:12px;color:var(--muted)">${tr('Pustaka pola (ketuk untuk memakai):')}</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">
      ${PUSTAKA_POLA.map((p, i) => `<button class="btn btn-sec" data-alat="pustaka" data-i="${i}" style="font-size:11.5px">${esc(p.nama)}</button>`).join('')}
    </div>
    <div class="rn-actions-top" style="justify-content:flex-end;margin-top:12px">
      <button class="btn btn-pri" data-alat="tambah-regex">${tr('Jadikan Cari & Ganti')}</button>
    </div>`;
  openPop(kotak(isi()));
  sambung(ctx, (aksi, el) => {
    const pola = () => document.getElementById('alat-pola').value;
    const perbarui = () => {
      const p = pola();
      const out = document.getElementById('alat-penjelasan');
      if (!p) { out.innerHTML = ''; return; }
      const j = jelaskanRegex(p);
      out.innerHTML = j.ok
        ? j.bagian.map(b => `<div><code>${esc(b.token)}</code> — ${esc(b.arti)}</div>`).join('')
        : `<div style="color:var(--danger,#c33)">${tr('Pola tidak valid:')} ${esc(j.pesan)}</div>`;
    };
    if (aksi === 'input:pola') return perbarui();
    if (aksi === 'pustaka') {
      const p = PUSTAKA_POLA[Number(el.dataset.i)];
      document.getElementById('alat-pola').value = p.pola;
      perbarui();
      return;
    }
    if (aksi === 'tambah-regex') {
      const p = pola();
      const v = validasiRegex(p);
      if (!p || !v.ok) { toast(tr('Pola tidak valid:') + ' ' + (v.pesan || '')); return; }
      const pustaka = PUSTAKA_POLA.find(x => x.pola === p);
      ctx.state.rules.push(createRule(RULE_TYPES.REPLACE, { find: p, replaceWith: pustaka ? pustaka.ganti : '', isRegex: true, matchCase: false, matchAll: true }));
      closeAll();
      toast(tr('Aturan Cari & Ganti ditambahkan'));
      ctx.render();
    }
  });
}

/* ───────── K21 · belajar dari contoh ───────── */
export function bukaBelajarContoh(ctx) {
  const berkas = ctx.state.files.slice(0, 3);
  if (berkas.length === 0) { toast(tr('Tambahkan berkas dulu')); return; }
  const baris = berkas.map((f, i) => `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px">
      <div style="font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(f.originalName)}">${esc(f.originalName)}</div>
      <input class="rn-input-text" data-alat-contoh="${i}" placeholder="${tr('nama yang diinginkan')}">
    </div>`).join('');
  openPop(kotak(`
    ${judul(tr('Belajar dari contoh'))}
    <p style="font-size:12.5px;color:var(--muted);margin:6px 0 0">${tr('Ketik nama yang diinginkan untuk satu atau lebih berkas. Hara mencari aturan yang menjelaskan semuanya.')}</p>
    ${baris}
    <div class="rn-actions-top" style="justify-content:flex-end;margin-top:12px"><button class="btn btn-pri" data-alat="cari-contoh">${tr('Cari aturan')}</button></div>
    <div id="alat-kandidat" style="margin-top:10px"></div>`));
  sambung(ctx, (aksi, el) => {
    if (aksi !== 'cari-contoh') return;
    const contoh = [];
    document.querySelectorAll('[data-alat-contoh]').forEach(inp => {
      const v = inp.value.trim();
      if (!v) return;
      const i = Number(inp.dataset.alatContoh);
      contoh.push({ indeks: i, asal: berkas[i].originalName, hasil: v });
    });
    if (contoh.length === 0) { toast(tr('Isi minimal satu contoh')); return; }
    const { kandidat } = belajarDariContoh(contoh);
    const out = document.getElementById('alat-kandidat');
    out.innerHTML = kandidat.length === 0
      ? `<div style="font-size:12.5px;color:var(--muted)">${tr('Belum ada aturan yang cocok dengan semua contoh.')}</div>`
      : kandidat.map((k, i) => `<div class="rn-rule-header-row" style="justify-content:space-between;margin-top:4px"><span style="font-size:12.5px">${esc(k.label)}</span><button class="btn btn-sec" data-alat="pakai" data-i="${i}" style="font-size:11.5px">${tr('Pakai')}</button></div>`).join('');
    out.dataset.kandidat = JSON.stringify(kandidat.map(k => ({ type: k.rule.type, params: k.rule.params })));
  });
  // klik "Pakai" ditangani di handler yang sama lewat delegasi
  const el = document.getElementById('pop');
  const lama = el.onclick;
  el.onclick = e => {
    const b = e.target.closest('[data-alat="pakai"]');
    if (b) {
      const daftar = JSON.parse(document.getElementById('alat-kandidat').dataset.kandidat || '[]');
      const k = daftar[Number(b.dataset.i)];
      if (k) {
        ctx.state.rules.push(createRule(k.type, k.params));
        closeAll();
        toast(tr('Aturan ditambahkan dari contoh'));
        ctx.render();
      }
      return;
    }
    lama(e);
  };
}

/* ───────── K23 · syarat & grup aturan ───────── */
export function bukaSyaratAturan(ctx) {
  if (ctx.state.rules.length === 0) { toast(tr('Belum ada aturan')); return; }
  const pilih = ctx.state.rules.map((r, i) => `<option value="${r.id}">${i + 1}. ${esc((RULE_METADATA[r.type] || {}).label || r.type)}</option>`).join('');
  openPop(kotak(`
    ${judul(tr('Syarat & grup aturan'))}
    <div class="rn-field" style="margin-top:8px"><label>${tr('Aturan:')}</label>
      <select class="rn-select-clean" id="alat-aturan" style="width:100%">${pilih}</select></div>
    <div class="rn-form-grid" style="margin-top:8px">
      <div class="rn-field"><label>${tr('Bidang')}</label>
        <select class="rn-select-clean" id="alat-bidang">${FIELD_KONDISI.map(f => `<option>${f}</option>`).join('')}</select></div>
      <div class="rn-field"><label>${tr('Operator')}</label>
        <select class="rn-select-clean" id="alat-op">${OP_KONDISI.map(o => `<option>${o}</option>`).join('')}</select></div>
      <div class="rn-field" style="grid-column:1/-1"><label>${tr('Nilai')}</label>
        <input class="rn-input-text" id="alat-nilai" placeholder="jpg"></div>
      <div class="rn-field" style="grid-column:1/-1"><label>${tr('Nama grup (kosongkan jika tidak)')}</label>
        <input class="rn-input-text" id="alat-grup" placeholder="foto"></div>
    </div>
    <div class="rn-actions-top" style="justify-content:flex-end;margin-top:12px;gap:6px">
      <button class="btn btn-sec" data-alat="hapus-syarat">${tr('Hapus syarat')}</button>
      <button class="btn btn-pri" data-alat="simpan-syarat">${tr('Simpan')}</button>
    </div>`));
  sambung(ctx, (aksi) => {
    const rule = ctx.state.rules.find(r => r.id === document.getElementById('alat-aturan').value);
    if (!rule) return;
    if (aksi === 'simpan-syarat') {
      const nilai = document.getElementById('alat-nilai').value;
      const grup = document.getElementById('alat-grup').value.trim();
      rule.when = nilai !== '' ? { mode: 'all', conds: [{ field: document.getElementById('alat-bidang').value, op: document.getElementById('alat-op').value, value: nilai }] } : undefined;
      if (rule.when === undefined) delete rule.when;
      if (grup) rule.group = grup; else delete rule.group;
      closeAll();
      toast(tr('Syarat aturan disimpan'));
      ctx.render();
    } else if (aksi === 'hapus-syarat') {
      delete rule.when;
      closeAll();
      toast(tr('Syarat aturan dihapus'));
      ctx.render();
    }
  });
}

/* ───────── K25 · resep ekspor / impor ───────── */
export function eksporResep(ctx) {
  if (ctx.state.rules.length === 0) { toast(tr('Belum ada aturan')); return; }
  const teks = buatResep(ctx.state.rules, 'Resep Hara');
  unduh('resep-renamer.json', teks, 'application/json');
  toast(tr('Resep diunduh'));
}

export function imporResepDariTeks(ctx, teks) {
  const hasil = bacaResep(teks);
  if (!hasil.ok) { toast(tr('Resep tidak valid: ') + hasil.pesan); return false; }
  for (const r of hasil.aturan) {
    const rule = createRule(r.type, r.params);
    rule.enabled = r.enabled;
    if (r.when) rule.when = r.when;
    if (r.group) rule.group = r.group;
    ctx.state.rules.push(rule);
  }
  toast(tr('Resep diimpor: {n} aturan', { n: hasil.aturan.length }));
  ctx.render();
  return true;
}

/* ───────── K22 · cari berkas duplikat ───────── */
export async function bukaDuplikat(ctx) {
  const berkas = ctx.state.files.filter(f => f.file);
  if (berkas.length < 2) { toast(tr('Butuh minimal dua berkas')); return; }
  openPop(kotak(`${judul(tr('Cari berkas duplikat'))}<div id="alat-dup" style="font-size:12.5px;margin-top:8px">${tr('Memindai…')}</div>`));
  const items = [];
  for (const f of berkas) {
    const sha = await hitungSha256(await f.file.arrayBuffer());
    let dhash = null;
    if (f.file.type && f.file.type.startsWith('image/')) {
      try { dhash = await dHashDariBlob(f.file); } catch (e) { dhash = null; }
    }
    items.push({ id: f.id, sha, dhash, nama: f.originalName });
  }
  const grup = kelompokDuplikat(items, { ambangGambar: 5 });
  const out = document.getElementById('alat-dup');
  if (!out) return;
  const nama = id => (items.find(i => i.id === id) || {}).nama || id;
  out.innerHTML = grup.length === 0
    ? `<div style="color:var(--muted)">${tr('Tidak ada duplikat ditemukan.')}</div>`
    : grup.map(g => `<div style="margin-top:8px"><b>${g.jenis === 'persis' ? tr('Identik') : tr('Mirip (gambar)')}</b>${g.anggota.map(id => `<div>· ${esc(nama(id))}</div>`).join('')}</div>`).join('');
}

/** Pilih berkas resep JSON lalu impor. */
export function pilihResepUntukImpor(ctx) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.onchange = async () => {
    const berkas = input.files && input.files[0];
    if (!berkas) return;
    imporResepDariTeks(ctx, await berkas.text());
  };
  input.click();
}
