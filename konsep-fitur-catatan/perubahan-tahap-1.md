# Perubahan Tahap 1 (log)

> Format mengikuti `koreksi-dan-urutan-32-konsep.md` §6.4 poin 4: setiap perubahan menyebut ID, alasan urutan, dependensi, file, dan cara uji.
> Dasar urutan: §6.1 Tahap 1. Ikut urutan dokumen: A1 → A2 → A6 → A7 → A3 → A4 → A5 → A8 → A9 → B7.

## Keputusan yang diambil (diminta pengguna: "kamu atur saja")

1. **Tabel `outbox` dan strategi konflik tidak dibuat sekarang.** Sinkronisasi (D2) ada di Tahap 5. Tabel `outbox` dibuat di awal D2, bersama migrasi penyimpanan, bukan lebih awal. Sebelum D2, tulis dokumen desain sinkron (data lokal vs sinkron, ID stabil, antrean offline, versi, konflik, penghapusan, retry), sesuai §2.9. Kandidat awal dari `PLAN.md` (last-write-wins per field) belum menjadi keputusan final dan akan dicocokkan dengan §1.10.
2. **Urutan Tahap 1 mengikuti dokumen.** A1 dikerjakan lebih dulu, lalu A2. A6 dan A7 tidak didahulukan, meski sebelumnya sempat diusulkan.

## Perubahan 1 — A1 Handwriting and drawing

- **ID:** A1 (A2, A3, A4, A5 nanti memakai model data yang sama).
- **Alasan urutan:** item pertama Tahap 1 dan dependensi bagi A3–A5 (§6.3).
- **Masalah di kode (audit):** goresan hanya ada di memori sesi. Saat sketsa dibuka ulang, yang dimuat hanya PNG, sehingga goresan lama tidak bisa diedit.
- **Yang berubah:**
  - `docs/notes/editor/goresan.js` (baru): model murni. Validasi goresan, batas (1.000 goresan, 60.000 titik, 300 KB), serialisasi JSON versi 1 (`latar`, `pola`, `goresan`).
  - `docs/notes/note-model.js`: atribut `data-goresan` ditulis di blok gambar dan dibaca lagi (`elToBlock`). Karena disimpan di meta blok, data ikut catatan dan cadangan JSON.
  - `docs/notes/editor/sketsa.js`: sketsa baru menyimpan goresan. Sketsa dengan `data-goresan` dibuka sebagai goresan, bukan PNG. Sketsa lama dan coretan di atas foto tetap memakai jalur PNG (tanpa `data-goresan`). Bersihkan menghapus status latar foto.
  - `tools/uji/sketsa-goresan.mjs` (baru): 12 uji unit dan 9 uji integrasi (jsdom).
  - Seluruh `docs/**` dan `tools/uji` terkena `node tools/version.mjs` (aturan repo sebelum commit): 122 berkas, perubahannya hanya string `?v=`.
- **Dependensi:** tidak ada. Hanya memakai blok gambar dan IndexedDB yang sudah ada.
- **Perilaku baru:** goresan sketsa baru bisa dibuka ulang, diedit, dan disimpan lagi tanpa kehilangan goresan. Di atas batas, sketsa tetap tersimpan sebagai gambar dan muncul pemberitahuan.
- **Status A1 setelah perubahan:** masih *Partially implemented*. Goresan sudah tersimpan dan bisa dibuka ulang. Belum bisa memilih, memindah, atau menghapus satu objek goresan.
- **Cara uji yang dijalankan:**
  - `node tools/uji/sketsa-goresan.mjs`: 21/21 lulus.
  - Uji mutasi: pemuatan goresan sengaja dimatikan. Hasilnya 1 uji gagal, lalu kode dipulihkan (dibandingkan `cmp`).
  - `node tools/uji/catatan-generasi-baru.mjs`: 24/24 lulus.
  - `npm test` penuh: exit 0, dijalankan dua kali (sebelum dan sesudah penstempelan versi).
- **Belum diuji:** perangkat Android dan ekspor ZIP nyata. Verifikasi di sini sampai meta blok dan cadangan JSON melalui DOM dan `domToBlocks`.
- **Keterbatasan yang diketahui:** latar gelap belum bisa dipilih di UI. Format sudah menyimpannya, jadi begitu UI ada datanya sudah siap.

## Perubahan 2 — A2 Digital paper, annotations, visual elements (langkah 1)

- **ID:** A2. Dasar: model data goresan dari A1. Dikerjakan di sketsa dulu, karena model A1 ada di sana.
- **Alasan urutan:** urutan dokumen §6.1 (A2 setelah A1).
- **Kondisi awal (audit):** gambar di aliran catatan sudah bisa diubah lebar (40–100%), diputar, dan diatur posisinya kiri/tengah/kanan. Latar kertas (titik/garis/polos) hanya ada di sketsa. Belum ada objek bebas yang bisa dipilih dan dipindah di dalam kanvas.
- **Yang berubah:**
  - `docs/notes/editor/goresan.js`: format v2 menambah `objek` (`id`, `blob`, `x`, `y`, `w`, `h`), dengan batas 50 objek. v1 tetap bisa dibaca. Tambahan: `hitObjek` (uji titik), `idBlobDariGoresan` (daftar id blob).
  - `docs/notes/editor/sketsa.js`: alat **Pilih** (pindah objek, objek yang disentuh naik ke atas). Tombol **Tambah gambar**, **Perbesar** (×1,15), **Perkecil** (×0,87), **Hapus objek**. Objek digambar di bawah goresan. Kotak pilihan tidak ikut tersimpan.
  - `docs/notes/editor/image.js` dan `docs/notes/data-io.js`: id blob objek ikut dihitung sebagai "masih dipakai", supaya tidak dihapus oleh pembersihan blob yatim (batas 24 jam) atau hapus gambar.
  - **Perbaikan bug lama** di `data-io.js` `idBlobDipakai`: potongan `data-blob="…"` salah satu karakter, sehingga karakter pertama id blob hilang dari daftar. Diperbaiki (`slice(11, -1)`).
  - `tools/uji/sketsa-objek.mjs` (baru): 12 uji unit + 9 uji integrasi (jsdom). Pemilih berkas diganti stub, karena jsdom tidak bisa memilih berkas.
  - Penstempelan `node tools/version.mjs`: 122 berkas, hanya string `?v=`.
