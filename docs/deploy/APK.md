# Hara sebagai APK Android

Hara dibungkus dengan **Capacitor 8** dan dibangun lewat **GitHub Actions**
(templat ada di `docs/deploy/apk-workflow.yml`).

## Cara kerja (mode bundel + pembaruan OTA)

- Isi aplikasi (`docs/`) **dibundel di dalam APK** dan bisa dipakai offline.
- Plugin `@capgo/capacitor-updater` (MPL-2.0, gratis, mode "No Cloud") mengecek
  `version.json` di rilis GitHub **`web-latest`**. Jika versinya beda, zip
  `hara-web.zip` diunduh di latar belakang dan muncul tombol **Pasang sekarang**.
- Pembaruan isi **tidak butuh pasang ulang APK**. APK baru hanya perlu dipasang
  saat kode native berubah (`android/`, plugin, izin, ikon).
- Pembaruan yang gagal dibuka dikembalikan otomatis oleh plugin.
- Statistik Capgo dimatikan (`statsUrl: ""`). Tidak ada data yang dikirim ke Capgo.

Origin WebView diset ke `hiraneku.github.io` (`server.hostname`), sama dengan
Pages, supaya catatan di penyimpanan lokal (localStorage/IndexedDB) tetap terbaca.
Ini belum diverifikasi di perangkat. **Sebelum pasang APK pertama kali ini,
ekspor cadangan JSON dulu** (Pengaturan → Data → Ekspor, termasuk gambar) sebagai pengaman.

## Secret yang dibutuhkan

Cukup **satu** secret: Settings → Secrets and variables → Actions → New repository secret.

| Nama | Isi |
|---|---|
| `HARA_SEED` | Kata sandi acak panjang (minimal 16 karakter), misalnya 24 huruf dan angka acak. Buat sendiri, lalu simpan di catatan pribadi. |

Dari `HARA_SEED`, workflow membuat keystore yang selalu sama di setiap build
(`android/scripts/buat-kunci.cjs`). Jadi tanda tangan APK tidak berubah dan
pembaruan bisa dipasang di atas instalasi lama.

**Jangan ganti atau hilangkan `HARA_SEED`** setelah APK terpasang. Kalau berubah,
kuncinya berbeda dan pembaruan tidak bisa dipasang di atas APK lama.

Tanpa secret, workflow tetap membangun APK tetapi ditandatangani debug, dan
APK seperti itu tidak bisa memperbarui instalasi sebelumnya.

## Build lokal (opsional)

```bash
npm ci
npx cap sync android
cd android && ./gradlew assembleDebug   # butuh JDK 21 dan Android SDK
```

## Catatan platform

- Font: Android tidak punya Arial/Georgia/Verdana. Deteksi font sudah ada.
- Font Google dimuat dari internet. Tanpa koneksi, font sistem dipakai.
- `localStorage` bisa dibersihkan sistem. Penyimpanan catatan dipindahkan ke IndexedDB.
- Fitur yang hanya ada di browser desktop (File System Access, Web Share Target,
  pembaruan service worker) tidak dipakai.
- Paket native harus gratis (lihat daftar di ROADMAP bagian K).
