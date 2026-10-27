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
- (Diperbarui setelah B1c) Anotasi (B1b) dan ekspor PDF hasil anotasi (B1c) sudah ada.

## Status

- B1a: **Implemented** (penampil dan vendor), dengan keterbatasan di atas.
- B1: lihat bagian B1b di atas. B1b sudah dikerjakan (lihat "Status (B1)").

## Berikutnya

- B1b (anotasi dan sumber asli terpisah) menunggu persetujuan pengguna.
- Jalankan uji mutasi M1–M4 untuk B1a bila pengguna minta.
- Rapikan bar tombol PDF (ikon).

## Perubahan 13 · B1b — Anotasi PDF (coret, sorot, garis, komentar)

- **ID:** B1 (PDF import dan anotasi). Ini **B1b**, bagian kedua. Isinya: alat coret, sorot, garis, dan komentar per halaman PDF. **Ekspor PDF yang sudah dianotasi (§1.5) belum ada** dan ditunda ke B1c.
- **Alasan urutan:** B1b mengikuti B1a karena anotasi butuh penampil yang sudah jalan. Disetujui pengguna dengan "Oke b1b dulu saja".
- **Dependensi:** B1a (`penampil.js`). Penyimpanan memakai blob IndexedDB (`core/blobs.js`). Sapuan blob yatim (`notes/editor/image.js`) dan cadangan JSON (`notes/data-io.js`) ikut diubah, lihat di bawah.
- **Keputusan desain:**
  - **PDF asli tidak diubah.** Anotasi disimpan sebagai blob JSON terpisah dengan kunci `anot-<blobId>`. Hash blob PDF sudah diuji sama sebelum dan sesudah anotasi.
  - **Koordinat ternormalisasi 0–1 per halaman** (bukan piksel), jadi posisi tetap benar saat zoom berubah.
  - **Model blok catatan tidak diubah.** Hanya blok `file` yang meneruskan `blobId` ke penampil.
- **Yang berubah:**
  - `docs/notes/pdf/anotasi.js` (baru, murni tanpa DOM): `kunciAnotasi`, `titikTernormal`, `anotasiValid`, `buatAnotasi`, `tambahAnotasi`, `anotasiHalaman`, `batalTerakhirHalaman`, `bacaAnotasi`, `tulisAnotasi`. Batas komentar 500 karakter.
  - `docs/notes/pdf/anotasi-simpan.js` (baru): `muatAnotasi`, `simpanAnotasi` lewat `core/blobs.js`.
  - `docs/notes/pdf/penampil.js`: opsi `bukaPenampilPdf(data, nama, { blobId })`. Bilah kedua dengan tombol Coret, Sorot, Garis, Komentar, Batal, dan status. Lapisan SVG `.pdfv-anot` di atas kanvas. Bilah hanya tampil jika ada `blobId`.
  - `docs/notes/editor/blok-generasi-baru.js`: `bukaPdfDariBlok` meneruskan `data-blob` sebagai `blobId`.
  - `docs/notes/editor/image.js`: `bersihkanBlobYatim` menganggap `anot-<id>` dipakai selama `<id>` dipakai. Tanpa ini, anotasi akan disapu setelah 24 jam.
  - `docs/notes/data-io.js`: `idBlobDipakai` ikut mengembalikan `anot-<id>`, sehingga anotasi ikut dicadangkan. Tanpa ini, cadangan JSON kehilangan anotasi. Kesalahan ini ditemukan lewat uji dan sudah diperbaiki.
  - `docs/styles/notes.css`: blok `.pdfv-kwrap`, `.pdfv-anot`, `.pdfv-bar2`, `.pdfv-status`.
  - `tools/uji/pdf-anotasi.mjs` (baru): 32 pengujian Node (jsdom untuk bagian cadangan).
  - Stempel `?v=` menjadi `20261026024309` (128 berkas, karena `version.mjs` menstempel seluruh `docs/`).
- **Cara kerja:** pilih alat (tombol aktif, lapisan SVG bisa disentuh), lalu seret di halaman. Komentar: ketuk halaman, isi teks di kotak. Anotasi komentar diketuk lagi (saat tidak ada alat aktif) untuk membaca teksnya. Batal menghapus anotasi terakhir di halaman aktif saja. Setiap perubahan langsung disimpan.

## Cara uji yang dijalankan (B1b)

- **Node (`node tools/uji/pdf-anotasi.mjs`): 32/32 lulus.** Mencakup koordinat dan penjepitan, bentuk data yang diterima dan ditolak, batal hanya di halaman aktif, parsing data rusak, penyimpanan di IndexedDB palsu, hash PDF asli tidak berubah, dan cadangan (`anot-<id>` ikut, blob yatim tidak ikut).
  - **Uji mutasi cadangan:** dengan `data-io.js` versi lama (HEAD), uji cadangan gagal (1 gagal, 31 lulus). Dengan versi baru, 32/32 lulus.
