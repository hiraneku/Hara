/* ════════ AUTOSAVE MANAGER ════════

   Editor → tandaiBerubah() → [debounce] → simpan() → Note Storage
                            ↘ draf recovery

   Editor tidak boleh menyentuh storage langsung. Ia cukup bilang
   "ada perubahan", sisanya urusan modul ini.

   Empat hal yang dijaga:

   1. DEBOUNCE — ketikan beruntun digabung jadi satu penulisan.
   2. TANPA RACE — tiap permintaan simpan diberi nomor urut; hasil yang
      datang terlambat dari urutan lebih lama diabaikan, jadi data lama
      tidak pernah menimpa data baru.
   3. RECOVERY — draf ditulis saat menganggur singkat, dibuang begitu
      penyimpanan utama berhasil.
   4. FLUSH — perubahan tertunda dipaksa tersimpan saat meninggalkan
      editor, berpindah catatan, atau menutup aplikasi.
*/

import { tulisDraf, hapusDrafMilik } from './recovery.js?v=20260907055942';

/* Jeda cukup panjang untuk menggabungkan ketikan, cukup pendek supaya
   kehilangan terasa sepele kalau aplikasi mati mendadak. */
export const JEDA_SIMPAN = 700;
export const JEDA_DRAF   = 250;   /* draf lebih cepat: ia jaring pengaman */

/* ── status ── */
export const STATUS = {
  IDLE:   'idle',
  DIRTY:  'dirty',
  SAVING: 'saving',
  SAVED:  'saved',
  ERROR:  'error',
};

let status = STATUS.IDLE;
const pendengar = new Set();

export const statusSekarang = () => status;
export const onStatus = fn => { pendengar.add(fn); return () => pendengar.delete(fn); };

function setStatus(s) {
  if (status === s) return;
  status = s;
  pendengar.forEach(fn => { try { fn(s); } catch (e) {} });
}

/* ── konfigurasi: dipasang sekali oleh modul catatan ── */
let ambilData = null;   /* () => { noteId, title, blocks } | null   */
let tulisData = null;   /* (data) => boolean | Promise<boolean>     */
                        /* tulisData BOLEH async (mis. Dexie nanti) —
                           manager sudah menangani Promise. */

export function konfigurasi({ baca, tulis }) {
  ambilData = baca;
  tulisData = tulis;
}

/* ── keadaan internal ── */
let timerSimpan = null;
let timerDraf = null;
let seqMinta = 0;        /* nomor urut permintaan simpan  */
let seqSelesai = 0;      /* urutan terakhir yang sudah rampung */
let adaTertunda = false; /* ada perubahan yang belum tersimpan */
let sedangSimpan = false;
let mintaLagi = false;   /* perubahan datang saat simpan berjalan */

export const adaPerubahanTertunda = () => adaTertunda;

/* Dipanggil editor setiap kali isi berubah. Murah — hanya menjadwalkan. */
export function tandaiBerubah() {
  if (!ambilData) return;
  adaTertunda = true;
  setStatus(STATUS.DIRTY);

  clearTimeout(timerDraf);
  timerDraf = setTimeout(tulisDrafSekarang, JEDA_DRAF);

  clearTimeout(timerSimpan);
  timerSimpan = setTimeout(() => simpan(), JEDA_SIMPAN);
}

/* Draf recovery: ditulis saat pengetikan berhenti sejenak, jauh sebelum
   penyimpanan utama. Bukan tiap keystroke. */
function tulisDrafSekarang() {
  if (!ambilData) return;
  const data = ambilData();
  if (!data || !data.noteId) return;
  tulisDraf(data.noteId, data);
}

/* Simpan sekarang. `paksa` melewati pengecekan "tidak ada perubahan",
   dipakai saat berpindah catatan/menutup aplikasi. */
export function simpan(paksa = false) {
  clearTimeout(timerSimpan); timerSimpan = null;
  clearTimeout(timerDraf);   timerDraf = null;

  if (!ambilData || !tulisData) return false;
  if (!adaTertunda && !paksa) return true;

  /* Sudah ada penulisan berjalan: catat bahwa masih ada yang lebih baru,
     lalu biarkan penulisan itu memicu ulang setelah selesai. */
  if (sedangSimpan) { mintaLagi = true; return false; }

  const data = ambilData();
  if (!data || !data.noteId) return false;

  const urutan = ++seqMinta;
  sedangSimpan = true;
  setStatus(STATUS.SAVING);

  let hasil;
  try {
    hasil = tulisData(data);
  } catch (e) {
    hasil = false;
  }

  const selesaikan = sukses => {
    sedangSimpan = false;

    /* ── kunci anti-race ──
       Hasil yang datang lebih lambat dari urutan yang sudah rampung
       diabaikan. Tanpa ini, "Save A" yang selesai setelah "Save B"
       bisa menimpa data B dengan data A yang lebih lama. */
    if (urutan < seqSelesai) return;
    seqSelesai = urutan;

    if (sukses) {
      /* hanya bersih kalau tidak ada perubahan baru selama menyimpan */
      if (!mintaLagi) {
        adaTertunda = false;
        hapusDrafMilik(data.noteId);   /* jaring pengaman tak diperlukan lagi */
        setStatus(STATUS.SAVED);
      }
    } else {
      /* GAGAL: draf sengaja DIPERTAHANKAN supaya tulisan tidak hilang */
      tulisDraf(data.noteId, data);
      setStatus(STATUS.ERROR);
    }

    if (mintaLagi) { mintaLagi = false; simpan(true); }
  };

  if (hasil && typeof hasil.then === 'function') {
    hasil.then(r => selesaikan(r !== false)).catch(() => selesaikan(false));
    return true;
  }
  selesaikan(hasil !== false);
  return hasil !== false;
}

/* Paksa tuntaskan perubahan tertunda. Dipakai saat meninggalkan editor. */
export function flush() {
  if (timerSimpan || adaTertunda) return simpan(true);
  return true;
}

/* Coba lagi setelah gagal. */
export function cobaUlang() { return simpan(true); }

/* Bersihkan keadaan saat berpindah catatan — supaya perubahan catatan
   lama tidak ikut tertulis ke catatan baru.

   `seqSelesai` dinaikkan ke nomor permintaan terbaru: simpan yang MASIH
   BERJALAN dari catatan lama (kalau tulisData async) akan dianggap basi
   saat selesai, jadi status/penghitungannya tidak mengganggu catatan
   yang baru dibuka. Urutan simpan berikutnya otomatis lebih besar,
   sehingga tidak ada penulisan yang tertahan. */
export function reset() {
  clearTimeout(timerSimpan); timerSimpan = null;
  clearTimeout(timerDraf);   timerDraf = null;
  adaTertunda = false;
  mintaLagi = false;
  sedangSimpan = false;
  seqSelesai = ++seqMinta;
  setStatus(STATUS.IDLE);
}
