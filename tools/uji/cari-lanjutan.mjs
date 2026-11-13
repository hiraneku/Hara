import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import { indexedDB as fakeIDB } from 'fake-indexeddb';
const dom = new JSDOM(fs.readFileSync('docs/index.html', 'utf8'), { url: 'https://x.test/', pretendToBeVisual: true });
const { window: w } = dom; w.indexedDB = fakeIDB;
for (const k of ['document','HTMLElement','Node','Range','MouseEvent','Event','InputEvent','localStorage','Image','Blob']) if (w[k] !== undefined) globalThis[k] = w[k];
globalThis.window = w; globalThis.self = w; globalThis.document = w.document; globalThis.localStorage = w.localStorage; globalThis.indexedDB = w.indexedDB;
globalThis.addEventListener = w.addEventListener.bind(w);
Object.defineProperty(globalThis, 'navigator', { value: w.navigator, configurable: true });
w.HTMLCanvasElement.prototype.getContext = () => null;
const versi = fs.readFileSync('docs/app.js', 'utf8').match(/\?v=(\d+)/)[1];
await import(`../../docs/app.js?v=${versi}`);
const { makeNote, makeBlock } = await import(`../../docs/notes/note-model.js?v=${versi}`);
const { pecahKueri, entriDariCatatan, catatanCocok, kueriKosong } = await import(`../../docs/notes/cari.js?v=${versi}`);
const { peringkat } = await import(`../../docs/notes/cari-inti.js?v=${versi}`);
let gagal = 0;
function cek(n, ok) { console.log(`${ok ? 'OK  ' : 'FAIL'} ${n}`); if (!ok) gagal++; }
const notes = [
  makeNote({ id: 'pdf', title: 'Bacaan', blocks: [makeBlock({ type: 'file', meta: { name: 'modul.pdf', mime: 'application/pdf' } })] }),
  makeNote({ id: 'audio', title: 'Memo', blocks: [makeBlock({ type: 'audio', meta: { title: 'Wawancara' } }), makeBlock({ type: 'todo', content: 'Hubungi narasumber' })] }),
  makeNote({ id: 'linked', title: 'Konsep', pinned: true, blocks: [makeBlock({ type: 'paragraph', content: 'Lihat [[Bacaan]]' }), makeBlock({ type: 'image' })] }),
  makeNote({ id: 'arch', title: 'Arsip', archived: true, blocks: [] }),
  makeNote({ id: 'empty', title: '', blocks: [] }),
];
const idx = notes.map(n => entriDariCatatan(n));
const ids = q => peringkat(idx, pecahKueri(q)).ids.sort().join(',');
cek('operator has:pdf mengenali lampiran PDF', ids('has:pdf') === 'pdf');
cek('has:attachment mencakup file, audio, dan gambar', ids('has:attachment') === 'audio,linked,pdf');
cek('has:audio mengenali blok memo suara', ids('has:audio') === 'audio');
cek('has:todo mengenali checklist', ids('has:todo') === 'audio');
cek('has:link mengenali wikilink dan bookmark', ids('has:link') === 'linked');
cek('is:pinned menemukan catatan sematan', ids('is:pinned') === 'linked');
cek('is:archived menemukan catatan arsip', ids('is:archived') === 'arch');
cek('is:active tidak menyertakan arsip', ids('is:active') === 'audio,empty,linked,pdf');
cek('is:empty menemukan catatan tanpa judul dan isi', ids('is:empty') === 'empty');
cek('operator struktur mendukung pengecualian', ids('has:attachment -has:audio') === 'linked,pdf');
cek('before/after menjadi alias tanggal tanpa AI', pecahKueri('before:2026-10-01').tanggal.length === 1 && pecahKueri('after:2026-10-01').tanggal.length === 1);
cek('nilai has yang tidak dikenal diperlakukan sebagai kata biasa', pecahKueri('has:magic').kata[0] === 'has:magic');
cek('kueri has valid tidak dianggap kosong', !kueriKosong(pecahKueri('has:pdf')));
cek('model murni cocok dengan operator struktur', catatanCocok(notes[0], pecahKueri('has:pdf')) && !catatanCocok(notes[0], pecahKueri('-has:pdf')));
console.log(gagal ? `\n${gagal} GAGAL` : '\nSemua uji N2 pencarian deterministik LOLOS');
dom.window.close(); process.exit(gagal ? 1 : 0);
