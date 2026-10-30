/* Layar Musik: pemutar penuh dengan sampul asli, seek bar (garis atau gelombang
   sesuai Pengaturan Musik), transport, loop A-B, kontrol tempo & nada, dan
   pustaka lagu. Keadaan audio ada di mesin.js; layar ini hanya menampilkan dan
   meneruskan aksi. */

import { cur, go, onAfterRender } from '../core/router.js?v=20261030090000';
import { esc } from '../core/dom.js?v=20261030090000';
import { t as tr } from '../core/i18n.js?v=20261030090000';
import { toast } from '../core/toast.js?v=20261030090000';
import * as M from './mesin.js?v=20261030090000';
import * as S from './simpan.js?v=20261030090000';
import * as L from './logika.js?v=20261030090000';
import * as A from './aksi.js?v=20261030090000';
import { ikon } from './ikon.js?v=20261030090000';
import { bukaDaftarSemua } from './daftar-layar.js?v=20261030090000';
import { segarSampul } from './sampul-dom.js?v=20261030090000';
import { ambilSet } from './set.js?v=20261030090000';

/* Label tombol mode pemutar (urutan siklus sama dengan logika.js). */
const LABEL_ACAK = {
  mati: 'Shuffle: mati', acak: 'Shuffle', random: 'Random play',
  daftarAcak: 'Randomized playlist', pintar: 'Smart shuffle', acakUlang: 'Shuffle repeat',
};
/* Ikon tiap mode. Tombol hanya berupa ikon; nama mode muncul sebagai pop-up sementara saat diganti. */
const IKON_ACAK = { mati: 'acakOff', acak: 'acak', random: 'random', daftarAcak: 'daftarAcak', pintar: 'pintar', acakUlang: 'acakUlang' };
const IKON_ULANG = { urut: 'urut', satu: 'satu', semua: 'semua', antrean: 'antrean' };
const LABEL_ULANG = { urut: 'Play in order', satu: 'Repeat one', semua: 'Repeat all', antrean: 'Queue' };

const JUMLAH_BAR = 160;
const WARNA_MAIN = '#A9CFA6';
const WARNA_REDUP = 'rgba(243, 242, 236, .22)';

let hapusSiap = null;
let hapusTimer = null;
let seretGel = false;
let seretTerakhir = 0;
let ro = null;
let kunciPustaka = '';

/* Lagu yang ditampilkan + nilai kontrolnya. Kalau lagu belum dimuat di mesin,
   nilai diambil dari pengaturan tersimpan. */
function tampilan() {
  const k = M.keadaan();
  const daftar = S.daftarLagu();
  let sel = k.id ? S.laguById(k.id) : null;
  if (!sel) {
    const tid = S.terakhirId();
    sel = (tid && S.laguById(tid)) || daftar[0] || null;
  }
  if (!sel) {
    return {
      sel: null, daftar, terpasang: false, status: 'kosong', durasi: 0,
      tempo: L.TEMPO_RESET, pitch: 0, loop: { ...L.LOOP_KOSONG }, posisi: 0,
    };
  }
  const terpasang = k.id === sel.id && k.status !== 'kosong';
  if (terpasang) {
    return {
      sel, daftar, terpasang, status: k.status, durasi: k.durasi || sel.durasi || 0,
      tempo: k.tempo, pitch: k.pitch, loop: k.loop, posisi: k.posisi,
    };
  }
  const a = S.aturLagu(sel.id);
  return {
    sel, daftar, terpasang, status: 'jeda', durasi: sel.durasi || 0,
    tempo: a.tempo, pitch: a.pitch, loop: a.loop, posisi: a.posisi,
  };
}

/* Posisi thumb slider dalam persen, untuk warna isian (--p). */
const pRange = (min, max, nilai) => `${Math.max(0, Math.min(100, ((nilai - min) / (max - min)) * 100)).toFixed(2)}%`;

const persenTeks = t => `${Math.round(L.klampTempo(t) * 100)}%`;
const ukuranTeks = b => L.formatUkuran(b);
const eqHtml = '<span class="mus-eq" aria-hidden="true"><i></i><i></i><i></i></span>';
const subLagu = v => (v.status === 'memuat'
  ? tr('Memuat…')
  : `${tr('Tempo')} ${persenTeks(v.tempo)} · ${tr('Nada')} ${L.labelPitch(v.pitch)}`);

