/* Perpindahan layar. Modul mendaftarkan view-nya lewat registerViews(). */
const views  = {};
const titles = {};
export let cur = 'home';

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
  cur = v;

  const w = document.getElementById('wrap');
  w.innerHTML = views[v]();
  w.scrollTop = 0;
  document.getElementById('title').textContent = titles[v] || '';

  const isEd = v === 'editor';
  document.getElementById('back').style.display = isEd ? 'grid' : 'none';
  document.getElementById('del').style.display  = isEd ? 'grid' : 'none';
  document.getElementById('dots').style.display = isEd ? 'none' : 'grid';
  document.getElementById('mech').classList.toggle('on', isEd);
  document.getElementById('bnav').classList.toggle('hide', isEd);
  document.getElementById('fab').classList.toggle('hide', isEd);
  document.querySelectorAll('.nav-i,.bnav button')
    .forEach(b => b.classList.toggle('on', b.dataset.go === v));

  afterRender.forEach(fn => { try { fn(v); } catch (e) {} });
}

/* Dipanggil setelah layar digambar — modul menyiapkan kursor, bar, dsb. */
const afterRender = [];
export const onAfterRender = fn => afterRender.push(fn);
