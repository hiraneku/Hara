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

## Verifikasi · B4 — Tautan eksternal (tanpa perubahan kode)

- **Tujuan:** memeriksa kondisi nyata B4 sebelum memutuskan cakupan. Hanya membaca kode dan merender data uji di jsdom.
- **Yang sudah ada dan sudah aman:**
  - Menu tautan teks (`docs/notes/menus/link.js`): `rapikan()` hanya meloloskan `http(s):`, `mailto:`, dan `tel:`. Teks lain diubah menjadi `https://…`, jadi skema `javascript:` dari input dialog tidak bisa lolos. Tautan baru memakai `target="_blank" rel="noopener"`.
  - Dialog Kartu Tautan (`/bookmark`, `blok-generasi-baru.js`): URL dipaksa ke `https://` bila belum ada skema http(s).
  - Impor Markdown bookmark (`data-io.js`): regex hanya menerima `https?:`.
  - Tempelan (`paste.js`, `tempel-mekanik.js`): `tautanAman()` membuang skema selain `https?:`, `mailto:`, `tel:`.
- **Temuan: impor cadangan JSON tidak memfilter URL.**
  - `siapImporJson` → `normalizeNotes` → `normalizeNote` menyalin blok apa adanya.
  - Uji render (`blocksToDom`, jsdom): bookmark dengan `url: "javascript:alert(1)"` menghasilkan `href="javascript:alert(1)"`. Blok paragraf dengan `<a class="lk" href="javascript:alert(2)">` juga lolos utuh.
  - Ini berisiko bila pengguna membuka berkas cadangan yang tidak dipercaya. Belum diuji apakah peramban menjalankan skripnya saat diklik.
- **Belum ada:** tautan pada objek gambar atau tulisan (audit Tahap 0 juga mencatat ini).
- **Usulan perbaikan (belum dikerjakan, menunggu persetujuan):**
  1. Saring URL bookmark dan `href` tautan teks saat normalisasi impor, memakai `tautanAman()` yang sudah ada.
  2. Saring juga saat render sebagai lapisan kedua (bookmark dengan URL tidak aman dirender sebagai `#`).
  3. Uji: impor JSON berisi `javascript:` harus menghasilkan `href` yang aman, dan tautan `https` biasa tidak berubah.
- **Cara uji (hasil nyata):** skrip jsdom di luar repo (`/home/user/uji-b4/cek-render.mjs`), output: `BOOKMARK href javascript ada di HTML: true`, `TAUTAN TEKS href javascript ada di HTML: true`.

## Perubahan 17 · B4a — Keamanan tautan: `javascript:` ditolak di impor JSON dan render

- **ID:** B4 (External hyperlinks), bagian keamanan. Dikerjakan sebagai B4a sebelum cakupan "Semua" (gambar dan objek tulisan) yang disetujui pengguna.
- **Alasan urutan:** temuan verifikasi B4 (`435a737`): impor JSON menyalin href apa adanya. Alamat `javascript:` lolos ke `href` bookmark dan tautan teks. Ini celah XSS sebelum fitur tautan diperluas, jadi diperbaiki dulu.
- **Dependensi:** `tautanAman` (dulu di `paste.js`/`tempel-mekanik.js`), `normalizeNote` (jalur model baru dan lama), `blockToHtml` (render).
- **Perilaku sekarang:**
  - Alamat tautan yang lolos hanya `http:`, `https:`, `mailto:`, dan `tel:`. Varian yang disamarkan (huruf besar, tab atau spasi di tengah skema, entitas `&#58;`) ditolak.
  - Impor JSON: bookmark dengan alamat tidak aman disimpan dengan URL kosong. `href` tidak aman di isi blok dibuang, tetapi teks tautannya tetap.
  - Render: bookmark tidak aman tampil dengan `href="#"` dan host "tautan". Lapisan kedua membersihkan `<a>` di isi blok saat ditampilkan.
  - Dialog dan impor markdown tidak berubah, karena sudah memakai aturan yang sama.
- **File:**
  - `docs/notes/url-aman.js` (baru): `tautanAman(href)` dan `bersihkanHrefHtml(html)`.
  - `docs/notes/editor/tempel-mekanik.js`: `tautanAman` sekarang re-export dari `url-aman.js`. Pemakai (`paste.js`) tidak berubah.
  - `docs/notes/note-model.js`: `blockToHtml` membungkus `blockToHtmlMentah` dan memanggil `bersihkanHrefHtml`. Bookmark memakai `tautanAman`. `normalizeNote` memakai `bersihBlokTautan` untuk kedua jalur impor.
  - `tools/uji/url-aman.mjs` (baru): 22 pengujian.
- **Cara uji (hasil nyata):**
  - `node tools/uji/url-aman.mjs`: **22/22 lulus**.
  - Skrip verifikasi `/home/user/uji-b4/cek-render.mjs` terhadap kode ini: sebelumnya `javascript` ada di HTML (`true`) untuk bookmark dan tautan teks. Sekarang `false` untuk keduanya.
  - `npm test` penuh: lihat hasil di pesan penyelesaian (setelah `node tools/version.mjs`).
- **Keterbatasan jujur:**
  - **Belum menyelesaikan semua celah impor JSON.** Atribut lain di isi HTML blok (`on*` seperti `<img onerror>`, `<iframe>`, `<svg onload>`) belum disaring. Uji ini tidak menyatakan isi HTML aman. Perlu persetujuan pengguna sebelum dikerjakan (lihat catatan "Temuan terbuka").
  - Belum diuji di HP (Opera Android).
  - Dialog bookmark tetap memaksa `https://` untuk alamat baru. Ini perilaku lama dan tidak diubah.

## Perubahan 18 · B4b — Tautan pada gambar dan objek tulisan (cakupan "Semua")

- **ID:** B4 (External hyperlinks), bagian "objek yang didukung". Disetujui pengguna dengan pilihan "Semua" (gambar dan objek tulisan). Dikerjakan setelah B4a (keamanan).
- **Alasan urutan:** B4a menutup celah `javascript:` dulu, supaya fitur tautan baru langsung memakai penyaringan yang sama (`tautanAman`).
- **Dependensi:** B4a (`url-aman.js`), model blok gambar (`note-model.js`), bilah mini gambar (`tata-gambar.js`), dan dialog `openPop` (`menus/pop.js`).
- **Objek tulisan:** sketsa (goresan) dan gambar biasa sama-sama blok `image`. Keduanya memakai mekanisme yang sama.
- **Perilaku sekarang:**
  - Chip **Tautan** di bilah mini gambar (muncul saat gambar dipilih) membuka dialog. Isi alamat, lalu Simpan. Tanpa skema dianggap `https://`.
  - Alamat yang diterima hanya `http`, `https`, `mailto`, dan `tel`. Lainnya ditolak dengan pesan "Alamat tidak didukung".
  - Gambar yang punya tautan menampilkan lencana kecil (ikon tautan) di pojok kiri-bawah. Klik lencana membuka tautan di tab baru (`target="_blank"`, `rel="noopener noreferrer"`).
  - Chip Tautan menyala saat gambar sudah punya tautan. Dialog punya tombol **Hapus tautan** untuk melepasnya.
  - Tautan tersimpan sebagai `data-url` di figur, dan dibaca balik ke `meta.url`. Tautan bertahan saat catatan dimuat ulang (diuji).
  - Sketsa yang diperbarui tetap mempertahankan tautannya, karena figurnya tidak dibangun ulang.
- **File:**
  - `docs/notes/tautan-gambar.js` (baru): `bukaDialogTautanGambar`, `terapkanTautanKeFigur`, `alamatDariInput`.
  - `docs/notes/note-model.js`: render lencana (`badgeTautanGambar`), baca balik `data-url` di `elToBlock`, dan penyaringan impor untuk blok gambar.
  - `docs/notes/tata-gambar.js`: chip `data-mlink` dan handler kliknya.
  - `docs/styles/notes.css`: aturan `.img-tautan`, termasuk ukuran untuk gambar kecil.
  - `docs/core/bahasa-en.js`, `bahasa-ja.js`: 3 teks baru.
  - `tools/uji/tautan-gambar.mjs` (baru): 18 pengujian logika.
- **Cara uji (hasil nyata):**
  - `node tools/uji/tautan-gambar.mjs`: **18/18 lulus**.
  - Chromium, emulasi layar HP (412×915, sentuh), aplikasi sungguhan, harness di luar repo (`/home/user/uji-tg/uji-tautan-gambar.mjs`): **9/9 lulus**. Mencakup pasang tautan pada gambar dan sketsa, penolakan `javascript:`, klik lencana membuka tab baru, muat ulang, hapus tautan, dan tanpa galat JS.
  - Tangkapan layar: lencana tampak di pojok kiri-bawah kedua figur. Gambar uji tampil "Gambar tidak ditemukan" karena blob uji memang kosong, bukan karena fitur ini.
- **Keterbatasan jujur:**
  - **Belum diuji di HP Opera Android.** Uji di Chromium dengan emulasi layar HP.
  - Pada gambar yang sedang dipilih, lencana berdekatan dengan gagang pindah di kiri-atas dan gagang ukuran di kanan-bawah. Posisinya tidak bertabrakan, tetapi perlu dicek di layar HP sungguhan.
  - Ekspor Markdown/HTML belum diperiksa apakah ikut membawa tautan gambar.
  - Celah atribut `on*` di isi HTML blok dari impor JSON (lihat Perubahan 17) **belum** diperbaiki.

## Perubahan 19 · B3b — Tautan ke halaman PDF (`[[Nama.pdf#hal=4]]`)

- **ID:** B3 (Internal hyperlinks), bagian "tautan ke halaman dokumen PDF" yang tertunda di Perubahan 16. Sintaks `[[Nama.pdf#hal=4]]` disetujui pengguna.
- **Alasan urutan:** dikerjakan setelah B3 dan B4 karena memakai parser `#` dan jalur klik tautan yang sama dengan B3.
- **Dependensi:** `wikilink.js` (`pisahTautan`, `tandaiTautan`), `lompat-tautan.js`, penampil PDF (`pdf/penampil.js`), dan blok `file` yang menyimpan lampiran PDF.
- **Perilaku sekarang:**
  - `[[Nama.pdf#hal=N]]` (N ≥ 1, huruf besar-kecil tidak berpengaruh) membuka lampiran PDF bernama `Nama.pdf` pada halaman N. Lampiran dicari di blok `file` semua catatan yang tidak dihapus.
  - Halaman di atas jumlah halaman dijepit ke halaman terakhir.
  - Ketuk biasa di mode tulis: muncul pil "Buka «Nama.pdf» · Halaman N". Ketuk pil membuka PDF. Ctrl/⌘/Alt+klik atau Mode Baca langsung membuka PDF.
  - PDF belum dilampirkan: tautan tampil mati. Klik tidak membuat catatan baru bernama `Nama.pdf`. Sebagai gantinya muncul pesan "Berkas PDF tidak ditemukan. Lampirkan dulu di catatan.".
  - `[[Nama.pdf]]` tanpa `#hal=` dan `[[Kuliah#hal=4]]` (judul bukan .pdf) tetap berperilaku seperti sebelumnya.
  - Tautan PDF tidak masuk panel "Tautan keluar" atau daftar tautan yatim. Dengan begitu panel tidak menawarkan "Buat catatannya" untuk nama PDF.
