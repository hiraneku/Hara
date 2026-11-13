# Audit Tahap 0: Kondisi Nyata 32 ID Fitur Catatan

> Audit **read-only**. Tidak ada perubahan kode. Kode Hara tidak dijalankan atau diuji dalam audit ini.
> Dasar: `koreksi-dan-urutan-32-konsep.md` §6.1 (Tahap 0) dan §6.4 (status ditandai dari kode, bukan dari catatan awal).
> Basis kode: branch `arena/4c22176a-hara` di commit `efa2a6b`, working tree bersih.
> Pemetaan awal di `/home/user/penerapan-konsep-fitur-catatan.md` sebagian besar dikonfirmasi; perbedaannya dicatat di bagian 3.

## 1. Legenda status

- **Implemented**: ada di kode dan bisa dipakai.
- **Partially implemented**: sebagian kemampuan ada, belum sesuai konsep.
- **Missing**: tidak ditemukan di kode (pencarian kata kunci + pembacaan berkas terkait).
- **Needs verification**: bukti belum cukup. Perlu uji di perangkat atau browser.

## 2. Tabel status 32 ID

| ID | Konsep | Status | Bukti (berkas:baris) | Catatan |
|---|---|---|---|---|
| A1 | Handwriting and drawing | Partially implemented | `docs/notes/editor/sketsa.js` 67–69 (ekspor PNG), 243 (`jejak` di memori), 378–386 (undo/redo sesi), 302–310 (buka ulang memuat PNG sebagai latar) | Goresan lama tidak tersimpan sebagai objek. Buka ulang menambah goresan baru di atas PNG. |
| A2 | Digital paper, annotations, visual elements | Partially implemented | `sketsa.js` 78 (`gambarKisiLatar`), pola `titik`/`garis`/`polos`, latar `putih`/`gelap`; `docs/notes/tata-gambar.js` (blok gambar); `docs/notes/hamoji-gambar.js` | Belum ada objek bebas di halaman catatan. |
| A3 | Custom pen and brush presets | Missing | Alat sketsa: `pena`, `stabilo`, `garis`, `kotak`, `panah`, `hapus` | Hanya satu jenis pena. Preset belum ada. |
| A4 | Shape recognition | Missing | `kotak`, `garis`, `panah` hanya alat manual | Tidak ada deteksi bentuk dari coretan. |
| A5 | Layer system | Missing | Tidak ditemukan kode layer di sketsa maupun editor | — |
| A6 | Zoomable canvas | Missing | `sketsa.js` 17–18 (`LEBAR = 720`, `TINGGI = 460` tetap); tidak ada kode zoom | — |
| A7 | Resizable canvas | Missing | Ukuran kanvas konstan (`sketsa.js` 17–18) | Batas maksimum dan penyimpanan ukuran belum ada. |
| A8 | Landscape workspace | Missing | Pencarian `orientation` / `landscape` di `docs/notes`, `docs/core`, `docs/styles` tidak menemukan hasil | Perlu uji di HP (Capacitor) sebelum disimpulkan. |
| A9 | Pinned toolbar tools | Missing | Konfigurasi bar `docs/notes/bar/config.js` tidak memuat sematan; pencarian `sematkan`/`pinned`/`favorit` nihil | — |
| B1 | PDF import and annotation | Missing | PDF hanya lampiran blok `/file` (`blok-generasi-baru.js`); tidak ada dependensi pdf.js di `package.json`; pencarian `application/pdf` di `docs/notes` nihil | — |
| B2 | PDF page management | Missing | Bergantung B1 | — |
| B3 | Internal hyperlinks | Partially implemented | `docs/notes/editor/blockref.js` (id blok `^id`, salin rujukan), `docs/notes/index.js` 293 (lompat ke `data-bid`), `docs/notes/transklusi.js` (rujukan blok) | Tautan ke blok dan catatan ada. Tautan ke halaman/bagian dokumen belum. Tautan ke judul heading belum diverifikasi. |
| B4 | External hyperlinks | Partially implemented | `docs/notes/menus/link.js` (menu tautan), `blok-generasi-baru.js` (`/bookmark`) | Teks dan kartu tautan ada. Pada objek tulisan/gambar belum. |
| B5 | Document search | Partially implemented | `docs/notes/cari.js` (pencarian dengan operator) | Anotasi dan PDF belum ada. |
| B6 | OCR search | Missing | Tidak ada dependensi OCR (`package.json`); tidak ada kode OCR | Catatan: pencarian awal `ocr` menemukan `docR` di `tata-gambar.js`. Itu kecocokan palsu. |
| B7 | Custom paper templates | Partially implemented | Latar kertas hanya di `sketsa.js` (titik/garis/polos). Templat catatan di `docs/notes/templat.js` (jurnal, rapat, belajar) | Grid, dotted, Cornell untuk halaman catatan belum ada. |
| B8 | Digital planner navigation | Needs verification | `docs/notes/kalender.js` 38 (filter jenis `harian`), `docs/notes/harian.js` | Belum terverifikasi apakah klik sel kalender membuka halaman harian. |
| C1 | Voice recording | Implemented | `docs/notes/editor/blok-modern.js` 157 (daftar memo `.b-audio`), 233–240 (`getUserMedia`, `MediaRecorder`, timer, simpan ke IndexedDB), 475–503 (putar, kecepatan, hapus) | Perlu uji di Android: izin mikrofon, merekam sambil mengetik. |
| C2 | Audio-linked transcription | Missing | Blok audio tidak menyimpan penanda waktu; `docs/core/suara.js` (dikte/baca keras) bukan transkripsi audio | Catatan bertanda waktu dulu sesuai keputusan 6. |
| C3 | Picture-in-picture learning | Missing | Pencarian `<video`, `requestPictureInPicture` nihil | Bergantung platform. |
| C4 | Video screenshot capture | Missing | Tidak ada pemutar video | Bergantung sumber. |
| C5 | Course learning view | Missing | Tidak ada tampilan materi berdampingan | — |
| C6 | Active recall tape | Missing | `mode-baca.js` adalah mode baca, bukan tape. Pencarian `tape`/`spoiler` hanya cocok di `baca-plus.js`, `mode-baca.js`, `tata-gambar.js` (blur/gambar) | Tidak ada tutup/buka per item. |
| C7 | Flashcard generation | Missing | Pencarian `flashcard`, `srs`, `interval` nihil di `docs/notes` dan `docs/core` | — |
| C8 | Exam preparation center | Missing | Tidak ada modul ujian | — |
| C9 | Focus timer | Missing | Pencarian `pomodoro`, `countdown`: hanya komentar hitung mundur hari di `statistik.js` 87 | Timer di `bar/render.js` dan `bilah-teks.js` adalah kecocokan palsu (UI, bukan timer belajar). |
| C10 | Study ambience | Missing | Modul Musik ada di `docs/musik/` tetapi tidak terhubung ke catatan | Perlu cek lisensi sebelum dipakai. |
| D1 | Project/course organization | Partially implemented | `docs/notes/ruang.js` (ruang, hanya `id` dan `nama`), tag, `docs/notes/saringan.js` (Smart Folder) | Ruang belum bertingkat. |
| D2 | Cloud sync | Missing | Tidak ada Supabase atau kode outbox. Pencarian `supabase`/`outbox` di `docs` nihil. `docs/core/db-catatan.js` 36 hanya membuat satu object store | `PLAN.md` 160 merencanakan store `outbox`, tetapi belum dibuat. |
| D3 | Quick access tools | Partially implemented | `docs/notes/bar/actions.js` (pintasan keyboard), bar bawah | Belum bisa dikustomisasi. |
| D4 | Web content capture | Missing | Hanya kartu tautan manual. `docs/core/pembaruan.js` menggunakan `fetch` untuk pembaruan aplikasi, bukan pengambilan halaman | — |
| D5 | Shortcut integration | Missing (masuk) | `docs/index.html`: tidak ada `manifest`. Berbagi keluar ada di `docs/notes/share.js` 18–20 (`navigator.share`) | Berbagi masuk ke Hara belum ada. |

