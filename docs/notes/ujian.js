/* Persiapan ujian (C8, Tahap 4) — layar dan glue UI.

   Tiga layar, terhubung lewat induk (tombol kembali pulang ke induknya):
     ujian         : daftar ruang + buat ruang baru
     ujian-ruang   : materi (catatan), soal (pertanyaan dan jawaban), mulai latihan, timer fokus
     ujian-latihan : latihan mengingat, Ingat / Belum, berurutan dari soal tertua

   Logika data ada di ujian-murni.js. Tindakan hapus memakai Urungkan di toast, tanpa dialog konfirmasi. */

import { state, save } from '../core/store.js?v=20261030110000';
import { go, cur } from '../core/router.js?v=20261030110000';
import { t as tr } from '../core/i18n.js?v=20261030110000';
import { toast } from '../core/toast.js?v=20261030110000';
import { esc } from '../core/dom.js?v=20261030110000';
import { openPop, closeAll } from './menus/pop.js?v=20261030110000';
import { sheet } from './sheet.js?v=20261030110000';
import { bukaFokus } from './fokus.js?v=20261030110000';
import {
  buatRuang, tambahMateri, keluarkanMateri, tambahSoal, hapusSoal, catatNilaiSoal,
  antrianLatihan, langkahAntrean, ringkasSesi, statistikRuang,
} from './ujian-murni.js?v=20261030110000';

/* Keadaan layar (hanya di memori). */
let aktifId = null;     /* ruang yang dibuka */
let latihan = null;     /* { ruangId, antrean: [id], ingat, belum, balik } */

const ruangDenganId = id => state.ujian.find(r => r.id === id) || null;
const ruangAktif = () => ruangDenganId(aktifId);

function judulCatatan(id, cadangan = '') {
  const n = state.notes.find(x => x.id === id);
  if (n) return n.title || tr('Tanpa judul');
  return cadangan || tr('Catatan tidak ditemukan');
}

/* Catatan yang bisa dijadikan materi: semua yang belum dihapus ke Sampah. */
function catatanBisaMateri() {
  return state.notes.filter(n => !n.deletedAt);
}

/* ── Layar daftar ── */

function viewDaftar() {
  const kartu = state.ujian.map(r => {
    const s = statistikRuang(r);
    return `<button type="button" class="uj-kartu" data-uj-aksi="buka" data-uj-id="${esc(r.id)}">
        <b>${esc(r.nama)}</b>
        <small>${s.materi} ${esc(tr('materi'))} · ${s.soal} ${esc(tr('soal'))} · ${esc(tr('Benar'))} ${s.benar} · ${esc(tr('Salah'))} ${s.salah}</small>
      </button>`;
  }).join('');
  return `<div class="uj-wrap">
      <p class="uj-pengantar">${esc(tr('Ruang untuk materi dan soal ujian. Materi tetap milik catatanmu. Soal disusun sendiri.'))}</p>
      <div class="uj-baris">
        <input class="uj-input" id="uj-nama" type="text" maxlength="120" autocomplete="off" placeholder="${esc(tr('Nama ruang, mis. UTS Biologi'))}" aria-label="${esc(tr('Nama ruang'))}">
        <button type="button" class="btn btn-pri" data-uj-aksi="buat">${esc(tr('Buat ruang'))}</button>
      </div>
      <div class="uj-daftar">${kartu || `<p class="uj-kosong">${esc(tr('Belum ada ruang. Buat satu di atas.'))}</p>`}</div>
    </div>`;
}

/* ── Layar ruang ── */

