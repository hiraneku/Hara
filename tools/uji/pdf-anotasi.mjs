/* Pengujian Tahap 2 · B1b (anotasi PDF: coret, sorot, garis, komentar) — Node.

   Yang diuji:
   • logika murni (anotasi.js): koordinat ternormalisasi dan penjepitan 0–1,
     bentuk data yang diterima dan ditolak, batal hanya di halaman aktif,
     parsing data rusak tanpa melempar galat;
   • penyimpanan (anotasi-simpan.js) di IndexedDB palsu: tulis, baca, dan
     pemisahan kunci 'anot-<id>' dari id blob PDF asli;
   • isi PDF asli TIDAK berubah setelah anotasi disimpan (dibandingkan hash);
   • cadangan (data-io.js): kunci anotasi ikut dicadangkan dan dipulihkan.

   Yang TIDAK diuji di sini: gambar di layar, sentuhan, dan sapuan blob
   yatim di peramban. Itu diuji di Chromium (skrip di luar repo, lihat
   laporan). Uji ini tidak menyatakan fitur tampil berhasil.

   Jalan: node tools/uji/pdf-anotasi.mjs (dari folder repo). */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { indexedDB as fakeIDB } from 'fake-indexeddb';
import { JSDOM } from 'jsdom';

process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));

let lulus = 0, gagal = 0;
function cek(nama, kondisi, detail = '') {
  if (kondisi) { lulus++; console.log('  ok  ' + nama); }
  else { gagal++; console.log('  GAGAL ' + nama + (detail ? ' — ' + detail : '')); }
}

/* IndexedDB palsu untuk core/blobs.js (memakai self.indexedDB). */
globalThis.self = globalThis;
globalThis.indexedDB = fakeIDB;

const A = await import('../../docs/notes/pdf/anotasi.js');
const S = await import('../../docs/notes/pdf/anotasi-simpan.js');
const B = await import('../../docs/core/blobs.js');

console.log('── logika murni');

cek('titik dinormalisasi terhadap kotak', (() => {
  const p = A.titikTernormal(150, 75, { left: 100, top: 50, width: 100, height: 50 });
  return Math.abs(p.x - 0.5) < 1e-9 && Math.abs(p.y - 0.5) < 1e-9;
})());
cek('titik di luar kotak dijepit ke 0–1', (() => {
  const a = A.titikTernormal(-50, 999, { left: 0, top: 0, width: 100, height: 100 });
  return a.x === 0 && a.y === 1;
})());
cek('kotak kosong (lebar 0) tidak menghasilkan titik', A.titikTernormal(1, 1, { left: 0, top: 0, width: 0, height: 0 }) === null);
cek('kotak tidak ada tidak menghasilkan titik', A.titikTernormal(1, 1, null) === null);

const t0 = 1700000000000;
const coret = A.buatAnotasi('coret', 2, { pts: [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.3 }] }, t0);
cek('buatAnotasi: warna diambil dari jenis', coret.warna === A.WARNA_ANOT.coret && coret.hal === 2 && coret.dibuat === t0);
cek('buatAnotasi: id unik', A.buatAnotasi('garis', 1, { x1: 0, y1: 0, x2: 1, y2: 1 }, t0).id !==
  A.buatAnotasi('garis', 1, { x1: 0, y1: 0, x2: 1, y2: 1 }, t0).id);

let galat = null;
try { A.buatAnotasi('gambar-bebas', 1, {}); } catch (e) { galat = e; }
cek('jenis tidak dikenal ditolak', galat !== null);
galat = null;
try { A.buatAnotasi('coret', 1, { pts: [{ x: 0.5, y: 0.5 }] }); } catch (e) { galat = e; }
cek('coret dengan satu titik ditolak', galat !== null);
galat = null;
try { A.buatAnotasi('sorot', 1, { x1: 0, y1: 0, x2: 1.5, y2: 1 }); } catch (e) { galat = e; }
cek('koordinat di luar 0–1 ditolak', galat !== null);
galat = null;
try { A.buatAnotasi('komentar', 1, { x: 0.2, y: 0.2, teks: '' }); } catch (e) { galat = e; }
cek('komentar kosong ditolak', galat !== null);
galat = null;
try { A.buatAnotasi('komentar', 1, { x: 0.2, y: 0.2, teks: 'x'.repeat(A.MAKS_TEKS_KOMENTAR + 1) }); } catch (e) { galat = e; }
cek('komentar terlalu panjang ditolak', galat !== null);
galat = null;
try { A.buatAnotasi('garis', 0, { x1: 0, y1: 0, x2: 1, y2: 1 }); } catch (e) { galat = e; }
cek('nomor halaman 0 ditolak', galat !== null);

const garis = A.buatAnotasi('garis', 1, { x1: 0, y1: 0, x2: 1, y2: 1 }, t0);
const sorot = A.buatAnotasi('sorot', 2, { x1: 0.2, y1: 0.2, x2: 0.4, y2: 0.3 }, t0);
const komen = A.buatAnotasi('komentar', 2, { x: 0.5, y: 0.5, teks: 'cek ulang' }, t0);
let daftar = [];
daftar = A.tambahAnotasi(daftar, coret);
daftar = A.tambahAnotasi(daftar, garis);
daftar = A.tambahAnotasi(daftar, sorot);
daftar = A.tambahAnotasi(daftar, komen);
cek('anotasiHalaman hanya mengambil satu halaman (halaman 2 punya 3)', A.anotasiHalaman(daftar, 2).length === 3 &&
  A.anotasiHalaman(daftar, 2).every(a => a.hal === 2));

