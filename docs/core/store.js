/* Satu-satunya jalan menulis data. Ganti isi file ini saat pindah ke Dexie.

   Skema disimpan bersama data (`schema`) supaya migrasi berikutnya tahu
   dari versi mana ia berangkat. Data v1 memakai field `html`; sejak v2
   isi catatan disimpan sebagai `blocks`. */

import { makeNote, normalizeNotes, htmlToBlocks } from '../notes/note-model.js?v=20260907035221';
import { welcomeBody } from '../notes/views/welcome.js?v=20260907035221';

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
  }),
];

export const state = { seq: 1, notes: DEFAULT_NOTES(), openId: 'w' };

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

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.notes)) return;

    /* normalizeNotes menerima bentuk lama maupun baru, jadi tidak perlu
       cabang khusus per versi selama migrasinya masih satu langkah. */
    const notes = normalizeNotes(data.notes);
    state.notes = notes.length ? notes : DEFAULT_NOTES();
    state.seq = data.seq || 1;
    state.openId = (data.openId && state.notes.some(n => n.id === data.openId))
      ? data.openId : state.notes[0].id;

    /* data lama baru saja dinaikkan versinya -> tulis ulang sekali,
       supaya pemuatan berikutnya tidak perlu migrasi lagi */
    if ((data.schema || 1) < SCHEMA) save();
  } catch (e) {
    state.notes = DEFAULT_NOTES();
  }
}

export { SCHEMA };
