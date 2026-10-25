# Perubahan Tahap 2

Tahap 2 mengikuti urutan doc koreksi §6.1: B1, B5, B3, B4, B2, B6, B8. Satu ID per perubahan, dan setiap bagian menyebut alasan urutan, dependensi, file, dan hasil uji.

## Perubahan 12 · B1a — Penampil PDF (pdf.js)

- **ID:** B1 (PDF import dan anotasi). Ini **B1a**, yaitu bagian pertama: penampil PDF di dalam catatan. **B1 belum selesai.** Anotasi dan penyimpanan hasil anotasi belum dikerjakan.
- **Alasan urutan:** B1 adalah urutan pertama Tahap 2 (disetujui pengguna: "B1 dulu"). Penampil dikerjakan dulu karena tanpa itu PDF tidak bisa dilihat, dan anotasi (B1b) nanti butuh penampil yang sudah jalan.
- **Keputusan pengguna:** pdf.js versi minimal, `pdf.min.mjs` dan `pdf.worker.min.mjs`, lisensi Apache-2.0. Sumber PDF asli disimpan terpisah dari anotasi (ini rencana B1b, belum dikerjakan).
- **Dependensi:** blob di IndexedDB (`docs/core/blobs.js`, dari A9/B7 sebelumnya). Tidak ada dependensi ke ID lain.
- **Yang berubah:**
  - `docs/vendor/pdfjs/`: `pdf.min.mjs`, `pdf.worker.min.mjs`, `LICENSE.txt` (Apache-2.0), `README.md` (versi 6.4.299, daftar yang tidak disertakan, cara memperbarui, sha256 tiap berkas). Pola sama dengan `docs/vendor/lamejs/`.
  - `docs/notes/pdf/logika.js` (baru): `adalahPdf`, `halamanTerjepit`, `halamanBerikut`, `halamanSebelumnya`, `zoomBerikut`, `zoomSebelumnya`, `skalaPasLebar`.
  - `docs/notes/pdf/muat-pdfjs.js` (baru): `FITUR_PDFJS`, `fiturPdfKurang()`, `muatPdfJs()`. Jika fitur kurang, `muatPdfJs()` menolak dengan galat `PDF_FITUR_KURANG` dan pdf.js tidak dimuat.
  - `docs/notes/pdf/penampil.js` (baru): `bukaPenampilPdf`, `tutupPenampilPdf`, `pesanGalat`, `tampilkanHalaman`, `pindahHalaman`, `ubahZoom`. Overlay `.pdfv` dengan `role="dialog"`, hanya satu sesi aktif.
  - `docs/notes/note-model.js`: blok `file` yang berupa PDF mendapat tombol `data-file-buka`.
  - `docs/notes/editor/blok-generasi-baru.js`: impor `bukaPenampilPdf`, fungsi `bukaPdfDariBlok`, handler klik `[data-file-buka]`.
  - `docs/core/bahasa-en.js`, `bahasa-ja.js`: 9 kunci baru per bahasa.
  - `docs/styles/notes.css`: blok `.pdfv*` (z-index 230).
  - `tools/uji/pdf-penampil.mjs` (baru): 38 pengujian Node/jsdom.
  - `tools/uji/bantu/pdf-contoh.mjs` (baru): `buatPdf(jumlah)` menghasilkan PDF valid 300×400 dengan teks "Halaman N".
  - Stempel `?v=` menjadi `20261025061829` (126 berkas, karena `version.mjs` menstempel seluruh `docs/`).
- **Keputusan teknis penting:**
  - pdf.js 6.4.299 membutuhkan fitur modern: `Iterator`, `Promise.try`, `Promise.withResolvers`, `Uint8Array.prototype.toHex`, `toBase64`, dan `Uint8Array.fromBase64`. **Polyfill tidak dipakai**, karena polyfill setengah jadi terbukti tidak cukup (uji Node 22 gagal dua kali). Peramban yang kurang fitur mendapat pesan "Peramban ini terlalu lama untuk menampilkan PDF", bukan galat teknis.
  - Dokumen dilepas lewat `PDFDocumentLoadingTask.destroy()`. Di versi ini `PDFDocumentProxy` tidak punya `destroy()`. Kesalahan ini ditemukan lewat uji browser dan sudah diperbaiki (lihat bagian uji).

## Cara uji yang dijalankan

- **Node (`node tools/uji/pdf-penampil.mjs`): 38/38 lulus.** Mencakup checksum vendor cocok dengan README, lisensi Apache-2.0, logika halaman dan zoom, deteksi fitur (fitur palsu ditambahkan lalu dihapus), `muatPdfJs` menolak di Node 22, UI overlay (dibuka, satu sesi, tombol Tutup, Escape), dan tombol Buka PDF hanya untuk PDF.
- **Browser Chromium (`b1a.mjs`, harness di luar repo, viewport ponsel 390×700):**
  - Normal: fitur lengkap ada. Lampiran PDF 3 halaman dibuka dari blok. Canvas 366×488 berisi piksel gelap (768), navigasi ke "2 / 3" berhasil (789 piksel gelap, berbeda), zoom "Pas lebar" 122%, lalu "+" menjadi 125%. Escape menutup overlay. **Tidak ada galat JS halaman.**
  - Peramban tanpa `Uint8Array.toHex`: pesan "Peramban ini terlalu lama…" tampil. Tidak ada galat JS halaman.
  - Screenshot `/home/user/unduh/b1a-penampil.png` diperiksa: "Halaman 2" tampil dengan benar.
  - Galat `ERR_FAILED` di konsol hanya dari Google Fonts dan open-meteo, yang sengaja diblokir harness.
- **Galat yang ditemukan dan diperbaiki saat uji browser:** `doc.destroy is not a function` saat menutup. Akibatnya Escape tidak menutup overlay. Diperbaiki dengan helper `lepaskanTugas(task)`. Setelah perbaikan, Escape menutup overlay.
- `node tools/version.mjs`: stempel `20261025061829`.
- `npm test` penuh: **exit 0**, 82 berkas uji (termasuk `pdf-penampil`), lihat `/tmp/npmtest-b1a.log` dan tidak ada baris FAIL.

## Belum diuji

- Uji mutasi M1–M4 untuk `pdf-penampil.mjs` **belum dijalankan.** Tidak diklaim berhasil.
- Belum ada uji di HP Android atau iOS sungguhan. Pengujian hanya di Chromium desktop dengan viewport ponsel.
- Belum ada uji file PDF besar, PDF berkata sandi (hanya jalur kodenya), dan PDF rusak secara nyata di browser.

## Keterbatasan yang diketahui

- `cmaps` dan `standard_fonts` tidak disertakan. Teks non-Latin atau font standar tertentu bisa tampil kurang tepat.
- JPEG2000 dan JBIG2 tidak didukung.
- Peramban lama tidak bisa menampilkan PDF sama sekali (muncul pesan, bukan render).
- Tombol zoom dan navigasi di bar atas masih kasar secara visual (ikon `+`, `−`, `‹`, `›` terlihat tidak rata di screenshot). Belum diperbaiki.
- Anotasi, simpan hasil anotasi, dan ekspor PDF yang dianotasi belum ada (B1b).

## Status

- B1a: **Implemented** (penampil dan vendor), dengan keterbatasan di atas.
- B1: **Sebagian**. Menunggu persetujuan pengguna untuk B1b (anotasi).

## Berikutnya

- B1b (anotasi dan sumber asli terpisah) menunggu persetujuan pengguna.
- Jalankan uji mutasi M1–M4 untuk B1a bila pengguna minta.
- Rapikan bar tombol PDF (ikon).
