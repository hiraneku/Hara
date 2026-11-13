/* Logika lokal pengingat acara (Tahap 5). Murni selain pembacaan zona waktu;
   pengiriman notifikasi tetap ditangani pemanggil saat aplikasi berjalan. */
import { kejadianAcaraPadaTanggal, timestampDariDinding } from './kalender-acara-murni.js?v=20261113230700';

export const PENGINGAT_KUNCI = 'hara.kalender.pengingat.v1';
export const PENGINGAT_DEFAULT = Object.freeze({
  aktif: false,
  menitSebelum: [10],
  jamTenang: { aktif: false, mulai: '22:00', selesai: '07:00', lewatiPenting: true },
  jamAcaraSeharian: '09:00',
});
const clockValid = v => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const uniq = xs => [...new Set(xs)];

export function normalisasiPreferensiPengingat(input = {}) {
  const raw = input && typeof input === 'object' ? input : {};
  const jam = raw.jamTenang && typeof raw.jamTenang === 'object' ? raw.jamTenang : {};
  const menitSebelum = uniq((Array.isArray(raw.menitSebelum) ? raw.menitSebelum : PENGINGAT_DEFAULT.menitSebelum)
    .map(Number).filter(n => [5, 10, 15, 30, 60, 120, 1440].includes(n))).sort((a,b) => a-b).slice(0, 7);
  return {
    aktif: raw.aktif === true,
    menitSebelum: menitSebelum.length ? menitSebelum : [...PENGINGAT_DEFAULT.menitSebelum],
    jamTenang: {
      aktif: jam.aktif === true,
      mulai: clockValid(jam.mulai) ? jam.mulai : PENGINGAT_DEFAULT.jamTenang.mulai,
      selesai: clockValid(jam.selesai) ? jam.selesai : PENGINGAT_DEFAULT.jamTenang.selesai,
      lewatiPenting: jam.lewatiPenting !== false,
    },
    jamAcaraSeharian: clockValid(raw.jamAcaraSeharian) ? raw.jamAcaraSeharian : PENGINGAT_DEFAULT.jamAcaraSeharian,
  };
}

const bagianZona = (ms, zona) => {
  const p = new Intl.DateTimeFormat('en', { timeZone: zona || 'UTC', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23' }).formatToParts(new Date(ms));
  const v = Object.fromEntries(p.map(x => [x.type, x.value]));
  return { tanggal:`${v.year}-${v.month}-${v.day}`, jam:`${v.hour}:${v.minute}` };
};
const geserTanggal = (iso, n) => {
  const [y,m,d] = iso.split('-').map(Number), x = new Date(Date.UTC(y,m-1,d+n));
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth()+1).padStart(2,'0')}-${String(x.getUTCDate()).padStart(2,'0')}`;
};
const menitJam = s => { const [h,m] = s.split(':').map(Number); return h*60+m; };

/* Bila waktu jatuh pada jam tenang, geser ke akhir jendela yang sama. Null
   berarti acara penting dikecualikan oleh preferensi pengguna. */
export function hormatiJamTenang(waktu, preferensi, penting = false) {
  const p = normalisasiPreferensiPengingat(preferensi);
  if (!p.jamTenang.aktif || !Number.isFinite(Number(waktu))) return Number(waktu);
  if (penting && p.jamTenang.lewatiPenting) return Number(waktu);
  const zona = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const { tanggal, jam } = bagianZona(Number(waktu), zona);
  const nowMin = menitJam(jam), mulai = menitJam(p.jamTenang.mulai), selesai = menitJam(p.jamTenang.selesai);
  const silang = mulai > selesai;
  const diDalam = mulai === selesai || (silang ? nowMin >= mulai || nowMin < selesai : nowMin >= mulai && nowMin < selesai);
  if (!diDalam) return Number(waktu);
  const tanggalAkhir = mulai===selesai || (silang && nowMin>=mulai) ? geserTanggal(tanggal, 1) : tanggal;
  const hasil = timestampDariDinding(tanggalAkhir, p.jamTenang.selesai, zona);
  return hasil === null ? Number(waktu) : hasil;
}

export function waktuTundaPilihan(pilihan, sekarang = Date.now(), zona = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC') {
  const { tanggal, jam } = bagianZona(Number(sekarang), zona), m = menitJam(jam);
  if (pilihan === '10menit') return Number(sekarang) + 10*60000;
  if (pilihan === 'hari-ini') {
    const batas = timestampDariDinding(tanggal,'23:59',zona);
    const patokan = m < 16*60 ? timestampDariDinding(tanggal,'16:00',zona) : Math.min(Number(sekarang)+60*60000,batas ?? Number(sekarang));
    return patokan !== null && patokan > sekarang ? patokan : null;
  }
  if (pilihan === 'besok') return timestampDariDinding(geserTanggal(tanggal,1), '09:00', zona) ?? Number(sekarang) + 24*60*60000;
  return null;
}

export function kunciKejadianPengingat(acara, kejadian) {
  const tanggal = kejadian.kejadianTanggal || kejadian.tanggalMulai || bagianZona(kejadian.mulai || 0, acara.zonaWaktu).tanggal;
  const awal = kejadian.sepanjangHari ? `${tanggal}@${kejadian.tanggalMulai}` : Number(kejadian.mulai);
  return `${acara.id}|${tanggal}|${awal}|${Number(acara.diubah)||0}`;
}

/* Ekspansi hingga 31 hari agar pengulangan tetap terjadwal ketika aplikasi
   aktif. Untuk all-day, jam lokal pengingat (bawaan 09.00) menjadi acuan. */
export function rencanaPengingat(acaraDaftar, preferensi, { sekarang = Date.now(), hariKeDepan = 31 } = {}) {
  const p = normalisasiPreferensiPengingat(preferensi), hasil = [], batas = Number(sekarang) + Math.max(1,Math.min(90,Number(hariKeDepan)||31))*86400000;
  for (const acara of (Array.isArray(acaraDaftar) ? acaraDaftar : [])) {
    const zona = acara.zonaWaktu || 'UTC';
    const hariIni = bagianZona(Number(sekarang), zona).tanggal;
    const dilihat = new Set();
    for (let i=0; i<=hariKeDepan; i++) {
      const tanggal = geserTanggal(hariIni, i);
      for (const kejadian of kejadianAcaraPadaTanggal(acara,tanggal)) {
        const instanceKey = kunciKejadianPengingat(acara,kejadian);
        if (dilihat.has(instanceKey)) continue;
        dilihat.add(instanceKey);
        const mulai = kejadian.sepanjangHari
          ? timestampDariDinding(kejadian.tanggalMulai,p.jamAcaraSeharian,zona)
          : Number(kejadian.mulai);
        if (!Number.isFinite(mulai) || mulai <= sekarang || mulai > batas) continue;
        for (const menit of p.menitSebelum) {
          const mentah = mulai - menit*60000;
          const at = hormatiJamTenang(mentah,p,!!acara.penting);
          if (at === null || at <= sekarang || at >= mulai) continue;
          hasil.push({
            key:`${instanceKey}|${menit}`, instanceKey, eventId:acara.id,
            judul:String(kejadian.judul||acara.judul||'').slice(0,240),
            mulai, at, menitSebelum:menit, zonaWaktu:zona,
            tanggal:kejadian.kejadianTanggal || kejadian.tanggalMulai || bagianZona(mulai,zona).tanggal,
            penting:!!acara.penting,
          });
        }
      }
    }
  }
  return hasil.sort((a,b) => a.at-b.at || a.key.localeCompare(b.key));
}
