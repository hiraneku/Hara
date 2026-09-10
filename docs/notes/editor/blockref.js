/* Tautan blok — menandai satu blok dengan id supaya bisa dirujuk
   dari catatan lain, seperti `[[Catatan#^a3f2]]` di Obsidian.

   Blok yang ditandai mendapat atribut `data-ref`. Penandanya ditampilkan
   CSS lewat ::after, jadi tidak ikut terbaca sebagai teks catatan. */

import { docEl, curBlock, nearestEditable } from './caret.js?v=20260910030412';
import { refresh } from './cleanup.js?v=20260910030412';
import { state } from '../../core/store.js?v=20260910030412';
import { toast } from '../../core/toast.js?v=20260910030412';
import { t as tr } from '../../core/i18n.js?v=20260910030412';

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
    toast(tr('Tanda blok dilepas'));
    return;
  }
  const id = idBebas();
  b.setAttribute('data-ref', id);
  refresh();
  salin('^' + id);
}

/* Salin rujukan lengkap ke papan klip.
   writeText mengembalikan Promise — kalau ditolak (izin) atau API-nya
   tidak ada (mis. dibuka lewat file://), jatuh ke textarea tersembunyi
   + execCommand. Kalau semuanya gagal, blok tetap sudah ditandai dan
   pengguna diberi tahu lewat toast — bukan error yang tak tertangani. */
function salin(teks) {
  const n = state.notes.find(x => x.id === state.openId);
  const judul = (n && n.title) || 'Tanpa judul';
  const penuh = `[[${judul}#${teks}]]`;
  const oke = () => toast(tr('Rujukan disalin') + ': ' + penuh);
  const gagal = () => toast(tr('Blok ditandai') + ' ' + teks);

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      const p = navigator.clipboard.writeText(penuh);
      if (p && typeof p.then === 'function') {
        p.then(oke).catch(() => salinCadangan(penuh, oke, gagal));
        return;
      }
      oke();
      return;
    }
  } catch (e) {}
  salinCadangan(penuh, oke, gagal);
}

function salinCadangan(penuh, oke, gagal) {
  try {
    const ta = document.createElement('textarea');
    ta.value = penuh;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, penuh.length);
    const berhasil = document.execCommand('copy');
    ta.remove();
    if (berhasil) return oke();
  } catch (e) {}
  gagal();
}
