/* Tag lintas modul catatan.

   Sumber kebenaran tag adalah isi catatan: elemen <span class="tg">#nama</span>
   yang disisipkan lewat menu tag / bar tag. Field `tags` pada catatan adalah
   cerminan (cache) yang dihitung ulang saat disimpan — sehingga tidak ada
   dua sumber yang bisa berselisih. Cache inilah yang dipakai daftar,
   halaman tag, dan filter. */

import { state } from '../core/store.js?v=20260909032733';

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

/* Gabungkan tag tersimpan dengan tag turunan dari isi, tanpa duplikat. */
export function gabungTag(tersimpan, turunan) {
  const hasil = [];
  const lihat = s => { if (!hasil.includes(s)) hasil.push(s); };
  (tersimpan || []).forEach(lihat);
  (turunan || []).forEach(lihat);
  return hasil;
}

/* Perbarui cache tag catatan dari isinya. Dipanggil saat menyimpan. */
export function sinkronTag(n) {
  if (!n) return;
  n.tags = gabungTag(n.tags, tagDariIsi(n));
}

/* Catatan yang ikut dihitung tag/filter: belum dihapus & belum diarsip. */
const aktif = () => state.notes.filter(n => !n.deletedAt && !n.archived);

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

