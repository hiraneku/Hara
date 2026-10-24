/* Rantai efek pemutar (Web Audio). Dipasang di antara ekualiser dan kompresor:
   ekualiser -> [efek aktif, berurutan] -> kompresor.
   Efek yang mati tidak dibangun sama sekali (tidak memakan CPU). Efek dibangun saat
   diaktifkan dan semua node-nya dilepas saat dimatikan.
   Catatan: hanya untuk pemutaran. Ekspor tidak memakai modul ini.
   Belum diuji di perangkat: butuh AudioContext sungguhan. */

import { EFEK, IR_RUANG } from './efek-data.js?v=20261024235959';

const RAMP = 0.05; // detik, untuk perubahan parameter halus
/* Web Audio menyatakan Q lowpass/highpass dalam dB, bukan angka linear.
   -3.0103 dB = Q linear 0.707 = Butterworth (tanpa puncak). Q 0 dB (linear 1) sudah
   berpuncak; di dalam loop umpan balik puncak itu membuat loop gain melewati 1 dan energi naik terus. */
const Q_BUTTER = -3.0103;
let segera = false; // true saat penerapan pertama instans baru: nilai langsung, tanpa transisi
const IR_CACHE = new WeakMap(); // AudioContext -> Map(idRuang -> Promise<AudioBuffer>)

function atur(param, nilai, c) {
  if (segera) param.value = nilai;
  else param.setTargetAtTime(nilai, c.currentTime, RAMP);
}

/* Wadah node: semua node dicatat supaya bisa dilepas bersamaan. */
function penampung() {
  const pool = [];
  const reg = node => { pool.push(node); return node; };
  return { reg, pool };
}

/* Pelebar stereo mid/side. w = 1 identik dengan masukan, 0 = mono.
   hpHz: frekuensi di bawah yang sisi (side) dibuang, supaya bass tetap di tengah. */
function buatLebar(c, reg) {
  const sp = reg(c.createChannelSplitter(2));
  const mg = reg(c.createChannelMerger(2));
  const tengah = reg(c.createGain());
  const kiriKeTengah = reg(c.createGain()); kiriKeTengah.gain.value = 0.5;
  const kananKeTengah = reg(c.createGain()); kananKeTengah.gain.value = 0.5;
  const sisi = reg(c.createGain());
  const kiriKeSisi = reg(c.createGain()); kiriKeSisi.gain.value = 0.5;
  const kananKeSisi = reg(c.createGain()); kananKeSisi.gain.value = -0.5;
  const hp = reg(c.createBiquadFilter()); hp.type = 'highpass'; hp.frequency.value = 10; hp.Q.value = Q_BUTTER;
  const w = reg(c.createGain()); w.gain.value = 1;
  const negasi = reg(c.createGain()); negasi.gain.value = -1;
  const outL = reg(c.createGain());
  const outR = reg(c.createGain());

  sp.connect(kiriKeTengah, 0); sp.connect(kananKeTengah, 1);
  kiriKeTengah.connect(tengah); kananKeTengah.connect(tengah);
  tengah.connect(outL); tengah.connect(outR);

  sp.connect(kiriKeSisi, 0); sp.connect(kananKeSisi, 1);
  kiriKeSisi.connect(sisi); kananKeSisi.connect(sisi);
  sisi.connect(hp); hp.connect(w);
  w.connect(outL); w.connect(negasi); negasi.connect(outR);

  outL.connect(mg, 0, 0); outR.connect(mg, 0, 1);
  return {
    in: sp,
    out: mg,
    atur(nilaiW, hzBass) {
      atur(w.gain, nilaiW, c);
      atur(hp.frequency, Math.max(10, hzBass), c);
    },
  };
}

/* Allpass Schroeder: memecah pantulan menjadi gema yang lebih padat. */
function buatAllpass(c, reg, detik, g) {
  const masuk = reg(c.createGain());
  const jumlah = reg(c.createGain());
  const d = reg(c.createDelay(0.1)); d.delayTime.value = detik;
  const fb = reg(c.createGain()); fb.gain.value = g;
  const negasi = reg(c.createGain()); negasi.gain.value = -g;
  const keluar = reg(c.createGain());
  // w = x + g * d ; y = d - g * w
  masuk.connect(jumlah); jumlah.connect(d); d.connect(fb); fb.connect(jumlah);
  jumlah.connect(negasi); negasi.connect(keluar); d.connect(keluar);
  return { in: masuk, out: keluar };
}

