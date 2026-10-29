/* Penyaringan HTML isi blok (B4c). Dipakai saat impor cadangan JSON dan saat render.

   Kenapa perlu: isi blok disimpan sebagai HTML. Impor JSON dulu menyalinnya apa adanya,
   jadi `<img onerror=…>`, `<svg onload=…>`, atau `<iframe>` ikut masuk ke innerHTML.

   Aturan (lihat bersihkanHtmlBlok):
   • tag berbahaya dibuang beserta isinya (script, style, iframe, object, embed, form, …);
   • semua atribut on* dibuang;
   • atribut URL (href, src, xlink:href, poster, …) hanya boleh berskema aman:
       href  → http(s), mailto, tel, atau tautan di tempat (#…)  (sama dengan tautanAman)
       src   → http(s), blob:, data:image/, atau tanpa skema (relatif)
   • <use href> hanya boleh ke simbol lokal (#…);
   • atribut style yang memuat ekspresi/javascript/url() luar dibuang;
   • atribut lain (class, id, data-*, title, alt, target, …) dibiarkan.

   Di browser, HTML diurai di dalam <template>: tidak memuat gambar dan tidak menjalankan skrip. */

import { tautanAman } from './url-aman.js?v=20261029200000';

const TAG_BUANG = new Set([
  'script', 'style', 'iframe', 'frame', 'frameset', 'object', 'embed', 'applet',
  'link', 'meta', 'base', 'form', 'noscript', 'template', 'xml', 'math',
  'animate', 'animatemotion', 'animatetransform', 'set', 'foreignobject', 'portal',
]);

const ATTR_BUANG = new Set(['srcdoc', 'formaction', 'action', 'formtarget', 'codebase', 'data', 'srcset']);
const ATTR_HREF = new Set(['href', 'xlink:href']);
const ATTR_SRC = new Set(['src', 'poster', 'background', 'lowsrc', 'dynsrc']);

/* Dipakai render untuk memutuskan apakah isi perlu disaring (markup aplikasi sendiri tidak memicunya).
   Impor sudah menyaring semua isi; ini lapisan kedua untuk jalur lain. */
export const PERLU_SARING = /<\s*\/?\s*(script|style|iframe|frame|frameset|object|embed|applet|link|meta|base|form|noscript|template|animate|animatemotion|animatetransform|set|math|foreignobject|portal)\b|\son[a-z]+\s*=|\b(srcdoc|xlink:href|formaction|codebase)\b|javascript\s*:|vbscript\s*:|data\s*:(?!\s*image\/)|expression\s*\(|\bsrc\s*=|&#/i;

/* Nilai atribut tanpa karakter kontrol dan spasi, untuk memeriksa skema. */
const bersihSkema = v => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f-\u009f\s]/g, '');

function urlSrcAman(v) {
  const b = bersihSkema(v);
  if (!b) return true;
  return /^(https?:|blob:|data:image\/)/i.test(b) || !/^[a-z][a-z0-9+.-]*:/i.test(b);
}

/* true bila atribut boleh tetap. `tag` huruf kecil, `nama` huruf kecil. */
function atributAman(tag, nama, nilai) {
  if (nama.startsWith('on')) return false;
  if (ATTR_BUANG.has(nama)) return false;
  if (nama === 'style') {
    return !/expression\s*\(|javascript\s*:|vbscript\s*:|behavior\s*:|-moz-binding|@import/i.test(nilai) &&
      !/url\s*\(\s*['"]?\s*(?!https?:|data:image\/|blob:|#)/i.test(nilai);
  }
  if (ATTR_HREF.has(nama)) {
    const h = String(nilai || '').trim();
    if (tag === 'use') return h.startsWith('#');        /* <use> hanya simbol lokal, mis. #i-link */
    if (h.startsWith('#')) return true;                  /* tautan di tempat */
    return !!tautanAman(h);
  }
  if (ATTR_SRC.has(nama)) return urlSrcAman(nilai);
  return true;
}

/* Lingkungan tanpa DOM (uji Node tanpa jsdom): saring dengan ekspresi reguler. */
function bersihTanpaDom(s) {
  return s
    .replace(/<\s*(script|style|iframe|frame|frameset|object|embed|applet|noscript|template|form|math|foreignobject)\b[\s\S]*?<\/\s*\1\s*>/gi, '')
    .replace(/<\/?\s*(script|style|iframe|frame|frameset|object|embed|applet|link|meta|base|form|noscript|template|math)\b[^>]*>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, '')
    .replace(/\s(href|src)\s*=\s*("\s*(javascript|vbscript|data)\s*:[^"]*"|'\s*(javascript|vbscript|data)\s*:[^']*'|(javascript|vbscript|data)\s*:[^\s>]*)/gi, '');
}

/* Mengembalikan HTML yang sudah aman. Isi tanpa '<' dikembalikan apa adanya. */
export function bersihkanHtmlBlok(html) {
  const s = String(html == null ? '' : html);
  if (!s.includes('<')) return s;
  if (typeof document === 'undefined' || !document.createElement) return bersihTanpaDom(s);
  const wadah = document.createElement('template');
  wadah.innerHTML = s;
  wadah.content.querySelectorAll('*').forEach(el => {
    const tag = String(el.localName || '').toLowerCase();
    if (TAG_BUANG.has(tag)) { el.remove(); return; }
    for (const at of Array.from(el.attributes)) {
      if (!atributAman(tag, at.name.toLowerCase(), at.value)) el.removeAttribute(at.name);
    }
  });
  return wadah.innerHTML;
}
