/* Kilas balik — "hari ini di tahun-tahun lalu" (Peta Master Bagian 5).

   Catatan lama yang dibuat pada tanggal & bulan yang sama ikut muncul
   kembali di layar Catatan. Tujuannya sederhana: jurnal dan catatan
   setahun lalu jarang dicari orang, padahal justru di situ banyak hal
   yang layak dibaca ulang.

   Aturan privasi sama dengan seluruh daftar: catatan terkunci yang
   belum dibuka sesi ini tidak pernah muncul (terlihat(n)), begitu pula
   arsip dan sampah. Tanggal yang dipakai adalah createdAt — tanggal
   catatan lahir — bukan updatedAt, supaya hasilnya tidak berpindah
   setiap kali catatan lama disunting. */

import { state } from '../core/store.js?v=20261024171500';
import { esc } from '../core/dom.js?v=20261024171500';
import { t as tr } from '../core/i18n.js?v=20261024171500';
import { terlihat } from './kunci.js?v=20261024171500';
import { excerptOf } from './note-model.js?v=20261024171500';

const MAKS = 6;

export function catatanKilasBalik(daftar = state.notes, sekarang = new Date()) {
  const bulan = sekarang.getMonth();
  const tgl = sekarang.getDate();
  const tahunIni = sekarang.getFullYear();
  const hasil = [];

  (Array.isArray(daftar) ? daftar : []).forEach(n => {
    if (!n || n.deletedAt || n.archived) return;
    if (!terlihat(n)) return;
    const ts = Number(n.createdAt) || Number(n.updatedAt) || 0;
    if (!ts) return;
    const d = new Date(ts);
    if (d.getMonth() !== bulan || d.getDate() !== tgl) return;
    if (d.getFullYear() >= tahunIni) return;
    hasil.push({ n, tahun: d.getFullYear() });
  });

  return hasil.sort((a, b) => b.tahun - a.tahun).slice(0, MAKS);
}

export function renderKilasBalikHtml(daftar = state.notes, sekarang = new Date()) {
  const hasil = catatanKilasBalik(daftar, sekarang);
  if (!hasil.length) return '';

  const baris = hasil.map(({ n, tahun }) => {
    const judul = esc((n.title || '').trim() || tr('Tanpa judul'));
    const cuplik = esc(excerptOf(n, 64));
    return `<button type="button" class="kb-row" data-open="${esc(n.id)}"
      title="${tr('Buka catatan dari {tahun}', { tahun })}">
      <span class="kb-rail"><i class="kb-dot" aria-hidden="true"></i><span class="kb-year">${tahun}</span></span>
      <span class="kb-teks">
        <span class="kb-judul">${judul}</span>
        ${cuplik ? `<span class="kb-cuplik">${cuplik}</span>` : ''}
      </span>
      <svg class="ico kb-go" aria-hidden="true"><use href="#i-chev"/></svg>
    </button>`;
  }).join('');

  return `<section class="kb-card" id="kilas-balik">
    <div class="kb-top" data-kb-toggle>
      <span class="kb-ico" aria-hidden="true"><svg class="ico"><use href="#i-history"/></svg></span>
      <span class="kb-ttl">
        <b>${tr('Kilas balik')}</b>
        <i>${tr('Hari ini di tahun-tahun lalu')}</i>
      </span>
      <span class="kb-n">${hasil.length}</span>
      <button type="button" class="kb-fold" data-kb-toggle aria-expanded="true"
        title="${tr('Lipat kartu')}" aria-label="${tr('Lipat kartu')}">
        <svg class="ico" aria-hidden="true"><use href="#i-chev"/></svg>
      </button>
    </div>
    <div class="kb-isi">${baris}</div>
  </section>`;
}

export function bindKilasBalik() {
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-kb-toggle]');
    if (!b) return;
    const kartu = b.closest('.kb-card');
    if (!kartu) return;
    const lipat = kartu.classList.toggle('lipat');
    const tombol = kartu.querySelector('.kb-fold');
    if (tombol) {
      tombol.setAttribute('aria-expanded', String(!lipat));
      tombol.title = lipat ? tr('Buka kartu') : tr('Lipat kartu');
      tombol.setAttribute('aria-label', tombol.title);
    }
  });
}