- **File:**
  - `docs/notes/wikilink.js`: `pisahTautan` (kunci `halaman` hanya untuk tautan PDF), `cariBerkasPdf` (baru), `sasaranPdfSpan` (baru), `tandaiTautan` memakai berkas PDF untuk status mati.
  - `docs/notes/lompat-tautan.js`: `bukaPdfSasaran` (baru).
  - `docs/notes/pdf/penampil.js`: opsi `halaman` pada `bukaPenampilPdf`, dijepit ke jumlah halaman.
  - `docs/notes/index.js`, `docs/notes/editor/blok-modern.js`: klik dan pil untuk tautan PDF. `tampilkanPillWikilink` punya label untuk PDF.
  - `docs/notes/panels.js`: `wlDariBlok` melewati tautan PDF.
  - `docs/core/bahasa-en.js`, `bahasa-ja.js`: 2 teks baru.
  - `tools/uji/wikilink-pdf.mjs` (baru): 18 pengujian logika.
- **Cara uji (hasil nyata):**
  - `node tools/uji/wikilink-pdf.mjs`: **18/18 lulus**. `node tools/uji/wikilink-bagian.mjs`: **20/20** (tidak berubah).
  - Chromium, emulasi layar HP, aplikasi sungguhan, harness di luar repo (`/home/user/uji-tg/uji-tautan-pdf.mjs`) dengan PDF 5 halaman yang dibuat khusus: **13/13 lulus**.
  - Untuk membuktikan halaman yang benar, kanvas dibandingkan dengan sidik referensi: halaman 4 dari tautan (lewat pil dan Ctrl+klik) sama dengan halaman 4 yang dibuka langsung, dan berbeda dari halaman 1.
- **Keterbatasan jujur:**
  - **Belum diuji di HP (Opera Android).**
  - Menu `[[` belum menawarkan berkas PDF atau halaman.
  - Penampil PDF tidak memiliki lapisan teks di jalur ini, jadi verifikasi halaman memakai sidik kanvas, bukan membaca teks.
  - Ekspor Markdown/HTML belum diperiksa untuk tautan PDF.

## Perubahan 20 · B4c — Saring HTML isi blok (sisa celah impor JSON)

- **ID:** B4 (External hyperlinks), bagian keamanan lanjutan. Disetujui pengguna dengan "Ya, saring sekarang" setelah Perubahan 17 (B4a) menyisakan celah atribut lain.
- **Alasan urutan:** B4a hanya menyaring `href`. Isi HTML blok masih disalin apa adanya, jadi `on*`, `<iframe>`, dan `<img onerror>` tetap masuk. Ini diperbaiki sebelum fitur baru.
- **Dependensi:** `url-aman.js` (`tautanAman`), `note-model.js` (`normalizeNote`, `blockToHtml`), dan `editor/paste.js` (`tanganiPaste`, `htmlKeBaris`).
- **Bukti celah sebelum perbaikan (Chromium, harness di luar repo):** impor JSON dengan `<img src="x" onerror="…">` menjalankan payload (`window.__xss = "img"`) dan `<iframe>` masuk ke DOM. Tempelan HTML dengan `<img onerror>` juga menjalankan payload.
- **Perilaku sekarang:**
  - Tag berbahaya dibuang beserta isinya: `script`, `style`, `iframe`, `frame`, `object`, `embed`, `applet`, `form`, `template`, `link`, `meta`, `base`, `math`, dan elemen animasi SVG (`animate`, `set`, …).
  - Semua atribut `on*` dibuang.
  - Atribut URL: `href` hanya http(s), mailto, tel, atau `#…` (aturan sama dengan `tautanAman`). `src` hanya http(s), blob:, `data:image/`, atau relatif. `<use href>` hanya ke simbol lokal `#…`. `style` yang memuat `expression(`, `javascript:`, atau `url(` ke luar dibuang.
  - Atribut lain (`class`, `id`, `data-*`, `title`, `alt`, `target`, `style` biasa) dibiarkan. Isi normal tidak berubah.
  - Impor: isi HTML setiap blok disaring, termasuk format lama. Blok kode tidak disentuh karena isinya teks.
  - Render: lapisan kedua hanya dipicu bila teks mengandung pola berbahaya, jadi markup aplikasi tidak diproses ulang.
  - Tempelan: `text/html` dari clipboard disaring sebelum diurai.
- **File:**
  - `docs/notes/html-aman.js` (baru): `bersihkanHtmlBlok`, `PERLU_SARING`.
  - `docs/notes/note-model.js`: `normalizeNote` (`bersihBlokTautan`) dan `blockToHtml` memakai penyaring baru.
  - `docs/notes/editor/paste.js`: `tanganiPaste` dan `htmlKeBaris` menyaring HTML clipboard.
  - `tools/uji/html-aman.mjs` (baru): 33 pengujian.
- **Cara uji (hasil nyata):**
  - `node tools/uji/html-aman.mjs`: **33/33 lulus**.
  - Chromium, emulasi layar HP, aplikasi sungguhan, harness di luar repo (`/home/user/uji-tg/uji-html-aman.mjs`): **10/10 lulus** pada kode ini. Mencakup impor, tempelan lewat event `paste`, dan muat ulang. Tidak ada payload yang terpicu.
  - Pembanding `42d7216` (sebelum B4c) dengan harness yang sama: **4/10**. Payload `onerror` terpicu, dan iframe masuk ke DOM. Jadi uji ini memang bisa gagal.
- **Keterbatasan jujur:**
  - **Belum diuji di HP (Opera Android).**
  - Penyaringan `meta` selain URL (mis. judul kartu, label) tidak diubah. Field itu dirender lewat `esc`/`escAttr`, bukan HTML mentah. Ini belum diperiksa menyeluruh.
  - Penyaring memakai daftar izin dan daftar buang yang masuk akal, bukan standar keamanan resmi. Bila nanti ada kebutuhan markup baru, daftarnya perlu ditinjau.

## Perubahan 21 · B2 — Susunan halaman PDF (susun ulang, hapus, gandakan, sisip kosong)

- **ID:** B2 (PDF page management). Disetujui pengguna lewat pilihan "B2" setelah B4c.
- **Keputusan desain:**
  - Berkas PDF asli **tidak diubah**. Urutan disimpan terpisah per blob PDF, kunci `susun-<blobId>`, sama polanya dengan anotasi (`anot-<blobId>`).
  - Entri urutan: `{s:n}` untuk halaman asli nomor n, atau `{k:1}` untuk halaman kosong. Halaman yang digandakan memakai nomor asli yang sama.
  - Anotasi tetap diindeks per **halaman asli**. Halaman yang digandakan menampilkan anotasi yang sama di kedua salinannya. Anotasi tidak diduplikasi di penyimpanan.
  - Halaman yang dihapus dari susunan tidak dihapus datanya. Tombol "Susunan asli" memunculkannya lagi.
  - Halaman kosong tidak bisa dianotasi. Ukurannya mengikuti halaman asli terdekat.
- **Aksi di bilah viewer** (muncul hanya bila PDF punya `blobId`): Geser kiri, Geser kanan, Gandakan, Sisip kosong, Hapus dari susunan, Susunan asli. Tombol yang tidak relevan (mis. Geser kiri di halaman pertama) dinonaktifkan.
- **Efek di seluruh viewer:**
  - Label halaman menampilkan posisi di susunan. Bila berbeda dari urutan asli, ditambah keterangan, mis. `2 / 4 · asli 1` atau `4 / 6 · kosong`.
  - Navigasi dan panah/PageUp/PageDown memakai posisi di susunan.
  - Pencarian hanya mencari halaman yang masih ada di susunan, dan hasil diurutkan sesuai posisi tampil.
  - Tautan `[[Nama.pdf#hal=N]]` (B3b) memetakan N (halaman asli) ke posisinya di susunan. Bila halaman itu disembunyikan, dibuka di posisi 1.
  - Ekspor PDF (B1c) mengikuti urutan susunan, dan halaman kosong jadi kanvas putih.
- **File:**
  - `docs/notes/pdf/susunan.js` (baru): modul murni. `susunanAwal`, `bacaSusunan`, `tulisSusunan`, `pindahPos`, `hapusPos`, `gandakanPos`, `sisipKosongSetelah`, `srcDi`, `posisiSrc`, `srcTerdekat`, `asliUrut`.
  - `docs/notes/pdf/susunan-simpan.js` (baru): `muatSusunan`, `simpanSusunan`.
  - `docs/notes/pdf/penampil.js`: label, navigasi, render (halaman kosong), anotasi (per halaman asli), pencarian, ekspor, dan bilah susunan.
  - `docs/notes/editor/image.js`: pembersih blob yatim juga menganggap `susun-<id>` dipakai.
  - `docs/notes/data-io.js`: cadangan ikut menyertakan `susun-<id>`.
  - `docs/core/bahasa-en.js`, `bahasa-ja.js`: 14 teks baru.
  - `tools/uji/pdf-susun.mjs` (baru): 49 pengujian.
- **Cara uji (hasil nyata):**
  - `node tools/uji/pdf-susun.mjs`: **49/49 lulus**. Mencakup operasi murni, pemetaan posisi, data rusak, penyimpanan di IndexedDB palsu, dan bahwa isi PDF asli tetap (SHA-256).
  - Chromium, emulasi layar HP, aplikasi sungguhan, harness di luar repo (`/home/user/uji-tg/uji-susun.mjs`) dengan PDF 4 halaman yang dibuat khusus (`uji-b2.pdf`, halaman 4 ukurannya berbeda): **45/45 lulus**. Mencakup:
    - sidik kanvas tiap halaman asli, sehingga urutan tampil terbukti benar;
    - halaman kosong putih dan berukuran mengikuti halaman terdekat;
    - anotasi tidak bisa dibuat di halaman kosong;
    - anotasi di salinan halaman ikut tampil di kedua salinan dan hanya tersimpan sekali;
    - pencarian tidak menemukan halaman yang disembunyikan;
    - persistensi setelah tutup dan buka lagi, serta tautan `#hal=4`;
    - ekspor: jumlah `/Type /Page` sama dengan jumlah posisi, dan pdf.js membaca jumlah halaman yang sama;
    - PDF asli tidak berubah.
- **Keterbatasan jujur:**
  - **Belum diuji di HP (Opera Android).**
  - Urutan belum bisa diseret dengan jari. Pengaturan lewat tombol saja.
  - Belum ada tampilan miniatur halaman.
  - Pencarian tidak menampilkan halaman yang disembunyikan dari susunan, meskipun teksnya ada di PDF asli. Ini disengaja, tetapi pengguna perlu tahu bahwa "Hapus dari susunan" juga menyembunyikannya dari pencarian.
  - Cadangan (`data-io.js`) hanya diperiksa lewat sumber, karena modul itu butuh DOM. Perilaku pemulihannya belum diuji end-to-end.

## Perubahan 22 · B6 — OCR untuk PDF hasil pindai dan gambar catatan

- **ID:** B6 (OCR search). Disetujui pengguna lewat pilihan \"B6\" setelah B2, dengan pilihan:
  berkas OCR di-vendor (bukan CDN), bahasa Inggris dan Indonesia, cakupan PDF dan gambar catatan.
