/* Cari & ganti teks di dalam satu catatan (fitur baru — Peta Master Bagian 5).

   Kenapa di tingkat DOM, bukan model:
   - gambar, memo suara, rumus, dan lampiran tetap utuh karena elemennya
     tidak pernah dirender ulang;
   - hasil ganti langsung terlihat, dan autosave yang sudah ada menulis
     perubahan ke model lewat jalur biasa (refresh → saveSoon).
   Rumus, lampiran, dan URL sengaja dilewati: mengganti potongan ekspresi
   atau alamat berkas akan merusaknya, bukan memperbaiki.

   Pilihan: peka huruf besar/kecil + kata utuh. Hitungan kecocokan
   diperbarui saat mengetik supaya pengguna tahu apa yang akan berubah.
   Tombol Urungkan di toast mengembalikan DOM + judul persis seperti
   sebelum penggantian. */

import { state, save } from '../core/store.js?v=20261028093000';
import { toast } from '../core/toast.js?v=20261028093000';
import { esc } from '../core/dom.js?v=20261028093000';
import { t as tr } from '../core/i18n.js?v=20261028093000';
import { flush } from '../core/autosave.js?v=20261028093000';
import { docEl } from './editor/caret.js?v=20261028093000';
import { refresh, saveNow } from './editor/cleanup.js?v=20261028093000';
import { snap } from './editor/history.js?v=20261028093000';
import { touch } from './note-model.js?v=20261028093000';
import { openPop, closeAll } from './menus/pop.js?v=20261028093000';
import { sheet, shField, shSeg, shAksi } from './sheet.js?v=20261028093000';

/* ── pencocokan teks murni (tanpa regex, tanpa eval) ── */
const KATA = /[\p{L}\p{N}_]/u;

export function gantiTeks(teks, cari, ganti, opsi = {}) {
  const asli = String(teks == null ? '' : teks);
  const q = String(cari == null ? '' : cari);
  if (!q) return { teks: asli, jumlah: 0 };

  const peka = !!opsi.caseSensitif;
  const utuh = !!opsi.kataUtuh;
  const sumber = peka ? asli : asli.toLowerCase();
  const banding = peka ? q : q.toLowerCase();
  const gantiStr = String(ganti == null ? '' : ganti);

  let hasil = '';
  let dari = 0;
  let jumlah = 0;
  while (dari <= asli.length) {
    const i = sumber.indexOf(banding, dari);
    if (i < 0) break;
    const sebelum = i > 0 ? asli[i - 1] : '';
    const sesudah = i + q.length < asli.length ? asli[i + q.length] : '';
    if (utuh && ((sebelum && KATA.test(sebelum)) || (sesudah && KATA.test(sesudah)))) {
      hasil += asli.slice(dari, i + q.length);
      dari = i + q.length;
      continue;
    }
    hasil += asli.slice(dari, i) + gantiStr;
    dari = i + q.length;
    jumlah++;
  }
  return { teks: hasil + asli.slice(dari), jumlah };
}

export const hitungTeks = (teks, cari, opsi) => gantiTeks(teks, cari, '', opsi).jumlah;

/* ── bagian HTML blok: ganti hanya di simpul teks, tidak di tag ──
   Contoh: <b>halo</b> dunia → teks "halo" berubah, tag <b> tetap. */
function gantiHtml(html, cari, ganti, opsi) {
  const sumber = String(html == null ? '' : html);
  if (!sumber || typeof document === 'undefined') return { html: sumber, jumlah: 0 };
  const wadah = document.createElement('div');
  wadah.innerHTML = sumber;
  let jumlah = 0;
  const jalan = document.createTreeWalker(wadah, 4, null);
  const simpul = [];
  let n;
  while ((n = jalan.nextNode())) simpul.push(n);
  simpul.forEach(t => {
    const r = gantiTeks(t.data, cari, ganti, opsi);
    if (r.jumlah) { t.data = r.teks; jumlah += r.jumlah; }
  });
  return { html: wadah.innerHTML, jumlah };
}

