/**
 * UI fitur lanjutan catatan (Ronde 12): K15 baca keras & dikte, K18 cadangan
 * terenkripsi, K31 tenggat → tugas, K19 tabel properti. Dibuka dari palette.
 * Logika ada di modul masing-masing (suara.js, enkripsi.js, pengingat.js, dll.).
 */

import { state, save } from '../core/store.js?v=20261010054709';
import { go } from '../core/router.js?v=20261010054709';
import { toast } from '../core/toast.js?v=20261010054709';
import { t as tr, bahasaSekarang } from '../core/i18n.js?v=20261010054709';
import { bacaKeras, hentikanBaca, mulaiDikte, tersediaDikte } from '../core/suara.js?v=20261010054709';
export { hentikanBaca };
import { buatCadanganTerenkripsi, bukaCadanganTerenkripsi, adalahCadanganTerenkripsi, MIN_FRASA } from '../core/enkripsi.js?v=20261010054709';
import { makeNote, plainText } from './note-model.js?v=20261010054709';
import { openNote } from './model.js?v=20261010054709';
import { waktuTenggat } from './pengingat.js?v=20261010054709';
import { cadanganJson, siapImporJson, terapkanImporJson, unduh, namaHariIni } from './data-io.js?v=20261010054709';
import { openPop, closeAll } from './menus/pop.js?v=20261010054709';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const KODE_BAHASA = { id: 'id-ID', en: 'en-US', ja: 'ja-JP' };
const bahasaUcap = () => KODE_BAHASA[bahasaSekarang()] || 'id-ID';

function catatanBuka() {
  return state.notes.find(n => n.id === state.openId) || null;
}

/* ───────── K15 · baca keras & dikte ───────── */

export async function bacaCatatanKeras() {
  const n = catatanBuka();
  if (!n) { toast(tr('Buka catatan dulu')); return; }
  const teks = [n.title, plainText(n)].filter(Boolean).join('. ');
  const ok = await bacaKeras(teks, { bahasa: bahasaUcap() });
  if (!ok) toast(tr('Baca keras tidak tersedia di perangkat ini'));
}

/** Dikte → catatan baru berisi hasilnya (pola sama dengan newNote). */
export function dikteCatatanBaru() {
  if (!tersediaDikte()) { toast(tr('Dikte tidak tersedia di perangkat ini')); return; }
  toast(tr('Mendengarkan…'));
  const kontrol = mulaiDikte({
    bahasa: bahasaUcap(),
    onHasil: teks => {
      const n = makeNote({
        title: tr('Dikte'),
        blocks: [{ type: 'paragraph', content: esc(teks) }],
      });
      state.seq++;
      state.notes.unshift(n);
      state.openId = n.id;
      save();
      go('editor');
      toast(tr('Dikte disimpan sebagai catatan baru'));
    },
    onGagal: e => toast(tr('Dikte gagal: ') + (e && e.message ? e.message : '')),
  });
  if (!kontrol) toast(tr('Dikte tidak tersedia di perangkat ini'));
}

/* ───────── K18 · cadangan terenkripsi ───────── */

export function bukaCadanganTerenkripsiDialog() {
  openPop(`
    <div class="rn-modal-box" style="max-width:460px">
      <h3 class="rn-modal-title">${tr('Cadangan terenkripsi')}</h3>
      <p style="font-size:12.5px;color:var(--muted)">${tr('Frasa sandi tidak bisa dipulihkan. Simpan baik-baik. Minimal {n} karakter.', { n: MIN_FRASA })}</p>
      <input type="password" class="rn-input-text" id="cad-frasa" placeholder="${tr('Frasa sandi')}" style="width:100%">
      <input type="password" class="rn-input-text" id="cad-frasa2" placeholder="${tr('Ulangi frasa sandi')}" style="width:100%;margin-top:6px">
      <div class="rn-actions-top" style="justify-content:flex-end;margin-top:12px;gap:6px">
        <button class="btn btn-sec" data-pop-close>${tr('Batal')}</button>
        <button class="btn btn-pri" id="cad-unduh">${tr('Unduh cadangan')}</button>
      </div>
    </div>`);
  document.getElementById('cad-unduh').onclick = async () => {
    const a = document.getElementById('cad-frasa').value;
    const b = document.getElementById('cad-frasa2').value;
    if (a.length < MIN_FRASA) { toast(tr('Frasa sandi minimal {n} karakter', { n: MIN_FRASA })); return; }
    if (a !== b) { toast(tr('Frasa sandi tidak sama')); return; }
    const { teks } = await cadanganJson();
    const isi = await buatCadanganTerenkripsi(teks, a);
    unduh(`hara-cadangan-terenkripsi-${namaHariIni()}.json`, isi, 'application/json');
    closeAll();
    toast(tr('Cadangan terenkripsi diunduh'));
  };
}

