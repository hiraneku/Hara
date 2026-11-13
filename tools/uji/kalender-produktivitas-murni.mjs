/* Regresi Tahap 3: blok jadwal terpisah, tambah-cepat pratinjau,
   deteksi benturan tanpa mutasi, dan ringkasan mingguan. */
import fs from 'node:fs';
import {
  normalisasiBlokJadwal, normalisasiDaftarBlokJadwal, tafsirAcaraCepat,
  benturanJadwal, ringkasanPekan,
} from '../../docs/notes/kalender-produktivitas-murni.js';
import { normalisasiAcara } from '../../docs/notes/kalender-acara-murni.js';

let gagal=0,total=0;
const cek=(nama,ok,detail='')=>{total++;if(!ok){gagal++;console.error('GAGAL',nama,detail);}else console.log('ok',nama);};
const mulai=Date.UTC(2026,6,6,2),selesai=mulai+60*60000;
const tugas={id:'b1',tipe:'tugas',judul:'Menulis laporan',mulai,selesai,noteId:'n1',blockId:'todo1',zonaWaktu:'Asia/Makassar'};
const fokus={id:'b2',tipe:'fokus',judul:'Sesi fokus',mulai:selesai,selesai:selesai+90*60000,zonaWaktu:'Asia/Makassar'};
cek('blok tugas valid menyimpan tautan catatan dan blok to-do',normalisasiBlokJadwal(tugas)?.noteId==='n1');
cek('blok tugas tanpa referensi sumber ditolak',!normalisasiBlokJadwal({...tugas,noteId:''}));
cek('blok jadwal dengan akhir sebelum mulai ditolak',!normalisasiBlokJadwal({...fokus,selesai:mulai}));
cek('normalisasi blok mengabaikan ID ganda dan entri tidak valid',normalisasiDaftarBlokJadwal([tugas,tugas,{...fokus,id:'b3'}]).length===2);
const hasil=tafsirAcaraCepat('Rapat tim Jumat jam 10','Asia/Makassar');
cek('tambah-cepat memisahkan judul dari tanggal dan waktu',!!hasil&&/Rapat tim/i.test(hasil.judul)&&hasil.jamMulai==='10:00'&&hasil.zonaWaktu==='Asia/Makassar');
cek('tambah-cepat hanya menghasilkan usulan belum tersimpan',!!hasil&& !Object.hasOwn(hasil,'id') && !Object.hasOwn(hasil,'mulai'));
const acara=normalisasiAcara({id:'meeting',judul:'Rapat',mulai,selesai:selesai+30*60000,zonaWaktu:'Asia/Makassar'});
const proposal={mulai:mulai+15*60000,selesai:selesai+15*60000,zonaWaktu:'Asia/Makassar'};
const sebab=benturanJadwal(proposal,{acara:[acara],blok:[tugas]});
cek('benturan menjelaskan acara dan blok yang tumpang tindih',sebab.length===2&&sebab.some(x=>x.jenis==='acara')&&sebab.some(x=>x.jenis==='tugas'));
const buffer=normalisasiAcara({id:'buffer',judul:'Persiapan',mulai,selesai:selesai+3600000,zonaWaktu:'Asia/Makassar',persiapanMenit:30,perjalananMenit:15});
cek('buffer persiapan/perjalanan tersimpan dan ikut memperluas benturan',buffer.persiapanMenit===30&&buffer.perjalananMenit===15&&benturanJadwal({mulai:mulai-20*60000,selesai:mulai-10*60000},{acara:[buffer]}).length===1);
cek('benturan tidak mengubah acara atau blok sumber',acara.mulai===mulai&&tugas.mulai===mulai);
cek('blok yang hanya bersinggungan di batas waktu bukan benturan',benturanJadwal({mulai:selesai,selesai:selesai+30*60000},{blok:[tugas]}).length===0);
const ringkas=ringkasanPekan({tanggalMulai:'2026-07-06',tugas:[{jatuhTanggal:'2026-07-07',n:{id:'n1'},bid:'todo1'},{jatuhTanggal:'2026-07-08',n:{id:'n2'},bid:'todo2'}],blok:[tugas,fokus],acara:[acara]});
cek('ringkasan mingguan menghitung agenda, blok tugas, dan tugas tanpa blok',ringkas.agenda===3&&ringkas.blokTugas===1&&ringkas.tanpaBlok===1,JSON.stringify(ringkas));
const store=fs.readFileSync('docs/core/store.js','utf8'),dataIO=fs.readFileSync('docs/notes/data-io.js','utf8');
const {EN}=await import('../../docs/core/bahasa-en.js'),{JA}=await import('../../docs/core/bahasa-ja.js');
cek('teks tambah-cepat, pengulangan, dan buffer punya terjemahan EN/JA',['Tambah cepat','Pengulangan','Persiapan (menit)','Perjalanan (menit)'].every(k=>EN[k]&&JA[k]));
cek('blok kalender ikut snapshot dan migrasi lokal lama tetap aman',/blokKalender: state\.blokKalender/.test(store)&&/normalisasiDaftarBlokJadwal\(data\.blokKalender\)/.test(store));
cek('blok jadwal masuk ekspor, pratinjau impor, dan penerapan cadangan',/blokKalender: state\.blokKalender/.test(dataIO)&&/normalisasiDaftarBlokJadwal\(data\.blokKalender\)/.test(dataIO)&&/normalisasiDaftarBlokJadwal\(r\.blokKalender\)/.test(dataIO));
console.log(`\nHasil: ${total-gagal}/${total} lulus`);
process.exitCode=gagal?1:0;
