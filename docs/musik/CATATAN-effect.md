# Catatan: fitur Effect (Musik)

Status: tujuh efek sudah dibuat di kode. Belum diuji di perangkat atau browser.
Uji otomatis (Node/jsdom) hanya memeriksa logika, layar, dan sambungan rantai.

## Yang sudah ada
- Kategori: Spatial & Ambience (satu kategori, tujuh efek).
- Efek: Reverb, Echo, Delay, Stereo Widening, 3D / Spatial Audio, Early Reflections, Convolution Reverb.
- Setiap efek punya saklar on/off. Boleh banyak aktif sekaligus.
- Tombol panah membuka panel pengaturan (dasar, lalu lanjutan).
- Rantai: ekualiser -> efek aktif (urutan tetap) -> kompresor -> keluaran.
- Efek mati tidak dibangun dan tidak memproses audio (node dilepas).
- Pemutaran saja. Ekspor tidak memakai efek.
- Penyimpanan: localStorage `hara.v2.musik.efek` (global, untuk semua lagu).

## Keputusan desain
- 3D / Spatial: pan posisi sederhana, bukan HRTF.
- Convolution Reverb: IR bawaan (aula, ruangan kecil, gua) dari Voxengo. Lisensi di `ir/LICENSE-voxengo.txt`.
- Reverb: algoritmik (comb feedback dan allpass), bukan IR.
- Echo: mesin yang sama dengan Delay, dengan pemetaan parameter yang lebih sederhana.
- Stereo Widening dan 3D sama-sama mengubah lebar stereo, tetapi dibuat terpisah.
- Early Reflections dibuat terpisah dari Reverb (tap delay, bukan feedback).

## Belum diuji
- Suara setiap efek di perangkat (Android, iOS, dan browser).
- Klik atau celah saat efek dinyalakan atau dimatikan sambil bermain.
- Beban CPU di HP lama, terutama Reverb dan Convolution.
- Pemuatan IR di Capacitor (fetch berkas lokal).
