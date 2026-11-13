# Roadmap fitur Kalender Hara

**Status:** Tahap 1–4 selesai untuk cakupan yang disetujui. Tahap 5 Pengingat dan notifikasi lokal juga sudah diimplementasikan dan lulus verifikasi otomatis; pengiriman latar perangkat nyata belum diuji dan tidak dijamin.

Dokumen ini mencatat seluruh gagasan Kalender yang telah dibahas agar cakupan dan urutannya tidak hilang. Ini roadmap usulan, bukan janji tanggal rilis. Keputusan cakupan atau perubahan prioritas perlu dicatat sebelum mengubah butirnya.

## Fondasi yang sudah ada

Kalender Hara saat ini sudah memiliki:

- Tampilan bulanan tenggat tugas, termasuk kejadian tugas berulang.
- Pemilihan tanggal dan navigasi bulan.
- Hubungan kalender dengan jurnal harian.
- Impor dan ekspor kalender `.ics`.
- Ringkasan kalender di Beranda.
- Tampilan kalender berbasis properti catatan.

Pekerjaan berikutnya perlu memperluas fondasi ini secara bertahap, bukan membuat layar kalender kedua yang tidak terhubung.

## Prinsip produk dan batas cakupan

1. **Lokal dan privat sebagai bawaan.** Kalender tetap berguna tanpa akun atau koneksi layanan eksternal. Sinkronisasi lintas perangkat bukan prasyarat roadmap ini.
2. **Data tidak berubah diam-diam.** Parsing tanggal, penjadwalan ulang, impor, deduplikasi, dan benturan harus dapat ditinjau atau dibatalkan. Jangan memindahkan atau menghapus acara otomatis.
3. **Pisahkan jenis data.** Acara, tenggat tugas, pengingat, dan jurnal boleh tampil bersama, tetapi sumber dan perilakunya harus tetap jelas.
4. **Pertahankan pertukaran standar.** `.ics` tetap menjadi jalur ekspor/impor utama; perluas dukungannya tanpa membuat data impor menggandakan atau menimpa data tanpa persetujuan.
5. **Rancang mobile-first dan aksesibel.** Kalender harus tetap terbaca serta mudah dioperasikan pada layar kecil, dengan keyboard, pembaca layar, kontras cukup, dan preferensi reduced motion.

## Tahap 1 — Model acara dan fondasi kalender

- [x] Tambahkan **acara kalender mandiri**, terpisah dari tugas yang memiliki tenggat. Model tersimpan bersama snapshot IndexedDB Hara dan ikut cadangan/pemulihan JSON; acara dapat dibuat, diedit, dihapus, dan penghapusan dapat diurungkan.
- [x] Dukung acara sepanjang hari (tanggal akhir inklusif), acara dengan waktu mulai/selesai, dan acara multi-hari.
- [x] Tetapkan model tanggal, waktu, dan zona waktu IANA: tanggal acara sepanjang hari tidak bergeser, waktu acara dijabarkan pada zona pilihannya, dan waktu lokal DST yang tidak ada ditolak.
- [x] Sediakan kategori dengan warna/label (pribadi, kerja, belajar, lainnya); pembedaan tidak mengandalkan warna saja.
- [x] Tambahkan saklar lapisan acara, tenggat/pengingat, dan jurnal.
- [ ] Tambahkan lapisan kalender hasil impor. **Ditunda:** impor `.ics` yang sudah ada masih diubah menjadi to-do, belum menjadi sumber kalender terpisah; dikerjakan bersama Tahap 6 agar pratinjau dan deduplikasi tidak menghasilkan acara ganda.
- [x] Tampilkan satu **panel detail tanggal** untuk acara, tenggat, dan status jurnal terpilih, dengan aksi ke catatan/tugas/jurnal terkait.
- [x] Pertahankan perilaku kalender bulanan, jurnal, dan impor/ekspor `.ics` yang sudah ada; regresi otomatis kalender dan ICS tetap lulus. Dashboard dan kalender properti catatan tidak diubah.

## Tahap 2 — Tampilan, navigasi, dan interaksi

