// Membuat keystore PKCS12 yang SELALU sama dari satu rahasia (HARA_SEED).
// Dipakai di GitHub Actions supaya tanda tangan APK tidak berubah antar-build,
// tanpa perlu menyimpan file keystore di mana pun.
// Pemakaian: FORGE_DIR=<folder berisi node_modules/node-forge> HARA_SEED=... node buat-kunci.cjs <keluaran.p12>
'use strict';
const crypto = require('crypto');
const fs = require('fs');
const forge = require(process.env.FORGE_DIR + '/node_modules/node-forge');

const seed = process.env.HARA_SEED;
if (!seed || seed.length < 16) { console.error('HARA_SEED kosong atau terlalu pendek (min 16 karakter)'); process.exit(1); }
const out = process.argv[2];
if (!out) { console.error('Berikan path keluaran .p12'); process.exit(1); }

// Turunan deterministik: SHA-256 dalam mode counter dari seed.
const pass = crypto.createHash('sha256').update('pw:' + seed).digest('hex');
let counter = 0;
const deterministic = {
  getBytesSync(n) {
    let buf = Buffer.alloc(0);
    while (buf.length < n) {
      buf = Buffer.concat([buf, crypto.createHash('sha256').update('key:' + seed + ':' + counter++).digest()]);
    }
    return buf.subarray(0, n).toString('binary');
  }
};

const keys = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001, prng: deterministic });
const cert = forge.pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = '01';
cert.validity.notBefore = new Date('2026-01-01T00:00:00Z');
cert.validity.notAfter = new Date('2076-01-01T00:00:00Z');
const attrs = [{ name: 'commonName', value: 'Hara' }, { name: 'organizationName', value: 'Hara' }, { name: 'countryName', value: 'ID' }];
cert.setSubject(attrs); cert.setIssuer(attrs);
cert.sign(keys.privateKey, forge.md.sha256.create());
const p12 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], pass, { algorithm: '3des', friendlyName: 'hara' });
fs.writeFileSync(out, Buffer.from(forge.asn1.toDer(p12).getBytes(), 'binary'));
// Cetak password agar workflow bisa memakainya (lewat GITHUB_ENV, bukan log).
if (process.env.GITHUB_ENV) fs.appendFileSync(process.env.GITHUB_ENV, `HARA_KS_PASS=${pass}\nHARA_KEY_PASS=${pass}\nHARA_KEY_ALIAS=hara\nHARA_KS_PATH=${out}\n`);
console.log('keystore dibuat:', out);
