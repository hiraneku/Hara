# Perubahan Tahap 1 (log)

> Format mengikuti `koreksi-dan-urutan-32-konsep.md` §6.4 poin 4: setiap perubahan menyebut ID, alasan urutan, dependensi, file, dan cara uji.
> Dasar urutan: §6.1 Tahap 1. Ikut urutan dokumen: A1 → A2 → A6 → A7 → A3 → A4 → A5 → A8 → A9 → B7.

## Keputusan yang diambil (diminta pengguna: "kamu atur saja")

1. **Tabel `outbox` dan strategi konflik tidak dibuat sekarang.** Sinkronisasi (D2) ada di Tahap 5. Tabel `outbox` dibuat di awal D2, bersama migrasi penyimpanan, bukan lebih awal. Sebelum D2, tulis dokumen desain sinkron (data lokal vs sinkron, ID stabil, antrean offline, versi, konflik, penghapusan, retry), sesuai §2.9. Kandidat awal dari `PLAN.md` (last-write-wins per field) belum menjadi keputusan final dan akan dicocokkan dengan §1.10.
2. **Urutan Tahap 1 mengikuti dokumen.** A1 dikerjakan lebih dulu, lalu A2. A6 dan A7 tidak didahulukan, meski sebelumnya sempat diusulkan.

## Perubahan 1 — A1 Handwriting and drawing

- **ID:** A1 (A2, A3, A4, A5 nanti memakai model data yang sama).
- **Alasan urutan:** item pertama Tahap 1 dan dependensi bagi A3–A5 (§6.3).
- **Masalah di kode (audit):** goresan hanya ada di memori sesi. Saat sketsa dibuka ulang, yang dimuat hanya PNG, sehingga goresan lama tidak bisa diedit.
- **Yang berubah:**
  - `docs/notes/editor/goresan.js` (baru): model murni. Validasi goresan, batas (1.000 goresan, 60.000 titik, 300 KB), serialisasi JSON versi 1 (`latar`, `pola`, `goresan`).
  - `docs/notes/note-model.js`: atribut `data-goresan` ditulis di blok gambar dan dibaca lagi (`elToBlock`). Karena disimpan di meta blok, data ikut catatan dan cadangan JSON.
  - `docs/notes/editor/sketsa.js`: sketsa baru menyimpan goresan. Sketsa dengan `data-goresan` dibuka sebagai goresan, bukan PNG. Sketsa lama dan coretan di atas foto tetap memakai jalur PNG (tanpa `data-goresan`). Bersihkan menghapus status latar foto.
  - `tools/uji/sketsa-goresan.mjs` (baru): 12 uji unit dan 9 uji integrasi (jsdom).
  - Seluruh `docs/**` dan `tools/uji` terkena `node tools/version.mjs` (aturan repo sebelum commit): 122 berkas, perubahannya hanya string `?v=`.
- **Dependensi:** tidak ada. Hanya memakai blok gambar dan IndexedDB yang sudah ada.
- **Perilaku baru:** goresan sketsa baru bisa dibuka ulang, diedit, dan disimpan lagi tanpa kehilangan goresan. Di atas batas, sketsa tetap tersimpan sebagai gambar dan muncul pemberitahuan.
- **Status A1 setelah perubahan:** masih *Partially implemented*. Goresan sudah tersimpan dan bisa dibuka ulang. Belum bisa memilih, memindah, atau menghapus satu objek goresan.
- **Cara uji yang dijalankan:**
  - `node tools/uji/sketsa-goresan.mjs`: 21/21 lulus.
  - Uji mutasi: pemuatan goresan sengaja dimatikan. Hasilnya 1 uji gagal, lalu kode dipulihkan (dibandingkan `cmp`).
  - `node tools/uji/catatan-generasi-baru.mjs`: 24/24 lulus.
  - `npm test` penuh: exit 0, dijalankan dua kali (sebelum dan sesudah penstempelan versi).
- **Belum diuji:** perangkat Android dan ekspor ZIP nyata. Verifikasi di sini sampai meta blok dan cadangan JSON melalui DOM dan `domToBlocks`.
- **Keterbatasan yang diketahui:** latar gelap belum bisa dipilih di UI. Format sudah menyimpannya, jadi begitu UI ada datanya sudah siap.

## Perubahan 2 — A2 Digital paper, annotations, visual elements (langkah 1)

- **ID:** A2. Dasar: model data goresan dari A1. Dikerjakan di sketsa dulu, karena model A1 ada di sana.
- **Alasan urutan:** urutan dokumen §6.1 (A2 setelah A1).
- **Kondisi awal (audit):** gambar di aliran catatan sudah bisa diubah lebar (40–100%), diputar, dan diatur posisinya kiri/tengah/kanan. Latar kertas (titik/garis/polos) hanya ada di sketsa. Belum ada objek bebas yang bisa dipilih dan dipindah di dalam kanvas.
- **Yang berubah:**
  - `docs/notes/editor/goresan.js`: format v2 menambah `objek` (`id`, `blob`, `x`, `y`, `w`, `h`), dengan batas 50 objek. v1 tetap bisa dibaca. Tambahan: `hitObjek` (uji titik), `idBlobDariGoresan` (daftar id blob).
  - `docs/notes/editor/sketsa.js`: alat **Pilih** (pindah objek, objek yang disentuh naik ke atas). Tombol **Tambah gambar**, **Perbesar** (×1,15), **Perkecil** (×0,87), **Hapus objek**. Objek digambar di bawah goresan. Kotak pilihan tidak ikut tersimpan.
  - `docs/notes/editor/image.js` dan `docs/notes/data-io.js`: id blob objek ikut dihitung sebagai "masih dipakai", supaya tidak dihapus oleh pembersihan blob yatim (batas 24 jam) atau hapus gambar.
  - **Perbaikan bug lama** di `data-io.js` `idBlobDipakai`: potongan `data-blob="…"` salah satu karakter, sehingga karakter pertama id blob hilang dari daftar. Diperbaiki (`slice(11, -1)`).
  - `tools/uji/sketsa-objek.mjs` (baru): 12 uji unit + 9 uji integrasi (jsdom). Pemilih berkas diganti stub, karena jsdom tidak bisa memilih berkas.
  - Penstempelan `node tools/version.mjs`: 122 berkas, hanya string `?v=`.
- **Cara uji yang dijalankan:**
  - `node tools/uji/sketsa-objek.mjs`: 21/21 lulus.
  - Uji mutasi: rumus geser objek sengaja dirusak, 1 uji gagal, lalu dipulihkan.
  - `node tools/uji/sketsa-goresan.mjs`: 21/21. `node tools/uji/catatan-generasi-baru.mjs`: 24/24.
  - `npm test` penuh: exit 0 (setelah penstempelan versi).
