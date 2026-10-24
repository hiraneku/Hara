/* Layar Musik: pemutar penuh (sampul, waveform yang bisa diketuk & digeser,
   transport, loop A-B) di atas, lalu kontrol tempo & nada, dan pustaka lagu.
   Keadaan audio ada di mesin.js; layar ini hanya menampilkan dan meneruskan aksi. */

import { cur, go, onAfterRender } from '../core/router.js?v=20261024040822';
import { esc } from '../core/dom.js?v=20261024040822';
import { t as tr } from '../core/i18n.js?v=20261024040822';
import { toast } from '../core/toast.js?v=20261024040822';
import * as M from './mesin.js?v=20261024040822';
import * as S from './simpan.js?v=20261024040822';
import * as L from './logika.js?v=20261024040822';
import * as A from './aksi.js?v=20261024040822';
import { ikon } from './ikon.js?v=20261024040822';

const JUMLAH_BAR = 180;
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

const persenTeks = t => `${Math.round(t * 100)}%`;
const ukuranTeks = b => (b > 0 ? `${(b / 1048576).toFixed(1)} MB` : '');
const eqHtml = '<span class="mus-eq" aria-hidden="true"><i></i><i></i><i></i></span>';

/* ── tampilan ── */

function pemutarHtml(v) {
  if (!v.sel) {
    return `<article class="mus-pemutar mus-pemutar-kosong">
      <div class="mus-art mus-art-kosong" aria-hidden="true">${ikon('nota')}</div>
      <h2 class="mus-judul">${tr('Belum ada lagu')}</h2>
      <p class="mus-sub">${tr('Impor lagu dari perangkat untuk mulai. Lagu tetap tersimpan di aplikasi.')}</p>
      <button type="button" class="mus-tombol-utama" data-mus="impor">${ikon('impor')}<span>${tr('Impor lagu')}</span></button>
    </article>`;
  }
  const hue = L.hueDariId(v.sel.id);
  const putar = v.status === 'putar';
  const memuat = v.status === 'memuat';
  const sub = memuat ? tr('Memuat…') : `${tr('Tempo')} ${persenTeks(v.tempo)} · ${tr('Nada')} ${L.labelPitch(v.pitch)}`;
  return `<article class="mus-pemutar${putar ? ' mus-main' : ''}">
    <div class="mus-art" style="--hue:${hue}" aria-hidden="true"><span class="mus-art-nota">${ikon('nota')}</span></div>
    <div class="mus-judul-blok">
      <h2 class="mus-judul" data-mus-out="judul">${esc(v.sel.nama)}</h2>
      <p class="mus-sub" data-mus-out="sub">${sub}</p>
    </div>
    <div class="mus-gel" data-mus-gel role="slider" tabindex="0" aria-label="${tr('Posisi lagu')}"
      aria-valuemin="0" aria-valuemax="${Math.round(v.durasi)}" aria-valuenow="${Math.round(v.posisi)}"
      aria-valuetext="${L.formatWaktu(v.posisi)}">
      <canvas aria-hidden="true"></canvas>
      <span class="mus-tanda" data-mus-tanda="a" hidden><b>A</b></span>
      <span class="mus-tanda" data-mus-tanda="b" hidden><b>B</b></span>
    </div>
    <div class="mus-waktu"><span data-mus-out="posisi">${L.formatWaktu(v.posisi)}</span><span>${L.formatWaktu(v.durasi)}</span></div>
    <div class="mus-transport">
      <button type="button" class="mus-btn" data-mus="mundur" aria-label="${tr('Mundur 10 detik')}">${ikon('mundur')}</button>
      <button type="button" class="mus-btn" data-mus="sebelumnya" aria-label="${tr('Sebelumnya')}">${ikon('prev')}</button>
      <button type="button" class="mus-play" data-mus="putar" data-mus-out="putar" aria-label="${putar ? tr('Jeda') : tr('Putar')}">${ikon(putar ? 'pause' : 'play')}</button>
      <button type="button" class="mus-btn" data-mus="berikutnya" aria-label="${tr('Berikutnya')}">${ikon('next')}</button>
      <button type="button" class="mus-btn" data-mus="maju" aria-label="${tr('Maju 10 detik')}">${ikon('maju')}</button>
    </div>
    <div class="mus-loop" role="group" aria-label="${tr('Loop A-B')}">
      <button type="button" class="mus-chip" data-mus="loop-a" data-mus-out="loopA">A <span data-mus-out="a">–</span></button>
      <button type="button" class="mus-chip" data-mus="loop-b" data-mus-out="loopB">B <span data-mus-out="b">–</span></button>
      <button type="button" class="mus-chip" data-mus="loop-on" data-mus-out="loopOn" aria-pressed="false">${ikon('loop')}<span>${tr('Ulangi A–B')}</span></button>
      <button type="button" class="mus-chip mus-chip-hantu" data-mus="loop-reset" data-mus-out="loopReset">${tr('Hapus A–B')}</button>
    </div>
  </article>`;
}

