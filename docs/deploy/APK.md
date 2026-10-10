# Hara sebagai APK Android

Hara dibungkus dengan **Capacitor 8** dan dibangun lewat **GitHub Actions**
(templat ada di `docs/deploy/apk-workflow.yml`).

## Cara kerja pembaruan

APK **memuat** `https://hiraneku.github.io/Hara/` (lihat `capacitor.config.json`
→ `server.url`). Pages sudah aktif dari branch `arena/c3f71ef0-hara` folder
`/docs`, jadi setiap push ke branch itu langsung terlihat di dalam APK saat
aplikasi dibuka ulang. Tidak perlu unduh dan pasang ulang APK untuk pembaruan
isi aplikasi.

APK perlu dibangun ulang hanya bila kode native berubah (`android/`, plugin
Capacitor, izin, ikon). Workflow sudah membangun setiap push, dan hasilnya
ada di rilis **`apk-latest`** (pre-release) dan artifact run.

Syarat agar pembaruan bisa dipasang di atas APK lama: tanda tangan harus sama
di setiap build. Itu sebabnya dipakai keystore tetap dari secret GitHub.

## Memasang workflow (satu kali)

Token sandbox tidak punya izin `workflows`, jadi berkas workflow tidak bisa
di-push langsung. Pasang lewat web GitHub:

1. Buka repo → **Add file → Create new file**.
2. Nama: `.github/workflows/apk.yml`. Isi: salin dari `docs/deploy/apk-workflow.yml`.
3. Commit ke branch `arena/c3f71ef0-hara`.

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
- Font Google dimuat dari internet, jadi pembukaan pertama butuh koneksi.
- `localStorage` bisa dibersihkan sistem. Penyimpanan catatan dipindahkan ke IndexedDB.
- Fitur yang hanya ada di browser desktop (File System Access, Web Share Target,
  pembaruan service worker) tidak dipakai.
- Paket native harus gratis (lihat daftar di ROADMAP bagian K).
