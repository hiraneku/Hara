/* Tata letak gambar versi drag-langsung + kelas ukuran (auto/flow).

   LEBAR menentukan KELAS tata letak:
     ≥90  hero        — baris sendiri selebar kolom (mengikuti alur)
     70–89 baris      — baris sendiri, rata kiri/tengah/kanan
     50–69 mengapit   — bisa mengapit kiri/kanan (teks mengalir di
                        sampingnya) atau di tengah
     ≤49  kecil       — sama seperti mengapit, plus bias atas/bawah
                        (kesan menempel di pojok paragraf)
   Kelas dihitung ulang otomatis setiap lebar berubah.

   Saat gambar terpilih (mode tulis):
     · gagang pojok kanan-bawah — ubah lebar (kelas menyesuaikan)
     · gagang pindah kiri-atas  — seret untuk menempatkan: muncul
       hantu gambar + label zona; lepas = menempel di alur
     · gagang putar atas-tengah — putar bebas −180..180 (mendekati 0°
       otomatis lurus)
     · bilah mini #mbar — preset lebar 40/60/80/100, posisi, 0°, angka
       derajat (bisa diketuk untuk mengetik)

   Penyimpanan tetap lewat atribut figur data-gw/gr/ga/gb → meta blok
   {w,rot,align,zb} (elToBlock). Gambar lama tanpa atribut tetap 100%. */

import { docEl, kunciKeyboard } from './editor/caret.js?v=20260908025103';
import { refresh } from './editor/cleanup.js?v=20260908025103';
import { snap } from './editor/history.js?v=20260908025103';
import { modeBacaBerlaku } from './mode-baca.js?v=20260908025103';

let pilih = null;      /* figur yang dipilih */
let geser = null;      /* gesture aktif (ukuran/pindah/putar) */
const baca = () => pilih ? bacaTata(pilih) : null;

const jepit = (v, min, max) => Math.max(min, Math.min(max, v));
const bulat = v => Math.round(Number(v) || 0);

export function kelasLebar(w) {
  if (w >= 90) return 'hero';
  if (w >= 70) return 'baris';
  if (w >= 50) return 'apit';
  return 'kecil';
}

/* Nilai tata letak figur saat ini (default gambar lama: 100%, lurus). */
export function bacaTata(fig) {
  const gw = fig.getAttribute('data-gw');
  const w = gw ? jepit(parseInt(gw, 10) || 100, 20, 100) : 100;
  const gr = fig.getAttribute('data-gr');
  const rot = gr ? jepit(bulat(gr), -180, 180) : 0;
  const ga = fig.getAttribute('data-ga');
  const align = (ga === 'l' || ga === 'c' || ga === 'r') ? ga : null;
  const gb = fig.getAttribute('data-gb');
  const zb = gb === 'b' ? 'b' : 't';
  return { w, rot, align, zb };
}

/* Tulis nilai ke figur: kelas lebar + kelas posisi + atribut. */
export function tulisTata(fig, t) {
  const w = jepit(bulat(t.w) || 100, 20, 100);
  const rot = jepit(bulat(t.rot), -180, 180);
  let align = (t.align === 'l' || t.align === 'c' || t.align === 'r')
    ? t.align : null;
  const zb = t.zb === 'b' ? 'b' : 't';
  const kl = kelasLebar(w);
  if (kl === 'hero') align = null; /* gambar penuh tidak berposisi */
  fig.classList.remove('w-hero', 'w-baris', 'w-apit', 'w-kecil',
    'i-l', 'i-c', 'i-r', 'f-l', 'f-r', 'gb-b', 'tata');
  fig.classList.add('w-' + kl);
  if (kl === 'hero') {
    /* tanpa posisi */
  } else if (kl === 'baris') {
    fig.classList.add('i-' + (align || 'c'));
  } else if (align === 'l' || align === 'r') {
    fig.classList.add('f-' + align);
    if (zb === 'b') fig.classList.add('gb-b');
  } else {
    fig.classList.add('i-c');
  }
  if (w !== 100 || rot !== 0 || align || zb === 'b') {
    fig.classList.add('tata');
    fig.style.width = w + '%';
    fig.style.setProperty('--gr', rot + 'deg');
    fig.setAttribute('data-gw', w);
    fig.setAttribute('data-gr', rot);
    if (align) fig.setAttribute('data-ga', align);
    else fig.removeAttribute('data-ga');
    if (zb === 'b') fig.setAttribute('data-gb', 'b');
    else fig.removeAttribute('data-gb');
  } else {
    fig.style.width = '';
    fig.style.removeProperty('--gr');
    fig.removeAttribute('data-gw');
    fig.removeAttribute('data-gr');
    fig.removeAttribute('data-ga');
    fig.removeAttribute('data-gb');
  }
}

