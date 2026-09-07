/* Popup melayang di atas bar. */
import { ensureCaret, kunciKeyboard } from '../editor/caret.js?v=20260907092650';
import { setBlock, insertHr, insertTanggal } from '../editor/blocks.js?v=20260907092650';
import { insertInline } from './insert.js?v=20260907092650';
import { focusKeep } from '../bar/render.js?v=20260907092650';
import { applyLink } from './link.js?v=20260907092650';
import { buangGaring, slashAktif } from './slash-trigger.js?v=20260907092650';
import { setFont } from '../editor/font.js?v=20260907092650';
import { setCallout } from '../editor/blocks.js?v=20260907092650';
import { snap as snapFont } from '../editor/history.js?v=20260907092650';
import { getar } from '../bar/prefs.js?v=20260907092650';

export const pop = () => document.getElementById('pop');
const isiEl = () => document.getElementById('pop-isi') || pop();

/* Ganti isi area daftar popup (tombol × dan bingkai tidak ikut terganti). */
export function setPopIsi(html) {
  const b = isiEl();
  if (b) b.innerHTML = html;
}

/* Elemen pemicu popup yang sedang terbuka — dipakai untuk memutuskan
   "klik di luar" dan perilaku toggle tombol yang sama. */
let tambat = null;
export const penambatAdalah = el => {
  const p = pop();
  return !!(el && el.nodeType === 1 && p && p.classList.contains('on') && tambat &&
    (tambat === el || (tambat.contains && tambat.contains(el))));
};

/* seleksi terakhir sebelum popup dibuka — dipakai form tautan */
export let simpanRange = null;

export function openPop(html, anchor) {
  const p = pop();
  if (!p) return;
  const s = window.getSelection();
  const d = document.querySelector('.ed-doc');
  simpanRange = (s && s.rangeCount && d && d.contains(s.getRangeAt(0).startContainer))
    ? s.getRangeAt(0).cloneRange() : null;
  setPopIsi(html);
  tambat = (anchor && anchor.nodeType === 1) ? anchor : null;
  p.classList.add('on');
  const r = anchor.getBoundingClientRect();
  p.style.left = Math.max(12, Math.min(r.left, window.innerWidth - 302)) + 'px';
  p.style.top  = Math.max(12, r.top - p.offsetHeight - 10) + 'px';

  /* Form tautan: fokus kolom yang relevan — mengubah tautan: teksnya
     diblok utk langsung diketik ulang; tautan baru: kolom alamat. */
  const t = p.querySelector('#lk-t'), u = p.querySelector('#lk-u');
  if (t && u) { if (t.value) t.select(); else u.focus(); }
}

export function bindPop() {
  const p = pop();
  if (!p) return;

  /* tombol × di pojok kanan atas — menutup popup apa pun */
  const xb = p.querySelector('.pop-x');
  if (xb) xb.addEventListener('click', closeAll);

  /* klik/ketuk DI LUAR popup menutupnya — kecuali pada tombol pemicu
     yang sama (biar logika toggle tombol itu yang bicara). */
  document.addEventListener('pointerdown', e => {
    if (!p.classList.contains('on')) return;
    const t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('#pop')) return;
    if (penambatAdalah(t)) return;
    closeAll();
  });

  p.addEventListener('mousedown', e => { if (!e.target.closest('.pop-in')) e.preventDefault(); });
  /* form tautan: jangan tutup popup saat mengetik di kolom */
  p.addEventListener('mousedown', e => {
    if (e.target.closest('.pop-in')) e.stopPropagation();
  }, true);

  /* Enter di kolom form tautan = tekan tombol utama (Simpan/Sisipkan) */
  p.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const inp = e.target && e.target.closest ? e.target.closest('.pop-in') : null;
    if (!inp) return;
    e.preventDefault();
    const ok = p.querySelector('[data-lk="ok"]');
    if (ok) ok.click();
  });

  p.addEventListener('click', e => {
    const lk = e.target.closest('[data-lk]');
    if (lk) { applyLink(lk.dataset.lk, simpanRange); closeAll(); return; }

    const fo = e.target.closest('[data-font]');
    if (fo) {
      getar(); kunciKeyboard(); focusKeep(); ensureCaret();
      snapFont();
      setFont(fo.dataset.font);
      closeAll();
      return;
    }

    const cl = e.target.closest('[data-cal]');
    if (cl) { focusKeep(); ensureCaret(); setCallout(cl.dataset.cal); closeAll(); return; }

    /* tombol info -> tampilkan penjelasan */
    const inf = e.target.closest('[data-info]');
    if (inf) {
      getar();
      import('../bar/render.js?v=20260907092650').then(({ helpPanel, gantiIsiPop }) => {
        gantiIsiPop(helpPanel(inf.dataset.info), inf.dataset.info);
      });
      return;
    }
    /* kembali dari penjelasan ke daftar */
    const bk = e.target.closest('[data-helpback]');
    if (bk) {
      getar();
      import('../bar/render.js?v=20260907092650').then(({ kembaliKeMenu }) => kembaliKeMenu());
      return;
    }

    /* item dari menu kelompok */
    const gm = e.target.closest('[data-m]');
    if (gm) {
      getar();
      kunciKeyboard();
      closeAll();
      import('../bar/render.js?v=20260907092650').then(({ jalankan }) => jalankan(gm.dataset.m, gm));
      return;
    }

    const t = e.target.closest('[data-blk],[data-ins],[data-wl]');
    if (!t) return;
    /* buang "/" beserta kata kunci SEBELUM blok diterapkan */
    if (slashAktif() && t.dataset.blk) buangGaring();
    focusKeep();
    ensureCaret();
    if (t.dataset.blk === 'date') insertTanggal();
    else if (t.dataset.blk === 'img') { closeAll(); pilihGambar(); return; }
    else if (t.dataset.blk === 'hr') insertHr();
    else if (t.dataset.blk)     setBlock(t.dataset.blk);
    else if (t.dataset.ins)     insertInline('tg', t.dataset.ins);
    else if (t.dataset.wl)      insertInline('wl', '[[' + t.dataset.wl + ']]');
    closeAll();
  });
}

export function closeAll() {
  /* status menu "/" ikut berakhir saat popup ditutup dari mana pun */
  document.querySelectorAll('.mb-g.open').forEach(x => x.classList.remove('open'));
  pop()?.classList.remove('on');
  document.getElementById('sheet')?.classList.remove('on');
  document.getElementById('scrim')?.classList.remove('on');
}
