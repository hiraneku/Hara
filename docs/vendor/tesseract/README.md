# Tesseract.js (OCR, B6)

Dipakai untuk membaca teks dari halaman PDF hasil pindai dan dari gambar di catatan
(Bagian B6, Tahap 2). Dimuat lewat `import()` hanya saat OCR pertama dijalankan
(lihat `docs/notes/ocr/mesin.js`). Semua berkas ada di sini: tidak ada unduhan dari CDN.

## Sumber

| Berkas | Paket npm | Versi | Lisensi |
|---|---|---|---|
| `tesseract.esm.min.js`, `worker.min.js` | `tesseract.js` | 7.0.0 | Apache-2.0 (`LICENSE-tesseract.js.txt`) |
| `core/tesseract-core-simd-lstm.wasm.js`, `core/tesseract-core-simd-lstm.wasm` | `tesseract.js-core` | 7.0.0 | Apache-2.0 (`LICENSE-tesseract-core.txt`) |
| `core/tesseract-core-lstm.wasm.js`, `core/tesseract-core-lstm.wasm` (non-SIMD) | `tesseract.js-core` | 7.0.0 | Apache-2.0 (`LICENSE-tesseract-core.txt`) |
| `lang/4.0.0_best_int/eng.traineddata.gz` | `@tesseract.js-data/eng` | 1.0.0 | MIT (paket). Data asal: `naptha/tessdata` |
| `lang/4.0.0_best_int/ind.traineddata.gz` | `@tesseract.js-data/ind` | 1.0.0 | MIT (paket). Data asal: `naptha/tessdata` |

Berkas disalin **tanpa modifikasi** dari paket npm di atas.

`tesseract.js` 7.0.0 mensyaratkan `tesseract.js-core` ^7.0.0. Versi core harus sama dengan
versi wrapper; core 6.x tidak bisa dipakai dengan wrapper ini.

**Catatan lisensi data:** `naptha/tessdata` mengikuti tessdata Tesseract (umumnya Apache-2.0).
Lisensi yang tercantum di paket adalah MIT. Ini belum diverifikasi langsung di repositori asal;
sebelum rilis, periksa ulang.

## Pemilihan core

`docs/notes/ocr/mesin.js` memilih berkas core sendiri, bukan lewat deteksi tesseract.js:
- Bila peramban mendukung WebAssembly SIMD (diuji dengan modul wasm minimum yang divalidasi):
  `core/tesseract-core-simd-lstm.wasm.js`.
- Bila tidak: `core/tesseract-core-lstm.wasm.js` (non-SIMD, cadangan).

Berkas dikunci langsung (bukan folder), sehingga tesseract.js tidak memilih varian lain.
Varian `relaxedsimd-lstm` sengaja **tidak** di-vendor untuk menekan ukuran. Ini hanya optimisasi
kecepatan.

## Yang sengaja tidak disertakan

- `relaxedsimd-lstm` (≈ 6,8 MB). Hanya optimisasi kecepatan.
- `eng`/`ind` versi `4.0.0` (non-int) dan `tessdata_fast`. Versi `best_int` dipilih karena
  akurasi dan ukurannya seimbang.
- Model legacy (`tesseract-core.wasm.js`) — tidak dipakai karena mode `LSTM_ONLY`.

## Ukuran

Total ≈ 17,8 MB (17.830.500 byte): wrapper 63 KB, worker 111 KB, core SIMD-LSTM 6,75 MB
(js 3,90 MB + wasm 2,86 MB), core non-SIMD 6,75 MB (js 3,90 MB + wasm 2,86 MB), eng 2,95 MB,
ind 1,19 MB. Berkas ini ikut masuk ke APK (folder `docs/` dibungkus Capacitor).

## Checksum (sha256)

```
64871d76c75609fd5413b88a8171e2ef40deedd77d5875ba23df104b2d05eb29  tesseract.esm.min.js
576b7df7e3393e137e51849357c9adb53fe7ac1bb69bfa06cf3d61520f182c6d  worker.min.js
c58b46a4c796c0b8afccf77591d5b875b6896b45d402bbce8caa6f5362447b38  core/tesseract-core-simd-lstm.wasm.js
34e8d50cac216427d86bf397d610fdd9f49492539bbcdfbfccc4eda20c810bea  core/tesseract-core-simd-lstm.wasm
eef5f8b2f8e20e150680b20adaec4a60babafee3adbe8a94583c81fee46e8680  core/tesseract-core-lstm.wasm.js
66b17df6e20c5329a17ffa9c202a47eaa3e32500b253d4c7f38e7f2bc01457c3  core/tesseract-core-lstm.wasm
45b4cb346724ac1774f1c36f42f182b887bcdb28ebe63e6fff90ac41f3fcff91  lang/4.0.0_best_int/eng.traineddata.gz
a8896d2f584a5baae73d658b86b765acc7b15b7ba05e014f62b1a2a23b699a91  lang/4.0.0_best_int/ind.traineddata.gz
```

## Cara memperbarui

1. `npm pack tesseract.js@<versi>`, `tesseract.js-core@<versi>` (versi yang sama dengan
   dependensi `tesseract.js`), `@tesseract.js-data/eng@<versi>`, `@tesseract.js-data/ind@<versi>`,
   lalu ekstrak.
2. Salin `dist/tesseract.esm.min.js` dan `dist/worker.min.js` dari `tesseract.js`.
3. Salin `tesseract-core-simd-lstm.wasm.js` dan `tesseract-core-lstm.wasm.js` **beserta** pasangan `.wasm`-nya dari
   `tesseract.js-core`. Berkas `.wasm` dicari di folder yang sama dengan `.wasm.js`.
4. Salin `4.0.0_best_int/*.traineddata.gz` dari paket data.
5. Perbarui tabel, ukuran, dan checksum di atas. Jalankan `tools/uji/ocr-teks.mjs` dan uji
   Chromium OCR.
