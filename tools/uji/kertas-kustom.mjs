/* Pengujian Tahap 1 · B7c (templat kertas kustom) — suite jsdom.

   Yang diuji:
   • model: sanitasi pengaturan (pola, spasi dijepit, warna & margin dari daftar tetap);
     makeNote menyimpan 'kustom' hanya bila pengaturannya valid;
   • kelas CSS dan variabel --kt-* untuk latar kustom (margin menambah kelas margin);
   • setter: atur kustom, kustom tanpa pengaturan ditolak, ganti/hapus membersihkan field;
   • editor: class dan style inline (--kt-*) ikut berubah tanpa muat ulang;
   • templat tersimpan di localStorage: duplikat ditolak, maksimal 8, entri rusak dibuang;
   • dialog: tombol Templat kustom, form (pola, spasi, warna, margin), Pakai, Simpan,
     templat tersimpan bisa dipakai, Kembali; preset B7a tetap 4 pilihan;
   • muat ulang (normalizeNote) dan duplikasi mempertahankan pengaturan kustom;
   • CSS: aturan pola, margin, dan dialog ada.

   Jalan: node tools/uji/kertas-kustom.mjs (dari folder repo). */
import { JSDOM } from 'jsdom';
import fs from 'fs';
import { indexedDB as fakeIDB } from 'fake-indexeddb';
import path from 'path';
import { fileURLToPath } from 'url';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const AKAR = process.cwd();

const dom = new JSDOM(fs.readFileSync('docs/index.html', 'utf8'), { url: 'https://x.test/', pretendToBeVisual: true });
const { window: w } = dom; w.indexedDB = fakeIDB;
for (const k of ['document', 'getSelection', 'HTMLElement', 'Node', 'Range', 'MouseEvent', 'KeyboardEvent', 'Event', 'InputEvent', 'localStorage', 'Image', 'NodeFilter'])
  if (w[k] !== undefined) globalThis[k] = w[k];
globalThis.window = w; globalThis.self = w; globalThis.indexedDB = w.indexedDB;
globalThis.addEventListener = w.addEventListener.bind(w);
Object.defineProperty(globalThis, 'navigator', { value: w.navigator, configurable: true });
w.URL.createObjectURL = () => 'blob:x/1'; w.URL.revokeObjectURL = () => {}; globalThis.URL = w.URL;
const V = fs.readFileSync('docs/app.js', 'utf8').match(/\?v=(\d+)/)[1];
const st = (...p) => import(`${AKAR}/docs/${p.join('/')}?v=${V}`);
await st('app.js');
const { state } = await st('core/store.js');
const nm = await st('notes/note-model.js');
const { makeNote, makeBlock, normalizeNote, sanitasiAturKertas, kelasKertasNote, variabelKertasNote, gayaKertasNote, KERTAS_JENIS } = nm;
const model = await st('notes/model.js');
const kertas = await st('notes/kertas.js');
const d = w.document;
const sleep = (ms = 25) => new Promise(r => setTimeout(r, ms));
const klik = el => { if (el) el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true, view: w })); };
const isi = (el, nilai, jenis = 'input') => { el.value = String(nilai); el.dispatchEvent(new w.Event(jenis, { bubbles: true })); };

let gagal = 0, total = 0;
const oke = (nama, baik, det = '') => {
  total++;
  if (!baik) { gagal++; console.log('FAIL', nama, det ? '\n      ' + det : ''); }
  else console.log('ok  ', nama);
};
const buatCatatan = (id, extra = {}) => {
  const n = makeNote({ id, title: 'Uji kustom ' + id, createdAt: Date.now() - 5000, updatedAt: Date.now() - 5000,
    blocks: [makeBlock({ type: 'paragraph', content: 'Isi tidak boleh berubah' })], ...extra });
  state.notes.unshift(n);
  return n;
};
const get = id => state.notes.find(x => x.id === id);
const doc = () => d.querySelector('.ed-doc');
const ATUR = { pola: 'garis', spasi: 24, warna: 'biru', margin: 72 };