- **Cara uji yang dijalankan:**
  - `node tools/uji/sketsa-objek.mjs`: 21/21 lulus.
  - Uji mutasi: rumus geser objek sengaja dirusak, 1 uji gagal, lalu dipulihkan.
  - `node tools/uji/sketsa-goresan.mjs`: 21/21. `node tools/uji/catatan-generasi-baru.mjs`: 24/24.
  - `npm test` penuh: exit 0 (setelah penstempelan versi).
- **Status A2 setelah langkah ini:** masih *Partially implemented*. Sudah ada objek bebas di sketsa. Belum ada: objek bebas di halaman catatan biasa, dan latar kertas untuk halaman catatan (ini bagian B7).
- **Belum diuji:** perlindungan blob dari pembersihan blob yatim belum diuji dengan blob yang sudah berumur lebih dari 24 jam. Saat ini hanya diuji lewat `idBlobDariGoresan`. Belum diuji di perangkat Android.

## Perubahan 3 — A6 Zoomable canvas dan A7 Resizable canvas

- **ID:** A6 dan A7, dikerjakan bersamaan karena berbagi sistem koordinat kanvas (§6.3). Keduanya tetap dipisah secara perilaku.
- **Alasan urutan:** urutan dokumen §6.1 (A6 lalu A7). Dasar keputusan: §2.2 (zoom tidak mengubah ukuran; kanvas bisa diperluas sampai batas wajar).
- **Kondisi awal (audit):** kanvas sketsa tetap 720×460, di CSS dan di JavaScript. Tidak ada zoom.
- **Yang berubah:**
  - `docs/notes/editor/goresan.js`: format v3 menambah `kanvas` (`w`, `h`). Batas: minimum 360×240, maksimum 2400×2400, langkah 120 px. Data v1 dan v2 tetap terbaca dengan ukuran default 720×460.
  - `docs/notes/editor/sketsa.js`:
    - **A6 zoom:** tombol −, 100%, + (langkah 0,25; rentang 50%–400%). Zoom hanya mengubah ukuran tampilan kanvas, bukan koordinat yang tersimpan. Alat **Geser** untuk menggeser tampilan yang di-zoom, karena kanvas memakai `touch-action: none`.
    - **A7 ukuran kanvas:** tombol Lebar −/+ dan Tinggi −/+, dengan info ukuran (misalnya `960×580`). Ekspansi ke kanan dan bawah, sehingga koordinat lama tidak bergeser. Pengecilan ditolak bila ada goresan atau objek yang keluar dari area baru. Sketsa berlatar gambar lama (PNG) atau foto tidak bisa diubah ukurannya.
  - `docs/styles/notes.css`: `.sk-stage` bisa digulir (`overflow: auto`) dan kanvas dipusatkan dengan `margin: auto`, sehingga tidak terpotong saat diperbesar.
  - `tools/uji/sketsa-kanvas.mjs` (baru): 7 uji unit + 15 uji integrasi (jsdom).
- **Keputusan yang diambil sendiri:**
  - Ekspansi hanya ke kanan dan bawah. Ekspansi ke kiri/atas akan menggeser semua koordinat dan objek, dan belum diperlukan.
  - Kanvas tidak bisa diubah saat sketsa masih berlatar gambar lama, karena gambar itu tidak punya data kanvas dan akan terpotong atau melebar.
  - Pinch-zoom dengan dua jari belum dibuat. Zoom lewat tombol dulu, karena dua jari berbenturan dengan tulisan tangan.
- **Cara uji yang dijalankan:**
  - `node tools/uji/sketsa-kanvas.mjs`: 22/22 lulus.
  - Uji mutasi 1: pemetaan koordinat saat zoom dirusak. 1 uji gagal, lalu dipulihkan.
  - Uji mutasi 2: pemeriksaan pengecilan dinonaktifkan. 3 uji gagal, lalu dipulihkan.
  - Uji A1, A2, dan sketsa lama (`sketsa-goresan`, `sketsa-objek`, `catatan-generasi-baru`): semua lulus.
- **Belum diuji:** zoom dan geser di HP sungguhan (ukuran layar, lebar stage, dan gerakan jari). Stage di jsdom tidak punya tata letak, jadi `clientWidth` dianggap 0.
- **Status:** A6 dan A7 masing-masing masih *Partially implemented* di sisi perilaku, karena zoom belum pinch dan ukuran kanvas belum punya batas per halaman catatan. Kedua fitur ini sudah berfungsi di sketsa.

## Berikutnya

- A3 Custom pen and brush presets (urutan §6.1 setelah A7).
- Keputusan yang perlu Anda cek: objek bebas di halaman catatan biasa (bukan hanya sketsa) akan dibahas sebelum dikerjakan, karena menyentuh model blok catatan.
