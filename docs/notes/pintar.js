/* Fitur pintar yang berjalan SEPENUHNYA di perangkat (tanpa cloud, tanpa AI generatif).

   Semua fungsi di sini MURNI: menerima data sederhana, mengembalikan hasil.
   Tidak menyentuh DOM, state, atau penyimpanan — jadi bisa diuji langsung di Node
   (lihat tools/uji/pintar.mjs). Pemanggil (app.js lewat palette) yang bertugas
   mengambil teks catatan dan memastikan catatan terkunci TIDAK ikut dipakai.

   Metode: TF-IDF + kosinus (catatan serupa, saran tag) dan peringkat kalimat
   berbasis frekuensi (ringkasan ekstraktif). Ini bukan generasi teks: hasilnya
   selalu kalimat yang sudah ada di catatan, jadi bisa diprediksi. */

/* Kata umum Indonesia & Inggris yang tidak membawa makna topik. */
const STOP = new Set((
  'yang dan atau di ke dari untuk dengan pada ini itu itu adalah akan sudah ' +
  'belum tidak bisa bukan juga saja serta karena jika kalau maka lalu tetapi ' +
  'tapi oleh sebagai dalam saya kamu kami kita mereka dia ia nya aku kau ' +
  'ada tiap setiap para bagi hanya masih lebih sangat sekali pun tersebut ' +
  'the and for with that this from are was were have has not you your our ' +
  'but can will would should into about also just more some any all one'
).split(/\s+/));

/* Token: kata huruf (termasuk aksen), panjang ≥ 3, bukan kata umum, bukan angka murni. */
export function tokenkan(teks) {
  const out = [];
  const re = /[\p{L}][\p{L}\p{N}_-]{2,}/gu;
  const low = String(teks || '').toLowerCase();
  let m;
  while ((m = re.exec(low))) {
    const kata = m[0].replace(/^-+|-+$/g, '');
    if (kata.length < 3 || STOP.has(kata)) continue;
    out.push(kata);
  }
  return out;
}

/* Vektor TF-IDF ter-normalisasi (panjang 1) untuk satu dokumen. */
function vektor(tokens, idf) {
  const tf = new Map();
  tokens.forEach(t => tf.set(t, (tf.get(t) || 0) + 1));
  const v = new Map();
  let norm = 0;
  for (const [t, c] of tf) {
    const w = (1 + Math.log(c)) * (idf.get(t) || 0);
    if (w > 0) { v.set(t, w); norm += w * w; }
  }
  norm = Math.sqrt(norm) || 1;
  for (const [t, w] of v) v.set(t, w / norm);
  return v;
}

/* Indeks dari sekumpulan dokumen { id, teks }. */
export function bangunIndeks(dokumen) {
  const N = dokumen.length;
  const df = new Map();
  const tokPer = new Map();
  dokumen.forEach(d => {
    const toks = tokenkan(d.teks);
    tokPer.set(d.id, toks);
    new Set(toks).forEach(t => df.set(t, (df.get(t) || 0) + 1));
  });
  const idf = new Map();
  for (const [t, c] of df) idf.set(t, Math.log((1 + N) / (1 + c)) + 1);
  const vek = new Map();
  dokumen.forEach(d => vek.set(d.id, vektor(tokPer.get(d.id), idf)));
  return { idf, vek, tokPer };
}

function kosinus(a, b) {
  let s = 0;
  const [kecil, besar] = a.size <= b.size ? [a, b] : [b, a];
  for (const [t, w] of kecil) { const x = besar.get(t); if (x) s += w * x; }
  return s;
}

/* Catatan serupa dengan `id`. `dokumen` harus sudah disaring (tanpa catatan
   terkunci, diarsip, atau dihapus) oleh pemanggil.
   Mengembalikan [{ id, skor, bersama: [kata...] }] diurutkan dari yang paling mirip. */
export function catatanSerupa(id, dokumen, { maks = 5, ambang = 0.08 } = {}) {
  const sumber = dokumen.find(d => d.id === id);
  if (!sumber) return [];
  const { vek, tokPer } = bangunIndeks(dokumen);
  const v0 = vek.get(id);
  const hasil = [];
  for (const d of dokumen) {
    if (d.id === id) continue;
    const v1 = vek.get(d.id);
    const skor = kosinus(v0, v1);
    if (skor < ambang) continue;
    const milikDia = new Set(tokPer.get(d.id));
    const bersama = [...v0.keys()]
      .filter(t => v1.has(t) && milikDia.has(t))
      .sort((a, b) => (v0.get(b) * v1.get(b)) - (v0.get(a) * v1.get(a)))
      .slice(0, 3);
    hasil.push({ id: d.id, skor: Math.round(skor * 100) / 100, bersama });
  }
  return hasil.sort((a, b) => b.skor - a.skor).slice(0, maks);
}

