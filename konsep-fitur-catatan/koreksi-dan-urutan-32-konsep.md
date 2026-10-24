# Hara --- Koreksi Konsep dan Keputusan Fitur

Dokumen ini hanya memuat bagian dari catatan pemahaman fitur Hara yang
perlu dikoreksi, diperjelas, atau ditetapkan keputusannya, serta jawaban
atas pertanyaan terbuka. Bagian yang sudah benar dan tidak memerlukan
koreksi sengaja tidak diulang.

Dokumen ini adalah acuan konsep dan arah desain, bukan spesifikasi
implementasi final. Status fitur dan kecocokan arsitektur tetap perlu
diverifikasi terhadap kode Hara sebelum implementasi.

------------------------------------------------------------------------

# 1. Koreksi dan Penajaman Konsep

## 1.1 Tulisan tangan dan model data editor

**Koreksi:** Coretan sebaiknya tidak hanya disimpan sebagai satu gambar
hasil akhir jika pengguna perlu mengeditnya kembali.

**Arah yang disarankan:** - Simpan tulisan tangan sebagai data
stroke/objek yang dapat diedit, misalnya kumpulan titik, tekanan bila
tersedia, warna, ketebalan, dan atribut terkait. - Perlakukan stroke,
teks, gambar, bentuk, serta anotasi sebagai objek yang dapat dipilih dan
diedit. - Sediakan ekspor ke gambar atau PDF sebagai hasil render, tanpa
menghilangkan data editabel sumber. - Untuk versi awal, gunakan tulisan
tangan sebagai blok/objek mandiri. Integrasi tulisan tangan yang
mengalir di dalam paragraf dapat menjadi pengembangan berikutnya.

## 1.2 Layer bukan berarti satu layer untuk setiap objek

**Koreksi:** Tidak perlu membuat satu layer terpisah secara otomatis
untuk setiap coretan kecil.

**Arah yang disarankan:** - Layer berfungsi mengelompokkan objek secara
logis. - Pengguna dapat menyembunyikan, mengunci, mengubah urutan, dan
mengelola layer. - Objek tetap bisa dipilih dan diedit secara individual
jika diperlukan. - Layer dapat dimanfaatkan untuk memisahkan materi dan
jawaban dalam fitur belajar, tetapi fungsi tersebut tidak perlu menjadi
syarat bagi sistem layer dasar.

## 1.3 Zoom, ukuran kanvas, dan perluasan kanvas adalah hal berbeda

**Koreksi:** Ketiganya jangan digabung sebagai satu fitur.

-   **Zoom:** mengubah pembesaran tampilan; ukuran asli kanvas tidak
    berubah.
-   **Ukuran kanvas:** menentukan batas area kerja.
-   **Perluasan kanvas:** mengubah batas area kerja, misalnya dengan
    menyeret tepi atau menambahkan area baru.

**Arah yang disarankan:** Gunakan kanvas yang ukurannya dapat diperluas
dengan batas maksimum yang wajar. Simpan ukuran kanvas per dokumen atau
halaman jika model dokumennya mendukung banyak halaman. Hindari kanvas
tak terbatas jika keputusan produk Hara memang menghendaki kanvas
berbatas.

## 1.4 Shape recognition

**Penajaman:** Pengenalan bentuk dasar tidak harus memakai AI atau
layanan cloud.

**Arah yang disarankan:** - Mulai dengan garis lurus, panah, lingkaran,
elips, persegi, persegi panjang, segitiga, dan poligon sederhana. -
Pemicu awal yang disarankan adalah menahan ujung stylus/jari sesaat
setelah selesai menggambar. - Tampilkan bentuk hasil pengenalan dan
sediakan cara membatalkan konversi atau mempertahankan coretan asli. -
Algoritme lokal dapat menganalisis jalur titik dan bentuk geometris
dasar.

## 1.5 PDF dan anotasi harus dipisahkan dari berkas asli

**Koreksi:** Anotasi jangan langsung digabung secara permanen ke PDF
sumber selama proses pengeditan.