function viewRuang() {
  const r = ruangAktif();
  if (!r) return `<div class="uj-wrap"><p class="uj-kosong">${esc(tr('Ruang tidak ditemukan.'))}</p></div>`;
  const s = statistikRuang(r);

  const materi = r.materi.length
    ? r.materi.map(m => {
        const n = state.notes.find(x => x.id === m.id);
        const ket = !n ? tr('Catatan tidak ditemukan') : n.deletedAt ? tr('di Sampah') : '';
        return `<div class="uj-baris-item">
            <span class="uj-judul">${esc(judulCatatan(m.id, m.judul))}${ket ? ` <i>(${esc(ket)})</i>` : ''}</span>
            <button type="button" class="uj-ghost" data-uj-aksi="keluar-materi" data-uj-id="${esc(m.id)}">${esc(tr('Keluarkan'))}</button>
          </div>`;
      }).join('')
    : `<p class="uj-kosong">${esc(tr('Belum ada materi. Tambahkan catatan yang akan dipelajari.'))}</p>`;

  const opsiSumber = `<option value="">${esc(tr('Tanpa sumber'))}</option>` + r.materi
    .map(m => `<option value="${esc(m.id)}">${esc(judulCatatan(m.id, m.judul))}</option>`).join('');

  const soal = r.soal.length
    ? r.soal.map(x => `<div class="uj-soal">
        <div class="uj-judul"><b>${esc(x.pertanyaan)}</b></div>
        <div class="uj-jawab">${esc(x.jawaban)}</div>
        <small>${x.sumberId || x.sumberJudul ? esc(judulCatatan(x.sumberId, x.sumberJudul)) + ' · ' : ''}${esc(tr('Benar'))} ${x.benar} · ${esc(tr('Salah'))} ${x.salah}</small>
        <button type="button" class="uj-ghost" data-uj-aksi="hapus-soal" data-uj-id="${esc(x.id)}">${esc(tr('Hapus'))}</button>
      </div>`).join('')
    : `<p class="uj-kosong">${esc(tr('Belum ada soal. Tulis pertanyaan dan jawabannya di bawah.'))}</p>`;

  return `<div class="uj-wrap">
      <div class="uj-ringkas">${s.materi} ${esc(tr('materi'))} · ${s.soal} ${esc(tr('soal'))} · ${esc(tr('Benar'))} ${s.benar} · ${esc(tr('Salah'))} ${s.salah}</div>

      <div class="uj-aksi-atas">
        <button type="button" class="btn btn-pri" data-uj-aksi="latihan" ${r.soal.length ? '' : 'disabled'}>${esc(tr('Mulai latihan'))}</button>
        <button type="button" class="btn btn-sec" data-uj-aksi="timer">${esc(tr('Timer fokus'))}</button>
      </div>

      <h3 class="uj-h">${esc(tr('Materi'))}</h3>
      <div class="uj-daftar">${materi}</div>
      <button type="button" class="btn btn-sec uj-lebar" data-uj-aksi="buka-materi">${esc(tr('Tambah catatan sebagai materi'))}</button>

      <h3 class="uj-h">${esc(tr('Soal'))}</h3>
      <div class="uj-form">
        <label class="uj-lab" for="uj-p">${esc(tr('Pertanyaan'))}</label>
        <input class="uj-input" id="uj-p" type="text" maxlength="2000" autocomplete="off">
        <label class="uj-lab" for="uj-j">${esc(tr('Jawaban'))}</label>
        <input class="uj-input" id="uj-j" type="text" maxlength="2000" autocomplete="off">
        <label class="uj-lab" for="uj-s">${esc(tr('Sumber'))}</label>
        <select class="uj-input" id="uj-s">${opsiSumber}</select>
        <button type="button" class="btn btn-pri uj-lebar" data-uj-aksi="tambah-soal">${esc(tr('Simpan soal'))}</button>
      </div>
      <div class="uj-daftar">${soal}</div>

      <h3 class="uj-h">${esc(tr('Hapus ruang'))}</h3>
      <button type="button" class="btn btn-sec uj-lebar uj-bahaya" data-uj-aksi="hapus-ruang">${esc(tr('Hapus ruang ini'))}</button>
    </div>`;
}

/* ── Layar latihan ── */

function viewLatihan() {
  const r = latihan ? ruangDenganId(latihan.ruangId) : null;
  if (!latihan || !r) {
    return `<div class="uj-wrap"><p class="uj-kosong">${esc(tr('Belum ada latihan. Mulai dari ruang ujian.'))}</p></div>`;
  }
  const ringkas = ringkasSesi(latihan);
  const info = `<div class="uj-ringkas">${esc(tr('Sisa'))}: ${latihan.antrean.length} · ${esc(tr('Kartu ingat'))}: ${ringkas.ingat} · ${esc(tr('Belum'))}: ${ringkas.belum}</div>`;

  if (!latihan.antrean.length) {
    return `<div class="uj-wrap">
        <div class="uj-kartu-besar"><div class="uj-judul">${esc(tr('Selesai'))}</div>
          <p class="uj-kosong">${esc(tr('Kartu ingat'))}: ${ringkas.ingat} · ${esc(tr('Belum'))}: ${ringkas.belum}</p></div>
        <div class="uj-aksi-atas">
          <button type="button" class="btn btn-sec" data-uj-aksi="latihan-ulang">${esc(tr('Ulangi latihan'))}</button>
          <button type="button" class="btn btn-pri" data-uj-aksi="latihan-selesai">${esc(tr('Tutup'))}</button>
        </div>
      </div>`;
  }

  const s = r.soal.find(x => x.id === latihan.antrean[0]);
  const jawab = latihan.balik && s
    ? `<div class="uj-garis">${esc(tr('Jawaban'))}</div><div class="uj-teks">${esc(s.jawaban)}</div>`
    : '';
  const tombol = latihan.balik
    ? `<button type="button" class="btn btn-sec" data-uj-aksi="latihan-belum">${esc(tr('Belum'))}</button>
       <button type="button" class="btn btn-pri" data-uj-aksi="latihan-ingat">${esc(tr('Kartu ingat'))}</button>`
    : `<button type="button" class="btn btn-pri" data-uj-aksi="latihan-balik">${esc(tr('Lihat jawaban'))}</button>`;
  return `<div class="uj-wrap">
      ${info}
      <div class="uj-kartu-besar">
        <div class="uj-lab">${esc(tr('Pertanyaan'))}</div>
        <div class="uj-teks">${esc(s ? s.pertanyaan : '')}</div>
        ${jawab}
        ${s && (s.sumberId || s.sumberJudul) ? `<small>${esc(judulCatatan(s.sumberId, s.sumberJudul))}</small>` : ''}
      </div>
      <div class="uj-aksi-atas">${tombol}</div>
    </div>`;
}

