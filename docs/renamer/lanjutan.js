/**
 * Fitur lanjutan Bulk Renamer — Hara (K21–K25, K22)
 *
 * Murni (tanpa DOM) kecuali dHashDariBlob & hitungSha256 yang memakai API
 * browser (Canvas / WebCrypto) dan hanya dipanggil dari UI.
 *
 *  - Aturan bersyarat & grup (K23): cocokGrupDanKondisi
 *  - Penjelas regex & pustaka pola (K24): jelaskanRegex, PUSTAKA_POLA
 *  - Belajar dari contoh / flash fill (K21): belajarDariContoh
 *  - Resep JSON, ekspor/impor (K25): buatResep, bacaResep
 *  - Deteksi duplikat (K22): hitungSha256, dHashDariPiksel, jarakHamming,
 *    kelompokDuplikat
 */

import { RULE_TYPES, parseFileName } from './model.js?v=20261024010928';
// Impor timbal-balik dengan engine.js aman: keduanya hanya memakai fungsi saat dipanggil.
import { applyRule } from './engine.js?v=20261024010928';

/* ───────────────────────── K23 · kondisi & grup ───────────────────────── */

export const OP_KONDISI = ['contains', 'not-contains', 'equals', 'starts', 'ends', 'regex', 'gt', 'lt'];
export const FIELD_KONDISI = ['name', 'ext', 'size', 'mtime'];

/**
 * Satu kondisi terhadap konteks berkas.
 * @param {{field?:string, op:string, value:any}} kond
 * @param {{name:string, ext:string, size:number, mtime:number}} ctx
 */
export function cocokKondisi(kond, ctx) {
  if (!kond || !OP_KONDISI.includes(kond.op)) return false;
  const field = FIELD_KONDISI.includes(kond.field) ? kond.field : 'name';
  const v = kond.value;

  if (field === 'size' || field === 'mtime') {
    const n = Number(ctx[field]) || 0;
    const t = Number(v);
    if (Number.isNaN(t)) return false;
    if (kond.op === 'gt') return n > t;
    if (kond.op === 'lt') return n < t;
    return n === t;
  }

  let teks = String(ctx[field] ?? '');
  if (field === 'ext') teks = teks.replace(/^\./, '').toLowerCase();
  const pembanding = String(v ?? '');
  const a = teks.toLowerCase();
  const b = pembanding.toLowerCase();

  switch (kond.op) {
    case 'contains': return a.includes(b);
    case 'not-contains': return !a.includes(b);
    case 'equals': return a === (field === 'ext' ? b.replace(/^\./, '') : b);
    case 'starts': return a.startsWith(b);
    case 'ends': return a.endsWith(b);
    case 'regex': {
      try {
        return new RegExp(pembanding, 'i').test(teks);
      } catch (e) {
        return false;
      }
    }
    default: return false;
  }
}

/**
 * Kondisi gabungan: { mode: 'all' | 'any', conds: [...] }. Kosong = selalu benar.
 */
export function cocokWhen(when, ctx) {
  if (!when || !Array.isArray(when.conds) || when.conds.length === 0) return true;
  const hasil = when.conds.map(k => cocokKondisi(k, ctx));
  return when.mode === 'any' ? hasil.some(Boolean) : hasil.every(Boolean);
}

/**
 * Apakah aturan berlaku untuk berkas ini? Menggabungkan grup dan kondisi aturan.
 * groups: { [namaGrup]: { enabled?: boolean, when?: When } }
 */
export function cocokGrupDanKondisi(rule, ctx, groups = {}) {
  if (rule && rule.group && groups && groups[rule.group]) {
    const g = groups[rule.group];
    if (g.enabled === false) return false;
    if (!cocokWhen(g.when, ctx)) return false;
  }
  return cocokWhen(rule && rule.when, ctx);
}

/* ─────────────────────── K24 · penjelas & pustaka regex ─────────────────────── */

const ESC_ARTI = {
  d: 'angka (0–9)', D: 'bukan angka',
  w: 'huruf, angka, atau garis bawah', W: 'bukan huruf/angka/garis bawah',
  s: 'spasi, tab, atau baris baru', S: 'bukan spasi',
  b: 'batas kata', B: 'bukan batas kata',
  n: 'baris baru', t: 'tab', r: 'carriage return',
};