export function pilihCadanganTerenkripsiUntukPulih() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.onchange = async () => {
    const berkas = input.files && input.files[0];
    if (!berkas) return;
    const teks = await berkas.text();
    if (!adalahCadanganTerenkripsi(teks)) { toast(tr('Bukan cadangan terenkripsi Hara')); return; }
    openPop(`
      <div class="rn-modal-box" style="max-width:460px">
        <h3 class="rn-modal-title">${tr('Pulihkan cadangan terenkripsi')}</h3>
        <input type="password" class="rn-input-text" id="pulih-frasa" placeholder="${tr('Frasa sandi')}" style="width:100%">
        <div class="rn-actions-top" style="justify-content:flex-end;margin-top:12px;gap:6px">
          <button class="btn btn-sec" data-pop-close>${tr('Batal')}</button>
          <button class="btn btn-pri" id="pulih-jalan">${tr('Pulihkan (gabung)')}</button>
        </div>
      </div>`);
    document.getElementById('pulih-jalan').onclick = async () => {
      const frasa = document.getElementById('pulih-frasa').value;
      try {
        const isi = await bukaCadanganTerenkripsi(teks, frasa);
        const r = await siapImporJson(isi);
        await terapkanImporJson(r, 'gabung');
        closeAll();
        toast(tr('Cadangan dipulihkan (digabung)'));
      } catch (e) {
        toast(e.message);
      }
    };
  };
  input.click();
}

/* ───────── K31 · tenggat → tugas dalam sekali langkah ───────── */

export function jadikanBarisTenggatTugas() {
  const n = catatanBuka();
  if (!n) { toast(tr('Buka catatan dulu')); return; }
  let jumlah = 0;
  for (const b of n.blocks) {
    if (b.type !== 'paragraph') continue;
    const teks = plainText({ blocks: [b] });
    if (!waktuTenggat(teks)) continue;
    b.type = 'todo';
    b.meta = { ...(b.meta || {}), checked: false };
    jumlah++;
  }
  if (jumlah === 0) { toast(tr('Tidak ada baris dengan tenggat')); return; }
  n.updatedAt = Date.now();
  save();
  openNote(n.id);
  toast(tr('{n} baris jadi tugas', { n: jumlah }));
}

/* ───────── K19 · tabel properti (catatan dengan props) ───────── */

export function bukaTabelProperti() {
  const aktif = state.notes.filter(n => !n.deletedAt && !n.archived && Array.isArray(n.props) && n.props.length);
  const kolom = [...new Set(aktif.flatMap(n => n.props.map(p => p.k)).filter(Boolean))];
  const baris = aktif.map(n => `<tr><td><a href="#" data-buka="${esc(n.id)}">${esc(n.title || tr('Tanpa judul'))}</a></td>${kolom.map(k => {
    const p = n.props.find(x => x.k === k);
    return `<td>${esc(p ? p.v : '')}</td>`;
  }).join('')}</tr>`).join('');
  openPop(`
    <div class="rn-modal-box" style="max-width:640px;max-height:80vh;overflow:auto">
      <h3 class="rn-modal-title">${tr('Tabel properti')}</h3>
      ${aktif.length === 0
        ? `<p style="font-size:12.5px;color:var(--muted)">${tr('Belum ada catatan dengan properti.')}</p>`
        : `<table style="width:100%;font-size:12.5px;border-collapse:collapse">
            <thead><tr><th style="text-align:left">${tr('Catatan')}</th>${kolom.map(k => `<th style="text-align:left">${esc(k)}</th>`).join('')}</tr></thead>
            <tbody>${baris}</tbody></table>`}
    </div>`);
  document.getElementById('pop').onclick = e => {
    const a = e.target.closest('[data-buka]');
    if (a) { e.preventDefault(); closeAll(); openNote(a.dataset.buka); }
  };
}

/* ───────── K30 · sumber pencarian lintas modul (dipakai palette) ───────── */

export function sumberTugasTerbuka() {
  const hasil = [];
  for (const n of state.notes) {
    if (n.deletedAt || n.archived) continue;
    for (const b of n.blocks || []) {
      if (b.type === 'todo' && !(b.meta && b.meta.checked)) {
        const t = plainText({ blocks: [b] }).trim();
        if (t) hasil.push({ id: 'tugas-' + b.id, label: t, hint: tr('Tugas'), cari: n.title || '', jalan: () => openNote(n.id) });
      }
    }
  }
  return hasil;
}
