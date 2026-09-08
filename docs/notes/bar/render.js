/* Gambar bar dari config + pasang penangan klik. */
import { BAR, GROUPS } from './config.js?v=20260908052529';
import { ACTIONS, TANPA_SNAP } from './actions.js?v=20260908052529';
import { docEl, ensureCaret, curBlock, kunciKeyboard } from '../editor/caret.js?v=20260908052529';
import { openPop, closeAll, setPopIsi } from '../menus/pop.js?v=20260908052529';
import { slashMenu } from '../menus/slash.js?v=20260908052529';
import { wlMenu }    from '../menus/wikilink.js?v=20260908052529';
import { tagMenu }   from '../menus/tag.js?v=20260908052529';
import { linkMenu }  from '../menus/link.js?v=20260908052529';
import { fontMenu } from '../menus/font.js?v=20260908052529';
import { warnaMenu } from '../menus/warna.js?v=20260908052529';
import { calloutMenu } from '../menus/callout.js?v=20260908052529';
import { snap } from '../editor/history.js?v=20260908052529';
import { ketikaFontMuat, fontMasihMuat } from '../editor/font.js?v=20260908052529';
import { tersembunyi, getar } from './prefs.js?v=20260908052529';
import { HELP, HELP_GRUP } from './help.js?v=20260908052529';

const CHEV = '<svg class="chev"><use href="#i-chev"/></svg>';

/* Menu yang sedang terbuka — dipakai tombol kembali dari panel penjelasan. */
let menuTerakhir = null;

/* Ganti isi popup tanpa memindahkan posisinya. */
export function gantiIsiPop(html) {
  const p = document.getElementById('pop');
  if (!p) return;
  setPopIsi(html);
}

export function kembaliKeMenu() {
  if (!menuTerakhir) return;
  gantiIsiPop(menuTerakhir.g ? groupMenu(menuTerakhir.g) : menuTerakhir.html);
}

export function renderBar() {
  const box = document.querySelector('.mech-in');
  if (!box) return;
  box.innerHTML = BAR.map(b => {
    if (b.sep) return '<div class="mb-sep"></div>';
    if (tersembunyi(b.g || b.m)) return '';
    if (b.g) return `<button class="mb mb-g" data-g="${b.g}" title="${b.title || ''}">
        <span class="gl">${b.label}</span>${CHEV}</button>`;
    return `<button class="mb${b.accent ? ' acc' : ''}" data-m="${b.m}" title="${b.title || ''}">${b.label}</button>`;
  }).join('');
  rapikanSep(box);
  bindBar();
}

/* Hilangkan pemisah ganda atau yang berada di ujung. */
function rapikanSep(box){
  const anak = Array.from(box.children);
  let sebelumnyaSep = true;      /* awal dianggap sep, agar sep pertama dibuang */
  anak.forEach(el => {
    const sep = el.classList.contains('mb-sep');
    if (sep && sebelumnyaSep) el.remove();
    else sebelumnyaSep = sep;
  });
  const akhir = box.lastElementChild;
  if (akhir && akhir.classList.contains('mb-sep')) akhir.remove();
}

/* Menu untuk sebuah kelompok. */
function groupMenu(g) {
  const grp = GROUPS.find(x => x.g === g);
  if (!grp) return '';
  if (grp.menu === 'font') return fontMenu();
  if (grp.menu === 'warna') return warnaMenu();
  const b = curBlock();
  const BLK = { p:'b-p', h:'b-h1', h2:'b-h2', h3:'b-h3', quote:'b-quote',
                code:'b-code', cal:'b-cal', li:'b-li', ol:'b-ol', todo:'b-todo' };
  return `<div class="pop-h">${grp.title}</div>` +
    (HELP_GRUP[g] ? `<p class="pop-note">${HELP_GRUP[g]}</p>` : '') +
    grp.items.map(it => {
      const cls = BLK[it.m];
      const on  = cls && b && b.classList.contains(cls);
      return `<div class="pop-baris">
        <button class="pop-i${on ? ' on' : ''}" data-m="${it.m}">
          <svg class="ico"><use href="#${it.ikon}"/></svg>${it.nama}
          ${it.kunci ? `<span class="k">${it.kunci}</span>` : ''}
        </button>
        ${HELP[it.m] ? `<button class="pop-info" data-info="${it.m}" title="Apa ini?" aria-label="Penjelasan ${it.nama}">
          <svg class="bi"><use href="#i-help"/></svg></button>` : ''}
      </div>`;
    }).join('');
}

/* Setelah font web selesai dimuat, gambar ulang menu font yang sedang
   terbuka — kalau menu dibuka terlalu dini, label "Tidak tersedia"
   untuk font yang sebenarnya ada akan terkoreksi. */
function segarkanMenuFont() {
  if (!fontMasihMuat()) return;
  ketikaFontMuat().then(() => {
    const p = document.getElementById('pop');
    if (!p || !p.classList.contains('on')) return;
    if (!p.querySelector('.pop-font')) return;
    gantiIsiPop(fontMenu());
  });
}

