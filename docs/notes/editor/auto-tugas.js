/* Saran konversi paragraf bertanggal menjadi to-do. Tidak mengubah catatan;
   pemanggil hanya mengubahnya setelah pengguna menekan tombol tindakan. */
import { uraiTugas } from '../pengingat.js?v=20261105210000';

const KUNCI_SARAN = 'hara.editor.saran-tugas.v1';
let saranAktif = true;
export function saranTugasAktif() {
  try {
    const v = localStorage.getItem(KUNCI_SARAN);
    if (v === '0') saranAktif = false;
    else if (v === '1') saranAktif = true;
  } catch (e) { /* gunakan preferensi sesi */ }
  return saranAktif;
}
export function aturSaranTugas(aktif) {
  saranAktif = !!aktif;
  try { localStorage.setItem(KUNCI_SARAN, saranAktif ? '1' : '0'); }
  catch (e) { /* tetap berlaku sampai sesi berakhir */ }
  return saranAktif;
}

const HARI = '(?:senin|selasa|rabu|kamis|jumat|sabtu|minggu)';
const TANGGAL = `(?:hari ini|besok|lusa|minggu depan|\\d{1,3}\\s+hari lagi|${HARI}|\\d{4}-\\d{1,2}-\\d{1,2}|\\d{1,2}\\/\\d{1,2}\\/\\d{4})`;
const WAKTU = '(?:(?:jam|pukul)\\s+\\d{1,2}(?:[:.]\\d{2})?(?:\\s*(?:pagi|siang|sore|malam))?|\\d{1,2}[:.]\\d{2}(?:\\s*(?:pagi|siang|sore|malam))?|\\d{1,2}\\s*(?:pagi|siang|sore|malam))';
const EKOR = new RegExp(`\\s+(${TANGGAL})(?:\\s+(${WAKTU}))?(?:\\s+(!{1,3}))?[.!?]*$`, 'iu');

export function kandidatTugas(teks) {
  const asli = String(teks || '').trim();
  if (asli.length < 5) return null;
  const m = EKOR.exec(asli);
  if (!m) return null;
  const uraian = asli.slice(0, m.index).trim();
  if (uraian.length < 2) return null;
  const tanggal = m[1].toLowerCase().replace(/^hari\s+(senin|selasa|rabu|kamis|jumat|sabtu|minggu)$/i, '$1');
  const waktu = (m[2] || '').trim().toLowerCase();
  const prioritas = m[3] || '';
  const isiTodo = [tanggal, waktu, prioritas, uraian].filter(Boolean).join(' ');
  const parsed = uraiTugas(isiTodo);
  if (!parsed || !parsed.sisa || parsed.sisa !== uraian) return null;
  return {
    isiTodo,
    uraian,
    frasaTanggal: m[1].trim(),
    jam: parsed.jam,
    waktu: parsed.waktu,
    prioritas: parsed.prioritas,
  };
}
