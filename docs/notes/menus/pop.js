/* Popup melayang di atas bar. */
import { ensureCaret, kunciKeyboard } from '../editor/caret.js?v=20260908042543';
import { setBlock, insertHr, insertTanggal } from '../editor/blocks.js?v=20260908042543';
import { insertInline } from './insert.js?v=20260908042543';
import { focusKeep } from '../bar/render.js?v=20260908042543';
import { applyLink } from './link.js?v=20260908042543';
import { buangGaring, slashAktif } from './slash-trigger.js?v=20260908042543';
import { setFont } from '../editor/font.js?v=20260908042543';
import { setWarna, normalizeWarna } from '../editor/warna.js?v=20260908042543';
import { setSorotan } from '../editor/sorotan.js?v=20260908042543';
import { rodaPasang, pilihSasaran, sasaranSekarang, perbaruiSasaranPop } from './warna.js?v=20260908042543';
import { setCallout } from '../editor/blocks.js?v=20260908042543';
import { snap as snapFont, snap as snapWarna } from '../editor/history.js?v=20260908042543';
import { getar } from '../bar/prefs.js?v=20260908042543';
import { toast } from '../../core/toast.js?v=20260908042543';

export const pop = () => document.getElementById('pop');

/* Tombol tutup × untuk isi popup. */
function buatTombolX() {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'pop-x';
  b.setAttribute('aria-label', 'Tutup');
  b.title = 'Tutup';
  b.innerHTML = '<svg class="ico"><use href="#i-x"/></svg>';
  return b;
}

/* Ganti isi popup. Tombol × ikut dipasang: bila konten diawali judul
   (.pop-h), × duduk sejajar di ujung kanan judul itu — mis. tepat di
   seberang "AKSI CATATAN"; konten tanpa judul memakai baris kecil di
   atas. */
export function setPopIsi(html) {
  const p = pop();
  if (!p) return;
  p.innerHTML = html;
  const h = p.firstElementChild;
  if (h && h.classList && h.classList.contains('pop-h')) {
    h.appendChild(buatTombolX());
    h.classList.add('ber-x');
  } else {
    const bar = document.createElement('div');
    bar.className = 'pop-top';
    bar.appendChild(buatTombolX());
    p.insertBefore(bar, p.firstChild);
  }
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
  if (p.querySelector('#roda-w')) rodaPasang();   /* roda warna menu */
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

  /* tombol × di ujung judul — menutup popup apa pun (tombol dibuat
     ulang tiap ganti isi, jadi dipasang dengan delegasi) */
  p.addEventListener('click', e => {
    if (e.target.closest('.pop-x')) { closeAll(); return; }
  });

  /* strip warna: gerakan mendatar (termasuk diagonal yang didominasi
     mendatar) hanya menggeser strip — panel tidak ikut bergulung. Yang
     vertikal MURNI tetap perilaku biasa (gulung panel). Sentuhan jari
     ditangani touch-action di CSS. */
  p.addEventListener('wheel', e => {
    const st = e.target && e.target.closest ? e.target.closest('.wpal') : null;
    if (!st) return;
    if (Math.abs(e.deltaX) > 3) {
      e.preventDefault();
      st.scrollLeft += e.deltaX;
    }
  }, { passive: false });

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
    if (inp.id === 'warna-hex') {
      const pakai = p.querySelector('[data-warna-pakai]');
      if (pakai) { pakai.click(); return; }
    }
    const ok = p.querySelector('[data-lk="ok"]');
    if (ok) ok.click();
  });

  /* sasaran warna yang sedang digarap: Teks atau Sorotan */
  function pakaiWarna(hex) {
    if (sasaranSekarang() === 'sorotan') setSorotan(hex);
    else setWarna(hex);
  }

  p.addEventListener('click', e => {
    const sas = e.target.closest('[data-sas]');
    if (sas) { getar(); kunciKeyboard(); focusKeep(); ensureCaret(); pilihSasaran(sas.dataset.sas); return; }

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

    /* warna swatch strip — dipakai untuk SASARAN yang sedang dipilih
       (Teks atau Sorotan). Popup TIDAK ditutup DAN tidak digambar ulang —
       menggambar ulang membuat strip yang sedang digeser lompat balik ke
       kiri. Cukup pindahkan cincin penanda, lalu selaraskan roda + kolom
       kode ke warna yang barusan dipakai (bisa dicoba beruntun). */
    const wc = e.target.closest('[data-warna]');
    if (wc) {
      getar(); kunciKeyboard(); focusKeep(); ensureCaret();
      snapWarna();
      pakaiWarna(wc.dataset.warna);
      p.querySelectorAll('.wsw.on').forEach(x => {
        x.classList.remove('on'); x.removeAttribute('aria-pressed');
      });
      wc.classList.add('on');
      wc.setAttribute('aria-pressed', 'true');
      const inp = p.querySelector('#warna-hex');
      if (inp) inp.value = wc.dataset.warna;
      if (p.querySelector('#roda-w')) rodaPasang();
      perbaruiSasaranPop({ sas: sasaranSekarang(), hex: wc.dataset.warna });
      return;
    }
    /* hapus warna sasaran (kembali ke bawaan) */
    const wh = e.target.closest('[data-warna-hapus]');
    if (wh) {
      getar(); kunciKeyboard(); focusKeep(); ensureCaret();
      snapWarna();
      pakaiWarna('');
      closeAll();
      return;
    }
    /* kolom kode hex -> Pakai */
    const wp = e.target.closest('[data-warna-pakai]');
    if (wp) {
      const inp = p.querySelector('#warna-hex');
      const hex = normalizeWarna(inp ? inp.value : '');
      if (!hex) {
        toast('Kode warna tak dikenal — pakai mis. #3b82f6 atau rgb(59,130,246)');
        if (inp) inp.focus();
        return;
      }
      getar(); kunciKeyboard(); focusKeep(); ensureCaret();
      snapWarna();
      pakaiWarna(hex);
      closeAll();
      return;
    }

    const cl = e.target.closest('[data-cal]');
    if (cl) { focusKeep(); ensureCaret(); setCallout(cl.dataset.cal); closeAll(); return; }

    /* tombol info -> tampilkan penjelasan */
    const inf = e.target.closest('[data-info]');
    if (inf) {
      getar();
      import('../bar/render.js?v=20260908042543').then(({ helpPanel, gantiIsiPop }) => {
        gantiIsiPop(helpPanel(inf.dataset.info), inf.dataset.info);
      });
      return;
    }
    /* kembali dari penjelasan ke daftar */
    const bk = e.target.closest('[data-helpback]');
    if (bk) {
      getar();
      import('../bar/render.js?v=20260908042543').then(({ kembaliKeMenu }) => kembaliKeMenu());
      return;
    }

    /* item dari menu kelompok */
    const gm = e.target.closest('[data-m]');
    if (gm) {
      getar();
      kunciKeyboard();
      closeAll();
      import('../bar/render.js?v=20260908042543').then(({ jalankan }) => jalankan(gm.dataset.m, gm));
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