const sesudahBatal = A.batalTerakhirHalaman(daftar, 2);
cek('batal menghapus yang terakhir di halaman aktif', sesudahBatal.length === 3 &&
  sesudahBatal.at(-1).id === sorot.id, JSON.stringify(sesudahBatal.map(a => a.id)));
cek('batal tidak menyentuh halaman lain', A.anotasiHalaman(sesudahBatal, 1).length === 1);
cek('batal pada halaman tanpa anotasi tidak mengubah daftar', A.batalTerakhirHalaman(daftar, 9) === daftar);
cek('batal tidak mengubah daftar asal (tanpa efek samping)', daftar.length === 4);

cek('bacaAnotasi: teks rusak menghasilkan []', A.bacaAnotasi('{bukan json').length === 0);
cek('bacaAnotasi: format tak dikenal menghasilkan []', A.bacaAnotasi('{"anotasi":"x"}').length === 0);
const campur = JSON.stringify({ versi: 1, anotasi: [coret, { jenis: 'coret', hal: 1 }, garis, null, komen] });
cek('bacaAnotasi: entri rusak dibuang satu per satu', A.bacaAnotasi(campur).length === 3);
cek('tulis lalu baca kembali sama', JSON.stringify(A.bacaAnotasi(A.tulisAnotasi(daftar))) === JSON.stringify(daftar));

cek('kunci anotasi berbeda dari id blob PDF', A.kunciAnotasi('fl_abc') === 'anot-fl_abc' && A.kunciAnotasi('fl_abc') !== 'fl_abc');

console.log('── penyimpanan (IndexedDB palsu)');

/* PDF asli palsu: byte acak, hash dicatat sebelum dan sesudah. */
const bytesPdf = crypto.randomBytes(4096);
const hashAwal = crypto.createHash('sha256').update(bytesPdf).digest('hex');
const idPdf = 'fl_uji' + Date.now().toString(36);
await B.simpanBlob(idPdf, new Blob([bytesPdf], { type: 'application/pdf' }));

cek('muatAnotasi tanpa data mengembalikan []', (await S.muatAnotasi(idPdf)).length === 0);
await S.simpanAnotasi(idPdf, daftar);
const dibaca = await S.muatAnotasi(idPdf);
cek('anotasi tersimpan dan terbaca kembali', dibaca.length === daftar.length &&
  dibaca.every((a, i) => a.id === daftar[i].id && a.jenis === daftar[i].jenis));
cek('blob anotasi disimpan dengan kunci anot-<id>', (await B.ambilBlob('anot-' + idPdf)) !== undefined);
const isiPdfSesudah = Buffer.from(await (await B.ambilBlob(idPdf)).arrayBuffer());
const hashSesudah = crypto.createHash('sha256').update(isiPdfSesudah).digest('hex');
cek('PDF asli tidak berubah setelah anotasi disimpan', hashSesudah === hashAwal);

const duaRibu = A.buatAnotasi('coret', 1, { pts: [{ x: 0, y: 0 }, { x: 1, y: 1 }] });
await S.simpanAnotasi(idPdf, [duaRibu]);
cek('simpan ulang menggantikan isi lama', (await S.muatAnotasi(idPdf)).length === 1);

await B.simpanBlob('anot-rusak', new Blob(['{rusak'], { type: 'application/json' }));
cek('anotasi rusak di penyimpanan dibaca sebagai kosong tanpa galat', (await S.muatAnotasi('rusak')).length === 0);

console.log('── cadangan (data-io.js)');
{
  /* data-io.js menarik modul DOM (toast, dll.), jadi perlu jsdom */
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://x.test/', pretendToBeVisual: true });
  for (const k of ['window', 'document', 'HTMLElement', 'Node', 'Event', 'MouseEvent', 'KeyboardEvent'])
    if (dom.window[k] !== undefined) globalThis[k] = dom.window[k];
  globalThis.localStorage ??= dom.window.localStorage;
  const dataIo = await import('../../docs/notes/data-io.js');
  const { state } = await import('../../docs/core/store.js?v=20261026024309');
  const blokFile = { id: 'b1', type: 'file', content: '', meta: { blobId: idPdf, name: 'uji.pdf', size: 4096, mime: 'application/pdf' } };
  state.notes = [{ id: 'n1', title: 'uji', blocks: [blokFile] }];
  const { teks } = await dataIo.cadanganJson();
  const cad = JSON.parse(teks);
  cek('cadangan memuat blob PDF', !!cad.blobs[idPdf]);
  cek('cadangan memuat blob anotasi (anot-<id>)', !!cad.blobs['anot-' + idPdf]);
  cek('blob anotasi yang tidak dirujuk tidak ikut', cad.blobs['anot-rusak'] === undefined);
}

console.log('── sumber');
const sumberImage = fs.readFileSync('docs/notes/editor/image.js', 'utf8');
cek('sapuan blob yatim memakai kunciAnotasi', sumberImage.includes('kunciAnotasi(id)'));

console.log(`\nHASIL: ${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
