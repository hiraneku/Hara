# Backlog — Mekanik Bar Editor

Status: **usulan, belum dikerjakan.** Dicatat dari diskusi 6 Sep 2026.

Bar saat ini punya **24 tombol**:
`↺ ↻ / H1 H2 B I == S [[ 🔗 # ⌫ ☐ • ` </> " ! — ⇤ ⇥ ↑ ↓`

---

## ✅ Prioritas tinggi — SELESAI (6 Sep 2026)

| # | Mekanik | Catatan implementasi |
|---|---------|----------------------|
| 1 | ~~**Undo / Redo** (↺ ↻)~~ | `editor/history.js`. Snapshot sendiri, bukan `execCommand('undo')` bawaan — riwayat bawaan rusak karena kita banyak mengubah DOM lewat skrip. Ketikan beruntun digabung (jeda 500 ms), batas 100 langkah, riwayat direset tiap ganti catatan. Pintasan: Ctrl/Cmd+Z, Ctrl+Shift+Z, Ctrl+Y. Tombol meredup saat tak bisa dipakai. |
| 2 | ~~**Tautan URL** (🔗)~~ | `menus/link.js`. Form dua kolom (teks + alamat). `hara.app` → `https://hara.app`, `a@b.com` → `mailto:`. Kursor di dalam tautan → mode ubah + tombol hapus tautan. |
| 3 | ~~**Hapus semua format** (⌫)~~ | `blocks.js → clearFormat()`. Ada seleksi = bersihkan bagian itu saja; tanpa seleksi = seluruh blok kembali paragraf polos (checkbox & indent ikut hilang). |
| 4 | ~~**Naik / turun blok** (↑ ↓)~~ | `blocks.js → moveBlock()`. Kursor ikut berpindah bersama blok, aman di ujung atas/bawah. |

## Prioritas menengah

| # | Mekanik | Catatan |
|---|---------|---------|
| 5 | **Callout bertipe** | Sekarang `!` cuma satu jenis. Obsidian punya info/peringatan/tip/bahaya. Ubah `!` jadi membuka menu. |
| 6 | **Heading 3** | H1+H2 kurang untuk catatan panjang. |
| 7 | **Daftar bernomor** (1.) | Sudah ada `•`, belum ada `1.`. |
| 8 | **Tabel** | Ada di NOTES.md. **Tunda sampai Lexical** — tabel di contenteditable berat, navigasi antar-sel di HP rumit. |
| 9 | **Tanggal / catatan harian** | Sisip tanggal hari ini atau buka daily note. Bagian dari mekanik Obsidian di spek. |

## Prioritas rendah

| # | Mekanik | Catatan |
|---|---------|---------|
| 10 | **Sematkan gambar** | Perlu penanganan berkas. `localStorage` tak sanggup — tunggu IndexedDB. |
| 11 | **Tautan blok** (`^id`) | Ada di spek, baru berguna setelah backlink hidup. |
| 12 | Rumus matematika, mermaid, kolom | Wilayah plugin. Sesuai riset: **jangan kejar paritas Obsidian** (2.700+ plugin). |

## Perbaikan bar itu sendiri (bukan tombol baru)

- **Pemisah antar kelompok** — 18 tombol berderet tanpa jeda mulai sulit dipindai. Sekat: blok | inline | sisip | atur.
- **Bar bisa diatur sendiri** — pengguna menyembunyikan tombol yang tak dipakai. Penting begitu tembus 20+ tombol.
- **Baris kedua yang bisa dibuka** — alternatif dari poin di atas.
- **Umpan balik getar (haptic)** saat menekan tombol di HP.

---

## Risiko yang perlu diingat

**Undo/redo adalah yang paling berisiko** di `contenteditable` mentah. Riwayat undo bawaan
browser sering rusak begitu DOM diubah lewat skrip — dan editor kita melakukan itu terus-menerus.
Kalau mau undo yang andal, itu argumen terkuat untuk pindah ke **Lexical** lebih dulu,
karena di sana riwayat undo adalah bagian dari model data.
