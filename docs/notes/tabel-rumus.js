/* MB2 · Logika murni tabel lanjutan: rumus sederhana, urut, dan saring.

   Tanpa DOM. Dipakai oleh note-model.js (render awal) dan blok-modern.js
   (perbarui saat mengetik / urut / saring).

   Rumus (sel yang teksnya diawali "="):
     angka, referensi sel (A1 = kolom A baris pertama, termasuk header),
     rentang (A1:B3, hanya di dalam fungsi), + − * / dan kurung, tanda minus,
     fungsi SUM · AVERAGE (alias AVG) · MIN · MAX · COUNT.
   Angka di sel: "12", "12.5", atau "12,5". Teks bukan angka dianggap
   tidak ada di rentang, dan memakai sel teks dalam operasi menghasilkan #NILAI!.
   Galat: #RUMUS! (sintaks), #REF! (di luar tabel), #DIV/0!, #NILAI!, #SIKLUS!.

   Pengurutan dan penyaringan hanya mengubah urutan/tampilan baris data;
   rumus tetap mengacu ke posisi sel (sama seperti spreadsheet). */

/* ── alamat & angka ── */

export const kolomHuruf = i => {
  let s = '', n = i + 1;
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
};

/* 'B3' → { c: 1, r: 2 } (r 0-based). Null bila bukan alamat. */
export function parseAlamat(teks) {
  const m = /^([A-Z]{1,3})(\d{1,4})$/.exec(String(teks || '').toUpperCase());
  if (!m) return null;
  let c = 0;
  for (const ch of m[1]) c = c * 26 + (ch.charCodeAt(0) - 64);
  return { c: c - 1, r: Number(m[2]) - 1 };
}

/* Angka dari teks sel, atau null. Mendukung koma sebagai desimal. */
export function angkaSel(teks) {
  const t = String(teks ?? '').trim().replace(/\s+/g, '');
  if (!/^-?\d+([.,]\d+)?$/.test(t)) return null;
  const v = parseFloat(t.replace(',', '.'));
  return Number.isFinite(v) ? v : null;
}

export const adalahRumus = teks => String(teks ?? '').trim().startsWith('=');

/* Format hasil: bulat apa adanya, pecahan dibatasi 6 desimal tanpa nol berlebih. */
export function formatHasil(v) {
  if (!Number.isFinite(v)) return '#NILAI!';
  if (Number.isInteger(v)) return String(v);
  return String(Math.round(v * 1e6) / 1e6);
}

/* ── tokenizer & parser rumus ── */

class GalatRumus extends Error {
  constructor(kode) { super(kode); this.kode = kode; }
}

function tokenkan(src) {
  const toks = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    if ('+-*/(),:'.includes(ch)) { toks.push({ t: ch }); i++; continue; }
    const num = /^\d+(\.\d+)?/.exec(src.slice(i));
    if (num) { toks.push({ t: 'num', v: parseFloat(num[0]) }); i += num[0].length; continue; }
    const id = /^[A-Za-z][A-Za-z0-9]*/.exec(src.slice(i));
    if (id) { toks.push({ t: 'id', v: id[0].toUpperCase() }); i += id[0].length; continue; }
    throw new GalatRumus('#RUMUS!');
  }
  return toks;
}

const FUNGSI = {
  SUM: v => v.reduce((a, b) => a + b, 0),
  AVERAGE: v => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : (() => { throw new GalatRumus('#DIV/0!'); })()),
  AVG: null,   /* diisi di bawah */
  MIN: v => (v.length ? Math.min(...v) : 0),
  MAX: v => (v.length ? Math.max(...v) : 0),
  COUNT: v => v.length,
};
FUNGSI.AVG = FUNGSI.AVERAGE;

/* Evaluasi satu rumus terhadap matriks `rows` (baris 0 = header).
   `nilaiSel(r, c)` mengembalikan angka atau null (teks/kosong); `kosongSel`
   menandai sel yang memang kosong. */
