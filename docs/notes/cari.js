/* Pencarian yang lebih tajam + riwayat pencarian (ronde 7).

   ── Operator (huruf kecil, menempel ke titik dua) ──
   • tag:nama     → hanya catatan yang punya tag itu (cocok sebagian);
   • judul:kata   → hanya pada judul (alias: title:kata);
   • folder:nama  → hanya catatan di ruang/folder yang namanya cocok (alias: ruang:);
   • properti:nilai atau properti:kunci=nilai (atau kunci:nilai)
                  → cocok di salah satu properti catatan;
   • sebelum:TANGGAL / sesudah:TANGGAL → berdasarkan tanggal ubah terakhir.
                  Format 2026-10-24 atau 24/10/2026. sebelum: = sebelum hari itu;
                  sesudah: = sesudah hari itu (hari itu sendiri tidak ikut);
   • -operator    → kebalikan: -tag:x, -judul:x, -folder:x, -properti:x, -kata
                    (mis. -kecuali, -"frasa"), juga -sebelum:/-sesudah:;
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

import { esc } from '../core/dom.js?v=20261025020026';
import { tagUntukTampil } from './tags.js?v=20261025020026';
import { plainText } from './note-model.js?v=20261025020026';
import { peringkat, cocokPersis, kosongKueri } from './cari-inti.js?v=20261025020026';

const KEY = 'hara.cari.v1';
const MAKS_RIWAYAT = 6;

/* ── pembaca kueri ──
   Satu regex. Grup 1 = '-' (kecuali). Lalu: prefix:"nilai" · prefix:nilai ·
   prefix: (menggantung) · "frasa" · kata. */
const TOKEN = /(-?)(?:([A-Za-z]+):"([^"]*)"|([A-Za-z]+):(\S+)|([A-Za-z]+):|"([^"]*)"|(\S+))/g;

const PREFIX = {
  tag: 'tag', judul: 'judul', title: 'judul',
  folder: 'folder', ruang: 'folder',
  properti: 'properti', property: 'properti', prop: 'properti',
  sebelum: 'sebelum', sesudah: 'sesudah',
};

/* Tanggal "2026-10-24" atau "24/10/2026" → batas ms (awal hari).
   sebelum → t < awal hari itu. sesudah → t ≥ awal hari berikutnya.
   Tanggal tidak valid → null (diperlakukan sebagai teks biasa). */
export function batasTanggal(jenis, teks) {
  const t = String(teks || '').trim();
  let y, mo, d;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else {
    m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t);
    if (!m) return null;
    d = +m[1]; mo = +m[2]; y = +m[3];
  }
  const dasar = new Date(y, mo - 1, d);
  if (dasar.getFullYear() !== y || dasar.getMonth() !== mo - 1 || dasar.getDate() !== d) return null;
  return jenis === 'sebelum' ? dasar.getTime() : new Date(y, mo - 1, d + 1).getTime();
}

/* "kunci=nilai" atau "kunci:nilai" → {k, v}; tanpa pemisah → {k: null, v}. */
function pecahProperti(nil) {
  const sama = nil.indexOf('=');
  const i = sama >= 0 ? sama : nil.indexOf(':');
  if (i > 0) return { k: nil.slice(0, i).trim(), v: nil.slice(i + 1).trim() };
  return { k: null, v: nil.trim() };
}

export function pecahKueri(q) {
  const hasil = kosongKueri();
  const s = String(q == null ? '' : q);
  let m;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(s))) {
    const neg = m[1] === '-';
    const pakai = neg ? hasil.kecuali : hasil;
    const pfx = m[2] !== undefined ? m[2] : m[4] !== undefined ? m[4] : m[6];
    if (pfx !== undefined) {
      const nilMentah = m[2] !== undefined ? m[3] : m[4] !== undefined ? m[5] : '';
      const nil = (nilMentah || '').trim();
      if (!nil) continue;                       /* "tag:" / "judul:\"\"" — diabaikan */
      const jenis = PREFIX[pfx.toLowerCase()];
      if (jenis === 'tag' || jenis === 'judul' || jenis === 'folder') pakai[jenis].push(nil);
      else if (jenis === 'properti') pakai.properti.push(pecahProperti(nil));
      else if (jenis === 'sebelum' || jenis === 'sesudah') {
        const batas = batasTanggal(jenis, nil);
        if (batas === null) pakai.kata.push(`${pfx}:${nil}`);   /* tanggal salah = teks biasa */
        else pakai.tanggal.push({ rel: jenis, batas, teks: `${jenis}:${nil}` });
      } else pakai.kata.push(`${pfx}:${nil}`);                 /* operator tak dikenal = teks biasa */
      continue;
    }
    if (m[7] !== undefined) {                   /* "frasa" */
      const nil = m[7].trim();
      if (nil) pakai.kata.push(nil);
      continue;
    }
    const teks = m[8];
    if (!neg && teks.startsWith('#') && teks.length > 1) hasil.tag.push(teks.slice(1));
    else if (neg && teks.startsWith('#') && teks.length > 1) hasil.kecuali.tag.push(teks.slice(1));
    else if (teks) pakai.kata.push(teks);
  }
  return hasil;
}

