# Arsitektur Kode

Prototipe Hara memakai **ES modules murni** — tanpa build step. Browser memuat
`app.js` sebagai `type="module"`, GitHub Pages tinggal menyajikan berkasnya apa adanya.

Semua path **relatif** (`./core/...`), jadi berkas yang sama jalan di GitHub Pages
maupun saat dibungkus jadi APK lewat Capacitor (`webDir: "docs"`).

## Peta folder

```
docs/
├── index.html          kerangka HTML saja — tak ada logika di dalamnya
├── app.js              titik masuk: daftar modul, navigasi global, tema
│
├── core/               dipakai SEMUA modul
│   ├── store.js        state + localStorage catatan; satu pintu tulis data
│   ├── blobs.js        berkas (gambar) di IndexedDB — kuota jauh lebih besar
│   ├── autosave.js     AUTOSAVE MANAGER: debounce, anti-race, status, flush
│   ├── recovery.js     draf crash — satu entri, dibuang setelah save sukses
│   ├── router.js       go(), registerViews(), kait onBeforeLeave/onAfterRender
│   ├── i18n.js         t() + bahasa aktif + lokale (id/en/ja)
│   ├── bahasa-en.js    kamus Inggris (kunci = teks Indonesia)
│   ├── bahasa-ja.js    kamus Jepang
│   ├── theme.js        tema terang/gelap + warna aksen
│   ├── dom.js          el, esc, stamp, tglHari — helper DOM dipakai semua modul
│   └── toast.js
│
├── notes/              SEMUA fungsi fitur Catatan
│   ├── index.js        modul mendaftarkan diri: view, bar, event, autosave
│   ├── note-model.js   BENTUK DATA: makeNote/makeBlock, blocks<->DOM, migrasi
│   ├── model.js        CRUD catatan: newNote, delNote, findNote, onTitle
│   ├── data-io.js      ekspor/impor (JSON, ZIP, markdown) + cadangan
│   ├── harian.js       jurnal harian (judul per bahasa, anti-dobel)
│   ├── templat.js      templat bawaan & templat tersimpan
│   ├── cari.js         pecahKueri (tag:/judul:/#/"frasa"), cocok, sorot, riwayat
│   ├── urut.js         urutan daftar + preferensinya
│   ├── pilih.js        pilih banyak (tahan-lama) + aksi sekaligus
│   ├── swipe.js        sapuan hapus/arsip di daftar
│   ├── drag.js         geser blok & catatan
│   ├── tags.js         baca tag dari isi; label-tag.js warna labelnya
│   ├── wikilink.js     catatan yang menyebut/menaut catatan lain
│   ├── panels.js       panel balik, rujukan, graf
│   ├── daftar-isi.js   daftar heading di panel
│   ├── meta-ui.js      editor properti catatan
│   ├── kunci.js        kunci catatan (PIN + sidik jari)
│   ├── share.js        bagikan / salin catatan
│   ├── mode-baca.js    mode baca, A−/A+, zen, cari di dalam catatan
│   ├── baca-plus.js    ukuran teks baca + zen
│   ├── galeri.js       gambar catatan
│   ├── tata-gambar.js  lebar/posisi/zona gambar
│   ├── mutu-gambar.js  pilihan kompresi gambar (C17)
│   ├── pengingat.js    tenggat to-do (hari/besok/tanggal) → chip & Reminder
│   ├── html-util.js    helper HTML bersama
│   │
│   ├── editor/         mesin editor — bagian paling rawan
│   │   ├── caret.js    curBlock, ensureCaret, caretEnd, nearestEditable
│   │   ├── blocks.js   setBlock, insertHr, indent + renumber (nomor daftar)
│   │   ├── marks.js    toggleMark, pending, flushPending
│   │   ├── markdown.js autoFormat + pola INLINE & LINE
│   │   ├── cleanup.js  cleanup, updateCount, syncBtns, saveNow/saveSoon
│   │   ├── history.js  undo/redo — snapshot sendiri, bukan execCommand
│   │   ├── image.js    sisip/pasang/hapus gambar
│   │   ├── blockref.js tandai blok dengan ^id
│   │   ├── paste.js    bersihkan clipboard → blok; HTML tak pernah mentah
│   │   ├── tempel-mekanik.js  teks polos dari luar → mekanik Hara (daftar, heading, tautan)
│   │   ├── bilah-teks.js      bilah format di atas teks yang disorot
│   │   ├── sorotan.js / warna.js / font.js  format lekat (sorot, warna, font)
│   │   └── events.js   input, beforeinput, keydown, selectionchange
│   │
│   ├── bar/
│   │   ├── config.js   DAFTAR TOMBOL SEBAGAI DATA (datar + kelompok)
│   │   ├── prefs.js    kontrol mana yang tampil + saklar getar
│   │   ├── actions.js  peta aksi tiap tombol
│   │   ├── render.js   gambar bar + focusKeep
│   │   └── help.js     teks bantuan tiap tombol
│   │
│   ├── menus/          pop, slash, slash-trigger, wikilink, tag, insert, link,
│   │                   callout, warna, font, note-menu — semua popover editor
│   └── views/          list, editor, row, welcome, misc, tugas, data
│
├── styles/             tokens → base → shell → notes  (urutan cascade penting)
└── deploy/             cara menerbitkan (GitHub Pages)
```

