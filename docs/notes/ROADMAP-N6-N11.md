# Peta fitur N6–N11

Status persetujuan: pengguna meminta melanjutkan sampai selesai seluruh rentang N6–N11. Implementasi fitur tidak memerlukan AI. Batas keselamatan yang tetap berlaku: sinkronisasi konflik selalu eksplisit; otomasi punya pratinjau, riwayat, dan undo aman; dashboard hanya komponen bawaan; Markdown Vault idempoten dan konflik tidak menimpa diam-diam; kolaborasi menampilkan identitas/akses/komentar/atribusi serta menolak merge konflik; ekstensi memakai izin terbatas.

## N6 — Sinkronisasi lintas perangkat terenkripsi

Sinkronkan note antarperangkat dengan enkripsi ujung-ke-ujung sehingga hanya perangkat/pengguna pemilik kunci yang dapat membaca isi. Saat editan bertabrakan, tampilkan perbedaan dan berikan pilihan untuk menggabungkan atau memilih versi; jangan menimpa diam-diam.

**Implementasi:** envelope PBKDF2-SHA-256/AES-GCM; baseline tersegel lokal; merge note/ruang/kartu/ujian/lampiran tiga-arah; WebDAV HTTPS dengan If-Match/If-None-Match; konflik ditampilkan dengan pilihan versi atau gabung note; kredensial hidup hanya selama sesi/permintaan.

**Verifikasi eksternal yang tersisa:** server WebDAV sungguhan, variasi CORS/ETag tiap penyedia, perangkat Android nyata, vault/lampiran besar. HTTP hanya untuk localhost saat pengembangan. Frasa sinkronisasi tidak disimpan otomatis.

## N7 — Otomasi berbasis aturan — implementasi selesai

Aturan eksplisit jika–maka dengan kondisi tag/properti/judul/tugas dan aksi terbatas.

**Implementasi:** UI kelola aturan, pratinjau sebelum aktivasi, penerapan setelah konfirmasi, pemicu simpan/tugas selesai, pencatatan perubahan, riwayat persisten, undo yang menolak menimpa editan baru, dan guard agar undo tidak langsung menjalankan ulang otomasi.

**Tes:** `tools/uji/aturan-murni.mjs`, `tools/uji/aturan-ui.mjs`.

## N8 — Dashboard note rakitan sendiri — implementasi MVP selesai

Dashboard menyertakan komponen bawaan ringkasan angka, tugas mendatang, koleksi tag, kalender tenggat, note terbaru, dan tabel properti. Urutan dan visibilitas tersimpan lokal; filter tag/judul sederhana; komponen kosong ditangani; tata letak responsif. Tidak ada widget terprogram.

**Tes:** alur dashboard/konfigurasi lokal di `tools/uji/aturan-ui.mjs`.

## N9 — Markdown Vault — implementasi MVP selesai

Ekspor ZIP berisi satu Markdown per note dan folder `attachments/`; frontmatter menyimpan `hara_id`, timestamp, tag/properti, sedangkan komentar HTML Markdown mempertahankan ID blok tanpa mengganggu pembaca Markdown biasa. Impor mengembalikan ID, tautan note, blok, dan lampiran. Impor Vault berulang idempoten. Note dengan ID sama tetapi isi berbeda menampilkan pilihan pertahankan lokal/gunakan berkas/impor sebagai salinan. Ekspor satu berkas `.md` dari menu note tetap tersedia. Sinkronisasi langsung folder ditunda.

**Tes:** `tools/uji/vault-n9.mjs`; regresi parser/import Notion di `tools/uji/catatan-lanjutan.mjs`.

## N10 — Kolaborasi — model dan UI lokal selesai; relay produksi belum tersedia

UI lokal menyediakan identitas pilihan, pemilik/editor/commenter/reader, pengelolaan anggota, dan komentar dengan atribusi. Model protokol mencatat aktor/revisi, menolak akses yang tidak sesuai, menggabungkan perubahan pada blok berbeda, dan mengembalikan konflik terlihat untuk edit bersamaan pada blok yang sama. Presence/kursor bersifat sementara.

**Batas penting:** ruang dan identitas UI masih tersimpan lokal. Ini belum menyinkronkan pengguna/perangkat secara live dan identitas pilihan bukan autentikasi. Sebelum memenuhi kriteria realtime/multi-klien produksi, perlu relay terautentikasi, model akun/invite, broadcast presence, penyimpanan/reconnect, kebijakan keamanan/retensi, dan uji multi-klien. Engine sengaja tidak menyamar sebagai layanan tersebut.

**Tes:** `tools/uji/kolaborasi-n10.mjs` serta UI lokal di `tools/uji/aturan-ui.mjs`.

## N11 — API aksi ekstensi terkontrol — implementasi API selesai

Ekstensi harus dibundel bersama aplikasi; tidak ada pemuatan skrip jarak jauh atau `eval`. Manifest aksi mendeklarasikan `notes:read`/`notes:write`; data yang diberikan berupa salinan note terpilih; aksi hanya mengembalikan operasi allowlist; perubahan memerlukan pratinjau, dialog konfirmasi native, pemeriksaan staleness/izin, dan token sekali pakai. Panel pengaturan menampilkan/menyimpan izin. API ini bukan sandbox bagi kode bermusuhan: jangan muat JavaScript tidak tepercaya di origin aplikasi.

**Tes:** `tools/uji/ekstensi-n11.mjs`.

## Tes regresi penting

- N6: `sinkronisasi-murni.mjs`, `sinkronisasi-rencana.mjs`, `sinkronisasi-webdav.mjs`, `sinkronisasi-klien.mjs`, `sinkronisasi-ui.mjs`.
- N7/N8/N10 UI: `aturan-ui.mjs`.
- N9: `vault-n9.mjs`.
- N10 model: `kolaborasi-n10.mjs`.
- N11: `ekstensi-n11.mjs`.
