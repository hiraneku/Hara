# Modul Catatan — Spesifikasi

Status: draft v1 · Pendamping [`PLAN.md`](PLAN.md) & [`DESIGN.md`](DESIGN.md)

---

## 1. Posisi: Jangan Melawan Obsidian di Kandangnya

Ambisi awal: "seperti Obsidian, tapi lebih advanced dan lengkap."

Itu arah yang perlu dikoreksi. Obsidian punya 7+ tahun pengembangan, tim penuh waktu, dan
**2.700+ plugin komunitas**. Fitur intinya sekarang mencakup Bases (database view dengan
filter & formula), Canvas (whiteboard tak terbatas), Graph view, Properties, Workspaces,
Web viewer, Map view. Mengejar itu semua = kalah di semua lini, dan berakhir sebagai
tiruan yang lebih buruk.

**Tapi ada kabar baik: Obsidian punya satu kelemahan yang besar, terkenal, dan menahun.**

### Kelemahan Obsidian yang terdokumentasi luas

Dari keluhan pengguna yang konsisten selama bertahun-tahun:

| Masalah | Bukti |
|---|---|
| **Mobile lambat membuka** | Vault harus di-index ulang + semua plugin diinisialisasi tiap cold start. Ada laporan 44 detik–1 menit 10 detik untuk vault ~1.200 file; DEVONthink membuka database 3× lebih besar secara instan |
| **"Startup tax" membunuh capture cepat** | Mau catat satu kalimat di antrean kasir → menunggu vault load. Gagal di ujian "kecepatan pikiran" |
| **Editing di Android bermasalah** | Karakter/baris baru muncul sendiri, interaksi keyboard rusak, seleksi teks bermasalah — keluhan bertahun-tahun |
| **Plugin warga kelas dua di mobile** | Tombol terlalu kecil untuk jempol, sebagian plugin tidak jalan sama sekali, boros baterai |
| **Pencarian lambat di mobile** | Berbasis grep file, bukan indeks; makin besar vault makin lambat |
| **Konflik sync** | Arsitektur berbasis file rapuh di jaringan buruk → file ganda |
| **UX tidak konsisten** | Tiap plugin punya gaya sendiri; makin banyak plugin makin berantakan |

Konsensus komunitas Obsidian sendiri: *"mobile bukan fokus mereka"*, *"Obsidian itu web app
yang dibangun untuk desktop, mobile datang belakangan"*.

### Posisi Hara

> **Kecepatan Obsidian di desktop, tapi di HP. Mobile-first, bukan mobile-afterthought.**
> Buka < 1 detik, cari instan, editing yang benar-benar nyaman dengan jempol.

Ini bukan "Obsidian yang lebih lengkap" — ini **Obsidian untuk orang yang hidup di HP**.
Dan itu justru sejalan dengan keputusan arsitektur kita yang sudah diambil:

| Keputusan kita | Kenapa menang di titik lemah Obsidian |
|---|---|
| IndexedDB + indeks pencarian | Tidak ada re-index saat buka; cari instan, bukan grep |
| Tanpa sistem plugin pihak ketiga | Tidak ada startup tax, tidak ada UX yang pecah |
| Local-first, PWA | Buka instan, jalan offline |
| Sync per-item lewat outbox | Konflik per item, bukan file ganda |
| Satu design system ketat | Konsisten di seluruh aplikasi |

**Keunggulan "advanced"-nya bukan jumlah fitur, tapi fitur yang tepat dieksekusi mulus di HP.**

### Yang sengaja TIDAK dibuat

- Sistem plugin pihak ketiga — sumber utama kelambatan & UX pecah di Obsidian
- Graph view 3D yang berat — diganti *local graph* ringan (lihat §3.3)
- Canvas / whiteboard tak terbatas — mahal dibangun, jarang dipakai di HP
- Bahasa query sendiri ala Dataview — diganti Smart Folder berbasis UI (§3.6)
- Sinkronisasi berbasis berkas `.md` di folder — kita simpan di DB, ekspor ke `.md`

---

## 2. Fondasi: Blok, Bukan Berkas

Perbedaan teknis terpenting dari Obsidian. Obsidian menyimpan **berkas markdown**; Hara
menyimpan **catatan berisi daftar blok**.

```ts
interface Note extends HaraItem {
  type: 'note';
  blocks: Block[];
}

interface Block {
  id: string;          // stabil seumur hidup → bisa ditaut & disematkan
  type: 'p'|'h1'|'h2'|'h3'|'ul'|'ol'|'todo'|'quote'|'code'|'divider'|'img'|'embed'|'table'|'callout';
  text: string;        // markdown inline: **tebal**, [[tautan]], #tag, ==sorot==
  checked?: boolean;
  lang?: string;
  meta?: Record<string, unknown>;
}
```

