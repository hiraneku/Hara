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

## Perbaikan · Menu warna teks (di luar urutan B1–B8)

- **Gejala:** menu warna teks "tidak bekerja". Setelah warna dipilih, teks tidak berubah dan menu tertutup.
- **Akar masalah (diukur di Chromium):** isi menu warna setinggi 507–525 px, sedangkan popup dibatasi 420 px dan area yang terlihat hanya sampai 432 px. Tombol **Pakai** (y 430–464) hampir tertutup, dan **Bawaan** (y 477–538) sama sekali tidak terlihat. Ketukan pada area itu dianggap "klik di luar" dan menutup menu, sehingga warna tidak diterapkan.
- **Perbaikan:**
  - `docs/styles/notes.css`: kelas `.pop.pop-warna` dengan batas tinggi `min(100vh/100dvh − 24px, 580px)`. Semua kontrol terlihat tanpa menggulung.
  - `docs/notes/menus/pop.js`: `setPopIsi` memberi kelas `pop-warna` hanya kalau isinya menu warna. Di `openPop`, menu warna yang tidak muat di atas jangkar dipindah ke bawah jangkar, tetap di dalam layar. Menu lain tidak berubah.
- **Dependensi:** tidak ada ID lain. Menyentuh `pop.js` yang dipakai semua popup, jadi perubahannya dibatasi hanya untuk kelas `pop-warna`.
- **Cara uji:**
  - Browser Chromium (harness di luar repo, `warna-semua.mjs`), dua mode: desktop 1280×800 dan HP 390×760 dengan sentuhan sungguhan. Hasil: **22/22 lulus** di keduanya, tanpa galat JS. Mencakup bilah teks → swatch, roda + Pakai, kolom kode rgb(), sasaran Sorotan (`span.wsr`), Bawaan, dan bilah utama tanpa seleksi lalu mengetik.
  - Pembanding: dengan batas lama 420 px disimulasikan, **5 pengujian gagal** tepat di Pakai dan Bawaan. Jadi uji ini memang menangkap bug-nya.
  - `warna-atas.mjs`: blok teks dekat atas layar. Menu pindah ke bawah dan tetap di dalam layar, di desktop dan HP.
  - `tools/uji/menu-warna.mjs` (baru): **7/7 lulus**.
  - `npm test` penuh: exit 0 (`/tmp/npmtest-warna.log`).
- **Catatan:** bilah utama di HP punya tombol warna di luar layar (perlu digeser horizontal). Itu perilaku bilah yang sudah ada, bukan bug menu warna, dan belum diubah.

## Perbaikan · Cara mengetik dengan format (di luar urutan B1–B8)

- **Gejala:** format warna dan sorotan yang menunggu tidak langsung aktif. Pengguna harus menekan spasi plus huruf berulang kali. Hasilnya teks berserpihan, misalnya `Awal` + `<span>erah merah</span>`. Ctrl+B di blok baru juga tidak membuat teks tebal.
- **Akar masalah (diukur di Chromium):**
  1. Warna dan sorotan lekat: karakter pertama masuk ke dalam span, karakter kedua keluar ke luar span, sisanya masuk span baru.
  2. Mode Bawaan di tengah ketikan: browser menaruh huruf berikutnya kembali ke ujung span lama, karena kursor tepat di batas dua elemen.
  3. Ctrl+B/I/U memicu perintah native `formatBold` dkk. Di blok kosong perintah itu tidak berefek, dan aplikasi tidak menangkapnya.
  4. `toggleMark` membuat galat `setStartBefore` saat melepas format dari seluruh isi, karena `normalize()` membuang node yang masih dipakai range.
- **Perbaikan:**
  - `docs/notes/editor/warna.js` dan `sorotan.js`: `warnaIkutUjung()` dan `sorotIkutUjung()`. Keduanya bernilai true saat format lekat ada dan kursor di ujung span, atau saat mode Bawaan aktif. Dipakai di `events.js` sehingga karakter ditulis manual lewat jalur bungkus.
  - `docs/notes/editor/events.js`: `beforeinput` menangkap `formatBold`, `formatItalic`, `formatUnderline`, dan `formatStrikeThrough`, lalu memanggil `toggleMark`, sama seperti tombol bilah. Termasuk `snap()` agar Ctrl+Z tetap bekerja.
  - `docs/notes/editor/marks.js`: range dibuat sebelum `normalize()`.
- **Dependensi:** tidak ada ID roadmap. Menyentuh jalur ketik umum, jadi dibatasi pada kondisi lekat, Bawaan, dan format native.
- **Cara uji (browser Chromium, harness di luar repo, hasil nyata):**
  - Ketik kalimat 75 karakter, DELAY 0 dan 80, mode warna, sorotan, Ctrl+B, Ctrl+I, tombol Tebal dan Miring bilah. Semua benar, tidak ada huruf hilang, spasi awal tetap ada.
  - Alur Enter (`ENTER=1`): format tetap benar di blok baru.
  - Bawaan di tengah ketikan, warna dan sorotan: `Awal biru satu hitam dua tiga`, dengan warna hanya pada "biru satu".
  - Ctrl+B dan Ctrl+I pada teks yang diblok membungkus, lalu Ctrl+B kedua melepas. Ctrl+Z membatalkan miring. 4/4 lulus, tanpa galat JS.
  - `warna-semua.mjs`: desktop 22/22 dan HP 22/22.
  - `npm test` penuh: exit 0 (`/tmp/npmtest-ketik.log`).
