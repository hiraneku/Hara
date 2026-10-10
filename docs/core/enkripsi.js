/**
 * Enkripsi nyata (K17) & cadangan terenkripsi frasa sandi (K18).
 *
 * WebCrypto (tersedia di browser dan Android WebView):
 *  - kunci: PBKDF2-SHA256, 310.000 iterasi (rekomendasi OWASP), salt 16 byte acak
 *  - sandi: AES-GCM 256-bit, IV 12 byte acak per enkripsi, tag otentikasi 128-bit
 * Paket hasil berupa objek JSON-able; base64 untuk bytes.
 *
 * Catatan: integrasi ke penyimpanan catatan terkunci (K17) dan UI cadangan (K18)
 * dilakukan di modul pemanggil. Modul ini tidak menyimpan apa pun.
 */

export const ITERASI = 310000;
export const FORMAT_CADANGAN = 'hara-cadangan-terenkripsi';
export const MIN_FRASA = 8;

const enc = new TextEncoder();
const dec = new TextDecoder();
const cr = () => globalThis.crypto;

function kebase64(buf) {
  const u = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return globalThis.btoa(s);
}
function daribase64(str) {
  const s = globalThis.atob(str);
  const u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return u;
}

async function turunkanKunci(sandi, salt, iterasi) {
  const bahan = await cr().subtle.importKey('raw', enc.encode(String(sandi)), 'PBKDF2', false, ['deriveKey']);
  return cr().subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: iterasi, hash: 'SHA-256' },
    bahan,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Enkripsi teks dengan sandi. Mengembalikan paket JSON-able.
 * @param {string} teks
 * @param {string} sandi
 */
export async function enkripsiTeks(teks, sandi) {
  if (!sandi) throw new Error('sandi kosong');
  const salt = cr().getRandomValues(new Uint8Array(16));
  const iv = cr().getRandomValues(new Uint8Array(12));
  const kunci = await turunkanKunci(sandi, salt, ITERASI);
  const data = await cr().subtle.encrypt({ name: 'AES-GCM', iv }, kunci, enc.encode(String(teks)));
  return {
    v: 1,
    alg: 'AES-GCM-256',
    kdf: 'PBKDF2-SHA256',
    iterasi: ITERASI,
    salt: kebase64(salt),
    iv: kebase64(iv),
    data: kebase64(data),
  };
}

/**
 * Dekripsi paket. Sandi salah atau data dirusak → error 'sandi salah atau data rusak'.
 */
export async function dekripsiTeks(paket, sandi) {
  if (!paket || paket.v !== 1 || paket.alg !== 'AES-GCM-256' || paket.kdf !== 'PBKDF2-SHA256') {
    throw new Error('format paket tidak dikenal');
  }
  if (!Number.isInteger(paket.iterasi) || paket.iterasi < 1 || paket.iterasi > 10000000) {
    throw new Error('jumlah iterasi tidak valid');
  }
  try {
    const kunci = await turunkanKunci(sandi, daribase64(paket.salt), paket.iterasi);
    const plain = await cr().subtle.decrypt({ name: 'AES-GCM', iv: daribase64(paket.iv) }, kunci, daribase64(paket.data));
    return dec.decode(plain);
  } catch (e) {
    throw new Error('sandi salah atau data rusak');
  }
}

/* ───────── K18 · cadangan terenkripsi ───────── */

/** Membungkus isi cadangan (string JSON) dengan frasa sandi. Frasa minimal MIN_FRASA karakter. */
export async function buatCadanganTerenkripsi(isiJson, frasa) {
  if (String(frasa || '').length < MIN_FRASA) throw new Error(`frasa sandi minimal ${MIN_FRASA} karakter`);
  const paket = await enkripsiTeks(isiJson, frasa);
  return JSON.stringify({ format: FORMAT_CADANGAN, dibuat: new Date().toISOString(), paket }, null, 2);
}

/** Cek apakah teks adalah cadangan terenkripsi (tanpa membuka). */
export function adalahCadanganTerenkripsi(teks) {
  try {
    const d = JSON.parse(String(teks));
    return !!(d && d.format === FORMAT_CADANGAN && d.paket);
  } catch (e) {
    return false;
  }
}

/** Membuka cadangan terenkripsi. Mengembalikan isi JSON asli (string). */
export async function bukaCadanganTerenkripsi(teks, frasa) {
  let d;
  try { d = JSON.parse(String(teks)); } catch (e) { throw new Error('bukan cadangan Hara yang valid'); }
  if (!d || d.format !== FORMAT_CADANGAN || !d.paket) throw new Error('bukan cadangan terenkripsi Hara');
  return dekripsiTeks(d.paket, frasa);
}