- **Browser Chromium (`anot.mjs`, harness di luar repo, viewport ponsel 390×844, DPR 2): 21/21 lulus.**
  - Jalur nyata: PDF disimpan lalu dibuka lewat `bukaPdfDariBlok`.
  - Keempat jenis anotasi tergambar di halaman 1 (sorot, garis, coret, komentar). Screenshot diperiksa: sorot kuning tetap membiarkan teks "Halaman 1" terbaca.
  - Anotasi per halaman: halaman 2 mulai kosong. Batal di halaman 2 tidak menyentuh halaman 1. Batal di halaman kosong hanya memberi pesan.
  - Zoom: dua kali "+" mengubah lebar kanvas dari 366 ke 450 piksel, dan posisi relatif anotasi tetap sama (x 0,15, lebar 0,40).
  - Muat ulang aplikasi, buka lagi: empat anotasi muncul kembali dan teks komentar utuh.
  - Hash PDF asli sama sebelum dan sesudah anotasi.
  - Sapuan blob yatim (usia dimanipulasi jadi 48 jam): blob yatim terhapus. Anotasi dan PDF yang masih dirujuk tetap ada. Setelah catatan dihapus, PDF dan anotasinya ikut disapu.
  - Tidak ada galat JavaScript di halaman.
  - Galat yang ditemukan saat uji dan sudah diperbaiki: uji zoom awalnya terlalu lemah (satu langkah zoom hanya menambah 9 piksel karena mode awal "Pas lebar"). Uji sudah diubah menjadi dua langkah. Ini perbaikan uji, bukan kode fitur.
- **`npm test` penuh: exit 0**, "SEMUA 37 LOLOS" (`/tmp/npmtest-b1b.log`). Dijalankan di worktree bersih `wt-b1b`.

## Belum diuji (B1b)

- **Belum diuji di HP Android sungguhan.** Sentuhan di Chromium hanya lewat mouse. Pointer events dan `touch-action: none` sudah diset, tetapi belum dibuktikan di Opera HP.
- **Pemulihan dari cadangan JSON** (impor) belum diuji end-to-end. Yang diuji hanya ekspor dan bahwa kunci `anot-<id>` ikut.
- Uji mutasi M1–M4 untuk `pdf-anotasi.mjs` belum dijalankan.
- Uji file PDF besar dan PDF dengan banyak anotasi belum dilakukan.

## Keterbatasan yang diketahui (B1b)

- ~~Ekspor PDF yang dianotasi belum ada~~ (sudah ada di B1c, lihat Perubahan 14).
- Komentar memakai `window.prompt` dan `window.alert`. Ini sederhana dan bisa terlihat kasar di HP. Kotak komentar yang proper belum dibuat.
- Tidak ada hapus per anotasi atau edit. Hanya Batal (anotasi terakhir di halaman aktif).
- Terjemahan en dan ja untuk string baru belum ditambahkan. Teksnya tampil dalam bahasa Indonesia sebagai fallback.
- Ikon bilah tombol masih kasar (sama dengan catatan B1a).

## Status (B1)

- B1a: **Implemented**.
- B1b: **Implemented**, dengan keterbatasan di atas dan belum diuji di HP sungguhan.
- B1c (ekspor PDF yang dianotasi): **Implemented** (lihat Perubahan 14). Teks hasil ekspor tidak bisa dipilih.
- **B1 selesai** (B1a, B1b, B1c). Belum diuji di HP.
- B5, B3, B4, B2, B6, B8: belum dikerjakan.

## Berikutnya

- Uji B1b di HP (Opera Android) setelah APK atau Pages terbaru tersedia.
- Uji B1 di HP (Opera Android): anotasi, ekspor, dan keluhan 1 (opsi A + perbaikan pembungkusan komposisi).

## Perubahan 14 · B1c — Ekspor PDF yang sudah dianotasi (§1.5)

- **ID:** B1 (PDF import dan anotasi). Ini **B1c**: ekspor PDF hasil anotasi. Ini bagian terakhir B1.
- **Alasan urutan:** dikerjakan setelah B1b, karena ekspor butuh anotasi yang sudah tersimpan. Disetujui pengguna dengan "lanjut".
- **Dependensi:** B1a (penampil dan pdf.js), B1b (anotasi). Tidak ada dependensi ke ID lain.
- **Cara yang dipilih (paling pasti dan sederhana, sesuai keputusan pengguna):** setiap halaman dirender ke gambar JPEG lewat pdf.js. Anotasi (coret, sorot, garis, penanda komentar) digambar di atas gambar. Gambar-gambar itu ditulis ke PDF baru oleh penulis kecil sendiri. Komentar juga disimpan sebagai anotasi PDF asli (`/Text`) yang berisi teksnya. Tidak ada pustaka baru.
- **Yang berubah:**
  - `docs/notes/pdf/ekspor-pdf.js` (baru): `teksPdfUtf16`, `tulisPdfGambar`, `gambarAnotasiKanvas`.
  - `docs/notes/pdf/penampil.js`: tombol "Ekspor PDF" di bilah anotasi, fungsi `eksporAnot`, `namaEkspor` (`<nama>-anotasi.pdf`), `unduhBerkas`. Status menampilkan kemajuan per halaman.
  - `tools/uji/pdf-ekspor.mjs` (baru): 26 pengujian Node.
  - Stempel `?v=` menjadi `20261026025826` (128 berkas).