Ringkasan (dihitung dari tabel, total 32):
- Implemented: 1 (C1).
- Partially implemented: 8 (A1, A2, B3, B4, B5, B7, D1, D3).
- Needs verification: 1 (B8).
- Missing: 22 (A3–A9, B1, B2, B6, C2–C10, D2, D4, D5).

## 3. Perbedaan dengan asumsi dokumen (perlu diputuskan sebelum perubahan berisiko)

1. **Outbox belum ada, padahal direncanakan.** `PLAN.md` 160–165 menyebut store `outbox` "disiapkan". Kode tidak membuatnya. Usulan: buat store `outbox` bersama migrasi berikutnya, sebelum D2.
2. **Strategi konflik.** `PLAN.md` 172 memilih last-write-wins per field. Koreksi §1.10 dan §2.9 meminta strategi versi dan konflik didesain ulang. Usulan: tetapkan keputusan sebelum D2, dan catat di `PLAN.md`.
3. **Coretan sketsa bukan objek.** Koreksi §1 mengasumsikan tulisan tangan sebagai objek. Kode saat ini menyimpan PNG. Konsekuensi: A1 dan A3–A5 perlu model stroke baru. Ini perubahan besar, sebaiknya dimulai dengan blok baru dan tidak mengubah sketsa lama.
4. **Pemetaan awal (`penerapan-konsep-fitur-catatan.md`)** menandai C1 "Ada", B7 dan A2 "Sebagian". Audit mengonfirmasi, dengan catatan tambahan: B7 hanya ada di sketsa, dan B8 belum terverifikasi.
5. **Dependensi.** `package.json` mencantumkan `jsdom` dan `fake-indexeddb` di `dependencies` (bukan `devDependencies`). Perlu dicek apakah ikut masuk bundel aplikasi. Ini berpengaruh pada target ukuran bundel di `docs/NOTES.md` (di bawah 200 KB gzip).
6. **Manifest tidak ada.** D5 dan integrasi PWA/native butuh manifest atau plugin. Capacitor tidak menyediakannya otomatis.

