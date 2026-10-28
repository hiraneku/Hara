# Pemahaman Mendalam: 32 Ide Fitur Catatan (versi terkoreksi)

> Dokumen ini adalah **versi terbaru** pemahaman. Menggantikan `pemahaman-ide-fitur-catatan.md` versi sebelumnya (yang masih memuat beberapa kesimpulan keliru, terutama soal sinkronisasi dan urutan kerja).
> Sumber konsep dan keputusan: `koreksi-dan-urutan-32-konsep.md` (dokumen koreksi dari pengguna).
> Status per ID: hasil **Tahap 0 (audit read-only)** di `audit-tahap-0.md`.
> Acuan FreeNotes: halaman publik, bukan pengujian aplikasinya.

---

## 1. Inti yang harus dipegang

1. Ini **acuan konsep dan arah desain**, bukan spesifikasi final. Status fitur harus diverifikasi terhadap kode sebelum implementasi.
2. Tulisan tangan, gambar, bentuk, teks, dan anotasi diperlakukan sebagai **objek yang bisa dipilih dan diedit**, bukan gambar mati.
3. PDF asli **tidak pernah** digabung permanen dengan anotasi. Anotasi disimpan terpisah, dan PDF gabungan hanya hasil ekspor.
4. Kanvas **dapat diperluas dengan batas maksimum**. Zoom, ukuran kanvas, dan perluasan kanvas adalah tiga hal berbeda.
5. Pendekatan **local-first** dipertahankan. Supabase tetap kandidat utama untuk sinkronisasi data. Google Drive hanya cocok untuk cadangan berkas.
6. Kerjakan **bertahap**, bukan sekaligus. Pertahankan yang sudah berfungsi, dan jangan membangun ulang kemampuan yang sudah ada.
7. Undo/redo, performa di perangkat mobile, ekspor/impor tanpa kehilangan data, penanganan konflik, dan aksesibilitas berlaku untuk semua fitur.

---

## 2. Koreksi atas pemahaman sebelumnya

| Topik | Pemahaman lama (keliru/kurang tepat) | Pemahaman terkoreksi |
|---|---|---|
| Tulisan tangan | Coretan adalah gambar hasil akhir | Simpan sebagai stroke/objek yang bisa diedit. Ekspor ke gambar/PDF sebagai hasil render. |
| Layer | Satu layer per objek | Layer = pengelompokan logis. Objek tetap bisa diedit satu per satu. |
| Zoom / kanvas | Dicampur menjadi "zoom dengan batas" | Tiga hal terpisah: zoom (tampilan), ukuran kanvas (batas area), perluasan kanvas (mengubah batas). |
| Shape recognition | Pemicu belum jelas | Pemicu: menahan stylus/jari sesaat setelah menggambar. Lokal. Ada opsi batal. |
| OCR | Dianggap selalu diperlukan | Tidak perlu untuk PDF yang sudah punya teks. Ekstraksi teks dan OCR dipisah. |
| Audio | Transkripsi sebagai fokus | Mulai dari catatan bertanda waktu (tanpa AI). Transkripsi otomatis menyusul. |
| Tape dan flashcard | Tape sebagai sumber flashcard | Keduanya tidak saling bergantung. Flashcard bisa dibuat manual dari teks. |
| Exam Prep Center | Harus menunggu semua fitur belajar | Mulai dari materi pengguna. Materi bawaan bukan syarat. |
| **Sinkronisasi** | Google Drive "lebih masuk akal" | **Keliru.** Supabase tetap kandidat utama. Google Drive hanya untuk cadangan berkas. |
| Web capture | Ambil konten web | Mulai dari URL, judul, metadata, dan teks pilihan. Pengambilan halaman penuh menyusul. |
| Integrasi native | Diasumsikan tersedia lewat Capacitor | Capacitor tidak otomatis menyediakannya. Mulai dari berbagi teks/tautan ke Hara. |
| PiP vs split-screen | Dianggap mirip | Berbeda. Split-screen di dalam Hara. PiP adalah jendela sistem yang bergantung platform. |
| Video screenshot | Batas umum | Bergantung pada sumber video. Uji tiap jenis sumber. Jangan janjikan untuk semua situs. |
| Urutan kerja | Tidak ada | Lima tahap, dijelaskan di bagian 4. |

---

## 3. Keputusan atas 10 pertanyaan terbuka

