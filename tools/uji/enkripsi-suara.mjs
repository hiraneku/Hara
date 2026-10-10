/* Uji Ronde 12 · K17 enkripsi nyata, K18 cadangan terenkripsi, K15 baca keras & dikte.
   Jalankan: node tools/uji/enkripsi-suara.mjs */
import path from 'path';
import { fileURLToPath } from 'url';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const V = '20261010050549';
const en = await import(`${process.cwd()}/docs/core/enkripsi.js?v=${V}`);
const su = await import(`${process.cwd()}/docs/core/suara.js?v=${V}`);

let no = 0, gagal = 0;
const cek = (nama, k, d = '') => { no++; if (k) console.log(`  ✓ ${nama}`); else { gagal++; console.log(`  ✗ ${nama} ${d}`); } };

console.log('K17 · enkripsi AES-GCM + PBKDF2');
{
  const teks = 'Rahasia: saldo 1.250.000 — catatan pribadi ✓';
  const paket = await en.enkripsiTeks(teks, 'sandi-kuat-123');
  cek('paket memuat parameter lengkap', paket.v === 1 && paket.alg === 'AES-GCM-256' && paket.kdf === 'PBKDF2-SHA256' && paket.iterasi === en.ITERASI);
  cek('teks asli tidak tampak di paket', !JSON.stringify(paket).includes('Rahasia'));
  cek('dekripsi dengan sandi benar', (await en.dekripsiTeks(paket, 'sandi-kuat-123')) === teks);
  let galat = null;
  try { await en.dekripsiTeks(paket, 'salah'); } catch (e) { galat = e.message; }
  cek('sandi salah ditolak', galat === 'sandi salah atau data rusak', galat);
  const dua = await en.enkripsiTeks(teks, 'sandi-kuat-123');
  cek('IV & salt acak: dua enkripsi berbeda', dua.iv !== paket.iv && dua.salt !== paket.salt && dua.data !== paket.data);
  const rusak = { ...paket, data: paket.data.slice(0, -4) + 'AAAA' };
  galat = null;
  try { await en.dekripsiTeks(rusak, 'sandi-kuat-123'); } catch (e) { galat = e.message; }
  cek('data yang diubah terdeteksi (GCM)', galat === 'sandi salah atau data rusak');
  galat = null;
  try { await en.dekripsiTeks({ ...paket, iterasi: 0 }, 'sandi-kuat-123'); } catch (e) { galat = e.message; }
  cek('iterasi tidak valid ditolak', galat === 'jumlah iterasi tidak valid');
  galat = null;
  try { await en.enkripsiTeks('x', ''); } catch (e) { galat = e.message; }
  cek('sandi kosong ditolak', galat === 'sandi kosong');
}

console.log('K18 · cadangan terenkripsi frasa sandi');
{
  const isi = JSON.stringify({ notes: [{ id: 'a', title: 'Halo' }] });
  const berkas = await en.buatCadanganTerenkripsi(isi, 'frasa-panjang');
  cek('dikenali sebagai cadangan terenkripsi', en.adalahCadanganTerenkripsi(berkas));
  cek('isi JSON tidak terbaca mentah', !berkas.includes('Halo'));
  cek('buka dengan frasa benar', (await en.bukaCadanganTerenkripsi(berkas, 'frasa-panjang')) === isi);
  let galat = null;
  try { await en.bukaCadanganTerenkripsi(berkas, 'frasa-salah'); } catch (e) { galat = e.message; }
  cek('frasa salah ditolak', galat === 'sandi salah atau data rusak');
  galat = null;
  try { await en.buatCadanganTerenkripsi(isi, 'pendek'); } catch (e) { galat = e.message; }
  cek('frasa < 8 karakter ditolak', galat && galat.includes('minimal 8'));
  galat = null;
  try { await en.bukaCadanganTerenkripsi('{"format":"lain"}', 'frasa-panjang'); } catch (e) { galat = e.message; }
  cek('bukan cadangan Hara ditolak', galat === 'bukan cadangan terenkripsi Hara');
  cek('cadangan biasa bukan terenkripsi', !en.adalahCadanganTerenkripsi('{"format":"hara-cadangan"}'));
}

console.log('K15 · baca keras & dikte');
{
  const p = su.pecahTeks('Kalimat satu. Kalimat dua yang agak panjang. ' + 'kata '.repeat(60), 60);
  cek('teks panjang dipecah', p.length > 1 && p.every(x => x.length <= 61), JSON.stringify(p.map(x => x.length)));
  cek('teks kosong → tanpa potongan', su.pecahTeks('   ').length === 0);

  // Web Speech API stub
  const ucapan = [];
  globalThis.window = globalThis;
  globalThis.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  globalThis.speechSynthesis = { speak: u => ucapan.push(u), cancel() { ucapan.push('batal'); } };
  cek('tersedia: speechSynthesis', su.tersediaBacaKeras() === true);
  const ok = await su.bacaKeras('Halo dunia. Ini uji.', { bahasa: 'id-ID' });
  cek('bacaKeras memakai speechSynthesis', ok === true && ucapan.length >= 1 && ucapan[0].text.includes('Halo') && ucapan[0].lang === 'id-ID');
  su.hentikanBaca();
  cek('hentikanBaca membatalkan', ucapan.includes('batal'));

  // Plugin native (Capacitor) diprioritaskan
  const native = [];
  globalThis.Capacitor = { Plugins: { TextToSpeech: { speak: async o => native.push(o.text), stop() {} } } };
  await su.bacaKeras('Lewat plugin.');
  cek('plugin Capacitor dipakai bila ada', native.length === 1 && native[0] === 'Lewat plugin.');
  delete globalThis.Capacitor;

  // Dikte: Web Speech API stub
  let hasil = null;
  class FakeRec { start() { setTimeout(() => this.onresult({ results: [[{ transcript: 'belanja telur' }]] }), 5); } stop() {} }
  globalThis.SpeechRecognition = FakeRec;
  const kontrol = su.mulaiDikte({ bahasa: 'id-ID', onHasil: t => { hasil = t; } });
  cek('dikte mengembalikan kontrol', !!kontrol && typeof kontrol.berhenti === 'function');
  await new Promise(r => setTimeout(r, 30));
  cek('hasil dikte diteruskan', hasil === 'belanja telur', String(hasil));
  delete globalThis.SpeechRecognition;
  cek('tanpa dukungan dikte → null', su.mulaiDikte({}) === null && su.tersediaDikte() === false);
}

console.log(`\nHasil: ${no - gagal}/${no} lolos${gagal ? `, ${gagal} gagal` : ''}`);
process.exit(gagal ? 1 : 0);
