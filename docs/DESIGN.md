# Hara — Design System & Struktur Antarmuka

Status: draft v1 · Pendamping [`PLAN.md`](PLAN.md) · Prototipe: [`docs/prototype/index.html`](prototype/index.html)

---

## 1. Arah Desain

**Kata kunci: tenang, hangat, rapi, cepat.**

Hara adalah alat untuk berpikir dan mengingat. Antarmuka harus **mundur ke belakang** dan
membiarkan isi (tulisan user) jadi bintangnya. Bukan dashboard, bukan produk SaaS.
Rasanya lebih dekat ke **buku catatan kertas yang rapi** daripada ke aplikasi enterprise.

### Yang sengaja DIHINDARI (anti "AI slop")

Ini daftar larangan yang mengikat. Kalau sebuah komponen melanggar salah satunya, tolak.

| Hindari | Kenapa | Gantinya |
|---|---|---|
| Gradien ungu–biru, glassmorphism, blur di mana-mana | Penanda paling jelas desain generik | Warna solid, permukaan datar |
| Kartu mengambang dengan shadow tebal di semua elemen | Bikin ramai, hierarki hilang | Garis pemisah tipis; shadow hanya untuk elemen yang benar-benar melayang (modal, popover) |
| Emoji sebagai ikon | Terlihat malas, tidak konsisten lintas OS | Satu set ikon garis (Lucide), stroke 1.5px |
| Border-radius besar di segala hal (rounded-3xl) | Kekanak-kanakan, "template" | Radius kecil-menengah dan konsisten: 6/10/14px |
| Teks placeholder basa-basi ("Selamat datang di perjalanan produktivitasmu!") | Tidak berguna, sok akrab | Kalimat pendek, langsung, informatif |
| Ilustrasi 3D / blob dekoratif | Tidak menambah makna, bikin berat | Ruang kosong yang lega |
| Banyak warna aksen sekaligus | Tidak ada yang menonjol | Satu aksen utama; warna modul hanya sebagai penanda kecil |
| Animasi memantul & berlebihan | Memperlambat pemakaian harian | Transisi 120–180ms, ease-out, hanya opacity & transform kecil |
| Semua huruf tebal / ukuran seragam | Hierarki datar, melelahkan | Beda ukuran & warna, bukan beda ketebalan saja |

### Yang DIKEJAR

- **Kontras isi vs kerangka.** Tulisan user hitam pekat; label, ikon, dan metadata abu-abu.
- **Ruang napas.** Padding lebih besar dari yang terasa perlu. Kepadatan tinggi hanya di daftar.
- **Konsistensi tanpa ampun.** Satu ukuran tombol, satu tinggi baris daftar, satu jarak.
- **Kesan buatan tangan.** Warna netral yang sedikit hangat, bukan abu-abu murni #808080.

---

## 2. Fondasi Visual

### 2.1 Warna

Netral yang **hangat** (sedikit condong ke kuning/merah), bukan abu-abu dingin. Ini yang
membuat layar terasa seperti kertas, bukan seperti panel admin.

**Light**

| Token | Hex | Pakai untuk |
|---|---|---|
| `--bg` | `#FBFAF8` | Latar aplikasi (kertas) |
| `--surface` | `#FFFFFF` | Kartu, editor, sheet |
| `--surface-sunken` | `#F3F1ED` | Input, chip, area pasif |
| `--border` | `#E6E2DB` | Garis pemisah |
| `--border-strong` | `#D4CFC5` | Batas input saat fokus/hover |
| `--text` | `#1C1B18` | Isi tulisan |
| `--text-muted` | `#6B675F` | Label, metadata |
| `--text-faint` | `#9A958B` | Placeholder, timestamp |
| `--accent` | `#3F6F5B` | Aksi utama, state aktif (hijau daun teduh) |
| `--accent-weak` | `#E8F0EB` | Latar state aktif |
| `--danger` | `#A34434` | Hapus, terlewat |

**Dark** — bukan hitam murni; tetap hangat supaya tidak "berlubang".

| Token | Hex |
|---|---|
| `--bg` | `#16150F`→ dipakai `#161512` |
| `--surface` | `#1E1D19` |
| `--surface-sunken` | `#272621` |
| `--border` | `#33312B` |
| `--text` | `#EDEAE3` |
| `--text-muted` | `#A29D93` |
| `--accent` | `#7FB399` |

**Warna modul** (hanya untuk titik/ikon kecil dan garis kiri, tidak pernah jadi latar besar):
Catatan `#3F6F5B` · Reminder `#B5723A` · Tugas `#4A6B8A` · Jurnal `#7A5B8A`

### 2.2 Tipografi

Dua keluarga huruf saja.

- **UI & isi:** `Inter` (fallback: system-ui). Netral, terbaca di ukuran kecil.
- **Judul catatan & heading besar:** `Instrument Serif` atau `Newsreader`.
  Serif untuk judul memberi karakter "buku" dan langsung membedakan Hara dari
  ribuan aplikasi sans-serif. Dipakai **hemat** — hanya judul halaman & judul catatan.

Skala (rem, basis 16px):