**Kenapa blok:**
- Tautan setingkat blok (`[[Catatan#^blokid]]`) jadi wajar, bukan tambalan
- Render hanya blok yang terlihat → catatan 10.000 kata tetap lancar di HP kentang
- Autosave hanya menyimpan blok yang berubah, bukan seluruh berkas
- Sync per blok → konflik jauh lebih jarang
- Seret-pindah blok dengan jempol jadi mungkin

**Tetap kompatibel:** `blocks ⇄ markdown` punya konverter dua arah. Ekspor menghasilkan
`.md` biasa yang bisa dibuka Obsidian; impor folder vault Obsidian juga didukung.
Tidak ada penguncian data.

---

## 3. Fitur

### 3.1 Editor — WYSIWYG markdown

Bukan split-pane preview. Format muncul saat mengetik, sintaks tetap terlihat saat kursor
ada di baris itu (seperti Live Preview Obsidian, tapi ringan).

Dukungan: `# heading`, `**tebal**`, `*miring*`, `~~coret~~`, `==sorot==`, `` `kode` ``,
blok kode dengan syntax highlight, `- [ ] todo`, kutipan, tabel, `---`, catatan kaki,
callout (`> [!info]`), LaTeX (`$...$`) — dimuat malas, hanya kalau dipakai.

**Slash command** (`/`) — sisipkan blok tanpa hafal sintaks. Ini penting untuk mobile.

**Toolbar mobile di atas keyboard** — ini yang tidak dipunyai Obsidian dengan baik.
Satu baris tombol: `#` · `**` · `[[` · `- [ ]` · indent kiri/kanan · undo.
Bisa digulir, bisa diatur isinya. Mengetik markdown dengan jempol tanpa ini adalah siksaan.

### 3.2 Tautan `[[wikilink]]`

- Autocomplete saat mengetik `[[`, cari judul + alias
- **Tautan ke blok**: `[[Catatan#^id]]`, dan ke heading: `[[Catatan#Judul]]`
- **Tautan mati** ditandai beda warna → klik untuk membuat catatannya
- **Alias**: `[[Catatan|sebutan lain]]`
- **Sematan**: `![[Catatan]]` menampilkan isi catatan lain secara langsung
- **Hover preview** di desktop; **tap-tahan preview** di mobile

### 3.3 Backlink & Local Graph

- **Panel backlink** di bawah catatan: siapa saja yang menaut ke sini, lengkap dengan
  kalimat konteksnya. Ini fitur PKM yang paling sering dipakai sehari-hari.
- **Unlinked mentions**: catatan yang menyebut judul ini tapi belum menaut → satu tap untuk menautkan.
- **Local graph**: hanya tetangga 1–2 langkah, maksimal ~50 simpul, render SVG.
  Bukan graph global 3D yang cantik di screenshot tapi tak berguna dan berat.

### 3.4 Properties (frontmatter terstruktur)

Setiap catatan boleh punya properti bertipe: teks, angka, tanggal, checkbox, daftar, tautan.
Ditampilkan sebagai tabel rapi di atas catatan — **bukan YAML mentah** yang bikin takut.
Disimpan sebagai YAML frontmatter saat diekspor, jadi tetap kompatibel Obsidian.

### 3.5 Organisasi

- **Folder** bersarang untuk struktur kasar
- **Tag** bersarang (`#proyek/hara`) untuk klasifikasi silang
- Satu catatan boleh punya banyak tag, tapi hanya satu folder
- Pin, arsip, tempat sampah 30 hari

### 3.6 Smart Folder — pengganti Dataview

Alih-alih bahasa query yang harus dipelajari, **pembangun filter visual**:

> Tampilkan catatan · tag `proyek` · properti `status` = `berjalan` · diubah 30 hari terakhir
> · urut berdasarkan `deadline` · tampilan **tabel**

Tampilan: daftar · tabel · papan kanban (kelompok berdasarkan properti) · kalender.
Tersimpan sebagai catatan khusus, bisa disematkan ke catatan lain.

Ini menutup ~80% kegunaan Dataview + Bases tanpa mengharuskan user belajar sintaks —
dan tanpa evaluasi formula per baris yang berat di HP.

### 3.7 Pencarian

Indeks penuh di IndexedDB, **hasil muncul saat mengetik**.