export const ujianViews = {
  ujian: viewDaftar,
  'ujian-ruang': viewRuang,
  'ujian-latihan': viewLatihan,
};
export const ujianTitles = {
  ujian: 'Persiapan ujian',
  'ujian-ruang': 'Ruang ujian',
  'ujian-latihan': 'Latihan ujian',
};
export const ujianInduk = {
  'ujian-ruang': 'ujian',
  'ujian-latihan': 'ujian-ruang',
};

/* ── Lembar pilih catatan sebagai materi ── */

/* Daftar catatan yang belum jadi materi, disaring menurut q (huruf kecil). */
function daftarMateriHtml(q = '') {
  const r = ruangAktif();
  const ada = new Set(r ? r.materi.map(m => m.id) : []);
  const cocok = catatanBisaMateri()
    .filter(n => !ada.has(n.id))
    .filter(n => !q || (n.title || '').toLowerCase().includes(q));
  return cocok.length
    ? cocok.map(n => `<button type="button" class="uj-baris-item uj-pilih" data-uj-aksi="tambah-materi" data-uj-id="${esc(n.id)}">
          <span class="uj-judul">${esc(n.title || tr('Tanpa judul'))}</span></button>`).join('')
    : `<p class="uj-kosong">${esc(tr('Tidak ada catatan yang cocok'))}</p>`;
}

function isiLembarMateri() {
  return `<input class="uj-input" id="uj-cari-materi" type="search" autocomplete="off" placeholder="${esc(tr('Cari catatan'))}" aria-label="${esc(tr('Cari catatan'))}">
    <div class="uj-daftar" id="uj-daftar-materi">${daftarMateriHtml('')}</div>`;
}

function bukaLembarMateri() {
  openPop(sheet({
    ikon: 'i-note',
    judul: tr('Tambah catatan sebagai materi'),
    catatan: esc(tr('Materi tetap milik catatanmu. Menghapus catatan tidak menghapus soal.')),
    isi: isiLembarMateri(),
  }), null);
}

/* ── Glue: navigasi dan perubahan ── */

function jalankanHapusSoal(id) {
  const r = ruangAktif();
  if (!r) return;
  const i = r.soal.findIndex(s => s.id === id);
  const soal = hapusSoal(r, id);
  if (!soal) return;
  save();
  toast(tr('Soal dihapus'), {
    label: tr('Urungkan'),
    cb: () => {
      const rr = ruangDenganId(r.id);
      if (!rr) return;
      rr.soal.splice(Math.min(i, rr.soal.length), 0, soal);
      save();
      if (cur === 'ujian-ruang') go('ujian-ruang', { segar: true });
    },
  });
  go('ujian-ruang', { segar: true });
}

function jalankanHapusRuang() {
  const i = state.ujian.findIndex(r => r.id === aktifId);
  if (i < 0) return;
  const [ruang] = state.ujian.splice(i, 1);
  save();
  aktifId = null;
  toast(tr('Ruang dihapus'), {
    label: tr('Urungkan'),
    cb: () => {
      state.ujian.splice(Math.min(i, state.ujian.length), 0, ruang);
      save();
      if (cur === 'ujian') go('ujian', { segar: true });
    },
  });
  go('ujian', { segar: true });
}

function mulaiLatihan() {
  const r = ruangAktif();
  if (!r || !r.soal.length) return;
  latihan = { ruangId: r.id, antrean: antrianLatihan(r), ingat: 0, belum: 0, balik: false };
  go('ujian-latihan');
}