- **Status A2 setelah langkah ini:** masih *Partially implemented*. Sudah ada objek bebas di sketsa. Belum ada: objek bebas di halaman catatan biasa, dan latar kertas untuk halaman catatan (ini bagian B7).
- **Belum diuji:** perlindungan blob dari pembersihan blob yatim belum diuji dengan blob yang sudah berumur lebih dari 24 jam. Saat ini hanya diuji lewat `idBlobDariGoresan`. Belum diuji di perangkat Android.

## Perubahan 3 — A6 Zoomable canvas dan A7 Resizable canvas

- **ID:** A6 dan A7, dikerjakan bersamaan karena berbagi sistem koordinat kanvas (§6.3). Keduanya tetap dipisah secara perilaku.
- **Alasan urutan:** urutan dokumen §6.1 (A6 lalu A7). Dasar keputusan: §2.2 (zoom tidak mengubah ukuran; kanvas bisa diperluas sampai batas wajar).
- **Kondisi awal (audit):** kanvas sketsa tetap 720×460, di CSS dan di JavaScript. Tidak ada zoom.
- **Yang berubah:**
  - `docs/notes/editor/goresan.js`: format v3 menambah `kanvas` (`w`, `h`). Batas: minimum 360×240, maksimum 2400×2400, langkah 120 px. Data v1 dan v2 tetap terbaca dengan ukuran default 720×460.
  - `docs/notes/editor/sketsa.js`:
    - **A6 zoom:** tombol −, 100%, + (langkah 0,25; rentang 50%–400%). Zoom hanya mengubah ukuran tampilan kanvas, bukan koordinat yang tersimpan. Alat **Geser** untuk menggeser tampilan yang di-zoom, karena kanvas memakai `touch-action: none`.
    - **A7 ukuran kanvas:** tombol Lebar −/+ dan Tinggi −/+, dengan info ukuran (misalnya `960×580`). Ekspansi ke kanan dan bawah, sehingga koordinat lama tidak bergeser. Pengecilan ditolak bila ada goresan atau objek yang keluar dari area baru. Sketsa berlatar gambar lama (PNG) atau foto tidak bisa diubah ukurannya.
  - `docs/styles/notes.css`: `.sk-stage` bisa digulir (`overflow: auto`) dan kanvas dipusatkan dengan `margin: auto`, sehingga tidak terpotong saat diperbesar.
  - `tools/uji/sketsa-kanvas.mjs` (baru): 7 uji unit + 15 uji integrasi (jsdom).
- **Keputusan yang diambil sendiri:**
  - Ekspansi hanya ke kanan dan bawah. Ekspansi ke kiri/atas akan menggeser semua koordinat dan objek, dan belum diperlukan.
  - Kanvas tidak bisa diubah saat sketsa masih berlatar gambar lama, karena gambar itu tidak punya data kanvas dan akan terpotong atau melebar.
  - Pinch-zoom dengan dua jari belum dibuat. Zoom lewat tombol dulu, karena dua jari berbenturan dengan tulisan tangan.
- **Cara uji yang dijalankan:**
  - `node tools/uji/sketsa-kanvas.mjs`: 22/22 lulus.
  - Uji mutasi 1: pemetaan koordinat saat zoom dirusak. 1 uji gagal, lalu dipulihkan.
  - Uji mutasi 2: pemeriksaan pengecilan dinonaktifkan. 3 uji gagal, lalu dipulihkan.
  - Uji A1, A2, dan sketsa lama (`sketsa-goresan`, `sketsa-objek`, `catatan-generasi-baru`): semua lulus.
- **Belum diuji:** zoom dan geser di HP sungguhan (ukuran layar, lebar stage, dan gerakan jari). Stage di jsdom tidak punya tata letak, jadi `clientWidth` dianggap 0.
- **Status:** A6 dan A7 masing-masing masih *Partially implemented* di sisi perilaku, karena zoom belum pinch dan ukuran kanvas belum punya batas per halaman catatan. Kedua fitur ini sudah berfungsi di sketsa.

## Perubahan 4 — A3 Custom pen and brush presets

- **ID:** A3.
- **Alasan urutan:** §6.1 menempatkan A3 setelah A7. §6.2 menyebut A3, A4, dan A5 memakai model data yang sama dari A1. Dependensi: A1 (goresan sebagai data), A6 dan A7 (sudah selesai, tidak mengubah gaya).
- **Kondisi awal (audit):** hanya satu jenis pena. Preset belum ada.
- **Yang berubah:**
  - `docs/notes/editor/goresan.js`: format **v4**. Setiap goresan punya field `gaya` (`tinta`, `kuas`, `pensil`). Data v3 tanpa `gaya` dibaca sebagai `tinta`. Ditambah `faktorGaya()` yang dipakai canvas dan SVG agar hasilnya sama. Kuas: lebar ×2,2 dan transparansi 0,85. Pensil: lebar ×0,8 dan transparansi 0,55. Tinta: tidak berubah.
  - `docs/notes/editor/preset-pena.js` (baru): daftar preset. Tiga preset bawaan (Tinta hitam, Kuas biru, Pensil abu) tidak bisa dihapus. Preset kustom maksimal 8, disimpan di `localStorage` kunci `hara.pena.v1`, terpisah dari catatan. Data rusak diabaikan.
  - `docs/notes/editor/sketsa.js`: baris preset di toolbar. Memilih preset mengaktifkan alat Pena dan mengisi warna, ukuran, dan gaya. Tombol **Simpan preset** menyimpan kombinasi aktif sebagai "Gaya N". Tombol **Hapus preset** hanya aktif untuk preset kustom yang sedang cocok. Gaya hanya berlaku untuk alat Pena. Stabilo, Garis, Panah, Kotak tidak ikut.
  - `docs/styles/notes.css`: titik warna pada tombol preset (`.sk-pdot`).
  - `tools/uji/sketsa-pena.mjs` (baru): 27 uji unit (19 preset, 8 gaya) + 14 uji integrasi (jsdom). Hasil: 41/41.
  - `tools/uji/sketsa-goresan.mjs` (diubah): harapan uji serialisasi A1 diperbarui. Setiap goresan sekarang punya `gaya: 'tinta'` setelah dibaca balik (perubahan format yang disengaja). Urutan kunci disamakan dengan hasil baca.
- **Cara uji yang dijalankan:**
  - `node tools/uji/sketsa-pena.mjs`: 41/41 lulus.
  - Uji mutasi 1: gaya tidak diterapkan saat memilih preset. 2 uji gagal, lalu dipulihkan.
  - Uji mutasi 2: gaya tidak disimpan di goresan. 1 uji gagal, lalu dipulihkan.
  - Uji mutasi 3: pemeriksaan duplikat preset dinonaktifkan. 5 uji gagal, lalu dipulihkan.
  - `node tools/uji/sketsa-goresan.mjs`: 21/21 (setelah harapan uji diperbarui).
  - `npm test` penuh: exit 0, 10 suite lulus (run terakhir sebelum commit, termasuk `sketsa-pena` 41/41).