- **Batasan jujur:**
  - **Teks halaman di PDF hasil ekspor TIDAK bisa dipilih atau dicari** (halaman sudah berupa gambar). PDF asli tidak diubah.
  - Ukuran berkas besar: gambar JPEG per halaman, skala sampai 2× dengan sisi terpanjang sekitar 2200 piksel.
  - Komentar tampil sebagai penanda di gambar dan sebagai anotasi `/Text`. Penanda `/Text` dibuka dengan ketuk, tergantung pembaca PDF.
  - Hasil belum disimpan kembali sebagai lampiran di catatan. Unduhan langsung.
- **Cara uji (hasil nyata):**
  - `node tools/uji/pdf-ekspor.mjs`: **26/26 lulus.** Mencakup teks UTF-16, struktur xref (setiap offset menunjuk ke `N 0 obj`), `startxref`, jumlah halaman, MediaBox, gambar DCT, anotasi `/Text` dan teksnya, penolakan input rusak, dan penggambar anotasi.
  - **Chromium (`eks.mjs` di luar repo): 7/7 lulus.** Berkas terunduh sebagai `uji-anotasi.pdf`. PDF sumber tidak berubah (hash sama). Berkas hasil bisa dibuka dan dirender ulang di penampil.
  - **Pembaca PDF independen (pypdf 6.21.2, di luar repo):** 2 halaman, MediaBox 300×400, gambar 600×800 RGB, satu anotasi `/Text` di halaman 1 dengan isi "ekspor komentar", dan halaman 2 tanpa komentar. Gambar halaman 1 diperiksa: sorot kuning dan penanda biru tampil.
- **Belum diuji:** ekspor PDF besar (banyak halaman), ekspor di HP, dan pembukaan hasil di pembaca PDF selain pdf.js dan pypdf.

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

## Perbaikan · Warna mati saat keyboard turun, dan caret di level kontainer

- **Gejala (dilaporkan pengguna):**
  1. Di catatan kosong, warna sudah diaktifkan, tetapi huruf pertama tidak berwarna sampai spasi ditekan. Kadang berhasil setelah huruf diketik lalu dihapus berulang.
  2. Warna aktif, mengetik `halo`, menghapusnya, lalu keyboard turun: warna mati sendiri.
- **Akar masalah (terbukti di harness, bukan tebakan):**
  - Keluhan 2 **terbukti**. Saat seleksi keluar dari editor (keyboard turun, fokus pindah), `curBlock()` jatuh ke blok terakhir. Pengamat `selectionchange` di warna, sorotan, font, dan marks menganggap itu "pindah blok" lalu membuang niat format yang menunggu. Dua paragraf, warna di paragraf pertama, seleksi keluar: `lekat` menjadi `null`. Satu paragraf: tidak reset, karena blok terakhir sama dengan blok aktif.
  - `setWarna`, `setSorotan`, dan `setFont` membuang niat diam-diam jika seleksi tidak di editor, bukan memulihkan caret dulu.
  - `ensureCaret()` (caret.js) menyisipkan text node di kontainer `.ed-doc` jika caret berada di level kontainer. Itu teks di luar blok.
  - Keluhan 1 **belum direproduksi**. Di harness, huruf pertama selalu berwarna, termasuk setelah ketuk, IME, spasi-BS berulang, catatan kedua, dan seleksi hilang sebelum Pakai. Kemungkinan penyebab tetap, tetapi belum dibuktikan: keyboard Android sungguhan tidak ada di harness.
- **Perbaikan:**
  - `docs/notes/editor/caret.js`: helper baru `seleksiDiEditor()`. `ensureCaret()` memindahkan caret dari level kontainer ke blok terdekat, tidak menyisipkan teks di kontainer.
  - `docs/notes/editor/warna.js`, `sorotan.js`, `font.js`: `selectionchange` mengabaikan seleksi di luar editor. `setWarna`, `setSorotan`, `setFont` memulihkan caret dengan `ensureCaret()` dulu, dan hanya menyimpan niat jika tetap tidak ada caret.
  - `docs/notes/editor/events.js`: `selectionchange` marks memakai aturan yang sama.
  - Sempat dicoba: syarat `blokTerakhir.isConnected` untuk mengabaikan blok yang sudah lepas. Dibatalkan. Ia membuat 3 berkas uji gagal (`caret-elemen`, `kombinasi-dasar`, `font-ganti`), karena pindah blok setelah render ulang tidak lagi mereset niat. Alasan reset catatan baru juga tidak terbukti.
- **Dependensi:** lanjutan dari `6ec9d1a` (komposisi IME). Tidak ada ID roadmap.
- **Cara uji (Chromium headless, harness di `/home/user/unduh/a9-lekat/lekat.mjs`, hasil nyata):**
  - Keluhan 2: dua paragraf, `T:abc|ENTER|NAIK|PAKAI|T:halo|SELKELUAR`. Sebelum: `lekat` null. Sesudah: `#e53935` tetap. Satu paragraf: tetap.
  - Caret di kontainer: `CONT|PAKAI|T:halo`. Sebelum: `#teks` di root `.ed-doc`. Sesudah: tidak ada. Hasil `halo` berwarna.
  - Seleksi hilang sebelum Pakai, kosong dan IME: berwarna.
  - Spasi dan BS berulang sebelum huruf (`T: |BS:1|…|T:halo`, dan IME `K: |K:  |K:halo`): tidak ada karakter sampah, spasi yang dihapus benar-benar hilang.
  - Regresi browser, semua hijau: `ketik-bawaan`, `ketik-bawaan-sorot`, `ctrl-format` 4/4, `bold-enter`, `warna-semua` 22/22, `ketik3`, `ketik-format` untuk mode warna, sorotan, bilah tebal, bilah miring, Ctrl+I, Ctrl+B pada DELAY 0 dan 80, serta `ENTER=1`. IME `ime.mjs` HP: `halo`. IME urut `ime2.mjs`: `halo dunia apa kabar` utuh.
  - `npm test` penuh: exit 0, 37/37 di `kondisi-tepi`, semua berkas uji lulus (`/tmp/npmtest-keluhan2.log`).
