/* Tenggat pada to-do (Bagian B9) + tata bahasa tugas (Ronde 11 · K2, K5).

   Sintaks di awal baris to-do (kata pertama / frasa tanggal):
     hari · besok · lusa · minggu depan · 3 hari lagi
     nama hari (senin–minggu)
     yyyy-mm-dd · dd/mm/yyyy
     setiap hari · setiap senin · setiap tanggal 5        ← berulang (K2)
   Opsional sesudah tanggal: jam 14:00 / 14.00 (K2).
   Prioritas: ! · !! · !!! di mana pun sebagai kata tersendiri (K5).

   Tenggat dihitung dari isi — tidak ada struktur data terpisah. Satu-satunya
   yang disimpan ke blok adalah `meta.ulangKe` (tenggat berulang yang sudah
   bergeser setelah dicentang), dan itu ditulis lewat atribut data-ulang. */

import { LOKALE, bahasaSekarang } from '../core/i18n.js?v=20261010020553';

const NAMA_HARI = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
/* Nama hari Jepang — untuk label chip tenggat saat bahasa = Jepang. */
const HARI_JA = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
const SEHARI = 86400000;

/* ── utilitas tanggal (semua dalam awal hari, ms) ── */
const awalHari = ms => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
const tambahHari = (awal, n) => { const d = new Date(awal); d.setDate(d.getDate() + n); return d.getTime(); };
const hariIniAwal = () => awalHari(Date.now());
/* Tanggal bulan ke-`bulanKe` (boleh melewati 12) dengan hari `tgl`, dibatasi akhir bulan. */
const tanggalBulan = (tahun, bulan, tgl) => {
  const akhir = new Date(tahun, bulan + 1, 0).getDate();
  return new Date(tahun, bulan, Math.min(tgl, akhir)).getTime();
};

/* ── aturan pengulangan ──
   { jenis:'harian' } · { jenis:'mingguan', hari:0-6 } · { jenis:'bulanan', tgl:1-31 } */

/* Kejadian pertama mulai hari ini (hari ini ikut dihitung). */
const kejadianPertama = (aturan, dariAwal) => {
  if (aturan.jenis === 'harian') return dariAwal;
  if (aturan.jenis === 'mingguan') {
    const delta = (aturan.hari - new Date(dariAwal).getDay() + 7) % 7;
    return tambahHari(dariAwal, delta);
  }
  const d = new Date(dariAwal);
  let t = tanggalBulan(d.getFullYear(), d.getMonth(), aturan.tgl);
  if (t < dariAwal) t = tanggalBulan(d.getFullYear(), d.getMonth() + 1, aturan.tgl);
  return t;
};

/* Kejadian berikutnya yang STRICTLY setelah `awal`. */
export const kejadianSesudah = (aturan, awal) => {
  if (aturan.jenis === 'harian') return tambahHari(awal, 1);
  if (aturan.jenis === 'mingguan') {
    const delta = ((aturan.hari - new Date(awal).getDay() + 7) % 7) || 7;
    return tambahHari(awal, delta);
  }
  const d = new Date(awal);
  let t = tanggalBulan(d.getFullYear(), d.getMonth(), aturan.tgl);
  if (t <= awal) t = tanggalBulan(d.getFullYear(), d.getMonth() + 1, aturan.tgl);
  return t;
};

/* ── tata bahasa ── */

/* Memisahkan prioritas (!, !!, !!!) dari teks. Mengembalikan {prioritas, sisa}. */
const ambilPrioritas = teks => {
  let prioritas = 0;
  const sisa = teks.replace(/(^|\s)(!{1,3})(?=\s|$)/g, (_, pre, bang) => {
    prioritas = Math.max(prioritas, bang.length);
    return pre;
  });
  return { prioritas, sisa: sisa.replace(/\s+/g, ' ').trim() };
};