- **Belum diuji:**
  - Tampilan kuas dan pensil secara visual. Chromium tidak tersedia di sandbox, dan jsdom tidak menjalankan canvas. Renderer hanya diperiksa lewat `faktorGaya()` dan pembacaan kode.
  - Pena di HP sungguhan.
  - Versi lama aplikasi membaca data v4. Desain A1 menjamin gambar PNG tetap tampil, tetapi ini belum diuji.
- **Batasan:** kuas dan pensil hanya mengubah lebar dan transparansi. Tekanan stylus belum dipakai, dan tekstur pensil belum ada. Preset tidak disinkronkan lintas perangkat (menunggu D2).
- **Status:** A3 *Partially implemented* (preset pena ada di sketsa, belum di halaman catatan biasa).

## Perubahan 5 — A4 Shape recognition

- **ID:** A4.
- **Alasan urutan:** §6.1 menempatkan A4 setelah A3. §6.2 menyebut A3, A4, dan A5 memakai model data yang sama dari A1. Hasil pengenalan disimpan sebagai goresan yang bisa diedit, tidak sebagai gambar. Dependensi: A1 (goresan sebagai data), A3 (gaya pena; bentuk memakai gaya tinta).
- **Kondisi awal (audit):** `kotak`, `garis`, dan `panah` hanya alat manual. Tidak ada deteksi bentuk dari coretan.
- **Keputusan desain (§1.4 dokumen koreksi):**
  - Pemicu: ujung ditahan diam 650 ms saat masih menekan (stylus atau jari). Gerak lebih dari 12 px membatalkan pengenalan dan coretan lanjut seperti biasa.
  - Bentuk tampil dulu di bar "Bentuk dikenali: …" dengan dua pilihan: **Pakai bentuk** atau **Coretan asli**.
  - Algoritme lokal tanpa AI atau layanan cloud (`docs/notes/editor/bentuk.js`).
- **Yang berubah:**
  - `docs/notes/editor/bentuk.js` (baru): pengenalan murni logika. Urutan uji: garis, lalu elips/lingkaran (kesesuaian dengan kotak pembatas), lalu persegi/persegi panjang/segitiga/poligon (Douglas-Peucker, 3 sampai 6 sudut tajam). Coretan acak, pendek (kurang dari 8 titik), dan terbuka tidak dikenali.
  - `docs/notes/editor/goresan.js`: dua alat baru di `ALAT_GORESAN`: `elips` (dua titik sudut kotak pembatas) dan `poligon` (daftar titik). Format tetap v4.
  - `docs/notes/editor/sketsa.js`: pemicu tahan, bar bentuk, dan tombol **Pakai bentuk** / **Coretan asli**. Render canvas dan SVG untuk `elips` dan `poligon`. Pencegahan menu konteks di kanvas (tekan-tahan lama di Android).
  - `docs/styles/notes.css`: bar bentuk (`.sk-bentuk`).
  - `tools/uji/sketsa-bentuk.mjs` (baru): 12 uji unit dan 17 uji integrasi (jsdom). Hasil: 29/29.
- **Cara uji yang dijalankan:**
  - `node tools/uji/sketsa-bentuk.mjs`: 29/29 lulus.
  - Uji ambang (skrip sementara di luar repo, `/tmp`): lingkaran dan elips dengan gangguan tangan 3, 6, dan 9 px (20 bentuk per kasus). Persegi, persegi panjang, dan segitiga dengan gangguan 1,5 dan 3 px: semua dikenali benar.
  - Uji mutasi 1: timer tahan dimatikan. 8 uji gagal, lalu dipulihkan.
  - Uji mutasi 2: gerak jauh tidak membatalkan pengenalan. 2 uji gagal, lalu dipulihkan.
  - Uji mutasi 3: tombol Coretan asli saat masih ditahan dikembalikan ke versi lama. 1 uji gagal, lalu dipulihkan. Mutasi ini menangkap bug yang ditemukan saat uji pertama: bentuk belum masuk jejak saat masih ditahan, sehingga pengembalian tidak berjalan.
  - `npm test` penuh saat itu: exit 0. **Koreksi (ditemukan saat A5):** angka itu keliru. Log A4 (`/tmp/npmtest-a4.log`) memuat 4 cek gagal di `tools/uji/paste.mjs` ("blok gambar tersisip", "punya data-blob", "type=image di model", "teks biasa tetap teks"), tetapi exit code tetap 0 karena `paste.mjs` dan 8 suite lain tidak memanggil `process.exit(1)`. Penyebabnya: tunggu waktu tetap (`sleep(120)`) terhadap pipeline gambar yang asinkron, dan 8 suite itu tidak menyampaikan kegagalan lewat exit code. Perbaikannya ada di Perubahan 6 (A5).
- **Keterbatasan yang diketahui:**
  - **Heksagon dikenali sebagai elips.** Pada ambang yang cukup longgar untuk lingkaran tangan, heksagon juga lolos sebagai elips. Mengetatkan ambang membuat lingkaran dengan gangguan 6 px gagal sekitar 40% dari percobaan, jadi ambang dibiarkan. Pengguna bisa memilih **Coretan asli**.
  - **Panah belum dikenali dari coretan.** Garis dan panah sulit dibedakan dari satu coretan. Panah tetap dibuat dengan alat Panah.
  - Lingkaran yang tidak tertutup (celah lebih dari 15% panjang coretan) tidak dikenali.
  - Pengenalan hanya untuk alat Pena, bukan Stabilo atau alat bentuk manual.
  - Belum diuji di HP: waktu tahan 650 ms terasa pas di perangkat sungguhan atau tidak.
  - Chromium tidak tersedia di sandbox, jadi tampilan `elips` dan `poligon` di canvas belum dilihat langsung. Renderer hanya diperiksa lewat kode dan jalur SVG.
- **Status:** A4 *Partially implemented* (di sketsa, untuk garis, elips, lingkaran, persegi, persegi panjang, segitiga, dan poligon).

## Perubahan 6 — A5 Layer system

