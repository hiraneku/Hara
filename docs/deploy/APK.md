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

## Secret yang dibutuhkan (Settings → Secrets and variables → Actions)

| Nama | Isi |
|---|---|
| `HARA_KS_B64` | keystore PKCS12 dalam base64 |
| `HARA_KS_PASS` | password keystore |
| `HARA_KEY_ALIAS` | alias kunci (`hara`) |
| `HARA_KEY_PASS` | password kunci (sama dengan password keystore) |

Tanpa secret, workflow tetap membangun APK tetapi ditandatangani debug. APK
seperti itu **tidak bisa** memperbarui instalasi sebelumnya; pasang ulang
berarti data lokal hilang. Simpan cadangan keystore di tempat aman. Jika
keystore hilang, semua pengguna harus pasang ulang.

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
