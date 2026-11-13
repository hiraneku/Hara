/* Pengaturan auto-pair editor. Hanya preferensi eksplisit; isi catatan tidak
   memuat penanda khusus untuk pasangan yang dibuat otomatis. */
const KUNCI = 'hara.editor.pasangan.v1';
const DEFAULT = Object.freeze({ kurung: true, kutip: true });
let cache = { ...DEFAULT };

export function pengaturanPasangan() {
  try {
    const v = JSON.parse(localStorage.getItem(KUNCI) || 'null');
    if (v && typeof v === 'object') {
      cache = {
        kurung: typeof v.kurung === 'boolean' ? v.kurung : DEFAULT.kurung,
        kutip: typeof v.kutip === 'boolean' ? v.kutip : DEFAULT.kutip,
      };
    }
  } catch (e) { /* storage privat/rusak: gunakan cache sesi */ }
  return { ...cache };
}

export function aturPasangan(kunci, aktif) {
  if (!Object.prototype.hasOwnProperty.call(DEFAULT, kunci)) return false;
  cache[kunci] = !!aktif;
  try { localStorage.setItem(KUNCI, JSON.stringify(cache)); }
  catch (e) { /* preferensi tetap berlaku sampai aplikasi ditutup */ }
  return true;
}

export function kategoriPasangan(buka) {
  if ('([{'.includes(buka)) return 'kurung';
  if ('\'"`'.includes(buka)) return 'kutip';
  return null;
}

export function tutupPasangan(buka) {
  return ({ '(': ')', '[': ']', '{': '}', "'": "'", '"': '"', '`': '`' })[buka] || null;
}