- **Belum terbukti:**
  - Keluhan 1 di HP Android sungguhan. Perlu langkah persis dari pengguna (lihat catatan di bawah).
  - Chromium kadang menyisipkan `<font color="…">` di sekitar teks hasil komposisi IME saat caret berada di span berwarna yang sudah dikosongkan (BS sampai kosong lalu mengetik). Warnanya tetap benar, dan struktur ini belum diperiksa lebih lanjut.
  - Karakter `￼` (U+FFFC) di HP belum direproduksi. Lihat entri sebelumnya.

## Perbaikan · Huruf pertama di catatan kosong tidak berwarna (keluhan Opera)

- **Gejala (dilaporkan pengguna, Opera di HP):** catatan baru, warna diaktifkan, lalu mengetik huruf pertama. Huruf itu tidak berwarna. Kalau spasi diketik dulu, warna langsung aktif. Keyboard biasa dan IME di Chromium tidak mengalami ini.
- **Akar masalah (direproduksi dengan tiruan urutan event, lihat di bawah):** huruf pertama masuk lewat komposisi IME. Pembungkus warna di `compositionend` bergantung pada dua hal yang bisa meleset di keyboard HP:
  1. Jumlah karakter `n` diambil dari `e.data`. Kalau `e.data` kosong saat `compositionend`, `n = 0` dan tidak ada yang dibungkus.
  2. `rentangTerakhir()` menolak caret yang berada di level elemen. Setelah komposisi, browser bisa menaruh caret di elemen blok, dan itu juga membuat tidak ada yang dibungkus.
- **Perbaikan:**
  - `docs/notes/editor/komposisi.js`: `panjangTeks(blok)` baru. `rentangTerakhir(n)` menerima caret teks maupun elemen.
  - `docs/notes/editor/events.js`: `compositionstart` mencatat blok dan panjang teksnya. `compositionend` menghitung `n` dari selisih panjang teks, dengan `e.data` sebagai cadangan.
- **Dependensi:** lanjutan dari `e1934a9`. Tidak ada ID roadmap.
- **Cara uji (Chromium headless, hasil nyata):**
  - Catatan kosong, warna aktif, huruf pertama lewat tiruan urutan event (`/home/user/uji-ime/kosong.mjs`):
    - `compositionend` data "h", caret di teks: berwarna (sebelum dan sesudah).
    - `compositionend` data KOSONG, caret di teks: sebelum TIDAK berwarna, sesudah berwarna.
    - `compositionend` data KOSONG, caret di elemen: sebelum TIDAK berwarna, sesudah berwarna.
    - `compositionend` data "h", caret di elemen: sebelum TIDAK berwarna, sesudah berwarna.
    - Keyboard biasa dan IME CDP: berwarna (sebelum dan sesudah).
  - Regresi (`/home/user/uji-ime/regresi.mjs`), hasil sama sebelum dan sesudah: IME "halo" + spasi + IME "dunia" berwarna penuh; IME di tengah teks "Aw[xy]al"; tebal lewat IME "<b>halo</b>"; spasi dulu lalu warna dan IME.
  - `npm test` penuh: exit 0, 37/37 di `kondisi-tepi`.
- **Belum terbukti:** urutan event keyboard Opera sebenarnya di HP belum dicatat. Tiruan di atas memodelkan dua kemungkinan (data kosong dan caret elemen). Perlu konfirmasi dari HP.

- **Opsi A (dipilih pengguna, 2 langkah):**
  - Percobaan pertama, **gagal dan dibuang:** membuat span kosong di `compositionstart`. Di Chromium, huruf komposisi tetap ditulis ke teks lama di luar span, jadi huruf pertama tetap tidak berwarna saat komposisi. Akhir teks benar hanya karena pembungkusan di `compositionend`. Pendekatan ini TIDAK dipakai.
  - Perbaikan yang dipakai: di `compositionstart`, bila blok hanya berisi spasi (catatan kosong, atau spasi di awal) dan warna menyala, warna **dipasang ke elemen blok** (`style.color`) selama komposisi. Node teks dan kursor tidak disentuh. Warna blok dilepas di `compositionend`, SETELAH pembungkusan.
  - Kode: `docs/notes/editor/events.js` (`kompWarnaBlok`, `compositionstart`, `compositionend`), `docs/notes/editor/warna.js` (`warnaUntukKomposisi()` baru).
  - **Uji (Chromium, simulasi IME lewat CDP `Input.imeSetComposition`, `ime-a.mjs` di luar repo): 8/8 lulus.** Huruf pertama sudah berwarna merah (`rgb(229, 57, 53)`) sebelum komposisi selesai. Versi HEAD gagal di cek itu (warna `rgb(28, 27, 24)`, hitam). "halo" utuh berwarna tanpa karakter sampah. Spasi lalu "dua" berwarna biru tanpa sampah.
  - **Batasan:** sorotan belum masuk opsi ini (warna blok akan menyorot seluruh lebar blok). Sorotan, tebal, miring, dan font tetap dibungkus di `compositionend`. Blok yang sudah berisi teks juga belum. Hasil di Opera Android BELUM diuji, karena simulasi Chromium tidak sama dengan keyboard HP.

