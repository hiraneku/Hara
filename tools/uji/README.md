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
| `bagian-c.mjs` | C14 ganti gambar (tata letak tetap) · C15 galeri · C16 thumbnail daftar |

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
