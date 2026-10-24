# Pemahaman Mendalam: 32 Ide Fitur Catatan

> Dokumen sementara. Isinya pemahaman, **bukan rancangan implementasi**. Belum ada kode yang diubah.
> Status Hara mengacu pada pemeriksaan kode sebelumnya (lihat `penerapan-konsep-fitur-catatan.md`).
> Keterangan FreeNotes diambil dari halaman publik (App Store, Google Play, ulasan, dan perbandingan).
> Perbandingan dengan Goodnotes berasal dari Goodnotes sendiri, jadi bisa bias.

## Gambaran besar

Ada tiga lapisan ide, dan lapisan ini penting untuk urutan kerja nanti:

1. **Fondasi data tulisan tangan dan kertas.** Coretan disimpan sebagai data jejak (titik dan goresan), bukan gambar mati. Ini menjadi dasar untuk layer, pena preset, pengenalan bentuk, penghapusan, dan OCR.
2. **Dokumen dan media.** PDF dan video perlu penampil sendiri, lalu anotasi atau tangkapan layar ditumpuk di atasnya.
3. **Belajar dan organisasi.** Banyak fitur di sini (tutup-buka teks, flashcard, mode ujian) sebenarnya memakai fondasi lapisan 1 dan 2.

Ketergantungan antar-ide (ringkas):
- A5 (layer) dan A3 (pena preset) bergantung pada data jejak.
- C6 (active recall tape) bisa memakai layer dari A5.
- C7 (flashcard) bergantung pada C6 atau pada pemilihan teks.
- C8 (pusat ujian) bergantung pada C5, C6, C7, dan C9.
- B5 dan B6 (pencarian) bergantung pada indeks teks, dan B6 membutuhkan OCR.
- C3 dan C4 (video) bergantung pada pemutar video dan batas keamanan sumber video.

---

## Kelompok A: Handwriting, drawing, kertas, dan kanvas

