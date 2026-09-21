# Hara

Satu aplikasi, banyak tools kecil — catatan, reminder, tugas, dan lainnya — yang berbagi
satu core, satu pencarian, dan satu tempat penyimpanan.

- **Platform:** Web (ES modules murni, tanpa build) — nanti dibungkus jadi APK (Capacitor)
- **Data:** local-first (IndexedDB), jalan offline, sync menyusul
- **Stack aktual:** vanilla ES modules + localStorage/IndexedDB (lihat `docs/ARSITEKTUR.md`;
  `docs/PLAN.md` menyimpan rencana produk yang lebih luas)

## Status

Berjalan di web dan layak dipakai harian. Yang sudah ada di modul Catatan:

- **Editor blok** WYSIWYG: heading, daftar & daftar bernomor, to-do (dengan tenggat),
  kutipan, callout, kode, pembatas, gambar (lebar/zona/kompresi), format inline
  (tebal, miring, coret, sorot, kode, warna, font).
- **Jaringan catatan**: wikilink, backlink, rujukan, graf, tag + warna label,
  properti, daftar isi.
- **Kerja harian**: jurnal harian, templat, pencarian (operator `tag:` / `judul:` / `#` / `"frasa"`),
  pilih banyak, sapuan hapus/arsip, tempat sampah 30 hari, mode baca (A−/A+, zen,
  cari di dalam catatan), kunci catatan PIN, bagikan, cadangan ekspor/impor.
- **Layar Tugas & Reminder** (dihitung dari to-do di catatan), tema terang/gelap +
  warna aksen, bahasa Indonesia/Inggris/Jepang, jalan offline (local-first).

Coba langsung di **https://hiraneku.github.io/Hara/** — data tersimpan di perangkat
Anda, tanpa akun.

## Dokumen

- [`ROADMAP.md`](ROADMAP.md) — catatan rilis tiap ronde (apa yang sudah selesai)
- [`docs/ARSITEKTUR.md`](docs/ARSITEKTUR.md) — peta folder, aturan main, cara cap versi
- [`docs/deploy/`](docs/deploy/) — cara penerbitan ke GitHub Pages
- `docs/PLAN.md`, `docs/NOTES.md`, `docs/DESIGN.md`, `docs/deploy/APK.md` — dokumen
  rencana/arah jangka panjang (belum dikerjakan; lihat "nanti" di ROADMAP)