/** Validasi sintaks regex. */
export function validasiRegex(pola) {
  try {
    new RegExp(String(pola ?? ''));
    return { ok: true, pesan: '' };
  } catch (e) {
    return { ok: false, pesan: e.message };
  }
}

/**
 * Menjelaskan pola regex per token dalam Bahasa Indonesia.
 * Tidak lengkap untuk seluruh sintaks, tetapi mencakup yang umum dipakai pada nama berkas.
 * @returns {{ok:boolean, pesan?:string, bagian:Array<{token:string, arti:string}>}}
 */
export function jelaskanRegex(pola) {
  const s = String(pola ?? '');
  const cek = validasiRegex(s);
  if (!cek.ok) return { ok: false, pesan: cek.pesan, bagian: [] };

  const bagian = [];
  let i = 0;
  const tambah = (token, arti) => bagian.push({ token, arti });

  while (i < s.length) {
    const c = s[i];

    if (c === '\\') {
      const n = s[i + 1] ?? '';
      let arti;
      if (ESC_ARTI[n]) arti = ESC_ARTI[n];
      else if (/\d/.test(n)) arti = `referensi ke grup ${n}`;
      else arti = `karakter literal "${n}"`;
      tambah('\\' + n, arti);
      i += 2;
      continue;
    }

    if (c === '[') {
      let j = i + 1;
      const negasi = s[j] === '^';
      if (negasi) j++;
      if (s[j] === ']') j++;
      while (j < s.length && s[j] !== ']') {
        if (s[j] === '\\') j++;
        j++;
      }
      tambah(s.slice(i, j + 1), negasi ? 'salah satu karakter selain yang tertulis' : 'salah satu karakter dalam kurung siku');
      i = j + 1;
      continue;
    }

    if (c === '(') {
      if (s.startsWith('(?:', i)) { tambah('(?:', 'grup tanpa penangkapan'); i += 3; }
      else if (s.startsWith('(?<=', i)) { tambah('(?<=', 'harus didahului oleh (lookbehind positif)'); i += 4; }
      else if (s.startsWith('(?<!', i)) { tambah('(?<!', 'tidak boleh didahului oleh (lookbehind negatif)'); i += 4; }
      else if (s.startsWith('(?=', i)) { tambah('(?=', 'harus diikuti oleh (lookahead positif)'); i += 3; }
      else if (s.startsWith('(?!', i)) { tambah('(?!', 'tidak boleh diikuti oleh (lookahead negatif)'); i += 3; }
      else if (s.startsWith('(?<', i)) {
        const akhir = s.indexOf('>', i);
        const nama = s.slice(i + 3, akhir);
        tambah(s.slice(i, akhir + 1), `grup penangkap bernama "${nama}"`);
        i = akhir + 1;
      } else { tambah('(', 'grup penangkap (dirujuk sebagai $1, $2 pada pengganti)'); i++; }
      continue;
    }

    if (c === ')') { tambah(')', 'akhir grup'); i++; continue; }
    if (c === '|') { tambah('|', 'atau (alternatif)'); i++; continue; }
    if (c === '.') { tambah('.', 'karakter apa pun (kecuali baris baru)'); i++; continue; }
    if (c === '^') { tambah('^', 'awal teks'); i++; continue; }
    if (c === '$') { tambah('$', 'akhir teks'); i++; continue; }

    if (c === '*' || c === '+' || c === '?') {
      const arti = c === '*' ? 'nol atau lebih kali' : c === '+' ? 'satu atau lebih kali' : 'nol atau satu kali';
      let token = c;
      let teks = arti;
      if (s[i + 1] === '?') { token += '?'; teks += ' (sesedikit mungkin)'; i++; }
      tambah(token, teks);
      i++;
      continue;
    }

    if (c === '{') {
      const m = /^\{(\d+)(,(\d*))?\}/.exec(s.slice(i));
      if (m) {
        const min = m[1];
        let arti;
        if (!m[2]) arti = `tepat ${min} kali`;
        else if (!m[3]) arti = `${min} kali atau lebih`;
        else arti = `${min} sampai ${m[3]} kali`;
        tambah(m[0], arti);
        i += m[0].length;
        continue;
      }
    }

    tambah(c, `karakter literal "${c}"`);
    i++;
  }

  return { ok: true, bagian };
}

