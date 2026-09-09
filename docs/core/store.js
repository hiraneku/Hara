/* Satu-satunya jalan menulis data. Ganti isi file ini saat pindah ke Dexie.

   Skema disimpan bersama data (`schema`) supaya migrasi berikutnya tahu
   dari versi mana ia berangkat. Data v1 memakai field `html`; sejak v2
   isi catatan disimpan sebagai `blocks`. */

import { makeNote, normalizeNotes, htmlToBlocks } from '../notes/note-model.js?v=20260909063332';
import { welcomeBody, WELCOME_V } from '../notes/views/welcome.js?v=20260909063332';

const KEY = 'hara.v1';        /* kunci dipertahankan agar data lama terbaca */
const SCHEMA = 2;

/* Catatan bawaan. Isinya dibangun dari HTML sambutan lalu langsung
   dinormalkan jadi blocks — jadi bahkan catatan bawaan pun tidak
   menyimpan HTML sebagai sumber kebenaran. */
export const DEFAULT_NOTES = () => [
  makeNote({
    id: 'w',
    title: 'Selamat datang di Hara',
    blocks: htmlToBlocks(welcomeBody),
    tags: ['hara'],
    welcome: true,
    welcomeV: WELCOME_V,
  }),
];

/* Catatan sambutan bersifat GLOBAL & terkunci: pengguna tidak bisa
   menyunting isinya, jadi aplikasi bebas menyinkronkan isi itu ke versi
   terbaru (welcomeV) setiap kali aplikasi diperbarui. Kalau pengguna
   menghapusnya (sampah → permanen), ia tidak dibuat ulang. */
function sinkronWelcome() {
  const w = state.notes.find(x => x.welcome && !x.deletedAt);
  if (w && w.welcomeV !== WELCOME_V) {
    w.title = 'Selamat datang di Hara';
    w.blocks = htmlToBlocks(welcomeBody);
    w.welcomeV = WELCOME_V;
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
};

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      schema: SCHEMA,
      seq: state.seq,
      openId: state.openId,
      notes: state.notes,
    }));
    return true;
  } catch (e) {
    /* penyimpanan penuh / mode privat — dilaporkan supaya autosave bisa
       menampilkan status error dan MEMPERTAHANKAN draf recovery */
    return false;
  }
}

/* Data tersimpan ada tapi tidak bisa dibaca (JSON rusak / bentuk tak
   dikenal). Jangan diam-diam membuangnya: salinan mentahnya disimpan ke
   kunci cadangan dan kunci utama dibersihkan — kalau tidak, pemuatan
   berikutnya akan menemukan data rusak yang sama lagi. Aplikasi mulai
   dari catatan bawaan, dan pengguna diberi tahu lewat state.dataRusak. */
function cadangkanDataRusak(raw) {
  /* tidak ada data mentah sama sekali (mis. storage diblokir total) —
     bukan berarti data rusak, jangan menyalakan bendera */
  if (!raw) return;
  state.dataRusak = true;
  try {
    localStorage.setItem(KEY + '.rusak-' + Date.now(), raw);
    localStorage.removeItem(KEY);
  } catch (e) { /* penyimpanan penuh: biarkan data lama utuh di tempatnya */ }
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;

    let data = null;
    try { data = JSON.parse(raw); } catch (e) { data = null; }
    if (!data || !Array.isArray(data.notes)) {
      cadangkanDataRusak(raw);
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
       supaya pemuatan berikutnya tidak perlu migrasi lagi */
    if ((data.schema || 1) < SCHEMA || sinkronWelcome()) save();
  } catch (e) {
    /* jaring pengaman terakhir: mulai dari bawaan, jangan sampai
       aplikasi mati hanya karena satu data bermasalah */
    let mentah = '';
    try { mentah = localStorage.getItem(KEY) || ''; } catch (e2) {}
    cadangkanDataRusak(mentah);
    state.notes = DEFAULT_NOTES();
  }
}

export { SCHEMA };