- [x] Pertahankan tampilan **bulan** dan rapikan kontrol, ruang, target sentuh, kepadatan, lapisan, dan detail agar lebih tertata di ponsel.
- [x] Tambahkan tampilan **Agenda** kronologis untuk 30 hari dari tanggal terpilih.
- [x] Tambahkan tampilan **Hari** dan **Minggu** dengan daftar linimasa berwaktu; acara bertanggal seharian dan tenggat tanpa jam tetap ditandai jelas.
- [x] Tambahkan tampilan **Tahun** berupa 12 mini-kalender dengan hitungan agenda dan navigasi ke bulan/tanggal.
- [x] Sediakan navigasi “Hari ini”, pemilih tanggal langsung, dan perpindahan rentang yang mengikuti mode kalender.
- [x] Tambahkan preferensi awal minggu (Senin/Minggu), nomor minggu opsional, dan tanggal sesuai bahasa aplikasi.
- [x] Sediakan kepadatan **Ringkas** dan **Nyaman**, dengan setelan tersimpan lokal.
- [x] Dukung seret-lepas acara mandiri ke tanggal lain pada kalender. Pemindahan meminta konfirmasi dan bisa diurungkan; untuk saat ini tenggat tugas tidak dapat diseret karena tenggatnya bagian dari isi catatan.
- [ ] Seret-lepas **blok waktu tugas** akan mengikuti model penjadwalan tugas Tahap 3; tidak akan mengubah tenggat di catatan tanpa persetujuan eksplisit.
- [x] Tambahkan pencarian judul/deskripsi dan filter jenis agenda serta kategori acara.
- [ ] Filter menurut tag, prioritas, dan rentang tanggal lanjutan belum ada; pencarian saat ini mencakup rentang yang ditampilkan.

## Tahap 3 — Pengaturan jadwal dan produktivitas

- [x] Buat alur tambah acara yang ringkas, dengan templat acara untuk pola umum (misalnya rapat, kelas, olahraga, belajar); pilihan mengisi formulir dan menampilkan pratinjau, tetapi tidak menyimpan sebelum konfirmasi.
- [x] Tambahkan **tambah cepat dengan bahasa alami** untuk tanggal dan waktu, termasuk contoh “rapat Jumat jam 10” dan “bayar tagihan setiap tanggal 5”.
- [x] Parsing menampilkan pratinjau yang bisa diperiksa/diedit di formulir; acara baru tersimpan hanya setelah pengguna mengirim formulir sebagai konfirmasi.
- [x] Dukung pengulangan harian/mingguan/bulanan, hari kerja tertentu, tanggal akhir, melewati satu kejadian, dan aksi seluruh rangkaian.
- [x] Tambahkan **blok waktu tugas**: waktu pengerjaan terpisah dari tenggat; menandai tugas selesai mempertahankan riwayat blok.
- [x] Deteksi bentrok dan hari padat; tampilkan penyebab sebelum konfirmasi, jangan memindahkan agenda otomatis.
- [x] Sediakan waktu persiapan/perjalanan opsional yang ikut diperhitungkan dalam deteksi benturan/kepadatan.
- [x] Tambahkan blok **waktu fokus** yang tidak menghapus acara lain.
- [x] Tampilkan ringkasan mingguan ringan: agenda, tugas tanpa blok, benturan, dan hari dengan beban tinggi beserta penyebabnya.

## Tahap 4 — Integrasi Hara

- [x] Hubungkan satu tanggal terpilih dengan tugas/tenggat, acara, blok jadwal, dan status jurnal dalam panel tanggal yang sama; semua lapisan tetap dapat diatur.
- [x] Dari tanggal, sediakan aksi membuka atau membuat jurnal hari tersebut; dari jurnal, sediakan jalan kembali ke tanggal itu.
- [x] Tautkan acara ke catatan terkait (misalnya agenda rapat atau bahan belajar) dengan menyimpan ID catatan lokal saja, tanpa menyalin isi; tautan tersembunyi/terhapus tidak membocorkan judul.
- [x] Perjelas kalender berbasis properti catatan yang sudah ada: sumbu hanya menerima nilai tanggal ISO `YYYY-MM-DD`, dan kalender hanya membaca—tidak mengubah nilai catatan.
- [x] Kembangkan ringkasan Beranda yang dapat diatur secara lokal: agenda hari ini, tugas terlambat, 3 hari, atau 7 hari mendatang; baris agenda dapat membuka tanggal kalender atau catatan terkait.
- [x] Pastikan menyelesaikan tugas, menunda pengingat, atau mengubah acara menyegarkan tampilan terkait dengan konsisten melalui render ulang layar setelah perubahan.

