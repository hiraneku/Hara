/* MB1 · Tampilan papan Kanban & kalender (K19) di atas papan-logika.js.

   Dipanggil dari modal "Tabel properti" (fitur-lanjutan-ui.js). Modul ini
   hanya membuat HTML dan mengubah properti catatan lewat aturProp; penanganan
   klik ada di pemanggil. Status tampilan (kelompok, bulan, hari terpilih)
   disimpan di sini agar tetap ada saat modal digambar ulang. */
import { state, save } from '../core/store.js?v=20261025071610';
import { esc } from '../core/dom.js?v=20261025071610';
import { t as tr, bahasaSekarang } from '../core/i18n.js?v=20261025071610';
import { touch } from './note-model.js?v=20261025071610';
import { aturProp, KET_PROP, namaProp } from './meta-ui.js?v=20261025071610';
import * as L from './papan-logika.js?v=20261025071610';

const sekarang = new Date();
const tampilan = {
  kelompok: 'status',                 /* properti pengelompok Kanban */
  kalKunci: '',                       /* properti sumbu kalender (kosong = otomatis) */
  tahun: sekarang.getFullYear(),
  bulan0: sekarang.getMonth(),
  hari: '',                           /* 'YYYY-MM-DD' yang dibuka di kalender */
};

/* Semua kunci properti yang dipakai catatan aktif. Kunci bawaan lebih dulu. */
export function kunciTersedia(aktif) {
  const ada = new Set(aktif.flatMap(n => (n.props || []).map(p => p.k)).filter(Boolean));
  const bawaan = Object.keys(KET_PROP).filter(k => ada.has(k));
  const lain = [...ada].filter(k => !(k in KET_PROP)).sort();
  return [...bawaan, ...lain];
}

/* ── Kanban ───────────────────────────────────────────────────────────── */

export function htmlKanban(aktif) {
  const kunci = kunciTersedia(aktif);
  const k = kunci.includes(tampilan.kelompok) ? tampilan.kelompok : (kunci[0] || 'status');
  tampilan.kelompok = k;
  const urutan = (KET_PROP[k] && KET_PROP[k].contoh) || [];
  const kolom = L.kelompokKanban(aktif, k, urutan);
  const label = c => c.nilai || tr('(kosong)');

  const pilihKelompok = `<label class="papan-bar" style="display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--muted);margin:4px 0 8px">
    ${tr('Kelompokkan menurut')}
    <select class="rn-input-text" data-papan-kelompok style="height:30px;font-size:12.5px">
      ${kunci.map(x => `<option value="${esc(x)}"${x === k ? ' selected' : ''}>${esc(namaProp(x))}</option>`).join('')}
    </select></label>`;

  const kartu = (n, c) => {
    const lain = kolom.filter(x => x !== c);
    return `<div class="kb-card">
      <a href="#" class="kb-title" data-buka="${esc(n.id)}">${esc(n.title || tr('Tanpa judul'))}</a>
      <div class="kb-move">${lain.map(t =>
        `<button type="button" class="kb-mv-btn" data-kb-id="${esc(n.id)}" data-kb-k="${esc(k)}" data-kb-st="${esc(t.nilai)}">→ ${esc(label(t))}</button>`
      ).join('')}</div>
    </div>`;
  };

  return `${pilihKelompok}
    <div class="kb-board">
      ${kolom.map(c => `<div class="kb-col">
        <div class="kb-head"><span>${esc(label(c))}</span><span class="chip">${c.notes.length}</span></div>
        <div class="kb-list">${c.notes.map(n => kartu(n, c)).join('') || '<span class="kb-empty">—</span>'}</div>
      </div>`).join('')}
    </div>`;
}

/* Pindahkan catatan ke kolom lain: cukup ubah satu properti. */
export function pindahKeKolom(id, k, nilai) {
  const n = state.notes.find(x => x.id === id);
  if (!n) return false;
  aturProp(n, k, nilai);
  touch(n);
  save();
  return true;
}

/* ── Kalender ─────────────────────────────────────────────────────────── */

const lokal = () => (bahasaSekarang() === 'ja' ? 'ja-JP' : 'id-ID');