- **Keputusan desain:**
  - OCR hanya untuk halaman **tanpa lapisan teks** (pdf.js). Halaman yang sudah punya teks tetap
    dicari lewat teks biasa dan tidak di-OCR. OCR dan pencarian teks adalah proses terpisah.
  - Hasil OCR PDF disimpan terpisah, kunci `ocr-<blobId>`, format `{v:1, hal:{<n>: items}}`. Setiap
    item `{str, eol, box}` dengan kotak ternormalisasi (0–1, kiri atas). PDF asli **tidak diubah**.
  - Gambar catatan: teks OCR disimpan di atribut `data-ocr` pada `div.b-img` lalu di `meta.ocr`
    blok. Tidak ada kunci IDB terpisah. `plainText()` ikut memakainya, jadi pencarian catatan
    menemukan kata dari gambar.
  - Tombol OCR ditekan lagi = membatalkan. Halaman yang sudah dibaca dilewati saat dilanjutkan.
  - Pemrosesan lokal. Tidak ada layanan cloud.
- **Mesin:** Tesseract.js 7.0.0 dengan core **SIMD-LSTM 7.0.0**, data `4.0.0_best_int` untuk
  `eng` dan `ind`. Semua berkas di `docs/vendor/tesseract/` (lihat README di sana).
  - `mesin.js` mengunci `corePath` ke berkas core. Tanpa itu, library memilih varian lewat deteksi
    fitur dan bisa meminta berkas yang tidak di-vendor.
  - **Ukuran vendor ≈ 11,1 MB** (11.078.655 byte), bukan 8,0 MB seperti perkiraan sebelumnya.
    Core SIMD-LSTM sendiri 6,75 MB (js 3,9 MB + wasm 2,9 MB). Berkas ini ikut masuk ke APK.
  - **Keputusan core non-SIMD:** tidak di-vendor. Peramban tanpa WebAssembly SIMD akan mendapat
    \"OCR gagal\". Menambahkannya butuh ≈ 6,8 MB lagi. Keputusan ini perlu dikonfirmasi pengguna.
- **File:**
  - `docs/notes/ocr/ocr-teks.js` (murni): `itemDariHasil`, `teksDariItem`, `adaTeks`, `kunciOcr`, dll.
  - `docs/notes/ocr/ocr-simpan.js`: `muatOcrPdf`, `simpanOcrPdf`.
  - `docs/notes/ocr/mesin.js`: pemuatan worker lazy, `kenali`, berhenti 60 detik setelah tidak dipakai.
  - `docs/notes/ocr/gambar.js`: `bacaTeksGambar` untuk chip \"Baca teks\".
  - `docs/notes/pdf/penampil.js`: tombol OCR (hanya bila PDF punya `blobId`), status kemajuan,
    pembatalan, dan pencarian yang memakai hasil OCR.
  - `docs/notes/note-model.js`: `data-ocr` ↔ `meta.ocr`, cabang gambar di `plainText`, `escOcr`.
  - `docs/notes/tata-gambar.js`: chip `data-mocr` setelah \"Coret\".
  - `docs/notes/editor/image.js`, `docs/notes/data-io.js`: pembersih blob yatim dan cadangan mengenali `ocr-`.
  - `docs/core/bahasa-en.js`, `bahasa-ja.js`: 13 teks baru. (`bahasa-id` memakai teks Indonesia sebagai kunci.)
  - `tools/uji/ocr-teks.mjs` (baru): 54 pengujian.
- **Cara uji (hasil nyata):**
  - `node tools/uji/ocr-teks.mjs`: **54/54 lulus**. Mencakup kotak dari bbox piksel, data rusak,
    penyimpanan di IndexedDB palsu, escape atribut, roundtrip `data-ocr`, dan pembersih blob yatim.
  - `npm test`: **exit 0**. Semua suite lolos, termasuk pdf-susun 49/49 (B2 tidak rusak).
  - Chromium, aplikasi sungguhan, harness di luar repo (`/home/user/uji-ocr/uji-ocr-chromium.mjs`):
    **24/24 lulus** dengan stempel versi final. Mencakup:
    - PDF pindai dibuat di browser (2 halaman, teks Open Sans tebal). OCR membaca `SEPEDA MERAH`
      dan `KUCING HITAM`. Hasil tersimpan di `ocr-<id>`.
    - Pencarian `sepeda`, `kucing`, dan frasa `sepeda merah` menemukan halaman yang benar.
    - Sebelum OCR, pencarian tidak menemukan apa-apa dan status memberi petunjuk tekan OCR.
    - OCR kedua melewati halaman yang sudah dibaca (0 halaman).
    - Pembatalan lalu lanjut: halaman yang sudah dibaca tidak diulang.
    - PDF berteks: OCR tidak membaca apa pun, dan pencarian lapisan teks tetap bekerja.
    - Gambar catatan: chip \"Baca teks\" muncul, teks `MOBIL KUNING` tersimpan di `meta.ocr`,
      bisa dicari lewat `plainText`, dan bertahan setelah muat ulang.
    - Tidak ada galat halaman yang nyata. Galat `ERR_CONNECTION_CLOSED` berasal dari font Google
      dan open-meteo yang diblokir sandbox, bukan dari OCR.
- **Bug yang ditemukan lewat uji dan sudah diperbaiki:**
  - Core 6.1.2 dipakai dengan wrapper 7.0.0 (wrapper mensyaratkan core ^7.0.0). Diganti ke core 7.0.0.
  - File `.wasm` pasangan core tidak ikut di-vendor, sehingga wasm gagal dimuat.
  - Spasi antar kata dalam satu baris hilang saat OCR, sehingga frasa `sepeda merah` tidak cocok
    (`SEPEDAMERAH`). Spasi kini diberikan di `str` setiap kata.
  - Pesan \"OCR selesai\" tertimpa hasil pencarian. `cariUi` itu asinkron, jadi harus di-`await`.
  - Teks OCR di atribut `data-ocr` hanya di-escape untuk tanda kutip. Kini `&` dan `<` juga.
- **Keterbatasan jujur:**
  - **Belum diuji di HP (Opera Android).** Kecepatan OCR di HP belum diukur. Uji di sandbox memakai
    CPU server, bukan CPU HP.
  - Uji Chromium memakai build Chromium dari paket npm `@sparticuz/chromium` (153), bukan Opera.
  - Akurasi hanya diuji pada teks bersih buatan sendiri, belum pada pindai nyata yang buram, miring,
    atau berwarna.
  - Halaman yang punya teks banyak di lapisan teks (lebih dari 50 huruf) dianggap sudah punya teks dan
    **tidak** di-OCR. Halaman pindai dengan sedikit teks ketikan (stempel, nomor halaman) di-OCR bila gambar
    menutupi sebagian besar halaman (sejak 29-10-2026, lihat Verifikasi lanjutan, Perubahan OCR halaman campur).
  - Tombol batal menyelesaikan halaman yang sedang dibaca dulu, baru berhenti.
  - Gambar besar diperkecil ke sisi terpanjang 1600 piksel sebelum OCR. Teks yang sangat kecil bisa hilang.
  - Tidak ada tampilan teks OCR yang bisa diedit. Hasil OCR hanya untuk pencarian.
  - Lisensi data: paket npm `@tesseract.js-data/*` mencantumkan MIT. Lisensi tessdata asal
    (`naptha/tessdata`) belum diverifikasi langsung. Perlu dicek sebelum rilis.

### Lanjutan B6 · core non-SIMD (keputusan pengguna)

- Pengguna memilih **ya** untuk core non-SIMD. Peramban tanpa WebAssembly SIMD sekarang juga bisa OCR.
- `docs/notes/ocr/mesin.js`: `adaSimd()` memvalidasi modul wasm minimum (sama dengan deteksi
  wasm-feature-detect). `berkasCore()` memilih `tesseract-core-simd-lstm.wasm.js` atau
  `tesseract-core-lstm.wasm.js`. Dua-duanya di `docs/vendor/tesseract/core/`.
- Ukuran vendor naik menjadi **≈ 17,8 MB** (17.830.500 byte).
- Uji Chromium mode non-SIMD (`NOSIMD=1`): deteksi SIMD di halaman dibuat gagal lewat init script,
  karena flag `--no-wasm-simd` tidak berpengaruh di Chromium ini. Hasil: **25/25 lolos**, dan log
  jaringan mengonfirmasi browser memuat `tesseract-core-lstm.wasm.js`. Mode SIMD tetap 24/24 sebelum ini.
- Keterbatasan: pengujian non-SIMD hanya memalsukan deteksi. Wasm non-SIMD yang dijalankan
  tetap di peramban yang punya SIMD. Peramban tanpa SIMD sungguhan belum diuji.

## Perubahan 23 · B8 — Navigasi planner: kalender ke jurnal per tanggal

- **ID:** B8 (Digital planner navigation). Disetujui pengguna lewat pilihan \"Ya, kerjakan B8\".
- **Keadaan awal (audit):** kalender hanya memilih hari dan menampilkan tenggat. `bukaJurnalHari`
  hanya bisa membuka atau membuat jurnal **hari ini**. Klik sel kalender tidak membuka jurnal.
- **Lingkup yang diterapkan:**
  - Panel hari terpilih di kalender punya tombol **Buka jurnal**. Tombol ini membuka jurnal
    tanggal itu, atau membuatnya bila belum ada, dengan templat jurnal yang sama seperti jurnal hari ini.
  - Hari yang sudah punya jurnal diberi penanda titik kecil di sudut sel, dan `aria-label` menyebut \"ada jurnal\".
  - Pencarian jurnal dan pembuatan memakai judul yang sama, jadi tidak ada jurnal ganda.
    Pencarian mencoba bahasa aktif dulu, lalu dua bahasa lain. Jurnal yang dibuat dalam bahasa lain tetap ditemukan.
  - Catatan terkunci yang tidak terlihat tidak ikut menandai kalender.
- **Di luar lingkup (belum):** navigasi antar-hari di halaman jurnal (sebelumnya/berikutnya),
  dan tautan balik dari jurnal ke kalender. Keduanya bisa menjadi perbaikan berikutnya bila diminta.
- **File:**
  - `docs/notes/jurnal-tanggal.js` (baru, modul murni): `tanggalJurnal`, `judulJurnal`,
    `urutanBahasaJurnal`, `cariJurnal`, `hariBerjurnal`.
  - `docs/notes/harian.js`: memakai modul di atas. Tambah `bukaJurnalTanggal(t, hariIni)`.
    `bukaJurnalHari` dan ekspor lama (`judulJurnalHari`, `tanggalHariIni`) tetap ada.
  - `docs/notes/views/tugas.js`: tombol **Buka jurnal** dan penanda hari berjurnal. Catatan disaring dengan `terlihat()`.
  - `docs/notes/index.js`: handler `[data-kal-jurnal]`.
  - `docs/styles/notes.css`: gaya `.kal-jurnal` dan `.kal-jurnal-titik`.
  - `docs/core/bahasa-en.js`, `bahasa-ja.js`: 4 teks baru (jumlah kamus en dan ja sama: 1135).
  - `tools/uji/planner-kalender.mjs` (baru): 35 pengujian.
- **Cara uji (hasil nyata):**
  - `node tools/uji/planner-kalender.mjs`: **35/35 lulus**. Mencakup format tanggal per bahasa, pencarian lintas bahasa, catatan terhapus, penanda hari (termasuk Februari kabisat), dan pemeriksaan sumber (wiring, filter `terlihat`, handler, kamus).
  - Chromium, aplikasi sungguhan, harness di luar repo (`/home/user/uji-b8/uji-b8-chromium.mjs`): **21/21 lulus**, tanpa galat halaman. Mencakup:
    - pilih hari di kalender lalu **Buka jurnal** membuat jurnal dengan judul tanggal yang benar, dan editor membuka catatan itu;
    - templat jurnal (heading dan todo) terpasang;
    - hari berjurnal diberi penanda, hari lain tidak;
    - membuka lagi tidak menggandakan jurnal dan membuka catatan yang sama;
    - regresi: jurnal hari ini tetap dibuat sekali dan tidak digandakan;
    - bahasa Inggris: tombol \"Open journal\", jurnal Indonesia yang sudah ada tetap dipakai, dan jurnal baru memakai judul \"Journal · October 16, 2026\".
