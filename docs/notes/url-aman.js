/* Penyaringan alamat tautan (B4). Satu sumber untuk tempelan, impor cadangan,
   dan tampilan kartu bookmark. Hanya http(s):, mailto:, dan tel: yang lolos.

   Kenapa perlu: isi catatan dari berkas cadangan JSON tidak melewati penyaring
   mana pun. Tanpa ini, `href="javascript:…"` akan tampil utuh. */

/* Peramban membuang karakter kontrol dan spasi di dalam skema, jadi
   "java\tscript:" juga dianggap javascript:. Pemeriksaan dilakukan setelah
   karakter itu dibuang. Mengembalikan alamat asli bila aman, '' bila tidak. */
export function tautanAman(href) {
  const asli = String(href == null ? '' : href).trim();
  if (!asli) return '';
  const bersih = asli.replace(/[\u0000-\u001f\u007f-\u009f\s]/g, '');
  return /^(https?:|mailto:|tel:)/i.test(bersih) ? asli : '';
}

/* Membuang atribut href yang tidak aman dari setiap <a> di dalam potongan HTML isi blok.
   Teks tautan tetap tampil. Href yang diawali '#' (tautan di tempat) dibiarkan.
   Di browser, HTML diurai di dalam <template> yang tidak menjalankan skrip. */
export function bersihkanHrefHtml(html) {
  const s = String(html == null ? '' : html);
  if (!/<a[\s>]/i.test(s)) return s;
  if (typeof document === 'undefined' || !document.createElement) {
    /* lingkungan tanpa DOM: buang semua href, yang paling aman */
    return s.replace(/<a\b[^>]*>/gi, t => t.replace(/\shref\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, ''));
  }
  const wadah = document.createElement('template');
  wadah.innerHTML = s;
  wadah.content.querySelectorAll('a[href]').forEach(a => {
    const h = (a.getAttribute('href') || '').trim();
    if (h.startsWith('#')) return;
    if (!tautanAman(h)) a.removeAttribute('href');
  });
  return wadah.innerHTML;
}
