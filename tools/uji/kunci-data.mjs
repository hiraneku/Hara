/* Uji MB3 · kunci data catatan terkunci (murni, tanpa DOM).
   Autentikator PRF disimulasikan: output PRF = SHA-256(rahasia-perangkat || salt).
   Autentikator asli TIDAK diuji di sini (perlu perangkat).

   Jalan: node tools/uji/kunci-data.mjs */
import { kunciDariBytes, buatKunciDataBytes, bungkusKunciData, bukaKunciData,
  segelCatatan, bukaCatatanSegel, kebase64, daribase64 } from '../../docs/core/kunci-data.js';
import { daftarPembungkus, bukaPembungkus, sidikTersedia, b64url, dariB64url } from '../../docs/core/kunci-perangkat.js';

let ok = 0, gagal = 0;
const cek = (nama, kondisi, detail = '') => {
  if (kondisi) { ok++; console.log('ok  ', nama); }
  else { gagal++; console.log('FAIL', nama, detail ? '\n      ' + detail : ''); }
};
const galat = async p => { try { await p; return null; } catch (e) { return e.message; } };

const RAHASIA_PERANGKAT = Uint8Array.from({ length: 32 }, (_, i) => (i * 7 + 3) & 255);
const sha = async bytes => new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes));
const gabung = (a, b) => { const o = new Uint8Array(a.length + b.length); o.set(a); o.set(b, a.length); return o; };

/* Autentikator tiruan: create menyimpan salt, get memakai salt itu. */
function autentikatorTiruan({ prfAktif = true, prfSaatGet = true } = {}) {
  const tersimpan = new Map();
  return {
    lastCreate: null, lastGet: null,
    async create(opsi) {
      this.lastCreate = opsi;
      const rawId = Uint8Array.from({ length: 16 }, (_, i) => 100 + i);
      const salt = opsi.publicKey.extensions.prf.eval.first;
      tersimpan.set(b64url(rawId), salt);
      return { rawId: rawId.buffer, getClientExtensionResults: () => (prfAktif ? { prf: { enabled: true } } : {}) };
    },
    async get(opsi) {
      this.lastGet = opsi;
      const id = b64url(opsi.publicKey.allowCredentials[0].id);
      const salt = opsi.publicKey.extensions.prf.eval.first;
      const out = await sha(gabung(RAHASIA_PERANGKAT, new Uint8Array(salt)));
      return { getClientExtensionResults: () => (prfSaatGet ? { prf: { results: { first: out.buffer } } } : {}) };
    },
  };
}

console.log('── A. kunci pembungkus dari PRF (simulasi) ──');
const kred = autentikatorTiruan();
const daftar = await daftarPembungkus('perangkat-1', { kredensial: kred });
cek('A1 pendaftaran mengembalikan credId dan salt', !!daftar && daftar.credId && daftar.salt, JSON.stringify(daftar));
cek('A2 create memakai verifikasi pengguna wajib & platform',
  kred.lastCreate.publicKey.authenticatorSelection.userVerification === 'required' &&
  kred.lastCreate.publicKey.authenticatorSelection.authenticatorAttachment === 'platform');
cek('A3 salt PRF 32 byte dikirim saat create', dariB64url(daftar.salt).length === 32);
const pembungkus1 = await bukaPembungkus(daftar, { kredensial: kred });
cek('A4 get memakai allowCredentials = credId', b64url(kred.lastGet.publicKey.allowCredentials[0].id) === daftar.credId);
const pembungkus1b = await bukaPembungkus(daftar, { kredensial: kred });
const kunciDataUji = buatKunciDataBytes();
const paketKunci = await bungkusKunciData(kunciDataUji, pembungkus1);
const kembali = await bukaKunciData(paketKunci, pembungkus1b);
cek('A5 bungkus → buka (kunci pembungkus sama dari PRF) → kunci data utuh',
  kembali.length === 32 && kembali.every((b, i) => b === kunciDataUji[i]));
cek('A6 paket kunci tidak memuat kunci data mentah',
  !JSON.stringify(paketKunci).includes(kebase64(kunciDataUji)));

const salt2 = b64url(new Uint8Array(32).fill(9));
const pembungkus2 = await bukaPembungkus({ credId: daftar.credId, salt: salt2 }, { kredensial: kred });
cek('A7 salt berbeda → kunci pembungkus berbeda (tidak bisa dipakai silang)',
  (await galat(bukaKunciData(paketKunci, pembungkus2))) !== null);

console.log('── B. galat & jalur tidak didukung ──');
cek('B1 PRF tidak aktif saat daftar → null (jangan pakai jalur PIN diam-diam)',
  (await daftarPembungkus('x', { kredensial: autentikatorTiruan({ prfAktif: false }) })) === null);
cek('B2 PRF tidak keluar saat buka → galat jelas',
  (await galat(bukaPembungkus(daftar, { kredensial: autentikatorTiruan({ prfSaatGet: false }) }))) === 'autentikator tidak mengembalikan PRF');
cek('B3 sidikTersedia false tanpa PublicKeyCredential', sidikTersedia({ navigator: {} }) === false);
cek('B4 sidikTersedia true bila API tersedia', sidikTersedia({ PublicKeyCredential: function () {}, navigator: { credentials: {} } }) === true);
cek('B5 kunci pembungkus bukan 32 byte ditolak', (await galat(kunciDariBytes(new Uint8Array(16)))) !== null);
const galatRusak = await galat(bukaKunciData({ ...paketKunci, data: paketKunci.data.slice(0, -4) + 'AAAA' }, pembungkus1b));
cek('B6 paket kunci dirusak → galat, bukan kunci sampah', galatRusak === 'kunci perangkat tidak cocok atau data rusak', galatRusak);
cek('B7 format paket asing ditolak', (await galat(bukaKunciData({ v: 2 }, pembungkus1b))) === 'format kunci tidak dikenal');

console.log('── C. segel isi catatan ──');
const kunciData = await kunciDariBytes(kunciDataUji);
const catatan = { title: 'Rahasia — café 🍵', blocks: [{ type: 'paragraph', content: '<b>isi</b> sangat privat' }] };
const segel = await segelCatatan(catatan, kunciData);
const dibuka = await bukaCatatanSegel(segel, kunciData);
cek('C1 segel → buka = objek asli (unicode & HTML utuh)', JSON.stringify(dibuka) === JSON.stringify(catatan));
cek('C2 teks asli tidak tampak di paket', !JSON.stringify(segel).includes('privat') && !JSON.stringify(segel).includes('Rahasia'));
const segel2 = await segelCatatan(catatan, kunciData);
cek('C3 dua segel objek sama berbeda (IV acak)', segel2.iv !== segel.iv && segel2.data !== segel.data);
const kunciLain = await kunciDariBytes(buatKunciDataBytes());
cek('C4 kunci lain tidak bisa membuka segel', (await galat(bukaCatatanSegel(segel, kunciLain))) === 'segel tidak bisa dibuka');
const segelRusak = { ...segel, data: segel.data.slice(0, 10) + (segel.data[10] === 'A' ? 'B' : 'A') + segel.data.slice(11) };
cek('C5 segel dirusak satu karakter → ditolak (GCM)', (await galat(bukaCatatanSegel(segelRusak, kunciData))) !== null);
cek('C6 base64 bolak-balik utuh', kebase64(daribase64(segel.iv)) === segel.iv);

console.log(`\nHasil: ${ok}/${ok + gagal} lolos`);
process.exit(gagal ? 1 : 0);
