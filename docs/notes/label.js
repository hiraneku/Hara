/* Warna label tag (Bagian B10).

   Satu sumber warna untuk semua tampilan: hash nama tag memilih satu
   dari 11 warna label — tag yang sama selalu berwarna sama, tanpa
   perlu menyimpan apa pun. `n.warna` pada catatan adalah cadangan
   manual (Panel Tag); jika ada, ia menang. */

export const TANDA_TAG = [
  ['slate', '#4A5868'], ['gray', '#6B6B70'], ['merah', '#B34A3C'],
  ['oranye', '#B3662E'], ['kuning', '#97731A'], ['hijau', '#3F6F5B'],
  ['teal', '#2E6E6E'], ['biru', '#2F6E8F'], ['ungu', '#6B5B9E'],
  ['merahmuda', '#A84E6E'], ['coklat', '#7A5B3A'],
];
export const WARNA_TAG = Object.fromEntries(TANDA_TAG);

/* Hash nama tag → index palet (0..10). */
function hashTag(nama) {
  let h = 0;
  for (let i = 0; i < nama.length; i++) h = (h * 31 + nama.charCodeAt(i)) >>> 0;
  return h;
}

/* Tanda warna (nama kunci palet) untuk sebuah tag. */
export function tandaTag(nama) {
  const n = String(nama || '');
  if (!n) return 'hijau';
  return TANDA_TAG[hashTag(n) % TANDA_TAG.length][0];
}

/* Tanda yang dipakai satu catatan untuk tag — ambil dari cache manual
   (n.warna) bila ada, kalau tidak dari hash. */
export function tandaUntukCatatan(n, nama) {
  const w = n && n.warna && typeof n.warna === 'object' ? n.warna[nama] : null;
  if (w && WARNA_TAG[w]) return w;
  return tandaTag(nama);
}

/* Chip #tag berwarna (dipakai baris daftar). */
export function chipTag(tanda, nama) {
  const t = WARNA_TAG[tanda] ? tanda : tandaTag(nama);
  return `<span class="tg-chip label-chip" data-tt="${t}" data-tag="${String(nama).replace(/"/g, '&quot;')}">#${String(nama).replace(/</g, '&lt;')}</span>`;
}


