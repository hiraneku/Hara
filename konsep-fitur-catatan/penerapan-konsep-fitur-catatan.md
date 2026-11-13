# Penerapan Konsep Fitur Catatan

> Catatan sementara. Isinya hanya pemahaman dan pemetaan. **Belum ada kode yang diubah.**
> File ini ada di luar repo (`/home/user/`), jadi tidak ikut di-commit.

---

## 1. Ringkasan permintaan

Pengguna memberi 32 ide fitur yang terinspirasi dari FreeNotes, dalam 4 kelompok:

| Kelompok | Jumlah | Tema |
|---|---|---|
| A. Handwriting, drawing, kertas, dan kanvas | 9 | Menulis dan menggambar dengan tangan, kertas digital, pena, bentuk, lapisan, zoom |
| B. Dokumen dan navigasi | 8 | PDF, halaman, tautan, pencarian, OCR, template kertas, planner |
| C. Audio dan pembelajaran | 10 | Rekaman, transkrip terhubung waktu, video, mode belajar, flashcard, timer |
| D. Organisasi dan penyimpanan | 5 | Pengelompokan proyek, sinkronisasi cloud, akses cepat, web clip, shortcut |

Permintaan saat ini: **pahami dulu, jangan kerjakan apa pun.**

---

## 2. Konteks Hara saat ini (dari membaca repo, belum diuji di perangkat)

Hara adalah aplikasi catatan local-first berbasis **blok** (bukan file `.md`). Dari kode yang sudah saya baca:

- **Blok yang sudah ada** antara lain: paragraf, heading, daftar, to-do, kutipan, kode, rumus matematika (`/math`), kartu tautan (`/bookmark`), lampiran berkas (`/file`, menyimpan PDF sebagai blob di IndexedDB), gambar, **memo suara** (`b-audio`, memakai `MediaRecorder`), dan **sketsa** (`/sketch`).
- **Sketsa** (`docs/notes/editor/sketsa.js`) berisi kanvas coretan dengan alat pena, garis, panah, dan undo, serta pola latar titik atau garis. Hasilnya disisipkan sebagai blob gambar. Ada juga filter pindai dokumen.
- **Tautan**: `[[wikilink]]` ke catatan, ke blok (`[[Catatan#^id]]`), dan ke heading. Ada juga tautan web.
- **Pencarian**: pencarian global dengan operator (`tag:`, `folder:`, `properti:`, `sebelum:`, `sesudah:`, `-kecuali`), dan pencarian di dalam catatan.
- **Ruang (folder)**, tag, properti, Smart Folder, jurnal harian, kalender, papan Kanban.
- **Suara**: baca keras (TTS) dan dikte (STT) lewat `core/suara.js`.
- **Templat**: templat bawaan (jurnal harian, catatan rapat, daftar belajar) dan templat yang disimpan pengguna.
- **Lainnya**: riwayat versi, kilas balik, statistik, mode baca, mode fokus menulis, kunci catatan, ekspor/impor (JSON, Markdown, ZIP, ICS).

Keputusan produk yang relevan (dari `docs/NOTES.md` dan `docs/PLAN.md`):

1. **Canvas / whiteboard tak terbatas sengaja TIDAK dibuat** (mahal, jarang dipakai di HP).
2. **Tidak ada sistem plugin.**
3. **Local-first**: data ada di perangkat dan jalan tanpa internet.
4. **Sinkronisasi cloud** direncanakan untuk fase 8 (Supabase, lewat outbox). Sinkronisasi berbasis berkas `.md` sengaja ditolak.
5. **Ukuran bundel awal** dibatasi di bawah 200 KB gzip. Pustaka berat (misalnya OCR, PDF, atau tipe rumus) harus dimuat secara malas.
6. Target utama adalah **Android** lewat **Capacitor** (APK), dengan tampilan mobile-first.

---

## 3. Pemetaan per item

Legenda status:
- **Ada** = ditemukan di kode.
- **Sebagian** = ada bagian dasarnya, tetapi belum sesuai konsep.
- **Belum** = tidak ditemukan.
- **Belum dicek** = perlu pemeriksaan lebih lanjut sebelum diputuskan.

### Kelompok A: Handwriting, drawing, kertas, dan kanvas

