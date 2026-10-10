/* Matriks prioritas (K7) dan tampilan kalender bulanan (K9) untuk layar Tugas.

   Keduanya MURNI: membaca daftar tenggat (dari pengingat.js) dan
   mengembalikan struktur data. Tidak menyimpan apa pun.

   Matriks: "mendesak" = tenggat hari ini, besok, atau sudah lewat;
            "penting"  = prioritas !! atau !!!.
   Kalender: kejadian to-do (termasuk yang berulang) pada tiap hari. */

const SEHARI = 86400000;
const awalHari = ms => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };

/* ── K7 · matriks prioritas ── */
export const kuadranTugas = (tugas, sekarang = Date.now()) => {
  const batasMendesak = awalHari(sekarang) + SEHARI + SEHARI - 1;   /* sampai akhir besok */
  const q = { kerjakan: [], jadwalkan: [], cepat: [], nanti: [] };
  (tugas || []).forEach(x => {
    const mendesak = x.waktu <= batasMendesak;
    const penting = (x.prioritas || 0) >= 2;
    if (mendesak && penting) q.kerjakan.push(x);
    else if (penting) q.jadwalkan.push(x);
    else if (mendesak) q.cepat.push(x);
    else q.nanti.push(x);
  });
  return q;
};

/* ── K9 · kalender bulanan ── */

/* Apakah sebuah to-do jatuh pada hari tertentu (awal hari, ms).
   - sekali-jalan: tepat di hari tenggatnya;
   - berulang: sesuai aturan, dan tidak sebelum kejadian pertamanya. */
export const jatuhPada = (x, hariMs) => {
  if (hariMs < awalHari(x.waktu)) return false;
  if (!x.aturan) return hariMs === awalHari(x.waktu);
  const d = new Date(hariMs);
  const a = x.aturan;
  if (a.jenis === 'harian') return true;
  if (a.jenis === 'mingguan') return d.getDay() === a.hari;
  if (a.jenis === 'bulanan') {
    const akhir = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return d.getDate() === Math.min(a.tgl, akhir);
  }
  return false;
};

/* Peta hari-dalam-bulan → daftar to-do. Bulan 0-11. */
export const kalenderBulan = (tugas, tahun, bulan) => {
  const hari = new Map();
  const jumlahHari = new Date(tahun, bulan + 1, 0).getDate();
  for (let tgl = 1; tgl <= jumlahHari; tgl++) {
    const ms = new Date(tahun, bulan, tgl).getTime();
    const isi = (tugas || []).filter(x => jatuhPada(x, ms));
    if (isi.length) hari.set(tgl, isi);
  }
  return hari;
};