- **ID:** A5.
- **Alasan urutan:** §6.1 menempatkan A5 setelah A4. §6.2 menyebut A3–A5 memakai model data yang sama dari A1, jadi lapisan ditambahkan sebagai field `lapisan` di goresan dan objek, bukan format baru.
- **Dependensi:** A1 (goresan sebagai data), A2 (objek visual dan urutan tumpukan), A3 dan A4 (alat dan gaya yang sudah ada, format v4).
- **Kondisi awal (audit):** tidak ada lapisan. Semua goresan dan objek satu tumpukan.
- **Keputusan desain (§1.2 dokumen koreksi, keputusan agen):**
  - Lapisan mengelompokkan goresan dan objek. Bukan satu lapisan per objek. Maksimal 8 lapisan.
  - Lapisan awal bernama **Dasar**. Lapisan baru otomatis bernama **Lapisan N** (N terkecil yang belum dipakai).
  - Urutan array lapisan = tumpukan. Akhir = paling atas. Di dalam satu lapisan, objek tetap di bawah goresan (konsisten dengan A2).
  - **Tersembunyi:** tidak tampil, tidak bisa dipilih atau diubah, dan tidak menerima coretan baru.
  - **Terkunci:** tetap tampil, tetapi tidak bisa diubah.
  - Coretan dan objek baru masuk ke lapisan aktif. Lapisan aktif dipilih dengan menekan namanya.
  - Lapisan yang masih berisi tidak bisa dihapus. Lapisan terakhir tidak bisa dihapus.
  - **Bersihkan** hanya menghapus item di lapisan yang bisa diedit. **Urungkan** dan **Ulangi** yang menyentuh lapisan terkunci atau tersembunyi ditolak dengan pesan.
  - Data v1–v4 dibaca sebagai satu lapisan Dasar. Sketsa tanpa isi dan hanya berisi Dasar tetap menghasilkan data kosong, seperti sebelumnya.
  - Sketsa berlatar foto atau sketsa lama tetap memakai jalur PNG. Lapisan tidak disimpan sebagai data di jalur itu (sama dengan A2).
- **Yang berubah:**
  - `docs/notes/editor/lapisan.js` (baru): logika murni. `tambahLapisan`, `hapusLapisan`, `pindahLapisan`, `bisaDiedit`, `urutanGambar`, `urutanRender`, `bersihkanLapisan`.
  - `docs/notes/editor/goresan.js`: format v5 (`VERSI_GORESAN = 5`, `VERSI_DIDUKUNG = [1..5]`). Field `lapisan` di setiap goresan dan objek, dan di level sketsa. Data v4 dibaca sebagai lapisan Dasar.
  - `docs/notes/editor/sketsa.js`: state lapisan, render per lapisan lewat `urutanRender`, baris lapisan (nama, Tampilkan/Sembunyikan, Kunci/Buka kunci, Lapisan baru, Naik, Turun, Hapus lapisan), aturan pilih, gambar, undo, redo, bersihkan, dan simpan.
  - `docs/styles/notes.css`: gaya `.sk-lap` untuk baris lapisan.
  - `tools/uji/sketsa-lapisan.mjs` (baru): 31 uji unit dan 29 uji integrasi (jsdom).
  - **Harapan yang diubah secara sadar** (bukan dilonggarkan):
    - `tools/uji/sketsa-goresan.mjs`: harapan round-trip menambah `lapisan: 'dasar'` pada setiap goresan.
    - `tools/uji/sketsa-pena.mjs`: versi penyimpanan 4 → 5 (dua harapan).
  - **Sinyal kegagalan uji** (diperbaiki di A5, karena `npm test` tidak bisa dipercaya sebelumnya):
    - `tools/uji/paste.mjs`: tunggu waktu tetap (`sleep(120)`) diganti tunggu kondisi (`tungguKondisi`, sampai 4 detik) untuk pipeline gambar yang asinkron. Dua titik (gambar dan teks biasa) juga diubah. Ditambah `process.exit(1)` bila ada cek gagal.
    - `tools/uji/tata-gambar.mjs`: cek B1 menunggu `src` gambar dengan tunggu kondisi. Sebelumnya gagal 1 cek di run paralel.
    - `caret-elemen`, `font-ganti`, `font-menyeluruh`, `kombinasi-dasar`, `kombinasi-lanjut`, `kondisi-tepi`, `spasi-dan-penanda`: ditambah `process.exit(1)` bila ada kegagalan. Isi uji tidak diubah. Delapan suite ini lulus saat dijalankan sendiri.
  - `tools/version.mjs`: stempel `?v=` menjadi `20261025020026`. 122 berkas hanya berubah stempel. 13 berkas berisi perubahan nyata (lihat daftar di atas dan di A1–A4).
- **Cara uji yang dijalankan:**
  - `node tools/uji/sketsa-lapisan.mjs`: **60/60 lulus** (31 unit, 29 integrasi). Integrasi menjalankan alur lewat tombol: tambah lapisan, coret di lapisan atas, sembunyikan, kunci, Bersihkan, Urungkan, hapus lapisan berisi (ditolak), hapus lapisan kosong, Turun, Naik, batas 8 lapisan, gambar sebagai objek di lapisan, objek di lapisan tersembunyi tidak bisa dipilih, dan data v4 lama dibuka lalu disimpan sebagai v5.
  - **Uji mutasi** (setiap mutasi dipulihkan lalu diverifikasi dengan `cmp`):
    - M1: `urutanRender` merender lapisan tersembunyi → 59/60, tertangkap.
    - M2: `bisaDiedit` mengabaikan kunci → 49/60, tertangkap.
    - M3: pilih objek tanpa filter lapisan → 59/60, tertangkap.
    - M4: Urungkan menyentuh lapisan terkunci → 49/60, tertangkap.
    - M5: Bersihkan menghapus lapisan terkunci → 49/60, tertangkap.
    - M6: hapus lapisan yang masih berisi diizinkan → 54/60, tertangkap.
  - Suite sketsa dan catatan lain, setelah stempel final: `sketsa-goresan` 21/21, `sketsa-pena` 41/41, `sketsa-objek` 21/21, `sketsa-kanvas` 22/22, `sketsa-bentuk` 29/29, `catatan-generasi-baru` 24/24.
  - Uji paralel: `paste.mjs` 8 run paralel (dua ronde masing-masing 4 run) semuanya 60/60. `tata-gambar.mjs` 4 run paralel semuanya lulus.
  - `npm test` penuh: exit 0. Semua 76 berkas `tools/uji/*.mjs` dijalankan paralel (`xargs -P 4`), dan exit 0 berarti tiap berkas keluar dengan 0. Tidak ada baris ✗ atau GAGAL di log (`/tmp/npmtest-a5d.log`). Dua run penuh sebelumnya di sesi ini gagal secara flaky: run pertama pada `paste` (3 cek, exit 123), run kedua pada `tata-gambar` (1 cek, exit 123). Keduanya sudah diperbaiki seperti dijelaskan di atas.
- **Keterbatasan yang diketahui:**
  - Tampilan lapisan di canvas dan baris lapisan di HP belum dilihat. Chromium tidak tersedia di sandbox, dan uji hanya memeriksa logika serta DOM. Ini sama dengan keterbatasan A1–A4.
  - Tidak ada cara memindahkan goresan atau objek dari satu lapisan ke lapisan lain. Yang tersedia: hapus item, Bersihkan, atau Urungkan. Lapisan berisi tidak bisa dihapus sampai kosong.
  - Lapisan hanya untuk sketsa. Blok catatan biasa belum mendapat lapisan. Itu membutuhkan keputusan tersendiri karena menyentuh model blok.
  - Di jsdom, `canvas.getContext` tidak tersedia. Karena itu render canvas sebenarnya tidak dijalankan. Yang diuji adalah urutan render (`urutanRender`), bukan piksel.