/* REVERB: algoritmik (empat comb feedback + dua allpass), wet dan lebar stereo. */
const COMB_MS = [29.7, 37.1, 41.1, 43.7];

function bangunReverb(c, { reg }) {
  const masuk = reg(c.createGain());
  const keluar = reg(c.createGain());
  const kering = reg(c.createGain()); kering.gain.value = 1;
  masuk.connect(kering); kering.connect(keluar);

  const pre = reg(c.createDelay(1));
  const hp = reg(c.createBiquadFilter()); hp.type = 'highpass'; hp.Q.value = Q_BUTTER;
  masuk.connect(pre); pre.connect(hp);

  const jumlahKiri = reg(c.createGain()); jumlahKiri.gain.value = 0.25;
  const jumlahKanan = reg(c.createGain()); jumlahKanan.gain.value = 0.25;
  const combs = COMB_MS.map((ms, i) => {
    const inG = reg(c.createGain());
    const d = reg(c.createDelay(0.2));
    const lp = reg(c.createBiquadFilter()); lp.type = 'lowpass'; lp.Q.value = Q_BUTTER;
    const fb = reg(c.createGain());
    hp.connect(inG); inG.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d);
    lp.connect(i % 2 === 0 ? jumlahKiri : jumlahKanan);
    return { d, lp, fb, ms };
  });

  const apKiri = buatAllpass(c, reg, 0.0050, 0.5);
  const apKanan = buatAllpass(c, reg, 0.0043, 0.5);
  jumlahKiri.connect(apKiri.in);
  jumlahKanan.connect(apKanan.in);

  const mg = reg(c.createChannelMerger(2));
  apKiri.out.connect(mg, 0, 0); apKanan.out.connect(mg, 0, 1);
  const lebar = buatLebar(c, reg);
  mg.connect(lebar.in);
  const wet = reg(c.createGain());
  lebar.out.connect(wet); wet.connect(keluar);

  return {
    in: masuk,
    out: keluar,
    atur(p) {
      const skala = 0.4 + 1.1 * (p.ukuran / 100);
      const T = p.peluruhan;
      const potong = 20000 * Math.pow(0.1, p.damping / 100);
      atur(pre.delayTime, p.predelay / 1000, c);
      atur(hp.frequency, Math.max(10, p.cutLow), c);
      for (const cb of combs) {
        const dt = (cb.ms / 1000) * skala;
        atur(cb.d.delayTime, dt, c);
        atur(cb.fb.gain, Math.pow(10, (-3 * dt) / T), c);
        atur(cb.lp.frequency, potong, c);
      }
      atur(wet.gain, (p.wet / 100) * 0.6, c);
      lebar.atur(p.lebar / 100, 0);
    },
  };
}

/* ECHO dan DELAY: satu mesin (dua saluran delay, umpan balik, filter, ping-pong).
   Perbedaannya hanya di cara parameter dipetakan. */
