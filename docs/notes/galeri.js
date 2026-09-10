/* Galeri gambar catatan (C15).

   Semua gambar yang dipakai catatan (aktif & arsip) dikumpulkan dari
   IndexedDB lewat id blob di meta blok. Ketuk satu gambar → blob yang
   SAMA disisipkan ke editor (tidak disalin — berbagi berkas). Gambar
   ditampilkan sebagai thumbnail kecil (dibuat sekali per sesi). */

import { state } from '../core/store.js?v=20260910030412';
import { esc } from '../core/dom.js?v=20260910030412';
import { openPop, closeAll } from './menus/pop.js?v=20260910030412';
import { toast } from '../core/toast.js?v=20260910030412';
import { ambilBlob } from '../core/blobs.js?v=20260910030412';
import { terlihat } from './kunci.js?v=20260910030412';
import { t as tr } from '../core/i18n.js?v=20260910030412';

const MAKS_TAMPIL = 120;   /* popup kecil — cukup yang terbaru */

/* Kumpulkan { id, alt } gambar unik dari catatan yang tidak dihapus,
   diurut dari catatan terbaru. */
function gambarDariCatatan() {
  const hasil = [];
  const lihat = (id, alt) => {
    if (id && !hasil.some(x => x.id === id)) hasil.push({ id, alt });
  };
  const daftar = state.notes
    .filter(n => !n.deletedAt && terlihat(n))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  for (const n of daftar) {
    (n.blocks || []).forEach(b => {
      if (b.type === 'image' && b.meta && b.meta.blobId) {
        let alt = '';
        if (b.meta.alt) alt = String(b.meta.alt).trim();
        lihat(String(b.meta.blobId), alt);
      }
    });
  }
  return hasil;
}

/* Judul catatan pertama yang memakai blob ini (untuk keterangan kecil). */
function catatanPemakai(id) {
  const n = state.notes.find(x => !x.deletedAt && terlihat(x) &&
    (x.blocks || []).some(b => b.type === 'image' && b.meta &&
      b.meta.blobId === id));
  return n && n.title ? String(n.title).trim() : '';
}

/* Thumbnail kecil dari blob (dimuat sekali per sesi, dipakai ulang). */
const cacheThumb = new Map();
function thumbnail(blob, s = 260) {
  return new Promise(res => {
    try {
      const u = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(u);
        const c = document.createElement('canvas');
        const skala = Math.min(1, s / Math.max(img.width, img.height));
        c.width = Math.max(1, Math.round(img.width * skala));
        c.height = Math.max(1, Math.round(img.height * skala));
        const konteks = c.getContext && c.getContext('2d');
        if (!konteks) { res(null); return; }
        konteks.drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = () => { URL.revokeObjectURL(u); res(null); };
      img.src = u;
    } catch (e) { res(null); }
  });
}

const kisiHtml = daftar =>
  `<div class="pop-h">${tr('Galeri gambar')}</div>
   <p class="pop-note">${tr('Gambar dari semua catatan — ketuk untuk menyisipkan di posisi kursor. Yang baru muncul paling depan.')}</p>
   <div class="gal-kisi">${daftar.map(x =>
     `<button type="button" class="gal-i" data-gal="${esc(x.id)}"
        title="${tr('Sisipkan gambar ini')}">
        <span class="gal-t dim" aria-hidden="true"></span>
        <span class="gal-a">${esc(x.asal)}</span>
      </button>`).join('')}</div>`;

/* Buka galeri. `anchor` elemen tempat popup berlabuh (tombol bar). */
export async function bukaGaleri(anchor) {
  const daftar = gambarDariCatatan();
  if (!daftar.length) {
    toast(tr('Belum ada gambar di catatan mana pun'));
    return;
  }
  const dipakai = daftar.slice(0, MAKS_TAMPIL).map(x => {
    const asal = catatanPemakai(x.id);
    return { ...x, asal: asal || tr('gambar', { n: 1 }) };  /* keterangan: kunci jamak dipaksa tunggal */
  });
  openPop(kisiHtml(dipakai), anchor || document.querySelector('.ed-doc') ||
    document.body);

  /* isi thumbnail satu per satu — popup langsung tampil, gambar menyusul */
  for (const x of dipakai) {
    const tombol = Array.from(document.querySelectorAll('#pop [data-gal]'))
      .find(el => el.getAttribute('data-gal') === x.id);
    if (!tombol) continue;
    let data = cacheThumb.get(x.id);
    if (data === undefined) {
      try {
        const blob = await ambilBlob(x.id);
        data = blob ? await thumbnail(blob) : null;
      } catch (e) { data = null; }
      cacheThumb.set(x.id, data);
    }
    const kotak = tombol.querySelector('.gal-t');
    if (!kotak) continue;
    if (data) {
      kotak.classList.remove('dim');
      const im = new Image();
      im.alt = '';
      im.src = data;
      im.className = 'gal-t-img';
      kotak.replaceWith(im);
    } else {
      kotak.textContent = tr('hilang');
    }
  }
}

/* Klik pada gambar galeri — dipasang sekali (index.js). */
export function bindGaleri() {
  document.addEventListener('click', e => {
    const g = e.target.closest ? e.target.closest('[data-gal]') : null;
    if (!g) return;
    const id = g.getAttribute('data-gal');
    if (!id) return;
    closeAll();
    import('./editor/image.js?v=20260910030412')
      .then(async m => {
        const asal = catatanPemakai(id);
        const x = gambarDariCatatan().find(y => y.id === id);
        await m.sematkanBlokGambar(id, (x && x.alt) || asal || 'gambar');
        toast(tr('Gambar disisipkan dari galeri'));
      })
      .catch(() => {});
  });
}
