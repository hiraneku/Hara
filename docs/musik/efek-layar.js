/* Layar "Efek & Visual" (view 'musik-efek'): menu pilihan untuk efek pemutar.
   - Ekualiser: view 'musik-eq'.
   - Effect: view 'musik-effect', tujuh efek dalam satu kategori (Spatial & Ambience).
   - Visualizer: disiapkan sebagai pilihan, belum berfungsi ("Segera hadir"). */

import { cur, go } from '../core/router.js?v=20261030100000';
import { t as tr } from '../core/i18n.js?v=20261030100000';
import { esc } from '../core/dom.js?v=20261030100000';
import { ikon } from './ikon.js?v=20261030100000';
import { EFEK, EFEK_KATEGORI, efekById, semuaParam, formatNilai } from './efek-data.js?v=20261030100000';
import { ambilEfek, ubahEfek } from './efek.js?v=20261030100000';

const PILIHAN = [
  { id: 'eq', judul: 'Ekualiser', sub: '10 pita, preamp, dan preset', ikon: 'eq', tersedia: true },
  { id: 'effect', judul: 'Effect', sub: 'Spatial & Ambience: reverb, echo, delay, dan lainnya', ikon: 'effect', tersedia: true },
  { id: 'visual', judul: 'Visualizer', sub: 'Tampilan visual yang mengikuti musik', ikon: 'visual', tersedia: false },
];

/* Efek yang panelnya sedang terbuka (hanya di memori layar). */
const TERBUKA = new Set();

export function efekView() {
  const daftar = PILIHAN.map(x => `<button type="button" class="mus-efek-item" data-efek="${x.id}"${x.tersedia ? '' : ' disabled'}>
      <span class="mus-efek-ikon">${ikon(x.ikon)}</span>
      <span class="mus-efek-teks"><span class="mus-efek-judul">${tr(x.judul)}</span><span class="mus-efek-sub">${tr(x.sub)}</span></span>
      ${x.tersedia ? ikon('chev', 'mus-chev') : `<span class="mus-efek-badge">${tr('Segera hadir')}</span>`}
    </button>`).join('');
  return `<div class="mus mus-set" data-mus-root>
    <header class="mus-set-kepala">
      <span class="mus-set-ikon">${ikon('eq')}</span>
      <div><h2 class="mus-set-h">${tr('Efek & Visual')}</h2>
      <p class="mus-catatan">${tr('Pilih efek yang ingin diatur')}</p></div>
    </header>
    <div class="mus-efek-daftar">${daftar}</div>
  </div>`;
}

function kontrolHtml(efek, p, param) {
  const nilai = p[param.id];
  if (param.tipe === 'pilihan') {
    const pilihan = param.opsi.map(o => `<button type="button" class="mus-pg-opsi${o === nilai ? ' on' : ''}" data-fx-pilih="${esc(param.id)}" data-id="${esc(efek.id)}" data-nilai="${esc(o)}">${esc(formatNilai(param, o))}</button>`).join('');
    return `<div class="mus-fx-kontrol">
      <div class="mus-fx-kepala"><span>${esc(param.nama)}</span></div>
      <div class="mus-pg-seg mus-fx-seg">${pilihan}</div>
    </div>`;
  }
  return `<div class="mus-fx-kontrol">
    <div class="mus-fx-kepala"><span>${esc(param.nama)}</span><output data-fx-out="${esc(efek.id)}.${esc(param.id)}">${esc(formatNilai(param, nilai))}</output></div>
    <input type="range" class="mus-range" min="${param.min}" max="${param.max}" step="${param.langkah}" value="${nilai}" data-fx-input="${esc(param.id)}" data-id="${esc(efek.id)}" aria-label="${esc(param.nama)}">
  </div>`;
}

