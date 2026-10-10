/* Variabel templat (Ronde 11 · K16). Murni: tanpa DOM, tanpa state.

   Sintaks: {nama} di judul atau isi templat. Nama tanpa spasi di tepi,
   huruf besar/kecil tidak dibedakan, boleh berisi huruf, angka, spasi,
   garis bawah, dan tanda hubung (maks. 31 karakter).

   Variabel BAWAAN diisi otomatis saat catatan dibuat:
     {tanggal}  tanggal panjang sesuai bahasa aktif
     {hari}     nama hari          {bulan} nama bulan     {tahun} tahun
     {judul}    judul catatan yang dibuat (hasil setelah judul diisi)

   Selain itu adalah ISIAN: pengguna diminta mengisinya saat templat
   dipakai. Kurung kurawal yang tidak dikenali TETAP apa adanya bila
   tidak diisi — tidak ada data yang hilang diam-diam.

   Nilai di isi HTML di-escape; judul adalah teks biasa. Penggantian
   satu lintasan, jadi nilai yang kebetulan berisi {…} tidak diganti lagi. */

export const BAWAAN_VAR = ['tanggal', 'hari', 'bulan', 'tahun', 'judul'];

const POLA = /\{\s*([\p{L}][\p{L}\p{N} _-]{0,30}?)\s*\}/gu;

const normNama = s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

/* Daftar nama variabel yang muncul, unik, urut kemunculan. */
export function variabelDalam(teks) {
  const hasil = [];
  const s = String(teks == null ? '' : teks);
  let m;
  POLA.lastIndex = 0;
  while ((m = POLA.exec(s))) {
    const n = normNama(m[1]);
    if (!hasil.includes(n)) hasil.push(n);
  }
  return hasil;
}

/* Hanya nama ISIAN (bukan bawaan), untuk ditanyakan ke pengguna. */
export function isianDiperlukan(...teks) {
  const semua = [];
  teks.forEach(t => variabelDalam(t).forEach(n => { if (!semua.includes(n) && !BAWAAN_VAR.includes(n)) semua.push(n); }));
  return semua;
}

/* Ganti {nama} dengan nilai[nama]. Nama yang tidak ada di `nilai` dibiarkan.
   `escape` (opsional) diterapkan pada nilai — pakai untuk HTML. */
export function gantiVariabel(teks, nilai, escape) {
  const s = String(teks == null ? '' : teks);
  const peta = {};
  Object.keys(nilai || {}).forEach(k => { peta[normNama(k)] = nilai[k]; });
  return s.replace(POLA, (asli, nama) => {
    const k = normNama(nama);
    if (!Object.prototype.hasOwnProperty.call(peta, k)) return asli;
    const v = peta[k] == null ? '' : String(peta[k]);
    return escape ? escape(v) : v;
  });
}
