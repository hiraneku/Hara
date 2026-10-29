/* Aksi pemutar musik yang dipakai bersama oleh layar Musik, kartu di beranda,
   pengaturan, dan kontrol sistem (layar kunci). Menjaga urutan: simpan posisi
   lagu lama sebelum berpindah, lalu muat lagu baru. */

import { toast } from '../core/toast.js?v=20261029120000';
import { t as tr } from '../core/i18n.js?v=20261029120000';
import * as M from './mesin.js?v=20261029120000';
import * as S from './simpan.js?v=20261029120000';
import { namaDariBerkas, kemungkinanAudio } from './logika.js?v=20261029120000';
import { ambilSampul, pembacaBlob } from './sampul.js?v=20261029120000';
import * as D from './daftar.js?v=20261029120000';
import * as T from './tidur.js?v=20261029120000';
import { ambilSet, ubahSet } from './set.js?v=20261029120000';
import { pilihBerikut, urutkanAcak } from './mode.js?v=20261029120000';

/* Antrean putar: null = urutan pustaka; array id = urutan daftar putar yang sedang diputar. */
let antrean = null;
export function aturAntrean(ids) {
  antrean = Array.isArray(ids) ? ids.slice() : null;
  batalRencana();
}
function urutanPutar() {
  if (!antrean) return S.daftarLagu();
  return antrean.map(id => S.laguById(id)).filter(Boolean);
}

/* Antrean pengguna (mode ulang "antrean"): lagu yang ditambahkan lewat tombol Antre. */
let antreanPengguna = [];
export function toggleAntrean(id) {
  const i = antreanPengguna.indexOf(id);
  if (i >= 0) antreanPengguna.splice(i, 1);
  else if (S.laguById(id)) antreanPengguna.push(id);
  batalRencana();
  return i < 0;
}
export function antreanLagu() { return antreanPengguna.slice(); }
export function jumlahDaftarAktif() { return urutanPutar().length; }
export function kosongkanAntrean() { antreanPengguna = []; batalRencana(); }

/* Riwayat lagu yang sudah diputar (untuk tombol sebelumnya pada mode acak dan
   untuk smart shuffle). Batas 50 entri. */
let riwayat = [];
function dorongRiwayat(id) {
  if (!id) return;
  riwayat.push(id);
  if (riwayat.length > 50) riwayat.shift();
}

/* Urutan acak untuk satu daftar; disimpan selama daftar tidak berubah. */
let urutanAcakCache = { kunci: '', ids: null };
function urutanAcakUntuk(daftar) {
  const kunci = daftar.join('|');
  if (urutanAcakCache.kunci !== kunci || !urutanAcakCache.ids) {
    urutanAcakCache = { kunci, ids: urutkanAcak(daftar) };
  }
  return urutanAcakCache.ids;
}

/* Lagu berikutnya menurut mode saat ini. Hasil bisa disimpan sebagai "rencana"
   (untuk crossfade) dan dipakai saat transisi. */
let rencana = null;      /* { id, dariAntrean } */
let sedangSiapkan = false;
export function batalRencana() {
  rencana = null;
  M.batalkanBerikut();
}

function pilihBerikutSekarang(manual) {
  const set = ambilSet();
  const daftar = urutanPutar().map(x => x.id);
  if (daftar.length === 0) return null;
  const hasil = pilihBerikut({
    daftar,
    idAktif: M.keadaan().id,
    acak: set.acak,
    ulang: set.ulang,
    antrean: antreanPengguna,
    manual,
    urutan: set.acak === 'mati' ? null : urutanAcakUntuk(daftar),
    riwayat,
  });
  if (hasil && hasil.urutan) urutanAcakCache = { kunci: daftar.join('|'), ids: hasil.urutan };
  return hasil ? { id: hasil.id, dariAntrean: hasil.dariAntrean } : null;
}

/* Ubah mode acak atau ulang (dari tombol pemutar). */
export function aturMode(patch) {
  ubahSet(patch);
  urutanAcakCache = { kunci: '', ids: null };
  batalRencana();
}

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
  rencana = null;
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

/* Pindah lagu manual (tombol Sebelumnya / Berikutnya). Arah -1 dengan posisi lewat
   3 detik hanya mengulang lagu ini. Berikutnya mengikuti mode acak dan ulang; dan
   memakai crossfade bila diaktifkan. */
export async function gantiLagu(arah) {
  const daftar = urutanPutar();
  if (daftar.length === 0) return;
  const k = M.keadaan();
  if (arah < 0 && k.posisi > 3 && k.id) { M.seek(0); return; }
  if (arah > 0) {
    const r = pilihBerikutSekarang(true);
    if (!r) return;
    await pindahKe(r, ambilSet().crossfade);
    return;
  }
  if (arah < 0 && ambilSet().acak !== 'mati' && riwayat.length) {
    const id = riwayat.pop();
    if (S.laguById(id)) { await mainkanLagu(id); return; }
  }
  const i = daftar.findIndex(x => x.id === k.id);
  const n = daftar.length;
  const sebelum = i < 0 ? daftar[0] : daftar[(i - 1 + n) % n];
  await mainkanLagu(sebelum.id);
}

