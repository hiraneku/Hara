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