- **Keterbatasan jujur:**
  - Belum diuji di HP. Tampilan sel kalender di layar kecil belum diperiksa.
  - Penanda titik di hari terpilih berwarna putih di atas `--accent` default (`#7FB399`), kontrasnya rendah.
    Ini sama dengan gaya teks hari terpilih yang sudah ada sebelumnya (`.kal-pilih`), jadi belum diubah.
  - Catatan terkunci tidak menandai kalender. Ini dijamin lewat sumber dan `terlihat()`, belum lewat uji Chromium
    dengan kunci sungguhan.
  - Lingkup navigasi planner masih terbatas (lihat \"Di luar lingkup\").

## Perubahan 24 · C1 — Voice recording yang stabil (Tahap 3)

- **ID:** C1 (Voice recording). Disetujui pengguna lewat pilihan "C1 — Voice recording (disarankan)".
- **Keadaan awal (audit):** blok memo suara sudah merekam dengan MediaRecorder dan menyimpan ke IndexedDB.
  Namun ada beberapa celah:
  - menutup popup (ketuk di luar, Esc) menghentikan kendali atas rekaman tetapi TIDAK menghentikan
    perekam atau stream mikrofon. Mikrofon bisa tetap menyala tanpa tombol untuk mematikannya;
  - rekaman tidak punya potongan berkala (`start()` tanpa interval), jadi hasil parsial hilang bila perekam gagal;
  - galat penyimpanan tidak ditangani: popup tetap terbuka dan rekaman terbuang;
  - rekaman kosong disimpan sebagai blok;
  - format tidak dipilih dengan sadar (selalu tipe default).
- **Perubahan:**
  - `docs/notes/editor/perekam-suara.js` (baru): sesi rekaman dipegang modul, bukan popup.
    - Menutup popup tidak menghentikan rekaman. Bilah kecil di bawah layar menampilkan waktu, tombol
      **Selesai & simpan**, dan **Buang**. Ini memungkinkan merekam sambil mengetik.
    - Potongan diminta tiap 1 dtk. Format dipilih dari daftar yang didukung (webm/opus, mp4, ogg).
    - Aplikasi yang disembunyikan (`visibilitychange` hidden, `pagehide`) menghentikan dan menyimpan rekaman.
    - Rekaman kosong tidak disimpan.
    - Bila penyimpanan gagal, rekaman TIDAK dibuang. Bilah menampilkan **Simpan lagi** dan **Buang**.
  - `docs/notes/editor/blok-modern.js`: `bukaPerekamMemoSuara` memakai modul di atas. Sisipan memo
    diteruskan ke catatan asal. Bila pengguna sudah pindah catatan saat merekam, memo ditambahkan langsung
    ke data catatan asal (`touch` + `simpan`), tidak ke DOM editor.
  - `docs/styles/notes.css`: gaya `.aud-rec-bar`.
  - `docs/core/bahasa-en.js`, `bahasa-ja.js`: 7 teks baru. Paritas en/ja 1142/1142, tanpa yang hilang.
- **Cara uji (hasil nyata):**
  - Chromium dengan perangkat mikrofon palsu (`--use-fake-device-for-media-stream`), harness di luar repo
    (`/home/user/uji-c1/uji-c1-chromium.mjs`): **34/34 lulus**, tanpa galat halaman. Mencakup:
    - rekaman dimulai dari popup, waktu di popup berjalan;
    - ketuk di luar menutup popup, rekaman tetap berjalan, bilah tampil;
    - mengetik di catatan saat merekam;
    - Selesai → memo disisipkan, blob ada dan tidak kosong di IndexedDB, durasi tercatat;
    - aplikasi disembunyikan → rekaman berhenti dan tersimpan;
    - Buang → tidak ada memo baru;
    - pindah layar saat merekam → rekaman jalan, memo masuk ke catatan asal;
    - gagal simpan (IndexedDB dipaksa galat) → rekaman tertunda, bilah "belum tersimpan", Simpan lagi berhasil;
    - muat ulang → memo tetap ada dan bisa diputar (`src` blob:).
- **Keterbatasan jujur:**
  - Belum diuji di Android sungguhan. Pemahaman awal meminta uji Android, termasuk merekam sambil mengetik.
    Uji di sandbox memakai perangkat palsu dan Chromium desktop.
  - Penghentian otomatis saat aplikasi disembunyikan bersifat best-effort. Browser mobile bisa menghentikan
    halaman lebih cepat dari event yang sempat dijalankan.
  - Belum ada jeda/lanjut rekaman.
  - Belum ada transkripsi. Itu C2 dan berikutnya.

## Perubahan 25 · C2 — Catatan bertanda waktu pada memo suara (Tahap 3)

- **ID:** C2 (Audio-linked transcription). Disetujui pengguna lewat pilihan \"C2 — Audio-linked transcription (disarankan)\".
  Lingkup mengikuti §1.7 dan §2.6 konsep: catatan bertanda waktu dibuat pengguna, tanpa AI. Transkripsi otomatis tetap di luar lingkup.
- **Perubahan:**
  - Data: `meta.marks = [{ t: detik (0.1 dtk), teks }]` pada blok memo suara. Tidak ada kunci IDB baru.
  - Saat merekam: tombol **Tandai** di popup dan di bilah rekam mencatat posisi detik rekaman. Tanda ikut tersimpan.
  - Saat memutar: tombol **Tandai** di blok memo mencatat posisi putar sekarang.
  - Daftar tanda di bawah memo: waktu bisa diklik untuk melompat dan memutar, teks bisa diedit, dan tanda bisa dihapus.
  - Penyimpanan balik: `elToBlock` membaca daftar dari DOM (`bacaTandaDom`, `normalisasiTanda`). Teks pencarian (`plainText`)
    mencakup catatan tanda. Ekspor Markdown memuat tanda sebagai baris `> - m:ss teks`.
  - `docs/notes/note-model.js`: `tandaAudioHtml`, `normalisasiTanda`, `bacaTandaDom`.
  - `docs/notes/editor/perekam-suara.js`: `tandaiRekam()`; bilah rekam punya tombol Tandai.
  - `docs/notes/editor/blok-modern.js`: penangan Tandai, lompat, dan hapus tanda; `tulisTanda` mengganti daftar tanda.
  - `docs/notes/data-io.js`: ekspor Markdown memuat tanda.
  - `docs/styles/notes.css`: gaya `.aud-marks`, `.aud-mark-*`, `.aud-mark-btn`.
  - `docs/core/bahasa-en.js`, `bahasa-ja.js`: 6 teks baru. Paritas en/ja 1148/1148.
- **Perbaikan yang ditemukan saat uji (berlaku untuk semua kolom teks di blok memo):**
  - Input di dalam blok memo (catatan tanda, dan juga judul memo yang sudah ada) kehilangan ketikan pertama.
    Penangan keydown/beforeinput editor di `.ed-doc` mengambil fokus ke badan dokumen. Sekarang keduanya dihentikan
    pada fase capture untuk input di dalam `.b-audio`. Event `input` tetap lewat, sehingga autosave berjalan.
- **Cara uji (hasil nyata):**
  - Chromium dengan mikrofon palsu, harness di luar repo (`/home/user/uji-c2/uji-c2-chromium.mjs`): **17/17 lulus**, tanpa galat halaman.
    Mencakup tanda saat merekam (popup dan bilah), edit teks yang tersimpan setelah muat ulang, lompat ke tanda (±0,6 dtk) dengan pemutaran,
    tanda saat memutar, hapus tanda yang persisten setelah muat ulang, dan `meta.marks` di data catatan.
- **Keterbatasan jujur:**
  - Ekspor Markdown dan teks pencarian untuk tanda belum diuji otomatis. Hanya diperiksa lewat kode.
  - Mode baca (read-only) untuk kolom tanda belum diuji.
  - Akurasi lompat bergantung pada peramban. Durasi webm dari perekam kadang tidak tersedia (Infinity). Pada uji Chromium ini lompat berhasil.
  - Belum diuji di Android sungguhan.

## Perubahan 26 · C5 — Tampilan belajar: materi dan catatan berdampingan (Tahap 3)

- **ID:** C5 (Course learning view). Disetujui pengguna lewat pilihan \"Oke lanjut C5\" (memilih ID secara eksplisit). Persetujuan hanya untuk C5. C3 dan C4 belum disetujui.
- **Perubahan:**
  - Mode belajar adalah tata letak di dalam editor, bukan layar baru. Editor tetap satu-satunya penulis catatan (autosave, binding, `cur === 'editor'` tidak berubah).
  - Masuk dari menu \"···\" catatan (**Mode belajar: materi dan catatan**) dan dari palet perintah. Mode bertahan saat pindah catatan selama sesi.
  - Panel **materi** di kiri: PDF dari lampiran catatan mana pun (daftar dibuat dari blok `file` dengan PDF). Bilah berisi pilihan materi, ‹ › halaman, − + zoom, dan Pas lebar.
  - Lebar lega: dua kolom. Panel materi menempel saat catatan digulir.
  - Lebar sempit (HP, di bawah 760 px): satu panel tampil, dipilih lewat tab **Materi** / **Catatan**.
  - Panel materi tidak punya pintasan keyboard global. Panah dan PageUp/PageDown hanya berlaku saat fokus ada di panel materi, supaya tidak mengganggu mengetik.
  - Materi dirender dengan pdf.js yang sama dengan penampil (B1/B2). Anotasi, OCR, dan susunan halaman tetap di penampil layar penuh.
  - `docs/notes/belajar-materi.js` (baru): `daftarMateri`, `belajarBuka`/`belajarTutup`, `toggleBelajar`, `pasangMateri`, `lepasMateri`.
  - `docs/notes/views/editor.js`: pembungkus `belajarBuka()` / `belajarTutup()`.
  - `docs/notes/menus/note-menu.js`: item menu. `docs/app.js`: handler menu dan perintah palet.
  - `docs/styles/notes.css`: gaya `.belajar*`.
  - `docs/core/bahasa-en.js`, `bahasa-ja.js`: 6 teks baru. Paritas en/ja 1154/1154.
- **Cara uji (hasil nyata):**
  - Chromium, harness di luar repo (`/home/user/uji-c5/uji-c5.mjs`): **36/36 lulus**, tanpa galat halaman.
  - Sumber **lokal** (lampiran PDF): mode nyala dan mati, dua kolom, tombol halaman dan zoom, Pas lebar kembali ke zoom awal, panah hanya di panel materi, edit catatan di dalam mode belajar tetap tersimpan, render ulang setelah nyala lagi.
  - **Lebar sempit** (390 px): tab Materi/Catatan bekerja, halaman mengisi lebar layar.
  - **URL langsung**: tautan bookmark ke PDF tidak muncul sebagai materi, dan panel tidak mengambil URL (0 permintaan ke berkas itu).
  - **Iframe**: Hara tidak punya blok iframe. `html-aman.js` membuang iframe, jadi tidak ada sumber iframe yang bisa menjadi materi. Tidak diuji sebagai kasus terpisah.
  - **Sumber terbatas**: PDF rusak menampilkan galat dan editor tetap bisa diketik. Lampiran yang blobnya hilang menampilkan \"Berkas lampiran tidak ditemukan\".
  - `npm test` 37/37. Node: OCR 54/0, kalender 35/0, susunan PDF 49/0.
- **Keterbatasan jujur:**
  - Materi hanya PDF lampiran. URL, video, dan gambar tidak menjadi materi.
  - Panel materi belum punya anotasi, OCR, atau pencarian. Semua itu tetap di penampil layar penuh.
  - Pilihan materi dan mode belajar tidak disimpan setelah muat ulang halaman (hanya di memori sesi).
  - PDF berkata sandi belum diuji (tidak ada fixture terenkripsi di repo).
  - Chromium C1 dan C2 tidak diuji ulang setelah perubahan ini. Harness lamanya hilang. Yang dijalankan ulang: `npm test` dan uji Node.
  - Belum diuji di Android sungguhan. Layout 760 px dan tinggi panel `calc(100dvh - 56px)` perlu dicek di HP.

## Perubahan 27 · C3 — Picture-in-picture untuk video belajar (Tahap 3)

- **ID:** C3 (Picture-in-picture learning). Disetujui pengguna lewat pilihan "Lanjut C3" (memilih ID secara eksplisit). Persetujuan hanya untuk C3. C4 belum disetujui.
- **Perubahan:**
  - Panel belajar (C5) mendapat sumber **video**. Dua jenis: berkas video lampiran catatan (lokal, `blob:`) dan **URL langsung** ke berkas video (`http`/`https`, lintas-asal).
  - Tombol **Picture-in-picture** muncul hanya saat panel benar-benar memuat video. Tombol disembunyikan saat memuat, saat galat, dan saat sumber tidak didukung.
  - Video di PiP tetap berputar saat mode belajar dimatikan, saat catatan diketik, dan saat panel digambar ulang. Panel memakai kembali video PiP yang sama saat mode dinyalakan lagi.
  - Video dipindah ke wadah `#belajar-pip-tahan` yang diletakkan di luar layar, bukan `display:none`. Wadah `display:none` menjeda video di Chromium, jadi tidak dipakai.
  - Iframe **tidak** menjadi sumber. `html-aman.js` (`bersihkanHtmlBlok`) membuang `<iframe>`, dan konten lintas-asal dalam iframe tidak bisa di-PiP.
  - `docs/notes/belajar-materi.js`: `daftarMateri`, `pasangMateri`, `lepasMateri`, `muatVideo`, `togglePip`, `tambahUrl`, `muatPdf`, `kosongkanIsi`, `buangVideo`, `segarkanPip`.
  - `docs/styles/notes.css`: blok gaya C3 di akhir berkas. `docs/core/bahasa-en.js`, `bahasa-ja.js`: 14 teks baru, 3 dihapus. Paritas en/ja 1164/1164.
  - Stempel versi `20261028100000` (137 berkas).
- **Cara uji (hasil nyata):**
  - Chromium headless, harness `/home/user/uji-c3/uji-c3.mjs`: **40/40 lulus**, tanpa galat halaman (`pageerror` dan `console error` nol).
  - **A. Sumber lokal** (blob video): PiP aktif, tombol berubah menjadi "Tutup PiP". Mode belajar dimatikan: PiP tetap aktif dan video terus berputar (3,54 → 4,75 dtk). Mengetik di catatan saat PiP aktif tidak menutupnya. Mode dinyalakan lagi: panel mengambil video PiP yang sama. Tombol Tutup menghentikan PiP.
  - **B. URL langsung** (lintas-asal, `http://127.0.0.1:8178/video.webm`): masuk daftar materi, dimuat dan diputar, PiP aktif lalu bisa ditutup. URL tanpa `http(s)` ditolak dengan pesan dan tidak masuk daftar.
  - **C. Iframe**: sanitasi membuang `<iframe>` dari blok catatan. Halaman yang berisi video dalam iframe menampilkan galat, bukan video. Tombol PiP tidak muncul dan tidak ada iframe di panel materi.
  - **D. Sumber terbatas**: berkas rusak menampilkan galat, PiP tidak muncul, dan editor tetap bisa diketik. Format `video/x-msvideo` menampilkan "Format video ini tidak didukung peramban ini". URL 404 menampilkan galat. Lampiran yang blobnya hilang menampilkan pesan "tidak ditemukan".
  - **E. Lebar 390 px** (HP): video tampil dan tidak melebihi lebar layar, tombol PiP tampil.
  - Regresi: `uji-c5.mjs` **36/36**. `npm test` exit 0 (seluruh berkas di `tools/uji/`, 0 gagal).
  - Probe: `pictureInPictureEnabled` true, MediaRecorder vp8 webm didukung, PiP pada video muted yang diputar berhasil.
- **Temuan yang dikoreksi selama uji:**
  - Video "ter-pause setelah mode belajar dimatikan" ternyata bukan bug pemindahan. Video uji awal hanya 2,5 detik, jadi `pause` terjadi saat klip berakhir. Fixture diganti menjadi video 15 detik (`serve/video.webm`, 44.862 byte). Pemindahan ke wadah offscreen terbukti tidak menjeda.
  - Tombol PiP sempat tetap tampil saat sumber galat (iframe, berkas rusak). Diperbaiki: tombol hanya tampil bila panel memuat `<video>`.
- **Keterbatasan jujur:**
  - **Iframe tidak didukung.** Hara membuang iframe, dan konten lintas-asal dalam iframe tidak bisa di-PiP oleh peramban.
  - **Auto-PiP tidak aktif.** PiP hanya lewat tombol. Tidak ada PiP otomatis saat pindah tab atau aplikasi.
  - **Android belum diuji.** Uji dilakukan di Chromium headless (desktop). Dukungan PiP di Chrome Android dan di peramban lain (Safari, Firefox) belum diverifikasi.
  - **Video untuk URL langsung bergantung pada sumber.** Hara tidak memeriksa CORS atau format. Jika peramban tidak bisa memutar sumber, galat ditampilkan.
  - **Pilihan materi dan mode belajar** tidak disimpan setelah muat ulang halaman (hanya di memori sesi), seperti C5.
  - **C4 (screenshot frame) belum disetujui** dan tidak ada di perubahan ini.

## Perubahan 28 · C4 — Tangkap frame video ke catatan (Tahap 3)

- **ID:** C4 (Video screenshot capture). Disetujui pengguna lewat pilihan "C4 — Video screenshot capture" (memilih ID secara eksplisit). Persetujuan hanya untuk C4.
- **Perubahan:**
  - Tombol **Ambil frame** di panel belajar (C5) muncul hanya saat video termuat dan frame-nya bisa diambil. Posisi video saat ini diambil sebagai JPEG, lalu disisipkan sebagai blok gambar di posisi kursor catatan.
  - Frame disimpan sebagai blob sendiri (`fr_…`), sehingga tetap ada walau video dihapus dari daftar materi. Alt teks memuat judul dan waktu, misalnya "Frame video · 00:01 · kuliah.webm".
  - Sumber lintas-asal (URL langsung) dimuat dengan `crossorigin="anonymous"`. Bila servernya menolak CORS, video diputar ulang tanpa CORS. Video tetap bisa diputar dan di-PiP, tetapi tombol frame disembunyikan dan keterangan singkat tampil.
  - `docs/notes/belajar-materi.js`: `tangkapFrame`, `segarkanFrame`, `probeCanvasBersih`. Penyisipan memakai `sematkanBlokGambar` dari `editor/image.js`, dengan `snap()` sebelum perubahan (undo).
  - `docs/styles/notes.css`: gaya `.belajar-hint`. `docs/core/bahasa-en.js`, `bahasa-ja.js`: 5 teks baru. Paritas en/ja 1169/1169.
  - Stempel versi `20261028110000` (137 berkas).
- **Cara uji (hasil nyata):**
  - Chromium headless, harness `/home/user/uji-c4/uji-c4.mjs`: **42/42 lulus**, tanpa pageerror. Galat CORS dari URL tanpa CORS dilaporkan terpisah sebagai bagian fallback yang diharapkan.
  - **A. Sumber lokal** (lampiran): frame pertama dan kedua tersisip. Blob berjenis `image/jpeg`, 320×240, tidak hitam (rata-rata warna di atas 20). Dua frame pada posisi berbeda menghasilkan warna berbeda, sehingga memang diambil dari video. Frame tetap ada setelah mode belajar dimatikan.
  - **B. URL langsung dengan CORS** (server 8179 yang mengirim `Access-Control-Allow-Origin: *`): tombol tampil, `crossorigin="anonymous"` terpasang, frame tersisip dan tidak hitam.
  - **C. URL langsung tanpa CORS** (8178): video tetap diputar, PiP tetap tersedia. Tombol Ambil frame disembunyikan dan keterangan CORS tampil. Tidak ada frame baru.
  - **D. Iframe dan sumber terbatas**: halaman iframe, berkas rusak, dan URL 404 menampilkan galat. Tombol frame tidak tampil dan tidak ada frame yang bertambah.
  - **E. Lebar 390 px**: tombol tampil dan frame bisa disisipkan dari tab Materi.
  - Regresi: `uji-c3.mjs` 40/40 (filter galat CORS diperbarui untuk fallback), `uji-c5.mjs` 36/36, `npm test` dijalankan ulang.
- **Temuan selama uji:**
  - Dua frame di t≈1,2 dtk dan t≈3,6 dtk kebetulan berwarna sama, karena pola warna video berulang setiap 1,2 dtk. Uji memakai posisi 0,3 dtk dan 3,3 dtk.
  - Harness awal menganggap galat CORS fallback sebagai galat halaman. Itu perilaku yang benar, jadi filternya dibatasi hanya untuk URL 8178.
- **Keterbatasan jujur:**
  - **Tidak ada janji pengambilan frame universal** (§1.14). Frame hanya bisa diambil dari lampiran lokal dan URL lintas-asal yang server-nya mengizinkan CORS.
  - **Iframe tidak didukung** (dibuang sanitasi, seperti C3).
  - **DRM / video terproteksi (EME)** tidak diuji. Frame dari sumber seperti itu mungkin hitam atau tidak bisa diambil.
  - **Android belum diuji.** Semua uji di Chromium headless desktop.
  - **Posisi sisipan** mengikuti kursor di editor. Bila kursor berada di panel materi, frame disisipkan di posisi terakhir kursor di catatan, atau di akhir catatan.
  - **Pilihan materi dan mode belajar** tidak bertahan setelah muat ulang halaman, seperti C5.
  - **Format frame** selalu JPEG (kualitas 0,92). Tidak ada opsi PNG.

## Perubahan 29 · B8 lanjutan — Navigasi antar-hari dan tautan balik ke kalender

- **ID:** B8 lanjutan (navigasi antar-hari di halaman jurnal dan tautan balik ke kalender). Bagian ini sebelumnya dikeluarkan dari cakupan B8. Pengguna memintanya secara eksplisit dan menyetujuinya lewat "uji semua yang perlu diuji lalu lanjut ke B8 lanjutan". Persetujuan hanya untuk B8 lanjutan.
- **Perubahan:**
  - Catatan jurnal (judulnya berformat tanggal) sekarang menampilkan bilah navigasi di atas judul: tombol **‹ tanggal sebelumnya**, **Lihat di kalender**, dan **tanggal berikutnya ›**. Catatan biasa tidak menampilkan bilah ini.
  - Tombol sebelumnya/berikutnya pindah satu hari dengan cara yang sama seperti **Buka jurnal** di kalender: jurnal hari itu dibuka, atau dibuat bila belum ada. Isi yang belum tersimpan di-flush dulu sebelum pindah.
  - **Lihat di kalender** membuka layar Tugas dengan tanggal jurnal itu sudah terpilih.
  - `docs/notes/harian.js`: `tanggalJurnalAktif`, `jurnalBarHtml`, `navigasiJurnal`. `docs/notes/jurnal-tanggal.js`: pembantu tanggal dan `bukaJurnalTanggal`. `docs/notes/views/tugas.js` dan `views/editor.js` memasang handler `[data-jur]`. `docs/notes/index.js` meneruskan aksi ke `tampilkanKalenderTanggal`.
  - `docs/styles/notes.css`: gaya `.jurnal-bar` dan `.jurnal-b`. `docs/core/bahasa-en.js`, `bahasa-ja.js`: teks baru untuk bilah navigasi.
  - Stempel versi `20261029100000` (137 berkas).
- **Keputusan yang perlu diketahui:** menelusuri hari dengan tombol sebelumnya/berikutnya bisa membuat jurnal kosong untuk hari yang belum punya catatan. Perilaku ini sama dengan **Buka jurnal**. Bila pengguna ingin navigasi hanya menuju jurnal yang sudah ada, perilakunya perlu diubah.
- **Cara uji (hasil nyata):**
  - `tools/uji/jurnal-navigasi.mjs` (baru, masuk `npm test`): **27/0**. Mencakup parsing judul jurnal dalam tiga bahasa (en, id, ja), penolakan tanggal tidak valid (31 Februari, 30 Februari, bulan tak dikenal), tahun kabisat, catatan non-jurnal, dan pemeriksaan struktur bilah serta handler.
  - `tools/uji/planner-kalender.mjs`: **35/0**. Pemeriksaan impor `bukaJurnalTanggal` dilonggarkan agar toleran terhadap urutan nama impor.
  - Chromium headless, harness `/home/user/uji-hara/uji-b8-lanjut.mjs`: **22/22 lulus** (dijalankan dua kali, run kedua 22/22). Mencakup bilah di jurnal 15 Oktober dengan tombol 14 dan 16 Oktober, pindah bolak-balik tanpa jurnal ganda, isi yang diketik sebelum pindah tetap tersimpan, tombol kalender yang memilih hari itu, Buka jurnal dari kalender, catatan biasa tanpa bilah, dan HP 390 px tanpa scroll horizontal.
  - `npm test` dijalankan ulang di worktree: **exit 0** (semua suite di `tools/uji/*.mjs` lolos, termasuk dua suite di atas).
- **Keterbatasan jujur:**
  - Navigasi bisa membuat jurnal kosong (lihat Keputusan di atas).
  - **Android belum diuji.** Semua uji di Chromium headless desktop.
  - Pergantian bulan dan tahun lewat klik belum diuji di Chromium (uji browser hanya di sekitar 14–16 Oktober).

## Verifikasi Tahap 2 · uji HP (390 px) dan lisensi tessdata (29-10-2026)

- **Lingkup:** dua item terbuka dari Tahap 2. (1) Uji tampilan HP untuk kalender (B8 lanjutan) dan OCR (B6).
  (2) Verifikasi lisensi data tessdata yang di-vendor. Tidak ada perubahan fitur. Yang berubah hanya
  dokumentasi lisensi dan berkas `LICENSE-tessdata.txt`.
- **Uji HP (Chromium headless, viewport 390 × 844):** harness `/home/user/uji-hara/uji-hp.mjs`, **25/25 lulus**, tanpa pageerror.
  - **Kalender:** layar kalender terbuka dari bilah jurnal. Lebar dokumen 390 px, tidak melebar. 31 sel hari
    di dalam layar. Ketuk hari lain mengubah pilihan. Buka jurnal membuka jurnal hari itu.
  - **OCR gambar:** gambar PNG bertuliskan "sepeda merah" disisipkan ke catatan, dipilih dengan klik, lalu
    chip **Baca teks** dipakai. Hasil: `sepeda merah` tersimpan di atribut `data-ocr`.
  - **OCR PDF hasil pindai:** PDF satu halaman yang hanya berisi gambar JPEG (tanpa lapisan teks), dibuka di
    penampil. Tombol **OCR** dipakai. Status: "OCR selesai · 1 halaman dibaca". Hasil memuat "sepeda".
- **Temuan UX (diperbaiki, lihat Perbaikan UX di bawah):**
  - **Buka jurnal di kalender** berada di bawah bilah navigasi bawah saat halaman di posisi awal.
  - **Chip Baca teks di bilah mini gambar** berada di luar layar 390 px. Bilah hanya satu baris yang digeser mendatar.
- **Batas uji:** ini Chromium desktop dengan viewport 390 px, bukan HP sungguhan. Tidak ada emulasi sentuhan
  penuh. Kecepatan OCR di HP tetap belum diukur. Uji Opera Android belum dilakukan.
- **Lisensi tessdata (diverifikasi):**
  - LICENSE repositori `naptha/tessdata` (gh-pages): **Apache License 2.0**.
  - LICENSE repositori `tesseract-ocr/tessdata_best` (asal `4.0.0_best_int`): **Apache License 2.0**.
  - Field `license` di paket npm `@tesseract.js-data/eng` dan `ind`: **MIT**. Ini bertentangan dengan dua sumber di atas.
- **Keputusan dokumentasi:** yang dicatat di vendor adalah **Apache-2.0**, karena itu yang tercantum di repositori asal.
  Ditambahkan `docs/vendor/tesseract/LICENSE-tessdata.txt` (teks Apache-2.0). `docs/vendor/tesseract/README.md`
  diperbarui. Berkas data tidak diubah.
- **Keterbatasan:** ini pemeriksaan teknis, bukan nasihat hukum. Konfirmasi ulang sebelum rilis.

## Perbaikan UX dari uji HP (29-10-2026)

- **Kalender:** tombol **Lihat di kalender** dari jurnal sekarang menggulir layar ke kartu kalender
  (`tampilkanKalenderTanggal` di `docs/notes/views/tugas.js`). Tombol **Buka jurnal** langsung terlihat
  dan tidak tertutup bilah navigasi bawah, tanpa gulir manual.
- **Bilah mini gambar:** chip sekarang **membungkus ke baris kedua** bila tidak muat (`#mbar` di
  `docs/styles/notes.css`). Dulu satu baris yang digeser mendatar, dan chip di ujung, termasuk **Baca teks**,
  tersembunyi di luar layar 390 px. Perubahan ini juga berlaku di desktop, karena bilah dibatasi 420 px
  dan 14 chip tidak muat di satu baris. **Ini mengubah desain "satu baris ramping" yang dulu dipilih.**
- **Cara uji (hasil nyata):**
  - `uji-hp.mjs` (Chromium, 390 px): **23/23 lulus**. Tombol Buka jurnal dan chip Baca teks sekarang terlihat dan
    bisa diketuk **tanpa gulir atau geser**. Sebelum perbaikan, uji yang sama gagal 3 cek (tombol tertutup,
    chip di luar layar), jadi perbaikan ini yang membuat perbedaan.
  - `uji-b8-lanjut.mjs` (Chromium): **23/23 lulus**, termasuk cek baru bahwa kalender digulir ke kartunya.
  - Uji OCR gambar dan PDF di HP tetap lulus setelah perbaikan.
- **Keterbatasan:** tetap Chromium desktop dengan viewport 390 px, bukan HP sungguhan. Uji Opera Android belum dilakukan.

## Verifikasi lanjutan (29-10-2026): PDF pindai sungguhan, pergantian bulan dan tahun, dan catatan uji

Lingkup: lima butir tindak lanjut pengguna. Satu butir (PR ke main) tidak dikerjakan atas permintaan pengguna.

### 1. Uji B6 dengan PDF pindai sungguhan (Chromium, harness `uji-b6-pdf.mjs`)

Harness Chromium (`uji-b6-pdf.mjs`, `uji-jurnal-bulan.mjs`) disimpan di luar repo, seperti harness lain di bagian uji Chromium.

PDF pindai diambil dari sampel `tests/resources` repo OCRmyPDF (hanya untuk uji, tidak dikirim dalam aplikasi). Keempatnya halaman pindai
murni: 0 karakter di lapisan teks, 1 gambar. Teks yang benar diperiksa dari tangkapan layar penampil.

| Berkas | Kompresi | Hasil OCR | Pencarian | Hasil uji |
|---|---|---|---|---|
| `skew.pdf` (miring) | JBIG2 | "The LinnSequencer … professional musician" | "LinnSequencer" 3 hasil, "musician" 1 hasil | 8/8 |
| `ccitt.pdf` | CCITT (galat JBIG2 di konsol, lihat di bawah) | teks yang sama | sama | 8/8 |
| `rotated_skew.pdf` (diputar) | JBIG2 | teks yang sama | sama | 8/8 |
| `jbig2.pdf` | JBIG2 | teks yang sama | sama | 7/7 |
| `multipage.pdf` (6 hal.) | JPEG dan teks | 5 halaman dibaca, halaman 4 dilewati karena punya teks (109 karakter) | sesuai desain (sebelum perubahan OCR halaman campur) | 5/5 |

Kontrol negatif ("Watson" tidak ada di halaman) selalu "Tidak ditemukan". Tidak ada pageerror.

**Temuan 1 (sudah diperbaiki): decoder JBIG2 tidak dimuat.** Vendor pdf.js hanya berisi `pdf.min.mjs` dan
worker. Halaman JBIG2 gagal dengan "JBig2 failed to initialize", kanvas tetap kosong, dan OCR membaca
kanvas kosong ("1 halaman dibaca" tanpa teks). Uji sebelum perbaikan: `skew.pdf` tidak tergambar, OCR selesai
dalam 1 detik tanpa hasil. Perbaikan:
- `docs/vendor/pdfjs/wasm/jbig2.wasm` (sekitar 104 KB, sha256 `466f45c2…8eaab0`) dan lisensinya, disalin
  dari `pdfjs-dist` 6.4.299 tanpa modifikasi.
- `OPSI_WASM_PDFJS` di `docs/notes/pdf/muat-pdfjs.js` (`wasmUrl`), dipakai oleh penampil PDF dan belajar-materi.
- README vendor diperbarui. `image_decoders/` (JS) dan OpenJPEG (JPEG2000) tetap belum disertakan.

**Temuan 2 (diperbaiki, lihat Perubahan OCR halaman campur di bawah): halaman pindai dengan sedikit teks
dilewati OCR.** `pindai-stempel.pdf` adalah `skew.pdf` yang ditambah satu baris teks ketikan "STEMPEL DRAFT".
Sebelum perbaikan, OCR melewati halaman itu ("0 halaman dibaca") dan pencarian "LinnSequencer" tidak menemukan apa-apa.

**Catatan `ccitt.pdf`:** konsol browser sebelum perbaikan menunjukkan galat JBIG2 untuk berkas ini, padahal
pemeriksaan byte tidak menemukan `JBIG2Decode` (kemungkinan filter tersembunyi di object stream terkompresi).
Ini belum diverifikasi. Setelah perbaikan berkas ini lulus.

**Batas uji:** Chromium desktop, bukan HP. Teks yang dikenali adalah halaman iklan cetak yang bersih dan
dipindai buatan OCRmyPDF, bukan pindai buram, berwarna, atau berisi tulisan tangan. Waktu OCR di server
5–7 detik per halaman (CPU server, bukan HP).

### 2. Catatan hasil `uji-belajar` (C3, C4, C5, HP)

- Hasil: **53/53 lulus** (run4, exit 0). Angka ini dari sesi sebelumnya, sebelum lingkungan di-reset.
- Harness `uji-belajar.mjs` dan log `run4.log` tidak tersedia lagi di workspace ini, jadi uji ini **tidak bisa
  diulang di sini**. Hasil ini dicatat sebagai laporan, bukan hasil yang sudah diverifikasi ulang.
- Perubahan setelah run4 yang menyentuh jalur PDF belajar: `OPSI_WASM_PDFJS` (lihat butir 1). Uji
  `npm test` tetap lulus setelah perubahan ini.

### 3. Pergantian bulan dan tahun di navigasi jurnal (`uji-jurnal-bulan.mjs`, Chromium)

Hasil: **28/28 lulus**, tanpa pageerror.
- 31 Oktober → 1 November 2026: label, judul, dan isi tiap hari tersimpan terpisah (tidak tercampur).
- 30 November → 1 Desember 2026: label dan judul benar.
- 31 Desember 2026 → 1 Januari 2027: judul, label kiri dan kanan, dan isi tersimpan lintas tahun.
- Mundur dari 1 Januari 2027 ke 31 Desember 2026: jurnal yang sudah ada dibuka, tidak dibuat ganda (tetap 1 catatan).
- Penanda kalender: Desember 2026 menandai 31, Januari 2027 menandai 1, November 2026 menandai 1 dan 30.
- Tautan **Lihat di kalender** dari 1 Januari 2027 membuka layar Tugas dengan Januari 2027 terlihat.

Batas: cek Januari 2027 di layar Tugas memakai teks halaman, belum cek sel kalender yang terpilih.

### 4. Keputusan yang diserahkan kepada saya

- **Navigasi jurnal (±1 hari):** tetap membuka atau membuat jurnal, sama seperti tombol Buka jurnal di kalender.
  Konsekuensinya, menelusuri beberapa hari bisa membuat jurnal kosong. Saya pilih ini karena konsisten
  dengan tombol Buka jurnal dan tidak perlu mode terpisah.
- **Bilah mini gambar:** tetap membungkus ke dua baris di desktop dan HP (lihat Perbaikan UX dari uji HP).
  Alasannya, chip di ujung, termasuk Baca teks, lebih penting daripada gaya satu baris ramping.

### 5. Lisensi tessdata (butir 7)

Pengguna menjawab "Ya". Data `eng` dan `ind` dicatat sebagai **Apache-2.0** (lihat Verifikasi Tahap 2).
Konfirmasi hukum sebelum rilis tetap menjadi tanggung jawab pengguna. Ini pemeriksaan teknis, bukan nasihat hukum.

## Status (Tahap 2)

- B1, B5, B3, B4, B2, B6, dan B8 sudah diterapkan dan diuji (urutan §6.1). Tahap 2 selesai.
- B6: lanjutan core non-SIMD sudah dikerjakan sesuai keputusan pengguna. Pengujian Chromium
  SIMD 25/25 dan non-SIMD 25/25 (non-SIMD dengan deteksi SIMD dipaksa gagal, lihat bagian B6 lanjutan).
- B8: termasuk navigasi antar-hari dan tautan balik ke kalender (Perubahan 29). Tahap 2 lengkap.
- Uji akhir: `npm test` exit 0 (37/37 suite lolos). Node OCR 54/54. Node B8 35/35. Chromium B8 21/21.
  Chromium OCR SIMD 25/25 dan non-SIMD 25/25.

## Berikutnya

- Tahap 2 sudah selesai sesuai urutan. Tahap 3: C1, C2, C5, C3, dan C4 sudah dikerjakan. Uji Android untuk C1–C5 dan DRM untuk C4 belum dilakukan.
- Hal terbuka dari Tahap 2: uji di HP sungguhan (Opera Android) untuk OCR dan kalender, serta konfirmasi lisensi tessdata sebelum rilis (lihat Verifikasi Tahap 2). Dua temuan UX di atas sudah diperbaiki (lihat Perbaikan UX dari uji HP).
  - Keterbatasan OCR halaman campur: halaman dengan teks lapisan 51 huruf atau lebih tidak di-OCR, walau gambarnya
    penuh (lihat Perubahan OCR halaman campur).

## Perubahan OCR halaman campur (29-10-2026): halaman pindai dengan sedikit teks

Menanggapi temuan 2 di Verifikasi lanjutan. Pengguna memilih opsi (a): OCR juga untuk halaman yang punya
gambar besar tetapi sedikit teks.

- **Aturan:** halaman di-OCR bila tidak punya teks lapisan, atau bila teks lapisannya **50 huruf atau kurang** dan
  gambar terbesar menutupi **50% atau lebih** halaman (`perluOcr` di `docs/notes/ocr/ocr-teks.js`).
  Halaman dengan teks lebih dari 50 huruf tidak di-OCR, walau gambarnya penuh.
- **Deteksi gambar:** `bagianGambarTerbesar` (`docs/notes/pdf/penampil.js`) membaca operator list pdf.js.
  CTM setiap gambar dihitung dan dibandingkan dengan luas halaman. Gambar di dalam form XObject tidak dihitung.
  Galat membaca operator dianggap tidak ada gambar.
- **Penggabungan saat mencari:** teks lapisan dan hasil OCR digabung (`gabungLapisanOcr`). Item OCR yang separuh
  lebih kotaknya tertutup kotak teks lapisan dibuang, jadi stempel tidak tercatat dua kali. Halaman tanpa
  teks lapisan memakai hasil OCR seperti sebelumnya.
- **Ambang 50 huruf:** dipilih dari dua contoh, bukan dari statistik. Stempel `pindai-stempel.pdf` punya 12 huruf.
  Halaman 4 `multipage.pdf` (grafik dengan label "Oppose", "Percentage", dan "note") punya 77 huruf. Dengan
  ambang 200, halaman grafik ini ikut di-OCR, dan hasilnya sebagian besar derau ("&", "AN", "ae") yang masuk
  indeks pencarian. Ambang 50 mengecualikannya. Ini penilaian, bukan angka yang sudah divalidasi pada banyak berkas.

**Cara uji (hasil nyata):**
- `tools/uji/ocr-pindai-campur.mjs` (Node): **19/19 lulus**. Mencakup ambang, batas tepat di 50, penghitungan huruf,
  dan penggabungan (duplikat dibuang, OCR di luar lapisan tetap masuk).
- Chromium, PDF pindai:
  - `pindai-stempel.pdf`: 7/7. OCR membaca halaman, "LinnSequencer" menemukan 3 hasil, "STEMPEL" tepat 1 hasil
    (tidak ganda), kontrol negatif "Watson" tidak ditemukan.
  - `skew.pdf`, `ccitt.pdf`, `rotated_skew.pdf`, `jbig2.pdf`: masing-masing 6/6. Hanya halaman 1 di-OCR.
  - `multipage.pdf`: 6/6. Halaman 1, 2, 3, 5, dan 6 di-OCR. Halaman 4 tidak. "widow" ditemukan, dan "Oppose"
    tetap ditemukan lewat lapisan teks.
- `npm test`: exit 0, semua suite lolos (termasuk `ocr-pindai-campur.mjs`).
- Ukuran per halaman (`dbg-bagian`): huruf lapisan dan bagian gambar untuk setiap halaman di semua berkas di atas.

**Batas:**
- Halaman dengan lebih dari 50 huruf di lapisan teks dan gambar penuh tidak di-OCR. Contoh: pindaian yang punya
  paragraf teks ketikan (misalnya hasil OCR lama yang sudah ditambah lapisan teks). Bagian yang hanya berupa gambar
  di halaman itu tidak bisa dicari.
- Gambar di dalam form XObject tidak dihitung. Pindaian biasa tidak memakai bentuk ini, tetapi belum diuji.
- Keputusan ambang 50 bisa berubah setelah uji dengan lebih banyak PDF nyata.
- Waktu OCR bertambah untuk PDF digital yang punya gambar besar. Ini hanya terjadi saat pengguna menekan OCR.
- Chromium desktop saja. Belum diuji di HP atau Android.

## Perubahan 30 · C6 — Active recall tape, bagian teks (Tahap 4)

- **ID:** C6 (Active recall tape). Urutan §6.1 Tahap 4 nomor 1. Dikerjakan setelah persetujuan pengguna ("Oke kerjakan C6").
- **Alasan urutan dan dependensi:** §6.1 meminta versi teks dulu, lalu objek visual/layer. Versi teks hanya butuh
  model isi blok yang sudah ada (HTML dengan kelas) dan mesin perintah bar. Objek visual/layer belum dikerjakan
  (A2/A5 belum selesai) dan tidak diperlukan untuk bagian ini. C7 dan C8 tidak bergantung pada C6.
- **Perilaku:**
  - Sorot teks lalu pilih **Tape** di bilah format atau di menu **Penandaan**. Teks dibungkus span
    `<span class="tape tutup">`. Teks tersembunyi (warna transparan, blok abu-abu), default saat dibuat.
  - **Ketuk** tape untuk menampilkan, ketuk lagi untuk menutup. Status disimpan di kelas, jadi ikut tersimpan
    bersama isi blok dan bertahan setelah muat ulang.
  - **Buka semua tape** dan **Tutup semua tape** di menu Penandaan mengubah semua tape di catatan itu.
  - Seleksi yang ditolak dengan pesan: kosong, melewati dua blok (tape tidak boleh memutus paragraf),
    berada di dalam tape, atau memuat tape lain.
  - Format di dalam seleksi (tebal, sorot) tetap dipertahankan di dalam tape. Id elemen tidak digandakan.
- **File:**
  - `docs/notes/editor/tape-murni.js` (baru): logika DOM murni (bungkus, status, buka/tutup semua). Tanpa impor UI.
  - `docs/notes/editor/tape.js` (baru): glue UI (tombol, ketukan, pesan galat).
  - `docs/notes/bar/actions.js`, `bar/config.js` (grup Penandaan), `bar/help.js` (bantuan ketiga aksi),
    `editor/bilah-teks.js` (tombol di bilah seleksi), `index.js` (`bindTape()`).
  - `docs/styles/notes.css` (gaya `.tape`, `.tape.tutup`), `docs/index.html` (ikon `i-eye`, `i-eye-off`).
  - `docs/core/bahasa-en.js`, `bahasa-ja.js`: terjemahan untuk string baru.
- **Cara uji (hasil nyata):**
  - `tools/uji/tape-teks.mjs` (Node + jsdom): **40/40 lulus**. Mencakup pembungkusan, penolakan, status per tape,
    buka/tutup semua, penyaringan HTML (kelas dan data-* tetap, onclick dibuang), serta format sorot tanpa id ganda.
  - Chromium `uji-c6.mjs`: **21/21 lulus**. Bungkus lewat bilah format, ketuk buka dan tutup, buka/tutup semua
    lewat menu, status bertahan setelah muat ulang, galat seleksi lintas blok, dan lebar 390 px tanpa gulir mendatar.
    Tidak ada pageerror.
  - `npm test`: exit 0, semua suite lolos.
- **Galat yang ditemukan lewat uji dan diperbaiki:** seleksi di dalam satu text node yang berada di dalam `<b>`
  kehilangan format tebal di dalam tape, karena `extractContents()` hanya mengambil teks. Diperbaiki dengan
  membungkus ulang isi dengan klon rantai inline (tanpa id).

**Keterbatasan:**
- Hanya versi teks. Tape untuk coretan dan objek visual (penutup terhubung ke objek) belum ada.
- Teks tape **tetap masuk pencarian dan ekspor**. Ini tidak menyembunyikan teks dari pencarian atau hasil ekspor.
- Ketuk tape juga mengubah statusnya. Saat mengedit teks di dalam tape, ketukan akan membuka atau menutupnya.
  Pindah kursor dengan panah keyboard tidak mengubah status.
- Tidak ada pintasan keyboard untuk membuka atau menutup tape. Tidak ada cara untuk mengakses tape lewat keyboard saja.
- Belum diuji di mode baca, di dalam tabel, dan di dalam blok toggle atau daftar.
- Chromium desktop dan viewport 390 px saja. Belum diuji di HP atau Android.

## Perubahan 31 · C7 — Flashcard v1 (Tahap 4)

- **ID:** C7 (Flashcard). Urutan §6.1 Tahap 4 nomor 2. Dikerjakan setelah persetujuan pengguna ("Oke lanjut c7").
- **Lingkup v1 (sesuai rancangan):**
  - Kartu dibuat manual. Sorot teks di catatan, lalu pilih **Jadikan kartu** di bilah format atau di menu **Penandaan**.
    Teks sorot mengisi bagian depan, dan belakang diisi sendiri. Kedua sisi wajib, dipangkas, maksimal 2000 karakter per sisi.
  - Judul catatan sumber disalin ke kartu. Menghapus atau mengedit catatan asal **tidak** mengubah kartu.
  - **Latihan kartu** (menu Penandaan): berurutan dari kartu tertua. Ketuk **Lihat jawaban**, lalu pilih **Kartu ingat** atau **Belum**.
    Kartu yang "Belum" diantrekan lagi di akhir sesi yang sama. Hitungan benar dan salah disimpan per kartu.
  - Kartu bisa dihapus dari sesi latihan. Tanpa spaced repetition (§2.7 ditunda).
  - Kartu disimpan di `state.kartu`, ikut snapshot penyimpanan, dan ikut cadangan JSON. Impor dinormalisasi:
    entri rusak dibuang, id ganda dibuang. Mode timpa mengganti semua kartu, mode gabung menimpa berdasarkan id.
- **File:**
  - `docs/notes/kartu-murni.js` (baru): model murni (buat, normalisasi, nilai, antrean, ringkasan). Tanpa impor UI.
  - `docs/notes/kartu.js` (baru): glue UI (formulir lembar, latihan, hapus, pesan).
  - `docs/core/store.js`, `docs/notes/data-io.js`: penyimpanan, ekspor, impor kartu.
  - `docs/notes/menus/pop.js`: klik dan Enter untuk formulir dan latihan (Enter memakai kelas `pop-in`).
  - `docs/notes/editor/bilah-teks.js`: tombol Jadikan kartu di bilah format seleksi.
  - `docs/notes/bar/render.js`, `bar/config.js` (grup Penandaan), `bar/help.js`.
  - `docs/styles/notes.css` (gaya `.kt-*`), `docs/core/bahasa-en.js`, `bahasa-ja.js`.
  - `tools/uji/kartu-murni.mjs` (baru): uji model murni.
- **Keputusan kecil saat implementasi:**
  - Kunci terjemahan `Ingat` dan `Ulangi` sudah dipakai di tempat lain dengan arti berbeda (pengingat, ulang). Untuk kartu dipakai
    `Kartu ingat` dan `Ulangi latihan`, supaya tidak menimpa terjemahan lama.
  - Ringkasan latihan memakai "Sisa" dan bukan "selesai / total", karena kartu "Belum" muncul lagi.
- **Cara uji (hasil nyata):**
  - `tools/uji/kartu-murni.mjs` (Node): **35/35 lulus**. Mencakup validasi, batas 2000 karakter, normalisasi impor,
    urutan antrean, dan jalannya sesi sampai selesai.
  - Chromium `uji-c7.mjs` (harness di luar repo): **46/46 lulus**. Mencakup pembuatan dari grup Penandaan dan bilah
    (termasuk validasi belakang kosong dan spasi saja), Enter menyimpan, latihan (balik, Ingat, Belum, kembali ke antrean),
    nilai tersimpan, Ulangi, hapus, latihan tanpa kartu, kartu bertahan setelah muat ulang, batas maxlength,
    dan tampilan 390 px tanpa melebar (latihan dan formulir). Tidak ada pageerror.
  - `npm test`: exit 0, **37 suite lolos** (`npmtest-c7.log`).
- **Galat yang ditemukan lewat uji dan diperbaiki:** kolom formulir tidak punya kelas `pop-in`, sehingga Enter tidak menyimpan.
  Ditambahkan kelas itu.
- **Temuan di luar C7 (belum diperbaiki):** pada 390 px grup **Penandaan** di bilah utama berada di luar layar.
  Bilah mobile harus digulir ke samping untuk mencapainya. Ini berlaku untuk semua isi grup itu, termasuk Tape.
  Jalur kartu di HP sekarang lewat bilah format yang muncul saat teks disorot.

**Keterbatasan (v1):**
- Tanpa spaced repetition. Kartu "Belum" hanya muncul lagi dalam sesi yang sama, tanpa jadwal lintas hari (§2.7).
- Tidak terikat Tape. Integrasi kartu dari teks tape (opsional) belum dikerjakan.
- Pembuatan manual saja. Tidak ada impor kartu dari berkas atau pembuatan otomatis.
- Tidak ada gambar atau media di kartu. Hanya teks biasa.
- Hanya Chromium desktop dan viewport 390 px. Belum diuji di HP sungguhan atau Android.
- Uji 390 px memicu tombol Penandaan lewat DOM karena tombol itu di luar layar (lihat temuan di atas).

## Perubahan 32 · C9 — Focus timer v1 (Tahap 4)

- **ID:** C9 (Focus timer). Urutan §6.1 Tahap 4 nomor 3, setelah C7. Dikerjakan setelah persetujuan pengguna
  (pilihan "C9" di pertanyaan lanjutan). Dasar: §2.8 (Pomodoro sebagai mode awal, durasi bisa diubah, notifikasi suara bisa dimatikan).
- **Perilaku:**
  - **Pomodoro** (bawaan): fokus 25 menit lalu istirahat 5 menit, bergantian. Hitungan siklus fokus ditampilkan.
  - **Hitung mundur**: satu kali hitung, bawaan 10 menit.
  - Tombol **Mulai**, **Jeda**, **Lanjut**, **Ulang**. Waktu dihitung dari timestamp akhir, jadi tetap benar walau tab sempat tidak aktif.
  - Timer tetap jalan saat lembar ditutup. Saat waktu habis: toast, dan bunyi pendek bila dinyalakan.
  - Pergantian fase **tidak otomatis dimulai**. Pengguna menekan Mulai lagi.
  - Durasi dan pilihan bunyi disimpan di `localStorage` (kunci `hara.fokus.v1`). Keadaan timer hanya di memori, jadi muat ulang membuat timer kembali siap.
  - Pengaturan hanya bisa diubah saat timer siap atau selesai. Saat berjalan atau dijeda, kolom dan mode terkunci dan muncul pesan.
- **Akses:** menu **Lainnya** grup baru **Belajar** dan palet perintah (Ctrl+K, "timer fokus"). Tidak masuk grid beranda.
- **File:**
  - `docs/notes/fokus-murni.js` (baru): model murni (pengaturan, mulai, jeda, periksa fase, format waktu). Tanpa impor UI.
  - `docs/notes/fokus.js` (baru): glue UI (lembar, tombol, toast, bunyi lewat Web Audio tanpa berkas).
  - `docs/app.js`: impor, `pasangFokus()`, entri palet, grup Lainnya.
  - `docs/styles/notes.css` (gaya `.ft-*`), `docs/core/bahasa-en.js`, `bahasa-ja.js` (26 kunci per bahasa).
  - `tools/uji/fokus-murni.mjs` (baru): uji model murni.
- **Cara uji (hasil nyata):**
  - `tools/uji/fokus-murni.mjs` (Node): **48/48 lulus**. Mencakup normalisasi dan batas, durasi, jeda dan lanjut dari
    timestamp, siklus fokus lalu istirahat, mode hitung selesai sekali, pengaturan hanya saat siap atau selesai, dan format waktu.
  - Chromium `uji-c9.mjs` (harness di luar repo, jam palsu Playwright): **49/49 lulus**. Mencakup akses dari Lainnya,
    keadaan awal, mulai, jeda (waktu tidak bergerak), lanjut, timer tetap jalan setelah lembar ditutup, fokus selesai
    dengan bunyi, istirahat tidak otomatis mulai, mode hitung, Ulang, kunci saat berjalan, batas nilai (999 menit jadi 180),
    pengaturan tersimpan dan bertahan muat ulang, bunyi mati, dan 390 px tanpa melebar. Tidak ada pageerror.
  - `npm test`: exit 0 (`npmtest-c9.log`).
- **Galat yang ditemukan lewat uji dan diperbaiki:** tidak ada galat kode. Ada dua masalah harness: jam palsu yang
  berjalan mengikuti waktu nyata membuat hitungan meleset 2 dtk, sehingga jam dibekukan dengan `pauseAt`. Screenshot
  Playwright tertahan saat jam palsu aktif, sehingga memakai CDP.

**Keterbatasan (v1):**
- **Stopwatch belum ada.** Acuan menyebutnya sebagai tambahan, dan itu ditunda.
- **Tidak ada penyimpanan keadaan timer.** Muat ulang halaman menghentikan timer yang sedang berjalan.
- **Tidak terhubung ke catatan atau tugas.** Tidak ada pencatatan sesi belajar ke jurnal atau statistik.
- **Tab tidak aktif:** browser dapat menunda pemeriksaan waktu. Waktu tetap benar, tetapi toast dan bunyi bisa terlambat sampai tab aktif lagi.
- **Bunyi:** dibuat lewat Web Audio saat waktu habis. Browser dapat memblokirnya bila tidak ada interaksi pengguna di halaman. Belum diuji di Android atau iOS.
- **Tanpa notifikasi sistem.** Tidak ada notifikasi OS saat tab tertutup.
- **Akses:** tidak ada di grid beranda. Ditemukan lewat Lainnya > Belajar atau Ctrl+K.
- Chromium desktop dan viewport 390 px saja. Belum diuji di HP sungguhan atau Android.

## Verifikasi lanjutan C7: ekspor dan impor kartu (Chromium, `uji-c7-data.mjs`)

Butir yang belum diuji pada Perubahan 31 sekarang sudah diuji: **9/9 lulus**, tanpa pageerror.

- Ekspor (`cadanganJson`) memuat kunci `kartu` bila ada kartu.
- Impor **timpa** dari cadangan baru mengembalikan kartu persis.
- Impor **gabung**: id yang sama diperbarui dengan isi cadangan, kartu lokal yang tidak ada di cadangan tetap, dan entri rusak (depan kosong) dibuang.
- Impor **gabung** dari cadangan lama (tanpa kunci `kartu`) tidak menghapus kartu lokal.
- **Perilaku yang dicatat:** impor **timpa** dari cadangan lama (tanpa kunci `kartu`) mengosongkan semua kartu. Ini sesuai arti timpa, yaitu isi data diganti seluruhnya dengan isi cadangan. Pengguna perlu tahu ini sebelum memilih timpa.
