/* Worker ekspor lagu. Dua tugas berat dijalankan di sini agar layar tidak macet:
   - "tempo": ubah tempo & nada (SoundTouch);
   - "kode": tulis WAV atau MP3 (lamejs).
   Ekualiser dijalankan di halaman (ekspor.js) lewat OfflineAudioContext.
   Berbentuk skrip biasa karena lamejs memakai importScripts. */

importScripts('../vendor/lamejs/lame.min.js?v=20261025001200');

const siap = import('./ekspor-dsp.js?v=20261028021559');

self.onmessage = async (e) => {
  const d = e.data;
  const id = d.id;
  try {
    const dsp = await siap;
    if (d.op === 'tempo') {
      const hasil = dsp.tempoDanNada(d.L, d.R, d.tempo, d.pitch);
      postMessage({ id, ok: true, L: hasil.L, R: hasil.R }, [hasil.L.buffer, hasil.R.buffer]);
      return;
    }
    if (d.op === 'kode') {
      const blob = d.format === 'mp3'
        ? dsp.kodeMp3(self.lamejs, d.L, d.R, d.kbps)
        : dsp.kodeWav(d.L, d.R);
      postMessage({ id, ok: true, blob });
      return;
    }
    throw new Error('operasi tidak dikenal');
  } catch (err) {
    postMessage({ id, ok: false, pesan: String((err && err.message) || err) });
  }
};
