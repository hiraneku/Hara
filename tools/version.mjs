/* Menempelkan penanda versi ke setiap import & stylesheet.

   Kenapa perlu: GitHub Pages menyajikan modul ES dengan cache agresif, dan
   browser HP kerap menahan berkas lama berhari-hari. Tanpa penanda versi,
   pengguna bisa melihat kode lama padahal deploy sudah berhasil.

   Jalankan sebelum commit:  node tools/version.mjs
   Skrip ini idempoten — versi lama diganti, bukan ditumpuk. */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const VER = process.argv[2] || new Date().toISOString().replace(/\D/g, '').slice(0, 14);

function berkas(dir, keluar = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) berkas(p, keluar);
    else if (/\.(js|html)$/.test(f.name)) keluar.push(p);
  }
  return keluar;
}

let ubah = 0;
for (const p of berkas('docs')) {
  const asli = fs.readFileSync(p, 'utf8');
  let s = asli;

  /* import/export ... from './x.js'  →  './x.js?v=VER' */
  s = s.replace(/(from\s+['"])(\.[^'"]+?\.js)(\?v=[^'"]*)?(['"])/g,
                (_, a, jalur, __, z) => a + jalur + '?v=' + VER + z);

  /* import('./x.js') dinamis */
  s = s.replace(/(import\(\s*['"])(\.[^'"]+?\.js)(\?v=[^'"]*)?(['"]\s*\))/g,
                (_, a, jalur, __, z) => a + jalur + '?v=' + VER + z);

  /* <script src> dan <link href> lokal */
  s = s.replace(/(<script[^>]+src=")(\.[^"]+?\.js)(\?v=[^"]*)?(")/g,
                (_, a, jalur, __, z) => a + jalur + '?v=' + VER + z);
  s = s.replace(/(<link[^>]+href=")(\.[^"]+?\.css)(\?v=[^"]*)?(")/g,
                (_, a, jalur, __, z) => a + jalur + '?v=' + VER + z);

  if (s !== asli) { fs.writeFileSync(p, s); ubah++; }
}
console.log(`versi ${VER} — ${ubah} berkas diperbarui`);
