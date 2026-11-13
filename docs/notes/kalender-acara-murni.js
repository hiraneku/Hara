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
const dariISO = iso => { const [y,m,d]=iso.split('-').map(Number); return Date.UTC(y,m-1,d); };
const keISO = ms => { const d=new Date(ms); return `${String(d.getUTCFullYear()).padStart(4,'0')}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`; };
const geserISO = (iso, n) => keISO(dariISO(iso)+n*86400000);
const hariZona = (a, awal) => a.sepanjangHari ? (awal ? a.tanggalMulai : a.tanggalAkhir)
  : tanggalDiZona(awal ? a.mulai : Math.max(a.mulai,a.selesai-1),a.zonaWaktu);

function normalisasiPengulangan(rule, base, id) {
  if (!rule || !['harian','mingguan','bulanan'].includes(rule.frekuensi)) return null;
  const interval = Math.min(30, Math.max(1, Math.floor(Number(rule.interval) || 1)));
  const hari = [...new Set((Array.isArray(rule.hari) ? rule.hari : []).map(Number).filter(x=>Number.isInteger(x)&&x>=0&&x<=6))].sort();
  const sampai = tanggalValid(rule.sampai) && rule.sampai >= hariZona(base,true) ? rule.sampai : null;
  const kecuali = [...new Set((Array.isArray(rule.kecuali) ? rule.kecuali : []).filter(t=>tanggalValid(t)))].slice(0,500);
  const perubahan=[];
  for(const x of (Array.isArray(rule.perubahan)?rule.perubahan:[]).slice(0,100)){
    if(!tanggalValid(x?.tanggalAsal)||!x.acara)continue;
    const acara=normalisasiAcara({...x.acara,id:`${id}@${x.tanggalAsal}`,pengulangan:null});
    if(acara)perubahan.push({tanggalAsal:x.tanggalAsal,acara});
  }
  return {frekuensi:rule.frekuensi,interval,hari,sampai,kecuali,perubahan};
}

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
    ...(Number(item.persiapanMenit)>0?{persiapanMenit:Math.min(1440,Math.floor(Number(item.persiapanMenit)))}:{}),
    ...(Number(item.perjalananMenit)>0?{perjalananMenit:Math.min(1440,Math.floor(Number(item.perjalananMenit)))}:{}),
    dibuat: Number.isFinite(item.dibuat) ? item.dibuat : sekarang,
    diubah: Number.isFinite(item.diubah) ? item.diubah : sekarang,
  };
  if (sepanjangHari) {
    const mulai = item.tanggalMulai ?? item.startDate;
    const akhir = item.tanggalAkhir ?? item.endDate ?? mulai;
    if (!tanggalValid(mulai) || !tanggalValid(akhir) || akhir < mulai) return null;
    const hasil={...dasar,tanggalMulai:mulai,tanggalAkhir:akhir};
    const pengulangan=normalisasiPengulangan(item.pengulangan,hasil,dasar.id);
    if(pengulangan)hasil.pengulangan=pengulangan;
    return hasil;
  }
  const mulai = Number(item.mulai ?? item.startAt);
  const akhir = Number(item.selesai ?? item.endAt);
  if (!Number.isFinite(mulai) || !Number.isFinite(akhir) || akhir <= mulai) return null;
  const hasil={...dasar,mulai,selesai:akhir};
  const pengulangan=normalisasiPengulangan(item.pengulangan,hasil,dasar.id);
  if(pengulangan)hasil.pengulangan=pengulangan;
  return hasil;
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

function acaraTunggalPadaTanggal(acara, tanggalISO) {
  if (!tanggalValid(tanggalISO) || !acara) return false;
  if (acara.sepanjangHari) return acara.tanggalMulai <= tanggalISO && tanggalISO <= acara.tanggalAkhir;
  const mulaiHari = timestampDariDinding(tanggalISO, '00:00', acara.zonaWaktu || 'UTC');
  const akhirHari = timestampDariDinding(geserISO(tanggalISO,1), '00:00', acara.zonaWaktu || 'UTC');
  if (mulaiHari !== null && akhirHari !== null) return acara.mulai < akhirHari && acara.selesai > mulaiHari;
  const awal = tanggalDiZona(acara.mulai, acara.zonaWaktu), akhir = tanggalDiZona(acara.selesai - 1, acara.zonaWaktu);
  return awal <= tanggalISO && tanggalISO <= akhir;
}

