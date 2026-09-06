# Hara — Rencana Produk & Arsitektur

> Satu aplikasi, banyak tools kecil (catatan, reminder, dan lainnya) yang berbagi satu core.

Status: draft v1 · Target awal: **Web PWA**, nanti dibungkus jadi APK · Data: **local-first**

---

## 1. Visi & Prinsip

**Visi.** Hara adalah "kotak perkakas pribadi": satu tempat untuk hal-hal kecil yang biasanya
tersebar di banyak aplikasi — catatan, pengingat, tugas, dan tools lain yang menyusul.

Nilai jualnya **bukan jumlah fitur**, tapi **integrasi antar fitur**: satu catatan bisa langsung
jadi pengingat, satu pencarian menemukan semuanya, satu tag menghubungkan lintas modul.

**Prinsip yang memandu semua keputusan:**

1. **Local-first.** Data milik user, tersimpan di perangkat, jalan tanpa internet. Sync itu
   fitur tambahan, bukan syarat hidup aplikasi.
2. **Satu modul selesai > lima modul setengah jadi.** Sebuah modul baru dirilis kalau sudah
   nyaman dipakai sehari-hari.
3. **Modul itu plugin.** Menambah tool baru = menambah satu folder, bukan membongkar aplikasi.
4. **Cepat & ringan.** Buka aplikasi → langsung bisa nulis. Tanpa splash screen, tanpa login wajib.
5. **Tanpa kunci vendor.** Export/import JSON selalu tersedia.

**Non-goal (untuk v1):** kolaborasi realtime, kerja tim, editor dokumen kaya ala Notion,
AI, dan sistem plugin dari pihak ketiga.

---

## 2. Stack Teknologi

| Lapisan | Pilihan | Alasan |
|---|---|---|
| Bahasa | **TypeScript** | Type-safety penting saat modul bertambah |
| UI | **React 18 + Vite** | Cepat, ekosistem besar, mudah dibungkus |
| Styling | **Tailwind CSS** | Konsisten, cepat, gampang bikin dark mode |
| Routing | **React Router** | Rute per modul, mudah didaftarkan dinamis |
| State | **Zustand** | Ringan, tanpa boilerplate |
| Database | **Dexie.js (IndexedDB)** | Query & index bagus, local-first, jalan offline |
| PWA | **vite-plugin-pwa** | Installable + offline shell |
| Test | **Vitest** + Testing Library | Satu toolchain dengan Vite |
| Lint/Format | ESLint + Prettier | — |
| Pembungkus APK | **Capacitor** (nanti) | Reuse 100% kode web; alternatif: Tauri v2 |

**Kenapa bukan Flutter/React Native?** Kita mau preview web dulu. Dengan React + Capacitor,
satu basis kode melayani web dan APK tanpa tulis ulang.

**Catatan Capacitor.** Karena semua data ada di IndexedDB dan tidak ada backend, pembungkusan
ke APK nanti hampir tanpa perubahan kode. Yang perlu ditambah cuma: notifikasi native
(`@capacitor/local-notifications`) sebagai pengganti Notification API web.

---

## 3. Arsitektur

### 3.1 Struktur folder

```
src/
  core/
    db/            # Dexie schema, migrasi, repository dasar
    store/         # state global (tema, pengaturan)
    ui/            # komponen bersama: Button, Card, Sheet, Empty, Input
    search/        # pencarian global lintas modul
    tags/          # manajemen tag lintas modul
    types.ts       # HaraItem & tipe bersama
  modules/
    notes/
      index.ts     # definisi modul (didaftarkan ke registry)
      pages/       # NotesList, NoteEditor
      components/
      api.ts       # akses data khusus notes
    reminders/
    tasks/
  app/
    registry.ts    # daftar modul aktif
    routes.tsx     # rute dirakit dari registry
    layout/        # shell: sidebar/bottom-nav, header
  main.tsx
```

### 3.2 Kontrak modul

Setiap modul mengekspor satu objek. Shell tidak tahu isi modul — hanya kontraknya.

```ts
export interface HaraModule {
  id: string;                       // "notes"
  name: string;                     // "Catatan"
  icon: LucideIcon;
  color: string;                    // aksen di nav
  routes: RouteObject[];            // rute relatif, di-mount di /notes/*
  // opsional — integrasi lintas modul:
  search?: (q: string) => Promise<SearchHit[]>;   // ikut pencarian global
  quickActions?: QuickAction[];                   // muncul di tombol "+"
  homeWidget?: React.ComponentType;               // kartu di dashboard
}
```

Menambah tool baru = buat folder di `modules/`, ekspor objek ini, daftarkan di `registry.ts`.
Selesai. Nav, rute, pencarian, dan tombol "+" otomatis ikut.

### 3.3 Data model bersama

Semua item punya bentuk dasar yang sama. Ini yang membuat search & tag global jadi "gratis".

```ts
interface HaraItem {
  id: string;              // uuid
  type: string;            // "note" | "reminder" | "task" | ...
  title: string;
  body?: string;           // markdown ringan
  tags: string[];
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;      // soft delete (tempat sampah 30 hari)
  archived?: boolean;
  pinned?: boolean;
  links?: string[];        // id item lain — inilah "integrasi"
  data?: Record<string, unknown>;  // field khusus per tipe
}
```