## Perbaikan · Komposisi IME: pembungkusan memakai posisi awal, dan urutan teks di span bersarang (keluhan 1, lanjutan)

- **ID:** keluhan 1 (di luar urutan B1–B8). Lanjutan dari opsi A (`4cce2fd`). Bukan ID roadmap baru.
- **Alasan urutan:** keluhan 1 masih terjadi di HP setelah `4cce2fd`, jadi diperbaiki dulu sebelum B5.
- **Gejala:** di HP (Opera Android), huruf pertama catatan baru tetap tidak berwarna. Setelah spasi, warna baru aktif.
- **Akar masalah (dibuktikan di Chromium, mode `cend2` di `spasi.mjs`, di luar repo):**
  1. `dariDom` hanya dihitung kalau blok komposisi sama dengan blok kursor saat itu. Kalau kursor sudah pindah, `n` jatuh ke `e.data`, yang di HP sering kosong. Akibatnya tidak ada yang dibungkus.
  2. Pembungkus memakai posisi kursor saat `compositionend`. Kalau kursor ada di `ed-doc`, pembungkusan gagal. Huruf `h` tertinggal sebagai teks polos, lalu warna blok dilepas, sehingga hitam.
- **Perbaikan:**
  - `docs/notes/editor/komposisi.js`: `posisiKaret`, `rentangPosisi`, `bungkusRentang`, `bungkusKomposisi`. Pembungkusan memakai posisi yang dicatat saat `compositionstart`, bukan kursor saat itu. `bungkusTerakhir` tetap ada sebagai cadangan.
  - `docs/notes/editor/events.js`: `compositionstart` mencatat `pos`. `dariDom` dihitung dari blok awal. `awal` diteruskan ke pembungkus warna dan sorotan.
  - `docs/notes/editor/warna.js`, `sorotan.js`: `bungkusWarnaKomposisi(n, awal)` dan `bungkusSorotKomposisi(n, awal)`.
  - **Bug lama yang ditemukan saat uji (ada di HEAD juga):** `docs/notes/editor/cleanup.js`, bagian "ratakan span bersarang", memindahkan span dalam ke luar induknya. Akibatnya teks tertukar: `Aw[xy]al` menjadi `Awal[xy]`. Sekarang induk dipecah jadi dua salinan (warna/font sama), span dalam di tengahnya, dan kursor dipulihkan. Perbaikan ini berlaku untuk semua span bersarang (warna, sorotan, font), bukan hanya komposisi IME.
  - `tools/uji/pdf-anotasi.mjs`: stempel `store.js` yang ditulis mati diganti pembacaan dari `app.js`. Tanpa ini, setiap `tools/version.mjs` membuat uji ini gagal (2 kegagalan).
- **Dependensi:** opsi A (`4cce2fd`), komposisi (`6ec9d1a`), dan cleanup span bersarang (`cleanup.js`). Tidak ada dependensi ke ID lain.
- **File yang berubah:** `komposisi.js`, `events.js`, `warna.js`, `sorotan.js`, `cleanup.js`, `tools/uji/komposisi-kursor.mjs` (baru), `tools/uji/warna-bersarang.mjs` (baru), `tools/uji/pdf-anotasi.mjs`, dan stempel `?v=` (128 berkas).
- **Cara uji (hasil nyata):**
  - `node tools/uji/komposisi-kursor.mjs` (baru, jsdom, event komposisi tiruan): **5/5 lulus**. Versi HEAD (`4cce2fd`): **3/5**. Kasus yang gagal di HEAD: catatan kosong dengan kursor pindah ke `ed-doc`, dan "tengah kata + kursor ke ed-doc".
  - `node tools/uji/warna-bersarang.mjs` (baru, jsdom): **6/6 lulus**. Versi HEAD: **2/6**. Kasus tengah, awal, dan sorotan bersarang gagal di HEAD, dan caret tetap di tempat setelah pecah.
  - Chromium (harness di luar repo): mode `cend2`, `cend`, `elemen`, `komposisi`, `ketik`, dan `tengah` lulus tanpa galat. `cend2`: `h`, spasi, dan `a` semuanya merah. `tengah`: `Aw` merah, `xy a` biru, `al` merah.
  - `ime-a.mjs` **8/8**. `anot.mjs` **21/21**. `eks.mjs` **7/7**.
  - `npm test` penuh: **exit 0**, `SEMUA 37 LOLOS`, termasuk dua uji baru.
- **Catatan:** skenario `rekomp` di harness menghasilkan spasi ganda (`h  a`). Itu juga terjadi di HEAD, jadi bagian dari skenario harness, bukan efek perubahan ini.
- **Belum terbukti:** keluhan 1 **belum terbukti di Opera HP**. Status tetap terbuka sampai pengguna menguji di HP. Keluhan 2 (warna mati saat keyboard turun) belum ditangani di bagian ini.

