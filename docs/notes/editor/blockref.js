/* Tautan blok — menandai satu blok dengan id supaya bisa dirujuk
   dari catatan lain, seperti `[[Catatan#^a3f2]]` di Obsidian.

   Blok yang ditandai mendapat atribut `data-ref`. Penandanya ditampilkan
   CSS lewat ::after, jadi tidak ikut terbaca sebagai teks catatan. */

import { docEl, curBlock, nearestEditable } from './caret.js?v=20260907005847';
import { refresh } from './cleanup.js?v=20260907005847';
import { state } from '../../core/store.js?v=20260907005847';
import { toast } from '../../core/toast.js?v=20260907005847';

const acak = () => Math.random().toString(36).slice(2, 6);

/* Id yang belum dipakai di catatan mana pun. */
function idBebas() {
  const pakai = new Set();
  state.notes.forEach(n => {
    (n.blocks || []).forEach(bl => {
      if (bl.meta && bl.meta.ref) pakai.add(bl.meta.ref);
    });
  });
  let id;
  do { id = acak(); } while (pakai.has(id));
  return id;
}

/* Beri / cabut tanda pada blok tempat kursor berada. */
export function toggleRef() {
  const d = docEl();
  if (!d) return;
  let b = curBlock();
  if (!b) return;
  b = nearestEditable(b);
  if (!b) return;

  if (b.hasAttribute('data-ref')) {
    b.removeAttribute('data-ref');
    refresh();
    toast('Tanda blok dilepas');
    return;
  }
  const id = idBebas();
  b.setAttribute('data-ref', id);
  refresh();
  salin('^' + id);
}

/* Salin rujukan lengkap ke papan klip. */
function salin(teks) {
  const n = state.notes.find(x => x.id === state.openId);
  const judul = (n && n.title) || 'Tanpa judul';
  const penuh = `[[${judul}#${teks}]]`;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(penuh);
      toast('Rujukan disalin: ' + penuh);
      return;
    }
  } catch (e) {}
  toast('Blok ditandai ' + teks);
}

/* Semua blok bertanda di catatan yang sedang terbuka — untuk menu. */
export function daftarRef() {
  const d = docEl();
  if (!d) return [];
  return Array.from(d.querySelectorAll('[data-ref]')).map(b => ({
    id: b.getAttribute('data-ref'),
    teks: (b.textContent || '').replace(/[\u200b\u00a0]/g, ' ').trim().slice(0, 60) || '(kosong)'
  }));
}