/* Dipanggil saat satu lagu selesai (dari status 'selesai'). */
export async function selesaiLagu() {
  if (T.tidurSelesaiLagu()) return;            /* sleep timer: berhenti di sini */
  const r = rencana || pilihBerikutSekarang(false);
  rencana = null;
  if (!r) return;                              /* mode urut/antrean habis: berhenti */
  await pindahKe(r, null);
}

/* Pindah ke lagu r. Dengan crossfade (opsi = pengaturan), transisi dibuat halus
   bila lagu berikutnya sudah siap; bila tidak, pindah biasa. */
async function pindahKe(r, cf) {
  const k = M.keadaan();
  if (cf && cf.aktif && k.status === 'putar' && k.id && r.id !== k.id) {
    const x = S.laguById(r.id);
    const berkas = x && await S.ambilBerkas(r.id);
    if (x && berkas) {
      const siap = await M.siapkanBerikut(r.id, berkas, S.aturLagu(r.id), x.nama).catch(() => false);
      if (siap && M.idBerikut() === r.id && komitPudar(r, cf.detik, x)) return;
    }
  }
  if (r.dariAntrean) antreanPengguna.shift();
  dorongRiwayat(k.id);
  await mainkanLagu(r.id);
}

/* Crossfade: lagu berikutnya (sudah dimuat di mesin) menggantikan lagu aktif. */
function komitPudar(r, detik, x) {
  const k = M.keadaan();
  S.simpanAtur(k.id, { tempo: k.tempo, pitch: k.pitch, loop: k.loop, posisi: 0 });
  if (!M.mulaiPudarKeBerikut(detik)) return false;
  T.tidurSelesaiLagu();
  if (r.dariAntrean) antreanPengguna.shift();
  dorongRiwayat(k.id);
  S.tandaiTerakhir(r.id);
  if (!x.sampulDiperiksa) {
    S.ambilBerkas(r.id).then(b => { if (b) return ekstrakSampul(b, r.id); }).then(ada => { if (ada) M.beritahu('sampul'); }).catch(() => {});
  }
  return true;
}

/* Dipanggil setiap ketukan posisi (dari mesin). Menyiapkan lagu berikutnya beberapa
   detik sebelum akhir, lalu memulai crossfade pada detik ke-`fade`. */
export function periksaTransisi(k) {
  if (k.status !== 'putar' || !(k.durasi > 0) || !k.id) return;
  const set = ambilSet();
  if (!set.crossfade.aktif || set.ulang === 'satu') return;
  if (!T.tidurMengizinkanTransisi()) return;
  const sisa = k.durasi - k.posisi;
  const f = set.crossfade.detik;
  if (!rencana && !sedangSiapkan && sisa <= f + 6) {
    const r = pilihBerikutSekarang(false);
    if (!r || r.id === k.id) return;
    rencana = r;
    sedangSiapkan = true;
    const x = S.laguById(r.id);
    S.ambilBerkas(r.id)
      .then(berkas => berkas && x && M.siapkanBerikut(r.id, berkas, S.aturLagu(r.id), x.nama))
      .catch(() => false)
      .finally(() => { sedangSiapkan = false; });
    return;
  }
  if (rencana && sisa <= f && M.idBerikut() === rencana.id) {
    const r = rencana;
    const x = S.laguById(r.id);
    rencana = null;
    if (x) komitPudar(r, f, x);
  }
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

/* Putar daftar putar mulai dari indeks tertentu. */
export async function mainkanDaftar(idDaftar, indeks = 0) {
  const d = D.daftarById(idDaftar);
  if (!d) return;
  const ids = d.lagu.filter(id => S.laguById(id));
  if (ids.length === 0) { toast(tr('Daftar putar ini masih kosong')); return; }
  aturAntrean(ids);
  await mainkanLagu(ids[Math.min(Math.max(0, indeks), ids.length - 1)]);
}

export async function hapusLagu(id) {
  if (M.keadaan().id === id) M.lepas();
  if (antrean) antrean = antrean.filter(x => x !== id);
  D.lepasLaguDariSemua(id);
  try {
    await S.hapusLagu(id);
    toast(tr('Lagu dihapus'));
  } catch (e) {
    toast(tr('Gagal menghapus lagu'));
  }
}

export async function hapusSemuaLagu() {
  M.lepas();
  aturAntrean(null);
  let gagal = 0;
  for (const x of S.daftarLagu()) {
    try { await S.hapusLagu(x.id); D.lepasLaguDariSemua(x.id); } catch (e) { gagal++; }
  }
  toast(gagal ? tr('Sebagian lagu gagal dihapus') : tr('Semua lagu dihapus'));
}
