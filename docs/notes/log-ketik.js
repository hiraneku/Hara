/* Log ketik — alat diagnosis untuk keluhan \"huruf tidak mengikuti warna\"
   di HP. Dimatikan secara default; diaktifkan dari Pengaturan → Aplikasi.

   Yang dicatat: urutan event keyboard (keydown, beforeinput, input,
   composition*) dan keadaan singkat teks di editor setelah tiap event.
   Log hanya disimpan di memori dan di perangkat ini (localStorage untuk
   saklar), tidak dikirim ke mana pun. Log BERISI teks yang diketik.

   Tidak mengubah perilaku editor: semua pendengar bersifat pasif. */

const KUNCI_SAKLAR = 'hara.logKetik';
const MAKS_BARIS = 600;

let baris = [];
let terpasang = false;
let merekam = false;

export function logAktif() {
  try { return localStorage.getItem(KUNCI_SAKLAR) === '1'; } catch (e) { return false; }
}

export function setLogAktif(on) {
  try {
    if (on) localStorage.setItem(KUNCI_SAKLAR, '1');
    else localStorage.removeItem(KUNCI_SAKLAR);
  } catch (e) { /* penyimpanan tidak tersedia — log tetap jalan sesi ini */ }
  merekam = !!on;
  if (on) pasang();
}

export function isiLog() {
  return baris.join('\n');
}

export function kosongkanLog() {
  baris = [];
}

function catat(teks) {
  if (!merekam) return;
  const t = new Date().toISOString().slice(11, 23);
  baris.push(t + ' ' + teks);
  if (baris.length > MAKS_BARIS) baris.splice(0, baris.length - MAKS_BARIS);
}

function dalamEditor(node) {
  const d = document.querySelector('.ed-doc');
  return !!(d && node && d.contains(node));
}

function namaNode(n) {
  if (!n) return '-';
  if (n.nodeType === 3) return '#teks';
  return (n.nodeName || '') + (n.className && typeof n.className === 'string' ? '.' + n.className.split(' ')[0] : '');
}

function seleksi() {
  const s = window.getSelection();
  if (!s || !s.rangeCount) return 'tanpa seleksi';
  const r = s.getRangeAt(0);
  const n = r.startContainer;
  const cuplikan = (n.textContent || '').replace(/\u200b/g, '·').slice(0, 14);
  return namaNode(n) + '@' + r.startOffset + (r.collapsed ? '' : '-blok') + ' [' + JSON.stringify(cuplikan) + ']';
}

/* Isi editor yang ringkas: tanpa tombol pegangan dan ikon */
function cuplikanDoc() {
  const d = document.querySelector('.ed-doc');
  if (!d) return '(tanpa .ed-doc)';
  return d.innerHTML
    .replace(/<button[\s\S]*?<\/button>/g, '')
    .replace(/<svg[\s\S]*?<\/svg>/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 240);
}

function pasang() {
  merekam = true;
  if (terpasang) return;
  terpasang = true;
  ['keydown', 'keyup', 'beforeinput', 'input', 'compositionstart', 'compositionupdate', 'compositionend']
    .forEach(nama => {
      document.addEventListener(nama, e => {
        if (!merekam) return;
        const tgt = e.target;
        const dalam = dalamEditor(tgt);
        if (!dalam && nama !== 'keydown' && nama !== 'keyup') return;
        if (!dalam && !dalamEditor(window.getSelection() && window.getSelection().anchorNode)) return;
        let rinci = nama;
        if (e.inputType !== undefined) rinci += ' tipe=' + e.inputType;
        if (e.data !== undefined && e.data !== null) rinci += ' data=' + JSON.stringify(e.data);
        if (e.key !== undefined && (nama === 'keydown' || nama === 'keyup')) rinci += ' tombol=' + JSON.stringify(e.key) + ' kode=' + e.keyCode + ' komposisi=' + e.isComposing;
        rinci += ' sasaran=' + namaNode(tgt) + ' | seleksi=' + seleksi();
        catat(rinci);
        if (nama === 'input' || nama === 'compositionend') setTimeout(() => catat('   editor: ' + cuplikanDoc()), 30);
      }, true);
    });
  document.addEventListener('selectionchange', () => {
    if (!merekam) return;
    const an = window.getSelection() && window.getSelection().anchorNode;
    if (dalamEditor(an)) catat('seleksi berubah: ' + seleksi());
  }, true);
  catat('log aktif. Ketik di catatan, lalu buka Pengaturan → Lihat log.');
}

/* Jendela log: teks bisa dipilih dan disalin dari HP */
export function bukaJendelaLog() {
  let kotak = document.getElementById('log-ketik-jendela');
  if (kotak) kotak.remove();
  kotak = document.createElement('div');
  kotak.id = 'log-ketik-jendela';
  kotak.setAttribute('role', 'dialog');
  kotak.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:12px';
  kotak.innerHTML = `
    <div style="background:var(--card,#fff);color:var(--ink,#111);border-radius:14px;max-width:560px;width:100%;max-height:90vh;display:flex;flex-direction:column;padding:14px;gap:10px">
      <div style="font-weight:600">Log ketik</div>
      <div style="font-size:12px;opacity:.8">Berisi teks yang kamu ketik. Hanya ada di perangkat ini, tidak dikirim.</div>
      <textarea readonly style="flex:1;min-height:200px;font:11px/1.35 monospace;white-space:pre;overflow:auto;padding:8px;border:1px solid #888;border-radius:8px"></textarea>
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
        <button type="button" data-lk="salin" style="padding:8px 12px">Salin</button>
        <button type="button" data-lk="hapus" style="padding:8px 12px">Kosongkan</button>
        <button type="button" data-lk="tutup" style="padding:8px 12px">Tutup</button>
      </div>
      <div data-lk="info" style="font-size:12px;min-height:16px"></div>
    </div>`;
  document.body.appendChild(kotak);
  const area = kotak.querySelector('textarea');
  const info = kotak.querySelector('[data-lk="info"]');
  const muat = () => {
    area.value = isiLog() || '(belum ada catatan — aktifkan log, lalu ketik di catatan)';
    area.scrollTop = area.scrollHeight;
  };
  muat();
  kotak.addEventListener('click', e => {
    const b = e.target.closest('[data-lk]');
    if (!b) { if (e.target === kotak) kotak.remove(); return; }
    const aksi = b.dataset.lk;
    if (aksi === 'tutup') kotak.remove();
    else if (aksi === 'hapus') { kosongkanLog(); muat(); info.textContent = 'Log dikosongkan.'; }
    else if (aksi === 'salin') {
      area.removeAttribute('readonly');
      area.focus(); area.select();
      area.setSelectionRange(0, area.value.length);
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      area.setAttribute('readonly', '');
      info.textContent = ok ? 'Tersalin. Tempel di chat.' : 'Gagal menyalin otomatis. Tekan lama di kotak lalu pilih Salin.';
    }
  });
}

/* Pasang sejak awal kalau saklar sudah aktif */
if (logAktif()) pasang();