| Peran | Ukuran | Berat | Tinggi baris | Tracking |
|---|---|---|---|---|
| Judul halaman (serif) | 28–32px | 400 | 1.2 | -0.01em |
| Judul catatan (serif) | 20px | 400 | 1.3 | — |
| Body / isi catatan | 16px | 400 | 1.65 | — |
| Baris daftar | 15px | 450 | 1.45 | — |
| Label & metadata | 13px | 500 | 1.4 | 0.01em |
| Overline (kategori) | 11px | 600 | 1 | 0.08em, uppercase |

Isi catatan dibatasi **maksimal 68 karakter per baris** (`max-width: 34rem`) supaya nyaman dibaca.

### 2.3 Spasi, Radius, Bayangan

- **Spasi:** kelipatan 4 — `4, 8, 12, 16, 20, 24, 32, 48, 64`. Padding kartu 16–20px,
  padding halaman 20px (mobile) / 32px (desktop).
- **Radius:** `6px` (chip, input kecil) · `10px` (tombol, kartu) · `14px` (sheet, modal) ·
  `999px` (avatar, badge angka). Tidak ada yang lain.
- **Bayangan:** hanya dua.
  - `--shadow-pop`: `0 4px 16px rgba(28,27,24,.08)` — popover, FAB
  - `--shadow-modal`: `0 16px 48px rgba(28,27,24,.16)` — modal, sheet
  Kartu di daftar **tidak berbayang** — dipisah oleh garis/latar.

### 2.4 Gerak

- Durasi: `120ms` (hover/tekan), `180ms` (muncul/hilang), `240ms` (sheet naik).
- Easing: `cubic-bezier(.2,.6,.2,1)`.
- Properti yang boleh dianimasikan: `opacity`, `transform` (≤8px geser, ≤2% skala).
- Hormati `prefers-reduced-motion` → semua jadi 0ms.

### 2.5 Ikon

Lucide, ukuran 18px (dalam baris) / 20px (nav) / 24px (FAB), stroke 1.5, warna mengikuti teks.

---

## 3. Struktur Antarmuka

### 3.1 Kerangka (App Shell)

**Mobile (<768px)**
```
┌───────────────────────────────┐
│ Header  judul · aksi kanan    │  56px, menempel di atas
├───────────────────────────────┤
│                               │
│  Konten (scroll)              │
│                               │
│                        ( + )  │  FAB, kanan-bawah, 16px dari tepi
├───────────────────────────────┤
│ Beranda  Catatan  Ingat  Cari │  Bottom nav 56px + safe-area
└───────────────────────────────┘
```

**Desktop (≥768px)**
```
┌────────────┬──────────────────────────────────────┐
│  Hara      │  Header: judul · cari · aksi         │
│            ├──────────────────────────────────────┤
│  Beranda   │                                      │
│  Catatan   │   Konten, max-width 880px, tengah    │
│  Reminder  │                                      │
│  Tugas     │                                      │
│  ─────     │                                      │
│  Tag       │                                      │
│  Arsip     │                                      │
│  Pengaturan│                                      │
└────────────┴──────────────────────────────────────┘
   240px
```

Sidebar: item aktif ditandai **latar `--accent-weak` + teks accent**, bukan garis tebal.
Bottom nav: ikon + label 11px; aktif = ikon terisi + warna accent. Tanpa badge kecuali
ada reminder terlewat.

### 3.2 Peta Layar

```
/                    Beranda (dashboard ringkas)
/notes               Daftar catatan
/notes/:id           Editor catatan
/reminders           Reminder — tab: Hari Ini · Akan Datang · Selesai
/tasks               Tugas
/search?q=           Hasil pencarian global
/tags/:tag           Item lintas modul dengan tag tsb
/settings            Tema, export/import, tentang
/trash               Tempat sampah (30 hari)
```

### 3.3 Beranda

Bukan dashboard penuh grafik. Tiga blok, ditumpuk, dipisah judul kecil:

1. **Sapaan tipis** — "Sabtu, 6 September" + jumlah agenda hari ini dalam satu kalimat.
   Tanpa "Selamat datang kembali!".
2. **Hari Ini** — reminder & tugas jatuh tempo hari ini. Kalau kosong: satu baris
   "Tidak ada yang jatuh tempo hari ini." (bukan ilustrasi besar).
3. **Catatan terakhir** — 3–4 catatan terbaru sebagai baris ringkas.

Tiap blok punya link "Lihat semua" di kanan judul.

### 3.4 Daftar Catatan

- **Default: daftar (list)**, bukan grid kartu. Lebih padat, lebih cepat dipindai.
  Toggle grid tersedia untuk yang suka papan.
- Satu baris = judul (1 baris, terpotong) + cuplikan isi (1 baris, `--text-muted`) +
  waktu relatif di kanan. Tinggi baris 64px, dipisah garis `--border`.
- Yang dipin naik ke atas dengan overline "DISEMATKAN".
- Tag tampil sebagai chip kecil maksimal 2, sisanya "+3".
- **Kosong:** judul "Belum ada catatan", satu kalimat, satu tombol "Tulis catatan".

### 3.5 Editor Catatan

