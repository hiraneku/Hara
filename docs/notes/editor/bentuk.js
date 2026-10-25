/**
 * Pengenalan bentuk sederhana (Tahap 1 · A4).
 *
 * Mengubah satu coretan (titik-titik pena) menjadi bentuk rapi yang tetap bisa diedit:
 *   garis  -> alat "garis"   (dua titik ujung)
 *   lingkaran / elips -> alat "elips" (dua titik sudut kotak pembatas)
 *   persegi / persegi panjang (sejajar sumbu) -> alat "kotak"
 *   segitiga / poligon sederhana (3 sampai 6 sudut) -> alat "poligon" (daftar titik)
 *
 * Murni logika tanpa DOM, algoritme lokal (tanpa AI atau layanan cloud), sehingga bisa diuji di Node.
 * Panah belum dikenali dari coretan: panah tetap dibuat dengan alat Panah (ambigu dengan garis).
 */

const MIN_PANJANG = 40;
const MIN_DIAGONAL = 24;

function jarak(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function bersihkanTitik(pts) {
  const hasil = [];
  for (const p of pts) {
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    if (!hasil.length || jarak(hasil[hasil.length - 1], p) >= 1) hasil.push({ x: p.x, y: p.y });
  }
  return hasil;
}

function panjangJalur(pts) {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += jarak(pts[i - 1], pts[i]);
  return s;
}

function kotakPembatas(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of pts) {
    if (p.x < x0) x0 = p.x;
    if (p.y < y0) y0 = p.y;
    if (p.x > x1) x1 = p.x;
    if (p.y > y1) y1 = p.y;
  }
  return { x0, y0, x1, y1 };
}

