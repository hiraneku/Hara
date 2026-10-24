/* Registri menu "Semua fitur" (dibuka dari tombol Lainnya di Beranda).

   Sama seperti palette: sumber didaftarkan di app.js, di satu tempat, sehingga
   beranda tidak perlu mengimpor modul fitur secara langsung dan tidak ada
   lingkaran impor. Setiap sumber mengembalikan daftar grup:
     { judul, item: [{ id, label, hint, ikon, jalan }] }
   `ikon` adalah id sprite SVG (mis. 'i-note'). */

const sumber = [];

export const daftarkanGrupFitur = fn => { sumber.push(fn); };

export const ambilGrupFitur = () => sumber
  .flatMap(fn => { try { return fn() || []; } catch (e) { return []; } })
  .filter(g => g && Array.isArray(g.item) && g.item.length);