**Arah yang disarankan:** - Simpan PDF asli sebagai dokumen sumber. -
Simpan anotasi sebagai data terpisah yang terhubung dengan halaman dan
koordinat dokumen. - Saat ekspor, sediakan pilihan untuk menghasilkan
PDF dengan anotasi yang dirender/diratakan. - Pengelolaan halaman
seperti menyusun ulang, menghapus, menggandakan, dan menyisipkan halaman
dibangun setelah penampil dan anotasi dasar stabil.

## 1.6 OCR bukan satu proses yang selalu diperlukan

**Koreksi:** OCR tidak diperlukan untuk semua pencarian dokumen.

-   PDF yang memiliki lapisan teks dapat dicari dengan ekstraksi teks
    biasa.
-   PDF hasil pemindaian, gambar, atau tulisan tangan mungkin
    membutuhkan OCR atau pengenalan tulisan tangan.
-   OCR dan pencarian teks sebaiknya menjadi proses terpisah.
-   Pemrosesan lokal baik untuk privasi, tetapi kelayakan dan
    performanya bergantung pada pustaka/model serta perangkat. Layanan
    cloud dapat dipertimbangkan sebagai opsi, bukan asumsi wajib.

## 1.7 Rekaman audio, catatan bertanda waktu, dan transkripsi berbeda

**Koreksi:** Catatan yang terhubung ke waktu audio tidak sama dengan
transkripsi otomatis.

-   **Catatan bertanda waktu:** pengguna membuat catatan saat rekaman
    diputar atau direkam; catatan mengarah ke posisi audio tertentu. Ini
    tidak membutuhkan AI.
-   **Transkripsi otomatis:** ucapan audio diubah menjadi teks
    menggunakan speech-to-text.
-   **Transkripsi bertanda waktu:** potongan teks transkripsi memiliki
    waktu yang memungkinkan pengguna melompat ke bagian audio yang
    sesuai.

Bangun rekaman dan catatan bertanda waktu terlebih dahulu; transkripsi
otomatis dapat ditambahkan kemudian.

## 1.8 Active recall tape dan flashcard tidak harus saling bergantung

**Koreksi:** Flashcard tidak harus dibuat dari active recall tape, dan
active recall tape bukan sekadar gambar yang menutupi teks.

**Arah yang disarankan:** - Untuk teks, tandai rentang teks sebagai
tersembunyi dan tampilkan kembali saat pengguna mengetuknya. - Untuk
coretan atau objek visual, gunakan mekanisme penutup yang terhubung
dengan area/objek target. - Sediakan buka/tutup per item dan, bila
sesuai, buka/tutup semua item. - Flashcard dapat dibuat secara manual
dari teks yang dipilih atau dari materi lain. Integrasi dengan tape
adalah pilihan tambahan.

## 1.9 Exam Prep Center tidak harus menunggu semua fitur lain

**Koreksi:** Exam Prep Center tidak perlu dibangun sekaligus sebagai
satu sistem besar yang bergantung pada seluruh fitur belajar.

**Arah yang disarankan:** - Mulai dengan memilih materi milik pengguna,
menyusun pertanyaan dan jawaban, serta melakukan latihan mengingat. -
Integrasikan layer, tape, flashcard, dan penjadwalan belajar secara
bertahap. - Materi bawaan yang disediakan aplikasi bukan syarat untuk
versi pertama.

## 1.10 Sinkronisasi cloud perlu dirancang, bukan hanya memilih layanan

**Koreksi:** Memakai Supabase atau Google Drive saja tidak otomatis
menghasilkan sinkronisasi yang benar.

**Arah yang disarankan:** - Pertahankan pendekatan local-first: data
lokal tetap dapat digunakan tanpa internet. - Jika rencana arsitektur
Hara memang menggunakan Supabase, pertahankan sebagai kandidat utama
untuk sinkronisasi data aplikasi. - Google Drive lebih cocok sebagai
penyimpanan/cadangan berkas daripada pengganti otomatis untuk sistem
sinkronisasi aplikasi. - Rancang antrean perubahan offline, ID stabil,
versi data, penghapusan tersinkron, percobaan ulang, dan penyelesaian
konflik ant perangkat. - Keputusan akhir perlu dicocokkan dengan rencana
serta implementasi aktual Hara.