## Perbaikan · Spasi saat komposisi belum ditutup (keluhan 1, lanjutan kedua)

- **ID:** keluhan 1 (di luar urutan B1–B8). Lanjutan dari perbaikan di atas. Pengguna melaporkan gejala masih sama di HP.
- **Gejala (dilaporkan pengguna):** huruf pertama catatan baru berwarna saat diketik, lalu jadi putih setelah spasi ditekan. Kata berikutnya berwarna.
- **Akar masalah (direproduksi di Chromium, urutan event keyboard HP):**
  - Saat spasi ditekan ketika huruf pertama masih dalam komposisi, browser **tidak mengirim `compositionend`**. Urutannya: `keydown` (spasi), lalu `beforeinput` dan `input` `insertText`.
  - Handler `keydown` hanya mematikan bendera komposisi. Komposisi tidak diakhiri, sehingga huruf pertama tidak pernah dibungkus warnanya. Warna sementara di elemen blok (opsi A) ikut hilang, dan huruf tampil polos.
  - Sebelumnya perbaikan `compositionend` tidak pernah dijalankan untuk kasus ini. Itu sebabnya perbaikan sebelumnya tidak menyelesaikan keluhan di HP.
- **Perbaikan (`docs/notes/editor/events.js`):**
  1. `akhiriKomposisi(...)`: satu jalur untuk mengakhiri komposisi (format, warna, sorotan, perapian). Dipakai oleh `compositionend` (ditunda sebentar) dan oleh dua pemicu di bawah (langsung).
  2. `keydown`: tombol biasa saat komposisi masih aktif mengakhiri komposisi dulu, baru tombolnya diproses. Tombol IME (`keyCode` 229, `Unidentified`) dan modifier tidak ikut.
  3. `input` non-komposisi (`insertText`, `insertParagraph`, `insertLineBreak`) saat bendera komposisi masih menyala: komposisi diakhiri, rentangnya sampai kursor setelah input. Jadi `h ` (huruf dan spasi) dibungkus bersama.
  4. Ujung komposisi dicatat dari `input` `insertCompositionText`. `rentangKomposisi` menghitung rentang dari posisi, dengan koreksi kalau `compositionstart` datang setelah teks sudah masuk (urutan event berbeda di beberapa keyboard).
- **Dependensi:** perbaikan komposisi sebelumnya (`235979d`), `komposisi.js` (`posisiKaret`, `rentangPosisi`, `bungkusKomposisi`), dan opsi A.
- **File:** `docs/notes/editor/events.js`, `tools/uji/komposisi-kursor.mjs` (kasus 5 dan 6 baru), dan stempel `?v=` (128 berkas).
- **Cara uji (hasil nyata):**
  - `node tools/uji/komposisi-kursor.mjs`: **8/8 lulus**. Di HEAD (`235979d`): **5/8**. Kasus baru 5 dan 6 gagal di HEAD dengan `"h "` tanpa warna, dan lulus di versi ini.
  - `node tools/uji/warna-bersarang.mjs`: **6/6 lulus**.
  - Chromium, harness HP di luar repo (`hp.mjs`, urutan event mirip keyboard HP):
    - `spasi-saat-komposisi` (komposisi `h`, spasi ditekan saat masih komposisi, lalu `a`): **"h " merah dan "a" merah**. Di HEAD: `h ` dan `a` tidak berwarna.
    - `h-spasi-commit`, `h-lalu-tombol`, `ed-doc-h-spasi`, `catatan-baru-warna`, `spasi-key`, `spasi-di-komposisi`: huruf pertama berwarna, spasi ikut berwarna.
    - `tengah` (`Aw[xy]al`, lalu spasi dan `a`): `Aw` merah, `xy a` biru, `al` merah.
  - `npm test` penuh: **exit 0**, `SEMUA 37 LOLOS`.
- **Batasan jujur:**
  - **Belum diuji di Opera Android.** Chromium memodelkan urutan event, bukan keyboard sungguhan. Keluhan 1 dianggap selesai hanya setelah pengguna menguji di HP.
  - `Input.insertText` di Chromium memperlakukan teks sebagai pengganti komposisi. Pada `spasi-insert` (`' '` saja) teks `halo` digantikan spasi oleh browser, bukan oleh editor. Itu tidak dipakai sebagai bukti.
  - **Temuan terbuka, belum ditangani:** setelah kursor dipindah ke level `ed-doc` (bukan di dalam blok), ketikan berikutnya masuk ke luar blok (teks langsung di `ed-doc`). Perilaku ini sama di HEAD. Ketuk biasa di HP menaruh kursor di dalam blok, jadi tidak terpicu di sana, tetapi perlu ditelusuri.
  - Keluhan 2 (warna mati saat keyboard turun) belum ditangani.

## Alat diagnosis · Log ketik (Pengaturan → Aplikasi)

