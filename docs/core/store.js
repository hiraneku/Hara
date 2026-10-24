/* Satu-satunya jalan menulis data. Ganti isi file ini saat pindah ke Dexie.

   Skema disimpan bersama data (`schema`) supaya migrasi berikutnya tahu
   dari versi mana ia berangkat. Data v1 memakai field `html`; sejak v2
   isi catatan disimpan sebagai `blocks`. */

import { makeNote, normalizeNotes, htmlToBlocks } from '../notes/note-model.js?v=20261024031304';
import { isiWelcome, judulWelcome, WELCOME_V } from '../notes/views/welcome.js?v=20261024031304';
import { sinkronTag } from '../notes/tags.js?v=20261024031304';
import { bahasaSekarang, t as tr } from './i18n.js?v=20261024031304';
import { muatMentah, tulisAntre, cadangkanRusak } from './db-catatan.js?v=20261024031304';
import { toast } from './toast.js?v=20261024031304';

const SCHEMA = 2;
/* Penyimpanan utama: IndexedDB (lihat db-catatan.js). Kunci localStorage
   `hara.v1` tetap dibaca untuk migrasi dan TIDAK dihapus di rilis ini. */

/* Catatan bawaan. Isinya dibangun dari HTML sambutan (bahasa antarmuka
   aktif — bawaan Indonesia) lalu langsung dinormalkan jadi blocks — jadi
   bahkan catatan bawaan pun tidak menyimpan HTML sebagai sumber
   kebenaran. */
export const DEFAULT_NOTES = () => {
  const b = bahasaSekarang();
  const n = makeNote({
    id: 'w',
    title: judulWelcome(b),
    blocks: htmlToBlocks(isiWelcome(b)),
    tags: [],
    welcome: true,
    welcomeV: WELCOME_V,
    welcomeLang: b,
  });
  sinkronTag(n);   /* cache tag mengikuti isi sambutan */
  return [n];
};

/* Catatan sambutan bersifat GLOBAL & terkunci: pengguna tidak bisa
   menyunting isinya, jadi aplikasi bebas menyinkronkan isi itu ke versi
   terbaru (welcomeV) DAN ke bahasa antarmuka yang aktif (welcomeLang)
   setiap kali aplikasi dimuat atau bahasa diganti. HANYA catatan
   sambutan yang disinkronkan seperti ini — catatan pengguna lain tidak
   pernah diterjemahkan. Kalau pengguna menghapusnya (sampah →
   permanen), ia tidak dibuat ulang. */
export function sinkronWelcome() {
  const w = state.notes.find(x => x.welcome && !x.deletedAt);
  if (!w) return false;
  const b = bahasaSekarang();
  if (w.welcomeV !== WELCOME_V || w.welcomeLang !== b) {
    w.title = judulWelcome(b);
    w.blocks = htmlToBlocks(isiWelcome(b));
    w.welcomeV = WELCOME_V;
    w.welcomeLang = b;
    /* cache tag mengikuti isi baru (mis. #hara / #proyek-hara per bahasa) */
    sinkronTag(w);
    save();
    return true;
  }
  return false;
}

export const state = {
  seq: 1,
  notes: DEFAULT_NOTES(),
  openId: 'w',
  /* data tersimpan tidak terbaca pada pemuatan terakhir — dipakai app.js
     untuk memberi tahu pengguna, bukan menyembunyikan kegagalan */
  dataRusak: false,
  /* penulisan terakhir gagal — ditampilkan dan dicoba lagi oleh autosave */
  dataGagal: false,
};

function snapshot() {
  return JSON.stringify({
    schema: SCHEMA,
    seq: state.seq,
    openId: state.openId,
    notes: state.notes,
  });
}

/* Tulis ke penyimpanan utama TANPA menunggu selesai (fire-and-forget).
   Mengembalikan false hanya bila data tidak bisa diserialkan. Kegagalan
   tulis yang terjadi kemudian dilaporkan lewat state.dataGagal dan toast.
   Pemanggil yang perlu tahu hasil sebenarnya pakai simpanTahan(). */
export function save() {
  let s;
  try { s = snapshot(); } catch (e) { return false; }
  tulisAntre(s).then(ok => {
    state.dataGagal = !ok;
    if (!ok) toast(tr('Penyimpanan gagal — perubahan terakhir mungkin belum tersimpan'));
  });
  return true;
}

/* Tulis dan TUNGGU sampai benar-benar tersimpan. Resolve true/false.
   Dipakai autosave supaya status "tersimpan" hanya muncul setelah berhasil. */
export function simpanTahan() {
  let s;
  try { s = snapshot(); } catch (e) { return Promise.resolve(false); }
  return tulisAntre(s).then(ok => {
    state.dataGagal = !ok;
    return ok;
  });
}

/* Data tersimpan ada tapi tidak bisa dibaca (JSON rusak / bentuk tak
   dikenal). Jangan diam-diam membuangnya: salinan mentahnya disimpan ke
   kunci cadangan dan kunci utama dibersihkan — kalau tidak, pemuatan
   berikutnya akan menemukan data rusak yang sama lagi. Aplikasi mulai
   dari catatan bawaan, dan pengguna diberi tahu lewat state.dataRusak. */
async function cadangkanDataRusak(raw) {
  /* tidak ada data mentah sama sekali (mis. storage diblokir total) —
     bukan berarti data rusak, jangan menyalakan bendera */
  if (!raw) return;
  state.dataRusak = true;
  await cadangkanRusak(raw, Date.now());   /* gagal → data utama dibiarkan */
}

export async function load() {
  let raw = '';
  try { raw = (await muatMentah()) || ''; } catch (e) { raw = ''; }
  try {
    if (!raw) return;

    let data = null;
    try { data = JSON.parse(raw); } catch (e) { data = null; }
    if (!data || !Array.isArray(data.notes)) {
      await cadangkanDataRusak(raw);
      return;
    }

    /* normalizeNotes menerima bentuk lama maupun baru, jadi tidak perlu
       cabang khusus per versi selama migrasinya masih satu langkah. */
    const notes = normalizeNotes(data.notes);
    state.notes = notes.length ? notes : DEFAULT_NOTES();
    state.seq = data.seq || 1;
    state.openId = (data.openId && state.notes.some(n => n.id === data.openId))
      ? data.openId : state.notes[0].id;

    /* data lama baru saja dinaikkan versinya -> tulis ulang sekali,
       supaya pemuatan berikutnya tidak perlu migrasi lagi. Sinkronkan
       juga sambutan (versi/bahasa) dan hitung ulang cache tag SEMUA
       catatan dari isinya — sekali ini membersihkan "tag hantu" yang
       tersisa dari versi lama (tag yang span-nya sudah dihapus). */
    let berubah = sinkronWelcome();
    for (const n of state.notes) if (sinkronTag(n)) berubah = true;
    if ((data.schema || 1) < SCHEMA || berubah) save();
  } catch (e) {
    /* jaring pengaman terakhir: mulai dari bawaan, jangan sampai
       aplikasi mati hanya karena satu data bermasalah */
    await cadangkanDataRusak(raw);
    state.notes = DEFAULT_NOTES();
  }
}

export { SCHEMA };
