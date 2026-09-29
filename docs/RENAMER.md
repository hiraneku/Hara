# Modul Bulk Renamer — Spesifikasi & Desain Arsitektur (Fase 1)

> Utilitas penggantian nama berkas massal yang aman, berprinsip *local-first*, memiliki *live interactive preview*, dan dioptimalkan untuk perangkat layar sentuh/mobile maupun desktop.

---

## 1. Visi & Prinsip Produk

1. **Keamanan Mutlak (Zero-Risk & Atomic):**
   * Sebelum berkas fisik diubah, kalkulasi nama baru disimulasikan secara *real-time* di memori.
   * Tabrakan nama (*name collisions*) dideteksi dan diblokir secara otomatis.
   * Eksekusi menggunakan pola **Two-Pass Renaming** untuk mencegah kegagalan saat pertukaran nama file.
   * Dilengkapi fitur **Full Undo / Rollback** untuk mengembalikan nama semula jika terjadi kekeliruan.

2. **Mobile-First & Touch-Friendly:**
   * Tidak meniru tampilan desktop yang padat tombol kecil (*Bulk Rename Utility*).
   * Antarmuka berbasis **Rule Cards (Kartu Aturan)** yang bersih: mudah digeser (*reorder*), diaktifkan/dinonaktifkan (*toggle*), dan diedit dengan jempol.
   * Tabel *Live Preview* memberikan sorotan visual (*diff highlight*) yang jelas antara teks lama dan teks baru.

3. **Multi-Source & Local-First:**
   * Di browser modern (Chromium/Edge): menggunakan **File System Access API** (`window.showDirectoryPicker()`) untuk mengganti nama berkas di disk secara native tanpa upload.
   * Di browser mobile standar (Safari/Firefox/Android WebView): menggunakan input berkas/folder multi-pilih dengan opsi ekspor arsip ZIP terstruktur.
   * Ekosistem internal: dapat dipakai untuk merapikan lampiran catatan dan ekspor dokumen Hara.

---

## 2. Model Data & Skema (Schema Contracts)

### 2.1 Item Berkas (`RenamerFileItem`)

```ts
interface RenamerFileItem {
  id: string;                 // ID internal unik (mis: "f-m3j8k-1")
  originalName: string;       // Nama berkas asli (mis: "IMG_2026_09_29.JPG")
  baseName: string;           // Nama dasar tanpa ekstensi ("IMG_2026_09_29")
  ext: string;                // Ekstensi berkas dengan titik (".JPG")
  newName: string;            // Hasil kalkulasi akhir dari rantai aturan
  status: 'ok' | 'unchanged' | 'conflict' | 'invalid';
  errorMsg?: string;          // Pesan error jika invalid/konflik
  size: number;               // Ukuran berkas (bytes)
  lastModified: number;       // Waktu modifikasi terakhir (timestamp)
  path: string;               // Path relatif / nama folder induk
  handle?: FileSystemFileHandle | null; // Handle native File System Access API
  file?: File | null;         // Objek berkas browser
  meta: Record<string, any>;  // Metadata tambahan (EXIF kamera, ID3, dll.)
}
```

### 2.2 Aturan Transformasi (`RenamerRule`)

```ts
interface RenamerRule {
  id: string;                 // ID unik aturan
  type: RuleType;             // Jenis aturan (lihat daftar di bawah)
  enabled: boolean;           // Saklar aktif/nonaktif aturan
  params: Record<string, any>;// Parameter khusus tipe aturan
}
```

### 2.3 Daftar Tipe Aturan (*Rule Types*)