const selisihHari = (a,b) => Math.round((dariISO(a)-dariISO(b))/86400000);
const bagianDinding = (ms,zona) => {
  const p=new Intl.DateTimeFormat('en',{timeZone:zona||'UTC',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(ms));
  const v=Object.fromEntries(p.map(x=>[x.type,x.value]));return {tanggal:`${v.year}-${v.month}-${v.day}`,jam:`${v.hour}:${v.minute}`};
};
const mulaiHariMinggu=iso=>{const d=new Date(dariISO(iso)),mundur=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-mundur);return d.getTime();};
const aturanCocok=(rule,base,iso)=>{
  if(iso<base||rule.sampai&&iso>rule.sampai)return false;
  const diff=selisihHari(iso,base), bd=new Date(dariISO(base)), td=new Date(dariISO(iso));
  if(rule.frekuensi==='harian')return diff%rule.interval===0;
  if(rule.frekuensi==='mingguan'){
    const weeks=Math.round((mulaiHariMinggu(iso)-mulaiHariMinggu(base))/604800000);
    const hari=rule.hari.length?rule.hari:[bd.getUTCDay()];
    /* Pekan mulai dihitung dari pekan lokal tanggal dasar. Jika aturan
       memilih hari lain dari tanggal dasar, pekan awal tidak boleh membuat
       kejadian baru pada sisa pekan tersebut (mis. Rabu → Senin/Kamis
       seharusnya mulai Senin pekan berikutnya, bukan Kamis besoknya). */
    const pekanAktif = weeks === 0 ? hari.includes(bd.getUTCDay()) : weeks > 0 && weeks % rule.interval === 0;
    return pekanAktif&&hari.includes(td.getUTCDay());
  }
  const months=(td.getUTCFullYear()-bd.getUTCFullYear())*12+td.getUTCMonth()-bd.getUTCMonth();
  const akhir=new Date(Date.UTC(td.getUTCFullYear(),td.getUTCMonth()+1,0)).getUTCDate();
  return months>=0&&months%rule.interval===0&&td.getUTCDate()===Math.min(bd.getUTCDate(),akhir);
};
const acaraMulaiHari = (acara, tanggal) => {
  if(acara.sepanjangHari){
    const durasi=selisihHari(acara.tanggalAkhir,acara.tanggalMulai);
    return {...acara,tanggalMulai:tanggal,tanggalAkhir:geserISO(tanggal,durasi)};
  }
  const a=bagianDinding(acara.mulai,acara.zonaWaktu),b=bagianDinding(acara.selesai,acara.zonaWaktu);
  const geser=selisihHari(tanggal,a.tanggal);
  return {...acara,mulai:timestampDariDinding(geserISO(a.tanggal,geser),a.jam,acara.zonaWaktu),selesai:timestampDariDinding(geserISO(b.tanggal,geser),b.jam,acara.zonaWaktu)};
};

export function kejadianAcaraPadaTanggal(acara, tanggalISO) {
  if(!acara||!tanggalValid(tanggalISO))return [];
  const rule=acara.pengulangan;
  if(!rule){return acaraTunggalPadaTanggal(acara,tanggalISO)?[{...acara,seriId:acara.id,kejadianTanggal:hariZona(acara,true)}]:[];}
  const base=hariZona(acara,true),durasi=Math.min(3660,Math.max(0,selisihHari(hariZona(acara,false),base))),hasil=[];
  const perubahan=rule.perubahan||[],diubah=new Set(perubahan.map(x=>x.tanggalAsal)),dikecualikan=new Set(rule.kecuali||[]);
  for(const p of perubahan){
    if(acaraTunggalPadaTanggal(p.acara,tanggalISO))hasil.push({...p.acara,seriId:acara.id,kejadianTanggal:p.tanggalAsal,adalahKejadianUlang:true});
  }
  for(let mundur=0;mundur<=durasi;mundur++){
    const occurrence=geserISO(tanggalISO,-mundur);
    if(!aturanCocok(rule,base,occurrence)||dikecualikan.has(occurrence)||diubah.has(occurrence))continue;
    const inst=acaraMulaiHari(acara,occurrence);
    if(inst.mulai===null||inst.selesai===null)continue;
    if(acaraTunggalPadaTanggal(inst,tanggalISO))hasil.push({...inst,seriId:acara.id,kejadianTanggal:occurrence,adalahKejadianUlang:true});
  }
  return hasil;
}

export const acaraPadaTanggal = (acara,tanggalISO) => kejadianAcaraPadaTanggal(acara,tanggalISO).length>0;

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
