/* Satu-satunya jalan menulis data. Ganti isi file ini saat pindah ke Dexie.

   Skema disimpan bersama data (`schema`) supaya migrasi berikutnya tahu
   dari versi mana ia berangkat. Data v1 memakai field `html`; sejak v2
   isi catatan disimpan sebagai `blocks`. */

import { makeNote, normalizeNotes, htmlToBlocks } from '../notes/note-model.js?v=20260909105048';
import { isiWelcome, judulWelcome, WELCOME_V } from '../notes/views/welcome.js?v=20260909105048';
import { sinkronTag } from '../notes/tags.js?v=20260909105048';
import { bahasaSekarang } from './i18n.js?v=20260909105048';

const KEY = 'hara.v1';        /* kunci dipertahankan agar data lama terbaca */
const SCHEMA = 2;

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
    let mentah = '';
    try { mentah = localStorage.getItem(KEY) || ''; } catch (e2) {}
    cadangkanDataRusak(mentah);
    state.notes = DEFAULT_NOTES();
  }
}

export { SCHEMA };
