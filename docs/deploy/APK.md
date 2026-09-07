# Membungkus Hara jadi APK

Status kesiapan per 7 Sep 2026. Belum dikerjakan (sesuai keputusan
"APK paling terakhir"), tapi tidak ada penghalang arsitektur.

## Sudah siap

| Syarat | Status |
|---|---|
| Aset statis murni (tanpa build step) | ✅ 408 KB, 46 berkas |
| Semua path **relatif** (`./styles/…`) | ✅ wajib untuk `file://` |
| Tanpa dependency runtime | ✅ ES modules murni |
| Penyimpanan lokal | ✅ localStorage + IndexedDB |

## Langkah nanti

```bash
npm i -D @capacitor/cli @capacitor/core @capacitor/android
npx cap init Hara id.hara.app --web-dir=docs
npx cap add android
npx cap sync android
cd android && ./gradlew assembleDebug
```

`capacitor.config.json`:
```json
{ "appId": "id.hara.app", "appName": "Hara", "webDir": "docs" }
```

Tidak ada langkah build web — `cap sync` cukup menyalin `docs/`.

## Dukungan WebView Android

| API | Dukungan | Catatan |
|---|---|---|
| `localStorage` | ✅ | bisa dibersihkan sistem saat ruang menipis |
| `IndexedDB` | ✅ | penyimpanan gambar; kuota jauh lebih besar |
| `navigator.vibrate` | ✅ | umpan balik getar |
| `navigator.storage.estimate` | ✅ | info ruang di Pengaturan |
| `clipboardData` pada `paste` | ✅ | termasuk gambar lewat `items`/`files` |

## Yang perlu diperhatikan saat membungkus

1. **Font sistem berbeda.** Android tidak punya Arial/Georgia/Verdana.
   Deteksi ketersediaan sudah ada dan menandai font yang tidak tersedia.
   Kalau ingin pilihan seragam, muat font lewat Google Fonts atau bundel
   berkasnya (menambah ukuran APK).
2. **Fonts Google saat ini dimuat dari internet.** Untuk APK yang benar-benar
   luring, unduh dan bundel `Inter`, `Instrument Serif`, `JetBrains Mono`
   ke `docs/fonts/`, lalu ganti `<link>` di `index.html` dengan `@font-face`.
3. **`localStorage` bisa dihapus sistem.** Untuk APK produksi, pindahkan
   catatan ke IndexedDB juga (jalur `core/store.js`, satu berkas).
4. **Izin `workflow` GitHub.** Berkas `.github/workflows/build-apk.yml`
   tidak bisa di-push dari sandbox ini; salin manual lewat web GitHub.
