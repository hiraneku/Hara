# Suite uji kombinasi format

Dibuat setelah bug "huruf pindah ke depan" berulang kali kambuh karena
diperbaiki satu-skenario-per-satu tanpa menguji **kombinasi**.

Jalankan sebelum menyentuh `marks.js`, `events.js`, atau `font.js`:

```
npm i jsdom fake-indexeddb --no-save
for f in tools/uji/*.mjs; do node $f; done
```

| Berkas | Cakupan |
|---|---|
| `kombinasi-dasar.mjs` | semua pasangan & triplet mark, mark+font, urutan toggle |
| `kombinasi-lanjut.mjs` | on/off berulang, ketik panjang, mark menyusul di tengah |
| `caret-elemen.mjs` | caret bertumpu pada ELEMEN, bukan text node |
| `kondisi-tepi.mjs` | pending nyangkut, sisip di tengah, toggle tanpa ketik |
| `spasi-dan-penanda.mjs` | spasi termakan, huruf berpindah saat ganti format |
| `editor-dasar.mjs` | acceptance criteria editor dasar: tipe blok, Enter/ID, todo meta, slash menu |
| `paste.mjs` | paste plain/rich, keamanan clipboard, ID blok, caret, undo |
| `font-menyeluruh.mjs` | matriks lengkap pergantian font + span BERSARANG |
| `font-ganti.mjs` | ganti font nyangkut ke font lama, span font kosong menumpuk |
| `baca-todo-tpl.mjs` | mode baca, simpan templat, panel todo (Bagian A/B) |
| `tata-gambar.mjs` | tata letak gambar: gagang, bilah mini, undo/redo |
| `sorotan.mjs` | sorot `==teks==` & ganti warna |
| `warna.mjs` | warna teks & roda warna |
| `bagian-b.mjs` | B7 urut/filter · B8 daftar isi · B9 Tugas/Reminder · B10 tag berwarna · B11 templat · B12 jurnal · B13 slash |
| `tugas-lanjut.mjs` | K2 tata bahasa tenggat (lusa, minggu depan, N hari lagi, jam) · K2 pengulangan (harian/mingguan/bulanan, lompat kejadian terlewat) · K5 prioritas `!`–`!!!` |
| `ulang-tugas.mjs` | K2 to-do berulang di editor (dicentang → geser, tersimpan `data-ulang`) · penanda ↻ & prioritas di layar Tugas |
| `renamer-k3.mjs` | K3 token foto & audio: EXIF SubIFD (ISO, bukaan, rana, fokus, dimensi), token `{iso}`…`{genre}`, fallback `unknown` |
| `tunda-tugas.mjs` | K4/K6 jadwal ulang to-do dari kartu Tugas (Hari ini / Besok / Minggu depan); berulang & berformat ditolak |
| `palette.mjs` | K1 command palette: Ctrl/⌘+K, pencocokan, Enter/Esc, lompat layar & buka catatan |
| `matriks-kalender-ics.mjs` | K7 matriks prioritas · K9 kalender bulanan (jatuhPada, navigasi, pilih hari) · K8 ICS ekspor/impor pulang-pergi (RFC 5545, escape, lipatan) |
| `transklusi-yatim.mjs` | K10 rujukan blok `![[Judul#^id]]` (resolusi, rusak, terkunci, escape) · K11 catatan yatim |
| `cari-peringkat.mjs` | K12 pencarian terindeks: paritas dengan catatanCocok, peringkat relevansi, toleransi salah ketik (Levenshtein), alur Worker, D19 di layar Cari |
| `templat-variabel.mjs` | K16 variabel templat: bawaan `{tanggal}`/`{judul}` dll., isian lewat formulir, escape HTML, alur klik |
| `migrasi-idb.mjs` | penyimpanan: migrasi localStorage → IndexedDB (tidak destruktif, proses sendiri) |
| `penyimpanan-idb.mjs` | penyimpanan: simpanTahan, save() beruntun (keadaan terbaru), data rusak → kunci rusak-<ts> |
| `renamer-lanjutan.mjs` | renamer K21–K25, K27, K29: kondisi/grup, penjelas regex, belajar dari contoh, resep, duplikat (SHA/dHash), batch |
| `statistik.mjs` | K20: heatmap aktivitas, tugas per minggu, rentetan jurnal |
| `riwayat-sesi.mjs` | K26: undo catatan lintas sesi (IDB), catatan terkunci tidak ditulis, log CSV |
| `enkripsi-suara.mjs` | K17 enkripsi AES-GCM + PBKDF2, K18 cadangan frasa sandi, K15 baca keras & dikte |
| `kunci-data.mjs` | MB3 kunci data acak, bungkus/buka dengan kunci pembungkus, segel isi catatan; PRF disimulasikan (autentikator asli tidak diuji) |
| `cadangan-besar.mjs` | K18 cadangan terenkripsi ±10 MB: roundtrip byte demi byte, frasa salah, perusakan, penanda teks tidak bocor |
| `tabel-rumus.mjs` | MB2 urut (naik/turun, aturan Excel), saring, rumus A1 SUM/AVERAGE/MIN/MAX/COUNT, galat #DIV/0! #REF! #NILAI! #SIKLUS! |
| `tabel-lanjut-ui.mjs` | MB2 di editor (jsdom): data-hasil, urut mengubah urutan baris, saring tanpa menghapus data |
| `papan.mjs` | MB1 logika papan: kelompok per properti, urutan dari contoh, (kosong) di akhir, kalender Senin |
| `papan-ui.mjs` | MB1 papan & kalender di editor (jsdom): pindah kartu mengubah properti, geser bulan |
| `pintar-ui.mjs` | S1–S5 lewat palette (jsdom): mirip, saran tag, tangkap cepat, tinjauan, ringkasan; catatan terkunci tidak bocor |
| `alat-renamer.mjs` | dialog renamer K21–K25 & K22–K23 lewat klik sungguhan (jsdom): regex, contoh, syarat, resep, duplikat |
| `fitur-catatan-ui.mjs` | K31 tenggat→tugas, K19 tabel properti, K30 sumber palette tugas (memuat app.js) |
| `lib/catatan-idb.mjs` | pembantu bersama: baca/tulis record catatan di IndexedDB untuk uji |
| `bagian-c.mjs` | C14 ganti gambar (tata letak tetap) · C15 galeri · C16 thumbnail daftar |
| `pilih-banyak.mjs` | F25 tahan-lama di baris · bilah mini · semat/arsip/hapus sekaligus · Urungkan |
| `cari-tajam.mjs` | F26 operator tag:/judul: · sorot hasil · riwayat pencarian |
| `bilah-sorot.mjs` | F27 bilah format di atas teks yang disorot |
| `mutu-gambar.mjs` | C17 pilihan mutu gambar di Pengaturan · keputusan pengecilan |
| `musik-logika.mjs` | pemutar musik tahap 1: batas tempo/nada, loop A-B, format waktu, puncak gelombang, pengaturan per lagu (murni, <1 detik) |
| `musik-layar.mjs` | pemutar musik tahap 1: navigasi tanpa navigasi bawah, pustaka & pengaturan dipulihkan, kartu beranda, hapus dua-ketuk (jsdom) |
| `tempel-mekanik.mjs` | tempel dari luar: batas baris `<br>`/elemen blok, daftar 1/2/3 (termasuk nomor tebal & bersarang), butir, to-do, heading, kutipan, callout, pembatas, pagar kode, tautan (a.lk) |