function aksiLatihan(a) {
  if (!latihan) return;
  if (a === 'latihan-selesai') { latihan = null; go('ujian-ruang', { segar: true }); return; }
  if (a === 'latihan-ulang') {
    const r = ruangDenganId(latihan.ruangId);
    if (!r) return;
    latihan = { ruangId: r.id, antrean: antrianLatihan(r), ingat: 0, belum: 0, balik: false };
  } else if (a === 'latihan-balik') {
    latihan.balik = true;
  } else if (a === 'latihan-ingat' || a === 'latihan-belum') {
    const nilai = a === 'latihan-ingat' ? 'ingat' : 'belum';
    const r = ruangDenganId(latihan.ruangId);
    const id = latihan.antrean[0];
    const soal = r && r.soal.find(x => x.id === id);
    if (soal) { catatNilaiSoal(soal, nilai); save(); }
    latihan.antrean = langkahAntrean(latihan.antrean, id, nilai);
    latihan[nilai]++;
    latihan.balik = false;
  }
  go('ujian-latihan', { segar: true });
}

function buatRuangDariInput() {
  const el = document.getElementById('uj-nama');
  const hasil = buatRuang({ nama: el ? el.value : '' });
  if (!hasil.ok) { toast(tr('Beri nama ruang dulu.')); if (el) el.focus(); return; }
  state.ujian.push(hasil.ruang);
  save();
  aktifId = hasil.ruang.id;
  go('ujian-ruang');
}

function tambahSoalDariForm() {
  const r = ruangAktif();
  if (!r) return;
  const p = document.getElementById('uj-p');
  const j = document.getElementById('uj-j');
  const s = document.getElementById('uj-s');
  const sumberId = s && s.value ? s.value : null;
  const materi = sumberId ? r.materi.find(m => m.id === sumberId) : null;
  const hasil = tambahSoal(r, {
    pertanyaan: p ? p.value : '',
    jawaban: j ? j.value : '',
    sumberId,
    sumberJudul: materi ? materi.judul : '',
  });
  if (!hasil.ok) {
    const pesan = {
      'pertanyaan-kosong': 'Isi pertanyaan dulu.',
      'jawaban-kosong': 'Isi jawaban dulu.',
      'terlalu-panjang': 'Teks terlalu panjang. Maksimal 2000 karakter per sisi.',
      'terlalu-banyak': 'Ruang sudah penuh untuk jumlah soal ini.',
    }[hasil.alasan] || 'Soal tidak bisa disimpan.';
    toast(tr(pesan));
    return;
  }
  save();
  go('ujian-ruang', { segar: true });
}

/* Pemasangan sekali dari notes/index.js. Delegasi di dokumen: layar dibuat ulang saat berpindah. */
let terpasang = false;
export function pasangUjian() {
  if (terpasang) return;
  terpasang = true;

  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-uj-aksi]');
    if (!b) return;
    const a = b.dataset.ujAksi;
    const id = b.dataset.ujId;
    if (a === 'buat') return buatRuangDariInput();
    if (a === 'buka') { aktifId = id; return go('ujian-ruang'); }
    if (a === 'buka-materi') return bukaLembarMateri();
    if (a === 'tambah-materi') {
      const r = ruangAktif();
      const n = state.notes.find(x => x.id === id);
      if (!r || !n) return;
      const hasil = tambahMateri(r, { id: n.id, judul: n.title || '' });
      if (!hasil.ok) { toast(tr(hasil.alasan === 'terlalu-banyak' ? 'Materi sudah penuh untuk ruang ini.' : 'Catatan sudah ada sebagai materi.')); return; }
      save();
      closeAll();
      return go('ujian-ruang', { segar: true });
    }
    if (a === 'keluar-materi') {
      const r = ruangAktif();
      if (!r) return;
      if (keluarkanMateri(r, id)) save();
      return go('ujian-ruang', { segar: true });
    }
    if (a === 'tambah-soal') return tambahSoalDariForm();
    if (a === 'hapus-soal') return jalankanHapusSoal(id);
    if (a === 'hapus-ruang') return jalankanHapusRuang();
    if (a === 'latihan') return mulaiLatihan();
    if (a === 'timer') return bukaFokus();
    if (a && a.startsWith('latihan-')) return aksiLatihan(a);
  });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    if (e.target && e.target.id === 'uj-nama') { e.preventDefault(); buatRuangDariInput(); }
  });

  document.addEventListener('input', e => {
    if (!e.target || e.target.id !== 'uj-cari-materi') return;
    const wadah = document.getElementById('pop');
    const q = e.target.value.trim().toLowerCase();
    const daftar = wadah && wadah.querySelector('#uj-daftar-materi');
    if (!daftar) return;
    daftar.innerHTML = daftarMateriHtml(q);
  });
}
