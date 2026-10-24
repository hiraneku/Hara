/* Uji K18 · cadangan terenkripsi dengan berkas besar (murni, tanpa DOM).
   Membuat cadangan ±12 MB, menguji roundtrip, frasa salah, perusakan,
   dan memastikan teks asli tidak tampak di berkas terenkripsi.

   Jalan: node tools/uji/cadangan-besar.mjs */
import { buatCadanganTerenkripsi, bukaCadanganTerenkripsi, adalahCadanganTerenkripsi, MIN_FRASA } from '../../docs/core/enkripsi.js';

let ok = 0, gagal = 0;
const cek = (nama, kondisi, detail = '') => {
  if (kondisi) { ok++; console.log('ok  ', nama); }
  else { gagal++; console.log('FAIL', nama, detail ? '\n      ' + detail : ''); }
};
const galat = async p => { try { await p; return null; } catch (e) { return e.message; } };

/* Isi catatan deterministik ±12 MB; penanda unik untuk memastikan tidak bocor. */
const KATA = ['rapat', 'kebun', 'tugas', 'anggaran', 'laporan', 'resep', 'perjalanan', 'catatan', 'ide', 'belanja'];
const JUMLAH = 3000;
const notes = [];
let seed = 7;
const acak = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
for (let i = 0; i < JUMLAH; i++) {
  const kalimat = [];
  for (let k = 0; k < 500; k++) kalimat.push(KATA[acak(KATA.length)]);
  notes.push({ id: 'n' + i, title: 'Catatan ' + i, blocks: [{ type: 'paragraph', content: kalimat.join(' ') + (i === 1234 ? ' RAHASIA-BESAR-PENANDA' : '') }] });
}
const isi = JSON.stringify({ app: 'hara', v: 1, notes });
const FRASA = 'frasa-uji-besar-2026';
console.log(`── ukuran isi cadangan: ${(isi.length / 1048576).toFixed(1)} MB, ${JUMLAH} catatan ──`);

let t0 = Date.now();
const terenkripsi = await buatCadanganTerenkripsi(isi, FRASA);
const tBuat = Date.now() - t0;
console.log(`    waktu enkripsi: ${tBuat} ms · ukuran berkas: ${(terenkripsi.length / 1048576).toFixed(1)} MB`);

cek('K18a berkas terdeteksi sebagai cadangan terenkripsi', adalahCadanganTerenkripsi(terenkripsi));
cek('K18b penanda teks asli tidak tampak di berkas', !terenkripsi.includes('RAHASIA-BESAR-PENANDA') && !terenkripsi.includes('rapat kebun'));

t0 = Date.now();
const kembali = await bukaCadanganTerenkripsi(terenkripsi, FRASA);
const tBuka = Date.now() - t0;
console.log(`    waktu dekripsi: ${tBuka} ms`);
cek('K18c roundtrip berkas besar: isi identik byte demi byte', kembali === isi, `panjang ${kembali.length} vs ${isi.length}`);
cek('K18d hasil bisa di-parse dan jumlah catatan utuh', JSON.parse(kembali).notes.length === JUMLAH);
cek('K18e catatan tengah (indeks 1234) utuh', JSON.parse(kembali).notes[1234].blocks[0].content.endsWith('RAHASIA-BESAR-PENANDA'));

const galatFrasa = await galat(bukaCadanganTerenkripsi(terenkripsi, 'frasa-salah-2026'));
cek('K18f frasa salah ditolak dengan pesan jelas', galatFrasa === 'sandi salah atau data rusak', galatFrasa);

/* Ubah satu karakter di tengah data ciphertext (tetap base64 valid). */
const d = JSON.parse(terenkripsi);
const ct = d.paket.data;
const tengah = ct.length >> 1;
const ganti = ct[tengah] === 'A' ? 'B' : 'A';
d.paket.data = ct.slice(0, tengah) + ganti + ct.slice(tengah + 1);
const galatRusak = await galat(bukaCadanganTerenkripsi(JSON.stringify(d), FRASA));
cek('K18g satu karakter berkas besar dirusak → ditolak (tag GCM)', galatRusak === 'sandi salah atau data rusak', galatRusak);

const galatPendek = await galat(buatCadanganTerenkripsi('x', 'pendek'));
cek(`K18h frasa di bawah ${MIN_FRASA} karakter ditolak`, galatPendek === `frasa sandi minimal ${MIN_FRASA} karakter`, galatPendek);
cek('K18i berkas bukan cadangan Hara ditolak', (await galat(bukaCadanganTerenkripsi('{"x":1}', FRASA))) === 'bukan cadangan terenkripsi Hara');

console.log(`\nHasil: ${ok}/${ok + gagal} lolos`);
process.exit(gagal ? 1 : 0);
