/* Pengujian menu warna teks (regresi): tinggi popup & posisi.
   Akar masalah yang diperbaiki: isi menu warna lebih tinggi dari popup biasa
   (420 px), sehingga tombol Pakai dan Bawaan tertutup lipatan dan ketukan
   di sana dianggap "klik di luar" (menu menutup tanpa menerapkan warna).
   Uji ini memeriksa kelas dan aturan CSS yang mencegahnya. Perilaku sentuh
   nyata diuji di Chromium (lihat laporan). Jalan: node tools/uji/menu-warna.mjs */
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));

const dom = new JSDOM(fs.readFileSync('docs/index.html', 'utf8'), { url: 'https://x.test/', pretendToBeVisual: true });
const { window: w } = dom;
for (const k of ['document', 'HTMLElement', 'Node', 'Range', 'MouseEvent', 'KeyboardEvent', 'Event', 'localStorage', 'NodeFilter'])
  if (w[k] !== undefined) globalThis[k] = w[k];
globalThis.window = w; globalThis.self = w;
globalThis.addEventListener = w.addEventListener.bind(w);
Object.defineProperty(globalThis, 'navigator', { value: w.navigator, configurable: true });
w.URL.createObjectURL = () => 'blob:x/1'; w.URL.revokeObjectURL = () => {};
const V = fs.readFileSync('docs/app.js', 'utf8').match(/\?v=(\d+)/)[1];
const im = p => import(`${process.cwd()}/docs/${p}?v=${V}`);
await im('app.js');
const pop = await im('notes/menus/pop.js');
const warna = await im('notes/menus/warna.js');

let gagal = 0, total = 0;
const cek = (nama, ok, det = '') => { total++; if (!ok) { gagal++; console.log('FAIL', nama, det); } else console.log('ok  ', nama); };

const css = fs.readFileSync('docs/styles/notes.css', 'utf8');
cek('aturan .pop.pop-warna ada di CSS', /\.pop\.pop-warna\{max-height:min\(calc\(100vh - 24px\),580px\)\}/.test(css));
cek('aturan dengan 100dvh ada (layar HP modern)', /@supports \(height:100dvh\)\{\.pop\.pop-warna\{max-height:min\(calc\(100dvh - 24px\),580px\)\}\}/.test(css));
cek('batas lama 420px tidak lagi jadi satu-satunya batas menu warna', !/\.pop\.pop-warna\{max-height:min\(60vh,420px\)/.test(css));

const p = document.getElementById('pop') || (() => { const e = document.createElement('div'); e.id = 'pop'; e.className = 'pop'; document.body.appendChild(e); return e; })();
pop.setPopIsi(warna.warnaMenu());
cek('menu warna diberi kelas pop-warna', p.classList.contains('pop-warna'));
pop.setPopIsi('<div class="pop-h">Contoh biasa</div><p>isi</p>');
cek('menu biasa TIDAK diberi kelas pop-warna', !p.classList.contains('pop-warna'));
pop.setPopIsi(warna.warnaMenu());
cek('kembali ke menu warna → kelas kembali', p.classList.contains('pop-warna'));
cek('tombol Pakai & Bawaan ada di menu warna', !!p.querySelector('[data-warna-pakai]') && !!p.querySelector('[data-warna-hapus]'));

console.log(`\nTotal: ${total} · Lulus: ${total - gagal} · Gagal: ${gagal}`);
process.exit(gagal ? 1 : 0);
