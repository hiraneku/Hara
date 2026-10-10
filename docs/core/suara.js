/**
 * Baca keras (TTS) & dikte (STT) — K15.
 *
 * Adapter dua jalur:
 *  1. Plugin native Capacitor bila ada (APK): window.Capacitor.Plugins.TextToSpeech /
 *     SpeechRecognition (paket gratis: @capacitor-community/text-to-speech dan
 *     @capacitor-community/speech-recognition, MIT). Belum dipasang — lihat APK.md.
 *  2. Web Speech API di browser: speechSynthesis & SpeechRecognition / webkitSpeechRecognition.
 *
 * Tidak ada pemanggilan jaringan; semua berjalan di perangkat sejauh browser/WebView mendukung.
 */

const kap = () => (typeof window !== 'undefined' ? window : globalThis);

function pluginNative(nama) {
  const c = kap().Capacitor;
  return c && c.Plugins && c.Plugins[nama] ? c.Plugins[nama] : null;
}

/* ───────── baca keras ───────── */

export function tersediaBacaKeras() {
  return !!pluginNative('TextToSpeech') || typeof kap().speechSynthesis !== 'undefined';
}

/** Pecah teks panjang menjadi potongan agar tidak terpotong oleh batas engine. */
export function pecahTeks(teks, maks = 180) {
  const bersih = String(teks || '').replace(/\s+/g, ' ').trim();
  if (!bersih) return [];
  const hasil = [];
  let sisa = bersih;
  while (sisa.length > maks) {
    let potong = sisa.lastIndexOf('. ', maks);
    if (potong < maks / 2) potong = sisa.lastIndexOf(' ', maks);
    if (potong <= 0) potong = maks;
    hasil.push(sisa.slice(0, potong + 1).trim());
    sisa = sisa.slice(potong + 1).trim();
  }
  if (sisa) hasil.push(sisa);
  return hasil;
}

/**
 * Membacakan teks. Mengembalikan false bila tidak ada mesin suara.
 * @param {string} teks
 * @param {{bahasa?:string, kecepatan?:number}} [opsi]
 */
export async function bacaKeras(teks, { bahasa = 'id-ID', kecepatan = 1 } = {}) {
  const potongan = pecahTeks(teks);
  if (potongan.length === 0) return false;
  const native = pluginNative('TextToSpeech');
  if (native) {
    for (const p of potongan) await native.speak({ text: p, lang: bahasa, rate: kecepatan });
    return true;
  }
  const synth = kap().speechSynthesis;
  if (!synth || typeof kap().SpeechSynthesisUtterance === 'undefined') return false;
  for (const p of potongan) {
    const u = new (kap().SpeechSynthesisUtterance)(p);
    u.lang = bahasa;
    u.rate = kecepatan;
    synth.speak(u);
  }
  return true;
}

export function hentikanBaca() {
  const native = pluginNative('TextToSpeech');
  if (native && native.stop) native.stop();
  const synth = kap().speechSynthesis;
  if (synth) synth.cancel();
}

/* ───────── dikte ───────── */

export function tersediaDikte() {
  if (pluginNative('SpeechRecognition')) return true;
  const w = kap();
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

/**
 * Mulai mendengarkan. `onHasil(teks)` dipanggil dengan hasil akhir (bukan sementara).
 * Mengembalikan { berhenti() } atau null bila tidak didukung.
 */
export function mulaiDikte({ bahasa = 'id-ID', onHasil, onGagal } = {}) {
  const native = pluginNative('SpeechRecognition');
  if (native) {
    let berhenti = false;
    (async () => {
      try {
        const izin = native.requestPermissions ? await native.requestPermissions() : null;
        if (izin && izin.speechRecognition && izin.speechRecognition !== 'granted') throw new Error('izin ditolak');
        const { matches: daftar } = await native.start({ language: bahasa, maxResults: 1, partialResults: false, popup: false });
        if (!berhenti && daftar && daftar[0] && onHasil) onHasil(daftar[0]);
      } catch (e) { if (onGagal) onGagal(e); }
    })();
    return { berhenti() { berhenti = true; native.stop?.(); } };
  }
  const Kelas = kap().SpeechRecognition || kap().webkitSpeechRecognition;
  if (!Kelas) return null;
  const r = new Kelas();
  r.lang = bahasa;
  r.interimResults = false;
  r.continuous = false;
  r.onresult = e => {
    const teks = Array.from(e.results).map(x => x[0] && x[0].transcript).join(' ').trim();
    if (teks && onHasil) onHasil(teks);
  };
  r.onerror = e => { if (onGagal) onGagal(new Error(e.error || 'gagal')); };
  r.start();
  return { berhenti() { try { r.stop(); } catch (e) { /* sudah berhenti */ } } };
}
