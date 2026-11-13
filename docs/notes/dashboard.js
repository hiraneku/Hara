/* N8: dashboard rakitan dengan enam komponen bawaan. Konfigurasi hanya lokal,
   filter sederhana; tidak ada widget atau ekspresi yang dapat dijalankan. */
import { state } from '../core/store.js?v=20261105210000';
import { go } from '../core/router.js?v=20261105210000';
import { openNote } from './model.js?v=20261105210000';
import { esc } from '../core/dom.js?v=20261105210000';
import { t as tr } from '../core/i18n.js?v=20261105210000';

const KEY = 'hara.dashboard.n8.v1';
const DEFAULT = { urutan: ['ringkasan','mendatang','koleksi','kalender','terbaru','properti'], terlihat:['ringkasan','mendatang','koleksi','kalender','terbaru','properti'], filter: { tag: '', teks: '' } };
const KOMPONEN = ['ringkasan','mendatang','koleksi','kalender','terbaru','properti'];
const NAMA = { ringkasan:'Ringkasan angka', mendatang:'Tugas mendatang', koleksi:'Koleksi note', kalender:'Kalender', terbaru:'Note terbaru', properti:'Tabel properti' };
const ambil = () => { try { const x=JSON.parse(localStorage.getItem(KEY)||'null'), raw=Array.isArray(x?.urutan)?x.urutan:DEFAULT.urutan; return {urutan:[...new Set(raw.filter(k=>KOMPONEN.includes(k))),...KOMPONEN.filter(k=>!raw.includes(k))],terlihat:Array.isArray(x?.terlihat)?[...new Set(x.terlihat.filter(k=>KOMPONEN.includes(k)))]:KOMPONEN.slice(),filter:{tag:String(x?.filter?.tag||''),teks:String(x?.filter?.teks||'')}}; } catch { return structuredClone(DEFAULT); } };
const simpan = x => { try { localStorage.setItem(KEY,JSON.stringify(x)); } catch {} };
const amanNotes = () => (state.notes||[]).filter(n=>n&&!n.deletedAt);
const due = b => Number(b?.meta?.dueAt || b?.meta?.due || b?.meta?.deadline || 0);
const namaNote = n => `<button class="n8-note" data-n8-open="${esc(n.id)}">${esc(n.title||tr('Tanpa judul'))}</button>`;
function cards(cfg) {
 const notes=amanNotes().filter(n=>!cfg.filter.tag||(n.tags||[]).includes(cfg.filter.tag)).filter(n=>!cfg.filter.teks||String(n.title||'').toLowerCase().includes(cfg.filter.teks.toLowerCase()));
 const tugas=[]; for(const n of notes) for(const b of n.blocks||[]) if(b.type==='todo' && !(b.meta?.checked||b.meta?.done>0) && due(b)) tugas.push({n,b,w:due(b)});
 tugas.sort((a,b)=>a.w-b.w);
 const tags=new Map(); notes.forEach(n=>(n.tags||[]).forEach(t=>tags.set(t,(tags.get(t)||0)+1)));
 const kalender=new Map(); tugas.forEach(x=>{const d=new Date(x.w), key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; kalender.set(key,(kalender.get(key)||0)+1);});
 const props=notes.flatMap(n=>(n.props||[]).map(p=>({n,k:p.k,v:p.v}))).slice(0,12);
 return {
  ringkasan:`<div class="n8-stats"><span><b>${notes.length}</b>${tr('note')}</span><span><b>${tugas.length}</b>${tr('tugas terbuka')}</span><span><b>${notes.filter(n=>n.pinned).length}</b>${tr('disematkan')}</span></div>`,
  mendatang:`${tugas.slice(0,8).map(x=>`<div class="n8-row">${namaNote(x.n)}<small>${esc(new Date(x.w).toLocaleDateString())}</small></div>`).join('')||`<p>${tr('Tidak ada tugas mendatang.')}</p>`}`,
  koleksi:`<div class="n8-chips">${[...tags].sort((a,b)=>a[0].localeCompare(b[0])).map(([t,c])=>`<button class="n8-chip" data-n8-tag="${esc(t)}">#${esc(t)} <small>${c}</small></button>`).join('')||`<p>${tr('Belum ada tag.')}</p>`}</div>`,
  kalender:`<div class="n8-chips">${[...kalender].sort().slice(0,10).map(([d,c])=>`<span class="n8-chip">${esc(d)} · ${c}</span>`).join('')||`<p>${tr('Belum ada tugas bertenggat.')}</p>`}</div>`,
  terbaru:`${notes.slice().sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).slice(0,8).map(n=>`<div class="n8-row">${namaNote(n)}<small>${esc(n.updatedAt?new Date(n.updatedAt).toLocaleDateString():'')}</small></div>`).join('')||`<p>${tr('Belum ada note.')}</p>`}`,
  properti:`<div class="n8-table-wrap"><table class="n8-table"><thead><tr><th>${tr('Note')}</th><th>${tr('Properti')}</th><th>${tr('Nilai')}</th></tr></thead><tbody>${props.map(x=>`<tr><td>${namaNote(x.n)}</td><td>${esc(x.k)}</td><td>${esc(x.v)}</td></tr>`).join('')||`<tr><td colspan="3">${tr('Belum ada properti.')}</td></tr>`}</tbody></table></div>`
 };
}
export function dashboardView() {
 const cfg=ambil(), isi=cards(cfg), tags=[...new Set(amanNotes().flatMap(n=>n.tags||[]))].sort();
 return `<main class="n8-page"><header class="n8-head"><div><p class="eyebrow">HARA · N8</p><h1>${tr('Dashboard note')}</h1><p>${tr('Komponen bawaan, filter sederhana, dan tata letak lokal.')}</p></div><button class="btn btn-sec" data-n8-config>${tr('Atur komponen')}</button></header>
 <div class="n8-filters"><label>${tr('Filter tag')}<select data-n8-filter="tag"><option value="">${tr('Semua tag')}</option>${tags.map(t=>`<option value="${esc(t)}"${cfg.filter.tag===t?' selected':''}>${esc(t)}</option>`).join('')}</select></label><label>${tr('Cari judul')}<input data-n8-filter="teks" value="${esc(cfg.filter.teks)}" placeholder="${tr('Ketik untuk menyaring')}"></label></div>
 <section class="n8-grid">${cfg.urutan.filter(k=>cfg.terlihat.includes(k)).map(k=>`<article class="n8-card" data-n8-card="${k}"><h2>${tr(NAMA[k])}</h2>${isi[k]}</article>`).join('')}</section>
 <div class="n8-settings" data-n8-settings hidden><h2>${tr('Susunan dashboard')}</h2>${cfg.urutan.map((k,i)=>`<div class="n8-setting"><label><input type="checkbox" data-n8-visible="${k}"${cfg.terlihat.includes(k)?' checked':''}> ${tr(NAMA[k])}</label><button class="sf-mini" data-n8-move="${i}:up" ${i===0?'disabled':''} aria-label="${tr('Naikkan')}">↑</button><button class="sf-mini" data-n8-move="${i}:down" ${i===cfg.urutan.length-1?'disabled':''} aria-label="${tr('Turunkan')}">↓</button></div>`).join('')}<button class="btn btn-pri" data-n8-save>${tr('Simpan tata letak')}</button></div></main>`;
}
export function bindDashboard() {
 document.addEventListener('click',e=>{
  const open=e.target.closest?.('[data-n8-open]'); if(open){openNote(open.dataset.n8Open);return;}
  const tag=e.target.closest?.('[data-n8-tag]'); if(tag){const c=ambil();c.filter.tag=tag.dataset.n8Tag;simpan(c);go('dashboard');return;}
  if(e.target.closest?.('[data-n8-config]')){document.querySelector('.n8-settings')?.toggleAttribute('hidden');return;}
  const move=e.target.closest?.('[data-n8-move]'); if(move){const c=ambil(),[i0,dir]=move.dataset.n8Move.split(':'),i=Number(i0),j=dir==='up'?i-1:i+1;[c.urutan[i],c.urutan[j]]=[c.urutan[j],c.urutan[i]];simpan(c);go('dashboard');document.querySelector('.n8-settings')?.removeAttribute('hidden');return;}
  if(e.target.closest?.('[data-n8-save]')){const c=ambil();c.terlihat=[...document.querySelectorAll('[data-n8-visible]:checked')].map(x=>x.dataset.n8Visible);simpan(c);go('dashboard');return;}
 });
 document.addEventListener('change',e=>{const x=e.target.closest?.('[data-n8-filter]');if(!x)return;const c=ambil();c.filter[x.dataset.n8Filter]=x.value;simpan(c);go('dashboard');});
 document.addEventListener('input',e=>{const x=e.target.closest?.('[data-n8-filter="teks"]');if(!x)return;const c=ambil();c.filter.teks=x.value;simpan(c);});
}