function kontrolHtml(v) {
  const dis = v.sel ? '' : ' disabled';
  const tp = Math.round(v.tempo * 100);
  const preset = L.PRESET_TEMPO.map(x => {
    const on = Math.abs(v.tempo - x) < 0.001;
    return `<button type="button" class="mus-chip${on ? ' on' : ''}" data-mus="tempo-preset" data-nilai="${x}" aria-pressed="${on}"${dis}>${x}×</button>`;
  }).join('');
  return `<section class="mus-kartu" aria-labelledby="mus-h-tempo">
    <header class="mus-kartu-kepala">
      <div><h3 id="mus-h-tempo">${tr('Tempo')}</h3><p class="mus-catatan">${tr('Lebih cepat atau lambat, nada tidak berubah')}</p></div>
      <output class="mus-nilai" data-mus-out="tempoNilai">${tp}%</output>
    </header>
    <input type="range" class="mus-range" min="50" max="200" step="1" value="${tp}" data-mus-range="tempo" aria-label="${tr('Tempo')}"${dis}>
    <div class="mus-skala" aria-hidden="true"><span>50%</span><span>100%</span><span>200%</span></div>
    <div class="mus-baris">${preset}
      <button type="button" class="mus-chip mus-chip-hantu" data-mus="tempo-reset"${dis}>${ikon('reset')}<span>${tr('Atur ulang')}</span></button>
    </div>
  </section>
  <section class="mus-kartu" aria-labelledby="mus-h-nada">
    <header class="mus-kartu-kepala">
      <div><h3 id="mus-h-nada">${tr('Nada')}</h3><p class="mus-catatan">${tr('Naik atau turun semitone, kecepatan tidak berubah')}</p></div>
      <output class="mus-nilai" data-mus-out="pitchNilai">${L.labelPitch(v.pitch)}</output>
    </header>
    <input type="range" class="mus-range" min="-12" max="12" step="1" value="${v.pitch}" data-mus-range="pitch" aria-label="${tr('Nada')}"${dis}>
    <div class="mus-skala" aria-hidden="true"><span>−12</span><span>0</span><span>+12</span></div>
    <div class="mus-baris">
      <button type="button" class="mus-chip mus-chip-hantu" data-mus="pitch-reset"${dis}>${ikon('reset')}<span>${tr('Atur ulang')}</span></button>
    </div>
  </section>`;
}

function pustakaHtml(v) {
  const items = v.daftar.map(x => {
    const aktif = v.sel && x.id === v.sel.id;
    const sedang = aktif && v.status === 'putar';
    return `<li class="mus-item${aktif ? ' aktif' : ''}">
      <button type="button" class="mus-item-buka" data-mus="pilih" data-id="${esc(x.id)}" aria-current="${aktif ? 'true' : 'false'}">
        <span class="mus-thumb" style="--hue:${L.hueDariId(x.id)}">${sedang ? eqHtml : ikon('nota')}</span>
        <span class="mus-item-teks">
          <span class="mus-item-judul">${esc(x.nama)}</span>
          <span class="mus-item-sub">${L.formatWaktu(x.durasi)}${x.ukuran ? ` · ${ukuranTeks(x.ukuran)}` : ''}</span>
        </span>
      </button>
      <button type="button" class="mus-item-hapus" data-mus="hapus" data-id="${esc(x.id)}" aria-label="${tr('Hapus lagu')}">
        ${ikon('trash')}<span class="mus-hapus-teks">${tr('Ketuk lagi')}</span>
      </button>
    </li>`;
  }).join('');
  return `<section class="mus-kartu mus-pustaka" aria-labelledby="mus-h-pustaka">
    <header class="mus-kartu-kepala">
      <div><h3 id="mus-h-pustaka">${tr('Pustaka')}</h3><p class="mus-catatan">${v.daftar.length} ${tr('lagu')}</p></div>
      <button type="button" class="mus-tombol" data-mus="impor">${ikon('impor')}<span>${tr('Impor')}</span></button>
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
  return `<div class="mus" data-mus-root>
    ${peringatan}
    <div class="mus-kolom mus-kiri">${pemutarHtml(v)}</div>
    <div class="mus-kolom mus-kanan">${kontrolHtml(v)}${pustakaHtml(v)}</div>
    <input type="file" accept="audio/*" multiple class="mus-berkas" data-mus-berkas hidden>
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
  set('[data-mus-out="sub"]', v.status === 'memuat'
    ? tr('Memuat…')
    : `${tr('Tempo')} ${persenTeks(v.tempo)} · ${tr('Nada')} ${L.labelPitch(v.pitch)}`);
  set('[data-mus-out="tempoNilai"]', persenTeks(v.tempo));
  set('[data-mus-out="pitchNilai"]', L.labelPitch(v.pitch));

  const rentang = document.querySelector('[data-mus-range="tempo"]');
  if (rentang && document.activeElement !== rentang) rentang.value = String(Math.round(v.tempo * 100));
  const rPitch = document.querySelector('[data-mus-range="pitch"]');
  if (rPitch && document.activeElement !== rPitch) rPitch.value = String(v.pitch);

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
    if (kartu) kartu.outerHTML = pustakaHtml(v);
  }

  gambarGelombang(v);
}

