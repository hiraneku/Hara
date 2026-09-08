/* Tenggat pada to-do (Bagian B9).

   Sintaks: kata pertama blok to-do berupa "hari", "besok", nama hari
   (Senin–Minggu), atau tanggal "yyyy-mm-dd" / "dd/mm/yyyy".
   Tenggat muncul di layar Tugas (tenggat < 7 hari) dan Reminder
   (tenggat hari ini atau sudah lewat & belum selesai). Dihitung dari
   isi — tidak menyimpan apa pun ke catatan. */

const NAMA_HARI = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];

export function waktuTenggat(teks) {
  if (!teks) return null;
  const m = String(teks).trim().match(/^([^\s]+)/);
  if (!m) return null;
  const kata = m[1].toLowerCase();
  const t = new Date();
  const hari = n => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime() + n * 86400000; };
  if (kata === 'hari') return { waktu: hari(0), teks: 'hari ini' };
  if (kata === 'besok') return { waktu: hari(1), teks: 'besok' };
  if (NAMA_HARI.includes(kata)) {
    let delta = (NAMA_HARI.indexOf(kata) - t.getDay() + 7) % 7;
    if (delta === 0) delta = 7;   /* nama hari = pekan ini, bukan hari ini */
    return { waktu: hari(delta), teks: 'hari ' + kata };
  }
  const iso = kata.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const dm = kata.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const [y, mo, d] = iso ? [iso[1], iso[2], iso[3]]
    : dm ? [dm[3], dm[2], dm[1]] : [null, null, null];
  if (y) {
    const w = new Date(Number(y), Number(mo) - 1, Number(d));
    if (!isNaN(w.getTime())) {
      const tgl = `${d}/${mo}/${y}`;
      return { waktu: w.getTime(), teks: tgl };
    }
  }
  return null;
}

export const tenggatTodo = n => {
  if (!n || !Array.isArray(n.blocks)) return [];
  const hasil = [];
  (n.blocks || []).forEach(b => {
    if (!b || b.type !== 'todo') return;
    if (b.meta && b.meta.checked) return;
    const t = waktuTenggat((b.content || '').replace(/<[^>]*>/g, ' '));
    if (!t) return;
    hasil.push({ bid: b.id, blok: b, waktu: t.waktu, teks: t.teks });
  });
  return hasil;
};

const SEHARI = 86400000;
const AWAL_HARI = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return t.getTime(); };

/* Untuk layar Tugas: tenggat 7 hari ke depan, belum selesai. */
export const tugasMendatang = daftar => {
  const kini = Date.now();
  const batas = AWAL_HARI() + 7 * SEHARI;
  const hasil = [];
  (daftar || []).forEach(n => {
    tenggatTodo(n).forEach(x => {
      if (x.waktu < batas) hasil.push({ n, ...x });
    });
  });
  return hasil.sort((a, b) => a.waktu - b.waktu);
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
  return hasil.sort((a, b) => a.waktu - b.waktu);
};

export const bilaTenggat = ms => {
  try {
    return new Date(ms).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  } catch (e) {
    const t = new Date(ms);
    return `${t.getDate()}/${t.getMonth() + 1}`;
  }
};

export const sisaWaktu = ms => {
  const awal = AWAL_HARI();
  const tgl = new Date(ms); tgl.setHours(0, 0, 0, 0);
  const hari = Math.round((tgl.getTime() - awal) / SEHARI);
  if (hari < 0) return 'lewat ' + Math.abs(hari) + ' hari';
  if (hari === 0) return 'hari ini';
  if (hari === 1) return 'besok';
  return hari + ' hari lagi';
};
