/* Layar Ekspor Lagu (view 'musik-ekspor', induk 'musik'): ekspor lagu yang sedang
   dimuat (atau terakhir dimainkan) sebagai WAV atau MP3, dengan pilihan tempo/nada
   dan ekualiser. Proses berat ada di ekspor.js dan worker-nya. */

import { cur, go } from '../core/router.js?v=20261024220000';
import { t as tr } from '../core/i18n.js?v=20261024220000';
import { toast } from '../core/toast.js?v=20261024220000';
import { esc } from '../core/dom.js?v=20261024220000';
import * as M from './mesin.js?v=20261024220000';
import * as S from './simpan.js?v=20261024220000';
import * as E from './eq.js?v=20261024220000';
import { persenTempo, labelPitch, formatUkuran } from './logika.js?v=20261024220000';
import { ikon } from './ikon.js?v=20261024220000';
import { eksporLagu, simpanBerkas, KBPS_PILIHAN, FORMAT_PILIHAN } from './ekspor.js?v=20261024220000';

const LABEL_TAHAP = {
  dekode: 'Membaca berkas',
  tempo: 'Mengubah tempo dan nada',
  efek: 'Menerapkan ekualiser',
  kode: 'Menulis berkas',
};

/* Keadaan layar. Hasil hanya berlaku untuk lagu `id`; bila lagu berganti, hasil dibuang. */
const st = {
  format: 'wav',
  kbps: 192,
  pakaiTempo: true,
  pakaiEq: true,
  status: 'siap',     /* siap | proses | selesai | gagal */
  tahap: '',
  pesan: '',
  hasil: null,
  id: null,
};

/* Lagu yang diekspor: lagu yang sedang dimuat pemutar, atau yang terakhir dimainkan. */
function laguAktif() {
  const k = M.keadaan();
  const id = k.id && S.laguById(k.id) ? k.id : S.terakhirId();
  return id ? S.laguById(id) : null;
}

/* Tempo dan nada lagu itu. Untuk lagu yang sedang dimuat pakai nilai langsung dari pemutar. */
function aturUntuk(x) {
  const k = M.keadaan();
  if (k.id === x.id) return { tempo: k.tempo, pitch: k.pitch };
  const a = S.aturLagu(x.id);
  return { tempo: a.tempo, pitch: a.pitch };
}

function kepala() {
  return `<header class="mus-set-kepala">
    <span class="mus-set-ikon">${ikon('ekspor')}</span>
    <div><h2 class="mus-set-h">${tr('Ekspor Lagu')}</h2>
    <p class="mus-catatan">${tr('Simpan lagu sebagai file WAV atau MP3.')}</p></div>
  </header>`;
}

function kartuLagu(x) {
  const a = aturUntuk(x);
  const e = E.ambilEq();
  return `<section class="mus-kartu mus-set-kartu">
    <h3 class="mus-set-judul-bagian">${tr('Lagu')}</h3>
    <p class="mus-item-judul">${esc(x.nama)}</p>
    <p class="mus-item-sub">${tr('Tempo')} ${persenTempo(a.tempo)} · ${tr('Nada')} ${labelPitch(a.pitch)} · ${tr('Ekualiser')} ${e.aktif ? tr('aktif') : tr('nonaktif')}</p>
  </section>`;
}

function kartuFormat() {
  const chip = (f, label) => `<button type="button" class="mus-chip${st.format === f ? ' on' : ''}" data-mus-eks="format" data-nilai="${f}" aria-pressed="${st.format === f}">${label}</button>`;
  const bitrate = st.format === 'mp3'
    ? `<h3 class="mus-set-judul-bagian">${tr('Bitrate MP3')}</h3>
       <div class="mus-preset">${KBPS_PILIHAN.map(k => `<button type="button" class="mus-chip${st.kbps === k ? ' on' : ''}" data-mus-eks="kbps" data-nilai="${k}" aria-pressed="${st.kbps === k}">${k} kbps</button>`).join('')}</div>`
    : '';
  const catatan = st.format === 'mp3'
    ? tr('MP3 lebih kecil, dengan sedikit pengurangan kualitas.')
    : tr('WAV tanpa kompresi, tanpa kehilangan kualitas. Sekitar 10 MB per menit.');
  return `<section class="mus-kartu mus-set-kartu">
    <h3 class="mus-set-judul-bagian">${tr('Format')}</h3>
    <div class="mus-preset">${FORMAT_PILIHAN.map(f => chip(f, f.toUpperCase())).join('')}</div>
    ${bitrate}
    <p class="mus-catatan mus-set-pad">${catatan} ${tr('Hasil selalu 44,1 kHz stereo.')}</p>
  </section>`;
}

function saklar(kunci, aktif, judul, catatan) {
  return `<div class="mus-baris-saklar">
    <span>${tr(judul)}</span>
    <button type="button" class="mus-saklar${aktif ? ' on' : ''}" role="switch" aria-checked="${aktif}" data-mus-eks="${kunci}">
      <span></span>
    </button>
  </div>
  <p class="mus-catatan mus-set-pad">${tr(catatan)}</p>`;
}

