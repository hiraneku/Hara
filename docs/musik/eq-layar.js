/* Layar Ekualiser (view 'musik-eq'): grafik respons, preamp, lebar pita (Q),
   sepuluh pita, preset bawaan dan buatan sendiri, saklar aktif, dan reset.
   Pengaturan bersifat global (satu set untuk semua lagu) dan disimpan lewat eq.js. */

import { cur, go } from '../core/router.js?v=20261025011852';
import { t as tr } from '../core/i18n.js?v=20261025011852';
import { toast } from '../core/toast.js?v=20261025011852';
import { esc } from '../core/dom.js?v=20261025011852';
import * as M from './mesin.js?v=20261025011852';
import * as E from './eq.js?v=20261025011852';
import {
  EQ_FREKUENSI, EQ_MIN, EQ_MAX, EQ_LANGKAH, EQ_Q_MIN, EQ_Q_MAX, EQ_KUSTOM_MAKS, EQ_NAMA_MAKS,
  PRESET_EQ, NAMA_PRESET_EQ, klampEq, klampQ, labelFrekuensi, kurvaEq,
} from './logika.js?v=20261025011852';
import { ikon } from './ikon.js?v=20261025011852';

const GRAF_W = 320, GRAF_H = 150, GRAF_DB = 20;
const GRAF_HZ_MIN = 20, GRAF_HZ_MAX = 20000;

const samaGain = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const fmtDb = v => { const n = Number(Number(v).toFixed(2)); return n > 0 ? `+${n}` : `${n}`; };
const fmtQ = v => v.toFixed(1);

/* Terapkan keadaan EQ ke mesin audio dan simpan. */
function terapkan(patch) {
  const e = E.ubahEq(patch);
  M.setEq({ aktif: e.aktif, gain: e.gain, q: e.q, preamp: e.preamp });
  return e;
}

function presetAktif(e) {
  const bawaan = Object.keys(PRESET_EQ).find(k => samaGain(PRESET_EQ[k], e.gain));
  if (bawaan) return { jenis: 'bawaan', kunci: bawaan };
  const k = e.kustom.findIndex(x => samaGain(x.gain, e.gain));
  return k >= 0 ? { jenis: 'kustom', kunci: k } : null;
}

/* Titik SVG untuk kurva respons. Sumbu X logaritmik (20 Hz–20 kHz), sumbu Y ±20 dB. */
function xGrafik(hz) {
  return (Math.log(hz / GRAF_HZ_MIN) / Math.log(GRAF_HZ_MAX / GRAF_HZ_MIN)) * GRAF_W;
}
function yGrafik(db) {
  const c = Math.max(-GRAF_DB, Math.min(GRAF_DB, db));
  return GRAF_H / 2 - (c / GRAF_DB) * (GRAF_H / 2);
}
function jalurGrafik(e) {
  return kurvaEq(e).map(([hz, db], i) =>
    `${i ? 'L' : 'M'}${xGrafik(hz).toFixed(1)} ${yGrafik(db).toFixed(1)}`).join(' ');
}
function kisiGrafik() {
  const garis = [];
  for (const db of [-20, -10, 0, 10, 20]) {
    const y = yGrafik(db).toFixed(1);
    garis.push(`<line x1="0" x2="${GRAF_W}" y1="${y}" y2="${y}" class="${db === 0 ? 'mus-eq-nol' : 'mus-eq-kisi'}"/>`);
  }
  for (const hz of [100, 1000, 10000]) {
    const x = xGrafik(hz).toFixed(1);
    garis.push(`<line x1="${x}" x2="${x}" y1="0" y2="${GRAF_H}" class="mus-eq-kisi"/>`);
  }
  return garis.join('');
}

function grafikHtml(e) {
  return `<div class="mus-eq-grafik${e.aktif ? '' : ' mati'}">
    <svg viewBox="0 0 ${GRAF_W} ${GRAF_H}" preserveAspectRatio="none" role="img" aria-label="${tr('Grafik respons ekualiser')}">
      ${kisiGrafik()}
      <path class="mus-eq-kurva" d="${jalurGrafik(e)}" data-eq-kurva/>
    </svg>
    <div class="mus-eq-skala"><span>20 Hz</span><span>100</span><span>1k</span><span>10k</span><span>20k</span></div>
  </div>`;
}

function pitaHtml(e) {
  const dis = e.aktif ? '' : ' disabled';
  return EQ_FREKUENSI.map((hz, i) => `<div class="mus-eq-baris">
      <span class="mus-eq-label">${labelFrekuensi(hz)}</span>
      <input type="range" class="mus-eq-geser" min="${EQ_MIN}" max="${EQ_MAX}" step="${EQ_LANGKAH}" value="${e.gain[i]}"
        data-eq="band" data-indeks="${i}" aria-label="${tr('Gain')} ${labelFrekuensi(hz)}"${dis}>
      <input type="number" class="mus-eq-angka" min="${EQ_MIN}" max="${EQ_MAX}" step="${EQ_LANGKAH}" value="${e.gain[i]}"
        data-eq="angka" data-indeks="${i}" aria-label="${tr('Nilai dB')} ${labelFrekuensi(hz)}"${dis}>
      <button type="button" class="mus-ikon-btn mus-ikon-kecil" data-eq="reset-pita" data-indeks="${i}"
        aria-label="${tr('Reset pita')} ${labelFrekuensi(hz)}"${dis}>${ikon('reset')}</button>
    </div>`).join('');
}

