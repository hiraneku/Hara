/* Active recall tape (C6, Tahap 4) — glue UI di editor.

   • Tombol Tape (bilah teks dan menu Penandaan) membungkus seleksi jadi tape tersembunyi.
   • Ketuk tape untuk menampilkan atau menyembunyikannya. Saat menyeleksi teks, ketukan tidak
     mengubah tape, supaya seleksi tidak terganggu.
   • Buka semua / Tutup semua mengubah semua tape di catatan itu.
   Logika DOM ada di tape-murni.js. */

import { docEl, sel } from './caret.js?v=20261029180000';
import { refresh } from './cleanup.js?v=20261029180000';
import { toast } from '../../core/toast.js?v=20261029180000';
import { t as tr } from '../../core/i18n.js?v=20261029180000';
import { bungkusRange, gantiStatus, setSemua } from './tape-murni.js?v=20261029180000';

const PESAN = {
  kosong: 'Sorot teks dulu, lalu pilih Tape.',
  luar: 'Sorot teks dulu, lalu pilih Tape.',
  'multi-blok': 'Tape hanya bisa di dalam satu paragraf. Pilih teks dalam satu blok.',
  tersarang: 'Teks ini sudah berada di dalam tape, atau memuat tape lain.',
};

/* Tombol Tape: bungkus seleksi, lalu letakkan kursor sesudah tape. */
export function tambahTape() {
  const d = docEl();
  const s = sel();
  const r = s && s.rangeCount ? s.getRangeAt(0) : null;
  const hasil = bungkusRange(r, d);
  if (!hasil.ok) {
    toast(tr(PESAN[hasil.alasan] || PESAN.kosong));
    return;
  }
  /* kursor setelah tape, dengan pijakan text node kosong (pola yang sama dengan tautan) */
  const sp = document.createTextNode('');
  hasil.span.after(sp);
  const nr = document.createRange();
  nr.setStart(sp, 0);
  nr.collapse(true);
  s.removeAllRanges();
  s.addRange(nr);
  refresh();
}

/* Buka semua (buka = true) atau tutup semua tape di catatan ini. */
export function tapeSemuaUi(buka) {
  const d = docEl();
  if (!d) return;
  const { jumlah } = setSemua(d, buka);
  if (!jumlah) {
    toast(tr('Belum ada tape di catatan ini.'));
    return;
  }
  refresh();
}

let terpasang = false;

/* Ketukan pada tape membalik statusnya. Dipasang sekali untuk seluruh dokumen. */
export function bindTape() {
  if (terpasang) return;
  terpasang = true;
  document.addEventListener('click', e => {
    const el = e.target && e.target.closest ? e.target.closest('span.tape') : null;
    if (!el) return;
    const d = docEl();
    if (!d || !d.contains(el)) return;
    const s = window.getSelection();
    if (s && !s.isCollapsed) return;
    gantiStatus(el);
    refresh();
  });
}
