# Ide fitur catatan Hara

## Status penerapan bertahap

- **Tahap 1a selesai:** pasangan otomatis untuk `()`, `[]`, `{}`, kutip, dan
  backtick; skip-over, Backspace untuk pasangan kosong, bungkus seleksi, Undo,
  sakelar kurung/kutip, serta pengecualian blok kode/URL dan komposisi IME.
  Uji khusus: 18/18 lulus.
- **Tahap 1b selesai:** saran mengubah paragraf bertanggal di akhir kalimat
  menjadi tugas, hanya setelah tindakan eksplisit dan dengan Undo; mode tempel
  default (format/Markdown/teks polos) dan Shift+Ctrl/⌘+V untuk teks polos.
  Uji kandidat 9/9, UI 7/7, tempel 63/63, parser tenggat 34/34 lulus.
- **Tahap 1c selesai (uji DOM/jsdom):** transformasi blok terseleksi dengan
  pratinjau, batal, dan Undo; daftar berpoin/bernomor, checklist, kutipan,
  callout, tabel dari baris bertab/pipa, serta formulir kartu. Saran wikilink
  hanya muncul setelah jeda dan delimiter, mengecualikan catatan terkunci, dan
  baru mengubah isi setelah persetujuan; Undo tersedia. Uji khusus: transformasi
  26/26 dan saran wikilink 14/14 lulus.
- **Tahap 2 selesai (fungsi lokal & UI):** pemeriksaan kesehatan vault hanya-baca;
  pratinjau pemulihan JSON dengan pilihan per konflik dan default pertahankan
  lokal; pusat lampiran dengan verifikasi ulang serta konfirmasi kedua sebelum
  menghapus blob yatim; riwayat versi mewajibkan tinjau diff dan menolak pratinjau
  basi; serta audit aksesibilitas shell/dialog (nama kontrol, fokus, Escape,
  perangkap Tab, target sentuh 44px pada alat baru). Uji: vault 13/13, pusat
  lampiran 3/3, pratinjau cadangan 4/4, riwayat 4/4, aksesibilitas 18/18.
- **Belum tervalidasi:** pembaca layar/perangkat nyata, menu seleksi
  native/WebView Android, build Android, serta baseline performa N12/N13.
  Uji aksesibilitas saat ini smoke test otomatis jsdom, bukan sertifikasi WCAG;
  N12/N13 tetap butuh perangkat/JDK/SDK dan pengukuran nyata.

Backlog gagasan; belum ada yang dianggap komitmen implementasi. Sinkronisasi
lintas perangkat sengaja tidak dimasukkan di sini. Prinsip prioritas: perkuat
alur menulis, menangkap, dan menemukan catatan sebelum menambah fitur besar baru.

## Catatan cakupan saat ini

Hara sudah memiliki sejumlah mekanik yang jangan dibuat ulang sebagai jalur
kedua: Markdown otomatis untuk tebal/miring/coret/sorot/kode dan blok seperti
judul, kutipan, daftar, todo, callout, serta tag; wikilink; warna teks/sorotan;
pemilih dan studio emoji; pengelolaan gambar; pencarian; serta PDF/OCR. Usulan di
bawah adalah peningkatan yang melengkapi mekanik tersebut.

## Usulan dari diskusi

1. **Inbox + tangkap dari Android Share** — kirim teks, URL, dan gambar dari
   aplikasi lain langsung ke Inbox Hara; simpan asal dan waktu, lalu rapikan ke
   catatan yang tepat. Tangkap cepat di dalam aplikasi tetap menjadi jalur lain.
2. **Backlink + sebutan belum tertaut** — tampilkan catatan yang menaut ke
   catatan aktif dan tawarkan teks yang mungkin merujuk padanya. Sebutan hanya
   menjadi wikilink setelah pengguna menyetujui.
3. **Kutipan PDF dengan sumber** — dari teks yang dipilih, buat kutipan di
   catatan tujuan beserta nama dokumen dan tautan ke halaman asal. Jika teks
   tidak bisa dipilih, sediakan catatan area/halaman yang jelas sebagai fallback.
4. **Poles alur mobile** — pastikan seleksi teks, toolbar, keyboard, tempel, dan
   lampiran nyaman serta konsisten di Android nyata sebelum memperluas editor.

## Pengembangan mekanik yang sudah ada

### P1 — Mesin ketik cerdas, bukan sekadar shortcut baru

Perluas autoformat Markdown yang sudah ada menjadi aturan kecil yang bisa
nyala/mati satu per satu dan selalu aman dibatalkan.

- Pasangan otomatis `()`, `[]`, `{}`, kutip, dan penanda format; mengetik
  karakter penutup yang sudah ada cukup melompati karakter, bukan menggandakan.
- Saran format saat pola dikenali, dengan opsi langsung terapkan atau batalkan;
  jangan mengubah teks yang baru ditempel atau komposisi IME.
- Pemicu pola harus peka konteks: jangan aktif dalam blok kode, URL, teks
  terpilih, atau ketika IME masih menyusun karakter. Sediakan Escape/Undo yang
  mengembalikan teks persis.
