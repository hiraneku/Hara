/* Tag lintas modul catatan.

   DUA sumber tag yang sah pada sebuah catatan:
   1. ISI: elemen <span class="tg">#nama</span> yang ada di blok catatan —
      sumber utama. Tag di sini muncul otomatis saat Anda mengetik #nama
      lalu spasi/Enter, atau lewat menu tag / bar mekanik.
   2. MANUAL: array `tagsManual` (opsional) — tag yang sengaja disimpan
      tanpa span di isi, misalnya tag frontmatter saat mengimpor Markdown.

   Field `tags` hanyalah cache gabungan kedua sumber itu, dihitung ulang
   setiap kali catatan disimpan. Konsekuensi penting: tag yang SATU-SATUNYA
   ada di isi akan HILANG dari cache begitu span-nya dihapus dari isi —
   tidak ada tag "hantu" yang menetap. Tag manual hanya bisa hilang bila
   field `tagsManual`-nya diubah (tidak ada UI-nya; ia milik impor). */

import { state } from '../core/store.js?v=20260909105048';
import { terlihat } from './kunci.js?v=20260909105048';

/* Ambil nama tag dari satu string isi blok (HTML ringan).
   Hanya <span class="tg">#nama</span> yang dihitung — teks "#tag" yang
   diketik polos tidak otomatis jadi tag. */
export function tagDariHtml(html) {
  const nama = [];
  const re = /<span\s+class="tg"[^>]*>#([^<]+)<\/span>/g;
  let m;
  while ((m = re.exec(String(html || '')))) {
    const t = m[1].trim();
    if (t && /^[A-Za-z0-9][A-Za-z0-9_\/.-]*$/.test(t)) nama.push(t);
  }
  return nama;
}

/* Tag yang terkandung dalam satu catatan. */
export function tagDariIsi(n) {
  if (!n || !Array.isArray(n.blocks)) return [];
  const hasil = [];
  const lihat = s => { if (!hasil.includes(s)) hasil.push(s); };
  n.blocks.forEach(b => {
    if (!b || b.type === 'code' || b.type === 'divider') return;
    tagDariHtml(b.content).forEach(lihat);
  });
  return hasil;
}

/* Gabungkan tanpa duplikat. */
function unik(daftar) {
  const hasil = [];
  const lihat = s => { if (!hasil.includes(s)) hasil.push(s); };
  (daftar || []).forEach(lihat);
  return hasil;
}

/* Tag manual catatan: field opsional `tagsManual`, dibaca apa adanya. */
export const tagManualCatatan = n =>
  Array.isArray(n && n.tagsManual) ? n.tagsManual.slice() : [];

/* Perbarui cache tag catatan dari isi + tag manualnya. Dipanggil saat
   menyimpan / memuat. Mengembalikan true bila cache berubah (dipakai
   pemanggil untuk memutuskan perlu menulis ulang penyimpanan). */
export function sinkronTag(n) {
  if (!n) return false;
  const baru = unik([...tagDariIsi(n), ...tagManualCatatan(n)]);
  const lama = Array.isArray(n.tags) ? n.tags : [];
  if (baru.length === lama.length && baru.every((t, i) => t === lama[i]))
    return false;
  n.tags = baru;
  return true;
}

/* Catatan yang ikut dihitung tag/filter: belum dihapus, belum diarsip,
   dan (D19) kuncinya tidak sedang aktif — tag catatan terkunci yang
   belum dibuka tidak ikut agregasi publik. */
const aktif = () => state.notes.filter(n => !n.deletedAt && !n.archived && terlihat(n));

/* Agregat semua tag: [{ nama, jumlah }], diurutkan jumlah menurun. */
export function semuaTag() {
  const hitung = new Map();
  aktif().forEach(n => {
    (n.tags || []).forEach(t => hitung.set(t, (hitung.get(t) || 0) + 1));
  });
  return [...hitung.entries()]
    .map(([nama, jumlah]) => ({ nama, jumlah }))
    .sort((a, b) => b.jumlah - a.jumlah || a.nama.localeCompare(b.nama));
}

