/**
 * Statistik & heatmap (K20) — murni, tanpa DOM.
 *  - aktivitasHarian: jumlah tugas selesai + entri jurnal per hari (tanggal lokal)
 *  - tugasSelesaiPerMinggu: tugas selesai per minggu (Senin sebagai awal minggu)
 *  - rentetanJurnal: jumlah hari berturut-turut ada entri jurnal sampai hari ini/kemarin
 * Sumber: blok todo (meta.checked & meta.done) dan catatan berjudul "Jurnal · …".
 */

const PREFIX_JURNAL = /^(Jurnal|Journal|ジャーナル)\s*[·•]/;

/** Kunci tanggal lokal "YYYY-MM-DD". */
export function kunciHari(ts) {
  const d = new Date(ts);
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Tambah n hari ke kunci tanggal (aritmetika kalender, aman dari DST). */
function tambahHari(kunci, n) {
  const [y, m, d] = kunci.split('-').map(Number);
  const t = new Date(y, m - 1, d + n);
  return kunciHari(t.getTime());
}

function catatanAktif(notes) {
  return (notes || []).filter(n => n && !n.deletedAt);
}

/** Tugas selesai (ts) dari semua catatan aktif. */
function tugasSelesai(notes) {
  const hasil = [];
  for (const n of catatanAktif(notes)) {
    for (const b of n.blocks || []) {
      if (b && b.type === 'todo' && b.meta && b.meta.checked && b.meta.done) hasil.push(b.meta.done);
    }
  }
  return hasil;
}

/**
 * Jumlah aktivitas per hari untuk `hari` hari terakhir (termasuk hari ini).
 * @returns {Array<{tanggal:string, tugas:number, jurnal:number, total:number}>} urut lama → baru
 */
export function aktivitasHarian(notes, { hari = 182, sekarang = Date.now() } = {}) {
  const akhir = kunciHari(sekarang);
  const mulai = tambahHari(akhir, -(hari - 1));
  const peta = new Map();
  for (let i = 0; i < hari; i++) {
    const k = tambahHari(mulai, i);
    peta.set(k, { tanggal: k, tugas: 0, jurnal: 0, total: 0 });
  }
  for (const ts of tugasSelesai(notes)) {
    const k = kunciHari(ts);
    const e = peta.get(k);
    if (e) { e.tugas++; e.total++; }
  }
  for (const n of catatanAktif(notes)) {
    if (!PREFIX_JURNAL.test(n.title || '')) continue;
    const k = kunciHari(n.createdAt || n.updatedAt || sekarang);
    const e = peta.get(k);
    if (e) { e.jurnal++; e.total++; }
  }
  return [...peta.values()];
}

/**
 * Tugas selesai per minggu (Senin awal minggu) untuk `minggu` minggu terakhir.
 * @returns {Array<{mulai:string, jumlah:number}>}
 */
export function tugasSelesaiPerMinggu(notes, { minggu = 12, sekarang = Date.now() } = {}) {
  const d = new Date(sekarang);
  const selisih = (d.getDay() + 6) % 7; // 0 = Senin
  const seninIni = tambahHari(kunciHari(sekarang), -selisih);
  const daftar = [];
  for (let i = minggu - 1; i >= 0; i--) daftar.push({ mulai: tambahHari(seninIni, -7 * i), jumlah: 0 });
  const indeks = new Map(daftar.map((w, i) => [w.mulai, i]));
  for (const ts of tugasSelesai(notes)) {
    const k = kunciHari(ts);
    const s = (new Date(ts).getDay() + 6) % 7;
    const awal = tambahHari(k, -s);
    if (indeks.has(awal)) daftar[indeks.get(awal)].jumlah++;
  }
  return daftar;
}

/**
 * Berapa hari berturut-turut ada entri jurnal, dihitung mundur dari hari ini
 * (atau kemarin bila hari ini belum ditulis, agar rentetan tidak langsung putus).
 */
export function rentetanJurnal(notes, { sekarang = Date.now() } = {}) {
  const set = new Set();
  for (const n of catatanAktif(notes)) {
    if (PREFIX_JURNAL.test(n.title || '')) set.add(kunciHari(n.createdAt || n.updatedAt || sekarang));
  }
  let k = kunciHari(sekarang);
  if (!set.has(k)) k = tambahHari(k, -1);
  let hitung = 0;
  while (set.has(k)) { hitung++; k = tambahHari(k, -1); }
  return hitung;
}

/** Tingkat intensitas 0–4 untuk warna heatmap, berdasar nilai maksimum. */
export function tingkatIntensitas(jumlah, maks) {
  if (!jumlah || !maks) return 0;
  const r = jumlah / maks;
  return r > 0.75 ? 4 : r > 0.5 ? 3 : r > 0.25 ? 2 : 1;
}