/** Pustaka pola siap pakai. `ganti` adalah contoh pengganti untuk Cari & Ganti. */
export const PUSTAKA_POLA = [
  { id: 'tgl-iso', nama: 'Tanggal ISO (2026-10-10)', pola: '(\\d{4})-(\\d{2})-(\\d{2})', contoh: '2026-10-10', ganti: '$3.$2.$1' },
  { id: 'nomor-akhir', nama: 'Nomor di akhir nama (IMG_0001)', pola: '(\\d+)$', contoh: 'IMG_0001', ganti: '' },
  { id: 'spasi-ganda', nama: 'Spasi berlebih', pola: '\\s{2,}', contoh: 'a   b', ganti: ' ' },
  { id: 'kurung-nomor', nama: 'Salinan (1), (2)', pola: '\\s*\\((\\d+)\\)$', contoh: 'foto (2)', ganti: '' },
  { id: 'prefiks-kamera', nama: 'Prefiks kamera (IMG_, DSC_, VID_)', pola: '^(IMG|DSC|VID|PXL)_', contoh: 'IMG_0001', ganti: '' },
  { id: 'versi', nama: 'Nomor versi (v1.2.3)', pola: 'v?(\\d+)\\.(\\d+)\\.(\\d+)', contoh: 'app-v1.2.3', ganti: '' },
  { id: 'hash-hex', nama: 'Hash heksadesimal (8+ karakter)', pola: '\\b[0-9a-f]{8,}\\b', contoh: 'file-9f2c4ab1', ganti: '' },
];

/* ─────────────────────── K21 · belajar dari contoh ─────────────────────── */

/**
 * Mencari aturan yang menjelaskan semua contoh (flash fill).
 * @param {Array<{indeks:number, asal:string, hasil:string}>} contoh
 *   indeks = posisi berkas dalam antrean (dipakai token {num}); asal/hasil = nama lengkap.
 * @returns {{kandidat: Array<{rule:Object, label:string}>}} kandidat yang cocok dengan SEMUA contoh.
 */
export function belajarDariContoh(contoh = []) {
  if (!Array.isArray(contoh) || contoh.length === 0) return { kandidat: [] };
  const first = contoh[0];
  const A = parseFileName(first.asal);
  const H = parseFileName(first.hasil);
  const usulan = [];

  for (const format of ['lower', 'upper', 'title', 'sentence', 'camel', 'kebab', 'snake']) {
    usulan.push({ label: `Huruf: ${format}`, rule: mkRule(RULE_TYPES.CASE, { target: 'base', format }) });
  }
  for (const form of ['nfc', 'nfkc', 'strip']) {
    usulan.push({ label: `Normalisasi: ${form}`, rule: mkRule(RULE_TYPES.NORMALIZE, { form }) });
  }
  usulan.push({ label: 'Bersihkan nama (CLEAN)', rule: mkRule(RULE_TYPES.CLEAN, { removeWebSpam: true, collapseSpaces: true, sanitizeOS: true }) });

  if (A.baseName && H.baseName.endsWith(A.baseName) && H.baseName.length > A.baseName.length) {
    const t = H.baseName.slice(0, H.baseName.length - A.baseName.length);
    usulan.push({ label: `Sisipkan awalan "${t}"`, rule: mkRule(RULE_TYPES.INSERT, { text: t, position: 'prefix' }) });
  }
  if (A.baseName && H.baseName.startsWith(A.baseName) && H.baseName.length > A.baseName.length) {
    const t = H.baseName.slice(A.baseName.length);
    usulan.push({ label: `Sisipkan akhiran "${t}"`, rule: mkRule(RULE_TYPES.INSERT, { text: t, position: 'suffix' }) });
  }

  // Ganti bagian tengah yang berbeda (awalan & akhiran yang sama dilewati)
  if (A.baseName !== H.baseName) {
    let p = 0;
    while (p < A.baseName.length && p < H.baseName.length && A.baseName[p] === H.baseName[p]) p++;
    let q = 0;
    while (q < A.baseName.length - p && q < H.baseName.length - p &&
           A.baseName[A.baseName.length - 1 - q] === H.baseName[H.baseName.length - 1 - q]) q++;
    const dariTengah = A.baseName.slice(p, A.baseName.length - q);
    const keTengah = H.baseName.slice(p, H.baseName.length - q);
    if (dariTengah) {
      usulan.push({ label: `Ganti "${dariTengah}" → "${keTengah}"`, rule: mkRule(RULE_TYPES.REPLACE, { find: dariTengah, replaceWith: keTengah, isRegex: false, matchCase: true, matchAll: false }) });
    }
  }

  // Pola token: ganti bagian nama asal → {name}, dan angka di hasil → {num}
  const angka = /\d+/g;
  // Setiap deret angka di hasil dicoba sebagai {num}; kandidat yang salah tersaring oleh uji semua contoh.
  const cocokAngka = [...H.baseName.matchAll(angka)].slice(0, 3);
  if (A.baseName) {
    for (const m of cocokAngka) {
      const nilai = Number(m[0]);
      const digits = m[0].length;
      const startNum = nilai - first.indeks;
      if (startNum < 0) continue;
      let pola = H.baseName.slice(0, m.index) + '{num}' + H.baseName.slice(m.index + m[0].length);
      if (pola.includes(A.baseName)) pola = pola.split(A.baseName).join('{name}');
      usulan.push({ label: `Pola "${pola}"`, rule: mkRule(RULE_TYPES.TOKEN, { pattern: pola, startNum, digits }) });
    }
  }

  const total = contoh.length;
  const kandidat = [];
  for (const u of usulan) {
    const ok = contoh.every(c => {
      const a = parseFileName(c.asal);
      const hasil = applyTanpaMeta(a, u.rule, c.indeks, total);
      return `${hasil.baseName}${hasil.ext}` === c.hasil;
    });
    if (ok) kandidat.push(u);
  }
  return { kandidat };
}

