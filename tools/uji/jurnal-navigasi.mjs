/* Uji Tahap 2 · B8 lanjutan — navigasi antar-hari di jurnal dan tautan balik ke kalender.
   - tanggalDariJudul (jurnal-tanggal.js): kebalikan judulJurnal untuk id, en, ja; judul bukan
     jurnal dan tanggal yang tidak ada (31 Februari) ditolak;
   - sumber: harian.js punya bilah navigasi (prev/next/kalender) dan navigasiJurnal yang
     memanggil flush() dan bukaJurnalTanggal; tugas.js punya tampilkanKalenderTanggal;
     editor.js memasang bilah; index.js menangani [data-jur]; kamus en/ja punya teks baru.
   Alur klik di aplikasi (pindah hari, kalender, mengetik sebelum pindah) ada di Chromium
   (harness di luar repo). Jalankan: node tools/uji/jurnal-navigasi.mjs */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { judulJurnal, tanggalDariJudul, KODE_JURNAL, tanggalJurnal } from '../../docs/notes/jurnal-tanggal.js';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));

let lulus = 0, gagal = 0;
const cek = (nama, ok, info = '') => {
  if (ok) { lulus++; console.log(`ok   ${nama}`); }
  else { gagal++; console.log(`GAGAL ${nama}${info ? ' — ' + info : ''}`); }
};
const sama = (a, b) => a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
const baca = f => fs.readFileSync(f, 'utf8');

console.log('── tanggal dari judul (pulang-pergi) ──');
const tanggal = [new Date(2026, 9, 15), new Date(2026, 0, 5), new Date(2026, 11, 31), new Date(2028, 1, 29), new Date(2026, 8, 1)];
for (const b of KODE_JURNAL) {
  let semuaCocok = true;
  for (const t of tanggal) {
    const hasil = tanggalDariJudul(judulJurnal(b, t));
    if (!sama(hasil, new Date(t.getFullYear(), t.getMonth(), t.getDate()))) { semuaCocok = false; console.log('   ', b, judulJurnal(b, t), '→', hasil); }
  }
  cek(`judul ${b} kembali ke tanggal yang sama (5 tanggal termasuk kabisat)`, semuaCocok);
}
cek('judul jurnal dengan spasi di tepi tetap dikenali', sama(tanggalDariJudul('   ' + judulJurnal('id', new Date(2026, 9, 15)) + '  '), new Date(2026, 9, 15)));
cek('catatan biasa bukan jurnal', tanggalDariJudul('Belajar fisika') === null);
cek('awalan saja bukan jurnal', tanggalDariJudul('Jurnal · ') === null);
cek('judul kosong / null bukan jurnal', tanggalDariJudul('') === null && tanggalDariJudul(null) === null && tanggalDariJudul(undefined) === null);
cek('31 Februari ditolak', tanggalDariJudul('Jurnal · 31 Februari 2026') === null);
cek('30 Februari (en) ditolak', tanggalDariJudul('Journal · February 30, 2026') === null);
cek('bulan tak dikenal ditolak', tanggalDariJudul('Jurnal · 5 Janvier 2026') === null);
cek('tanggal ja 2026年13月1日 ditolak', tanggalDariJudul('ジャーナル · 2026年13月1日') === null);
cek('tanggal ja yang benar diterima', sama(tanggalDariJudul('ジャーナル · 2026年9月9日'), new Date(2026, 8, 9)));
cek('judul id dengan tanggal 1 digit diterima', sama(tanggalDariJudul('Jurnal · 5 Januari 2026'), new Date(2026, 0, 5)));
cek('format tanggal konsisten dengan tanggalJurnal', tanggalJurnal('en', new Date(2026, 8, 9)) === 'September 9, 2026');

console.log('── sumber: bilah, navigasi, kalender, wiring ──');
const harian = baca('docs/notes/harian.js');
const tugas = baca('docs/notes/views/tugas.js');
const editor = baca('docs/notes/views/editor.js');
const index = baca('docs/notes/index.js');
const kamusEn = baca('docs/core/bahasa-en.js');
const kamusJa = baca('docs/core/bahasa-ja.js');
const css = baca('docs/styles/notes.css');

cek('harian.js: jurnalBarHtml hanya untuk catatan jurnal (return kosong bila bukan)', /export function jurnalBarHtml\(n\)[\s\S]*?if \(!t\) return ''/.test(harian));
cek('harian.js: bilah memuat tiga aksi data-jur (prev, kalender, next)', ['data-jur="prev"', 'data-jur="kalender"', 'data-jur="next"'].every(x => harian.includes(x)));
cek('harian.js: navigasiJurnal memanggil flush() sebelum pindah', /export function navigasiJurnal[\s\S]*?flush\(\)[\s\S]*?bukaJurnalTanggal/.test(harian));
cek('harian.js: prev/next pindah satu hari (±1)', /getDate\(\) \+ arah/.test(harian) && /aksi === 'next' \? 1 : -1/.test(harian));
cek('harian.js: kalender memakai tampilkanKalenderTanggal dengan tanggal jurnal', /aksi === 'kalender'\) return tampilkanKalenderTanggal\(t\.getTime\(\)\)/.test(harian));
cek('harian.js: escape teks bilah (esc) dipakai', /esc\(tglSebelum\)/.test(harian) && /esc\(tr\(/.test(harian));
cek('tugas.js: tampilkanKalenderTanggal menyetel kalPilih & kalBulan lalu go(task)', /export function tampilkanKalenderTanggal\(ms\)[\s\S]*?kalPilih = awalHari\(Number\(ms\)\)[\s\S]*?kalBulan = [\s\S]*?go\('task'\)/.test(tugas));
cek('editor.js: bilah dipasang di atas judul catatan', /renderQuickKeysHtml\(\)\}\s*\n\s*\$\{jurnalBarHtml\(n\)\}\s*\n\s*<input class="ed-t"/.test(editor));
cek('index.js: handler [data-jur] memanggil navigasiJurnal', /closest\('\[data-jur\]'\)[\s\S]*?navigasiJurnal\(jur\.dataset\.jur\)/.test(index));
cek('index.js: navigasiJurnal diimpor dari harian.js', /navigasiJurnal \} from '\.\/harian\.js/.test(index));
cek('kamus en: 4 teks bilah ada', ['Navigasi jurnal', 'Jurnal sebelumnya', 'Jurnal berikutnya', 'Lihat di kalender'].every(k => kamusEn.includes(`"${k}":`)));
cek('kamus ja: 4 teks bilah ada', ['Navigasi jurnal', 'Jurnal sebelumnya', 'Jurnal berikutnya', 'Lihat di kalender'].every(k => kamusJa.includes(`"${k}":`)));
cek('CSS: gaya .jurnal-bar dan .jurnal-b ada', css.includes('.jurnal-bar{') && css.includes('.jurnal-b{'));

console.log(`\nHasil: ${lulus} LOLOS, ${gagal} GAGAL`);
process.exit(gagal ? 1 : 0);