/* ── tampilan ── */

/* Seek bar: waveform di atas (seperti pemutar musik pada umumnya) dan bar garis
   dengan knob di bawahnya. Keduanya bisa diketuk dan digeser. */
function gelHtml(v) {
  return `<div class="mus-gel" data-mus-gel role="slider" tabindex="0" aria-label="${tr('Posisi lagu')}"
      aria-valuemin="0" aria-valuemax="${Math.round(v.durasi)}" aria-valuenow="${Math.round(v.posisi)}"
      aria-valuetext="${L.formatWaktu(v.posisi)}">
      <canvas aria-hidden="true"></canvas>
      <span class="mus-band" data-mus-band hidden></span>
      <span class="mus-knob" data-mus-knob aria-hidden="true"></span>
      <span class="mus-tanda" data-mus-tanda="a" hidden><b>A</b></span>
      <span class="mus-tanda" data-mus-tanda="b" hidden><b>B</b></span>
      <span class="mus-jalur" aria-hidden="true"><span class="mus-isi" data-mus-isi></span></span>
      <span class="mus-knob-bulat" data-mus-knob2 aria-hidden="true"></span>
    </div>`;
}

function pemutarHtml(v) {
  if (!v.sel) {
    return `<article class="mus-pemutar mus-pemutar-kosong">
      <div class="mus-sampul-besar mus-sampul-kosong" aria-hidden="true">${ikon('nota')}</div>
      <div class="mus-judul-blok">
        <h2 class="mus-judul">${tr('Belum ada lagu')}</h2>
        <p class="mus-sub">${tr('Impor lagu dari perangkat untuk mulai. Lagu tetap tersimpan di aplikasi.')}</p>
      </div>
      <button type="button" class="mus-tombol-utama" data-mus="impor">${ikon('impor')}<span>${tr('Impor lagu')}</span></button>
    </article>`;
  }
  const putar = v.status === 'putar';
  const memuat = v.status === 'memuat';
  const pa = v.loop.a !== null && v.loop.a !== undefined;
  const pb = v.loop.b !== null && v.loop.b !== undefined;
  return `<article class="mus-pemutar${putar ? ' mus-main' : ''}">
    <div class="mus-sampul-besar" data-sampul-id="${esc(v.sel.id)}" aria-hidden="true"></div>
    <div class="mus-judul-blok">
      <h2 class="mus-judul" data-mus-out="judul">${esc(v.sel.nama)}</h2>
      <p class="mus-sub" data-mus-out="sub">${subLagu(v)}</p>
    </div>
    <div class="mus-gel-blok">
      ${gelHtml(v)}
      <div class="mus-waktu"><span data-mus-out="posisi">${L.formatWaktu(v.posisi)}</span><span data-mus-out="sisa">−${L.formatWaktu(Math.max(0, v.durasi - v.posisi))}</span></div>
    </div>
    <div class="mus-transport">
      <button type="button" class="mus-btn" data-mus="sebelumnya" aria-label="${tr('Sebelumnya')}">${ikon('prev')}</button>
      <button type="button" class="mus-btn" data-mus="mundur" aria-label="${tr('Mundur 10 detik')}">${ikon('mundur')}</button>
      <button type="button" class="mus-play" data-mus="putar" data-mus-out="putar" aria-label="${putar ? tr('Jeda') : tr('Putar')}">${ikon(putar ? 'pause' : 'play')}</button>
      <button type="button" class="mus-btn" data-mus="maju" aria-label="${tr('Maju 10 detik')}">${ikon('maju')}</button>
      <button type="button" class="mus-btn" data-mus="berikutnya" aria-label="${tr('Berikutnya')}">${ikon('next')}</button>
    </div>
    ${modeHtml()}
    <div class="mus-loop" role="group" aria-label="${tr('Loop A-B')}">
      <button type="button" class="mus-chip" data-mus="loop-a">A <span data-mus-out="a">${pa ? L.formatWaktu(v.loop.a) : '–'}</span></button>
      <button type="button" class="mus-chip" data-mus="loop-b">B <span data-mus-out="b">${pb ? L.formatWaktu(v.loop.b) : '–'}</span></button>
      <button type="button" class="mus-chip${pa && pb && v.loop.aktif ? ' on' : ''}" data-mus="loop-on" data-mus-out="loopOn"
        aria-pressed="${!!(pa && pb && v.loop.aktif)}"${pa && pb ? '' : ' disabled'}>${ikon('loop')}<span>${tr('Ulangi A–B')}</span></button>
      <button type="button" class="mus-chip mus-chip-hantu" data-mus="loop-reset" data-mus-out="loopReset"${pa || pb ? '' : ' disabled'}>${tr('Hapus A–B')}</button>
    </div>
  </article>`;
}

