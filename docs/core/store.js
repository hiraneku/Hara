/* Satu-satunya jalan menulis data. Ganti isi file ini saat pindah ke Dexie. */
const KEY = 'hara.v1';

const DEFAULT_NOTES = () => [{
  id: 'w', t: 'Selamat datang di Hara', welcome: true, mod: 'baru saja',
  ex: 'Ini catatan bawaan Hara. Hapus saja kalau sudah selesai membaca…'
}];

export const state = { seq: 1, notes: DEFAULT_NOTES(), openId: 'w' };

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      seq: state.seq, openId: state.openId, notes: state.notes
    }));
  } catch (e) { /* penyimpanan penuh / mode privat */ }
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.notes)) return;
    state.notes = data.notes.length ? data.notes : DEFAULT_NOTES();
    state.seq   = data.seq || 1;
    state.openId = (data.openId && state.notes.some(n => n.id === data.openId))
      ? data.openId : state.notes[0].id;
  } catch (e) { state.notes = DEFAULT_NOTES(); }
}

export { DEFAULT_NOTES };
