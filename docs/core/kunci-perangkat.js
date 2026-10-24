/**
 * Kunci pembungkus dari sidik jari / face perangkat (MB3 · K17).
 *
 * WebAuthn dengan ekstensi PRF: autentikator platform menghasilkan secret
 * deterministik untuk "salt" tertentu. Secret itu (32 byte) dipakai sebagai
 * kunci pembungkus kunci data (lihat kunci-data.js). Sistem perangkat yang
 * memverifikasi sidik jari; aplikasi tidak pernah melihat sidik jarinya.
 *
 * Catatan jujur:
 *  - Tidak semua autentikator/peramban mendukung PRF. Bila tidak didukung,
 *    `daftarPembungkus` mengembalikan null dan pemanggil TIDAK boleh memakai
 *    jalur lemah (PIN) untuk melindungi kunci data.
 *  - Modul ini tidak bisa diuji dengan autentikator asli di sandbox. Yang
 *    diuji: bentuk permintaan dan penanganan hasil/galat, dengan `kredensial`
 *    tiruan yang diinjeksi.
 */

import { kunciDariBytes } from './kunci-data.js?v=20261024163000';

const RP = { name: 'Hara' };

const acakBytes = n => {
  const b = new Uint8Array(n);
  globalThis.crypto.getRandomValues(b);
  return b;
};

/** Apakah lingkungan ini bisa memakai WebAuthn platform (sebelum cek PRF). */
export function sidikTersedia(win = globalThis) {
  return !!(win.PublicKeyCredential && win.navigator && win.navigator.credentials);
}

/**
 * Mendaftarkan autentikator baru dan memastikan PRF aktif.
 * Mengembalikan { credId (base64url), salt (base64url) } bila berhasil, atau null.
 * @param {string} userId  pengenal stabil (mis. id perangkat), dipakai sebagai user.id
 * @param {{ kredensial?: CredentialsContainer }} [opsi]
 */
export async function daftarPembungkus(userId, { kredensial } = {}) {
  const k = kredensial || (globalThis.navigator && globalThis.navigator.credentials);
  if (!k) return null;
  const salt = acakBytes(32);
  const cred = await k.create({
    publicKey: {
      challenge: acakBytes(32),
      rp: RP,
      user: {
        id: new TextEncoder().encode('hara-' + String(userId)),
        name: 'hara-kunci-data',
        displayName: 'Hara · kunci catatan',
      },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'discouraged',
      },
      extensions: { prf: { eval: { first: salt } } },
      timeout: 90000,
    },
  });
  if (!cred || !cred.rawId) return null;
  const ext = typeof cred.getClientExtensionResults === 'function' ? cred.getClientExtensionResults() : {};
  /* Sebagian peramban baru mengembalikan hasil PRF saat pendaftaran; yang lain tidak.
     Tanpa dukungan PRF, kunci tidak bisa diturunkan → null. */
  if (!ext || !ext.prf) return null;
  return { credId: b64url(cred.rawId), salt: b64url(salt), prfSaatDaftar: !!ext.prf.results?.first };
}

/**
 * Menurunkan kunci pembungkus (CryptoKey AES-GCM) dari autentikator yang sudah terdaftar.
 * Pengguna diminta verifikasi (sidik jari/face) oleh sistem perangkat.
 * @returns {Promise<CryptoKey>} melempar error bila PRF tidak tersedia atau dibatalkan
 */
export async function bukaPembungkus({ credId, salt }, { kredensial } = {}) {
  const k = kredensial || (globalThis.navigator && globalThis.navigator.credentials);
  if (!k) throw new Error('WebAuthn tidak tersedia');
  const cred = await k.get({
    publicKey: {
      challenge: acakBytes(32),
      allowCredentials: [{ type: 'public-key', id: dariB64url(credId) }],
      userVerification: 'required',
      extensions: { prf: { eval: { first: dariB64url(salt) } } },
      timeout: 90000,
    },
  });
  const ext = cred && typeof cred.getClientExtensionResults === 'function' ? cred.getClientExtensionResults() : null;
  const first = ext && ext.prf && ext.prf.results && ext.prf.results.first;
  if (!first) throw new Error('autentikator tidak mengembalikan PRF');
  const bytes = new Uint8Array(first);
  if (bytes.length !== 32) throw new Error('panjang PRF tidak valid');
  return kunciDariBytes(bytes);
}

export function b64url(buf) {
  const u = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return globalThis.btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function dariB64url(str) {
  const s = globalThis.atob(String(str).replace(/-/g, '+').replace(/_/g, '/'));
  const u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return u;
}
