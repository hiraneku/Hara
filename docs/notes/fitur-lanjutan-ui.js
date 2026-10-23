/**
 * UI fitur lanjutan catatan:
 * - K15 baca keras & dikte (dilindungi kunci PIN `terlihat`)
 * - K18 cadangan terenkripsi (AES-GCM-256)
 * - K31 tenggat → tugas (dengan flush() autosave terlebih dahulu)
 * - K19 tabel properti + Papan Kanban interaktif berbasis properti `status`
 * - Quick Capture (Tugas / Pengingat cepat dari tombol + atau menu ···)
 * - Pindah Ruang / Folder & Riwayat Versi Lokal Catatan
 */

import { state, save } from '../core/store.js?v=20261023162934';
import { go, cur } from '../core/router.js?v=20261023162934';
import { flush } from '../core/autosave.js?v=20261023162934';
import { toast } from '../core/toast.js?v=20261023162934';
import { stamp } from '../core/dom.js?v=20261023162934';
import { t as tr, bahasaSekarang } from '../core/i18n.js?v=20261023162934';
import { bacaKeras, hentikanBaca, mulaiDikte, tersediaDikte } from '../core/suara.js?v=20261023162934';
export { hentikanBaca };
import { buatCadanganTerenkripsi, bukaCadanganTerenkripsi, adalahCadanganTerenkripsi, MIN_FRASA } from '../core/enkripsi.js?v=20261023162934';
import { makeNote, makeBlock, plainText, touch } from './note-model.js?v=20261023162934';
import { openNote } from './model.js?v=20261023162934';
import { waktuTenggat } from './pengingat.js?v=20261023162934';
import { terlihat } from './kunci.js?v=20261023162934';
import { cadanganJson, siapImporJson, terapkanImporJson, unduh, namaHariIni } from './data-io.js?v=20261023162934';
import { openPop, closeAll } from './menus/pop.js?v=20261023162934';
import {
  daftarRuang, tambahRuang, pindahkanCatatanKeRuang,
  ambilVersiCatatan, pulihkanVersiCatatan,
} from './ruang.js?v=20261023162934';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const KODE_BAHASA = { id: 'id-ID', en: 'en-US', ja: 'ja-JP' };
const bahasaUcap = () => KODE_BAHASA[bahasaSekarang()] || 'id-ID';

