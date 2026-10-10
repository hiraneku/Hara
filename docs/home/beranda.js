/* Beranda baru: sapaan & tanggal real-time, quote acak, cuaca (Open-Meteo),
   widget musik (UI dulu, pemutar belum dihubungkan), dan bilah alat
   (Catatan & Pengingat). Dipasang sebagai tampilan layar 'home'. */

import { t as tr, bahasaSekarang } from '../core/i18n.js?v=20261010054709';
import { cur, onAfterRender } from '../core/router.js?v=20261010054709';
import { toast } from '../core/toast.js?v=20261010054709';

/* Balikpapan dipakai sebagai lokasi awal. */
const LOKASI = { nama: 'Balikpapan', lat: -1.2379, lon: 116.8529 };
const URL_CUACA = `https://api.open-meteo.com/v1/forecast?latitude=${LOKASI.lat}&longitude=${LOKASI.lon}`
  + '&current=temperature_2m,weather_code,is_day&timezone=Asia%2FMakassar';
const KUNCI_CUACA = 'hara.cuacaTerakhir';
const SEGAR_MS = 15 * 60 * 1000;

const QUOTE = [
  'Hal-hal baik datang bagi mereka yang tetap melangkah.',
  'Setiap hari adalah kesempatan baru untuk menjadi versi terbaik dari diri sendiri.',
  'Jangan lupa istirahat juga penting.',
  'Pelan-pelan juga tetap sampai.',
  'Catat hari ini, ingat esok hari.',
  'Kecil tapi konsisten lebih berarti daripada besar tapi sesekali.',
  'Mulai dari yang kecil, selesaikan satu per satu.',
  'Tenang juga bagian dari produktif.',
  'Hari yang baik dimulai dari pikiran yang lapang.',
  'Yang penting bukan seberapa cepat, tapi tetap berjalan.',
];

/* Kode cuaca WMO -> label & ikon. */
const KODE_CUACA = [
  [[0], 'Cerah', 'sun'],
  [[1, 2], 'Cerah berawan', 'cloud-sun'],
  [[3], 'Berawan', 'cloud'],
  [[45, 48], 'Berkabut', 'fog'],
  [[51, 53, 55, 56, 57], 'Gerimis', 'rain'],
  [[61, 63, 65, 66, 67, 80, 81, 82], 'Hujan', 'rain'],
  [[71, 73, 75, 77, 85, 86], 'Salju', 'snow'],
  [[95, 96, 99], 'Badai petir', 'storm'],
];

const AWAN = 'M7 18h10.5a4 4 0 0 0 .4-8 6 6 0 0 0-11.6 1.8A3.4 3.4 0 0 0 7 18z';
const IKON = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  'cloud-sun': `<path d="${AWAN}"/><circle cx="8" cy="7" r="2.5"/><path d="M8 2v1M3.5 7H3M5 3.6l.6.6M11 3.6l-.6.6"/>`,
  cloud: `<path d="${AWAN}"/>`,
  fog: '<path d="M4 9h16M3 13h18M6 17h12"/>',
  rain: `<path d="${AWAN}"/><path d="M8 20l-1 2M12 20l-1 2M16 20l-1 2"/>`,
  snow: `<path d="${AWAN}"/><path d="M8 21v.01M12 21v.01M16 21v.01"/>`,
  storm: `<path d="${AWAN}"/><path d="M12 15l-2 4h3l-2 4"/>`,
  note: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
  play: '<path d="M7 5v14l12-7z"/>',
  pause: '<path d="M7 5h4v14H7zM13 5h4v14h-4z"/>',
  prev: '<path d="M6 5v14M19 5l-9 7 9 7z"/>',
  next: '<path d="M18 5v14M5 5l9 7-9 7z"/>',
  shuffle: '<path d="M3 7h3c4 0 5 10 9 10h3M3 17h3c2 0 3-2 4-4M14 7c-1 2-2 4-3 5M17 4l3 3-3 3M17 14l3 3-3 3"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  pin: '<path d="M12 21s-6-5.5-6-10a6 6 0 0 1 12 0c0 4.5-6 10-6 10z"/><circle cx="12" cy="11" r="2"/>',
};
const ikon = (nama, kelas = '') =>
  `<svg class="bh-ico ${kelas}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IKON[nama] || ''}</svg>`;

