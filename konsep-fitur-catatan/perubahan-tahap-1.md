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

## Berikutnya

- A2 Digital paper, annotations, visual elements. Dependensi: model dari A1. Perlu keputusan skema objek visual sebelum mulai.
