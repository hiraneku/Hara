/* Model acara mandiri kalender. Murni: tidak membaca/menulis penyimpanan.
   Acara sepanjang hari memakai tanggal ISO lokal inklusif (tak bergeser zona),
   sementara acara berjam memakai timestamp dan zona IANA eksplisit. */

const KATEGORI = new Set(['personal', 'work', 'study', 'other']);
const tanggalValid = nilai => {
  if (typeof nilai !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(nilai)) return false;
  const [y, m, d] = nilai.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
};
const zonaValid = zona => {
  try { new Intl.DateTimeFormat('en', { timeZone: zona }).format(0); return true; }
  catch { return false; }
};
const idBaru = () => globalThis.crypto?.randomUUID?.() || `acara-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export function normalisasiAcara(item, sekarang = Date.now()) {
  if (!item || typeof item !== 'object') return null;
  const judul = String(item.judul ?? item.title ?? '').trim().slice(0, 240);
  if (!judul) return null;
  const sepanjangHari = !!(item.sepanjangHari ?? item.allDay);
  const kategori = KATEGORI.has(item.kategori ?? item.category) ? (item.kategori ?? item.category) : 'other';
  const zona = String(item.zonaWaktu ?? item.timeZone ?? 'UTC');
  const dasar = {
    id: String(item.id || idBaru()).slice(0, 120), judul, sepanjangHari, kategori,
    zonaWaktu: zonaValid(zona) ? zona : 'UTC',
    dibuat: Number.isFinite(item.dibuat) ? item.dibuat : sekarang,
    diubah: Number.isFinite(item.diubah) ? item.diubah : sekarang,
  };
  if (sepanjangHari) {
    const mulai = item.tanggalMulai ?? item.startDate;
    const akhir = item.tanggalAkhir ?? item.endDate ?? mulai;
    if (!tanggalValid(mulai) || !tanggalValid(akhir) || akhir < mulai) return null;
    return { ...dasar, tanggalMulai: mulai, tanggalAkhir: akhir };
  }
  const mulai = Number(item.mulai ?? item.startAt);
  const akhir = Number(item.selesai ?? item.endAt);
  if (!Number.isFinite(mulai) || !Number.isFinite(akhir) || akhir <= mulai) return null;
  return { ...dasar, mulai, selesai: akhir };
}

export function normalisasiDaftarAcara(daftar) {
  if (!Array.isArray(daftar)) return [];
  const hasil = [], ids = new Set();
  for (const item of daftar.slice(0, 5000)) {
    const acara = normalisasiAcara(item);
    if (!acara || ids.has(acara.id)) continue;
    ids.add(acara.id); hasil.push(acara);
  }
  return hasil;
}

const tanggalDiZona = (ms, zona) => {
  const p = new Intl.DateTimeFormat('en', { timeZone: zona || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(ms));
  const v = Object.fromEntries(p.map(x => [x.type, x.value]));
  return `${v.year}-${v.month}-${v.day}`;
};

export function acaraPadaTanggal(acara, tanggalISO) {
  if (!tanggalValid(tanggalISO) || !acara) return false;
  if (acara.sepanjangHari) return acara.tanggalMulai <= tanggalISO && tanggalISO <= acara.tanggalAkhir;
  const [y, m, d] = tanggalISO.split('-').map(Number);
  const berikutnya = new Date(Date.UTC(y, m - 1, d + 1));
  const isoBerikutnya = `${String(berikutnya.getUTCFullYear()).padStart(4, '0')}-${String(berikutnya.getUTCMonth() + 1).padStart(2, '0')}-${String(berikutnya.getUTCDate()).padStart(2, '0')}`;
  const mulaiHari = timestampDariDinding(tanggalISO, '00:00', acara.zonaWaktu || 'UTC');
  const akhirHari = timestampDariDinding(isoBerikutnya, '00:00', acara.zonaWaktu || 'UTC');
  if (mulaiHari !== null && akhirHari !== null) return acara.mulai < akhirHari && acara.selesai > mulaiHari;
  /* Fallback sangat jarang untuk zona yang menggeser tepat pada tengah malam. */
  const awal = tanggalDiZona(acara.mulai, acara.zonaWaktu), akhir = tanggalDiZona(acara.selesai - 1, acara.zonaWaktu);
  return awal <= tanggalISO && tanggalISO <= akhir;
}

/* Menafsirkan tanggal/jam dinding sebagai waktu pada zona IANA pilihan.
   Jam lokal yang tidak ada saat lompatan DST dikembalikan null (perlu koreksi). */
export function timestampDariDinding(tanggal, jam, zona) {
  if (!tanggalValid(tanggal) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(jam)) || !zonaValid(zona)) return null;
  const [y, m, d] = tanggal.split('-').map(Number), [h, min] = jam.split(':').map(Number);
  const target = Date.UTC(y, m - 1, d, h, min), fmt = new Intl.DateTimeFormat('en', {
    timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  let tebakan = target;
  for (let i = 0; i < 4; i++) {
    const v = Object.fromEntries(fmt.formatToParts(new Date(tebakan)).map(x => [x.type, x.value]));
    const terlihat = Date.UTC(+v.year, +v.month - 1, +v.day, +v.hour, +v.minute);
    tebakan += target - terlihat;
    if (target === terlihat) return tebakan;
  }
  const v = Object.fromEntries(fmt.formatToParts(new Date(tebakan)).map(x => [x.type, x.value]));
  return +v.year === y && +v.month === m && +v.day === d && +v.hour === h && +v.minute === min ? tebakan : null;
}

export function labelWaktuAcara(acara, locale = 'id') {
  if (acara.sepanjangHari) {
    const formatTanggal = iso => new Intl.DateTimeFormat(locale, { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${iso}T12:00:00Z`));
    const semuaHari = ({ en: 'All day', ja: '終日' })[locale] || 'Sepanjang hari';
    return acara.tanggalMulai === acara.tanggalAkhir ? semuaHari : `${formatTanggal(acara.tanggalMulai)} – ${formatTanggal(acara.tanggalAkhir)} · ${semuaHari}`;
  }
  const format = new Intl.DateTimeFormat(locale, {
    timeZone: acara.zonaWaktu || 'UTC', hour: '2-digit', minute: '2-digit',
  });
  const tanggal = new Intl.DateTimeFormat(locale, {
    timeZone: acara.zonaWaktu || 'UTC', day: 'numeric', month: 'short',
  });
  const awal = new Date(acara.mulai), akhir = new Date(acara.selesai);
  const hariAwal = new Intl.DateTimeFormat('en-CA', { timeZone: acara.zonaWaktu || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(awal);
  const hariAkhir = new Intl.DateTimeFormat('en-CA', { timeZone: acara.zonaWaktu || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(akhir);
  const rentangHari = hariAwal === hariAkhir ? tanggal.format(awal) : `${tanggal.format(awal)} – ${tanggal.format(akhir)}`;
  return `${rentangHari} · ${format.format(awal)}–${format.format(akhir)} (${acara.zonaWaktu || 'UTC'})`;
}

export const kategoriAcara = Object.freeze([...KATEGORI]);
export const tanggalKalenderValid = tanggalValid;