## Aturan yang menjaga kode tetap rapi

0. **`blocks` adalah sumber kebenaran isi catatan.** Tidak ada field `html`
   yang disimpan berdampingan. HTML hanya hasil render (`blocksToDom`) dan
   hasil baca balik (`domToBlocks`). Nilai turunan seperti cuplikan dihitung
   saat dibutuhkan (`excerptOf`), tidak pernah disimpan ganda.

0b. **Id blok dibuat SEKALI, lewat `newBlockId()` saja.** Id hidup di DOM
   sebagai `data-bid` dan dibaca balik dari sana — jadi ia tidak berubah
   saat isi diedit, blok dipindah, catatan dirender ulang, atau disimpan
   dan dibuka lagi. `pastikanBlockId()` adalah satu-satunya titik yang
   memberi id ke blok baru (Enter, tombol bar, tempel, clone browser);
   ia juga mendeteksi id kembar akibat clone dan memberi id baru.
   Duplikat blok WAJIB lewat `duplicateBlock()` agar dapat id baru.
   Jangan pernah memakai index atau `blocks.length` sebagai id.

0c. **Editor tidak menulis ke storage.** Alurnya
   `editor → tandaiBerubah() → autosave.js → store.js`. Penjadwalan,
   urutan penulisan, dan draf recovery diurus manager, bukan editor.
   Berpindah catatan WAJIB `flush()` dulu — kalau `openId` diganti lebih
   dulu, isi editor lama tertulis ke catatan yang salah.

0d. **Jangan pernah menyisipkan `U+200B` ke DOM editor.** Penanda itu ikut
   tersimpan, mengacaukan deteksi posisi caret, dan merusak spasi saat
   browser menggabungkan elemen inline bersebelahan. Pakai text node
   kosong sebagai pijakan caret. Suite `tools/uji/spasi-dan-penanda.mjs`
   menjaga aturan ini.

1. **Data catatan hanya ditulis lewat `core/store.js`.** Tidak ada modul yang
   menulis catatan lewat jalur lain — pindah ke Dexie cukup mengubah satu berkas.
   Preferensi kecil yang bukan catatan (tema, bahasa, mutu gambar, riwayat cari,
   susunan bar) menyimpan sendiri di `localStorage` dengan kunci berpola
   `hara.*` — sengaja terpisah supaya tidak ikut tersinkron/terekspor.

2. **Bar adalah data, bukan HTML.** Menambah tombol = satu baris di
   `bar/config.js` + satu fungsi di `bar/actions.js`. `index.html` tidak disentuh.

3. **Caret hanya diurus `editor/caret.js`.** Aturan mutlak: caret selalu bertumpu
   pada *text node*, tidak pernah pada elemen. Semua bug "aloH" berasal dari
   pelanggaran aturan ini.

4. **Modul mendaftarkan diri.** `notes/index.js` memanggil `registerViews()` dan
   memasang kaitnya sendiri. `app.js` cuma menyebut modul mana yang aktif —
   menambah Reminder nanti berarti menambah satu baris di `MODULES`.

5. **Tanpa handler inline di HTML.** `onclick="..."` tidak bisa melihat scope
   modul. Semua kejadian dipasang lewat `addEventListener`.

## Menambah tools baru (mis. Reminder)

```
tools/reminder/
├── index.js     export reminderModule { id, name, color, init() }
├── model.js
└── views/
```
Lalu di `app.js`: `import { reminderModule } from './tools/reminder/index.js';`
dan masukkan ke array `MODULES`.

## Sebelum commit: cap versi

GitHub Pages menyajikan modul ES dengan cache agresif, dan browser HP kerap
menahan berkas lama berhari-hari — deploy berhasil tapi pengguna tetap melihat
versi lama. Karena itu jalankan ini setiap kali sebelum commit:

```
node tools/version.mjs
```

Skrip menempelkan `?v=<cap waktu>` ke semua import, `<script src>`, dan
`<link href>` lokal. Idempoten: cap lama diganti, bukan ditumpuk.

## Rencana berikutnya

Saat pindah ke React + Vite + Lexical, struktur folder ini **tetap** —
yang berubah hanya isi berkasnya (`.js` → `.tsx`). Itu sebabnya pemisahan
dilakukan sekarang, bukan nanti.