Layar paling penting — harus terasa lapang.

- Tanpa toolbar mengambang. Header cuma: kembali · waktu simpan (`Tersimpan`) · menu "···".
- Judul serif 20px langsung bisa diketik, placeholder "Judul".
- Isi 16px, `line-height 1.65`, lebar maksimal 34rem, ketinggian otomatis.
- Markdown diformat saat mengetik (bukan preview terpisah).
- Bar tag tipis di bawah judul; tekan Enter untuk menambah.
- Autosave 600ms setelah berhenti mengetik; indikator berubah halus tanpa animasi mencolok.
- Menu "···": Sematkan · Jadikan pengingat · Duplikat · Arsipkan · Hapus.

### 3.6 Reminder

- Tiga tab teks (bukan pill warna-warni), garis bawah menandai aktif.
- Baris: checkbox bulat · judul · waktu. **Terlewat** = waktu berwarna `--danger`,
  bukan seluruh baris merah.
- Pengelompokan dengan sticky header tanggal ("Hari Ini", "Besok", "Sabtu, 13 Sep").
- Selesai = judul dicoret dengan `--text-faint`, tetap di tempat 3 detik lalu pindah.

### 3.7 Tombol "+" Universal

FAB tunggal. Ditekan → **sheet** naik dari bawah (mobile) / popover (desktop) berisi
`quickActions` dari semua modul: Catatan baru · Reminder baru · Tugas baru.
Baris teks + ikon, bukan grid ikon warna-warni.

### 3.8 Pencarian Global

Satu input di atas, hasil langsung saat mengetik (debounce 150ms).
Hasil **dikelompokkan per modul** dengan overline. Kata yang cocok di-highlight dengan
latar `--accent-weak`, bukan kuning stabilo. Tanpa hasil = "Tidak ada yang cocok dengan
'xyz'." plus saran menghapus filter.

### 3.9 Status Kosong, Muat, & Galat

- **Kosong:** judul 15px semibold + satu kalimat `--text-muted` + satu tombol. Tanpa gambar.
- **Muat:** skeleton abu tipis berbentuk sama dengan baris aslinya. Tanpa spinner berputar
  di tengah layar.
- **Galat:** kalimat manusiawi + tombol "Coba lagi". Tanpa kode error mentah.
- **Umpan balik aksi:** toast kecil kiri-bawah/atas, 3 detik, dengan "Urungkan" untuk
  hapus & arsip. Tanpa dialog konfirmasi untuk aksi yang bisa diurungkan.

---

## 4. Komponen Inti

Dibangun sekali di `core/ui/`, dipakai semua modul.

| Komponen | Varian | Catatan |
|---|---|---|
| `Button` | primary, secondary, ghost, danger | Tinggi 36px (sm) / 40px (md). Radius 10px |
| `IconButton` | ghost | 36×36, area sentuh 44px |
| `Input` / `Textarea` | — | Latar `--surface-sunken`, border transparan, fokus = border accent |
| `Chip` | tag, filter | 24px, radius 6px |
| `ListRow` | — | Tinggi 64px, slot kiri/tengah/kanan |
| `SectionHeader` | — | Judul 13px muted + aksi kanan |
| `EmptyState` | — | Judul + kalimat + aksi |
| `Sheet` | bottom (mobile), modal (desktop) | Radius 14px atas |
| `Toast` | info, undo, danger | Antre maksimal 1 |
| `Tabs` | underline | Untuk reminder |
| `Skeleton` | line, row | Meniru bentuk isi |

---

## 5. Aksesibilitas

- Kontras teks utama ≥ 7:1, teks muted ≥ 4.5:1, ikon ≥ 3:1.
- Target sentuh minimal 44×44px meski visualnya lebih kecil.
- Cincin fokus terlihat: `outline: 2px solid var(--accent); outline-offset: 2px`.
- Semua aksi bisa dicapai dengan keyboard; `Esc` menutup sheet, `⌘K` membuka pencarian.
- Status tidak pernah disampaikan hanya lewat warna (terlewat juga diberi label teks).
- `prefers-reduced-motion` dihormati penuh.

---

## 6. Struktur Kode UI

```
src/core/ui/
  tokens.css        # semua custom property (light + dark)
  Button.tsx  IconButton.tsx  Input.tsx  Chip.tsx
  ListRow.tsx  SectionHeader.tsx  EmptyState.tsx
  Sheet.tsx  Toast.tsx  Tabs.tsx  Skeleton.tsx
  index.ts
src/app/layout/
  AppShell.tsx      # memilih MobileNav / Sidebar
  Header.tsx  Sidebar.tsx  BottomNav.tsx  Fab.tsx
```

Tailwind dikonfigurasi untuk **membaca token CSS**, bukan mendefinisikan warna sendiri:
`colors: { bg: 'var(--bg)', surface: 'var(--surface)', ... }`. Dengan begitu dark mode
cukup mengganti satu blok variabel, dan tidak ada warna liar tersebar di komponen.

**Aturan:** tidak boleh ada nilai hex, px spasi, atau durasi animasi yang ditulis langsung
di dalam komponen modul. Semua lewat token.
