/* Pencarian yang lebih tajam + riwayat pencarian (ronde 7).

   ── Operator (huruf kecil, menempel ke titik dua) ──
   • tag:nama     → hanya catatan yang punya tag itu (cocok sebagian);
   • judul:kata   → hanya pada judul (alias: title:kata);
   • #nama        → jalan pintas lama untuk tag:nama;
   • "dua kata"   → frasa utuh (boleh sebagai nilai operator);
   • sisanya      → kata biasa: SEMUA kata harus cocok di judul, isi,
                    atau tag (perilaku lama tidak berubah).

   Nilai operator yang dikutip boleh mengandung spasi: judul:"resep kue".

   ── Riwayat pencarian ──
   Disimpan di localStorage (`hara.cari.v1`), BUKAN di data catatan:
   menghapus semua catatan tidak menghapus riwayat, dan riwayat tidak
   ikut ke cadangan JSON. Maksimal 6, terbaru di depan, tanpa duplikat,
   tanpa kueri kosong.

   ── Sorot hasil ──
   `sorotHtml()` menyisipkan <mark class="cari-hl"> pada kata yang cocok.
   Bekerja pada teks MENTAH lalu meng-escape tiap potongan — jadi teks
   catatan yang berisi < > & tidak pernah bisa menyuntik HTML, dan
   sorotan tidak pernah salah tempat karena entitas (&amp;) dihitung
   sebagai teks biasa. */

import { esc } from '../core/dom.js?v=20260921045615';
import { tagUntukTampil } from './tags.js?v=20260921045615';
import { plainText } from './note-model.js?v=20260921045615';

const KEY = 'hara.cari.v1';
const MAKS_RIWAYAT = 6;

/* ── pembaca kueri ──
   Satu regex, empat bentuk: prefix:"nilai berkutip" · prefix:nilai ·
   "frasa" · kata. */
const TOKEN = /([A-Za-z]+):"([^"]*)"|([A-Za-z]+):(\S+)|([A-Za-z]+):|"([^"]*)"|(\S+)/g;

export function pecahKueri(q) {
  const hasil = { tag: [], judul: [], kata: [] };
  const s = String(q == null ? '' : q);
  let m;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(s))) {
    if (m[1] !== undefined) {
      const nil = (m[2] || '').trim();
      if (!nil) continue;
      const kunci = m[1].toLowerCase();
      if (kunci === 'tag') hasil.tag.push(nil);
      else if (kunci === 'judul' || kunci === 'title') hasil.judul.push(nil);
      else hasil.kata.push(`${m[1]}:${nil}`);      /* operator tak dikenal = teks biasa */
    } else if (m[3] !== undefined) {
      const kunci = m[3].toLowerCase();
      const nil = m[4];
      if (kunci === 'tag') hasil.tag.push(nil);
      else if (kunci === 'judul' || kunci === 'title') hasil.judul.push(nil);
      else hasil.kata.push(`${m[3]}:${nil}`);
    } else if (m[5] !== undefined) {
      /* operator menggantung ("tag:" / "judul:") — diabaikan, bukan
         dianggap kata biasa: pengguna yang baru mengetik titik dua
         belum punya maksud pencarian apa pun */
    } else if (m[6] !== undefined) {
      const nil = m[6].trim();
      if (nil) hasil.kata.push(nil);
    } else if (m[7] !== undefined) {
      const nil = m[7];
      if (nil.startsWith('#') && nil.length > 1) hasil.tag.push(nil.slice(1));
      else hasil.kata.push(nil);
    }
  }
  return hasil;
}

export const kueriKosong = k =>
  !k.tag.length && !k.judul.length && !k.kata.length;

/* Apakah catatan cocok dengan kueri. Semua syarat harus terpenuhi. */
export function catatanCocok(n, k) {
  if (!n) return false;
  const tag = tagUntukTampil(n).map(t => t.toLowerCase());
  if (!k.tag.every(x => tag.some(t => t.includes(x.toLowerCase())))) return false;

  const judul = String(n.title || '').toLowerCase();
  if (!k.judul.every(x => judul.includes(x.toLowerCase()))) return false;

  if (k.kata.length) {
    const teks = `${n.title || ''} ${tag.join(' ')} ${plainText(n)}`.toLowerCase();
    if (!k.kata.every(x => teks.includes(x.toLowerCase()))) return false;
  }
  return true;
}

/* Kata yang layak disorot di judul/cuplikan: kata biasa + nilai operator
   judul. Nilai tag tidak disorot di teks (tag tampil sebagai chip). */
export const kataSorot = k => [...k.kata, ...k.judul].filter(Boolean);

/* Teks → HTML aman dengan <mark> pada setiap kata yang cocok. */
export function sorotHtml(teks, kata) {
  const t = String(teks == null ? '' : teks);
  const daftar = typeof kata === 'string' ? [kata] : (kata || []);
  const kt = daftar.map(x => String(x).toLowerCase()).filter(Boolean);
  if (!t || !kt.length) return esc(t);

  const bawah = t.toLowerCase();
  const rentang = [];
  kt.forEach(k => {
    let i = 0;
    while ((i = bawah.indexOf(k, i)) > -1) {
      rentang.push([i, i + k.length]);
      i += k.length;
    }
  });
  if (!rentang.length) return esc(t);

  /* urutkan lalu gabungkan rentang yang bertumpuk/bersambung supaya
     tidak ada <mark> bersarang */
  rentang.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const gab = [];
  rentang.forEach(([a, b]) => {
    const akhir = gab[gab.length - 1];
    if (akhir && a <= akhir[1]) akhir[1] = Math.max(akhir[1], b);
    else gab.push([a, b]);
  });

  let out = '';
  let pos = 0;
  gab.forEach(([a, b]) => {
    out += esc(t.slice(pos, a)) + '<mark class="cari-hl">' + esc(t.slice(a, b)) + '</mark>';
    pos = b;
  });
  return out + esc(t.slice(pos));
}

/* ── riwayat pencarian ── */
export function riwayatCari() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const d = JSON.parse(raw);
    return Array.isArray(d) ? d.filter(x => typeof x === 'string' && x.trim()).slice(0, MAKS_RIWAYAT) : [];
  } catch (e) { return []; }
}

function simpanDaftar(daftar) {
  try { localStorage.setItem(KEY, JSON.stringify(daftar.slice(0, MAKS_RIWAYAT))); } catch (e) {}
}

/* Catat satu kueri (dipanggil saat Enter / berpindah dari kolom cari).
   Mengembalikan true bila riwayat berubah. */
export function simpanRiwayat(q) {
  const t = String(q == null ? '' : q).trim();
  if (!t) return false;
  if (kueriKosong(pecahKueri(t))) return false;
  const lama = riwayatCari();
  if (lama[0] === t && lama.length === 1) return false;
  simpanDaftar([t, ...lama.filter(x => x !== t)]);
  return true;
}

export function hapusRiwayat() {
  try { localStorage.removeItem(KEY); } catch (e) {}
}