function namaBulan(tahun, bulan0) {
  return new Date(Date.UTC(tahun, bulan0, 15)).toLocaleDateString(lokal(), { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/* 2026-01-05 adalah Senin: dipakai untuk mengambil nama hari pendek */
function namaHariPendek() {
  const out = [];
  for (let i = 0; i < 7; i++) {
    out.push(new Date(Date.UTC(2026, 0, 5 + i)).toLocaleDateString(lokal(), { weekday: 'short', timeZone: 'UTC' }));
  }
  return out;
}

export function htmlKalender(aktif) {
  const kunci = L.kunciTanggalTersedia(aktif);
  if (!kunci.length) {
    return `<p class="papan-kosong" style="font-size:12.5px;color:var(--muted)">${tr('Belum ada catatan dengan tanggal. Isi properti Tenggat atau Tanggal dengan format YYYY-MM-DD.')}</p>`;
  }
  const k = kunci.includes(tampilan.kalKunci) ? tampilan.kalKunci : kunci[0];
  tampilan.kalKunci = k;
  const peta = L.catatanPerHari(aktif, k);
  const { minggu } = L.gridBulan(tampilan.tahun, tampilan.bulan0);
  const hariIni = `${sekarang.getFullYear()}-${String(sekarang.getMonth() + 1).padStart(2, '0')}-${String(sekarang.getDate()).padStart(2, '0')}`;

  const pilihSumbu = `<select class="rn-input-text" data-kal-kunci style="height:30px;font-size:12.5px">
      ${kunci.map(x => `<option value="${esc(x)}"${x === k ? ' selected' : ''}>${esc(namaProp(x))}</option>`).join('')}
    </select>`;
  const navBtn = (langkah, ikon) => `<button type="button" class="iconbtn" data-kal-geser="${langkah}" aria-label="${langkah < 0 ? tr('Bulan sebelumnya') : tr('Bulan berikutnya')}" style="width:30px;height:30px">${ikon}</button>`;

  const baris = minggu.map(baris => `<tr>${baris.map(s => {
    if (!s.tgl) return '<td></td>';
    const daftar = peta.get(s.tgl) || [];
    const terpilih = s.tgl === tampilan.hari;
    return `<td><button type="button" class="kal-hari${terpilih ? ' on' : ''}${s.tgl === hariIni ? ' kini' : ''}" data-kal-hari="${s.tgl}"
      style="width:100%;min-height:44px;border:1px solid var(--border);border-radius:8px;background:${terpilih ? 'var(--accent-weak)' : 'var(--surface)'};padding:4px;font-size:12px;cursor:pointer">
      <span style="display:block;text-align:left">${s.hari}</span>
      ${daftar.length ? `<span class="chip chip-a" style="font-size:10.5px">${daftar.length}</span>` : ''}
    </button></td>`;
  }).join('')}</tr>`).join('');

  let rincian = '';
  if (tampilan.hari) {
    const isi = peta.get(tampilan.hari) || [];
    rincian = `<div style="margin-top:10px"><div class="overline" style="margin:0 0 6px">${esc(tampilan.hari)}</div>
      ${isi.length ? isi.map(n => `<div class="kb-card"><a href="#" class="kb-title" data-buka="${esc(n.id)}">${esc(n.title || tr('Tanpa judul'))}</a></div>`).join('')
        : `<p style="font-size:12.5px;color:var(--muted)">${tr('Tidak ada catatan di hari ini.')}</p>`}</div>`;
  }

  return `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin:4px 0 8px;flex-wrap:wrap">
      ${navBtn(-1, '‹')}
      <strong style="font-size:13.5px">${esc(namaBulan(tampilan.tahun, tampilan.bulan0))}</strong>
      ${navBtn(1, '›')}
      <label style="display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--muted)">${tr('Sumbu')} ${pilihSumbu}</label>
    </div>
    <table style="width:100%;border-collapse:separate;border-spacing:3px;table-layout:fixed">
      <thead><tr>${namaHariPendek().map(h => `<th style="font-size:11px;color:var(--muted);font-weight:600">${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${baris}</tbody>
    </table>${rincian}`;
}

export function geserKalender(langkah) {
  const t = new Date(Date.UTC(tampilan.tahun, tampilan.bulan0 + langkah, 1));
  tampilan.tahun = t.getUTCFullYear();
  tampilan.bulan0 = t.getUTCMonth();
  tampilan.hari = '';
}

export function pilihHariKalender(tgl) {
  tampilan.hari = tampilan.hari === tgl ? '' : tgl;
}

export function setKelompok(k) { tampilan.kelompok = k; }
export function setKalenderKunci(k) { tampilan.kalKunci = k; tampilan.hari = ''; }

/* untuk tes */
export const _uji = { tampilan };