function catatanBuka() {
  const n = state.notes.find(x => x.id === state.openId) || null;
  return n && terlihat(n) ? n : null;
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
        go(cur || 'notes');
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
  /* Tuntaskan ketikan yang belum sempat di-autosave agar tidak tertimpa */
  flush();
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

/* ───────── K19 · tabel properti + Papan Kanban (status) ───────── */

let _modeDb = 'tabel';
const KOLOM_KANBAN_BAWAAN = ['ide', 'draf', 'berjalan', 'selesai'];

export function bukaTabelProperti(modeAwal = '') {
  if (modeAwal) _modeDb = modeAwal;
  const aktif = state.notes.filter(n => !n.deletedAt && !n.archived && terlihat(n) && Array.isArray(n.props) && n.props.length);
  const kolom = [...new Set(aktif.flatMap(n => n.props.map(p => p.k)).filter(Boolean))];

  /* Kolom Kanban dikumpulkan dari nilai `status` nyata + lajur standar */
  const statusTambahan = aktif
    .map(n => (n.props.find(p => p.k === 'status') || {}).v || '')
    .map(v => v.trim())
    .filter(v => v && !KOLOM_KANBAN_BAWAAN.includes(v.toLowerCase()));
  const lajurKanban = [...KOLOM_KANBAN_BAWAAN, ...new Set(statusTambahan)];

  const baris = aktif.map(n => `<tr>
    <td style="padding:7px 8px;border-bottom:1px solid var(--border)"><a href="#" data-buka="${esc(n.id)}" style="color:var(--accent);font-weight:500">${esc(n.title || tr('Tanpa judul'))}</a></td>
    ${kolom.map(k => {
      const p = n.props.find(x => x.k === k);
      return `<td style="padding:7px 8px;border-bottom:1px solid var(--border)">${esc(p ? p.v : '')}</td>`;
    }).join('')}
  </tr>`).join('');

  const kanbanHtml = `
    <div class="kb-board">
      ${lajurKanban.map(st => {
        const kartu = aktif.filter(n => {
          const v = ((n.props.find(p => p.k === 'status') || {}).v || '').trim().toLowerCase();
          return st === 'ide' ? (!v || v === 'ide') : v === st.toLowerCase();
        });
        return `<div class="kb-col">
          <div class="kb-head"><span>${esc(st)}</span><span class="chip">${kartu.length}</span></div>
          <div class="kb-list">
            ${kartu.map(n => `
              <div class="kb-card">
                <a href="#" class="kb-title" data-buka="${esc(n.id)}">${esc(n.title || tr('Tanpa judul'))}</a>
                <div class="kb-move">
                  ${KOLOM_KANBAN_BAWAAN.filter(x => x !== st.toLowerCase()).map(target =>
                    `<button type="button" class="kb-mv-btn" data-kb-id="${esc(n.id)}" data-kb-st="${esc(target)}">→ ${esc(target)}</button>`
                  ).join('')}
                </div>
              </div>`).join('') || `<span class="kb-empty">—</span>`}
          </div>
        </div>`;
      }).join('')}
    </div>`;

  openPop(`
    <div class="rn-modal-box" style="max-width:720px;max-height:82vh;overflow:auto">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
        <h3 class="rn-modal-title">${tr('Tabel properti')}</h3>
        <div style="display:flex;align-items:center;gap:6px">
          <button type="button" class="btn ${_modeDb === 'tabel' ? 'btn-pri' : 'btn-sec'}" style="height:30px;font-size:12px" data-db-mode="tabel">${tr('Tabel')}</button>
          <button type="button" class="btn ${_modeDb === 'kanban' ? 'btn-pri' : 'btn-sec'}" style="height:30px;font-size:12px" data-db-mode="kanban">Kanban</button>
          <button type="button" class="iconbtn" data-pop-close style="width:28px;height:28px"><svg class="ico"><use href="#i-x"/></svg></button>
        </div>
      </div>
      ${aktif.length === 0
        ? `<p style="font-size:12.5px;color:var(--muted)">${tr('Belum ada catatan dengan properti.')}</p>`
        : _modeDb === 'kanban'
          ? kanbanHtml
          : `<div style="overflow-x:auto"><table style="width:100%;font-size:12.5px;border-collapse:collapse">
              <thead><tr><th style="text-align:left;padding:6px 8px;border-bottom:1.5px solid var(--border-strong)">${tr('Catatan')}</th>${kolom.map(k => `<th style="text-align:left;padding:6px 8px;border-bottom:1.5px solid var(--border-strong)">${esc(k)}</th>`).join('')}</tr></thead>
              <tbody>${baris}</tbody></table></div>`}
    </div>`);

  document.getElementById('pop').onclick = e => {
    const modeBtn = e.target.closest('[data-db-mode]');
    if (modeBtn) {
      bukaTabelProperti(modeBtn.dataset.dbMode);
      return;
    }
    const mv = e.target.closest('[data-kb-id]');
    if (mv) {
      const targetNote = state.notes.find(x => x.id === mv.dataset.kbId);
      if (targetNote) {
        targetNote.props = Array.isArray(targetNote.props) ? targetNote.props : [];
        const existing = targetNote.props.find(p => p.k === 'status');
        if (existing) existing.v = mv.dataset.kbSt;
        else targetNote.props.push({ k: 'status', v: mv.dataset.kbSt });
        touch(targetNote);
        save();
        bukaTabelProperti('kanban');
      }
      return;
    }
    const a = e.target.closest('[data-buka]');
    if (a) { e.preventDefault(); closeAll(); openNote(a.dataset.buka); }
  };
}

/* ───────── TANGKAP CEPAT TUGAS / PENGINGAT (QUICK CAPTURE) ───────── */

/**
 * Tangkap cepat satu baris tugas atau pengingat ke Kotak Masuk Tugas,
 * atau tambahkan pengingat langsung untuk catatan yang sedang dibuka (`dariCatatan = true`).
 */
export function bukaTangkapCepat(jenis = 'task', dariCatatan = false) {
  flush();
  const nBuka = dariCatatan ? catatanBuka() : null;
  const isRem = jenis === 'rem';
  const defaultTeks = nBuka
    ? `besok ${nBuka.title || tr('Tindak lanjuti catatan')}`
    : (isRem ? 'besok ' : '');

  openPop(`
    <div class="rn-modal-box" style="max-width:440px">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <h3 class="rn-modal-title">${isRem ? tr('Pengingat cepat') : tr('Tugas cepat')}</h3>
        <button type="button" class="iconbtn" data-pop-close style="width:28px;height:28px"><svg class="ico"><use href="#i-x"/></svg></button>
      </div>
      <p style="font-size:12.5px;color:var(--muted);margin:0">
        ${tr('Tulis waktu alami di awal kalimat agar otomatis terjadwal di Kalender & Reminder.')}
      </p>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button type="button" class="chip" data-qc-pre="hari ini ">${tr('Hari ini')}</button>
        <button type="button" class="chip" data-qc-pre="besok ">${tr('Besok')}</button>
        <button type="button" class="chip" data-qc-pre="minggu depan ">${tr('Minggu depan')}</button>
        <button type="button" class="chip chip-a" data-qc-pre="!! ">!! ${tr('Penting')}</button>
      </div>
      <input type="text" class="rn-input-text" id="qc-teks" value="${esc(defaultTeks)}"
        placeholder="${isRem ? tr('besok 09:00 bayar tagihan listrik') : tr('besok kirim draf laporan !')}" autocomplete="off">
      <div class="rn-actions-top" style="justify-content:flex-end;gap:8px;margin-top:4px">
        <button type="button" class="btn btn-sec" data-pop-close>${tr('Batal')}</button>
        <button type="button" class="btn btn-pri" id="qc-simpan">${tr('Simpan')}</button>
      </div>
    </div>
  `);

  const inp = document.getElementById('qc-teks');
  if (inp) {
    inp.focus();
    inp.setSelectionRange(inp.value.length, inp.value.length);
  }

  const popEl = document.getElementById('pop');
  const simpanQc = () => {
    const raw = (inp ? inp.value : '').trim();
    if (!raw) { toast(tr('Isi tugas terlebih dahulu')); return; }
    const konten = isRem && !waktuTenggat(raw) ? `hari ini ${esc(raw)}` : esc(raw);

    if (nBuka && !nBuka.welcome) {
      nBuka.blocks = Array.isArray(nBuka.blocks) ? nBuka.blocks : [];
      nBuka.blocks.unshift(makeBlock({ type: 'todo', content: konten, meta: { checked: false } }));
      touch(nBuka);
      save();
      closeAll();
      openNote(nBuka.id);
      toast(tr('Pengingat ditambahkan ke catatan ini'));
      return;
    }

    /* Cari atau buat catatan Kotak Masuk Tugas */
    let kotak = state.notes.find(n => !n.deletedAt && !n.archived && terlihat(n) && n.title === tr('Kotak Masuk Tugas'));
    if (!kotak) {
      kotak = makeNote({
        title: tr('Kotak Masuk Tugas'),
        blocks: [{ type: 'todo', content: konten, meta: { checked: false } }],
      });
      state.seq++;
      state.notes.unshift(kotak);
    } else {
      kotak.blocks.unshift(makeBlock({ type: 'todo', content: konten, meta: { checked: false } }));
      touch(kotak);
    }
    save();
    closeAll();
    go(isRem ? 'rem' : 'task');
    toast(isRem ? tr('Pengingat disimpan') : tr('Tugas disimpan'));
  };

  if (popEl) {
    popEl.onclick = e => {
      const pre = e.target.closest('[data-qc-pre]');
      if (pre && inp) {
        inp.value = pre.dataset.qcPre + inp.value.replace(/^(hari ini|besok|minggu depan)\s+/i, '');
        inp.focus();
        return;
      }
      if (e.target.closest('#qc-simpan')) simpanQc();
    };
  }
  if (inp) {
    inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); simpanQc(); } };
  }
}