- **Status:** A5 *Partially implemented* (di sketsa; blok catatan biasa belum).

## Perubahan 7 — A8 Landscape workspace

- **ID:** A8.
- **Alasan urutan:** §6.1 menempatkan A8 setelah A5. Tata letak sketsa sekarang memuat banyak baris alat (preset A3, lapisan A5, zoom A6, ukuran kanvas A7), sehingga masalah landscape makin terasa.
- **Dependensi:** A6 (zoom dan `skalaPasLayar`), A3 dan A5 (baris preset dan lapisan di bar), A4 (bar bentuk).
- **Kondisi awal (audit) dan verifikasi ulang:** audit menulis *Missing* karena pencarian `orientation`/`landscape` tidak menemukan apa pun. Verifikasi ulang: memang tidak ada aturan orientasi di CSS atau JS. Tetapi kebutuhannya nyata. Diukur di browser headless (Chromium 153), pada landscape ponsel 844×390, bar alat setinggi 339 px diletakkan di y=306–645. Dari 49 tombol, hanya **8** yang terlihat penuh. Sisanya terpotong.
  - Penyebab: `.sk-stage` punya `min-height: 240px` dan `.sk-box` punya `max-height: 96dvh` dengan `overflow: hidden`. Bar tidak bisa digulir, jadi bagian bawahnya tidak terjangkau.
  - Rotasi sudah didukung: `AndroidManifest.xml` mencantumkan `orientation` di `configChanges`, dan tidak ada kunci orientasi. Yang kurang hanya tata letaknya.
- **Keputusan desain:**
  - Aturan hanya berlaku untuk `(orientation: landscape) and (max-height: 600px)`. Portrait dan tablet landscape tidak berubah.
  - Landscape pendek: kanvas di kiri, mengisi tinggi yang tersedia. Panel alat di kanan (lebar `min(340px, 42%)`) yang bisa digulir vertikal. Baris alat tetap bisa digeser horizontal. Bar bentuk A4 tampil di kolom kiri, di bawah kanvas.
  - Tidak ada kunci orientasi paksa. Hara tetap bisa diputar.
  - Zoom: di landscape pendek, `skalaPasLayar` memakai tinggi stage (bukan 54% tinggi layar), sehingga zoom 100% tidak melompat. `terapkanZoom` juga melepas `max-width` saat zoom aktif, agar kanvas yang di-zoom bisa lebih lebar dari stage dan digulir.
- **Yang berubah:**
  - `docs/styles/notes.css`: blok `@media (orientation: landscape) and (max-height: 600px)` setelah `.sk-bentuk-nama`.
  - `docs/notes/editor/sketsa.js`: `landscapePendek()`, penyesuaian `skalaPasLayar`, dan `cv.style.maxWidth` di `terapkanZoom`.
  - `tools/uji/sketsa-landscape.mjs` (baru): 17 uji (CSS dan integrasi jsdom).
  - Stempel `?v=` menjadi `20261025024750` (124 berkas).
- **Cara uji yang dijalankan:**
  - `node tools/uji/sketsa-landscape.mjs`: **17/17 lulus**.
  - Uji mutasi (dipulihkan dan diverifikasi `cmp`): M1 panel alat dipindah ke kolom kiri → 16/17, tertangkap. M2 zoom tidak melepas `max-width` → 16/17, tertangkap.
  - **Pengukuran browser** (Chromium headless dari paket npm `@sparticuz/chromium`, dijalankan di luar repo di `/home/user/unduh/a8-browser/ukur.mjs`). Sebelum dan sesudah:

    | Viewport | Tombol terlihat penuh | Ukuran kanvas |
    |---|---|---|
    | Landscape ponsel 844×390 | 8/49 → **49/49** | 742×211 → 488×312 |
    | Landscape kecil 740×360 | 8/49 → **49/49** | 706×194 → 413×264 |
    | Portrait ponsel 390×844 | 49/49 → 49/49 (identik) | 356×227 (sama) |
    | Tablet landscape 1180×820 | 49/49 → 49/49 (identik) | 742×443 (sama) |

  - **Interaksi browser** (`interaksi.mjs`): 12/12 lulus di landscape dan portrait. Mencakup goresan pena yang tampak di kanvas (piksel berwarna terdeteksi), zoom + yang memperbesar kanvas dengan rasio 1.25 (landscape 488→610, portrait 356→445), zoom 100% yang kembali ke ukuran awal, dan pemilihan alat Kotak. Sebelum perbaikan `max-width`, zoom di landscape gagal (488→488). Itu ditemukan oleh uji ini dan sudah diperbaiki.
  - **Bar bentuk** (`bentuk.mjs`, bar ditampilkan paksa hanya untuk pengukuran tata letak): di landscape 844×390, bar bentuk ada di bawah kanvas dan di kolom kiri, dan tombol-tombolnya terlihat penuh.
  - Screenshot yang diperiksa: `/home/user/unduh/a8-sesudah-landscape-phone.png` dan `/home/user/unduh/a8-bentuk-landscape.png`.
  - `npm test` penuh: exit 0 (`/tmp/npmtest-a8.log`), 77 berkas uji (76 sebelumnya + `sketsa-landscape.mjs`), 0 baris ✗ atau GAGAL.
- **Keterbatasan yang diketahui:**
  - Pengujian dilakukan di Chromium desktop headless dengan viewport ponsel, **bukan di HP sungguhan**. Sentuhan, notch, dan address bar Android belum diuji di perangkat.
  - Baris alat horizontal menyembunyikan scrollbar (sudah begitu sejak A3). Pengguna perlu tahu bahwa baris bisa digeser. Itu belum diuji dengan pengguna.
  - Hanya sketsa yang disesuaikan. Editor catatan biasa, Graf, musik, dan renamer belum diperiksa di landscape.
  - Uji otomatis di repo bersifat struktural dan logika. Tata letak piksel tidak dijalankan di `npm test`, karena browser tidak dipasang sebagai dependensi repo.
- **Status:** A8 *Partially implemented* (sketsa). Editor catatan biasa belum.

## Perubahan 8 — A9 Pinned toolbar tools

