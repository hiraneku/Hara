/* Menampilkan sampul lagu di DOM. Elemen bertanda `data-sampul-id` diisi
   gambar sampul asli bila ada; bila tidak, ikon nota di atas warna cadangan
   yang dihasilkan dari id lagu. Dipakai layar Musik dan kartu beranda. */

import * as S from './simpan.js?v=20261025024750';
import { hueDariId } from './logika.js?v=20261025024750';
import { ikon } from './ikon.js?v=20261025024750';

function isi(el, id, url) {
  const hue = hueDariId(id);
  el.style.setProperty('--hue', String(hue));
  if (url) {
    el.classList.add('ada-sampul');
    el.innerHTML = `<img src="${url}" alt="" decoding="async" draggable="false">`;
  } else {
    el.classList.remove('ada-sampul');
    el.innerHTML = ikon('nota', 'sampul-ikon');
  }
}

/* Isi satu elemen. Aman dipanggil berulang: hasil yang sudah usang dibuang. */
export async function pasangSampul(el, id) {
  el.dataset.sampulId = id;
  const x = S.laguById(id);
  let url = null;
  if (x && x.sampulAda) {
    try { url = await S.urlSampul(id); } catch (e) { url = null; }
  }
  if (el.dataset.sampulId !== id) return;   /* sudah dipakai untuk lagu lain */
  isi(el, id, url);
}

/* Isi semua elemen `[data-sampul-id]` di dalam root. */
export function segarSampul(root = document) {
  if (!root || !root.querySelectorAll) return;
  root.querySelectorAll('[data-sampul-id]').forEach(el => {
    pasangSampul(el, el.dataset.sampulId);
  });
}