### A1. Handwriting dan drawing
- **Pemahaman:** pengguna menulis dan menggambar langsung di halaman dengan jari atau stylus, bukan hanya mengetik.
- **Di FreeNotes:** pena yang sensitif tekanan, dukungan Apple Pencil Pro, dan penolakan telapak tangan ([1](https://play.google.com/store/apps/details?id=ai.note.notepad.memo.journal.freenote&hl=en_US), [8](https://www.goodnotes.com/blog/goodnotes-vs-freenotes)).
- **Di Hara:** sketsa sudah ada, tetapi terpisah dari teks. Hasilnya disisipkan sebagai gambar.
- **Yang belum jelas:** apakah yang diminta adalah coretan sebagai blok terpisah (seperti sketsa sekarang, tetapi bisa diedit ulang), atau tulisan tangan yang mengalir di dalam paragraf.

### A2. Kertas digital, anotasi, dan elemen visual
- **Pemahaman:** halaman terasa seperti kertas (ada latar, tekstur, dan garis), lalu di atasnya bisa ditambah anotasi dan elemen visual seperti bentuk, stiker, atau gambar.
- **Di FreeNotes:** latar kertas yang dapat dipilih, plus alat anotasi di atas dokumen ([1](https://play.google.com/store/apps/details?id=ai.note.notepad.memo.journal.freenote&hl=en_US)).
- **Di Hara:** latar titik dan garis sudah ada di sketsa. Elemen visual yang bisa diletakkan bebas belum ada.
- **Yang belum jelas:** apakah elemen visual harus bisa dipindah dan diubah ukurannya secara bebas, atau cukup ditempatkan di alur.

### A3. Custom pen dan brush (buat, atur, simpan preset)
- **Pemahaman:** pengguna membuat gaya pena sendiri, misalnya ketebalan, warna, transparansi, bentuk ujung, dan respons tekanan. Gaya itu bisa disimpan dan dipakai lagi.
- **Di FreeNotes:** ada gaya pena khusus untuk anotasi PDF ([3](https://apps.apple.com/us/app/freenotes-ai-notes-taking/id6464237904)).
- **Di Hara:** alat pena hanya satu jenis.
- **Yang belum jelas:** apakah preset disimpan per perangkat atau ikut data catatan.

### A4. Shape recognition
- **Pemahaman:** coretan kasar lingkaran, garis, atau persegi dikenali lalu diganti bentuk geometris yang rapi.
- **Di FreeNotes:** fitur ini ada, dan bentuk hati ditambahkan di versi terbaru ([20](https://apps.apple.com/us/app/freenotes-ghi-ch%C3%BA-ai-pdf/id6464237904?l=vi&platform=mac)).
- **Yang belum jelas:** cara pemicunya. Apakah langsung saat selesai menggambar, atau harus ditahan dulu? Juga apakah bentuk yang diakui hanya tiga (lingkaran, garis, persegi) atau lebih.
- **Catatan:** pengenalan bentuk bisa dibuat secara lokal tanpa pustaka berat, karena bentuk dasar cukup dihitung dari titik-titik jejak.

### A5. Layer system
- **Pemahaman:** setiap elemen (tulisan, coretan, gambar) berada di lapisan sendiri. Lapisan bisa disembunyikan, dikunci, atau diurutkan ulang, sehingga elemen bisa diedit tanpa mengganggu yang lain.
- **Di FreeNotes:** layer dipakai di Exam Prep Center untuk berlatih ujian tanpa mengimpor ulang berkas ([1](https://play.google.com/store/apps/details?id=ai.note.notepad.memo.journal.freenote&hl=en_US)). Ini menarik, karena layer bukan hanya untuk menata gambar, tetapi juga untuk menyembunyikan jawaban.
- **Di Hara:** sketsa menghasilkan satu gambar, jadi layer belum mungkin tanpa mengubah cara penyimpanan.

### A6. Zoomable canvas
- **Pemahaman:** pengguna bisa memperbesar untuk menulis detail dan memperkecil untuk melihat seluruh halaman. Ini berbeda dengan kanvas tak terbatas: di sini ukurannya tetap ada batas.
- **Di FreeNotes:** daftar fitur menyebut "infinite canvas", yang lebih luas dari yang kamu minta ([5](https://mwm.ai/apps/freenotes-ai-notes-taking/6464237904)).
- **Catatan:** Hara sengaja tidak membuat kanvas tak terbatas. Jadi zoom dengan batas adalah kompromi yang sesuai.

### A7. Resizable canvas
- **Pemahaman:** batas halaman bisa diseret untuk memperluas area kerja. Jadi ukuran halaman tidak tetap.
- **Yang belum jelas:** apakah batasnya bebas (seperti kanvas), atau hanya bertambah per langkah. Ada juga pertanyaan apakah ukuran halaman disimpan per halaman.
- **Hubungan dengan A6:** keduanya berkaitan dengan sistem koordinat kanvas dan ukuran maksimum.

### A8. Landscape workspace
- **Pemahaman:** saat perangkat dipegang mendatar, tata letak editor berubah. Misalnya toolbar pindah ke samping dan area tulis melebar.
- **Yang belum jelas:** perubahan apa yang diinginkan. Ini bisa sekadar posisi toolbar, atau tampilan dua kolom.

### A9. Pinned toolbar tools
- **Pemahaman:** pengguna memilih alat favorit dan menyematkannya di toolbar, sehingga alat yang sering dipakai selalu terlihat.
- **Di Hara:** ada konfigurasi bar bawah dan pintasan keyboard. Sematan alat yang bisa diatur pengguna belum dicek secara lengkap.
- **Hubungan dengan D3:** keduanya tentang akses cepat. Bedanya, A9 fokus pada alat tulis, D3 pada fitur utama aplikasi.

---

## Kelompok B: Dokumen dan navigasi

### B1. PDF import dan anotasi
- **Pemahaman:** PDF dibuka sebagai halaman yang bisa dibaca, lalu pengguna menulis, menyorot, menggarisbawahi, dan menambah komentar di atasnya. Hasil anotasi disimpan bersama dokumen.
- **Di FreeNotes:** anotasi PDF memakai alat tulis aplikasi ([4](https://beingpaperless.com/freenotes-for-the-ipad-complete-review/), [8](https://www.goodnotes.com/blog/goodnotes-vs-freenotes)). Ekspor PDF yang sudah dianotasi juga disebut ([8](https://www.goodnotes.com/blog/goodnotes-vs-freenotes)).
- **Di Hara:** blok lampiran PDF sudah ada, tetapi hanya disimpan dan dibuka, tanpa penampil dan tanpa anotasi.
- **Catatan:** ini butuh pustaka penampil PDF yang cukup besar, jadi harus dimuat malas.

### B2. PDF page management
- **Pemahaman:** halaman dokumen bisa diatur: disusun ulang, dipindah, dihapus, disisipkan, atau digandakan.
- **Di FreeNotes:** disebut dalam perbandingan sebagai "rearrange and manage PDF pages" ([8](https://www.goodnotes.com/blog/goodnotes-vs-freenotes)).
- **Hubungan:** bergantung pada B1.

### B3. Internal hyperlinks
- **Pemahaman:** tautan dari satu bagian menuju halaman atau bagian tertentu dalam dokumen yang sama. Contohnya daftar isi yang bisa diklik.
- **Di FreeNotes:** ada tautan navigasi, termasuk PDF hyperlink dan outline ([8](https://www.goodnotes.com/blog/goodnotes-vs-freenotes), [19](https://apps.apple.com/iq/app/freenotes-%D9%85%D9%84%D8%A7%D8%AD%D8%B8%D8%A7%D8%AA-ai-%D9%88-pdf/id6464237904?l=ar&platform=ipad)).
- **Di Hara:** tautan ke catatan, blok, dan heading sudah ada. Yang belum adalah tautan ke halaman tertentu dalam dokumen (PDF atau halaman kanvas).

### B4. External hyperlinks
- **Pemahaman:** tautan ke situs web atau sumber luar, bisa dipasang pada teks maupun objek tulisan atau gambar.
- **Di Hara:** tautan web sudah ada, dan kartu tautan (bookmark) juga ada. Yang kurang adalah kemampuan menautkan objek gambar atau coretan.

### B5. Document search
- **Pemahaman:** pencarian kata di dalam dokumen dan anotasi, sehingga catatan tulisan di atas PDF bisa ditemukan.
- **Di FreeNotes:** pencarian mencakup tulisan tangan, teks ketikan, PDF, dan folder ([8](https://www.goodnotes.com/blog/goodnotes-vs-freenotes)).
- **Di Hara:** pencarian teks sudah ada. Yang belum adalah isi anotasi, karena anotasi belum ada.

### B6. OCR search
- **Pemahaman:** teks dalam tulisan tangan atau gambar dikenali, lalu diindeks agar bisa dicari. Ada dua bagian: pengenalan (OCR) dan pengindeksan.
- **Di FreeNotes:** pencarian tulisan tangan lewat OCR disebut sebagai fitur utama ([3](https://apps.apple.com/us/app/freenotes-ai-notes-taking/id6464237904)). Ulasan pengguna juga menyebut bahwa pencarian kata tulisan tangan sangat dibutuhkan ([12](https://apps.apple.com/sg/app/freenotes-ai-notes-docs-pdf/id6464237904)).
- **Yang perlu dipikirkan:** OCR di browser memerlukan model dan pustaka yang besar. Ini bertentangan dengan batas bundel awal, sehingga harus dimuat malas dan kinerjanya perlu diuji di Android.
- **Yang belum jelas:** apakah OCR harus jalan sepenuhnya offline, dan apakah boleh memakai layanan luar.

### B7. Custom paper templates
- **Pemahaman:** pengguna memilih templat halaman seperti grid, dotted, Cornell, dan bergaris, lalu bisa membuat templat sendiri.
- **Di FreeNotes:** grid, Cornell, dan dotted disebut langsung ([3](https://apps.apple.com/us/app/freenotes-ai-notes-taking/id6464237904)).
- **Cornell itu apa:** halaman dibagi tiga bagian, yaitu kolom catatan (kanan, lebar), kolom petunjuk atau pertanyaan (kiri, sempit), dan ringkasan di bawah. Ini dirancang untuk belajar aktif, karena pengguna bisa menutup kolom catatan lalu menjawab dari petunjuk ([14](https://athenify.io/blog/cornell-note-taking-method)).
- **Di Hara:** templat teks sudah ada, dan latar titik dan garis ada di sketsa. Grid dan Cornell belum ditemukan.

### B8. Digital planner navigation
- **Pemahaman:** planner adalah buku berisi banyak halaman (tahunan, bulanan, mingguan, harian). Pengguna berpindah antarbagian dengan tautan, misalnya dari sel tanggal di kalender langsung ke catatan harian dan kembali lagi.
- **Di FreeNotes:** navigasi planner lewat tautan yang bisa diklik, baik internal maupun eksternal ([19](https://apps.apple.com/iq/app/freenotes-%D9%85%D9%84%D8%A7%D8%AD%D8%B8%D8%A7%D8%AA-ai-%D9%88-pdf/id6464237904?l=ar&platform=ipad)).
- **Di Hara:** kalender dan jurnal harian sudah ada. Yang belum adalah tautan langsung dari sel kalender ke halaman harian yang bisa dibuat otomatis.

---

## Kelompok C: Audio dan pembelajaran

### C1. Voice recording
- **Pemahaman:** merekam kuliah, rapat, atau ide langsung dari dalam catatan, tanpa berpindah aplikasi.
- **Di FreeNotes:** rekaman rapat disebut sebagai fitur ([3](https://apps.apple.com/us/app/freenotes-ai-notes-taking/id6464237904)).
- **Di Hara:** blok memo suara sudah ada dan memakai `MediaRecorder`, serta menyimpan ke IndexedDB. Yang perlu dicek adalah apakah rekaman bisa berjalan bersamaan dengan menulis, dan apakah cukup stabil di Android.

### C2. Audio-linked transcription
- **Pemahaman:** teks hasil transkripsi (atau tulisan tangan) menyimpan waktu saat ditulis. Ketuk sebuah teks, dan audio langsung berputar dari momen itu. Ini cara mencari bagian kuliah yang relevan tanpa mendengarkan semuanya.
- **Yang perlu dipahami:** ada dua bagian. Pertama, transkripsi berkas audio, yang butuh model pengenalan ucapan dan biasanya berat. Kedua, penanda waktu, yang lebih ringan.
- **Di FreeNotes:** menurut perbandingan Goodnotes, FreeNotes tidak menyinkronkan tulisan tangan dengan garis waktu rekaman, dan hanya audio yang disimpan bersama catatan ([8](https://www.goodnotes.com/blog/goodnotes-vs-freenotes)). Ini sumber pihak lain, jadi perlu dikonfirmasi. Berarti ide ini bisa lebih maju daripada FreeNotes.
- **Di Hara:** dikte (STT) sudah ada, tetapi hanya untuk mengetik, belum untuk transkripsi file audio dan penanda waktu.

### C3. Picture-in-picture learning
- **Pemahaman:** video tetap berjalan di jendela kecil yang mengambang, sementara pengguna menulis di bawahnya.
- **Di FreeNotes:** PiP untuk video online dan rekaman kuliah disebut langsung ([2](https://play.google.com/store/apps/details?id=ai.note.notepad.memo.journal.freenote&hl=en_US)).
- **Catatan teknis:** di web, PiP bawaan browser hanya untuk elemen video. Jendela mengambang buatan sendiri bisa dibuat, tetapi perilakunya di Android lewat Capacitor perlu diuji.
- **Batas penting:** video dari YouTube lewat iframe tidak bisa diambil gambarnya karena pembatasan lintas-asal dan DRM. Video berkas lokal atau URL langsung bisa.

### C4. Video screenshot capture
- **Pemahaman:** pada momen tertentu, bingkai (frame) video diambil dan langsung disisipkan ke catatan.
- **Di FreeNotes:** tangkapan layar langsung dari video disebut ([8](https://www.goodnotes.com/blog/goodnotes-vs-freenotes)) dan ([2](https://play.google.com/store/apps/details?id=ai.note.notepad.memo.journal.freenote&hl=en_US)).
- **Batas:** sama seperti C3, sumber video harus bisa diakses dari halaman sendiri. Ini bergantung pada jenis sumber.

### C5. Course learning view
- **Pemahaman:** layar terbagi dua: kiri berisi materi (PDF, video, atau halaman web), kanan berisi catatan. Susunan ini bisa disimpan per mata kuliah.
- **Di FreeNotes:** tampilan split-screen untuk materi dan catatan disebut ([2](https://play.google.com/store/apps/details?id=ai.note.notepad.memo.journal.freenote&hl=en_US)).
- **Di Hara:** ada beberapa tampilan (Tugas, Kalender, Papan), tetapi belum ada tampilan berdampingan untuk belajar.
- **Yang perlu dipahami:** di HP layar sempit, tampilan dua kolom mungkin hanya nyaman saat landscape. Ini terkait dengan A8.

### C6. Active recall tape
- **Pemahaman:** bagian tertentu ditutup dengan "selotip" virtual (garis lurus, persegi, atau coretan bebas, dengan pola dan warna). Pengguna mengetuk untuk membuka dan menutup lagi, lalu menguji ingatannya.
- **Di FreeNotes:** tape bisa berupa garis, persegi, atau coretan bebas, dan bisa dibuka atau ditutup kembali. Ada juga opsi untuk membuka atau menutup semua tape sekaligus ([4](https://beingpaperless.com/freenotes-for-the-ipad-complete-review/), [8](https://www.goodnotes.com/blog/goodnotes-vs-freenotes)).
- **Di Hara:** belum ada. Versi sederhana untuk teks bisa dibuat dengan menandai rentang teks sebagai tersembunyi, dan versi untuk tulisan atau gambar memerlukan layer.
- **Catatan:** ini sesuai dengan prinsip mengingat aktif, yaitu menjawab dari ingatan sebelum melihat jawabannya ([14](https://athenify.io/blog/cornell-note-taking-method)).

### C7. Flashcard generation
- **Pemahaman:** membuat kartu belajar (depan dan belakang) dari materi catatan. Kartu bisa dibuat dari teks yang dipilih atau dari area yang ditutup dengan tape.
- **Di FreeNotes:** flashcard dibuat langsung dari halaman catatan ([19](https://apps.apple.com/iq/app/freenotes-%D9%85%D9%84%D8%A7%D8%AD%D8%B8%D8%A7%D8%AA-ai-%D9%88-pdf/id6464237904?l=ar&platform=ipad)).
- **Yang belum jelas:** apakah kartu juga perlu sistem pengulangan berjarak (spaced repetition), atau cukup kartu yang bisa dibolak-balik.

### C8. Exam preparation center
- **Pemahaman:** ruang belajar khusus untuk simulasi ujian. Isinya materi, timer, layer untuk menyembunyikan jawaban, dan tampilan terpisah.
- **Di FreeNotes:** ada materi ujian bawaan, timer, layer, dan split-screen untuk latihan tanpa mengimpor ulang berkas ([1](https://play.google.com/store/apps/details?id=ai.note.notepad.memo.journal.freenote&hl=en_US)).
- **Yang belum jelas:** materi ujian berasal dari mana. Dari catatan pengguna sendiri, atau disediakan aplikasi? Kamu hanya menyebut "ruang khusus dengan materi", jadi ini perlu diperjelas nanti.

### C9. Focus timer
- **Pemahaman:** timer untuk sesi belajar, dengan fokus pada tugas tertentu. Ini berbeda dari stopwatch biasa, karena timer dikaitkan dengan tugas.
- **Di FreeNotes:** timer bisa diletakkan di mana saja di layar dan tetap tegak ([4](https://beingpaperless.com/freenotes-for-the-ipad-complete-review/)).
- **Di Hara:** tugas dengan tenggat sudah ada, sehingga timer bisa dikaitkan dengan tugas itu.
- **Yang belum jelas:** jenis timer. Apakah hitung mundur, pomodoro (kerja dan istirahat bergantian), atau stopwatch.

### C10. Study ambience
- **Pemahaman:** audio latar, misalnya hujan, kafe, atau white noise, yang diputar saat belajar.
- **Di Hara:** ada modul Musik yang terpisah dari catatan. Modul itu bisa dipakai ulang sebagai pemutar.
- **Catatan lisensi:** sumber audio latar harus punya lisensi yang sesuai. Dari riset sebelumnya, beberapa penyedia musik gratis hanya boleh untuk non-komersial, jadi sumbernya perlu dipilih hati-hati.

---

## Kelompok D: Organisasi dan penyimpanan

### D1. Project atau course-based organization
- **Pemahaman:** catatan dikelompokkan berdasarkan proyek, mata pelajaran, atau topik. Pengelompokan bisa bertingkat, misalnya mata pelajaran lalu bab.
- **Di FreeNotes:** folder untuk mengelompokkan berdasarkan proyek, mata pelajaran, atau topik ([14](https://freenotes-notes-taking-pdf.soft112.com/)). Ulasan pengguna juga menginginkan folder di dalam folder ([12](https://apps.apple.com/sg/app/freenotes-ai-notes-docs-pdf/id6464237904)).
- **Di Hara:** ruang (folder), tag, dan Smart Folder sudah ada. Apakah ruang bisa bertingkat perlu dicek, karena sejauh yang saya baca sebelumnya susunannya tampak datar.

### D2. Cloud sync (iCloud atau Google Drive)
- **Pemahaman:** catatan tersinkron antarperangkat lewat layanan awan.
- **Yang perlu dipikirkan:**
  - iCloud hanya ada di Apple. Hara berjalan di web dan Android, jadi iCloud tidak relevan. Google Drive lebih masuk akal.
  - Hara bersifat local-first. Sinkronisasi cloud direncanakan lewat Supabase dan outbox di fase berikutnya, dan sinkronisasi berbasis berkas dengan sengaja ditolak.
  - Ini bertentangan dengan rencana sebelumnya, jadi perlu diputuskan.
- **Di FreeNotes:** sinkronisasi dan cadangan disebut dalam deskripsi aplikasi ([15](https://freenotes-ai-notes-docs-pdf.en.uptodown.com/ios)).

### D3. Quick access tools
- **Pemahaman:** fitur utama bisa dipanggil cepat lewat toolbar atau pintasan, misalnya membuat catatan baru, mencari, merekam, atau memotret.
- **Di Hara:** bar bawah dan pintasan keyboard sudah ada. Pintasan yang dibuat sendiri oleh pengguna belum ada.
- **Hubungan:** berkaitan dengan A9. Yang satu fokus pada alat tulis, yang lain pada fitur utama.

### D4. Web content capture
- **Pemahaman:** isi halaman web (atau ringkasannya) disimpan sebagai bahan catatan. Bisa berupa teks bersih, judul, dan sumber.
- **Di FreeNotes:** ada fitur ringkasan dari dokumen atau tangkapan layar ([1](https://play.google.com/store/apps/details?id=ai.note.notepad.memo.journal.freenote&hl=en_US)). Pengambilan halaman web tidak disebut secara jelas.
- **Yang perlu dipikirkan:**
  - Browser memblokir pengambilan halaman dari situs lain (pembatasan lintas-asal). Diperlukan proxy, layanan di server, atau fitur native lewat Capacitor.
  - Ringkasan memerlukan pemrosesan teks, dan jika memakai AI, harus dicek kebijakan offline-nya.
- **Di Hara:** baru ada kartu tautan manual.

### D5. Shortcut integration
- **Pemahaman:** pengguna bisa membuat atau mencari catatan lewat pintasan sistem atau asisten perangkat, tanpa membuka aplikasi dulu.
- **Yang perlu dipikirkan:**
  - Aplikasi web tidak bisa langsung masuk ke asisten suara. Diperlukan integrasi native lewat Capacitor, atau pintasan aplikasi Android.
  - `docs/PLAN.md` menyebut bahwa Hara adalah APK lewat Capacitor, bukan PWA. Jadi pintasan manifest PWA tidak menjadi jalur utama.
  - Berbagi ke Hara dari aplikasi lain (share target) sudah direncanakan di `docs/NOTES.md`, dan ini bagian dari ide ini.

---

## Yang belum jelas dan perlu kamu putuskan nanti

Saya tidak menanyakannya sekarang karena kamu minta pemahaman dulu. Ini daftar pertanyaan terbuka:

1. **Tulisan tangan (A1):** coretan sebagai blok, atau tulisan yang mengalir di paragraf?
2. **Layer (A5) dan kanvas (A6, A7):** batas ukuran kanvas, dan apakah layer dipakai juga untuk ujian (C8)?
3. **Pengenalan bentuk (A4):** pemicunya dan bentuk apa saja yang didukung?
4. **PDF (B1, B2):** cukup tampil dan anotasi, atau juga manajemen halaman?
5. **OCR (B6):** offline penuh, atau boleh layanan luar?
6. **Audio (C2):** transkripsi berkas audio, atau cukup penanda waktu untuk rekaman?
7. **Belajar (C6, C7, C8):** apakah flashcard perlu pengulangan berjarak?
8. **Timer (C9):** hitung mundur, pomodoro, atau stopwatch?
9. **Sinkronisasi (D2):** apakah tetap Supabase di fase 8, atau ada layanan lain?
10. **Materi ujian (C8):** dari catatan pengguna, atau disediakan aplikasi?

## Catatan jujur tentang keterbatasan saya
- Semua keterangan FreeNotes berasal dari halaman publik, bukan dari mencoba aplikasinya.
- Perbandingan Goodnotes bisa bias.
- Pemahaman tentang Hara berdasarkan pembacaan kode sebelumnya, bukan pengujian.
- Tidak ada perubahan pada kode atau repo.
