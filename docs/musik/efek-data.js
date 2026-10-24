/* Efek pemutar (menu Effect): definisi, batas nilai, normalisasi, dan format.
   Murni (tanpa DOM dan tanpa audio) supaya bisa diuji di Node.
   Kategori saat ini: Spatial & Ambience (satu kategori berisi tujuh efek). */

export const EFEK_KATEGORI = Object.freeze({ id: 'spasial', nama: 'Spatial & Ambience' });

/* Respons ruangan untuk Convolution Reverb. File berasal dari Voxengo (lihat ir/LICENSE-voxengo.txt). */
export const IR_RUANG = Object.freeze([
  { id: 'aula', nama: 'Aula konser', file: 'aula.wav' },
  { id: 'ruangan-kecil', nama: 'Ruangan kecil', file: 'ruangan-kecil.wav' },
  { id: 'gua', nama: 'Gua', file: 'gua.wav' },
]);

const P = (id, nama, min, max, langkah, awal, satuan = '') => ({ id, nama, min, max, langkah, awal, satuan, tipe: 'angka' });
const PILIH = (id, nama, opsi, awal) => ({ id, nama, opsi, awal, satuan: '', tipe: 'pilihan' });

export const EFEK = Object.freeze([
  {
    id: 'reverb', nama: 'Reverb', ringkas: 'Gema ruangan, aula, atau tempat luas.',
    utama: [
      P('wet', 'Wet', 0, 100, 1, 35, '%'),
      P('lebar', 'Lebar stereo', 0, 100, 1, 100, '%'),
      P('damping', 'Damping frek. tinggi', 0, 100, 1, 50, '%'),
      P('ukuran', 'Ukuran ruangan', 0, 100, 1, 50, '%'),
      P('predelay', 'Pre-delay', 0, 500, 1, 20, 'ms'),
      P('cutLow', 'Cut frek. rendah', 0, 1000, 10, 80, 'Hz'),
    ],
    lanjutan: [P('peluruhan', 'Waktu peluruhan', 0.3, 8, 0.1, 2.5, 's')],
  },
  {
    id: 'echo', nama: 'Echo', ringkas: 'Mengulang suara asli dengan jeda yang jelas.',
    utama: [
      P('wet', 'Volume echo', 0, 100, 1, 35, '%'),
      P('jeda', 'Jeda', 60, 1000, 10, 350, 'ms'),
      P('umpan', 'Umpan balik', 0, 90, 1, 40, '%'),
    ],
    lanjutan: [
      P('filter', 'Filter nada gema', 300, 12000, 100, 4000, 'Hz'),
      P('pantul', 'Pantul kiri-kanan', 0, 100, 1, 0, '%'),
    ],
  },
  {
    id: 'delay', nama: 'Delay', ringkas: 'Mengulang suara dengan waktu dan jumlah yang diatur.',
    utama: [
      P('waktu', 'Waktu', 1, 2000, 1, 500, 'ms'),
      P('ulang', 'Jumlah pengulangan', 1, 10, 1, 4, 'kali'),
      P('wet', 'Volume gema', 0, 100, 1, 40, '%'),
    ],
    lanjutan: [
      P('filter', 'Filter nada gema', 200, 12000, 100, 6000, 'Hz'),
      P('pantul', 'Pantul kiri-kanan', 0, 100, 1, 0, '%'),
    ],
  },
  {
    id: 'lebar', nama: 'Stereo Widening', ringkas: 'Membuat musik terasa lebih lebar.',
    utama: [P('lebar', 'Lebar', 0, 200, 1, 130, '%')],
    lanjutan: [P('bass', 'Bass tetap di tengah', 0, 500, 5, 0, 'Hz')],
  },
  {
    id: 'spasial', nama: '3D / Spatial Audio', ringkas: 'Kesan suara datang dari arah tertentu.',
    utama: [
      P('arah', 'Arah', -100, 100, 1, 0),
      P('jarak', 'Jarak', 0, 100, 1, 0, '%'),
    ],
    lanjutan: [P('putar', 'Putar otomatis', 0, 1, 0.05, 0, 'Hz')],
  },
  {
    id: 'pantulan', nama: 'Early Reflections', ringkas: 'Pantulan awal yang membentuk kesan ruangan.',
    utama: [
      P('wet', 'Wet', 0, 100, 1, 40, '%'),
      P('jumlah', 'Jumlah pantulan', 1, 12, 1, 6),
      P('jarak', 'Jarak pantulan', 5, 120, 1, 30, 'ms'),
      P('lebar', 'Lebar stereo', 0, 100, 1, 80, '%'),
      P('redaman', 'Redaman', 0, 100, 1, 40, '%'),
    ],
    lanjutan: [P('peluruhan', 'Peluruhan pantulan', 0, 100, 1, 70, '%')],
  },
  {
    id: 'konvolusi', nama: 'Convolution Reverb', ringkas: 'Meniru gema ruangan nyata dari rekaman.',
    utama: [
      P('wet', 'Wet', 0, 100, 1, 40, '%'),
      PILIH('ruang', 'Ruangan', IR_RUANG.map(r => r.id), 'aula'),
      P('predelay', 'Pre-delay', 0, 500, 1, 0, 'ms'),
      P('lebar', 'Lebar stereo', 0, 100, 1, 100, '%'),
      P('cutLow', 'Cut frek. rendah', 0, 1000, 10, 60, 'Hz'),
    ],
    lanjutan: [P('gainIr', 'Gain respons ruangan', -12, 12, 0.5, 0, 'dB')],
  },
]);

