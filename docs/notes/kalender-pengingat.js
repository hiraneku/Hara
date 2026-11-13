/* Pengingat kalender lokal. Web Notifications hanya dijadwalkan selama halaman
   aplikasi hidup; browser/Android dapat membekukan tab di latar. Tidak ada
   klaim pengiriman latar yang terjamin. */
import { state, onAfterSave } from '../core/store.js?v=20261105210000';
import { t as tr } from '../core/i18n.js?v=20261113232100';
import { toast } from '../core/toast.js?v=20261105210000';
import {
  PENGINGAT_KUNCI, PENGINGAT_DEFAULT, normalisasiPreferensiPengingat,
  rencanaPengingat, waktuTundaPilihan, hormatiJamTenang,
} from './kalender-pengingat-murni.js?v=20261113232100';

const KUNCI_STATUS = 'hara.kalender.pengingat-status.v1';
let prefs = bacaPrefs();
let fired = bacaStatus().fired;
let snoozed = bacaStatus().snoozed;
let timer = 0;
let started = false;
const notifikasiTerbuka = new Map();
let antreBanner = [];
let bannerNode = null;
const simpanJson = (k,v) => { try { localStorage.setItem(k,JSON.stringify(v)); return true; } catch { return false; } };
function bacaPrefs(){try{return normalisasiPreferensiPengingat(JSON.parse(localStorage.getItem(PENGINGAT_KUNCI)||'{}'));}catch{return normalisasiPreferensiPengingat(PENGINGAT_DEFAULT);}}
function bacaStatus(){try{const x=JSON.parse(localStorage.getItem(KUNCI_STATUS)||'{}');return {fired:Array.isArray(x.fired)?x.fired.filter(v=>typeof v==='string').slice(-1500):[],snoozed:x.snoozed&&typeof x.snoozed==='object'?x.snoozed:{}};}catch{return {fired:[],snoozed:{}};}}
function simpanStatus(){simpanJson(KUNCI_STATUS,{fired:[...fired].slice(-1500),snoozed});}
const izin = () => typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
const fmtWaktu = (ms,zona) => { try { return new Intl.DateTimeFormat(undefined,{hour:'2-digit',minute:'2-digit',...(zona?{timeZone:zona}:{})}).format(new Date(ms)); } catch { return ''; } };

export function preferensiKalenderPengingat(){return globalThis.structuredClone?globalThis.structuredClone(prefs):JSON.parse(JSON.stringify(prefs));}
export function htmlPengaturanPengingat(){
  const can=izin(), checked=prefs.aktif&&can==='granted';
  const pil=[5,10,15,30,60,120,1440];
  return `<details class="kal-pengingat-prefs"><summary>${tr('Pengingat acara')}</summary>
    <div class="kal-pengingat-isi">
      <p class="kal-notif-status" data-kal-notif-status>${can==='unsupported'?tr('Notifikasi sistem tidak didukung di lingkungan ini.'):can==='denied'?tr('Izin notifikasi ditolak; ubah izin situs di pengaturan browser.'):can==='granted'?tr('Izin notifikasi sudah diberikan.'):tr('Notifikasi hanya diminta setelah kamu mengaktifkannya.')}</p>
      <button type="button" class="btn btn-pri" data-kal-notif-aktif>${checked?tr('Matikan pengingat'):tr('Aktifkan notifikasi')}</button>
      ${checked?`<fieldset class="kal-notif-pilihan"><legend>${tr('Ingatkan sebelum acara')}</legend>${pil.map(n=>`<label><input type="checkbox" data-kal-notif-menit="${n}" ${prefs.menitSebelum.includes(n)?'checked':''}> ${n===1440?tr('1 hari'):tr('{n} menit',{n})}</label>`).join('')}</fieldset>
      <label class="kal-notif-seharian">${tr('Jam pengingat acara sepanjang hari')}<input type="time" data-kal-notif-seharian value="${prefs.jamAcaraSeharian}"></label>
      <fieldset class="kal-notif-tenang"><legend>${tr('Jam tenang')}</legend>
        <label><input type="checkbox" data-kal-notif-tenang ${prefs.jamTenang.aktif?'checked':''}> ${tr('Aktifkan jam tenang')}</label>
        <div class="kal-notif-jam"><label>${tr('Mulai')}<input type="time" data-kal-notif-mulai value="${prefs.jamTenang.mulai}"></label><label>${tr('Selesai')}<input type="time" data-kal-notif-selesai value="${prefs.jamTenang.selesai}"></label></div>
        <label><input type="checkbox" data-kal-notif-penting ${prefs.jamTenang.lewatiPenting?'checked':''}> ${tr('Tetap beri notifikasi acara penting')}</label>
      </fieldset>`:''}
      <small>${tr('Pengingat berjalan saat Hara terbuka. Web: browser dapat menangguhkan tab. Android WebView: aplikasi harus tetap aktif; Hara belum menjadwalkan alarm sistem. Edit atau hapus membatalkan timer mendatang, tetapi notifikasi yang sudah tampil mungkin perlu ditutup sendiri. Notifikasi tepat waktu di latar tidak dijamin.')}</small>
    </div></details>`;
}

