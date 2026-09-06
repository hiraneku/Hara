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
│   ├── router.js       go(), registerViews(), kait onBeforeLeave/onAfterRender
│   ├── dom.js          $ $$ el esc stamp
│   └── toast.js
│
├── notes/              SEMUA fungsi fitur Catatan
│   ├── index.js        modul mendaftarkan diri: view, bar, event, autosave
│   ├── model.js        CRUD catatan: newNote, delNote, findNote, onTitle
│   │
│   ├── editor/         mesin editor — bagian paling rawan
│   │   ├── caret.js    curBlock, ensureCaret, caretEnd, nearestEditable
│   │   ├── blocks.js   setBlock, insertHr, indent + BLOCKCLS
│   │   ├── marks.js    toggleMark, pending, flushPending
│   │   ├── markdown.js autoFormat + pola INLINE & LINE
│   │   ├── cleanup.js  cleanup, updateCount, syncBtns, saveNow/saveSoon
│   │   └── events.js   input, beforeinput, keydown, selectionchange
│   │
│   ├── bar/
│   │   ├── config.js   DAFTAR TOMBOL SEBAGAI DATA
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

## Rencana berikutnya

Saat pindah ke React + Vite + Lexical, struktur folder ini **tetap** —
yang berubah hanya isi berkasnya (`.js` → `.tsx`). Itu sebabnya pemisahan
dilakukan sekarang, bukan nanti.