Operator: `tag:`, `folder:`, `judul:`, `properti:nilai`, `"frasa persis"`, `-kecuali`,
`sebelum:`/`sesudah:` tanggal. Riwayat pencarian tersimpan, bisa dijadikan Smart Folder.

Target: **< 50ms untuk 10.000 catatan di HP menengah.** Ini janji utama produk — harus diukur,
bukan diperkirakan.

### 3.8 Capture cepat

Menjawab langsung "startup tax" Obsidian:

- **Buka aplikasi → langsung siap menulis**, tanpa layar loading vault
- **Share target PWA**: bagikan teks/tautan dari aplikasi lain → langsung jadi catatan
- **Widget/shortcut** ke "catatan baru" (saat sudah jadi APK)
- **Daily note** otomatis dari template

### 3.9 Riwayat versi

Snapshot lokal tiap ~5 menit saat diedit, disimpan 30 hari, bisa dibandingkan & dipulihkan.
Obsidian menaruh ini di layanan berbayar; di Hara ini lokal dan gratis.

### 3.10 Ekspor & impor

- Ekspor: satu catatan / semua → `.md` (+ frontmatter), `.json`, `.pdf`, `.zip`
- Impor: folder vault Obsidian (`[[wikilink]]` & frontmatter dipertahankan), Markdown, Notion, Keep
- **Prinsip: keluar-masuk kapan saja, tanpa kehilangan apa pun.**

---

## 4. Anggaran Performa

Ini yang menentukan menang atau tidak. Dilanggar = fitur ditolak.

| Metrik | Target | Cara |
|---|---|---|
| Cold start → siap mengetik | **< 1 detik** | Tanpa indexing saat buka; indeks sudah persisten di IndexedDB |
| Buka catatan | < 100 ms | Muat blok yang terlihat dulu |
| Cari 10.000 catatan | < 50 ms | Indeks terbalik, bukan pindai |
| Ketik → karakter muncul | < 16 ms | Blok aktif saja yang dirender ulang |
| Catatan 10.000 kata | Gulir mulus | Virtualisasi blok |
| Autosave | Tak terasa | Debounce 600 ms, tulis per blok, di Web Worker |

**Uji wajib sebelum rilis:** vault 5.000 catatan di HP Android kelas menengah.
Kalau target di atas tidak tercapai, fitur ditunda — bukan targetnya yang diturunkan.

---

## 5. Urutan Pengerjaan

Aturan tetap berlaku: satu tahap selesai dan dipakai sendiri sebelum lanjut.

| Tahap | Isi | Selesai kalau |
|---|---|---|
| **N1 — Inti** | Editor blok, markdown dasar, autosave, daftar, folder, tag | Nyaman dipakai mencatat harian |
| **N2 — Mobile** | Toolbar di atas keyboard, slash command, seret blok, capture cepat | Mengetik markdown dengan jempol tidak menyiksa |
| **N3 — Tautan** | `[[wikilink]]`, autocomplete, backlink, unlinked mention | Terasa seperti PKM sungguhan |
| **N4 — Cari** | Indeks penuh, operator, pencarian instan | < 50 ms di 5.000 catatan |
| **N5 — Struktur** | Properties, sematan, tautan blok, local graph | Bisa menaut antar gagasan dengan presisi |
| **N6 — Query** | Smart Folder, tampilan tabel/kanban/kalender | Dataview-lite tanpa belajar sintaks |
| **N7 — Data** | Riwayat versi, ekspor/impor, impor vault Obsidian | Pindah dari Obsidian dalam satu klik |

**N1–N3 adalah target realistis pertama.** Setelah N3, Hara sudah lebih enak dipakai di HP
daripada Obsidian — walau fiturnya jauh lebih sedikit. Itulah intinya.

---

## 6. Risiko

| Risiko | Mitigasi |
|---|---|
| Editor blok itu bagian tersulit; gampang jadi lubang tanpa dasar | Pakai fondasi teruji (Lexical/ProseMirror), bukan `contenteditable` mentah |
| Fitur membengkak, performa jebol | Anggaran performa §4 mengikat; fitur yang melanggar ditunda |
| Editing di Android memang sulit (Obsidian pun gagal) | Uji di perangkat nyata sejak N1, bukan di emulator; ini justru janji utama kita |
| Ukuran bundel membengkak | LaTeX, syntax highlight, PDF dimuat malas; anggaran bundel awal < 200 KB gzip |
| Pengguna Obsidian enggan pindah | Impor vault yang mulus + ekspor `.md` — datang & pergi tanpa risiko |
| Tergoda menambah sistem plugin | Ditolak secara arsitektur; ekstensibilitas lewat Smart Folder & template |