/* Jenis blok yang isinya BUKAN teks biasa: jangan disentuh. */
const LEWATI = new Set(['divider', 'image', 'math', 'file']);

export function gantiDiBlocks(blocks, cari, ganti, opsi = {}) {
  let jumlah = 0;
  const hasil = (Array.isArray(blocks) ? blocks : []).map(b => {
    if (!b || LEWATI.has(b.type)) return b;
    const salin = { ...b, meta: { ...(b.meta || {}) } };

    if (typeof salin.content === 'string' && salin.content) {
      const r = gantiHtml(salin.content, cari, ganti, opsi);
      if (r.jumlah) { salin.content = r.html; jumlah += r.jumlah; }
    }
    if (salin.type === 'toggle' && salin.meta.summary) {
      const r = gantiTeks(salin.meta.summary, cari, ganti, opsi);
      if (r.jumlah) { salin.meta.summary = r.teks; jumlah += r.jumlah; }
    }
    if (salin.type === 'table' && Array.isArray(salin.meta.rows)) {
      salin.meta.rows = salin.meta.rows.map(baris =>
        (baris || []).map(sel => {
          const r = gantiTeks(sel, cari, ganti, opsi);
          if (r.jumlah) jumlah += r.jumlah;
          return r.teks;
        }));
    }
    if (salin.type === 'audio' && salin.meta.title) {
      const r = gantiTeks(salin.meta.title, cari, ganti, opsi);
      if (r.jumlah) { salin.meta.title = r.teks; jumlah += r.jumlah; }
    }
    if (salin.type === 'bookmark') {
      for (const k of ['title', 'desc']) {
        if (!salin.meta[k]) continue;
        const r = gantiTeks(salin.meta[k], cari, ganti, opsi);
        if (r.jumlah) { salin.meta[k] = r.teks; jumlah += r.jumlah; }
      }
    }
    return salin;
  });
  return { blocks: hasil, jumlah };
}

export function hitungDiBlocks(blocks, cari, opsi = {}) {
  return gantiDiBlocks(blocks, cari, '\u0000', opsi).jumlah;
}

/* ── DOM editor ──
   Teks tombol kontrol (bar tabel, tombol hapus, durasi) bukan isi catatan:
   jangan ikut dihitung atau diganti. */
const UI_LEWATI = [
  '.blk-h', '.tbl-bar', '.aud-btn', '.aud-speed', '.aud-del', '.aud-dur',
  '.bmk-act', '.bmk-host', '.fl-btn', '.fl-ext', '.fl-size', '.img-x',
  '.cbx', '.tgl-btn', '.tgl-del', '.math-body', '.bmk-ico', '.hamoji-stickers-layer',
].join(',');

const uiLewati = node => {
  const el = node && node.parentElement;
  return !!(el && el.closest && el.closest(UI_LEWATI));
};

function simpulTeks(root) {
  const out = [];
  if (!root || typeof document === 'undefined') return out;
  const jalan = document.createTreeWalker(root, 4, null);
  let n;
  while ((n = jalan.nextNode())) {
    if (!n.data || uiLewati(n)) continue;
    out.push(n);
  }
  return out;
}

const inputIsi = root => Array.from(root.querySelectorAll('input.tgl-sum, input.aud-title'));

export function hitungDiEditor(root, cari, opsi = {}) {
  if (!root) return 0;
  let jumlah = 0;
  simpulTeks(root).forEach(t => { jumlah += hitungTeks(t.data, cari, opsi); });
  inputIsi(root).forEach(inp => { jumlah += hitungTeks(inp.value, cari, opsi); });
  return jumlah;
}

