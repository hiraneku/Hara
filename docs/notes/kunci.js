/* Kunci catatan per-catatan (Bagian D19).

   PIN 1–4 digit mengunci CATATAN (bukan seluruh aplikasi). Yang dikunci
   adalah akses antarmuka: judul, cuplikan, dan isi tidak dirender sama
   sekali selama catatan terkunci. PIN disimpan sebagai hash (SHA-256 +
   garam) — tidak pernah polos.

   Bila lupa PIN: verifikasi memakai sidik jari/face PERANGKAT lewat
   WebAuthn (platform authenticator) — bukan sidik jari di dalam
   aplikasi; sistem perangkat yang memverifikasi. Registrasi dilakukan
   saat PIN dibuat (kalau perangkat mendukung).

   Catatan jujur: ini kunci akses, bukan enkripsi. Data tetap tersimpan
   seperti biasa (format lama tidak diubah); yang dikunci hanya akses
   lewat antarmuka aplikasi.

   Modul ini hanya mengimpor inti (store/dom/toast/router) — popup
   dimuat dinamis supaya tidak ada lingkaran impor (row/tags → kunci →
   menus/pop → bar/render → menus/tag → tags). */

import { state } from '../core/store.js?v=20260910030412';
import { toast } from '../core/toast.js?v=20260910030412';
import { go, cur } from '../core/router.js?v=20260910030412';
import { t as tr } from '../core/i18n.js?v=20260910030412';

const KEY_REG = 'hara.v1.kunci';
const KEY_FP = 'hara.v1.kunci.fp';      /* credential sidik jari per catatan */

function bacaPeta() {
  try {
    const raw = localStorage.getItem(KEY_REG);
    const o = raw ? JSON.parse(raw) : {};
    return (o && typeof o === 'object') ? o : {};
  } catch (e) { return {}; }
}
function tulisPeta(peta) {
  try { localStorage.setItem(KEY_REG, JSON.stringify(peta)); } catch (e) {}
}

/* kunci sesi: catatan yang sudah dibuka benar di sesi ini — tidak
   diminta PIN lagi sampai aplikasi dimuat ulang */
const sesiTerbuka = new Set();

const acak = n => {
  const b = new Uint8Array(n);
  try { crypto.getRandomValues(b); } catch (e) { for (let i = 0; i < n; i++) b[i] = (Math.random() * 255) | 0; }
  return [...b].map(x => x.toString(16).padStart(2, '0')).join('');
};