/* Mengurai frasa tanggal di awal teks. Mengembalikan null bila tak ada tanggal. */
const uraiTanggal = (teksAsli) => {
  const low = teksAsli.toLowerCase();
  const kini = Date.now();
  const awal = awalHari(kini);
  const hariIni = new Date(kini).getDay();

  let m;
  /* berulang */
  if ((m = low.match(/^setiap\s+hari(?=\s|$)/))) {
    const aturan = { jenis: 'harian' };
    return { awal: kejadianPertama(aturan, awal), teks: 'setiap hari', aturan, panjang: m[0].length };
  }
  if ((m = low.match(/^setiap\s+tanggal\s+(\d{1,2})(?=\s|$)/))) {
    const tgl = Number(m[1]);
    if (tgl >= 1 && tgl <= 31) {
      const aturan = { jenis: 'bulanan', tgl };
      return { awal: kejadianPertama(aturan, awal), teks: 'setiap tanggal ' + tgl, aturan, panjang: m[0].length };
    }
  }
  if ((m = low.match(/^setiap\s+(\S+)(?=\s|$)/))) {
    const idx = NAMA_HARI.indexOf(m[1]);
    if (idx >= 0) {
      const aturan = { jenis: 'mingguan', hari: idx };
      return { awal: kejadianPertama(aturan, awal), teks: 'setiap ' + m[1], aturan, panjang: m[0].length };
    }
  }

  /* sekali */
  if ((m = low.match(/^minggu\s+depan(?=\s|$)/))) {
    return { awal: tambahHari(awal, 7), teks: 'minggu depan', panjang: m[0].length };
  }
  if ((m = low.match(/^(\d{1,2})\s+hari\s+lagi(?=\s|$)/))) {
    const n = Number(m[1]);
    if (n >= 0 && n <= 365) return { awal: tambahHari(awal, n), teks: n + ' hari lagi', panjang: m[0].length };
  }
  const kata = (low.match(/^\S+/) || [''])[0];
  if (kata === 'hari') return { awal, teks: 'hari ini', panjang: 4 };
  if (kata === 'besok') return { awal: tambahHari(awal, 1), teks: 'besok', panjang: 5 };
  if (kata === 'lusa') return { awal: tambahHari(awal, 2), teks: 'lusa', panjang: 4 };
  if (NAMA_HARI.includes(kata)) {
    let delta = (NAMA_HARI.indexOf(kata) - hariIni + 7) % 7;
    if (delta === 0) delta = 7;   /* nama hari = pekan ini, bukan hari ini */
    return { awal: tambahHari(awal, delta), teks: 'hari ' + kata, panjang: kata.length };
  }
  const iso = kata.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const dm = kata.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const [y, mo, d] = iso ? [iso[1], iso[2], iso[3]]
    : dm ? [dm[3], dm[2], dm[1]] : [null, null, null];
  if (y) {
    const w = new Date(Number(y), Number(mo) - 1, Number(d));
    if (!isNaN(w.getTime())) {
      return { awal: awalHari(w.getTime()), teks: `${d}/${mo}/${y}`, panjang: kata.length };
    }
  }
  return null;
};

/* Urai lengkap satu baris teks to-do. Mengembalikan null bila tanpa tenggat.
   { waktu, teks, jam, prioritas, aturan, sisa }
   - waktu : awal hari tenggat (ms). Untuk berulang, ini kejadian pertama.
   - teks  : label kanonik (kata Indonesia; label ditampilkan lewat labelTenggat)
   - sisa  : isi to-do tanpa frasa tanggal, jam, dan prioritas */
export function uraiTugas(teks) {
  if (!teks) return null;
  const { prioritas, sisa: tanpaPrio } = ambilPrioritas(String(teks).trim());
  const tgl = uraiTanggal(tanpaPrio);
  if (!tgl) return null;
  let rest = tanpaPrio.slice(tgl.panjang).trim();
  let jam = null;
  const mj = rest.match(/^(?:jam\s+)?(\d{1,2})[:.](\d{2})(?=\s|$)/i);
  if (mj && +mj[1] < 24 && +mj[2] < 60) {
    jam = `${String(+mj[1]).padStart(2, '0')}:${mj[2]}`;
    rest = rest.slice(mj[0].length).trim();
  }
  return {
    waktu: tgl.awal,
    teks: tgl.teks,
    jam,
    prioritas,
    aturan: tgl.aturan || null,
    sisa: rest,
  };
}