- **Alasan:** keluhan "huruf pertama tidak berwarna" di HP (Opera) tidak bisa direproduksi di Chromium sandbox. Perbaikan sebelumnya (`243ca3f`) memakai urutan event tiruan dan belum terbukti di perangkat. Yang dibutuhkan adalah urutan event asli dari HP.
- **Apa:** saklar "Log ketik (diagnosis)" dan tombol "Lihat". Saat saklar aktif, setiap event keyboard di editor (keydown, keyup, beforeinput, input, composition\*) dicatat bersama isi editor setelah `input` dan `compositionend`. Log disimpan di memori (maks 600 baris) dan di localStorage hanya untuk saklar. Log dapat disalin dari jendela yang dibuka tombol "Lihat".
- **Privasi:** log berisi teks yang diketik. Tidak dikirim ke mana pun. Saklar mati secara default dan mati lagi kalau dimatikan.
- **File:** `docs/notes/log-ketik.js` (baru), `docs/notes/index.js` (sambungan klik), `docs/notes/views/misc.js` (dua baris di kartu Aplikasi).
- **Cara uji (Chromium headless, hasil nyata, `/home/user/uji-ime/log-uji.mjs`):**
  - Saklar dari Pengaturan: aktif setelah klik, localStorage `1`.
  - Catatan kosong, warna aktif, IME "halo": log berisi urutan `compositionstart → compositionupdate → beforeinput → input → compositionend data="halo"` dan isi editor berwarna.
  - Jendela "Lihat": menampilkan isi log.
  - Setelah saklar dimatikan dan mengetik "xyz": jumlah baris log tidak bertambah (34 sebelum dan sesudah).
  - Galat JS: tidak ada.

## Perubahan 15 · B5 — Pencarian teks dokumen (cakupan: di dalam viewer PDF)

- **ID:** B5 (Document search), Tahap 2, urutan kedua setelah B1 (§6.1 nomor 2).
- **Alasan urutan:** §6.1 meminta B5 dimulai dari teks yang sudah tersedia, tanpa menunggu OCR. Teks PDF bisa dibaca langsung dengan pdf.js (sudah ada dari B1a).
- **Dependensi:** B1a (pdf.js dan viewer), B1b (komentar anotasi ikut dicari). Tidak bergantung pada B6 (OCR).
- **Cakupan yang dipilih:** pencarian hanya di dalam viewer PDF. Pencarian global di kolom pencarian catatan belum diubah (`docs/notes/cari.js` tetap). Itu bisa menjadi langkah lanjutan bila diminta.
- **Yang dicari:**
  - teks lapisan teks setiap halaman PDF;
  - teks komentar anotasi (B1b). Hasilnya ditandai "komentar di halaman N" dan tidak punya kotak sorot.
  - Tidak dicari: sorot, garis, dan coretan (tidak punya teks). Halaman hasil pindai tanpa lapisan teks belum bisa dicari (tugas B6).
- **Perilaku:**
  - pencarian tidak peka huruf besar/kecil dan tidak peka aksen (`Émile` cocok dengan `emile`);
  - spasi berlebih dianggap satu spasi, dan kata yang terpecah antar-item teks tetap ketemu;
  - Enter atau tombol "Cari" memulai pencarian. Tombol "‹" dan "›" berpindah antar-hasil dan membungkus di ujung;
  - hasil membuka halaman yang dimaksud dan menyorot semua kemunculan di halaman itu, dengan hasil aktif berwarna lebih kuat;
  - teks dibaca sekali per dokumen, lalu disimpan selama viewer terbuka. Halaman yang gagal dibaca dilewati dan dihitung di status;
  - PDF tanpa teks sama sekali diberi pesan yang jelas, bukan "tidak ditemukan" biasa;
  - panah kiri/kanan dan PageUp/PageDown di kolom pencarian dipakai untuk kursor, tidak untuk pindah halaman. Escape tetap menutup viewer.
- **File:**
  - `docs/notes/pdf/cari-pdf.js` (baru): logika murni. Normalisasi kueri, indeks halaman, pencarian, kotak sorot, dan navigasi hasil.
  - `docs/notes/pdf/penampil.js`: bar pencarian, pembacaan teks halaman, sorotan, dan penanganan tombol.
  - `docs/styles/notes.css`: gaya kolom pencarian dan kotak sorot.
  - `docs/core/bahasa-en.js`, `docs/core/bahasa-ja.js`: 9 teks baru.
  - `tools/uji/pdf-cari.mjs` (baru): 29 pengujian logika.
  - Stempel versi diperbarui dengan `node tools/version.mjs`.
- **Cara uji (hasil nyata):**
  - `node tools/uji/pdf-cari.mjs`: **29/29 lulus**.
  - `node tools/uji/pdf-penampil.mjs` (38), `pdf-anotasi.mjs` (32/32), `pdf-ekspor.mjs` (26/26): lulus.
  - `npm test` penuh: **exit 0**, tanpa FAIL.
  - Chromium, viewer PDF sungguhan dengan pdf.js (harness di luar repo `/home/user/uji-b5/uji.mjs`, ukuran layar 412×892 mobile): **22/22 lulus**. Mencakup: hasil dan status, tombol berikutnya/sebelumnya dengan pembungkusan, sorotan dan hasil aktif, aksen dan huruf besar, kata terpecah dua operasi teks, tidak ditemukan, kolom dikosongkan, panah di kolom tidak pindah halaman, Escape menutup, PDF tanpa teks, komentar anotasi, dan tidak ada galat halaman.
  - Tangkapan layar `shot-cari-1.png`: kotak sorot tepat di atas kata "Catatan" dan status "1 dari 2 · halaman 1".