export function gantiDiEditor(root, cari, ganti, opsi = {}) {
  if (!root) return 0;
  let jumlah = 0;
  simpulTeks(root).forEach(t => {
    const r = gantiTeks(t.data, cari, ganti, opsi);
    if (r.jumlah) { t.data = r.teks; jumlah += r.jumlah; }
  });
  inputIsi(root).forEach(inp => {
    const r = gantiTeks(inp.value, cari, ganti, opsi);
    if (r.jumlah) { inp.value = r.teks; jumlah += r.jumlah; }
  });
  /* Teks yang juga disimpan di atribut (kartu tautan, nama lampiran)
     harus ikut berubah — kalau tidak, nilai lama menang saat disimpan. */
  root.querySelectorAll('.b-bmk').forEach(el => {
    const t = el.querySelector('.bmk-title');
    const d = el.querySelector('.bmk-desc');
    if (t) el.setAttribute('data-title', t.textContent || '');
    if (d) el.setAttribute('data-desc', d.textContent || '');
  });
  root.querySelectorAll('.b-file').forEach(el => {
    const t = el.querySelector('.fl-name');
    if (t) el.setAttribute('data-name', t.textContent || '');
  });
  return jumlah;
}

/* ── ganti semua pada satu catatan ── */
export async function gantiSemuaDiCatatan(cari, ganti, opsi = {}, noteId = state.openId) {
  const q = String(cari == null ? '' : cari);
  if (!q) return { jumlah: 0 };
  await flush();

  const n = state.notes.find(x => x.id === noteId);
  if (!n) return { jumlah: 0 };
  const d = docEl();

  /* Jalur utama: editor sedang terbuka — ubah DOM langsung. */
  if (d && noteId === state.openId) {
    const t = document.querySelector('.ed-t');
    const judulLama = t ? t.value : (n.title || '');
    const jmlJudul = hitungTeks(judulLama, q, opsi);
    const jmlIsi = hitungDiEditor(d, q, opsi);
    const jumlah = jmlJudul + jmlIsi;
    if (!jumlah) return { jumlah: 0 };

    const sebelum = { judul: judulLama, html: d.innerHTML, noteId };
    snap();                      /* keadaan lama jadi tujuan undo keyboard */

    const rj = gantiTeks(judulLama, q, ganti, opsi);
    if (rj.jumlah) {
      if (t) t.value = rj.teks;
      n.title = rj.teks;
    }
    gantiDiEditor(d, q, ganti, opsi);
    touch(n);
    refresh();                   /* rekam undo + hitung ulang + jadwalkan simpan */
    await saveNow();
    return { jumlah, sebelum };
  }

  /* Tanpa editor (mis. dari Command Palette): ganti di model. */
  const rj = gantiTeks(n.title || '', q, ganti, opsi);
  const rb = gantiDiBlocks(n.blocks || [], q, ganti, opsi);
  const jumlah = rj.jumlah + rb.jumlah;
  if (!jumlah) return { jumlah: 0 };

  const sebelum = { judul: n.title || '', blocks: n.blocks, noteId };
  n.title = rj.teks;
  n.blocks = rb.blocks;
  touch(n);
  save();
  return { jumlah, sebelum };
}

export async function urungkanGanti(hasil) {
  if (!hasil || !hasil.sebelum || state.openId !== hasil.sebelum.noteId) return false;
  const n = state.notes.find(x => x.id === hasil.sebelum.noteId);
  if (!n) return false;

  if (typeof hasil.sebelum.html === 'string') {
    const d = docEl();
    if (!d) return false;
    n.title = hasil.sebelum.judul;
    const t = document.querySelector('.ed-t');
    if (t) t.value = hasil.sebelum.judul;
    d.innerHTML = hasil.sebelum.html;
    refresh();
    await saveNow();
    return true;
  }

  n.title = hasil.sebelum.judul;
  n.blocks = hasil.sebelum.blocks;
  touch(n);
  save();
  return true;
}

export async function gantiSemuaDenganUrungkan(cari, ganti, opsi = {}, noteId = state.openId) {
  const hasil = await gantiSemuaDiCatatan(cari, ganti, opsi, noteId);
  if (!hasil.jumlah) { toast(tr('Tidak ada teks yang cocok')); return 0; }
  toast(tr('{n} teks diganti', { n: hasil.jumlah }), {
    label: tr('Urungkan'),
    cb: () => { urungkanGanti(hasil); },
  }, 6000);
  return hasil.jumlah;
}

