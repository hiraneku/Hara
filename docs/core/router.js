/* Perpindahan layar. Modul mendaftarkan view-nya lewat registerViews(). */
import { t as tr } from './i18n.js?v=20261024183000';

const views  = {};
const titles = {};
export let cur = 'home';

/* Layar sebelum layar sekarang — untuk tombol \"Kembali\" di halaman yang
   tidak ada di bar navigasi (mis. Pengaturan). */
export let sebelumnya = 'home';

/* Dipanggil sebelum layar diganti — modul bisa menyimpan pekerjaannya. */
const beforeLeave = [];
export const onBeforeLeave = fn => beforeLeave.push(fn);

/* Layar anak → induk (mis. 'musik-eq' → 'musik'). Tombol kembali di layar anak
   pulang ke induknya; perpindahan induk↔anak tidak mengubah 'sebelumnya', jadi
   dari induk tombol kembali tetap menuju layar asal (mis. Beranda). */
const induk = {};

export function registerViews(map, titleMap, indukMap) {
  Object.assign(views, map);
  Object.assign(titles, titleMap || {});
  Object.assign(induk, indukMap || {});
}

const MUSIK_LAYAR = ['musik', 'musik-set', 'musik-daftar', 'musik-eq', 'musik-ekspor'];

const saudara = (a, b) => induk[a] === b || induk[b] === a;

/* Apakah layar sekarang punya induk (dipakai tombol panah kembali). */
export const adaInduk = () => !!(induk[cur] && views[induk[cur]]);

/* opsi.segar: gambar ulang layar yang SAMA tanpa mengusik keadaannya —
   onBeforeLeave tidak dijalankan (mode pilih & sejenisnya tetap hidup) dan
   posisi gulir dipulihkan ke opsi.gulir. Dipakai untuk memuat baris daftar
   berikutnya (P3). */
export function go(v, opsi = {}) {
  if (!views[v]) return;
  if (!opsi.segar) {
    beforeLeave.forEach(fn => { try { fn(cur, v); } catch (e) {} });
    if (v !== cur && !saudara(v, cur)) sebelumnya = cur;
  }
  cur = v;

  const w = document.getElementById('wrap');
  w.innerHTML = views[v]();
  w.scrollTop = opsi.segar ? (opsi.gulir || 0) : 0;
  /* Judul layar disimpan sebagai kunci bahasa Indonesia (id) dan
     diterjemahkan saat digambar — mengganti bahasa lalu render ulang
     (go ke layar yang sama) langsung menyegarkan judulnya. */
  document.getElementById('title').textContent = titles[v] ? tr(titles[v]) : '';

  const isEd = v === 'editor';
  /* layar kunci (D19) tampil seperti editor: tanpa nav bawah & fab,
     dengan panah kembali — jalannya cuma dua: buka PIN atau kembali */
  const pakaiEd = isEd || v === 'kunci' || MUSIK_LAYAR.includes(v);
  /* panah kembali ikut tampil di halaman yang tidak ada di nav bawah
     (Pengaturan) supaya selalu ada jalan keluar */
  const pakaiBack = pakaiEd || v === 'set';
  document.getElementById('back').style.display = pakaiBack ? 'grid' : 'none';
  /* hapus langsung dipindah ke menu \"···\" — mencegah salah ketuk */
  document.getElementById('del').style.display  = 'none';
  document.getElementById('dots').style.display = isEd ? 'grid' : 'none';
  const hamojiBtn = document.getElementById('hamoji-btn');
  if (hamojiBtn) hamojiBtn.style.display = isEd ? 'grid' : 'none';
  document.getElementById('mech').classList.toggle('on', isEd);
  document.getElementById('bnav').classList.toggle('hide', pakaiEd);
  for (const id of ['fab', 'fab-bnav']) document.getElementById(id)?.classList.toggle('hide', pakaiEd);
  document.querySelectorAll('.nav-i,.bnav button')
    .forEach(b => b.classList.toggle('on', b.dataset.go === v));

  afterRender.forEach(fn => { try { fn(v); } catch (e) {} });
}

/* Pulang ke layar sebelum layar sekarang (dipakai tombol Kembali). */
export function kembali() {
  if (adaInduk()) return go(induk[cur]);
  go(sebelumnya && views[sebelumnya] ? sebelumnya : 'home');
}

/* Dipanggil setelah layar digambar — modul menyiapkan kursor, bar, dsb. */
const afterRender = [];
export const onAfterRender = fn => afterRender.push(fn);