function bangunGema(c, { reg }, pemetaan) {
  const masuk = reg(c.createGain());
  const keluar = reg(c.createGain());
  const kering = reg(c.createGain()); kering.gain.value = 1;
  masuk.connect(kering); kering.connect(keluar);

  const sp = reg(c.createChannelSplitter(2));
  const mg = reg(c.createChannelMerger(2));
  masuk.connect(sp);
  const dL = reg(c.createDelay(2.5));
  const dR = reg(c.createDelay(2.5));
  const inL = reg(c.createGain()); const inR = reg(c.createGain());
  sp.connect(inL, 0); sp.connect(inR, 1);
  inL.connect(dL); inR.connect(dR);

  const lpL = reg(c.createBiquadFilter()); lpL.type = 'lowpass'; lpL.Q.value = Q_BUTTER;
  const lpR = reg(c.createBiquadFilter()); lpR.type = 'lowpass'; lpR.Q.value = Q_BUTTER;
  dL.connect(lpL); dR.connect(lpR);

  const fbSendiriL = reg(c.createGain()); const fbSendiriR = reg(c.createGain());
  const fbSilangL = reg(c.createGain()); const fbSilangR = reg(c.createGain());
  lpL.connect(fbSendiriL); fbSendiriL.connect(dL);
  lpR.connect(fbSendiriR); fbSendiriR.connect(dR);
  lpL.connect(fbSilangL); fbSilangL.connect(dR);
  lpR.connect(fbSilangR); fbSilangR.connect(dL);

  const wetKiri = reg(c.createGain()); const wetKanan = reg(c.createGain());
  lpL.connect(wetKiri); lpR.connect(wetKanan);
  wetKiri.connect(mg, 0, 0); wetKanan.connect(mg, 0, 1);
  const wet = reg(c.createGain());
  mg.connect(wet); wet.connect(keluar);

  return {
    in: masuk,
    out: keluar,
    atur(p) {
      const { waktu, umpan, wetNilai, filter, pantul } = pemetaan(p);
      const pp = pantul / 100;
      atur(dL.delayTime, waktu, c);
      atur(dR.delayTime, waktu, c);
      atur(lpL.frequency, filter, c);
      atur(lpR.frequency, filter, c);
      atur(fbSendiriL.gain, umpan * (1 - pp), c);
      atur(fbSendiriR.gain, umpan * (1 - pp), c);
      atur(fbSilangL.gain, umpan * pp, c);
      atur(fbSilangR.gain, umpan * pp, c);
      atur(wet.gain, wetNilai, c);
    },
  };
}

function bangunEcho(c, reg) {
  return bangunGema(c, reg, p => ({
    waktu: p.jeda / 1000,
    umpan: p.umpan / 100,
    wetNilai: p.wet / 100,
    filter: p.filter,
    pantul: p.pantul,
  }));
}

function bangunDelay(c, reg) {
  return bangunGema(c, reg, p => ({
    waktu: p.waktu / 1000,
    // Umpan balik dipilih supaya pengulangan turun sekitar 60 dB setelah jumlah yang diminta.
    umpan: Math.pow(10, -3 / p.ulang),
    wetNilai: p.wet / 100,
    filter: p.filter,
    pantul: p.pantul,
  }));
}

/* STEREO WIDENING: langsung memakai pelebar mid/side. */
function bangunLebar(c, { reg }) {
  const lebar = buatLebar(c, reg);
  return {
    in: lebar.in,
    out: lebar.out,
    atur(p) { lebar.atur(p.lebar / 100, p.bass); },
  };
}

/* 3D / SPATIAL: pan posisi sederhana (bukan HRTF), redaman jarak, dan putar otomatis (LFO). */
function bangunSpasial(c, { reg, pool }) {
  const pan = reg(c.createStereoPanner());
  const redam = reg(c.createGain());
  const lp = reg(c.createBiquadFilter()); lp.type = 'lowpass'; lp.Q.value = Q_BUTTER;
  const lfo = reg(c.createOscillator()); lfo.type = 'sine'; lfo.frequency.value = 0;
  const lfoKedalaman = reg(c.createGain()); lfoKedalaman.gain.value = 0;
  lfo.connect(lfoKedalaman); lfoKedalaman.connect(pan.pan);
  lfo.start();
  pan.connect(redam); redam.connect(lp);
  return {
    in: pan,
    out: lp,
    atur(p) {
      atur(pan.pan, p.arah / 100, c);
      const j = p.jarak / 100;
      atur(redam.gain, 1 - 0.65 * j, c);
      atur(lp.frequency, 20000 - 15000 * j, c);
      atur(lfo.frequency, p.putar, c);
      atur(lfoKedalaman.gain, p.putar > 0 ? 0.6 : 0, c);
    },
  };
}

/* EARLY REFLECTIONS: sampai 12 tap delay dengan gain dan pan berselang-seling. */
const TAP_MAKS = 12;