console.log('── Sanitasi ──');
oke('pola tak dikenal ditolak', sanitasiAturKertas({ pola: 'xyz', spasi: 24 }) === null);
oke('tanpa objek ditolak', sanitasiAturKertas(null) === null && sanitasiAturKertas('garis') === null);
oke('pengaturan valid dipertahankan', JSON.stringify(sanitasiAturKertas(ATUR)) === JSON.stringify(ATUR));
oke('spasi di bawah 16 dijepit ke 16', sanitasiAturKertas({ pola: 'grid', spasi: 5, warna: 'abu', margin: 0 }).spasi === 16);
oke('spasi di atas 48 dijepit ke 48', sanitasiAturKertas({ pola: 'grid', spasi: 99, warna: 'abu', margin: 0 }).spasi === 48);
oke('spasi tidak angka memakai bawaan 28', sanitasiAturKertas({ pola: 'titik', spasi: 'abc' }).spasi === 28);
oke('warna tak dikenal memakai abu', sanitasiAturKertas({ pola: 'titik', spasi: 24, warna: '#ff0000' }).warna === 'abu');
oke('margin di luar daftar memakai 0', sanitasiAturKertas({ pola: 'titik', spasi: 24, margin: 50 }).margin === 0);
oke('kustom ada di KERTAS_JENIS', KERTAS_JENIS.includes('kustom') && KERTAS_JENIS.includes('garis'));

console.log('── Model catatan ──');
const mk = makeNote({ kertas: 'kustom', kertasAtur: ATUR });
oke('makeNote menyimpan kustom + pengaturan', mk.kertas === 'kustom' && JSON.stringify(mk.kertasAtur) === JSON.stringify(ATUR));
oke('kustom tanpa pengaturan dibuang', !('kertas' in makeNote({ kertas: 'kustom' })));
oke('kustom dengan pola rusak dibuang', !('kertas' in makeNote({ kertas: 'kustom', kertasAtur: { pola: 'x' } })));
oke('pengaturan dibawa hanya bila kertas kustom', !('kertasAtur' in makeNote({ kertas: 'titik', kertasAtur: ATUR })));
oke('titik B7a tetap disimpan', makeNote({ kertas: 'titik' }).kertas === 'titik');

console.log('── Kelas dan variabel CSS ──');
oke('kelas kustom garis tanpa margin', kelasKertasNote({ kertas: 'kustom', kertasAtur: { ...ATUR, margin: 0 } }) === 'kertas-kustom kertas-kustom-garis');
oke('kelas kustom dengan margin menambah kelas margin', kelasKertasNote({ kertas: 'kustom', kertasAtur: ATUR }) === 'kertas-kustom kertas-kustom-garis kertas-kustom-margin', kelasKertasNote({ kertas: 'kustom', kertasAtur: ATUR }));
oke('latar B7a titik tetap kertas-titik', kelasKertasNote({ kertas: 'titik' }) === 'kertas-titik');
oke('polos dan kustom tanpa pengaturan: kelas kosong', kelasKertasNote({}) === '' && kelasKertasNote({ kertas: 'kustom' }) === '');
const v = variabelKertasNote({ kertas: 'kustom', kertasAtur: ATUR });
oke('variabel: spasi 24px, warna biru, margin 72px', v && v['--kt-spasi'] === '24px' && v['--kt-warna'] === '#4a7bd0' && v['--kt-margin'] === '72px', JSON.stringify(v));
oke('variabel kosong untuk latar bukan kustom', variabelKertasNote({ kertas: 'grid' }) === null);
oke('gaya inline berisi --kt-spasi:24px', gayaKertasNote({ kertas: 'kustom', kertasAtur: ATUR }).includes('--kt-spasi:24px'));

console.log('── Setter ──');
const n1 = buatCatatan('c1', { kertas: 'titik' });
const tAwal = n1.updatedAt;
oke('atur kustom: berhasil', kertas.setKertasCatatan('c1', 'kustom', ATUR) === true && n1.kertas === 'kustom');
oke('atur kustom: pengaturan tersimpan', JSON.stringify(n1.kertasAtur) === JSON.stringify(ATUR));
oke('atur kustom: updatedAt berubah', n1.updatedAt > tAwal);
oke('kustom tanpa pengaturan valid ditolak dan tidak mengubah', kertas.setKertasCatatan('c1', 'kustom', { pola: 'x' }) === false && n1.kertasAtur.pola === 'garis');
oke('ganti ke grid menghapus pengaturan kustom', kertas.setKertasCatatan('c1', 'grid') === true && n1.kertas === 'grid' && !('kertasAtur' in n1));
kertas.setKertasCatatan('c1', 'kustom', ATUR);
oke('kustom → polos menghapus kedua field', kertas.setKertasCatatan('c1', 'polos') === true && !('kertas' in n1) && !('kertasAtur' in n1));
oke('isi blok tidak berubah', n1.blocks[0].content === 'Isi tidak boleh berubah');

