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
├── core/               dipakai SEMUA tools
│   ├── store.js        state + localStorage. Ganti isi file ini saat pindah ke Dexie
│   ├── blobs.js        berkas (gambar) di IndexedDB — kuota jauh lebih besar
│   ├── autosave.js     AUTOSAVE MANAGER: debounce, anti-race, status, flush
│   ├── recovery.js     draf crash — satu entri, dibuang setelah save sukses
│   ├── router.js       go(), registerViews(), kait onBeforeLeave/onAfterRender
│   ├── dom.js          $ $$ el esc stamp
│   └── toast.js
│
├── notes/              SEMUA fungsi fitur Catatan
│   ├── index.js        modul mendaftarkan diri: view, bar, event, autosave
│   ├── note-model.js   BENTUK DATA: makeNote/makeBlock, blocks<->DOM, migrasi
│   ├── model.js        CRUD catatan: newNote, delNote, findNote, onTitle
│   │
│   ├── editor/         mesin editor — bagian paling rawan
│   │   ├── caret.js    curBlock, ensureCaret, caretEnd, nearestEditable
│   │   ├── blocks.js   setBlock, insertHr, indent + BLOCKCLS
│   │   ├── marks.js    toggleMark, pending, flushPending
│   │   ├── markdown.js autoFormat + pola INLINE & LINE
│   │   ├── cleanup.js  cleanup, updateCount, syncBtns, saveNow/saveSoon
│   │   ├── history.js  undo/redo — snapshot sendiri, bukan execCommand
│   │   ├── image.js    sisip/pasang/hapus gambar
│   │   ├── blockref.js tandai blok dengan ^id
│   │   └── events.js   input, beforeinput, keydown, selectionchange
│   │
│   ├── bar/
│   │   ├── config.js   DAFTAR TOMBOL SEBAGAI DATA (datar + kelompok)
│   │   ├── prefs.js    kontrol mana yang tampil + saklar getar
│   │   ├── actions.js  peta aksi tiap tombol
│   │   └── render.js   gambar bar + focusKeep
│   │
│   ├── menus/          pop, slash, wikilink, tag, insert
│   └── views/          list, editor, row, welcome, misc
│
├── styles/             tokens → base → shell → notes  (urutan cascade penting)
└── tools/              tools berikutnya, meniru pola notes/
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

1. **Semua tulis data lewat `core/store.js`.** Tidak ada modul yang menyentuh
   `localStorage` langsung. Saat pindah ke Dexie, cukup satu file yang berubah.

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
