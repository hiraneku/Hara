# Backlog — Mekanik Bar Editor

Status: **usulan, belum dikerjakan.** Dicatat dari diskusi 6 Sep 2026.

Bar saat ini punya 18 tombol:
`H1 H2 == ☐ • ` </> " ! — ⇤ ⇥ B I S / [[ #`

---

## Prioritas tinggi

| # | Mekanik | Alasan |
|---|---------|--------|
| 1 | **Undo / Redo** (↺ ↻) | Di HP tak ada Ctrl+Z. Editor sering mengubah DOM otomatis (markdown, toggle blok) — sekali salah tekan tak bisa kembali. **Paling mendesak.** |
| 2 | **Tautan URL** (🔗) | `[[...]]` hanya untuk catatan internal. Belum bisa menautkan alamat web. |
| 3 | **Hapus semua format** (⌫ₐ) | Membersihkan B+I+sorot satu-satu melelahkan. Sekaligus jadi tombol darurat kalau format nyangkut. |
| 4 | **Naik / turun blok** (↑ ↓) | Memindahkan paragraf di HP tanpa ini = seleksi–potong–tempel, menyakitkan di layar sentuh. |

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
