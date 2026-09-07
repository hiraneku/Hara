/* Tema terang/gelap.
   - Tanpa pilihan tersimpan: mengikuti sistem (prefers-color-scheme).
   - Setelah pengguna mengganti lewat tombol, pilihan disimpan dan
     mengikuti sistem dimatikan sampai ia menghapus pilihannya. */

const KEY = 'hara.tema.v1';

export function modeTersimpan() {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'dark' || v === 'light' ? v : null;
  } catch (e) {
    return null;
  }
}

function sistemGelap() {
  try {
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  } catch (e) {
    return false;
  }
}

export const modeSekarang = () => modeTersimpan() || (sistemGelap() ? 'dark' : 'light');

/* Label untuk halaman Pengaturan. */
export const labelMode = () => {
  const s = modeTersimpan();
  return s ? (s === 'dark' ? 'Gelap' : 'Terang') : 'Mengikuti sistem';
};

/* Terapkan tema ke dokumen + sesuaikan ikon di header. */
export function terapkan() {
  const m = modeSekarang();
  document.documentElement.setAttribute('data-theme', m);
  const use = document.querySelector('#theme use');
  if (use) use.setAttribute('href', m === 'dark' ? '#i-sun' : '#i-moon');
}

/* Ganti terang <-> gelap lalu simpan pilihan. */
export function toggle() {
  const m = modeSekarang() === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem(KEY, m); } catch (e) {}
  terapkan();
  return m;
}
