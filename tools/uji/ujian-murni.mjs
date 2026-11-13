// Pengujian C8 · Persiapan ujian (model murni) — tanpa DOM.
//
// Yang diuji (docs/notes/ujian-murni.js):
//   • buatRuang: nama wajib, dipangkas, dipotong 120;
//   • buatSoal: pertanyaan dan jawaban wajib, batas 2000 per sisi;
//   • normalizeUjian: entri rusak dibuang, id ganda dibuang, materi dan soal ikut dibersihkan;
//   • tambahMateri / keluarkanMateri: tanpa duplikat, batas jumlah;
//   • tambahSoal / hapusSoal: hapusSoal mengembalikan soal untuk Urungkan;
//   • catatNilaiSoal, antrianLatihan, langkahAntrean: urutan latihan dan "Belum" diantrekan lagi;
//   • statistikRuang: jumlah materi, soal, benar, salah.
//
// Yang TIDAK diuji di sini: layar, tombol, penyimpanan, ekspor/impor (lihat uji Chromium di luar repo).
//
// Jalan: node tools/uji/ujian-murni.mjs (dari folder repo).
import {
  buatRuang, buatSoal, normalizeUjian, tambahMateri, keluarkanMateri, tambahSoal, hapusSoal,
  catatNilaiSoal, antrianLatihan, langkahAntrean, ringkasSesi, statistikRuang,
  MAKS_NAMA, MAKS_TEKS, MAKS_MATERI, MAKS_SOAL,
} from '../../docs/notes/ujian-murni.js';

let lulus = 0, gagal = 0;
function cek(nama, ok, detail = '') {
  if (ok) { lulus++; console.log(`OK   ${nama}${detail ? ' — ' + detail : ''}`); }
  else { gagal++; console.log(`GAGAL ${nama}${detail ? ' — ' + detail : ''}`); }
}

// ── 1. buatRuang ──
console.log('── 1. buatRuang');
{
  const a = buatRuang({ nama: '  UTS Biologi  ', id: 'r1', sekarang: 500 });
  cek('ruang valid dibuat', a.ok === true && a.ruang.id === 'r1');
  cek('nama dipangkas', a.ruang.nama === 'UTS Biologi');
  cek('materi dan soal awal kosong', a.ruang.materi.length === 0 && a.ruang.soal.length === 0);
  cek('dibuat dari argumen', a.ruang.dibuat === 500);
  const b = buatRuang({ nama: '   ' });
  cek('nama kosong (spasi saja) ditolak', !b.ok && b.alasan === 'nama-kosong');
  const c = buatRuang({ nama: 'x'.repeat(MAKS_NAMA + 30), id: 'r2' });
  cek('nama dipotong ke 120', c.ok && c.ruang.nama.length === MAKS_NAMA);
  const d1 = buatRuang({ nama: 'a' }).ruang.id, d2 = buatRuang({ nama: 'a' }).ruang.id;
  cek('id otomatis berbeda', d1 !== d2 && d1.length > 3);
}

// ── 2. buatSoal ──
console.log('── 2. buatSoal');
{
  const a = buatSoal({ pertanyaan: '  Apa itu mitokondria? ', jawaban: '\nPembangkit energi\t', sumberId: 'n1', sumberJudul: 'Biologi', id: 's1', sekarang: 9 });
  cek('soal valid dibuat', a.ok && a.soal.id === 's1');
  cek('pertanyaan dan jawaban dipangkas', a.soal.pertanyaan === 'Apa itu mitokondria?' && a.soal.jawaban === 'Pembangkit energi');
  cek('sumber disalin, nilai awal nol', a.soal.sumberId === 'n1' && a.soal.sumberJudul === 'Biologi' && a.soal.benar === 0 && a.soal.salah === 0);
  cek('pertanyaan kosong ditolak', buatSoal({ pertanyaan: ' ', jawaban: 'x' }).alasan === 'pertanyaan-kosong');
  cek('jawaban kosong ditolak', buatSoal({ pertanyaan: 'x', jawaban: '' }).alasan === 'jawaban-kosong');
  cek('pertanyaan di atas 2000 ditolak', buatSoal({ pertanyaan: 'x'.repeat(MAKS_TEKS + 1), jawaban: 'y' }).alasan === 'terlalu-panjang');
  cek('tepat 2000 diterima', buatSoal({ pertanyaan: 'x'.repeat(MAKS_TEKS), jawaban: 'y'.repeat(MAKS_TEKS) }).ok === true);
  cek('sumberId non-teks jadi null', buatSoal({ pertanyaan: 'a', jawaban: 'b', sumberId: 7 }).soal.sumberId === null);
}