console.log('── Editor ──');
kertas.setKertasCatatan('c1', 'kustom', ATUR);
const n2 = buatCatatan('c2', { kertas: 'kustom', kertasAtur: { pola: 'grid', spasi: 40, warna: 'merah', margin: 0 } });
model.openNote('c2');
await sleep(40);
oke('editor memakai kelas kustom grid', !!doc() && doc().classList.contains('kertas-kustom-grid') && !doc().classList.contains('kertas-kustom-margin'), doc() && doc().className);
oke('editor memasang --kt-spasi 40px inline', doc().style.getPropertyValue('--kt-spasi') === '40px', doc().getAttribute('style'));
oke('editor memasang warna merah inline', doc().style.getPropertyValue('--kt-warna') === '#d0554f');
model.openNote('c1');
await sleep(40);
oke('ganti ke kustom garis+margin tanpa muat ulang: kelas ikut', doc().classList.contains('kertas-kustom-garis') && doc().classList.contains('kertas-kustom-margin'), doc().className);
oke('kelas pola lama (grid) tidak tertinggal', !doc().classList.contains('kertas-kustom-grid'));
kertas.setKertasCatatan('c1', 'polos');
oke('polos: tidak ada kelas kertas dan tidak ada variabel --kt-', !/kertas-/.test(doc().className) && !doc().style.getPropertyValue('--kt-spasi'), doc().getAttribute('style') || '');
oke('editor tetap contenteditable', doc().getAttribute('contenteditable') === 'true');

console.log('── Templat tersimpan ──');
w.localStorage.clear();
oke('awalnya belum ada templat', kertas.muatTemplatKertas().length === 0);
oke('simpan templat valid', kertas.simpanTemplatKertas(ATUR).ok === true);
oke('simpan duplikat ditolak (ada)', kertas.simpanTemplatKertas(ATUR).alasan === 'ada');
oke('simpan pengaturan tak valid ditolak', kertas.simpanTemplatKertas({ pola: 'x' }).alasan === 'tidak-valid');
for (let i = 0; i < 7; i++) kertas.simpanTemplatKertas({ pola: 'titik', spasi: 16 + i * 2, warna: 'abu', margin: 0 });
oke('maksimal 8 templat', kertas.muatTemplatKertas().length === 8);
oke('templat ke-9 ditolak (penuh)', kertas.simpanTemplatKertas({ pola: 'grid', spasi: 20, warna: 'hijau', margin: 96 }).alasan === 'penuh');
w.localStorage.setItem(kertas.KUNCI_TEMPLAT_KERTAS, JSON.stringify([ 'rusak', null, { pola: 'grid', spasi: 30, warna: 'abu', margin: 0 } ]));
oke('entri rusak dibuang saat dibaca', kertas.muatTemplatKertas().length === 1 && kertas.muatTemplatKertas()[0].pola === 'grid');
w.localStorage.setItem(kertas.KUNCI_TEMPLAT_KERTAS, '{bukan json');
oke('data tidak terbaca → daftar kosong', kertas.muatTemplatKertas().length === 0);
w.localStorage.clear();

console.log('── Dialog ──');
const n3 = buatCatatan('c3', { kertas: 'titik' });
model.openNote('c3');
await sleep(30);
kertas.bukaDialogKertasCatatan();
await sleep(20);
const pilihan = Array.from(d.querySelectorAll('#pop [data-kertas-pick]')).map(b => b.dataset.kertasPick);
oke('dialog tetap 4 pilihan B7a', JSON.stringify(pilihan) === JSON.stringify(['polos', 'titik', 'garis', 'grid']), pilihan.join(','));
oke('dialog memuat tombol Templat kustom', !!d.querySelector('#pop [data-kertas-kustom]'));
klik(d.querySelector('#pop [data-kertas-kustom]'));
await sleep(30);
const pola = d.querySelector('#pop select[data-kf="pola"]');
const rentang = d.querySelector('#pop input[data-kf="spasi"]');
oke('form: pola, spasi (16–48) dan margin tampil', !!pola && !!rentang && rentang.min === '16' && rentang.max === '48' && !!d.querySelector('#pop select[data-kf="margin"]'));
oke('form: bawaan pola garis, spasi 28', pola.value === 'garis' && rentang.value === '28', `${pola.value} ${rentang.value}`);
isi(pola, 'grid', 'change');
isi(rentang, 40, 'input');
oke('form: keluaran spasi ikut berubah', d.querySelector('#pop [data-kf-out]')?.textContent === '40 px', d.querySelector('#pop [data-kf-out]')?.textContent);
klik(d.querySelector('#pop [data-kf-warna="merah"]'));
await sleep(30);
oke('form: warna merah terpilih (aria-pressed)', d.querySelector('#pop [data-kf-warna="merah"]')?.getAttribute('aria-pressed') === 'true');
isi(d.querySelector('#pop select[data-kf="margin"]'), 72, 'change');
klik(d.querySelector('#pop [data-kf-pakai]'));
await sleep(30);
oke('Pakai: catatan menjadi kustom dengan isian form',
  n3.kertas === 'kustom' && JSON.stringify(n3.kertasAtur) === JSON.stringify({ pola: 'grid', spasi: 40, warna: 'merah', margin: 72 }), JSON.stringify(n3.kertasAtur));
