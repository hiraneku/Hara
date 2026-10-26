/* Layar "Pengaturan Musik" (view 'musik-set'). Berisi:
   - Sleep timer (waktu, setelah lagu ini, setelah daftar habis), dengan pilihan lanjutan.
   - Crossfade (saklar dan durasi 1–10 detik).
   Pengaturan disimpan lewat set.js; keadaan sleep timer hanya di memori (tidur.js). */

import { cur, go } from '../core/router.js?v=20261026051921';
import { t as tr } from '../core/i18n.js?v=20261026051921';
import { toast } from '../core/toast.js?v=20261026051921';
import * as M from './mesin.js?v=20261026051921';
import * as A from './aksi.js?v=20261026051921';
import * as T from './tidur.js?v=20261026051921';
import { ambilSet, ubahSet } from './set.js?v=20261026051921';
import { ikon } from './ikon.js?v=20261026051921';
import { TIDUR_MODE, TIDUR_PRESET, TIDUR_MENIT_MAKS, CROSSFADE_MIN, CROSSFADE_MAKS } from './logika.js?v=20261026051921';

/* Label singkat agar muat dalam tiga kolom pada layar kecil. */
const LABEL_TIDUR = { waktu: 'Waktu', lagu: 'Lagu ini', daftar: 'Daftar habis' };

function segar() {
  if (cur === 'musik-set') go('musik-set', { segar: true });
}

function keteranganTidur() {
  const ti = T.tidurInfo();
  if (!ti.aktif) return tr('Mati');
  if (ti.mode === 'waktu') return `${tr('Berhenti sekitar pukul')} ${T.jamBerhenti()}`;
  if (ti.mode === 'lagu') return tr('Berhenti setelah lagu ini selesai');
  return `${tr('Berhenti setelah daftar habis')} (${ti.hitung} ${tr('dari')} ${ti.panjang} ${tr('lagu')})`;
}

function kartuTidur(set) {
  const ti = T.tidurInfo();
  const mode = TIDUR_MODE.map(m => `<button type="button" class="mus-pg-opsi${set.tidurMode === m ? ' on' : ''}" data-set="tidur-mode" data-nilai="${m}" aria-pressed="${set.tidurMode === m}">${tr(LABEL_TIDUR[m])}</button>`).join('');
  const lanjutan = set.tidurMode === 'waktu' ? `
    <div class="mus-pg-baris mus-pg-baris-label"><span class="mus-pg-label">${tr('Durasi')}</span><span class="mus-pg-sub">${tr('menit')}</span></div>
    <div class="mus-pg-grid4" role="group" aria-label="${tr('Menit')}">
      ${TIDUR_PRESET.map(m => `<button type="button" class="mus-pg-opsi${set.tidurMenit === m ? ' on' : ''}" data-set="tidur-menit" data-nilai="${m}" aria-pressed="${set.tidurMenit === m}">${m}</button>`).join('')}
    </div>
    <div class="mus-pg-baris">
      <span>${tr('Menit kustom')}</span>
      <span class="mus-pg-input"><input type="number" class="mus-angka" min="1" max="${TIDUR_MENIT_MAKS}" step="1" value="${set.tidurMenit}" data-set-input="tidur-menit" aria-label="${tr('Menit kustom')}"><em>${tr('menit')}</em></span>
    </div>` : '';
  const tombol = ti.aktif
    ? `<button type="button" class="mus-pg-tombol" data-set="tidur-batal">${ikon('x')}<span>${tr('Batalkan timer')}</span></button>`
    : `<button type="button" class="mus-pg-tombol utama" data-set="tidur-mulai">${ikon('play')}<span>${tr('Mulai')}</span></button>`;
  return `<section class="mus-kartu mus-set-kartu mus-pg-kartu">
    <h3 class="mus-pg-judul">${tr('Sleep timer')}</h3>
    <p class="mus-pg-desc${ti.aktif ? ' aktif' : ''}" role="status" data-set-status="tidur">${tr('Status')}: ${keteranganTidur()}</p>
    <div class="mus-pg-baris mus-pg-baris-label"><span class="mus-pg-label">${tr('Berhenti')}</span></div>
    <div class="mus-pg-seg" role="group" aria-label="${tr('Mode sleep timer')}">${mode}</div>
    ${lanjutan}
    ${tombol}
    <p class="mus-pg-desc mus-pg-catatan">${tr('Volume memudar 10 detik sebelum berhenti. Timer bisa tertunda jika aplikasi berjalan di latar.')}</p>
  </section>`;
}

