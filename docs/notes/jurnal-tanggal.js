/* Jurnal per tanggal (Bagian B8, Tahap 2): judul, pencarian, dan penanda di kalender.

   Judul jurnal = "<Prefiks> · <tanggal>", dengan prefiks dan format tanggal mengikuti bahasa.
   Modul ini MURNI (tanpa impor) supaya bisa diuji di Node. Dipakai oleh harian.js (buka atau
   buat jurnal) dan views/tugas.js (penanda hari di kalender). */

export const KODE_JURNAL = ['id', 'en', 'ja'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli',
  'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const BULAN_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];
const PREFIX = { id: 'Jurnal', en: 'Journal', ja: 'ジャーナル' };

/* Tanggal di judul jurnal mengikuti bahasa (id: 9 September 2026;
   en: September 9, 2026; ja: 2026年9月9日). */
export function tanggalJurnal(b, t) {
  const y = t.getFullYear(), d = t.getDate(), mo = t.getMonth();
  if (b === 'en') return `${BULAN_EN[mo]} ${d}, ${y}`;
  if (b === 'ja') return `${y}年${mo + 1}月${d}日`;
  return `${d} ${BULAN[mo]} ${y}`;
}

export const judulJurnal = (b, t) => `${PREFIX[b] || PREFIX.id} · ${tanggalJurnal(b, t)}`;

/* Bahasa yang dicari: bahasa aktif dulu, lalu dua bahasa lain. */
export const urutanBahasaJurnal = kini => [kini, ...KODE_JURNAL.filter(b => b !== kini)];

/* Catatan jurnal untuk tanggal t (null bila belum ada). Catatan terhapus diabaikan.
   Judul dicocokkan persis setelah dipangkas, dalam bahasa aktif lebih dulu. */
export function cariJurnal(notes, t, kini) {
  for (const b of urutanBahasaJurnal(kini)) {
    const judul = judulJurnal(b, t);
    const n = notes.find(x => !x.deletedAt && (x.title || '').trim() === judul);
    if (n) return n;
  }
  return null;
}

/* Angka hari (1–31) dalam bulan tahun yang punya jurnal. Panggil dengan catatan yang sudah
   disaring (mis. terlihat()), supaya catatan terkunci tidak ikut tampak di kalender. */
export function hariBerjurnal(notes, tahun, bulan, kini) {
  const judulAda = new Set();
  for (const n of notes) if (!n.deletedAt) judulAda.add((n.title || '').trim());
  const bahasa = urutanBahasaJurnal(kini);
  const hasil = new Set();
  const jumlah = new Date(tahun, bulan + 1, 0).getDate();
  for (let tgl = 1; tgl <= jumlah; tgl++) {
    const t = new Date(tahun, bulan, tgl);
    if (bahasa.some(b => judulAda.has(judulJurnal(b, t)))) hasil.add(tgl);
  }
  return hasil;
}
