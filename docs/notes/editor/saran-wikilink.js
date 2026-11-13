/* Saran wikilink dari judul catatan yang sudah ada. Tidak mengubah isi sampai
   pengguna menyetujui; judul catatan terkunci tidak pernah disarankan. */
import { state } from '../../core/store.js?v=20261105210000';
import { terlihat } from '../kunci.js?v=20261105210000';
import { caretEnd } from './caret.js?v=20261105210000';
import { refresh } from './cleanup.js?v=20261105210000';
import { snap, undo } from './history.js?v=20261105210000';
import { toast } from '../../core/toast.js?v=20261105210000';
import { t as tr } from '../../core/i18n.js?v=20261105210000';

export function cocokJudulDiAkhir(teks, idAktif = null) {
  const raw = String(teks || '');
  const notes = state.notes
    .filter(n => n && !n.deletedAt && n.id !== idAktif && terlihat(n))
    .map(n => ({ id: n.id, judul: String(n.title || '').trim() }))
    .filter(n => n.judul.length >= 4)
    .sort((a, b) => b.judul.length - a.judul.length);
  const lower = raw.toLocaleLowerCase();
  /* Ambil hanya delimiter penutup supaya judul boleh diikuti tanda baca,
     tetapi jangan pernah mencocokkan bagian akhir sebuah kata. */
  const sisa = raw.match(/[\s,;:!?)]*$/u)?.[0] || '';
  const akhir = raw.length - sisa.length;
  for (const n of notes) {
    const awal = akhir - n.judul.length;
    if (awal < 0 || lower.slice(awal, akhir) !== n.judul.toLocaleLowerCase()) continue;
    if (awal && !/[\s([{]$/u.test(raw.slice(0, awal))) continue;
    /* Tanpa delimiter, pengguna mungkin masih sedang mengetik judul. */
    if (!sisa) continue;
    return { id: n.id, judul: n.judul, awal, akhir, sisa, teks: raw };
  }
  return null;
}

export function jadikanWikilink(blok, calon) {
  if (!blok || !blok.isConnected || !calon || blok.textContent !== calon.teks) return false;
  if (!blok.classList.contains('b-p') || Array.from(blok.children).some(x => !x.classList.contains('blk-h'))) return false;
  const teks = Array.from(blok.childNodes).filter(n => n.nodeType === 3);
  if (teks.length !== 1 || teks[0].data !== calon.teks) return false;
  const node = teks[0], parent = node.parentNode;
  if (!parent) return false;
  const sesudah = node.nextSibling;
  const span = document.createElement('span');
  span.className = 'wl';
  span.textContent = `[[${calon.judul}]]`;
  const tail = document.createTextNode(calon.sisa);
  snap();
  if (calon.awal) node.data = calon.teks.slice(0, calon.awal);
  else node.remove();
  parent.insertBefore(span, calon.awal ? node.nextSibling : sesudah);
  if (calon.sisa) parent.insertBefore(tail, span.nextSibling);
  caretEnd(blok);
  refresh();
  const htmlSesudah = document.querySelector('.ed-doc')?.innerHTML;
  toast(tr('Tautan ke {judul} ditambahkan.', { judul: calon.judul }), {
    label: tr('Urungkan'),
    cb: () => {
      /* Jangan sampai toast basi membatalkan edit lain yang dilakukan
         setelah tautan dibuat. */
      if (document.querySelector('.ed-doc')?.innerHTML !== htmlSesudah) return;
      if (undo()) refresh();
    },
  }, 3500);
  return true;
}
