# Cara menerbitkan Hara

Hara prototipe adalah **aplikasi ES modules murni** di dalam `docs/` — tanpa build,
tanpa dependensi. GitHub Pages tinggal menyajikan folder `docs/` apa adanya.

## Status sekarang (7 Sep 2026)

**GitHub Pages SUDAH AKTIF** dan menjadi alamat utama aplikasi:

```
https://hiraneku.github.io/Hara/
```

- Repo: publik (`hiraneku/Hara`)
- Sumber: **Deploy from a branch** → branch `arena/01a07a14-hara` · folder `/docs`
- Aplikasi penuh ada di akar URL (bukan subfolder `/prototype/`)
- **Setiap push ke branch `arena/01a07a14-hara` otomatis membangun ulang situs** —
  selesai dalam 1–2 menit. Tidak perlu langkah manual apa pun.

Karena GitHub Pages menyajikan modul ES dengan cache agresif (browser HP bisa
menahan berkas lama berhari-hari), jalankan ini sebelum commit:

```
node tools/version.mjs
```

Skrip menempelkan `?v=<cap waktu>` ke semua import/script/link lokal (idempoten),
sehingga pengunjung selalu mendapat versi terbaru.

## Mengganti sumber / cabang

Bila perlu mengarahkan ke cabang atau folder lain:

1. Buka **Settings → Pages**.
2. *Source*: **Deploy from a branch**.
3. Pilih branch & folder (saat ini `arena/01a07a14-hara` · `/docs`) → **Save**.

> Cabang `main` saat ini HANYA berisi README — jangan arahkan Pages ke `main`
> kalau ingin aplikasinya tampil.

## Alternatif: GitHub Actions

`docs/deploy/github-pages-workflow.yml` bisa disalin ke `.github/workflows/pages.yml`
kalau ingin *build* lewat Actions (mis. untuk upload artefak `dist/` nanti). Saat ini
tidak diperlukan — deploy dari branch sudah cukup.

## Catatan

Setelah aplikasi React yang sebenarnya dibangun (fase 0 di `PLAN.md`), alur terbit
diganti: `npm run build` menghasilkan `dist/`, dan `dist/` itulah yang diunggah,
bukan lagi `docs/`.
