# Roadmap fitur Kalender Hara

**Status:** rencana — belum ada butir di dokumen ini yang dimulai sebagai pekerjaan implementasi.

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

- [ ] Pertahankan tampilan **bulan** yang ada dan tingkatkan keterbacaan kepadatan acara.
- [ ] Tambahkan tampilan **Agenda** sebagai daftar kronologis kegiatan mendatang.
- [ ] Tambahkan tampilan **Hari** dan **Minggu** berbentuk garis waktu, dengan rentang waktu dan durasi yang terlihat.
- [ ] Tambahkan tampilan **Tahun** berupa ringkasan 12 bulan untuk melihat tanggal penting dan tingkat kepadatan.
- [ ] Sediakan navigasi “Hari ini”, pemilih tanggal langsung, dan perpindahan hari/minggu/bulan yang konsisten.
- [ ] Tambahkan preferensi awal minggu (Senin atau Minggu), nomor minggu opsional, dan pengaturan tampilan tanggal/waktu yang mengikuti locale.
- [ ] Buat mode **ringkas** dan **nyaman** untuk bulan agar tetap mudah dibaca di layar ponsel.
- [ ] Dukung seret-lepas untuk memindahkan acara atau tugas terjadwal; selalu sediakan konfirmasi/urungkan dan jangan mengubah tenggat sumber tanpa persetujuan.
- [ ] Tambahkan pencarian serta filter kalender berdasarkan kata kunci, lapisan, kalender, tag, prioritas, dan rentang tanggal.

## Tahap 3 — Pengaturan jadwal dan produktivitas

- [ ] Buat alur tambah acara yang ringkas, dengan templat acara untuk pola umum (misalnya rapat, kelas, olahraga, belajar).
- [ ] Tambahkan **tambah cepat dengan bahasa alami** untuk tanggal dan waktu, misalnya “rapat Jumat jam 10” atau “bayar tagihan setiap tanggal 5”.
- [ ] Parsing bahasa alami harus menampilkan ringkasan hasil dan menunggu konfirmasi pengguna sebelum menyimpan; sediakan cara memperbaiki hasil yang keliru.
- [ ] Dukung pengulangan mingguan/bulanan, hari kerja tertentu, tanggal akhir, dan pengecualian satu kejadian atau seluruh rangkaian.
- [ ] Tambahkan **blok waktu tugas**: jadwalkan waktu pengerjaan terpisah dari tenggat tugas. Menandai tugas selesai tidak boleh menghapus riwayat jadwalnya.
- [ ] Tambahkan deteksi bentrok waktu dan peringatan jadwal terlalu padat; tampilkan penyebabnya, jangan memindahkan acara otomatis.
- [ ] Sediakan waktu persiapan/perjalanan opsional sebagai blok terkait acara.
- [ ] Tambahkan blok **waktu fokus** yang tidak menghapus acara lain dan dapat disesuaikan pengguna.
- [ ] Tampilkan ringkasan mingguan yang ringan: agenda mendatang dan tugas yang belum memiliki blok pengerjaan.

## Tahap 4 — Integrasi Hara

- [ ] Hubungkan satu tanggal terpilih dengan tugas, tenggat, pengingat, acara, dan jurnal dalam panel tanggal yang sama.
- [ ] Dari tanggal, sediakan aksi membuka atau membuat jurnal hari tersebut; dari jurnal, sediakan jalan kembali ke tanggal itu.
- [ ] Tautkan acara ke catatan terkait (misalnya agenda rapat atau bahan belajar) tanpa menyalin isi catatan ke kalender.
- [ ] Perluas kalender berbasis properti catatan yang sudah ada: aturan pemetaan tanggal dan sumbu kalender harus jelas serta tetap non-destruktif.
- [ ] Kembangkan ringkasan Beranda yang dapat diatur: agenda hari ini, tugas terlambat, atau beberapa hari mendatang.
- [ ] Pastikan menyelesaikan tugas, menunda pengingat, atau mengubah acara menyegarkan tampilan terkait dengan konsisten.

## Tahap 5 — Pengingat dan notifikasi

- [ ] Dukung satu atau beberapa pengingat sebelum acara dengan pilihan waktu yang mudah dipahami.
- [ ] Tambahkan aksi tunda yang praktis: “10 menit lagi”, “nanti hari ini”, dan “besok”.
- [ ] Tambahkan jam tenang yang dapat diatur, dengan pengecualian opsional untuk acara penting.
- [ ] Pastikan notifikasi tidak menggandakan pengingat lama setelah acara diedit atau dihapus.
- [ ] Jelaskan keterbatasan notifikasi latar berdasarkan platform; jangan menjanjikan pengiriman tepat waktu sebelum diuji pada perangkat nyata.

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