/* ── bilah mini #mbar ── */
const IKON = {
  l: '<svg viewBox="0 0 24 24"><path d="M4 7h13M4 12h16M4 17h9"/></svg>',
  c: '<svg viewBox="0 0 24 24"><path d="M6 7h12M3 12h18M7 17h10"/></svg>',
  r: '<svg viewBox="0 0 24 24"><path d="M7 7h13M4 12h16M11 17h9"/></svg>',
};

function mbarHtml(t) {
  const kl = kelasLebar(t.w);
  const chip = (v, on) =>
    `<button type="button" class="mb-chip${on ? ' on' : ''}" data-mw="${v}"` +
    ` aria-pressed="${on}">${v}</button>`;
  /* tengah = default gambar berkelas — tampilkan menyala */
  const posAktif = kl === 'hero' ? null : (t.align || 'c');
  const pos = ['l', 'c', 'r'].map(k => {
    const on = posAktif === k;
    return `<button type="button" class="mb-chip mb-ico${on ? ' on' : ''}"` +
      ` data-ma="${k}" aria-label="Posisi ${k === 'l' ? 'kiri' : k === 'r' ? 'kanan' : 'tengah'}"` +
      ` aria-pressed="${on}">${IKON[k]}</button>`;
  }).join('');
  const rotOn = t.rot === 0;
  return `<button type="button" class="mb-chip${rotOn ? ' on' : ''}" data-mz="0"` +
    ` title="Luruskan (0°)" aria-label="Luruskan">0°</button>` +
    `<button type="button" class="mb-chip bdg${rotOn ? ' on' : ''}" data-mdeg title="Ketuk untuk mengetik derajat">${t.rot}°</button>` +
    `<span class="mb-sep"></span>` +
    [40, 60, 80, 100].map(v => chip(v, t.w === v)).join('') +
    `<span class="mb-sep"></span>` + pos;
}

function bar() {
  let el = document.getElementById('mbar');
  if (!el) {
    el = document.createElement('div');
    el.id = 'mbar';
    document.body.appendChild(el);
  }
  return el;
}

function tempatkanBar() {
  const el = bar(), f = pilih;
  if (!el || !f || !el.classList.contains('on')) return;
  const r = f.getBoundingClientRect();
  const bw = el.offsetWidth || 260;
  const bh = el.offsetHeight || 34;
  const kiri = Math.max(8, Math.min(r.left + r.width / 2 - bw / 2, window.innerWidth - bw - 8));
  let atas = r.bottom + 6;
  /* bila tak muat di bawah, pindah ke atas dengan jarak ekstra supaya
     bilah tidak menutupi gagang putar gambar kecil (diangkat ke atas) */
  if (atas + bh > window.innerHeight - 8) atas = Math.max(8, r.top - bh - 30);
  el.style.left = kiri + 'px';
  el.style.top = atas + 'px';
}

function segarkanBar() {
  const el = bar(), t = baca();
  if (!t) return;
  perbaruiKelasSempit();
  el.innerHTML = mbarHtml(t);
  el.classList.add('on');
  tempatkanBar();
}

/* Gambar sempit, menempel tepi kiri layar, atau mengapit kiri/kanan
   memakai gagang yang sedikit lebih besar dan digeser ke dalam
   (kelas .sempit — lihat notes.css) supaya tetap gampang digenggam dan
   tidak menggantung di tepi layar (zona usapan balik sistem). */
function perbaruiKelasSempit() {
  const f = pilih;
  if (!f || !f.isConnected) return;
  const mengapit = f.classList.contains('f-l') || f.classList.contains('f-r');
  let kecil = mengapit;
  if (!kecil) {
    const r = f.getBoundingClientRect();
    if (r && r.width > 0) {
      if (r.width < 280) kecil = true;
      /* menempel tepi kiri layar & tidak selebar kolom (hero aman) */
      else if (r.left >= 0 && r.left < 48 && r.width < 380) kecil = true;
    }
  }
  f.classList.toggle('sempit', kecil);
}

