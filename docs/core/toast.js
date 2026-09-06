/* Pesan singkat di bawah layar. */
let t = null;
export function toast(msg) {
  const box = document.getElementById('toast');
  if (!box) return;
  box.textContent = msg;
  box.classList.add('on');
  clearTimeout(t);
  t = setTimeout(() => box.classList.remove('on'), 2000);
}
