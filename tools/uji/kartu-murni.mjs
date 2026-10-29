// Pengujian C7 · Flashcard (model murni) — tanpa DOM.
//
// Yang diuji (docs/notes/kartu-murni.js):
//   • buatKartu: depan dan belakang wajib, dipangkas, batas 2000 karakter per sisi;
//   • normalizeKartu: entri rusak dibuang tanpa melempar, id ganda dibuang, angka negatif jadi 0;
//   • catatNilai: hitungan benar/salah per kartu;
//   • antrianAwal: urutan dari kartu tertua;
//   • langkahAntrean: "ingat" mengeluarkan kartu, "belum" mengantrekannya lagi di akhir;
//   • latihan selalu berakhir (setiap kartu "ingat" sekali), dan ringkasSesi menghitung dengan benar.
//
// Yang TIDAK diuji di sini: tombol, lembar, penyimpanan, ekspor/impor (lihat catatan di dokumen).
//
// Jalan: node tools/uji/kartu-murni.mjs (dari folder repo).
import {
  buatKartu, normalizeKartu, catatNilai, antrianAwal, langkahAntrean, ringkasSesi, MAKS_SISI,
} from '../../docs/notes/kartu-murni.js';

let lulus = 0, gagal = 0;
function cek(nama, ok, detail = '') {
  if (ok) { lulus++; console.log(`OK   ${nama}${detail ? ' — ' + detail : ''}`); }
  else { gagal++; console.log(`GAGAL ${nama}${detail ? ' — ' + detail : ''}`); }
}

// ── 1. buatKartu ──
console.log('── 1. buatKartu');
{
  const a = buatKartu({ depan: '  Fotosintesis  ', belakang: '\n Proses mengubah cahaya \t', sumberId: 'n1', sumberJudul: 'Biologi', id: 'x1', sekarang: 1000 });
  cek('kartu valid dibuat', a.ok === true);
  cek('depan dipangkas', a.kartu && a.kartu.depan === 'Fotosintesis');
  cek('belakang dipangkas', a.kartu && a.kartu.belakang === 'Proses mengubah cahaya');
  cek('sumber dan judul disalin', a.kartu && a.kartu.sumberId === 'n1' && a.kartu.sumberJudul === 'Biologi');
  cek('nilai awal nol', a.kartu && a.kartu.benar === 0 && a.kartu.salah === 0);
  cek('stempel waktu dari argumen', a.kartu && a.kartu.dibuat === 1000 && a.kartu.id === 'x1');

  const b = buatKartu({ depan: '   ', belakang: 'ada' });
  cek('depan kosong (spasi saja) ditolak', !b.ok && b.alasan === 'depan-kosong');
  const c = buatKartu({ depan: 'ada', belakang: '' });
  cek('belakang kosong ditolak', !c.ok && c.alasan === 'belakang-kosong');
  const d = buatKartu({ depan: 'x'.repeat(MAKS_SISI + 1), belakang: 'y' });
  cek('depan di atas 2000 ditolak', !d.ok && d.alasan === 'terlalu-panjang');
  const e = buatKartu({ depan: 'x', belakang: 'y'.repeat(MAKS_SISI + 1) });
  cek('belakang di atas 2000 ditolak', !e.ok && e.alasan === 'terlalu-panjang');
  const f = buatKartu({ depan: 'x'.repeat(MAKS_SISI), belakang: 'y'.repeat(MAKS_SISI) });
  cek('tepat 2000 per sisi diterima', f.ok === true);
  const g = buatKartu({ depan: 'a', belakang: 'b', sumberId: 42, sumberJudul: 'x'.repeat(400) });
  cek('sumberId non-teks jadi null', g.kartu.sumberId === null);
  cek('judul sumber dipotong 300', g.kartu.sumberJudul.length === 300);
  const h1 = buatKartu({ depan: 'a', belakang: 'b' }).kartu.id;
  const h2 = buatKartu({ depan: 'a', belakang: 'b' }).kartu.id;
  cek('id otomatis berbeda', h1 !== h2 && h1.length > 3);
}

