/* Logika murni Tahap 3: blok waktu tugas/fokus, parsing tambah-cepat,
   benturan jadwal, dan ringkasan minggu. Tidak mengubah tenggat di catatan. */
import { uraiTugas } from './pengingat.js?v=20261105210000';
import { acaraPadaTanggal, kejadianAcaraPadaTanggal, normalisasiAcara, tanggalKalenderValid, timestampDariDinding } from './kalender-acara-murni.js?v=20261113230700';

const ID = () => globalThis.crypto?.randomUUID?.() || `jadwal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
const validZona = z => { try { new Intl.DateTimeFormat('en',{timeZone:z}).format(0); return true; } catch { return false; } };

export function normalisasiBlokJadwal(item, now = Date.now()) {
  if (!item || typeof item !== 'object') return null;
  const mulai=Number(item.mulai), selesai=Number(item.selesai);
  const judul=String(item.judul||'').trim().slice(0,240);
  const tipe=['tugas','fokus'].includes(item.tipe)?item.tipe:null;
  if(!tipe||!judul||!Number.isFinite(mulai)||!Number.isFinite(selesai)||selesai<=mulai)return null;
  if(tipe==='tugas'&&(!String(item.noteId||'').trim()||!String(item.blockId||'').trim()))return null;
  const zona=String(item.zonaWaktu||'UTC');
  return {
    id:String(item.id||ID()).slice(0,120),tipe,judul,mulai,selesai,
    zonaWaktu:validZona(zona)?zona:'UTC',
    ...(tipe==='tugas'?{noteId:String(item.noteId).slice(0,120),blockId:String(item.blockId).slice(0,120)}:{}),
    ...(item.diubah?{diubah:Number(item.diubah)||now}:{}),dibuat:Number(item.dibuat)||now,
  };
}
export function normalisasiDaftarBlokJadwal(items){
  if(!Array.isArray(items))return[];
  const hasil=[],ids=new Set();
  for(const item of items.slice(0,10000)){const b=normalisasiBlokJadwal(item);if(!b||ids.has(b.id))continue;ids.add(b.id);hasil.push(b);}
  return hasil;
}

/* Coba parse tanggal di setiap batas kata supaya frasa natural boleh muncul
   sebelum atau sesudah judul. Hasil hanya usulan; pemanggil wajib meminta
   konfirmasi sebelum menyimpan. */
export function tafsirAcaraCepat(teks,zonaWaktu='UTC'){
  const asli=String(teks||'').trim().replace(/\s+/g,' ');
  if(!asli||asli.length>500||!validZona(zonaWaktu))return null;
  const special=asli.match(/\bsetiap\s+hari\s+kerja\b/i);
  if(special){
    const sebelum=asli.slice(0,special.index).trim(),sesudah=asli.slice(special.index+special[0].length).trim();
    const jam=uraiTugas(`setiap senin ${sesudah}`);
    if(jam){const judul=[sebelum,jam.sisa].filter(Boolean).join(' ').replace(/^[-,: ]+|[-,: ]+$/g,'').trim();if(!judul)return null;
      return {judul,zonaWaktu,sepanjangHari:!jam.jam,tanggalMulai:new Date(jam.waktu).toLocaleDateString('en-CA'),jamMulai:jam.jam||null,durasiMenit:60,pengulangan:{frekuensi:'mingguan',interval:1,hari:[1,2,3,4,5]},ringkasan:asli};}
  }
  const kata=asli.split(' ');
  for(let i=0;i<kata.length;i++){
    const u=uraiTugas(kata.slice(i).join(' '));
    if(!u)continue;
    const judul=[kata.slice(0,i).join(' '),u.sisa].filter(Boolean).join(' ').replace(/^[-,: ]+|[-,: ]+$/g,'').trim();
    if(!judul)continue;
    const d=new Date(u.waktu),tanggalMulai=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    let pengulangan=null;
    if(u.aturan){
      if(u.aturan.jenis==='harian')pengulangan={frekuensi:'harian',interval:1};
      else if(u.aturan.jenis==='mingguan')pengulangan={frekuensi:'mingguan',interval:1,hari:[u.aturan.hari]};
      else if(u.aturan.jenis==='bulanan')pengulangan={frekuensi:'bulanan',interval:1};
    }
    return {judul,zonaWaktu,sepanjangHari:!u.jam,tanggalMulai,jamMulai:u.jam||null,durasiMenit:60,pengulangan,ringkasan:asli};
  }
  return null;
}

const awalHariZona=(iso,zona)=>timestampDariDinding(iso,'00:00',zona);
const akhirHariZona=(iso,zona)=>{const d=new Date(`${iso}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+1);const n=`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;return awalHariZona(n,zona);};
const intervalAcara=(a,iso)=>{
  if(a.sepanjangHari){const s=awalHariZona(a.tanggalMulai,a.zonaWaktu),e=akhirHariZona(a.tanggalAkhir,a.zonaWaktu);return s===null||e===null?null:{mulai:s,selesai:e};}
  return {mulai:a.mulai-(Number(a.persiapanMenit)||0)*60000,selesai:a.selesai+(Number(a.perjalananMenit)||0)*60000};
};
const intervalBlok=b=>({mulai:b.mulai,selesai:b.selesai});

export function benturanJadwal(proposal,{acara=[],blok=[],kecualikanId=''}={}){
  if(!proposal)return[];
  const zona=proposal.zonaWaktu||'UTC', start=proposal.sepanjangHari?awalHariZona(proposal.tanggalMulai,zona):Number(proposal.mulai), end=proposal.sepanjangHari?akhirHariZona(proposal.tanggalAkhir||proposal.tanggalMulai,zona):Number(proposal.selesai);
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return[];
  const zonaTanggal=ms=>{const p=new Intl.DateTimeFormat('en',{timeZone:zona,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(ms));const v=Object.fromEntries(p.map(x=>[x.type,x.value]));return `${v.year}-${v.month}-${v.day}`;};
  const hariAwal=zonaTanggal(start),hariAkhir=zonaTanggal(end-1),hari=[];
  for(let d=new Date(`${hariAwal}T12:00:00Z`),last=new Date(`${hariAkhir}T12:00:00Z`);d<=last;d.setUTCDate(d.getUTCDate()+1))hari.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`);
  const kandidat=[];
  for(const a of acara){
    if(a.id===kecualikanId)continue;
    for(const day of hari)for(const inst of kejadianAcaraPadaTanggal(a,day))if(inst.id!==kecualikanId)kandidat.push({id:a.id,jenis:'acara',judul:inst.judul,interval:intervalAcara(inst,day),hari:day});
  }
  for(const b of blok){if(b.id!==kecualikanId)kandidat.push({id:b.id,jenis:b.tipe==='fokus'?'fokus':'tugas',judul:b.judul,interval:intervalBlok(b),hari:zonaTanggal(b.mulai)});}
  const seen=new Set(),hasil=[];
  for(const x of kandidat){const iv=x.interval;if(!iv||iv.mulai>=end||iv.selesai<=start)continue;const key=`${x.id}:${x.hari}`;if(seen.has(key))continue;seen.add(key);hasil.push({jenis:x.jenis,judul:x.judul,mulai:iv.mulai,selesai:iv.selesai});}
  return hasil.sort((a,b)=>a.mulai-b.mulai);
}

