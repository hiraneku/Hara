/* Elemen antarmuka untuk properti catatan (frontmatter) & status simpan.
   Keduanya didefinisikan di sini karena dipakai dua layar: editor dan
   "Properties" (lihat views/props.js). */

import { html } from './html-util.js?v=20260907111935';

export const KET_PROP = {
  /* ini juga urutan tampil default (di editor & layar properties) */
  status: {
    nama: 'Status',
    contoh: ['Draf', 'Sedang dikerjakan', 'Selesai', 'Diarsipkan'],
    lebar: 100,
  },
  jenis: {
    nama: 'Jenis',
    contoh: ['Catatan', 'Tugas', 'Gagasan', 'Riset', 'Keputusan'],
    lebar: 100,
  },
  prioritas: {
    nama: 'Prioritas',
    contoh: ['Tinggi', 'Sedang', 'Rendah'],
    lebar: 100,
  },
  tanggal: { nama: 'Tanggal', lebar: 120 },
  tenggat: { nama: 'Tenggat', lebar: 120 },
};

export function namaProp(k) {
  return KET_PROP[k] ? KET_PROP[k].nama : k;
}

/* label manusia untuk kunci asing (tidak dirender sebagai input) */
export function propDikenal(k) {
  return k in KET_PROP;
}

/* Simpan nilai properti. Nilai KOSONG tetap disimpan (baris input
   dipertahankan) — menghapus properti hanya lewat tombol × (hapusProp). */
export function aturProp(n, k, v) {
  n.props = (n.props || []).filter(x => x.k !== k);
  if (k) n.props.push({ k, v: String(v ?? '') });
}

export function hapusProp(n, k) {
  n.props = (n.props || []).filter(x => x.k !== k);
}

/* render semua properti sebagai baris form (dipakai editor & layar props) */
export function barisProps(n, prefix = 'pr') {
  const pasangan = new Map((n.props || []).map(p => [p.k, p.v]));
  /* Map: kunci asing diambil lewat [...pasangan.keys()], bukan Object.keys */
  const urut = Object.keys(KET_PROP).filter(k => pasangan.has(k))
    .concat([...pasangan.keys()].filter(k => !propDikenal(k)));
  if (!urut.length) return '';
  const silang = k => `<button type="button" class="prop-x" data-prop-del="${html(k)}"
      title="Hapus properti" aria-label="Hapus properti ${html(k)}">
      <svg class="ico"><use href="#i-x"/></svg></button>`;
  return urut.map(k => {
    const ket = KET_PROP[k] || {};
    const contoh = (ket.contoh || []).map(c => html(c)).join(' · ');
    const saran = contoh ? `<div class="prop-saran">${contoh}</div>` : '';
    if (!propDikenal(k)) {
      return `
        <div class="prop-row prop-kunci-asing" data-kunci="${html(k)}">
          <label class="prop-label">${html(k)}</label>
          <div class="prop-kanan">
            <input type="text" class="prop-input" data-prop-k="${html(k)}"
                   value="${html(pasangan.get(k) || '')}" placeholder="(kunci tak dikenal — nilai bebas)">${saran}
          </div>${silang(k)}
        </div>`;
    }
    const tipe = (k === 'tanggal' || k === 'tenggat') ? 'date' : 'text';
    return `
      <div class="prop-row" data-kunci="${html(k)}">
        <label class="prop-label" for="${prefix}-${html(k)}">${ket.nama}</label>
        <div class="prop-kanan">
          <input type="${tipe}" class="prop-input" id="${prefix}-${html(k)}"
                 data-prop-k="${html(k)}" value="${html(pasangan.get(k) || '')}" placeholder="—">${saran}
        </div>${silang(k)}
      </div>`;
  }).join('');
}