/* hash deterministik (SHA-256 bila tersedia, kalau tidak fallback ringan) */
async function hash(pin, garam) {
  const teks = garam + '|' + pin;
  try {
    if (crypto && crypto.subtle) {
      const data = new TextEncoder().encode(teks);
      const buf = await crypto.subtle.digest('SHA-256', data);
      return [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) { /* lanjut fallback */ }
  let h1 = 5381, h2 = 52711;
  for (let i = 0; i < teks.length; i++) {
    const c = teks.charCodeAt(i);
    h1 = (h1 * 33) ^ c; h2 = (h2 * 31) ^ c;
  }
  return (h1 >>> 0).toString(16) + (h2 >>> 0).toString(16);
}

/* apakah catatan punya kunci terpasang */
export const punyaKunci = n =>
  !!(n && n.id) && Object.prototype.hasOwnProperty.call(bacaPeta(), n.id);

export function bukaSesi(id) { sesiTerbuka.add(id); }
export const terbukaSesi = id => sesiTerbuka.has(id);

/* Tutup sesi (semua catatan, atau satu id) — catatan terkunci kembali
   buta dan PIN diminta lagi. Dipakai pengujian; tidak ada tombol di
   antarmuka karena memuat ulang aplikasi efeknya sama. */
export function resetSesi(id) {
  if (id) sesiTerbuka.delete(id);
  else sesiTerbuka.clear();
}

/* terkunci AKTIF = ada kunci & belum dibuka di sesi ini */
export const terkunciAktif = n =>
  punyaKunci(n) && !terbukaSesi(n.id);

/* layak dilihat isinya oleh agregasi publik (daftar to-do, tag, cari):
   tak terkunci, atau kuncinya sudah dibuka di sesi ini */
export const terlihat = n => !punyaKunci(n) || terbukaSesi(n.id);

export async function pasangKunci(id, pin) {
  const valid = /^\d{1,4}$/.test(String(pin || ''));
  if (!valid) return false;
  const garam = acak(8);
  const h = await hash(String(pin), garam);
  const peta = bacaPeta();
  peta[id] = { s: garam, h };
  tulisPeta(peta);
  return true;
}

export async function cocokPin(id, pin) {
  const peta = bacaPeta();
  const k = peta[id];
  if (!k) return false;
  const h = await hash(String(pin || ''), k.s || '');
  return h === k.h;
}

export function lepasKunci(id) {
  const peta = bacaPeta();
  if (peta[id]) { delete peta[id]; tulisPeta(peta); }
  hapusCred(id);
}

/* ═══ sidik jari perangkat (WebAuthn platform) ═══ */
export const sidikDidukung = () =>
  !!(window.PublicKeyCredential && navigator && navigator.credentials &&
     window.isSecureContext !== false);

function b64url(buf) {
  let s = '';
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function dariB64url(s) {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  const u = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
  return u;
}
const credKunci = id => 'hara:' + id;

export function credTerdaftar(id) {
  try {
    const raw = localStorage.getItem(KEY_FP);
    const o = raw ? JSON.parse(raw) : {};
    return (o && typeof o === 'object' && o[credKunci(id)]) || null;
  } catch (e) { return null; }
}
function simpanCred(id, cred) {
  try {
    const raw = localStorage.getItem(KEY_FP);
    const o = raw ? JSON.parse(raw) : {};
    o[credKunci(id)] = cred;
    localStorage.setItem(KEY_FP, JSON.stringify(o));
  } catch (e) {}
}
function hapusCred(id) {
  try {
    const raw = localStorage.getItem(KEY_FP);
    const o = raw ? JSON.parse(raw) : {};
    delete o[credKunci(id)];
    localStorage.setItem(KEY_FP, JSON.stringify(o));
  } catch (e) {}
}

function tantangan() {
  const c = new Uint8Array(32);
  try { crypto.getRandomValues(c); } catch (e) { for (let i = 0; i < 32; i++) c[i] = (Math.random() * 255) | 0; }
  return c;
}

/* Daftarkan authenticator perangkat utk satu catatan. */
export async function daftarSidik(id) {
  if (!sidikDidukung()) return false;
  try {
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge: tantangan(),
        rp: { name: 'Hara' },
        user: {
          id: new TextEncoder().encode('hara-catatan-' + id),
          name: 'catatan-hara',
          displayName: 'Catatan Hara',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 90000,
      },
    });
    if (cred && cred.rawId) {
      simpanCred(id, b64url(cred.rawId));
      return true;
    }
  } catch (e) { /* dibatalkan / tidak didukung */ }
  return false;
}

/* Minta verifikasi sidik jari perangkat utk catatan terkunci. */
export async function cobaSidik(id) {
  const cred = credTerdaftar(id);
  if (!sidikDidukung() || !cred) return false;
  try {
    await navigator.credentials.get({
      publicKey: {
        challenge: tantangan(),
        allowCredentials: [{ type: 'public-key', id: dariB64url(cred) }],
        userVerification: 'required',
        timeout: 90000,
      },
    });
    return true;
  } catch (e) {
    return false;
  }
}

/* ═══ UI ═══ */

/* Layar penuh saat mencoba membuka catatan terkunci (route 'kunci'). */
export const layarKunciView = () => {
  const n = state.notes.find(x => x.id === state.openId);
  if (!n)
    return `<div class="page"><div class="empty"><h3>${tr('Catatan tidak ada')}</h3>
      <p>${tr('Mungkin sudah dihapus.')}</p>
      <button type="button" class="btn btn-sec" data-go="notes">${tr('Ke daftar catatan')}</button></div></div>`;
  const adaFp = credTerdaftar(state.openId);
  return `<div class="lk-page">
    <div class="lk-kartu">
      <div class="lk-ikon"><svg class="ico"><use href="#i-lock"/></svg></div>
      <h2>${tr('Catatan terkunci')}</h2>
      <p class="lk-sub">${tr('Masukkan PIN untuk membuka catatan ini.')}</p>
      <div class="lk-pin" data-lk-pin>
        <span class="lk-dot"></span><span class="lk-dot"></span>
        <span class="lk-dot"></span><span class="lk-dot"></span>
        <input class="lk-in" inputmode="numeric" pattern="[0-9]*" maxlength="4"
          autocomplete="off" aria-label="${tr('PIN catatan')}" autocapitalize="off"
          spellcheck="false" data-lk-in>
      </div>
      <p class="lk-salah" data-lk-salah hidden>${tr('PIN salah — coba lagi.')}</p>
      <div class="lk-tombol">
        <button type="button" class="btn btn-pri lk-buka" data-lk-buka>${tr('Buka')}</button>
        ${adaFp ? `<button type="button" class="btn btn-sec lk-fp" data-lk-fp>
          <svg class="ico"><use href="#i-finger"/></svg>${tr('Sidik jari')}</button>` : ''}
      </div>
      ${adaFp
        ? `<button type="button" class="lk-lupa" data-lk-lupa>${tr('Lupa PIN? Buka dengan sidik jari perangkat')}</button>`
        : `<p class="lk-lupa-note">${tr('Lupa PIN? Tanpa sidik jari perangkat tidak ada jalan pintas — catatan ini tetap bisa dihapus dari daftar bila perlu.')}</p>`}
      <p class="lk-info">${tr('Hanya catatan ini yang dikunci — catatan lain tetap terbuka.')}</p>
    </div>
  </div>`;
};

/* Panel popup: pasang PIN baru (dari menu ··· catatan). */
export async function panelPasangPin(anchor) {
  const { openPop } = await import('./menus/pop.js?v=20260910030412');
  const n = state.notes.find(x => x.id === state.openId);
  if (!n) return;
  const dukung = sidikDidukung();
  const jangkar = anchor || document.getElementById('dots') ||
    document.querySelector('.ed-doc') || document.body;
  openPop(`<div class="pop-h">${tr('Kunci catatan')}</div>
    <p class="pop-note">${tr('Catatan ini akan disembunyikan dan hanya bisa dibuka dengan PIN 1–4 digit.')}</p>
    <label class="pin-lbl" for="pp1">${tr('PIN baru (1–4 digit)')}</label>
    <input id="pp1" class="pin-in" type="password" inputmode="numeric" pattern="[0-9]*"
      maxlength="4" autocomplete="new-password" placeholder="••••">
    <label class="pin-lbl" for="pp2">${tr('Ulangi PIN')}</label>
    <input id="pp2" class="pin-in" type="password" inputmode="numeric" pattern="[0-9]*"
      maxlength="4" autocomplete="new-password" placeholder="••••">
    ${dukung ? `<label class="pin-cb"><input type="checkbox" data-fp-on checked>
      <span>${tr('Izinkan sidik jari perangkat bila lupa PIN')}</span></label>` : ''}
    <div class="pin-err" data-pin-err></div>
    <button type="button" class="btn btn-pri" style="width:100%;justify-content:center"
      data-pin-simpan>${tr('Kunci catatan')}</button>`, jangkar);
  const a = document.getElementById('pp1');
  if (a) { a.focus(); a.select(); }
}

/* Panel popup: kelola kunci (saat catatan terbuka di sesi ini). */
export async function panelKelolaKunci(anchor) {
  const { openPop } = await import('./menus/pop.js?v=20260910030412');
  const n = state.notes.find(x => x.id === state.openId);
  if (!n) return;
  const adaFp = credTerdaftar(n.id);
  const jangkar = anchor || document.getElementById('dots') || document.body;
  openPop(`<div class="pop-h">${tr('Kunci catatan')}</div>
    <p class="pop-note">${tr('Catatan ini terkunci PIN. Setelah aplikasi dimuat ulang, PIN diminta lagi.')}</p>
    <button type="button" class="pop-i" data-kk-ganti>
      <svg class="ico"><use href="#i-lock"/></svg>${tr('Ganti PIN')}</button>
    <button type="button" class="pop-i" data-kk-lepas>
      <svg class="ico"><use href="#i-unlock"/></svg>${tr('Buka kunci catatan')}</button>
    <p class="pop-note">${adaFp ? tr('Sidik jari perangkat terdaftar untuk pemulihan.') :
      tr('Sidik jari perangkat belum terdaftar — simpan PIN baik-baik.')}</p>`,
    jangkar);
}

/* Panel verifikasi (PIN / sidik jari) sebelum ganti/lepas kunci. */
async function panelVerifikasi(id, mode, anchor) {
  const { openPop } = await import('./menus/pop.js?v=20260910030412');
  const adaFp = credTerdaftar(id);
  const judul = mode === 'ganti' ? tr('Ganti PIN') : tr('Buka kunci catatan');
  const jangkar = anchor || document.getElementById('dots') ||
    document.querySelector('.ed-doc') || document.body;
  openPop(`<div class="pop-h">${judul}</div>
    <p class="pop-note">${tr('Verifikasi dulu dengan PIN atau sidik jari perangkat.')}</p>
    <label class="pin-lbl" for="pv">${tr('PIN saat ini')}</label>
    <input id="pv" class="pin-in" type="password" inputmode="numeric" pattern="[0-9]*"
      maxlength="4" autocomplete="current-password" placeholder="••••">
    ${adaFp ? `<button type="button" class="btn btn-sec" style="width:100%;justify-content:center;margin-bottom:8px" data-pv-fp>
      <svg class="ico"><use href="#i-finger"/></svg>${tr('Sidik jari')}</button>` : ''}
    <div class="pin-err" data-pin-err></div>
    <button type="button" class="btn btn-pri" style="width:100%;justify-content:center"
      data-pv-ok>${tr('Verifikasi')}</button>`, jangkar);
  const a = document.getElementById('pv');
  if (a) { a.focus(); a.select(); }
  verifKontek = { id, mode };
}

/* Panel: tetapkan PIN baru setelah verifikasi berhasil (ganti / lupa). */
async function panelPinBaru(id, judul, keterangan, jangkar) {
  const { openPop } = await import('./menus/pop.js?v=20260910030412');
  openPop(`<div class="pop-h">${judul}</div>
    ${keterangan ? `<p class="pop-note">${keterangan}</p>` : ''}
    <label class="pin-lbl" for="pg1">${tr('PIN baru (1–4 digit)')}</label>
    <input id="pg1" class="pin-in" type="password" inputmode="numeric" pattern="[0-9]*"
      maxlength="4" autocomplete="new-password" placeholder="••••">
    <label class="pin-lbl" for="pg2">${tr('Ulangi PIN')}</label>
    <input id="pg2" class="pin-in" type="password" inputmode="numeric" pattern="[0-9]*"
      maxlength="4" autocomplete="new-password" placeholder="••••">
    <div class="pin-err" data-pin-err></div>
    <button type="button" class="btn btn-pri" style="width:100%;justify-content:center"
      data-pg-simpan>${tr('Simpan PIN baru')}</button>`, jangkar);
  gantiKontek = id;
  const a = document.getElementById('pg1');
  if (a) { a.focus(); a.select(); }
}

let verifKontek = null;     /* { id, mode } — tombol verifikasi */
let gantiKontek = null;     /* id — popup PIN baru sedang menunggu */

export function bindKunci() {
  document.addEventListener('click', e => {
    const diLayarKunci = cur === 'kunci';

    /* ── layar kunci: buka dengan PIN / sidik jari / lupa PIN ── */
    const lk = e.target.closest('[data-lk-buka],[data-lk-fp],[data-lk-lupa]');
    if (lk && diLayarKunci) {
      if (lk.hasAttribute('data-lk-buka')) cobaBukaPin();
      else if (lk.hasAttribute('data-lk-fp')) cobaBukaFp();
      else if (lk.hasAttribute('data-lk-lupa')) alurLupaPin(lk);
      return;
    }

    /* ── panel pasang PIN (menu ···) ── */
    if (e.target.closest('[data-pin-simpan]')) { pasangDariPanel(); return; }

    /* ── panel kelola: ganti / lepas ──
       Jangkar pindah ke tombol ··· header: tombol asal akan dibuang
       saat isi popup diganti, sehingga rect-nya tidak bisa dipakai. */
    const ganti = e.target.closest('[data-kk-ganti]');
    if (ganti) {
      const n = catatanBuka();
      if (n) panelVerifikasi(n.id, 'ganti', jangkarDots());
      return;
    }
    const lepas = e.target.closest('[data-kk-lepas]');
    if (lepas) {
      const n = catatanBuka();
      if (n) panelVerifikasi(n.id, 'lepas', jangkarDots());
      return;
    }
    /* tombol verifikasi (PIN / sidik jari) */
    if (e.target.closest('[data-pv-fp]') && verifKontek) { verifSidik(verifKontek); return; }
    if (e.target.closest('[data-pv-ok]') && verifKontek) { verifPinPanel(verifKontek); return; }
    /* simpan PIN baru (dari ganti / lupa) */
    if (e.target.closest('[data-pg-simpan]')) { simpanPinBaru(); return; }
  });

  document.addEventListener('input', e => {
    const t = e.target;
    if (!t || !t.matches) return;
    if (t.matches('[data-lk-in]')) {
      const v = (t.value || '').replace(/\D/g, '').slice(0, 4);
      if (t.value !== v) t.value = v;
      isiDots(t);
      return;
    }
    if (t.matches('.pin-in')) {
      const v = (t.value || '').replace(/\D/g, '').slice(0, 4);
      if (t.value !== v) t.value = v;
      const p = t.closest('#pop');
      const err = p && p.querySelector('[data-pin-err]');
      if (err) err.textContent = '';
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || !e.target || !e.target.matches) return;
    const el = e.target;
    if (el.matches('[data-lk-in]')) { e.preventDefault(); cobaBukaPin(); }
    else if (el.matches('.pin-in')) {
      e.preventDefault();
      if (gantiKontek) simpanPinBaru();
      else if (verifKontek) verifPinPanel(verifKontek);
      else pasangDariPanel();
    }
  });
}

function catatanBuka() {
  return state.notes.find(x => x.id === state.openId);
}

function jangkarDots() {
  return document.getElementById('dots') || document.querySelector('.ed-doc') ||
    document.body;
}

function isiDots(inp) {
  const wadah = inp.closest('[data-lk-pin]');
  if (!wadah) return;
  const v = inp.value || '';
  wadah.querySelectorAll('.lk-dot').forEach((d, i) => d.classList.toggle('on', i < v.length));
  const salah = inp.closest('.lk-kartu') && inp.closest('.lk-kartu').querySelector('[data-lk-salah]');
  if (salah) salah.hidden = true;
}

/* buka dari layar kunci memakai PIN */
async function cobaBukaPin() {
  const inp = document.querySelector('[data-lk-in]');
  if (!inp) return;
  const id = state.openId;
  const ok = await cocokPin(id, inp.value);
  if (!ok) {
    inp.value = '';
    isiDots(inp);
    const salah = document.querySelector('[data-lk-salah]');
    if (salah) salah.hidden = false;
    getarKunci();
    return;
  }
  bukaSesi(id);
  go('editor');
  toast(tr('Catatan dibuka'));
}

async function cobaBukaFp() {
  const id = state.openId;
  const ok = await cobaSidik(id);
  if (!ok) { toast(tr('Sidik jari tidak cocok / dibatalkan')); return; }
  bukaSesi(id);
  go('editor');
  toast(tr('Catatan dibuka'));
}

/* alur lupa PIN: verifikasi sidik jari → langsung minta PIN baru */
async function alurLupaPin(jangkar) {
  const id = state.openId;
  toast(tr('Verifikasi sidik jari perangkat…'));
  const ok = await cobaSidik(id);
  if (!ok) { toast(tr('Verifikasi gagal / dibatalkan')); return; }
  panelPinBaru(id, 'PIN baru',
    tr('Identitas perangkat sudah terverifikasi. Tetapkan PIN baru untuk catatan ini.'),
    jangkar || document.querySelector('.lk-buka') || document.body);
}

async function pasangDariPanel() {
  const { closeAll } = await import('./menus/pop.js?v=20260910030412');
  const p = document.getElementById('pop');
  const a1 = p && p.querySelector('#pp1');
  const a2 = p && p.querySelector('#pp2');
  if (!a1 || !a2) return;
  const pin1 = a1.value, pin2 = a2.value;
  const err = p.querySelector('[data-pin-err]');
  const gagal = m => { if (err) err.textContent = m; getarKunci(); };
  if (!/^\d{1,4}$/.test(pin1)) return gagal(tr('PIN harus 1–4 digit angka.'));
  if (pin1 !== pin2) return gagal(tr('PIN tidak sama — ketik ulang.'));
  const n = catatanBuka();
  if (!n) return;
  const dukungFp = p.querySelector('[data-fp-on]');
  const mauFp = !dukungFp || dukungFp.checked;
  await pasangKunci(n.id, pin1);
  if (mauFp && sidikDidukung() && !credTerdaftar(n.id)) {
    toast(tr('Sentuh sidik jari perangkat untuk pemulihan…'));
    const okFp = await daftarSidik(n.id);
    if (!okFp && !credTerdaftar(n.id))
      toast(tr('Sidik jari tidak terdaftar — simpan PIN baik-baik'));
  }
  closeAll();
  bukaSesi(n.id);
  toast(tr('Catatan dikunci'));
}

/* verifikasi (panel kelola) dengan PIN */
async function verifPinPanel(k) {
  const { closeAll } = await import('./menus/pop.js?v=20260910030412');
  const p = document.getElementById('pop');
  const inp = p && p.querySelector('#pv');
  const err = p && p.querySelector('[data-pin-err]');
  if (!inp) return;
  const ok = await cocokPin(k.id, inp.value);
  if (!ok) { if (err) err.textContent = tr('PIN salah.'); getarKunci(); return; }
  verifKontek = null;
  closeAll();
  if (k.mode === 'lepas') {
    lepasKunci(k.id);
    toast(tr('Kunci catatan dilepas'));
  } else {
    panelPinBaru(k.id, 'Ganti PIN', '', document.getElementById('dots') || document.body);
  }
}

/* verifikasi (panel kelola) dengan sidik jari */
async function verifSidik(k) {
  const { closeAll } = await import('./menus/pop.js?v=20260910030412');
  toast(tr('Verifikasi sidik jari perangkat…'));
  const ok = await cobaSidik(k.id);
  if (!ok) { toast(tr('Sidik jari tidak cocok / dibatalkan')); return; }
  verifKontek = null;
  closeAll();
  if (k.mode === 'lepas') {
    lepasKunci(k.id);
    toast(tr('Kunci catatan dilepas'));
  } else {
    panelPinBaru(k.id, 'Ganti PIN', '', document.getElementById('dots') || document.body);
  }
}

/* simpan PIN baru dari popup (ganti PIN / lupa PIN) */
async function simpanPinBaru() {
  const { closeAll } = await import('./menus/pop.js?v=20260910030412');
  const p = document.getElementById('pop');
  const a1 = p && p.querySelector('#pg1');
  const a2 = p && p.querySelector('#pg2');
  if (!a1 || !a2) return;
  const pin1 = a1.value, pin2 = a2.value;
  const err = p.querySelector('[data-pin-err]');
  const gagal = m => { if (err) err.textContent = m; getarKunci(); };
  if (!/^\d{1,4}$/.test(pin1)) return gagal(tr('PIN harus 1–4 digit angka.'));
  if (pin1 !== pin2) return gagal(tr('PIN tidak sama — ketik ulang.'));
  const id = gantiKontek;
  gantiKontek = null;
  if (!id) return;
  await pasangKunci(id, pin1);
  closeAll();
  toast(tr('PIN diperbarui'));
  if (cur === 'kunci') { bukaSesi(id); go('editor'); toast(tr('Catatan dibuka')); }
}

function getarKunci() {
  try { if (navigator.vibrate) navigator.vibrate(60); } catch (e) {}
}

/* ditekan dari app.js: panel sesuai keadaan catatan */
export async function panelKunciCatatan(anchor) {
  const n = catatanBuka();
  if (!n) return;
  if (punyaKunci(n)) await panelKelolaKunci(anchor);
  else await panelPasangPin(anchor);
}
