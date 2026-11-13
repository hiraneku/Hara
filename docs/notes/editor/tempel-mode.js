/* Preferensi mode tempel. 'format' mempertahankan perilaku lama, 'markdown'
   mengurai teks polos sebagai mekanik Hara, dan 'plain' menjaga teks apa adanya. */
const KUNCI = 'hara.editor.tempel-mode.v1';
const MODUS = ['format', 'markdown', 'plain'];
let cache = 'format';

export function modeTempel() {
  try {
    const nilai = localStorage.getItem(KUNCI);
    if (MODUS.includes(nilai)) cache = nilai;
  } catch (e) { /* preferensi sesi tetap tersedia */ }
  return cache;
}

export function aturModeTempel(nilai) {
  if (!MODUS.includes(nilai)) return false;
  cache = nilai;
  try { localStorage.setItem(KUNCI, nilai); }
  catch (e) { /* tetap berlaku untuk sesi ini */ }
  return true;
}

export const DAFTAR_MODE_TEMPEL = MODUS;
