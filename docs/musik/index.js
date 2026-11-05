/* Modul Musik: mendaftarkan layar 'musik' dan 'musik-set' (Pengaturan Musik),
   menghubungkan event mesin ke penyimpanan dan layar, serta memasang kontrol
   layar kunci. Dipasang dari app.js seperti modul lain. */

import { registerViews, cur, go, onAfterRender } from '../core/router.js?v=20261105210000';
import * as M from './mesin.js?v=20261105210000';
import * as A from './aksi.js?v=20261105210000';
import { musikView, pasangLayar, segarkanLayar } from './layar.js?v=20261105210000';
import { pengaturanView, pasangPengaturan } from './pengaturan.js?v=20261105210000';
import { daftarView, pasangDaftar } from './daftar-layar.js?v=20261105210000';
import { eqView, pasangEq, terapkanEqTersimpan } from './eq-layar.js?v=20261105210000';
import { efekView, effectView, pasangEfek } from './efek-layar.js?v=20261105210000';
import { terapkanEfekTersimpan } from './efek.js?v=20261105210000';
import { pustakaView, pasangPustakaLagu } from './pustaka-layar.js?v=20261105210000';
import { pasangKontrolNotifikasi, sinkronkanKontrolNotifikasi } from './kontrol-notif.js?v=20261105210000';
import * as S from './simpan.js?v=20261105210000';
import { segarkanKartuMusik } from './kartu.js?v=20261105210000';
import { segarSampul } from './sampul-dom.js?v=20261105210000';

let simpanTimer = null;
let posisiTerakhirSimpan = 0;
let pindaiTerakhir = 0;
let pindaiJalan = false;
let updateKontrolTerakhir = 0;

function sinkronKontrolSistem(jenis, keadaan) {
  const sekarang = Date.now();
  if (jenis === 'waktu' && sekarang - updateKontrolTerakhir < 1200) return;
  if (!['lagu', 'status', 'atur', 'waktu'].includes(jenis)) return;
  updateKontrolTerakhir = sekarang;
  sinkronkanKontrolNotifikasi(S.laguById(keadaan.id), keadaan);
}

function segarkanPustakaPerangkat() {
  if (!A.bisaPindaiPustakaPerangkat() || pindaiJalan || Date.now() - pindaiTerakhir < 5000) return;
  pindaiJalan = true;
  pindaiTerakhir = Date.now();
  A.pindaiPustakaPerangkat().finally(() => {
    pindaiJalan = false;
    if (cur === 'musik') go('musik', { segar: true });
  });
}

/* Simpan pengaturan (tempo, nada, loop, posisi) setelah jeda singkat,
   supaya geseran slider tidak menulis berkali-kali. */
function jadwalSimpan() {
  clearTimeout(simpanTimer);
  simpanTimer = setTimeout(() => A.simpanPosisiSekarang(), 300);
}

function onMesin(jenis, k) {
  sinkronKontrolSistem(jenis, k);
  if (jenis === 'lagu') A.jalankanTundaan(k.id);
  if (jenis === 'status' && k.status === 'kosong') A.batalkanTundaan();
  if (jenis === 'atur') jadwalSimpan();
  if (jenis === 'status' && (k.status === 'jeda' || k.status === 'selesai')) A.simpanPosisiSekarang();
  if (jenis === 'status' && k.status === 'selesai') setTimeout(() => A.selesaiLagu(), 0);
  if (jenis === 'waktu') A.periksaTransisi(k);
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
      { musik: musikView, 'musik-set': pengaturanView, 'musik-daftar': daftarView, 'musik-pustaka': pustakaView, 'musik-efek': efekView, 'musik-effect': effectView, 'musik-eq': eqView },
      { musik: 'Musik', 'musik-set': 'Pengaturan Musik', 'musik-daftar': 'Daftar Putar', 'musik-pustaka': 'Pustaka lagu', 'musik-efek': 'Efek & Visual', 'musik-effect': 'Effect', 'musik-eq': 'Ekualiser' },
      { 'musik-set': 'musik', 'musik-daftar': 'musik', 'musik-pustaka': 'musik', 'musik-efek': 'musik', 'musik-effect': 'musik-efek', 'musik-eq': 'musik-efek' },
    );
    pasangLayar();
    pasangDaftar();
    pasangEq();
    pasangEfek();
    pasangPengaturan();
    pasangPustakaLagu();
    pasangKontrolNotifikasi({
      play: () => M.putar(),
      pause: () => M.jeda(),
      previous: () => A.gantiLagu(-1),
      next: () => A.gantiLagu(1),
      seekTo: positionMs => M.seek(positionMs / 1000),
      rewind: () => M.lompat(-10),
      forward: () => M.lompat(10),
    });
    terapkanEqTersimpan();
    terapkanEfekTersimpan();
    M.dengar(onMesin);
    onAfterRender(layar => {
      segarSampul(document);
      if (layar === 'musik') segarkanPustakaPerangkat();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && cur === 'musik') segarkanPustakaPerangkat();
    });
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