- **ID:** A9.
- **Alasan urutan:** §6.1 menempatkan A9 setelah A8. Verifikasi ulang kode: audit menulis *Missing*, dan itu benar untuk alat editor. Pencarian `sematkan`/`pin`/`favorit` hanya menemukan sematan **catatan** (daftar catatan dan menu "···"), bukan sematan **alat** di bar. Jadi A9 tidak sama dengan fitur yang sudah ada, dan tidak ada yang digandakan.
- **Dependensi:** preferensi bar (`docs/notes/bar/prefs.js`, `hara.bar.v1`) yang sudah ada untuk "sembunyikan kontrol". Sematan memakai daftar kontrol yang sama (`BISA_SEMBUNYI`). Tidak ada dependensi ke A1–A8 atau ke data catatan.
- **Keputusan desain:**
  - Alat yang disematkan **dipindah** ke awal bar, sesudah Batalkan/Ulangi, bukan disalin. Alasannya: `cleanup.js` mencari tombol datar dengan `querySelector`, sehingga salinan kedua tidak akan ikut menyala.
  - Urutan sematan = urutan pin. Alat lain tetap dalam urutan asli.
  - Batas **6** sematan (`MAKS_SEMATAN`). Pelanggaran memunculkan toast.
  - Alat yang disembunyikan tidak tampil meski disematkan, dan sematannya tetap tersimpan. Tombol pin-nya nonaktif saat disembunyikan, tetapi sematan yang sudah ada tetap bisa dilepas.
  - Sematan diatur di **Pengaturan → Bar** (tombol pin di setiap baris). Tidak ada tombol sematan langsung di bar, karena tekan lama tombol datar sudah dipakai untuk penjelasan.
  - Hanya bar editor catatan. Bar sketsa (`#sk-*`) tidak diubah.
- **Yang berubah:**
  - `docs/notes/bar/prefs.js`: `sematan`, `MAKS_SEMATAN`, `bersihSematan`, `tersemat`, `toggleSematan`.
  - `docs/notes/bar/render.js`: `renderBar` memindahkan alat yang disematkan; `tombolBar` dipisah sebagai fungsi.
  - `docs/notes/index.js`: tombol pin di baris Pengaturan, handler klik, dan impor.
  - `docs/styles/notes.css`: reset gaya tombol untuk `.row button.pinx` (memakai `.pinx` yang sudah ada).
  - `docs/core/bahasa-en.js`, `docs/core/bahasa-ja.js`: dua kunci baru (`Sematkan di bar`, teks batas).
  - `tools/uji/bar-sematan.mjs` (baru): 35 uji jsdom.
  - Stempel `?v=` menjadi `20261025030052` (124 berkas).
- **Cara uji yang dijalankan:**
  - `node tools/uji/bar-sematan.mjs`: **35/35 lulus**. Mencakup pindah ke awal tanpa duplikat, urutan, batas 6 dan penolakan ke-7, alat tersembunyi, penyimpanan dan pembersihan data rusak, serta tombol pin di Pengaturan.
  - Uji mutasi (dipulihkan dan diverifikasi `cmp`): M1 sematan digandakan → 32/35 (3 gagal). M2 batas 6 dihapus → 27/35 (8 gagal). M3 batas saat muat dihapus → 34/35 (1 gagal).
  - **Browser** (Chromium headless, di luar repo, `a9.mjs`): urutan bar nyata sebelum dan sesudah menyematkan `Tebal`, `Gaya paragraf`, dan `Miring` menjadi `undo redo | b gaya i | slash | link | …`. Tidak ada galat JS. Screenshot diperiksa: bar dan baris Pengaturan (ikon pin; yang aktif berwarna aksen).
  - Pemisah di kedua sisi zona sematan ditambahkan setelah screenshot pertama menunjukkan `i /` menempel. Uji ulang 35/35.
  - `npm test` penuh: exit 0 (`/tmp/npmtest-a9.log`), 78 berkas uji, 0 baris ✗, GAGAL, atau FAIL.
- **Keterbatasan yang diketahui:**
  - Pengujian dilakukan di Chromium desktop dengan viewport ponsel, **bukan di HP sungguhan**. Sentuhan dan keyboard Android belum diuji di perangkat.
  - Sematan hanya bisa diatur lewat Pengaturan, bukan langsung dari bar.
  - Tombol sematan di bar tidak diberi uji klik (hanya pengujian DOM dan `renderBar`). Tombol yang dipindah memakai handler `bindBar` yang sama dengan tombol biasa.
  - Batas 6 adalah keputusan awal. Bisa diubah jika terlalu sempit atau terlalu longgar.
- **Status:** A9 *Implemented* untuk bar editor catatan. Sematan di bar sketsa belum ada.

## Perubahan 9 — B7a Latar kertas catatan (langkah 1 dari 3)

- **ID:** B7 (dikerjakan bertahap sesuai keputusan pengguna: cakupan (c)). Langkah ini: **B7a**, latar kertas per catatan.
- **Alasan urutan:** §6.1 menempatkan B7 setelah A9. Verifikasi ulang kode: templat isi (Jurnal, Rapat, Belajar, dan templat tersimpan) sudah ada di `templat.js`, tetapi itu templat *isi*, bukan *kertas*. Latar titik, garis, dan polos hanya ada di sketsa. Halaman catatan biasa belum punya latar, dan grid serta Cornell belum ada.
- **Dependensi:** model catatan (`note-model.js`, `makeNote`/`normalizeNote`) dan pola `cover` (sampul) yang sudah ada. Setter memakai `touch` dan `save` yang sama. Tidak ada dependensi ke A1–A9.
- **Keputusan desain:**
  - Latar disimpan per catatan sebagai `kertas` (`titik`, `garis`, `grid`). Polos adalah bawaan dan **tidak disimpan**, sehingga catatan lama tidak berubah.
  - Latar hanya gambar CSS di `.ed-doc`. Isi blok tidak disentuh, dan pengubahan latar tidak menulis ulang blok.
  - Aksi "Latar kertas…" ada di menu "···", dekat "Sampul catatan…". Pilihan aktif ditandai.
  - Duplikasi catatan ikut menyalin latar. Templat isi tidak menyimpan latar (perilaku lama dipertahankan).
- **Yang berubah:**
  - `docs/notes/kertas.js` (baru): `setKertasCatatan`, `sinkronKertasDOM`, `bukaDialogKertasCatatan`.
  - `docs/notes/note-model.js`: `KERTAS_JENIS`, `kelasKertas`, dan field `kertas` di `makeNote`.
  - `docs/notes/views/editor.js`: class latar pada `.ed-doc` saat render.
  - `docs/notes/menus/note-menu.js`: item "Latar kertas…".
  - `docs/app.js`: aksi `kertas`.
  - `docs/notes/model.js`: duplikasi menyalin `kertas`.
  - `docs/styles/notes.css`: tiga aturan latar (`.ed-doc.kertas-titik`, `-garis`, `-grid`).
  - `docs/core/bahasa-en.js`, `docs/core/bahasa-ja.js`: teks baru (4 kunci per bahasa).
  - `tools/uji/catatan-kertas.mjs` (baru): 30 uji jsdom.
  - Stempel `?v=` menjadi `20261025043111` (125 berkas).
