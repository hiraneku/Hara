/* B4 · Tautan pada gambar dan objek tulisan (sketsa).

   Gambar dan sketsa sama-sama blok `image`. Tautan disimpan sebagai atribut
   data-url pada figur (dibaca balik ke meta.url di elToBlock). Lencana kecil
   `.img-tautan` di pojok kiri-bawah membuka tautan di tab baru.

   Alamat yang lolos hanya yang diizinkan url-aman.js (http, https, mailto, tel).
   Dialog ini dipanggil dari chip "Tautan" di bilah mini gambar (tata-gambar.js). */

import { openPop, closeAll } from './menus/pop.js?v=20261029180000';
import { refresh } from './editor/cleanup.js?v=20261029180000';
import { snap } from './editor/history.js?v=20261029180000';
import { toast } from '../core/toast.js?v=20261029180000';
import { esc } from '../core/dom.js?v=20261029180000';
import { t as tr } from '../core/i18n.js?v=20261029180000';
import { tautanAman } from './url-aman.js?v=20261029180000';
import { badgeTautanGambar } from './note-model.js?v=20261029180000';

/* Alamat tanpa skema dianggap https (sama dengan dialog kartu tautan). */
export function alamatDariInput(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  return tautanAman(/^[a-z][a-z0-9+.-]*:/i.test(s) ? s : 'https://' + s);
}

/* Pasang atau lepas lencana tautan di figur tanpa membangun ulang seluruh blok. */
export function terapkanTautanKeFigur(fig, url) {
  fig.querySelectorAll(':scope > .img-tautan').forEach(el => el.remove());
  if (url) {
    fig.setAttribute('data-url', url);
    const wrap = document.createElement('div');
    wrap.innerHTML = badgeTautanGambar(url);
    const lencana = wrap.firstElementChild;
    if (lencana) {
      const pegangan = fig.querySelector(':scope > .img-grip, :scope > .img-putar, :scope > .img-move');
      if (pegangan) fig.insertBefore(lencana, pegangan);
      else fig.appendChild(lencana);
    }
  } else {
    fig.removeAttribute('data-url');
  }
}

export function bukaDialogTautanGambar(fig) {
  if (!fig || !fig.isConnected) return;
  const u0 = fig.getAttribute('data-url') || '';
  const html = `<div class="pop-h">${esc(tr('Tautan gambar'))}</div>
    <div style="padding:8px 12px;display:flex;flex-direction:column;gap:8px">
      <input class="in" id="tg-url" type="url" placeholder="https://contoh.id/artikel" value="${esc(u0)}">
      <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
        ${u0 ? `<button type="button" class="btn btn-sec" id="tg-hapus">${esc(tr('Hapus tautan'))}</button>` : ''}
        <button type="button" class="btn btn-sec" id="tg-batal">${esc(tr('Batal'))}</button>
        <button type="button" class="btn btn-pri" id="tg-simpan">${esc(tr('Simpan'))}</button>
      </div>
    </div>`;
  openPop(html, fig);
  const p = document.getElementById('pop');
  p?.querySelector('#tg-url')?.focus();
  p?.querySelector('#tg-batal')?.addEventListener('click', closeAll);
  p?.querySelector('#tg-hapus')?.addEventListener('click', () => {
    closeAll();
    if (!fig.isConnected) return;
    snap();
    terapkanTautanKeFigur(fig, '');
    refresh();
  });
  p?.querySelector('#tg-simpan')?.addEventListener('click', () => {
    const raw = (p.querySelector('#tg-url')?.value || '').trim();
    if (!raw) { toast(tr('Masukkan alamat tautan terlebih dahulu')); return; }
    const url = alamatDariInput(raw);
    if (!url) { toast(tr('Alamat tidak didukung. Pakai http, https, mailto, atau tel.')); return; }
    closeAll();
    if (!fig.isConnected) return;
    snap();
    terapkanTautanKeFigur(fig, url);
    refresh();
  });
}
