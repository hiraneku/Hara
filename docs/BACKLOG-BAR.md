# Backlog — Mekanik Bar Editor

Status: **usulan, belum dikerjakan.** Dicatat dari diskusi 6 Sep 2026.

Bar saat ini punya **27 tombol**:
`↺ ↻ / H1 H2 H3 B I == S [[ 🔗 # ⌫ ☐ • 1. ` </> " ! — 📅 ⇤ ⇥ ↑ ↓`

---

## ✅ Prioritas tinggi — SELESAI (6 Sep 2026)

| # | Mekanik | Catatan implementasi |
|---|---------|----------------------|
| 1 | ~~**Undo / Redo** (↺ ↻)~~ | `editor/history.js`. Snapshot sendiri, bukan `execCommand('undo')` bawaan — riwayat bawaan rusak karena kita banyak mengubah DOM lewat skrip. Ketikan beruntun digabung (jeda 500 ms), batas 100 langkah, riwayat direset tiap ganti catatan. Pintasan: Ctrl/Cmd+Z, Ctrl+Shift+Z, Ctrl+Y. Tombol meredup saat tak bisa dipakai. |
| 2 | ~~**Tautan URL** (🔗)~~ | `menus/link.js`. Form dua kolom (teks + alamat). `hara.app` → `https://hara.app`, `a@b.com` → `mailto:`. Kursor di dalam tautan → mode ubah + tombol hapus tautan. |
| 3 | ~~**Hapus semua format** (⌫)~~ | `blocks.js → clearFormat()`. Ada seleksi = bersihkan bagian itu saja; tanpa seleksi = seluruh blok kembali paragraf polos (checkbox & indent ikut hilang). |
| 4 | ~~**Naik / turun blok** (↑ ↓)~~ | `blocks.js → moveBlock()`. Kursor ikut berpindah bersama blok, aman di ujung atas/bawah. |

## ✅ Prioritas menengah — SELESAI (6 Sep 2026)

| # | Mekanik | Catatan implementasi |
|---|---------|----------------------|
| 5 | ~~**Callout bertipe**~~ | Tombol `!` kini membuka menu 4 jenis: info (biru), tip (hijau), peringatan (jingga), bahaya (merah). Label otomatis lewat `data-cal-label`. Markdown `> [!tip]` juga jalan. Jenis dibuang otomatis saat blok berubah jadi bukan-callout. |
| 6 | ~~**Heading 3**~~ | Tombol `H3` + markdown `### `. Gayanya sans-serif tebal, membedakan diri dari H1/H2 yang serif. |
| 7 | ~~**Daftar bernomor**~~ | Tombol `1.` + markdown `1. ` dan `3) `. Nomor dihitung ulang otomatis (`renumber()`); deretan yang terputus blok lain mulai dari 1 lagi. |
| 8 | **Tabel** | **MASIH DITUNDA.** Alasannya tetap: tabel di `contenteditable` mentah berat dan navigasi antar-sel di HP rumit. Kerjakan setelah pindah ke Lexical. |
| 9 | ~~**Tanggal**~~ | Tombol `📅` menyisipkan tanggal berbahasa Indonesia ("Minggu, 6 September 2026"). *Catatan harian* (daily note) belum — itu butuh modul jurnal tersendiri, bukan sekadar tombol bar. |

## ✅ Prioritas rendah — SELESAI (6 Sep 2026)

| # | Mekanik | Catatan implementasi |
|---|---------|----------------------|
| 10 | ~~**Sematkan gambar**~~ | `core/blobs.js` + `editor/image.js`. Berkas masuk **IndexedDB**, catatan hanya menyimpan `data-blob="b7"`. Foto besar dikecilkan otomatis ke maks 1600 px. `src` objectURL dibuang sebelum autosave, dipasang ulang saat catatan dibuka. Menghapus gambar ikut menghapus berkasnya. |
| 11 | ~~**Tautan blok** (`^id`)~~ | `editor/blockref.js`. Menandai blok dengan id 4 karakter yang dijamin unik lintas catatan; rujukan `[[Judul#^a3f2]]` langsung disalin ke papan klip. Penanda ditampilkan lewat CSS `::after`, jadi tidak ikut terbaca sebagai teks. |
| 12 | Rumus matematika, mermaid, kolom | **Sengaja tidak dikerjakan.** Wilayah plugin. Sesuai riset: jangan kejar paritas Obsidian (2.700+ plugin). |

## ✅ Perbaikan bar — SELESAI

- ~~**Pemisah antar kelompok**~~ — sudah, sekaligus saat bar dikelompokkan jadi 10 kontrol.
- ~~**Bar bisa diatur sendiri**~~ — 8 kontrol bisa disembunyikan lewat Pengaturan. Undo/redo sengaja tidak bisa disembunyikan. Pemisah yang jadi kembar atau menggantung dirapikan otomatis.
- **Baris kedua yang bisa dibuka** — tidak jadi dikerjakan; pengelompokan dropdown sudah menyelesaikan masalah yang sama dengan lebih rapi.
- ~~**Umpan balik getar**~~ — `navigator.vibrate(8)` saat menekan tombol & memilih menu, bisa dimatikan di Pengaturan.

---

## Risiko yang perlu diingat

**Undo/redo adalah yang paling berisiko** di `contenteditable` mentah. Riwayat undo bawaan
browser sering rusak begitu DOM diubah lewat skrip — dan editor kita melakukan itu terus-menerus.
Kalau mau undo yang andal, itu argumen terkuat untuk pindah ke **Lexical** lebih dulu,
karena di sana riwayat undo adalah bagian dari model data.
