# Roadmap & catatan rilis — Hara

> Riwayat ronde: apa yang selesai, apa yang ditunda. Butir yang DITUNDA
> (D18, E22–E24) tetap terbuka sampai diminta — bukan pekerjaan yang jalan
> sendiri. Rencana jangka panjang ada di `docs/PLAN.md`.

## Bagian A — prioritas cepat (SELESAI)
- [x] A1. Atur ukuran teks saat membaca (A−/A+) — 15–24px, tersimpan, mode baca & tulis
- [x] A2. Mode fokus/zen (tulis tanpa gangguan) — Esc / bulatan kanan-bawah untuk keluar
- [x] A3. Cari di dalam catatan (find-in-note, mode baca) — sorot semua + lompat hasil
- [x] A4. Semat/pin catatan ke atas daftar — menu ··· + tombol pin di baris
- [x] A5. Bagikan catatan (Web Share + salin) — lewat menu ···
- [x] A6. Pilih warna aksen di Pengaturan — 5 pilihan, terang & gelap

## Bagian B — organisasi & produktivitas
- [x] B7. Urutkan & filter daftar catatan (terakhir diedit / dibuat / A–Z / per-tag)
- [x] B8. Daftar isi otomatis dari heading, ketuk untuk lompat
- [x] B9. Tenggat pada todo → muncul di layar Tugas/Reminder
- [x] B10. Tag berwarna (label)
- [x] B11. "Jadikan templat" dari catatan yang sedang dibuka
- [x] B12. Catatan harian / jurnal (tombol catatan hari ini)
- [x] B13. Aksi cepat "/" tambahan

## Bagian C — gambar & media
- [x] C14. Ganti gambar (tanpa mengubah posisi/ukuran/rotasi)
- [x] C15. Sisipkan ulang gambar dari galeri catatan
- [x] C16. Thumbnail gambar di daftar catatan
- [x] C17. Pilihan mutu/kompresi gambar di Pengaturan (hemat/seimbang/tinggi/tanpa kompresi) — berlaku untuk sisipan baru

## Bagian D — ketenangan pikiran & keandalan
- [ ] D18. Riwayat versi catatan (snapshot lintas sesi) — tidak perlu dulu (keputusan pengguna)
- [x] D19. Kunci catatan per-catatan (PIN 1–4 digit; sidik jari perangkat bila lupa PIN)
- [x] D20. Tombol "Unduh cadangan" di Pengaturan
- [x] D21. Sapuan hapus/arsip di daftar catatan

## Bagian E — lebih besar (nanti)
- [ ] E22. Sinkronisasi antar-perangkat (WebDAV/Drive/server)
- [ ] E23. Tabel (tunggu fondasi stabil)
- [ ] E24. Widget / pintasan layar kunci

## Bagian F — ronde 7 (SELESAI)
- [x] F25. Pilih banyak catatan: tahan-lama di baris, bilah mini, aksi sekaligus (semat/arsip/hapus)
- [x] F26. Pencarian lebih tajam: operator tag:/judul:, sorot hasil, riwayat pencarian
- [x] F27. Bilah format di atas teks yang disorot (tebal/miring/sorot/kode/warna/tautan/hapus format)

