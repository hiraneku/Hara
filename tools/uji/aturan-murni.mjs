import { normalisasiAturan, semuaTugasSelesai, cocokAturan, pratinjauAturan, terapkanPratinjau, urungkanAturan } from '../../docs/notes/aturan-murni.js';
let gagal = 0;
const cek = (nama, ok) => { console.log(`${ok ? 'OK  ' : 'FAIL'} ${nama}`); if (!ok) gagal++; };
const note = { id: 'n1', title: 'Kuliah Fisika', tags: ['Kuliah'], tagsManual: [], props: [], blocks: [{ id: 't1', type: 'todo', meta: { checked: true } }, { id: 't2', type: 'todo', meta: { checked: true } }] };
cek('semuaTugasSelesai hanya true jika note punya tugas dan seluruhnya selesai', semuaTugasSelesai(note) && !semuaTugasSelesai({ blocks: [] }) && !semuaTugasSelesai({ blocks: [{ type: 'todo', meta: { checked: false } }] }));
cek('kondisi aturan memadukan tag, judul, properti, status, dan tugas', cocokAturan(note, { tag: 'kuliah', titleIncludes: 'fisika', semuaTugasSelesai: true }));
const rules = normalisasiAturan([
  { id: 'r1', nama: 'Tandai selesai', pemicu: 'tugas-selesai', kondisi: { semuaTugasSelesai: true }, aksi: { tipe: 'atur-properti', kunci: 'status', nilai: 'Selesai' } },
  { id: 'r2', nama: 'Tag proyek', pemicu: 'tugas-selesai', kondisi: { tag: 'Kuliah' }, aksi: { tipe: 'tambah-tag', tag: 'review' } },
  { id: 'invalid', nama: '', kondisi: {}, aksi: {} },
]);
cek('normalisasi membuang aturan rusak dan membatasi pemicu eksplisit', rules.length === 2 && rules[0].pemicu === 'tugas-selesai');
cek('pemicu tugas selesai tidak jalan ketika pemicu tidak cocok', pratinjauAturan(rules, [note], { pemicu: 'simpan' }).length === 0);
const preview = pratinjauAturan(rules, [note], { pemicu: 'tugas-selesai', waktu: 42 });
cek('pratinjau menghitung aksi tanpa mengubah note asal', preview.length === 1 && preview[0].aturan.length === 2 && !note.props.length && !note.tagsManual.length && preview.every(p => p.sesudah.updatedAt === 42));
const applied = terapkanPratinjau([note], preview);
cek('terapkan pratinjau menjalankan perubahan tag dan properti sesudah dikonfirmasi', applied[0].tagsManual.includes('review') && applied[0].props[0].v === 'Selesai');
const undone = urungkanAturan(applied, preview);
cek('urungkan mengembalikan note tepat ke nilai sebelum aturan', undone.berhasil && JSON.stringify(undone.notes[0]) === JSON.stringify(note));
const edited = structuredClone(applied); edited[0].title = 'Edit baru';
cek('urungkan menolak menimpa catatan yang berubah sesudah aksi', !urungkanAturan(edited, preview).berhasil);
const stale = structuredClone(note); stale.title = 'berubah saat pratinjau';
let refused = false; try { terapkanPratinjau([stale], preview); } catch { refused = true; }
cek('pratinjau basi ditolak sebelum menerapkan aksi', refused);
console.log(gagal ? `\n${gagal} GAGAL` : '\nSemua tes model N7 lulus');
process.exit(gagal ? 1 : 0);