## 1.11 Web content capture dapat dimulai dari lingkup sederhana

**Penajaman:** Mengambil seluruh halaman web bukan keharusan untuk versi
awal.

**Arah yang disarankan:** - Mulai dengan menyimpan URL, judul, metadata
yang tersedia, teks yang dipilih pengguna, dan sumber. - Pengambilan
seluruh halaman atau pembersihan konten dapat menyusul. - Pengambilan
konten dari situs lain dapat terhalang kebijakan lintas-asal,
autentikasi, struktur halaman, atau pembatasan situs. Jangan
mengasumsikan semua halaman bisa diambil secara langsung. - Ringkasan AI
adalah fitur terpisah dan dapat memerlukan layanan/model tambahan.

## 1.12 Integrasi native tidak otomatis tersedia hanya karena memakai Capacitor

**Koreksi:** Capacitor tidak otomatis menyediakan semua integrasi sistem
operasi.

**Arah yang disarankan:** - Anggap berbagi teks/tautan dari aplikasi
lain ke Hara sebagai langkah awal yang berguna. - Pintasan aplikasi,
widget, integrasi asisten perangkat, dan tindakan sistem dapat
memerlukan plugin, konfigurasi native, atau implementasi khusus. -
Verifikasi dukungan Android dan iOS secara terpisah sebelum menjanjikan
perilaku yang sama di semua platform.

## 1.13 Split-screen dan picture-in-picture bukan fitur yang sama

**Penajaman:** - **Course learning view/split-screen di dalam Hara:**
materi dan catatan ditampilkan berdampingan dalam antarmuka aplikasi. -
**System picture-in-picture:** video ditampilkan sebagai jendela
mengambang yang dikendalikan dukungan platform dan sumber video.

Pada layar ponsel, tata letak berdampingan mungkin lebih cocok dalam
mode landscape atau perlu berubah menjadi tab/berpindah panel.

## 1.14 Pengambilan frame video bergantung pada sumbernya

**Penajaman:** Jangan menyimpulkan bahwa semua video bisa atau tidak
bisa diambil gambarnya.

Kemampuan menangkap frame bergantung pada jenis sumber, cara video
dimuat, kebijakan lintas-asal, DRM, dan API yang tersedia. Uji setiap
jenis sumber yang benar-benar ingin didukung Hara. Jangan menjanjikan
pengambilan frame universal dari semua situs atau layanan video.

## 1.15 Undo/redo, performa, ekspor, dan aksesibilitas perlu masuk ke fondasi

Tambahkan persyaratan lintas fitur berikut: - Undo/redo yang konsisten
untuk teks, stroke, bentuk, anotasi, dan operasi kanvas. - Rendering
serta pemuatan bertahap untuk dokumen besar, dengan perhatian pada
penggunaan memori perangkat mobile. - Ekspor dan impor yang
mempertahankan isi; beri tahu pengguna jika suatu format tidak dapat
mempertahankan data yang dapat diedit. - Penanganan konflik data dan
penghapusan yang jelas saat sinkronisasi. - Kontrol yang nyaman untuk
sentuhan, keyboard, ukuran teks, dan pembaca layar bila relevan.

------------------------------------------------------------------------

# 2. Jawaban atas Pertanyaan Terbuka

## 2.1 Tulisan tangan: blok atau menyatu dengan paragraf?

**Keputusan:** Mulai dengan blok tulisan tangan yang menjadi objek
mandiri.

Alasannya, objek lebih mudah dipindahkan, diubah ukurannya, dipilih, dan
diedit tanpa mengganggu alur teks. Setelah model data dan editor stabil,
Hara dapat mempertimbangkan tulisan tangan yang menyatu dengan paragraf
untuk catatan campuran.

## 2.2 Batas ukuran kanvas dan apakah layer dipakai untuk ujian?