function jarakKeSegmen(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return jarak(p, a);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/* Douglas-Peucker: sederhanakan jalur terbuka menjadi sudut-sudut utama. */
function sederhanakan(pts, tol) {
  const n = pts.length;
  if (n < 3) return pts.slice();
  let maksD = -1, idx = -1;
  for (let i = 1; i < n - 1; i++) {
    const d = jarakKeSegmen(pts[i], pts[0], pts[n - 1]);
    if (d > maksD) { maksD = d; idx = i; }
  }
  if (maksD > tol) {
    const kiri = sederhanakan(pts.slice(0, idx + 1), tol);
    const kanan = sederhanakan(pts.slice(idx), tol);
    return [...kiri.slice(0, -1), ...kanan];
  }
  return [pts[0], pts[n - 1]];
}

/* Jalur tertutup: dibelah di titik terjauh dari titik awal, lalu disederhanakan. Hasil tanpa titik ujung duplikat. */
function sederhanakanTertutup(pts, tol) {
  let m = 0, maks = -1;
  for (let i = 0; i < pts.length; i++) {
    const d = jarak(pts[i], pts[0]);
    if (d > maks) { maks = d; m = i; }
  }
  const a = sederhanakan(pts.slice(0, m + 1), tol);
  const b = sederhanakan([...pts.slice(m), pts[0]], tol);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

function sudutDalam(a, b, c) {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const denom = (Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y)) || 1;
  const cos = Math.max(-1, Math.min(1, (v1.x * v2.x + v1.y * v2.y) / denom));
  return Math.acos(cos) * 180 / Math.PI;
}

/* Uji elips: titik harus dekat dengan elips (kotak pembatas) dan mengelilingi pusatnya hampir penuh. */
function ujiElips(pts, box) {
  const cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2;
  const rx = (box.x1 - box.x0) / 2, ry = (box.y1 - box.y0) / 2;
  if (rx < 12 || ry < 12) return null;
  let jumlah = 0, maks = 0;
  const sudut = [];
  for (const p of pts) {
    const nx = (p.x - cx) / rx, ny = (p.y - cy) / ry;
    const e = Math.abs(Math.hypot(nx, ny) - 1);
    jumlah += e;
    if (e > maks) maks = e;
    sudut.push(Math.atan2(ny, nx));
  }
  const rataE = jumlah / pts.length;
  sudut.sort((a, b) => a - b);
  let celahMaks = sudut[0] + 2 * Math.PI - sudut[sudut.length - 1];
  for (let i = 1; i < sudut.length; i++) celahMaks = Math.max(celahMaks, sudut[i] - sudut[i - 1]);
  const cakupan = 2 * Math.PI - celahMaks;
  if (rataE > 0.08 || maks > 0.25 || cakupan < 5.6) return null;
  return { cx, cy, rx, ry };
}

/**
 * Kenali bentuk dari satu coretan. Mengembalikan { alat, nama, pts } atau null bila tidak dikenali.
 * Coretan tidak dikenali (acak, terlalu pendek, atau tidak tertutup) tetap sebagai coretan biasa.
 */
export function kenaliBentuk(mentah) {
  const pts = bersihkanTitik(Array.isArray(mentah) ? mentah : []);
  if (pts.length < 8) return null;
  const len = panjangJalur(pts);
  const box = kotakPembatas(pts);
  const diagonal = Math.hypot(box.x1 - box.x0, box.y1 - box.y0);
  if (len < MIN_PANJANG || diagonal < MIN_DIAGONAL) return null;

  const awal = pts[0], akhir = pts[pts.length - 1];
  const tertutup = jarak(awal, akhir) <= Math.max(18, 0.15 * len);

  /* 1. Garis lurus: jalur hampir lurus dari ujung ke ujung. */
  if (!tertutup) {
    const lurus = jarak(awal, akhir);
    let simpangan = 0;
    for (const p of pts) simpangan = Math.max(simpangan, jarakKeSegmen(p, awal, akhir));
    if (lurus >= 0.9 * len && simpangan <= Math.max(3, 0.03 * lurus)) {
      return { alat: 'garis', nama: 'Garis', pts: [awal, akhir] };
    }
    return null;
  }

  /* 2. Lingkaran atau elips: jalur tertutup yang dekat dengan elips di kotak pembatasnya. */
  const el = ujiElips(pts, box);
  if (el) {
    const lingkaran = Math.abs(el.rx - el.ry) <= 0.1 * Math.max(el.rx, el.ry);
    const rx = lingkaran ? (el.rx + el.ry) / 2 : el.rx;
    const ry = lingkaran ? rx : el.ry;
    return {
      alat: 'elips',
      nama: lingkaran ? 'Lingkaran' : 'Elips',
      pts: [{ x: el.cx - rx, y: el.cy - ry }, { x: el.cx + rx, y: el.cy + ry }],
    };
  }

  /* 3. Persegi, persegi panjang, segitiga, atau poligon: sudut-sudut yang tajam. */
  const tol = Math.max(5, 0.045 * diagonal);
  let v = sederhanakanTertutup(pts, tol);
  /* Sudut yang hampir lurus (lebih dari 165°) hanya gangguan tangan; buang. */
  let berubah = true;
  while (berubah && v.length > 3) {
    berubah = false;
    for (let i = 0; i < v.length; i++) {
      const n = v.length;
      if (sudutDalam(v[(i - 1 + n) % n], v[i], v[(i + 1) % n]) > 165) {
        v = v.filter((_, j) => j !== i);
        berubah = true;
        break;
      }
    }
  }
  if (v.length < 3 || v.length > 6) return null;

  const n = v.length;
  const sudut = v.map((p, i) => sudutDalam(v[(i - 1 + n) % n], p, v[(i + 1) % n]));
  if (n === 4 && sudut.every(s => Math.abs(s - 90) <= 22)) {
    const sejajar = v.every((p, i) => {
      const q = v[(i + 1) % n];
      const sudutSisi = Math.abs(Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI) % 90;
      return Math.min(sudutSisi, 90 - sudutSisi) <= 12;
    });
    if (sejajar) {
      const b = kotakPembatas(v);
      const w = b.x1 - b.x0, h = b.y1 - b.y0;
      const persegi = Math.abs(w - h) <= 0.12 * Math.max(w, h);
      return {
        alat: 'kotak',
        nama: persegi ? 'Persegi' : 'Persegi panjang',
        pts: [{ x: b.x0, y: b.y0 }, { x: b.x1, y: b.y1 }],
      };
    }
  }
  if (n === 3) return { alat: 'poligon', nama: 'Segitiga', pts: v };
  return { alat: 'poligon', nama: 'Poligon', pts: v };
}
