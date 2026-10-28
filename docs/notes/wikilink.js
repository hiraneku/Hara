/* Wikilink [[Judul]] — menandai tautan mati dan membuka/membuat catatan.

   `tandaiTautan()` dijalankan setiap kali editor digambar ulang (refresh):
   span .wl yang judulnya belum punya catatan diberi kelas `dead`
   (tampil putus-putus). Klik pada tautan mati membuat catatannya; klik
   dengan tombol pengubah (Ctrl/⌘/Alt) membuka catatan yang sudah ada —
   klik biasa tetap untuk meletakkan kursor/menyunting teks.

   B3: sasaran bisa berupa `[[Judul#Bagian]]` (heading di catatan itu) atau
   `[[Judul#^ref]]` (blok yang diberi tanda rujukan). Hanya judulnya yang
   dicari di daftar catatan; bagiannya dicari di dalam catatan yang dibuka. */

import { state } from '../core/store.js?v=20261028081025';
import { tandaiLabelTag } from './label-tag.js?v=20261028081025';
import { adalahPdf } from './pdf/logika.js?v=20261028081025';

/* Judul catatan persis (abaikan besar-kecil), tanpa catatan yang dihapus. */
export function cariJudul(judul) {
  if (!judul) return null;
  const j = judul.toLowerCase();
  return state.notes.find(n => !n.deletedAt && (n.title || '').trim().toLowerCase() === j) || null;
}

/* Sasaran dari teks di dalam [[ ]] (alias `|…` diabaikan).
   Mengembalikan { judul, bagian }. `bagian` kosong bila tidak ada `#`.
   Bila teks utuh memang judul catatan (misal "C#"), `#` dianggap bagian judul. */
export function pisahTautan(dalam) {
  const sasaran = String(dalam || '').split('|')[0].trim();
  if (!sasaran) return { judul: null, bagian: '' };
  if (cariJudul(sasaran)) return { judul: sasaran, bagian: '' };
  /* B3b: [[Nama.pdf#hal=4]] — tautan ke halaman lampiran PDF (hanya bila berakhiran .pdf) */
  const pdf = /^(.+?\.pdf)#hal=(\d+)$/i.exec(sasaran);
  if (pdf && parseInt(pdf[2], 10) >= 1) return { judul: pdf[1].trim(), bagian: '', halaman: parseInt(pdf[2], 10) };
  const i = sasaran.indexOf('#');
  if (i < 0) return { judul: sasaran, bagian: '' };
  return { judul: sasaran.slice(0, i).trim() || null, bagian: sasaran.slice(i + 1).trim() };
}

function dalamSpan(span) {
  const m = /^\[\[(.+?)\]\]$/.exec(((span && span.textContent) || '').trim());
  return m ? m[1] : null;
}

/* B3b: berkas PDF bernama `nama` yang dilampirkan di catatan mana pun (blok file, bukan catatan yang dihapus).
   Mengembalikan { blobId, name } atau null. */
export function cariBerkasPdf(nama) {
  const j = String(nama || '').trim().toLowerCase();
  if (!j) return null;
  for (const n of state.notes) {
    if (!n || n.deletedAt) continue;
    for (const b of (n.blocks || [])) {
      if (!b || b.type !== 'file' || !b.meta || !b.meta.blobId) continue;
      if (String(b.meta.name || '').trim().toLowerCase() === j && adalahPdf(b.meta))
        return { blobId: b.meta.blobId, name: String(b.meta.name) };
    }
  }
  return null;
}

/* B3b: bila span wikilink adalah tautan halaman PDF, kembalikan { judul, halaman, berkas }; selain itu null.
   `berkas` null berarti PDF belum dilampirkan (tautan mati). */
export function sasaranPdfSpan(span) {
  const dal = dalamSpan(span);
  if (dal === null) return null;
  const p = pisahTautan(dal);
  if (!p.halaman) return null;
  return { judul: p.judul, halaman: p.halaman, berkas: cariBerkasPdf(p.judul) };
}

/* Judul sasaran sebuah span wikilink, tanpa [[ ]], tanpa alias |…, dan tanpa #bagian. */
export function judulSpan(span) {
  const dalam = dalamSpan(span);
  return dalam === null ? null : pisahTautan(dalam).judul;
}

/* Bagian sasaran (teks setelah #), kosong bila tidak ada. */
export function bagianSpan(span) {
  const dalam = dalamSpan(span);
  return dalam === null ? '' : pisahTautan(dalam).bagian;
}

const normKunci = s => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();

/* Teks polos dari isi blok (HTML sederhana). Cukup untuk mencocokkan judul heading. */
function teksPolos(html) {
  return String(html || '').replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
}

/* Id blok tujuan di dalam catatan. `^ref` mencari blok dengan rujukan itu;
   teks lain mencari heading yang judulnya sama (abaikan besar-kecil dan spasi ganda).
   Mengembalikan null bila tidak ada. */
export function cariBagian(note, bagian) {
  const cari = String(bagian || '').trim();
  if (!note || !cari) return null;
  const blok = note.blocks || [];
  if (cari.startsWith('^')) {
    const ref = cari.slice(1);
    const hit = blok.find(b => b && b.meta && b.meta.ref === ref);
    return hit ? hit.id : null;
  }
  const kunci = normKunci(cari);
  const hit = blok.find(b => b && b.type === 'heading' && normKunci(teksPolos(b.content)) === kunci);
  return hit ? hit.id : null;
}

/* Tandai mati/hidup semua wikilink di dalam `root`, lalu warnai
   tag #… (B10) — keduanya urusan tampilan yang disegarkan tiap render. */
export function tandaiTautan(root) {
  if (!root) return;
  const list = root.querySelectorAll ? root.querySelectorAll('span.wl') : [];
  for (const span of list) {
    /* K10: `![[Judul#^id]]` adalah rujukan blok, bukan tautan — jangan ditandai mati. */
    const prev = span.previousSibling;
    if (prev && prev.nodeType === 3 && /!$/.test(prev.data)) { span.classList.remove('dead'); continue; }
    const pdf = sasaranPdfSpan(span);
    if (pdf) { span.classList.toggle('dead', !pdf.berkas); continue; }
    const judul = judulSpan(span);
    span.classList.toggle('dead', !(judul && cariJudul(judul)));
  }
  tandaiLabelTag(root);
}