/* Kompatibel dengan pemanggil lama: mengembalikan {waktu, teks} atau null. */
export function waktuTenggat(teks) {
  const u = uraiTugas(teks);
  return u ? { waktu: u.waktu, teks: u.teks } : null;
}

const polosDariHtml = html => String(html || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ');

/* Dipanggil saat to-do berulang dicentang. Mengembalikan awal hari kejadian
   berikutnya (ms) — yang harus dipakai sebagai data-ulang — atau null bila
   to-do itu tidak berulang.
   Kejadian yang terlewat dilompati: yang dicari adalah kejadian pertama
   setelah hari ini, bukan sekadar kejadian sesudah yang dicentang. */
export function ulangSetelahCentang(htmlIsi, ulangKeSaatIni) {
  const u = uraiTugas(polosDariHtml(htmlIsi).trim());
  if (!u || !u.aturan) return null;
  const awal = hariIniAwal();
  let cur = ulangKeSaatIni || u.waktu;
  let nx = kejadianSesudah(u.aturan, cur);
  let batas = 0;
  while (nx <= awal && batas++ < 400) nx = kejadianSesudah(u.aturan, nx);
  return nx;
}

/* Tenggat sebuah blok to-do (atau null). Blok berulang memakai ulangKe bila ada. */
export const tenggatBlok = blok => {
  if (!blok || blok.type !== 'todo') return null;
  const u = uraiTugas(polosDariHtml(blok.content).trim());
  if (!u) return null;
  const ulangKe = blok.meta && blok.meta.ulangKe;
  return { ...u, waktu: ulangKe || u.waktu, berulang: !!u.aturan };
};

export const tenggatTodo = n => {
  if (!n || !Array.isArray(n.blocks)) return [];
  const hasil = [];
  (n.blocks || []).forEach(b => {
    if (!b || b.type !== 'todo') return;
    if (b.meta && b.meta.checked) return;
    const t = tenggatBlok(b);
    if (!t) return;
    hasil.push({ bid: b.id, blok: b, waktu: t.waktu, teks: t.teks, jam: t.jam,
      prioritas: t.prioritas, berulang: t.berulang, sisa: t.sisa });
  });
  return hasil;
};

const urutkan = (a, b) => (a.waktu - b.waktu) || (b.prioritas - a.prioritas);

const AWAL_HARI = hariIniAwal;

/* Untuk layar Tugas: tenggat 7 hari ke depan, belum selesai. */
export const tugasMendatang = daftar => {
  const batas = AWAL_HARI() + 7 * SEHARI;
  const hasil = [];
  (daftar || []).forEach(n => {
    tenggatTodo(n).forEach(x => {
      if (x.waktu < batas) hasil.push({ n, ...x });
    });
  });
  return hasil.sort(urutkan);
};

/* Untuk layar Reminder: tenggat hari ini atau sudah lewat, belum selesai. */
export const tenggatHariIni = daftar => {
  const aw = AWAL_HARI();
  const hasil = [];
  (daftar || []).forEach(n => {
    tenggatTodo(n).forEach(x => {
      if (x.waktu <= aw + SEHARI - 1) hasil.push({ n, ...x });
    });
  });
  return hasil.sort(urutkan);
};

/* Label "lewat 3 hari" / "hari ini" / "3 hari lagi" di chip layar
   Tugas & Reminder — mengikuti bahasa. Sintaks asli di isi catatan
   (hari/besok/nama hari Indonesia) tidak diubah: itu data pengguna. */
export const sisaWaktu = ms => {
  const awal = AWAL_HARI();
  const tgl = new Date(ms); tgl.setHours(0, 0, 0, 0);
  const hari = Math.round((tgl.getTime() - awal) / SEHARI);
  const b = bahasaSekarang();
  if (b === 'en') {
    if (hari < 0) return Math.abs(hari) + ' day' + (Math.abs(hari) === 1 ? '' : 's') + ' ago';
    if (hari === 0) return 'today';
    if (hari === 1) return 'tomorrow';
    return 'in ' + hari + ' days';
  }
  if (b === 'ja') {
    if (hari < 0) return Math.abs(hari) + '日前';
    if (hari === 0) return '今日';
    if (hari === 1) return '明日';
    return hari + '日後';
  }
  if (hari < 0) return 'lewat ' + Math.abs(hari) + ' hari';
  if (hari === 0) return 'hari ini';
  if (hari === 1) return 'besok';
  return hari + ' hari lagi';
};

/* Teks hasil parse tenggat (data memakai kata Indonesia) — label chip
   yang tampil di layar ikut bahasa aktif. */
export const labelTenggat = teks => {
  const b = bahasaSekarang();
  if (b === 'id') return teks;
  const m1 = /^hari (\S+)$/.exec(teks || '');
  const mUlang = /^setiap (\S+)$/.exec(teks || '');
  const mTgl = /^setiap tanggal (\d+)$/.exec(teks || '');
  const mLagi = /^(\d+) hari lagi$/.exec(teks || '');
  if (b === 'ja') {
    if (teks === 'hari ini') return '今日';
    if (teks === 'besok') return '明日';
    if (teks === 'lusa') return '明後日';
    if (teks === 'minggu depan') return '来週';
    if (teks === 'setiap hari') return '毎日';
    if (mTgl) return '毎月' + mTgl[1] + '日';
    if (mLagi) return mLagi[1] + '日後';
    if (mUlang) {
      const idx = NAMA_HARI.indexOf(mUlang[1]);
      if (idx >= 0) return '毎週' + HARI_JA[idx];
    }
    if (m1) {
      const idx = NAMA_HARI.indexOf(m1[1].toLowerCase());
      if (idx >= 0) return HARI_JA[idx];
    }
    return teks;
  }
  if (teks === 'hari ini') return 'today';
  if (teks === 'besok') return 'tomorrow';
  if (teks === 'lusa') return 'day after tomorrow';
  if (teks === 'minggu depan') return 'next week';
  if (teks === 'setiap hari') return 'every day';
  if (mTgl) return 'every month on the ' + mTgl[1];
  if (mLagi) return 'in ' + mLagi[1] + ' days';
  if (mUlang) return 'every ' + mUlang[1];
  if (m1) return 'this ' + m1[1];
  return teks;
};

/* Chip tanggal lengkap: label + jam (bila ada). */
export const chipTenggat = x => labelTenggat(x.teks) + (x.jam ? ' · ' + x.jam : '');

/* K4 · K6 — jadwal ulang (tunda) sebuah to-do sekali-jalan.
   Mengganti frasa tanggal di awal isi dengan `pilihan` ('hari' | 'besok' |
   'lusa' | 'minggu depan'), dan menjaga prioritas, jam, serta isi lainnya.
   Mengembalikan isi baru (string), atau null bila tidak bisa dijadwal ulang:
   - to-do tanpa tanggal di awal,
   - to-do berulang (jadwalnya ditentukan aturannya),
   - isi diawali markup (mis. tebal) — dibiarkan agar format tidak rusak. */
const FRASA_TUNDA = { hari: 'hari', besok: 'besok', lusa: 'lusa', 'minggu depan': 'minggu depan' };
export function jadwalUlang(content, pilihan) {
  const kata = FRASA_TUNDA[pilihan];
  if (!kata) return null;
  const s = String(content || '').trim();
  if (!s || s.startsWith('<')) return null;
  const u = uraiTugas(s);
  if (!u || u.aturan) return null;
  /* pisahkan prioritas di depan (mis. "!! besok rapat") agar tetap di depan */
  const pre = (s.match(/^(?:!{1,3}\s+)*/) || [''])[0];
  const tanpaPre = s.slice(pre.length);
  const tgl = uraiTanggal(tanpaPre);
  if (!tgl) return null;
  let rest = tanpaPre.slice(tgl.panjang).trim();
  const mj = rest.match(/^(?:jam\s+)?(\d{1,2})[:.](\d{2})(?=\s|$)/i);
  if (mj) rest = rest.slice(mj[0].length).trim();
  return (pre + kata + (rest ? ' ' + rest : '')).trim();
}
