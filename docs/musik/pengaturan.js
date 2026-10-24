/* Layar "Pengaturan Musik" (view 'musik-set'). Dibuat sebagai menu tersendiri
   supaya pengaturan lain bisa ditambahkan nanti: cukup tambah objek ke BAGIAN.
   Setiap item memakai data-set="kunci" dengan data-nilai bila pilihan. */

import { cur, go } from '../core/router.js?v=20261024143000';
import { t as tr } from '../core/i18n.js?v=20261024143000';
import * as S from './simpan.js?v=20261024143000';
import * as A from './aksi.js?v=20261024143000';
import * as L from './logika.js?v=20261024143000';
import { ambilSet, ubahSet } from './set.js?v=20261024143000';
import { ikon } from './ikon.js?v=20261024143000';

const LABEL_SETELAH = { berhenti: 'Berhenti', berikutnya: 'Lagu berikutnya', ulangi: 'Ulangi lagu' };
const LABEL_GAYA = { garis: 'Garis', gelombang: 'Gelombang' };

let hapusSiap = false;
let hapusTimer = null;

function chip(kunci, nilai, label, aktif, extra = '') {
  return `<button type="button" class="mus-chip${aktif ? ' on' : ''}" data-set="${kunci}" data-nilai="${nilai}" aria-pressed="${aktif}"${extra}>${label}</button>`;
}

function baris(judul, catatan, isi) {
  return `<div class="mus-set-baris">
    <div class="mus-set-teks"><span class="mus-set-judul">${tr(judul)}</span>${catatan ? `<span class="mus-set-catatan">${tr(catatan)}</span>` : ''}</div>
    <div class="mus-set-kontrol">${isi}</div>
  </div>`;
}

function saklar(kunci, on, judul, catatan) {
  return `<div class="mus-set-baris">
    <div class="mus-set-teks"><span class="mus-set-judul">${tr(judul)}</span>${catatan ? `<span class="mus-set-catatan">${tr(catatan)}</span>` : ''}</div>
    <button type="button" class="mus-saklar${on ? ' on' : ''}" role="switch" aria-checked="${on}" data-set="${kunci}" data-nilai="${on ? 0 : 1}" aria-label="${tr(judul)}"><span></span></button>
  </div>`;
}

/* Daftar bagian pengaturan. Tambah bagian baru di sini. */
const BAGIAN = [
  {
    id: 'pemutaran',
    judul: 'Pemutaran',
    isi: (s) => [
      baris('Setelah lagu selesai', 'Apa yang dilakukan ketika lagu sampai di akhir',
        `<div class="mus-set-pilihan">${Object.keys(LABEL_SETELAH).map(k =>
          chip('setelahSelesai', k, tr(LABEL_SETELAH[k]), s.setelahSelesai === k)).join('')}</div>`),
      saklar('lanjutkanPosisi', s.lanjutkanPosisi, 'Lanjutkan dari posisi terakhir',
        'Lagu dibuka lagi dari tempat terakhir didengar'),
    ].join(''),
  },
  {
    id: 'tampilan',
    judul: 'Tampilan',
    isi: (s) => baris('Gaya seek bar', 'Garis yang rapi, atau gelombang suara lagu',
      `<div class="mus-set-pilihan">${Object.keys(LABEL_GAYA).map(k =>
        chip('gayaSeek', k, tr(LABEL_GAYA[k]), s.gayaSeek === k)).join('')}</div>`),
  },
  {
    id: 'tempo',
    judul: 'Tempo',
    isi: (s) => baris('Tempo awal lagu baru', 'Dipakai untuk lagu yang belum pernah diatur',
      `<div class="mus-set-pilihan">${L.PRESET_TEMPO.map(x =>
        chip('tempoAwal', x, `${Math.round(x * 100)}%`, Math.abs(s.tempoAwal - x) < 0.001)).join('')}</div>`),
  },
  {
    id: 'pustaka',
    judul: 'Pustaka',
    isi: () => {
      const daftar = S.daftarLagu();
      const ukuran = L.formatUkuran(S.ukuranPustaka());
      return `<div class="mus-set-info">
          <div><span class="mus-set-angka">${daftar.length}</span><span class="mus-set-catatan">${tr('lagu')}</span></div>
          <div><span class="mus-set-angka">${ukuran}</span><span class="mus-set-catatan">${tr('dipakai di perangkat')}</span></div>
        </div>
        <p class="mus-set-catatan mus-set-pad">${tr('Lagu disimpan di aplikasi. Menghapus pustaka tidak menghapus berkas asli di perangkat.')}</p>
        <div class="mus-set-aksi">
          <button type="button" class="mus-set-bahaya${hapusSiap ? ' siap' : ''}" data-set="hapusSemua"${daftar.length ? '' : ' disabled'}>
            ${ikon('trash')}<span>${hapusSiap ? tr('Ketuk lagi untuk menghapus semua') : tr('Hapus semua lagu')}</span>
          </button>
        </div>`;
    },
  },
];

export function pengaturanView() {
  const s = ambilSet();
  const bagian = BAGIAN.map(b => `<section class="mus-kartu mus-set-kartu" aria-labelledby="mus-set-${b.id}">
      <h3 class="mus-set-judul-bagian" id="mus-set-${b.id}">${tr(b.judul)}</h3>
      ${b.isi(s)}
    </section>`).join('');
  return `<div class="mus mus-set" data-mus-root>
    <header class="mus-set-kepala">
      <span class="mus-set-ikon">${ikon('sliders')}</span>
      <div><h2 class="mus-set-h">${tr('Pengaturan Musik')}</h2>
      <p class="mus-catatan">${tr('Perilaku pemutar dan tampilan Musik')}</p></div>
    </header>
    ${bagian}
  </div>`;
}

function ubah(kunci, nilai) {
  if (kunci === 'lanjutkanPosisi') ubahSet({ lanjutkanPosisi: !!nilai });
  else ubahSet({ [kunci]: nilai });
  go('musik-set', { segar: true });
}

function hapusSemua(btn) {
  if (!hapusSiap) {
    hapusSiap = true;
    clearTimeout(hapusTimer);
    hapusTimer = setTimeout(() => { hapusSiap = false; if (cur === 'musik-set') go('musik-set', { segar: true }); }, 3000);
    go('musik-set', { segar: true });
    return;
  }
  clearTimeout(hapusTimer);
  hapusSiap = false;
  A.hapusSemuaLagu().then(() => go('musik-set', { segar: true }));
  if (btn) btn.disabled = true;
}

export function pasangPengaturan() {
  document.addEventListener('click', e => {
    if (cur !== 'musik-set') return;
    const b = e.target.closest && e.target.closest('[data-set]');
    if (!b || b.disabled) return;
    const kunci = b.dataset.set;
    if (kunci === 'hapusSemua') { hapusSemua(b); return; }
    const nilai = b.dataset.nilai;
    if (kunci === 'lanjutkanPosisi') { ubah(kunci, nilai === '1'); return; }
    if (kunci === 'tempoAwal') { ubah(kunci, Number(nilai)); return; }
    ubah(kunci, nilai);
  });
}
