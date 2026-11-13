import { rencanaSinkronisasi, selesaikanRencanaSinkronisasi } from '../../docs/core/sinkronisasi-rencana.js';
let gagal = 0;
const cek = (nama, ok) => { console.log(`${ok ? 'OK  ' : 'FAIL'} ${nama}`); if (!ok) gagal++; };
const meta = { format: 'hara-cadangan', versi: 1 };
const base = { ...meta, catatan: [{ id: 'n', title: 'awal' }], ruang: [{ id: 'r', nama: 'A' }], kartu: [], ujian: [], blobs: { b1: { b64: 'old', tipe: 'image/png' } } };
const lokal = { ...base, catatan: [{ id: 'n', title: 'lokal' }], kartu: [{ id: 'c1', depan: 'Q', belakang: 'A' }], blobs: { ...base.blobs, b2: { b64: 'local-only', tipe: 'image/png' } } };
const jauh = { ...base, catatan: [{ id: 'n', title: 'jauh' }], ruang: [...base.ruang, { id: 'r2', nama: 'B' }], ujian: [{ id: 'u1', nama: 'Ujian' }], blobs: { ...base.blobs, b3: { b64: 'remote-only', tipe: 'image/png' } } };
const plan = rencanaSinkronisasi(base, lokal, jauh);
cek('entitas berbeda lintas perangkat digabung untuk note, ruang, kartu, ujian, dan blob',
  plan.konflik.length === 1 && plan.konflik[0].jenis === 'catatan' && plan.hasil.ruang.length === 2 && plan.hasil.kartu.length === 1 && plan.hasil.ujian.length === 1 && Object.keys(plan.hasil.blobs).sort().join() === 'b1,b2,b3');
let gagalPilihan = false; try { selesaikanRencanaSinkronisasi(plan, {}); } catch { gagalPilihan = true; }
cek('rencana gabungan menahan konflik sampai ada pilihan eksplisit', gagalPilihan);
const hasil = selesaikanRencanaSinkronisasi(plan, { 'catatan:n': 'jauh' });
cek('pilihan konflik menghasilkan snapshot utuh untuk diterapkan', hasil.catatan[0].title === 'jauh' && hasil.ujian[0].id === 'u1' && hasil.blobs.b2.b64 === 'local-only');
const bentrokBlob = rencanaSinkronisasi(base, { ...base, blobs: { b1: { b64: 'L', tipe: 'image/png' } } }, { ...base, blobs: { b1: { b64: 'R', tipe: 'image/png' } } });
cek('ID blob yang sama dengan isi berbeda juga jadi konflik, bukan tertimpa', bentrokBlob.konflik.some(x => x.jenis === 'blobs' && x.id === 'b1'));
console.log(gagal ? `\n${gagal} GAGAL` : '\nSemua tes rencana sinkronisasi lulus');
process.exit(gagal ? 1 : 0);
