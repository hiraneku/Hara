/* Pembaruan isi aplikasi di dalam APK (Capacitor Updater, mode "No Cloud").

   Kode Hara dibundel di dalam APK. Saat aplikasi dibuka, modul ini:
   1. Memberi tahu plugin bahwa bundel berjalan dengan baik (notifyAppReady).
      Tanpa ini plugin mengembalikan aplikasi ke versi sebelumnya.
   2. Mengambil version.json terbaru dari rilis GitHub "web-latest".
   3. Jika versinya berbeda, mengunduh zip-nya di latar belakang dan
      menampilkan tombol "Pasang sekarang".
   4. Setelah dipasang, memberi tahu bahwa aplikasi sudah diperbarui.

   Di web (GitHub Pages / browser) plugin tidak ada, jadi semuanya dilewati. */

import { toast } from './toast.js?v=20261010054709';

const RILIS = 'https://github.com/hiraneku/Hara/releases/download/web-latest';
const URL_VERSI = RILIS + '/version.json';
const KUNCI_DICOBA = 'hara.pembaruanDicoba';
const KUNCI_TERPASANG = 'hara.versiTerpasang';

function plugin(nama) {
  const c = typeof window !== 'undefined' ? window.Capacitor : null;
  return (c && c.Plugins && c.Plugins[nama]) || null;
}

async function ambilJson(url) {
  const http = plugin('CapacitorHttp');
  if (http) {
    const r = await http.get({ url: url + (url.includes('?') ? '&' : '?') + 't=' + Date.now() });
    return r.status >= 200 && r.status < 300 ? r.data : null;
  }
  const r = await fetch(url + '?t=' + Date.now(), { cache: 'no-store' });
  return r.ok ? r.json() : null;
}

async function versiLokal() {
  try {
    const r = await fetch('./version.json', { cache: 'no-store' });
    return r.ok ? (await r.json()).versi || null : null;
  } catch { return null; }
}

async function cekDanUnduh(up) {
  try {
    const lokal = await versiLokal();
    const remote = await ambilJson(URL_VERSI);
    if (!remote || !remote.versi || !remote.url) return;
    if (remote.versi === lokal) return;
    // Pernah dipasang tapi dikembalikan oleh plugin (gagal) — jangan ulangi terus.
    if (localStorage.getItem(KUNCI_DICOBA) === remote.versi) return;

    const info = await up.download({ version: remote.versi, url: remote.url });
    toast('Pembaruan ' + remote.versi + ' siap', {
      label: 'Pasang sekarang',
      cb: () => {
        localStorage.setItem(KUNCI_DICOBA, remote.versi);
        up.set({ id: info.id });
      },
    }, 15000);
  } catch {
    // Offline atau gagal unduh: dicoba lagi saat aplikasi dibuka berikutnya.
  }
}

export function mulaiPembaruan() {
  const up = plugin('CapacitorUpdater');
  if (!up) return;

  up.notifyAppReady().catch(() => {});

  // Tampilkan pemberitahuan sekali setelah versi baru aktif.
  versiLokal().then(v => {
    if (!v) return;
    const terakhir = localStorage.getItem(KUNCI_TERPASANG);
    localStorage.setItem(KUNCI_TERPASANG, v);
    if (terakhir && terakhir !== v) toast('Hara diperbarui ke versi ' + v);
  });

  setTimeout(() => cekDanUnduh(up), 3000);
}
