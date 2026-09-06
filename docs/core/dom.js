/* Helper DOM dipakai semua modul. */
export const $  = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const el = id => document.getElementById(id);

/* Escape teks sebelum masuk ke template HTML. */
export const esc = t => String(t ?? '').replace(/[&<>"]/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* Waktu terbaca: "baru saja", "5 mnt lalu", ... */
export function stamp(ts) {
  if (!ts) return 'baru saja';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)    return 'baru saja';
  if (s < 3600)  return Math.floor(s / 60) + ' mnt lalu';
  if (s < 86400) return Math.floor(s / 3600) + ' jam lalu';
  return Math.floor(s / 86400) + ' hari lalu';
}
