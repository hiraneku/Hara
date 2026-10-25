# PDF.js (penampil PDF)

Dipakai untuk menampilkan PDF di dalam catatan (Bagian B1, Tahap 2).

- Paket: `pdfjs-dist` **6.4.299** (npm), sumber: github.com/mozilla/pdf.js
- Lisensi: **Apache-2.0** (lihat `LICENSE.txt`, salinan utuh dari paket).
- Berkas yang disalin **tanpa modifikasi**:
  - `pdf.min.mjs` (library inti, sekitar 459 KB)
  - `pdf.worker.min.mjs` (worker untuk parsing dan rendering, sekitar 1,26 MB)
- Dimuat lewat `import()` hanya saat PDF dibuka, jadi tidak membebani pembukaan aplikasi.

## Yang belum disertakan (versi minimal)

Berkas ini sengaja tidak disalin untuk menjaga ukuran repo:

- `cmaps/` (sekitar 1,7 MB): peta karakter untuk font CJK yang **tidak tertanam** di PDF. Tanpa ini, teks CJK pada PDF jenis itu bisa tampil salah.
- `standard_fonts/` (sekitar 820 KB): font standar PDF yang tidak tertanam (Helvetica, Times, dan sejenisnya). Tanpa ini, font pengganti dari sistem yang dipakai.
- `image_decoders/` (sekitar 632 KB): decoder untuk gambar JPEG2000 dan JBIG2. Tanpa ini, gambar jenis itu bisa gagal ditampilkan.
- `pdf.sandbox.min.mjs`: untuk menjalankan skrip JavaScript di dalam PDF. Tidak dipakai.

Jika salah satu diperlukan, tambahkan berkasnya dari paket yang sama dan catat di sini.

## Cara memperbarui

1. `npm pack pdfjs-dist@<versi>` lalu ekstrak.
2. Salin `build/pdf.min.mjs` dan `build/pdf.worker.min.mjs` ke folder ini.
3. Perbarui versi di atas dan jalankan `tools/uji/pdf-penampil.mjs`.

## Checksum (sha256)

```
57456c8e0c81e46be31174b499ef77f2b9f5ee46d04412ba627320a36755d4c2  pdf.min.mjs
9536359f1b8367850d485731ca1d5e45c159a7b7a0912325e539937aa21ceb18  pdf.worker.min.mjs
0d542e0c8804e39aa7f37eb00da5a762149dc682d7829451287e11b938e94594  LICENSE.txt
```

`tools/uji/pdf-penampil.mjs` memeriksa checksum ini. Jika berkas diganti, perbarui daftar ini bersama berkasnya.