/* Saran tag: kata kunci paling khas untuk catatan ini dibanding catatan lain.
   `tagLama` = tag yang sudah dipakai (dibandingkan tanpa huruf besar/kecil).
   Mengembalikan daftar nama tag TANPA tanda '#'. */
export function saranTag(teks, dokumenLain, { tagLama = [], maks = 3 } = {}) {
  const lama = new Set(tagLama.map(t => String(t).toLowerCase().replace(/^#/, '')));
  const { idf } = bangunIndeks(dokumenLain.concat([{ id: '__ini__', teks }]));
  const toks = tokenkan(teks);
  if (!toks.length) return [];
  const freq = new Map();
  toks.forEach(t => freq.set(t, (freq.get(t) || 0) + 1));
  const skor = [];
  for (const [t, c] of freq) {
    if (lama.has(t)) continue;
    /* kata yang hanya muncul sekali di catatan ini tidak cukup khas untuk dijadikan tag */
    if (c < 2 && toks.length > 40) continue;
    skor.push([t, c * (idf.get(t) || 0)]);
  }
  return skor.sort((a, b) => b[1] - a[1]).slice(0, maks).map(x => x[0]);
}

/* Ringkasan ekstraktif: pilih `kalimat` kalimat terpenting dari teks, urut sesuai aslinya.
   Skor kalimat = rata-rata frekuensi kata di seluruh teks (kata yang sering muncul
   menandakan topik), dengan bonus kecil untuk kalimat pembuka. */
export function ringkasan(teks, { kalimat = 3 } = {}) {
  const bersih = String(teks || '').replace(/\s+/g, ' ').trim();
  if (!bersih) return '';
  const kal = bersih.split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(Boolean);
  if (kal.length <= kalimat) return kal.join(' ');
  const freq = new Map();
  tokenkan(bersih).forEach(t => freq.set(t, (freq.get(t) || 0) + 1));
  const nilai = kal.map((s, i) => {
    const toks = tokenkan(s);
    const rata = toks.length
      ? toks.reduce((a, t) => a + (freq.get(t) || 0), 0) / toks.length : 0;
    return { i, s, skor: rata * (i === 0 ? 1.2 : 1) };
  });
  const pilih = nilai.slice().sort((a, b) => b.skor - a.skor).slice(0, kalimat);
  return pilih.sort((a, b) => a.i - b.i).map(x => x.s).join(' ');
}

/* Tinjauan mingguan. `catatan`: [{ id, title, createdAt, updatedAt, tags, todoSelesai }].
   `todoSelesai` = to-do yang DISELESAIKAN dalam jendela (pemanggil menghitung
   dari meta.done). Jendela: `hari` hari terakhir sampai `sekarang` (ms). Isi
   catatan tidak dibaca di sini, jadi catatan terkunci aman selama pemanggil
   tidak memasukkannya. */
export function tinjauanMingguan(catatan, sekarang, { hari = 7 } = {}) {
  const batas = sekarang - hari * 86400000;
  const dalam = t => typeof t === 'number' && t >= batas && t <= sekarang;
  const dibuat = catatan.filter(n => dalam(n.createdAt));
  const diedit = catatan.filter(n => dalam(n.updatedAt) && !dalam(n.createdAt));
  const tagCount = new Map();
  catatan.filter(n => dalam(n.updatedAt)).forEach(n =>
    (n.tags || []).forEach(t => tagCount.set(t, (tagCount.get(t) || 0) + 1)));
  const tagTeratas = [...tagCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const tugasSelesai = catatan.reduce((a, n) => a + (n.todoSelesai || 0), 0);
  const terbaru = catatan.filter(n => dalam(n.updatedAt))
    .sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5)
    .map(n => ({ id: n.id, title: n.title || '' }));
  return {
    dari: batas, sampai: sekarang,
    dibuat: dibuat.length, diedit: diedit.length,
    tugasSelesai, tagTeratas, terbaru,
  };
}
