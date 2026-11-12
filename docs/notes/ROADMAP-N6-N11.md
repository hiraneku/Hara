# Peta fitur N6–N11

Catatan persisten agar cakupan dan status persetujuan tidak hilang saat sesi berganti.

**Status persetujuan (2026-10-24):** pengguna meminta melanjutkan N6 sampai N10; N6–N10 masuk cakupan pengerjaan. N11 tetap ide untuk dibahas, belum disetujui. Jangan memulai N11 tanpa persetujuan terpisah. Fitur yang dibahas di sini tidak memerlukan AI.

## N6 — Sinkronisasi lintas perangkat terenkripsi

Sinkronkan note antarperangkat dengan enkripsi ujung-ke-ujung sehingga hanya perangkat/pengguna pemilik kunci yang dapat membaca isi. Saat editan bertabrakan, tampilkan perbedaan dan berikan pilihan untuk menggabungkan atau memilih versi; jangan menimpa diam-diam.

**Kriteria penerimaan:** payload yang tersimpan di transport tidak mengungkap isi note; sinkronisasi dua arah mempertahankan perubahan; konflik selalu terlihat, dapat dibandingkan, dan diselesaikan secara eksplisit; uji putus koneksi, pengulangan sinkronisasi, dan data rusak.

**Keputusan awal untuk menjaga local-first:** N6 memakai endpoint WebDAV HTTPS pilihan pengguna (tidak ada server Hara yang menerima plaintext); kredensial transport hanya hidup selama sesi/permintaan. Frasa sinkronisasi menjadi kunci E2E dan tidak disimpan otomatis. HTTP hanya boleh untuk localhost saat pengembangan. Pemulihan kunci tetap harus berupa frasa yang dapat dibawa pengguna ke perangkat lain.

## N7 — Otomasi berbasis aturan

Aturan eksplisit *jika–maka*, misalnya memasukkan note bertag `Kuliah` ke koleksi Kuliah atau menandai note selesai saat semua tugasnya selesai.

**Kriteria penerimaan:** pratinjau sebelum aturan berjalan; cakupan pemicu dan aksi jelas; log perubahan; urungkan dapat memulihkan keadaan sebelumnya; eksekusi idempoten dan tidak berulang tanpa henti.

## N8 — Dashboard note yang bisa dirakit sendiri

Halaman dashboard dari komponen bawaan: tugas mendatang, koleksi note, kalender, note terbaru, tabel properti, dan ringkasan angka. Pengguna mengatur susunan serta filter tiap komponen. Versi awal tidak menyediakan widget yang bisa diprogram.

**Kriteria penerimaan:** tata letak dan pengaturan tiap komponen tersimpan lokal; data komponen mengikuti filter; komponen kosong/rusak ditangani tanpa merusak dashboard; tampilan responsif.

## N9 — Markdown Vault

Ekspor/impor sebagai folder portabel: satu note per berkas Markdown beserta folder lampiran. Impor berulang tidak membuat duplikat. Pertahankan wikilink, ID blok, gambar/lampiran, dan perubahan dari dua arah sejauh format memungkinkan. Sinkronisasi langsung terhadap folder ditunda ke tahap terpisah.

**Kriteria penerimaan:** ekspor dapat dibuka sebagai Markdown biasa; impor ekspor yang sama berulang kali idempoten; konflik/berkas yang berubah tidak menimpa diam-diam; lampiran dan tautan tetap dapat ditemukan.

## N10 — Kolaborasi bersama dengan perubahan langsung

Beberapa pengguna mengedit note yang sama, melihat posisi kursor, memberi komentar, dan mengetahui siapa yang mengubah bagian. Penggabungan perubahan harus mencegah editan bersamaan saling menghapus.

**Kriteria penerimaan:** identitas dan izin eksplisit; perubahan bersama dan komentar memiliki atribusi; edit offline/bersamaan tidak hilang; konflik/kehilangan koneksi terlihat; pengujian multi-klien. Infrastruktur server dan model identitas merupakan prasyarat implementasi produksi.

## N11 — API aksi dan ekstensi terkontrol — BELUM DISETUJUI

API aman bagi ekstensi untuk menambah aksi, format ekspor, atau tampilan khusus. Memerlukan batas izin, versi API, dan persetujuan akses data. Tidak termasuk paket N6–N10 tanpa persetujuan baru.

## Status implementasi

- N6 implementasi awal tersedia: envelope PBKDF2-SHA-256/AES-GCM; baseline disegel lokal; merge note/ruang/kartu/ujian/lampiran tiga-arah; WebDAV memakai If-Match/If-None-Match; konflik ditampilkan dengan pilihan versi atau gabung note; kredensial tidak dipersistenkan. UI pengaturan tersedia.
- N6 masih perlu uji terhadap server WebDAV sungguhan, CORS/ETag tiap penyedia, perangkat Android nyata, serta penanganan vault/attachment besar.
- N7–N10 belum mulai. N11 belum disetujui.
- Tes N6: `sinkronisasi-murni.mjs`, `sinkronisasi-rencana.mjs`, `sinkronisasi-webdav.mjs`, `sinkronisasi-klien.mjs`.
