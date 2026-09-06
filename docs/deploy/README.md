# Cara menerbitkan prototipe Hara

Prototipe (`docs/prototype/index.html`) adalah **satu berkas HTML mandiri** — tanpa build,
tanpa dependensi, tanpa server. Karena itu ia bisa diterbitkan di mana saja.

Agen Arena tidak bisa mengaktifkan Pages sendiri: token sandbox ditolak dengan
`403 Resource not accessible by integration`, dan repo ini masih privat.
Berikut pilihannya, dari yang paling cepat.

---

## Opsi A — Tanpa server sama sekali (paling cepat, jalan offline)

1. Buka `docs/prototype/index.html` di GitHub.
2. Klik tombol **Raw**, lalu simpan halaman itu (di Android: menu ⋮ → *Download*).
3. Buka berkas hasil unduhan dengan browser.

Semuanya tetap berfungsi: navigasi, dark mode, FAB, sheet, toast. Hanya font Google
yang butuh internet; tanpa internet ia jatuh ke Georgia + system-ui dan tetap rapi.

---

## Opsi B — GitHub Pages (URL permanen)

**Syarat:** repo harus **publik**, kecuali akunmu berlangganan GitHub Pro/Team.

### B1. Cara paling sederhana — tanpa workflow

1. Jadikan repo publik: **Settings → General → Danger Zone → Change visibility → Public**.
2. Buka **Settings → Pages**.
3. *Source*: **Deploy from a branch**.
4. *Branch*: `arena/01a0753e-hara` · *Folder*: **`/docs`** → **Save**.
5. Tunggu 1–2 menit.

URL yang dihasilkan:

```
https://hiraneku.github.io/Hara/prototype/
```

Perhatikan `/prototype/` di akhir — karena yang disajikan adalah folder `docs`,
sedangkan prototipe ada di dalam `docs/prototype/`.

### B2. Lewat GitHub Actions (URL lebih bersih)

Pakai ini kalau ingin prototipe berada tepat di akar URL.

1. Jadikan repo publik (langkah sama seperti di atas).
2. Salin `docs/deploy/github-pages-workflow.yml` ke `.github/workflows/pages.yml`.
   Berkas ini sengaja disimpan di sini, bukan di `.github/`, karena token agen
   tidak punya izin `workflows` sehingga push-nya ditolak GitHub.
3. **Settings → Pages → Source: GitHub Actions**.
4. Commit dan push. Workflow berjalan otomatis setiap ada perubahan di `docs/prototype/`.

URL yang dihasilkan:

```
https://hiraneku.github.io/Hara/
```

---

## Opsi C — Tetap privat tapi punya URL

Kalau repo tidak ingin dipublikkan:

- **Netlify Drop** — buka <https://app.netlify.com/drop>, seret folder `docs/prototype`.
  Tanpa akun, langsung dapat URL.
- **Cloudflare Pages** atau **Vercel** — hubungkan repo, atur *output directory*
  ke `docs/prototype`, tanpa perintah build.

---

## Catatan

Setelah aplikasi React yang sebenarnya dibangun (fase 0 di `PLAN.md`), alur terbit ini
akan diganti: `npm run build` menghasilkan `dist/`, dan `dist/` itulah yang diunggah,
bukan lagi `docs/prototype`.