function presetHtml(e) {
  const aktif = presetAktif(e);
  const bawaan = Object.keys(PRESET_EQ).map(k => {
    const on = aktif && aktif.jenis === 'bawaan' && aktif.kunci === k;
    return `<button type="button" class="mus-chip${on ? ' on' : ''}" data-eq="preset" data-nilai="${k}" aria-pressed="${on}">${tr(NAMA_PRESET_EQ[k])}</button>`;
  }).join('');
  const kustom = e.kustom.map((x, k) => {
    const on = aktif && aktif.jenis === 'kustom' && aktif.kunci === k;
    return `<span class="mus-chip-grup">
      <button type="button" class="mus-chip${on ? ' on' : ''}" data-eq="kustom" data-indeks="${k}" aria-pressed="${on}">${esc(x.nama)}</button>
      <button type="button" class="mus-chip-hapus" data-eq="hapus-kustom" data-indeks="${k}" aria-label="${tr('Hapus preset')} ${esc(x.nama)}">${ikon('x')}</button>
    </span>`;
  }).join('');
  return `<div class="mus-preset mus-preset-eq">${bawaan}</div>
    ${e.kustom.length ? `<h4 class="mus-eq-sub">${tr('Preset saya')}</h4><div class="mus-preset mus-preset-kustom">${kustom}</div>` : ''}
    <div class="mus-daftar-baru">
      <input type="text" class="mus-teks" maxlength="${EQ_NAMA_MAKS}" placeholder="${tr('Nama preset baru')}" data-eq-input="nama-kustom" aria-label="${tr('Nama preset baru')}">
      <button type="button" class="mus-tombol" data-eq="simpan-kustom">${ikon('plus')}<span>${tr('Simpan')}</span></button>
    </div>
    <p class="mus-catatan mus-set-pad">${tr('Simpan pengaturan sekarang sebagai preset. Maksimal')} ${EQ_KUSTOM_MAKS}.</p>`;
}

export function eqView() {
  const e = E.ambilEq();
  const dis = e.aktif ? '' : ' disabled';
  return `<div class="mus mus-set" data-mus-root>
    <header class="mus-set-kepala">
      <span class="mus-set-ikon">${ikon('eq')}</span>
      <div><h2 class="mus-set-h">${tr('Ekualiser')}</h2>
      <p class="mus-catatan">${tr('Atur nada tiap rentang frekuensi. Berlaku untuk semua lagu.')}</p></div>
    </header>
    <section class="mus-kartu mus-set-kartu">
      <div class="mus-baris-saklar">
        <span>${tr('Ekualiser aktif')}</span>
        <button type="button" class="mus-saklar${e.aktif ? ' on' : ''}" role="switch" aria-checked="${e.aktif}" data-eq="aktif">
          <span></span>
        </button>
      </div>
      ${grafikHtml(e)}
    </section>
    <section class="mus-kartu mus-set-kartu">
      <h3 class="mus-set-judul-bagian">${tr('Pengaturan utama')}</h3>
      <div class="mus-eq-atur">
        <span class="mus-eq-label">${tr('Preamp')}</span>
        <input type="range" class="mus-eq-geser" min="${EQ_MIN}" max="${EQ_MAX}" step="${EQ_LANGKAH}" value="${e.preamp}" data-eq="preamp" aria-label="${tr('Preamp')}"${dis}>
        <input type="number" class="mus-eq-angka" min="${EQ_MIN}" max="${EQ_MAX}" step="${EQ_LANGKAH}" value="${e.preamp}" data-eq="preamp-angka" aria-label="${tr('Nilai preamp')}"${dis}>
      </div>
      <div class="mus-eq-atur">
        <span class="mus-eq-label">${tr('Lebar (Q)')}</span>
        <input type="range" class="mus-eq-geser" min="${EQ_Q_MIN}" max="${EQ_Q_MAX}" step="0.1" value="${e.q}" data-eq="q" aria-label="${tr('Lebar pita Q')}"${dis}>
        <input type="number" class="mus-eq-angka" min="${EQ_Q_MIN}" max="${EQ_Q_MAX}" step="0.1" value="${fmtQ(e.q)}" data-eq="q-angka" aria-label="${tr('Nilai Q')}"${dis}>
      </div>
      <p class="mus-catatan mus-set-pad">${tr('Preamp mengatur volume keseluruhan sebelum pita. Q kecil = pengaruh tiap pita lebih luas dan halus; Q besar = lebih sempit dan tajam.')}</p>
    </section>
    <section class="mus-kartu mus-set-kartu">
      <h3 class="mus-set-judul-bagian">${tr('Preset')}</h3>
      ${presetHtml(e)}
    </section>
    <section class="mus-kartu mus-set-kartu">
      <h3 class="mus-set-judul-bagian">${tr('Pita frekuensi')}</h3>
      ${pitaHtml(e)}
      <p class="mus-catatan mus-set-pad">${tr('Rentang −20 sampai +20 dB, bisa nilai bebas (dua desimal). Geser atau ketik angka. Tombol ↺ mengembalikan satu pita ke 0.')}</p>
      <div class="mus-aksi-baris">
        <button type="button" class="mus-tombol" data-eq="reset">${ikon('reset')}<span>${tr('Reset semua ke datar')}</span></button>
      </div>
    </section>
  </div>`;
}