oke('Pakai: editor menampilkan grid + margin, spasi 40px', doc().classList.contains('kertas-kustom-grid') && doc().classList.contains('kertas-kustom-margin') && doc().style.getPropertyValue('--kt-spasi') === '40px');
oke('Pakai: dialog tertutup', !d.querySelector('#pop.on'));

w.localStorage.clear();
kertas.bukaDialogKertasCatatan();
await sleep(20);
klik(d.querySelector('#pop [data-kertas-kustom]'));
await sleep(20);
klik(d.querySelector('#pop [data-kf-simpan]'));
await sleep(20);
oke('Simpan sebagai templat: satu templat tersimpan', kertas.muatTemplatKertas().length === 1);
oke('Simpan: templat tersimpan = isian form saat ini', JSON.stringify(kertas.muatTemplatKertas()[0]) === JSON.stringify({ pola: 'grid', spasi: 40, warna: 'merah', margin: 72 }), JSON.stringify(kertas.muatTemplatKertas()[0]));
klik(d.querySelector('#pop [data-kf-simpan]'));
await sleep(20);
oke('Simpan dua kali: tidak menambah duplikat', kertas.muatTemplatKertas().length === 1);
klik(d.querySelector('#pop [data-kf-kembali]'));
await sleep(20);
oke('Kembali: daftar tampil lagi', !!d.querySelector('#pop [data-kertas-pick]'));
oke('daftar memuat templat tersimpan nomor 1', !!d.querySelector('#pop [data-kertas-tpl="0"]'));
oke('templat sama dengan latar catatan saat ini ditandai', d.querySelector('#pop [data-kertas-tpl="0"]')?.classList.contains('sel'));
oke('Templat kustom… tidak ditandai bila sudah cocok templat', !d.querySelector('#pop [data-kertas-kustom]')?.classList.contains('sel'));

const n4 = buatCatatan('c4', { kertas: 'garis' });
model.openNote('c4');
await sleep(30);
kertas.bukaDialogKertasCatatan();
await sleep(20);
klik(d.querySelector('#pop [data-kertas-tpl="0"]'));
await sleep(30);
oke('pakai templat tersimpan di catatan lain', n4.kertas === 'kustom' && n4.kertasAtur.pola === 'grid' && n4.kertasAtur.spasi === 40);
oke('editor catatan lain memakai templat', doc().classList.contains('kertas-kustom-grid'));

console.log('── Muat ulang dan duplikasi ──');
const hidup = normalizeNote(JSON.parse(JSON.stringify(n3)));
oke('normalizeNote mempertahankan kustom dan pengaturan', hidup.kertas === 'kustom' && hidup.kertasAtur?.spasi === 40 && hidup.kertasAtur?.warna === 'merah');
model.openNote('c3');
await sleep(30);
model.duplikatNote();
const salin = state.notes[0];
oke('duplikasi menyalin latar kustom', salin.id !== 'c3' && salin.kertas === 'kustom' && JSON.stringify(salin.kertasAtur) === JSON.stringify(n3.kertasAtur), JSON.stringify(salin && salin.kertasAtur));
if (salin.kertasAtur) salin.kertasAtur.spasi = 17;
oke('salinan tidak berbagi objek pengaturan dengan asli', n3.kertasAtur.spasi === 40);

console.log('── CSS ──');
const css = fs.readFileSync('docs/styles/notes.css', 'utf8');
for (const pola of ['titik', 'garis', 'grid'])
  oke(`notes.css punya latar kustom ${pola}`, new RegExp(`\\.ed-doc\\.kertas-kustom-${pola}\\{[^}]*background-image[^}]*var\\(--kt-spasi`).test(css));
oke('notes.css: margin memakai padding-left dan garis ::before', /\.ed-doc\.kertas-kustom-margin\{[^}]*padding-left:calc\(var\(--kt-margin/.test(css) && /kertas-kustom-margin::before\{[^}]*left:var\(--kt-margin/.test(css));
oke('notes.css: gaya dialog kt-isi ada', /\.kt-isi\{/.test(css) && /\.kt-warna\.sel\{/.test(css));

console.log(`\nTotal: ${total} pengujian · Lulus: ${total - gagal} · Gagal: ${gagal}`);
if (gagal > 0) { console.log('GAGAL'); process.exit(1); }
process.exit(0);