function sembunyikanBar() {
  const el = bar();
  el.classList.remove('on');
}

/* ── gagang pada figur ── */
const S_X = '<svg viewBox="0 0 24 24"><path d="M9 5H5v4M15 5h4v4M9 19H5v-4M15 19h4v-4"/></svg>';
const S_MOVE = '<svg viewBox="0 0 24 24"><path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/></svg>';
const S_ROT = '<svg viewBox="0 0 24 24"><path d="M20 8A8 8 0 1 0 21 13M20 3v5h-5"/></svg>';

function pasangGagang(fig) {
  if (fig.querySelector('.img-grip')) return;
  const buat = (cls, svg, aria) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.setAttribute('aria-label', aria);
    b.innerHTML = svg;
    fig.appendChild(b);
  };
  buat('img-grip', S_X, 'Ubah ukuran gambar — seret pojok');
  buat('img-move', S_MOVE, 'Pindahkan gambar — seret gagang');
  buat('img-putar', S_ROT, 'Putar gambar — seret gagang');
}

/* ── terapkan nilai jadi (satu langkah undo) ── */
function terapkan(patch) {
  const fig = pilih;
  if (!fig || !fig.isConnected || modeBacaBerlaku()) return;
  const lama = bacaTata(fig);
  const t = { ...lama, ...patch };
  t.w = jepit(bulat(t.w), 20, 100);
  t.rot = jepit(bulat(t.rot), -180, 180);
  t.align = (t.align === 'l' || t.align === 'c' || t.align === 'r') ? t.align : null;
  /* posisi di gambar penuh otomatis mengecilkan dulu ke 80 */
  if (patch.align && kelasLebar(t.w) === 'hero') t.w = 80;
  if (kelasLebar(t.w) === 'hero') t.align = null;
  if (t.w === lama.w && t.rot === lama.rot && t.align === lama.align &&
      t.zb === lama.zb) return;
  snap();
  tulisTata(fig, t);
  refresh();
  segarkanBar();
  tempatkanBar();
}

/* nilai sementara saat drag — tanpa rekam */
function ubahLive(patch) {
  const fig = pilih;
  if (!fig || !fig.isConnected || modeBacaBerlaku()) return;
  tulisTata(fig, { ...bacaTata(fig), ...patch });
}

/* lebar kolom teks (induk figur = .ed-doc) */
function kolomLebar(fig) {
  const p = fig.parentElement;
  if (!p) return 800;
  const r = p.getBoundingClientRect();
  return (r && r.width) || p.clientWidth || 800;
}

/* ── gesture ukuran (gagang pojok) ── */
function mulaiUkuran(e) {
  if (!pilih) return;
  e.preventDefault();
  e.stopPropagation();
  const pa = pilih.parentElement;
  const t0 = bacaTata(pilih);
  geser = {
    jenis: 'ukuran',
    kiri: pa ? pa.getBoundingClientRect().left : 0,
    kolom: kolomLebar(pilih), x0: e.clientX, jalan: false,
    align: t0.align, zb: t0.zb, /* pertahankan posisi saat menyeberangi kelas */
  };
  window.addEventListener('pointermove', gerak);
  window.addEventListener('pointerup', lepas);
  window.addEventListener('pointercancel', lepas);
}

/* ── gesture putar (gagang atas) ── */
function sudut(fig, x, y) {
  const r = fig.getBoundingClientRect();
  return Math.atan2(y - (r.top + r.height / 2), x - (r.left + r.width / 2)) * 180 / Math.PI;
}
function mulaiPutar(e) {
  if (!pilih) return;
  e.preventDefault();
  e.stopPropagation();
  const t = bacaTata(pilih);
  geser = { jenis: 'putar', jalan: false, awal: t.rot, s0: sudut(pilih, e.clientX, e.clientY) };
  window.addEventListener('pointermove', gerak);
  window.addEventListener('pointerup', lepas);
  window.addEventListener('pointercancel', lepas);
}

/* ── gesture pindah (gagang kiri-atas) ── */
const BLOK_ALUR = new Set(['b-p', 'b-h1', 'b-h2', 'b-h3', 'b-li', 'b-ol', 'b-todo',
  'b-quote', 'b-code', 'b-cal', 'b-img']);
