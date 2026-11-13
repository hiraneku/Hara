import { buatKlienSinkronisasi } from '../../docs/core/sinkronisasi-klien.js';
import { bukaSnapshot } from '../../docs/core/sinkronisasi-murni.js';
let gagal = 0;
const cek = (nama, ok) => { console.log(`${ok ? 'OK  ' : 'FAIL'} ${nama}`); if (!ok) gagal++; };
const frasa = 'frasa untuk sinkronisasi yang panjang';
const mk = title => ({ format: 'hara-cadangan', versi: 1, catatan: [{ id: 'n1', title, blocks: [{ id: 'b1', content: title }] }], ruang: [], kartu: [], ujian: [], blobs: {} });
let local = mk('awal'), applied = null, baseline = null, remoteEnvelope = null, etag = null, benturkan = false;
const client = buatKlienSinkronisasi({
  bacaLokal: async () => structuredClone(local),
  terapkanLokal: async data => { applied = structuredClone(data); local = structuredClone(data); },
  bacaBaseline: async () => baseline,
  tulisBaseline: async data => { baseline = data; },
  bacaRemote: async () => remoteEnvelope ? { ada: true, envelope: remoteEnvelope, etag } : { ada: false, etag: null },
  tulisRemote: async (_url, _cred, envelope, expected) => {
    if (benturkan || (remoteEnvelope ? expected !== etag : expected !== null)) return { konflik: true, etag };
    remoteEnvelope = envelope; etag = `"${Number(etag?.replace(/\D/g, '') || 0) + 1}"`; return { konflik: false, etag };
  },
});
let r = await client.mulai({ endpoint: 'https://sync.test/vault.json', frasa });
cek('sinkronisasi pertama mengunggah snapshot terenkripsi dan menyimpan baseline', r.status === 'selesai' && !!baseline && (await bukaSnapshot(remoteEnvelope, frasa)).catatan[0].title === 'awal' && applied.catatan[0].title === 'awal');
remoteEnvelope = null; applied = null;
r = await client.mulai({ endpoint: 'https://sync.test/vault.json', frasa });
cek('snapshot remote yang hilang tidak diunggah ulang diam-diam', r.status === 'remote-hilang' && applied === null && remoteEnvelope === null);
r = await client.mulai({ endpoint: 'https://sync.test/vault.json', frasa, paksaBuatUlang: true });
cek('reinisialisasi remote hanya berjalan setelah diminta eksplisit', r.status === 'selesai' && !!remoteEnvelope);
const firstBase = structuredClone(local);
local.catatan.push({ id: 'local-note', title: 'lokal', blocks: [] });
const remote = await bukaSnapshot(remoteEnvelope, frasa);
remote.catatan.push({ id: 'remote-note', title: 'jauh', blocks: [] });
remoteEnvelope = await (await import('../../docs/core/sinkronisasi-murni.js')).segelSnapshot(remote, frasa);
etag = '"2"';
r = await client.mulai({ endpoint: 'https://sync.test/vault.json', frasa });
const synced = await bukaSnapshot(remoteEnvelope, frasa);
cek('sinkronisasi otomatis menggabungkan perubahan non-konflik dua perangkat', r.status === 'selesai' && synced.catatan.some(n => n.id === 'local-note') && synced.catatan.some(n => n.id === 'remote-note') && applied.catatan.length === 3);
const base = structuredClone(applied);
local = structuredClone(base); local.catatan.find(n => n.id === 'n1').title = 'edit lokal';
const other = structuredClone(base); other.catatan.find(n => n.id === 'n1').title = 'edit jauh';
const { segelSnapshot } = await import('../../docs/core/sinkronisasi-murni.js');
remoteEnvelope = await segelSnapshot(other, frasa); etag = '"3"'; applied = null;
r = await client.mulai({ endpoint: 'https://sync.test/vault.json', frasa });
cek('benturan edit dikembalikan ke UI tanpa menulis/menimpa snapshot mana pun', r.status === 'konflik' && r.konflik.length === 1 && applied === null && client.adaResolusiTertunda());
r = await client.pilihKonflik({ 'catatan:n1': 'jauh' });
cek('pilihan konflik eksplisit disimpan lalu diterapkan ke perangkat', r.status === 'selesai' && applied.catatan.find(n => n.id === 'n1').title === 'edit jauh' && !client.adaResolusiTertunda());
local = structuredClone(applied); local.catatan.find(n => n.id === 'n1').title = 'edit lagi lokal';
const current = await bukaSnapshot(remoteEnvelope, frasa); current.catatan.find(n => n.id === 'n1').title = 'edit lagi jauh';
remoteEnvelope = await segelSnapshot(current, frasa); etag = '"4"'; applied = null;
r = await client.mulai({ endpoint: 'https://sync.test/vault.json', frasa });
benturkan = true;
r = await client.pilihKonflik({ 'catatan:n1': 'lokal' });
cek('ETag yang berubah saat konflik dibuka menggagalkan tulis tanpa menerapkan lokal', r.status === 'remote-berubah' && applied === null && client.adaResolusiTertunda());
console.log(gagal ? `\n${gagal} GAGAL` : '\nSemua tes orchestrator N6 lulus');
process.exit(gagal ? 1 : 0);