- **Keterbatasan jujur:**
  - **Belum diuji di HP (Opera Android).** Uji di Chromium emulasi mobile saja.
  - Kotak sorot dihitung per item teks dengan proporsi karakter. Bisa sedikit meleset pada font dengan lebar huruf tidak rata.
  - Halaman yang diputar (rotasi 90/270) belum diuji. Kotak sorotnya kemungkinan salah.
  - Hasil dibatasi 500 kemunculan.
  - Pencarian global dari kolom pencarian catatan belum ada.
  - Komentar anotasi masih memakai `prompt` dan `alert` (keterbatasan B1b, tidak berubah).

## Perubahan 16 · B3 — Tautan ke bagian dalam catatan (`[[Judul#Bagian]]`, `[[Judul#^ref]]`)

- **ID:** B3 (Internal hyperlinks), Tahap 2, urutan ketiga setelah B5 (§6.1 nomor 3).
- **Alasan urutan:** §6.1 meminta B3 dan B8 memakai target navigasi yang stabil. Target blok (`^ref` dan id blok) sudah ada sejak tautan blok dibuat, jadi B3 bisa dikerjakan tanpa menunggu yang lain.
- **Dependensi:** tautan blok (`blockref.js`, `data-ref`), wikilink (`wikilink.js`), dan lompat ke blok (`lompatKe`).
- **Temuan audit yang diperbaiki:** `[[Judul#Bagian]]` sudah bisa diketik, tetapi `Judul#Bagian` dicari sebagai judul catatan. Akibatnya tautan tampak mati, dan klik membuat catatan sampah bernama `Judul#Bagian`. Ini terbukti di Chromium pada kode sebelum perubahan (lihat di bawah).
- **Perilaku sekarang:**
  - `[[Judul#Bagian]]`: buka catatan `Judul`, lalu gulir dan sorot heading yang judulnya sama. Pencocokan abaikan besar-kecil, spasi ganda, dan entitas HTML.
  - `[[Judul#^ref]]`: buka catatan dan sorot blok dengan rujukan `ref`.
  - Bagian yang tidak ada: catatan dibuka dari awal dan muncul pesan "Bagian tidak ditemukan. Catatan dibuka dari awal."
  - Tautan mati `[[Hilang#Apa]]`: klik membuat catatan `Hilang` (judul dasar), bukan `Hilang#Apa`.
  - Judul yang memang mengandung `#` (misalnya catatan `C#`) tetap dikenali sebagai judul utuh.
  - Alias `[[Judul#Bagian|Label]]` tetap berfungsi, alias diabaikan saat mencari.
  - Pil "Buka «Judul»" di editor (klik biasa) juga membuka bagian yang dituju.
- **File:**
  - `docs/notes/wikilink.js`: `pisahTautan`, `bagianSpan`, `cariBagian`. `judulSpan` kini mengembalikan judul dasar.
  - `docs/notes/lompat-tautan.js` (baru): `lompatKe` dipindahkan dari `index.js`, ditambah `bukaSasaranTautan`.
  - `docs/notes/index.js`, `docs/notes/editor/blok-modern.js`: klik tautan dan pil memakai `bukaSasaranTautan`.
  - `docs/notes/panels.js`, `docs/notes/transklusi.js`, `docs/notes/navigasi-fokus.js`: memakai judul dasar untuk panel tautan keluar, tautan yatim, dan navigasi fokus.
  - `docs/core/bahasa-en.js`, `docs/core/bahasa-ja.js`: 1 teks baru.
  - `tools/uji/wikilink-bagian.mjs` (baru): 20 pengujian logika.
- **Cara uji (hasil nyata):**
  - `node tools/uji/wikilink-bagian.mjs`: **20/20 lulus**.
  - `npm test` penuh (setelah `node tools/version.mjs`): **exit 0**, tanpa FAIL.
  - Chromium, aplikasi sungguhan dengan dua catatan (harness di luar repo `/home/user/uji-b3/uji-b3.mjs`, ukuran layar HP): **13/13 lulus** pada kode ini. Mencakup: Ctrl+klik heading, Ctrl+klik `^ref`, bagian tidak ada, tautan biasa, klik tautan mati, dan pil.
  - Pembanding: kode sebelum perubahan (`5be705e`) dengan harness yang sama hanya lulus **4/13**. Selain itu, klik tautan bagian membuat catatan sampah `Kuliah#Tidak ada`, `Kuliah#^a3f2`, dan `Kuliah#Judul & Dua`.
- **Keterbatasan jujur:**
  - **Belum diuji di HP (Opera Android).** Uji di Chromium dengan emulasi layar HP.
  - **Belum ada: tautan ke halaman dokumen PDF** (mis. "halaman 4 di PDF ini"). Bagian B3 ini belum dikerjakan. Perlu keputusan sintaksnya dulu.
  - Menu `[[` belum menawarkan heading. Pengguna mengetik `#Bagian` sendiri.
  - Panel "Tautan keluar" membuka catatan dari awal, tanpa bagiannya.
  - Harness Chromium di atas butuh jeda tunggu eksplisit. Pada pengujian awal, hasil sempat tidak stabil karena catatan belum selesai dimuat sebelum klik.
