/* Pengujian Tahap 2 · B1c (ekspor PDF hasil anotasi) — Node, tanpa DOM.

   Yang diuji:
   • teks Unicode untuk PDF (UTF-16BE dengan BOM);
   • penulis PDF: header, tabel xref (setiap offset menunjuk ke "N 0 obj"),
     startxref, jumlah halaman, MediaBox, gambar DCT, dan anotasi /Text
     komentar beserta teksnya;
   • penggambar anotasi di atas kanvas (dicek lewat konteks palsu);
   • penolakan input rusak.

   Tidak diuji di sini: render pdf.js dan unduhan di peramban. Itu diuji di
   Chromium (skrip di luar repo, lihat laporan). Hasil file juga dicek dengan
   pembaca PDF independen (pypdf) di luar repo.

   Jalan: node tools/uji/pdf-ekspor.mjs (dari folder repo). */
import path from 'path';
import { fileURLToPath } from 'url';

process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));

let lulus = 0, gagal = 0;
function cek(nama, kondisi, detail = '') {
  if (kondisi) { lulus++; console.log('  ok  ' + nama); }
  else { gagal++; console.log('  GAGAL ' + nama + (detail ? ' — ' + detail : '')); }
}

const E = await import('../../docs/notes/pdf/ekspor-pdf.js');

/* JPEG palsu: penulis tidak memeriksa isi JPEG, hanya menyalinnya. */
const jpegPalsu = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

console.log('── teks PDF (UTF-16BE)');
cek('teks ASCII jadi UTF-16BE dengan BOM', E.teksPdfUtf16('Hai') === '<FEFF004800610069>', E.teksPdfUtf16('Hai'));
cek('teks Indonesia dengan tanda ya/kutip aman', E.teksPdfUtf16('é') === '<FEFF00E9>', E.teksPdfUtf16('é'));
cek('teks kosong hanya BOM', E.teksPdfUtf16('') === '<FEFF>');

console.log('── penulis PDF');
const halaman = [
  { w: 300, h: 400, pxW: 600, pxH: 800, jpeg: jpegPalsu, komentar: [{ x: 0.5, y: 0.25, teks: 'cek ulang' }] },
  { w: 300, h: 400, pxW: 600, pxH: 800, jpeg: jpegPalsu, komentar: [{ x: 0.1, y: 0.9, teks: 'Ada 2' }, { x: 0.8, y: 0.1, teks: 'Ada 3' }] },
  { w: 612.5, h: 792, pxW: 1225, pxH: 1584, jpeg: jpegPalsu, komentar: [] },
];
const pdf = E.tulisPdfGambar(halaman);
const teks = Buffer.from(pdf).toString('latin1');

cek('diawali header PDF', teks.startsWith('%PDF-1.4\n'));
cek('diakhiri %%EOF', teks.trimEnd().endsWith('%%EOF'));

const mStartxref = teks.match(/startxref\n(\d+)\n%%EOF/);
cek('startxref menunjuk ke kata "xref"', !!mStartxref && teks.slice(Number(mStartxref[1]), Number(mStartxref[1]) + 4) === 'xref',
  mStartxref ? mStartxref[1] : 'tidak ada');

/* setiap entri xref harus menunjuk ke awal "N 0 obj" yang benar */
const xrefPos = Number(mStartxref[1]);
const bagianXref = teks.slice(xrefPos).split('\n');
const jumlahEntri = Number(bagianXref[1].split(' ')[1]);
let benarOffset = true, salahContoh = '';
for (let no = 1; no < jumlahEntri; no++) {
  const baris = bagianXref[2 + no];   /* baris 2 = entri 0 (free) */
  const off = Number(baris.slice(0, 10));
  const awal = teks.slice(off, off + String(no).length + 8);
  if (!awal.startsWith(`${no} 0 obj`)) { benarOffset = false; salahContoh = `${no}→${JSON.stringify(awal)}`; break; }
}
cek('setiap offset xref menunjuk ke "N 0 obj" yang benar', benarOffset, salahContoh);
cek('entri xref sesuai jumlah objek (entri 0 + objek)', jumlahEntri > 10, 'entri=' + jumlahEntri);
cek('setiap baris xref 20 byte', bagianXref.slice(2, 2 + jumlahEntri).every(b => b.length === 19 || b.length === 20),
  'contoh: ' + JSON.stringify(bagianXref[2]));