/* Tombol mode: acak dan ulang, hanya ikon. Jumlah antrean ditampilkan sebagai lencana kecil. */
function modeHtml() {
  const set = ambilSet();
  const antre = A.antreanLagu().length;
  const lencana = set.ulang === 'antrean' && antre > 0 ? `<b>${antre}</b>` : '';
  return `<div class="mus-mode" role="group" aria-label="${tr('Mode pemutaran')}">
      <button type="button" class="mus-modebtn${set.acak !== 'mati' ? ' on' : ''}" data-mus="acak" aria-label="${tr(LABEL_ACAK[set.acak])}">${ikon(IKON_ACAK[set.acak])}</button>
      <button type="button" class="mus-modebtn${set.ulang !== 'urut' ? ' on' : ''}" data-mus="ulang" aria-label="${tr(LABEL_ULANG[set.ulang])}">${ikon(IKON_ULANG[set.ulang])}${lencana}</button>
    </div>`;
}

function kontrolHtml(v) {
  const dis = v.sel ? '' : ' disabled';
  const tp = Math.round(L.klampTempo(v.tempo) * 100);
  const pTempo = pRange(50, 200, tp);
  const pPitch = pRange(L.PITCH_MIN, L.PITCH_MAX, v.pitch);
  const preset = L.PRESET_TEMPO.map(x => {
    const on = Math.abs(v.tempo - x) < 0.001;
    return `<button type="button" class="mus-chip${on ? ' on' : ''}" data-mus="tempo-preset" data-nilai="${x}" aria-pressed="${on}"${dis}>${Math.round(x * 100)}%</button>`;
  }).join('');
  return `<section class="mus-kartu" aria-labelledby="mus-h-tempo">
    <header class="mus-kartu-kepala">
      <div><h3 id="mus-h-tempo">${tr('Tempo')}</h3><p class="mus-catatan">${tr('Lebih cepat atau lambat, nada tidak berubah')}</p></div>
      <output class="mus-nilai" data-mus-out="tempoNilai">${tp}%</output>
    </header>
    <input type="range" class="mus-range" style="--p:${pTempo}" min="50" max="200" step="1" value="${tp}" data-mus-range="tempo" aria-label="${tr('Tempo')}"${dis}>
    <div class="mus-skala" aria-hidden="true"><span>50%</span><span>100%</span><span>200%</span></div>
    <div class="mus-preset">${preset}</div>
    <button type="button" class="mus-chip mus-chip-hantu mus-chip-lebar" data-mus="tempo-reset"${dis}>${ikon('reset')}<span>${tr('Atur ulang')}</span></button>
  </section>
  <section class="mus-kartu" aria-labelledby="mus-h-nada">
    <header class="mus-kartu-kepala">
      <div><h3 id="mus-h-nada">${tr('Nada')}</h3><p class="mus-catatan">${tr('Naik atau turun semitone, kecepatan tidak berubah')}</p></div>
      <output class="mus-nilai" data-mus-out="pitchNilai">${L.labelPitch(v.pitch)}</output>
    </header>
    <input type="range" class="mus-range" style="--p:${pPitch}" min="${L.PITCH_MIN}" max="${L.PITCH_MAX}" step="${L.PITCH_LANGKAH}" value="${L.angkaPitch(v.pitch)}" data-mus-range="pitch" aria-label="${tr('Nada')}"${dis}>
    <div class="mus-skala" aria-hidden="true"><span>−12</span><span>0</span><span>+12</span></div>
    <div class="mus-nada-baris">
      <button type="button" class="mus-chip mus-chip-kecil" data-mus="pitch-step" data-nilai="-1"${dis} aria-label="${tr('Turun 1 semitone')}">−1</button>
      <button type="button" class="mus-chip mus-chip-kecil" data-mus="pitch-step" data-nilai="-0.01"${dis} aria-label="${tr('Turun 0,01 semitone')}">−0.01</button>
      <input type="text" class="mus-angka" inputmode="decimal" autocomplete="off"
        value="${L.angkaPitch(v.pitch)}" data-mus-num="pitch" aria-label="${tr('Nada (semitone)')}"${dis}>
      <button type="button" class="mus-chip mus-chip-kecil" data-mus="pitch-step" data-nilai="0.01"${dis} aria-label="${tr('Naik 0,01 semitone')}">+0.01</button>
      <button type="button" class="mus-chip mus-chip-kecil" data-mus="pitch-step" data-nilai="1"${dis} aria-label="${tr('Naik 1 semitone')}">+1</button>
    </div>
    <button type="button" class="mus-chip mus-chip-hantu mus-chip-lebar" data-mus="pitch-reset"${dis}>${ikon('reset')}<span>${tr('Atur ulang')}</span></button>
  </section>`;
}