function gambarGelombang(v) {
  const g = document.querySelector('[data-mus-gel]');
  if (!g) return;
  const cv = g.querySelector('canvas');
  const r = g.getBoundingClientRect();
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
  const d = v.durasi > 0 ? v.durasi : 0;
  const kemajuan = d > 0 ? Math.min(1, v.posisi / d) : 0;
  const bw = w / JUMLAH_BAR;

  /* Rentang loop A-B diberi latar tipis. */
  if (v.loop && v.loop.a !== null && v.loop.b !== null && d > 0) {
    c.fillStyle = 'rgba(169, 207, 166, .12)';
    const x1 = (v.loop.a / d) * w, x2 = (v.loop.b / d) * w;
    c.fillRect(x1, 0, x2 - x1, h);
  }

  for (let i = 0; i < JUMLAH_BAR; i++) {
    const nilai = puncak ? puncak[i] : 0.18;
    const tinggi = Math.max(2, nilai * h * 0.92);
    const x = i * bw + bw * 0.2;
    c.fillStyle = (i + 0.5) / JUMLAH_BAR <= kemajuan ? WARNA_MAIN : WARNA_REDUP;
    c.fillRect(x, (h - tinggi) / 2, Math.max(1, bw * 0.6), tinggi);
  }

  /* Penanda A & B. */
  const tA = g.querySelector('[data-mus-tanda="a"]');
  const tB = g.querySelector('[data-mus-tanda="b"]');
  const ada = v.loop && v.loop.a !== null && d > 0;
  if (tA) { tA.hidden = !ada; if (ada) tA.style.left = `${(v.loop.a / d) * 100}%`; }
  const adaB = v.loop && v.loop.b !== null && d > 0;
  if (tB) { tB.hidden = !adaB; if (adaB) tB.style.left = `${(v.loop.b / d) * 100}%`; }
  g.setAttribute('aria-valuenow', String(Math.round(v.posisi)));
  g.setAttribute('aria-valuetext', L.formatWaktu(v.posisi));
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
    ro = new ResizeObserver(() => gambarGelombang(tampilan()));
    ro.observe(g);
  }
  kunciPustaka = '';
  gambarGelombang(tampilan());
}

function onClick(e) {
  if (cur !== 'musik') return;
  const b = e.target.closest('[data-mus]');
  if (!b) return;
  const aksi = b.dataset.mus;
  switch (aksi) {
    case 'impor':
      document.querySelector('[data-mus-berkas]')?.click();
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
      A.mainkanLagu(b.dataset.id);
      return;
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
      siapkanLalu(() => M.setPitch(0));
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
  if (!t || !t.matches || !t.matches('[data-mus-berkas]')) return;
  const berkas = Array.from(t.files || []);
  t.value = '';
  A.imporBerkas(berkas).then(render);
}

function onInput(e) {
  const t = e.target;
  if (!t || !t.matches || !t.matches('[data-mus-range]')) return;
  const nilai = Number(t.value);
  if (t.dataset.musRange === 'tempo') {
    siapkanLalu(() => M.setTempo(nilai / 100));
  } else {
    siapkanLalu(() => M.setPitch(nilai));
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