/* ── keadaan ── */
let quoteIdx = Math.floor(Math.random() * QUOTE.length);
let cuaca = null;      // { suhu, kode, siang, waktu }
let cuacaGagal = false;
let musik = { putar: false, suka: false, acak: false };

try { cuaca = JSON.parse(localStorage.getItem(KUNCI_CUACA) || 'null'); } catch { cuaca = null; }

function sapaan(d = new Date()) {
  const j = d.getHours();
  if (j >= 4 && j < 11) return 'Selamat pagi';
  if (j >= 11 && j < 15) return 'Selamat siang';
  if (j >= 15 && j < 18) return 'Selamat sore';
  return 'Selamat malam';
}

function tanggal(d = new Date()) {
  const lok = { id: 'id-ID', en: 'en-US', ja: 'ja-JP' }[bahasaSekarang()] || 'id-ID';
  const s = new Intl.DateTimeFormat(lok, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(d);
  return s.replace(/\./g, '');
}

function infoKode(kode) {
  const hit = KODE_CUACA.find(([daftar]) => daftar.includes(kode));
  return hit ? { label: hit[1], ikon: hit[2] } : { label: 'Tidak diketahui', ikon: 'cloud' };
}

function isiCuaca() {
  if (!cuaca) {
    return { suhu: '--°', label: cuacaGagal ? 'Tidak ada koneksi' : 'Memuat…', ikon: 'cloud' };
  }
  const info = infoKode(cuaca.kode);
  return { suhu: `${cuaca.suhu}°C`, label: info.label, ikon: info.ikon };
}

/* ── tampilan ── */
export function berandaView() {
  const c = isiCuaca();
  const d = new Date();
  return `<div class="beranda">
  <section class="bh-atas">
    <div class="bh-kiri">
      <div class="bh-tgl">${ikon('spark', 'bh-kecil')}<span id="bh-tgl">${tanggal(d)}</span></div>
      <h1 class="bh-sapa"><span id="bh-sapa">${sapaan(d)},</span><br>${tr('Beranda')}</h1>
      <button type="button" class="bh-quote" data-bh="quote" title="${tr('Ketuk untuk quote lain')}">
        <span id="bh-quote">${QUOTE[quoteIdx]}</span></button>
    </div>
    <button type="button" class="bh-cuaca" data-bh="cuaca" title="${tr('Muat ulang cuaca')}">
      <div class="bh-cuaca-utama">${ikon(c.ikon, 'bh-cuaca-ikon')}<span class="bh-suhu" id="bh-suhu">${c.suhu}</span></div>
      <div class="bh-cuaca-label" id="bh-cuaca-label">${c.label}</div>
      <div class="bh-lokasi">${ikon('pin')}<span>${LOKASI.nama}</span></div>
    </button>
  </section>

  <section class="bh-musik" aria-label="${tr('Musik')}">
    <div class="bh-sampul"><img src="./home/aset/cover.jpg" alt="" draggable="false"></div>
    <div class="bh-musik-isi">
      <div class="bh-musik-info">
        <div class="bh-judul">${tr('Contoh lagu')}</div>
        <div class="bh-artis">${tr('Pemutar musik')}</div>
      </div>
      <div class="bh-bar"><div class="bh-bar-isi" style="width:43%"></div></div>
      <div class="bh-waktu"><span>1:42</span><span>3:56</span></div>
      <div class="bh-kontrol">
        <button type="button" class="bh-btn-kecil${musik.acak ? ' on' : ''}" data-bh="acak" aria-label="${tr('Acak')}">${ikon('shuffle')}</button>
        <button type="button" class="bh-btn-kecil" data-bh="prev" aria-label="${tr('Sebelumnya')}">${ikon('prev')}</button>
        <button type="button" class="bh-putar" data-bh="putar" aria-label="${tr('Putar')}" id="bh-putar">${ikon(musik.putar ? 'pause' : 'play')}</button>
        <button type="button" class="bh-btn-kecil" data-bh="next" aria-label="${tr('Berikutnya')}">${ikon('next')}</button>
        <button type="button" class="bh-btn-kecil${musik.suka ? ' on suka' : ''}" data-bh="suka" aria-label="${tr('Suka')}">${ikon('heart')}</button>
      </div>
    </div>
  </section>

  <nav class="bh-alat" aria-label="${tr('Alat')}">
    <button type="button" class="bh-alat-item" data-go="notes">
      <span class="bh-alat-ikon">${ikon('note')}</span><span>${tr('Catatan')}</span></button>
    <button type="button" class="bh-alat-item" data-go="rem">
      <span class="bh-alat-ikon">${ikon('bell')}</span><span>${tr('Pengingat')}</span></button>
  </nav>
</div>`;
}

/* ── pembaruan elemen tanpa render ulang ── */
const el = id => document.getElementById(id);

function segarkanCuacaDOM() {
  const c = isiCuaca();
  const suhu = el('bh-suhu');
  if (!suhu) return;
  suhu.textContent = c.suhu;
  el('bh-cuaca-label').textContent = c.label;
  const ikonEl = document.querySelector('.bh-cuaca-ikon');
  if (ikonEl) ikonEl.outerHTML = ikon(c.ikon, 'bh-cuaca-ikon');
}

function segarkanSapaanDOM() {
  const d = new Date();
  if (el('bh-sapa')) el('bh-sapa').textContent = sapaan(d) + ',';
  if (el('bh-tgl')) el('bh-tgl').textContent = tanggal(d);
}

async function ambilCuaca(paksa = false) {
  if (!paksa && cuaca && Date.now() - cuaca.waktu < SEGAR_MS) return;
  try {
    const r = await fetch(URL_CUACA, { cache: 'no-store' });
    if (!r.ok) throw new Error('http ' + r.status);
    const j = await r.json();
    cuaca = {
      suhu: Math.round(j.current.temperature_2m),
      kode: j.current.weather_code,
      siang: j.current.is_day === 1,
      waktu: Date.now(),
    };
    cuacaGagal = false;
    localStorage.setItem(KUNCI_CUACA, JSON.stringify(cuaca));
  } catch {
    cuacaGagal = true;
  }
  segarkanCuacaDOM();
}

function gantiQuote() {
  let baru = quoteIdx;
  while (baru === quoteIdx && QUOTE.length > 1) baru = Math.floor(Math.random() * QUOTE.length);
  quoteIdx = baru;
  const q = el('bh-quote');
  if (q) q.textContent = QUOTE[quoteIdx];
}

function aksiMusik(a) {
  const putarEl = el('bh-putar');
  if (a === 'putar') {
    musik.putar = !musik.putar;
    if (putarEl) putarEl.innerHTML = ikon(musik.putar ? 'pause' : 'play');
    toast(tr('Pemutar musik menyusul'));
  } else if (a === 'suka') {
    musik.suka = !musik.suka;
    document.querySelector('[data-bh="suka"]')?.classList.toggle('suka', musik.suka);
    document.querySelector('[data-bh="suka"]')?.classList.toggle('on', musik.suka);
  } else if (a === 'acak') {
    musik.acak = !musik.acak;
    document.querySelector('[data-bh="acak"]')?.classList.toggle('on', musik.acak);
  } else {
    toast(tr('Pemutar musik menyusul'));
  }
}

/* ── pemasangan (sekali, dari app.js) ── */
let sudahPasang = false;

export function mulaiBeranda() {
  if (sudahPasang) return;
  sudahPasang = true;

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-bh]');
    if (!b || cur !== 'home') return;
    const a = b.dataset.bh;
    if (a === 'quote') gantiQuote();
    else if (a === 'cuaca') ambilCuaca(true);
    else aksiMusik(a);
  });

  /* Setiap render: sembunyikan judul bar atas di beranda dan segarkan data. */
  onAfterRender(() => {
    document.body.classList.toggle('layar-beranda', cur === 'home');
    if (cur === 'home') { segarkanSapaanDOM(); segarkanCuacaDOM(); ambilCuaca(false); }
  });

  /* unref() hanya ada di Node: dipakai uji agar proses tidak menggantung. Di browser tidak berpengaruh. */
  const jam = setInterval(() => { if (cur === 'home') segarkanSapaanDOM(); }, 30 * 1000);
  const segar = setInterval(() => { if (cur === 'home') ambilCuaca(false); }, SEGAR_MS);
  const awal = setTimeout(() => ambilCuaca(false), 1500);
  [jam, segar, awal].forEach(t => t && typeof t.unref === 'function' && t.unref());
}