// ── 3. normalizeUjian ──
console.log('── 3. normalizeUjian');
{
  cek('bukan array jadi daftar kosong', normalizeUjian(null).length === 0 && normalizeUjian({}).length === 0);
  const hasil = normalizeUjian([
    null, 'x', 4,
    { nama: 'tanpa id' },
    { id: 'r0', nama: '   ' },                                  // nama kosong
    { id: 'r1', nama: 'Ruang satu', dibuat: 'x', materi: [{ id: 'n1', judul: 'A' }, { id: 'n1', judul: 'dup' }, null, { id: '', judul: 'kosong' }],
      soal: [
        { id: 's1', pertanyaan: ' q1 ', jawaban: ' a1 ', benar: 2, salah: -1, dibuat: 5 },
        { id: 's1', pertanyaan: 'dup', jawaban: 'dup' },        // id ganda
        { id: 's2', pertanyaan: '', jawaban: 'a2' },            // pertanyaan kosong
        { id: 's3', pertanyaan: 'q3', jawaban: 'a3', benar: 1.5 },
      ] },
    { id: 'r1', nama: 'duplikat id' },
  ]);
  cek('hanya ruang valid dan unik bertahan', hasil.length === 1 && hasil[0].id === 'r1', hasil.map(r => r.id).join(','));
  const r = hasil[0];
  cek('materi tanpa duplikat dan tanpa id kosong', r.materi.length === 1 && r.materi[0].id === 'n1');
  cek('soal rusak dan id ganda dibuang', r.soal.map(s => s.id).join(',') === 's1,s3', r.soal.map(s => s.id).join(','));
  cek('nilai negatif atau pecahan jadi 0', r.soal[0].salah === 0 && r.soal[1].benar === 0 && r.soal[0].benar === 2);
  cek('dibuat tidak angka jadi 0', r.dibuat === 0);
  cek('teks dipangkas saat dibaca', r.soal[0].pertanyaan === 'q1' && r.soal[0].jawaban === 'a1');
  const panjang = normalizeUjian([{ id: 'p', nama: 'p', soal: [{ id: 's', pertanyaan: 'x'.repeat(MAKS_TEKS + 9), jawaban: 'y' }] }]);
  cek('normalisasi memotong soal ke 2000', panjang[0].soal[0].pertanyaan.length === MAKS_TEKS);
}

// ── 4. materi ──
console.log('── 4. materi');
{
  const r = buatRuang({ nama: 'R', id: 'rm' }).ruang;
  cek('tambah materi pertama berhasil', tambahMateri(r, { id: 'n1', judul: 'Biologi' }).ok === true);
  cek('materi yang sama ditolak', tambahMateri(r, { id: 'n1', judul: 'Biologi' }).alasan === 'sudah-ada');
  cek('id materi kosong ditolak', tambahMateri(r, { id: '', judul: 'x' }).alasan === 'catatan-tidak-valid');
  cek('judul materi disalin', r.materi[0].judul === 'Biologi');
  for (let i = 2; i <= MAKS_MATERI; i++) tambahMateri(r, { id: 'n' + i, judul: 'x' });
  cek('materi di atas batas ditolak', tambahMateri(r, { id: 'extra', judul: 'x' }).alasan === 'terlalu-banyak');
  cek('keluarkan materi yang ada', keluarkanMateri(r, 'n1') === true && !r.materi.some(m => m.id === 'n1'));
  cek('keluarkan materi yang tidak ada: false', keluarkanMateri(r, 'tidak-ada') === false);
}

