/* Focus timer (C9, Tahap 4) — glue UI.

   • Timer hidup di modul ini, bukan di lembar. Menutup lembar tidak menghentikannya.
   • Saat waktu habis: toast, dan bunyi bila dinyalakan. Timer tidak jalan sendiri ke fase berikutnya.
   • Pengaturan disimpan di localStorage (kunci hara.fokus.v1). Keadaan timer hanya di memori,
     seperti timer tidur di Musik. Muat ulang halaman membuat timer kembali siap.
   • Catatan: saat tab tidak aktif, browser dapat menunda pemeriksaan. Waktu tetap benar karena
     dihitung dari timestamp, tetapi toast dan bunyi bisa terlambat sampai tab aktif lagi. */

import { t as tr } from '../core/i18n.js?v=20261030090000';
import { toast } from '../core/toast.js?v=20261030090000';
import { esc } from '../core/dom.js?v=20261030090000';
import { openPop, closeAll, pop } from './menus/pop.js?v=20261030090000';
import { sheet } from './sheet.js?v=20261030090000';
import {
  normalisasi, keadaanAwal, mulai, jeda, sisa, periksa, terapkanPengaturan,
  bisaDiubah, formatSisa, FOKUS_MAKS, ISTIRAHAT_MAKS, HITUNG_MAKS,
} from './fokus-murni.js?v=20261030090000';

const KUNCI = 'hara.fokus.v1';

function muatPengaturan() {
  try { return normalisasi(JSON.parse(localStorage.getItem(KUNCI))); }
  catch (e) { return normalisasi(null); }
}
function simpanPengaturan() {
  try { localStorage.setItem(KUNCI, JSON.stringify(p)); } catch (e) { /* penyimpanan penuh atau diblokir: timer tetap jalan */ }
}

let p = muatPengaturan();
let k = keadaanAwal(p);
let tik = null;

function fase() {
  if (p.mode === 'hitung') return tr('Hitung mundur');
  return k.fase === 'istirahat' ? tr('Istirahat') : tr('Fokus');
}

function labelStatus() {
  if (k.status === 'jalan') return tr('Berjalan');
  if (k.status === 'jeda') return tr('Dijeda');
  if (k.status === 'selesai') return tr('Selesai');
  return tr('Siap');
}

function mulaiTik() {
  if (tik) return;
  tik = setInterval(periksaWaktu, 500);
}
function hentikanTik() {
  if (tik) clearInterval(tik);
  tik = null;
}

/* Lembar terbuka dan memuat tampilan timer ini? */
function lembarTimerAktif() {
  const el = pop();
  return !!el && el.classList.contains('on') && !!el.querySelector('#ft-waktu');
}

function segarkan() {
  if (!lembarTimerAktif()) return;
  const el = pop();
  el.querySelector('#ft-waktu').textContent = formatSisa(sisa(k, Date.now()));
  el.querySelector('#ft-status').textContent = labelStatus();
  el.querySelector('#ft-fase').textContent = fase() + (p.mode === 'pomodoro' ? ' · ' + tr('Siklus {n}', { n: k.siklus }) : '');
  /* Mulai hanya saat siap, Jeda saat berjalan, Lanjut saat dijeda. Ulang selalu tampil. */
  const tampil = { mulai: k.status === 'siap', jeda: k.status === 'jalan', lanjut: k.status === 'jeda', ulang: true };
  el.querySelectorAll('[data-ft-aksi]').forEach(b => { b.hidden = !tampil[b.dataset.ftAksi]; });
  el.querySelectorAll('[data-ft-mode]').forEach(b => {
    b.setAttribute('aria-pressed', String(b.dataset.ftMode === p.mode));
  });
  el.querySelectorAll('[data-ft-atur]').forEach(i => { i.disabled = !bisaDiubah(k); });
}

function periksaWaktu() {
  const r = periksa(k, p, Date.now());
  k = r.keadaan;
  if (r.selesai) {
    if (p.suara) bunyi();
    toast(r.selesai === 'hitung' ? tr('Hitung mundur selesai.')
      : r.selesai === 'fokus' ? tr('Fokus selesai. Istirahat dulu.')
      : tr('Istirahat selesai. Mulai fokus lagi?'));
  }
  if (k.status !== 'jalan') hentikanTik();
  segarkan();
}

/* Bunyi pendek lewat Web Audio, tanpa berkas. Gagal diam-diam bila tidak tersedia. */
function bunyi() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.65);
    setTimeout(() => ctx.close().catch(() => {}), 800);
  } catch (e) { /* abaikan */ }
}