function kartuEfek() {
  return `<section class="mus-kartu mus-set-kartu">
    <h3 class="mus-set-judul-bagian">${tr('Efek')}</h3>
    ${saklar('tempo', st.pakaiTempo, 'Terapkan tempo dan nada', 'Hasil mengikuti tempo dan nada lagu. Matikan untuk tempo dan nada asli.')}
    ${saklar('eq', st.pakaiEq, 'Terapkan ekualiser dan preamp', 'Hasil mengikuti ekualiser dan preamp, sama seperti saat diputar. Matikan untuk suara asli tanpa penguatan.')}
  </section>`;
}

function kartuAksi(x) {
  const sibuk = st.status === 'proses';
  let isi = '';
  if (st.status === 'proses') {
    isi = `<p class="mus-catatan" role="status" data-mus-eks-tahap>${tr(LABEL_TAHAP[st.tahap] || 'Memproses')}…</p>`;
  } else if (st.status === 'selesai' && st.hasil) {
    isi = `<p class="mus-item-judul" role="status">${esc(st.hasil.nama)}</p>
      <p class="mus-item-sub">${formatUkuran(st.hasil.ukuranByte)}</p>
      <div class="mus-aksi-baris"><button type="button" class="mus-tombol-utama" data-mus-eks="simpan">${ikon('ekspor')}<span>${tr('Simpan berkas')}</span></button></div>`;
  } else if (st.status === 'gagal') {
    isi = `<p class="mus-peringatan" role="alert">${tr('Ekspor gagal')}: ${esc(st.pesan)}</p>`;
  } else {
    isi = `<p class="mus-catatan">${tr('Berkas dibuat di perangkat ini, lalu bisa disimpan lewat menu berbagi atau unduhan.')}</p>`;
  }
  return `<section class="mus-kartu mus-set-kartu">
    <div class="mus-aksi-baris"><button type="button" class="mus-tombol-utama" data-mus-eks="mulai"${sibuk || !x ? ' disabled' : ''}>${ikon('ekspor')}<span>${tr('Ekspor')}</span></button></div>
    ${isi}
  </section>`;
}

export function eksporView() {
  const x = laguAktif();
  jagaLagu(x);
  if (!x) {
    return `<div class="mus mus-set" data-mus-root>${kepala()}
      <section class="mus-kartu mus-set-kartu"><p class="mus-catatan">${tr('Belum ada lagu. Impor atau putar lagu dulu, lalu buka lagi layar ini.')}</p></section>
    </div>`;
  }
  return `<div class="mus mus-set" data-mus-root>
    ${kepala()}
    ${kartuLagu(x)}
    ${kartuFormat()}
    ${kartuEfek()}
    ${kartuAksi(x)}
  </div>`;
}

function segar() {
  if (cur === 'musik-ekspor') go('musik-ekspor', { segar: true });
}

/* Ganti lagu: hasil lama tidak berlaku lagi (proses yang sedang jalan tidak diganggu). */
function jagaLagu(x) {
  if (x && st.id !== x.id && st.status !== 'proses') {
    st.id = x.id;
    st.hasil = null;
    st.status = 'siap';
    st.pesan = '';
  }
}

async function mulai() {
  if (st.status === 'proses') return;
  const x = laguAktif();
  if (!x) return;
  st.id = x.id;
  st.status = 'proses';
  st.tahap = 'dekode';
  st.hasil = null;
  segar();
  try {
    const a = aturUntuk(x);
    const hasil = await eksporLagu({
      id: x.id,
      format: st.format,
      kbps: st.kbps,
      pakaiTempo: st.pakaiTempo,
      pakaiEq: st.pakaiEq,
      tempo: a.tempo,
      pitch: a.pitch,
      tahap: (t) => { st.tahap = t; if (cur === 'musik-ekspor') segarLabel(); },
    });
    if (st.id !== x.id) return; /* lagu sudah diganti selama proses: abaikan hasil */
    st.hasil = hasil;
    st.status = 'selesai';
  } catch (e) {
    st.status = 'gagal';
    st.pesan = String((e && e.message) || e);
  }
  segar();
}

/* Perbarui label tahap saja, tanpa render ulang seluruh layar. */
function segarLabel() {
  const el = document.querySelector('[data-mus-eks-tahap]');
  if (el) el.textContent = `${tr(LABEL_TAHAP[st.tahap] || 'Memproses')}…`;
}

async function simpan() {
  if (!st.hasil) return;
  try {
    const hasil = await simpanBerkas(st.hasil.blob, st.hasil.nama);
    if (hasil === 'diunduh') toast(tr('Berkas diunduh'));
    else if (hasil === 'dibagikan') toast(tr('Berkas dibagikan'));
  } catch (e) {
    toast(tr('Gagal menyimpan berkas'));
  }
}

function onClick(e) {
  if (cur !== 'musik-ekspor') return;
  const b = e.target.closest('[data-mus-eks]');
  if (!b || b.disabled) return;
  const aksi = b.dataset.musEks;
  const reset = () => { st.hasil = null; if (st.status !== 'proses') st.status = 'siap'; };
  switch (aksi) {
    case 'format': st.format = b.dataset.nilai; reset(); segar(); return;
    case 'kbps': st.kbps = Number(b.dataset.nilai); reset(); segar(); return;
    case 'tempo': st.pakaiTempo = !st.pakaiTempo; reset(); segar(); return;
    case 'eq': st.pakaiEq = !st.pakaiEq; reset(); segar(); return;
    case 'mulai': mulai(); return;
    case 'simpan': simpan(); return;
  }
}

export function pasangEkspor() {
  document.addEventListener('click', onClick);
}
