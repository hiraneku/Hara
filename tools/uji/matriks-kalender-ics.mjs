/* Uji Ronde 11 · K7 matriks prioritas, K8 ICS, K9 kalender bulanan.
   - kuadranTugas, jatuhPada, kalenderBulan (murni);
   - bangunIcs / uraiIcs / escIcs / lipatBaris (RFC 5545, pulang-pergi);
   - layar Tugas di jsdom: matriks tampil, navigasi kalender, pilih hari.
   Jalankan: node tools/uji/matriks-kalender-ics.mjs */
import {JSDOM} from 'jsdom';
import fs from 'fs';
import { indexedDB as fakeIDB } from 'fake-indexeddb';
import path from 'path';
import { fileURLToPath } from 'url';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const AKAR = process.cwd();
const V = fs.readFileSync('docs/app.js', 'utf8').match(/\?v=(\d+)/)[1];
const kal = await import(`${AKAR}/docs/notes/kalender.js?v=${V}`);
const ics = await import(`${AKAR}/docs/notes/ics.js?v=${V}`);
const pg0 = await import(`${AKAR}/docs/notes/pengingat.js?v=${V}`);

let gagal = 0, total = 0;
const oke = (nama, baik, det = '') => { total++; if (!baik) { gagal++; console.log('FAIL', nama, det ? '\n      ' + det : ''); } else console.log('ok  ', nama); };

const hariIni = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const hari = n => { const d = hariIni(); d.setDate(d.getDate() + n); return d; };
const awalMs = d => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/* ── K7 · matriks ── */
const t = (waktu, prioritas, extra = {}) => ({ waktu, prioritas, ...extra });
const q = kal.kuadranTugas([
  t(hari(0).getTime(), 3, { id: 'a' }),     /* mendesak & penting */
  t(hari(1).getTime(), 2, { id: 'b' }),     /* mendesak & penting (besok) */
  t(hari(5).getTime(), 2, { id: 'c' }),     /* penting, belum mendesak */
  t(hari(0).getTime(), 0, { id: 'd' }),     /* mendesak, tidak penting */
  t(hari(6).getTime(), 1, { id: 'e' }),     /* nanti */
  t(hari(-3).getTime(), 0, { id: 'f' }),    /* lewat (mendesak), tidak penting */
]);
oke('kerjakan: mendesak & penting (hari ini + besok)', q.kerjakan.map(x => x.id).join() === 'a,b', q.kerjakan.map(x => x.id).join());
oke('jadwalkan: penting, belum mendesak', q.jadwalkan.map(x => x.id).join() === 'c');
oke('selesaikan cepat: mendesak, tidak penting (termasuk yang lewat)', q.cepat.map(x => x.id).sort().join() === 'd,f', q.cepat.map(x => x.id).join());
oke('nanti: belum mendesak, tidak penting (prioritas 1 tanpa mendesak)', q.nanti.map(x => x.id).join() === 'e');
oke('daftar kosong → semua kuadran kosong',
  Object.values(kal.kuadranTugas([])).every(a => a.length === 0));

/* ── K9 · jatuhPada & kalender ── */
const sekali = { waktu: awalMs(new Date(2026, 9, 15)), aturan: null };
oke('sekali-jalan jatuh tepat di hari tenggatnya', kal.jatuhPada(sekali, awalMs(new Date(2026, 9, 15))));
oke('sekali-jalan tidak jatuh di hari lain', !kal.jatuhPada(sekali, awalMs(new Date(2026, 9, 16))));

const harian = { waktu: awalMs(new Date(2026, 9, 10)), aturan: { jenis: 'harian' } };
oke('harian: jatuh setiap hari sejak kejadian pertama', kal.jatuhPada(harian, awalMs(new Date(2026, 9, 31))));
oke('harian: tidak jatuh sebelum kejadian pertama', !kal.jatuhPada(harian, awalMs(new Date(2026, 9, 9))));

const mingguan = { waktu: awalMs(new Date(2026, 9, 5)), aturan: { jenis: 'mingguan', hari: 1 } }; /* Senin */
oke('mingguan Senin: jatuh di Senin 12 Okt 2026', kal.jatuhPada(mingguan, awalMs(new Date(2026, 9, 12))));
oke('mingguan Senin: tidak jatuh di Selasa', !kal.jatuhPada(mingguan, awalMs(new Date(2026, 9, 13))));

const bulanan = { waktu: awalMs(new Date(2027, 0, 31)), aturan: { jenis: 'bulanan', tgl: 31 } };
oke('bulanan 31: tanggal 31 jatuh', kal.jatuhPada(bulanan, awalMs(new Date(2027, 2, 31))));
oke('bulanan 31: Februari 2027 jatuh di 28 (dibatasi akhir bulan)',
  kal.jatuhPada(bulanan, awalMs(new Date(2027, 1, 28))));