const PETA = Object.fromEntries(EFEK.map(e => [e.id, e]));

export function efekById(id) { return PETA[id] || null; }
export function semuaParam(efek) { return [...efek.utama, ...efek.lanjutan]; }

/* Jepit ke rentang, bulatkan ke langkah. Nilai tak valid kembali ke nilai awal. */
export function klampParam(param, x) {
  if (param.tipe === 'pilihan') return param.opsi.includes(x) ? x : param.awal;
  const n = Number(x);
  if (!Number.isFinite(n)) return param.awal;
  const dijepit = Math.min(param.max, Math.max(param.min, n));
  const bulat = Math.round((dijepit - param.min) / param.langkah) * param.langkah + param.min;
  return Number(Math.min(param.max, Math.max(param.min, bulat)).toFixed(4));
}

/* Keadaan awal: semua efek mati dengan nilai awal masing-masing. */
export function efekAwal() {
  const hasil = {};
  for (const e of EFEK) {
    const p = {};
    for (const param of semuaParam(e)) p[param.id] = param.awal;
    hasil[e.id] = { aktif: false, p };
  }
  return hasil;
}

/* Bentuk data selalu lengkap dan valid, apa pun isi data yang tersimpan. */
export function normalisasiEfek(raw) {
  const hasil = {};
  for (const e of EFEK) {
    const r = raw && typeof raw === 'object' ? raw[e.id] : null;
    const p = {};
    for (const param of semuaParam(e)) p[param.id] = klampParam(param, r?.p?.[param.id]);
    hasil[e.id] = { aktif: typeof r?.aktif === 'boolean' ? r.aktif : false, p };
  }
  return hasil;
}

/* Ubah satu efek: patch { aktif?, p?: { idParam: nilai } }. Mengembalikan keadaan baru. */
export function ubahEfekPure(set, id, patch = {}) {
  if (!efekById(id)) return normalisasiEfek(set);
  const base = normalisasiEfek(set);
  const cur = base[id];
  return normalisasiEfek({
    ...base,
    [id]: {
      aktif: typeof patch.aktif === 'boolean' ? patch.aktif : cur.aktif,
      p: { ...cur.p, ...(patch.p || {}) },
    },
  });
}

/* Angka dengan pemisah Indonesia: ribuan titik, desimal koma. */
function fmtAngka(v, desimal) {
  const [bulat, pecahan] = Math.abs(v).toFixed(desimal).split('.');
  const ribuan = bulat.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (v < 0 ? '-' : '') + ribuan + (pecahan ? ',' + pecahan : '');
}

function desimalDari(langkah) {
  if (langkah >= 1) return 0;
  if (langkah >= 0.1) return 1;
  return 2;
}

/* Teks nilai untuk ditampilkan, mis. "25%", "350 ms", "1.000 Hz", "+3 dB". */
export function formatNilai(param, v) {
  if (param.tipe === 'pilihan') return IR_RUANG.find(r => r.id === v)?.nama ?? String(v);
  if (param.id === 'arah') {
    if (v === 0) return 'Tengah';
    return v < 0 ? `Kiri ${fmtAngka(-v, 0)}` : `Kanan ${fmtAngka(v, 0)}`;
  }
  const teks = fmtAngka(v, Number.isInteger(v) ? 0 : desimalDari(param.langkah));
  if (param.satuan === '%') return `${teks}%`;
  if (param.id === 'gainIr' && v > 0) return `+${teks} ${param.satuan}`;
  return param.satuan ? `${teks} ${param.satuan}` : teks;
}