function pustakaHtml(v) {
  const antre = A.antreanLagu();
  const items = v.daftar.map(x => {
    const aktif = v.sel && x.id === v.sel.id;
    const sedang = aktif && v.status === 'putar';
    const dalamAntre = antre.includes(x.id);
    return `<li class="mus-item${aktif ? ' aktif' : ''}">
      <button type="button" class="mus-item-buka" data-mus="pilih" data-id="${esc(x.id)}" aria-current="${aktif ? 'true' : 'false'}">
        <span class="mus-thumb-wrap"><span class="mus-thumb" data-sampul-id="${esc(x.id)}"></span>${sedang ? eqHtml : ''}</span>
        <span class="mus-item-teks">
          <span class="mus-item-judul">${esc(x.nama)}</span>
          <span class="mus-item-sub">${L.formatWaktu(x.durasi)}${x.ukuran ? ` · ${ukuranTeks(x.ukuran)}` : ''}</span>
        </span>
      </button>
      <button type="button" class="mus-item-antre${dalamAntre ? ' on' : ''}" data-mus="antre" data-id="${esc(x.id)}" aria-pressed="${dalamAntre}" aria-label="${tr(dalamAntre ? 'Keluarkan dari antrean' : 'Tambahkan ke antrean')}">
        ${ikon(dalamAntre ? 'check' : 'plus')}
      </button>
      <button type="button" class="mus-item-hapus" data-mus="hapus" data-id="${esc(x.id)}" aria-label="${tr('Hapus lagu')}">
        ${ikon('trash')}<span class="mus-hapus-teks">${tr('Ketuk lagi')}</span>
      </button>
    </li>`;
  }).join('');
  return `<section class="mus-kartu mus-pustaka" aria-labelledby="mus-h-pustaka">
    <header class="mus-kartu-kepala">
      <div><h3 id="mus-h-pustaka">${tr('Pustaka')}</h3><p class="mus-catatan">${v.daftar.length} ${tr('lagu')}</p></div>
      <button type="button" class="mus-tombol" data-mus="impor">${ikon('plus')}<span>${tr('Impor')}</span></button>
    </header>
    ${items
      ? `<ul class="mus-daftar">${items}</ul>`
      : `<p class="mus-kosong-kecil">${tr('Belum ada lagu. Lagu yang sudah diunduh di perangkat juga bisa diimpor.')}</p>`}
  </section>`;
}