- Satu pemicu = satu entri undo yang wajar; pemformatan otomatis tidak boleh
  merusak posisi caret, seleksi, atau spasi.
- Resep aman berbasis data untuk ekspansi teks pilihan pengguna (mis. `;addr`),
  tanpa menjalankan JavaScript bebas.

**MVP yang disarankan:** pasangan kurung/kutip + skip-over, setiap aturan bisa
mati sendiri, dan uji regresi untuk undo/caret/IME/paste. Baru setelah itu tambah
resep ekspansi.

### P1 — Pencarian yang memahami maksud

Tingkatkan pencarian yang ada secara bertahap, tanpa mengharuskan AI atau jaringan.

- Filter ringkas seperti `tag:kuliah`, `has:image`, `is:todo`, rentang tanggal,
  dan layar/jenis catatan; tampilkan filter aktif sebagai chip yang mudah dilepas.
- Hasil mencakup teks OCR yang memang sudah tersedia bila indeksnya ada, dengan
  penanda jelas bahwa kecocokan berasal dari OCR/berkas, bukan teks catatan.
- Toleransi typo dan variasi kata hanya sebagai pemeringkatan/saran, bukan
  menyembunyikan kecocokan literal. Tampilkan cuplikan dengan kata cocok disorot.
- Simpan pencarian terakhir/lokal dan beri saran kueri; jangan mengirim isi
  catatan ke layanan luar.

**MVP:** filter tag + jenis isi + cuplikan yang disorot; ukur relevansi dan
kecepatan pada vault besar sebelum menambah fuzzy search.

### P2 — Gambar lebih siap dipakai sebagai catatan

Manfaatkan galeri dan OCR yang sudah ada, fokus pada kontrol pengguna dan
keterlacakan sumber.

- Potong/putar gambar dengan pratinjau dan undo; simpan transformasi tanpa
  mengubah blob sumber sampai pengguna memilih ekspor hasil olahan.
- Teks alt dan keterangan cepat; OCR lokal opsional dengan kotak hasil yang bisa
  dikoreksi dan tautan kembali ke gambar/halaman sumber.
- Mode tata letak (inline, lebar penuh, berdampingan) yang responsif; ukuran
  sumber dan ukuran tampilan tetap dibedakan.
- Tempel beberapa gambar sekaligus dengan pilihan tata letak, serta kontrol
  kompresi sebelum ekspor/cadangan.

### P2 — Emoji yang lebih ekspresif dan cepat

Tingkatkan pemilih/studio emoji yang ada, jangan menambahkan picker kedua.

- Cari dengan kata kunci, sinonim Indonesia/Inggris/Jepang, dan nama emoji;
  dukung pencarian variasi kulit bila relevan.
- Bagian sering dipakai, favorit, dan emoji terakhir; semua disimpan lokal.
- Ketik `:nama:` untuk menyarankan emoji, tetapi jangan mengganti teks sampai
  ada delimiter dan pilihan eksplisit. Matikan di blok kode/URL.
- Favorit emoji/stiker buatan sendiri dari studio, dengan ekspor/impor yang
  menyertakan metadata dan tidak menggandakan berkas.

### P2 — Warna teks dan sorotan yang konsisten

Bangun di atas pemilih warna dan format teks yang ada.

- Preset semantik (mis. penting, catatan, sukses, peringatan) selain warna bebas;
  preset tetap terbaca pada tema terang/gelap.
- Warna terakhir dan preset favorit, terpisah untuk warna teks dan latar sorot.
- Pemeriksaan kontras aksesibel beserta saran warna; jangan otomatis mengganti
  pilihan pengguna tanpa konfirmasi.
- Perintah "ganti semua warna ini di catatan" untuk merapikan catatan lama,
  dengan pratinjau jumlah perubahan dan satu langkah undo.
- Konsisten saat ekspor Markdown/HTML dan saat menyalin/menempel.

## Daftar ringkas: 15 usulan utama

Submekanik serupa digabungkan di sini agar jumlahnya jelas; daftar prioritas di
bawah mengelompokkan usulan-usulan tersebut menjadi tahapan implementasi.

1. Mesin ketik aman: auto-pair, skip-over, Markdown peka konteks, dan Undo.
2. Resep ekspansi teks pribadi tanpa kode bebas.
3. Saran tugas/pengingat dari kalimat dan tanggal, dengan konfirmasi.
4. Saran wikilink berdasarkan judul catatan.
5. Tempel dengan pilihan teks bersih/Markdown/format asli.
6. Ubah seleksi menjadi daftar, checklist, tabel, kartu, atau callout dengan pratinjau.
7. Saran typo/tanda baca yang menghormati bahasa dan nama.
8. Pencarian lanjutan: filter, cuplikan, penyorotan kecocokan, dan dukungan OCR.
9. Inbox dan tangkap teks/tautan/gambar melalui Android Share.
10. Backlink dan sebutan belum tertaut.
11. Kutipan PDF dengan tautan sumber/halaman.
12. Mekanik gambar: potong/putar, tata letak, alt/OCR, dan kontrol kompresi.
13. Emoji: sinonim multibahasa, favorit/terakhir, dan autocomplete.
14. Warna: preset semantik, kontras, favorit, dan ganti massal dengan Undo.
15. Automasi tanpa kode yang menggabungkan pemicu/kondisi/tindakan dengan pratinjau.