function mkRule(type, params) {
  return { id: '', type, enabled: true, params };
}

function applyTanpaMeta(parsed, rule, indeks, total) {
  return applyRule({ baseName: parsed.baseName, ext: parsed.ext }, rule, indeks, total, {});
}

/* ───────────────────────── K25 · resep ekspor/impor ───────────────────────── */

export const FORMAT_RESEP = 'hara-renamer-resep';
export const VERSI_RESEP = 1;
const MAKS_ATURAN_RESEP = 200;

/**
 * Serialisasi rangkaian aturan menjadi resep JSON (tanpa id — id dibuat ulang saat impor).
 */
export function buatResep(rules = [], nama = 'Resep') {
  return JSON.stringify({
    format: FORMAT_RESEP,
    versi: VERSI_RESEP,
    nama: String(nama || 'Resep').slice(0, 120),
    dibuat: new Date().toISOString(),
    aturan: rules.map(r => ({
      type: r.type,
      enabled: !!r.enabled,
      params: r.params || {},
      ...(r.when ? { when: r.when } : {}),
      ...(r.group ? { group: String(r.group) } : {}),
    })),
  }, null, 2);
}

/**
 * Membaca dan memvalidasi resep. Mengembalikan aturan tanpa id.
 * @returns {{ok:true, nama:string, aturan:Array<Object>} | {ok:false, pesan:string}}
 */
export function bacaResep(teks) {
  let data;
  try {
    data = JSON.parse(String(teks ?? ''));
  } catch (e) {
    return { ok: false, pesan: 'Berkas bukan JSON yang valid.' };
  }
  if (!data || data.format !== FORMAT_RESEP) return { ok: false, pesan: 'Bukan resep Hara Renamer.' };
  if (data.versi !== VERSI_RESEP) return { ok: false, pesan: `Versi resep ${data.versi} tidak didukung.` };
  if (!Array.isArray(data.aturan)) return { ok: false, pesan: 'Daftar aturan tidak ditemukan.' };
  if (data.aturan.length > MAKS_ATURAN_RESEP) return { ok: false, pesan: `Maksimal ${MAKS_ATURAN_RESEP} aturan per resep.` };

  const jenis = new Set(Object.values(RULE_TYPES));
  const aturan = [];
  for (let i = 0; i < data.aturan.length; i++) {
    const r = data.aturan[i];
    if (!r || !jenis.has(r.type)) return { ok: false, pesan: `Aturan ke-${i + 1}: jenis tidak dikenal.` };
    if (r.params !== undefined && (typeof r.params !== 'object' || r.params === null || Array.isArray(r.params))) {
      return { ok: false, pesan: `Aturan ke-${i + 1}: parameter tidak valid.` };
    }
    aturan.push({
      type: r.type,
      enabled: r.enabled !== false,
      params: r.params || {},
      ...(r.when ? { when: r.when } : {}),
      ...(r.group ? { group: String(r.group) } : {}),
    });
  }
  return { ok: true, nama: String(data.nama || 'Resep'), aturan };
}