function simpanPreferensi(next){
  prefs=normalisasiPreferensiPengingat(next);simpanJson(PENGINGAT_KUNCI,prefs);jadwalkan();
}
export async function aktifkanPengingatKalender(){
  if(typeof Notification==='undefined'){toast(tr('Notifikasi sistem tidak didukung di lingkungan ini.'));return false;}
  let permission=Notification.permission;
  if(permission==='default'){
    try{permission=await Notification.requestPermission();}catch{permission='denied';}
  }
  if(permission!=='granted'){prefs={...prefs,aktif:false};simpanPreferensi(prefs);toast(tr(permission==='denied'?'Izin notifikasi ditolak; ubah izin situs di pengaturan browser.':'Notifikasi tidak diaktifkan'));return false;}
  simpanPreferensi({...prefs,aktif:true});toast(tr('Pengingat acara diaktifkan'));return true;
}
export async function togglePengingatKalender(){
  if(prefs.aktif){simpanPreferensi({...prefs,aktif:false});toast(tr('Pengingat acara dimatikan'));return true;}
  return aktifkanPengingatKalender();
}
export function ubahPreferensiPengingatDariForm(form){
  const next={...prefs,jamTenang:{...prefs.jamTenang}};
  const choices=[...form.querySelectorAll('[data-kal-notif-menit]:checked')].map(x=>Number(x.dataset.kalNotifMenit));
  if(choices.length)next.menitSebelum=choices;
  next.jamAcaraSeharian=form.querySelector('[data-kal-notif-seharian]')?.value||prefs.jamAcaraSeharian;
  next.jamTenang.aktif=!!form.querySelector('[data-kal-notif-tenang]')?.checked;
  next.jamTenang.mulai=form.querySelector('[data-kal-notif-mulai]')?.value||prefs.jamTenang.mulai;
  next.jamTenang.selesai=form.querySelector('[data-kal-notif-selesai]')?.value||prefs.jamTenang.selesai;
  next.jamTenang.lewatiPenting=!!form.querySelector('[data-kal-notif-penting]')?.checked;
  simpanPreferensi(next);
}
export function setPengingatDariKontrol(input){
  if(input.matches('[data-kal-notif-menit]')){
    const picked=[...document.querySelectorAll('[data-kal-notif-menit]:checked')].map(x=>Number(x.dataset.kalNotifMenit));
    if(!picked.length){input.checked=true;toast(tr('Pilih setidaknya satu waktu pengingat'));return;}
    simpanPreferensi({...prefs,menitSebelum:picked});
  }else if(input.matches('[data-kal-notif-seharian],[data-kal-notif-tenang],[data-kal-notif-mulai],[data-kal-notif-selesai],[data-kal-notif-penting]')){
    const host=input.closest('.kal-pengingat-isi');if(host)ubahPreferensiPengingatDariForm(host);
  }
}