/* ── panel Cari & Ganti ── */
let opsi = { caseSensitif: false, kataUtuh: false };

const hitungSekarang = q => {
  if (!q) return 0;
  const d = docEl();
  const n = state.notes.find(x => x.id === state.openId);
  if (d) {
    const t = document.querySelector('.ed-t');
    return hitungTeks(t ? t.value : (n ? n.title : ''), q, opsi) + hitungDiEditor(d, q, opsi);
  }
  if (!n) return 0;
  return hitungTeks(n.title || '', q, opsi) + hitungDiBlocks(n.blocks || [], q, opsi);
};

function perbaruiHitungan() {
  const el = document.getElementById('cg-hasil');
  if (!el) return;
  const q = (document.getElementById('cg-cari')?.value || '').trim();
  const n = hitungSekarang(q);
  el.classList.toggle('kosong', !!q && !n);
  el.textContent = !q
    ? tr('Ketik kata yang ingin dicari')
    : (n ? tr('{n} kecocokan', { n }) : tr('Tidak ada kecocokan'));
  const tombol = document.getElementById('cg-jalan');
  if (tombol) tombol.disabled = !n;
}

export async function bukaCariGanti(jangkar, awalan = '') {
  opsi = { caseSensitif: false, kataUtuh: false };
  await flush();
  const isi = shField({
    id: 'cg-cari', ikon: 'i-search', label: tr('Cari'),
    value: awalan || '', placeholder: tr('Kata yang dicari…'), enter: 'search',
  }) + shField({
    id: 'cg-ganti', ikon: 'i-pen', label: tr('Ganti dengan'),
    placeholder: tr('Teks pengganti…'),
  }) + shSeg([
    { opsi: 'caseSensitif', teks: tr('Peka huruf'), ikon: 'i-txt' },
    { opsi: 'kataUtuh', teks: tr('Kata utuh'), ikon: 'i-check2' },
  ]) + `<div class="sh-stat" id="cg-hasil" aria-live="polite"></div>` +
    `<p class="sh-note">${tr('Mengganti di judul dan seluruh teks catatan ini. Rumus, lampiran, dan tautan tidak diubah.')}</p>`;

  openPop(sheet({
    ikon: 'i-replace',
    judul: tr('Cari & ganti'),
    catatan: esc(tr('Judul & isi catatan ini')),
    isi,
    kaki: shAksi({ batal: tr('Tutup'), tutup: true, utama: tr('Ganti semua'), utamaId: 'cg-jalan' }),
  }));

  perbaruiHitungan();
  const inp = document.getElementById('cg-cari');
  if (inp) { try { inp.focus(); inp.select(); } catch (e) { /* tua */ } }
}

export function bindCariGanti() {
  document.addEventListener('click', e => {
    if (!e.target.closest) return;

    const tog = e.target.closest('[data-cg-opsi]');
    if (tog) {
      const k = tog.dataset.cgOpsi;
      if (k !== 'caseSensitif' && k !== 'kataUtuh') return;
      opsi[k] = !opsi[k];
      tog.setAttribute('aria-pressed', String(opsi[k]));
      tog.classList.toggle('on', opsi[k]);
      perbaruiHitungan();
      return;
    }

    if (!e.target.closest('#cg-jalan')) return;
    const cari = document.getElementById('cg-cari')?.value || '';
    const ganti = document.getElementById('cg-ganti')?.value || '';
    if (!cari.trim()) { toast(tr('Ketik kata yang ingin dicari')); return; }
    const salinan = { ...opsi };
    gantiSemuaDenganUrungkan(cari, ganti, salinan)
      .then(n => { if (n) closeAll(); })
      .catch(() => toast(tr('Gagal mengganti teks')));
  });

  document.addEventListener('input', e => {
    if (!e.target || !e.target.id) return;
    if (e.target.id === 'cg-cari' || e.target.id === 'cg-ganti') perbaruiHitungan();
  });
}