- **Catatan:**
  - Pesan commit `7abe65a` menulis "37 modul ketik". Itu keliru. 37 adalah jumlah lolos dari salah satu tes. Yang benar: `npm test` exit 0.
  - Tes ketik lengkap ada di `/home/user/unduh/a8-browser/` (di luar repo), bukan di `npm test`.
  - Belum diuji: Ctrl+U dan Ctrl+Shift+X lewat keyboard. Tombol bilah untuk garis bawah dan coret belum diuji ulang di jalur `toggleMark` yang baru.
  - Belum diverifikasi: apakah tombol bilah untuk melepas tebal pada seleksi penuh juga kena galat `setStartBefore` di versi sebelum perbaikan ini.

## Perbaikan · Ketik dengan keyboard HP (IME) dan spasi (di luar urutan B1–B8)

- **Gejala (dilaporkan pengguna):** di catatan kosong dengan warna aktif, huruf hanya berwarna setelah spasi plus huruf ditekan berulang. Spasi juga menumpuk. Keluhan ini memengaruhi semua format, bukan hanya warna.
- **Akar masalah (diukur di Chromium, IME disimulasikan lewat CDP `Input.imeSetComposition`):**
  1. Saat komposisi IME selesai, `compositionend` hanya membungkus **satu karakter** dan hanya untuk format marks. Warna dan sorotan yang menunggu tidak pernah diterapkan pada teks IME. Hasil awal: `halo` polos untuk warna dan sorotan, dan tebal hanya mengenai `o`.
  2. Spasi di dalam span berwarna adalah spasi biasa. Chromium menghapusnya saat kata baru disisipkan (`"halo dunia"` menjadi `"halodunia"`). Di luar span, spasi disimpan sebagai `&nbsp;` dan aman.
  3. Versi sebelumnya juga menghilangkan separuh spasi saat mengetik cepat (8 spasi menjadi 4).
- **Perbaikan:**
  - `docs/notes/editor/komposisi.js` (baru): `rentangTerakhir(n)` dan `bungkusTerakhir(n, bungkus)`. Membungkus n karakter sebelum caret, bisa melintasi beberapa text node. Modul ini tidak mengimpor cleanup.js supaya tidak menambah siklus impor.
  - `docs/notes/editor/events.js`: `compositionend` memakai `e.data.length` sebagai n. Format marks, warna, dan sorotan yang menunggu dibungkus untuk n karakter itu.
  - `docs/notes/editor/marks.js`: `wrapMarkKomposisi(n)`.
  - `docs/notes/editor/warna.js` dan `sorotan.js`: `bungkusWarnaKomposisi(n)` dan `bungkusSorotKomposisi(n)`. Melewati teks yang sudah berada di span dengan warna yang sama.
  - `docs/styles/notes.css`: `white-space: pre-wrap` untuk blok teks (`.b-p`, `.b-todo`, `.b-li`, `.b-ol`, `.b-quote`, `.b-cal`, `h1–h3`). Blok lain (tabel, rumus, gambar) tidak diubah.
- **Dependensi:** lanjutan dari perbaikan ketik di `7abe65a`/`c7b08bd`. Tidak ada ID roadmap.
- **Cara uji (Chromium headless, harness di luar repo, hasil nyata):**
  - HP 390×760 dengan ketukan sentuh, IME lewat CDP: `halo` untuk plain, warna, sorotan, dan tebal. Hasil: benar, tanpa `￼`.
  - Urutan campuran IME dan tombol: `halo`, spasi, `dunia`, spasi, `apa kabar`. Warna dan sorotan: `halo dunia apa kabar` seluruhnya berwarna. Tebal: benar.
  - 8 spasi lalu `halo` dengan tombol: 8 spasi tersimpan dan `halo` berwarna.
  - Regresi `ketik-format` (DELAY 0 dan 80, semua mode), `ENTER=1`, `ketik3`, `ketik-bawaan` (warna dan sorotan), `ctrl-format` 4/4, `warna-semua` desktop 22/22 dan HP 22/22.
  - `npm test` penuh: exit 0 (`/tmp/npmtest-ime.log`).
- **Belum terbukti:**
  - **Karakter `￼` (U+FFFC) tidak bisa direproduksi di Chromium desktop.** Dugaan: Chromium Android menampilkan elemen atomik (misalnya tombol pegangan blok `button.blk-h` di setiap blok) sebagai `￼`. Dugaan ini belum diverifikasi. Perlu uji di HP Android sungguhan.
  - Mode Bawaan belum didukung untuk komposisi IME. Teks IME yang mendarat di span warna tetap berwarna.
  - Klik mouse di blok kosong di desktop memindahkan kursor ke `DIV@0` di `blocks`, dan ketikan tidak masuk. Sudah ada sebelum perubahan ini (`a8e87d7` dan base sesi). Di HP dengan ketukan sentuh tidak terjadi.