| Tipe Aturan | Deskripsi & Parameter Utama | Contoh Kasus Penggunaan |
|---|---|---|
| **`replace`** | Cari & ganti teks atau regex (`find`, `replaceWith`, `isRegex`, `matchCase`, `matchAll`) | Mengganti `IMG_` menjadi `Foto_` |
| **`insert`** | Sisip teks pada posisi tertentu (`text`, `position: prefix\|suffix\|index\|after\|before`, `index`, `pivotText`) | Menambah `[Draf]_` di awal berkas |
| **`numbering`** | Penomoran urut otomatis (`start`, `step`, `digits`, `position`, `prefix`, `suffix`) | Memberi nomor `001, 002, 003` |
| **`case`** | Ubah kapitalisasi (`target: base\|ext\|all`, `format: lower\|upper\|title\|sentence\|camel\|kebab\|snake`) | Mengubah nama menjadi `kebab-case` |
| **`trim`** | Pangkas spasi/karakter (`mode: spaces\|start\|end\|both\|chars`, `count`, `chars`) | Menghapus 5 huruf pertama |
| **`extension`** | Manipulasi ekstensi (`mode: lower\|upper\|change\|remove`, `newExt`) | Menyeragamkan `.JPEG` ke `.jpg` |
| **`clean`** | Sanitasi cepat (`sanitizeOS: true`, `removeWebSpam: true`, `collapseSpaces: true`) | Menghapus `%20`, spasi ganda & karakter ilegal |
| **`token`** | Pola format dinamis (`pattern: "{date}_{name}_{num}"`, `dateFormat`, `digits`) | Template nama foto & dokumen |

---

## 3. Desain Antarmuka Pengguna (UI/UX Blueprint)

Mengikuti bahasa visual Hara (`docs/DESIGN.md`): permukaan hangat, tipografi *Inter* + *Instrument Serif*, radius tombol konsisten, dan kontras tajam.

```
┌────────────────────────────────────────────────────────────────────────┐
│ [←] Ganti Nama Massal (Bulk Renamer)             [Resep] [Urungkan]   │
├────────────────────────────────────────────────────────────────────────┤
│ ┌─ PILIH SUMBER BERKAS ──────────────────────────────────────────────┐ │
│ │ 📁 Folder: "Liburan_Bali_2026"  ·  48 Berkas (124.5 MB)            │ │
│ │ [ Ganti Folder / Berkas ]  [ + Tambah Berkas ]  [ ✕ Kosongkan ]    │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│ ┌─ ATURAN TRANSFORMASI (PIPELINE) ───────────────────── [+ Aturan] ──┐ │
│ │ ≡ [✓] 1. Pembersihan: Bersihkan %20, spasi ganda, karakter OS  [✕] │ │
│ │ ≡ [✓] 2. Ubah Huruf: Huruf Kecil (kebab-case)                  [✕] │ │
│ │ ≡ [✓] 3. Penomoran: Akhir, 2 digit (01, 02...)                 [✕] │ │
│ │ ≡ [✓] 4. Ekstensi: Pastikan huruf kecil (.jpg)                 [✕] │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│ ┌─ LIVE PREVIEW & HASIL ─────────────── [Semua (48)] [Berubah (48)] ─┐ │
│ │  NAMA ASLI                   ➜  NAMA BARU                   STATUS │ │
│ │  IMG_2026%2001.JPG              foto-liburan-01.jpg         [SIAP] │ │
│ │  IMG_2026%2002.JPG              foto-liburan-02.jpg         [SIAP] │ │
│ │  IMG_2026%2003.JPG              foto-liburan-03.jpg         [SIAP] │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│ ┌─ BILAH AKSI UTAMA (STICKY BOTTOM BAR) ─────────────────────────────┐ │
│ │  48 Berkas Siap Diubah  ·  0 Konflik                                 │ │
│ │  [ Tombol: GANTI NAMA SEKARANG (48 BERKAS) ]                       │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Mekanisme Keamanan & Integritas (*Safety Protocols*)

1. **Pre-flight Conflict Check:**
   * Bila kalkulasi menghasilkan dua berkas dengan nama yang sama persis di folder tujuan, sistem langsung menandai status `conflict` dengan badge merah mencolok dan menonaktifkan tombol eksekusi.
   * Pengguna diberikan opsi: *Beri nomor pembeda otomatis `(1), (2)`* atau *Perbaiki aturan*.
2. **Karakter Terlarang Sistem Operasi:**
   * Nama baru divalidasi terhadap karakter ilegal `/ \ : * ? " < > |`.
3. **Penyimpanan Log Sesi (*Undo History*):**
   * Setiap operasi ganti nama sukses dicatat dalam memori/storage lokal:
     `{ timestamp, sourceDir, mappings: [{ from, to }] }`.
   * Tombol "Urungkan" siap membalikkan nama berkas jika pengguna melakukan kesalahan.
