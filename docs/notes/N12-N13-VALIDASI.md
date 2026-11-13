# N12–N13: implementasi dan validasi yang masih dibutuhkan

Dokumen ini membedakan hasil yang sudah dapat diuji di repo dari validasi yang
memerlukan Android runtime/perangkat. Ukuran sumber di bawah bukan ukuran APK
atau hasil benchmark.

## N12 — toolbar seleksi Android

### Implementasi

- Saat seleksi teks berada di editor Hara, `MainActivity` menambahkan submenu
  **Hara** ke `ActionMode` yang disediakan WebView. Menu asal tidak dibersihkan;
  aksi sistem yang tersedia di perangkat (mis. Salin, Pilih semua, Bagikan,
  Penelusuran/terjemahan) tetap dipertahankan.
- Bridge JavaScript hanya mengirim status seleksi dan memanggil aksi dari daftar
  tetap; teks catatan tidak dikirim ke Java.
- Toolbar format DOM disembunyikan selama ActionMode aktif. Di luar Android,
  toolbar web yang sudah ada tetap digunakan.
- Aksi Hara memakai mesin format/popup yang sudah ada.

### Validasi perangkat yang belum dilakukan

Tidak ada Android SDK/JDK atau perangkat/ADB di lingkungan kerja. Karena itu,
implementasi Java belum berhasil dikompilasi dan kriteria uji WebView nyata
belum terpenuhi. Sebelum rilis, bangun APK lalu uji di WebView Android nyata:

1. Long-press teks di editor: hanya satu toolbar seleksi terlihat.
2. Submenu Hara berisi aksi format; setiap aksi bekerja pada seleksi yang benar.
3. Salin dan Pilih semua tetap tersedia dan bekerja; periksa Bagikan serta
   Penelusuran/terjemahan bila disediakan versi Android tersebut.
4. Long-press di luar editor tidak menampilkan submenu Hara.
5. Tutup ActionMode, pindah layar, dan pilih teks lagi: tidak ada toolbar DOM
   yang tertinggal atau toolbar ganda.

## N13 — baseline dan optimasi

### Data yang dapat diukur di checkout ini

Pemindaian impor relatif statis dari `docs/app.js` saat ini menemukan **199
modul / 1,818,704 byte (1.73 MiB) sumber JS mentah**. Pemindaian bukan bundler:
angka ini tidak mencakup kompresi, aset yang dimuat dinamis, runtime, maupun
isi APK.

Kamus bahasa berukuran 95,060 byte (Inggris) dan 115,378 byte (Jepang), total
210,438 byte. Kedua kamus sekarang dimuat sesuai pilihan bahasa, bukan sebagai
impor statis startup. Dengan menambahkan keduanya ke graf statis saat ini,
perkiraan graf sumber awal menjadi 2,029,142 byte; ini hanya perbandingan
sumber, bukan pengukuran waktu buka atau ukuran bundle terkemas.

### Baseline perangkat yang masih kosong

| Metrik yang diminta | Hasil |
| --- | --- |
| Waktu buka dingin/hangat | Belum diukur |
| Responsivitas layar/interaksi | Belum diukur |
| Pemakaian memori | Belum diukur |
| Ukuran APK/AAB atau bundle terkemas | Belum tersedia |

Tidak ditemukan `java`, Android SDK, `adb`, APK/AAB yang sudah dibuat, atau
perangkat uji. `android/gradlew :app:assembleDebug --offline` berhenti sebelum
Gradle berjalan karena `JAVA_HOME`/Java tidak tersedia. Tidak ada klaim
benchmark performa atau ukuran APK.

### Perubahan optimasi yang dapat dibenarkan dari data sumber

Kamus EN/JA dibuat lazy-loaded karena pemindaian graf statis menunjukkan
210,438 byte kamus tidak perlu untuk bahasa Indonesia saat startup. API
`setBahasa()` menunggu kamus sebelum mengganti bahasa; `t()` tetap sinkron.
Bootstrap dan pengaturan menunggu pemilihan selesai, lalu UI statis dan layar
aktif diperbarui. Uji bahasa Inggris/Jepang mengonfirmasi kamus tersedia
sebelum terjemahan digunakan.

Jangan melakukan optimasi performa lain sebelum baseline runtime dikumpulkan.
Untuk menyelesaikan N13, ukur APK release serta 10 kali cold-start dan warm-start
di perangkat sasaran; catat median/persentil waktu sampai layar siap, waktu
respons interaksi terpilih, dan PSS/memori setelah startup serta setelah alur
catatan/PDF/OCR yang representatif. Simpan tipe perangkat, versi Android,
versi WebView, varian build, dan perintah/alat pengukuran bersama hasilnya.
