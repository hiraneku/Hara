/* Bagikan catatan (Bagian A5): Web Share bila peramban mendukungnya;
   tanpa dukungan, salin teks markdown ke papan klip. Tidak mengubah
   data catatan apa pun. */

import { state } from '../core/store.js?v=20260908154914';
import { toast } from '../core/toast.js?v=20260908154914';
import { markdownDariCatatan } from './data-io.js?v=20260908154914';

export async function bagikanCatatan(id) {
  const n = id
    ? state.notes.find(x => x.id === id)
    : state.notes.find(x => x.id === state.openId);
  if (!n) return;
  const teks = markdownDariCatatan(n);
  const judul = (n.title && String(n.title).trim()) || 'Tanpa judul';

  if (typeof navigator !== 'undefined' && navigator.share instanceof Function) {
    try {
      await navigator.share({ title: judul, text: teks });
      return;
    } catch (err) {
      if (err && (err.name === 'AbortError' || err.name === 'NotAllowedError')) return;
      /* izin lain gagal → coba salin sebagai cadangan */
    }
  }
  const ok = await salinTeks(teks);
  toast(ok
    ? 'Catatan disalin — tempel di mana saja'
    : 'Perangkat ini tidak mendukung berbagi');
}

async function salinTeks(teks) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText instanceof Function) {
      const ok = await navigator.clipboard.writeText(teks);
      return ok === undefined ? true : ok;
    }
  } catch (e) { /* turun ke cara lama */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = teks;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return !!ok;
  } catch (e) {
    return false;
  }
}