**Keputusan:** - Gunakan kanvas yang dapat diperluas, tetapi memiliki
batas maksimum yang wajar untuk menjaga performa. - Zoom tidak mengubah
ukuran kanvas. - Simpan ukuran kanvas sesuai struktur dokumen/halaman
yang dipilih. - Sediakan layer untuk mengelompokkan objek, bukan satu
layer per objek secara otomatis. - Layer dapat mendukung pemisahan
materi dan jawaban di Exam Prep Center, tetapi jangan jadikan fitur
ujian sebagai prasyarat untuk membangun layer dasar.

## 2.3 Pemicu dan bentuk yang didukung shape recognition?

**Keputusan:** - Gunakan mekanisme menahan ujung stylus/jari sesaat
setelah menggambar sebagai pemicu awal. - Bentuk awal: garis, panah,
lingkaran, elips, persegi, persegi panjang, segitiga, dan poligon
sederhana. - Beri opsi membatalkan konversi atau mempertahankan coretan
asli. - Utamakan pemrosesan lokal untuk bentuk dasar.

## 2.4 PDF: penampil dan anotasi saja atau termasuk pengelolaan halaman?

**Keputusan:** Dukung keduanya secara bertahap.

**Tahap pertama:** impor dan tampilkan PDF, navigasi halaman, zoom,
coretan, sorotan, garis bawah, dan komentar.

**Tahap berikutnya:** menyusun ulang, menghapus, menggandakan, dan
menyisipkan halaman.

PDF asli harus tetap terpisah dari data anotasi. Ekspor dapat
menghasilkan salinan PDF dengan anotasi yang sudah digabungkan.

## 2.5 OCR: offline penuh atau boleh memakai layanan luar?

**Keputusan:** Prioritaskan pemrosesan lokal jika kualitas, ukuran
dependensi, dan performa perangkat memadai. Jangan mewajibkan cloud.

-   Gunakan ekstraksi teks biasa untuk PDF yang sudah memiliki teks.
-   Gunakan OCR untuk dokumen hasil pemindaian atau gambar.
-   Pertimbangkan cloud sebagai opsi masa depan jika diperlukan dan
    dengan penjelasan tentang koneksi, biaya, serta privasi.

## 2.6 Audio: transkripsi berkas atau penanda waktu?

**Keputusan:** Mulai dari rekaman dan catatan bertanda waktu, kemudian
tambahkan transkripsi otomatis.

Pengguna harus dapat menautkan catatan ke waktu tertentu pada rekaman.
Transkripsi otomatis dan transkripsi dengan penanda waktu menjadi tahap
lanjutan karena memerlukan kemampuan speech-to-text dan pemrosesan
tambahan.

## 2.7 Flashcard: apakah perlu spaced repetition?

**Keputusan:** Ya, sebagai pengembangan lanjutan; bukan persyaratan
versi pertama.

-   Versi pertama: kartu depan-belakang, pembalikan kartu, dan penilaian
    sederhana atas kemampuan mengingat.
-   Versi lanjutan: penjadwalan pengulangan berdasarkan hasil belajar
    pengguna.
-   Flashcard harus dapat dibuat manual dari teks yang dipilih.
    Pembuatan dari active recall tape dapat ditambahkan, tetapi kedua
    fitur tidak wajib bergantung satu sama lain.

## 2.8 Timer: countdown, Pomodoro, atau stopwatch?

**Keputusan:** Jadikan Pomodoro sebagai mode awal yang direkomendasikan,
dengan timer hitung mundur yang dapat disesuaikan sebagai kemampuan
dasar. Stopwatch dapat ditambahkan sebagai mode lain.

Contoh pengaturan awal Pomodoro adalah 25 menit fokus dan 5 menit
istirahat, tetapi durasinya harus dapat diubah pengguna. Notifikasi
suara juga sebaiknya dapat dinyalakan atau dimatikan.

## 2.9 Sinkronisasi: tetap Supabase atau memakai layanan lain?

**Keputusan:** Pertahankan Supabase sebagai kandidat utama jika sesuai
dengan rencana local-first Hara; jangan menggantinya dengan Google Drive
hanya karena dianggap lebih sederhana.