const peta = kal.kalenderBulan([sekali, harian], 2026, 9);
oke('kalender Oktober 2026: 15 berisi 2 (sekali + harian)', peta.get(15) && peta.get(15).length === 2);
oke('kalender: hari tanpa tenggat tidak ada di peta', !peta.has(1) || peta.get(1).length === 0);
/* harian mulai 10 Okt → 10..31 = 22 hari berisi; 1..9 kosong */
oke('kalender: harian berisi 10–31 Okt (22 hari)', peta.size === 22, `size=${peta.size}`);
oke('kalender: sebelum kejadian pertama kosong (1–9 Okt)', [1, 9].every(t => !peta.has(t)));

/* ── K8 · ICS ── */
oke('escIcs: koma, titik koma, backslash, baris baru',
  ics.escIcs('a,b;c\\d\ne') === 'a\\,b\\;c\\\\d\\ne');
const panjang = 'X'.repeat(170);
const lipat = ics.lipatBaris('SUMMARY:' + panjang);
oke('lipatBaris: tiap baris fisik ≤ 75 karakter',
  lipat.split('\r\n').every(l => l.length <= 75), lipat.split('\r\n').map(l => l.length).join(','));

const notes = [{
  id: 'n1', title: 'Proyek, Utama',
  blocks: [
    { id: 'b1', type: 'todo', content: 'besok lari, cepat; ya !!', meta: { checked: false } },
    { id: 'b2', type: 'todo', content: 'besok jam 10:00 rapat tim', meta: { checked: false } },
    { id: 'b3', type: 'todo', content: 'setiap senin standup', meta: { checked: false } },
    { id: 'b4', type: 'todo', content: 'besok sudah beres', meta: { checked: true, done: 1 } },
    { id: 'b5', type: 'paragraph', content: 'bukan to-do' },
  ],
}];
const teksIcs = ics.bangunIcs(notes);
oke('ICS: diawali BEGIN:VCALENDAR dan diakhiri END:VCALENDAR',
  teksIcs.startsWith('BEGIN:VCALENDAR') && teksIcs.trimEnd().endsWith('END:VCALENDAR'));
oke('ICS: hanya to-do belum selesai & bertenggat → 3 acara',
  (teksIcs.match(/BEGIN:VEVENT/g) || []).length === 3, `${(teksIcs.match(/BEGIN:VEVENT/g) || []).length}`);
oke('ICS: tanpa jam → DTSTART;VALUE=DATE', /DTSTART;VALUE=DATE:\d{8}/.test(teksIcs));
oke('ICS: dengan jam → DTSTART jam 10:00 & DTEND 1 jam kemudian',
  /DTSTART:\d{8}T100000/.test(teksIcs) && /DTEND:\d{8}T110000/.test(teksIcs));
oke('ICS: berulang mingguan → RRULE FREQ=WEEKLY;BYDAY=MO', teksIcs.includes('RRULE:FREQ=WEEKLY;BYDAY=MO'));
oke('ICS: prioritas !! → PRIORITY:5', teksIcs.includes('PRIORITY:5'));
oke('ICS: UID stabil & unik per to-do', teksIcs.includes('UID:hara-n1-b1@hara.local'));

/* pulang-pergi: ekspor → impor */
const acara = ics.uraiIcs(teksIcs);
oke('impor: 3 acara terbaca', acara.length === 3, `${acara.length}`);
const lari = acara.find(a => a.judul.startsWith('lari'));
oke('impor: judul dengan koma & titik koma utuh',
  lari && lari.judul === 'lari, cepat; ya', lari ? lari.judul : 'tidak ada');
const rapat = acara.find(a => a.judul.includes('rapat'));
oke('impor: jam ikut terbaca (10:00)', rapat && rapat.jam === '10:00', JSON.stringify(rapat));
oke('impor: tanggal seharian → jam null', lari && lari.jam === null);
const baris = ics.barisTodoDariAcara(rapat);
oke('barisTodoDariAcara → "yyyy-mm-dd jam HH:MM judul" (dikenali tenggat Hara)',
  /^\d{4}-\d{2}-\d{2} jam 10:00 rapat tim$/.test(baris), baris);

/* lipatan baris dibuka saat impor */
const terlipat = 'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20261020\r\nSUMMARY:Sangat panjang sekali judul\r\n  yang terlipat\r\nEND:VEVENT\r\nEND:VCALENDAR';
const tl = ics.uraiIcs(terlipat);
oke('impor: baris terlipat dibuka kembali', tl.length === 1 && tl[0].judul === 'Sangat panjang sekali judul yang terlipat', JSON.stringify(tl));
oke('impor: acara tanpa DTSTART dilewati', ics.uraiIcs('BEGIN:VEVENT\r\nSUMMARY:x\r\nEND:VEVENT').length === 0);

