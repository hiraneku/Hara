/* Ekspor lagu (tahap 3): WAV atau MP3, 44.100 Hz stereo.
   Urutan sama dengan jalur pemutaran (mesin.js):
     dekode -> tempo & nada (worker, SoundTouch) -> gain volume × preamp
     -> 10 pita peaking -> kompresor (node yang sama dengan pemutar) -> tulis berkas.
   Efek bisa dimatikan; bila mati, suara asli dipakai tanpa penguatan. */

import * as S from './simpan.js?v=20261024200000';
import * as E from './eq.js?v=20261024200000';
import { VOLUME } from './mesin.js?v=20261024200000';
import { SAMPEL_HZ, namaEkspor } from './ekspor-dsp.js?v=20261024200000';
import { EQ_FREKUENSI } from './logika.js?v=20261024200000';

export const KBPS_PILIHAN = [128, 192, 320];
export const FORMAT_PILIHAN = ['wav', 'mp3'];

let pekerja = null;
let urutan = 0;
const menunggu = new Map();

function dapatkanPekerja() {
  if (pekerja) return pekerja;
  pekerja = new Worker(new URL('./ekspor-pekerja.js?v=20261024200000', import.meta.url));
  pekerja.onmessage = (e) => {
    const m = menunggu.get(e.data.id);
    if (!m) return;
    menunggu.delete(e.data.id);
    if (e.data.ok) m.selesai(e.data);
    else m.gagal(new Error(e.data.pesan || 'gagal memproses'));
  };
  pekerja.onerror = (err) => {
    /* Worker rusak: tolak semua permintaan yang sedang menunggu. */
    for (const [id, m] of menunggu) { menunggu.delete(id); m.gagal(new Error('worker ekspor gagal: ' + (err.message || 'tidak diketahui'))); }
    pekerja = null;
  };
  return pekerja;
}

function kirimKePekerja(pesan, transfer = []) {
  const id = ++urutan;
  return new Promise((selesai, gagal) => {
    menunggu.set(id, { selesai, gagal });
    dapatkanPekerja().postMessage({ id, ...pesan }, transfer);
  });
}

/* Dekode berkas ke dua kanal 44.1 kHz. OfflineAudioContext dipakai agar pemutar
   tidak terganggu. */
async function dekodeKeStereo(berkas) {
  const arr = await berkas.arrayBuffer();
  const oc = new OfflineAudioContext(2, 1, SAMPEL_HZ);
  const buf = await oc.decodeAudioData(arr);
  const kiri = buf.getChannelData(0).slice();
  const kanan = buf.numberOfChannels > 1 ? buf.getChannelData(1).slice() : kiri.slice();
  return { L: kiri, R: kanan };
}

/* Parameter efek sama dengan pengaturan pemutar saat ini (eq.js). */
export function parameterEfek() {
  const e = E.ambilEq();
  return {
    gain: VOLUME * Math.pow(10, (e.aktif ? e.preamp : 0) / 20),
    pita: e.aktif ? e.gain.slice() : EQ_FREKUENSI.map(() => 0),
    q: e.q,
  };
}

/* Terapkan efek lewat grafik audio offline: rantai node sama dengan mesin.js. */
export async function terapkanEfek(L, R, { gain, pita, q }) {
  const n = L.length;
  const oc = new OfflineAudioContext(2, n, SAMPEL_HZ);
  const buf = oc.createBuffer(2, n, SAMPEL_HZ);
  buf.copyToChannel(L, 0);
  buf.copyToChannel(R, 1);
  const sumber = oc.createBufferSource();
  sumber.buffer = buf;
  const penguat = oc.createGain();
  penguat.gain.value = gain;
  const eq = EQ_FREKUENSI.map((f, i) => {
    const b = oc.createBiquadFilter();
    b.type = 'peaking';
    b.frequency.value = f;
    b.Q.value = q;
    b.gain.value = pita[i];
    return b;
  });
  const kompres = oc.createDynamicsCompressor();
  kompres.threshold.value = -2;
  kompres.knee.value = 0;
  kompres.ratio.value = 20;
  kompres.attack.value = 0.003;
  kompres.release.value = 0.15;
  sumber.connect(penguat);
  penguat.connect(eq[0]);
  for (let i = 0; i < eq.length - 1; i++) eq[i].connect(eq[i + 1]);
  eq[eq.length - 1].connect(kompres);
  kompres.connect(oc.destination);
  sumber.start(0);
  const keluar = await oc.startRendering();
  return { L: keluar.getChannelData(0).slice(), R: keluar.getChannelData(1).slice() };
}

/* Ekspor satu lagu. opsi: { id, format, kbps, pakaiTempo, pakaiEq, tahap(label) }.
   Mengembalikan { blob, nama, ukuranByte }. */
export async function eksporLagu(opsi) {
  const { id, format = 'wav', kbps = 192, pakaiTempo = true, pakaiEq = true, tahap = () => {} } = opsi;
  const x = S.laguById(id);
  if (!x) throw new Error('lagu tidak ditemukan');
  const berkas = await S.ambilBerkas(id);
  if (!berkas) throw new Error('berkas lagu tidak ada di penyimpanan');

  tahap('dekode');
  let { L, R } = await dekodeKeStereo(berkas);

  const tempo = pakaiTempo ? opsi.tempo ?? 1 : 1;
  const pitch = pakaiTempo ? opsi.pitch ?? 0 : 0;
  if (tempo !== 1 || pitch !== 0) {
    tahap('tempo');
    const hasil = await kirimKePekerja({ op: 'tempo', L, R, tempo, pitch }, [L.buffer, R.buffer]);
    L = hasil.L; R = hasil.R;
  }

  if (pakaiEq) {
    tahap('efek');
    const hasil = await terapkanEfek(L, R, parameterEfek());
    L = hasil.L; R = hasil.R;
  }

  tahap('kode');
  const hasil = await kirimKePekerja({ op: 'kode', L, R, format, kbps: Number(kbps) }, [L.buffer, R.buffer]);
  return { blob: hasil.blob, nama: namaEkspor(x.nama, format), ukuranByte: hasil.blob.size };
}

/* Simpan berkas. Bila platform bisa berbagi berkas, tampilkan lembar berbagi
   (pengguna bisa memilih "Simpan ke berkas"); selainnya unduh lewat tautan. */
export async function simpanBerkas(blob, nama) {
  const berkas = new File([blob], nama, { type: blob.type });
  if (navigator.canShare && navigator.canShare({ files: [berkas] })) {
    try {
      await navigator.share({ files: [berkas], title: nama });
      return 'dibagikan';
    } catch (e) {
      if (e && e.name === 'AbortError') return 'dibatalkan';
      /* gagal berbagi: lanjut ke unduhan biasa */
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nama;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'diunduh';
}
