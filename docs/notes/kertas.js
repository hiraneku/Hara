/* Latar kertas per catatan (B7a).

   Pilihan: Polos (bawaan, tanpa latar), Titik, Garis buku, dan Grid.
   Disimpan di catatan sebagai `kertas` HANYA bila bukan polos, sama seperti
   `cover`, sehingga catatan lama tidak berubah. Latar digambar CSS di `.ed-doc`;
   isi blok tidak disentuh. Templat isi (templat.js) tidak ikut menyimpan latar. */

import { state, save } from '../core/store.js?v=20261025050736';
import { touch, KERTAS_JENIS, kelasKertas } from './note-model.js?v=20261025050736';
import { openPop, closeAll } from './menus/pop.js?v=20261025050736';
import { toast } from '../core/toast.js?v=20261025050736';
import { esc } from '../core/dom.js?v=20261025050736';
import { t as tr } from '../core/i18n.js?v=20261025050736';

const PILIHAN = [
  ['polos', 'Polos'],
  ['titik', 'Titik'],
  ['garis', 'Garis buku'],
  ['grid', 'Grid'],
];

/* Atur latar satu catatan. jenis 'polos' (atau kosong) menghapus latar.
   Mengembalikan false bila catatan tidak ada atau jenisnya tidak dikenal. */
export function setKertasCatatan(noteId, jenis) {
  const n = state.notes.find(x => x.id === noteId);
  if (!n) return false;
  if (jenis && jenis !== 'polos' && !KERTAS_JENIS.includes(jenis)) return false;
  if (!jenis || jenis === 'polos') delete n.kertas;
  else n.kertas = jenis;
  touch(n);
  save();
  sinkronKertasDOM();
  return true;
}

/* Terapkan latar catatan yang sedang dibuka ke elemen .ed-doc. */
export function sinkronKertasDOM() {
  const el = document.querySelector('.ed-doc');
  if (!el) return;
  const n = state.notes.find(x => x.id === state.openId);
  KERTAS_JENIS.forEach(j => el.classList.remove(kelasKertas(j)));
  const kelas = n ? kelasKertas(n.kertas) : '';
  if (kelas) el.classList.add(kelas);
}

let penangkapPilihan = null;

export function bukaDialogKertasCatatan() {
  const n = state.notes.find(x => x.id === state.openId);
  if (!n) return;
  const kini = KERTAS_JENIS.includes(n.kertas) ? n.kertas : 'polos';
  const html = `<div class="pop-h">${tr('Latar kertas catatan')}</div>
    <div style="padding:8px 12px;display:flex;flex-direction:column;gap:8px">
      ${PILIHAN.map(([kode, nama]) => `
        <button type="button" class="pop-i${kini === kode ? ' sel' : ''}" data-kertas-pick="${kode}">
          ${esc(tr(nama))}
        </button>`).join('')}
    </div>`;
  openPop(html, document.getElementById('morebtn') || document.querySelector('.ed-doc'));
  const pop = document.getElementById('pop');
  /* satu penangkap saja: dibuka ulang tidak menumpuk pendengar lama */
  if (pop && penangkapPilihan) pop.removeEventListener('click', penangkapPilihan);
  penangkapPilihan = e => {
    const pick = e.target.closest('[data-kertas-pick]');
    if (!pick) return;
    setKertasCatatan(n.id, pick.dataset.kertasPick);
    closeAll();
    toast(tr('Latar kertas diperbarui'));
  };
  if (pop) pop.addEventListener('click', penangkapPilihan);
}
