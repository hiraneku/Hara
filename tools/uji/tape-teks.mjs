/* Pengujian C6 · Active recall tape (teks) — Node + jsdom.

   Yang diuji (logika DOM di editor/tape-murni.js dan penyaringan di html-aman.js):
   • membungkus seleksi jadi span tape tersembunyi, teks asli utuh;
   • seleksi yang menolak: kosong, melewati dua blok, di dalam tape, memuat tape;
   • membalik status satu tape, buka/tutup semua, dan hitungan perubahannya;
   • status tersimpan sebagai kelas dan lolos penyaringan HTML (tidak dibuang);
   • HTML yang disimpan lalu dibaca lagi tetap memuat tape dengan statusnya.

   Yang TIDAK diuji di sini: klik pada tape, bilah seleksi, dan tampilan (Chromium, skrip di luar repo).

   Jalan: node tools/uji/tape-teks.mjs (dari folder repo). */
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://x.test/' });
const { window: w } = dom;
for (const k of ['document', 'Node', 'Range', 'DocumentFragment', 'DOMParser', 'HTMLElement', 'Element']) {
  if (w[k] !== undefined) globalThis[k] = w[k];
}
const T = await import('../../docs/notes/editor/tape-murni.js');
const H = await import('../../docs/notes/html-aman.js');

let lulus = 0, gagal = 0;
function cek(nama, kondisi, detail = '') {
  if (kondisi) { lulus++; console.log(`  OK   ${nama}`); }
  else { gagal++; console.log(`  GAGAL ${nama}${detail ? ' — ' + detail : ''}`); }
}

/* Dokumen tiruan: setiap blok anak langsung .ed-doc, seperti di editor. */
function dok(html) {
  const d = w.document.createElement('div');
  d.className = 'ed-doc';
  d.innerHTML = html;
  w.document.body.innerHTML = '';
  w.document.body.appendChild(d);
  return d;
}
/* Seleksi teks [awal, akhir) pada text node pertama blok ke-i yang mengandung `cari`. */
function rentang(d, blok, cari, sub) {
  const b = d.children[blok];
  const walker = w.document.createTreeWalker(b, w.NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const i = n.data.indexOf(cari);
    if (i >= 0) {
      const r = w.document.createRange();
      r.setStart(n, i + (sub ? sub[0] : 0));
      r.setEnd(n, i + (sub ? sub[1] : cari.length));
      return r;
    }
  }
  return null;
}

console.log('[1] membungkus seleksi');
{
  const d = dok('<p>Fotosintesis mengubah cahaya menjadi energi kimia.</p>');
  const r = rentang(d, 0, 'mengubah cahaya');
  const hasil = T.bungkusRange(r, d);
  cek('seleksi biasa dibungkus', hasil.ok === true);
  cek('span tape dibuat dengan kelas tape dan tutup', hasil.ok && hasil.span.className === 'tape tutup', hasil.span && hasil.span.className);
  cek('teks dalam span sama dengan seleksi', hasil.ok && hasil.span.textContent === 'mengubah cahaya');
  cek('teks blok utuh setelah dibungkus',
    d.children[0].textContent === 'Fotosintesis mengubah cahaya menjadi energi kimia.', d.children[0].textContent);
  cek('jumlah tape di dokumen = 1', T.hitungTape(d) === 1);
}
{
  const d = dok('<p>Dua <b>kata tebal</b> di sini.</p>');
  const r = rentang(d, 0, 'kata tebal', [0, 10]);
  const hasil = T.bungkusRange(r, d);
  cek('seleksi yang memuat format (tebal) tetap bisa dibungkus', hasil.ok === true);
  cek('format tebal tetap ada di dalam tape', hasil.ok && !!hasil.span.querySelector('b'));
  cek('teks blok utuh setelah bungkus berformat',
    d.children[0].textContent === 'Dua kata tebal di sini.', d.children[0].textContent);
}

{
  const d = dok('<p>Di <span class="hl" id="sorot1">sorot penuh</span> sini.</p>');
  const r = rentang(d, 0, 'sorot', [0, 5]);
  const hasil = T.bungkusRange(r, d);
  cek('seleksi di dalam sorot dibungkus', hasil.ok === true);
  cek('sorot (span.hl) tetap ada di dalam tape', hasil.ok && !!hasil.span.querySelector('span.hl'));
  cek('id tidak tergandakan (hanya satu #sorot1)', d.querySelectorAll('#sorot1').length === 1,
    String(d.querySelectorAll('#sorot1').length));
  cek('teks blok utuh setelah bungkus sorot', d.children[0].textContent === 'Di sorot penuh sini.', d.children[0].textContent);
}
{
  /* seleksi yang melintasi dua format sekaligus: extractContents menjaga kedua format */
  const d = dok('<p>Awal <b>tebal teks</b> akhir</p>');
  const r = w.document.createRange();
  r.setStart(d.children[0].querySelector('b').firstChild, 3);
  r.setEnd(d.children[0].lastChild, 3);
  const hasil = T.bungkusRange(r, d);
  cek('seleksi lintas format dibungkus', hasil.ok === true);
  cek('teks blok utuh setelah bungkus lintas format', d.children[0].textContent === 'Awal tebal teks akhir', d.children[0].textContent);
}