## 4. Fondasi yang sudah ada dan yang belum (untuk Tahap 0)

| Fondasi | Kondisi | Catatan |
|---|---|---|
| Model data editabel | Sebagian | Blok catatan ada (`docs/notes/editor/`). Objek kanvas belum. |
| Koordinat kanvas | Belum | Sketsa memakai piksel tetap 720×460. |
| Penyimpanan lokal | Ada | IndexedDB (`docs/core/blobs.js`, `docs/core/db-catatan.js`). |
| Ekspor/impor | Ada | JSON, Markdown, ZIP, ICS (`docs/notes/data-io.js`, `ics.js`). |
| Undo/redo | Sebagian | Ada di sketsa (sesi) dan editor catatan. Belum ada untuk objek kanvas. |
| Outbox sinkron | Belum | Lihat 3.1. |

## 5. Yang belum diperiksa

- Enam screenshot di `/tmp/arena-coding-uploads/` belum dibuka. Relevansinya belum diketahui.
- Tidak ada tes atau build yang dijalankan, karena audit ini read-only.
- Perilaku di HP (A8, C1, D5) belum diuji.
- Tautan heading `[[Catatan#Judul]]` (B3) belum diverifikasi.

## 6. Langkah berikutnya yang diusulkan

1. Pengguna memeriksa tabel status dan bagian 3. Terutama keputusan outbox dan konflik (3.1–3.2).
2. Setelah disetujui, mulai Tahap 1 dengan satu ID kecil per perubahan (usulan awal: A6 atau A7, karena keduanya hanya menyentuh sistem koordinat kanvas sketsa).
3. Setiap perubahan menyebut ID, dependensi, berkas yang diubah, dan cara uji.
