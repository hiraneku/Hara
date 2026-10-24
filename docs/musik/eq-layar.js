/* Layar Ekualiser (view 'musik-eq'): lima pita, preset, saklar aktif, dan reset.
   Pengaturan bersifat global (satu set untuk semua lagu) dan disimpan lewat eq.js. */

import { cur, go } from '../core/router.js?v=20261024163000';
import { t as tr } from '../core/i18n.js?v=20261024163000';
import * as M from './mesin.js?v=20261024163000';
import * as E from './eq.js?v=20261024163000';
import { EQ_FREKUENSI, EQ_MIN, EQ_MAX, PRESET_EQ, klampEq, labelFrekuensi } from './logika.js?v=20261024163000';
import { ikon } from './ikon.js?v=20261024163000';

export const NAMA_PRESET = { datar: 'Datar', bass: 'Bass', vokal: 'Vokal', terang: 'Terang' };

const samaGain = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
function terapkan(patch) {
  const e = E.ubahEq(patch);
  M.setEq({ aktif: e.aktif, gain: e.gain });
  return e;
}

function presetAktif(e) {
  return Object.keys(PRESET_EQ).find(k => samaGain(PRESET_EQ[k], e.gain)) || null;
}

export function eqView() {
  const e = E.ambilEq();
  const aktifPreset = presetAktif(e);
  const presetHtml = Object.keys(PRESET_EQ).map(k => `<button type="button" class="mus-chip${aktifPreset === k ? ' on' : ''}"
      data-eq="preset" data-nilai="${k}" aria-pressed="${aktifPreset === k}">${tr(NAMA_PRESET[k])}</button>`).join('');
  const pitaHtml = EQ_FREKUENSI.map((hz, i) => `<div class="mus-eq-baris">
      <span class="mus-eq-label">${labelFrekuensi(hz)}</span>
      <input type="range" class="mus-eq-geser" min="${EQ_MIN}" max="${EQ_MAX}" step="1" value="${e.gain[i]}"
        data-eq="band" data-indeks="${i}" aria-label="${tr('Gain')} ${labelFrekuensi(hz)}"${e.aktif ? '' : ' disabled'}>
      <input type="number" class="mus-eq-angka" min="${EQ_MIN}" max="${EQ_MAX}" step="1" value="${e.gain[i]}"
        data-eq="angka" data-indeks="${i}" aria-label="${tr('Nilai dB')} ${labelFrekuensi(hz)}"${e.aktif ? '' : ' disabled'}>
    </div>`).join('');
  return `<div class="mus mus-set" data-mus-root>
    <header class="mus-set-kepala">
      <span class="mus-set-ikon">${ikon('eq')}</span>
      <div><h2 class="mus-set-h">${tr('Ekualiser')}</h2>
      <p class="mus-catatan">${tr('Atur nada tiap rentang. Berlaku untuk semua lagu.')}</p></div>
    </header>
    <section class="mus-kartu mus-set-kartu">
      <div class="mus-baris-saklar">
        <span>${tr('Ekualiser aktif')}</span>
        <button type="button" class="mus-saklar${e.aktif ? ' on' : ''}" role="switch" aria-checked="${e.aktif}" data-eq="aktif">
          <span></span>
        </button>
      </div>
    </section>
    <section class="mus-kartu mus-set-kartu">
      <h3 class="mus-set-judul-bagian">${tr('Preset')}</h3>
      <div class="mus-preset mus-preset-eq">${presetHtml}</div>
    </section>
    <section class="mus-kartu mus-set-kartu">
      <h3 class="mus-set-judul-bagian">${tr('Pita frekuensi')}</h3>
      ${pitaHtml}
      <p class="mus-catatan mus-set-pad">${tr('Rentang −12 sampai +12 dB. Setiap pita bisa digeser atau diisi angka.')}</p>
      <div class="mus-aksi-baris">
        <button type="button" class="mus-tombol" data-eq="reset">${ikon('reset')}<span>${tr('Reset ke datar')}</span></button>
      </div>
    </section>
  </div>`;
}

function aktif() { return cur === 'musik-eq'; }

/* Geser slider / ketik angka: perbarui pita, simpan, terapkan — tanpa render ulang
   supaya geseran tidak terputus. */
function onInput(e) {
  const t = e.target;
  if (!aktif() || !t || !t.dataset) return;
  if (t.dataset.eq !== 'band' && t.dataset.eq !== 'angka') return;
  const i = Number(t.dataset.indeks);
  if (t.dataset.eq === 'angka' && t.value === '') return;
  const v = klampEq(Number(t.value));
  const gain = E.ambilEq().gain.slice();
  gain[i] = v;
  terapkan({ gain });
  const baris = t.closest('.mus-eq-baris');
  if (baris) {
    baris.querySelectorAll('input').forEach(x => { if (x !== t) x.value = String(v); });
  }
  if (t.dataset.eq === 'angka') {
    /* biarkan angka yang diketik apa adanya, tapi slider ikut */
    if (String(v) !== t.value) t.value = String(v);
  }
}

function onClick(e) {
  if (!aktif()) return;
  const b = e.target.closest && e.target.closest('[data-eq]');
  if (!b || b.disabled) return;
  const aksi = b.dataset.eq;
  if (aksi === 'aktif') {
    const e0 = E.ambilEq();
    terapkan({ aktif: !e0.aktif });
  } else if (aksi === 'preset') {
    terapkan({ gain: PRESET_EQ[b.dataset.nilai] || PRESET_EQ.datar });
  } else if (aksi === 'reset') {
    terapkan({ gain: PRESET_EQ.datar, aktif: true });
  } else {
    return;
  }
  go('musik-eq', { segar: true });
}

function onChange(e) {
  const t = e.target;
  if (!aktif() || !t || !t.dataset || t.dataset.eq !== 'angka') return;
  /* angka kosong atau di luar rentang: kembalikan ke nilai tersimpan */
  const e0 = E.ambilEq();
  const i = Number(t.dataset.indeks);
  t.value = String(e0.gain[i]);
}

export function pasangEq() {
  document.addEventListener('click', onClick);
  document.addEventListener('input', onInput);
  document.addEventListener('change', onChange);
}

/* Terapkan EQ tersimpan ke mesin saat aplikasi dibuka (dipanggil dari index.js). */
export function terapkanEqTersimpan() {
  const e = E.ambilEq();
  M.setEq({ aktif: e.aktif, gain: e.gain });
}