Sebelum implementasi, tetapkan: - Data apa yang tersimpan lokal dan apa
yang disinkronkan. - ID stabil untuk catatan, halaman, objek, dan
lampiran. - Antrean perubahan ketika offline. - Strategi versi dan
penyelesaian konflik. - Cara menyinkronkan penghapusan. - Mekanisme
retry dan pemulihan ketika sinkronisasi gagal.

Google Drive dapat dievaluasi untuk pencadangan atau penyimpanan berkas,
tetapi bukan pengganti otomatis bagi sinkronisasi data aplikasi.

## 2.10 Materi ujian berasal dari pengguna atau disediakan aplikasi?

**Keputusan:** Utamakan materi pengguna.

Pengguna memilih catatan atau PDF sendiri, lalu menyusun pertanyaan dan
jawaban, menyembunyikan jawaban, serta berlatih mengingat. Pembuatan
soal otomatis dapat ditambahkan nanti. Hara tidak perlu menyediakan
perpustakaan materi bawaan untuk meluncurkan versi dasar.

------------------------------------------------------------------------

# 3. Rekomendasi Tambahan untuk Pengembangan

## 3.1 Fondasi editor visual

1.  Tetapkan model data stroke dan objek yang dapat diedit.
2.  Buat sistem seleksi, pemindahan, pengubahan ukuran, dan penghapusan
    objek.
3.  Terapkan undo/redo lintas operasi.
4.  Bedakan zoom dari ukuran dan perluasan kanvas.
5.  Tambahkan layer dan pengenalan bentuk secara bertahap.

## 3.2 Dokumen dan pencarian

1.  Bangun PDF viewer dan navigasi halaman.
2.  Tambahkan anotasi yang disimpan terpisah dari sumber.
3.  Tambahkan pencarian teks.
4.  Tambahkan OCR untuk konten yang memang memerlukannya.
5.  Tambahkan pengelolaan halaman dan tautan menuju halaman tertentu.

## 3.3 Fitur belajar

1.  Bangun rekaman audio dan catatan bertanda waktu.
2.  Tambahkan active recall tape untuk teks dan objek visual.
3.  Bangun flashcard dasar.
4.  Tambahkan Exam Prep Center dengan materi pengguna.
5.  Tambahkan spaced repetition dan transkripsi otomatis setelah fondasi
    stabil.

## 3.4 Integrasi dan sinkronisasi

1.  Mulai dengan penyimpanan URL, judul, dan teks pilihan pengguna untuk
    web capture.
2.  Tambahkan berbagi teks/tautan dari aplikasi lain ke Hara.
3.  Rancang sinkronisasi local-first, termasuk antrean offline dan
    konflik.
4.  Uji integrasi native per platform, bukan mengasumsikan semua
    kemampuan otomatis tersedia.

------------------------------------------------------------------------

# 4. Urutan Implementasi yang Disarankan

Urutan ini adalah prioritas konseptual, bukan keharusan untuk
menyelesaikan seluruh satu tahap sebelum mulai mengerjakan tahap
berikutnya.

### Tahap 1 --- Fondasi editor visual

-   Model data stroke dan objek.
-   Seleksi dan pengeditan objek.
-   Undo/redo.
-   Kanvas, zoom, dan perluasan.
-   Layer dasar.
-   Shape recognition.

### Tahap 2 --- Dokumen dan navigasi

-   PDF viewer.
-   Anotasi yang dapat diedit.
-   Pencarian teks.
-   OCR.
-   Pengelolaan halaman dan tautan ke halaman tertentu.

### Tahap 3 --- Belajar dari materi

-   Rekaman audio dengan penanda waktu.
-   Active recall tape.
-   Flashcard dasar.
-   Exam Prep Center.
-   Spaced repetition dan transkripsi otomatis.

### Tahap 4 --- Integrasi dan sinkronisasi

-   Web content capture dasar.
-   Berbagi ke Hara dari aplikasi lain.
-   Pintasan tambahan sesuai dukungan platform.
-   Sinkronisasi cloud dan penanganan konflik.