1. **Tulisan tangan:** mulai sebagai blok/objek mandiri. Menyatu dengan paragraf menyusul.
2. **Kanvas dan layer:** kanvas bisa diperluas dengan batas wajar. Layer untuk pengelompokan. Layer boleh memisahkan materi dan jawaban di ujian, tetapi bukan syarat layer dasar.
3. **Shape recognition:** pemicu tahan stylus. Bentuk awal: garis, panah, lingkaran, elips, persegi, persegi panjang, segitiga, poligon sederhana. Ada opsi batal.
4. **PDF:** dua tahap. Tahap 1: tampil, navigasi, zoom, coretan, sorotan, garis bawah, komentar. Tahap 2: susun ulang, hapus, gandakan, sisipkan halaman.
5. **OCR:** utamakan lokal. Jangan mewajibkan cloud. Cloud hanya opsi masa depan dengan penjelasan koneksi, biaya, dan privasi.
6. **Audio:** rekaman dan catatan bertanda waktu dulu. Transkripsi otomatis kemudian.
7. **Flashcard:** versi pertama kartu depan-belakang, pembalikan, dan penilaian sederhana. Pengulangan berjarak (spaced repetition) adalah tahap lanjutan.
8. **Timer:** Pomodoro sebagai mode awal yang direkomendasikan (default 25 menit fokus, 5 menit istirahat, bisa diubah). Hitung mundur dasar. Stopwatch sebagai mode tambahan. Suara notifikasi bisa dinyalakan atau dimatikan.
9. **Sinkronisasi:** pertahankan Supabase sebagai kandidat utama. Google Drive untuk cadangan/berkas saja.
10. **Materi ujian:** utamakan materi pengguna sendiri. Pembuatan soal otomatis dan perpustakaan bawaan bukan syarat versi awal.

---

## 4. Urutan kerja (Tahap 0–5)

Urutan ini adalah **prioritas konseptual**, bukan larangan memulai tahap berikutnya sebelum yang sebelumnya selesai.

- **Tahap 0 — Audit repo.** Tandai status 32 ID. Tetapkan fondasi: model data editabel, koordinat kanvas, penyimpanan lokal, ekspor/impor, undo/redo. Hasil: `audit-tahap-0.md`.
- **Tahap 1 — Fondasi editor dan alat visual:** A1, A2, A6, A7, A3, A4, A5, A8, A9, B7.
  A3, A4, dan A5 memakai model objek editabel yang sama dengan A1.
- **Tahap 2 — Dokumen dan navigasi:** B1, B5, B3, B4, B2, B6, B8.
  B5 bisa mulai dari teks yang sudah ada, tidak menunggu OCR.
- **Tahap 3 — Audio dan video:** C1, C2, C5, C3, C4.
  C3, C4, C5 memakai penanganan sumber media yang konsisten, tetapi kemampuan teknisnya tidak boleh diasumsikan sama.
- **Tahap 4 — Belajar aktif:** C6, C7, C9, C8, C10.
  C6 mulai dari teks, lalu objek visual/layer.
- **Tahap 5 — Organisasi, akses cepat, web capture, sinkronisasi:** D1, D3, D4, D5, D2.
  D2 setelah model data dan penyimpanan lokal stabil, tetapi kebutuhan sinkronisasi harus diperhitungkan sejak desain awal.

---

## 5. Ketergantungan yang tidak boleh terlewat

- A3, A4, A5 bergantung pada A1 (model objek editabel).
- A2, A5, C6 memerlukan model objek/layer yang konsisten.
- A6 dan A7 berbagi sistem koordinat, tetapi perilakunya berbeda.
- B1 mendasari B2. B5 bisa dimulai dari teks yang tersedia. B6 menambah OCR.
- B3 dan B8 sama-sama memerlukan target navigasi yang stabil.
- C2 harus memisahkan catatan bertanda waktu dari transkripsi speech-to-text.
- C3 dan C4 bergantung pada kemampuan sumber video. Tidak dijamin untuk semua situs.
- C6 dan C7 boleh terintegrasi, tetapi tidak boleh menjadi ketergantungan wajib.
- C8 memakai materi pengguna dan dapat memanfaatkan C6, C7, C9 secara bertahap.
- C10 bisa memakai modul Musik yang sudah ada, jika cocok secara teknis dan lisensinya mengizinkan.
- D1 harus menghormati sistem ruang/tag/Smart Folder yang ada.
- D2 harus mencerminkan model data dan perilaku offline Hara.
- A9 (alat editor) dan D3 (tindakan utama aplikasi) berbeda cakupan.
- D4 dan D5 harus memperhitungkan batas browser dan dukungan native per platform.