function bangunPantulan(c, { reg }) {
  const masuk = reg(c.createGain());
  const keluar = reg(c.createGain());
  const kering = reg(c.createGain()); kering.gain.value = 1;
  masuk.connect(kering); kering.connect(keluar);

  const bus = reg(c.createGain());
  const taps = [];
  for (let i = 0; i < TAP_MAKS; i++) {
    const d = reg(c.createDelay(2));
    const g = reg(c.createGain()); g.gain.value = 0;
    const pan = reg(c.createStereoPanner());
    masuk.connect(d); d.connect(g); g.connect(pan); pan.connect(bus);
    taps.push({ d, g, pan, i });
  }
  const lp = reg(c.createBiquadFilter()); lp.type = 'lowpass'; lp.Q.value = Q_BUTTER;
  bus.connect(lp);
  const wet = reg(c.createGain());
  lp.connect(wet); wet.connect(keluar);

  return {
    in: masuk,
    out: keluar,
    atur(p) {
      const pel = p.peluruhan / 100;
      for (const t of taps) {
        const aktif = t.i < p.jumlah;
        const ms = p.jarak * (1 + 0.85 * t.i + 0.25 * (((t.i * 7) % 5) / 5));
        atur(t.d.delayTime, ms / 1000, c);
        atur(t.g.gain, aktif ? 0.8 * Math.pow(0.5 + 0.5 * pel, t.i + 1) : 0, c);
        atur(t.pan.pan, (t.i % 2 === 0 ? -1 : 1) * (p.lebar / 100), c);
      }
      atur(lp.frequency, 20000 * Math.pow(0.1, p.redaman / 100), c);
      atur(wet.gain, (p.wet / 100) * 0.8, c);
    },
  };
}

/* CONVOLUTION REVERB: respons ruangan nyata (IR bawaan), dimuat sekali per konteks.
   Normalisasi dilakukan sendiri, bukan normalize bawaan browser (hasilnya berbeda antar browser):
   energi total tiap IR diatur ke IR_ENERGI_TARGET, sehingga semua ruangan terdengar setara
   (sekitar -8 dB pada wet 100%, dekat dengan Reverb algoritmik). */
const IR_ENERGI_TARGET = 0.15;

function muatIr(c, id) {
  let peta = IR_CACHE.get(c);
  if (!peta) { peta = new Map(); IR_CACHE.set(c, peta); }
  if (!peta.has(id)) {
    const r = IR_RUANG.find(x => x.id === id) || IR_RUANG[0];
    const url = new URL('./ir/' + r.file, import.meta.url);
    peta.set(id, fetch(url).then(res => {
      if (!res.ok) throw new Error('IR tidak ditemukan: ' + r.file);
      return res.arrayBuffer();
    }).then(buf => c.decodeAudioData(buf)).then(buffer => {
      let energi = 0;
      for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
        for (const v of buffer.getChannelData(ch)) energi += v * v;
      }
      return { buffer, skala: energi > 0 ? Math.sqrt(IR_ENERGI_TARGET / energi) : 0 };
    }));
  }
  return peta.get(id);
}

