/* Pemilih lagu berikutnya untuk mode acak (shuffle) dan ulang (repeat).
   Murni: tanpa audio dan tanpa penyimpanan, jadi bisa diuji di Node.

   Acak:
   - acak        : urutan diacak sekali, lalu habis (berhenti; ulang "semua" membungkus)
   - random      : lagu berikutnya dipilih acak setiap kali (tanpa henti)
   - daftarAcak  : urutan diacak ulang setiap kali satu putaran selesai (tanpa henti)
   - pintar      : acak, tetapi menghindari lagu yang baru diputar (tanpa henti)
   - acakUlang   : urutan diacak sekali, lalu diulang dengan urutan yang sama (tanpa henti)

   Ulang:
   - satu        : ulang lagu yang sama (hanya untuk lanjut otomatis; tombol Berikutnya tetap pindah)
   - semua       : di akhir daftar kembali ke awal
   - antrean     : putar antrean dulu, lalu berhenti
   - urut        : putar urut sampai habis, lalu berhenti */

/* Fisher-Yates pada salinan. rnd bisa diganti di tes. */
export function urutkanAcak(ids, rnd = Math.random) {
  const a = ids.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Pilih lagu berikutnya. Mengembalikan { id, dariAntrean, urutan? } atau null (berhenti).
   - manual: true jika pengguna menekan Berikutnya (mengabaikan ulang "satu").
   - urutan: urutan acak yang sedang dipakai (boleh null). Bila berubah, hasil
     membawa `urutan` baru agar pemanggil menyimpannya. */
export function pilihBerikut({
  daftar, idAktif = null, acak = 'mati', ulang = 'urut',
  antrean = [], manual = false, urutan = null, riwayat = [], rnd = Math.random,
}) {
  const n = daftar.length;
  if (n === 0) return null;

  if (!manual && ulang === 'satu' && daftar.includes(idAktif)) {
    return { id: idAktif, dariAntrean: false };
  }
  if (ulang === 'antrean') {
    if (antrean.length) return { id: antrean[0], dariAntrean: true };
    if (!manual) return null;
  }
  const bungkus = manual || ulang === 'semua';

  if (acak === 'mati') {
    const i = daftar.indexOf(idAktif) + 1;
    if (i < n) return { id: daftar[i], dariAntrean: false };
    return bungkus ? { id: daftar[0], dariAntrean: false } : null;
  }

  if (acak === 'random') {
    const kandidat = daftar.filter(id => id !== idAktif);
    const pool = kandidat.length ? kandidat : daftar;
    return { id: pool[Math.floor(rnd() * pool.length)], dariAntrean: false };
  }

  if (acak === 'pintar') {
    /* Hindari separuh daftar (maks. 10) yang baru diputar. */
    const jendela = Math.min(Math.floor(n / 2), 10);
    const baru = new Set(jendela > 0 ? riwayat.slice(-jendela) : []);
    let pool = daftar.filter(id => id !== idAktif && !baru.has(id));
    if (!pool.length) pool = daftar.filter(id => id !== idAktif);
    if (!pool.length) pool = daftar;
    return { id: pool[Math.floor(rnd() * pool.length)], dariAntrean: false };
  }

  /* shuffle, daftarAcak, acakUlang: pakai urutan acak yang tetap selama satu putaran. */
  let ord = urutan && urutan.length === n && daftar.every(id => urutan.includes(id))
    ? urutan : null;
  if (!ord) {
    /* Urutan baru: lagu yang sedang main ditaruh di depan agar tidak ada yang terlewat. */
    ord = urutkanAcak(daftar, rnd);
    if (idAktif && ord.includes(idAktif)) ord = [idAktif, ...ord.filter(x => x !== idAktif)];
  }
  const i = ord.indexOf(idAktif);
  if (i + 1 < ord.length) return { id: ord[i + 1], dariAntrean: false, urutan: ord };
  if (acak === 'daftarAcak') {
    const baru = urutkanAcak(daftar, rnd);
    return { id: baru[0], dariAntrean: false, urutan: baru };
  }
  if (acak === 'acakUlang' || bungkus) return { id: ord[0], dariAntrean: false, urutan: ord };
  return null;
}