function evaluasi(src, rows, nilaiSel, kosongSel) {
  const toks = tokenkan(src.trim().replace(/^=/, ''));
  let p = 0;
  const lihat = () => toks[p];
  const ambil = t => { if (!toks[p] || (t && toks[p].t !== t)) throw new GalatRumus('#RUMUS!'); return toks[p++]; };

  const alamat = (teks) => {
    const a = parseAlamat(teks);
    if (!a) throw new GalatRumus('#RUMUS!');
    if (a.r < 0 || a.r >= rows.length || a.c < 0 || a.c >= Math.max(...rows.map(x => x.length))) throw new GalatRumus('#REF!');
    return a;
  };

  /* rentang: hanya dipakai sebagai argumen fungsi → daftar angka */
  const rentang = (a, b) => {
    const r1 = Math.min(a.r, b.r), r2 = Math.max(a.r, b.r);
    const c1 = Math.min(a.c, b.c), c2 = Math.max(a.c, b.c);
    const out = [];
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) {
      if (r < 0 || r >= rows.length) throw new GalatRumus('#REF!');
      const v = nilaiSel(r, c);
      if (v !== null) out.push(v);
    }
    return out;
  };

  let ekspresi;
  const primer = () => {
    const t = lihat();
    if (!t) throw new GalatRumus('#RUMUS!');
    if (t.t === 'num') { p++; return t.v; }
    if (t.t === '-') { p++; return -primer(); }
    if (t.t === '(') { p++; const v = ekspresi(); ambil(')'); return v; }
    if (t.t === 'id') {
      p++;
      if (lihat() && lihat().t === '(') {
        const nama = t.v;
        if (!(nama in FUNGSI)) throw new GalatRumus('#RUMUS!');
        p++;
        const daftar = [];
        const argumen = () => {
          const awal = toks[p];
          if (awal && awal.t === 'id' && toks[p + 1] && toks[p + 1].t === ':') {
            p += 2;
            const akhir = ambil('id');
            daftar.push(...rentang(alamat(awal.v), alamat(akhir.v)));
          } else {
            daftar.push(ekspresi());
          }
        };
        if (!(lihat() && lihat().t === ')')) {
          argumen();
          while (lihat() && lihat().t === ',') { p++; argumen(); }
        }
        ambil(')');
        return FUNGSI[nama](daftar);
      }
      const a = alamat(t.v);
      const v = nilaiSel(a.r, a.c);
      if (v === null) {
        /* sel kosong dihitung 0 dalam operasi, seperti spreadsheet */
        if (kosongSel(a.r, a.c)) return 0;
        throw new GalatRumus('#NILAI!');
      }
      return v;
    }
    throw new GalatRumus('#RUMUS!');
  };
  const suku = () => {
    let v = primer();
    while (lihat() && (lihat().t === '*' || lihat().t === '/')) {
      const op = toks[p++].t;
      const r = primer();
      if (op === '/') { if (r === 0) throw new GalatRumus('#DIV/0!'); v = v / r; }
      else v = v * r;
    }
    return v;
  };
  ekspresi = () => {
    let v = suku();
    while (lihat() && (lihat().t === '+' || lihat().t === '-')) {
      const op = toks[p++].t;
      const r = suku();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  };

  if (!toks.length) throw new GalatRumus('#RUMUS!');
  const hasil = ekspresi();
  if (p !== toks.length) throw new GalatRumus('#RUMUS!');
  return hasil;
}

/* Hitung seluruh tabel. Mengembalikan matriks string yang siap ditampilkan:
   sel rumus → hasil/galat, sel biasa → teks aslinya. Sel yang saling
   merujuk dideteksi sebagai #SIKLUS!. */
export function hitungTabel(rows) {
  const memo = new Map();   /* 'r,c' → string hasil */
  const sedang = new Set();

  const teksSel = (r, c) => String((rows[r] && rows[r][c]) ?? '');

  const nilai = (r, c) => {
    const kunci = r + ',' + c;
    const teks = teksSel(r, c);
    if (!adalahRumus(teks)) return angkaSel(teks);
    if (sedang.has(kunci)) throw new GalatRumus('#SIKLUS!');
    const hasil = hitungSel(r, c);
    const v = Number(hasil);
    return (hasil.startsWith('#') || !Number.isFinite(v)) ? (() => { throw new GalatRumus(hasil); })() : v;
  };

  const hitungSel = (r, c) => {
    const kunci = r + ',' + c;
    if (memo.has(kunci)) return memo.get(kunci);
    sedang.add(kunci);
    let out;
    try {
      out = formatHasil(evaluasi(teksSel(r, c), rows, nilai, (rr, cc) => teksSel(rr, cc).trim() === ''));
    } catch (e) {
      out = e instanceof GalatRumus ? e.kode : '#RUMUS!';
    }
    sedang.delete(kunci);
    memo.set(kunci, out);
    return out;
  };

  return rows.map((baris, r) => baris.map((_, c) => {
    const teks = teksSel(r, c);
    return adalahRumus(teks) ? hitungSel(r, c) : teks;
  }));
}

/* ── urut & saring (hanya baris data; header tetap di tempat) ── */

const cmpSel = (a, b) => {
  const na = angkaSel(a), nb = angkaSel(b);
  if (na !== null && nb !== null) return na - nb;
  if (na !== null) return -1;
  if (nb !== null) return 1;
  return String(a).localeCompare(String(b), 'id', { numeric: true, sensitivity: 'base' });
};

/* Urutkan baris data menurut kolom `kol`. Sel kosong selalu di bawah. */
export function urutBaris(rows, kol, naik = true) {
  if (!rows.length) return rows;
  const [header, ...badan] = rows;
  const kosong = s => String(s ?? '').trim() === '';
  const urut = [...badan].sort((x, y) => {
    const a = x[kol] ?? '', b = y[kol] ?? '';
    if (kosong(a) && kosong(b)) return 0;
    if (kosong(a)) return 1;
    if (kosong(b)) return -1;
    const h = cmpSel(a, b);
    return naik ? h : -h;
  });
  return [header, ...urut];
}

/* Apakah baris data (indeks 0 = baris pertama setelah header) lolos saringan.
   Pencocokan teks tidak peka huruf besar-kecil. Saringan kosong = semua lolos. */
export function lolosSaring(rows, kol, teks) {
  const cari = String(teks || '').trim().toLowerCase();
  return rows.slice(1).map(baris => {
    if (!cari) return true;
    const isi = String((baris[kol] ?? '')).toLowerCase();
    return isi.includes(cari);
  });
}

/* Keadaan tampilan per blok tabel (bukan data): saringan & kolom terpilih.
   Tidak disimpan ke catatan; hanya bertahan selama sesi. */
const keadaanTabel = new Map();
export const ambilKeadaanTabel = id => keadaanTabel.get(id) || { kol: 0, saring: '' };
export function simpanKeadaanTabel(id, kol, saring) {
  keadaanTabel.set(id, { kol: Number(kol) || 0, saring: String(saring || '') });
}
