/* Modul Musik: mendaftarkan layar 'musik' dan 'musik-set' (Pengaturan Musik),
   menghubungkan event mesin ke penyimpanan dan layar, serta memasang kontrol
   layar kunci. Dipasang dari app.js seperti modul lain. */

import { registerViews, cur, go, onAfterRender } from '../core/router.js?v=20261024040822';
import * as M from './mesin.js?v=20261024040822';
import * as A from './aksi.js?v=20261024040822';
import { musikView, pasangLayar, segarkanLayar } from './layar.js?v=20261024040822';
import { pengaturanView, pasangPengaturan } from './pengaturan.js?v=20261024040822';
import { segarkanKartuMusik } from './kartu.js?v=20261024040822';
import { segarSampul } from './sampul-dom.js?v=20261024040822';
import { ambilSet } from './set.js?v=20261024040822';

let simpanTimer = null;
let posisiTerakhirSimpan = 0;

/* Simpan pengaturan (tempo, nada, loop, posisi) setelah jeda singkat,
   supaya geseran slider tidak menulis berkali-kali. */
function jadwalSimpan() {
  clearTimeout(simpanTimer);
  simpanTimer = setTimeout(() => A.simpanPosisiSekarang(), 300);
}

/* Perilaku setelah lagu selesai, dari pengaturan Musik. */
function setelahSelesai() {
  const pilihan = ambilSet().setelahSelesai;
  if (pilihan === 'berikutnya') A.lanjutOtomatis();
  else if (pilihan === 'ulangi') { M.seek(0); M.putar(); }
}

function onMesin(jenis, k) {
  if (jenis === 'lagu') A.jalankanTundaan(k.id);
  if (jenis === 'status' && k.status === 'kosong') A.batalkanTundaan();
  if (jenis === 'atur') jadwalSimpan();
  if (jenis === 'status' && (k.status === 'jeda' || k.status === 'selesai')) A.simpanPosisiSekarang();
  if (jenis === 'status' && k.status === 'selesai') setTimeout(setelahSelesai, 0);
  if (jenis === 'waktu' && k.status === 'putar' && Date.now() - posisiTerakhirSimpan > 4000) {
    posisiTerakhirSimpan = Date.now();
    A.simpanPosisiSekarang();
  }
  if (jenis === 'lagu') posisiTerakhirSimpan = Date.now();
  if (jenis === 'sampul') segarSampul(document);

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
    registerViews(
      { musik: musikView, 'musik-set': pengaturanView },
      { musik: 'Musik', 'musik-set': 'Pengaturan Musik' },
    );
    pasangLayar();
    pasangPengaturan();
    M.dengar(onMesin);
    onAfterRender(() => segarSampul(document));
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