/* ───────── PINDAH RUANG & RIWAYAT VERSI CATATAN ───────── */

export function bukaPanelRuangCatatan(anchor) {
  const n = catatanBuka();
  if (!n) return;
  const daftar = daftarRuang();
  openPop(`
    <div class="pop-h">${tr('Pindahkan ke ruang')}</div>
    <button type="button" class="pop-i${!n.folderId ? ' on' : ''}" data-set-ruang="">
      <svg class="ico"><use href="#i-note"/></svg>${tr('Tanpa ruang (Umum)')}
    </button>
    ${daftar.map(r => `
      <button type="button" class="pop-i${n.folderId === r.id ? ' on' : ''}" data-set-ruang="${esc(r.id)}">
        <svg class="ico"><use href="#i-arch"/></svg>${esc(r.nama)}
      </button>`).join('')}
    <div style="display:flex;gap:6px;padding:6px 10px 10px">
      <input id="ruang-baru-in" class="pop-in" placeholder="${tr('Nama ruang baru…')}" maxlength="32">
      <button type="button" class="btn btn-pri" id="ruang-baru-ok" style="height:34px;flex:none">${tr('Buat')}</button>
    </div>
  `, anchor);

  const popEl = document.getElementById('pop');
  if (popEl) {
    popEl.onclick = e => {
      const sr = e.target.closest('[data-set-ruang]');
      if (sr) {
        pindahkanCatatanKeRuang(n.id, sr.dataset.setRuang || null);
        closeAll();
        toast(tr('Ruang catatan diperbarui'));
        return;
      }
      if (e.target.closest('#ruang-baru-ok')) {
        const inp = document.getElementById('ruang-baru-in');
        const dibuat = tambahRuang(inp ? inp.value : '');
        if (!dibuat) { toast(tr('Masukkan nama ruang')); return; }
        pindahkanCatatanKeRuang(n.id, dibuat.id);
        closeAll();
        toast(`${tr('Dipindahkan ke')} «${dibuat.nama}»`);
      }
    };
  }
}