function bangunKonvolusi(c, { reg }) {
  const masuk = reg(c.createGain());
  const keluar = reg(c.createGain());
  const kering = reg(c.createGain()); kering.gain.value = 1;
  masuk.connect(kering); kering.connect(keluar);

  const pre = reg(c.createDelay(1));
  const hp = reg(c.createBiquadFilter()); hp.type = 'highpass'; hp.Q.value = Q_BUTTER;
  const gainIr = reg(c.createGain()); gainIr.gain.value = 0; // diam sampai IR dimuat
  const lebar = buatLebar(c, reg);
  const wet = reg(c.createGain());
  masuk.connect(pre); pre.connect(hp);
  gainIr.connect(lebar.in); lebar.out.connect(wet); wet.connect(keluar);

  /* ConvolverNode dibuat baru setiap ganti ruangan: buffer ConvolverNode tidak dijamin
     bisa diganti di semua browser (Safari/WebKit bisa menolak). */
  let konv = null;
  let ruangSekarang = null;
  let token = 0;
  let hidup = true;
  let skalaIr = 0;
  let gainDb = 0;
  const terapkanGain = () => atur(gainIr.gain, skalaIr * Math.pow(10, gainDb / 20), c);

  return {
    in: masuk,
    out: keluar,
    buang() { hidup = false; },
    atur(p) {
      atur(pre.delayTime, p.predelay / 1000, c);
      atur(hp.frequency, Math.max(10, p.cutLow), c);
      gainDb = p.gainIr;
      terapkanGain();
      lebar.atur(p.lebar / 100, 0);
      atur(wet.gain, p.wet / 100, c);
      if (p.ruang !== ruangSekarang) {
        ruangSekarang = p.ruang;
        const t = ++token;
        muatIr(c, p.ruang)
          .then(({ buffer, skala }) => {
            if (!hidup || t !== token) return; // efek sudah mati, atau ruangan sudah diganti lagi
            const baru = reg(c.createConvolver());
            baru.normalize = false; // skala sudah diatur di sini
            baru.buffer = buffer;
            hp.connect(baru);
            baru.connect(gainIr);
            if (konv) { hp.disconnect(konv); konv.disconnect(); }
            konv = baru;
            skalaIr = skala;
            terapkanGain();
          })
          .catch(() => { /* IR gagal dimuat: efek diam, audio asli tetap terdengar */ });
      }
    },
  };
}

const BANGUN = {
  reverb: bangunReverb,
  echo: bangunEcho,
  delay: bangunDelay,
  lebar: bangunLebar,
  spasial: bangunSpasial,
  pantulan: bangunPantulan,
  konvolusi: bangunKonvolusi,
};

function bangunInstans(c, id) {
  const { reg, pool } = penampung();
  const hasil = BANGUN[id](c, { reg, pool });
  return { ...hasil, pool };
}

function lepasInstans(inst) {
  if (typeof inst.buang === 'function') inst.buang();
  for (const node of inst.pool) {
    try { node.disconnect(); } catch (e) { /* abaikan */ }
    if (typeof node.stop === 'function') { try { node.stop(); } catch (e) { /* sudah berhenti */ } }
  }
}

/* Rantai efek. masuk dan keluar adalah GainNode milik mesin.
   atur(set) menerima keadaan efek ({ id: { aktif, p } }) dan menyambung ulang
   hanya jika daftar efek aktif berubah. */
export function buatRantaiEfek(c, masuk, keluar) {
  const aktif = new Map(); // id -> instans (hanya efek yang sedang aktif)
  let urutanSekarang = null; // null = belum pernah disambung (kosong pun harus disambung)

  function sambungUlang(urutan) {
    masuk.disconnect();
    for (const inst of aktif.values()) inst.out.disconnect();
    let prev = masuk;
    for (const id of urutan) {
      const inst = aktif.get(id);
      prev.connect(inst.in);
      prev = inst.out;
    }
    prev.connect(keluar);
  }

  return {
    atur(set) {
      const urutan = EFEK.filter(e => set?.[e.id]?.aktif).map(e => e.id);
      for (const id of [...aktif.keys()]) {
        if (!urutan.includes(id)) {
          lepasInstans(aktif.get(id));
          aktif.delete(id);
        }
      }
      const baru = new Set();
      for (const id of urutan) {
        if (!aktif.has(id)) { aktif.set(id, bangunInstans(c, id)); baru.add(id); }
      }
      for (const id of urutan) {
        if (baru.has(id)) {
          segera = true; // penerapan pertama: nilai langsung, tidak ada transisi dari nilai default
          try { aktif.get(id).atur(set[id].p); } finally { segera = false; }
        } else {
          aktif.get(id).atur(set[id].p);
        }
      }
      const kunci = urutan.join(',');
      if (kunci !== urutanSekarang) {
        sambungUlang(urutan);
        urutanSekarang = kunci;
      }
    },
    /* Lepas semua node (dipanggil saat konteks ditutup). */
    lepas() {
      for (const inst of aktif.values()) lepasInstans(inst);
      aktif.clear();
      urutanSekarang = null;
      try { masuk.disconnect(); } catch (e) { /* abaikan */ }
    },
  };
}