- **Cara uji yang dijalankan:**
  - `node tools/uji/catatan-kertas.mjs`: **30/30 lulus**. Mencakup model (polos tidak disimpan, jenis tak dikenal ditolak), setter (ubah, hapus, tolak, catatan tak ada, `updatedAt` berubah, isi blok tetap), editor (class ikut berubah tanpa muat ulang), normalisasi muat ulang, duplikasi, menu, dialog (4 pilihan, pilihan aktif, klik mengubah catatan), dan CSS.
  - Uji mutasi (dipulihkan dan diverifikasi `cmp`): M1 `makeNote` membuang `kertas` → 25/30. M2 validasi jenis dihapus → 29/30. M3 class lama tidak dibersihkan → 28/30. M4 duplikasi tidak menyalin → 29/30. Semua tertangkap.
  - **Browser** (Chromium headless, `b7a.mjs`, di luar repo): ketiga latar diterapkan (`kertas-titik`, `kertas-garis`, `kertas-grid`), `background-image` terhitung, tidak ada galat JS. Screenshot Grid dan Garis buku diperiksa: teks tetap terbaca di atas latar.
  - `npm test` penuh: exit 0 (`/tmp/npmtest-b7a.log`), 79 berkas uji, 0 baris ✗, GAGAL, atau FAIL.
- **Keterbatasan yang diketahui:**
  - Pengujian di Chromium desktop dengan viewport ponsel, **bukan di HP sungguhan**.
  - Jarak latar Garis buku (28 px) tidak selalu sejajar tepat dengan baris teks, karena tinggi baris bergantung pada ukuran huruf (`--tsx`). Penyelarasan penuh belum dikerjakan.
  - Latar tidak ikut dicetak atau diekspor ke PDF (belum ditangani).
  - Pilihan latar hanya dari menu "···". Belum ada tombol cepat di bar.
  - Templat kertas buatan pengguna (spasi, warna, margin) belum ada. Itu B7c.
  - Cornell belum ada. Itu B7b.
- **Status:** B7 *Partially implemented*. B7a selesai. B7b (Cornell) dan B7c (templat kertas buatan pengguna) belum dikerjakan.

## Perubahan 10 — B7b Templat Cornell (langkah 2 dari 3)

- **ID:** B7 (cakupan (c), dikerjakan bertahap). Langkah ini: **B7b**, Cornell sebagai templat bawaan. Disetujui pengguna: "Untuk B7b dan B7c ya setuju".
- **Alasan urutan:** B7a (latar kertas) sudah selesai, dan Cornell butuh latar yang sama. Cornell dikerjakan sebelum B7c karena memakai pola templat bawaan yang sudah ada, sehingga risikonya paling kecil.
- **Dependensi:** registri templat bawaan di `templat.js` dan tipe blok tabel (`elToBlock` / `blocksToDom` di `note-model.js`). Tidak ada dependensi ke B7a. Templat tidak mengatur latar kertas (perilaku sama dengan templat lain).
- **Keputusan desain:**
  - Cornell dibuat dari blok tabel yang sudah ada: header Petunjuk | Catatan, lalu 6 baris kosong, lalu heading Ringkasan dan satu paragraf. Tidak ada tipe blok baru.
  - Judul catatan memakai awalan Cornell (id "Cornell", en "Cornell", ja "コーネル"). Judul kolom dan Ringkasan ada dalam tiga bahasa.
  - Lebar kedua kolom sama dan tidak bisa diatur. Baris bisa ditambah dari tabel seperti tabel biasa.
- **Yang berubah:**
  - `docs/notes/templat.js`: entri bawaan `cornell`, `PREFIX_CORNELL`, `tabelCornell`, `HTML_CORNELL`.
  - `docs/core/bahasa-en.js`, `docs/core/bahasa-ja.js`: 2 kunci per bahasa (`Catatan Cornell`, dan kalimat keterangan).
  - `tools/uji/templat-cornell.mjs` (baru): 19 uji jsdom.
  - Stempel `?v=` menjadi `20261025050736` (125 berkas). Perubahan non-stempel hanya di tiga berkas di atas (diperiksa dengan membandingkan HEAD setelah `?v=` dinormalisasi).
- **Cara uji yang dijalankan:**
  - `node tools/uji/templat-cornell.mjs`: **19/19 lulus**. Mencakup terdaftar sebagai bawaan, templat lain tetap ada, menu memuat `b:cornell`, menerapkan membuat satu catatan yang dibuka, tabel Petunjuk | Catatan dengan 6 baris kosong, Ringkasan di bawah tabel, id blok unik, sel tabel bisa diedit (6 × 2 = 12), muat ulang tidak mengubah struktur, dua penerapan menghasilkan id tidak kembar, dan bahasa Inggris (Cue | Notes, Summary, judul Cornell, nama menu diterjemahkan).
  - Uji mutasi (dipulihkan, diverifikasi `cmp`): M1 tanpa baris isi → 17/19. M2 header kanan salah → 18/19. M3 id templat salah → 4/19 (gagal berantai). M4 header Inggris salah → 18/19. Semua tertangkap.
  - Uji bahasa terkait: `bahasa.mjs` 41/41 (kunci EN dan JA sama), `welcome-bahasa.mjs` 23/23, `baca-todo-tpl.mjs` 25/25, `templat-variabel.mjs` lulus (exit 0).
  - `node tools/version.mjs`: stempel `20261025050736`.
  - `npm test` penuh: **exit 0** (`/tmp/npmtest-b7b.log`), 80 berkas uji (termasuk `templat-cornell`), 0 baris GAGAL, ✗, atau FAIL.
- **Keterbatasan yang diketahui:**
  - Kolom Petunjuk dan Catatan sama lebar. Tata letak Cornell asli biasanya memakai kolom kiri yang lebih sempit. Ini belum bisa diatur.
  - Cornell tidak otomatis memakai latar garis. Pengguna memilih latar lewat menu "···" (fitur B7a).
  - Belum diuji di browser (`b7a.mjs` tidak dijalankan untuk B7b). Pengujian hanya lewat jsdom, struktur DOM, dan model data.
  - Cetak atau ekspor PDF belum diuji.
- **Status:** B7 *Partially implemented*. B7a dan B7b selesai. B7c (templat kertas buatan pengguna) belum dikerjakan.

## Perubahan 11 — B7c Templat kertas kustom (langkah 3 dari 3)