/* ───────────────────────── K22 · deteksi duplikat ───────────────────────── */

/** SHA-256 heksadesimal dari ArrayBuffer (memakai WebCrypto; tersedia di Android WebView). */
export async function hitungSha256(buffer) {
  const hash = await globalThis.crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * dHash 64-bit dari 9×8 piksel abu-abu (array 72 angka, baris per baris).
 * Setiap bit: pixel kiri > pixel kanan. Hasil 16 karakter heksadesimal.
 */
export function dHashDariPiksel(gray) {
  if (!gray || gray.length !== 72) throw new Error('dHash butuh 72 piksel (9×8).');
  let hex = '';
  for (let r = 0; r < 8; r++) {
    let nibble = 0;
    let bit = 0;
    for (let c = 0; c < 8; c++) {
      const kiri = gray[r * 9 + c];
      const kanan = gray[r * 9 + c + 1];
      nibble = (nibble << 1) | (kiri > kanan ? 1 : 0);
      bit++;
      if (bit === 4) { hex += nibble.toString(16); nibble = 0; bit = 0; }
    }
  }
  return hex;
}

/** Jarak Hamming dua hash heksadesimal dengan panjang sama. */
export function jarakHamming(a, b) {
  if (!a || !b || a.length !== b.length) return Infinity;
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) { d += x & 1; x >>= 1; }
  }
  return d;
}

/**
 * Mengelompokkan berkas duplikat.
 * items: [{ id, sha?, dhash? }]. Persis = SHA sama. Mirip = dHash berjarak ≤ ambangGambar.
 * @returns {Array<{id:string, jenis:'persis'|'mirip', anggota:string[]}>}
 */
export function kelompokDuplikat(items = [], { ambangGambar = 5 } = {}) {
  const induk = items.map((_, i) => i);
  const cari = i => (induk[i] === i ? i : (induk[i] = cari(induk[i])));
  const gabung = (a, b) => { induk[cari(a)] = cari(b); };

  const pertamaSha = new Map();
  items.forEach((it, i) => {
    if (!it.sha) return;
    if (pertamaSha.has(it.sha)) gabung(i, pertamaSha.get(it.sha));
    else pertamaSha.set(it.sha, i);
  });
  for (let i = 0; i < items.length; i++) {
    if (!items[i].dhash) continue;
    for (let j = i + 1; j < items.length; j++) {
      if (!items[j].dhash) continue;
      if (jarakHamming(items[i].dhash, items[j].dhash) <= ambangGambar) gabung(i, j);
    }
  }

  const grup = new Map();
  items.forEach((it, i) => {
    const r = cari(i);
    if (!grup.has(r)) grup.set(r, []);
    grup.get(r).push(i);
  });

  const hasil = [];
  for (const idx of grup.values()) {
    if (idx.length < 2) continue;
    const shaSama = idx.every(i => items[i].sha && items[i].sha === items[idx[0]].sha);
    hasil.push({
      id: items[idx[0]].id,
      jenis: shaSama ? 'persis' : 'mirip',
      anggota: idx.map(i => items[i].id),
    });
  }
  return hasil;
}

/**
 * dHash dari Blob gambar (browser). Dipakai UI; tidak dijalankan oleh uji Node.
 */
export async function dHashDariBlob(blob) {
  const bitmap = await createImageBitmap(blob);
  const kanvas = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(9, 8)
    : Object.assign(document.createElement('canvas'), { width: 9, height: 8 });
  const ctx = kanvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, 9, 8);
  const data = ctx.getImageData(0, 0, 9, 8).data;
  const gray = [];
  for (let i = 0; i < data.length; i += 4) {
    gray.push(Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]));
  }
  if (bitmap.close) bitmap.close();
  return dHashDariPiksel(gray);
}
