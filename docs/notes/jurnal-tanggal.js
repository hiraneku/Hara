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

/* Kebalikan dari judulJurnal (B8 lanjutan): tanggal dari judul catatan, atau null bila judulnya
   bukan judul jurnal. Dicoba untuk semua bahasa. Tanggal yang tidak ada (mis. 31 Februari)
   ditolak, jadi judul seperti itu tidak dianggap jurnal. */
export function tanggalDariJudul(judul) {
  const s = String(judul || '').trim();
  for (const b of KODE_JURNAL) {
    const awal = `${PREFIX[b]} · `;
    if (!s.startsWith(awal)) continue;
    const sisa = s.slice(awal.length);
    let y, mo, d;
    if (b === 'id') {
      const m = sisa.match(/^(\d{1,2}) (\S+) (\d{4})$/);
      if (!m) continue;
      d = +m[1]; mo = BULAN.indexOf(m[2]); y = +m[3];
    } else if (b === 'en') {
      const m = sisa.match(/^(\S+) (\d{1,2}), (\d{4})$/);
      if (!m) continue;
      mo = BULAN_EN.indexOf(m[1]); d = +m[2]; y = +m[3];
    } else {
      const m = sisa.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/);
      if (!m) continue;
      y = +m[1]; mo = +m[2] - 1; d = +m[3];
    }
    if (mo < 0) continue;
    const t = new Date(y, mo, d);
    if (t.getFullYear() === y && t.getMonth() === mo && t.getDate() === d) return t;
  }
  return null;
}
