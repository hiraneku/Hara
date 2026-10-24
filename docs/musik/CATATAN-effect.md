# Catatan: fitur Effect (Musik)

Status: tujuh efek sudah dibuat. Sudah diukur di Chromium headless (render offline,
Web Audio sungguhan). BELUM diuji dengan telinga di perangkat (Android, iOS, speaker/headphone).

## Perbaikan terbaru (dari uji di Chromium)
- Reverb tidak stabil: energi terus naik sampai ribuan kali. Penyebabnya: Q lowpass di dalam loop
  umpan balik. Web Audio menyatakan Q lowpass/highpass dalam dB, sehingga Q 0 dB (linear 1) sudah berpuncak
  dan loop gain melewati 1. Sekarang semua filter memakai Q -3.01 dB (Butterworth). Berlaku juga untuk
  Echo, Delay, Stereo Widening, dan 3D.
- Penerapan pertama parameter tidak lagi bertransisi dari nilai default (mis. lowpass 350 Hz).
- Convolution: ConvolverNode dibuat baru tiap ganti ruangan (tidak mengisi ulang buffer), dan IR
  dinormalisasi sendiri (energi total dikalibrasi, bukan normalize bawaan browser yang berbeda antar browser).
- Convolver yang selesai dimuat setelah efek dimatikan tidak dibuat.
- Hasil ukur (wet 100%, input impuls): energi wet aula -10,2 dB, ruangan kecil -13,6 dB, gua -15,5 dB.
  Selisih sekitar 5 dB antar ruangan, karena highpass 60 Hz memotong bass lebih banyak di ruangan kecil.
- Reverb: wet 100% sekitar -8 dB energi; default (wet 25%) sekitar -21 dB. Tingkat kekerasan belum dinilai dengan telinga.

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

## Belum diuji (dengan telinga / perangkat)
- Suara setiap efek di perangkat (Android, iOS, dan browser).
- Klik atau celah saat efek dinyalakan atau dimatikan sambil bermain.
- Beban CPU di HP lama, terutama Reverb dan Convolution.
- Pemuatan IR di Capacitor (fetch berkas lokal).
