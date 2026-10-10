/* Transklusi blok (Ronde 11 · K10) dan deteksi catatan yatim (K11).

   K10 — sebuah blok yang isinya persis `![[Judul#^id]]` adalah RUJUKAN.
   Isi blok yang dirujuk tidak pernah disalin: ia dibaca langsung dari
   catatan sumber setiap kali panel digambar. Jadi sumber kebenaran tetap
   satu (blok asli), dan rujukan yang rusak terlihat sebagai rusak.
   Rujukan ditampilkan di panel "Rujukan blok" di bawah editor — bukan
   inline di editor, karena mesin caret tidak boleh disentuh untuk ini.

   K11 — catatan YATIM = tidak menaut ke catatan lain yang ada, dan tidak
   ditaut catatan lain. Dihitung dari wikilink asli.

   Murni: hanya membaca state. Tidak menulis apa pun. */

import { state } from '../core/store.js?v=20261010052725';
import { terlihat } from './kunci.js?v=20261010052725';

/* Teks polos satu blok (tanpa markup), dipangkas. */
export const teksPolos = b => {
  const w = document.createElement('div');
  w.innerHTML = (b && b.content) || '';
  return (w.textContent || '').replace(/\s+/g, ' ').trim();
};

/* Pola rujukan: seluruh isi blok = ![[Judul#^id]]. Judul boleh berisi spasi. */
const RUJUKAN = /^!\[\[([^\[\]#|]+?)#\^([A-Za-z0-9-]+)\]\]$/;

/* { judul, ref } bila blok ini adalah rujukan, selain itu null. */
export function rujukanDariBlok(b) {
  if (!b || b.type === 'code' || b.type === 'divider') return null;
  const m = RUJUKAN.exec(teksPolos(b));
  if (!m) return null;
  return { judul: m[1].trim(), ref: m[2] };
}

const cariCatatanJudul = (judul, notes) => {
  const j = (judul || '').trim().toLowerCase();
  if (!j) return null;
  return notes.find(n => !n.deletedAt && !n.archived
    && String(n.title || '').trim().toLowerCase() === j) || null;
};

const SATU_BARIS_MAX = 220;
const ringkas = s => (s.length > SATU_BARIS_MAX ? s.slice(0, SATU_BARIS_MAX).trimEnd() + '…' : s);

/* Menyelesaikan satu rujukan. Status:
   - 'ok'            → { n, blok, teks }
   - 'catatan-hilang'→ catatan sumber tidak ada (atau sudah dihapus)
   - 'terkunci'      → catatan sumber terkunci & belum dibuka di sesi ini
                       (isinya tidak boleh dibaca)
   - 'blok-hilang'   → catatan ada, tetapi tak ada blok ber-ref itu */
export function selesaikanRujukan(judul, ref, notes = state.notes) {
  const n = cariCatatanJudul(judul, notes);
  if (!n) return { status: 'catatan-hilang' };
  if (!terlihat(n)) return { status: 'terkunci', n };
  const blok = (n.blocks || []).find(b => b && b.meta && b.meta.ref === ref);
  if (!blok) return { status: 'blok-hilang', n };
  return { status: 'ok', n, blok, teks: ringkas(teksPolos(blok)) };
}

/* Semua rujukan di sebuah catatan: [{ bid, judul, ref, hasil }]. */
export function rujukanCatatan(n, notes = state.notes) {
  const hasil = [];
  (n.blocks || []).forEach(b => {
    const r = rujukanDariBlok(b);
    if (!r) return;
    hasil.push({ bid: b.id, judul: r.judul, ref: r.ref, hasil: selesaikanRujukan(r.judul, r.ref, notes) });
  });
  return hasil;
}

/* ── K11 · catatan yatim ── */

/* Judul-judul wikilink (span.wl) yang ada di sebuah catatan. */
const judulTautanKeluar = n => {
  const out = new Set();
  (n.blocks || []).forEach(b => {
    if (!b || b.type === 'code' || b.type === 'divider') return;
    const w = document.createElement('div');
    w.innerHTML = b.content || '';
    w.querySelectorAll('span.wl').forEach(sn => {
      const m = /^\[\[(.+?)\]\]$/.exec((sn.textContent || '').trim());
      if (!m) return;
      const j = (m[1].split('|')[0] || '').trim().toLowerCase();
      if (j) out.add(j);
    });
  });
  return out;
};

/* Catatan yatim: tak menaut ke catatan lain yang ada, dan tak ditaut siapa pun.
   Catatan tanpa judul tidak bisa ditaut, jadi hanya dihitung dari sisi keluar. */
export function catatanYatim(n, notes = state.notes) {
  const aktif = notes.filter(x => !x.deletedAt && !x.archived);
  const judulSendiri = String(n.title || '').trim().toLowerCase();
  const keluar = judulTautanKeluar(n);
  const menautKeluar = [...keluar].some(j => aktif.some(x => x.id !== n.id
    && String(x.title || '').trim().toLowerCase() === j));
  if (menautKeluar) return false;
  if (!judulSendiri) return true;
  const ditautSiapa = aktif.some(x => x.id !== n.id && judulTautanKeluar(x).has(judulSendiri));
  return !ditautSiapa;
}