function anakAlur(d) {
  return Array.from(d.children).filter(el =>
    el.classList && Array.from(el.classList).some(c => BLOK_ALUR.has(c)));
}
function ghost() {
  let g = document.getElementById('gbr-gh');
  if (!g) {
    g = document.createElement('div');
    g.id = 'gbr-gh';
    document.body.appendChild(g);
  }
  return g;
}
function mulaiPindah(e) {
  if (!pilih) return;
  e.preventDefault();
  e.stopPropagation();
  const fig = pilih;
  const img = fig.querySelector('img[data-blob]');
  const g = ghost();
  g.innerHTML = '';
  g.style.background = '';
  if (img && img.getAttribute('src')) {
    const im = document.createElement('img');
    im.src = img.getAttribute('src');
    g.appendChild(im);
  } else {
    g.style.background = 'repeating-linear-gradient(45deg,#cfd8d3,#cfd8d3 10px,#c3cec8 10px,#c3cec8 20px)';
  }
  const pil = document.createElement('span');
  pil.className = 'pil';
  g.appendChild(pil);
  const r = fig.getBoundingClientRect();
  const lebar = Math.min(220, Math.max(90, r.width || 140));
  g.style.width = lebar + 'px';
  const ratio = (r.height && r.width) ? r.height / r.width : 0.7;
  g.style.height = Math.round(lebar * ratio) + 'px';
  geser = {
    jenis: 'pindah', jalan: false, x0: e.clientX, y0: e.clientY,
    x1: e.clientX, y1: e.clientY, fig, g, lebar,
  };
  g.style.display = 'block';
  g.style.left = (e.clientX - lebar / 2) + 'px';
  g.style.top = (e.clientY - 20) + 'px';
  window.addEventListener('pointermove', gerak);
  window.addEventListener('pointerup', lepas);
  window.addEventListener('pointercancel', lepas);
}

/* hasil penempatan: { i, align, zb } */
function sasaranPindah(d, y, x) {
  const anak = anakAlur(d);
  if (!anak.length) return { i: 0 };
  const docR = d.getBoundingClientRect();
  /* indeks sisip: sebelum anak[i] */
  let i = anak.length;
  for (let k = 0; k < anak.length; k++) {
    const r = anak[k].getBoundingClientRect();
    if (y < r.top + (r.height || 20) / 2) { i = k; break; }
  }
  const t = baca();
  if (!t) return { i };
  const kl = kelasLebar(t.w);
  if (kl === 'hero') return { i };
  const xr = x - docR.left;
  const pct = docR.width ? xr / docR.width : 0.5;
  let align = null;
  if (pct < 0.35) align = 'l';
  else if (pct > 0.65) align = 'r';
  /* paragraf tujuan (yang akan mengapit) = anak[i] */
  let zb = 't';
  const tr = anak[Math.min(i, anak.length - 1)];
  if (tr && kl !== 'baris' && align) {
    const rr = tr.getBoundingClientRect();
    zb = (y < rr.top + (rr.height || 0) / 2) ? 't' : 'b';
  }
  return { i, align, zb };
}

const NAMA_ZONA = {
  hero: 'Baris penuh',
  baris: { l: 'Kiri', c: 'Tengah', r: 'Kanan' },
  apit: { l: 'Kiri · teks mengapit', c: 'Tengah', r: 'Kanan · teks mengapit' },
  kecil: { l: 'Tempel kiri', c: 'Tengah', r: 'Tempel kanan' },
};

