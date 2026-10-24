/**
 * Kunci data catatan terkunci (MB3 · K17).
 *
 * Model:
 *  - Setiap perangkat punya KUNCI DATA acak 256-bit (bukan turunan PIN).
 *  - Kunci data dibungkus (AES-GCM) oleh KUNCI PEMBUNGKUS. Kunci pembungkus
 *    berasal dari autentikator perangkat (WebAuthn PRF, lihat kunci-perangkat.js),
 *    jadi tanpa sidik jari/face perangkat paket ini tidak bisa dibuka.
 *  - Isi catatan terkunci disegel dengan kunci data (AES-GCM, IV 12 byte acak).
 *
 * Modul ini murni WebCrypto: tidak menyentuh DOM, store, atau penyimpanan.
 * Pemanggil yang memutuskan kapan menyegel/membuka dan menyimpan hasilnya.
 */

export const FORMAT_KUNCI = 'AES-GCM-256';
const enc = new TextEncoder();
const dec = new TextDecoder();
const cr = () => globalThis.crypto;

export function kebase64(buf) {
  const u = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return globalThis.btoa(s);
}
export function daribase64(str) {
  const s = globalThis.atob(String(str));
  const u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return u;
}

/** Kunci AES-GCM 256-bit dari 32 byte mentah (dipakai untuk pembungkus & data). */
export async function kunciDariBytes(bytes, { extractable = false } = {}) {
  if (!(bytes instanceof Uint8Array) || bytes.length !== 32) {
    throw new Error('kunci harus 32 byte');
  }
  return cr().subtle.importKey('raw', bytes, { name: 'AES-GCM' }, extractable, ['encrypt', 'decrypt']);
}

/** Kunci data acak baru (32 byte). Mengembalikan bytes mentah. */
export function buatKunciDataBytes() {
  return cr().getRandomValues(new Uint8Array(32));
}

/* ── bungkus / buka kunci data ── */

/** Membungkus bytes kunci data dengan kunci pembungkus (CryptoKey AES-GCM). */
export async function bungkusKunciData(kunciDataBytes, kunciPembungkus) {
  const iv = cr().getRandomValues(new Uint8Array(12));
  const data = await cr().subtle.encrypt({ name: 'AES-GCM', iv }, kunciPembungkus, kunciDataBytes);
  return { v: 1, alg: FORMAT_KUNCI, iv: kebase64(iv), data: kebase64(data) };
}

/** Membuka bungkus. Kunci pembungkus salah atau paket dirusak → error. */
export async function bukaKunciData(paket, kunciPembungkus) {
  if (!paket || paket.v !== 1 || paket.alg !== FORMAT_KUNCI) throw new Error('format kunci tidak dikenal');
  try {
    const plain = await cr().subtle.decrypt(
      { name: 'AES-GCM', iv: daribase64(paket.iv) }, kunciPembungkus, daribase64(paket.data));
    const bytes = new Uint8Array(plain);
    if (bytes.length !== 32) throw new Error('panjang kunci tidak valid');
    return bytes;
  } catch (e) {
    throw new Error('kunci perangkat tidak cocok atau data rusak');
  }
}

/* ── segel / buka isi catatan ── */

/** Menyegel objek (mis. { title, blocks }) dengan kunci data. Mengembalikan paket JSON-able. */
export async function segelCatatan(objek, kunciData) {
  const iv = cr().getRandomValues(new Uint8Array(12));
  const data = await cr().subtle.encrypt({ name: 'AES-GCM', iv }, kunciData, enc.encode(JSON.stringify(objek)));
  return { v: 1, alg: FORMAT_KUNCI, iv: kebase64(iv), data: kebase64(data) };
}

/** Membuka segel catatan. Kunci salah atau data dirusak → error. */
export async function bukaCatatanSegel(paket, kunciData) {
  if (!paket || paket.v !== 1 || paket.alg !== FORMAT_KUNCI) throw new Error('format segel tidak dikenal');
  try {
    const plain = await cr().subtle.decrypt(
      { name: 'AES-GCM', iv: daribase64(paket.iv) }, kunciData, daribase64(paket.data));
    return JSON.parse(dec.decode(plain));
  } catch (e) {
    throw new Error('segel tidak bisa dibuka');
  }
}
