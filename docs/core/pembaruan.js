/* Pembaruan isi aplikasi di dalam APK (Capacitor Updater, mode "No Cloud").

   Kode Hara dibundel di dalam APK. Saat aplikasi dibuka, modul ini:
   1. Memberi tahu plugin bahwa bundel berjalan dengan baik (notifyAppReady).
      Tanpa ini plugin mengembalikan aplikasi ke versi sebelumnya.
   2. Mengambil version.json terbaru dari rilis GitHub "web-latest".
   3. Jika versinya berbeda, mengunduh zip-nya di latar belakang.
   4. Menampilkan dialog "Perbarui sekarang". Saat dipilih, pembaruan dipasang
      dan aplikasi dibuka ulang otomatis. Kalau "Nanti", dialog muncul lagi
      saat aplikasi dibuka berikutnya.

   Di web (GitHub Pages / browser) plugin tidak ada, jadi semuanya dilewati. */

import { toast } from './toast.js?v=20261024031304';

const RILIS = 'https://github.com/hiraneku/Hara/releases/download/web-latest';
const URL_VERSI = RILIS + '/version.json';
const KUNCI_DICOBA = 'hara.pembaruanDicoba';
const KUNCI_TERPASANG = 'hara.versiTerpasang';
const KUNCI_SIAP = 'hara.pembaruanSiap';

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

function bacaSiap() {
  try { return JSON.parse(localStorage.getItem(KUNCI_SIAP) || 'null'); } catch { return null; }
}

const GAYA = `
.pmb-latar{position:fixed;inset:0;z-index:200;background:rgba(10,10,12,.5);display:flex;align-items:center;justify-content:center;padding:24px;opacity:0;transition:opacity .18s}
.pmb-latar.on{opacity:1}
.pmb-kartu{width:100%;max-width:340px;background:var(--surface,#1E1D19);color:var(--text,#F3F2EC);border:1px solid var(--border,rgba(255,255,255,.12));border-radius:22px;padding:22px 20px 16px;box-shadow:0 18px 48px rgba(0,0,0,.35);font-family:var(--sans,system-ui)}
.pmb-kartu h3{margin:0 0 8px;font-family:var(--serif,serif);font-weight:400;font-size:22px}
.pmb-kartu p{margin:0 0 18px;font-size:14.5px;line-height:1.5;color:var(--muted,rgba(243,242,236,.72))}
.pmb-aksi{display:flex;gap:10px;justify-content:flex-end}
.pmb-aksi button{border:0;border-radius:999px;padding:10px 16px;font:inherit;font-size:14px;font-weight:500;cursor:pointer}
.pmb-nanti{background:transparent;color:var(--muted,rgba(243,242,236,.72))}
.pmb-ya{background:var(--accent,#A9CFA6);color:#13201A}
`;

function tampilkanDialog(versi, id, up) {
  if (document.getElementById('pmb-latar')) return;
  if (!document.getElementById('pmb-gaya')) {
    const st = document.createElement('style');
    st.id = 'pmb-gaya';
    st.textContent = GAYA;
    document.head.appendChild(st);
  }
  const latar = document.createElement('div');
  latar.id = 'pmb-latar';
  latar.className = 'pmb-latar';
  latar.innerHTML = `<div class="pmb-kartu" role="dialog" aria-modal="true" aria-labelledby="pmb-judul">
    <h3 id="pmb-judul">Pembaruan tersedia</h3>
    <p>Hara versi ${versi} sudah diunduh. Pasang sekarang? Aplikasi akan dibuka ulang otomatis.</p>
    <div class="pmb-aksi">
      <button type="button" class="pmb-nanti" id="pmb-nanti">Nanti</button>
      <button type="button" class="pmb-ya" id="pmb-ya">Perbarui sekarang</button>
    </div></div>`;
  document.body.appendChild(latar);
  requestAnimationFrame(() => latar.classList.add('on'));

  const tutup = () => {
    latar.classList.remove('on');
    setTimeout(() => latar.remove(), 200);
  };
  document.getElementById('pmb-nanti').onclick = tutup;
  document.getElementById('pmb-ya').onclick = async () => {
    try {
      localStorage.setItem(KUNCI_DICOBA, versi);
      await up.set({ id });
      if (typeof up.reload === 'function') {
        await up.reload();
      } else {
        toast('Tutup lalu buka lagi Hara untuk memakai versi ' + versi);
        tutup();
      }
    } catch {
      toast('Pembaruan gagal dipasang. Coba lagi nanti.');
      tutup();
    }
  };
}

/* Mengembalikan status singkat. Dipakai juga oleh tombol "Cek sekarang". */
async function cekDanUnduh(up) {
  const lokal = await versiLokal();
  const remote = await ambilJson(URL_VERSI);
  if (!remote || !remote.versi || !remote.url) throw new Error('Data pembaruan tidak terbaca');
  if (remote.versi === lokal) return { status: 'terbaru', versi: lokal };
  // Sudah pernah dipasang tapi dikembalikan oleh plugin (gagal) — jangan ulangi terus.
  if (localStorage.getItem(KUNCI_DICOBA) === remote.versi) return { status: 'gagal-sebelumnya', versi: remote.versi };

  // Sudah diunduh pada pembukaan sebelumnya: langsung tawarkan.
  const siap = bacaSiap();
  if (siap && siap.versi === remote.versi && siap.id) {
    tampilkanDialog(remote.versi, siap.id, up);
    return { status: 'siap', versi: remote.versi };
  }

  const info = await up.download({ version: remote.versi, url: remote.url });
  localStorage.setItem(KUNCI_SIAP, JSON.stringify({ versi: remote.versi, id: info.id }));
  tampilkanDialog(remote.versi, info.id, up);
  return { status: 'diunduh', versi: remote.versi };
}

/* Tombol "Cek sekarang" di Pengaturan. */
async function cekManual() {
  const up = plugin('CapacitorUpdater');
  if (!up) { toast('Pembaruan hanya ada di aplikasi Android'); return; }
  try {
    const hasil = await cekDanUnduh(up);
    const pesan = {
      terbaru: 'Hara sudah versi terbaru (' + hasil.versi + ')',
      siap: 'Pembaruan ' + hasil.versi + ' siap dipasang',
      diunduh: 'Pembaruan ' + hasil.versi + ' sudah diunduh',
      'gagal-sebelumnya': 'Pembaruan ' + hasil.versi + ' sebelumnya gagal dipasang',
    }[hasil.status];
    toast(pesan);
  } catch (e) {
    toast('Cek pembaruan gagal: ' + (e && e.message ? e.message : 'jaringan bermasalah'));
  }
}

document.addEventListener('click', e => {
  if (e.target.closest && e.target.closest('[data-cek-pembaruan]')) cekManual();
});

export function mulaiPembaruan() {
  const up = plugin('CapacitorUpdater');
  if (!up) return;

  up.notifyAppReady().catch(() => {});

  // Versi baru sudah aktif: beri tahu sekali, lalu bersihkan status unduhan.
  versiLokal().then(v => {
    if (!v) return;
    const terakhir = localStorage.getItem(KUNCI_TERPASANG);
    localStorage.setItem(KUNCI_TERPASANG, v);
    const siap = bacaSiap();
    if (siap && siap.versi === v) localStorage.removeItem(KUNCI_SIAP);
    if (terakhir && terakhir !== v) toast('Hara diperbarui ke versi ' + v);
  });

  setTimeout(() => { cekDanUnduh(up).catch(() => {}); }, 3000);
}
