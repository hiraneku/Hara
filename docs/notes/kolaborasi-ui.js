/* N10 offline collaboration workspace manager. Rooms persist locally and use
   the pure revision protocol; no server/identity service is implied. */
import { openPop } from './menus/pop.js?v=20261105210000';
import { state } from '../core/store.js?v=20261105210000';
import { esc } from '../core/dom.js?v=20261105210000';
import { t as tr } from '../core/i18n.js?v=20261105210000';
import { buatRuangBersama, aturAnggota, tambahKomentar } from './kolaborasi-murni.js?v=20261105210000';
const K='hara.collaboration.n10.v1', USER='hara.collaboration.identity.v1';
let active=null;
const identitas=()=>localStorage.getItem(USER)||'';
function rooms(){try{const r=JSON.parse(localStorage.getItem(K)||'[]');return Array.isArray(r)?r:[]}catch{return[]}}
function saveRooms(x){localStorage.setItem(K,JSON.stringify(x));}
function render(message=''){
 const all=rooms(), current=all.find(x=>x.id===active)||all[0], user=identitas();if(current)active=current.id;
 const notes=(state.notes||[]).filter(n=>n&&!n.deletedAt);
 const pick=notes.map(n=>`<option value="${esc(n.id)}">${esc(n.title||tr('Tanpa judul'))}</option>`).join('');
 const roomOptions=all.map(r=>`<option value="${esc(r.id)}"${current?.id===r.id?' selected':''}>${esc(notes.find(n=>n.id===r.noteId)?.title||r.noteId)}</option>`).join('');
 const people=current?`<div class="n10-members"><b>${tr('Akses anggota')}</b>${current.members.map(m=>`<div>${esc(m.id)} <span>${esc(m.role)}</span>${m.id===current.owner?` · ${tr('Pemilik')}`:''}</div>`).join('')}</div>`:'';
 const comments=current?`<div class="n10-comments"><b>${tr('Komentar beratribusi')}</b>${current.comments.map(c=>`<article><p>${esc(c.text)}</p><small>${esc(c.actor)} · ${esc(new Date(c.at).toLocaleString())}${c.blockId?` · ${tr('blok')} ${esc(c.blockId)}`:''}</small></article>`).join('')||`<p>${tr('Belum ada komentar.')}</p>`}</div>`:'';
 openPop(`<div class="pop-h">${tr('Ruang kolaborasi N10')}</div><p class="pop-note">${tr('Model akses, komentar, atribusi, dan konflik tersedia lokal. Relay waktu nyata belum terhubung; identitas di bawah bukan autentikasi akun.')}</p>
 <label class="n10-label">${tr('Identitas lokal')}<input class="sh-inp" data-n10-identity value="${esc(user)}" maxlength="120" placeholder="${tr('Nama atau ID pilihanmu')}"></label>
 <div class="n10-create"><label class="n10-label">${tr('Note')}<select class="sh-inp" data-n10-note>${pick}</select></label><button class="btn btn-pri" data-n10-create ${notes.length?'':'disabled'}>${tr('Buat ruang lokal')}</button></div>
 ${all.length?`<label class="n10-label">${tr('Ruang lokal')}<select class="sh-inp" data-n10-room>${roomOptions}</select></label>`:''}${people}
 ${current?`<div class="n10-manage"><input class="sh-inp" data-n10-member placeholder="${tr('ID anggota')}" maxlength="120"><select class="sh-inp" data-n10-role><option value="editor">Editor</option><option value="commenter">Commenter</option><option value="reader">Reader</option><option value="remove">${tr('Hapus akses')}</option></select><button class="btn btn-sec" data-n10-access>${tr('Simpan akses')}</button></div>
 <div class="n10-comment-form"><textarea class="sh-inp" data-n10-comment maxlength="4000" placeholder="${tr('Tulis komentar…')}"></textarea><button class="btn btn-sec" data-n10-comment-add>${tr('Kirim komentar')}</button></div>${comments}`:''}${message?`<p role="alert">${esc(message)}</p>`:''}<button class="btn btn-sec" data-n10-close>${tr('Tutup')}</button>`);
}
export function bindKolaborasiUI(){
 document.addEventListener('click',e=>{
  if(e.target.closest?.('[data-n10-open]')){render();return;}
  if(e.target.closest?.('[data-n10-close]')){document.getElementById('pop')?.classList.remove('on');return;}
  if(e.target.closest?.('[data-n10-room]')){active=e.target.closest('[data-n10-room]').value;render();return;}
  if(e.target.closest?.('[data-n10-create]')){const user=document.querySelector('[data-n10-identity]')?.value.trim(), noteId=document.querySelector('[data-n10-note]')?.value; if(!user||!noteId){render(tr('Isi identitas dan pilih note terlebih dahulu.'));return;}localStorage.setItem(USER,user);const note=state.notes.find(n=>n.id===noteId);const room=buatRuangBersama(note,user);saveRooms([room,...rooms()]);active=room.id;render();return;}
  if(e.target.closest?.('[data-n10-access]')){const user=document.querySelector('[data-n10-identity]')?.value.trim(),member=document.querySelector('[data-n10-member]')?.value.trim(),role=document.querySelector('[data-n10-role]')?.value;try{localStorage.setItem(USER,user||'');const all=rooms(),i=all.findIndex(r=>r.id===active);all[i]=aturAnggota(all[i],user,member,role);saveRooms(all);render();}catch(err){render(err.message);}return;}
  if(e.target.closest?.('[data-n10-comment-add]')){const user=document.querySelector('[data-n10-identity]')?.value.trim(),text=document.querySelector('[data-n10-comment]')?.value;try{localStorage.setItem(USER,user||'');const all=rooms(),i=all.findIndex(r=>r.id===active);all[i]=tambahKomentar(all[i],{actor:user,text});saveRooms(all);render();}catch(err){render(err.message);}return;}
 });
 document.addEventListener('change',e=>{if(e.target.closest?.('[data-n10-room]')){active=e.target.value;render();}});
}
