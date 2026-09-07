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

**Aturan:** semua harus lolos. Kalau satu gagal, jangan tambal gejalanya —
telusuri sampai akar, lalu tambahkan kasusnya ke suite ini.
