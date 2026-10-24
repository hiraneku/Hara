/* Uji fitur pintar (murni, tanpa DOM): tokenisasi, catatan serupa, saran tag,
   ringkasan ekstraktif, tinjauan mingguan.

   Jalan: node tools/uji/pintar.mjs */
import { tokenkan, bangunIndeks, catatanSerupa, saranTag, ringkasan, tinjauanMingguan }
  from '../../docs/notes/pintar.js';
import { bacaJam, uraiTugas } from '../../docs/notes/pengingat.js';

let ok = 0, gagal = 0;
const cek = (nama, kondisi, detail = '') => {
  if (kondisi) { ok++; console.log('  ✓', nama); }
  else { gagal++; console.log('  ✗', nama, detail ? '— ' + detail : ''); }
};

console.log('── tokenisasi');
{
  const t = tokenkan('Rapat proyek Hara besok, dan belajar JavaScript!');
  cek('buang kata umum & huruf pendek', !t.includes('dan') && !t.includes('de') && t.includes('proyek'));
  cek('huruf kecil semua', t.every(x => x === x.toLowerCase()));
  cek('angka murni tidak jadi token', tokenkan('12345 678').length === 0);
  cek('aksen Indonesia terbaca', tokenkan('bermain ékspor').includes('ékspor'));
  cek('teks kosong aman', tokenkan(null).length === 0 && tokenkan('').length === 0);
}

console.log('── catatan serupa');
{
  const dok = [
    { id: 'a', teks: 'resep kue cokelat dan adonan kue lembut' },
    { id: 'b', teks: 'kue cokelat untuk pesta, resep adonan keras' },
    { id: 'c', teks: 'jadwal rapat tim proyek kuartal ketiga' },
    { id: 'd', teks: 'catatan keuangan bulan oktober tagihan listrik' },
  ];
  const r = catatanSerupa('a', dok);
  cek('catatan paling mirip paling atas', r[0] && r[0].id === 'b', JSON.stringify(r));
  cek('catatan yang tidak berhubungan tidak muncul', !r.some(x => x.id === 'd'));
  cek('menyebut kata yang sama', r[0].bersama.includes('kue') || r[0].bersama.includes('cokelat'));
  cek('catatan sendiri tidak ikut', !r.some(x => x.id === 'a'));
  cek('id tidak ada → kosong', catatanSerupa('zzz', dok).length === 0);
  cek('maks dihormati', catatanSerupa('a', dok, { maks: 1, ambang: 0 }).length <= 1);
  cek('indeks kosong aman', bangunIndeks([]).vek.size === 0);
}

console.log('── saran tag');
{
  const lain = [
    { id: 'x', teks: 'rapat proyek hara minggu ini' },
    { id: 'y', teks: 'proyek hara fitur baru' },
  ];
  const s = saranTag('Rencana proyek hara: fitur sinkronisasi sinkronisasi dan rilis.', lain, { tagLama: ['rilis'] });
  cek('mengembalikan tanpa tanda #', s.every(x => !x.startsWith('#')));
  cek('tag yang sudah ada tidak disarankan lagi', !s.includes('rilis'), JSON.stringify(s));
  cek('kata berulang di catatan ini muncul', s.includes('sinkronisasi'), JSON.stringify(s));
  cek('maks 3 saran', s.length <= 3);
  cek('teks kosong → tidak ada saran', saranTag('', lain).length === 0);
}

console.log('── ringkasan ekstraktif');
{
  const teks = 'Hari ini kami membahas rencana proyek Hara. Cuaca cerah sekali di luar. ' +
    'Proyek Hara akan dirilis bulan depan. Makan siang enak. ' +
    'Tim proyek setuju dengan jadwal rilis Hara.';
  const r = ringkasan(teks, { kalimat: 2 });
  cek('ringkasan memuat kalimat tentang topik utama', /Hara/.test(r) && /proyek/i.test(r), r);
  cek('urutan kalimat asli dipertahankan', r.indexOf('rencana') < r.indexOf('Proyek Hara akan'));
  cek('setiap kalimat hasil memang ada di teks asal', r.split(/(?<=\.)\s+/).every(k => teks.includes(k.trim())));
  cek('teks pendek dikembalikan utuh', ringkasan('Satu kalimat saja.', { kalimat: 3 }) === 'Satu kalimat saja.');
  cek('teks kosong → string kosong', ringkasan('   ') === '');
}

console.log('── tinjauan mingguan');
{
  const sekarang = Date.UTC(2026, 9, 24);
  const hari = 86400000;
  const catatan = [
    { id: 'n1', title: 'Baru', createdAt: sekarang - hari, updatedAt: sekarang - hari, tags: ['kerja'], todoSelesai: 2 },
    { id: 'n2', title: 'Lama', createdAt: sekarang - 30 * hari, updatedAt: sekarang - 2 * hari, tags: ['kerja', 'ide'], todoSelesai: 0 },
    { id: 'n3', title: 'Basi', createdAt: sekarang - 60 * hari, updatedAt: sekarang - 60 * hari, tags: ['arsip'], todoSelesai: 0 },
  ];
  const t = tinjauanMingguan(catatan, sekarang);
  cek('catatan dibuat dalam 7 hari', t.dibuat === 1, JSON.stringify(t));
  cek('catatan diedit (bukan baru dibuat)', t.diedit === 1);
  cek('catatan lama tidak dihitung', t.dibuat + t.diedit === 2);
  cek('tugas selesai dijumlahkan', t.tugasSelesai === 2);
  cek('tag teratas dari aktivitas minggu ini (n1 & n2 keduanya diedit)', t.tagTeratas[0][0] === 'kerja' && t.tagTeratas[0][1] === 2, JSON.stringify(t.tagTeratas));
  cek('terbaru diurut dari yang paling baru', t.terbaru[0].id === 'n1');
  cek('daftar kosong aman', tinjauanMingguan([], sekarang).dibuat === 0);
}

console.log('── jam tenggat (S3)');
{
  cek('15.00', bacaJam('15.00 x')?.jam === '15:00');
  cek('jam 15', bacaJam('jam 15 x')?.jam === '15:00');
  cek('pukul 7.30', bacaJam('pukul 7.30 x')?.jam === '07:30');
  cek('jam 3 sore → 15:00', bacaJam('jam 3 sore x')?.jam === '15:00');
  cek('7 malam → 19:00', bacaJam('7 malam x')?.jam === '19:00');
  cek('12 pagi → 00:00', bacaJam('12 pagi x')?.jam === '00:00');
  cek('2 siang → 14:00', bacaJam('2 siang x')?.jam === '14:00');
  cek('25.00 ditolak', bacaJam('25.00 x') === null);
  cek('angka biasa bukan jam', bacaJam('15 tugas') === null);
  const u = uraiTugas('besok jam 3 sore rapat tim');
  cek('uraiTugas: besok jam 3 sore', u && u.jam === '15:00' && u.sisa === 'rapat tim', JSON.stringify(u));
  cek('uraiTugas: tetap mengenali format lama', uraiTugas('besok 15.00 bayar listrik')?.jam === '15:00');
}

console.log(`\nTotal: ${ok + gagal} pengujian · Lulus: ${ok} · Gagal: ${gagal}`);
process.exit(gagal ? 1 : 0);