function gerak(e) {
  if (!geser || !pilih) return;
  const g = geser;
  g.x1 = e.clientX; g.y1 = e.clientY;
  if (!g.jalan) {
    const jauh = Math.hypot(e.clientX - g.x0, e.clientY - g.y0);
    if (jauh < 5) return;
    g.jalan = true;
    snap();   /* satu langkah undo utk seluruh gerakan */
    if (g.jenis === 'ukuran') pilih.classList.add('seret');
  }
  const fig = pilih;
  if (g.jenis === 'ukuran') {
    const w = Math.round(jepit(((e.clientX - g.kiri) / (g.kolom || 1)) * 100, 20, 100));
    ubahLive({ w, align: g.align, zb: g.zb });
  } else if (g.jenis === 'putar') {
    const s = sudut(fig, e.clientX, e.clientY) - g.s0;
    let r = Math.round(((g.awal + s) % 360 + 360) % 360);
    if (r > 180) r -= 360;
    ubahLive({ rot: r });
    const bdg = bar().querySelector('[data-mdeg]');
    if (bdg) bdg.textContent = r + '°';
  } else if (g.jenis === 'pindah') {
    const d = docEl();
    g.g.style.left = (e.clientX - g.lebar / 2) + 'px';
    g.g.style.top = (e.clientY - 20) + 'px';
    const sas = sasaranPindah(d, e.clientY, e.clientX);
    const t = baca();
    const kl = t ? kelasLebar(t.w) : 'baris';
    const pil = g.g.querySelector('.pil');
    let label;
    if (kl === 'hero') label = NAMA_ZONA.hero;
    else if (sas.align) label = NAMA_ZONA[kl] && NAMA_ZONA[kl][sas.align];
    else label = 'Tengah';
    if (kl !== 'hero' && sas.align && sas.zb === 'b') label += ' · bawah';
    pil.textContent = label || 'Tengah';
  }
}

function lepas() {
  window.removeEventListener('pointermove', gerak);
  window.removeEventListener('pointerup', lepas);
  window.removeEventListener('pointercancel', lepas);
  if (!geser) return;
  const g = geser;
  geser = null;
  const fig = pilih;
  if (!fig) return;
  fig.classList.remove('seret');
  if (g.jenis === 'pindah') {
    g.g.style.display = 'none';
    g.g.innerHTML = '';
  }
  if (!g.jalan) return;
  if (g.jenis === 'ukuran') {
    /* lebar baru sudah live; rekam + segarkan bar */
    refresh();
    segarkanBar();
  } else if (g.jenis === 'putar') {
    /* mendekati 0° → luruskan */
    const t = baca();
    if (t && Math.abs(t.rot) <= 3) ubahLive({ rot: 0 });
    refresh();
    segarkanBar();
  } else if (g.jenis === 'pindah') {
    const d = docEl();
    if (!d) return;
    const t = baca();
    if (!t) return;
    /* urutan sisip dihitung dari posisi akhir (g.y1) */
    const anak = Array.from(d.children).filter(el => el !== fig);
    let i = anak.length;
    for (let k = 0; k < anak.length; k++) {
      const ar = anak[k].getBoundingClientRect();
      if (g.y1 < ar.top + (ar.height || 20) / 2) { i = k; break; }
    }
    const docR = d.getBoundingClientRect();
    const pct = docR.width ? (g.x1 - docR.left) / docR.width : 0.5;
    const kl = kelasLebar(t.w);
    let align = null;
    if (kl !== 'hero') align = pct < 0.35 ? 'l' : pct > 0.65 ? 'r' : 'c';
    /* bias atas/bawah mengikuti posisi jari di paragraf tujuan */
    let zb = t.zb;
    const tr = anak[Math.min(i, anak.length - 1)];
    if (tr && kl !== 'hero' && kl !== 'baris' && (align === 'l' || align === 'r')) {
      const rr = tr.getBoundingClientRect();
      zb = (g.y1 < rr.top + (rr.height || 0) / 2) ? 't' : 'b';
    }
    d.insertBefore(fig, anak[i] || null);
    tulisTata(fig, kl === 'hero' ? { ...t, align: null } : { ...t, align, zb });
    refresh();
    segarkanBar();
    tempatkanBar();
  }
}

/* ── rotasi lewat bilah mini / kolom angka ── */
function commitDeg() {
  const inp = bar().querySelector('.mb-deg-in');
  const t = baca();
  if (!inp || !t) return;
  const v = Math.round(Number(inp.value));
  if (isNaN(v)) { segarkanBar(); return; }
  const rot = jepit(v, -180, 180);
  if (rot !== t.rot) terapkan({ rot });
  else segarkanBar();
}

/* ── pilih / batalkan ── */
function deseleksi() {
  if (!pilih) return;
  const f = pilih;
  pilih = null;
  f.classList.remove('img-pilih', 'seret', 'sempit');
  ['img-grip', 'img-move', 'img-putar'].forEach(c => {
    const h = f.querySelector('.' + c);
    if (h) h.remove();
  });
  sembunyikanBar();
  const g = ghost();
  if (g.style.display !== 'none') { g.style.display = 'none'; g.innerHTML = ''; }
  window.removeEventListener('scroll', tempatkanBar, true);
  window.removeEventListener('resize', tempatkanBar);
}