---

## 6. Pemahaman per ID

Format: **Konsep** — **Keputusan/koreksi** — **Status (Tahap 0)** — **Tahap**.

### Kelompok A — Handwriting, drawing, kertas, dan kanvas

- **A1 Handwriting and drawing** — Stroke/objek yang bisa diedit (titik, tekanan bila ada, warna, ketebalan). Blok mandiri dulu. — *Partially implemented:* sketsa hanya menyimpan hasil PNG; goresan hidup di memori sesi. — Tahap 1.
- **A2 Digital paper, annotations, visual elements** — Latar kertas, anotasi, dan objek visual yang dipilih, dipindah, diubah ukurannya. — *Partially implemented:* latar titik/garis/polos, blok gambar bisa diatur, stiker Hamoji ada. Belum ada objek bebas di kanvas halaman. — Tahap 1.
- **A3 Custom pen and brush presets** — Preset gaya pena dibuat dari properti stroke (A1). — *Missing:* hanya satu jenis pena. — Tahap 1.
- **A4 Shape recognition** — Coretan kasar dikonversi ke bentuk rapi secara lokal. Pemicu tahan stylus. Opsi batal. — *Missing:* hanya alat manual kotak/garis/panah. — Tahap 1.
- **A5 Layer system** — Pengelompokan logis: sembunyikan, kunci, ubah urutan. Objek tetap bisa diedit satu per satu. — *Missing.* — Tahap 1.
- **A6 Zoomable canvas** — Pembesaran tampilan tanpa mengubah ukuran asli kanvas. — *Missing:* ukuran sketsa tetap 720×460, tidak ada kode zoom. — Tahap 1.
- **A7 Resizable canvas** — Batas kanvas bisa diperluas dengan batas maksimum wajar. Ukuran disimpan per dokumen/halaman. — *Missing.* — Tahap 1.
- **A8 Landscape workspace** — Tata letak menyesuaikan orientasi horizontal. — *Missing:* tidak ditemukan kode orientasi. — Tahap 1.
- **A9 Pinned toolbar tools** — Alat favorit bisa disematkan di toolbar. — *Missing:* tidak ada fitur sematan di konfigurasi bar. — Tahap 1.

### Kelompok B — Dokumen dan navigasi

- **B1 PDF import and annotation** — Tampilkan PDF, anotasi disimpan terpisah dari sumber. Ekspor PDF gabungan sebagai salinan. — *Missing:* PDF hanya disimpan sebagai lampiran; tidak ada penampil. — Tahap 2.
- **B2 PDF page management** — Susun ulang, hapus, gandakan, sisipkan halaman. Setelah viewer stabil. — *Missing.* — Tahap 2.
- **B3 Internal hyperlinks** — Tautan ke halaman atau bagian dalam dokumen. — *Partially implemented:* tautan catatan dan blok `[[Catatan#^id]]` sudah ada. Tautan ke halaman dokumen belum. — Tahap 2.
- **B4 External hyperlinks** — Tautan web pada teks dan kartu tautan; juga pada objek yang didukung. — *Partially implemented:* teks dan kartu tautan ada. Pada objek tulisan/gambar belum. — Tahap 2.
- **B5 Document search** — Cari teks dokumen dan anotasi yang dapat diindeks. Teks yang sudah ada bisa diindeks dulu. — *Partially implemented:* pencarian teks catatan dengan operator sudah ada. Anotasi belum ada. — Tahap 2.
- **B6 OCR search** — OCR untuk gambar/pindaian yang tidak punya lapisan teks. Lokal dulu. — *Missing.* — Tahap 2.
- **B7 Custom paper templates** — Grid, dotted, Cornell, garis, dan templat buatan sendiri. — *Partially implemented:* latar titik/garis/polos hanya ada di sketsa. Templat catatan yang ada (jurnal, rapat, belajar) bukan kertas. Grid, Cornell, dotted untuk halaman catatan belum ada. — Tahap 1.
- **B8 Digital planner navigation** — Navigasi antarhalaman planner lewat tautan (misalnya kalender ke halaman harian). — *Partially implemented / needs verification:* kalender menampilkan entri jurnal (`kalender.js`) dan jurnal harian ada. Tautan langsung dari sel kalender belum terverifikasi. — Tahap 2.