console.log('[2] seleksi yang ditolak');
{
  const d = dok('<p>Satu.</p><p>Dua.</p>');
  const r = w.document.createRange();
  r.setStart(d.children[0].firstChild, 0);
  r.setEnd(d.children[1].firstChild, 3);
  const hasil = T.bungkusRange(r, d);
  cek('seleksi melewati dua blok ditolak (multi-blok)', !hasil.ok && hasil.alasan === 'multi-blok', JSON.stringify(hasil.alasan));
  cek('dua blok: tidak ada tape yang dibuat', T.hitungTape(d) === 0);
}
{
  const d = dok('<p>Kosong.</p>');
  const r = w.document.createRange();
  r.setStart(d.children[0].firstChild, 2);
  r.collapse(true);
  cek('seleksi kosong (kursor saja) ditolak', !T.bungkusRange(r, d).ok && T.bungkusRange(r, d).alasan === 'kosong');
  cek('bungkusRange(null) ditolak tanpa galat', !T.bungkusRange(null, d).ok);
}
{
  const d = dok('<p>Spasi <span> </span> saja.</p>');
  const r = w.document.createRange();
  r.setStart(d.children[0].childNodes[1].firstChild || d.children[0].childNodes[1], 0);
  r.setEnd(d.children[0].childNodes[1], 0);
  cek('seleksi yang hanya spasi ditolak', !T.bungkusRange(r, d).ok);
}
{
  const d = dok('<p>Sebelum <span class="tape tutup">rahasia</span> sesudah</p>');
  const dalam = rentang(d, 0, 'rahasia', [1, 4]);
  cek('seleksi di dalam tape ditolak (tersarang)', !T.bungkusRange(dalam, d).ok && T.bungkusRange(dalam, d).alasan === 'tersarang');
  const luar = rentang(d, 0, 'Sebelum', [0, 7]);
  const memuat = w.document.createRange();
  memuat.setStart(luar.startContainer, 0);
  memuat.setEnd(d.children[0].querySelector('span.tape').firstChild, 3);
  cek('seleksi yang memuat tape ditolak (tersarang)', !T.bungkusRange(memuat, d).ok && T.bungkusRange(memuat, d).alasan === 'tersarang');
  cek('tape asli tetap satu', T.hitungTape(d) === 1);
}

console.log('[3] status per tape dan semua');
{
  const d = dok('<p><span class="tape tutup">a</span> <span class="tape">b</span></p>');
  const [t1, t2] = d.querySelectorAll('span.tape');
  cek('gantiStatus: tutup → buka', T.gantiStatus(t1) === false && !t1.classList.contains('tutup'));
  cek('gantiStatus: buka → tutup', T.gantiStatus(t2) === true && t2.classList.contains('tutup'));
  const buka = T.setSemua(d, true);
  cek('buka semua: jumlah 2, berubah 2', buka.jumlah === 2 && buka.diubah === 1, JSON.stringify(buka));
  cek('setelah buka semua, tidak ada yang tertutup', d.querySelectorAll('span.tape.tutup').length === 0);
  const buka2 = T.setSemua(d, true);
  cek('buka semua lagi: tidak ada yang berubah', buka2.diubah === 0);
  const tutup = T.setSemua(d, false);
  cek('tutup semua: berubah 2', tutup.diubah === 2 && d.querySelectorAll('span.tape.tutup').length === 2, JSON.stringify(tutup));
}

console.log('[4] penyimpanan dan penyaringan HTML');
{
  const d = dok('<p>Teks <span class="tape tutup">rahasia</span> akhir</p>');
  const html = d.children[0].outerHTML;
  const bersih = H.bersihkanHtmlBlok(html);
  cek('penyaringan HTML mempertahankan kelas tape dan tutup', /class="tape tutup"/.test(bersih), bersih);
  cek('penyaringan HTML mempertahankan teks tersembunyi', bersih.includes('rahasia'));
  const baru = dok(bersih);
  cek('HTML yang dibaca lagi memuat satu tape tertutup',
    baru.querySelectorAll('span.tape.tutup').length === 1);
  cek('teks setelah dibaca lagi sama', baru.children[0].textContent === 'Teks rahasia akhir');
}
{
  const d = dok('<p><span class="tape tutup" onclick="x()">a</span><span class="tape" data-x="1">b</span></p>');
  const bersih = H.bersihkanHtmlBlok(d.children[0].outerHTML);
  cek('atribut onclick tetap dibuang', !/onclick/i.test(bersih));
  cek('data-* dan kelas tape tetap ada', /data-x="1"/.test(bersih) && /class="tape"/.test(bersih));
}

console.log('[5] keberadaan kode di editor');
{
  const aks = fs.readFileSync('docs/notes/bar/actions.js', 'utf8');
  cek('aksi tape terdaftar', /tape:\s+tambahTape/.test(aks) && /tapeBuka:/.test(aks) && /tapeTutup:/.test(aks));
  const cfg = fs.readFileSync('docs/notes/bar/config.js', 'utf8');
  cek('tape ada di grup Penandaan', /m: 'tape'/.test(cfg) && /m: 'tapeBuka'/.test(cfg) && /m: 'tapeTutup'/.test(cfg));
  const hlp = fs.readFileSync('docs/notes/bar/help.js', 'utf8');
  cek('bantuan untuk ketiga aksi ada', /\n  tape: \{/.test(hlp) && /\n  tapeBuka: \{/.test(hlp) && /\n  tapeTutup: \{/.test(hlp));
  const css = fs.readFileSync('docs/styles/notes.css', 'utf8');
  cek('CSS tutup menyembunyikan teks dengan warna transparan', /\.tape\.tutup\{color:transparent/.test(css));
  const idx = fs.readFileSync('docs/index.html', 'utf8');
  cek('ikon i-eye dan i-eye-off ada di sprite', /id="i-eye"/.test(idx) && /id="i-eye-off"/.test(idx));
  const en = fs.readFileSync('docs/core/bahasa-en.js', 'utf8');
  cek('terjemahan Inggris tersedia untuk tombol tape', /"Tape \(sembunyikan teks\)": "Tape \(hide text\)"/.test(en));
}

console.log(`\nHasil: ${lulus} LOLOS, ${gagal} GAGAL`);
if (gagal) process.exit(1);
