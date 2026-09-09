/* Perpindahan layar. Modul mendaftarkan view-nya lewat registerViews(). */
const views  = {};
const titles = {};
export let cur = 'home';

/* Layar sebelum layar sekarang — untuk tombol \"Kembali\" di halaman yang
   tidak ada di bar navigasi (mis. Pengaturan). */
export let sebelumnya = 'home';

/* Dipanggil sebelum layar diganti — modul bisa menyimpan pekerjaannya. */
const beforeLeave = [];
export const onBeforeLeave = fn => beforeLeave.push(fn);

export function registerViews(map, titleMap) {
  Object.assign(views, map);
  Object.assign(titles, titleMap || {});
}

export function go(v) {
  if (!views[v]) return;
  beforeLeave.forEach(fn => { try { fn(cur, v); } catch (e) {} });
  if (v !== cur) sebelumnya = cur;
  cur = v;

  const w = document.getElementById('wrap');
  w.innerHTML = views[v]();
  w.scrollTop = 0;
  document.getElementById('title').textContent = titles[v] || '';

  const isEd = v === 'editor';
  /* panah kembali ikut tampil di halaman yang tidak ada di nav bawah
     (Pengaturan) supaya selalu ada jalan keluar */
  const pakaiBack = isEd || v === 'set';
  document.getElementById('back').style.display = pakaiBack ? 'grid' : 'none';
  /* hapus langsung dipindah ke menu \"···\" — mencegah salah ketuk */
  document.getElementById('del').style.display  = 'none';
  document.getElementById('dots').style.display = isEd ? 'grid' : 'none';
  document.getElementById('mech').classList.toggle('on', isEd);
  document.getElementById('bnav').classList.toggle('hide', isEd);
  document.getElementById('fab').classList.toggle('hide', isEd);
  document.querySelectorAll('.nav-i,.bnav button')
    .forEach(b => b.classList.toggle('on', b.dataset.go === v));

  afterRender.forEach(fn => { try { fn(v); } catch (e) {} });
}

/* Pulang ke layar sebelum layar sekarang (dipakai tombol Kembali). */
export function kembali() {
  go(sebelumnya && views[sebelumnya] ? sebelumnya : 'home');
}

/* Dipanggil setelah layar digambar — modul menyiapkan kursor, bar, dsb. */
const afterRender = [];
export const onAfterRender = fn => afterRender.push(fn);