**Aturan:** semua harus lolos. Kalau satu gagal, jangan tambal gejalanya —
telusuri sampai akar, lalu tambahkan kasusnya ke suite ini.


## Aturan mutlak: JANGAN menyisipkan penanda ke DOM

Selama berbulan-bulan bug "huruf pindah ke depan" dan "spasi hilang" kambuh
berulang kali. Akarnya satu: kode menyisipkan `U+200B` (zero-width space)
sebagai *pijakan caret*.

Penanda itu:
- ikut tersimpan ke catatan,
- membuat `markAround()` salah menilai posisi caret,
- dan saat browser **menggabungkan dua elemen inline bersebelahan**, ia
  mendarat di antara spasi dan kata berikutnya sehingga spasi ikut termakan.

Kalau butuh pijakan caret, pakai **text node kosong** (`createTextNode('')`)
dengan caret di offset 0. Node kosong tidak tersimpan dan tidak merusak teks.

`cleanup()` juga membersihkan penanda warisan dari catatan lama.

## Span font tidak boleh bersarang

`<span class="fnt">` di dalam `<span class="fnt">` membuat "keluar dari font"
hanya melepas satu lapis — caret mendarat di font LUAR, dan pengguna melihat
"font sebelumnya" atau "sebelum-sebelumnya" dipakai lagi.

Dua pengaman: `keluarDariFont()` keluar **berulang** sampai bebas, dan
`cleanup()` **meratakan** sarang yang terlanjur terbentuk.
