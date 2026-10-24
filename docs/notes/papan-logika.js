/* MB1 · Logika murni papan Kanban & kalender dari properti catatan (K19).

   Tidak menyentuh DOM atau state: semua fungsi menerima daftar catatan dan
   mengembalikan struktur data. Dipakai oleh papan.js (tampilan) dan diuji
   di tools/uji/papan.mjs.

   Aturan privasi: pemanggil WAJIB meneruskan hanya catatan yang terlihat
   (kunci.js → terlihat). Modul ini tidak membaca isi catatan, hanya props
   dan judul/id. */

/* nilai properti dalam bentuk teks rapi ('' bila tidak ada) */
export function nilaiProp(n, k) {
  const p = (n && Array.isArray(n.props)) ? n.props.find(x => x.k === k) : null;
  return p ? String(p.v ?? '').trim() : '';
}

/* ── Kanban ───────────────────────────────────────────────────────────── */

const kunciNilai = v => String(v || '').trim().toLowerCase();

/* Kelompokkan catatan menurut properti `k`.
   - Kolom dengan nilai dari `urutanAwal` (mis. contoh status) selalu muncul
     dan didahulukan, meskipun kosong; urutan ini tidak mengubah data.
   - Nilai lain muncul sesudahnya, urut abjad (tanpa membedakan huruf besar).
   - Catatan tanpa nilai masuk kolom `kosong`, ditaruh paling akhir.
   Pencocokan nilai tidak peka huruf besar-kecil; label diambil dari
   penulisan pertama yang ditemukan. */
export function kelompokKanban(notes, k, urutanAwal = []) {
  const kolom = new Map();   /* kunci → { kunci, nilai, notes } */
  const tambah = (kunci, nilai) => {
    if (!kolom.has(kunci)) kolom.set(kunci, { kunci, nilai, notes: [] });
    return kolom.get(kunci);
  };
  const awal = urutanAwal.map(v => ({ kunci: kunciNilai(v), nilai: v }));
  for (const a of awal) tambah(a.kunci, a.nilai);

  const kosong = { kunci: '', nilai: '', notes: [] };
  for (const n of (notes || [])) {
    const v = nilaiProp(n, k);
    if (!v) { kosong.notes.push(n); continue; }
    tambah(kunciNilai(v), v).notes.push(n);
  }

  const awalSet = new Set(awal.map(a => a.kunci));
  const lain = [...kolom.values()]
    .filter(c => !awalSet.has(c.kunci) && c.notes.length)
    .sort((a, b) => a.nilai.localeCompare(b.nilai, 'id', { sensitivity: 'base' }));
  const urut = [...awal.map(a => kolom.get(a.kunci)), ...lain];
  /* kolom contoh yang tidak punya catatan tetap tampil (papan kosong) */
  if (kosong.notes.length) urut.push(kosong);
  return urut;
}

/* ── Kalender ─────────────────────────────────────────────────────────── */

/* YYYY-MM-DD yang benar-benar tanggal valid (tanpa zona waktu) */
export function tanggalValid(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '').trim());
  if (!m) return false;
  const y = +m[1], mo = +m[2], d = +m[3];
  if (mo < 1 || mo > 12 || d < 1) return false;
  const akhir = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  return d <= akhir;
}

/* Properti yang bisa dipakai sebagai sumbu kalender: setidaknya satu nilai
   valid. `tenggat` & `tanggal` selalu didahulukan. */
export function kunciTanggalTersedia(notes) {
  const ada = new Map();
  for (const n of (notes || [])) {
    for (const p of (n.props || [])) {
      if (tanggalValid(p.v)) ada.set(p.k, (ada.get(p.k) || 0) + 1);
    }
  }
  const utama = ['tenggat', 'tanggal'].filter(k => ada.has(k));
  const lain = [...ada.keys()].filter(k => !utama.includes(k)).sort();
  return [...utama, ...lain];
}

const kunciHari = (y, mo0, d) =>
  `${y}-${String(mo0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/* Peta 'YYYY-MM-DD' → catatan yang tanggal propertinya jatuh di hari itu. */
export function catatanPerHari(notes, k) {
  const peta = new Map();
  for (const n of (notes || [])) {
    const v = nilaiProp(n, k);
    if (!tanggalValid(v)) continue;
    const key = v;
    if (!peta.has(key)) peta.set(key, []);
    peta.get(key).push(n);
  }
  return peta;
}

/* Grid satu bulan, minggu dimulai Senin. Bulan 0–11.
   Hasil: { minggu: [[sel×7], …] }, sel = { tgl: 'YYYY-MM-DD' | null, hari }.
   Sel di luar bulan bernilai tgl null (dikosongkan, bukan diisi bulan lain). */
export function gridBulan(tahun, bulan0) {
  const jumlahHari = new Date(Date.UTC(tahun, bulan0 + 1, 0)).getUTCDate();
  /* getUTCDay: 0 = Minggu → ubah ke indeks Senin = 0 */
  const awal = (new Date(Date.UTC(tahun, bulan0, 1)).getUTCDay() + 6) % 7;
  const sel = [];
  for (let i = 0; i < awal; i++) sel.push({ tgl: null, hari: null });
  for (let d = 1; d <= jumlahHari; d++) sel.push({ tgl: kunciHari(tahun, bulan0, d), hari: d });
  while (sel.length % 7) sel.push({ tgl: null, hari: null });
  const minggu = [];
  for (let i = 0; i < sel.length; i += 7) minggu.push(sel.slice(i, i + 7));
  return { minggu, jumlahHari };
}

/* Geser bulan dengan aman (Desember+1 → Januari tahun berikutnya). */
export function geserBulan(tahun, bulan0, langkah) {
  const t = new Date(Date.UTC(tahun, bulan0 + langkah, 1));
  return { tahun: t.getUTCFullYear(), bulan0: t.getUTCMonth() };
}