export function musikView() {
  const v = tampilan();
  const bisa = M.didukung();
  const peringatan = bisa ? '' : `<p class="mus-peringatan">${tr('Peramban ini tidak mendukung pemutar audio.')}</p>`;
  const latar = v.sel ? `<div class="mus-latar" data-sampul-id="${esc(v.sel.id)}" aria-hidden="true"></div>` : '';
  return `<div class="mus" data-mus-root>
    ${latar}
    <header class="mus-atas">
      <p class="mus-atas-teks">${v.daftar.length} ${tr('lagu di perangkat')}</p>
      <div class="mus-atas-aksi">
        <button type="button" class="mus-ikon-btn" data-mus="impor" aria-label="${tr('Impor lagu')}">${ikon('impor')}</button>
        <button type="button" class="mus-ikon-btn" data-mus="daftar" aria-label="${tr('Daftar putar')}">${ikon('list')}</button>
        <button type="button" class="mus-ikon-btn" data-mus="eq" aria-label="${tr('Efek & Visual')}">${ikon('eq')}</button>
        <button type="button" class="mus-ikon-btn" data-mus="ekspor" aria-label="${tr('Ekspor lagu')}">${ikon('ekspor')}</button>
        <button type="button" class="mus-ikon-btn" data-mus="pengaturan" aria-label="${tr('Pengaturan Musik')}">${ikon('sliders')}</button>
      </div>
    </header>
    ${peringatan}
    <div class="mus-kolom mus-kiri">${pemutarHtml(v)}</div>
    <div class="mus-kolom mus-kanan">${kontrolHtml(v)}${pustakaHtml(v)}</div>
    <input type="file" accept="audio/*,video/webm,.mp3,.m4a,.aac,.wav,.ogg,.oga,.opus,.flac,.webm,.aif,.aiff,.caf,.3gp" multiple class="mus-berkas" data-mus-berkas hidden>
  </div>`;
}

/* ── pembaruan DOM tanpa render ulang ── */

function set(sel, teks) {
  const el = document.querySelector(sel);
  if (el && el.textContent !== teks) el.textContent = teks;
}

function render() {
  if (cur === 'musik') go('musik', { segar: true });
}

/* Dipanggil dari onMesin: lagu baru → render penuh; selainnya cukup perbarui DOM. */
export function segarkanLayar(jenis) {
  if (cur !== 'musik') return;
  const adaDOM = !!document.querySelector('.mus-pemutar:not(.mus-pemutar-kosong)');
  const v = tampilan();
  if (jenis === 'lagu' || adaDOM !== !!v.sel) { render(); return; }
  if (!v.sel) return;

  set('[data-mus-out="judul"]', v.sel.nama);
  set('[data-mus-out="posisi"]', L.formatWaktu(v.posisi));
  set('[data-mus-out="sisa"]', `−${L.formatWaktu(Math.max(0, v.durasi - v.posisi))}`);
  set('[data-mus-out="sub"]', subLagu(v));
  set('[data-mus-out="tempoNilai"]', persenTeks(v.tempo));
  set('[data-mus-out="pitchNilai"]', L.labelPitch(v.pitch));

  const rentang = document.querySelector('[data-mus-range="tempo"]');
  if (rentang && document.activeElement !== rentang) rentang.value = String(Math.round(L.klampTempo(v.tempo) * 100));
  if (rentang) rentang.style.setProperty('--p', pRange(50, 200, Math.round(L.klampTempo(v.tempo) * 100)));
  const rPitch = document.querySelector('[data-mus-range="pitch"]');
  if (rPitch && document.activeElement !== rPitch) rPitch.value = L.angkaPitch(v.pitch);
  if (rPitch) rPitch.style.setProperty('--p', pRange(L.PITCH_MIN, L.PITCH_MAX, v.pitch));
  const angka = document.querySelector('[data-mus-num="pitch"]');
  if (angka && document.activeElement !== angka) angka.value = L.angkaPitch(v.pitch);

  document.querySelectorAll('[data-mus="tempo-preset"]').forEach(b => {
    const on = Math.abs(v.tempo - Number(b.dataset.nilai)) < 0.001;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
  });

  const putar = v.status === 'putar';
  const btn = document.querySelector('[data-mus-out="putar"]');
  if (btn) {
    const ikonBaru = putar ? 'pause' : 'play';
    if (btn.dataset.ikon !== ikonBaru) {
      btn.dataset.ikon = ikonBaru;
      btn.innerHTML = ikon(ikonBaru);
      btn.setAttribute('aria-label', putar ? tr('Jeda') : tr('Putar'));
    }
  }
  document.querySelector('.mus-pemutar')?.classList.toggle('mus-main', putar);

  const pa = v.loop.a !== null && v.loop.a !== undefined;
  const pb = v.loop.b !== null && v.loop.b !== undefined;
  set('[data-mus-out="a"]', pa ? L.formatWaktu(v.loop.a) : '–');
  set('[data-mus-out="b"]', pb ? L.formatWaktu(v.loop.b) : '–');
  const on = document.querySelector('[data-mus-out="loopOn"]');
  if (on) {
    on.disabled = !(pa && pb);
    on.setAttribute('aria-pressed', String(!!(pa && pb && v.loop.aktif)));
    on.classList.toggle('on', !!(pa && pb && v.loop.aktif));
  }
  const reset = document.querySelector('[data-mus-out="loopReset"]');
  if (reset) reset.disabled = !(pa || pb);

  const kunci = `${v.sel.id}|${v.status}|${v.daftar.length}`;
  if (kunci !== kunciPustaka) {
    kunciPustaka = kunci;
    const kartu = document.querySelector('.mus-pustaka');
    if (kartu) {
      kartu.outerHTML = pustakaHtml(v);
      segarSampul(document.querySelector('.mus-pustaka'));
    }
  }

  gambarGel(v);
}

