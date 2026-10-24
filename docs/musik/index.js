/* Modul Musik (tahap 1): mendaftarkan layar 'musik', menghubungkan event mesin
   ke penyimpanan dan layar, serta memasang kontrol layar kunci.
   Dipasang dari app.js seperti modul lain (notesModule, renamerModule). */

import { registerViews, cur, go } from '../core/router.js?v=20261024040822';
import * as M from './mesin.js?v=20261024040822';
import * as A from './aksi.js?v=20261024040822';
import { musikView, pasangLayar, segarkanLayar } from './layar.js?v=20261024040822';
import { segarkanKartuMusik } from './kartu.js?v=20261024040822';

let simpanTimer = null;
let posisiTerakhirSimpan = 0;

/* Simpan pengaturan (tempo, nada, loop, posisi) setelah jeda singkat,
   supaya geseran slider tidak menulis berkali-kali. */
function jadwalSimpan() {
  clearTimeout(simpanTimer);
  simpanTimer = setTimeout(() => A.simpanPosisiSekarang(), 300);
}

function onMesin(jenis, k) {
  if (jenis === 'lagu') A.jalankanTundaan(k.id);
  if (jenis === 'status' && k.status === 'kosong') A.batalkanTundaan();
  if (jenis === 'atur') jadwalSimpan();
  if (jenis === 'status' && (k.status === 'jeda' || k.status === 'selesai')) A.simpanPosisiSekarang();
  if (jenis === 'waktu' && k.status === 'putar' && Date.now() - posisiTerakhirSimpan > 4000) {
    posisiTerakhirSimpan = Date.now();
    A.simpanPosisiSekarang();
  }
  if (jenis === 'lagu') posisiTerakhirSimpan = Date.now();

  if (cur === 'musik') segarkanLayar(jenis);
  if (cur === 'home') {
    /* Lagu baru dimuat mengubah kartu beranda (judul & durasi) — render ulang;
       selainnya cukup perbarui angka di kartu. */
    if (jenis === 'lagu') go('home', { segar: true });
    else segarkanKartuMusik();
  }
}

export const musikModule = {
  id: 'musik',
  name: 'Musik',
  color: '#A9CFA6',

  init() {
    registerViews({ musik: musikView }, { musik: 'Musik' });
    pasangLayar();
    M.dengar(onMesin);
    M.pasangAksiSistem({
      sebelumnya: () => A.gantiLagu(-1),
      berikutnya: () => A.gantiLagu(1),
    });
    /* Saat aplikasi disembunyikan (layar kunci, pindah aplikasi), simpan posisi. */
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') A.simpanPosisiSekarang();
    });
  },
};

/* Dipakai kartu beranda: putar/jeda lagu terakhir. */
export const togglePutarMusik = () => A.togglePutarUtama();
