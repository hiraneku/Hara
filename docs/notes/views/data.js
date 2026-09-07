/* Tampilan terpusat yang berbagi "state tampilan" (filter tag, kata cari,
   tampilan daftar) dengan bagian-bagian lain dari modul catatan.

   `stt` di-update oleh pengendali klik global di app.js / editor.js dan
   dibaca oleh render daftar/cari. Satu-satunya tempat data daftar
   "hidup" — views/misc.js menyalin definisinya supaya tombol bilah
   bawah ikut sinkron. */

export const stt = {
  tag: null,            /* tag yang sedang difilter */
  cari: '',             /* kata pencarian aktif */
  tampil: 'daftar',     /* 'daftar' | 'grid' | 'kanban' | 'galeri' */
  sort: 'ubah',         /* 'ubah' | 'judul' | 'buat' */
};

export function setTag(tag) {
  stt.tag = tag || null;
  stt.cari = '';
}