/* Seek bar: posisi, isian, rentang loop, dan penanda A/B. Waveform digambar
   hanya bila gayanya 'gelombang'. */
function gambarGel(v) {
  const g = document.querySelector('[data-mus-gel]');
  if (!g) return;
  const d = v.durasi > 0 ? v.durasi : 0;
  const kemajuan = d > 0 ? Math.min(1, v.posisi / d) : 0;
  const pct = x => `${(x * 100).toFixed(3)}%`;

  const knob = g.querySelector('[data-mus-knob]');
  if (knob) knob.style.left = pct(kemajuan);
  const knob2 = g.querySelector('[data-mus-knob2]');
  if (knob2) knob2.style.left = pct(kemajuan);
  const isi = g.querySelector('[data-mus-isi]');
  if (isi) isi.style.width = pct(kemajuan);

  const adaLoop = v.loop && v.loop.a !== null && v.loop.b !== null && d > 0;
  const band = g.querySelector('[data-mus-band]');
  if (band) {
    band.hidden = !adaLoop;
    if (adaLoop) {
      band.style.left = pct(v.loop.a / d);
      band.style.width = pct((v.loop.b - v.loop.a) / d);
    }
  }
  const tA = g.querySelector('[data-mus-tanda="a"]');
  const tB = g.querySelector('[data-mus-tanda="b"]');
  const adaA = v.loop && v.loop.a !== null && d > 0;
  const adaB = v.loop && v.loop.b !== null && d > 0;
  if (tA) { tA.hidden = !adaA; if (adaA) tA.style.left = pct(v.loop.a / d); }
  if (tB) { tB.hidden = !adaB; if (adaB) tB.style.left = pct(v.loop.b / d); }

  const cv = g.querySelector('canvas');
  if (cv) gambarWaveform(cv, v, kemajuan);

  g.setAttribute('aria-valuenow', String(Math.round(v.posisi)));
  g.setAttribute('aria-valuetext', L.formatWaktu(v.posisi));
}

function gambarWaveform(cv, v, kemajuan) {
  const r = cv.getBoundingClientRect();
  const w = Math.max(1, Math.floor(r.width));
  const h = Math.max(1, Math.floor(r.height));
  const dpr = self.devicePixelRatio || 1;
  if (cv.width !== Math.floor(w * dpr) || cv.height !== Math.floor(h * dpr)) {
    cv.width = Math.floor(w * dpr);
    cv.height = Math.floor(h * dpr);
  }
  const c = cv.getContext('2d');
  if (!c) return;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, w, h);
  const puncak = v.terpasang ? M.puncakAktif(JUMLAH_BAR) : null;
  const bw = w / JUMLAH_BAR;
  for (let i = 0; i < JUMLAH_BAR; i++) {
    const nilai = puncak ? puncak[i] : 0.18;
    const tinggi = Math.max(2, nilai * h * 0.9);
    c.fillStyle = (i + 0.5) / JUMLAH_BAR <= kemajuan ? WARNA_MAIN : WARNA_REDUP;
    c.fillRect(i * bw + bw * 0.22, (h - tinggi) / 2, Math.max(1, bw * 0.56), tinggi);
  }
}

/* ── aksi dari pengguna ── */