## Tahap 5 — Pengingat dan notifikasi

- [x] Dukung satu atau beberapa pengingat sebelum acara dengan pilihan waktu yang mudah dipahami; waktu lead dan jam pengingat acara seharian dapat diatur lokal.
- [x] Tambahkan aksi tunda yang praktis: “10 menit lagi”, “nanti hari ini”, dan “besok”.
- [x] Tambahkan jam tenang yang dapat diatur, dengan pengecualian opsional untuk acara penting.
- [x] Pastikan notifikasi tidak menggandakan pengingat lama setelah acara diedit atau dihapus; timer usang dibatalkan, notifikasi bertag, dan status kejadian disaring. Notifikasi yang sudah telanjur ditampilkan sistem mungkin tidak bisa ditarik dan perlu ditutup manual.
- [x] Jelaskan keterbatasan notifikasi latar berdasarkan platform: web dapat menangguhkan tab; Android WebView perlu tetap aktif karena belum ada alarm OS. Pengiriman tepat waktu di latar tidak dijamin dan belum diuji pada perangkat nyata.

## Tahap 6 — Impor, ekspor, dan pemulihan

- [ ] Tingkatkan dukungan `.ics` untuk acara berulang, zona waktu, acara sepanjang hari, dan pembaruan acara.
- [ ] Tampilkan **pratinjau impor** sebelum perubahan diterapkan: jumlah entri, kalender tujuan, kemungkinan duplikat, serta acara yang tidak didukung.
- [ ] Untuk duplikat, tawarkan lewati atau tinjau; jangan menghapus atau menimpa entri otomatis.
- [ ] Izinkan ekspor kalender/lapisan terpilih dan rentang tanggal, tidak hanya seluruh kalender.
- [ ] Perjelas isi berkas ekspor dan sediakan pencadangan lokal yang mudah dipahami.
- [ ] Uji impor berulang agar file yang sama tidak menggandakan acara tanpa disengaja.

## Tahap 7 — Polesan modern, aksesibilitas, dan kepercayaan

- [ ] Gunakan warna dan ikon konsisten untuk jenis kalender, disertai label/teks agar informasi tidak bergantung pada warna saja.
- [ ] Pastikan sasaran sentuh, ukuran teks, dan tata letak ponsel memadai; hindari kontrol kalender yang terlalu padat.
- [ ] Lengkapi label pembaca layar untuk tanggal, jenis acara, status, navigasi, dan aksi.
- [ ] Sediakan alur fokus keyboard yang jelas, pintasan yang terdokumentasi, dan indikator fokus yang terlihat.
- [ ] Hormati preferensi reduced motion dan kontras sistem; periksa kontras pada tema terang/gelap.
- [ ] Tampilkan status kosong, kesalahan, tanggal terpilih, dan hasil impor dengan pesan yang jelas.
- [ ] Jaga data tetap lokal secara default; jelaskan data apa yang masuk ke ekspor. Integrasi layanan eksternal atau sinkronisasi memerlukan keputusan cakupan tersendiri.

## Kriteria penerimaan lintas tahap

- Kalender tetap dapat digunakan offline untuk data lokal.
- Data kalender tugas, jurnal, pengingat, acara mandiri, dan catatan dapat dibedakan serta ditelusuri ke sumbernya.
- Semua perubahan massal atau impor dapat ditinjau sebelum diterapkan; tindakan penting dapat dibatalkan bila memungkinkan.
- Tanggal/waktu diuji untuk batas bulan/tahun, tahun kabisat, zona waktu, DST, dan acara sepanjang hari.
- Uji otomatis mencakup logika tanggal, pengulangan, benturan, impor/ekspor `.ics`, navigasi antartampilan, aksesibilitas dasar, serta responsivitas.
- Klaim perilaku notifikasi, performa, atau dukungan perangkat hanya dibuat setelah benar-benar diuji pada platform terkait.

## Urutan awal yang disarankan

1. Model acara dan lapisan kalender.
2. Agenda dan tampilan hari/minggu, lalu panel detail tanggal.
3. Acara berulang dan tambah cepat dengan pratinjau/konfirmasi.
4. Blok waktu tugas dan deteksi bentrok yang non-destruktif.
5. Pratinjau impor `.ics`, deduplikasi eksplisit, dan ekspor terpilih.
6. Notifikasi, aksesibilitas, dan polesan mobile setelah perilaku inti stabil.