function aktif() { return cur === 'musik-eq'; }

/* Perbarui kurva dan saudara input (slider ↔ angka) tanpa render ulang,
   supaya geseran tidak terputus. */
function segarGrafik(e) {
  const path = document.querySelector('[data-eq-kurva]');
  if (path) path.setAttribute('d', jalurGrafik(e));
  const g = document.querySelector('.mus-eq-grafik');
  if (g) g.classList.toggle('mati', !e.aktif);
}

function sinkron(t, nilai) {
  const baris = t.closest('.mus-eq-baris, .mus-eq-atur');
  if (!baris) return;
  baris.querySelectorAll('input').forEach(x => { if (x !== t) x.value = String(nilai); });
}

function onInput(e) {
  const t = e.target;
  if (!aktif() || !t || !t.dataset || !t.dataset.eq) return;
  const jenis = t.dataset.eq;
  if (jenis === 'band' || jenis === 'angka') {
    if (t.value === '') return;
    const i = Number(t.dataset.indeks);
    const v = klampEq(Number(t.value));
    const gain = E.ambilEq().gain.slice();
    gain[i] = v;
    const hasil = terapkan({ gain });
    sinkron(t, v);
    segarGrafik(hasil);
  } else if (jenis === 'preamp' || jenis === 'preamp-angka') {
    if (t.value === '') return;
    const v = klampEq(Number(t.value));
    const hasil = terapkan({ preamp: v });
    sinkron(t, v);
    segarGrafik(hasil);
  } else if (jenis === 'q' || jenis === 'q-angka') {
    if (t.value === '') return;
    const v = klampQ(Number(t.value));
    const hasil = terapkan({ q: v });
    sinkron(t, jenis === 'q' ? v : fmtQ(v));
    segarGrafik(hasil);
  }
}

/* Angka yang dikosongkan atau tidak valid dikembalikan ke nilai tersimpan. */
function onChange(e) {
  const t = e.target;
  if (!aktif() || !t || !t.dataset) return;
  const jenis = t.dataset.eq;
  if (!['angka', 'preamp-angka', 'q-angka'].includes(jenis)) return;
  const e0 = E.ambilEq();
  if (jenis === 'angka') t.value = String(e0.gain[Number(t.dataset.indeks)]);
  else if (jenis === 'preamp-angka') t.value = String(e0.preamp);
  else t.value = fmtQ(e0.q);
  sinkron(t, t.value);
}

function onClick(e) {
  if (!aktif()) return;
  const b = e.target.closest && e.target.closest('[data-eq]');
  if (!b || b.disabled) return;
  const aksi = b.dataset.eq;
  const indeks = Number(b.dataset.indeks);
  const e0 = E.ambilEq();
  switch (aksi) {
    case 'aktif':
      terapkan({ aktif: !e0.aktif });
      break;
    case 'preset':
      terapkan({ gain: PRESET_EQ[b.dataset.nilai] || PRESET_EQ.datar });
      break;
    case 'kustom': {
      const p = e0.kustom[indeks];
      if (p) terapkan({ gain: p.gain });
      break;
    }
    case 'simpan-kustom': {
      const input = document.querySelector('[data-eq-input="nama-kustom"]');
      const nama = input ? input.value : '';
      if (!nama.trim()) { toast(tr('Isi nama preset dulu')); return; }
      const baru = !e0.kustom.some(x => x.nama === nama.trim().replace(/\s+/g, ' ').slice(0, EQ_NAMA_MAKS));
      if (!E.simpanKustom(nama)) { toast(tr('Preset saya sudah penuh')); return; }
      toast(tr(baru ? 'Preset disimpan' : 'Preset diperbarui'));
      break;
    }
    case 'hapus-kustom':
      E.hapusKustom(indeks);
      break;
    case 'reset-pita': {
      const gain = e0.gain.slice();
      gain[indeks] = 0;
      terapkan({ gain });
      break;
    }
    case 'reset':
      terapkan({ gain: PRESET_EQ.datar, preamp: 0, q: 1, aktif: true });
      break;
    default:
      return;
  }
  go('musik-eq', { segar: true });
}

export function pasangEq() {
  document.addEventListener('click', onClick);
  document.addEventListener('input', onInput);
  document.addEventListener('change', onChange);
}

/* Terapkan EQ tersimpan ke mesin saat aplikasi dibuka (dipanggil dari index.js). */
export function terapkanEqTersimpan() {
  const e = E.ambilEq();
  M.setEq({ aktif: e.aktif, gain: e.gain, q: e.q, preamp: e.preamp });
}
