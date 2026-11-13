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

## Perbaikan kedua (Reverb dan Convolution terdengar terlalu pelan)
- Uji realtime (AudioContext sungguhan, pukulan berulang): ekor Reverb default hanya sekitar -32 dB
  di bawah pukulan, Convolution aula default sekitar -35 dB. Echo default sekitar -24 dB.
- Reverb sekarang memakai topologi Freeverb: 8 comb per kanal dan 4 allpass seri per kanal, masukan mono.
  Riak ekor turun dari 9,5 dB ke 8,0 dB (diukur dengan impuls). Biaya CPU naik; belum diukur di perangkat.
- Kalibrasi: gain wet Reverb x2 (+6 dB), target energi IR Convolution x4 (+6 dB).
- Wet default: Reverb 25% -> 35%, Convolution 30% -> 40%.
- Hasil setelah kalibrasi (rasio ekor di celah 0,2-0,45 s terhadap pukulan): Reverb default sekitar -20 dB,
  Reverb wet 100% sekitar -11 dB, Convolution aula default sekitar -26 dB, Convolution wet 100% sekitar -19 dB.
- Angka ini dari Chromium headless. Belum didengar. Target level (rasio -20 s.d. -26 dB) adalah pilihan,
  bukan hasil uji dengan telinga.
- Catatan: uji sebelumnya dengan OfflineAudioContext tidak menangkap perubahan parameter saat audio berjalan.
  Uji realtime di `/tmp/chr/live2.mjs` tidak disimpan di repo.

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
- Reverb: algoritmik (8 comb dan 4 allpass per kanal, gaya Freeverb), bukan IR.
- Echo: mesin yang sama dengan Delay, dengan pemetaan parameter yang lebih sederhana.
- Stereo Widening dan 3D sama-sama mengubah lebar stereo, tetapi dibuat terpisah.
- Early Reflections dibuat terpisah dari Reverb (tap delay, bukan feedback).

## Belum diuji (dengan telinga / perangkat)
- Suara setiap efek di perangkat (Android, iOS, dan browser).
- Klik atau celah saat efek dinyalakan atau dimatikan sambil bermain.
- Beban CPU di HP lama, terutama Reverb dan Convolution.
- Pemuatan IR di Capacitor (fetch berkas lokal).