/* Panel penjelasan satu mekanik. */
export function helpPanel(m) {
  const h = HELP[m];
  if (!h) return '';
  return `<div class="pop-h"><button class="pop-back" data-helpback><svg class="bi"><use href="#i-back"/></svg></button>${h.nama}</div>
    <div class="help">
      <p class="help-apa">${h.apa}</p>
      <div class="help-b"><span class="help-l">Cara pakai</span><p>${h.cara}</p></div>
      ${h.tahu ? `<div class="help-b"><span class="help-l">Perlu tahu</span><p>${h.tahu}</p></div>` : ''}
      <button class="btn btn-pri help-go" data-m="${m}">Gunakan sekarang</button>
    </div>`;
}

function jalankan(m, btn) {
  const d = docEl();
  if (!d) return;
  focusKeep();
  ensureCaret();
  if (m === 'slash') return openPop(slashMenu(), btn);
  if (m === 'wl')    return openPop(wlMenu(),    btn);
  if (m === 'tag')   return openPop(tagMenu(),   btn);
  if (m === 'link')  return openPop(linkMenu(),  btn);
  if (m === 'cal')   return openPop(calloutMenu(), btn);
  const fn = ACTIONS[m];
  if (!fn) return;
  if (!TANPA_SNAP.has(m)) snap();
  fn();
}
export { jalankan };

function bindBar() {
  document.querySelectorAll('.mb').forEach(btn => {
    /* jangan biarkan tombol merebut fokus -> keyboard tak terbuka & caret aman */
    btn.addEventListener('mousedown', e => e.preventDefault());

    /* Tekan lama pada tombol datar = buka penjelasannya.
       Tombol kelompok tidak perlu, penjelasannya sudah ada di dalam menu. */
    if (btn.dataset.m && HELP[btn.dataset.m]) {
      let timer = null, lama = false;
      const mulai = () => {
        lama = false;
        timer = setTimeout(() => {
          lama = true;
          getar(14);
          menuTerakhir = null;
          openPop(helpPanel(btn.dataset.m), btn);
        }, 480);
      };
      const batal = () => clearTimeout(timer);
      btn.addEventListener('pointerdown', mulai);
      btn.addEventListener('pointerup', batal);
      btn.addEventListener('pointerleave', batal);
      btn.addEventListener('pointercancel', batal);
      /* klik biasa dibatalkan kalau ternyata tekan lama */
      btn.addEventListener('click', e => { if (lama) { e.stopImmediatePropagation(); lama = false; } }, true);
    }
    btn.addEventListener('click', () => {
      getar();
      kunciKeyboard();
      if (btn.dataset.g) {
        const sudah = btn.classList.contains('open');
        document.querySelectorAll('.mb-g.open').forEach(x => x.classList.remove('open'));
        if (sudah) return closeAll();
        focusKeep();
        ensureCaret();
        btn.classList.add('open');
        menuTerakhir = { g: btn.dataset.g };
        openPop(groupMenu(btn.dataset.g), btn);
        /* Menu font bisa keburu dibuka sebelum font web selesai dimuat —
           begitu siap, daftarnya digambar ulang supaya labelnya akurat. */
        if (btn.dataset.g === 'huruf') segarkanMenuFont();
        return;
      }
      jalankan(btn.dataset.m, btn);
    });
  });
}

/* Jaga posisi kursor TANPA memunculkan keyboard.

   Sebelumnya fungsi ini memanggil d.focus(), dan itulah yang membuat papan
   ketik terbuka setiap kali tombol bar ditekan. Fokus sebenarnya tidak
   diperlukan: semua mekanik memanipulasi DOM langsung, bukan lewat
   document.execCommand yang mensyaratkan elemen ter-fokus.

   Yang benar-benar dibutuhkan hanyalah objek Selection tetap menunjuk ke
   dalam editor — dan itu bertahan sendiri selama tidak ada elemen lain yang
   merebut fokus. Tombol bar sudah mencegahnya lewat preventDefault pada
   mousedown/pointerdown. */
export function focusKeep() {
  const d = docEl();
  if (!d) return;
  const s = window.getSelection();
  /* Seleksi masih menunjuk ke editor -> tidak ada yang perlu dilakukan. */
  if (s && s.rangeCount && d.contains(s.getRangeAt(0).startContainer)) return;

  /* Seleksi hilang (mis. baru membuka catatan dan belum menyentuh teks).
     Pulihkan ke posisi terakhir yang diketahui, tanpa memanggil focus(). */
  if (rangeTerakhir && d.contains(rangeTerakhir.startContainer)) {
    s.removeAllRanges();
    s.addRange(rangeTerakhir);
  }
}

/* Kursor terakhir di dalam editor, dicatat terus-menerus supaya tombol bar
   punya sasaran walau papan ketik belum pernah dibuka. */
let rangeTerakhir = null;
document.addEventListener('selectionchange', () => {
  const d = docEl();
  if (!d) return;
  const s = window.getSelection();
  if (s && s.rangeCount && d.contains(s.getRangeAt(0).startContainer))
    rangeTerakhir = s.getRangeAt(0).cloneRange();
});