cek('jumlah halaman /Count 3', /\/Type \/Pages \/Kids \[[^\]]+\] \/Count 3 >>/.test(teks));
const mediaBox = [...teks.matchAll(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/g)].map(m => m[1] + 'x' + m[2]);
cek('MediaBox tiap halaman sesuai ukuran asli', mediaBox.join(',') === '300x400,300x400,612.5x792', mediaBox.join(','));
cek('gambar DCT (JPEG) tiga halaman', (teks.match(/\/Filter \/DCTDecode/g) || []).length === 3);
cek('gambar /Width /Height sesuai piksel', teks.includes('/Width 1225 /Height 1584'));
cek('isi halaman menggambar gambar dengan cm', (teks.match(/ cm \/Im\d+ Do Q/g) || []).length === 3);

const jumlahAnotasi = (teks.match(/\/Subtype \/Text/g) || []).length;
cek('tiga anotasi komentar (1 + 2 + 0)', jumlahAnotasi === 3, 'ditemukan ' + jumlahAnotasi);
cek('teks komentar tersimpan UTF-16 ("cek ulang")', teks.includes(E.teksPdfUtf16('cek ulang')));
cek('anotasi memakai /Name /Comment dan /Open false', teks.includes('/Name /Comment') && teks.includes('/Open false'));
const mRect = teks.match(/\/Rect \[([\d. ]+)\]/);
cek('kotak anotasi punya empat angka', !!mRect && mRect[1].split(' ').length === 4, mRect ? mRect[1] : '');

console.log('── input rusak');
let galat = null;
try { E.tulisPdfGambar([]); } catch (e) { galat = e; }
cek('tanpa halaman ditolak', galat !== null);
galat = null;
try { E.tulisPdfGambar([{ w: 0, h: 10, pxW: 1, pxH: 1, jpeg: jpegPalsu, komentar: [] }]); } catch (e) { galat = e; }
cek('ukuran halaman nol ditolak', galat !== null);
galat = null;
try { E.tulisPdfGambar([{ w: 10, h: 10, pxW: 1, pxH: 1, jpeg: new Uint8Array(0), komentar: [] }]); } catch (e) { galat = e; }
cek('gambar kosong ditolak', galat !== null);

console.log('── penggambar anotasi (konteks palsu)');
{
  const catatan = [];
  const ctx = new Proxy({}, {
    get(_, nama) {
      if (nama === 'moveTo' || nama === 'lineTo' || nama === 'fillRect' || nama === 'arc' || nama === 'stroke' || nama === 'fill' || nama === 'beginPath' || nama === 'save' || nama === 'restore') {
        return (...a) => catatan.push([nama, ...a]);
      }
      return undefined;
    },
    set(_, nama, nilai) { catatan.push(['set', nama, nilai]); return true; },
  });
  E.gambarAnotasiKanvas(ctx, 1000, 2000, [
    { jenis: 'coret', warna: '#e53935', pts: [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.3 }, { x: 0.3, y: 0.2 }] },
    { jenis: 'sorot', warna: '#fdd835', x1: 0.5, y1: 0.5, x2: 0.25, y2: 0.4 },
    { jenis: 'garis', warna: '#e53935', x1: 0, y1: 0, x2: 1, y2: 1 },
    { jenis: 'komentar', warna: '#1e88e5', x: 0.9, y: 0.8, teks: 'x' },
  ]);
  const naikKe = catatan.filter(c => c[0] === 'moveTo' || c[0] === 'lineTo');
  cek('coret: titik dikali ukuran piksel (0.1,0.1 → 100,200)',
    naikKe.some(c => c[0] === 'moveTo' && c[1] === 100 && c[2] === 200), JSON.stringify(naikKe.slice(0, 2)));
  const isiSorot = catatan.find(c => c[0] === 'fillRect');
  cek('sorot: kotak dinormalisasi (min x,y dan lebar/tinggi benar)',
    !!isiSorot && isiSorot[1] === 250 && isiSorot[2] === 800 && isiSorot[3] === 250 && Math.abs(isiSorot[4] - 200) < 1e-6, JSON.stringify(isiSorot));
  cek('sorot memakai transparansi 0.35', catatan.some(c => c[0] === 'set' && c[1] === 'globalAlpha' && c[2] === 0.35));
  cek('penanda komentar digambar sebagai lingkaran', catatan.some(c => c[0] === 'arc' && c[1] === 900 && c[2] === 1600));
  cek('warna anotasi dipakai (strokeStyle)', catatan.some(c => c[0] === 'set' && c[1] === 'strokeStyle' && c[2] === '#e53935'));
}

console.log(`\nHASIL: ${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