// ── 5. soal ──
console.log('── 5. soal');
{
  const r = buatRuang({ nama: 'R', id: 'rs' }).ruang;
  const a = tambahSoal(r, { pertanyaan: 'q1', jawaban: 'a1', id: 'sa', sekarang: 1 });
  const b = tambahSoal(r, { pertanyaan: 'q2', jawaban: 'a2', id: 'sb', sekarang: 2 });
  cek('dua soal ditambahkan', a.ok && b.ok && r.soal.length === 2);
  cek('tambah soal tidak valid ditolak dengan alasan', tambahSoal(r, { pertanyaan: '', jawaban: 'x' }).alasan === 'pertanyaan-kosong' && r.soal.length === 2);
  const dihapus = hapusSoal(r, 'sa');
  cek('hapus soal mengembalikan soal yang dihapus', dihapus && dihapus.id === 'sa' && r.soal.length === 1);
  cek('hapus soal yang tidak ada: null', hapusSoal(r, 'tidak-ada') === null);
  cek('kembalikan soal (Urungkan) menjaga isi', (r.soal.push(dihapus), r.soal.length === 2 && r.soal[1].id === 'sa' && r.soal[1].pertanyaan === 'q1'));
  for (let i = 3; i <= MAKS_SOAL; i++) r.soal.push({ id: 'x' + i, pertanyaan: 'q', jawaban: 'a', dibuat: i, benar: 0, salah: 0 });
  cek('soal di atas batas ditolak', tambahSoal(r, { pertanyaan: 'q', jawaban: 'a' }).alasan === 'terlalu-banyak');
}

// ── 6. latihan ──
console.log('── 6. latihan');
{
  const r = buatRuang({ nama: 'R', id: 'rl' }).ruang;
  r.soal = [
    { id: 'c', pertanyaan: 'q', jawaban: 'a', dibuat: 300, benar: 0, salah: 0 },
    { id: 'a', pertanyaan: 'q', jawaban: 'a', dibuat: 100, benar: 0, salah: 0 },
    { id: 'b', pertanyaan: 'q', jawaban: 'a', dibuat: 100, benar: 0, salah: 0 },
  ];
  const urut = antrianLatihan(r);
  cek('antrean dimulai dari soal tertua, seri diurutkan id', urut.join(',') === 'a,b,c', urut.join(','));
  cek('antrean tidak mengubah ruang', r.soal[0].id === 'c');

  let antrean = urut;
  const soalPeta = new Map(r.soal.map(s => [s.id, s]));
  const sesi = { ingat: 0, belum: 0 };
  const pilih = ['belum', 'ingat', 'ingat', 'ingat'];
  let langkah = 0;
  while (antrean.length && langkah < 20) {
    const id = antrean[0];
    const nilai = pilih[langkah++];
    catatNilaiSoal(soalPeta.get(id), nilai);
    antrean = langkahAntrean(antrean, id, nilai);
    sesi[nilai]++;
  }
  cek('sesi selesai setelah 4 jawaban (satu Belum diulang)', antrean.length === 0 && langkah === 4, `langkah ${langkah}`);
  cek('ringkasan sesi: ingat 3, belum 1', JSON.stringify(ringkasSesi(sesi)) === '{"ingat":3,"belum":1}');
  cek('nilai tersimpan di soal: soal a salah 1 lalu benar 1', soalPeta.get('a').salah === 1 && soalPeta.get('a').benar === 1, JSON.stringify(soalPeta.get('a')));
  cek('catatNilaiSoal nilai tak dikenal tidak mengubah', (() => { const t = { benar: 0, salah: 0 }; catatNilaiSoal(t, 'x'); return t.benar === 0 && t.salah === 0; })());
}

// ── 7. statistik ──
console.log('── 7. statistik');
{
  const r = buatRuang({ nama: 'S', id: 'rt' }).ruang;
  cek('ruang kosong: semua nol', JSON.stringify(statistikRuang(r)) === '{"materi":0,"soal":0,"benar":0,"salah":0}');
  tambahMateri(r, { id: 'n1', judul: 'A' });
  tambahSoal(r, { pertanyaan: 'q', jawaban: 'a', id: 'x1' });
  tambahSoal(r, { pertanyaan: 'q2', jawaban: 'a2', id: 'x2' });
  r.soal[0].benar = 2; r.soal[1].salah = 3;
  cek('statistik: materi 1, soal 2, benar 2, salah 3', JSON.stringify(statistikRuang(r)) === '{"materi":1,"soal":2,"benar":2,"salah":3}', JSON.stringify(statistikRuang(r)));
}

console.log(`\nHasil: ${lulus} lulus, ${gagal} gagal`);
if (gagal) process.exit(1);