export function bindTataGambar() {
  document.addEventListener('pointerdown', e => {
    if (e.button !== undefined && e.button !== 0) return;
    if (pilih && !pilih.isConnected) deseleksi(); /* figur terhapus */
    /* gagang-gagang pada figur yang dipilih */
    const grip = e.target.closest ? e.target.closest('.img-grip') : null;
    if (grip) { if (pilih) mulaiUkuran(e); return; }
    const putar = e.target.closest ? e.target.closest('.img-putar') : null;
    if (putar) { if (pilih) mulaiPutar(e); return; }
    const pindah = e.target.closest ? e.target.closest('.img-move') : null;
    if (pindah) { if (pilih) mulaiPindah(e); return; }

    /* klik pada bilah mini: biarkan (aksi chip via click) */
    if (e.target.closest && e.target.closest('#mbar')) return;

    const d = docEl();
    const fig = (d && e.target.closest) ? e.target.closest('.b-img') : null;
    if (fig && fig.parentElement === d) {
      if (modeBacaBerlaku()) { deseleksi(); return; }
      if (e.target.closest('.img-x')) return;
      /* Memilih gambar bukan mengetik: jangan biarkan caret pindah ke
         gambar, jangan minta keyboard, dan lepas fokus editor kalau
         sedang fokus (keyboard yang terbuka ikut tertutup). */
      e.preventDefault();
      kunciKeyboard();
      if (document.activeElement === d) d.blur();
      if (pilih !== fig) {
        deseleksi();
        pilih = fig;
        fig.classList.add('img-pilih');
        pasangGagang(fig);
        segarkanBar();
        window.addEventListener('scroll', tempatkanBar, true);
        window.addEventListener('resize', tempatkanBar);
      }
      return;
    }
    if (e.target.closest && e.target.closest('#pop')) return;
    deseleksi();
  });

  /* Aksi bilah mini & silang-hapus. Ketukan pada badan gambar yang sudah
     dipilih TIDAK menutup seleksi — gagang kecil gampang meleset; menutup
     cukup dengan ketuk di luar gambar / Escape. */
  document.addEventListener('click', e => {
    const d = docEl();
    const cfig = (d && e.target.closest) ? e.target.closest('.b-img') : null;
    if (cfig && cfig.parentElement === d && pilih === cfig) {
      if (e.target.closest('.img-x')) deseleksi(); /* silang: tutup dulu, hapus via index.js */
      return;
    }
    if (!pilih || !e.target.closest || !e.target.closest('#mbar')) return;
    const mw = e.target.closest('[data-mw]');
    if (mw) { terapkan({ w: parseInt(mw.dataset.mw, 10) }); return; }
    const ma = e.target.closest('[data-ma]');
    if (ma) {
      const t = baca();
      terapkan({ align: ma.dataset.ma, zb: t && t.align !== 'c' ? t.zb : 't' });
      return;
    }
    const mz = e.target.closest('[data-mz]');
    if (mz) { terapkan({ rot: 0 }); return; }
    const deg = e.target.closest('[data-mdeg]');
    if (deg) {
      const t = baca();
      const inp = document.createElement('input');
      inp.type = 'number';
      inp.className = 'mb-deg-in';
      inp.min = -180; inp.max = 180; inp.step = 1;
      inp.value = t.rot;
      deg.replaceWith(inp);
      inp.focus();
      inp.select();
      inp.addEventListener('keydown', ev => {
        if (ev.key === 'Enter') { ev.preventDefault(); commitDeg(); }
        if (ev.key === 'Escape') { segarkanBar(); }
      });
      inp.addEventListener('blur', commitDeg);
      inp.addEventListener('change', commitDeg);
      return;
    }
  });

  document.addEventListener('keydown', e => {
    const diKotakDeg = e.target && e.target.classList &&
      e.target.classList.contains('mb-deg-in');
    if (e.key === 'Escape' && pilih && !diKotakDeg) { deseleksi(); return; }
    /* panah menyesuaikan rotasi saat kolom derajat fokus */
    const inp = diKotakDeg;
    if (inp && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      const t = baca(); if (!t) return;
      const dlt = (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1);
      terapkan({ rot: jepit(t.rot + dlt, -180, 180) });
    }
  });
}

export function bersihkanPilihanGambar() {
  deseleksi();
}
