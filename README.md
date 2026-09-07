# Hara

Satu aplikasi, banyak tools kecil — catatan, reminder, tugas, dan lainnya — yang berbagi
satu core, satu pencarian, dan satu tempat penyimpanan.

- **Platform:** Web (ES modules murni, tanpa build) — nanti dibungkus jadi APK (Capacitor)
- **Data:** local-first (IndexedDB), jalan offline, sync menyusul
- **Stack aktual:** vanilla ES modules + localStorage/IndexedDB (lihat `docs/ARSITEKTUR.md`;
  `docs/PLAN.md` menyimpan rencana produk yang lebih luas)

## Status

Prototipe berjalan. Modul Catatan sudah layak dipakai harian: editor blok WYSIWYG,
wikilink + backlink + unlinked mention + local graph, properti & tag, tempat sampah
30 hari, pencarian, tema terang/gelap. Reminder & Tugas menyusul.

Coba langsung di **https://hiraneku.github.io/Hara/** — data tersimpan di perangkat
Anda, tanpa akun.

## Dokumen

- [`docs/PLAN.md`](docs/PLAN.md) — visi, arsitektur modul, data model, roadmap, risiko
- [`docs/NOTES.md`](docs/NOTES.md) — spesifikasi modul Catatan
- [`docs/ARSITEKTUR.md`](docs/ARSITEKTUR.md) — struktur kode & aturan mainnya
- [`docs/DESIGN.md`](docs/DESIGN.md) — token desain
- [`docs/deploy/`](docs/deploy/) — cara penerbitan ke GitHub Pages