| # | Konsep | Arti sederhana | Status di Hara | Catatan |
|---|---|---|---|---|
| A1 | Handwriting dan drawing | Menulis dan menggambar dengan jari atau stylus | **Sebagian** | Ada sketsa (pena, garis, panah). Belum ada mode tulisan tangan yang mengalir di dalam teks. |
| A2 | Kertas digital, anotasi, elemen visual | Halaman seperti kertas dengan coretan dan elemen di atasnya | **Sebagian** | Ada latar titik dan garis, serta latar putih atau gelap. Belum ada anotasi di atas dokumen dan belum ada elemen visual bebas. |
| A3 | Custom pen dan brush (buat, atur, simpan preset) | Pengguna membuat dan menyimpan gaya pena sendiri | **Belum** | Alat pena hanya satu jenis. Belum ada sistem preset. |
| A4 | Shape recognition | Coretan kasar lingkaran, garis, atau persegi dirapikan jadi bentuk geometris | **Belum** | Perlu algoritma pengenalan bentuk. Pengenalan lokal bisa dibuat tanpa pustaka berat. |
| A5 | Layer system | Elemen dikelola dalam lapisan terpisah | **Belum** | Sketsa saat ini menghasilkan satu gambar. Perlu model data jejak per lapisan. |
| A6 | Zoomable canvas | Zoom untuk detail atau gambaran keseluruhan | **Belum** | Perlu pengecekan lebih lanjut di modul sketsa. |
| A7 | Resizable canvas | Ukuran kanvas bisa diubah dengan menyeret batas | **Belum** | Terkait dengan A6 dan A5. |
| A8 | Landscape workspace | Tata letak menyesuaikan orientasi horizontal | **Belum dicek** | Perlu dicek di CSS dan tata letak editor. |
| A9 | Pinned toolbar tools | Alat favorit tetap di toolbar | **Belum dicek** | Ada `bar/config.js` dan pintas keyboard. Perlu dicek apakah sudah bisa disematkan. |

### Kelompok B: Dokumen dan navigasi

| # | Konsep | Arti sederhana | Status di Hara | Catatan |
|---|---|---|---|---|
| B1 | PDF import dan anotasi | Buka PDF lalu beri tulisan, highlight, underline, komentar | **Belum** | Yang ada: blok `/file` untuk menyimpan dan membuka PDF sebagai lampiran, tanpa penampil dan tanpa anotasi. Anotasi PDF perlu penampil PDF (pustaka besar, perlu dimuat malas). |
| B2 | Manajemen halaman PDF | Atur, pindah, dan kelola halaman dokumen | **Belum** | Bergantung pada B1. |
| B3 | Tautan internal | Tautan ke halaman atau bagian dokumen | **Sebagian** | Tautan ke catatan, blok, dan heading sudah ada. Tautan ke halaman PDF belum. |
| B4 | Tautan eksternal | Tautan ke website atau sumber luar | **Ada** | Ada menu tautan (`menus/link.js`) dan kartu tautan (`/bookmark`). |
| B5 | Pencarian dokumen | Cari kata di dokumen dan anotasi | **Sebagian** | Pencarian teks sudah ada. Pencarian di dalam anotasi belum karena anotasi belum ada. |
| B6 | OCR | Mengenali teks dari tulisan tangan atau gambar agar bisa dicari | **Belum** | Tidak ditemukan di kode. OCR di browser memerlukan pustaka dan model besar, sehingga bertentangan dengan batas bundel awal. Perlu dimuat malas dan diuji performanya. |
| B7 | Templat kertas (grid, dotted, Cornell, bergaris) | Pilihan kertas untuk catatan | **Sebagian** | Latar titik dan garis ada di sketsa. Templat catatan ada (jurnal, rapat, belajar). Grid dan Cornell tidak ditemukan. |
| B8 | Navigasi planner (kalender ke catatan harian) | Pindah antarbagian lewat tautan | **Sebagian** | Ada jurnal harian, kalender, dan tautan. Belum ada struktur planner yang khusus. |

### Kelompok C: Audio dan pembelajaran

| # | Konsep | Arti sederhana | Status di Hara | Catatan |
|---|---|---|---|---|
| C1 | Voice recording | Rekam kuliah atau rapat dari dalam catatan | **Ada** | Blok memo suara (`b-audio`) memakai `MediaRecorder` dan menyimpan ke IndexedDB. Perlu diuji di Android. |
| C2 | Transkripsi terhubung waktu | Teks terhubung ke posisi audio, bisa diputar ulang | **Belum** | Dikte (STT) ada, tetapi belum dikaitkan dengan penanda waktu rekaman. |
| C3 | Picture-in-picture belajar | Video di jendela mengambang sambil mencatat | **Belum** | Tidak ditemukan elemen video. |
| C4 | Screenshot frame video | Ambil frame video lalu sisipkan ke catatan | **Belum** | Bergantung pada C3. |
| C5 | Tampilan belajar (materi dan catatan berdampingan) | Dua panel di satu layar | **Belum** | Ada tampilan lain (Tugas, Kalender, Papan), tetapi belum ada tampilan berdampingan untuk belajar. |
| C6 | Active recall (tutup lalu buka teks) | Teks ditutupi untuk menguji ingatan | **Belum dicek** | Ada mode baca dan mode fokus, tetapi belum ditemukan mekanisme tutup dan buka teks. |
| C7 | Flashcard dari catatan | Membuat kartu belajar dari materi | **Belum** | Tidak ditemukan. |
| C8 | Pusat persiapan ujian | Ruang belajar khusus dengan materi, timer, layer, dan tampilan terpisah | **Belum** | Bergantung pada C5, C6, C7, dan C9. |
| C9 | Focus timer | Timer sesi belajar | **Belum** | Tidak ditemukan timer fokus. Ada timer teknis untuk UI. |
| C10 | Study ambience | Audio latar saat belajar | **Belum** | Tidak ditemukan. Modul Musik ada, tetapi terpisah dari catatan. |

