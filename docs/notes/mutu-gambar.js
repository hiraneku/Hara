/* Mutu gambar saat DISISIPKAN (C17) — pilihan di Pengaturan.

   Kenapa perlu: satu foto ponsel bisa 4–6 MB. Di catatan, gambar
   sebesar itu memakan ruang IndexedDB dan memperlambat daftar. Sejak
   awal gambar besar memang dikecilkan (sisi terpanjang 1600 px, JPEG
   82%); sekarang pengguna yang menentukan seberapa hemat — dan bisa
   memilih "Tanpa kompresi" bila ingin berkas asli apa adanya.

   Yang disimpan hanya PILIHAN-nya (localStorage), bukan gambar:
   mengubah mutu tidak menyentuh gambar yang sudah ada di catatan.
   Pilihan berlaku untuk sisipan berikutnya (termasuk tempel dari
   clipboard dan galeri), karena semuanya lewat kecilkan() di image.js.

   `rencanaKecil()` sengaja murni (tanpa DOM) supaya bisa diuji
   tanpa canvas: ia memutuskan skala & mutu dari ukuran gambar. */

const KEY = 'hara.gambar.v1';

export const PILIHAN = [
  { k: 'hemat',    nama: 'Hemat ruang',   sisi: 1280, mutu: 0.72,
    ket: 'Sisi terpanjang 1280 px · mutu 72% — paling hemat' },
  { k: 'seimbang', nama: 'Seimbang',      sisi: 1600, mutu: 0.82,
    ket: 'Sisi terpanjang 1600 px · mutu 82% — bawaan' },
  { k: 'tinggi',   nama: 'Mutu tinggi',   sisi: 2048, mutu: 0.92,
    ket: 'Sisi terpanjang 2048 px · mutu 92% — lebih tajam' },
  { k: 'asli',     nama: 'Tanpa kompresi', sisi: 0,    mutu: 0,
    ket: 'Berkas asli disimpan apa adanya — paling besar' },
];

const BAWAAN = 'seimbang';

let pilihan = BAWAAN;

function muat() {
  try {
    const v = localStorage.getItem(KEY);
    if (PILIHAN.some(o => o.k === v)) pilihan = v;
  } catch (e) { /* biarkan bawaan */ }
}
muat();

export const mutuSekarang = () => pilihan;

export const opsiMutu = () =>
  PILIHAN.find(o => o.k === pilihan) || PILIHAN[1];

/* Ganti pilihan. Mengembalikan true bila berubah & tersimpan. */
export function aturMutu(k) {
  if (!PILIHAN.some(o => o.k === k)) return false;
  pilihan = k;
  try { localStorage.setItem(KEY, k); } catch (e) {}
  return true;
}

/* Keputusan pengecilan untuk satu gambar — tanpa DOM.
   `ubah: false` berarti berkas diteruskan apa adanya (tidak dikecilkan,
   tidak diubah formatnya). GIF selalu apa adanya: mengecilkannya
   menghilangkan animasi. */
export function rencanaKecil({ lebar = 0, tinggi = 0, tipe = '', opsi } = {}) {
  const o = opsi || opsiMutu();
  const apaAdanya = { ubah: false, skala: 1, sisi: 0, mutu: 0 };
  if (!o || !o.sisi) return apaAdanya;
  if (String(tipe || '') === 'image/gif') return apaAdanya;
  if (!/^image\//.test(String(tipe || ''))) return apaAdanya;
  const maks = Math.max(Number(lebar) || 0, Number(tinggi) || 0);
  if (!maks || maks <= o.sisi) return apaAdanya;
  return { ubah: true, skala: o.sisi / maks, sisi: o.sisi, mutu: o.mutu };
}
