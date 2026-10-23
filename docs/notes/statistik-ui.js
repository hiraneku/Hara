/* Dialog statistik (K20): heatmap jurnal & tugas selesai, grafik per minggu,
   rentetan jurnal. Dibuka dari command palette. Logika ada di statistik.js. */

import { state } from '../core/store.js?v=20261023155617';
import { t as tr } from '../core/i18n.js?v=20261023155617';
import { aktivitasHarian, tugasSelesaiPerMinggu, rentetanJurnal, tingkatIntensitas } from './statistik.js?v=20261023155617';

const OPASITAS = [0, 0.25, 0.5, 0.75, 1];
const HARI_HURUF = ['S', 'S', 'R', 'K', 'J', 'S', 'M'];

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function htmlStatistik(notes = state.notes, sekarang = Date.now()) {
  const hari = aktivitasHarian(notes, { hari: 182, sekarang });
  const maks = Math.max(1, ...hari.map(h => h.total));
  // Kolom = minggu; baris = hari Senin..Minggu. Kosong di awal agar hari pertama jatuh di baris yang benar.
  const offset = (new Date(hari[0].tanggal + 'T00:00:00').getDay() + 6) % 7;
  const sel = Array(offset).fill(null).concat(hari);
  while (sel.length % 7) sel.push(null);
  let kisi = '';
  for (let i = 0; i < sel.length; i++) {
    const h = sel[i];
    if (!h) { kisi += '<span></span>'; continue; }
    const lv = tingkatIntensitas(h.total, maks);
    const judul = `${h.tanggal}: ${h.tugas} ${tr('tugas selesai')}, ${h.jurnal} ${tr('jurnal')}`;
    kisi += `<span class="stat-sel" title="${esc(judul)}" style="opacity:${OPASITAS[lv] || 0.12}"></span>`;
  }
  const mingguan = tugasSelesaiPerMinggu(notes, { minggu: 12, sekarang });
  const maksMinggu = Math.max(1, ...mingguan.map(w => w.jumlah));
  const bar = mingguan.map(w => `
    <div class="stat-bar-col" title="${esc(w.mulai)}: ${w.jumlah}">
      <div class="stat-bar" style="height:${Math.round((w.jumlah / maksMinggu) * 100)}%"></div>
      <span>${w.jumlah}</span>
    </div>`).join('');
  const rentetan = rentetanJurnal(notes, { sekarang });
  const totalTugas = hari.reduce((a, h) => a + h.tugas, 0);
  const totalJurnal = hari.reduce((a, h) => a + h.jurnal, 0);

  return `
  <div class="stat-box" role="dialog" aria-modal="true" aria-label="${esc(tr('Statistik & heatmap'))}">
    <div class="stat-head">
      <h3>${tr('Statistik & heatmap')}</h3>
      <button class="btn btn-sec" data-stat-tutup aria-label="${esc(tr('Tutup'))}">✕</button>
    </div>
    <div class="stat-ringkas">
      <div><b>${rentetan}</b><span>${tr('hari jurnal berturut-turut')}</span></div>
      <div><b>${totalTugas}</b><span>${tr('tugas selesai (26 minggu)')}</span></div>
      <div><b>${totalJurnal}</b><span>${tr('entri jurnal (26 minggu)')}</span></div>
    </div>
    <h4>${tr('Aktivitas harian')}</h4>
    <div class="stat-kisi" style="grid-template-columns: repeat(${Math.ceil(sel.length / 7)}, 12px)">${kisi}</div>
    <div class="stat-hari">${HARI_HURUF.map(h => `<span>${h}</span>`).join('')}</div>
    <h4>${tr('Tugas selesai per minggu (12 minggu)')}</h4>
    <div class="stat-bar-wrap">${bar}</div>
  </div>`;
}

export function bukaStatistik() {
  let el = document.getElementById('stat-overlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'stat-overlay';
    el.className = 'stat-overlay';
    el.addEventListener('click', e => {
      if (e.target === el || e.target.closest('[data-stat-tutup]')) tutupStatistik();
    });
    document.body.appendChild(el);
  }
  el.innerHTML = htmlStatistik();
  el.hidden = false;
  el.querySelector('[data-stat-tutup]')?.focus();
  document.addEventListener('keydown', tanganiEsc);
}

export function tutupStatistik() {
  const el = document.getElementById('stat-overlay');
  if (el) el.hidden = true;
  document.removeEventListener('keydown', tanganiEsc);
}

function tanganiEsc(e) {
  if (e.key === 'Escape') tutupStatistik();
}
