/* Dialogs for vault health and local attachment inventory. All operations
   are previews/reports; destructive orphan cleanup needs a second explicit click. */
import { state } from '../core/store.js?v=20261105210000';
import { openPop, closeAll } from './menus/pop.js?v=20261105210000';
import { periksaVault, inventarisLampiran } from './vault-quality.js?v=20261105210000';
import { ambilBlob, hapusBlob, ukuranTerbaca } from '../core/blobs.js?v=20261105210000';
import { t as tr } from '../core/i18n.js?v=20261105210000';
import { toast } from '../core/toast.js?v=20261105210000';
import { esc } from '../core/dom.js?v=20261105210000';

const popShell = (title, body) => `<section class="rn-modal-box vq-dialog" role="dialog" aria-modal="true" aria-labelledby="vq-title" tabindex="-1" style="max-width:600px;max-height:82vh;overflow:auto">
  <h2 class="rn-modal-title" id="vq-title">${title}</h2>${body}
  <div class="vq-actions"><button type="button" class="btn btn-sec" data-pop-close>${tr('Tutup')}</button></div></section>`;

export async function bukaPemeriksaanVault() {
  const p = periksaVault();
  const total = p.duplicates.length + p.emptyNotes.length + p.brokenLinks.length;
  const section = (title, items, row) => `<section class="vq-section"><h3>${title} <span>${items.length}</span></h3>${items.length ? `<ul>${items.slice(0,100).map(row).join('')}</ul>${items.length>100?`<p>${tr('dan {n} lainnya',{n:items.length-100})}</p>`:''}` : `<p class="vq-ok">${tr('Tidak ditemukan')}</p>`}</section>`;
  const body = `<p>${tr('Pemeriksaan hanya membaca catatan yang dapat dilihat; tidak ada perubahan yang diterapkan.')}</p>
    <p class="vq-summary" role="status">${tr('{n} catatan diperiksa',{n:p.visibleNotes})} · ${total ? tr('{n} temuan',{n:total}) : tr('Vault tampak sehat')}</p>
    ${section(tr('Judul ganda'),p.duplicates,x=>`<li><b>${esc(x.title)}</b> · ${tr('{n} catatan',{n:x.notes.length})}</li>`)}
    ${section(tr('Catatan kosong'),p.emptyNotes,x=>`<li>${esc(x.title || tr('Tanpa judul'))} <code>${esc(x.id)}</code></li>`)}
    ${section(tr('Wikilink tanpa sasaran'),p.brokenLinks,x=>`<li><b>${esc(x.target)}</b> — ${esc(x.noteTitle || tr('Tanpa judul'))}</li>`)}
    <p class="vq-foot">${tr('Catatan terkunci tidak diperiksa isinya. Tautan ke catatan terkunci tetap dianggap memiliki sasaran.')}</p>`;
  openPop(popShell(tr('Kesehatan vault'),body));
  document.querySelector('#pop .vq-dialog')?.focus();
}

function tampilkanInventaris(list, yakinId = '') {
  const orphans = list.filter(x => x.deletable);
  const body = `<p>${tr('{n} lampiran ditemukan',{n:list.length})} · ${tr('{n} dapat diunduh',{n:list.length})}. ${tr('Berkas yang dirujuk catatan dan data sampingan sistem tidak dapat dihapus dari sini.')}</p>
    ${!list.length ? `<p class="vq-ok">${tr('Tidak ada lampiran lokal.')}</p>` : `<div class="vq-list" role="list">${list.map(x=>`<article class="vq-attachment" role="listitem">
      <div class="vq-attachment-info"><b>${esc(x.id)}</b><span>${esc(x.type)} · ${ukuranTerbaca(x.size)}${x.auxiliary?` · ${tr('Data sampingan')}`:x.referenced?` · ${tr('Dipakai')}`:` · ${tr('Tidak dirujuk')}`}</span></div>
      <button type="button" class="btn btn-sec" data-vq-download="${esc(x.id)}" aria-label="${tr('Unduh lampiran')} ${esc(x.id)}">${tr('Unduh')}</button>
      ${x.deletable ? (yakinId===x.id ? `<div class="vq-confirm" role="group" aria-label="${tr('Konfirmasi penghapusan')}"><span>${tr('Hapus permanen?')}</span><button type="button" class="btn btn-danger" data-vq-delete="${esc(x.id)}">${tr('Ya, hapus')}</button><button type="button" class="btn btn-sec" data-vq-cancel>${tr('Batal')}</button></div>` : `<button type="button" class="btn btn-sec" data-vq-confirm="${esc(x.id)}">${tr('Hapus…')}</button>`) : ''}
    </article>`).join('')}</div>`}
    <p class="vq-foot">${tr('{n} berkas tidak dirujuk dapat ditinjau; penghapusan memerlukan konfirmasi kedua.',{n:orphans.length})}</p>`;
  openPop(popShell(tr('Pusat lampiran'),body));
  document.querySelector('#pop .vq-dialog')?.focus();
}

export async function bukaPusatLampiran() {
  try { tampilkanInventaris(await inventarisLampiran()); }
  catch { toast(tr('Gagal membaca daftar lampiran')); }
}

export function bindVaultTools() {
  document.addEventListener('click', async e => {
    const dl=e.target.closest('[data-vq-download]');
    if(dl){
      const blob=await ambilBlob(dl.dataset.vqDownload).catch(()=>null);
      if(!blob){toast(tr('Berkas lampiran tidak ditemukan'));return;}
      const a=document.createElement('a'), url=URL.createObjectURL(blob);
      a.href=url;a.download=dl.dataset.vqDownload;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;
    }
    const c=e.target.closest('[data-vq-confirm]');
    if(c){try{tampilkanInventaris(await inventarisLampiran(),c.dataset.vqConfirm);}catch{toast(tr('Gagal membaca daftar lampiran'));}return;}
    if(e.target.closest('[data-vq-cancel]')){try{tampilkanInventaris(await inventarisLampiran());}catch{}return;}
    const del=e.target.closest('[data-vq-delete]');
    if(del){
      const id=del.dataset.vqDelete;
      /* Verifikasi ulang tepat sebelum hapus; jangan menghapus jika baru
         direferensikan oleh catatan atau merupakan data sampingan. */
      const item=(await inventarisLampiran()).find(x=>x.id===id);
      if(!item?.deletable){toast(tr('Lampiran sekarang dirujuk dan tidak dapat dihapus'));return;}
      await hapusBlob(id);toast(tr('Lampiran dihapus'));await bukaPusatLampiran();return;
    }
  });
  document.addEventListener('keydown',e=>{
    const p=document.querySelector('#pop [role="dialog"][aria-modal="true"]');
    if(!p)return;
    if(e.key==='Escape'){e.preventDefault();closeAll();document.querySelector('#dots')?.focus();return;}
    if(e.key!=='Tab')return;
    const fokus=Array.from(p.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'));
    if(!fokus.length){e.preventDefault();p.focus();return;}
    const pertama=fokus[0],terakhir=fokus[fokus.length-1];
    if(e.shiftKey&&(document.activeElement===pertama||document.activeElement===p)){e.preventDefault();terakhir.focus();}
    else if(!e.shiftKey&&document.activeElement===terakhir){e.preventDefault();pertama.focus();}
  });
}
