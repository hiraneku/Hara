import { segelSnapshot, bukaSnapshot, rencanaGabung, selesaikanKonflik, turunkanKunciSinkron } from '../../docs/core/sinkronisasi-murni.js';
let gagal = 0;
const cek = (nama, ok) => { console.log(`${ok ? 'OK  ' : 'FAIL'} ${nama}`); if (!ok) gagal++; };
const data = { format: 'hara-cadangan', catatan: [{ id: 'n1', title: 'RAHASIA', blocks: [{ id: 'b1', content: 'isi privat' }] }] };
const frasa = 'frasa sinkronisasi lintas perangkat';
const envelope = await segelSnapshot(data, frasa);
cek('payload terenkripsi tidak memuat judul atau isi dalam teks biasa', !JSON.stringify(envelope).includes('RAHASIA') && !JSON.stringify(envelope).includes('isi privat'));
cek('round-trip snapshot terenkripsi utuh', JSON.stringify(await bukaSnapshot(envelope, frasa)) === JSON.stringify(data));
let salah = false; try { await bukaSnapshot(envelope, 'frasa yang salah sekali'); } catch { salah = true; }
cek('frasa salah ditolak tanpa membuka data', salah);
const rusak = { ...envelope, data: envelope.data.slice(0, -4) + 'AAAA' };
salah = false; try { await bukaSnapshot(rusak, frasa); } catch { salah = true; }
cek('payload yang diubah ditolak autentikasi GCM', salah);
salah = false; try { await turunkanKunciSinkron('pendek', new Uint8Array(16)); } catch { salah = true; }
cek('frasa pendek ditolak', salah);
const base = [{ id: 'a', title: 'A', blocks: [] }, { id: 'b', title: 'B', blocks: [] }];
const local = [{ ...base[0], title: 'A lokal' }, base[1], { id: 'c', title: 'baru lokal' }];
const remote = [base[0], { ...base[1], title: 'B jauh' }, { id: 'd', title: 'baru jauh' }];
const plan = rencanaGabung(base, local, remote);
cek('perubahan lokal/jauh yang tidak bertabrakan dan note baru digabung otomatis', plan.konflik.length === 0 && plan.hasil.map(x => x.id).sort().join() === 'a,b,c,d');
const dasarKonflik = { ...base[0], blocks: [{ id: 'blk', content: 'awal' }], tags: ['dasar'] };
const clash = rencanaGabung([dasarKonflik, base[1]], [{ ...dasarKonflik, title: 'Lokal', blocks: [{ id: 'blk', content: 'lokal' }], tags: ['dasar', 'lokal'] }, base[1]], [{ ...dasarKonflik, title: 'Jauh', blocks: [{ id: 'blk', content: 'jauh' }], tags: ['dasar', 'jauh'] }, base[1]]);
cek('perubahan note yang sama terdeteksi sebagai konflik, tidak ditimpa', clash.konflik.length === 1 && clash.hasil.every(x => x.id !== 'a'));
let perluPilih = false; try { selesaikanKonflik(clash, {}); } catch { perluPilih = true; }
cek('konflik tidak bisa diselesaikan diam-diam tanpa pilihan', perluPilih);
const picked = selesaikanKonflik(clash, { a: 'jauh' });
cek('pengguna dapat memilih versi jauh secara eksplisit', picked.find(x => x.id === 'a')?.title === 'Jauh');
const merged = selesaikanKonflik(clash, { a: 'gabung' });
cek('gabung manual mempertahankan blok berbeda dari kedua versi', merged.find(x => x.id === 'a')?.blocks.length === 2 && merged.find(x => x.id === 'a')?.tags.includes('jauh'));
const deleted = rencanaGabung(base, [base[1]], [{ ...base[0], title: 'Edit di perangkat lain' }, base[1]]);
cek('hapus-versus-edit menjadi konflik yang terlihat', deleted.konflik.some(x => x.id === 'a' && !x.lokal && x.jauh));
console.log(gagal ? `\n${gagal} GAGAL` : '\nSemua tes model N6 lulus');
process.exit(gagal ? 1 : 0);