function kartuCrossfade(set) {
  const cf = set.crossfade;
  return `<section class="mus-kartu mus-set-kartu mus-pg-kartu">
    <div class="mus-pg-head">
      <div>
        <h3 class="mus-pg-judul">${tr('Crossfade')}</h3>
        <p class="mus-pg-desc">${tr('Memudarkan audio yang sedang diputar sambil menaikkan volume audio berikutnya agar transisinya halus.')}</p>
      </div>
      <button type="button" class="mus-saklar${cf.aktif ? ' on' : ''}" role="switch" aria-checked="${cf.aktif}" aria-label="${tr('Crossfade')}" data-set="cf-aktif"><span></span></button>
    </div>
    <div class="mus-pg-baris mus-pg-baris-label">
      <span class="mus-pg-label">${tr('Durasi')}</span>
      <output class="mus-pg-nilai" data-set-out="cf-detik">${cf.detik} ${tr('detik')}</output>
    </div>
    <div class="mus-pg-geser${cf.aktif ? '' : ' mati'}">
      <input type="range" class="mus-range" min="${CROSSFADE_MIN}" max="${CROSSFADE_MAKS}" step="1" value="${cf.detik}" data-set-input="cf-detik" aria-label="${tr('Durasi crossfade')}"${cf.aktif ? '' : ' disabled'}>
      <div class="mus-pg-skala"><span>${CROSSFADE_MIN} ${tr('detik')}</span><span>${CROSSFADE_MAKS} ${tr('detik')}</span></div>
    </div>
    <p class="mus-pg-desc mus-pg-catatan">${tr('Berlaku saat pindah ke lagu berikutnya, baik otomatis maupun lewat tombol Berikutnya.')}</p>
  </section>`;
}

export function pengaturanView() {
  const set = ambilSet();
  return `<div class="mus mus-set" data-mus-root>
    <header class="mus-set-kepala">
      <span class="mus-set-ikon">${ikon('sliders')}</span>
      <div><h2 class="mus-set-h">${tr('Pengaturan Musik')}</h2>
      <p class="mus-catatan">${tr('Perilaku pemutar dan tampilan Musik')}</p></div>
    </header>
    <div class="mus-pg">
      ${kartuTidur(set)}
      ${kartuCrossfade(set)}
    </div>
  </div>`;
}

function mulaiTidurDariLayar() {
  const set = ambilSet();
  if (set.tidurMode !== 'waktu' && !M.keadaan().id) {
    toast(tr('Putar lagu dulu, lalu pilih mode ini'));
    return;
  }
  const ok = T.mulaiTidur({ mode: set.tidurMode, menit: set.tidurMenit, panjang: A.jumlahDaftarAktif() });
  if (!ok) toast(tr('Daftar putar kosong'));
}

function onClick(e) {
  if (cur !== 'musik-set') return;
  const b = e.target.closest('[data-set]');
  if (!b || b.disabled) return;
  const set = ambilSet();
  switch (b.dataset.set) {
    case 'tidur-mode':
      ubahSet({ tidurMode: b.dataset.nilai });
      segar();
      return;
    case 'tidur-menit':
      ubahSet({ tidurMenit: Number(b.dataset.nilai) });
      segar();
      return;
    case 'tidur-mulai':
      mulaiTidurDariLayar();
      segar();
      return;
    case 'tidur-batal':
      T.batalTidur();
      segar();
      return;
    case 'cf-aktif':
      ubahSet({ crossfade: { aktif: !set.crossfade.aktif, detik: set.crossfade.detik } });
      A.batalRencana();
      segar();
      return;
    default:
  }
}

function onChange(e) {
  const t = e.target;
  if (!t || !t.matches) return;
  if (t.matches('[data-set-input="tidur-menit"]')) {
    const n = Math.round(Number(t.value));
    if (Number.isFinite(n) && n >= 1) ubahSet({ tidurMenit: Math.min(TIDUR_MENIT_MAKS, n) });
    segar();
    return;
  }
  if (t.matches('[data-set-input="cf-detik"]')) {
    const set = ambilSet();
    ubahSet({ crossfade: { aktif: set.crossfade.aktif, detik: Math.round(Number(t.value)) } });
    segar();
  }
}

function onInput(e) {
  const t = e.target;
  if (t && t.matches && t.matches('[data-set-input="cf-detik"]')) {
    const out = document.querySelector('[data-set-out="cf-detik"]');
    if (out) out.textContent = `${t.value} ${tr('detik')}`;
  }
}

export function pasangPengaturan() {
  document.addEventListener('click', onClick);
  document.addEventListener('change', onChange);
  document.addEventListener('input', onInput);
  T.saatTidurBerubah(segar);
}