- **ID:** B7 (cakupan (c), dikerjakan bertahap). Langkah ini: **B7c**, templat kertas buatan sendiri dengan pengaturan spasi, warna, dan margin. Disetujui pengguna: "Untuk B7b dan B7c ya setuju".
- **Alasan urutan:** dikerjakan setelah B7a (model `kertas` dan dialog) dan B7b (Cornell), karena B7c memperluas model dan dialog B7a.
- **Dependensi:** B7a (`kertas.js`, `KERTAS_JENIS`, class `.ed-doc`). Tidak ada dependensi ke A1–A9 atau B7b.
- **Keputusan desain (diputuskan agen, perlu dicek pengguna):**
  - Pola tetap titik, garis buku, atau grid. Templat kustom adalah pola + pengaturan, bukan jenis latar baru yang terpisah.
  - Spasi 16–48 px (langkah 2 px, bawaan 28 px sama dengan Garis buku).
  - Warna dari lima pilihan tetap (abu-abu, biru, hijau, merah, cokelat). Nilai hex hanya dari daftar tetap, jadi aman masuk ke CSS.
  - Margin: Tanpa, Sempit (48 px), Sedang (72 px), Lebar (96 px). Margin menggeser teks ke kanan lewat padding kiri, lalu menggambar garis tipis. Teks tidak tertimpa garis.
  - Data per catatan: `kertas: 'kustom'` dan `kertasAtur: {pola, spasi, warna, margin}`. Pengaturan hanya disimpan bila valid. Pengaturan dibersihkan saat catatan diganti ke jenis lain.
  - Templat yang dipakai ulang disimpan di localStorage `hara.kertas.v1`, maksimal 8, tanpa duplikat. Pola ini sama dengan preset kustom pena (A3).
- **Yang berubah:**
  - `docs/notes/note-model.js`: `KERTAS_POLA`, `KERTAS_JENIS` (+ `kustom`), `KERTAS_SPASI`, `KERTAS_WARNA`, `KERTAS_MARGIN`, `sanitasiAturKertas`, `kelasKertasNote`, `variabelKertasNote`, `gayaKertasNote`, dan field `kertasAtur` di `makeNote`.
  - `docs/notes/kertas.js`: `setKertasCatatan(id, jenis, atur)`, `sinkronKertasDOM` (kelas dan variabel `--kt-*`), `muatTemplatKertas`, `simpanTemplatKertas`, dialog dengan mode daftar dan form, penangkap klik dan isian yang dipasang ulang setiap dialog dibuka.
  - `docs/notes/views/editor.js`: kelas dan `style` inline dari model.
  - `docs/notes/model.js`: duplikasi ikut menyalin `kertasAtur`.
  - `docs/styles/notes.css`: aturan `.ed-doc.kertas-kustom-{titik,garis,grid}`, `.kertas-kustom-margin`, dan gaya dialog `.kt-*`.
  - `docs/core/bahasa-en.js`, `bahasa-ja.js`: 18 kunci baru per bahasa (kunci yang sudah ada dipakai ulang).
  - `tools/uji/kertas-kustom.mjs` (baru): 69 uji jsdom.
  - Stempel `?v=` menjadi `20261025051852` (125 berkas). Perubahan non-stempel hanya di tujuh berkas di atas dan berkas uji baru.
- **Cara uji yang dijalankan:**
  - `node tools/uji/kertas-kustom.mjs`: **69/69 lulus**. Mencakup sanitasi (pola, spasi dijepit 16–48, warna dan margin dari daftar), makeNote, kelas dan variabel CSS, setter, editor (tanpa muat ulang), templat tersimpan (duplikat, maks 8, entri rusak, data tidak terbaca), dialog (4 preset tetap, tombol Templat kustom, form, Pakai, Simpan, Kembali, templat tersimpan bisa dipakai), muat ulang, duplikasi, dan CSS.
  - Uji mutasi (tiap berkas dipulihkan dan diverifikasi dengan `cmp` atau perbandingan isi): M1 spasi tidak dijepit → 67/69. M2 makeNote membuang pengaturan → 63/69. M3 kelas margin hilang → 66/69. M4 duplikasi tidak menyalin pengaturan → 68/69. M5 isian spasi tidak masuk draft → 62/69. M6 sinkron tidak memasang variabel → 68/69. M7 duplikat templat diterima → 67/69. M8 batas templat tidak berlaku → 68/69. M9 garis margin tanpa posisi → 68/69. M10 ganti pola tidak membersihkan pengaturan → 68/69. **Semua 10 tertangkap.** Setelah pemulihan: 69/69.
  - Regresi B7a: `catatan-kertas.mjs` **30/30**. B7b: `templat-cornell.mjs` **19/19**. Bahasa: `bahasa.mjs` **41/41** (paritas EN dan JA).
  - **Browser** (Chromium headless, `b7c.mjs` di luar repo, viewport 390×700): tiga contoh kustom diterapkan tanpa galat JS. Variabel `--kt-*` terpasang inline. Gradasi terhitung (`background-size` 28px, 20px, 40px). Garis margin di 72 px dan padding kiri 84 px (`72 + 12`). Screenshot `b7c-garis-margin.png`, `b7c-grid.png`, `b7c-titik-lebar.png`, dan `b7c-dialog.png` diperiksa: garis margin tampil dan teks mulai di kanannya. Form dialog menampilkan pola, spasi, lima warna, margin, dan tiga tombol.
  - `node tools/version.mjs`: stempel `20261025051852`.
  - `npm test` penuh: **exit 0** (`/tmp/npmtest-b7c.log`), 81 berkas uji (termasuk `kertas-kustom`), 0 baris GAGAL, ✗, atau FAIL.
- **Keterbatasan yang diketahui:**
  - Templat tersimpan belum bisa dihapus. Batas 8 sudah berlaku. Menghapus atau mengganti nama templat belum tersedia.
  - Garis Garis buku dan Kustom garis memakai spasi yang sama dengan latar. Tinggi baris teks tidak selalu sejajar dengan garis (sama seperti B7a).
  - Margin hanya mengubah ruang kiri catatan. Belum ada margin atas atau bawah.
  - Latar kustom belum dicetak atau diekspor ke PDF (belum diuji).
  - Pengujian browser di Chromium desktop dengan viewport ponsel, **bukan di HP sungguhan**.
- **Status:** B7 *Implemented (dengan keterbatasan di atas)*. B7a, B7b, dan B7c selesai.

## Status Tahap 1

Semua ID Tahap 1 sudah dikerjakan dan dipush: A1, A2, A6, A7, A3, A4, A5, A8, A9, dan B7 (B7a, B7b, B7c). Setiap bagian di atas mencantumkan ID, alasan urutan, dependensi, file, dan hasil uji.

## Berikutnya

- Tahap 2 menurut urutan §6.1: B1, B5, B3, B4, B2, B6, B8. Belum dimulai. Tunggu persetujuan pengguna per ID, seperti tahap sebelumnya.
- Hal terbuka dari Tahap 1: URL Worker di `docs/musik/ekspor.js` dan `docs/renamer/pekerja.js` belum diperbarui `version.mjs`. Status B8 belum konsisten. Status "Partially implemented" A6 dan A7 belum diverifikasi. Uji heksagon A4 belum di-assert. Uji visual kuas, pensil, bentuk, dan layer belum ada. Belum ada uji di perangkat Android.
- Keputusan yang perlu Anda cek: objek bebas di halaman catatan biasa (bukan hanya sketsa) akan dibahas sebelum dikerjakan, karena menyentuh model blok catatan.