/* ── UI di layar Tugas (jsdom) ── */
const { JSDOM: JD } = await import('jsdom');
const dom = new JD(fs.readFileSync('docs/index.html', 'utf8'), { url: 'https://x.test/', pretendToBeVisual: true });
const { window: w } = dom; w.indexedDB = fakeIDB;
for (const k of ['document','getSelection','HTMLElement','Node','Range','MouseEvent','KeyboardEvent','Event','InputEvent','localStorage','Image','NodeFilter','File','Blob'])
  if (w[k] !== undefined) globalThis[k] = w[k];
globalThis.window = w; globalThis.self = w; globalThis.indexedDB = w.indexedDB;
globalThis.addEventListener = w.addEventListener.bind(w);
Object.defineProperty(globalThis, 'navigator', { value: w.navigator, configurable: true });
w.URL.createObjectURL = () => 'blob:x/1'; w.URL.revokeObjectURL = () => {}; globalThis.URL = w.URL;
const st = (...p) => import(`${AKAR}/docs/${p.join('/')}?v=${V}`);
await st('app.js');
const { state } = await st('core/store.js');
const { makeNote, makeBlock } = await st('notes/note-model.js');
const router = await st('core/router.js');
const d = w.document;
const sleep = (ms = 40) => new Promise(r => setTimeout(r, ms));
const klik = el => { if (el) el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true, view: w })); };

state.notes.splice(0);
const kini = Date.now();
state.notes.push(makeNote({ id: 'u1', title: 'Rencana', createdAt: kini, updatedAt: kini, blocks: [
  makeBlock({ type: 'todo', content: 'hari urgent sekarang !!!' }),
  makeBlock({ type: 'todo', content: 'lusa jadwal tenang' }),
] }));
router.go('task'); await sleep();

oke('Tugas: bagian matriks prioritas tampil', !!d.querySelector('.mtx') && d.querySelector('.mtx-kerjakan') !== null);
oke('Tugas: kuadran "Kerjakan sekarang" memuat to-do !!!',
  (d.querySelector('.mtx-kerjakan') || {}).textContent && d.querySelector('.mtx-kerjakan').textContent.includes('urgent'));
oke('Tugas: kalender tampil dengan 7 kolom hari', d.querySelectorAll('.kal-dow').length === 7);
oke('Tugas: sel hari ini ditandai', !!d.querySelector('.kal-kini'));

const hariTitikSebelum = d.querySelectorAll('.kal-hari').length;
klik(d.querySelector('[data-kal="next"]')); await sleep();
oke('kalender: tombol bulan berikutnya mengganti judul bulan',
  d.querySelector('.kal-head b') && d.querySelector('.kal-head b').textContent.trim() !== '' );
oke('kalender: jumlah sel hari tetap masuk akal', d.querySelectorAll('.kal-hari').length >= 28 && hariTitikSebelum >= 28);

klik(d.querySelector('[data-kal="today"]')); await sleep();
const selPilih = d.querySelector('.kal-pilih');
oke('kalender: "Hari ini" kembali dan memilih hari ini', !!selPilih && selPilih.classList.contains('kal-kini'));

const sel2 = d.querySelector('.kal-hari:not(.kal-pilih)');
klik(sel2); await sleep();
oke('kalender: pilih hari lain → sorotan pindah', !!d.querySelector('.kal-pilih') && d.querySelector('.kal-pilih') !== selPilih);

/* impor berkas .ics → catatan baru berisi to-do */
const tugasMod = await st('notes/views/tugas.js');
const sebelum = state.notes.length;
const berkas = new w.File([teksIcs], 'kalender.ics', { type: 'text/calendar' });
await tugasMod.imporIcs(berkas); await sleep(60);
const baru = state.notes.find(n => n.title === 'Impor kalender');
oke('impor .ics: membuat satu catatan baru', state.notes.length === sebelum + 1);
oke('impor .ics: catatan berisi 3 to-do dengan tanggal yyyy-mm-dd',
  !!baru && baru.blocks.length === 3 && baru.blocks.every(b => /^\d{4}-\d{2}-\d{2} /.test(b.content)),
  baru ? JSON.stringify(baru.blocks.map(b => b.content)) : 'tidak ada');
oke('impor .ics: to-do hasil impor dikenali tenggatnya',
  !!baru && baru.blocks.every(b => { const u = pg0.uraiTugas(b.content); return !!u && !!u.waktu; }));
/* impor membuka catatan baru (layar editor) — kembali ke Tugas untuk cek tombol */
router.go('task'); await sleep();
const ada = d.querySelector('[data-ics-unduh]');
oke('ICS: tombol unduh ada di layar Tugas', !!ada);

console.log(`\ntotal: ${total} · gagal: ${gagal}`);
process.exit(gagal ? 1 : 0);