export async function bukaPanelVersiCatatan(anchor) {
  flush();
  const n = catatanBuka();
  if (!n) { toast(tr('Buka catatan dulu')); return; }
  const versi = await ambilVersiCatatan(n.id);
  openPop(`
    <div class="rn-modal-box" style="max-width:460px;max-height:76vh;overflow:auto">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <h3 class="rn-modal-title">${tr('Riwayat versi lokal')}</h3>
        <button type="button" class="iconbtn" data-pop-close style="width:28px;height:28px"><svg class="ico"><use href="#i-x"/></svg></button>
      </div>
      ${versi.length === 0
        ? `<p style="font-size:12.5px;color:var(--muted)">${tr('Belum ada snapshot versi tersimpan untuk catatan ini. Snapshot direkam otomatis saat kamu menyunting.')}</p>`
        : versi.map((v, i) => `
          <div class="ver-item">
            <div style="min-width:0;flex:1">
              <div style="font-size:13px;font-weight:600">${esc(v.title || tr('Tanpa judul'))} · <span style="font-weight:400;color:var(--muted)">${stamp(v.at)}</span></div>
              <div style="font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(plainText(v).slice(0, 90) || tr('Kosong'))}</div>
            </div>
            <button type="button" class="btn btn-sec" style="height:30px;font-size:12px;flex:none" data-versi-pulih="${i}">${tr('Pulihkan')}</button>
          </div>`).join('')}
    </div>
  `, anchor);

  const popEl = document.getElementById('pop');
  if (popEl) {
    popEl.onclick = async e => {
      const btn = e.target.closest('[data-versi-pulih]');
      if (!btn) return;
      const ok = await pulihkanVersiCatatan(n.id, Number(btn.dataset.versiPulih));
      closeAll();
      if (ok) {
        openNote(n.id);
        toast(tr('Versi catatan dipulihkan'));
      }
    };
  }
}

/* ───────── K30 · sumber pencarian lintas modul (dipakai palette) ───────── */

export function sumberTugasTerbuka() {
  const hasil = [];
  for (const n of state.notes) {
    if (n.deletedAt || n.archived || !terlihat(n)) continue;
    for (const b of n.blocks || []) {
      if (b.type === 'todo' && !(b.meta && b.meta.checked)) {
        const t = plainText({ blocks: [b] }).trim();
        if (t) hasil.push({ id: 'tugas-' + b.id, label: t, hint: tr('Tugas'), cari: n.title || '', jalan: () => openNote(n.id) });
      }
    }
  }
  return hasil;
}