// ── 2. normalizeKartu ──
console.log('── 2. normalizeKartu');
{
  cek('bukan array jadi daftar kosong', normalizeKartu(null).length === 0 && normalizeKartu('x').length === 0);
  const hasil = normalizeKartu([
    null, 'teks', 5,
    { depan: 'a', belakang: 'b' },                       // tanpa id
    { id: 'k1', depan: '  ', belakang: 'b' },            // depan kosong
    { id: 'k2', depan: 'a', belakang: '' },              // belakang kosong
    { id: 'k3', depan: ' tanya ', belakang: ' jawab ', benar: 3, salah: -2, dibuat: 'x', sumberId: 'n9', sumberJudul: 'Judul' },
    { id: 'k3', depan: 'duplikat', belakang: 'dup' },    // id ganda, dibuang
    { id: 'k4', depan: 'p', belakang: 'q', benar: 1.5, salah: '2' },
  ]);
  cek('hanya entri valid bertahan', hasil.map(k => k.id).join(',') === 'k3,k4', hasil.map(k => k.id).join(','));
  const k3 = hasil[0];
  cek('teks dipangkas saat dibaca', k3.depan === 'tanya' && k3.belakang === 'jawab');
  cek('benar positif dipertahankan, salah negatif jadi 0', k3.benar === 3 && k3.salah === 0);
  cek('dibuat tidak angka jadi 0', k3.dibuat === 0);
  cek('sumberId string dipertahankan', k3.sumberId === 'n9' && k3.sumberJudul === 'Judul');
  const k4 = hasil[1];
  cek('nilai pecahan atau teks jadi 0', k4.benar === 0 && k4.salah === 0);
  cek('sumberId hilang jadi null', k4.sumberId === null && k4.sumberJudul === '');
  const panjang = normalizeKartu([{ id: 'p', depan: 'x'.repeat(MAKS_SISI + 50), belakang: 'y' }]);
  cek('normalisasi memotong ke 2000', panjang[0].depan.length === MAKS_SISI);
}

// ── 3. catatNilai ──
console.log('── 3. catatNilai');
{
  const k = { id: 'a', benar: 0, salah: 0 };
  catatNilai(k, 'ingat'); catatNilai(k, 'ingat'); catatNilai(k, 'belum');
  cek('ingat menambah benar, belum menambah salah', k.benar === 2 && k.salah === 1, `benar ${k.benar} salah ${k.salah}`);
  const kembali = catatNilai(k, 'lainnya');
  cek('nilai tak dikenal tidak mengubah hitungan', k.benar === 2 && k.salah === 1 && kembali === k);
}

// ── 4. antrianAwal ──
console.log('── 4. antrianAwal');
{
  const daftar = [
    { id: 'c', dibuat: 300 }, { id: 'a', dibuat: 100 }, { id: 'b', dibuat: 100 }, { id: 'd', dibuat: 200 },
  ];
  const urut = antrianAwal(daftar);
  cek('urut dari kartu tertua, seri diurutkan id', urut.join(',') === 'a,b,d,c', urut.join(','));
  cek('daftar asli tidak diubah', daftar[0].id === 'c');
  cek('kosong menghasilkan antrean kosong', antrianAwal([]).length === 0);
}

// ── 5. langkahAntrean dan ringkasSesi ──
console.log('── 5. langkahAntrean dan ringkasSesi');
{
  const awal = ['a', 'b', 'c'];
  const s1 = langkahAntrean(awal, 'a', 'ingat');
  cek('ingat mengeluarkan kartu dari depan', s1.join(',') === 'b,c', s1.join(','));
  const s2 = langkahAntrean(awal, 'a', 'belum');
  cek('belum mengantrekan kartu lagi di akhir', s2.join(',') === 'b,c,a', s2.join(','));
  cek('antrean asli tidak diubah', awal.join(',') === 'a,b,c');
  const s3 = langkahAntrean(['x'], 'x', 'belum');
  cek('kartu terakhir belum tetap satu di antrean', s3.join(',') === 'x');

  // simulasi sesi penuh: a ingat, b belum, c ingat, b ingat
  let antrean = antrianAwal([{ id: 'a', dibuat: 1 }, { id: 'b', dibuat: 2 }, { id: 'c', dibuat: 3 }]);
  const sesi = { antrean, ingat: 0, belum: 0 };
  const urutan = ['ingat', 'belum', 'ingat', 'ingat'];
  let langkah = 0;
  while (sesi.antrean.length && langkah < 50) {
    const id = sesi.antrean[0];
    const nilai = urutan[langkah++];
    sesi.antrean = langkahAntrean(sesi.antrean, id, nilai);
    sesi[nilai]++;
  }
  const r = ringkasSesi(sesi);
  cek('sesi berakhir setelah 4 jawaban', sesi.antrean.length === 0 && langkah === 4, `langkah ${langkah}`);
  cek('ringkasan ingat 3, belum 1', r.ingat === 3 && r.belum === 1, JSON.stringify(r));
  cek('ringkas sesi kosong nol', JSON.stringify(ringkasSesi({})) === '{"ingat":0,"belum":0}');
}

console.log(`\nHasil: ${lulus} lulus, ${gagal} gagal`);
if (gagal) process.exit(1);
