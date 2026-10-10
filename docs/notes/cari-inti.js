/* Inti pencarian terindeks (Ronde 11 · K12). Murni: tanpa DOM, tanpa state.
   Dijalankan di Web Worker (cari-worker.js) dan juga langsung di thread
   utama sebagai cadangan bila Worker tidak tersedia.

   Entri indeks (ringan, sudah disiapkan thread utama):
     { id, judul, tag: [..], teks, updatedAt }
   `teks` = isi catatan polos, TANPA judul dan tag.

   Dua tahap:
   1. Cocok persis — aturan sama dengan catatanCocok() di cari.js:
      semua syarat operator & kata harus ada.
   2. Jika tahap 1 kosong dan kueri punya kata biasa, cari yang MIRIP:
      tiap kata boleh beda 1 huruf (kata ≥4 huruf) atau 2 huruf (≥8 huruf)
      dari sebuah kata di judul/tag/isi. Operator tag:/judul: tetap persis.

   Urutan: skor relevansi turun, lalu terbaru dulu. */

const norm = s => String(s == null ? '' : s).toLowerCase();
const MAKS_HASIL = 200;

/* kata-kata (huruf/angka) dari sebuah teks, unik */
const kataDari = s => [...new Set(norm(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean))];

/* jarak Levenshtein, berhenti dini bila melewati batas */
export function lev(a, b, batas) {
  if (Math.abs(a.length - b.length) > batas) return batas + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let min = cur[0];
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur.push(v);
      if (v < min) min = v;
    }
    if (min > batas) return batas + 1;
    prev = cur;
  }
  return prev[b.length];
}

export const batasSalah = kata => (kata.length >= 8 ? 2 : kata.length >= 4 ? 1 : 0);

/* Cocok persis — sama dengan catatanCocok(). */
export function cocokPersis(e, k) {
  const tag = e.tag.map(norm);
  if (!k.tag.every(x => tag.some(t => t.includes(norm(x))))) return false;
  const judul = norm(e.judul);
  if (!k.judul.every(x => judul.includes(norm(x)))) return false;
  if (k.kata.length) {
    const teks = `${e.judul || ''} ${tag.join(' ')} ${e.teks || ''}`.toLowerCase();
    if (!k.kata.every(x => teks.includes(norm(x)))) return false;
  }
  return true;
}

/* Skor relevansi untuk catatan yang sudah cocok persis. */
export function skorPersis(e, k) {
  const judul = norm(e.judul);
  const tag = e.tag.map(norm);
  const teks = norm(e.teks);
  const kataJudul = kataDari(judul);
  let s = 0;
  for (const x0 of k.kata) {
    const x = norm(x0);
    if (judul.startsWith(x)) s += 100;
    else if (kataJudul.some(w => w.startsWith(x))) s += 60;
    else if (judul.includes(x)) s += 40;
    if (tag.some(t => t.includes(x))) s += 30;
    let c = 0, i = 0;
    while (c < 5 && (i = teks.indexOf(x, i)) > -1) { c++; i += x.length || 1; }
    s += c * 4;
  }
  for (const x0 of k.judul) { if (judul.includes(norm(x0))) s += 30; }
  for (const x0 of k.tag) { if (tag.some(t => t.includes(norm(x0)))) s += 20; }
  return s;
}

/* Skor kecocokan mirip: tiap kata harus punya kawan dengan jarak ≤ batas. */
export function skorMirip(e, k) {
  if (!k.kata.length) return -1;
  if (!k.tag.every(x => e.tag.some(t => norm(t).includes(norm(x))))) return -1;
  if (!k.judul.every(x => norm(e.judul).includes(norm(x)))) return -1;
  const kata = kataDari(`${e.judul} ${e.tag.join(' ')} ${e.teks}`);
  let s = 0;
  for (const x0 of k.kata) {
    const x = norm(x0);
    const batas = batasSalah(x);
    if (batas === 0) {
      if (!kata.some(w => w.includes(x))) return -1;
      s += 5;
      continue;
    }
    let terbaik = batas + 1;
    for (const w of kata) {
      const d = lev(w, x, batas);
      if (d < terbaik) terbaik = d;
      if (d === 0) break;
    }
    if (terbaik > batas) return -1;
    s += 10 - terbaik * 3;
  }
  return s;
}

/* Hasil pencarian: { ids: [...], mirip: boolean }. */
export function peringkat(indeks, k) {
  const persis = [];
  for (const e of indeks) {
    if (!cocokPersis(e, k)) continue;
    persis.push({ id: e.id, s: skorPersis(e, k), t: e.updatedAt || 0 });
  }
  const urut = (a, b) => b.s - a.s || b.t - a.t;
  if (persis.length || !k.kata.length) {
    persis.sort(urut);
    return { ids: persis.slice(0, MAKS_HASIL).map(x => x.id), mirip: false };
  }
  const mirip = [];
  for (const e of indeks) {
    const s = skorMirip(e, k);
    if (s >= 0) mirip.push({ id: e.id, s, t: e.updatedAt || 0 });
  }
  mirip.sort(urut);
  return { ids: mirip.slice(0, MAKS_HASIL).map(x => x.id), mirip: mirip.length > 0 };
}

/* Penerima pesan Worker. Mengembalikan balasan (objek) untuk dikirim balik. */
let indeksAktif = [];
export function layani(msg) {
  if (msg.jenis === 'indeks') {
    indeksAktif = Array.isArray(msg.indeks) ? msg.indeks : [];
    return { jenis: 'siap', jumlah: indeksAktif.length };
  }
  if (msg.jenis === 'cari') {
    return { jenis: 'hasil', seq: msg.seq, ...peringkat(indeksAktif, msg.k) };
  }
  return { jenis: 'galat', pesan: 'jenis tak dikenal' };
}
