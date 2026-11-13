import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import { indexedDB } from 'fake-indexeddb';
const dom = new JSDOM(fs.readFileSync('docs/index.html', 'utf8'), { url: 'https://hara.test/', pretendToBeVisual: true });
const w = dom.window; w.indexedDB = indexedDB;
for (const k of ['document','HTMLElement','Node','Range','MouseEvent','Event','InputEvent','localStorage','Image','Blob']) if (w[k] !== undefined) globalThis[k] = w[k];
globalThis.window = w; globalThis.self = w; globalThis.document = w.document; globalThis.localStorage = w.localStorage; globalThis.indexedDB = indexedDB;
globalThis.addEventListener = w.addEventListener.bind(w);
Object.defineProperty(globalThis, 'navigator', { value: w.navigator, configurable: true });
w.HTMLCanvasElement.prototype.getContext = () => null;
const version = fs.readFileSync('docs/app.js', 'utf8').match(/\?v=(\d+)/)[1];
await import(`../../docs/app.js?v=${version}`);
const { miscViews } = await import(`../../docs/notes/views/misc.js?v=${version}`);
const { bindSinkronisasi } = await import(`../../docs/notes/sinkronisasi-ui.js?v=${version}`);
let gagal = 0;
const cek = (nama, ok) => { console.log(`${ok ? 'OK  ' : 'FAIL'} ${nama}`); if (!ok) gagal++; };
const setelan = document.createElement('div'); setelan.innerHTML = miscViews.set();
cek('pengaturan menampilkan entry sinkron WebDAV', !!setelan.querySelector('[data-sinkronisasi]'));
bindSinkronisasi();
document.body.append(setelan);
setelan.querySelector('[data-sinkronisasi]').click();
cek('aksi sinkronisasi membuka formulir endpoint dan frasa E2E',
  !!document.getElementById('n6-url') && !!document.getElementById('n6-phrase') && !!document.getElementById('n6-sync-run'));
cek('UI memberi tahu bahwa frasa tidak dapat dipulihkan dan perlu dijaga',
  document.querySelector('.sh')?.textContent.includes('tidak dapat dipulihkan'));
console.log(gagal ? `\n${gagal} GAGAL` : '\nSemua tes UI N6 lulus');
process.exit(gagal ? 1 : 0);