Field khusus tinggal masuk `data`, contoh reminder:
`data: { dueAt, repeat: "daily"|"weekly"|null, notified: boolean }`.

**Skema Dexie**

```ts
db.version(1).stores({
  items: 'id, type, updatedAt, deletedAt, archived, pinned, *tags, data.dueAt',
  settings: 'key',
  outbox: '++seq, id, op, at'   // disiapkan untuk sync nanti
});
```

Tabel `outbox` sengaja dibuat sejak awal walau belum dipakai — mencatat setiap
create/update/delete supaya penambahan sync tidak perlu migrasi besar.

### 3.4 Jalur ke sync (nanti, bukan sekarang)

Semua tulis lewat satu repository (`core/db/repo.ts`), tidak pernah langsung ke Dexie.
Jadi menambah sync = mengganti isi satu file, bukan menyentuh modul.

Rencana: Supabase (Postgres + Auth) · strategi konflik **last-write-wins per field**
berbasis `updatedAt` · soft delete sebagai tombstone. Data lokal tetap sumber kebenaran
saat offline.

---

## 4. Modul & Ruang Lingkup

### 4.1 Catatan (modul pertama)
- Buat/edit/hapus catatan, autosave saat mengetik
- Markdown ringan (heading, bold, list, checkbox)
- Tag, pin, arsip, tempat sampah
- Pencarian judul + isi
- Grid/list view

### 4.2 Reminder (modul kedua)
- Judul + waktu jatuh tempo, pengulangan sederhana (harian/mingguan/bulanan)
- Notifikasi via Web Notification API (native saat sudah jadi APK)
- Tampilan Hari Ini / Akan Datang / Terlewat
- **Integrasi:** tombol "Jadikan pengingat" dari sebuah catatan

### 4.3 Tugas (modul ketiga)
- Checklist dengan subtask, prioritas, due date
- **Integrasi:** tugas bisa punya due date → tampil bersama reminder di "Hari Ini"

### 4.4 Kandidat berikutnya
Kebiasaan (habit tracker) · Catatan keuangan cepat · Clipboard/snippet · Bookmark ·
Konverter unit · Jurnal harian

Aturan: sebuah kandidat baru dikerjakan setelah modul sebelumnya betul-betul dipakai
sendiri selama minimal seminggu.

---

## 5. Desain & UX

- **Navigasi:** bottom-nav di mobile (Beranda, Catatan, Reminder, Cari), sidebar di desktop.
- **Beranda = dashboard:** kartu ringkas dari tiap modul (`homeWidget`) — misal 3 catatan
  terakhir + reminder hari ini.
- **Tombol "+" universal:** satu FAB, isinya `quickActions` dari semua modul.
- **Pencarian global:** satu kotak cari, hasil dikelompokkan per modul.
- **Tema:** light/dark mengikuti sistem, satu warna aksen per modul.
- **Aksesibilitas:** target sentuh ≥44px, kontras AA, navigasi keyboard di desktop.

---

## 6. Roadmap

| Fase | Isi | Selesai kalau |
|---|---|---|
| **0 — Fondasi** | Scaffold Vite+TS+Tailwind, Dexie, registry modul, shell nav, tema | App jalan, nav kosong bisa diklik |
| **1 — Catatan** | CRUD, autosave, markdown, tag, pin, arsip, sampah | Bisa dipakai mencatat sehari-hari |
| **2 — Cari & Tag** | Pencarian global, halaman tag lintas modul | Ketemu catatan apa pun dalam <2 detik |
| **3 — Reminder** | CRUD, notifikasi, view Hari Ini, "catatan → reminder" | Notifikasi benar-benar bunyi tepat waktu |
| **4 — PWA** | Manifest, service worker, installable, offline penuh | Bisa di-install & jalan tanpa internet |
| **5 — Tugas** | Checklist, subtask, prioritas | Terpadu di view Hari Ini |
| **6 — Data** | Export/import JSON, tempat sampah, pengaturan | Data bisa dibawa keluar-masuk |
| **7 — APK** | Bungkus Capacitor, notifikasi native, ikon & splash | APK terpasang di HP sendiri |
| **8 — Sync** | Supabase auth + sync via outbox | Dua perangkat konsisten |

Fase 0–2 adalah target realistis pertama. Sisanya menyusul sesuai pemakaian nyata.

---

## 7. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Terlalu banyak modul, semua setengah jadi | Aturan "satu modul selesai dulu"; registry bikin modul mudah ditunda |
| Notifikasi web tidak andal (HP mematikan background) | Terima keterbatasan di web; andalkan notifikasi native saat APK |
| Data hilang (IndexedDB dibersihkan browser) | Export JSON sejak fase 6; `persist()` storage; sync di fase 8 |
| Konflik saat sync | Outbox + `updatedAt` disiapkan sejak skema v1 |
| Skema berubah setelah ada data | Semua perubahan lewat migrasi Dexie berversi; `data` bebas-bentuk mengurangi migrasi |
| Kehilangan motivasi | Pakai sendiri sejak fase 1 — dogfooding adalah bahan bakarnya |

---

## 8. Langkah Berikutnya

1. Scaffold fase 0 (Vite + TS + Tailwind + Dexie + registry + shell).
2. Bangun modul Catatan sampai layak pakai harian.
3. Pakai sendiri seminggu, catat yang mengganggu, perbaiki.
4. Baru lanjut ke pencarian global lalu reminder.