Poles alur mobile adalah gerbang kualitas lintas fitur, bukan salah satu dari 15
usulan fitur di atas.

## Urutan yang disarankan

Urutan ini menggabungkan ide mekanik, automasi, dan fitur pendukung. Tiap tahap
sebaiknya dirilis setelah perilakunya diuji, bukan menumpuk semua perubahan
sekaligus.

0. **Gerbang kualitas rilis:** validasi toolbar/seleksi di WebView Android nyata
   dan kumpulkan baseline performa N13. Ini pekerjaan validasi terpisah dari
   fitur baru, tetapi penting sebelum menyatakan pengalaman mobile siap.
1. **Mekanik mengetik aman:** auto-pair + skip-over + Undo/caret; sakelar per
   aturan; pengecualian kode, URL, paste, dan IME.
2. **Dua automasi bernilai harian:** saran tugas/tanggal dengan konfirmasi, lalu
   pilihan mode tempel (bersih/Markdown/asli) dengan satu Undo.
3. **Organisasi dan transformasi:** ubah seleksi beberapa baris menjadi daftar,
   checklist, tabel, kartu, atau callout dengan pratinjau; sarankan wikilink saat
   judul catatan cocok.
4. **Tangkap dan temukan:** Inbox/Android Share serta filter dan cuplikan hasil
   pencarian. Ukur kecepatan dan relevansi pada vault besar.
5. **Pendalaman konten:** backlink/sebutan belum tertaut, lalu kutipan PDF
   bersumber dan peningkatan gambar/OCR.
6. **Poles ekspresi:** preset warna semantik/kontras, lalu pencarian emoji,
   favorit, dan autocomplete.
7. **Pembuat resep automasi tanpa kode:** baru setelah pemicu dan tindakan dasar
   stabil; mulai dari aturan deklaratif yang bisa dipratinjau dan diurungkan.

Semua autoaksi sebaiknya memiliki sakelar peraturan, indikator yang jelas,
pengecualian konteks (kode/URL/tempel/IME), dan Undo. Untuk fitur pencarian,
OCR, serta ekspor gambar, pertahankan pemrosesan lokal sebagai perilaku bawaan.

## Ide automasi tambahan

Ide berikut melengkapi autoformat yang ada; sebagian harus berupa saran yang
meminta konfirmasi, bukan perubahan diam-diam.

### Peka maksud, tapi minta izin

- **Teks yang tampak seperti tugas/pengingat:** bila baris berisi kata kerja
  tindakan dan tanggal/jam (mis. “kirim laporan besok jam 9”), tawarkan ubah
  menjadi tugas/pengingat dengan tanggal yang dipahami ditampilkan jelas.
  Jangan membuat pengingat hanya dari tebakan; pengguna harus menerima atau
  mengedit hasilnya.
- **Tautan ke catatan yang cocok:** saat pengguna mengetik judul catatan yang
  sudah ada atau menempel judul yang cocok, tampilkan saran untuk menjadikannya
  wikilink. Jangan otomatis menautkan kata umum atau teks dalam blok kode.
- **Rapikan tempelan:** kenali teks kaya dari web/dokumen dan tawarkan tempel
  sebagai teks bersih, Markdown, atau dengan format asli. Pertahankan gambar,
  tautan, serta baris sumber; satu Undo harus membatalkan seluruh operasi.
- **Bentuk ulang seleksi:** pilih beberapa baris lalu tawarkan ubah menjadi
  checklist, daftar bernomor, tabel sederhana, kartu belajar, atau callout.
  Tampilkan pratinjau sebelum mengganti struktur.
- **Koreksi ejaan/tanda baca opsional:** tandai kemungkinan typo atau spasi
  ganda tanpa mengubah teks saat pengguna mengetik. Terapkan lewat saran, dan
  hormati bahasa Indonesia/Inggris/Jepang serta nama/properti catatan.

### Resep automasi tanpa kode

Rancang automasi sebagai aturan deklaratif yang bisa dibaca pengguna:

`Pemicu → kondisi → tindakan → pratinjau → terapkan/urungkan`

Contoh pemicu: Enter, tempel, seleksi, atau simpan. Contoh kondisi: hanya di
paragraf biasa, hanya saat ada tanggal, atau hanya jika pilihan pengguna cocok.
Contoh tindakan: format, tambahkan tag, sisipkan templat, buat wikilink, atau
ubah baris menjadi tugas. Tampilkan aturan mana yang berjalan; hindari loop,
aturan berulang pada hasilnya sendiri, dan pemrosesan teks yang tidak diminta.

**MVP yang disarankan:** saran tugas/tanggal dengan konfirmasi dan pembentukan
ulang beberapa baris dengan pratinjau. Setelah perilakunya teruji, pertimbangkan
editor resep yang lebih umum; jangan mulai dari bahasa skrip atau automasi
bebas yang sulit diaudit.
