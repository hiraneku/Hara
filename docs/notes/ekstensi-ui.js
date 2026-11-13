import { openPop } from './menus/pop.js?v=20261105210000';
import { esc } from '../core/dom.js?v=20261105210000';
import { t as tr } from '../core/i18n.js?v=20261105210000';
import { daftarEkstensi, beriIzinEkstensi, izinEkstensi } from './ekstensi-api.js?v=20261105210000';
function gambarKelolaEkstensi(){
 const items=daftarEkstensi(), saved=izinEkstensi();
 const body=items.length?items.map(x=>`<section class="n11-item"><b>${esc(x.name)}</b><small>${esc(x.id)} · ${esc(x.version||'1')}</small>${x.actions.map(a=>`<div class="n11-action"><span>${esc(a.label)}</span>${a.permissions.map(p=>`<label><input type="checkbox" data-n11-perm="${esc(x.id)}" value="${esc(p)}"${(saved[x.id]||[]).includes(p)?' checked':''}> ${esc(p)}</label>`).join('')}</div>`).join('')}</section>`).join(''):`<p>${tr('Belum ada ekstensi terpasang. Ekstensi harus dibundel bersama aplikasi; tidak ada pemuatan skrip jarak jauh.')}</p>`;
 openPop(`<div class="pop-h">${tr('API ekstensi terkontrol')}</div><p class="pop-note">${tr('Izin dibatasi per kemampuan. Aksi note hanya mengembalikan operasi terbatas dan memerlukan pratinjau serta persetujuan terpisah.')}</p>${body}<div class="n11-actions"><button class="btn btn-sec" data-n11-close>${tr('Tutup')}</button>${items.length?`<button class="btn btn-pri" data-n11-save>${tr('Simpan izin')}</button>`:''}</div>`);
}
export function bindEkstensiApi(){
 document.addEventListener('click',e=>{
  if(e.target.closest?.('[data-n11-open]')){gambarKelolaEkstensi();return;}
  if(e.target.closest?.('[data-n11-close]')){document.getElementById('pop')?.classList.remove('on');return;}
  if(e.target.closest?.('[data-n11-save]')){const next={};document.querySelectorAll('[data-n11-perm]:checked').forEach(x=>(next[x.dataset.n11Perm]??=[]).push(x.value));for(const x of daftarEkstensi())beriIzinEkstensi(x.id,next[x.id]||[]);gambarKelolaEkstensi();return;}
 });
}