export const kueriKosong = k =>
  !k.tag.length && !k.judul.length && !k.kata.length
  && !(k.folder || []).length && !(k.properti || []).length && !(k.tanggal || []).length
  && !Object.values(k.kecuali || {}).some(a => a.length);

/* Label operator untuk chip di layar cari (satu string per operator). */
export function labelOperator(k) {
  const out = [];
  const tambah = (awal, daftar, teksFn) => (daftar || []).forEach(x => out.push(awal + teksFn(x)));
  const satu = (pre, kec) => {
    tambah(pre + 'tag:', kec ? k.kecuali.tag : k.tag, x => x);
    tambah(pre + 'judul:', kec ? k.kecuali.judul : k.judul, x => x);
    tambah(pre + 'folder:', kec ? k.kecuali.folder : k.folder, x => x);
    tambah(pre + 'properti:', kec ? k.kecuali.properti : k.properti, p => (p.k ? p.k + '=' : '') + p.v);
    tambah(pre, kec ? k.kecuali.tanggal : k.tanggal, t => t.teks);
  };
  satu('', false);
  satu('-', true);
  return out;
}

/* Apakah catatan cocok dengan kueri. Semua syarat harus terpenuhi.
   ctx.namaRuang(id) → nama folder (opsional; tanpa itu operator folder: tidak cocok). */
export function catatanCocok(n, k, ctx) {
  if (!n) return false;
  return cocokPersis(entriDariCatatan(n, ctx), k);
}

/* Entri indeks dari sebuah catatan — satu sumber untuk catatanCocok dan Worker. */
export function entriDariCatatan(n, ctx) {
  const namaRuang = ctx && typeof ctx.namaRuang === 'function' ? ctx.namaRuang : null;
  return {
    id: n.id,
    judul: String(n.title || ''),
    tag: tagUntukTampil(n),
    teks: plainText(n),
    updatedAt: n.updatedAt || 0,
    folder: n.folderId && namaRuang ? String(namaRuang(n.folderId) || '') : '',
    props: (n.props || []).map(p => ({ k: String(p.k ?? ''), v: String(p.v ?? '') })),
  };
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

/* ── K12 · pencarian terindeks di Web Worker ──
   Indeks (judul, tag, isi polos) disiapkan di thread utama dan dikirim ke
   Worker hanya bila daftar catatan yang TERLIHAT berubah. Kueri dikirim
   sebagai pesan biasa. Bila Worker tidak tersedia atau gagal, hasil dihitung
   langsung di thread utama dengan kode yang sama (cari-inti.js).
   Hanya catatan yang terlihat yang pernah dikirim (D19). */

let pekerja = null;
let pekerjaGagal = false;
let kunciIndeks = null;
let seqKirim = 0;
const menunggu = new Map();

function ambilPekerja() {
  if (pekerjaGagal) return null;
  if (pekerja) return pekerja;
  if (typeof Worker === 'undefined') { pekerjaGagal = true; return null; }
  try {
    const v = new URL(import.meta.url).search;
    pekerja = new Worker(new URL('./cari-worker.js' + v, import.meta.url), { type: 'module' });
    pekerja.onmessage = e => {
      const p = menunggu.get(e.data && e.data.seq);
      if (!p) return;
      menunggu.delete(e.data.seq);
      if (e.data.jenis === 'hasil') p.resolve(e.data); else p.reject(new Error(e.data.pesan || 'galat'));
    };
    pekerja.onerror = () => matikanPekerja();
  } catch (err) {
    pekerjaGagal = true;
    pekerja = null;
  }
  return pekerja;
}

function matikanPekerja() {
  try { if (pekerja) pekerja.terminate(); } catch (e) {}
  pekerja = null;
  pekerjaGagal = true;
  kunciIndeks = null;
  menunggu.forEach(p => p.reject(new Error('worker mati')));
  menunggu.clear();
}

/* Peringkat untuk daftar catatan (yang sudah disaring terlihat) dan kueri k.
   Mengembalikan Promise<{ ids, mirip }>. */
const entriIndeks = (notes, ctx) => notes.map(n => entriDariCatatan(n, ctx));

export async function cariPeringkat(notes, k, ctx) {
  const w = ambilPekerja();
  if (!w) return peringkat(entriIndeks(notes, ctx), k);
  /* sidik murah: id + waktu ubah + panjang isi (menangkap ubahan yang lupa touch)
     + nama folder (ganti nama ruang harus memperbarui indeks) */
  const kunci = notes.map(n => `${n.id}:${n.updatedAt || 0}:${(n.blocks || []).reduce((a, b) => a + ((b && b.content) || '').length, 0)}:${(n.title || '').length}:${n.folderId && ctx && ctx.namaRuang ? ctx.namaRuang(n.folderId) : ''}`).join('|');
  try {
    if (kunci !== kunciIndeks) {
      w.postMessage({ jenis: 'indeks', indeks: entriIndeks(notes, ctx), seq: ++seqKirim });
      kunciIndeks = kunci;
    }
    const seq = ++seqKirim;
    const balasan = new Promise((resolve, reject) => menunggu.set(seq, { resolve, reject }));
    w.postMessage({ jenis: 'cari', k, seq });
    const hasil = await balasan;
    return { ids: hasil.ids, mirip: hasil.mirip };
  } catch (err) {
    matikanPekerja();
    return peringkat(entriIndeks(notes, ctx), k);
  }
}