/* Pastikan lagu terpilih sudah dimuat di mesin (dijeda), lalu jalankan fn. */
async function siapkanLalu(fn) {
  const v = tampilan();
  if (!v.sel) return;
  const k = M.keadaan();
  /* Lagu ini sedang didekode: tunda aksi sampai siap, jangan dibuang. */
  if (k.id === v.sel.id && k.status === 'memuat') { A.antrikan(v.sel.id, fn); return; }
  if (!v.terpasang) {
    await A.mainkanLagu(v.sel.id, { putar: false });
    if (M.keadaan().id !== v.sel.id) return;   /* sudah pindah lagu */
  }
  if (!M.keadaan().durasi) return;
  fn();
}

async function putarSel() {
  const v = tampilan();
  if (!v.sel) { toast(tr('Belum ada lagu')); return; }
  if (!v.terpasang) { await A.mainkanLagu(v.sel.id); return; }
  await A.togglePutarUtama();
}

function seekDenganMuat(detik) {
  siapkanLalu(() => M.seek(detik));
}

function aturNada(nilai) {
  siapkanLalu(() => M.setPitch(nilai));
}

function hapusDenganDuaKetuk(btn) {
  const id = btn.dataset.id;
  if (hapusSiap !== id) {
    clearTimeout(hapusTimer);
    document.querySelectorAll('.mus-item-hapus.siap').forEach(b => b.classList.remove('siap'));
    hapusSiap = id;
    btn.classList.add('siap');
    hapusTimer = setTimeout(() => {
      hapusSiap = null;
      btn.classList.remove('siap');
    }, 3000);
    return;
  }
  clearTimeout(hapusTimer);
  hapusSiap = null;
  A.hapusLagu(id).then(render);
}

export function pasangLayar() {
  document.addEventListener('click', onClick);
  document.addEventListener('change', onChange);
  document.addEventListener('input', onInput);
  document.addEventListener('pointerdown', onGelDown);
  document.addEventListener('pointermove', onGelMove);
  document.addEventListener('pointerup', onGelUp);
  document.addEventListener('pointercancel', onGelUp);
  document.addEventListener('keydown', onKey);
  onAfterRender(v => { if (v === 'musik') sesudahRender(); });
}

function sesudahRender() {
  const g = document.querySelector('[data-mus-gel]');
  if (ro) ro.disconnect();
  if (g && typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => gambarGel(tampilan()));
    ro.observe(g);
  }
  kunciPustaka = '';
  gambarGel(tampilan());
}

function onClick(e) {
  if (cur !== 'musik') return;
  const b = e.target.closest('[data-mus]');
  if (!b || b.disabled) return;
  const aksi = b.dataset.mus;
  switch (aksi) {
    case 'impor':
      document.querySelector('[data-mus-berkas]')?.click();
      return;
    case 'pengaturan':
      go('musik-set');
      return;
    case 'daftar':
      bukaDaftarSemua();
      go('musik-daftar');
      return;
    case 'eq':
      go('musik-efek');
      return;
    case 'ekspor':
      go('musik-ekspor');
      return;
    case 'putar':
      putarSel();
      return;
    case 'sebelumnya':
      A.gantiLagu(-1);
      return;
    case 'berikutnya':
      A.gantiLagu(1);
      return;
    case 'mundur':
      seekDenganMuat(Math.max(0, tampilan().posisi - 10));
      return;
    case 'maju':
      seekDenganMuat(tampilan().posisi + 10);
      return;
    case 'pilih':
      A.aturAntrean(null);
      A.mainkanLagu(b.dataset.id);
      return;
    case 'acak': {
      const set = ambilSet();
      const nanti = L.berikutnyaDalam(L.MODE_ACAK, set.acak);
      A.aturMode({ acak: nanti });
      toast(tr(LABEL_ACAK[nanti]));
      render();
      return;
    }
    case 'ulang': {
      const set = ambilSet();
      const nanti = L.berikutnyaDalam(L.MODE_ULANG, set.ulang);
      A.aturMode({ ulang: nanti });
      toast(tr(LABEL_ULANG[nanti]));
      render();
      return;
    }
    case 'antre': {
      const masuk = A.toggleAntrean(b.dataset.id);
      toast(tr(masuk ? 'Ditambahkan ke antrean' : 'Dikeluarkan dari antrean'));
      render();
      return;
    }
    case 'hapus':
      hapusDenganDuaKetuk(b);
      return;
    case 'tempo-preset':
      siapkanLalu(() => M.setTempo(Number(b.dataset.nilai)));
      return;
    case 'tempo-reset':
      siapkanLalu(() => M.setTempo(L.TEMPO_RESET));
      return;
    case 'pitch-reset':
      aturNada(0);
      return;
    case 'pitch-step':
      aturNada(L.klampPitch(tampilan().pitch + Number(b.dataset.nilai)));
      return;
    case 'loop-a':
      siapkanLalu(() => M.tandai('a'));
      return;
    case 'loop-b':
      siapkanLalu(() => M.tandai('b'));
      return;
    case 'loop-on': {
      const v = tampilan();
      if (v.loop && v.loop.a !== null && v.loop.b !== null) M.setLoopAktif(!v.loop.aktif);
      return;
    }
    case 'loop-reset':
      siapkanLalu(() => M.resetLoop());
      return;
    default:
  }
}