## Bagian G — ronde 8 (SELESAI)
- [x] G28. Tempel dari luar aplikasi ikut mekanik: "1. / 2. / 3." jadi daftar bernomor,
      butir & to-do, heading, kutipan, callout, pembatas, pagar kode ``` ```,
      dan tautan (https://…, www.…, surel, [teks](alamat), <alamat>) jadi tautan a.lk

## Bagian H — ronde 9 (SELESAI)
- [x] H29. Tempelan dari luar benar-benar berderet: batas baris ditentukan `<br>`
      DAN elemen blok di kedalaman mana pun (dulu `<div>1. a<br>2. b</div>` jadi
      satu baris "1. a 2. b"), kalimat yang sudah ada tidak ditelan jadi butir
      pertama ("…kalimat" + "1. Halo / 2. Dunia" → kalimat utuh, daftarnya di
      bawahnya bernomor 1-2), baris ber-markup tetap ikut mekanik (nomor tebal),
      daftar bersarang & indentasi `&nbsp;` jadi indentasi Hara, kotak centang
      dari halaman lain jadi to-do, dan baris tunggal berjenis di blok kosong
      langsung jadi blok jenisnya (seperti mengetik "1. ") sementara di tengah
      kalimat penandanya tidak dibuang.

## Bagian I — ronde 10 (SELESAI, bersih-bersih)
- [x] I30. Bersih-bersih repo: kode mati dibuang (19 ekspor/fungsi: `$`, `$$`,
      `isInggris`, `BUKA_TAGWARNA`, `fontLekat`/`adaPendingNone`/`modeBawaan`/
      `fontPerluKeluar`, `adaPendingHapusSorot`/`reBungkusSorotanLekat`/
      `sorotPerluKeluar`, `adaPendingHapus`/`modeBawaanWarna`/`reBungkusLekat`/
      `warnaPerluKeluar`, `varianJudulJurnalHari`, `bilaTenggat`, `tutupSwipe`,
      `kueriCariSekarang`), CSS mati (`.emb`, `.emb-h`, `.row-kunci`), dan 3 ikon
      SVG yang tak dirujuk (`i-tbl`, `i-restore`, `i-ul`).
- [x] I31. Berkas basi dihapus: `docs/BACKLOG-BAR.md` (statusnya bertentangan
      dengan isinya), `docs/deploy/github-pages-workflow.yml` (menunjuk branch
      lama + folder `docs/prototype` yang sudah tidak ada), `docs/demo-zona.html`
      (halaman demo desain yang tak dirujuk).
- [x] I32. Dokumen yang salah diperbarui: peta folder `docs/ARSITEKTUR.md` (modul
      baru + aturan localStorage yang sebenarnya), `README.md` (status fitur),
      `docs/deploy/README.md` (angka aset & bagian Actions yang basi), dan tautan
      `prototype/index.html` di `docs/DESIGN.md` yang berkasnya sudah tidak ada.
- [ ] I33. Ditahan: dokumen rencana jangka panjang (`docs/PLAN.md`, `docs/NOTES.md`,
      `docs/DESIGN.md`, `docs/deploy/APK.md`) dan data terjemahan lama
      (`tools/en/*.json`) — dibiarkan sampai pengguna memutuskan.

## Bagian J — Modul Bulk Renamer (SELESAI)
- [x] J34. Modul Ganti Nama Massal (Bulk Renamer) local-first & touch-friendly:
      • Model data berkas & 8 tipe aturan transformasi (Cari & Ganti / Regex dengan capture group `$1/$2`,
        Sisip Awalan/Akhiran/Indeks, Penomoran Urut `01/001`, Ubah Huruf `kebab/camel/UPPER/lower`,
        Pangkas Karakter, Ekstensi Berkas, Pembersihan Cepat `%20` & karakter OS, Pola Token Dinamis `{date}_{name}_{num}`);
      • Live interactive preview dengan badge status (Siap, Sama, Konflik, Invalid) & pencarian hasil instan;
      • Deteksi tabrakan nama (name collision) otomatis dengan 3 strategi (Peringatkan, Auto-nomor `(1)`, Auto-nomor `_1`);
      • Keamanan OS: validasi Windows Reserved Names (CON, PRN, AUX, NUL), batas 255 karakter, dan larangan spasi/titik ujung;
      • Integrasi Web File System Access API (ganti nama native di disk) + Fallback Ekspor Arsip ZIP biner;
      • Preset resep bawaan + penyimpanan resep kustom pengguna (`localStorage`);
      • Full Undo / Rollback ganti nama;
      • Suite uji otomatis 78/78 hijau (`tools/uji/renamer-*.mjs`).


## Bagian K — ronde 11 (BERJALAN, bertahap)
> Dikerjakan per tahap; tiap tahap punya suite uji sendiri. Butir yang butuh
> keputusan pengguna DITAHAN (lihat paling bawah) dan tidak dikerjakan sendiri.

### K · Tahap 1 — Tugas & Reminder (SELESAI)
- [x] K2. Tata bahasa tenggat diperkaya: `lusa`, `minggu depan`, `N hari lagi`,
      jam sesudah tanggal (`besok jam 14:00 …`, `09.30` juga diterima).
- [x] K2. To-do BERULANG: `setiap hari`, `setiap <nama hari>`, `setiap tanggal N`.
      Dicentang → tenggat bergeser ke kejadian berikutnya setelah hari ini (yang
      terlewat dilompati) dan kotak kembali kosong. Disimpan sebagai `data-ulang`.
      Tanggal bulan 29–31 dibatasi akhir bulan (31 Jan → 28/29 Feb).
- [x] K5. Prioritas `!` / `!!` / `!!!` (di mana pun sebagai kata tersendiri);
      tampil di chip dan jadi urutan kedua setelah tenggat.
- [x] Perbaikan uji `toast-tak-menutup-bar.mjs` yang salah memilih blok @media.
- Uji: `tools/uji/tugas-lanjut.mjs` (33) · `tools/uji/ulang-tugas.mjs` (14).

### K · Tahap 2 (SELESAI, kecuali yang ditandai)
- [x] K1. Command palette (Ctrl/⌘+K): lompat layar, buka catatan lewat judul,
      aksi (catatan baru, jurnal, ganti tema). Sumber perintah didaftarkan di
      `app.js`; mesinnya di `core/palette.js` dan tidak tahu isi modul.
- [x] K3. Token foto & audio: `{iso}`, `{aperture}`, `{shutter}`, `{focal}`,
      `{res}`, `{width}`, `{height}`, `{genre}`. Parser EXIF kini juga membaca
      Exif SubIFD (ISO, bukaan, rana, fokus, dimensi). Data kosong → `unknown`.
      Catatan: `{camera}`, `{artist}`, `{title}`, `{album}`, `{track}` dan
      `{date}` (tanggal EXIF) sudah ada sebelumnya.
- [x] K4 (sebagian). Tenggat yang lewat dan belum selesai sudah tampil di
      "Perlu perhatian" sejak B9. Tahap ini menambahkan tombol **Hari ini /
      Besok / Minggu depan** di kartu Tugas untuk memindahkannya. Belum ada
      layar "Rencana hari ini" terpisah.
- [x] K6 (sebagian). Tunda/jadwal ulang lewat tombol di kartu (hari, besok,
      minggu depan). Opsi "10 menit / nanti" belum ada: tenggat di aplikasi ini
      berbasis hari, bukan jam, dan notifikasi terjadwal belum dibuat.
- Uji: `renamer-k3.mjs` (19) · `tunda-tugas.mjs` (15) · `palette.mjs` (18).

### K · Tahap 3 (K7–K11 selesai)
- [x] K7. Matriks prioritas di layar Tugas: 2×2 dari "mendesak" (tenggat hari
      ini/besok/lewat) × "penting" (prioritas !! atau !!!). Kuadran: Kerjakan
      sekarang · Jadwalkan · Selesaikan cepat · Nanti. Murni (`notes/kalender.js`).
- [x] K8. Kalender terbuka .ics (RFC 5545): ekspor semua to-do bertenggat
      (seharian / 1 jam, RRULE untuk berulang, PRIORITY, UID stabil, lipatan 75
      karakter) dan impor → catatan baru berisi to-do bertanggal. Impor tidak
      menerjemahkan aturan berulang (hanya kejadian pertama). Modul `notes/ics.js`.
- [x] K9. Kalender bulanan di layar Tugas: sel bertitik jumlah tenggat, pilih
      hari untuk melihat daftarnya, navigasi bulan, dan "Hari ini". Berulang ikut
      muncul di hari yang sesuai aturan.
- [x] K10. Transklusi blok `![[Judul#^id]]` sebagai panel baca-saja "Rujukan
      blok" di bawah editor. Isi dibaca langsung dari blok sumber (tidak disalin).
      Status rusak untuk catatan/blok yang hilang, dan terkunci untuk catatan
      terkunci yang belum dibuka (isinya tidak dibaca). Rujukan tidak ditandai
      sebagai tautan mati. Modul `notes/transklusi.js`.
      Keputusan: transklusi INLINE di editor ditunda karena menyentuh mesin
      caret. Jika ingin inline, itu keputusan terpisah.
- [x] K11. Sebutan tanpa tautan, graf lokal, dan catatan yatim. Dua yang pertama
      sudah ada sebelumnya. Catatan yatim (`catatanYatim`) ditambahkan sebagai
      panel "Catatan yatim".
- Uji: `matriks-kalender-ics.mjs` (45) · `transklusi-yatim.mjs` (29).

### K · Tahap berikutnya (BELUM)
- [x] K12. Pencarian fuzzy + peringkat relevansi (indeks di Web Worker). Indeks
      (judul, tag, isi polos) dikirim ke Worker hanya bila daftar catatan terlihat
      berubah. Urutan: skor relevansi (judul diawali > kata judul > judul > tag >
      isi), lalu terbaru. Bila hasil persis kosong, kata biasa boleh beda 1 huruf
      (≥4 huruf) atau 2 huruf (≥8 huruf) dan diberi label "Mungkin maksudnya".
      Operator tag:/judul: tetap persis. Cadangan sinkron bila Worker tidak ada.
      Modul `notes/cari-inti.js`, `notes/cari-worker.js`.
      Uji: `cari-peringkat.mjs` (27). `tag-cari-tampil.mjs` disesuaikan (hasil kini asinkron).
- [ ] K13. Tangkap cepat dari share sheet (Web Share Target)
- [ ] K14. OCR gambar (offline) agar teks di foto bisa dicari
- [ ] K15. Baca keras (SpeechSynthesis) dan dikte suara (Web Speech API)
- [ ] K16. Templat dengan variabel `{tanggal}`, `{judul}`, dan isian saat dibuat
- [ ] K17. Enkripsi nyata catatan terkunci (WebCrypto AES-GCM + PBKDF2) — setelah audit PIN
- [ ] K18. Cadangan terenkripsi (frasa sandi)
- [ ] K19. Tampilan database: tabel, papan Kanban, kalender (catatan dengan properti)
- [ ] K20. Statistik & heatmap jurnal / to-do selesai per minggu
- [ ] K21. Belajar dari contoh (flash fill) di renamer
- [ ] K22. Deteksi duplikat (SHA-256 + dHash gambar)
- [ ] K23. Aturan bersyarat & grup aturan di renamer
- [ ] K24. Regex dengan penjelasan + pustaka pola
- [ ] K25. Ekspor/impor resep renamer (JSON, QR)
- [ ] K26. Riwayat undo lintas sesi (IndexedDB) + ekspor log CSV
- [ ] K27. Normalisasi Unicode & hapus diakritik di renamer
- [ ] K28. Pindah ke subfolder (tanggal/jenis) lewat File System Access
- [ ] K29. Web Worker untuk batch besar di renamer
- [ ] K30. Satu indeks pencarian lintas modul
- [ ] K31. Aksi lintas modul: catatan → Reminder/tugas sekali langkah
- [ ] K32. Penyimpanan OPFS untuk berkas besar
- [ ] K33. Pembaruan PWA eksplisit ("versi baru tersedia")
- [ ] K34. Virtualisasi daftar catatan
- [ ] K35. Aksesibilitas & navigasi keyboard penuh

### Ditahan — menunggu keputusan pengguna
- D18 riwayat versi · E22 sync (CRDT) · E23 tabel · E24 widget (butir lama)
- Fitur AI (ringkas / tanya-jawab catatan) — bertentangan dengan non-goal v1 di PLAN
- Notifikasi terjadwal (web terbatas saat aplikasi tertutup; APK lewat Capacitor)