------------------------------------------------------------------------

# 5. Catatan Validasi

Rekomendasi dalam dokumen ini adalah keputusan desain yang disarankan,
bukan bukti bahwa fitur tersebut sudah tersedia atau bahwa arsitektur
saat ini sudah mendukungnya. Sebelum implementasi: - Periksa kode dan
dependensi Hara yang aktual. - Pertahankan fitur yang sudah benar dan
berfungsi. - Jangan membangun ulang kemampuan yang sudah tersedia. - Uji
performa pada perangkat mobile. - Uji ekspor/impor, penggunaan offline,
sinkronisasi, dan konflik data.

------------------------------------------------------------------------

# 6. Cakupan Seluruh 32 Konsep dan Urutan Pengerjaan

Bagian ini **melengkapi dokumen koreksi dan jawaban ini**. Ini bukan dokumen roadmap terpisah dan bukan pernyataan bahwa fitur-fitur berikut belum ada. Agent harus memeriksa kode Hara terlebih dahulu, lalu menandai setiap ID sebagai `Implemented`, `Partially implemented`, `Missing`, atau `Needs verification`.

## 6.1 Peta urutan implementasi

### Tahap 0 — Audit repo dan fondasi bersama

Sebelum mengubah kode:
- Periksa implementasi aktual, struktur data, dependensi, dan dokumentasi Hara.
- Cocokkan setiap ID A1–D5 dengan kondisi nyata.
- Jangan membuat ulang fitur yang sudah bekerja.
- Tetapkan fondasi data editabel, koordinat kanvas, penyimpanan lokal, ekspor/impor, serta undo/redo sebelum membangun fitur yang bergantung padanya.

**Konsep yang diaudit:** seluruh A1–A9, B1–B8, C1–C10, dan D1–D5.

### Tahap 1 — Fondasi editor, halaman, dan alat visual

Urutan yang disarankan:
1. **A1 — Handwriting and drawing:** struktur data stroke/objek yang dapat diedit.
2. **A2 — Digital paper, annotations, and visual elements:** latar halaman dan objek visual yang dapat dipilih, dipindahkan, serta diubah ukurannya.
3. **A6 — Zoomable canvas:** pembesaran tampilan tanpa mengubah ukuran asli.
4. **A7 — Resizable canvas:** perubahan batas area kerja, terpisah dari zoom.
5. **A3 — Custom pen and brush presets:** preset gaya pena setelah properti stroke tersedia.
6. **A4 — Shape recognition:** konversi coretan menjadi bentuk rapi.
7. **A5 — Layer system:** kelompok objek yang bisa disembunyikan, dikunci, dan diurutkan.
8. **A8 — Landscape workspace:** penyesuaian tata letak untuk orientasi landscape.
9. **A9 — Pinned toolbar tools:** alat favorit yang bisa disematkan.
10. **B7 — Custom paper templates:** templat kertas, termasuk opsi grid, dotted, Cornell, dan garis, sesuai cakupan produk yang dipilih.

A3, A4, dan A5 harus menggunakan model data editabel yang sama, bukan membuat format coretan baru masing-masing.

### Tahap 2 — PDF, navigasi, tautan, dan pencarian

1. **B1 — PDF import and annotation:** tampilkan PDF dan simpan anotasi terpisah dari sumber.
2. **B5 — Document search:** pencarian teks dokumen dan anotasi yang benar-benar dapat diindeks.
3. **B3 — Internal hyperlinks:** tautan ke halaman atau bagian tertentu dalam dokumen.
4. **B4 — External hyperlinks:** tautan ke sumber web atau objek yang didukung.
5. **B2 — PDF page management:** menyusun ulang, menghapus, menggandakan, dan menyisipkan halaman setelah viewer stabil.
6. **B6 — OCR search:** OCR untuk konten hasil pindai/gambar yang tidak memiliki lapisan teks.
7. **B8 — Digital planner navigation:** navigasi planner melalui tautan, termasuk hubungan kalender dan halaman harian.