function onChange(e) {
  const t = e.target;
  if (!t || !t.matches) return;
  if (t.matches('[data-mus-berkas]')) {
    const berkas = Array.from(t.files || []);
    t.value = '';
    A.imporBerkas(berkas).then(render);
    return;
  }
  if (t.matches('[data-mus-num="pitch"]')) {
    const n = parseFloat(String(t.value).replace(',', '.'));
    if (Number.isFinite(n)) aturNada(L.klampPitch(n));
    else t.value = L.angkaPitch(tampilan().pitch);
  }
}

function onInput(e) {
  const t = e.target;
  if (!t || !t.matches || !t.matches('[data-mus-range]')) return;
  const nilai = Number(t.value);
  if (t.dataset.musRange === 'tempo') {
    t.style.setProperty('--p', pRange(50, 200, nilai));
    siapkanLalu(() => M.setTempo(nilai / 100));
  } else {
    t.style.setProperty('--p', pRange(L.PITCH_MIN, L.PITCH_MAX, nilai));
    /* Slider nada: ikut tampilkan angka dua desimal sambil digeser. */
    const k = L.klampPitch(nilai);
    set('[data-mus-out="pitchNilai"]', L.labelPitch(k));
    const angka = document.querySelector('[data-mus-num="pitch"]');
    if (angka && document.activeElement !== angka) angka.value = L.angkaPitch(k);
    aturNada(k);
  }
}

function posisiDariKlik(clientX, g) {
  const r = g.getBoundingClientRect();
  const x = Math.min(1, Math.max(0, (clientX - r.left) / Math.max(1, r.width)));
  const d = tampilan().durasi;
  return x * d;
}

function onGelDown(e) {
  if (cur !== 'musik') return;
  const g = e.target.closest && e.target.closest('[data-mus-gel]');
  if (!g) return;
  seretGel = true;
  try { g.setPointerCapture(e.pointerId); } catch (err) { /* abaikan */ }
  const pos = posisiDariKlik(e.clientX, g);
  seekDenganMuat(pos);
  seretTerakhir = Date.now();
}

function onGelMove(e) {
  if (!seretGel) return;
  const g = document.querySelector('[data-mus-gel]');
  if (!g) return;
  const kini = Date.now();
  if (kini - seretTerakhir < 60) return;   /* batasi seek saat menyeret */
  seretTerakhir = kini;
  if (M.keadaan().durasi) M.seek(posisiDariKlik(e.clientX, g));
}

function onGelUp(e) {
  if (!seretGel) return;
  seretGel = false;
  const g = document.querySelector('[data-mus-gel]');
  if (g && M.keadaan().durasi) M.seek(posisiDariKlik(e.clientX, g));
}

function onKey(e) {
  if (cur !== 'musik') return;
  const t = e.target;
  if (t && t.closest && t.closest('[data-mus-gel]') && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    e.preventDefault();
    const arah = e.key === 'ArrowLeft' ? -5 : 5;
    seekDenganMuat(tampilan().posisi + arah);
    return;
  }
  if (e.key === ' ' && !(t && t.closest && t.closest('input, textarea, button, select, [contenteditable]'))) {
    e.preventDefault();
    putarSel();
  }
}