### Kelompok D: Organisasi dan penyimpanan

| # | Konsep | Arti sederhana | Status di Hara | Catatan |
|---|---|---|---|---|
| D1 | Pengelompokan proyek atau mata kuliah | Catatan dikelompokkan per proyek atau topik | **Ada** | Ruang (folder), tag, dan Smart Folder. Operator `folder:` sudah ada. |
| D2 | Sinkronisasi cloud (iCloud, Google Drive) | Catatan tersinkron antarperangkat | **Belum** | Sinkronisasi cloud direncanakan untuk fase 8 (Supabase). iCloud dan Google Drive tidak direncanakan. Ada outbox untuk persiapan. |
| D3 | Akses cepat lewat toolbar dan shortcut | Fitur utama dekat jangkauan | **Sebagian** | Ada bar bawah dan pintas keyboard. |
| D4 | Web clip (simpan konten web atau ringkasan) | Ambil isi halaman web jadi catatan | **Belum** | Yang ada hanya kartu tautan manual. Mengambil halaman web memerlukan akses jaringan dan proxy atau ekstensi. |
| D5 | Shortcut sistem dan integrasi asisten | Buat atau cari catatan lewat shortcut perangkat | **Belum** | Ada rencana share target PWA di `NOTES.md`, tetapi belum diverifikasi. Integrasi asisten perlu fitur native (Capacitor). |

---

## 4. Batasan yang perlu dipegang

1. **Kanvas tak terbatas dan plugin** sudah diputuskan tidak dibuat. Beberapa ide A (layer, zoom, ukuran kanvas) harus dibatasi dalam skala yang masuk akal untuk HP.
2. **Local-first**. Fitur yang butuh internet (OCR berbasis layanan, web clip, sinkronisasi cloud) harus punya cara kerja offline atau dibuat opsional.
3. **Bundel awal di bawah 200 KB gzip**. Penampil PDF, OCR, dan pustaka serupa harus dimuat malas, dan dampaknya perlu diukur.
4. **Pengujian**. Fitur audio, kamera, dan sentuh hanya bisa dipastikan di perangkat Android. Pengujian di Chromium hanya membantu untuk logika dan tampilan dasar.
5. **Keterbatasan sandbox**. Akses internet di sandbox hanya ke GitHub, npm, dan PyPI. Itu tidak mengubah produk, tetapi membatasi pengujian fitur yang butuh layanan luar.

---

## 5. Pertanyaan terbuka (untuk nanti, belum perlu dijawab sekarang)

Hal-hal ini masih ambigu dan sebaiknya diputuskan sebelum pengerjaan:

1. **Prioritas kelompok**. Mana yang dikerjakan lebih dulu? Saran awal: kelompok A dasar (A3, A4, A5) dan B1 (PDF) punya dampak terbesar, sedangkan C7 dan C8 bergantung pada banyak fitur lain.
2. **Lingkup handwriting**. Apakah cukup coretan di dalam sketsa, atau tulisan tangan harus mengalir di dalam teks biasa?
3. **Lingkup PDF**. Apakah cukup menampilkan dan menganotasi, atau perlu manajemen halaman (B2) juga?
4. **Lingkup OCR**. Apakah OCR berjalan sepenuhnya offline (dengan konsekuensi ukuran unduhan), atau boleh memakai layanan luar?
5. **Sinkronisasi (D2)**. Apakah sinkronisasi cloud masuk fase 8 yang sudah ada rencananya, atau perlu pendekatan lain?
6. **Lingkup pembelajaran (C)**. Apakah kelompok C dibuat sebagai modul baru dengan tampilan sendiri, atau sebagai fitur di dalam catatan?

---

## 6. Yang belum saya verifikasi

- Status A6 (zoom), A8 (landscape), dan A9 (pin toolbar) belum saya periksa sampai detail.
- Status C6 (active recall) belum saya periksa sampai detail.
- Perilaku `b-audio` dan sketsa belum saya uji di perangkat atau browser. Status di atas hanya berdasarkan membaca kode.
- Pemahaman tentang FreeNotes berasal dari daftar yang diberikan pengguna. Saya belum memeriksa aplikasi FreeNotes sendiri.
- Tidak ada perubahan pada kode, konfigurasi, atau cabang Git.
