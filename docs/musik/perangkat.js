/* Akses langsung ke seluruh audio yang diindeks Android MediaStore.
   Tidak memilih atau menyalin lagu secara manual. Browser biasa tetap memakai
   pemilih berkas lama karena tidak punya API MediaStore Android. */

function kap() {
  return typeof window !== 'undefined' ? window.Capacitor : null;
}

let audioLibraryPlugin = null;
function plugin() {
  const c = kap();
  if (!c || c.getPlatform?.() !== 'android') return null;
  if (audioLibraryPlugin) return audioLibraryPlugin;
  /* Capacitor 8 exposes registered native plugins through registerPlugin();
     MainActivity registration alone does not create the JavaScript proxy. */
  audioLibraryPlugin = c.Plugins?.AudioLibrary || c.registerPlugin?.('AudioLibrary') || null;
  return audioLibraryPlugin;
}

let statusPustaka = 'belum'; // belum | memindai | izin | siap | gagal
let laporanPindai = { waktu: 0, jumlah: 0, pesan: '' };
export const pustakaPerangkatTersedia = () => !!plugin();
export const statusPustakaPerangkat = () => statusPustaka;
export const detailPustakaPerangkat = () => ({ ...laporanPindai });

export async function pindaiAudioPerangkat() {
  const p = plugin();
  if (!p) return { tersedia: false, granted: false, songs: [] };
  statusPustaka = 'memindai';

  try {
    let akses = await p.checkAccess();
    if (!akses?.granted) akses = await p.requestAccess();
    if (!akses?.granted) {
      statusPustaka = 'izin';
      laporanPindai = { ...laporanPindai, pesan: 'Izin audio belum diberikan.' };
      return { tersedia: true, granted: false, songs: [] };
    }

    const hasil = await p.listAudio();
    statusPustaka = hasil?.granted ? 'siap' : 'izin';
    const songs = Array.isArray(hasil?.songs) ? hasil.songs : [];
    laporanPindai = { waktu: Date.now(), jumlah: songs.length, pesan: hasil?.granted ? '' : 'Izin audio belum diberikan.' };
    return {
      tersedia: true,
      granted: !!hasil?.granted,
      audioGranted: !!hasil?.audioGranted,
      videoGranted: !!hasil?.videoGranted,
      songs,
    };
  } catch (error) {
    statusPustaka = 'gagal';
    laporanPindai = { ...laporanPindai, waktu: Date.now(), pesan: String(error?.message || 'Pemindaian gagal').slice(0, 180) };
    throw error;
  }
}

/* Capacitor memetakan content:// ke pembaca ContentResolver lokalnya sendiri.
   Blob hanya dibentuk saat sebuah track mulai diputar; lagu tidak disalin ke
   IndexedDB atau dimasukkan manual ke pustaka Hara. */
export async function berkasAudioPerangkat(uri, nama, mime) {
  const c = kap();
  if (!c || typeof c.convertFileSrc !== 'function' || typeof uri !== 'string' || !uri.startsWith('content://')) {
    throw new Error('Sumber audio perangkat tidak tersedia');
  }
  const response = await fetch(c.convertFileSrc(uri), { cache: 'no-store' });
  if (!response.ok) throw new Error('Audio perangkat tidak dapat dibaca');
  const blob = await response.blob();
  const tipe = mime || blob.type || 'application/octet-stream';
  return new File([blob], nama || 'audio', { type: tipe });
}
