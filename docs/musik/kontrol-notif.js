/* Jembatan MediaSession Android untuk kontrol pada notifikasi/layar kunci.
   Browser biasa tetap menggunakan navigator.mediaSession dari mesin.js. */
let kontrol = null;
let pendengarTerpasang = false;
let aksi = {};

function plugin() {
  if (kontrol) return kontrol;
  const c = typeof window !== 'undefined' ? window.Capacitor : null;
  if (!c || c.getPlatform?.() !== 'android') return null;
  kontrol = c.Plugins?.MusicControls || c.registerPlugin?.('MusicControls') || null;
  return kontrol;
}

function panggil(nama, data) {
  const p = plugin();
  if (!p || typeof p[nama] !== 'function') return false;
  try {
    const hasil = p[nama](data);
    hasil?.catch?.(() => {});
    return true;
  } catch (e) {
    return false;
  }
}

export function pasangKontrolNotifikasi(callbacks = {}) {
  aksi = { ...aksi, ...callbacks };
  const p = plugin();
  if (!p) return false;
  if (!pendengarTerpasang && typeof p.addListener === 'function') {
    pendengarTerpasang = true;
    try {
      const registrasi = p.addListener('mediaAction', event => {
        const jenis = event?.action;
        const fn = jenis === 'play' ? aksi.play
          : jenis === 'pause' || jenis === 'stop' ? aksi.pause
          : jenis === 'previous' ? aksi.previous
          : jenis === 'next' ? aksi.next
          : jenis === 'seekTo' ? aksi.seekTo
          : jenis === 'rewind' ? aksi.rewind
          : jenis === 'forward' ? aksi.forward
          : null;
        if (!fn) return;
        try {
          const hasil = jenis === 'seekTo' ? fn(Number(event.positionMs) || 0) : fn();
          hasil?.catch?.(() => {});
        } catch (e) { /* tindakan sistem tidak boleh mematikan pemutar */ }
      });
      registrasi?.catch?.(() => { pendengarTerpasang = false; });
    } catch (e) {
      pendengarTerpasang = false;
      return false;
    }
  }
  return true;
}

export function sinkronkanKontrolNotifikasi(lagu, keadaan) {
  if (!plugin()) return false;
  if (!lagu || !keadaan || keadaan.status === 'kosong' || !keadaan.id) {
    return panggil('clear');
  }
  return panggil('update', {
    title: lagu.nama || keadaan.judul || 'Musik',
    artist: lagu.artis || 'Hara',
    album: lagu.album || 'Musik',
    durationMs: Math.round(Math.max(0, Number(keadaan.durasi || lagu.durasi) || 0) * 1000),
    positionMs: Math.round(Math.max(0, Number(keadaan.posisi) || 0) * 1000),
    playbackRate: Number(keadaan.tempo) || 1,
    state: keadaan.status === 'putar' ? 'playing' : keadaan.status === 'memuat' ? 'buffering' : 'paused',
  });
}