B5 tidak harus menunggu OCR: teks yang sudah tersedia dapat diindeks lebih dahulu. B6 adalah jalur tambahan untuk konten yang tidak dapat dicari melalui ekstraksi teks biasa.

### Tahap 3 — Audio dan video untuk belajar

1. **C1 — Voice recording:** stabilkan perekaman dan penyimpanan audio.
2. **C2 — Audio-linked transcription:** mulai dengan catatan bertanda waktu; transkripsi otomatis merupakan pengembangan terpisah.
3. **C5 — Course learning view:** tampilan materi dan catatan berdampingan di dalam Hara.
4. **C3 — Picture-in-picture learning:** video mengambang jika sumber dan platform mendukungnya.
5. **C4 — Video screenshot capture:** pengambilan frame hanya untuk jenis sumber video yang didukung.

C3, C4, dan C5 perlu memakai penanganan sumber media yang konsisten, tetapi tidak boleh diasumsikan mempunyai kemampuan teknis yang sama. Uji sumber lokal, URL langsung, iframe, dan sumber yang dibatasi secara terpisah.

### Tahap 4 — Fitur belajar aktif

1. **C6 — Active recall tape:** versi teks lebih dahulu, kemudian objek visual/layer.
2. **C7 — Flashcard generation:** kartu dasar yang bisa dibuat manual dari teks atau materi pilihan.
3. **C9 — Focus timer:** timer yang dapat disesuaikan, dengan Pomodoro sebagai mode awal yang direkomendasikan.
4. **C8 — Exam preparation center:** pusat latihan yang menggunakan materi pengguna dan memanfaatkan fitur belajar yang sudah stabil.
5. **C10 — Study ambience:** pemutar audio latar dengan sumber yang lisensinya sesuai.

C8 tidak perlu menunggu semua kemungkinan fitur belajar selesai. Buat versi awal setelah mekanisme dasar memilih materi dan berlatih mengingat tersedia. Spaced repetition dan pembuatan soal otomatis dapat menjadi peningkatan lanjutan, bukan prasyarat seluruh fitur belajar.

### Tahap 5 — Organisasi, web capture, akses cepat, dan sinkronisasi

1. **D1 — Project/course-based organization:** verifikasi ruang, tag, Smart Folder, dan kebutuhan hierarki.
2. **D3 — Quick access tools:** lengkapi akses cepat ke tindakan utama tanpa menggandakan A9.
3. **D4 — Web content capture:** mulai dari URL, judul, metadata, teks pilihan pengguna, dan sumber.
4. **D5 — Shortcut integration:** mulai dari share-to-Hara; kemampuan native lain diverifikasi per platform.
5. **D2 — Cloud sync:** rancang dan uji sinkronisasi local-first, antrean offline, ID stabil, retry, konflik, dan propagasi penghapusan.

D2 ditempatkan setelah model data dan penyimpanan lokal cukup stabil karena sinkronisasi harus mengikuti struktur data yang sebenarnya. Namun, kebutuhan sinkronisasi perlu diperhitungkan sejak desain awal agar model data tidak perlu dirombak.

## 6.2 Matriks cakupan seluruh konsep

Matriks ini menunjukkan tempat setiap ID dibahas dalam urutan kerja di atas. Ini adalah **pemetaan prioritas**, bukan status implementasi.