### Kelompok C — Audio dan pembelajaran

- **C1 Voice recording** — Rekam kuliah atau rapat dari dalam catatan. — *Implemented (stabil, uji Chromium 34/34):* sesi rekaman di perekam-suara.js, bilah rekam saat popup tertutup, potongan tiap detik, penghentian saat aplikasi disembunyikan, dan simpan ulang bila gagal. Belum diuji di Android sungguhan. — Tahap 3.
- **C2 Audio-linked transcription** — Catatan bertanda waktu dulu (tanpa AI). Transkripsi otomatis menyusul. — *Missing:* blok audio belum punya penanda waktu. Dikte hanya untuk mengetik. — Tahap 3.
- **C3 Picture-in-picture learning** — Video di jendela mengambang sambil menulis, jika sumber dan platform mendukung. — *Missing.* — Tahap 3.
- **C4 Video screenshot capture** — Ambil frame hanya untuk jenis sumber yang didukung. Uji tiap sumber. — *Missing.* — Tahap 3.
- **C5 Course learning view** — Materi dan catatan berdampingan di dalam Hara. Di HP bisa tab/panel jika tidak muat. — *Missing.* — Tahap 3.
- **C6 Active recall tape** — Teks ditandai tersembunyi lalu ditampilkan saat diketuk. Untuk objek visual, penutup terhubung ke objek. Buka/tutup per item dan semua. — *Missing:* mode baca bukan mekanisme tape. — Tahap 4.
- **C7 Flashcard generation** — Kartu depan-belakang, dibuat manual dari teks yang dipilih. Pembuatan dari tape opsional. — *Missing.* — Tahap 4.
- **C8 Exam preparation center** — Pilih materi pengguna, susun pertanyaan dan jawaban, latihan mengingat. Layer, tape, flashcard, jadwal ditambahkan bertahap. — *Missing.* — Tahap 4.
- **C9 Focus timer** — Pomodoro default 25/5 yang bisa diubah, hitung mundur dasar, stopwatch tambahan. — *Missing:* tidak ada timer fokus. — Tahap 4.
- **C10 Study ambience** — Pemutar audio latar dengan sumber berlisensi sesuai. — *Missing:* modul Musik ada terpisah, belum terhubung ke catatan. — Tahap 4.

### Kelompok D — Organisasi dan penyimpanan

- **D1 Project/course-based organization** — Verifikasi ruang, tag, Smart Folder, dan kebutuhan hierarki. — *Partially implemented:* ruang (folder), tag, dan Smart Folder ada. Ruang belum bertingkat. — Tahap 5.
- **D2 Cloud sync** — Local-first, Supabase sebagai kandidat, antrean offline, ID stabil, retry, konflik, propagasi penghapusan. — *Missing:* tidak ada kode sinkronisasi. Tabel `outbox` direncanakan di `PLAN.md` tetapi belum dibuat. — Tahap 5.
- **D3 Quick access tools** — Akses cepat ke tindakan utama, tanpa menggandakan A9. — *Partially implemented:* bar bawah dan pintasan keyboard ada. — Tahap 5.
- **D4 Web content capture** — Mulai dari URL, judul, metadata, teks pilihan, dan sumber. Ringkasan AI terpisah. — *Missing:* hanya kartu tautan manual. — Tahap 5.
- **D5 Shortcut integration** — Mulai dari berbagi teks/tautan ke Hara. Pintasan native diverifikasi per platform. — *Missing (masuk):* tidak ada share target. Berbagi keluar sudah ada (`share.js`). — Tahap 5.

---

## 7. Catatan validasi

- Rekomendasi adalah keputusan desain yang disarankan, **bukan bukti** bahwa fitur sudah tersedia atau arsitektur sudah mendukungnya.
- Sebelum implementasi: periksa kode dan dependensi, pertahankan yang sudah berfungsi, dan uji performa di perangkat mobile.
- Uji ekspor/impor, penggunaan offline, sinkronisasi, dan konflik data.
- Strategi konflik yang tercatat di `PLAN.md` (last-write-wins per field) perlu dicocokkan dengan koreksi 1.10 sebelum D2 dikerjakan.
- Hasil di atas belum diuji di perangkat atau browser.
