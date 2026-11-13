/* Saran tanggal di ekor kalimat menjadi tugas: hanya usulan, parser Hara
   harus sepakat pada tanggal/jam, dan teks asli tidak disentuh. */
import { kandidatTugas } from '../../docs/notes/editor/auto-tugas.js';
import { uraiTugas } from '../../docs/notes/pengingat.js';
let total=0,gagal=0;
const ok=(n,c,d='')=>{total++;if(c)console.log('LULUS',n);else{gagal++;console.log('GAGAL',n,d?'→ '+d:'');}};

let k=kandidatTugas('Kirim laporan besok jam 9');
ok('suffix besok + jam dikenali sebagai saran',!!k&&k.isiTodo==='besok jam 9 Kirim laporan'&&k.jam==='09:00',JSON.stringify(k));
ok('parser tenggat Hara menyimpan isi tugas setelah frasa tanggal',!!k&&uraiTugas(k.isiTodo)?.sisa==='Kirim laporan');
k=kandidatTugas('Telepon ibu hari ini');
ok('hari ini di ekor kalimat',!!k&&k.isiTodo==='hari ini Telepon ibu'&&uraiTugas(k.isiTodo)?.sisa==='Telepon ibu',JSON.stringify(k));
k=kandidatTugas('Baca bab 4 minggu depan');
ok('minggu depan dikenali',!!k&&uraiTugas(k.isiTodo)?.sisa==='Baca bab 4',JSON.stringify(k));
k=kandidatTugas('Kirim berkas 3 hari lagi 15:30 !!!');
ok('hari lagi, jam, dan prioritas diteruskan ke parser',!!k&&k.jam==='15:30'&&k.prioritas===3&&uraiTugas(k.isiTodo)?.sisa==='Kirim berkas',JSON.stringify(k));
ok('kalimat tanpa tanggal bukan tugas',kandidatTugas('Kirim laporan nanti')===null);
ok('tanggal di tengah kalimat bukan kandidat',kandidatTugas('Besok kirim laporan setelah rapat')===null);
ok('waktu tidak valid ditolak',kandidatTugas('Kirim laporan besok jam 99')===null);
ok('input kosong/terlalu pendek ditolak',kandidatTugas('Besok')===null);
console.log(`\nTotal: ${total} · Lulus: ${total-gagal} · Gagal: ${gagal}`);
if(gagal)process.exit(1);