function tutupNotifUsang(valid){
  for(const [key,n] of notifikasiTerbuka){if(!valid.has(key)){try{n.close();}catch{}notifikasiTerbuka.delete(key);}}
}
function displayBanner(item){
  if(!document?.body||document.hidden||!item)return;
  if(bannerNode?.isConnected)return;
  const box=document.createElement('section');box.className='kal-notif-banner';box.setAttribute('role','alert');box.setAttribute('aria-live','assertive');
  const title=document.createElement('b');title.textContent=item.judul;
  const detail=document.createElement('p');detail.textContent=`${tr('Acara')} · ${fmtWaktu(item.mulai,item.zonaWaktu)} (${item.zonaWaktu}) · ${tr('Pengingat')}`;
  const actions=document.createElement('div');actions.className='kal-notif-actions';
  for(const [v,l] of [['10menit',tr('10 menit lagi')],['hari-ini',tr('Nanti hari ini')],['besok',tr('Besok')]]){
    const raw=waktuTundaPilihan(v,Date.now()), at=raw===null?null:hormatiJamTenang(raw,prefs,item.penting);
    if(at===null||at>=item.mulai)continue;
    const b=document.createElement('button');b.type='button';b.className='btn';b.dataset.kalPengingatTunda=v;b.textContent=l;actions.append(b);
  }
  const dismiss=document.createElement('button');dismiss.type='button';dismiss.className='kal-notif-tutup';dismiss.setAttribute('aria-label',tr('Tutup'));dismiss.textContent='×';dismiss.dataset.kalPengingatTutup='';
  box.append(title,dismiss,detail,actions);document.body.append(box);bannerNode=box;
}
function showNextBanner(){if(!bannerNode?.isConnected)bannerNode=null;if(!bannerNode&&antreBanner.length)displayBanner(antreBanner[0]);}
function kirim(item){
  fired.add(item.key);simpanStatus();
  antreBanner.push(item);showNextBanner();
  if(typeof Notification!=='undefined'&&Notification.permission==='granted'){
    try{
      const n=new Notification(tr('Pengingat acara'),{body:`${item.judul} · ${fmtWaktu(item.mulai,item.zonaWaktu)} (${item.zonaWaktu})`,tag:`hara-kal-${item.instanceKey}`,renotify:false});
      notifikasiTerbuka.set(item.instanceKey,n);n.onclick=()=>{try{window.focus();}catch{}showNextBanner();};n.onclose=()=>notifikasiTerbuka.delete(item.instanceKey);
    }catch{/* sistem bisa menolak notifikasi walau izin tersimpan */}
  }
}
function selesaiBanner(item){
  antreBanner=antreBanner.filter(x=>x!==item);
  if(bannerNode?.isConnected)bannerNode.remove();bannerNode=null;showNextBanner();
}
export function aksiTundaPengingat(pilihan){
  const item=antreBanner[0];if(!item)return false;
  const pilih=waktuTundaPilihan(pilihan,Date.now());
  const at=pilih===null?null:hormatiJamTenang(pilih,prefs,item.penting);
  if(!at||at>=item.mulai){toast(tr('Waktu tunda harus sebelum acara'));return false;}
  snoozed[item.instanceKey]={at,instanceKey:item.instanceKey,eventId:item.eventId,judul:item.judul,mulai:item.mulai,zonaWaktu:item.zonaWaktu,penting:item.penting};
  /* Sekali tunda menggantikan semua pengingat yang tersisa untuk kejadian ini. */
  for(const other of [...antreBanner])if(other.instanceKey===item.instanceKey)selesaiBanner(other);
  for(const [key,n] of notifikasiTerbuka)if(key===item.instanceKey){try{n.close();}catch{}notifikasiTerbuka.delete(key);}
  simpanStatus();jadwalkan();return true;
}
function tutupBannerTanpaTunda(){const item=antreBanner[0];if(!item)return;selesaiBanner(item);}

export function jadwalkan(){
  if(timer){clearTimeout(timer);timer=0;}
  if(!prefs.aktif||izin()!=='granted'){
    for(const n of notifikasiTerbuka.values()){try{n.close();}catch{}}
    notifikasiTerbuka.clear();antreBanner=[];if(bannerNode?.isConnected)bannerNode.remove();bannerNode=null;
    return;
  }
  const now=Date.now(), normal=rencanaPengingat(state.acaraKalender||[],prefs,{sekarang:now-2*86400000,hariKeDepan:33}).filter(x=>x.mulai>now), valid=new Set(normal.map(x=>x.instanceKey));
  tutupNotifUsang(valid);
  const byInstance=new Map();for(const x of normal){if(!byInstance.has(x.instanceKey))byInstance.set(x.instanceKey,x);}
  /* Bersihkan snooze dan tanda terkirim yang tidak lagi punya kejadian aktif
     (dihapus, dipindah, diedit, atau sudah lewat), mencegah ledakan lama. */
  for(const key of Object.keys(snoozed))if(!valid.has(key)||snoozed[key].mulai<=now)delete snoozed[key];
  const keys=new Set(normal.map(x=>x.key));fired=new Set([...fired].filter(k=>keys.has(k)));
  let kandidat=normal.filter(x=>x.at>now&&!fired.has(x.key)&&!snoozed[x.instanceKey]);
  for(const [instanceKey,s] of Object.entries(snoozed)){
    const base=byInstance.get(instanceKey);
    if(base&&s.at>now&&s.at<base.mulai)kandidat.push({...base,key:`${instanceKey}|tunda|${s.at}`,at:s.at,menitSebelum:0});
  }
  simpanStatus();
  const next=kandidat.sort((a,b)=>a.at-b.at)[0];
  if(next){const wait=Math.max(0,Math.min(2147480000,next.at-Date.now()));timer=setTimeout(()=>{timer=0;if(next.at<=Date.now()+1000&&next.mulai>Date.now())kirim(next);jadwalkan();},wait);timer?.unref?.();}
}
export function mulaiPengingatKalender(){
  if(started)return;started=true;
  onAfterSave(()=>jadwalkan());
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){jadwalkan();showNextBanner();}});
  window.addEventListener('focus',()=>{jadwalkan();showNextBanner();});
  jadwalkan();
}
export function tanganiAksiBanner(target){
  const b=target.closest?.('[data-kal-pengingat-tunda]');
  if(b){aksiTundaPengingat(b.dataset.kalPengingatTunda);return true;}
  if(target.closest?.('[data-kal-pengingat-tutup]')){tutupBannerTanpaTunda();return true;}
  return false;
}
