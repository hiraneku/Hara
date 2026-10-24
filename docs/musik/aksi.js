/* Aksi pemutar musik yang dipakai bersama oleh layar Musik, kartu di beranda,
   pengaturan, dan kontrol sistem (layar kunci). Menjaga urutan: simpan posisi
   lagu lama sebelum berpindah, lalu muat lagu baru. */

import { toast } from '../core/toast.js?v=20261024163000';
import { t as tr } from '../core/i18n.js?v=20261024163000';
import * as M from './mesin.js?v=20261024163000';
import * as S from './simpan.js?v=20261024163000';
import { namaDariBerkas, kemungkinanAudio } from './logika.js?v=20261024163000';
import { ambilSampul, pembacaBlob } from './sampul.js?v=20261024163000';

/* Antrean aksi yang datang saat lagu masih dimuat (mis. geser tempo atau putar
   ketika decode belum selesai). Dijalankan saat lagu dengan id itu siap. */
let tundaan = [];
export function antrikan(id, fn) { tundaan.push({ id, fn }); }
export function jalankanTundaan(idLagu) {
  const yang = tundaan.filter(x => x.id === idLagu);
  tundaan = [];
  yang.forEach(x => { try { x.fn(); } catch (e) { /* aksi tertunda gagal: abaikan */ } });
}
export function batalkanTundaan() { tundaan = []; }

/* Posisi lagu yang sedang dimuat disimpan agar terlanjut saat dibuka lagi. */
export function simpanPosisiSekarang() {
  const k = M.keadaan();
  if (!k.id || k.status === 'memuat' || k.status === 'kosong') return;
  const posisi = k.status === 'selesai' ? 0 : k.posisi;   /* selesai: mulai dari awal lagi */
  S.simpanAtur(k.id, { tempo: k.tempo, pitch: k.pitch, loop: k.loop, posisi });
}

/* Ambil sampul dari berkas dan simpan. Dipanggil saat impor, dan untuk lagu
   lama yang belum pernah diperiksa. Mengembalikan true bila ada sampul. */
export async function ekstrakSampul(berkas, id) {
  let ada = false;
  try {
    const hasil = await ambilSampul(pembacaBlob(berkas));
    if (hasil) {
      await S.simpanSampul(id, new Blob([hasil.data], { type: hasil.mime }));
      ada = true;
    }
  } catch (e) { /* gagal baca metadata: tetap tanpa sampul */ }
  S.perbaruiLagu(id, { sampulDiperiksa: true, sampulAda: ada });
  return ada;
}

export async function mainkanLagu(id, { putar = true } = {}) {
  const x = S.laguById(id);
  if (!x) return;
  const k = M.keadaan();
  if (k.id === id && k.status === 'memuat') {
    if (putar) antrikan(id, () => M.putar());
    return;
  }
  if (k.id === id && k.status !== 'kosong') {
    if (putar) await M.putar();
    return;
  }
  simpanPosisiSekarang();
  try {
    const berkas = await S.ambilBerkas(id);
    if (!berkas) { toast(tr('Berkas lagu tidak ditemukan')); return; }
    const ok = await M.muatLagu(id, berkas, S.aturLagu(id), x.nama);
    if (!ok) return;                  /* sudah diganti lagu lain */
    S.tandaiTerakhir(id);
    if (putar) await M.putar();
    if (!x.sampulDiperiksa) {
      ekstrakSampul(berkas, id).then(ada => { if (ada) M.beritahu('sampul'); });
    }
  } catch (e) {
    M.lepas();
    toast(tr('Lagu ini tidak bisa diputar'));
  }
}

/* Tombol putar utama: lanjut lagu yang ada, atau mulai lagu terakhir. */
export async function togglePutarUtama() {
  const k = M.keadaan();
  if (k.status === 'putar') { M.jeda(); return; }
  if (k.status === 'memuat') { antrikan(k.id, () => M.putar()); return; }
  if (k.status === 'kosong') {
    const id = S.terakhirId() || S.daftarLagu()[0]?.id;
    if (id) await mainkanLagu(id);
    else toast(tr('Belum ada lagu. Impor dulu dari layar Musik'));
    return;
  }
  await M.putar();
}

/* Pindah lagu (manual, berputar di akhir daftar). Arah -1 dengan posisi lewat
   3 detik hanya mengulang lagu ini. */
export async function gantiLagu(arah) {
  const daftar = S.daftarLagu();
  if (daftar.length === 0) return;
  const k = M.keadaan();
  if (arah < 0 && k.posisi > 3 && k.id) { M.seek(0); return; }
  const i = daftar.findIndex(x => x.id === k.id);
  const n = daftar.length;
  const berikut = i < 0 ? daftar[0] : daftar[(i + arah + n) % n];
  await mainkanLagu(berikut.id);
}

/* Lanjut otomatis setelah lagu selesai: berhenti di lagu terakhir. */
export async function lanjutOtomatis() {
  const daftar = S.daftarLagu();
  const i = daftar.findIndex(x => x.id === M.keadaan().id);
  if (i < 0 || i >= daftar.length - 1) return false;
  await mainkanLagu(daftar[i + 1].id);
  return true;
}

export async function imporBerkas(files) {
  const daftar = Array.from(files || []);
  if (daftar.length === 0) return 0;
  let masuk = 0, gagal = 0;
  let pertama = null;
  toast(tr('Mengimpor lagu…'));
  for (const f of daftar) {
    if (!kemungkinanAudio({ name: f.name, type: f.type })) { gagal++; continue; }
    try {
      const durasi = await M.bacaDurasi(f);
      const rekaman = await S.tambahLagu(f, { nama: namaDariBerkas(f.name), durasi });
      masuk++;
      if (!pertama) pertama = rekaman.id;
      await ekstrakSampul(f, rekaman.id);
    } catch (e) {
      gagal++;
    }
  }
  if (masuk > 0 && !M.keadaan().id && pertama) {
    /* Belum ada lagu yang dimuat: siapkan lagu pertama yang baru diimpor (tanpa diputar). */
    await mainkanLagu(pertama, { putar: false });
  }
  if (masuk > 0) toast(tr('{n} lagu ditambahkan', { n: masuk }));
  if (gagal > 0) toast(tr('{n} berkas dilewati (bukan audio yang didukung)', { n: gagal }));
  return masuk;
}

export async function hapusLagu(id) {
  if (M.keadaan().id === id) M.lepas();
  try {
    await S.hapusLagu(id);
    toast(tr('Lagu dihapus'));
  } catch (e) {
    toast(tr('Gagal menghapus lagu'));
  }
}

export async function hapusSemuaLagu() {
  M.lepas();
  let gagal = 0;
  for (const x of S.daftarLagu()) {
    try { await S.hapusLagu(x.id); } catch (e) { gagal++; }
  }
  toast(gagal ? tr('Sebagian lagu gagal dihapus') : tr('Semua lagu dihapus'));
}