| ID asli | Konsep | Tahap yang disarankan |
|---|---|---|
| A1 | Handwriting and drawing | Tahap 1 |
| A2 | Digital paper, annotations, and visual elements | Tahap 1 |
| A3 | Custom pen and brush presets | Tahap 1 |
| A4 | Shape recognition | Tahap 1 |
| A5 | Layer system | Tahap 1 |
| A6 | Zoomable canvas | Tahap 1 |
| A7 | Resizable canvas | Tahap 1 |
| A8 | Landscape workspace | Tahap 1 |
| A9 | Pinned toolbar tools | Tahap 1 |
| B1 | PDF import and annotation | Tahap 2 |
| B2 | PDF page management | Tahap 2 |
| B3 | Internal hyperlinks | Tahap 2 |
| B4 | External hyperlinks | Tahap 2 |
| B5 | Document search | Tahap 2 |
| B6 | OCR search | Tahap 2 |
| B7 | Custom paper templates | Tahap 1 |
| B8 | Digital planner navigation | Tahap 2 |
| C1 | Voice recording | Tahap 3 |
| C2 | Audio-linked transcription | Tahap 3 |
| C3 | Picture-in-picture learning | Tahap 3 |
| C4 | Video screenshot capture | Tahap 3 |
| C5 | Course learning view | Tahap 3 |
| C6 | Active recall tape | Tahap 4 |
| C7 | Flashcard generation | Tahap 4 |
| C8 | Exam preparation center | Tahap 4 |
| C9 | Focus timer | Tahap 4 |
| C10 | Study ambience | Tahap 4 |
| D1 | Project/course-based organization | Tahap 5 |
| D2 | Cloud sync | Tahap 5 |
| D3 | Quick access tools | Tahap 5 |
| D4 | Web content capture | Tahap 5 |
| D5 | Shortcut integration | Tahap 5 |

## 6.3 Ketergantungan yang tidak boleh terlewat

- **A3, A4, A5** menggunakan fondasi data editabel dari **A1**.
- **A2, A5, C6** memerlukan model objek/layer yang konsisten agar elemen visual dapat dikelola tanpa merusak isi.
- **A6 dan A7** harus berbagi sistem koordinat yang jelas, tetapi zoom dan perubahan ukuran kanvas tetap perilaku berbeda.
- **B1** mendasari anotasi PDF dan **B2**; **B5** dapat dimulai dari teks yang tersedia, sementara **B6** menambahkan OCR.
- **B3 dan B8** sama-sama memerlukan target navigasi yang stabil; B8 menggunakannya untuk alur planner.
- **C2** harus memisahkan catatan bertanda waktu dari transkripsi speech-to-text.
- **C3 dan C4** bergantung pada kemampuan sumber video; keduanya tidak dijamin bekerja untuk semua situs.
- **C6 dan C7** boleh terintegrasi, tetapi tidak boleh saling menjadi ketergantungan wajib.
- **C8** menggunakan materi pengguna dan dapat memanfaatkan C6, C7, dan C9 secara bertahap.
- **C10** dapat memakai modul Musik yang sudah ada jika secara teknis cocok dan lisensinya mengizinkan.
- **D1** perlu menghormati sistem ruang/tag/Smart Folder yang sudah ada.
- **D2** harus mencerminkan model data dan perilaku offline Hara, bukan sekadar menghubungkan penyedia cloud.
- **D3 dan A9** saling terkait tetapi berbeda cakupan: alat editor dibanding tindakan utama aplikasi.
- **D4 dan D5** perlu memperhitungkan batas browser serta dukungan native per platform.

## 6.4 Instruksi bagi agent AI

1. Baca dokumen koreksi ini bersama dokumen sumber `Pemahaman Mendalam: 32 Ide Fitur Catatan`.
2. Audit repo terlebih dahulu dan buat tabel status untuk seluruh 32 ID.
3. Jangan menyimpulkan bahwa sebuah fitur hilang hanya karena catatan awal menyebutnya belum ada; catatan itu berdasarkan pemeriksaan sebelumnya dan harus diverifikasi ulang.
4. Untuk setiap perubahan, sebutkan ID konsep yang terkait, alasan urutan pengerjaan, dependensi, file yang diubah, dan cara pengujian.
5. Kerjakan secara bertahap. Jangan mencoba menerapkan seluruh 32 konsep dalam satu perubahan besar.
6. Pertahankan fitur yang sudah berfungsi dan hindari refactor yang tidak diperlukan.
7. Jalankan test/build yang relevan dan laporkan hasil nyata; jangan mengklaim pemeriksaan berhasil jika tidak dijalankan.
8. Jika kondisi repo bertentangan dengan asumsi dalam dokumen, jelaskan perbedaannya dan usulkan penyesuaian sebelum melakukan perubahan berisiko.
