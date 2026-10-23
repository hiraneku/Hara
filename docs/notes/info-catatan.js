/* Info catatan — ringkasan angka satu catatan (Peta Master Bagian 5).

   Statistik global sudah ada (heatmap & grafik menulis), tapi saat
   menulis kita sering ingin tahu hal yang lebih dekat: berapa kata di
   catatan INI, berapa to-do yang sudah selesai, berapa gambar dan
   lampiran, serta berapa perkiraan waktu membacanya.

   Semua angka diturunkan dari blocks saat panel dibuka — tidak ada
   nilai yang disimpan ganda, jadi tidak mungkin basi setelah disunting. */

import { state } from '../core/store.js?v=20261023231757';
import { esc } from '../core/dom.js?v=20261023231757';
import { t as tr, LOKALE } from '../core/i18n.js?v=20261023231757';
import { openPop } from './menus/pop.js?v=20261023231757';
import { plainText } from './note-model.js?v=20261023231757';
import { tagUntukTampil } from './tags.js?v=20261023231757';

export function statistikCatatan(note) {
  const blocks = Array.isArray(note?.blocks) ? note.blocks : [];
  const teks = plainText(note || {}).replace(/\s+/g, ' ').trim();
  const kata = teks ? teks.split(/\s+/).filter(Boolean).length : 0;

  const todo = blocks.filter(b => b && b.type === 'todo');
  const selesai = todo.filter(b => b.meta && b.meta.checked).length;
  const gambar = blocks.filter(b => b && b.type === 'image').length;
  const lampiran = blocks.filter(b => b && b.type === 'file').length;
  const audio = blocks.filter(b => b && b.type === 'audio').length;

  let tautan = 0;
  blocks.forEach(b => {
    const isi = String((b && b.content) || '');
    tautan += (isi.match(/\[\[/g) || []).length;
  });

  let tag = [];
  try { tag = tagUntukTampil(note) || []; }
  catch (e) { tag = Array.isArray(note?.tags) ? note.tags : []; }

  return {
    kata,
    huruf: teks.length,
    blok: blocks.length,
    todo: todo.length,
    selesai,
    gambar,
    lampiran,
    audio,
    tautan,
    tag: Array.isArray(tag) ? tag.length : 0,
    menit: kata ? Math.max(1, Math.ceil(kata / 200)) : 0,
    createdAt: Number(note?.createdAt) || 0,
    updatedAt: Number(note?.updatedAt) || 0,
  };
}

function formatTanggal(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  try {
    return new Intl.DateTimeFormat(LOKALE(), {
      dateStyle: 'medium', timeStyle: 'short',
    }).format(d);
  } catch (e) {
    try { return d.toLocaleString(); } catch (err) { return '—'; }
  }
}

const angka = n => Number(n || 0).toLocaleString(LOKALE());

export function bukaInfoCatatan(jangkar) {
  const n = state.notes.find(x => x.id === state.openId);
  if (!n) return;

  const s = statistikCatatan(n);
  const item = (label, nilai) =>
    `<div class="info-item"><span class="info-k">${label}</span><b class="info-v">${nilai}</b></div>`;

  openPop(`<div class="info-sheet">
    <div class="pop-h">${tr('Info catatan')}</div>
    <p class="pop-note">${esc((n.title || '').trim() || tr('Tanpa judul'))}</p>
    <div class="info-grid">
      ${item(tr('Kata'), angka(s.kata))}
      ${item(tr('Huruf'), angka(s.huruf))}
      ${item(tr('Blok'), angka(s.blok))}
      ${item(tr('To-do selesai'), `${angka(s.selesai)}/${angka(s.todo)}`)}
      ${item(tr('Gambar'), angka(s.gambar))}
      ${item(tr('Lampiran'), angka(s.lampiran))}
      ${item(tr('Tautan'), angka(s.tautan))}
      ${item(tr('Tag'), angka(s.tag))}
    </div>
    <div class="info-meta">
      <div><span>${tr('Waktu baca')}</span><b>${s.menit ? `${angka(s.menit)} ${tr('menit')}` : '—'}</b></div>
      <div><span>${tr('Dibuat')}</span><b>${formatTanggal(s.createdAt)}</b></div>
      <div><span>${tr('Terakhir diubah')}</span><b>${formatTanggal(s.updatedAt)}</b></div>
    </div>
    <div class="cg-aksi">
      <button type="button" class="btn btn-sec" data-pop-close>${tr('Tutup')}</button>
    </div>
  </div>`);
}
