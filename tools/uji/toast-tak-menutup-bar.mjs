/* Uji statis: pesan singkat (.toast) tidak boleh menutup bar bawah.

   Bug HP: toast beraksi ("Urungkan" dkk.) duduk di bottom:24px dengan
   z-index 90 — lebih tinggi daripada bar navigasi bawah (z-30), sehingga
   selama toast tampil (mis. 6 detik jendela Urungkan), separuh ATAS
   tombol bar tidak bisa diketuk.

   jsdom tidak menghitung tata letak, jadi kontrak ini diperiksa di
   teks CSS:
   - layar sempit (≤768px): .toast diangkat ke atas bar (56px) + FAB
     (48px di 70px) → dasar toast minimal 120px + safe-area;
   - mode editor: bar mekanik duduk di dasar layar, .toast diangkat ke
     atasnya (≥ 80px) lewat .mech.on ~ .toast.
*/
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const css = fs.readFileSync('docs/styles/notes.css', 'utf8');

let gagal = 0;
const cek = (nama, ok) => {
  console.log((ok ? 'ok   ' : 'GAGAL ') + nama);
  if (!ok) gagal++;
};

const angkaBottom = aturan => {
  const m = aturan.match(/bottom:calc\((\d+)px\s*\+\s*env\(safe-area-inset-bottom\)\)/);
  return m ? +m[1] : null;
};

/* blok media sempit (yang terakhir di berkas) */
const blok = [...css.matchAll(/@media\(max-width:\s*768px\)\s*\{([\s\S]*?)\n\}/g)].pop();
cek('blok @media(max-width:768px) ditemukan', !!blok && !!blok[1]);

if (blok) {
  const t = blok[1].match(/(?:^|\n)\s*\.toast\{([^}]*)\}/);
  const n = t ? angkaBottom(t[1]) : null;
  cek('layar sempit: .toast punya dasar ≥120px + safe-area', n !== null && n >= 120);
}

const m = css.match(/\.mech\.on\s*~\s*\.toast\{([^}]*)\}/);
const n = m ? angkaBottom(m[1]) : null;
cek('editor: .mech.on ~ .toast ada dengan dasar ≥80px + safe-area', n !== null && n >= 80);

process.exit(gagal ? 1 : 0);