function isi() {
  const pom = p.mode === 'pomodoro';
  const atur = pom
    ? `<label class="sh-lab" for="ft-f">${tr('Fokus (menit)')}</label>
       <input class="sh-inp" id="ft-f" type="number" inputmode="numeric" min="1" max="${FOKUS_MAKS}" step="1" value="${p.fokusMenit}" data-ft-atur="fokusMenit">
       <label class="sh-lab" for="ft-i">${tr('Istirahat (menit)')}</label>
       <input class="sh-inp" id="ft-i" type="number" inputmode="numeric" min="1" max="${ISTIRAHAT_MAKS}" step="1" value="${p.istirahatMenit}" data-ft-atur="istirahatMenit">`
    : `<label class="sh-lab" for="ft-h">${tr('Durasi (menit)')}</label>
       <input class="sh-inp" id="ft-h" type="number" inputmode="numeric" min="1" max="${HITUNG_MAKS}" step="1" value="${p.hitungMenit}" data-ft-atur="hitungMenit">`;
  return `<div class="ft-wrap">
      <div class="ft-mode" role="group" aria-label="${esc(tr('Mode timer'))}">
        <button type="button" class="ft-pil" data-ft-mode="pomodoro" aria-pressed="${pom}">${tr('Pomodoro')}</button>
        <button type="button" class="ft-pil" data-ft-mode="hitung" aria-pressed="${!pom}">${tr('Hitung mundur')}</button>
      </div>
      <div class="ft-info"><span id="ft-fase"></span> · <span id="ft-status"></span></div>
      <div class="ft-waktu" id="ft-waktu" aria-live="off">${formatSisa(sisa(k, Date.now()))}</div>
      <div class="ft-baris">
        <button type="button" class="btn btn-pri" data-ft-aksi="mulai">${tr('Mulai')}</button>
        <button type="button" class="btn btn-pri" data-ft-aksi="jeda">${tr('Jeda')}</button>
        <button type="button" class="btn btn-pri" data-ft-aksi="lanjut">${tr('Lanjut')}</button>
        <button type="button" class="btn btn-sec" data-ft-aksi="ulang">${tr('Ulang')}</button>
      </div>
      <div class="ft-atur">
        ${atur}
        <label class="ft-cek"><input type="checkbox" data-ft-atur="suara" ${p.suara ? 'checked' : ''}> ${tr('Bunyi saat selesai')}</label>
      </div>
    </div>`;
}

/* Lembar Timer fokus. Dipanggil dari menu Lainnya dan dari palet perintah. */
export function bukaFokus() {
  openPop(sheet({ ikon: 'i-clock', judul: tr('Timer fokus'), catatan: esc(tr('Pomodoro atau hitung mundur. Timer tetap jalan saat lembar ditutup.')), isi: isi(), kelas: 'ft-sh' }), null);
  segarkan();
  if (k.status === 'jalan') mulaiTik();
}

function aksi(a) {
  const now = Date.now();
  if (a === 'mulai' || a === 'lanjut') {
    if (k.status === 'selesai') { toast(tr('Ketuk Ulang dulu untuk memulai lagi.')); return; }
    k = mulai(k, now);
    if (k.status === 'jalan') mulaiTik();
  } else if (a === 'jeda') {
    k = jeda(k, now);
    hentikanTik();
  } else if (a === 'ulang') {
    k = keadaanAwal(p);
    hentikanTik();
  }
  segarkan();
}

function ubahMode(mode) {
  if (!bisaDiubah(k)) { toast(tr('Jeda atau ulang dulu untuk mengubah pengaturan.')); segarkan(); return; }
  p = normalisasi({ ...p, mode });
  simpanPengaturan();
  k = terapkanPengaturan(k, p);
  /* ganti isi lembar supaya kolom durasi sesuai mode */
  const el = pop();
  if (el && el.classList.contains('on')) {
    const w = el.querySelector('.ft-wrap');
    if (w) w.outerHTML = isi();
  }
  segarkan();
}

function ubahAtur(key, nilai) {
  if (!bisaDiubah(k)) {
    toast(tr('Jeda atau ulang dulu untuk mengubah pengaturan.'));
    segarkan();
    return;
  }
  p = normalisasi({ ...p, [key]: nilai });
  simpanPengaturan();
  k = terapkanPengaturan(k, p);
  segarkan();
}

/* Pemasangan sekali, dari app.js. Pakai delegasi di dokumen, karena lembar dibuat ulang. */
let terpasang = false;
export function pasangFokus() {
  if (terpasang) return;
  terpasang = true;

  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-ft-aksi], [data-ft-mode]');
    if (!b || !pop() || !pop().contains(b)) return;
    if (b.dataset.ftAksi) aksi(b.dataset.ftAksi);
    else ubahMode(b.dataset.ftMode);
  });

  document.addEventListener('change', e => {
    const i = e.target;
    if (!i || !i.dataset || !i.dataset.ftAtur || !pop() || !pop().contains(i)) return;
    const key = i.dataset.ftAtur;
    if (key === 'suara') {
      p = normalisasi({ ...p, suara: i.checked });
      simpanPengaturan();
      segarkan();
      return;
    }
    ubahAtur(key, i.value);
    /* nilai yang sudah dipotong/dibulatkan tampil lagi di kolom */
    const kembali = pop().querySelector(`[data-ft-atur="${key}"]`);
    if (kembali && kembali.value !== String(p[key])) kembali.value = p[key];
  });
}
