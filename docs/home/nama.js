/* Nama pengguna untuk sapaan Beranda. Diisi sekali di Pengaturan, disimpan di perangkat. */
const KUNCI = 'hara.nama.v1';

export function namaSekarang() {
  try {
    return (localStorage.getItem(KUNCI) || '').trim();
  } catch (e) {
    return '';
  }
}

export function setNama(n) {
  const bersih = String(n || '').trim().slice(0, 30);
  try {
    if (bersih) localStorage.setItem(KUNCI, bersih);
    else localStorage.removeItem(KUNCI);
  } catch (e) { /* penyimpanan penuh atau privat */ }
  return bersih;
}
