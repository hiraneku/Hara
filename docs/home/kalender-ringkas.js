/* Ringkasan kalender Beranda. Preferensi tersimpan lokal; isi hanya membaca
   catatan yang terlihat, acara, dan blok yang telah tersimpan di perangkat. */
import { state } from '../core/store.js?v=20261105210000';
import { t as tr, bahasaSekarang } from '../core/i18n.js?v=20261105210000';
import { esc } from '../core/dom.js?v=20261105210000';
import { go } from '../core/router.js?v=20261105210000';
import { openNote } from '../notes/model.js?v=20261105210000';
import { terlihat } from '../notes/kunci.js?v=20261105210000';
import { tenggatTodo } from '../notes/pengingat.js?v=20261105210000';
import { kejadianAcaraPadaTanggal, timestampDariDinding, labelWaktuAcara } from '../notes/kalender-acara-murni.js?v=20261113230700';
import { tampilkanKalenderTanggal } from '../notes/views/tugas.js?v=20261113231100';

const KEY='hara.home.kalender-ringkas.v1';
const MODES=['hari','terlambat','3hari','7hari'];
const ambilMode=()=>{try{const v=localStorage.getItem(KEY);return MODES.includes(v)?v:'hari';}catch{return 'hari';}};
const isoLokal=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const tambahHari=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);x.setHours(0,0,0,0);return x;};
const hariMulai=d=>{const x=new Date(d);x.setHours(0,0,0,0);return x;};
const locale=()=>({id:'id-ID',en:'en-US',ja:'ja-JP'})[bahasaSekarang()]||'id-ID';
const catatanAktif=()=> (state.notes||[]).filter(n=>n&&!n.archived&&!n.deletedAt&&terlihat(n));
const jamZona=(ms,zona)=>new Intl.DateTimeFormat(locale(),{timeZone:zona||'UTC',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(ms));
const tanggalLabel=iso=>new Date(`${iso}T12:00:00`).toLocaleDateString(locale(),{weekday:'short',day:'numeric',month:'short'});
const teksTodo=x=>x.sisa||x.blok?.content?.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()||tr('Tanpa isi');

export function dataRingkasanKalender(mode=ambilMode(),sekarang=new Date()){
  const awal=hariMulai(sekarang),isoAwal=isoLokal(awal),notes=catatanAktif(),rows=[];
  if(mode==='terlambat'){
    for(const n of notes)for(const x of tenggatTodo(n))if(x.waktu<awal.getTime())rows.push({jenis:'tugas',at:x.waktu,iso:isoLokal(new Date(x.waktu)),waktu:x.jam||'',judul:teksTodo(x),noteId:n.id});
  }else{
    const jumlah=mode==='3hari'?3:mode==='7hari'?7:1,akhir=tambahHari(awal,jumlah);
    for(const n of notes)for(const x of tenggatTodo(n))if(x.waktu>=awal.getTime()&&x.waktu<akhir.getTime())rows.push({jenis:'tugas',at:x.waktu,iso:isoLokal(new Date(x.waktu)),waktu:x.jam||'',judul:teksTodo(x),noteId:n.id});
    for(let i=0;i<jumlah;i++){
      const hari=tambahHari(awal,i),iso=isoLokal(hari);
      for(const acara of state.acaraKalender||[])for(const kejadian of kejadianAcaraPadaTanggal(acara,iso))rows.push({jenis:'acara',at:kejadian.sepanjangHari?hari.getTime():kejadian.mulai,iso,waktu:labelWaktuAcara(kejadian,bahasaSekarang()),judul:kejadian.judul,noteId:kejadian.catatanId||''});
      for(const blok of state.blokKalender||[]){
        const mulai=timestampDariDinding(iso,'00:00',blok.zonaWaktu||'UTC'),besok=tambahHari(hari,1),selesai=timestampDariDinding(isoLokal(besok),'00:00',blok.zonaWaktu||'UTC');
        if(mulai!==null&&selesai!==null&&blok.mulai<selesai&&blok.selesai>mulai){
          const linked=blok.tipe==='tugas'?notes.find(n=>n.id===blok.noteId):null;
          const b=linked?.blocks?.find(x=>x.id===blok.blockId);
          if(b?.meta?.checked)continue;
          rows.push({jenis:blok.tipe==='tugas'?'blok-tugas':'fokus',at:Math.max(blok.mulai,mulai),iso,waktu:jamZona(Math.max(blok.mulai,mulai),blok.zonaWaktu),judul:blok.judul,noteId:linked?.id||''});
        }
      }
    }
  }
  return rows.sort((a,b)=>a.at-b.at||a.judul.localeCompare(b.judul,locale())).slice(0,8).map(x=>({...x,tanggal:tanggalLabel(x.iso)}));
}

const namaMode=mode=>mode==='terlambat'?tr('Tugas terlambat'):mode==='3hari'?tr('3 hari ke depan'):mode==='7hari'?tr('7 hari ke depan'):tr('Agenda hari ini');
const labelJenis=x=>x.jenis==='acara'?tr('Acara'):x.jenis==='fokus'?tr('Fokus'):x.jenis==='blok-tugas'?tr('Blok tugas'):tr('Tugas / tenggat');
export function kalenderRingkasHtml(){
  const mode=ambilMode(),rows=dataRingkasanKalender(mode),notes=catatanAktif();
  return `<section class="bh-kalender" aria-label="${tr('Ringkasan kalender Beranda')}">
    <header class="bh-kalender-head"><div><b>${tr('Agenda')}</b><small>${tr('Ringkasan kalender lokal')}</small></div>
      <label><span>${tr('Rentang')}</span><select data-home-kal-mode aria-label="${tr('Pilih ringkasan kalender')}">${MODES.map(v=>`<option value="${v}" ${mode===v?'selected':''}>${namaMode(v)}</option>`).join('')}</select></label>
    </header>
    <div class="bh-kalender-list" aria-live="polite">${rows.length?rows.map(x=>{
      const note=notes.find(n=>n.id===x.noteId),stamp=x.waktu?`${x.tanggal} · ${x.waktu}`:x.tanggal;
      return `<article class="bh-kalender-item"><button type="button" class="bh-kalender-buka" data-home-kal-date="${esc(x.iso)}" aria-label="${tr('Buka di kalender')}: ${esc(stamp)} · ${esc(x.judul)}"><span>${esc(stamp)} · ${esc(labelJenis(x))}</span><b>${esc(x.judul)}</b></button>${note?`<button type="button" class="bh-kalender-note" data-home-kal-note="${esc(note.id)}">${tr('Buka catatan terkait')}: ${esc(note.title||tr('Tanpa judul'))}</button>`:''}</article>`;
    }).join(''):`<p class="bh-kalender-kosong">${mode==='terlambat'?tr('Tidak ada tugas terlambat.'):tr('Tidak ada agenda pada rentang ini.')}</p>`}</div>
  </section>`;
}

let terpasang=false;
export function bindKalenderRingkas(){
  if(terpasang)return;terpasang=true;
  document.addEventListener('change',e=>{
    const pilih=e.target.closest?.('[data-home-kal-mode]');if(!pilih)return;
    try{localStorage.setItem(KEY,MODES.includes(pilih.value)?pilih.value:'hari');}catch{}
    const card=pilih.closest('.bh-kalender');if(card)card.outerHTML=kalenderRingkasHtml();
    document.querySelector('[data-home-kal-mode]')?.focus();
  });
  document.addEventListener('click',e=>{
    const note=e.target.closest?.('[data-home-kal-note]');if(note){openNote(note.dataset.homeKalNote);return;}
    const date=e.target.closest?.('[data-home-kal-date]');if(date){
      const [y,m,d]=date.dataset.homeKalDate.split('-').map(Number);
      tampilkanKalenderTanggal(new Date(y,m-1,d,12).getTime());
    }
  });
}