export function ringkasanPekan({tanggalMulai,tugas=[],blok=[],acara=[]}){
  const d=new Date(`${tanggalMulai}T12:00:00`);if(Number.isNaN(d.getTime()))return {agenda:0,blokTugas:0,tanpaBlok:0,bentrok:0};
  const tanggal=[];for(let i=0;i<7;i++){const x=new Date(d);x.setDate(x.getDate()+i);tanggal.push(`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`);}
  const due=tugas.filter(x=>tanggal.some(day=>x.jatuhTanggal===day));
  const blocks=blok.filter(x=>tanggal.some(day=>{const p=new Intl.DateTimeFormat('en',{timeZone:x.zonaWaktu,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(x.mulai));const v=Object.fromEntries(p.map(y=>[y.type,y.value]));return `${v.year}-${v.month}-${v.day}`===day;}));
  const agenda=acara.reduce((n,a)=>n+tanggal.reduce((s,day)=>s+kejadianAcaraPadaTanggal(a,day).length,0),0);
  const blockKeys=new Set(blocks.filter(b=>b.tipe==='tugas').map(b=>`${b.noteId}:${b.blockId}`));
  return {agenda:agenda+due.length,blokTugas:blocks.filter(b=>b.tipe==='tugas').length,tanpaBlok:due.filter(t=>!blockKeys.has(`${t.n.id}:${t.bid}`)).length,bentrok:benturanJadwal(blocks,{acara}).length};
}