function barisHtml(efek, st) {
  const buka = TERBUKA.has(efek.id);
  const utama = efek.utama.map(p => kontrolHtml(efek, st.p, p)).join('');
  const lanjutan = efek.lanjutan.length
    ? `<div class="mus-fx-sub-judul">${tr('Lanjutan')}</div>${efek.lanjutan.map(p => kontrolHtml(efek, st.p, p)).join('')}`
    : '';
  return `<div class="mus-fx${buka ? ' buka' : ''}${st.aktif ? '' : ' mati'}">
    <div class="mus-fx-baris">
      <div class="mus-fx-teks"><span class="mus-fx-judul">${esc(efek.nama)}</span><span class="mus-fx-sub">${esc(tr(efek.ringkas))}</span></div>
      <button type="button" class="mus-saklar${st.aktif ? ' on' : ''}" role="switch" aria-checked="${st.aktif}" aria-label="${esc(efek.nama)}" data-fx="aktif" data-id="${esc(efek.id)}"><span></span></button>
      <button type="button" class="mus-fx-panah${buka ? ' buka' : ''}" aria-expanded="${buka}" aria-label="${esc(tr('Atur'))} ${esc(efek.nama)}" data-fx="buka" data-id="${esc(efek.id)}">${ikon('chev')}</button>
    </div>
    ${buka ? `<div class="mus-fx-panel">${utama}${lanjutan}</div>` : ''}
  </div>`;
}

/* Layar Effect (view 'musik-effect'): tujuh efek, saklar on/off, dan panel pengaturan. */
export function effectView() {
  const set = ambilEfek();
  const aktifN = EFEK.filter(e => set[e.id].aktif).length;
  const baris = EFEK.map(e => barisHtml(e, set[e.id])).join('');
  return `<div class="mus mus-set" data-mus-root>
    <header class="mus-set-kepala">
      <span class="mus-set-ikon">${ikon('effect')}</span>
      <div><h2 class="mus-set-h">${tr('Effect')}</h2>
      <p class="mus-catatan">${tr('Boleh lebih dari satu efek aktif. Berlaku saat pemutaran.')}</p></div>
    </header>
    <div class="mus-pg">
      <section class="mus-pg-kartu mus-fx-kartu">
        <div class="mus-fx-kategori">
          <h3 class="mus-pg-judul">${esc(tr(EFEK_KATEGORI.nama))}</h3>
          <span class="mus-pg-sub">${aktifN} ${tr('aktif')}</span>
        </div>
        <div class="mus-fx-daftar">${baris}</div>
      </section>
      <p class="mus-catatan mus-fx-catatan">${tr('Efek hanya untuk pemutaran. Ekspor audio tidak memakai efek.')}</p>
    </div>
  </div>`;
}

function onClick(e) {
  if (cur !== 'musik-effect') return;
  const pilih = e.target.closest('[data-fx-pilih]');
  if (pilih) {
    ubahEfek(pilih.dataset.id, { p: { [pilih.dataset.fxPilih]: pilih.dataset.nilai } });
    go('musik-effect', { segar: true });
    return;
  }
  const b = e.target.closest('[data-fx]');
  if (!b) return;
  const id = b.dataset.id;
  if (!efekById(id)) return;
  if (b.dataset.fx === 'aktif') {
    ubahEfek(id, { aktif: !ambilEfek()[id].aktif });
  } else if (b.dataset.fx === 'buka') {
    if (TERBUKA.has(id)) TERBUKA.delete(id); else TERBUKA.add(id);
  } else {
    return;
  }
  go('musik-effect', { segar: true });
}

/* Geser slider: langsung diterapkan ke audio, tanpa menulis ulang layar. */
function onInput(e) {
  if (cur !== 'musik-effect') return;
  const el = e.target;
  if (!el.matches || !el.matches('[data-fx-input]')) return;
  const id = el.dataset.id;
  const pid = el.dataset.fxInput;
  const efek = efekById(id);
  const param = efek && semuaParam(efek).find(p => p.id === pid);
  if (!param) return;
  const st = ubahEfek(id, { p: { [pid]: Number(el.value) } });
  const keluaran = document.querySelector(`[data-fx-out="${id}.${pid}"]`);
  if (keluaran) keluaran.textContent = formatNilai(param, st[id].p[pid]);
}

export function pasangEfek() {
  document.addEventListener('click', e => {
    if (cur !== 'musik-efek') return;
    const b = e.target.closest('[data-efek]');
    if (!b || b.disabled) return;
    if (b.dataset.efek === 'eq') go('musik-eq');
    if (b.dataset.efek === 'effect') go('musik-effect');
  });
  document.addEventListener('click', onClick);
  document.addEventListener('input', onInput);
}
